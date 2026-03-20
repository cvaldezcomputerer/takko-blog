/**
 * Patches the generated dist/server/wrangler.json after astro build to make
 * Cloudflare Pages CI happy with @astrojs/cloudflare v13.
 *
 * The adapter generates a Workers-style config (with "main", "assets", etc.)
 * but Pages CI validates it as a Pages config (because pages_build_output_dir
 * is present) and rejects those Worker-only fields.
 *
 * Fix: remove Worker-only fields, fix the pages_build_output_dir to a relative
 * path pointing at dist/client, and create dist/client/_worker.js so Pages can
 * find the SSR worker.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const wranglerPath = join(root, "dist/server/wrangler.json");

if (!existsSync(wranglerPath)) {
  console.log("[patch-wrangler] dist/server/wrangler.json not found, skipping.");
  process.exit(0);
}

const config = JSON.parse(readFileSync(wranglerPath, "utf-8"));

// Fix 1: Remove Worker-only fields that Pages CI rejects.
// Pages finds the worker via _worker.js in pages_build_output_dir, not "main".
delete config.main;
delete config.rules;
delete config.no_bundle;
delete config.assets;

// Fix 2: Fix pages_build_output_dir — the adapter writes an absolute local path
// which is wrong in CI. Use a relative path from dist/server/ to dist/client/.
config.pages_build_output_dir = "../client";

// Fix 3: Remove SESSION KV namespace — no "id" field, and this project
// does not use Astro sessions.
if (Array.isArray(config.kv_namespaces)) {
  config.kv_namespaces = config.kv_namespaces.filter(
    (kv) => kv.binding !== "SESSION"
  );
}

// Fix 4: "triggers: {}" is invalid; Pages expects { crons: [] } or nothing.
if (
  config.triggers !== undefined &&
  typeof config.triggers === "object" &&
  !Array.isArray(config.triggers) &&
  !("crons" in config.triggers)
) {
  config.triggers = { crons: [] };
}

writeFileSync(wranglerPath, JSON.stringify(config, null, 2));
console.log("[patch-wrangler] Patched dist/server/wrangler.json");

// Fix 5: Create dist/client/_worker.js so Cloudflare Pages can find the SSR
// worker. Pages looks for _worker.js in pages_build_output_dir (dist/client/).
const workerPath = join(root, "dist/client/_worker.js");
const workerContent = `export { default } from "../server/entry.mjs";\n`;
writeFileSync(workerPath, workerContent);
console.log("[patch-wrangler] Created dist/client/_worker.js");
