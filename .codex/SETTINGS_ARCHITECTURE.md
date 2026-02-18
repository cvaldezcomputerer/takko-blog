# Settings Architecture

## Source Of Truth
- Browser helper: `public/scripts/settings-state.js`
- Global API exposed on `window`:
  - `window.TakkoSettings`

## Important Warning
- `settings-state.js` is browser-only.
- It directly uses `window`, `document`, and `localStorage`.
- Do not import this file into server-rendered Astro module code.
- Load it as a client script (currently from `BaseHead.astro`).

## Current Settings
- `theme`
  - Stored in `localStorage` key: `theme`
  - Values used currently: `light` | `dark`
- `showDefinitionHighlights`
  - Stored in `localStorage` key: `showDefinitionHighlights`
  - Values: `'1'` (on) / `'0'` (off)
  - Applied by toggling root class:
    - off => `html.definition-highlights-off`

## Components Connected To Settings
- `BaseHead.astro`
  - Loads helper script
  - Calls `TakkoSettings.applyAll()` during initial paint and on `astro:after-swap`
- `SettingsCog.astro`
  - Toggles `theme`
  - Toggles `showDefinitionHighlights`
  - Reflects current values in setting labels
- `ThemeToggle.astro`
  - Calls `TakkoSettings.toggleTheme()`
- `Explain.astro`
  - Reads root class (`definition-highlights-off`) via CSS to disable highlight behavior site-wide

## Pattern For Adding New Settings
1. Add getter/setter/apply functions in `public/scripts/settings-state.js`.
2. Persist to `localStorage` with a stable key.
3. Add UI control in `SettingsCog.astro`.
4. Apply effect globally via class/attribute on `<html>` where possible.
5. Add CSS/logic in affected components to react to global class/state.
6. Verify with `npm run build`.

