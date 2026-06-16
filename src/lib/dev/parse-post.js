// Pure string parsing for the dev editor's read-only viewer.
// No Node/browser dependencies, so it is safe to import anywhere.
//
// This is intentionally a *pragmatic* block splitter, not a real MDX AST.
// It recognizes the constructs this blog actually uses (frontmatter, imports,
// <T> translation blocks, headings, <figure>/images, and known components) and
// falls back to raw text for anything it does not understand. Good enough to
// render an at-a-glance view of a post; it never rewrites the file.

/**
 * @typedef {{ en?: string, ja?: string, en_simple?: string }} Slots
 * @typedef {(
 *   | { type: "imports", raw: string }
 *   | { type: "heading", level: number, slots?: Slots, text?: string, raw: string }
 *   | { type: "t", slots: Slots, raw: string }
 *   | { type: "figure", src?: string, alt?: string, caption?: Slots, captionText?: string, raw: string }
 *   | { type: "image", src: string, alt: string, raw: string }
 *   | { type: "component", name: string, raw: string }
 *   | { type: "paragraph", text: string, raw: string }
 *   | { type: "raw", raw: string }
 * )} Block
 */

/**
 * Split raw MDX file contents into frontmatter + an ordered list of blocks.
 * @param {string} source
 * @returns {{ frontmatter: string, fields: Record<string, string>, blocks: Block[] }}
 */
export function parsePost(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = fmMatch ? fmMatch[1] : "";
  const fields = parseFrontmatterFields(frontmatter);
  const body = fmMatch ? normalized.slice(fmMatch[0].length) : normalized;

  const lines = body.split("\n");
  /** @type {Block[]} */
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks.
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Consecutive import statements collapse into one block.
    if (/^import\s/.test(line)) {
      const start = i;
      while (i < lines.length && /^import\s/.test(lines[i])) i++;
      blocks.push({ type: "imports", raw: lines.slice(start, i).join("\n") });
      continue;
    }

    // Headings. May contain an inline <T>...</T>.
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const rest = heading[2];
      const slots = extractSlots(rest);
      blocks.push(
        hasSlots(slots)
          ? { type: "heading", level, slots, raw: line }
          : { type: "heading", level, text: cleanInline(rest), raw: line }
      );
      i++;
      continue;
    }

    // Multi-line <T> translation block.
    if (/^<T(\s|>)/.test(line.trim())) {
      const { raw, next } = collectUntilClose(lines, i, "T");
      blocks.push({ type: "t", slots: extractSlots(raw), raw });
      i = next;
      continue;
    }

    // <figure> ... </figure> with an image + optional caption.
    if (/^<figure(\s|>)/.test(line.trim())) {
      const { raw, next } = collectUntilClose(lines, i, "figure");
      blocks.push(parseFigure(raw));
      i = next;
      continue;
    }

    // Known capitalized components (RecipeIngredients, Gallery, etc.). Shown raw.
    const comp = line.trim().match(/^<([A-Z][A-Za-z0-9]*)(\s|\/|>|$)/);
    if (comp) {
      const { raw, next } = collectComponent(lines, i, comp[1]);
      blocks.push({ type: "component", name: comp[1], raw });
      i = next;
      continue;
    }

    // Standalone markdown image.
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      blocks.push({ type: "image", alt: img[1], src: img[2], raw: line });
      i++;
      continue;
    }

    // Otherwise: gather a paragraph up to the next blank line.
    const start = i;
    while (i < lines.length && lines[i].trim() !== "") i++;
    const raw = lines.slice(start, i).join("\n");
    blocks.push({ type: "paragraph", text: cleanInline(raw), raw });
  }

  return { frontmatter, fields, blocks };
}

/**
 * Collect lines from `start` until the closing tag of `tag`, inclusive.
 * @param {string[]} lines @param {number} start @param {string} tag
 */
function collectUntilClose(lines, start, tag) {
  const close = `</${tag}>`;
  let i = start;
  while (i < lines.length && !lines[i].includes(close)) i++;
  const end = i < lines.length ? i + 1 : lines.length;
  return { raw: lines.slice(start, end).join("\n"), next: end };
}

/**
 * Collect a component invocation. Handles both `<Tag ... />` (self-closing,
 * possibly spanning many lines with nested braces) and `<Tag>...</Tag>`.
 * @param {string[]} lines @param {number} start @param {string} name
 */
