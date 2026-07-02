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

## 2. Draft text in the dev editor

Start the dev server (`npm run dev`) and open the structured editor:

```
http://localhost:4321/dev/editor/<slug>
```

(Port may differ — Astro bumps to 4322+ if 4321 is taken; check the dev output.)

- Write the **English** (`en`) and **Simple English** (`en_simple`) slots. Each
  `<T>` block, heading, and caption is an editable box; reorder images with the
  ↑/↓ buttons; press **Save changes** to write back to the `.mdx`.
- Leave **Japanese (ja) for last** (step 6). You can also ask Claude to make
  bulk edits to the file directly, then refresh the editor page to see them.
- Add more `<T>` blocks, headings, and `<figure>` images by editing the `.mdx`
  (the editor reads/writes existing structure; new blocks are added in the file).

Keep `en` natural, not over-literal. For the `en_simple` slot, **read
`.claude/SIMPLE_ENGLISH_STYLE.md` first** — it is the source of truth for the
author's Simple English voice (target reader, sentence rules, what to keep vs.
cut, tone, annotated examples). Draft `en_simple` to match it.

## 3. Images

1. Drop final photos/screenshots into `src/assets/images/blog/<slug>/`.
2. Optimize in place (resize to max 1600px, strip GPS, bake EXIF orientation):
   ```
   node tools/scripts/optimize-images.mjs src/assets/images/blog/<slug>/
   ```
3. **No manual webp conversion** for camera photos — Astro builds avif/webp
   automatically. Only hand-make a `.webp` for screenshots or composites.
4. Reference inline `<figure>` images by markdown path string directly — **no
   import needed**. Only `import` an image at the top of the MDX when it is
   passed as a **prop** to a component (`Gallery`, `TwoImages`, hero, etc.).
5. **Park leftover photos in a review `<Gallery>` at the end of the post.** Any
   photos that don't get placed inline go into a single `<Gallery>` block at the
   bottom, wrapped in an MDX comment that says to delete it before publishing.
   This lets the author see every photo in context and pull keepers up into the
   post. Remove the block (and any genuinely unused source files) before
   publishing. See an existing post for the `<Gallery>` shape (e.g.
   `badminton-tournament.mdx`).
6. Add `heroImage: "../../assets/images/blog/<slug>/<slug>-header.webp"` to
   frontmatter once the image exists (omitted by the scaffold on purpose — the
   schema validates image paths and a missing file breaks the dev server).

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
one of the last steps before publishing (see step 7).

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

## 5. Headings and links

- Confirm section headers are finalized in **all** languages (headings use
  inline `<T>` slots too).
- Add channel/profile/source links in the body where relevant, in each language
  slot that needs them.

## 6. Japanese (generate last)

- Fill the `ja` slot for every `<T>` block, heading, and caption, plus
  `title_ja`. The Japanese is a **comprehension aid**: an English learner flips
  to it to understand what the English says. So translate **closely and fairly
  literally**, tracking the English sentence-by-sentence so JA↔EN can be mapped.
  The exception is **idioms and figurative expressions** — render those
  **naturally**, since a word-for-word version would confuse.
- The editor dims `ja` rows since they are generated last; they are still
  editable there.

## 7. QA and publish

- `npm run check` — Astro + JS/TS type checks (run after any JS/TS changes).
- `npm run build` — full production build (run after UI/script changes).
- Check for mojibake/garbled Japanese, typos, broken image paths, leftover
  placeholder text/captions.
- Fill remaining frontmatter: `title_ja`, `title_en_simple`, `description`,
  `heroImage`.
- Verify only intended files changed.
- **Confirm optional extras with the author** — ask whether this post should get
  a `Quiz` or other author-driven extra (see step 4) before finishing.
- **Remove `draft: true`** to publish.
