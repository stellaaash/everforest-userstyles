/**
 * The port codemod: regenerates styles/ from the pinned upstream
 * catppuccin/userstyles tree, swapping the palette and branding to everforest.
 *
 * Usage: deno task port [--upstream-dir <dir>]
 * Default input is `git archive $(cat UPSTREAM_COMMIT)` extracted to a temp dir.
 *
 * Deterministic and idempotent: output depends only on the upstream tree and
 * the rules in this directory. Never hand-edit generated styles — add a rule
 * here instead.
 */

import { parseArgs } from "@std/cli";
import * as path from "@std/path";
import { palette, type Slot } from "./palette.ts";

const REPO = "stellaaash/everforest-userstyles";
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;

const FLAVOR_SELECTS = `\
@var select lightFlavor "Light Flavor" ["light:Everforest Light*"]
@var select darkFlavor "Dark Flavor" ["dark:Everforest Dark*"]`;

const ACCENT_SELECT =
  `@var select accentColor "Accent" ["rosewater:Rosewater", "flamingo:Flamingo", "pink:Pink", "mauve:Purple", "red:Red", "maroon:Maroon", "peach:Orange", "yellow:Yellow", "green:Green*", "teal:Aqua", "sky:Sky", "sapphire:Sapphire", "blue:Blue", "lavender:Lavender", "subtext0:Grey"]`;

const IMPORT_REWRITES: [string, string][] = [
  [
    "https://userstyles.catppuccin.com/lib/lib.less",
    `${RAW}/lib/lib.less`,
  ],
  [
    "https://prismjs.catppuccin.com/variables.important.css",
    `${RAW}/lib/prism-variables.important.css`,
  ],
  [
    "https://python.catppuccin.com/pygments/catppuccin-variables.important.css",
    `${RAW}/lib/pygments-variables.important.css`,
  ],
  [
    "https://unpkg.com/@catppuccin/highlightjs@1.0.0/css/catppuccin-variables.important.css",
    `${RAW}/lib/hljs-variables.important.css`,
  ],
  [
    "https://unpkg.com/@catppuccin/highlightjs@1.0.0/css/catppuccin-variables.css",
    `${RAW}/lib/hljs-variables.css`,
  ],
  // flavor-interpolated: @{lightFlavor}-chroma-style.css -> light-chroma-style.css
  ["https://chroma.catppuccin.com/", `${RAW}/lib/`],
];

/**
 * Styles that cannot be ported. codeberg is only an import shim for the
 * prebuilt catppuccin/gitea theme CSS (hexes + build-time derived rgb()
 * shades); there is no everforest gitea build to swap in.
 */
const SKIP_PORTS = new Set(["codeberg"]);

/** Lines allowed to survive in generated output despite mentioning upstream. */
const POSTCHECK_ALLOWLIST: RegExp[] = [
  /^@author /, // deliberate upstream attribution
];

/** One-off, site-specific text fixes that aren't worth a general rule. */
const TEXT_FIXES: [string, string][] = [
  // trinket: prose comment about the theme itself
  ["If styled with Catppuccin,", "If themed,"],
  // mastodon: don't theme catppuccin's own instance
  ['  domain("social.catppuccin.com"),\n', ""],
  // modrinth: prose comment
  ["TODO: Use Catppuccin palette colors?", "TODO: Use palette colors?"],
  // regex101: prose comment
  [
    "Canvas is pulling Catppuccin colours from CSS variables",
    "Canvas is pulling theme colours from CSS variables",
  ],
  // github: upstream swaps the loading gif for a catppuccin-colored one;
  // there is no everforest equivalent, so keep GitHub's default
  [
    `    img[src="https://github.githubassets.com/assets/mona-loading-default-c3c7aad1282f.gif"] {
      content: url("https://giscus.catppuccin.com/assets/loading_48x48.gif");
    }

`,
    "",
  ],
];

export async function upstreamTree(
  args: ReturnType<typeof parseArgs>,
): Promise<string> {
  if (typeof args["upstream-dir"] === "string") return args["upstream-dir"];

  const pin = (await Deno.readTextFile("UPSTREAM_COMMIT")).trim();
  const dir = await Deno.makeTempDir({ prefix: "everforest-upstream-" });
  const archive = new Deno.Command("git", {
    args: ["archive", pin],
    stdout: "piped",
  }).spawn();
  const tar = new Deno.Command("tar", {
    args: ["-x", "-C", dir],
    stdin: "piped",
  }).spawn();
  await archive.stdout.pipeTo(tar.stdin);
  const [a, t] = await Promise.all([archive.status, tar.status]);
  if (!a.success || !t.success) {
    throw new Error("failed to extract upstream tree");
  }
  console.log(`upstream ${pin} -> ${dir}`);
  return dir;
}

