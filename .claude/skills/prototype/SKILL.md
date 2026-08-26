---
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to see a few options for how a page, post layout, or component should look, or to sanity-check whether an interaction's state model feels right before building it.
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered, using the user's prompt, the surrounding code, or by asking:

- **"What should this look like?"** -> [UI.md](UI.md). Several radically different variants of a page, post layout, or content component, rendered on one route, switchable from a floating bar.
- **"Does this behaviour feel right?"** -> [LOGIC.md](LOGIC.md). A single self-contained HTML file that pushes a state model (quiz answer flow, settings interactions, an optimistic like counter) through cases that are hard to reason about on paper.

The two branches produce very different artifacts, so getting this wrong wastes the whole prototype. A page or component question is UI; an interaction or data-shape question is logic. If it is genuinely both, do UI first: seeing the screen usually settles half the behaviour questions for free.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked.** Put the prototype next to what it is prototyping for, and name it so a casual reader can see it is not production. **Nothing under `public/`, ever**: everything there is copied verbatim into the deploy.
2. **Trivial to run.** UI variants live on a real route reachable from `npm run dev`. A logic demo is one HTML file in the scratchpad that opens by double-click.
3. **No persistence.** State lives in memory. No D1, no KV, no `localStorage` unless persistence is the thing being questioned. In particular do not wire a prototype into `window.TakkoSettings`: fake the setting.
4. **Skip the polish.** No error handling beyond what makes it runnable, no abstractions, no accessibility pass, and **no translations**. Write the English and leave the `en_simple` and `ja` slots out entirely; a prototype is not the place to decide Simple English wording.
5. **The site's styling rules still apply to the variants themselves.** Use the tokens in `src/styles/global.css` (`--accent`, `--surface`, `--border`, `--radius-md`, `--space-N`) rather than raw hex, so dark mode works while you are judging it. The scrapbook components (Quiz, Recipe, Gallery, TwoImages) are the standing exception and stay on fixed hex. The switcher bar is the other exception: it is deliberately not part of the design under evaluation.
6. **Never screenshot without asking.** If seeing it rendered would help you, ask first. The user has the dev server open.
7. **Capture the answer, then delete the rest.** Once a variant or a state model has won, fold it into the real code and remove the losers, the switcher, and any throwaway route in the same pass. Say in one line which option won and why, so the decision survives past the prototype. Prototype code left in `main` rots fast and confuses the next reader.
