/**
 * The everforest palette, mapped onto the 26 semantic slots used throughout
 * the userstyles (slot names kept from upstream so the port stays mechanical).
 *
 * Sources of exact values: https://everforest.vercel.app/palette
 * (canonical sainnhe/everforest, medium contrast).
 *
 * 7 of the 14 accent slots have no everforest equivalent and are derived from
 * exact anchors; formulas are noted per color. RGB mixes are LESS mix()
 * semantics (channel-weighted average); "arc" is an HSL interpolation taking
 * the short hue arc (used where RGB mixing would pass through grey).
 */

export const slots = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
  "text",
  "subtext1",
  "subtext0",
  "overlay2",
  "overlay1",
  "overlay0",
  "surface2",
  "surface1",
  "surface0",
  "base",
  "mantle",
  "crust",
] as const;

export type Slot = (typeof slots)[number];
export type Flavor = "light" | "dark";

export const flavors = ["light", "dark"] as const;

export const palette: Record<Flavor, Record<Slot, string>> = {
  // Everforest Light (medium)
  light: {
    rosewater: "#DA9889", // derived: lighten(desaturate(spin(red, 10), 40%), 5%)
    flamingo: "#E16B68", // derived: desaturate(red, 25%)
    pink: "#E86296", // derived: mix(mauve, red, 65%)
    mauve: "#DF69BA", // purple
    red: "#F85552", // red
    maroon: "#F76343", // derived: mix(red, peach, 65%)
    peach: "#F57D26", // orange
    yellow: "#DFA000", // yellow
    green: "#8DA101", // green
    teal: "#35A77C", // aqua
    sky: "#379F99", // derived: arc(teal, blue, 60%)
    sapphire: "#389AAF", // derived: arc(blue, teal, 70%)
    blue: "#3A94C5", // blue
    lavender: "#6D4ED2", // derived: arc(blue, mauve, 55%)
    text: "#5C6A72", // fg
    subtext1: "#697777", // derived: mix(fg, grey2, 66%)
    subtext0: "#75847C", // derived: mix(fg, grey2, 33%)
    overlay2: "#829181", // grey2
    overlay1: "#939F91", // grey1
    overlay0: "#A6B0A0", // grey0
    surface2: "#BDC3AF", // bg5
    surface1: "#E0DCC7", // bg4
    surface0: "#E6E2CC", // bg3
    base: "#FDF6E3", // bg0
    mantle: "#F4F0D9", // bg1
    crust: "#EFEBD4", // bg_dim
  },
  // Everforest Dark (medium)
  dark: {
    rosewater: "#D0B2AD", // derived: lighten(desaturate(spin(red, 10), 40%), 5%)
    flamingo: "#D39193", // derived: desaturate(red, 25%)
    pink: "#DC90A3", // derived: mix(mauve, red, 65%)
    mauve: "#D699B6", // purple
    red: "#E67E80", // red
    maroon: "#E6877C", // derived: mix(red, peach, 65%)
    peach: "#E69875", // orange
    yellow: "#DBBC7F", // yellow
    green: "#A7C080", // green
    teal: "#83C092", // aqua
    sky: "#81BE9F", // derived: mix(teal, blue, 60%)
    sapphire: "#80BCA9", // derived: mix(blue, teal, 70%)
    blue: "#7FBBB3", // blue
    lavender: "#8E8AC8", // derived: arc(blue, mauve, 55%)
    text: "#D3C6AA", // fg
    subtext1: "#C1BCA7", // derived: mix(fg, grey2, 66%)
    subtext0: "#AFB3A3", // derived: mix(fg, grey2, 33%)
    overlay2: "#9DA9A0", // grey2
    overlay1: "#859289", // grey1
    overlay0: "#7A8478", // grey0
    surface2: "#56635F", // bg5
    surface1: "#475258", // bg3
    surface0: "#343F44", // bg1
    base: "#2D353B", // bg0
    mantle: "#232A2E", // bg_dim
    crust: "#1E2326", // bg_dim (hard)
  },
};

/** Everforest source name (or derivation) per slot, for documentation. */
export const slotNotes: Record<Slot, string> = {
  rosewater: "derived: soft desaturated red",
  flamingo: "derived: desaturate(red, 25%)",
  pink: "derived: mix(mauve, red, 65%)",
  mauve: "purple",
  red: "red",
  maroon: "derived: mix(red, peach, 65%)",
  peach: "orange",
  yellow: "yellow",
  green: "green",
  teal: "aqua",
  sky: "derived: between aqua and blue",
  sapphire: "derived: between blue and aqua",
  blue: "blue",
  lavender: "derived: HSL midpoint of blue and purple",
  text: "fg",
  subtext1: "derived: mix(fg, grey2, 66%)",
  subtext0: "derived: mix(fg, grey2, 33%)",
  overlay2: "grey2",
  overlay1: "grey1",
  overlay0: "grey0",
  surface2: "bg5",
  surface1: "bg3 (light: bg4)",
  surface0: "bg1 (light: bg3)",
  base: "bg0",
  mantle: "bg_dim (light: bg1)",
  crust: "hard bg_dim (light: bg_dim)",
};

/** User-facing labels for the accent picker, by hue. */
export const accentOptions: [Slot | "subtext0", string][] = [
  ["rosewater", "Rosewater"],
  ["flamingo", "Flamingo"],
  ["pink", "Pink"],
  ["mauve", "Purple"],
  ["red", "Red"],
  ["maroon", "Maroon"],
  ["peach", "Orange"],
  ["yellow", "Yellow"],
  ["green", "Green"],
  ["teal", "Aqua"],
  ["sky", "Sky"],
  ["sapphire", "Sapphire"],
  ["blue", "Blue"],
  ["lavender", "Lavender"],
  ["subtext0", "Grey"],
];
