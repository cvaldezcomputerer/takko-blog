---
name: review-post
description: Review a blog post by leaving sticky notes in its .mdx that edit mode shows in the margin. Use when Cristian asks for feedback, a review or suggestions on a post, or says to do, apply or handle his notes.
---

# Review a post with sticky notes

A review is a set of **sticky notes**: `@note` comments written into the post's `.mdx`. Edit mode (`/blog/<slug>?edit`) pins each one in the margin beside its block, highlights its quote, and lets Cristian ✕ it; the ✕ removes it from the file on Save. A review never edits the post itself, with one exception: fix plain typos and spelling slips (misspelled words, a lowercase `i`, a missing apostrophe or a dropped word that flips the meaning) directly in the `en` text, and do not leave a note for them. Everything else, Cristian decides.

## Note format

One comment per note, on its own line, directly before the block it points at (after any notes already there), with a blank line on each side:

```mdx
{/* @note move quote="somewhat rare": This fact would make a stronger first line. */}

<T>
  <span slot="en">
```

- **Type**, the first word: `suggestion` (wording or clarity), `add` (something missing), `move` (this block belongs elsewhere; say where), `question` (something only Cristian knows). Each type has its own colour.
- **`quote="..."`**, optional: an exact phrase from the block's English text, up to about eight words, in a single run of plain text (one that doesn't cross a link, `<Explain>` or bold). It is highlighted on the page. If it doesn't match, the note points at the whole block and the quote shows struck through.
- **Message**, after the colon: one or two sentences on one line. Inside a note, `*/` ends the comment early, and `"` ends the quote.
- **`by="you"`** marks Cristian's own notes, which are added in edit mode. Claude's notes carry no `by`.

The block is a top-level block: a `<T>`, a heading, a `<figure>`, a component. A note inside a `<T>` or JSX breaks the MDX.

## Giving a review

1. **Check first that the page is saved.** Ask Cristian to save edit mode before the notes go in: once the file changes under an open page, his next Save is refused as stale.
2. Read the whole `.mdx`, `.claude/SIMPLE_ENGLISH_STYLE.md`, and the output of `npm run check:post <slug>`. Empty slots, TODOs and link reminders are already listed there, so they never need a note.
3. Read the post through each **lens**, in this order:
   - **Shape**: does the opening pull the reader in? Does each section earn its place, and is the order right? Does the ending land?
   - **Reader**: for an English learner, is anything unclear, idiomatic without help, or a good candidate for `<Explain>`?
   - **Gaps**: what would a reader ask that the post doesn't answer? Are there facts that look wrong or are stated twice?
   - **Images**: does each one sit next to the text it shows? Do the captions add something?
   - **Simple English**: does each `en_simple` slot follow the style doc and say the same thing as its `en` slot? The `quote=` attribute only matches `en` text, so for a Simple English point, quote the `en_simple` words in the message itself.
4. Choose the notes. A review is **10 to 15 notes at most**, the ones that change the post most, so the page doesn't drown in notes. One note per point; a pattern that repeats gets one note naming where else it happens.
5. Write the notes into the file, run `npm run check:post <slug>` (it counts the notes), and tell Cristian to reload the page. In chat, give a few lines on the overall impression and the two or three notes that matter most.

## Doing Cristian's notes

When he says to do his notes, work through every `by="you"` note: make the change it asks for, then delete that note. If one is unclear or you disagree, leave it in place and say why in chat. Claude's own notes stay until he removes them or asks for them to be done.
