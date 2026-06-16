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
            const result = applyEdits(body);
            json(result.ok ? 200 : 400, result);
          } catch (err) {
            json(500, { ok: false, error: err instanceof Error ? err.message : String(err) });
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
 * Apply an ordered list of verified find/replace edits to one post. Each `find`
 * must occur at least once in the current working text; the first occurrence is
 * replaced. Edits run in order, so placeholder-based image swaps work. Line
 * endings are normalized to \n for matching and restored on write so CRLF files
 * keep clean diffs.
 *
 * @param {{ slug?: string, edits?: { find: string, replace: string }[] }} body
 */
function applyEdits(body) {
  const { slug, edits } = body;
  if (typeof slug !== "string" || !/^[A-Za-z0-9_-]+$/.test(slug)) {
    return { ok: false, error: "Invalid slug" };
  }
  if (!Array.isArray(edits) || edits.length === 0) {
    return { ok: false, error: "No edits provided" };
  }

  const file = resolveFile(slug);
  if (!file) return { ok: false, error: `Post not found: ${slug}` };

  const original = fs.readFileSync(file, "utf-8");
  const hadCRLF = original.includes("\r\n");
  let working = original.replace(/\r\n/g, "\n");

  for (let i = 0; i < edits.length; i++) {
    const { find, replace } = edits[i];
    if (typeof find !== "string" || typeof replace !== "string") {
      return { ok: false, error: `Edit ${i} missing find/replace` };
    }
    const nFind = find.replace(/\r\n/g, "\n");
    const idx = working.indexOf(nFind);
    if (idx === -1) {
      return {
        ok: false,
        error: `Edit ${i} target not found (file changed since load?). Reload and retry.`,
      };
    }
    const nReplace = replace.replace(/\r\n/g, "\n");
    working = working.slice(0, idx) + nReplace + working.slice(idx + nFind.length);
  }

  const out = hadCRLF ? working.replace(/\n/g, "\r\n") : working;
  fs.writeFileSync(file, out, "utf-8");
  return { ok: true, slug, applied: edits.length };
}

/** @param {string} slug @returns {string | null} */
function resolveFile(slug) {
  for (const ext of [".mdx", ".md"]) {
    const p = path.join(BLOG_DIR(), slug + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}