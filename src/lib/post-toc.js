// Build-time data for the in-post contents list (PostContents.astro).
//
// Heading text comes from the MDX source, one string per language slot, via the
// dev editor's parser. Ids are predicted with the same slugify + dedupe as
// tools/heading-ids.mjs, then checked against the ids Astro actually rendered;
// any heading whose id cannot be confirmed is left out rather than linked wrong.
import { parsePost } from "./dev/parse-post.js";
import { slugify } from "../../tools/heading-ids.mjs";

/**
 * @typedef {{ en?: string, ja?: string, en_simple?: string }} Slots
 * @typedef {{ id: string, depth: 2 | 3, slots: Slots }} TocEntry
 */

/** Matches the floating list (TableOfContents.astro): fewer headings, no TOC. */
export const MIN_TOC_HEADINGS = 3;

/**
 * @param {string} body raw MDX of the post
 * @param {{ depth: number, slug: string }[]} rendered headings from `render(post)`
 * @returns {TocEntry[]} the rows for the top list, or [] when the post is too short
 */
export function postContents(body, rendered) {
  const renderedIds = new Set(rendered.map((h) => h.slug));
  /** @type {Map<string, number>} */
  const seen = new Map();
  /** @type {TocEntry[]} */
  const all = [];

  for (const block of parsePost(body).blocks) {
    if (block.type !== "heading") continue;
    const en = block.slots?.en ?? block.text ?? "";
    const base = slugify(en);
    if (!base) continue;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    if (block.level !== 2 && block.level !== 3) continue;
    if (!renderedIds.has(id)) continue;
    all.push({ id, depth: block.level, slots: block.slots ?? { en } });
  }

  if (all.length < MIN_TOC_HEADINGS) return [];
  // Main sections only, unless that leaves too few rows (or the post only uses ###).
  const main = all.filter((e) => e.depth === 2);
  return main.length >= MIN_TOC_HEADINGS ? main : all;
}
