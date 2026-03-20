/**
 * Patches the generated dist/server/wrangler.json after astro build to fix
 * Cloudflare Pages CI validation errors caused by @astrojs/cloudflare v13.
 *
 * Issues fixed:
 * - Worker-only fields (main, rules, no_bundle, assets) cause Pages CI validation
 *   errors when pages_build_output_dir is present. Pages finds the worker via
 *   _worker.js in the output dir, not via "main".
 * - SESSION KV namespace is auto-added by the adapter without an "id", which fails CI validation
 * - "triggers: {}" is invalid in Pages — must be { crons: [] } or absent
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const wranglerPath = join(process.cwd(), "dist/server/wrangler.json");

if (!existsSync(wranglerPath)) {
  console.log("[patch-wrangler] dist/server/wrangler.json not found, skipping.");
  process.exit(0);
}

const config = JSON.parse(readFileSync(wranglerPath, "utf-8"));

// Fix 1: Remove Worker-only fields that Pages CI rejects when pages_build_output_dir
// is present. Pages finds the worker via _worker.js in the output dir, not "main".
delete config.main;
delete config.rules;
delete config.no_bundle;

// Fix 2: Remove "assets" block — Pages CI does not support this field and
// Pages serves static assets automatically from pages_build_output_dir.
delete config.assets;

// Fix 3: Remove SESSION KV namespace added by adapter — it has no "id" and
// this project does not use Astro sessions.
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

writeFileSync(wranglerPath, JSON.stringify(config));
console.log("[patch-wrangler] Patched dist/server/wrangler.json successfully.");
