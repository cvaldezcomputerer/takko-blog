# Project Map

## Stack
- Framework: Astro (`astro` v5)
- Deploy target: Cloudflare (`@astrojs/cloudflare`, static output)
- Content: MDX blog posts in `src/content/blog`
- Data: Cloudflare D1 for likes + quiz endpoints (`wrangler.jsonc`, `migrations/`)

## High-Value Paths
- `src/components/BaseHead.astro`
  - Global head tags, theme/preference application on load and route swap
- `src/components/Header.astro`
  - Main top nav
  - Idle/sleep logo behavior
  - Scroll behavior that hides header
- `src/components/FloatingIsland.astro`
  - Appears after scroll, includes language controls and settings cog
- `src/components/LanguageSelector.astro`
  - Handles language switching + persisted language preference
  - Emits `takko:language-changed` for UI that mirrors language-specific labels
- `src/components/SettingsCog.astro`
  - Settings UI + toggle wiring (no panel orchestration ownership)
- `src/components/ThemeToggle.astro`
  - Standalone theme button (hidden on mobile in header)
- `src/components/Explain.astro`
  - Inline definition highlight/tooltip component
  - Disabled globally via root class when setting is off
- `public/scripts/settings-state.js`
  - Centralized browser-only settings state helper
- `public/scripts/settings-panel-controller.js`
  - Centralized open/close lifecycle for shared settings sheet/backdrop
  - Listens to `takko:settings-open` and `takko:settings-close`
  - Ignores clicks inside `.language-controls` so settings can stay open while switching language

## Content / Pages
- Blog listing: `src/pages/blog/index.astro`
- Blog post route: `src/pages/blog/[...slug].astro`
- Home: `src/pages/index.astro`
- Additional: `src/pages/about.astro`, `src/pages/contact.astro`, `src/pages/404.astro`

## API Routes
- Likes: `src/pages/api/likes/[slug].js`
- Quiz: `src/pages/api/quiz/[id].js`
- Contact: `src/pages/api/contact.js`

## Key UI Systems
- Translation/language slots: `src/components/T.astro`
- Theme: root `.dark` class + persisted setting
- Study setting:
  - `showDefinitionHighlights` controls `Explain.astro` visuals/tooltip behavior
- Island setting:
  - `islandVisibility` controls root `html.island-hidden` class
- Text size setting:
  - `textSize` controls root classes `html.text-size-sm|md|lg` and global font size vars

## Notes For Edits
- Changes to global preferences usually touch:
  - `public/scripts/settings-state.js`
  - `src/components/SettingsCog.astro` (value toggles/labels only)
  - `public/scripts/settings-panel-controller.js` (sheet open/close behavior)
  - `src/components/BaseHead.astro` (script loading/pre-paint behavior)
- Run `npm run build` after UI or script changes (project depends heavily on client behavior + transitions)
