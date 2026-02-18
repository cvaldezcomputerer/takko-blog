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
- `src/components/SettingsCog.astro`
  - Settings UI and toggle wiring
- `src/components/ThemeToggle.astro`
  - Standalone theme button (hidden on mobile in header)
- `src/components/Explain.astro`
  - Inline definition highlight/tooltip component
  - Disabled globally via root class when setting is off
- `public/scripts/settings-state.js`
  - Centralized browser-only settings state helper

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

## Notes For Edits
- Changes to global preferences usually touch:
  - `public/scripts/settings-state.js`
  - `src/components/SettingsCog.astro`
  - Possibly `src/components/BaseHead.astro` if pre-paint behavior is needed
- Run `npm run build` after UI or script changes (project depends heavily on client behavior + transitions)

