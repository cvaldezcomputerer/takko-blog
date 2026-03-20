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

/** @type {import('astro').APIRoute} */
export const GET = async ({ params }) => {
    try {
      const { id } = params;

      if (!id) {
        return new Response(JSON.stringify({ error: "Quiz ID is missing" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const db = env.DB;
  
      if (!db) {
        // Return empty object if DB is missing (dev mode fallback)
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
  
      // Fetch all options for this quiz
      const { results } = await db
        .prepare("SELECT option_index, count FROM quiz_votes WHERE quiz_id = ?")
        .bind(id)
        .all();
  
      // Transform array [{option_index: 0, count: 5}, ...] into object { 0: 5, ... }
      /** @type {Record<string, number>} */
      const votes = {};
      if (results) {
        (/** @type {QuizVoteRow[]} */ (results)).forEach((row) => {
          votes[String(row.option_index)] = Number(row.count);
        });
      }
  
      return new Response(JSON.stringify(votes), {
        status: 200,
        headers: { 
          "Content-Type": "application/json"
        },
      });
    } catch (e) {
      console.error("Error fetching quiz:", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
  
  /** @type {import('astro').APIRoute} */
  export const POST = async ({ params, request }) => {
    try {
      const { id } = params;
      const body = /** @type {QuizVoteBody} */ (await request.json());
      const { optionIndex } = body;

      if (!id || typeof optionIndex !== "number" || !Number.isInteger(optionIndex) || optionIndex < 0) {
        return new Response(JSON.stringify({ error: "Missing data" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const db = env.DB;
      if (!db) {
        return new Response(JSON.stringify({ success: false, error: "No DB" }), { status: 500 });
      }
  
      // UPSERT: Insert 1 if it doesn't exist, otherwise add 1 to existing count
      const stmt = db.prepare(`
        INSERT INTO quiz_votes (quiz_id, option_index, count) VALUES (?, ?, 1)
        ON CONFLICT(quiz_id, option_index) DO UPDATE SET count = count + 1
        RETURNING count;
      `);
  
      const result = /** @type {{ count?: number | string } | null} */ (await stmt.bind(id, optionIndex).first());
  
      return new Response(JSON.stringify({ success: true, newCount: Number(result?.count ?? 0) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Error voting:", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
