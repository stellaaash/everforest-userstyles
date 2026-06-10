/**
 * Generates lib/lib.less: the everforest palette map, the solved CSS filter
 * chains, and the static #lib mixins. Run via `deno task generate:lib`.
 * Deterministic — reruns are byte-identical.
 */

import { flavors, palette, slotNotes, slots } from "./palette.ts";
import { solveFilter } from "./solver.ts";

const OUT = new URL("../../lib/lib.less", import.meta.url);

function paletteBlock(): string {
  const lines = ["/* deno-fmt-ignore */", "@everforest: {"];
  for (const flavor of flavors) {
    const pairs = slots
      .map((slot) => `@${slot}: ${palette[flavor][slot].toLowerCase()};`)
      .join(" ");
    lines.push(`  @${flavor}: { ${pairs} };`);
  }
  lines.push("};");
  return lines.join("\n");
}

function filterBlock(): string {
  const lines = ["/* deno-fmt-ignore */", "@everforest-filters: {"];
  for (const flavor of flavors) {
    const pairs = slots
      .map((slot) => {
        const { filter, loss } = solveFilter(palette[flavor][slot]);
        if (loss > 5) {
          console.warn(
            `high filter loss for ${flavor}/${slot} (${
              palette[flavor][slot]
            }): ${loss.toFixed(2)}`,
          );
        }
        return `@${slot}: ${filter};`;
      })
      .join(" ");
    lines.push(`  @${flavor}: { ${pairs} };`);
  }
  lines.push("};");
  return lines.join("\n");
}

function mappingDoc(): string {
  const lines = [
    "/*",
    " * Everforest palette (https://everforest.vercel.app/palette), medium contrast,",
    " * mapped onto the upstream catppuccin slot names. Slot -> everforest source:",
  ];
  for (const slot of slots) {
    lines.push(` *   ${slot.padEnd(9)} ${slotNotes[slot]}`);
  }
  lines.push(
    " *",
    " * GENERATED FILE - edit scripts/port/palette.ts and run `deno task generate:lib`.",
    " */",
  );
  return lines.join("\n");
}

const mixins = `\
#lib {
  .palette() {
${
  slots.map((slot) => `    @${slot}: @everforest[@@flavor][@${slot}];`).join(
    "\n",
  )
}
    @accent: @everforest[@@flavor][@@accentColor];

${
  slots
    .map((slot) =>
      `    @${slot}-filter: @everforest-filters[@@flavor][@${slot}];`
    )
    .join("\n")
}
    @accent-filter: @everforest-filters[@@flavor][@@accentColor];
  }

  .defaults() {
    color-scheme: if(@flavor = light, light, dark);

    ::selection {
      background-color: fade(@accent, 30%);
    }

    input,
    textarea {
      &::placeholder {
        color: @subtext0 !important;
      }
    }
  }

  .rgbify(@color) {
    @rgb: red(@color), green(@color), blue(@color);
  }

  .hslify(@color) {
    @raw: e(
      %("%s, %s%, %s%", hue(@color), saturation(@color), lightness(@color))
    );
  }

  .css-variables() {
${slots.map((slot) => `    --efs-${slot}: @${slot};`).join("\n")}
  }
}
`;

const content = [mappingDoc(), paletteBlock(), "", filterBlock(), "", mixins]
  .join("\n");

await Deno.writeTextFile(OUT, content);
console.log(`wrote ${OUT.pathname}`);
