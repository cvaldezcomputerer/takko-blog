# UI Prototype

Generate **several radically different variants** of a page or content component, rendered on one route, switchable from a floating bottom bar. The user flips between them in the browser, picks one (or steals bits from each), then the rest get thrown away.

If the question is about an interaction's behaviour rather than what something looks like, this is the wrong branch. Use [LOGIC.md](LOGIC.md).

## When this is the right shape

- "What should the post header look like?"
- "I want to see a few options for the settings panel before you build it."
- "Try a different layout for the blog index."
- "How should a Quiz block sit inside the flow of a post?"
- Any time the alternative is the user picking between three descriptions in their head.

## Two sub-shapes: strongly prefer sub-shape A

A UI prototype is much easier to judge when it is **butting up against the rest of the site**: real navbar, real tokens, real dark mode, real post text, real Japanese line lengths. A bare throwaway route is a vacuum where every variant looks fine. Default to sub-shape A whenever there is a plausible existing page to host the variants.

### Sub-shape A: variants inside an existing page (preferred)

The route already exists (`src/pages/blog/[...slug].astro`, `src/pages/index.astro`, `src/pages/about.astro`). Variants swap only the rendered subtree. Everything else stays: the layout, the content collection query, the settings wiring, the language selector.

For a **content component** (something that appears inside an MDX post), the host is a real post. Write a throwaway `.mdx` in `src/content/blog/` with `draft: true`, drop the variants into it, and delete it at the end. That is the only honest way to see how the component sits in the flow of a paragraph.

### Sub-shape B: a new throwaway route (last resort)

Only when the thing genuinely has no home yet. Create `src/pages/_prototype-<name>.astro`. The leading underscore keeps it out of the built routes, so add a plain `src/pages/prototype-<name>.astro` while you need it reachable and delete that one at the end. Keep it out of the nav and out of the sitemap.

Before reaching for B, sanity-check: is there really no existing page this could sit inside? An empty route hides the density problems a populated one exposes.

## The Astro constraint that shapes everything here

**Pages here are prerendered.** There is no request at runtime, so `Astro.url.searchParams` is meaningless: it is evaluated once at build time and baked in. A server-read `?variant=` param does not work.

So: **render every variant into the page, then show one with client-side JS.** Read the param in a client `<script>` from `location.search`, set an attribute on a wrapper, and let CSS pick. The param stays shareable and reload-stable because the script reads it on load.

```astro
---
// prototype: three takes on the post header
import VariantA from '../components/prototypes/HeaderA.astro';
import VariantB from '../components/prototypes/HeaderB.astro';
import VariantC from '../components/prototypes/HeaderC.astro';
---

<div id="proto-root" data-variant="A">
  <div data-proto="A"><VariantA {...post.data} /></div>
  <div data-proto="B"><VariantB {...post.data} /></div>
  <div data-proto="C"><VariantC {...post.data} /></div>
</div>

<style>
  #proto-root [data-proto] { display: none; }
  #proto-root[data-variant='A'] [data-proto='A'],
  #proto-root[data-variant='B'] [data-proto='B'],
  #proto-root[data-variant='C'] [data-proto='C'] { display: block; }
</style>
```

Two scoping traps apply here:

- The wrapper `<div>`s above are written in the page template, so they carry the page's `data-astro-cid-*` and the scoped CSS matches. **If you build the switcher bar with `document.createElement`, it gets no cid and the page's scoped CSS will not reach it.** Either write the bar in the template and only toggle it from JS, or sample the cid off an existing element and set it on what you create.
- A variant that is its own component only carries **its own** cid. Styling `.post-header` from the page will silently do nothing. Style inside the variant component, or use an anchored `:global()`.

One more: view transitions swap the document. If the switcher survives a navigation but stops working, it needs re-binding on `astro:after-swap`, same as the settings scripts.

## Process

### 1. State the question and pick N

Default to **3 variants**, cap at 5. Write the plan in one line as a comment at the top of the host page:

> Three takes on the post header, switchable via `?variant=`, on the existing route.

### 2. Generate radically different variants

Variants must be **structurally different**: different layout, different information hierarchy, different primary affordance. Three tweaked card grids is wallpaper, not a prototype. If two come out similar, redo one with an explicit constraint ("this one does not use a grid at all").

Each variant still uses the tokens, so dark mode works while the user is judging it. Testing a design that breaks the moment the theme flips teaches nothing.

Put variant components in `src/components/prototypes/`, named so the throwaway status is obvious.

### 3. Build the floating switcher

A fixed bar at the bottom-centre with three pieces: left arrow (wraps), the current variant key plus its name (`B (sidebar layout)`), right arrow (wraps).

- Clicking updates `location.search` via `history.replaceState` and re-sets `data-variant`, so the variant is shareable and survives reload.
- Left and right arrow keys also cycle. Skip that when an `<input>`, `<textarea>`, or `[contenteditable]` has focus.
- Visually distinct from the page, so it reads as scaffolding rather than as part of the design being judged.
- Gate the whole bar on `import.meta.env.DEV` so a stray merge cannot ship it.

### 4. Hand it over

Give the user the URL and the variant keys. The useful feedback is almost always **"I want the header from B with the layout from C"**, which is the actual design.

### 5. Fold in the winner and delete the rest

Rewrite the winning variant properly into the real page (this is where the `en_simple` and `ja` slots get written), then remove `src/components/prototypes/`, the switcher, any throwaway route, and any throwaway post in the same pass. Run `npm run check` afterwards to catch imports left pointing at deleted files.

## Anti-patterns

- **Variants that differ only in color or copy.** That is a tweak. Real variants disagree about structure.
- **A shared `<Layout>` between variants.** A shared header is fine; a shared layout defeats the point. Each variant should be free to throw out the layout.
- **Wiring variants to real state.** Feed them a fixed fake post, a fixed like count, a fixed quiz result. The question is what it looks like, not whether the feature works.
- **Testing with lorem ipsum or one short paragraph.** Use a real post's text, and check the Japanese too: JA wraps differently and runs longer in some places and much shorter in others. Density is where layouts break, and this site has three densities per page.
- **Judging in one theme only.** Flip dark mode before deciding. Half the variants that look best in light mode fall apart in dark.
- **Promoting prototype code straight to production.** It was written with no error handling and no translations. Rewrite it when it lands.
