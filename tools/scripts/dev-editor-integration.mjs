// Dev-only Astro integration that lets the /dev/editor panel write back to the
// .mdx files. The Cloudflare adapter runs page SSR in workerd (no filesystem),
// but the `astro:server:setup` hook runs in the Node dev process and can read
// and write the real files. We prepend the handler to the Connect middleware
// stack (unshift) so it runs before Astro's SSR catch-all; using `.use()`
// appends it, so the request 404s before reaching us. The hook only fires for
// the dev server, so nothing ships to production.

import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = () => path.resolve(process.cwd(), "src/content/blog");
const ENDPOINT = "/__dev/editor/save";

/** @returns {import('astro').AstroIntegration} */
export default function devEditor() {
  return {
    name: "dev-editor",
    hooks: {
      "astro:server:setup": ({ server }) => {
        const handler = async (
          /** @type {import('node:http').IncomingMessage} */ req,
          /** @type {import('node:http').ServerResponse} */ res,
          /** @type {() => void} */ next
        ) => {
          const url = (req.url || "").split("?")[0];
          if (req.method !== "POST" || url !== ENDPOINT) return next();

          /** @param {number} status @param {object} body */
          const json = (status, body) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          };

          try {
            const body = await readJson(req);
            const result = await applyEdits(body);
            json(result.ok ? 200 : 400, result);
          } catch (err) {
            const status = /** @type {any} */ (err)?.status ?? 500;
            json(status, { ok: false, error: err instanceof Error ? err.message : String(err) });
          }
        };

        server.middlewares.stack.unshift({ route: "", handle: handler });
        console.log("[dev-editor] save endpoint ready at POST " + ENDPOINT);
      },
    },
  };
}

