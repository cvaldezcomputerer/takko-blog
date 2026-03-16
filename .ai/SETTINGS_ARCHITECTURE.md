# Settings Architecture

## Source Of Truth
- Browser helper: `public/scripts/settings-state.js`
- Global API exposed on `window`:
  - `window.TakkoSettings`
- Shared panel controller: `public/scripts/settings-panel-controller.js`
- Global API exposed on `window`:
  - `window.TakkoSettingsPanelController`

## Type Declarations Related To Settings
- Browser globals are declared in `src/types/global.d.ts`:
  - `window.TakkoSettings`
  - settings cog binding flags (`__settingsCog*`)
  - `document.startViewTransition` (optional API)
- Cloudflare runtime env typing lives in `src/env.d.ts` (`App.Locals.runtime.env`).

## Important Warning
- `settings-state.js` is browser-only.
- It directly uses `window`, `document`, and `localStorage`.
- Do not import this file into server-rendered Astro module code.
- Load it as a client script (currently from `BaseHead.astro`).

## Current Settings
- `theme`
  - Stored in `localStorage` key: `theme`
  - Values used currently: `light` | `dark`
  - If missing, defaults to system preference (`prefers-color-scheme`)
- `showDefinitionHighlights`
  - Stored in `localStorage` key: `showDefinitionHighlights`
  - Values: `'1'` (on) / `'0'` (off)
  - Applied by toggling root class:
    - off => `html.definition-highlights-off`
- `islandVisibility`
  - Stored in `localStorage` key: `islandVisibility`
  - Values: `'1'` (on) / `'0'` (off)
  - Applied by toggling root class:
    - off => `html.island-hidden`
- `textSize`
  - Stored in `localStorage` key: `textSize`
  - Values: `sm` | `md` | `lg` (default: `md`)
  - Applied by toggling root class:
    - `html.text-size-sm`
    - `html.text-size-md`
    - `html.text-size-lg`
  - CSS variables (`--base-font-size-desktop`, `--base-font-size-mobile`) in `src/styles/global.css` respond to these classes

## Removed Setting
- `hideImages` was removed and is no longer part of persisted settings or UI.

## Components Connected To Settings
- `BaseHead.astro`
  - Loads settings helper + panel controller scripts
  - Calls `TakkoSettings.applyAll()` during initial paint and on `astro:after-swap`
- `SettingsCog.astro`
  - Toggles `theme`
  - Toggles `showDefinitionHighlights`
  - Toggles `islandVisibility`
  - Cycles `textSize`
  - Reflects current values in setting labels
  - Uses language-aware value labels and refreshes them on `takko:language-changed`
- `settings-panel-controller.js`
  - Owns the shared settings sheet/backdrop DOM lifecycle
  - Owns trigger binding/open/close behavior across header/island cogs
  - Handles global close interactions: backdrop click, outside click, `Escape`
  - Outside-click close ignores `.language-controls` so language switch does not auto-close settings
  - Supports cross-component open requests via:
    - `takko:settings-open` (detail: `{ wrapper }`)
    - `takko:settings-close`
- `LanguageSelector.astro`
  - File: `src/components/i18n/LanguageSelector.astro`
  - Persists language in `localStorage` key `takko-blog-lang`
  - Dispatches `takko:language-changed` after language updates
- `ThemeToggle.astro`
  - File: `src/components/ui/ThemeToggle.astro`
  - Calls `TakkoSettings.toggleTheme()`
- `Explain.astro`
  - File: `src/components/content/Explain.astro`
  - Reads root class (`definition-highlights-off`) via CSS to disable highlight behavior site-wide

## Pattern For Adding New Settings
1. Add getter/setter/apply functions in `public/scripts/settings-state.js`.
2. Persist to `localStorage` with a stable key.
3. Add UI control in `SettingsCog.astro` (toggle + label value updates).
4. Apply effect globally via class/attribute on `<html>` where possible.
5. Add CSS/logic in affected components to react to that global class/state.
6. If UI flow depends on panel behavior, route it through `takko:settings-open`/`takko:settings-close` events rather than direct DOM globals.
7. Verify with `npm run check` and `npm run build`.
