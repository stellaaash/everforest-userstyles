/**
 * Hex color → CSS filter chain solver (SPSA), used to regenerate the
 * `@everforest-filters` block in lib/lib.less. The chains recolor arbitrary
 * images/SVGs: `brightness(0) saturate(100%)` flattens to black, then the
 * solved invert/sepia/saturate/hue-rotate/brightness/contrast chain shifts
 * black to the target color.
 *
 * Port of the well-known solver from https://stackoverflow.com/a/43960991,
 * made deterministic with a seeded PRNG so regeneration is byte-identical.
 */

function clamp(value: number, max = 255): number {
  return Math.min(Math.max(value, 0), max);
}

/** mulberry32 — tiny seedable PRNG for deterministic output. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Color {
  r: number;
  g: number;
  b: number;

  constructor(r: number, g: number, b: number) {
    this.r = clamp(r);
    this.g = clamp(g);
    this.b = clamp(b);
  }

  set(r: number, g: number, b: number) {
    this.r = clamp(r);
    this.g = clamp(g);
    this.b = clamp(b);
  }

  multiply(matrix: number[]) {
    const newR = clamp(
      this.r * matrix[0] + this.g * matrix[1] + this.b * matrix[2],
    );
    const newG = clamp(
      this.r * matrix[3] + this.g * matrix[4] + this.b * matrix[5],
    );
    const newB = clamp(
      this.r * matrix[6] + this.g * matrix[7] + this.b * matrix[8],
    );
    this.r = newR;
    this.g = newG;
    this.b = newB;
  }

  hueRotate(angle = 0) {
    angle = (angle / 180) * Math.PI;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    this.multiply([
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072,
    ]);
  }

  sepia(value = 1) {
    this.multiply([
      0.393 + 0.607 * (1 - value),
      0.769 - 0.769 * (1 - value),
      0.189 - 0.189 * (1 - value),
      0.349 - 0.349 * (1 - value),
      0.686 + 0.314 * (1 - value),
      0.168 - 0.168 * (1 - value),
      0.272 - 0.272 * (1 - value),
      0.534 - 0.534 * (1 - value),
      0.131 + 0.869 * (1 - value),
    ]);
  }

  saturate(value = 1) {
    this.multiply([
      0.213 + 0.787 * value,
      0.715 - 0.715 * value,
      0.072 - 0.072 * value,
      0.213 - 0.213 * value,
      0.715 + 0.285 * value,
      0.072 - 0.072 * value,
      0.213 - 0.213 * value,
      0.715 - 0.715 * value,
      0.072 + 0.928 * value,
    ]);
  }

  brightness(value = 1) {
    this.linear(value);
  }

  contrast(value = 1) {
    this.linear(value, -(0.5 * value) + 0.5);
  }

  linear(slope = 1, intercept = 0) {
    this.r = clamp(this.r * slope + intercept * 255);
    this.g = clamp(this.g * slope + intercept * 255);
    this.b = clamp(this.b * slope + intercept * 255);
  }

  invert(value = 1) {
    this.r = clamp((value + (this.r / 255) * (1 - 2 * value)) * 255);
    this.g = clamp((value + (this.g / 255) * (1 - 2 * value)) * 255);
    this.b = clamp((value + (this.b / 255) * (1 - 2 * value)) * 255);
  }

  hsl(): { h: number; s: number; l: number } {
    const r = this.r / 255;
    const g = this.g / 255;
    const b = this.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h: h * 100, s: s * 100, l: l * 100 };
  }
}

class Solver {
  target: Color;
  targetHSL: { h: number; s: number; l: number };
  random: () => number;

  constructor(target: Color, random: () => number) {
    this.target = target;
    this.targetHSL = target.hsl();
    this.random = random;
  }

  solve(): { values: number[]; loss: number } {
    const result = this.solveNarrow(this.solveWide());
    return { values: result.values, loss: result.loss };
  }

  private solveWide() {
    const A = 5;
    const c = 15;
    const a = [60, 180, 18000, 600, 1.2, 1.2];

    let best = { values: [] as number[], loss: Infinity };
    for (let i = 0; best.loss > 25 && i < 3; i++) {
      const initial = [50, 20, 3750, 50, 100, 100];
      const result = this.spsa(A, a, c, initial, 1000);
      if (result.loss < best.loss) best = result;
    }
    return best;
  }

  private solveNarrow(wide: { values: number[]; loss: number }) {
    const A = wide.loss;
    const c = 2;
    const A1 = A + 1;
    const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1];
    return this.spsa(A, a, c, wide.values, 500);
  }

  private spsa(
    A: number,
    a: number[],
    c: number,
    values: number[],
    iters: number,
  ) {
    const alpha = 1;
    const gamma = 1 / 6;

    let best: number[] | null = null;
    let bestLoss = Infinity;
    const deltas = new Array<number>(6);
    const highArgs = new Array<number>(6);
    const lowArgs = new Array<number>(6);

    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma);
      for (let i = 0; i < 6; i++) {
        deltas[i] = this.random() > 0.5 ? 1 : -1;
        highArgs[i] = values[i] + ck * deltas[i];
        lowArgs[i] = values[i] - ck * deltas[i];
      }

      const lossDiff = this.loss(highArgs) - this.loss(lowArgs);
      for (let i = 0; i < 6; i++) {
        const g = (lossDiff / (2 * ck)) * deltas[i];
        const ak = a[i] / Math.pow(A + k + 1, alpha);
        values[i] = fix(values[i] - ak * g, i);
      }

      const loss = this.loss(values);
      if (loss < bestLoss) {
        best = values.slice(0);
        bestLoss = loss;
      }
    }
    return { values: best!, loss: bestLoss };

    function fix(value: number, idx: number) {
      let max = 100;
      if (idx === 2) max = 7500; // saturate
      else if (idx === 4 || idx === 5) max = 200; // brightness, contrast

      if (idx === 3) {
        // hue-rotate
        if (value > max) value %= max;
        else if (value < 0) value = max + (value % max);
      } else if (value < 0) value = 0;
      else if (value > max) value = max;
      return value;
    }
  }

  loss(filters: number[]): number {
    const color = new Color(0, 0, 0);
    color.invert(filters[0] / 100);
    color.sepia(filters[1] / 100);
    color.saturate(filters[2] / 100);
    color.hueRotate(filters[3] * 3.6);
    color.brightness(filters[4] / 100);
    color.contrast(filters[5] / 100);

    const hsl = color.hsl();
    return (
      Math.abs(color.r - this.target.r) +
      Math.abs(color.g - this.target.g) +
      Math.abs(color.b - this.target.b) +
      Math.abs(hsl.h - this.targetHSL.h) +
      Math.abs(hsl.s - this.targetHSL.s) +
      Math.abs(hsl.l - this.targetHSL.l)
    );
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Solve a filter chain for `hex`. Deterministic: seeded by the hex value.
 * Retries until loss < `maxLoss` (keeping the best across attempts).
 */
export function solveFilter(hex: string, maxLoss = 1, maxAttempts = 50): {
  filter: string;
  loss: number;
} {
  const [r, g, b] = hexToRgb(hex);
  const seed = (r << 16) | (g << 8) | b;
  const random = mulberry32(seed);

  let best = { values: [] as number[], loss: Infinity };
  for (
    let attempt = 0;
    attempt < maxAttempts && best.loss > maxLoss;
    attempt++
  ) {
    const solver = new Solver(new Color(r, g, b), random);
    const result = solver.solve();
    if (result.loss < best.loss) best = result;
  }

  const fmt = (idx: number, multiplier = 1) =>
    Math.round(best.values[idx] * multiplier);
  const filter = `brightness(0) saturate(100%) invert(${fmt(0)}%) sepia(${
    fmt(1)
  }%) saturate(${fmt(2)}%) hue-rotate(${fmt(3, 3.6)}deg) brightness(${
    fmt(4)
  }%) contrast(${fmt(5)}%)`;
  return { filter, loss: best.loss };
}
