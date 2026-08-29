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
npm run check:post    # verify a blog post (<slug> or -- --all)
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
- Cloudflare runtime bindings (`locals.runtime.env.DB`): `src/env.d.ts`

## Settings (localStorage)
| Setting | Key | Values |
|---|---|---|
| `theme` | `theme` | `light` \| `dark` |
| `showDefinitionHighlights` | `showDefinitionHighlights` | `'1'` \| `'0'` |
| `islandVisibility` | `islandVisibility` | `'1'` \| `'0'` |
| `textSize` | `textSize` | `sm` \| `md` \| `lg` |

All settings applied as classes on `<html>`. See `.claude/SETTINGS_ARCHITECTURE.md` for full detail.

## New Blog Posts
Use the **new-post skill** (`.claude/skills/new-post/SKILL.md`) when creating a new post — it is the source of truth and scaffolds the MDX + image folder, then walks through image optimization, drafting (English + Simple first, Japanese last), the dev editor, and publishing. Trigger it for any "new/make/write a post" request, or run `/new-post <slug>` directly.

Key steps:
- **Images first**, as soon as they are dropped in (you need the filenames to write `<figure>` blocks): `node tools/scripts/optimize-images.mjs src/assets/images/blog/<post-slug>/`. Safe to re-run; also takes individual files. Converts iPhone HEIC to `.jpg`. No manual webp conversion needed — Astro handles avif/webp at build time.
- **Verify before publishing**: `npm run check:post <slug>` reports empty translation slots, missing frontmatter, unreferenced/oversized/GPS-bearing images, mojibake, and leftover placeholders. Warnings while `draft: true`, errors once it is removed.

There is also a **dev editor** (dev only): `npm run dev`, then `http://localhost:4321/dev/editor` (port may differ) to edit post text, captions, and image order in a structured panel that writes back to the `.mdx`. See `src/pages/dev/editor/` and `tools/scripts/dev-editor-integration.mjs`.

## Skills

All in `.claude/skills/<name>/SKILL.md`. Several are meant to fire on their own; load them by name when they do not.

- **`grilling`**: before building any new feature, component, or page, interview the user until every branch of the decision is settled. Run it *before* scaffolding, not after. `/grill-me` invokes it on demand.
- **`writing-fragments`**, then **`writing-shape`** or **`writing-beats`**: the drafting process for post prose. Fragments first to explore, then shape or beats to commit. Reader-facing writing only.
- **`prototype`**: when the answer is "show me a few options", build the variants instead of describing them. The UI branch renders several takes on one route; the logic branch is a single clickable HTML file.
- **`diagnosing-bugs`**: for anything broken, throwing, failing, slow, or silently not applying. Starts from this repo's known silent failure modes, then insists on a feedback loop that goes red before any hypothesis.
- **`writing-for-agents`**: for editing this file, the reference docs, or any `SKILL.md`. It pulls the opposite way from `SIMPLE_ENGLISH_STYLE.md`, which governs post copy; keep the two apart.
- **`new-post`**: see the section above.

## Git

Cristian writes his own commit messages and runs version control himself. Make the
edits, run checks, then stop at a natural point and say it is a good time to save
the work. Stage nothing by default; act only when the current message explicitly
asks for a commit or push.

Commit messages end at the body text: leave out the `Co-Authored-By: Claude`
trailer the harness adds by default, which lists Claude as a contributor on the
public GitHub repo.

## Reference Docs
- `.claude/PROJECT_MAP.md` — full file map, API routes, UI systems
- `.claude/SETTINGS_ARCHITECTURE.md` — settings state, storage keys, panel events
- `.claude/SIMPLE_ENGLISH_STYLE.md` — how Simple English copy is written
- `.claude/skills/new-post/SKILL.md` — authoritative process for creating a new post
