export const prerender = false;

import { env } from "cloudflare:workers";
import { json, isValidKey, isRateLimited, tooManyRequests } from "../../../lib/api.js";

/**
 * @typedef {object} QuizVoteRow
 * @property {number | string} option_index
 * @property {number | string} count
 */

// Quizzes have 2–4 options today; this is headroom, not a real limit.
const MAX_OPTION_INDEX = 20;

/** @type {import('astro').APIRoute} */
export const GET = async ({ params }) => {
  const { id } = params;
  if (!isValidKey(id)) return json({ error: "Invalid quiz ID" }, 400);
  if (!env.DB) return json({});

  try {
    const { results } = await env.DB
      .prepare("SELECT option_index, count FROM quiz_votes WHERE quiz_id = ?")
      .bind(id)
      .all();

    /** @type {Record<string, number>} */
    const votes = {};
    (/** @type {QuizVoteRow[]} */ (results ?? [])).forEach((row) => {
      votes[String(row.option_index)] = Number(row.count);
    });

    return json(votes);
  } catch (e) {
    console.error("Error fetching quiz:", e);
    return json({ error: "Could not load votes" }, 500);
  }
};

/** @type {import('astro').APIRoute} */
export const POST = async ({ params, request }) => {
  const { id } = params;
  if (!isValidKey(id)) return json({ error: "Invalid quiz ID" }, 400);

  /** @type {unknown} */
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const optionIndex = /** @type {{ optionIndex?: unknown } | null} */ (body)?.optionIndex;
  if (
    typeof optionIndex !== "number" ||
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex > MAX_OPTION_INDEX
  ) {
    return json({ error: "Invalid option" }, 400);
  }

  if (await isRateLimited(request)) return tooManyRequests();
  if (!env.DB) return json({ error: "Database not available" }, 503);

  try {
    const stmt = env.DB.prepare(`
      INSERT INTO quiz_votes (quiz_id, option_index, count) VALUES (?, ?, 1)
      ON CONFLICT(quiz_id, option_index) DO UPDATE SET count = count + 1
      RETURNING count;
    `);

    const result = /** @type {{ count?: number | string } | null} */ (await stmt.bind(id, optionIndex).first());
    return json({ success: true, newCount: Number(result?.count ?? 0) });
  } catch (e) {
    console.error("Error voting:", e);
    return json({ error: "Could not save vote" }, 500);
  }
};