/** catppuccin hex -> everforest hex, parsed from the upstream lib. */
export async function buildHexMap(
  upstreamDir: string,
): Promise<Map<string, string>> {
  const lib = await Deno.readTextFile(path.join(upstreamDir, "lib/lib.less"));
  const paletteBlock = lib.match(/@catppuccin:\s*\{([\s\S]*?)\n\};/);
  if (!paletteBlock) {
    throw new Error("could not parse upstream @catppuccin map");
  }

  const map = new Map<string, string>();
  const flavorRe = /@(latte|frappe|macchiato|mocha):\s*\{([^}]*)\}/g;
  for (const [, ctpFlavor, body] of paletteBlock[1].matchAll(flavorRe)) {
    const target = ctpFlavor === "latte" ? "light" : "dark";
    const pairRe = /@(\w+):\s*(#[0-9a-fA-F]{6})/g;
    for (const [, slot, hex] of body.matchAll(pairRe)) {
      // latte wins on (unlikely) cross-flavor hex collisions so light stays light
      const key = hex.toLowerCase();
      if (!map.has(key) || ctpFlavor === "latte") {
        map.set(
          key,
          palette[target as "light" | "dark"][slot as Slot].toLowerCase(),
        );
      }
    }
  }
  if (map.size !== 104) {
    console.warn(
      `hex map has ${map.size} entries, expected 104 (4 flavors x 26)`,
    );
  }
  return map;
}

/**
 * Deletes `... when (@flavor = frappe|macchiato) { ... }` blocks. With a
 * single dark flavor only the mocha branch survives (renamed to `dark`).
 */
