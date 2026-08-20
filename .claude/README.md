# .claude reference docs

Detailed reference for the takko blog project. Primary project context lives in `CLAUDE.md` at the repo root.

- `PROJECT_MAP.md` — architecture, key files, API routes, UI systems
- `SETTINGS_ARCHITECTURE.md` — settings state model, storage keys, panel-controller events
- `skills/new-post/SKILL.md` — authoritative process for creating a new blog post

## Image Hosting

Images live in `src/assets/images/blog/<slug>/` (the folder name must match the post slug), are committed to git, and are referenced with local relative paths in MDX (e.g. `../../assets/images/blog/...`). Astro processes them (avif/webp) at build time.

Optimize new images in place as soon as you drop them in:

```
node tools/scripts/optimize-images.mjs src/assets/images/blog/<slug>/
```

It accepts individual files as well as folders, and leaves alone anything already within bounds, GPS-free and upright — so re-running after adding a few photos only touches the new ones. `--dry-run` reports without writing.

## Verifying a post

```
npm run check:post <slug>     # one post
npm run check:post -- --all   # every post
```

Reports empty translation slots, missing frontmatter, unreferenced images, oversized or GPS-bearing photos, mojibake, and leftover placeholders. While `draft: true` is set these are warnings (a draft is *meant* to be incomplete); once it is removed they become errors. To keep an unreferenced image on purpose, list its filename in `<image folder>/.keep-unused`.
