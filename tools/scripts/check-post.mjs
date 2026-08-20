// Pre-publish (and mid-draft) verification for a blog post. Answers two
// questions the new-post flow otherwise leaves to eyeballing: "what's still
// missing?" while drafting, and "is this safe to publish?" at the end.
//
//   node tools/scripts/check-post.mjs <slug>     # one post
//   node tools/scripts/check-post.mjs --all      # every post
//   node tools/scripts/check-post.mjs --all --quiet   # findings only
//
// Flags: --skip-images  don't open image files (faster; skips the
//                       unoptimized/oversized/GPS checks)
//
// Exit code is 1 if any ERROR was found, else 0. Warnings never fail the run:
// a draft is *expected* to be incomplete, so incompleteness downgrades to a
// warning while `draft: true` is still set and becomes an error once it isn't.

import fs from "node:fs";
import path from "node:path";
import { parsePost } from "../../src/lib/dev/parse-post.js";

const BLOG_DIR = path.resolve(process.cwd(), "src/content/blog");
const IMAGE_DIR = path.resolve(process.cwd(), "src/assets/images/blog");
const LANGS = ["en", "ja", "en_simple"];
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i;
const MAX_DIMENSION = 1600; // must match tools/scripts/optimize-images.mjs

const argv = process.argv.slice(2);
const opts = {
  all: argv.includes("--all"),
  quiet: argv.includes("--quiet"),
  skipImages: argv.includes("--skip-images"),
};
const slugArgs = argv.filter((a) => !a.startsWith("--"));

// sharp is a devDependency and only needed for the image checks; load it lazily
// so `--skip-images` works in an environment without it.
let sharp = null;
let exifReader = null;
if (!opts.skipImages) {
  try {
    ({ default: sharp } = await import("sharp"));
    ({ default: exifReader } = await import("exif-reader"));
  } catch {
    sharp = null;
  }
}

/**
 * True if the image still carries a GPS block.
 *
 * EXIF stores GPS behind the numeric tag 0x8825 pointing at its own IFD -- the
 * ASCII string "GPS" never appears in the buffer, so scanning bytes for it
 * silently never matches. The buffer has to be parsed.
 * @param {Buffer | undefined} exifBuffer
 */
