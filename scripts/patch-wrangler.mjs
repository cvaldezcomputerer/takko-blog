/**
 * Patches the generated dist/server/wrangler.json after astro build to fix
 * Cloudflare Pages CI validation errors caused by @astrojs/cloudflare v13.
 *
 * Issues fixed:
 * - "pages_build_output_dir" in generated file causes Pages CI to redirect to it,
 *   then fail because it also contains Worker-only fields (main, rules, assets, no_bundle).
 *   Removing it lets Pages CI use the root wrangler.jsonc instead.
 * - "ASSETS" is a reserved binding name in Pages (Pages provides it automatically)
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

// Fix 1: Remove pages_build_output_dir — this is what causes Pages CI to
// "redirect" to this file and then fail on Worker-only fields.
delete config.pages_build_output_dir;

// Fix 2: Remove "ASSETS" binding name — Pages provides it automatically.
// Keep assets.directory so Pages knows where static files are.
if (config.assets?.binding === "ASSETS") {
  delete config.assets.binding;
}

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
