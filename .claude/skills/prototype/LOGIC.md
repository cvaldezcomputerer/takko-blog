# Logic Prototype

A single self-contained HTML file that lets someone drive a state model by clicking buttons. Use this when the question is about **rules, state transitions, or data shape**: the kind of thing that reads fine in a spec and only feels wrong once you push it through real interactions.

Because it is one file with nothing to install, it opens by double-click and can be handed to someone else to try.

## When this is the right shape

- "What happens to a quiz block if the reader changes language halfway through answering?"
- "Should the like count update optimistically, and what does it do when the request fails?"
- "If someone turns off definition highlights mid-post, what should already-opened popups do?"
- "Can this frontmatter shape represent a post with no images and no Japanese yet?"
- Anything where someone wants to **press buttons and watch state change**.

If the question is what it should look like, this is the wrong branch. Use [UI.md](UI.md).

## Process

### 1. State the question

Before writing code, write down what model and what question you are prototyping. One paragraph, visible at the top of the demo, not just a comment. A logic prototype that answers the wrong question is pure waste.

### 2. Isolate the logic in a liftable module

Put the actual logic in one `<script>` block written as a small pure module that could be dropped into a component or `public/scripts/` later. The page around it is throwaway; this module is not.

Pick whichever shape fits the question:

- **A pure reducer** `(state, action) => state`, when actions are discrete events (answer, reveal, retry, navigate) over one state value.
- **A state machine** with explicit states and transitions, when "which actions are even legal right now" is part of the question (can you re-answer after the result is shown?).
- **A set of pure functions** over plain data, when there is no ongoing state: validating frontmatter, deriving a reading time, picking which translation slot to show.

Keep it pure: no DOM, no `document`, no `window.TakkoSettings`, no handlers reaching inside it. The page calls into it; nothing flows the other way. That purity is what lets the validated version lift straight into the real code once the question is answered, and it is the same rule that keeps browser-only code out of server-rendered modules.

### 3. Build the shareable HTML file

One file in the scratchpad, plain HTML/CSS/JS, everything inline, no framework, no bundler, no server. Layout, top to bottom:

1. **Title and one-line explanation**: the question from step 1.
2. **Current state**, rendered as a labelled panel rather than a JSON dump, re-rendered after every click. Call out what just changed.
3. **Free-play buttons**: one per action, always enabled, so the model can be poked in any order. Include the ambient ones this site actually has: switch language, toggle theme, change text size.
4. **Guided walkthroughs**: a tab per scenario. Each tab holds a plain-language description of the situation and what to watch for, then the ordered buttons to press. Clicking a step performs it and advances. Starting a walkthrough resets to a known state so the scenario runs the same way every time.

Choose scenarios that hit the awkward cases: the happy path, the edge case that is hard to reason about (usually a language or settings change mid-flow), and an attempt at something that should be illegal.

Labels use the language of the site, not the reducer. Someone reading it should recognise what they are looking at. Keep it restrained: clean type, generous spacing, one accent color. Nothing that competes with the state and the buttons.

### 4. Hand it over

Open it or send the path. The interesting moments are "wait, that should not be possible" and "huh, I assumed it would reset there": those are bugs in the idea, which is the whole point. If the user wants new actions or another scenario, add them.

### 5. Capture the answer

State in one line what the prototype settled. The validated reducer, machine, or function set lifts into the real module; the HTML shell gets deleted with the rest of the scratchpad.

## Anti-patterns

- **Wiring it to real data or to D1.** In-memory only, unless persistence is the question. A prototype that needs `npm run db:migrate` is not one file any more.
- **Generalising.** No "what if we wanted to support X later". It answers one question.
- **Blurring the logic and the page together.** If the module touches `document`, it is no longer liftable, which was the only durable thing about it.
- **Reaching for a framework or a dev server.** One file, double-click. Anything else defeats the point.
- **Modelling only the English path.** If the state can be observed in three languages, the scenarios have to switch language at least once.
- **Shipping the HTML shell.** The page is optimised for being clicked through by hand. Only the module behind it is worth keeping.