function collectComponent(lines, start, name) {
  const first = lines[start];
  // Self-closing on the same line.
  if (/\/>\s*$/.test(first) && !first.includes(`</${name}>`)) {
    return { raw: first, next: start + 1 };
  }
  // Multi-line self-closing: end at a line that is just `/>`.
  let i = start;
  let sawClose = false;
  while (i < lines.length) {
    if (i > start && /\/>\s*$/.test(lines[i])) { sawClose = true; i++; break; }
    if (lines[i].includes(`</${name}>`)) { sawClose = true; i++; break; }
    i++;
  }
  if (!sawClose) i = start + 1;
  return { raw: lines.slice(start, i).join("\n"), next: i };
}

/** @param {string} raw @returns {Block} */
function parseFigure(raw) {
  const img = raw.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  const captionMatch = raw.match(/<figcaption>([\s\S]*?)<\/figcaption>/);
  const captionSlots = captionMatch ? extractSlots(captionMatch[1]) : {};
  /** @type {Block} */
  const block = { type: "figure", raw };
  if (img) { block.alt = img[1]; block.src = img[2]; }
  if (hasSlots(captionSlots)) block.caption = captionSlots;
  else if (captionMatch) block.captionText = cleanInline(captionMatch[1]);
  return block;
}

/**
 * Extract en / ja / en_simple slot contents (cleaned to readable text).
 * @param {string} html @returns {Slots}
 */
function extractSlots(html) {
  /** @type {Slots} */
  const slots = {};
  const re = /<span slot="(en|ja|en_simple)">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = /** @type {keyof Slots} */ (m[1]);
    slots[key] = cleanInline(m[2]);
  }
  return slots;
}

/** @param {Slots} s */
function hasSlots(s) {
  return Boolean(s.en || s.ja || s.en_simple);
}

/**
 * @typedef {{ key: string, find: string, prefix: string, suffix: string, core: string }} EditField
 * An exact, lossless edit target: `find` is the original element verbatim,
 * `prefix`/`suffix` wrap the editable `core` (the trimmed inner text), and
 * leading/trailing whitespace lives in prefix/suffix so only the words the user
 * touches change. Replacement = prefix + newCore + suffix.
 */

/** @param {string} open @param {string} key @param {string} inner @param {string} close @returns {EditField} */
function makeField(open, key, inner, close) {
  const lead = inner.match(/^\s*/)?.[0] ?? "";
  const trail = inner.match(/\s*$/)?.[0] ?? "";
  const core = inner.slice(lead.length, inner.length - trail.length);
  return { key, find: open + inner + close, prefix: open + lead, suffix: trail + close, core };
}

/**
 * Editable <span slot="..."> fields inside a raw block (T block, heading, or
 * a figcaption that uses <T> slots).
 * @param {string} raw @returns {EditField[]}
 */
export function slotFields(raw) {
  /** @type {EditField[]} */
  const fields = [];
  const re = /(<span slot="(en|ja|en_simple)">)([\s\S]*?)(<\/span>)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    fields.push(makeField(m[1], m[2], m[3], m[4]));
  }
  return fields;
}

/**
 * Editable plain-text <figcaption> (one with no <T> slots inside).
 * @param {string} raw @returns {EditField | null}
 */
export function captionPlainField(raw) {
  const m = raw.match(/(<figcaption>)([\s\S]*?)(<\/figcaption>)/);
  if (!m || /<span slot=/.test(m[2])) return null;
  return makeField(m[1], "caption", m[2], m[3]);
}

/**
 * Turn inline MDX/JSX into plain readable text:
 * unwrap <Explain> (keep the term), drop {" "} whitespace expressions,
 * strip stray tags, and collapse whitespace.
 * @param {string} html
 */
function cleanInline(html) {
  return html
    .replace(/\{\s*["']\s*["']\s*\}/g, " ") // {" "} JSX spacers
    .replace(/<Explain[^>]*>/g, "")
    .replace(/<\/Explain>/g, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "") // any remaining tags
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Very small frontmatter reader (key: value per line). Good enough for display.
 * @param {string} frontmatter @returns {Record<string,string>}
 */
function parseFrontmatterFields(frontmatter) {
  /** @type {Record<string,string>} */
  const fields = {};
  for (const line of frontmatter.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return fields;
}
