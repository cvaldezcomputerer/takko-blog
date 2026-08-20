---
name: new-post
description: Create a new blog post for the takko blog. Scaffolds the MDX file and image folder, then guides drafting English + Simple English content in T.astro slots (Japanese added last), optimizing images, adding components/Explains, and publishing. Use whenever the user wants to start, make, write, or draft a new post.
---

# New blog post

Authoritative process for adding a post to this Astro blog. Posts live in
`src/content/blog/<slug>.mdx` and serve three languages via `<T>` slots
(`en`, `en_simple`, `ja`). Content is drafted in English first; Japanese is
generated last.

## 1. Scaffold

Pick a kebab-case slug, then run:

```
node .claude/skills/new-post/scaffold.mjs <slug> "Optional Title"
```

This creates `src/content/blog/<slug>.mdx` (frontmatter + an empty `<T>` intro
block, `draft: true`) and `src/assets/images/blog/<slug>/`. It refuses to
overwrite an existing post. `draft: true` keeps it out of routes, RSS, and the
index until you remove the flag — but the dev editor still shows it.

## 2. Images (before drafting)

Do this before writing, not after: you need the filenames to write `<figure>`
blocks, so images-first avoids a second pass over the text.

1. Drop final photos/screenshots into `src/assets/images/blog/<slug>/`. The
   folder name must match the slug.
2. Optimize in place (resize to max 1600px, strip GPS, bake EXIF orientation,
   convert HEIC to JPEG):
   ```
   node tools/scripts/optimize-images.mjs src/assets/images/blog/<slug>/
   ```
   Safe to re-run as you add more photos — anything already in bounds, GPS-free
   and upright is left untouched, so nothing gets re-encoded twice. It also
   accepts individual files, and `--dry-run` reports without writing.
   **iPhone HEIC files are converted to `.jpg`** (Astro cannot process HEIC);
   reference the new `.jpg` name.
3. **No manual webp conversion** for camera photos — Astro builds avif/webp
   automatically. Only hand-make a `.webp` for screenshots or composites.
4. Reference inline `<figure>` images by markdown path string directly — **no
   import needed**. Only `import` an image at the top of the MDX when it is
   passed as a **prop** to a component (`Gallery`, `TwoImages`, hero, etc.).
5. **Park leftover photos in a review `<Gallery>` at the end of the post.** Any
   photos that don't get placed inline go into a single `<Gallery>` block at the
   bottom, wrapped in an MDX comment that says to delete it before publishing.
   This lets the author see every photo in context and pull keepers up into the
   post. Remove the block before publishing, and either delete the genuinely
   unused source files or list them in `src/assets/images/blog/<slug>/.keep-unused`
   to keep them on purpose. See an existing post for the `<Gallery>` shape (e.g.
   `badminton-tournament.mdx`).
6. Add `heroImage: "../../assets/images/blog/<slug>/<file>"` to frontmatter once
   the image exists (omitted by the scaffold on purpose — the schema validates
   image paths and a missing file breaks the dev server). No naming convention;
   use whatever the photo is called.

## 3. Draft text in the dev editor

Start the dev server (`npm run dev`) and open the structured editor:

```
http://localhost:4321/dev/editor/<slug>
```

(Port may differ — Astro bumps to 4322+ if 4321 is taken; check the dev output.)

- Write the **English** (`en`) and **Simple English** (`en_simple`) slots, plus
  `title_en_simple` in frontmatter. Each `<T>` block, heading, and caption is an
  editable box; reorder images with the ↑/↓ buttons; press **Save changes** to
  write back to the `.mdx`.
- Leave **Japanese (ja) for last** (step 5).
- Add more `<T>` blocks, headings, and `<figure>` images by editing the `.mdx`
  (the editor reads/writes existing structure; new blocks are added in the file).
- **Preview the real page at `http://localhost:4321/blog/<slug>/`** — drafts are
  routable in dev. The editor shows structure, not the reading experience:
  language switching, `<Explain>` tooltips, `Quiz`, and the hero only appear on
  the real page.

