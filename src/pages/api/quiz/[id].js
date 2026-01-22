export const GET = async ({ params, locals }) => {
    try {
      const { id } = params;
  
      if (!id) {
        return new Response(JSON.stringify({ error: "Quiz ID is missing" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
  
      const db = locals?.runtime?.env?.DB;
  
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
      const votes = {};
      if (results) {
        results.forEach((row) => {
          votes[row.option_index] = row.count;
        });
      }
  
      return new Response(JSON.stringify(votes), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=43200" // Cache for 12 hours
        },
      });
    } catch (e) {
      console.error("Error fetching quiz:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
  
  export const POST = async ({ params, request, locals }) => {
    try {
      const { id } = params;
      const body = await request.json();
      const { optionIndex } = body;
  
      if (!id || optionIndex === undefined) {
        return new Response(JSON.stringify({ error: "Missing data" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
  
      const db = locals?.runtime?.env?.DB;
      if (!db) {
        return new Response(JSON.stringify({ success: false, error: "No DB" }), { status: 500 });
      }
  
      // UPSERT: Insert 1 if it doesn't exist, otherwise add 1 to existing count
      const stmt = db.prepare(`
        INSERT INTO quiz_votes (quiz_id, option_index, count) VALUES (?, ?, 1)
        ON CONFLICT(quiz_id, option_index) DO UPDATE SET count = count + 1
        RETURNING count;
      `);
  
      const result = await stmt.bind(id, optionIndex).first();
  
      return new Response(JSON.stringify({ success: true, newCount: result.count }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Error voting:", e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };