// In-page editor for blog posts, `astro dev` only. Injected into every page by
// tools/scripts/dev-editor-integration.mjs; does nothing unless the page is a
// post rendered with the markers from tools/dev-source-map.mjs.
//
// Edit mode works on the real post: English text, captions and headings are
// typed in place, blocks are dragged, added and deleted, and any block's raw
// MDX can be opened with </>. Nothing touches the file until Save (or ⌘S),
// which sends one edit replacing the whole body with the rebuilt source
// through the existing save endpoint, then reloads so Astro renders it for
// real. Edit mode works on one language at a time: English, or Simple English
// from the bar's switch (a reload, so it needs no unsaved changes). Japanese
// slots are never touched (new blocks get an empty en_simple, like the
// scaffold); those are written in the .mdx afterwards.
//
// Notes are `{/* @note ... */}` comments written just before the block they
// point at (format in .claude/skills/review-post/SKILL.md). Edit mode shows
// them as sticky notes in the margin; ✕ drops one from the file on Save.

import "./edit-mode.css";

const STATE_KEY = "takko-dev-edit";
const LANG_KEY = "takko-blog-lang";
// Which language edit mode is on, for this tab. Kept apart from STATE_KEY,
// which is used up by the first load after it is set: saving the .mdx can
// set off the dev server's own reload before ours.
const EDIT_LANG_KEY = "takko-dev-edit-lang";
// Inline markup that typing over rendered text would lose (links, bold,
// <Explain>, entities, JSX). Fields containing any of it are source-only.
const MARKUP = /[<>{}*_`[\]&]/;
// `{/* @note move quote="somewhat rare": Message. */}`
const NOTE_RE = /\{\/\*\s*@note\b((?:(?!\*\/)[\s\S])*)\*\/\}/g;
const NOTES_BEFORE_END = /(?:\{\/\*\s*@note\b(?:(?!\*\/)[\s\S])*\*\/\}\s*)+$/;
const NOTE_KINDS = ["suggestion", "add", "move", "question"];

/**
 * @typedef {{ el: HTMLElement, start: number, end: number, core: string,
 *   wrap: (text: string) => string, initial: string, editable: boolean,
 *   kind: "paragraph" | "heading" | "caption" }} Field
 * @typedef {{ start: number, end: number, raw: string, kind: string,
 *   nodes: ChildNode[], origIndex: number, gapBefore: string,
 *   fields: Field[], deleted: boolean, isNew: boolean, override: string | null,
 *   stub: HTMLElement | null, sourceBox: HTMLElement | null,
 *   notes: Note[], noteBox: HTMLElement | null }} Block
 * @typedef {{ kind: string, by: string, quote: string, text: string,
 *   raw: string, removed: boolean, isNew: boolean }} Note
 */

/** @type {null | {
 *   slug: string, container: HTMLElement, endMarker: HTMLElement,
 *   blocks: Block[], order: Block[], source: string | null,
 *   region: { start: number, end: number }, editing: boolean, dirty: boolean,
 *   saving: boolean, ui: Record<string, HTMLElement>, hovered: Block | null,
 *   lang: "en" | "en_simple",
 *   nodeBlock: WeakMap<Node, Block>, images: any[] | null }} */
let S = null;

const norm = (/** @type {string} */ t) => t.replace(/\s+/g, " ").trim();
/** Keep typed `<`, `{` and `}` from turning into JSX. @param {string} t */
const escapeText = (t) => t.replace(/</g, "&lt;").replace(/[{}]/g, "\\$&");

// ---------------------------------------------------------------- setup

function init() {
  S = null;
  const slug = location.pathname.match(/^\/blog\/([^/]+)\/?$/)?.[1];
  const container = document.querySelector(".prose[data-blog-content]");
  if (!slug || !(container instanceof HTMLElement)) return;
  const markers = [...container.querySelectorAll(":scope > span[data-dev-src]")];
  const endMarker = container.querySelector(":scope > span[data-dev-end]");
  if (!markers.length || !(endMarker instanceof HTMLElement)) return;

  /** @type {Block[]} */
  const blocks = markers.map((m, i) => {
    const [start, end] = (m.getAttribute("data-dev-src") ?? "").split(":").map(Number);
    const stop = markers[i + 1] ?? endMarker;
    const nodes = [];
    for (let n = m.nextSibling; n && n !== stop; n = n.nextSibling) nodes.push(n);
    return {
      start, end, raw: "", kind: "", nodes, origIndex: i, gapBefore: "",
      fields: [], deleted: false, isNew: false, override: null, stub: null, sourceBox: null,
      notes: [], noteBox: null,
    };
  });
  // The markers have done their job; drop them so the DOM matches production.
  markers.forEach((m) => m.remove());

  S = {
    slug, container, endMarker, blocks, order: [...blocks], source: null,
    region: { start: blocks[0].start, end: blocks[blocks.length - 1].end },
    editing: false, dirty: false, saving: false, ui: {}, hovered: null, lang: "en",
    nodeBlock: new WeakMap(), images: null,
  };
  for (const b of blocks) for (const n of b.nodes) S.nodeBlock.set(n, b);
  buildUi();

  let resume = null;
  try {
    resume = JSON.parse(sessionStorage.getItem(STATE_KEY) ?? "null");
    sessionStorage.removeItem(STATE_KEY);
  } catch { /* storage blocked: start fresh */ }
  try {
    if (sessionStorage.getItem(EDIT_LANG_KEY) === "en_simple") S.lang = "en_simple";
  } catch { /* storage blocked: English */ }
  const wantEdit = new URLSearchParams(location.search).has("edit");
  if (resume?.slug === slug || wantEdit) {
    enterEdit().then(() => {
      if (typeof resume?.y === "number") window.scrollTo(0, resume.y);
    });
  }
}

/** Read the source and attach it to the blocks rendered from it. */
async function loadSource() {
  if (!S || S.source !== null) return true;
  const res = await fetch(`/__dev/editor/source?slug=${encodeURIComponent(S.slug)}`);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) return fail(data.error ?? "Could not read the post source.");
  const source = /** @type {string} */ (data.source);
  // Notes on the first block sit before it, outside the body region: take
  // them in so they can be removed or added to.
  const pre = source.slice(0, S.region.start).match(NOTES_BEFORE_END);
  if (pre) {
    S.region.start -= pre[0].length;
    S.blocks[0].gapBefore = pre[0];
  }
  for (const [i, b] of S.blocks.entries()) {
    b.raw = source.slice(b.start, b.end);
    if (!b.raw || b.raw !== b.raw.trim()) {
      return fail("The page is out of date with the file. Reload the page.");
    }
    b.kind = kindOf(b.raw);
    if (i > 0) b.gapBefore = source.slice(S.blocks[i - 1].end, b.start);
    b.notes = parseNotes(b.gapBefore);
  }
  S.source = source;
  S.blocks.forEach(setupBlock);
  return true;
}

/** @param {string} raw */
function kindOf(raw) {
  if (/^#{1,6}(\s|$)/.test(raw)) return "heading";
  if (/^<T[\s>]/.test(raw)) return "text";
  if (/^<figure[\s>]/.test(raw)) return "figure";
  if (/^!\[/.test(raw)) return "image";
  if (/^<[A-Z]/.test(raw)) return "component";
  return "paragraph";
}

const KIND_LABEL = /** @type {Record<string, string>} */ ({
  heading: "heading", text: "paragraph", paragraph: "paragraph",
  figure: "image", image: "image", component: "component",
});

/** @param {Block} b */
function firstElement(b) {
  return /** @type {HTMLElement | undefined} */ (
    b.nodes.find((n) => n instanceof HTMLElement && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName))
  );
}

// ---------------------------------------------------------------- fields

/**
 * The editable fields of a block in the language being edited: what to type
 * into, and how to write it back into the block's raw text.
 * @param {Block} b @returns {Field[]}
 */
function findFields(b) {
  const root = firstElement(b);
  if (!root) return [];
  const raw = b.raw;
  /** @type {Field[]} */
  const out = [];
  /** @param {RegExpMatchArray | null} m @param {Element | null} el @param {Field["kind"]} kind */
  const add = (m, el, kind) => {
    if (!m || !(el instanceof HTMLElement)) return;
    const f = wrapField(raw, m);
    out.push({ ...f, el: innermost(el), initial: "", editable: !MARKUP.test(f.core), kind });
  };
  const lang = S?.lang ?? "en";
  const slot = new RegExp(`(<span slot="${lang}">)([\\s\\S]*?)(<\\/span>)`);
  const shown = `[data-lang-content="${lang}"]`;
  // Plain markdown (no <T>) is English with no Simple English to edit.
  const plain = lang === "en";

  if (b.kind === "text") {
    add(raw.match(slot), root.querySelector(`:scope > ${shown}`), "paragraph");
  } else if (b.kind === "heading") {
    if (/<T[\s>]/.test(raw)) add(raw.match(slot), root.querySelector(shown), "heading");
    else if (plain) add(raw.match(/^(#{1,6}[ \t]+)([\s\S]*?)()$/), root, "heading");
  } else if (b.kind === "figure") {
    const cap = raw.match(/(<figcaption>)([\s\S]*?)(<\/figcaption>)/);
    if (cap && /<span slot=/.test(cap[2])) {
      const m = raw.match(slot);
      add(m && (m.index ?? 0) > (cap.index ?? 0) ? m : null, root.querySelector(`figcaption ${shown}`), "caption");
    } else if (plain) {
      add(cap, root.querySelector("figcaption"), "caption");
    }
  } else if (plain && b.kind === "paragraph" && root.tagName === "P") {
    add(raw.match(/^()([\s\S]*)()$/), root, "paragraph");
  }
  // Two rendered paragraphs inside one slot can't be typed over as one.
  for (const f of out) if (f.el.querySelectorAll("p").length > 1) f.editable = false;
  return out;
}

/**
 * Split a match of (open)(inner)(close) into the replaceable core and the
 * whitespace that frames it, so a rewrite keeps the file's layout.
 * @param {string} raw @param {RegExpMatchArray} m
 */
function wrapField(raw, m) {
  const [whole, open, inner, close] = m;
  const start = m.index ?? 0;
  let lead = "";
  let trail = "";
  if (inner.trim()) {
    lead = inner.match(/^\s*/)?.[0] ?? "";
    trail = inner.match(/\s*$/)?.[0] ?? "";
  } else if (inner.includes("\n")) {
    // Empty multi-line slot (fresh from the scaffold): indent one step in.
    const lineStart = raw.lastIndexOf("\n", start) + 1;
    const indent = raw.slice(lineStart, start).match(/^\s*/)?.[0] ?? "";
    lead = "\n" + indent + "  ";
    trail = "\n" + indent;
  }
  const core = inner.trim() ? inner.slice(lead.length, inner.length - trail.length) : "";
  // Text that sits on its own lines is hard-wrapped in the posts; keep it so,
  // or one changed word turns the diff into a single huge line.
  const indent = lead.includes("\n") ? lead.slice(lead.lastIndexOf("\n") + 1) : null;
  return {
    start, end: start + whole.length, core,
    wrap: (/** @type {string} */ text) =>
      open + lead + (indent === null ? text : reflow(text, indent)) + trail + close,
  };
}

/** Fill words into lines of at most 80 columns, continuing at `indent`. @param {string} text @param {string} indent */
function reflow(text, indent) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && indent.length + line.length + 1 + word.length > 80) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n" + indent);
}

/** Descend through single-child wrappers (<span><p>…</p></span>). @param {HTMLElement} el */
function innermost(el) {
  let t = el;
  while (
    t.childNodes.length === 1 &&
    t.firstElementChild instanceof HTMLElement &&
    /^(SPAN|P)$/.test(t.firstElementChild.tagName)
  ) {
    t = t.firstElementChild;
  }
  return t;
}

/** @param {Block} b */
function setupBlock(b) {
  b.fields = findFields(b);
  for (const f of b.fields) {
    if (!f.editable) {
      f.el.dataset.devMarkup = "";
      f.el.title = "Has links or formatting: edit it with </> (source).";
      continue;
    }
    // Show the source text (straight quotes, no smart punctuation) so what
    // you type is exactly what gets written.
    f.initial = norm(f.core);
    // An empty slot still renders its whitespace; clear it so :empty shows the placeholder.
    if (norm(f.el.innerText) !== f.initial || !f.initial) f.el.textContent = f.initial;
    f.el.dataset.placeholder = S?.lang === "en_simple" ? "placeholder"
      : f.kind === "caption" ? "Write a caption…" : f.kind === "heading" ? "Heading" : "Write something…";
  }
}

/** @param {Block} b @param {boolean} on */
function setEditable(b, on) {
  for (const f of b.fields) {
    if (!f.editable) continue;
    if (on && b.override === null) f.el.setAttribute("contenteditable", "plaintext-only");
    else f.el.removeAttribute("contenteditable");
  }
}

// ---------------------------------------------------------------- serialize

/** @param {Block} b */
function blockText(b) {
  if (b.override !== null) return b.override;
  let raw = b.raw;
  const changed = b.fields
    .filter((f) => f.editable && norm(f.el.innerText) !== f.initial)
    .sort((x, y) => y.start - x.start);
  for (const f of changed) {
    raw = raw.slice(0, f.start) + f.wrap(escapeText(norm(f.el.innerText))) + raw.slice(f.end);
  }
  return raw;
}

/** The body region rebuilt from the blocks in their current order. */
function serialize() {
  if (!S) return "";
  let out = "";
  /** @type {Block | null} */
  let prev = null;
  for (const b of S.order) {
    if (b.deleted) continue;
    if (prev) {
      const adjacent = !b.isNew && !prev.isNew && b.origIndex === prev.origIndex + 1;
      out += adjacent ? gapText(b) : "\n\n" + leadOf(b);
    } else {
      out += b.isNew || b.origIndex !== 0 ? leadOf(b) : gapText(b).trimStart();
    }
    out += blockText(b);
    prev = b;
  }
  return out;
}

let dirtyTimer = 0;
function scheduleDirtyCheck() {
  clearTimeout(dirtyTimer);
  dirtyTimer = window.setTimeout(updateDirty, 120);
}
function updateDirty() {
  if (!S || S.source === null) return;
  S.dirty = serialize() !== S.source.slice(S.region.start, S.region.end);
  renderBar();
  layoutNotes();
}

// ---------------------------------------------------------------- notes

/** @param {string} gap @returns {Note[]} */
function parseNotes(gap) {
  return [...gap.matchAll(NOTE_RE)].map((m) => {
    const head = m[1].match(/^((?:\s+[a-z]+(?:="[^"]*")?)*)\s*:/);
    const note = { kind: "", by: "", quote: "", text: norm(head ? m[1].slice(head[0].length) : m[1]),
      raw: m[0], removed: false, isNew: false };
    for (const [, name, value] of (head?.[1] ?? "").matchAll(/([a-z]+)(?:="([^"]*)")?/g)) {
      if (value === undefined) note.kind = name;
      else if (name === "by") note.by = value;
      else if (name === "quote") note.quote = norm(value);
    }
    return note;
  });
}

/** @param {Note} n */
function noteSource(n) {
  const safe = (/** @type {string} */ t) => norm(t).replace(/\*\//g, "* /");
  const attr = (/** @type {string} */ name, /** @type {string} */ v) => (v ? ` ${name}="${safe(v).replace(/"/g, "'")}"` : "");
  return `{/* @note${n.kind ? " " + n.kind : ""}${attr("by", n.by)}${attr("quote", n.quote)}: ${safe(n.text)} */}`;
}

