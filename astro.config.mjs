// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "url";
import path from "path";

import sentry from "@sentry/astro";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://bloggydoggy.com",
  output: "static",
  image: {
    domains: ["d2iqb5t9tunqwu.cloudfront.net"],
  },
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [mdx(), sitemap(), sentry()],

  vite: {
    resolve: {
      alias: {
        "~": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
      },
    },
    optimizeDeps: {
      exclude: [
        "@sentry/astro",
        "astro/virtual-modules/transitions-router.js",
        "astro/virtual-modules/transitions-types.js",
        "astro/virtual-modules/transitions-events.js",
        "astro/virtual-modules/transitions-swap-functions.js",
      ],
    },
  },
});
