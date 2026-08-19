# Site Audit TODO (2026-07-11)

Full-codebase audit at commit f439627 (14 published posts, includes the
3d-printing post): every page/layout/component, global.css, config, public/, API
routes, blog content, and the `dist/` build output (built Jul 1, one commit stale
but representative) were inspected. Each item is self-contained; no re-audit
needed to execute it.

Verified healthy (no action): sitemap (with lastmod, drafts excluded, no dev/api
leakage), robots.txt (+ AI-bot blocks, sitemap pointer), RSS present and valid,
canonical URLs normalized with trailing slash, unique titles/descriptions per post,
per-post OG images from hero, JSON-LD (WebSite + BlogPosting), draft gating
(`draft: true` never builds in prod), dev editor 404s outside dev and its
integration only registers on `astro:server:setup`, D1 API routes typed via JSDoc
and guarded, dark mode + theme flash prevention, fonts are small (24KB woff) and
preloaded, `.gitignore` sane. Analytics is handled at the platform level
(Cloudflare Web Analytics auto-setup, edge-injected) - do NOT add a beacon snippet.

---

## Tier 1 - High impact

- [x] **Sentry ships 252KB of JS on every page but has no DSN configured.**
  `dist/client/_astro/page.B_LJ1SlG.js` (252KB, the largest JS asset, loaded on
  every page) contains the whole Sentry browser SDK. No DSN exists anywhere in the
  repo, in `.env`-adjacent config, or baked into the built bundle (grepped dist),
  so it initializes inert and reports nothing. Decide: either configure it
  (set `SENTRY_DSN` at build + `sentry({ dsn, sourceMapsUploadOptions })` in
  `astro.config.mjs`) or remove `@sentry/astro` from `astro.config.mjs:9,64` and
  `package.json`. Removing it is the biggest single performance win available.
  (If you set the DSN in a local `.env` I could not see, tell me and this becomes
  "verify it actually uploads events" instead.)

- [ ] **Animated images bypass image optimization and ship full-size.**
  Sharp cannot resize animated images, so every srcset variant Astro emits is a
  byte-identical copy of the original (verified in dist):
  - `src/assets/images/blog/camera-c840/cameras-in-store.PNG` (1.5MB APNG) -
    referenced at `src/content/blog/camera-c840.mdx:71`. An optimized static
    sibling `cameras-in-store.webp` (59KB) already exists unused in the same
    folder. Either point the MDX at the webp, or re-export the animation as a
    short `<video>`/small animated webp.
  - `src/assets/images/blog/frog-post/hero-frog.webp` (937KB animated webp) -
    the `heroImage` of `first-post.mdx`, so it loads full-weight on the post page
    (eager, fetchpriority=high), on the homepage card, and is the post's OG image.
    Re-encode smaller (resize to ~960w, fewer frames) or use a static frame for
    hero/OG and embed the animation in the body.

- [x] **Broken `rgba(var(--token))` on hex tokens - declarations silently dropped.**
  `--accent`/`--accent-dark` are hex values, not RGB triplets, so `rgba(var(--accent), .5)`
  is invalid CSS and the whole declaration is discarded (the styling these rules
  intend does not render). Fix by using `color-mix(in srgb, var(--accent) 50%, transparent)`
  or adding an `--accent-rgb: 5, 150, 105;` triplet token:
  - `src/layouts/BlogPost.astro:255` (`.post-outro` accent top border)
  - `src/layouts/BlogPost.astro:298` (dark-mode `.post-outro` border-top-color)
  - `src/components/content/RecipeIngredients.astro:241-242` (note box bg + left border)
  - `src/components/content/Explain.astro:41` (hover background of definition trigger)

- [x] **About page duplicates the homepage's title and description.**
  `src/pages/about.astro:18` passes `SITE_TITLE` + `SITE_DESCRIPTION` verbatim, so
  `/` and `/about/` have identical `<title>`, meta description, and OG tags.
  Give it its own, e.g. `About Cristian - ${SITE_TITLE}` and a one-line bio
  description. (Contact and 404 already have unique titles; 404 also reuses
  `SITE_DESCRIPTION` at `src/pages/404.astro:12` - lower priority since it's noindexed
  by status code, but same one-line fix.)

## Tier 2 - Consistency / structural

- [ ] **No shared base layout for non-blog pages.** `index.astro`, `about.astro`,
  `contact.astro`, and `404.astro` each hand-roll the full `<!doctype html><html><head>`
  skeleton, re-import BaseHead/Header/Footer, and re-declare the same
  `body { display:flex; flex-direction:column; min-height:100vh }` sticky-footer CSS
  (index:29-34, about:20-25; contact and 404 skip it, so their footers do NOT stick
  on short viewports - visible inconsistency). Extract a `src/layouts/BaseLayout.astro`
  (props: title, description, optional type/image; slot for main) and migrate the
  four pages onto it.

