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
index until you remove the flag, but it stays routable at `/blog/<slug>` in dev.

## 2. Images (before drafting)

Do this before writing, not after: you need the filenames to write `<figure>`
blocks, so images-first avoids a second pass over the text.

1. Drop final photos/screenshots into `src/assets/images/blog/<slug>/`. The
   folder name must match the slug. Pull them out of macOS Photos with
   **File → Export → Export Unmodified Original**, which hands over the raw
   camera file. Dragging an image straight out of Photos re-compresses it to
   roughly JPEG quality 85 first, and that loss is already baked in by the time
   the optimizer runs. When a post's images look blurry or show artifacts, ask
   whether they came from a drag-out.
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
   **Sony a6300 shots** from `~/Pictures/<folder>/` come as sets: `DSC00401-1raw.ARW`, `DSC00401-3new.jpg` and sometimes `DSC00401-2cam.JPG`.
   They are made by the user-level `convert-photos` skill. Use the `-3new.jpg`: the optimizer can't read .ARW, and the
   camera JPEG blows out highlights. Its HDR gain map (bright clouds on XDR screens) is dropped by
   the optimizer and Astro, so the site shows the normal render. Renaming it to something descriptive is fine.
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
7. If the hero is tall or otherwise gets clipped at the top and bottom, add
   `heroImageFit: "contain"` and `heroImageMaxWidth: "720px"` to frontmatter.
   The layout fills the leftover space with a blurred, hue-tinted copy of the
   photo, so the frontmatter is the whole fix. Cropping to soften a very
   extreme ratio is fine, but crop the original file, not the optimized JPEG.
   See `.claude/PROJECT_MAP.md` under Key UI Systems.

## 3. Draft text in edit mode

Start the dev server (`npm run dev`) and open the post with edit mode on
(drafts are routable in dev):

```
http://localhost:4321/blog/<slug>?edit
```

(Port may differ: Astro bumps to 4322+ if 4321 is taken; check the dev output.)
The **Edit** button at the bottom of any post in dev does the same.

Edit mode works on the real page, so wording and image placement are judged in
context:

- Type over **English** paragraphs, headings and captions in place. Enter starts
  a new paragraph below.
- Hovering a block shows its gutter toolbar: drag handle, **+** (paragraph,
  heading, or an image from the post's folder), **</>** (that block's raw MDX),
  and delete with Undo.
- While drafting, write links as plain-text reminders, not `<a>` tags:
  `Yodaka (link: takkotaco.com/restaurants/yodaka)`. A real link makes the whole
  paragraph source-only. Turn the reminders into links once the wording is
  final; `check:post` lists any that are left. Keep `_` and `&` out of the note,
  since those also make text source-only.
- Text holding markup (`<Explain>`, links, bold) is dotted-underlined and edited
  through **</>**, so the markup stays intact. `Quiz`, `Gallery`, `Recipe` and
  `TwoImages` move as whole blocks; edit their insides through **</>** or in the
  file.
- Each block's toolbar also has ↑/↓ (move one place) and ✎ (add a note for
  Claude; select text first to point at it). Notes from a review show in the
  margin; see the `review-post` skill.
- **Save** or ⌘S writes the `.mdx` and reloads into edit mode. The page warns
  before closing with unsaved edits.
- Edit mode edits English, or **Simple English** (`en_simple`) after the bar's
  "Simple English" switch; the choice survives Save. Write frontmatter and
  Japanese in the `.mdx`. New blocks arrive with an empty `en_simple` slot.

> **Editing the file while edit mode is open:** a save replaces the post body as
> it was when the page loaded. If the `.mdx` changed on disk since then (Claude
> edited it, say), the save is refused with *"no longer matches the file"* rather
> than overwriting the newer text. Save in the browser **before** handing the
> file over, and reload after.

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
own**. Whether to include them is settled by the components question at the
start of step 6.

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
- In edit mode, text containing `<Explain>` is edited through **</>** as raw MDX,
  so the tag is never typed over. Keep the tag intact.

## 5. Japanese (generate last)

- Fill the `ja` slot for every `<T>` block, heading, and caption, plus
  `title_ja`. The Japanese is a **comprehension aid**: an English learner flips
  to it to understand what the English says. So translate **closely and fairly
  literally**, tracking the English sentence-by-sentence so JA↔EN can be mapped.
  The exception is **idioms and figurative expressions** — render those
  **naturally**, since a word-for-word version would confuse.
- Edit mode does not show Japanese: write `ja` (and `title_ja`) in the `.mdx`.

## 6. QA and publish

Start with the **components question**: ask the author about each of these by
name, then wait for the answers.

- **Explain hints**: propose a list of `phrase → meaning` pairs from the `en`
  text that pass the step 4 rules. Add only the ones the author approves.
- **Quiz** and other optional extras: ask whether the post gets one, and where.
  The author writes the question and options.

This step is done when the author has answered both. "No" counts as an answer.

Next, run the post checker. It covers most of the rest of this list mechanically:

```
npm run check:post <slug>
```

It reports empty `en` / `en_simple` / `ja` slots (by refs like `txt-3 (line 42)`, with
`head-N` for headings and `cap-N` for captions), missing frontmatter, unreferenced or
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
  in each language slot that needs them. Every `(link: ...)` reminder becomes a
  real `<a href>` in each slot that has one.
- Reread the post in the browser at `/blog/<slug>/` in all three languages —
  the checker catches empty and broken, not wrong.
- Verify only intended files changed (`git status`).
- Refresh `pubDate` if the post was drafted over several days.
- **Remove `draft: true`**, then re-run `npm run check:post <slug>` and confirm
  the post now appears on `/` and in `/rss.xml`.