/** The text before a block, minus removed notes and plus added ones. @param {Block} b */
function gapText(b) {
  const added = b.notes.filter((n) => n.isNew && !n.removed && norm(n.text));
  const dropped = b.notes.filter((n) => n.removed && !n.isNew);
  let gap = b.gapBefore;
  for (const n of dropped) {
    const i = gap.indexOf(n.raw);
    if (i >= 0) gap = gap.slice(0, i) + gap.slice(i + n.raw.length).replace(/^\s*/, "");
  }
  if (added.length) gap = gap.replace(/\s*$/, "") + "\n\n" + added.map(noteSource).join("\n\n") + "\n\n";
  return gap;
}

/** The gap for a block that no longer follows its old neighbour: comments travel with it. @param {Block} b */
function leadOf(b) {
  const gap = gapText(b).trim();
  return gap ? gap + "\n\n" : "";
}

/** @param {Block} b */
function renderNotes(b) {
  if (!S) return;
  const live = b.notes.filter((n) => !n.removed);
  if (!live.length) {
    b.noteBox?.remove();
    b.noteBox = null;
  } else {
    if (!b.noteBox) {
      b.noteBox = el("div", "dev-edit-ui dev-edit-notes");
      b.nodes[0]?.before(b.noteBox);
      S.nodeBlock.set(b.noteBox, b);
    }
    b.noteBox.replaceChildren(...live.map((n) => noteCard(b, n)));
  }
  layoutNotes();
}

