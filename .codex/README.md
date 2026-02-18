# Codex Project Notes: takko blog

Use this folder as quick onboarding context for new Codex sessions.

## Start Here
- Project type: Astro + Cloudflare Pages/Workers adapter
- Main commands:
  - `npm run dev` (local Astro dev)
  - `npm run build` (full production build check)
  - `npm run preview` (wrangler dev preview)
  - `npm run db:migrate` (local D1 migrations)
  - `npm run db:migrate:prod` (remote D1 migrations)

## Core Docs In This Folder
- `./PROJECT_MAP.md`: architecture, key files, where features live
- `./SETTINGS_ARCHITECTURE.md`: settings state model, storage keys, and browser-only caveats

## Current Product Context
- Site focus: blog content for English learners (English/Japanese/Simple English via `T.astro`)
- UI has two nav states:
  - header at top
  - floating island on scroll
- Settings UI lives in `SettingsCog.astro` and is rendered in both header and island contexts