- [ ] **The doggy logo SVG is copy-pasted in three places.** Identical multi-KB
  paths live in `src/components/ui/Logo.astro`, `src/components/content/LikeButton.astro:19-41`,
  and inline in `src/pages/404.astro:127-154` (with tweaked eye/mouth state).
  Extend `Logo.astro` with an optional state prop (e.g. `expression="open-mouth"`)
  and reuse it in LikeButton and 404. Also note `src/components/ui/AnimatedLogo.astro`
  is a fourth, unused copy (see Hygiene).

- [x] **Contact form status colors ignore the existing status tokens.**
  `src/pages/contact.astro:146-165` hardcodes `rgba(5,150,105,.1)`, `rgba(220,38,38,.1)`,
  `rgba(59,130,246,.1)` for success/error/loading backgrounds even though
  `--success-bg` / `--danger-bg` (with dark-mode overrides) exist in `global.css:67-71`.
  Also `contact.astro:75` hardcodes the accent focus ring color. Swap to tokens;
  add an `--info-bg` token for the loading state while at it.

- [x] **Duplicate `.sr-only` definition.** `global.css:287` defines it;
  `src/pages/contact.astro:167-177` redefines its own copy. Delete the local one.

- [x] **Internal link trailing slashes are inconsistent.** Header and Footer link
  `/about` but `/contact/` (`Header.astro:35,42`, `Footer.astro:25,32`);
  `camera-c840.mdx` frontmatter has `cameraUsedLink: "/blog/camera-c840"` (no slash).
  Canonicals normalize to trailing slash, so non-slashed links cost a redirect hop
  on Cloudflare. Pick trailing-slash everywhere for internal links.