/** @param {Block} b @param {Note} n */
function noteCard(b, n) {
  const mine = n.by === "you";
  const card = el("div", `dev-edit-sticky ${mine ? "by-you" : `kind-${NOTE_KINDS.includes(n.kind) ? n.kind : "note"}`}`);
  const x = button("✕", () => {
    n.removed = true;
    paintHighlights(null);
    renderNotes(b);
    scheduleDirtyCheck();
  });
  x.title = n.isNew ? "Remove note" : "Remove note (from the file on Save)";
  card.append(el("div", "dev-edit-sticky-head", "", [
    el("span", "", mine ? "You" : `Claude${n.kind ? " · " + n.kind : ""}`), x,
  ]));
  if (n.quote) {
    const q = el("q", "dev-edit-sticky-quote", n.quote);
    if (!findQuote(b, n.quote)) {
      q.classList.add("missing");
      q.title = "This text has changed; the note points at the whole block.";
    }
    card.append(q);
  }
  if (n.isNew) {
    const ta = /** @type {HTMLTextAreaElement} */ (el("textarea"));
    ta.value = n.text;
    ta.rows = 3;
    ta.placeholder = "Note for Claude…";
    ta.addEventListener("input", () => { n.text = ta.value; });
    card.append(ta);
  } else {
    card.append(el("p", "", n.text));
  }
  card.addEventListener("mouseenter", () => { markHover(b, true); paintHighlights(n); });
  card.addEventListener("mouseleave", () => { markHover(b, false); paintHighlights(null); });
  return card;
}

