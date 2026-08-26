---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea until every branch is resolved. Use before building any new feature, component, or page, when the user wants to stress-test their thinking, or on any 'grill' trigger phrase.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (does a token for this already exist, does the settings panel already dispatch that event, which posts use this component), go look it up. Don't block on it: a running lookup is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## In this repo

**Visual and style questions go through `AskUserQuestion` with previews**, not the text format above. A round can mix the two. When the answer is "show me what these look like as real pages", that is no longer a question, it is the `prototype` skill.

**This skill is for features and components, not for posts.** A new blog post has its own process in `new-post`, and the writing itself has `writing-fragments` (explore) then `writing-shape` or `writing-beats` (exploit). Do not grill someone into an article; grill them into a decision.

Questions worth asking on almost anything new here, so they never get silently assumed:

- Does it need all three language slots (`en`, `en_simple`, `ja`) in `T.astro`, or is it chrome that only ever shows one?
- If it has Simple English, does the copy actually follow `.claude/SIMPLE_ENGLISH_STYLE.md`, or is it just shorter sentences?
- Does it read or write any of the four `localStorage` settings, and does it need re-applying on `astro:after-swap`?
- Is it browser-only? `settings-state.js` must never be imported from server-rendered Astro module code.
- Does it use the existing tokens, or is it one of the deliberate scrapbook exceptions (Quiz, Recipe, Gallery, TwoImages) that keep fixed hex on purpose?
- Does it touch D1, and does that mean a migration?
