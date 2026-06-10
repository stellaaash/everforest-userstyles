/**
 * Vendors the external syntax-highlighting CSS that upstream styles import
 * from catppuccin-hosted services, rewritten for everforest:
 *  - variable-based sheets (hljs/prism/pygments): `--ctp-` renamed to `--efs-`
 *    (the variables themselves are defined by each style via #lib.css-variables)
 *  - chroma sheets: raw catppuccin hexes remapped to everforest
 *
 * Usage: deno task vendor:css
 */

import { parseArgs } from "@std/cli";
import { buildHexMap, upstreamTree } from "./main.ts";

const VARIABLE_SHEETS: [string, string][] = [
  [
    "https://unpkg.com/@catppuccin/highlightjs@1.0.0/css/catppuccin-variables.css",
    "lib/hljs-variables.css",
  ],
  [
    "https://unpkg.com/@catppuccin/highlightjs@1.0.0/css/catppuccin-variables.important.css",
    "lib/hljs-variables.important.css",
  ],
  [
    "https://prismjs.catppuccin.com/variables.important.css",
    "lib/prism-variables.important.css",
  ],
  [
    "https://python.catppuccin.com/pygments/catppuccin-variables.important.css",
    "lib/pygments-variables.important.css",
  ],
];

const CHROMA_SHEETS: [string, string][] = [
  [
    "https://chroma.catppuccin.com/latte-chroma-style.css",
    "lib/light-chroma-style.css",
  ],
  [
    "https://chroma.catppuccin.com/mocha-chroma-style.css",
    "lib/dark-chroma-style.css",
  ],
];

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return await res.text();
}

if (import.meta.main) {
  for (const [url, out] of VARIABLE_SHEETS) {
    const css = (await fetchText(url)).replaceAll("--ctp-", "--efs-");
    await Deno.writeTextFile(out, css);
    console.log(`wrote ${out}`);
  }

  const args = parseArgs(Deno.args, { string: ["upstream-dir"] });
  const hexMap = await buildHexMap(await upstreamTree(args));
  for (const [url, out] of CHROMA_SHEETS) {
    const css = (await fetchText(url)).replace(
      /#([0-9a-fA-F]{6})\b/g,
      (all, hex) => hexMap.get(`#${hex.toLowerCase()}`) ?? all,
    );
    await Deno.writeTextFile(out, css);
    console.log(`wrote ${out}`);
  }
}