/** @param {Block} b @param {string} [quote] */
function addNote(b, quote = "") {
  b.notes.push({ kind: "", by: "you", quote, text: "", raw: "", removed: false, isNew: true });
  renderNotes(b);
  const boxes = b.noteBox?.querySelectorAll("textarea");
  boxes?.[boxes.length - 1]?.focus();
}

/** Range of a note's quote in the block's English text. @param {Block} b @param {string} quote */
function findQuote(b, quote) {
  const words = norm(quote).split(" ").map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(words.join("\\s+"), "i");
  for (const node of b.nodes) {
    if (!(node instanceof HTMLElement)) continue;
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      const lang = t.parentElement?.closest("[data-lang-content]");
      if (lang && lang.getAttribute("data-lang-content") !== "en") continue;
      const m = re.exec(t.nodeValue ?? "");
      if (!m) continue;
      const r = new Range();
      r.setStart(t, m.index);
      r.setEnd(t, m.index + m[0].length);
      return r;
    }
  }
  return null;
}

/** Highlight every note's quote, and `active`'s more strongly. @param {Note | null} active */
function paintHighlights(active) {
  if (!S || typeof Highlight === "undefined" || !CSS.highlights) return;
  const all = new Highlight();
  const on = new Highlight();
  if (S.editing) {
    for (const b of S.order) {
      if (b.deleted) continue;
      for (const n of b.notes) {
        const r = !n.removed && n.quote ? findQuote(b, n.quote) : null;
        if (!r) continue;
        all.add(r);
        if (n === active) on.add(r);
      }
    }
  }
  CSS.highlights.set("dev-note", all);
  CSS.highlights.set("dev-note-active", on);
}

/** Pin note boxes beside their blocks in the right margin, or inline when there's no room. */
function layoutNotes() {
  if (!S) return;
  const c = S.container.getBoundingClientRect();
  const wide = window.innerWidth - c.right >= 17 * 16;
  document.documentElement.classList.toggle("dev-notes-inline", !wide);
  let floor = -Infinity;
  for (const b of S.order) {
    const box = b.noteBox;
    if (!box) continue;
    box.hidden = b.deleted;
    box.style.top = "";
    if (!wide || b.deleted) continue;
    const r = blockRect(b);
    if (!r) continue;
    const top = Math.max(r.top - c.top, floor);
    box.style.top = `${top}px`;
    floor = top + box.offsetHeight + 8;
  }
  paintHighlights(null);
}

// ---------------------------------------------------------------- edit mode

async function enterEdit() {
  if (!S || S.editing) return;
  if (!(await loadSource())) return;
  S.editing = true;
  document.documentElement.classList.add("dev-editing");
  showLanguage(S.lang);
  S.order.forEach((b) => setEditable(b, true));
  S.order.forEach(renderNotes);
  renderBar();
}

