# Codex Project Notes: takko blog

Use this folder as quick onboarding context for new Codex sessions.

## Start Here
- Project type: Astro + Cloudflare Pages/Workers adapter
- Main commands:
  - `npm run dev` (local Astro dev)
  - `npm run check` (Astro + JS/TS type checks; `checkJs` is enabled)
  - `npm run build` (full production build check)
  - `npm run preview` (wrangler dev preview)
  - `npm run db:migrate` (local D1 migrations)
  - `npm run db:migrate:prod` (remote D1 migrations)

## Type Safety Notes
- `tsconfig.json` extends `astro/tsconfigs/base` and currently has `"checkJs": true`.
- JS files are type-checked via JSDoc + Astro types.
- Browser globals for settings/view transitions are declared in `src/types/global.d.ts`.
- Cloudflare runtime bindings on `locals.runtime.env` are declared in `src/env.d.ts`.

## Core Docs In This Folder
- `./PROJECT_MAP.md`: architecture, key files, where features live
- `./SETTINGS_ARCHITECTURE.md`: settings state model, storage keys, panel-controller events, and browser-only caveats

## Current Product Context
- Site focus: blog content for English learners (English/Japanese/Simple English via `T.astro`)
- UI has two nav states:
  - header at top
  - floating island on scroll
- Settings UI trigger lives in `SettingsCog.astro` and is rendered in both header and island contexts
- Shared panel lifecycle is managed centrally by `public/scripts/settings-panel-controller.js`
