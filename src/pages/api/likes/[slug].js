export const prerender = false;

import { env } from "cloudflare:workers";
import { json, isValidKey, isRateLimited, tooManyRequests } from "../../../lib/api.js";

/** @typedef {object} LikeRow @property {number | string} [count] */

/** @type {import('astro').APIRoute} */
export const GET = async ({ params }) => {
  const { slug } = params;
  if (!isValidKey(slug)) return json({ error: "Invalid slug" }, 400);
  if (!env.DB) return json({ count: 0 });

  try {
    const result = await env.DB
      .prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first();

    const count = Number((/** @type {LikeRow | null} */ (result))?.count ?? 0);
    return json({ count });
  } catch (e) {
    console.error("Error fetching likes:", e);
    return json({ error: "Could not load likes" }, 500);
  }
};

/** @type {import('astro').APIRoute} */
export const POST = async ({ params, request }) => {
  const { slug } = params;
  if (!isValidKey(slug)) return json({ error: "Invalid slug" }, 400);
  if (await isRateLimited(request)) return tooManyRequests();
  if (!env.DB) return json({ error: "Database not available" }, 503);

  try {
    const stmt = env.DB.prepare(`
      INSERT INTO likes (slug, count) VALUES (?, 1)
      ON CONFLICT(slug) DO UPDATE SET count = count + 1
      RETURNING count;
    `);

    const result = /** @type {LikeRow | null} */ (await stmt.bind(slug).first());
    return json({ count: Number(result?.count ?? 0) });
  } catch (e) {
    console.error("Error updating likes:", e);
    return json({ error: "Could not save like" }, 500);
  }
};