function exitEdit() {
  if (!S || !S.editing) return;
  S.editing = false;
  document.documentElement.classList.remove("dev-editing");
  S.order.forEach((b) => setEditable(b, false));
  hideToolbar();
  closePicker();
  let lang = "en";
  try { lang = localStorage.getItem(LANG_KEY) ?? "en"; } catch { /* keep en */ }
  showLanguage(lang);
  paintHighlights(null);
  renderBar();
}

/** Same toggle as LanguageSelector, without storing the choice. @param {string} lang */
function showLanguage(lang) {
  document.querySelectorAll("[data-lang-content]").forEach((el) => {
    el.classList.toggle("hidden", el.getAttribute("data-lang-content") !== lang);
  });
}

// ---------------------------------------------------------------- blocks

/** @param {Block} b */
function allNodes(b) {
  return /** @type {ChildNode[]} */ ([b.stub, b.sourceBox, b.noteBox, ...b.nodes].filter(Boolean));
}

/** @param {Block} b */
function blockRect(b) {
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
  for (const n of allNodes(b)) {
    // Notes sit in the margin; they aren't part of the block's shape.
    if (!(n instanceof HTMLElement) || n === b.noteBox) continue;
    const r = n.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom);
    left = Math.min(left, r.left); right = Math.max(right, r.right);
  }
  return top === Infinity ? null : { top, bottom, left, right };
}

/** @param {Block} b @param {boolean} hidden */
function hideNodes(b, hidden) {
  for (const n of b.nodes) if (n instanceof HTMLElement) n.classList.toggle("dev-edit-gone", hidden);
}

/** @param {Block} b */
function deleteBlock(b) {
  if (!S || b.deleted) return;
  if (b.isNew) {
    allNodes(b).forEach((n) => n.remove());
    S.order.splice(S.order.indexOf(b), 1);
  } else {
    b.deleted = true;
    hideNodes(b, true);
    const stub = el("div", "dev-edit-ui dev-edit-stub");
    stub.append(`Deleted ${KIND_LABEL[b.kind] ?? "block"} `);
    const undo = button("Undo", () => {
      b.deleted = false;
      b.stub?.remove();
      b.stub = null;
      hideNodes(b, false);
      scheduleDirtyCheck();
    });
    stub.append(undo);
    b.nodes[0]?.before(stub);
    b.stub = stub;
    S.nodeBlock.set(stub, b);
  }
  hideToolbar();
  scheduleDirtyCheck();
}

/**
 * @param {Block} b @param {Block | null} before  null = after the last block
 */
function moveBlock(b, before) {
  if (!S || before === b) return;
  S.order.splice(S.order.indexOf(b), 1);
  const at = before ? S.order.indexOf(before) : S.order.length;
  S.order.splice(at, 0, b);
  const anchor = before ? allNodes(before)[0] : S.endMarker;
  for (const n of allNodes(b)) S.container.insertBefore(n, anchor);
  layoutNotes();
  scheduleDirtyCheck();
}

/**
 * Swap with the neighbour above or below, then scroll by however far the block
 * moved, so it (and the toolbar) stays under the pointer for repeated clicks.
 * @param {Block} b @param {-1 | 1} dir
 */
function nudgeBlock(b, dir) {
  if (!S) return;
  const i = S.order.indexOf(b);
  if (dir < 0 ? i <= 0 : i >= S.order.length - 1) return;
  const before = dir < 0 ? S.order[i - 1] : S.order[i + 2] ?? null;
  const top = blockRect(b)?.top;
  moveBlock(b, before);
  const after = blockRect(b)?.top;
  if (top !== undefined && after !== undefined) window.scrollBy(0, after - top);
  showToolbar(b);
}

/**
 * Insert a new block after `after` from its raw MDX and a DOM stand-in that
 * uses the same structure (and so the same styles) the real render has.
 * @param {Block} after @param {string} raw @param {HTMLElement} dom
 */
function insertBlock(after, raw, dom) {
  if (!S) return null;
  /** @type {Block} */
  const b = {
    start: -1, end: -1, raw, kind: kindOf(raw), nodes: [dom], origIndex: -1, gapBefore: "",
    fields: [], deleted: false, isNew: true, override: null, stub: null, sourceBox: null,
    notes: [], noteBox: null,
  };
  const nodes = allNodes(after);
  nodes[nodes.length - 1].after(dom);
  S.order.splice(S.order.indexOf(after) + 1, 0, b);
  S.nodeBlock.set(dom, b);
  setupBlock(b);
  setEditable(b, true);
  b.fields[0]?.el.focus();
  scheduleDirtyCheck();
  return b;
}

/** Stand-in for a <T> in the language being edited: the same classes T.astro renders. @param {string} tag */
function tSpan(tag = "span") {
  const lang = S?.lang ?? "en";
  const outer = el("span", "translatable-text");
  const en = el("span", `lang-${lang}`);
  en.dataset.langContent = lang;
  en.lang = "en";
  if (tag === "p") en.append(el("span", "", "", [el("p")]));
  outer.append(en);
  return outer;
}

/** @param {Block} after */
function addParagraph(after) {
  const raw = '<T>\n  <span slot="en">\n\n  </span>\n  <span slot="en_simple">\n\n  </span>\n</T>';
  return insertBlock(after, raw, tSpan("p"));
}

/** @param {Block} after */
function addHeading(after) {
  const raw = '### <T><span slot="en"></span><span slot="en_simple"></span></T>';
  const h = el("h3");
  h.append(tSpan());
  return insertBlock(after, raw, h);
}

