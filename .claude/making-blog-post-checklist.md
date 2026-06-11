# Blog Post Production Checklist (Reusable)

Use this for any new post. Duplicate this file per post and check items as you go.

## 1) Content Draft

- [ ] Replace draft text with final `en` content.
- [ ] Replace draft text with final `en_simple` content.
- [ ] Add/update `ja` content.
- [ ] Add `Explain` components for tricky vocabulary/phrases while drafting (as needed).
- [ ] Add `Explain` only when meaning is still unclear after switching to `en_simple` (avoid redundant hints).
- [ ] Confirm section headers are final in all languages.
- [ ] Add/update frontmatter:
  - [ ] `title`
  - [ ] `title_ja`
  - [ ] `title_en_simple`
  - [ ] `description`
  - [ ] `pubDate`
  - [ ] `heroImage`

## 2) Media Prep

- [ ] Collect final images/screenshots in a dedicated folder under `src/assets/images/blog/<post-slug>/`.
- [ ] Replace placeholder image paths in the post.
- [ ] If needed, stitch/collage multiple images.
- [ ] Run `node scripts/optimize-images.mjs src/assets/images/blog/<post-slug>/` to resize + compress all JPG/PNG in-place (max 1600px, q90 mozjpeg, bakes in EXIF orientation, strips GPS).
- [ ] No manual webp conversion needed for camera photos — Astro auto-converts to avif + webp at build time. Only manually create a `.webp` if the source is a screenshot or composite image (not a straight camera shot).
- [ ] Only import images at the top of the MDX if they are passed as props to a component (e.g. `Gallery`, `TwoImages`). Inline `<figure>` images use markdown path strings directly — no import needed.
- [ ] Remove now-unused source files from that post’s image folder.
- [ ] Crop/adjust hero image composition if needed.

## 3) Embeds & Links

- [ ] Add/position video embeds (if used).
- [ ] Use lightweight embed strategy (click-to-load/lazy where possible).
- [ ] Add key channel/profile links in body text where relevant.

## 4) Language & Learning UX

- [ ] Keep tone natural (not over-literal) in `ja`.
- [ ] Keep `en_simple` short and clear.
- [ ] Review/confirm `Explain` hints for tricky English phrases/idioms.
  - For a **single word**, keep the meaning to 1–2 words (e.g. `meaning="famously"` for *notoriously*).
  - If the same word is already explained earlier in the post, don't wrap a longer phrase containing it — just leave the phrase as plain text.
- [ ] Verify all links are present in each language slot where required.

## 5) QA Pass

- [ ] Check for encoding issues (mojibake/garbled Japanese).
- [ ] Check for typos and awkward wording.
- [ ] Verify no broken image paths.
- [ ] Verify no leftover placeholder text/captions.
- [ ] Verify embed behavior (size, click-to-load, playback).
- [ ] Verify mobile and desktop rendering.

## 6) Final Validation

- [ ] Run project checks/build as available.
- [ ] Confirm only intended files changed.
- [ ] Optional: log notable decisions or follow-ups.

## Post Metadata

- Post slug/path:
- Main content file:
- Image folder:
- Notes:
