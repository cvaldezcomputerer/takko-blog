export const GET = async (context) => {
  console.log("GET /api/likes/:slug");
  console.log("Context:", JSON.stringify(context, null, 2));
  // Access the Cloudflare D1 database
  const db = context.locals?.runtime?.env?.DB;
  console.log("DB object:", db ? "Exists" : "Does NOT exist");
  const { slug } = context.params;

  if (!slug) {
    console.error("Slug is missing");
    return new Response("Bad Request", { status: 400 });
  }

  if (!db) {
    console.error("Database connection not available");
    // Fallback for development/local - return 0 if DB not available
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Fetch current count
    const result = await db
      .prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first();

    const count = result ? result.count : 0;
    console.log(`Successfully fetched count for ${slug}: ${count}`);
    return new Response(JSON.stringify({ count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error fetching likes:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
};

export const POST = async (context) => {
  console.log("POST /api/likes/:slug");
  console.log("Context:", JSON.stringify(context, null, 2));
  const db = context.locals?.runtime?.env?.DB;
  console.log("DB object:", db ? "Exists" : "Does NOT exist");
  const { slug } = context.params;

  if (!slug) {
    console.error("Slug is missing");
    return new Response("Bad Request", { status: 400 });
  }

  if (!db) {
    console.error("Database connection not available");
    // Fallback for development/local
    return new Response(JSON.stringify({ count: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Insert if new, otherwise increment
    const stmt = db.prepare(`
        INSERT INTO likes (slug, count) VALUES (?, 1)
        ON CONFLICT(slug) DO UPDATE SET count = count + 1
        RETURNING count;
      `);

    const result = await stmt.bind(slug).first();
    console.log(`Successfully updated count for ${slug}: ${result.count}`);

    return new Response(JSON.stringify({ count: result.count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error updating likes:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
};