- [x] **Post OG image is the unoptimized original.** `BlogPost.astro:40-42` uses
  `heroImage.src`, which points at the full-size original copied into `_astro/`
  (e.g. rice-planting's og:image is a ~712KB jpg; scrapers fetch it). Use
  `getImage({ src: heroImage, width: 1200 })` in the layout (or at build in
  BaseHead) and pass that URL instead.

- [ ] **MDX import style is split between `~/` alias and relative paths.**
  Roughly half the posts use `~/components/...`, half `../../components/...`
  (the new 3d-printing post uses relative).
  Standardize on `~/` (alias already configured in astro.config + tsconfig) and
  update `.claude/skills/new-post/scaffold.mjs` if it templates the other form.

- [x] **RSS items are in filename order, not date order.** Verified in
  `dist/client/rss.xml` (badminton first). Sort by `pubDate` descending in
  `src/pages/rss.xml.js` before mapping. While in there, consider setting
  `trailingSlash`-consistent `link` (already fine) and adding `<language>`.

- [ ] **ThemeToggle is fully hardcoded colors** (`ThemeToggle.astro:22-57`:
  `#bae6fd`, `#7dd3fc`, `#ea580c`, `#1e293b`, etc.). Plausibly intentional
  (sky/sun/moon look), but it predates the token system - decide: either bless it
  with a comment like the scrapbook components have, or tokenize it. Same decision
  for the comic bubbles in `about.astro:113-154` (`#FFE44D`, `#87CEEB`, ...) which
  look deliberately comic-styled: add the "intentional exception" comment so future
  passes stop flagging them.

## Tier 3 - Nice wins

- [ ] **Prev/next post navigation.** The post outro (`BlogPost.astro:401-441`) only
  links back home. In `src/pages/blog/[...slug].astro` you already have the sorted
  collection at build time; pass `prevPost`/`nextPost` (title + slug) into the
  layout and render two links in the outro. Cheap, genuinely useful at 14 posts.
  (Full "related posts by tag" requires tags first - see below; don't build a
  similarity engine for this blog.)

- [ ] **Optional: minimal tags.** Schema (`src/content.config.js`) has no
  tags/categories. Content clusters naturally (recipes/cooking, school life,
  trips, retro finds). If you want archive pages: add `tags: z.array(z.string()).default([])`,
  a `/tags/[tag].astro` page, and small tag chips on cards. At 14 posts this is
  optional polish, not a gap - skip if it doesn't spark joy. **Explicitly NOT
  recommended at current size: site search, pagination, comments, i18n routing
  (per-language URLs), reading-time badges.** Homepage-lists-everything is correct
  until ~30 posts.

- [ ] **Default OG image for non-post pages.** BaseHead falls back to
  `/favicon_512.png` (a 512x512 icon) for home/about/contact shares. Make a
  1200x630 branded card (doggy + site name) in `public/` and use it as the default
  `image` in `BaseHead.astro:34`.

- [x] **LikeButton keyboard accessibility.** `LikeButton.astro:17` renders
  `role="button" tabindex="0"` but the click listener is on the custom element and
  there's no keydown handler, so Enter/Space do nothing. Add a keydown handler
  (Enter/Space -> same path as click) or make it a real `<button>`.

- [ ] **`/favicon.ico` 404s.** Only png/svg icons exist. Some browsers/tools still
  request `/favicon.ico` unconditionally. Drop a small `favicon.ico` into `public/`
  (can generate in `tools/scripts/generate-favicons.mjs`).

- [x] **Defer the settings-panel controller.** `BaseHead.astro:150-151` loads both
  `/scripts/settings-state.js` (must stay blocking - theme flash) and
  `/scripts/settings-panel-controller.js` (8KB) as blocking head scripts. The panel
  controller isn't needed for first paint; add `defer` to it.

- [ ] **Atkinson fonts are woff, not woff2** (`public/fonts/atkinson-*.woff`,
  24KB each, both preloaded on every page). Converting to woff2 saves ~30%.
  Tiny absolute win; do it whenever touching fonts anyway.

- [x] **Homepage stagger animation only covers the first 4 cards.**
  `index.astro:78-81` defines `animation-delay` for `nth-child(1..4)`; cards 5+ all
  pop in at once at 14 posts. Either generate the delay inline
  (`style={animation-delay: ${index * 0.1}s}` capped at ~0.5s) or accept it and
  delete the nth-child rules.

- [x] **Homepage breadcrumb JSON-LD lists the site title as its own child.**
  `BaseHead.astro:54-70` emits `Home > {title}` on every page including `/`
  (Home > Bloggy Doggy). Emit BreadcrumbList only when `type === 'article'`
  (or when path != '/').

## Hygiene

- [ ] **Delete dead files** (verified zero references anywhere in src/tools/config):
  - `src/components/ui/AnimatedLogo.astro` (unused 4th logo copy)
  - `src/assets/images/misc/loader.svg` (Loader.astro draws its own; this 3762px-wide
    Figma export is referenced nowhere)
  - `src/assets/images/logo.png` and `src/assets/images/logo_with_arms_legs.svg`
  - `src/assets/images/blog/trianMuseum.webp` (stray file at blog images root)
  - `src/assets/images/blog/fukushima-post/fukushimaMap.webp` (post uses the .png)
  - `src/assets/images/blog/camera-c840/cameras-in-store.webp` - only if you fix the
    Tier 1 APNG item the other way; otherwise this becomes the referenced file
  - `src/assets/images/me/full-body-selfie-circuit-day.png` (384KB) - verified still
    unreferenced even after the 3d-printing post was finished and published
    (commit f439627), so it's plain dead weight now.
  - Done in this session: removed `site_backround_pattern.pre-swap.bak.svg`
    (working-tree deletion staged for your commit) and empty untracked `scripts/`
    and `.github/` dirs.

- [x] **Dead ternary in FloatingIsland.** `FloatingIsland.astro:5`:
  `const backLink = cond ? '/' : '/'` - both branches are `'/'`. Replace with
  `const backLink = '/';` or implement the intended "back to post list vs back to
  top" behavior.

- [ ] **`.fallow/` (cache.bin, churn.bin, untracked/ignored)** - cache of some local
  tool, not referenced by the repo. Delete if you don't recognize it.

- [ ] **`.emoji-cache/1f35a.png` is tracked in git** but is a runtime cache for
  `tools/blur-faces.py` (face-covering emoji). Add `.emoji-cache/` to `.gitignore`
  and `git rm --cached` it; the script re-downloads on demand.

- [ ] **`svgo.config.mjs` exists but svgo is not a dependency.** Presumably run via
  `npx svgo`. Either add svgo to devDependencies (pinned) or note in the config
  header that it's for ad-hoc npx runs.

- [x] **Non-standard `<meta name="title">`** (`BaseHead.astro:123`) - no consumer
  uses it (search engines use `<title>`, social uses og:). Safe to delete.

- [ ] **`public/favicon.png` appears unreferenced** (BaseHead links the svg, 16/32
  pngs, dark variants, apple-touch; manifest uses android-chrome). Verify with a
  quick grep after the favicon.ico item, then delete or repurpose.

- [ ] **`public/scripts/*.js` are outside type-checking.** tsconfig includes only
  `src/**/*`, so `settings-state.js` / `settings-panel-controller.js` (the most
  load-bearing browser code on the site) get no `checkJs`. Options: add `public`
  to tsconfig include (with `// @ts-check` semantics via JSDoc, both files are
  clean-ish already) or accept and note it. Low urgency; they're stable.