/** @param {Block} after @param {{ name: string, url: string, path: string }} img */
function addImage(after, img) {
  const alt = img.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const raw =
    `<figure>\n  ![${alt}](${img.path})\n  <figcaption>\n    <T>\n` +
    `      <span slot="en"></span>\n      <span slot="en_simple"></span>\n    </T>\n  </figcaption>\n</figure>`;
  const fig = el("figure");
  const p = el("p");
  const image = el("img");
  image.src = img.url;
  image.alt = alt;
  p.append(image);
  const cap = el("figcaption");
  cap.append(tSpan());
  fig.append(p, cap);
  return insertBlock(after, raw, fig);
}

/** @param {Block} b */
function openSource(b) {
  if (!S || b.sourceBox) return;
  const box = el("div", "dev-edit-ui dev-edit-source");
  const ta = /** @type {HTMLTextAreaElement} */ (el("textarea"));
  ta.value = blockText(b);
  ta.spellcheck = false;
  ta.rows = Math.min(30, ta.value.split("\n").length + 1);
  const row = el("div", "dev-edit-row");
  const apply = button("Apply", () => {
    const fresh = b.override === null ? blockText(b) : null;
    const value = ta.value.replace(/\s+$/, "");
    b.override = value === (fresh ?? b.raw) ? null : value;
    close();
  });
  const cancel = button("Cancel", close);
  const revert = button("Revert to page", () => { b.override = null; close(); });
  revert.hidden = b.override === null;
  const note = el("span", "dev-edit-note", "Raw MDX for this block. The page updates after Save.");
  row.append(apply, cancel, revert, note);
  box.append(ta, row);
  b.nodes[0]?.before(box);
  b.sourceBox = box;
  S.nodeBlock.set(box, b);
  hideNodes(b, true);
  hideToolbar();
  ta.focus();

  function close() {
    box.remove();
    b.sourceBox = null;
    hideNodes(b, false);
    for (const n of b.nodes) if (n instanceof HTMLElement) n.classList.toggle("dev-edit-stale", b.override !== null);
    setEditable(b, S?.editing ?? false);
    scheduleDirtyCheck();
  }
}

// ---------------------------------------------------------------- save

async function save() {
  if (!S || !S.dirty || S.saving || S.source === null) return;
  S.saving = true;
  renderBar("Saving…");
  const find = S.source.slice(S.region.start, S.region.end);
  const replace = serialize();
  // Before the request: the file change can reload the page before it returns.
  rememberSpot();
  try {
    const res = await fetch("/__dev/editor/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: S.slug,
        edits: [{ start: S.region.start, end: S.region.end, find, replace }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
  } catch (err) {
    S.saving = false;
    try { sessionStorage.removeItem(STATE_KEY); } catch { /* fine */ }
    fail(err instanceof Error ? err.message : String(err));
    return;
  }
  // Every offset on the page is stale now. Reload into edit mode at the same
  // spot and let Astro render the saved file.
  S.dirty = false;
  renderBar("Saved. Reloading…", "ok");
  setTimeout(() => location.reload(), 600);
}

function discard() {
  if (!S) return;
  S.dirty = false;
  rememberSpot();
  location.reload();
}

/** Reload into edit mode in the other language. Fields are built per language, so this needs a clean page. */
function switchLanguage() {
  if (!S || S.dirty) return;
  S.lang = S.lang === "en" ? "en_simple" : "en";
  try { sessionStorage.setItem(EDIT_LANG_KEY, S.lang); } catch { /* stays English */ }
  rememberSpot();
  location.reload();
}

/** Come back to edit mode at this scroll position after a reload. */
function rememberSpot() {
  if (!S) return;
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify({ slug: S.slug, y: window.scrollY }));
  } catch { /* reload anyway */ }
}

/** @param {string} message */
function fail(message) {
  renderBar(message, "err");
  return false;
}

// ---------------------------------------------------------------- UI

/**
 * @param {string} tag @param {string} [cls] @param {string} [text] @param {Node[]} [kids]
 * @returns {any}
 */
function el(tag, cls = "", text = "", kids = []) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  e.append(...kids);
  return e;
}