function hasGps(exifBuffer) {
  if (!exifBuffer || !exifReader) return false;
  try {
    const gps = exifReader(exifBuffer)?.GPSInfo;
    return Boolean(gps && Object.keys(gps).length > 0);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ report */

const C = process.stdout.isTTY
  ? { red: "\x1b[31m", yellow: "\x1b[33m", blue: "\x1b[34m", dim: "\x1b[2m", bold: "\x1b[1m", off: "\x1b[0m" }
  : { red: "", yellow: "", blue: "", dim: "", bold: "", off: "" };

class Report {
  /** @param {string} slug */
  constructor(slug) {
    this.slug = slug;
    /** @type {{ level: "error"|"warn"|"info", msg: string, detail?: string[] }[]} */
    this.items = [];
  }
  error(msg, detail) { this.items.push({ level: "error", msg, detail }); }
  warn(msg, detail) { this.items.push({ level: "warn", msg, detail }); }
  info(msg, detail) { this.items.push({ level: "info", msg, detail }); }
  /** Incomplete content is only an error once the post is no longer a draft. */
  incomplete(isDraft, msg, detail) {
    if (isDraft) this.warn(msg, detail);
    else this.error(msg, detail);
  }
  get errors() { return this.items.filter((i) => i.level === "error").length; }
  get warns() { return this.items.filter((i) => i.level === "warn").length; }

  print() {
    const clean = this.items.length === 0;
    if (clean && opts.quiet) return;
    const tally = clean
      ? `${C.dim}clean${C.off}`
      : [
          this.errors ? `${C.red}${this.errors} error${this.errors > 1 ? "s" : ""}${C.off}` : "",
          this.warns ? `${C.yellow}${this.warns} warning${this.warns > 1 ? "s" : ""}${C.off}` : "",
          this.items.length - this.errors - this.warns ? `${C.blue}${this.items.length - this.errors - this.warns} note${C.off}` : "",
        ].filter(Boolean).join(", ");
    console.log(`\n${C.bold}${this.slug}${C.off}  ${tally}`);
    for (const { level, msg, detail } of this.items) {
      const mark = level === "error" ? `${C.red}✗${C.off}` : level === "warn" ? `${C.yellow}!${C.off}` : `${C.blue}i${C.off}`;
      console.log(`  ${mark} ${msg}`);
      for (const d of detail ?? []) console.log(`      ${C.dim}${d}${C.off}`);
    }
  }
}

/* ------------------------------------------------------------------ checks */

/**
 * Collect every translatable slot group in the post, tagged with a stable
 * reference id matching the dev editor's (txt-N / head-N / cap-N) so a finding
 * can be acted on directly in the editor UI.
 * @param {import("../../src/lib/dev/parse-post.js").Block[]} blocks
 */
function collectSlotGroups(blocks) {
  /** @type {{ ref: string, kind: string, slots: Record<string,string|undefined> }[]} */
  const groups = [];
  let nText = 0, nHead = 0, nImg = 0;
  for (const block of blocks) {
    if (block.type === "t") {
      groups.push({ ref: `txt-${++nText}`, kind: "text", slots: block.slots });
    } else if (block.type === "heading") {
      if (block.slots) groups.push({ ref: `head-${++nHead}`, kind: "heading", slots: block.slots });
      else nHead++;
    } else if (block.type === "figure" || block.type === "image") {
      const n = ++nImg;
      if (block.type === "figure" && block.caption) {
        groups.push({ ref: `cap-${n}`, kind: "caption", slots: block.caption });
      }
    }
  }
  return groups;
}

/** Filenames referenced anywhere in the raw MDX (frontmatter, props, markdown). */
function referencedFiles(raw) {
  const names = new Set();
  for (const m of raw.matchAll(/[A-Za-z0-9_@()[\]. -]+\.(?:jpe?g|png|webp|gif|avif|heic|heif)/gi)) {
    names.add(path.basename(m[0].trim()));
  }
  return names;
}

/** Every relative asset path the MDX points at, for existence checking. */
function referencedPaths(raw) {
  const paths = new Set();
  for (const m of raw.matchAll(/(?:\.\.\/)+assets\/images\/[^"'`)\s]+/g)) paths.add(m[0]);
  return paths;
}

// Mojibake = UTF-8 bytes decoded as single-byte, surfacing as a high-Latin lead
// char followed by a continuation char. The decoder is usually CP1252, not
// Latin-1, so bytes 0x80-0x9F come back as printable punctuation rather than
// control chars -- Japanese mangles to "\u00E3\u0192\u2020\u00E3\u201A\u00B9\u00E3\u0192\u02C6" and an apostrophe to "\u00E2\u20AC\u2122".
// Matching only \u0080-\u00BF misses both, so the continuation class covers the
// CP1252 substitutions too. Written as escapes so this source file stays pure
// ASCII and cannot itself be corrupted by a bad round-trip.
const MOJIBAKE_TAIL =
  "\\u0080-\\u00BF\\u20AC\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021\\u02C6" +
  "\\u2030\\u0160\\u2039\\u0152\\u017D\\u2018\\u2019\\u201C\\u201D\\u2022" +
  "\\u2013\\u2014\\u02DC\\u2122\\u0161\\u203A\\u0153\\u017E\\u0178";
const MOJIBAKE_RE = new RegExp(`\\uFFFD|[\\u00C2-\\u00C3\\u00E2-\\u00E3][${MOJIBAKE_TAIL}]`);
const PLACEHOLDER_RE = /\b(TODO|FIXME|TKTK|Lorem ipsum|XXX)\b/i;
// Kana + CJK ideographs. An `en` slot containing these is a Japanese proper
// noun the author deliberately left as-is (shop and dish names like "加藤パン"),
// so an identical `ja` slot is correct rather than a missed translation.
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿]/;

/**
 * Recursively list files under `dir` as paths relative to it, split into images
 * and everything else. Posts nest images in subfolders (e.g. a Gallery's
 * `lunches-for-gallery/`), so a flat readdir would misreport those as strays.
 * @param {string} dir
 * @returns {{ images: { rel: string, abs: string }[], others: string[] }}
 */
function listFiles(dir, prefix = "") {
  /** @type {{ rel: string, abs: string }[]} */
  const images = [];
  /** @type {string[]} */
  const others = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // .DS_Store, .gitkeep: handled separately
    const abs = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      const nested = listFiles(abs, rel);
      images.push(...nested.images);
      others.push(...nested.others);
    } else if (IMAGE_RE.test(entry.name)) {
      images.push({ rel, abs });
    } else {
      others.push(rel);
    }
  }
  return { images, others };
}

/**
 * Filenames the author has deliberately kept in the image folder without
 * referencing them (alternate takes, photos held for a future post). One
 * basename per line in `<image folder>/.keep-unused`; `#` starts a comment.
 * @param {string} dir
 * @returns {Set<string>}
 */
function readKeepUnused(dir) {
  const file = path.join(dir, ".keep-unused");
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs.readFileSync(file, "utf-8")
      .split("\n")
      .map((line) => line.replace(/#.*$/, "").trim())
      .filter(Boolean)
  );
}

/**
 * @param {string} slug
 * @returns {Promise<Report>}
 */
async function checkPost(slug) {
  const rep = new Report(slug);

  const file = [".mdx", ".md"].map((e) => path.join(BLOG_DIR, slug + e)).find((p) => fs.existsSync(p));
  if (!file) {
    rep.error(`No post file found for slug "${slug}"`);
    return rep;
  }

  const raw = fs.readFileSync(file, "utf-8");
  const { fields, blocks } = parsePost(raw);
  const isDraft = /^draft:\s*true\s*$/m.test(raw);
  if (isDraft) rep.info("draft: true — not published (incompleteness reported as warnings)");

  /* -- frontmatter ------------------------------------------------------- */

  for (const key of ["title", "title_ja", "title_en_simple", "description", "pubDate"]) {
    if (!fields[key]?.trim()) rep.incomplete(isDraft, `Frontmatter \`${key}\` is missing or empty`);
  }

  const hero = fields.heroImage?.trim();
  if (!hero) {
    rep.incomplete(isDraft, "Frontmatter `heroImage` is missing");
  } else {
    const heroPath = path.resolve(path.dirname(file), hero);
    if (!fs.existsSync(heroPath)) {
      rep.error("Frontmatter `heroImage` points at a file that does not exist", [hero]);
    }
  }

  // pubDate drifts because the scaffold stamps it at creation, not publish.
  const pub = fields.pubDate ? new Date(fields.pubDate.replace(/^["']|["']$/g, "")) : null;
  if (isDraft && pub && !Number.isNaN(pub.valueOf())) {
    const days = Math.floor((Date.now() - pub.valueOf()) / 86400000);
    if (days > 3) {
      rep.warn(`pubDate is ${days} days old and this is still a draft — refresh it before publishing`, [fields.pubDate]);
    }
  }

  /* -- translation slots -------------------------------------------------- */

  const groups = collectSlotGroups(blocks);
  /** @type {Record<string, string[]>} */
  const missing = { en: [], ja: [], en_simple: [] };
  const untranslated = [];
  const unsimplified = [];

  for (const { ref, kind, slots } of groups) {
    for (const lang of LANGS) {
      if (!slots[lang]?.trim()) missing[lang].push(ref);
    }
    const { en, ja, en_simple } = slots;
    // Only body prose. Headings and captions are routinely a bare shop or dish
    // name ("Cafe Daisy", "加藤パン") that is identical in every language by
    // design, so comparing those produces nothing but false positives.
    if (kind === "text" && en?.trim() && ja?.trim() && en === ja && !CJK_RE.test(en)) {
      untranslated.push(ref);
    }
    if (kind === "text" && en?.trim() && en === en_simple && en.length > 80) unsimplified.push(ref);
  }

  for (const lang of LANGS) {
    const refs = missing[lang];
    if (refs.length) {
      rep.incomplete(isDraft, `${refs.length} empty \`${lang}\` slot${refs.length > 1 ? "s" : ""}`, [refs.join(", ")]);
    }
  }
  if (untranslated.length) {
    rep.warn(`${untranslated.length} block${untranslated.length > 1 ? "s have" : " has"} an identical \`en\` and \`ja\` — untranslated?`, [untranslated.join(", ")]);
  }
  if (unsimplified.length) {
    rep.warn(`${unsimplified.length} long block${unsimplified.length > 1 ? "s have" : " has"} an identical \`en\` and \`en_simple\` — not simplified?`, [unsimplified.join(", ")]);
  }
  if (groups.length === 0) rep.incomplete(isDraft, "Post has no <T> content blocks yet");

  /* -- text hygiene ------------------------------------------------------- */

  const bad = raw.split("\n")
    .map((line, n) => ({ line, n: n + 1 }))
    .filter(({ line }) => MOJIBAKE_RE.test(line));
  if (bad.length) {
    rep.error(`${bad.length} line${bad.length > 1 ? "s contain" : " contains"} likely mojibake / replacement characters`,
      bad.slice(0, 5).map(({ line, n }) => `line ${n}: ${line.trim().slice(0, 70)}`));
  }

  const placeholders = raw.split("\n")
    .map((line, n) => ({ line, n: n + 1 }))
    .filter(({ line }) => PLACEHOLDER_RE.test(line));
  if (placeholders.length) {
    rep.incomplete(isDraft, `${placeholders.length} placeholder marker${placeholders.length > 1 ? "s" : ""} left in the text`,
      placeholders.slice(0, 5).map(({ line, n }) => `line ${n}: ${line.trim().slice(0, 70)}`));
  }

  // The review <Gallery> is meant to be deleted before publishing.
  if (/\{\s*\/\*[\s\S]{0,400}?(delete|remove)[\s\S]{0,400}?\*\/\s*\}/i.test(raw)) {
    rep.incomplete(isDraft, "A 'delete before publishing' MDX comment is still in the file (review <Gallery>?)");
  }

  /* -- images ------------------------------------------------------------- */

  const dir = path.join(IMAGE_DIR, slug);
  if (!fs.existsSync(dir)) {
    rep.warn(`No image folder at src/assets/images/blog/${slug}/`, [
      "Posts whose folder name differs from the slug are not orphan-checked.",
    ]);
  } else {
    const { images, others } = listFiles(dir);
    const referenced = referencedFiles(raw);
    const keepUnused = readKeepUnused(dir);

    const unreferenced = images.filter(({ rel }) => !referenced.has(path.basename(rel))).map(({ rel }) => rel);
    const orphans = unreferenced.filter((rel) => !keepUnused.has(path.basename(rel)));
    const kept = unreferenced.filter((rel) => keepUnused.has(path.basename(rel)));

    if (orphans.length) {
      rep.incomplete(isDraft, `${orphans.length} image${orphans.length > 1 ? "s are" : " is"} in the folder but never referenced`, [
        ...orphans,
        "Delete them, or list them in .keep-unused to keep them on purpose.",
      ]);
    }
    if (kept.length) {
      rep.info(`${kept.length} unreferenced image${kept.length > 1 ? "s" : ""} kept on purpose (.keep-unused)`, kept);
    }
    // A stale allowlist entry silently weakens the check, so surface it.
    const staleKeeps = [...keepUnused].filter((name) => !images.some(({ rel }) => path.basename(rel) === name));
    if (staleKeeps.length) {
      rep.warn(`.keep-unused lists ${staleKeeps.length} file${staleKeeps.length > 1 ? "s" : ""} that no longer exist`, staleKeeps);
    }

    if (others.length) rep.warn(`${others.length} non-image file${others.length > 1 ? "s" : ""} in the image folder`, others);

    // The scaffold writes .gitkeep; it is dead weight once real images land.
    if (images.length > 0 && fs.existsSync(path.join(dir, ".gitkeep"))) {
      rep.warn("Stale `.gitkeep` — the folder has images now, so it can be deleted");
    }

    const heic = images.filter(({ rel }) => /\.hei[cf]$/i.test(rel)).map(({ rel }) => rel);
    if (heic.length) {
      rep.error(`${heic.length} HEIC file${heic.length > 1 ? "s" : ""} — Astro cannot process these; convert with optimize-images.mjs`, heic);
    }

    if (sharp) {
      const oversized = [];
      const withGps = [];
      for (const { rel, abs } of images) {
        if (/\.hei[cf]$/i.test(rel)) continue;
        try {
          const meta = await sharp(abs).metadata();
          if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
            oversized.push(`${rel} (${meta.width}×${meta.height})`);
          }
          if (hasGps(meta.exif)) withGps.push(rel);
        } catch (err) {
          rep.warn(`Could not read image ${rel}`, [err instanceof Error ? err.message : String(err)]);
        }
      }
      if (oversized.length) {
        rep.warn(`${oversized.length} image${oversized.length > 1 ? "s exceed" : " exceeds"} ${MAX_DIMENSION}px — run optimize-images.mjs`, oversized);
      }
      if (withGps.length) {
        rep.error(`${withGps.length} image${withGps.length > 1 ? "s still carry" : " still carries"} GPS EXIF — run optimize-images.mjs`, withGps);
      }
    }
  }

  // Referenced-but-absent paths break the build, so they are always errors.
  const brokenPaths = [...referencedPaths(raw)].filter(
    (rel) => !fs.existsSync(path.resolve(path.dirname(file), rel))
  );
  if (brokenPaths.length) {
    rep.error(`${brokenPaths.length} referenced image path${brokenPaths.length > 1 ? "s do" : " does"} not exist on disk`, brokenPaths);
  }

  return rep;
}

/* -------------------------------------------------------------------- main */

const slugs = opts.all
  ? fs.readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/.test(f)).map((f) => f.replace(/\.mdx?$/, "")).sort()
  : slugArgs;

if (slugs.length === 0) {
  console.error("Usage: node tools/scripts/check-post.mjs <slug> [...] | --all");
  console.error("       --quiet        only print posts with findings");
  console.error("       --skip-images  skip the size/GPS checks (no sharp needed)");
  process.exit(1);
}

if (!opts.skipImages && !sharp) {
  console.log(`${C.dim}(sharp unavailable — skipping image size/GPS checks)${C.off}`);
}

let errors = 0;
let warns = 0;
for (const slug of slugs) {
  const rep = await checkPost(slug);
  rep.print();
  errors += rep.errors;
  warns += rep.warns;
}

const summary = errors
  ? `${C.red}${errors} error${errors > 1 ? "s" : ""}${C.off}`
  : `${C.dim}no errors${C.off}`;
console.log(`\n${slugs.length} post${slugs.length > 1 ? "s" : ""} checked — ${summary}, ${warns} warning${warns === 1 ? "" : "s"}.`);
process.exit(errors > 0 ? 1 : 0);
