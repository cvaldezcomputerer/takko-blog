# .claude reference docs

Detailed reference for the takko blog project. Primary project context lives in `CLAUDE.md` at the repo root.

- `PROJECT_MAP.md` — architecture, key files, API routes, UI systems
- `SETTINGS_ARCHITECTURE.md` — settings state model, storage keys, panel-controller events
- `making-blog-post-checklist.md` — reusable checklist for publishing a new blog post

## Image Hosting

**Two systems are in use — do not migrate old posts.**

### Old posts (existing)
Images live in `src/assets/images/blog/<slug>/` and are referenced with local relative paths in MDX (e.g. `../../assets/images/blog/...`). Astro processes them at build time.

### New posts (S3 + CloudFront)
Images are stored in the private S3 bucket `bloggydoggy-images` and served via CloudFront. Local images are only a working copy — they are not committed to git.

**Workflow for new posts:**
1. Drop images in `src/assets/images/blog/<new-slug>/`
2. Run `node scripts/optimize-images.mjs src/assets/images/blog/<new-slug>/` (strips GPS EXIF, fixes orientation)
3. Sync to S3: `aws s3 sync src/assets/images/blog/<new-slug>/ s3://bloggydoggy-images/blog/<new-slug>/ --delete --profile takko-blog-s3`
4. Reference images in MDX as `https://d2iqb5t9tunqwu.cloudfront.net/blog/<new-slug>/image.JPG`
5. Do not commit the image files — add the post slug folder to `.gitignore` if needed

**AWS resources:**
- S3 bucket: `bloggydoggy-images` (us-east-1, private)
- CloudFront domain: `d2iqb5t9tunqwu.cloudfront.net`
- IAM user: `takko-blog-s3` (least privilege, S3 only)
- CLI profile: `takko-blog-s3`
