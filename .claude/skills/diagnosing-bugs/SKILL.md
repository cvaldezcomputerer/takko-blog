---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose" or "debug this", or reports something broken, throwing, failing, slow, or silently not applying.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

## Redact

This skill has you show commands, outputs, and captured artifacts. **Redact anything sensitive first**: write `<REDACTED>` in its place. `wrangler` output carries account identifiers and auth headers, and D1 rows for likes and quiz answers carry per-visitor keys. Quote only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, say so and ask.

## Phase 0: Check the known tells first

This codebase has a small set of silent failure modes that account for most "I changed it and nothing happened" bugs. Spend two minutes here before building anything:

- **A CSS rule simply has no effect.** Astro scopes styles with a `data-astro-cid-*` attribute that only lands on elements the compiler rendered. A child component's root carries its **own** cid, not the parent's, so styling a component by class name from the page silently does nothing. Elements built at runtime (`document.createElement`, `set:html`) carry no cid at all. Check this before anything else; it is almost always this.
- **A setting applies on first paint and then stops.** Astro's view transitions swap the document without re-running the inline setup. `BaseHead.astro` re-applies via `astro:after-swap`; anything that reads `theme`, `showDefinitionHighlights`, `islandVisibility`, or `textSize` needs to be inside that path, not only in a one-shot script.
- **`window is not defined` at build time, or the whole build dies on a page that looks fine.** Something imported `public/scripts/settings-state.js` (or another browser-only module) from server-rendered Astro module code, i.e. the frontmatter fence rather than a client `<script>`.
- **A section renders blank in one language only.** An empty `T.astro` slot. `npm run check:post <slug>` reports exactly this, so run it before reading the component.
- **Dark mode looks wrong in Quiz, Recipe, Gallery, or TwoImages.** Those four deliberately use fixed hex for the paper aesthetic. Confirm it is a real bug before "fixing" it into tokens.
- **Likes or quiz results are empty locally but fine in production (or the reverse).** Local `wrangler dev` uses a separate D1 database in `.wrangler/`. Check whether `npm run db:migrate` has been run against it, and which database you are actually querying.
- **Mojibake, a stray placeholder, or a giant image in a published post.** Content bug, not a code bug. `npm run check:post` covers all three, and it only errors once `draft: true` is removed, which is why these ship.

If the symptom matches a tell, confirm it and fix it. If it does not, proceed to Phase 1 and do not force the match.

## Phase 1: Build a feedback loop

**This is the skill.** Everything else is mechanical. With a **tight** pass/fail signal that goes red on _this_ bug, you will find the cause. Without one, no amount of staring at code will save you.

Spend disproportionate effort here. Be aggressive, be creative, refuse to give up.

### Ways to construct one on this stack, in roughly this order

1. **`npm run check:post <slug>`** for anything about a post's content, frontmatter, images, or translation slots. Purpose-built, fast, and it is the loop most content bugs deserve.
2. **`npm run check`** when the bug is a type or import problem. `checkJs: true` means it covers the plain JS in `public/scripts/` too, not just `.astro` and `.ts`.
3. **`curl` against `npm run dev`** for anything server-rendered or under `src/pages/api/`. `-w "%{http_code}"` and diff the body between the working case and the broken one.
4. **`npm run preview`** (wrangler dev over the real build) when the bug involves D1, bindings, or the adapter. If it reproduces here but not under `npm run dev`, that difference **is** the finding: `astro dev` and workerd are not the same runtime.
5. **`wrangler d1 execute DB --local --command "..."`** to read the actual rows, rather than inferring state from the UI. Redact.
6. **Import the module directly**: `node -e "import('./tools/scripts/check-post.mjs')..."` or the same against anything pure in `src/lib/`. Fastest loop available; use it whenever the bug is not really about the DOM.
7. **Replay a captured payload.** Save the real request body to the scratchpad and push it through the API route in isolation.
8. **`wrangler tail`** against the deployed Worker, when the bug only reproduces in production. Redact.
9. **Differential loop.** Same component through a post where it works and a post where it does not, then diff the rendered HTML.
10. **Bisection.** If it appeared between two known-good states, automate the check and `git bisect run` it.

**There is no browser automation in this repo.** Playwright is not a dependency here and adding one for a single bug is usually the wrong trade. For a DOM-level bug, prefer curling the built HTML and asserting on the markup, or reasoning from the settings/event contract in `.claude/SETTINGS_ARCHITECTURE.md`. If you genuinely need to drive a browser, say so and ask first: that is a dependency decision, not yours to make. Never take a screenshot without asking.

Build the right feedback loop and the bug is 90% fixed.

### Tighten the loop

Treat the loop as a product. Once you have _a_ loop:

- Faster? Check one post instead of `--all`, hit the module instead of the page, narrow the assertion.
- Sharper signal? Assert the specific symptom, not "the page loaded".
- More deterministic? Pin the post, pin the language, pin the theme, clear the D1 rows first.

A 30-second flaky loop is barely better than none. A 2-second deterministic one is a superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100 times, add stress, narrow the timing window. A 50% flake is debuggable; 1% is not, so keep raising the rate until it is.

### When you genuinely cannot build a loop

Stop and say so. List what you tried. Ask for the environment that reproduces it, a redacted artifact, or permission to add temporary instrumentation. Do **not** proceed to hypothesise without a loop.

### Completion criterion: a tight loop that goes red

Phase 1 is done when you can name **one command** you have **already run at least once** (show the invocation and its output, redacted) that is:

- [ ] **Red-capable**: it drives the actual bug code path and asserts the **user's exact symptom**, so it goes red now and green once fixed. Not "runs without erroring".
- [ ] **Deterministic**: same verdict every run.
- [ ] **Fast**: seconds, not minutes.
- [ ] **Runnable unattended**, without the user clicking anything.

If you catch yourself reading code to build a theory before this command exists, **stop: jumping to a hypothesis is the exact failure this skill prevents.** No red-capable command, no Phase 2.

## Phase 2: Reproduce and minimise

Run the loop. Watch it go red.

Confirm:

- [ ] The failure is the one the **user** described, not a different failure nearby. Wrong bug means wrong fix.
- [ ] It reproduces across multiple runs.
- [ ] You captured the exact symptom, so later phases can verify the fix addresses it.

Then shrink to the **smallest scenario that still goes red**. Cut posts, components, MDX blocks, settings, and steps one at a time, re-running after each cut. A one-paragraph throwaway post that still reproduces is worth more than the real post that does. Done when removing any remaining element makes it go green.

A minimal repro shrinks the hypothesis space in Phase 3 and becomes the regression check in Phase 5. Do not proceed until you have reproduced **and** minimised.

## Phase 3: Hypothesise

Generate **3 to 5 ranked hypotheses** before testing any of them. Generating one anchors you on the first plausible idea.

Each must be **falsifiable**, stated with its prediction:

> "If X is the cause, then changing Y makes the bug disappear."

If you cannot state the prediction, it is a vibe. Discard or sharpen it.

**Show the ranked list to the user before testing.** They know what they just changed, and they re-rank instantly. Cheap checkpoint, big time saver. Do not block on it if they are away.

## Phase 4: Instrument

Each probe maps to a specific prediction from Phase 3. **Change one variable at a time.**

- Prefer inspecting state at one point over ten scattered logs.
- Put probes at the boundaries that distinguish hypotheses: the settings event listeners, the `astro:after-swap` handler, the API route entry, the D1 call.
- Never log everything and grep.

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`, so cleanup is a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For slowness, logs are usually wrong. Measure first: `performance.now()` around the suspect region, the network panel, or Lighthouse against `npm run preview`. On a content site the usual culprit is images, so check what the build actually emitted before suspecting the code. Establish a baseline, then bisect. Measure first, fix second.

## Phase 5: Fix, then lock it down

This repo has **no test runner**, so "write the regression test first" does not apply literally. The intent still does: pin the bug down so it cannot come back silently. In descending order of preference:

1. **Add the check to `tools/scripts/check-post.mjs`**, if the bug is anything about a post's content, frontmatter, images, or translations. That script is this repo's real regression mechanism, and a check there runs on every post forever.
2. **Make the bug a type error**, if the shape of the fix allows it. `checkJs: true` means `npm run check` reaches the browser scripts too, so this covers more than it would elsewhere.
3. **Keep the repro script.** If the Phase 1 loop was a node script worth re-running, move it to `tools/scripts/` with a name that says what it checks.
4. **Write the tell into `.claude/CLAUDE.md`** (or `SETTINGS_ARCHITECTURE.md` if it belongs there): the symptom as observed, then the cause. This is the mechanism for the class of bug that no check can catch.

Then: watch the loop go red, apply the fix, watch it go green, and re-run against the original un-minimised scenario.

**If none of the four is possible, that is itself the finding.** Say so. A bug that cannot be pinned down anywhere is telling you something about the code's shape.

## Phase 6: Cleanup

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] The bug is locked down per Phase 5, or its absence is stated
- [ ] All `[DEBUG-...]` instrumentation removed (grep the prefix)
- [ ] Throwaway posts, scripts, and harnesses deleted, or moved to `tools/scripts/` on purpose
- [ ] `npm run check` is clean, and `npm run check:post <slug>` if a post was touched
- [ ] `git status` shows only files you meant to change
- [ ] The hypothesis that turned out correct is stated plainly, so the next person learns. Do not commit: say it is a good point to commit and let the user write the message.