function dropExtraDarkGuards(css: string): string {
  const re = /^[ \t]*[^{}\n]*?when \(@flavor = (?:frappe|macchiato)\)\s*\{/m;
  let match;
  while ((match = css.match(re))) {
    const start = match.index!;
    let i = start + match[0].length;
    let depth = 1;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    // also swallow the trailing newline(s)
    while (css[i] === "\n" && (css[start - 1] === "\n" || start === 0)) i++;
    css = css.slice(0, start) + css.slice(i);
  }
  return css;
}

function transformHeader(css: string, port: string): string {
  css = css
    .replace(/^@name (.*) Catppuccin$/m, "@name $1 Everforest")
    .replace(
      /^@namespace github\.com\/catppuccin\/userstyles\/styles\/(.*)$/m,
      `@namespace github.com/${REPO}/styles/$1`,
    )
    .replace(
      /^@homepageURL .*$/m,
      `@homepageURL https://github.com/${REPO}/tree/main/styles/${port}`,
    )
    .replace(
      /^@updateURL .*$/m,
      `@updateURL https://github.com/${REPO}/raw/main/styles/${port}/everforest.user.less`,
    )
    .replace(
      /^@supportURL .*$/m,
      `@supportURL https://github.com/${REPO}/issues?q=is%3Aopen+is%3Aissue+label%3A${port}`,
    )
    .replace(
      /^@description Soothing pastel theme for (.*)$/m,
      "@description Comfortable & pleasant green theme for $1",
    )
    .replace(
      /^@author .*$/m,
      "@author stellaaash (Everforest port of Catppuccin's userstyle)",
    )
    .replace(
      /^@var select lightFlavor .*\n@var select darkFlavor .*$/m,
      FLAVOR_SELECTS,
    )
    .replace(/^@var select accentColor "Accent" .*$/m, ACCENT_SELECT);
  return css;
}

function remapHexes(css: string, hexMap: Map<string, string>): string {
  // 8-digit (#rrggbbaa) first so the 6-digit pass can't corrupt them,
  // then 6-digit; both in `#` and `%23` (SVG data URI) forms.
  css = css.replace(
    /(#|%23)([0-9a-fA-F]{6})([0-9a-fA-F]{2})\b/g,
    (all, prefix, hex, alpha) => {
      const to = hexMap.get(`#${hex.toLowerCase()}`);
      return to ? `${prefix}${to.slice(1)}${alpha}` : all;
    },
  );
  css = css.replace(/(#|%23)([0-9a-fA-F]{6})\b/g, (all, prefix, hex) => {
    const to = hexMap.get(`#${hex.toLowerCase()}`);
    return to ? `${prefix}${to.slice(1)}` : all;
  });
  return css;
}

function transformStyle(
  css: string,
  port: string,
  hexMap: Map<string, string>,
): string {
  css = dropExtraDarkGuards(css);
  css = transformHeader(css, port);

  for (const [from, to] of TEXT_FIXES) css = css.replaceAll(from, to);

  for (const [from, to] of IMPORT_REWRITES) css = css.replaceAll(from, to);

  css = css
    .replaceAll("@catppuccin-filters[", "@everforest-filters[")
    .replaceAll("@catppuccin[", "@everforest[")
    .replaceAll("#catppuccin(", "#everforest(")
    // identifier prefixes, e.g. `@keyframes catppuccin-foo`, mixin
    // `.catppuccin_bar()` (runs after the import rewrites, so no URLs
    // still contain "catppuccin-")
    .replaceAll("catppuccin-", "everforest-")
    .replaceAll("catppuccin_", "everforest_")
    .replaceAll("--ctp-", "--efs-")
    .replace(/\blatte\b/g, "light")
    .replace(/\bmocha\b/g, "dark")
    .replace(/\bfrappe\b/g, "dark")
    .replace(/\bmacchiato\b/g, "dark");

  css = remapHexes(css, hexMap);
  return css;
}

function postCheck(port: string, css: string): string[] {
  const problems: string[] = [];
  for (
    const re of [
      /catppuccin/gi,
      /--ctp-/g,
      /\b(?:latte|frappe|macchiato|mocha)\b/g,
    ]
  ) {
    for (const m of css.matchAll(re)) {
      const lineStart = css.lastIndexOf("\n", m.index!) + 1;
      const lineEnd = css.indexOf("\n", m.index!);
      const lineText = css.slice(
        lineStart,
        lineEnd === -1 ? undefined : lineEnd,
      );
      if (!POSTCHECK_ALLOWLIST.some((a) => a.test(lineText))) {
        const line = css.slice(0, m.index).split("\n").length;
        problems.push(`${port}:${line}: leftover "${m[0]}"`);
      }
    }
  }
  return problems;
}

async function transformUserstylesYml(upstreamDir: string): Promise<void> {
  let yml = await Deno.readTextFile(
    path.join(upstreamDir, "scripts/userstyles.yml"),
  );
  // Single collaborator: stellaaash. Strip the upstream collaborator roster
  // and maintainer attributions (they maintain the catppuccin styles, not
  // this port); upstream credit lives in the README.
  yml = yml.replace(
    /^collaborators:\n(?:  - &\S+ \S+\n)+/m,
    "collaborators:\n  - &stellaaash stellaaash\n",
  );
  yml = yml.replace(
    /^(    current-maintainers:) \[.*\]$/gm,
    "$1 [*stellaaash]",
  );
  yml = yml.replace(/^    past-maintainers: \[.*\]\n/gm, "");
  for (const port of SKIP_PORTS) {
    yml = yml.replace(new RegExp(`^  ${port}:\\n(?:    .*\\n)+`, "m"), "");
  }
  // prose notes mentioning the upstream theme by name
  yml = yml.replaceAll("Catppuccin-themed", "Everforest-themed");
  await Deno.writeTextFile("scripts/userstyles.yml", yml);
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, { string: ["upstream-dir"] });
  const upstreamDir = await upstreamTree(args);
  const hexMap = await buildHexMap(upstreamDir);

  const allProblems: string[] = [];
  let count = 0;

  const entries = [...Deno.readDirSync(path.join(upstreamDir, "styles"))]
    .filter((e) => e.isDirectory && !SKIP_PORTS.has(e.name))
    .map((e) => e.name)
    .sort();

  for (const port of SKIP_PORTS) {
    try {
      await Deno.remove(path.join("styles", port), { recursive: true });
    } catch {
      // already gone
    }
  }

  for (const port of entries) {
    const src = path.join(upstreamDir, "styles", port, "catppuccin.user.less");
    const css = await Deno.readTextFile(src);
    const out = transformStyle(css, port, hexMap);
    allProblems.push(...postCheck(port, out));

    const outDir = path.join("styles", port);
    await Deno.mkdir(outDir, { recursive: true });
    await Deno.writeTextFile(path.join(outDir, "everforest.user.less"), out);
    // the upstream-named file is fully replaced by everforest.user.less
    try {
      await Deno.remove(path.join(outDir, "catppuccin.user.less"));
    } catch {
      // already gone
    }
    count++;
  }

  await transformUserstylesYml(upstreamDir);

  console.log(`transformed ${count} styles`);
  if (allProblems.length) {
    console.error(
      `\npost-check found ${allProblems.length} leftover reference(s):`,
    );
    for (const p of allProblems) console.error(`  ${p}`);
    Deno.exit(1);
  }
}
