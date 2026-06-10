<h3 align="center">
  🌲 Everforest Userstyles
</h3>

<p align="center">
  Comfortable & pleasant <a href="https://github.com/sainnhe/everforest">everforest</a> themes for your favorite websites — a full port of <a href="https://github.com/catppuccin/userstyles">catppuccin/userstyles</a>.
</p>

---

133 userstyles, each available as **Everforest Dark** and **Everforest Light** (medium contrast) with a configurable accent color, installable per-site with [Stylus](https://github.com/openstyles/stylus).

## Usage

1. Install [Stylus](https://github.com/openstyles/stylus) for [Firefox](https://addons.mozilla.org/en-US/firefox/addon/styl-us/) or [Chrome](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne).
2. Browse the [`styles/`](styles/) directory and open the `everforest.user.less` file of any style **as raw** — Stylus will offer to install it.
3. Configure flavor (dark/light) and accent in Stylus' style configuration panel.

To install **everything at once**, download `import.json` from the latest [`all-userstyles-export` release](https://github.com/stellaaash/everforest-userstyles/releases/tag/all-userstyles-export) and import it in Stylus' settings.

## How this repo works

This is a **generated port**: the styles are produced from a pinned commit of [catppuccin/userstyles](https://github.com/catppuccin/userstyles) (see [`UPSTREAM_COMMIT`](UPSTREAM_COMMIT)) by the codemod in [`scripts/port/`](scripts/port/), which swaps the palette, branding, and flavor model. **Never edit files under `styles/` by hand** — add a rule to the codemod and re-run:

```sh
deno task port          # regenerate styles/ from the pinned upstream commit
deno task generate:lib  # regenerate lib/lib.less from scripts/port/palette.ts
deno task vendor:css    # re-vendor the syntax-highlighting CSS in lib/
deno task lint          # upstream's lint suite, ported
```

To sync with upstream: update the `upstream` branch, write the new commit hash to `UPSTREAM_COMMIT`, re-run `deno task port`, and review the diff.

## Palette mapping

The upstream code uses catppuccin's 26 semantic color slots; this port keeps the slot names and maps them to [everforest](https://everforest.vercel.app/palette) (medium contrast). Where everforest has no equivalent (catppuccin has 14 accents, everforest 7), shades are derived from exact everforest anchors — see [`scripts/port/palette.ts`](scripts/port/palette.ts) for every value and derivation formula.

| Slot                                                                                             | Everforest source                              |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `text`                                                                                           | fg                                             |
| `overlay0`–`overlay2`                                                                            | grey0–grey2                                    |
| `surface0`–`surface2`, `base`, `mantle`, `crust`                                                 | background levels (bg_dim–bg5)                 |
| `red`, `peach`, `yellow`, `green`, `teal`, `blue`, `mauve`                                       | red, orange, yellow, green, aqua, blue, purple |
| `maroon`, `sky`, `sapphire`, `lavender`, `pink`, `flamingo`, `rosewater`, `subtext0`, `subtext1` | derived shades                                 |

The catppuccin flavor model (latte/frappé/macchiato/mocha) maps to `light`/`dark`. Not ported: **codeberg** (it only imports the prebuilt catppuccin/gitea theme, which has no everforest build).

## Credits & license

- [**catppuccin/userstyles**](https://github.com/catppuccin/userstyles) — all of the actual site-theming CSS comes from the Catppuccin community's work. 💜
- [**sainnhe/everforest**](https://github.com/sainnhe/everforest) — the everforest palette.

[MIT](LICENSE), retaining Catppuccin's copyright for the upstream work.
