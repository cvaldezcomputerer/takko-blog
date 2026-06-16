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

## Styling & CSS Tokens
All design tokens live in `:root` / `.dark` in `src/styles/global.css`. **New components (and edits) must use these tokens instead of raw hex/px values** so palette and spacing stay consistent and dark mode comes for free.

- **Color**: `--accent`/`--accent-dark`, `--background`, `--text`, `--secondary`, `--highlight`. Semantic: `--surface`, `--border`, `--border-strong`, `--text-muted`, `--success`/`--success-strong`/`--success-bg`, `--danger`/`--danger-strong`/`--danger-bg`, `--info`. RGB triplets for alpha: `rgba(var(--gray), 0.3)`, `rgb(var(--black))`.
- **Radius**: `--radius-sm` (2px), `--radius` (8px), `--radius-md` (12px, cards), `--radius-lg` (16px), `--radius-pill`.
- **Spacing**: `--space-1`…`--space-8` (0.25rem→4rem) for padding/margin/gap.
- Each token has a `.dark` override where needed, so prefer tokens over writing your own `:global(.dark)` rule.
- **Exceptions are intentional**: the scrapbook/polaroid components (Quiz, Recipe, Gallery, TwoImages) deliberately use fixed hex and off-scale spacing for their paper aesthetic — don't "tokenize" those.
- `box-sizing: border-box` is reset globally; don't re-declare per component.

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
Use the **new-post skill** (`.claude/skills/new-post/SKILL.md`) when creating a new post — it is the source of truth and scaffolds the MDX + image folder, then walks through drafting (English + Simple first, Japanese last), the dev editor, image optimization, and publishing. Trigger it for any "new/make/write a post" request, or run `/new-post <slug>` directly. Key image step: run `node scripts/optimize-images.mjs src/assets/images/blog/<post-slug>/` before publishing. No manual webp conversion needed — Astro handles avif/webp at build time.

There is also a **dev editor** (dev only): `npm run dev`, then `http://localhost:4321/dev/editor` (port may differ) to edit post text, captions, and image order in a structured panel that writes back to the `.mdx`. See `src/pages/dev/editor/` and `scripts/dev-editor-integration.mjs`.

## Reference Docs
- `.claude/PROJECT_MAP.md` — full file map, API routes, UI systems
- `.claude/SETTINGS_ARCHITECTURE.md` — settings state, storage keys, panel events
- `.claude/skills/new-post/SKILL.md` — authoritative process for creating a new post