/** @param {import('node:http').IncomingMessage} req @returns {Promise<any>} */
function readJson(req) {
  return new Promise((resolve, reject) => {
    // Browsers can only send application/json cross-site after a CORS
    // preflight, which this endpoint never answers, so requiring it keeps
    // other sites from posting edits into the dev server.
    if (!String(req.headers["content-type"] || "").startsWith("application/json")) {
      reject(Object.assign(new Error("Expected Content-Type: application/json"), { status: 415 }));
      return;
    }
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * @typedef {{ start: number, end: number, find: string, unique?: boolean }} Range
 *   `unique` is the page's word that this text appeared only once when it
 *   loaded; only then may a range that moved be followed by its text.
 * @typedef {Range & { replace: string }} Edit
 * @typedef {{ slots: Range[], order: number[] }} Move
 *   `slots` are the image blocks of one group (the post body, or one Gallery)
 *   in original order; `order[i]` says which original image now fills slot i.
 */

/**
 * Apply edits to one post by source offset (CRLF normalized to LF; restored on
 * write so CRLF files keep clean diffs). Every range is checked against the
 * file first. If the text moved (the file was edited elsewhere since the page
 * loaded), was unique on the page, and still occurs exactly once, the edit
 * follows it and the response says `relocated` so the page reloads. Anything
 * else is refused rather than risk writing into a look-alike box.
 * Returns the new source so the page can carry on without reloading.
 * A save that would turn a compiling post into one MDX can't parse (a stray
 * `<` or `{` in the text) is refused, so the post page never breaks.
 *
 * @param {{ slug?: string, edits?: Edit[], moves?: Move[] }} body
 */
async function applyEdits(body) {
  const { slug } = body;
  const edits = Array.isArray(body.edits) ? body.edits : [];
  const moves = Array.isArray(body.moves) ? body.moves : [];
  if (typeof slug !== "string" || !/^[A-Za-z0-9_-]+$/.test(slug)) {
    return { ok: false, error: "Invalid slug" };
  }
  if (edits.length === 0 && moves.length === 0) {
    return { ok: false, error: "No edits provided" };
  }

  const file = resolveFile(slug);
  if (!file) return { ok: false, error: `Post not found: ${slug}` };

  const original = fs.readFileSync(file, "utf-8");
  const hadCRLF = original.includes("\r\n");
  const text = original.replace(/\r\n/g, "\n");
  let relocated = false;

  /** @param {Range} r @param {string} what @returns {Range} */
  const locate = (r, what) => {
    const find = String(r.find).replace(/\r\n/g, "\n");
    const valid = Number.isInteger(r.start) && Number.isInteger(r.end) && r.start >= 0 && r.end >= r.start;
    if (valid && text.slice(r.start, r.end) === find) return { start: r.start, end: r.end, find };
    const at = find && r.unique === true ? text.indexOf(find) : -1;
    if (at !== -1 && text.indexOf(find, at + 1) === -1) {
      relocated = true;
      return { start: at, end: at + find.length, find };
    }
    const line = text.slice(0, Math.max(0, Math.min(r.start, text.length))).split("\n").length;
    throw new Error(
      `${what} (near line ${line}) no longer matches the file: it changed on disk since this page loaded. ` +
        "Copy any unsaved text, then reload the editor."
    );
  };

  /** @type {(Range & { replace: string })[]} */
  let located;
  /** @type {{ start: number, end: number, raw: string }[][]} */
  let groups;
  try {
    located = edits.map((e, i) => {
      if (typeof e.replace !== "string") throw new Error(`Edit ${i} has no replacement`);
      return { ...locate(e, `Edit ${i}`), replace: e.replace.replace(/\r\n/g, "\n") };
    });
    groups = moves.map((m, g) => {
      const slots = m.slots.map((r, i) => ({ ...locate(r, `Image ${i + 1} of group ${g + 1}`), raw: "" }));
      const order = m.order;
      const perm = [...order].sort((a, b) => a - b);
      if (order.length !== slots.length || perm.some((v, i) => v !== i)) {
        throw new Error(`Move ${g} order is not a permutation`);
      }
      return slots;
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Text edits that sit inside a moving image travel with it: apply them to
  // that image's own text first, then place the images in their new slots.
  const nested = new Set();
  for (const slots of groups) {
    for (const slot of slots) {
      const inner = located.filter((e) => e.start >= slot.start && e.end <= slot.end);
      inner.forEach((e) => nested.add(e));
      slot.raw = splice(
        text.slice(slot.start, slot.end),
        inner.map((e) => ({ ...e, start: e.start - slot.start, end: e.end - slot.start }))
      );
    }
  }
  const top = located.filter((e) => !nested.has(e));
  groups.forEach((slots, g) => {
    slots.forEach((slot, i) => {
      top.push({ start: slot.start, end: slot.end, find: slot.find, replace: slots[moves[g].order[i]].raw });
    });
  });

  let working;
  try {
    working = splice(text, top);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const broken = await mdxError(working);
  if (broken && !(await mdxError(text))) return { ok: false, error: broken };

  const out = hadCRLF ? working.replace(/\n/g, "\r\n") : working;
  fs.writeFileSync(file, out, "utf-8");
  return { ok: true, slug, applied: located.length, moved: moves.length, relocated, source: working };
}

/**
 * Parse `source` with satteri, the MDX parser Astro uses here, and describe the
 * first syntax error, or return null. satteri is a dependency of
 * @astrojs/mdx, not of this project, so if it can't be loaded the check is
 * skipped rather than blocking every save.
 * @param {string} source @returns {Promise<string | null>}
 */
async function mdxError(source) {
  /** @type {any} */
  let satteri;
  try {
    satteri = await import("satteri");
  } catch {
    return null;
  }
  try {
    satteri.mdxToJs(source);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const at = /^(\d+):(\d+)/.exec(message);
    let near = "";
    if (at) {
      const line = source.split("\n")[Number(at[1]) - 1] ?? "";
      const col = Number(at[2]) - 1;
      near = ` Near: "…${line.slice(Math.max(0, col - 40), col + 40).trim()}…"`;
    }
    return (
      "Not saved: this text would break the post (MDX can't parse it). " +
      "A `<` or `{` in the text starts a tag or code; reword it, or write &lt; for <." +
      near +
      ` (${message})`
    );
  }
}

/**
 * Replace non-overlapping [start, end) ranges in `text`.
 * @param {string} text @param {{ start: number, end: number, replace: string }[]} ranges
 */
function splice(text, ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) throw new Error("Two edits overlap; reload and retry.");
  }
  let out = text;
  for (let i = sorted.length - 1; i >= 0; i--) {
    out = out.slice(0, sorted[i].start) + sorted[i].replace + out.slice(sorted[i].end);
  }
  return out;
}

/** @param {string} slug @returns {string | null} */
function resolveFile(slug) {
  for (const ext of [".mdx", ".md"]) {
    const p = path.join(BLOG_DIR(), slug + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}