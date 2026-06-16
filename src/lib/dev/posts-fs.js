// Post source access for the dev editor.
//
// The Cloudflare adapter runs dev SSR in workerd, not Node, so there is no
// real filesystem or usable process.cwd() at request time. Instead we let Vite
// inline the raw .mdx contents via import.meta.glob(...?raw): this is resolved
// on the Node side at transform time and re-runs on file change in dev, so the
// viewer always reflects what is on disk. (Lazy/non-eager so the production
// build does not bundle every post into the worker.)

/** @type {Record<string, () => Promise<string>>} */
const rawModules = /** @type {any} */ (
  import.meta.glob("/src/content/blog/*.{md,mdx}", {
    query: "?raw",
    import: "default",
  })
);

/** @param {string} pathKey */
function slugOf(pathKey) {
  return (pathKey.split("/").pop() ?? "").replace(/\.mdx?$/, "");
}

/** @returns {Promise<{ slug: string, title: string, pubDate: string }[]>} */
export async function listPosts() {
  const posts = [];
  for (const pathKey of Object.keys(rawModules)) {
    const raw = await rawModules[pathKey]();
    const slug = slugOf(pathKey);
    const title = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? slug;
    const pubDate = raw.match(/^pubDate:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? "";
    posts.push({ slug, title, pubDate });
  }
  // Newest first by pubDate (the same field that orders the live site); fall
  // back to title for any posts that share a date or lack one.
  posts.sort(
    (a, b) => b.pubDate.localeCompare(a.pubDate) || a.title.localeCompare(b.title),
  );
  return posts;
}

/**
 * @param {string} slug
 * @returns {Promise<string | null>} raw file contents, or null if not found
 */
export async function readPost(slug) {
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) return null;
  for (const pathKey of Object.keys(rawModules)) {
    if (slugOf(pathKey) === slug) return await rawModules[pathKey]();
  }
  return null;
}

/**
 * Map an MDX image path (relative to the blog dir, e.g.
 * "../../assets/images/blog/foo/x.webp") to a root-relative URL the Vite dev
 * server can serve directly. Dev-only.
 * @param {string} src
 * @returns {string}
 */
export function assetFsUrl(src) {
  if (/^https?:\/\//.test(src) || src.startsWith("/")) return src;
  const stack = ["src", "content", "blog"]; // directory the mdx lives in
  for (const part of src.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return "/" + stack.join("/");
}