> **Editing the file while the editor tab is open:** the editor captures the
> exact text of each box when the page loads and saves by find/replace, so if
> Claude (or anything else) edits the `.mdx` in the meantime, **Save changes**
> fails with *"target not found (file changed since load?)"* and your unsaved
> edits are lost. Save or discard in the editor **before** handing the file over,
> then reload the editor page afterwards.

Keep `en` natural, not over-literal. For the `en_simple` slot, **read
`.claude/SIMPLE_ENGLISH_STYLE.md` first** — it is the source of truth for the
author's Simple English voice (target reader, sentence rules, what to keep vs.
cut, tone, annotated examples). Draft `en_simple` to match it. `title_en_simple`
follows the same voice.

## 4. Components (as needed)

Add these only where they help; they are configured per-post:
`RecipeIngredients`, `Quiz`, `Gallery`, `TwoImages`, `YouTubePreview`, `Explain`.
Import each at the top of the MDX next to the `T` import. See existing posts for
prop shapes (e.g. `chili-con-carne-easy.mdx` for `RecipeIngredients`,
`camera-c840.mdx` for `Quiz` + `Gallery`).

### Optional extras (author-driven)

Components like `Quiz` — and other showcase pieces the author likes to drop in —
are **optional extras**. The author decides whether a given post gets one and
writes/designs the content themselves, so **don't add or fill these in on your
own**. Whether to include them is **confirmed with the author near the end**, as
one of the last steps before publishing (see step 6).

### Explain hints (tricky vocabulary)

- **Who it's for:** picture a Japanese reader who can follow most of the English
  on their own, but hits something tricky — an idiom, a colloquialism, a
  figurative or culturally-loaded phrase that even an advanced English learner
  wouldn't know from a dictionary. Those are what get an `<Explain>`. Plain
  vocabulary they can look up does not.
- Add `<Explain meaning="...">phrase</Explain>` only when meaning is still
  unclear after the `en_simple` version exists — avoid redundant hints.
- For a **single word**, keep the meaning to 1–2 words (e.g.
  `meaning="famously"` for *notoriously*).
- If a word is already explained earlier in the post, don't wrap a longer phrase
  containing it again — leave it as plain text.
- The dev editor shows `<Explain>` as raw markup inside the text box so edits
  never silently drop it. Edit around the tag; keep the tag intact.

## 5. Japanese (generate last)

- Fill the `ja` slot for every `<T>` block, heading, and caption, plus
  `title_ja`. The Japanese is a **comprehension aid**: an English learner flips
  to it to understand what the English says. So translate **closely and fairly
  literally**, tracking the English sentence-by-sentence so JA↔EN can be mapped.
  The exception is **idioms and figurative expressions** — render those
  **naturally**, since a word-for-word version would confuse.
- The editor dims `ja` rows since they are generated last; they are still
  editable there.

## 6. QA and publish

Run the post checker first — it covers most of this list mechanically:

```
npm run check:post <slug>
```

It reports empty `en` / `en_simple` / `ja` slots (by the same `txt-N` / `head-N`
/ `cap-N` refs the dev editor shows), missing frontmatter, unreferenced or
oversized or GPS-bearing images, broken image paths, mojibake, and leftover
placeholders. While `draft: true` is set these are **warnings** — it doubles as a
mid-draft "what's left?" list. Once you remove the flag they become **errors**,
so run it again after unsetting `draft` and expect a clean result.

Then:

- `npm run check` — Astro + JS/TS type checks. **Always run this for a new
  post**, not just after JS/TS edits: it is what validates the content schema,
  including the `heroImage` path.
- `npm run build` — full production build.
- Confirm section headers are finalized in **all** languages (headings use
  inline `<T>` slots too), and that any channel/profile/source links are present
  in each language slot that needs them.
- Reread the post in the browser at `/blog/<slug>/` in all three languages —
  the checker catches empty and broken, not wrong.
- Verify only intended files changed (`git status`).
- **Confirm optional extras with the author** — ask whether this post should get
  a `Quiz` or other author-driven extra (see step 4) before finishing.
- Refresh `pubDate` if the post was drafted over several days.
- **Remove `draft: true`**, then re-run `npm run check:post <slug>` and confirm
  the post now appears on `/` and in `/rss.xml`.
