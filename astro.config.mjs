// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "url";
import path from "path";

import sentry from "@sentry/astro";
import spotlightjs from "@spotlightjs/astro";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://bloggydoggy.com",
  // In Astro 5.0+, 'static' is the default and behaves like the old 'hybrid' mode.
  // This allows us to keep blog posts pre-rendered while using 'export const prerender = false' 
  // in API routes (likes, quiz, contact) for dynamic D1/Resend integration.
  output: "static",
  adapter: cloudflare({
    // 'compile' mode optimizes images at build time. 
    // This works perfectly with OptimizedImage.astro on all pre-rendered pages.
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [mdx(), sitemap(), sentry(), spotlightjs()],

  vite: {
    resolve: {
      alias: {
        "~": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
      },
    },
  },
});
