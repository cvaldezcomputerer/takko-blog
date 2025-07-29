// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "url";
import path from "path";

// https://astro.build/config
export default defineConfig({
  site: "https://bloggydoggy.com",
  integrations: [mdx(), sitemap()],
  vite: {
    resolve: {
      alias: {
        "~": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
      },
    },
  },
});
