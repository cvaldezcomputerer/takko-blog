export const prerender = false;

export const GET = async ({ params, locals }) => {
  try {
    const { slug } = params;
    console.log(`GET /api/likes/${slug}`);

    if (!slug) {
      return new Response(JSON.stringify({ error: "Slug is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Access the Cloudflare D1 database safely
    const db = locals?.runtime?.env?.DB;

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

    const count = result?.count ?? 0;
    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error fetching likes:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST = async ({ params, locals }) => {
  try {
    const { slug } = params;
    console.log(`POST /api/likes/${slug}`);

    if (!slug) {
      return new Response(JSON.stringify({ error: "Slug is missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = locals?.runtime?.env?.DB;

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

    const result = await stmt.bind(slug).first();
    const count = result?.count ?? 0;
    console.log(`Successfully updated count for ${slug}: ${count}`);

    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error updating likes:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
