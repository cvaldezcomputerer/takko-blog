// Heading ids built from the English slot only.
//
// Post headings are `## <T><span slot="en">…</span><span slot="ja">…</span>…</T>`,
// so the built-in slugger sees all three languages glued together and makes
// ids like `day-1-dogs1日目の犬たちday-1-dogs`. This plugin sets a clean id
// first (`day-1-dogs`); Astro's own heading-ids pass runs after it and keeps
// any id that is already set (see createHeadingIdsPlugin in
// @astrojs/markdown-satteri/dist/satteri-processor.js).
//
// It is a satteri hast plugin, not a rehype one: Astro 7's default processor
// ignores `rehypePlugins`. Wired in through `markdown.processor` in
// astro.config.mjs. The factory runs once per file, so dedupe is per post.

/** @param {any} node */
function textOf(node) {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** Text of the heading, using only the `en` slot of any <T>. @param {any} node */
function englishText(node) {
  if (node.type === "text") return node.value ?? "";
  const slot = node.attributes?.find((/** @type {any} */ a) => a.name === "slot")?.value;
  if (slot && slot !== "en") return "";
  return (node.children ?? []).map(englishText).join("");
}

/** Also used by src/lib/post-toc.js to predict these ids. @param {string} text */
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

/** @type {import("satteri").HastPluginEntry} */
export default function headingIds() {
  /** @type {Map<string, number>} */
  const seen = new Map();
  return {
    name: "takko-heading-ids",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        if (typeof node.properties?.id === "string") return;
        const base = slugify(englishText(node)) || slugify(textOf(node));
        if (!base) return;
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        ctx.setProperty(node, "id", count ? `${base}-${count}` : base);
      },
    },
  };
}
