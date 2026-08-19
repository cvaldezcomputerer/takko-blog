// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import cloudflare from "@astrojs/cloudflare";

import devEditor from "./tools/scripts/dev-editor-integration.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build a map of "/blog/<slug>/" -> last-modified date by reading post frontmatter.
// Used to add <lastmod> entries to the sitemap so search engines see freshness.
function getBlogLastmodMap() {
  const blogDir = path.resolve(__dirname, "src/content/blog");
  /** @type {Record<string, string>} */
  const map = {};
  for (const file of fs.readdirSync(blogDir)) {
    if (!/\.mdx?$/.test(file)) continue;
    const slug = file.replace(/\.mdx?$/, "");
    const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const read = (/** @type {string} */ key) =>
      fm[1].match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?`, "m"))?.[1];
    const date = read("updatedDate") ?? read("pubDate");
    if (!date) continue;
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.valueOf())) {
      map[`/blog/${slug}/`] = parsed.toISOString();
    }
  }
  return map;
}

const blogLastmod = getBlogLastmodMap();

// https://astro.build/config
export default defineConfig({
  site: "https://bloggydoggy.com",
  output: "static",
  // Astro 7 defaults this to 'jsx' (strips newline-containing whitespace between
  // inline elements rather than collapsing it to a space). Pinned to the v6
  // behaviour so the v7 upgrade is byte-identical in rendered text.
  // Worth revisiting: 'jsx' actually *fixes* the stray space before punctuation
  // that <Explain> leaves behind ("hiccups , I" -> "hiccups, I") across the
  // posts. Switch it after a visual check of the recipe cards.
  compressHTML: true,
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    devEditor(),
    mdx(),
    sitemap({
      serialize(item) {
        const { pathname } = new URL(item.url);
        const lastmod = blogLastmod[pathname];
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
    }),
  ],

  vite: {
    resolve: {
      alias: {
        "~": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
      },
    },
    optimizeDeps: {
      exclude: [
        "astro/virtual-modules/transitions-router.js",
        "astro/virtual-modules/transitions-types.js",
        "astro/virtual-modules/transitions-events.js",
        "astro/virtual-modules/transitions-swap-functions.js",
      ],
    },
  },
});
