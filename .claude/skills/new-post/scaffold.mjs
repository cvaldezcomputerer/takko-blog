// Scaffolds a new blog post for the new-post skill: writes the MDX with valid
// frontmatter + the <T> skeleton (en + en_simple; Japanese added last) and
// creates the post's image folder. Starts as draft: true, so it is excluded
// from routes/RSS/index until you remove that flag, but the dev editor still
// shows it (it reads raw files).
//
//   node .claude/skills/new-post/scaffold.mjs <kebab-slug> [Title words...]

import fs from "node:fs";
import path from "node:path";

const slug = process.argv[2];
const titleArg = process.argv.slice(3).join(" ").trim();

if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: node .claude/skills/new-post/scaffold.mjs <kebab-slug> [Title]");
  console.error("Slug must be lowercase letters, numbers, and hyphens (e.g. chili-tacos).");
  process.exit(1);
}

const root = process.cwd();
const postPath = path.join(root, "src/content/blog", `${slug}.mdx`);
const imageDir = path.join(root, "src/assets/images/blog", slug);

if (fs.existsSync(postPath)) {
  console.error(`Refusing to overwrite existing post: ${path.relative(root, postPath)}`);
  process.exit(1);
}

const title = titleArg || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const d = new Date();
const pubDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// heroImage is intentionally omitted: the content schema validates image()
// paths at sync time, so a path to a not-yet-existing file would break the dev
// server. Add heroImage once the image exists.
const mdx = `---
title: "${title.replace(/"/g, '\\"')}"
title_ja: ""
title_en_simple: ""
description: ""
pubDate: "${pubDate}"
draft: true
---

import T from "../../components/i18n/T.astro";

<T>
  <span slot="en">

  </span>
  <span slot="en_simple">

  </span>
</T>
`;

fs.mkdirSync(imageDir, { recursive: true });
const keep = path.join(imageDir, ".gitkeep");
if (!fs.existsSync(keep)) fs.writeFileSync(keep, "");
fs.writeFileSync(postPath, mdx, "utf-8");

console.log(`Created  ${path.relative(root, postPath).replace(/\\/g, "/")}`);
console.log(`Created  ${path.relative(root, imageDir).replace(/\\/g, "/")}/`);
console.log("");
console.log("Next steps:");
console.log("  1. Start the dev server:  npm run dev");
console.log(`  2. Write English + Simple English in the editor:`);
console.log(`       http://localhost:4321/dev/editor/${slug}   (port may differ; check dev output)`);
console.log(`  3. Drop photos into src/assets/images/blog/${slug}/ then optimize:`);
console.log(`       node tools/scripts/optimize-images.mjs src/assets/images/blog/${slug}/`);
console.log("  4. Add heroImage + title_ja + title_en_simple + description to frontmatter.");
console.log("  5. Generate the Japanese (ja) slots last. Remove `draft: true` to publish.");
