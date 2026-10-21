// Dev-only Astro integration behind the in-page post editor (tools/dev-edit/).
// It injects the editor script into every page under `astro dev` and serves
// three endpoints: GET source returns a post's raw .mdx, GET images lists the
// post's image folder for the insert-image picker, and POST save writes edits
// back. The Cloudflare adapter runs page SSR in workerd (no filesystem), but
// the `astro:server:setup` hook runs in the Node dev process and can read and
// write the real files. We prepend the handler to the Connect middleware stack
// (unshift) so it runs before Astro's SSR catch-all; using `.use()` appends it,
// so the request 404s before reaching us. Both hooks only act under the dev
// server, so nothing ships to production.

import fs from "node:fs";
import path from "node:path";

const BLOG_DIR = () => path.resolve(process.cwd(), "src/content/blog");
const IMAGE_DIR = () => path.resolve(process.cwd(), "src/assets/images/blog");
const ENDPOINT = "/__dev/editor/save";
const SOURCE_ENDPOINT = "/__dev/editor/source";
const IMAGES_ENDPOINT = "/__dev/editor/images";
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/** @returns {import('astro').AstroIntegration} */
export default function devEditor() {
  return {
    name: "dev-editor",
    hooks: {
      "astro:config:setup": ({ command, injectScript }) => {
        if (command === "dev") injectScript("page", `import "/tools/dev-edit/edit-mode.js";`);
      },
      "astro:server:setup": ({ server }) => {
        const handler = async (
          /** @type {import('node:http').IncomingMessage} */ req,
          /** @type {import('node:http').ServerResponse} */ res,
          /** @type {() => void} */ next
        ) => {
          const [url, query = ""] = (req.url || "").split("?");

          /** @param {number} status @param {object} body */
          const json = (status, body) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          };

          if (req.method === "GET" && (url === SOURCE_ENDPOINT || url === IMAGES_ENDPOINT)) {
            const slug = new URLSearchParams(query).get("slug") ?? "";
            const file = /^[A-Za-z0-9_-]+$/.test(slug) ? resolveFile(slug) : null;
            if (!file) return json(404, { ok: false, error: `Post not found: ${slug}` });
            const source = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");
            if (url === SOURCE_ENDPOINT) return json(200, { ok: true, slug, source });
            return json(200, { ok: true, slug, images: listImages(slug, source) });
          }
          if (req.method !== "POST" || url !== ENDPOINT) return next();

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

/** @typedef {{ start: number, end: number, find: string, replace: string }} Edit */

/**
 * Apply edits to one post by source offset (CRLF normalized to LF; restored on
 * write so CRLF files keep clean diffs). Every range's `find` must still match
 * the file at that spot; if the file changed on disk since the page loaded,
 * the save is refused rather than written over the newer text.
 * A save that would turn a compiling post into one MDX can't parse (a stray
 * `<` or `{` in the text) is refused, so the post page never breaks.
 *
 * @param {{ slug?: string, edits?: Edit[] }} body
 */
async function applyEdits(body) {
  const { slug } = body;
  const edits = Array.isArray(body.edits) ? body.edits : [];
  if (typeof slug !== "string" || !/^[A-Za-z0-9_-]+$/.test(slug)) {
    return { ok: false, error: "Invalid slug" };
  }
  if (edits.length === 0) return { ok: false, error: "No edits provided" };

  const file = resolveFile(slug);
  if (!file) return { ok: false, error: `Post not found: ${slug}` };

  const original = fs.readFileSync(file, "utf-8");
  const hadCRLF = original.includes("\r\n");
  const text = original.replace(/\r\n/g, "\n");

  let working;
  try {
    const located = edits.map((e, i) => {
      if (typeof e.replace !== "string") throw new Error(`Edit ${i} has no replacement`);
      const find = String(e.find).replace(/\r\n/g, "\n");
      const valid = Number.isInteger(e.start) && Number.isInteger(e.end) && e.start >= 0 && e.end >= e.start;
      if (!valid || text.slice(e.start, e.end) !== find) {
        const line = text.slice(0, Math.max(0, Math.min(e.start, text.length))).split("\n").length;
        throw new Error(
          `Edit ${i} (near line ${line}) no longer matches the file: it changed on disk since this page loaded. ` +
            "Copy any unsaved text, then reload the page."
        );
      }
      return { start: e.start, end: e.end, replace: e.replace.replace(/\r\n/g, "\n") };
    });
    working = splice(text, located);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const broken = await mdxError(working);
  if (broken && !(await mdxError(text))) return { ok: false, error: broken };

  const out = hadCRLF ? working.replace(/\n/g, "\r\n") : working;
  fs.writeFileSync(file, out, "utf-8");
  return { ok: true, slug, applied: edits.length, source: working };
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

/**
 * The post's image folder, with whether the source already references each.
 * @param {string} slug @param {string} source
 */
function listImages(slug, source) {
  const dir = path.join(IMAGE_DIR(), slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => IMAGE_EXT.test(name))
    .sort()
    .map((name) => ({
      name,
      url: `/src/assets/images/blog/${slug}/${name}`,
      path: `../../assets/images/blog/${slug}/${name}`,
      used: source.includes(`/${slug}/${name}`),
    }));
}

/** @param {string} slug @returns {string | null} */
function resolveFile(slug) {
  for (const ext of [".mdx", ".md"]) {
    const p = path.join(BLOG_DIR(), slug + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}