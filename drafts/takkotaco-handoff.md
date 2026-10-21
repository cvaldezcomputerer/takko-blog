# Takkotaco post: where it stands

Handoff for continuing the post about Takkotaco.com in a new session. Last updated 2026-10-19.

## Done

- Cristian's raw draft is cleaned up in `drafts/takkotaco-website.md`:
  - Spelling and grammar are fixed, and his wording is kept wherever it worked.
  - Headings are added: intro, A Guide to Takko, The Takko Dialect, English Tools and Games, Hidden Fun Stuff, Looking Back.
  - 📷 lines suggest images. 💡 lines suggest changes, per paragraph, only where one seemed useful.
- One structural change: the draft had two separate tools sections with "Fun stuff" between them. They are merged into one, and Hidden Fun Stuff now comes after it.
- Nothing is scaffolded yet. There is no `.mdx` file and no image folder.

## Open questions for Cristian (unanswered)

1. **"Transitioning."** The original sentence said the dialect is fading "as the older generation has been transitioning into the new generations." It was rewritten as "passes it on less and less." Did he mean that, or that older speakers are passing away?
2. **"Playpen."** It was changed to "playground." He could keep "playpen" or use "sandbox" instead.
3. **The title** "My Other Website: Takkotaco.com" and the last heading "Looking Back" are placeholders.
4. **Which 💡 suggestions to take.** The main ones:
   - Add one or two dialect examples, with their standard Japanese and English meanings.
   - Name one favorite place in the town guide.
   - Add a sentence on what the ABC-game class used to look like.
   - Tease the in-progress games.
   - Link Takkotaco.com at the start and the end.

## Images to gather

The 📷 suggestions:
- Takkotaco and this blog's homepages side by side.
- A restaurant or shrine (a photo, or a screenshot of its page).
- A dialect dictionary entry, or the 「南部田子の言葉」 book.
- The website timer next to the real classroom timer.
- The ABC game on the classroom TV, with no student faces.
- Train mode or the logo's dark/light switch.

Two cautions:
- Train mode would show best as motion. Astro's image pipeline turns a GIF into a still image, so check how existing posts handle video or animation before planning for it.
- Screenshots are PNGs, so run them through the optimizer like any other image.

## Next steps

1. Get answers to the open questions and apply the chosen suggestions in `drafts/takkotaco-website.md`.
2. Run the **new-post** skill (`/new-post <slug>`; `takkotaco` is a suggested slug). It covers:
   - scaffolding the post
   - optimizing the images
   - drafting English, then Simple English (per `.claude/SIMPLE_ENGLISH_STYLE.md`), with Japanese last
   - `npm run check:post`
3. Move the English into the `.mdx`. Then use edit mode (`/blog/<slug>?edit` under `npm run dev`) to place the images and tune the wording on the real page.
