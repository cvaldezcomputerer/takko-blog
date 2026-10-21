// Dev-only satteri hast plugin for the in-page editor (tools/dev-edit/).
//
// Before every top-level block of a post (paragraph, heading, <T>, <figure>,
// component) it inserts an empty `<span hidden data-dev-src="start:end">`
// giving that block's character range in the .mdx, and appends one
// `data-dev-end` marker after the last block. Attributes can't go on the
// blocks themselves: on a component like <T> they arrive as a prop and never
// reach the HTML. The edit script reads the markers, then removes them so
// adjacency selectors see the same DOM as production.
//
// Offsets index the raw file: @astrojs/mdx blanks the frontmatter with spaces
// ("empty-with-spaces") instead of removing it, so nothing shifts.
// Wired in from astro.config.mjs for `astro dev` only.

/** @param {number} start @param {number} end @returns {any} */
const marker = (start, end) => ({
  type: "element",
  tagName: "span",
  properties: { hidden: true, dataDevSrc: `${start}:${end}` },
  children: [],
});

/** @type {import("satteri").HastPluginEntry} */
export default function devSourceMap() {
  return {
    name: "takko-dev-source-map",
    options: { position: true },
    before(root, ctx) {
      let last = null;
      for (const node of root.children) {
        if (node.type === "mdxjsEsm" || node.type === "mdxFlowExpression") continue;
        if (node.type === "text" && !node.value.trim()) continue;
        const start = node.position?.start?.offset;
        const end = node.position?.end?.offset;
        if (typeof start !== "number" || typeof end !== "number") continue;
        ctx.insertBefore(node, marker(start, end));
        last = node;
      }
      if (last) {
        ctx.insertAfter(last, {
          type: "element",
          tagName: "span",
          properties: { hidden: true, dataDevEnd: "" },
          children: [],
        });
      }
    },
  };
}
