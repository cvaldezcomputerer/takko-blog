# Simple English style guide

How to write the `en_simple` slot for this blog. The goal: text a **Japanese
middle schooler** can read and understand. Simple English is **not** a
translation of the `en` version — it is a shorter, easier re-telling that still
matches the photos.

Derived from existing posts (`fukushima-post`, `golden-week-2026`, etc.).
Adjust this file when the author corrects a draft; it is the source of truth the
new-post skill loads.

## Core principles

1. **Accessibility over completeness.** Dropping details, reasons, jokes, and
   asides is expected and good. If a sentence needs background knowledge or a
   second clause to make sense, cut it.
2. **Stay picture-consistent.** The simple text sits next to the same images as
   the `en` version. It must still make sense with what the reader sees, even if
   the story changes a little. Often the simplest move is to describe the photo:
   "This is X."
3. **Relate to the original when you can, but don't force it.** Keep the same
   beat/topic as the `en` paragraph where possible. It's fine to keep only the
   easiest takeaway and drop the rest.

## Sentence rules

- **Short sentences. One idea each.** Aim for 3–8 words. Break compound
  sentences into separate ones.
- **A whole `en` paragraph often becomes 1–3 tiny sentences** — sometimes a
  single exclamation.
- **Simple tenses only.** Simple past ("I went", "I ate") and present ("This
  is…", "The noodles are chewy"). Avoid perfect tenses, passive voice, and
  conditionals.
- **Contractions are fine and natural** ("It's", "I'm", "didn't").
- **Basic vocabulary.** Prefer nice / good / big / cool / hard / yummy / fun
  over fancy synonyms. Swap out anything a 13-year-old learner wouldn't know.
- **No idioms or figurative language.** Flatten them to literal meaning:
  - "get my money's worth" → (cut)
  - "without breaking the bank" → "The price was low."
  - "paid off / sigh of relief" → "I was happy."

## Keep vs. cut

- **Keep:** proper nouns that are the learning anchors — place names, food
  names, brand names (Shirakawa, Ouchi-juku, Negi Soba, Aka Beko, CCNA,
  Wendy's). Keep concrete numbers simple ("I paid 50,000 yen.").
- **Cut:** reasons/justifications, side comments, parentheticals, history/trivia,
  comparisons, anything requiring outside knowledge.
- **Don't add an `<Explain>` in `en_simple`.** Explains live in the `en` slot.
  In simple text, just use an easier word instead.

## Tone

**Match the tone of the `en` version** — same warmth, same mood, same
personality. Simple English is shorter, not blander.

Short sentences naturally read duller and plainer than the original, so add a
bit of energy back to keep the vibe consistent with `en`:
- Exclamation marks where the original feels lively or excited.
- Short emotional reactions: "It was yummy." "Good job!" "I was surprised!"
  "What a nice view!"

Use these to restore the original's feel — not to make every line loud. If a
simple draft reads flat next to the `en` paragraph, that's the signal to adjust.

## Captions

`en_simple` captions are even shorter than the body — often 1–3 words or a tiny
phrase, sometimes with an emoji. They label the photo rather than explain it:
"Hotel food", "Big Hard Off", "🧅 Soba", "Nice seats".

## Annotated examples (real, from posts)

**Drop the reason, anchor to the photo**
> en: "I decided to stop at Shirakawa Station just because the ticket was cheaper, but it's a nice area."
> en_simple: "This is Shirakawa Station in Fukushima."
*Why: the reason (cheaper ticket) is background. The photo shows the station, so name it.*

**Long paragraph → a few short facts**
> en: "This ramen is famous in Shirakawa. It's shoyu ramen, but the noodles are curly and chewy. Personally, I like them better than normal ramen noodles. It was yummy."
> en_simple: "This ramen is famous. It's shoyu ramen. The noodles are chewy. It was yummy."
*Why: keep the simple facts and the reaction; drop the comparison and opinion.*

**A whole paragraph → one reaction**
> en: "Not only that, but there was an amazing view that you could enjoy from the bath."
> en_simple: "What a nice view!"
*Why: the photo carries the meaning; the text just reacts.*

**Flatten fancy words**
> en: "…it's entry level, but notoriously difficult, requiring months of dedicated study… it's expensive! …I ended up paying over 50,000 yen…"
> en_simple: "The CCNA is about computers and the internet. It's hard, and it's expensive! I paid 50,000 yen."
*Why: "notoriously", "dedicated study" gone; keep the concrete number.*

**It's OK to change the story a little**
> en: (a paragraph about getting test results back from staff)
> en_simple: "I almost ran out of time!"
*Why: simple version keeps the easiest, most relatable beat instead of the full scene.*
