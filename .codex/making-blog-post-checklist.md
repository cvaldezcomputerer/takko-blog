# Blog Post Production Checklist (Reusable)

Use this for any new post. Duplicate this file per post and check items as you go.

## 1) Content Draft

- [ ] Replace draft text with final `en` content.
- [ ] Replace draft text with final `en_simple` content.
- [ ] Add/update `ja` content.
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
- [ ] Resize/compress source images (project script or manual pipeline).
- [ ] Convert heavy PNG/JPG screenshots to `.webp` (high quality).
- [ ] Remove now-unused source files from that post’s image folder.
- [ ] Crop/adjust hero image composition if needed.

## 3) Embeds & Links

- [ ] Add/position video embeds (if used).
- [ ] Use lightweight embed strategy (click-to-load/lazy where possible).
- [ ] Add source links in captions:
  - [ ] `en`: `Watch video`
  - [ ] `ja`: `動画を見る`
  - [ ] `en_simple`: `watch`
- [ ] Add key channel/profile links in body text where relevant.

## 4) Language & Learning UX

- [ ] Keep tone natural (not over-literal) in `ja`.
- [ ] Keep `en_simple` short and clear.
- [ ] Add `Explain` hints for tricky English phrases/idioms.
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
