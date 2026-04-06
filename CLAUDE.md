# takko blog

Astro blog for English learners. Content served in English, Simple English, and Japanese via `T.astro` slots.

## Stack
- Astro v5 + Cloudflare Pages/Workers adapter (`@astrojs/cloudflare`, static output)
- MDX blog posts in `src/content/blog/`
- Cloudflare D1 for likes + quiz endpoints
- TypeScript + `@astrojs/check` with `checkJs: true`

## Commands
```
npm run dev           # local Astro dev
npm run check         # Astro + JS/TS type checks
npm run build         # full production build check
npm run preview       # wrangler dev preview
npm run db:migrate    # local D1 migrations
npm run db:migrate:prod  # remote D1 migrations
```

Run `npm run check` after JS/TS changes. Run `npm run build` after UI or script changes.

## Key Architecture
- **Settings state**: `public/scripts/settings-state.js` — browser-only, exposes `window.TakkoSettings`
- **Settings panel lifecycle**: `public/scripts/settings-panel-controller.js` — manages open/close via `takko:settings-open` / `takko:settings-close` events
- **Language switching**: `src/components/i18n/LanguageSelector.astro` — persists to `localStorage`, dispatches `takko:language-changed`
- **Translations**: `src/components/i18n/T.astro` — slots for `en`, `en_simple`, `ja`
- **Apply settings on load**: `BaseHead.astro` calls `TakkoSettings.applyAll()` on initial paint and `astro:after-swap`
- Do not import `settings-state.js` in server-rendered Astro module code — browser-only

## Type Declarations
- Browser globals + settings API: `src/types/global.d.ts`
- Cloudflare runtime bindings (`locals.runtime.env.DB`, `RESEND_API_KEY`): `src/env.d.ts`

## Settings (localStorage)
| Setting | Key | Values |
|---|---|---|
| `theme` | `theme` | `light` \| `dark` |
| `showDefinitionHighlights` | `showDefinitionHighlights` | `'1'` \| `'0'` |
| `islandVisibility` | `islandVisibility` | `'1'` \| `'0'` |
| `textSize` | `textSize` | `sm` \| `md` \| `lg` |

All settings applied as classes on `<html>`. See `.claude/SETTINGS_ARCHITECTURE.md` for full detail.

## New Blog Posts
Always follow `.claude/making-blog-post-checklist.md` when creating a new post. Key image step: run `node scripts/optimize-images.mjs src/assets/images/blog/<post-slug>/` before publishing. No manual webp conversion needed — Astro handles avif/webp at build time.

## Reference Docs
- `.claude/PROJECT_MAP.md` — full file map, API routes, UI systems
- `.claude/SETTINGS_ARCHITECTURE.md` — settings state, storage keys, panel events
- `.claude/making-blog-post-checklist.md` — checklist for publishing a new post
