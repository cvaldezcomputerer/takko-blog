# .claude reference docs

Detailed reference for the takko blog project. Primary project context lives in `CLAUDE.md` at the repo root.

- `PROJECT_MAP.md` — architecture, key files, API routes, UI systems
- `SETTINGS_ARCHITECTURE.md` — settings state model, storage keys, panel-controller events
- `skills/new-post/SKILL.md` — authoritative process for creating a new blog post

## Image Hosting

Images live in `src/assets/images/blog/<slug>/`, are committed to git, and are referenced with local relative paths in MDX (e.g. `../../assets/images/blog/...`). Astro processes them (avif/webp) at build time. Optimize new images in place with `node scripts/optimize-images.mjs src/assets/images/blog/<slug>/` before committing.
