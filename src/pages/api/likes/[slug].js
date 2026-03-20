export const prerender = false;

import { env } from "cloudflare:workers";

/**
 * @typedef {object} LikeRow
 * @property {number | string} [count]
 */

/** @type {import('astro').APIRoute} */
export const GET = async ({ params }) => {
  try {
    const { slug } = params;
    console.log(`GET /api/likes/${slug}`);

    if (!slug) {
      return new Response(JSON.stringify({ error: "Slug is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = env.DB;

    if (!db) {
      console.error("Database connection not available");
      // Fallback - return 0 if DB not available (prevents crash)
      return new Response(JSON.stringify({ count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch current count
    const result = await db
      .prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first();

    const count = Number((/** @type {LikeRow | null} */ (result))?.count ?? 0);
    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error fetching likes:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/** @type {import('astro').APIRoute} */
export const POST = async ({ params }) => {
  try {
    const { slug } = params;
    console.log(`POST /api/likes/${slug}`);

    if (!slug) {
      return new Response(JSON.stringify({ error: "Slug is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = env.DB;

    if (!db) {
      console.error("Database connection not available");
      return new Response(JSON.stringify({ count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert if new, otherwise increment
    const stmt = db.prepare(`
        INSERT INTO likes (slug, count) VALUES (?, 1)
        ON CONFLICT(slug) DO UPDATE SET count = count + 1
        RETURNING count;
      `);

    const result = /** @type {LikeRow | null} */ (await stmt.bind(slug).first());
    const count = Number(result?.count ?? 0);
    console.log(`Successfully updated count for ${slug}: ${count}`);

    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error updating likes:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
