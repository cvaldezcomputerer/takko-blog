export const prerender = false;

import { env } from "cloudflare:workers";

/** @typedef {object} LikeRow @property {number | string} [count] */

const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (/** @type {unknown} */ data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
const errMsg = (/** @type {unknown} */ e) =>
  e instanceof Error ? e.message : "Unknown error";

function getSetup(/** @type {string | undefined} */ slug) {
  if (!slug) return { res: json({ error: "Slug is missing" }, 400) };
  const db = env.DB;
  if (!db) {
    console.error("Database connection not available");
    return { res: json({ count: 0 }) };
  }
  return { db };
}

/** @type {import('astro').APIRoute} */
export const GET = async ({ params }) => {
  try {
    const { slug } = params;
    console.log(`GET /api/likes/${slug}`);
    const setup = getSetup(slug);
    if (setup.res) return setup.res;
    const { db } = setup;

    const result = await db
      .prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first();

    const count = Number((/** @type {LikeRow | null} */ (result))?.count ?? 0);
    return json({ count });
  } catch (e) {
    console.error("Error fetching likes:", e);
    return json({ error: errMsg(e) }, 500);
  }
};

/** @type {import('astro').APIRoute} */
export const POST = async ({ params }) => {
  try {
    const { slug } = params;
    console.log(`POST /api/likes/${slug}`);
    const setup = getSetup(slug);
    if (setup.res) return setup.res;
    const { db } = setup;

    const stmt = db.prepare(`
      INSERT INTO likes (slug, count) VALUES (?, 1)
      ON CONFLICT(slug) DO UPDATE SET count = count + 1
      RETURNING count;
    `);

    const result = /** @type {LikeRow | null} */ (await stmt.bind(slug).first());
    const count = Number(result?.count ?? 0);
    console.log(`Successfully updated count for ${slug}: ${count}`);
    return json({ count });
  } catch (e) {
    console.error("Error updating likes:", e);
    return json({ error: errMsg(e) }, 500);
  }
};