/** @param {string} label @param {() => void} onClick @param {string} [cls] */
function button(label, onClick, cls = "") {
  const b = /** @type {HTMLButtonElement} */ (el("button", cls, label));
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function buildUi() {
  if (!S) return;
  const bar = el("div", "dev-edit-ui dev-edit-bar");
  S.ui.bar = bar;

  const tools = el("div", "dev-edit-ui dev-edit-tools");
  const handle = button("⠿", () => {}, "dev-edit-handle");
  handle.title = "Drag to move";
  const up = button("↑", () => S?.hovered && nudgeBlock(S.hovered, -1));
  up.title = "Move up";
  const down = button("↓", () => S?.hovered && nudgeBlock(S.hovered, 1));
  down.title = "Move down";
  const add = button("+", () => toggleAddMenu());
  add.title = "Add below";
  let pendingQuote = "";
  const note = button("✎", () => { S?.hovered && addNote(S.hovered, pendingQuote); });
  note.title = "Add a note (select text first to point at it)";
  // Clicking moves the selection, so read it on the way in.
  note.addEventListener("pointerdown", () => {
    const sel = getSelection();
    pendingQuote = sel && !sel.isCollapsed && S?.hovered && blockAt(sel.anchorNode) === S.hovered
      ? norm(sel.toString()).slice(0, 80) : "";
  });
  const src = button("</>", () => S?.hovered && openSource(S.hovered));
  src.title = "Edit source";
  const del = button("✕", () => S?.hovered && deleteBlock(S.hovered));
  del.title = "Delete";
  const menu = el("div", "dev-edit-menu");
  menu.hidden = true;
  menu.append(
    button("Paragraph", () => { S?.hovered && addParagraph(S.hovered); menu.hidden = true; }),
    button("Heading", () => { S?.hovered && addHeading(S.hovered); menu.hidden = true; }),
    button("Image…", () => { S?.hovered && openPicker(S.hovered); menu.hidden = true; }),
  );
  tools.append(handle, up, down, add, note, src, del, menu);
  tools.hidden = true;
  S.ui.tools = tools;
  S.ui.up = up;
  S.ui.down = down;
  S.ui.menu = menu;
  handle.addEventListener("pointerdown", startDrag);

  const line = el("div", "dev-edit-ui dev-edit-dropline");
  line.hidden = true;
  S.ui.line = line;

  document.body.append(bar, tools, line);
  renderBar();
}

function toggleAddMenu() {
  if (S) S.ui.menu.hidden = !S.ui.menu.hidden;
}

/** @param {string} [message] @param {"ok" | "err"} [tone] */
function renderBar(message, tone) {
  if (!S) return;
  const bar = S.ui.bar;
  bar.replaceChildren();
  if (!S.editing) {
    bar.append(button("✎ Edit", () => enterEdit(), "dev-edit-primary"));
    if (S.dirty) bar.append(el("span", "dev-edit-status err", "Unsaved changes"));
    if (message) bar.append(el("span", `dev-edit-status ${tone ?? ""}`, message));
    return;
  }
  const status = message ?? (S.dirty ? "Unsaved changes" : "No changes");
  bar.append(el("span", `dev-edit-status ${tone ?? (S.dirty ? "dirty" : "")}`, status));
  const discardBtn = button("Discard", discard);
  discardBtn.disabled = !S.dirty || S.saving;
  const saveBtn = button("Save ⌘S", save, "dev-edit-primary");
  saveBtn.disabled = !S.dirty || S.saving;
  const langBtn = button(S.lang === "en" ? "Simple English" : "English", switchLanguage);
  langBtn.disabled = S.dirty || S.saving;
  langBtn.title = S.dirty ? "Save or discard first" : "Edit the other language";
  bar.append(langBtn, discardBtn, saveBtn, button("Done", exitEdit));
}

/** @param {Block} b */
function showToolbar(b) {
  if (!S) return;
  const r = blockRect(b);
  if (!r) return hideToolbar();
  if (S.hovered && S.hovered !== b) {
    S.ui.menu.hidden = true;
    markHover(S.hovered, false);
  }
  S.hovered = b;
  markHover(b, true);
  const i = S.order.indexOf(b);
  /** @type {HTMLButtonElement} */ (S.ui.up).disabled = i <= 0;
  /** @type {HTMLButtonElement} */ (S.ui.down).disabled = i >= S.order.length - 1;
  const tools = S.ui.tools;
  tools.hidden = false;
  const w = tools.offsetWidth;
  const outside = r.left - w - 12 >= 4;
  tools.classList.toggle("inside", !outside);
  tools.style.top = `${r.top + window.scrollY}px`;
  tools.style.left = `${outside ? r.left - w - 12 + window.scrollX : r.right - w + window.scrollX}px`;
}

function hideToolbar() {
  if (!S) return;
  if (S.hovered) markHover(S.hovered, false);
  S.hovered = null;
  S.ui.tools.hidden = true;
  S.ui.menu.hidden = true;
}

/** @param {Block} b @param {boolean} on */
function markHover(b, on) {
  for (const n of allNodes(b)) if (n instanceof HTMLElement) n.classList.toggle("dev-edit-hover", on);
}

/** The block a DOM node belongs to (top-level child of the post body). @param {EventTarget | null} t */
function blockAt(t) {
  if (!S || !(t instanceof Node)) return null;
  let n = /** @type {Node | null} */ (t);
  while (n && n.parentNode !== S.container) n = n.parentNode;
  return n ? S.nodeBlock.get(n) ?? null : null;
}

// ---------------------------------------------------------------- drag

/** @param {PointerEvent} e */
function startDrag(e) {
  if (!S || !S.hovered) return;
  e.preventDefault();
  const dragged = S.hovered;
  const handle = /** @type {HTMLElement} */ (e.currentTarget);
  handle.setPointerCapture(e.pointerId);
  S.ui.menu.hidden = true;
  for (const n of allNodes(dragged)) if (n instanceof HTMLElement) n.classList.add("dev-edit-dragging");
  /** @type {Block | null | undefined} */
  let target;
  let y = e.clientY;
  let raf = 0;

  const locate = () => {
    if (!S) return;
    const containerRect = S.container.getBoundingClientRect();
    target = null;
    let lineY = null;
    let prevBottom = null;
    for (const c of S.order) {
      if (c === dragged) continue;
      const r = blockRect(c);
      if (!r) continue;
      if (y < (r.top + r.bottom) / 2) {
        target = c;
        lineY = prevBottom === null ? r.top - 6 : (prevBottom + r.top) / 2;
        break;
      }
      prevBottom = r.bottom;
    }
    if (target === null) lineY = (prevBottom ?? containerRect.top) + 6;
    const line = S.ui.line;
    line.hidden = false;
    line.style.top = `${(lineY ?? 0) + window.scrollY}px`;
    line.style.left = `${containerRect.left + window.scrollX}px`;
    line.style.width = `${containerRect.width}px`;
  };
  const tick = () => {
    const edge = 70;
    if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 4));
    else if (y > window.innerHeight - edge) window.scrollBy(0, Math.ceil((y - window.innerHeight + edge) / 4));
    locate();
    raf = requestAnimationFrame(tick);
  };
  /** @param {PointerEvent} ev */
  const move = (ev) => { y = ev.clientY; };
  const end = () => {
    cancelAnimationFrame(raf);
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", end);
    handle.removeEventListener("pointercancel", end);
    if (!S) return;
    S.ui.line.hidden = true;
    for (const n of allNodes(dragged)) if (n instanceof HTMLElement) n.classList.remove("dev-edit-dragging");
    if (target !== undefined) {
      const at = S.order.indexOf(dragged);
      const next = S.order[at + 1] ?? null;
      if (target !== next) moveBlock(dragged, target);
    }
    showToolbar(dragged);
  };
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
  raf = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- image picker

/** @param {Block} after */
async function openPicker(after) {
  if (!S) return;
  closePicker();
  const panel = el("div", "dev-edit-ui dev-edit-picker");
  const head = el("div", "dev-edit-row");
  head.append(el("strong", "", "Insert image"), button("Close", closePicker));
  const grid = el("div", "dev-edit-grid", "Loading…");
  panel.append(head, grid);
  document.body.append(panel);
  S.ui.picker = panel;

  const res = await fetch(`/__dev/editor/images?slug=${encodeURIComponent(S.slug)}`);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) { grid.textContent = data.error ?? "Could not list images."; return; }
  const pending = S.order.filter((b) => b.isNew && !b.deleted).map((b) => b.raw).join("\n");
  grid.replaceChildren();
  if (!data.images.length) grid.textContent = `No images in src/assets/images/blog/${S.slug}/ yet.`;
  for (const img of data.images) {
    const used = img.used || pending.includes(img.path);
    const card = button("", () => { closePicker(); addImage(after, img); }, "dev-edit-thumb");
    const thumb = /** @type {HTMLImageElement} */ (el("img"));
    thumb.src = img.url;
    thumb.loading = "lazy";
    thumb.alt = "";
    card.append(thumb, el("span", "", img.name));
    if (used) card.append(el("span", "dev-edit-used", "used"));
    grid.append(card);
  }
}

function closePicker() {
  S?.ui.picker?.remove();
  if (S) delete S.ui.picker;
}

// ---------------------------------------------------------------- global listeners (once)

document.addEventListener("astro:page-load", init);

document.addEventListener("mousemove", (e) => {
  if (!S?.editing || document.querySelector(".dev-edit-dragging")) return;
  const t = /** @type {Element} */ (e.target);
  if (t instanceof Element && t.closest(".dev-edit-tools")) return;
  const b = blockAt(t);
  if (b && !b.sourceBox && !b.deleted) showToolbar(b);
  else if (b?.deleted) hideToolbar();
  else if (!b && S.hovered) {
    const r = blockRect(S.hovered);
    // Keep it while the pointer crosses the gutter between block and tools.
    if (!r || e.clientY < r.top - 8 || e.clientY > r.bottom + 8 || e.clientX > r.right + 8) hideToolbar();
  }
});

document.addEventListener("input", (e) => {
  if (S?.editing && blockAt(e.target)) scheduleDirtyCheck();
});

// In edit mode, clicks in the post edit it: no lightbox, links, quiz answers
// or Explain popups.
document.addEventListener(
  "click",
  (e) => {
    if (!S?.editing) return;
    const t = e.target;
    if (!(t instanceof Element) || t.closest(".dev-edit-ui")) return;
    if (!S.container.contains(t)) return;
    e.preventDefault();
    e.stopPropagation();
  },
  true,
);

document.addEventListener("keydown", (e) => {
  if (!S) return;
  if ((e.metaKey || e.ctrlKey) && e.key === "s" && S.editing) {
    e.preventDefault();
    save();
    return;
  }
  if (e.key === "Escape") {
    closePicker();
    if (S.ui.menu) S.ui.menu.hidden = true;
    return;
  }
  if (!S.editing) return;
  const t = e.target;
  if (!(t instanceof HTMLElement) || !t.isContentEditable) return;
  const b = blockAt(t);
  const field = b?.fields.find((f) => f.el === t);
  if (!b || !field) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    // Enter in a paragraph starts a new one below; elsewhere it just leaves.
    if (field.kind === "paragraph") addParagraph(b);
    else t.blur();
  } else if (e.key === "Backspace" && b.isNew && !t.innerText.trim()) {
    e.preventDefault();
    const i = S.order.indexOf(b);
    deleteBlock(b);
    const prev = S.order.slice(0, i).reverse().find((x) => !x.deleted && x.fields.some((f) => f.editable));
    const pf = prev?.fields.filter((f) => f.editable).at(-1);
    if (pf) {
      pf.el.focus();
      getSelection()?.selectAllChildren(pf.el);
      getSelection()?.collapseToEnd();
    }
  }
});

let layoutFrame = 0;
const relayout = () => {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(() => { if (S?.editing) layoutNotes(); });
};
window.addEventListener("resize", relayout);
// Images loading and text reflowing move blocks without any edit.
new ResizeObserver(relayout).observe(document.documentElement);

window.addEventListener("beforeunload", (e) => {
  if (S?.dirty) e.preventDefault();
});
