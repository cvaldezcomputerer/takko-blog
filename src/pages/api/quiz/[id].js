export const prerender = false;

import { env } from "cloudflare:workers";

/**
 * @typedef {object} QuizVoteRow
 * @property {number | string} option_index
 * @property {number | string} count
 */

/**
 * @typedef {object} QuizVoteBody
 * @property {number} optionIndex
 */

const JSON_HEADERS = { "Content-Type": "application/json" };
const json = (/** @type {unknown} */ data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
const errMsg = (/** @type {unknown} */ e) =>
  e instanceof Error ? e.message : "Unknown error";

/** @type {import('astro').APIRoute} */
export const GET = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) return json({ error: "Quiz ID is missing" }, 400);

    const db = env.DB;
    if (!db) return json({});

    const { results } = await db
      .prepare("SELECT option_index, count FROM quiz_votes WHERE quiz_id = ?")
      .bind(id)
      .all();

    /** @type {Record<string, number>} */
    const votes = {};
    if (results) {
      (/** @type {QuizVoteRow[]} */ (results)).forEach((row) => {
        votes[String(row.option_index)] = Number(row.count);
      });
    }

    return json(votes);
  } catch (e) {
    console.error("Error fetching quiz:", e);
    return json({ error: errMsg(e) }, 500);
  }
};

/** @type {import('astro').APIRoute} */
export const POST = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = /** @type {QuizVoteBody} */ (await request.json());
    const { optionIndex } = body;

    if (!id || typeof optionIndex !== "number" || !Number.isInteger(optionIndex) || optionIndex < 0) {
      return json({ error: "Missing data" }, 400);
    }

    const db = env.DB;
    if (!db) return json({ success: false, error: "No DB" }, 500);

    const stmt = db.prepare(`
      INSERT INTO quiz_votes (quiz_id, option_index, count) VALUES (?, ?, 1)
      ON CONFLICT(quiz_id, option_index) DO UPDATE SET count = count + 1
      RETURNING count;
    `);

    const result = /** @type {{ count?: number | string } | null} */ (await stmt.bind(id, optionIndex).first());

    return json({ success: true, newCount: Number(result?.count ?? 0) });
  } catch (e) {
    console.error("Error voting:", e);
    return json({ error: errMsg(e) }, 500);
  }
};
