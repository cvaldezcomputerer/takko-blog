export const GET = async (context) => {
  // Access the Cloudflare D1 database
  const db = context.locals?.runtime?.env?.DB;
  const { slug } = context.params;

  if (!slug) {
    return new Response("Bad Request", { status: 400 });
  }

  if (!db) {
    // Fallback for development/local - return 0 if DB not available
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

  const count = result ? result.count : 0;

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST = async (context) => {
  const db = context.locals?.runtime?.env?.DB;
  const { slug } = context.params;

  if (!slug) {
    return new Response("Bad Request", { status: 400 });
  }

  if (!db) {
    // Fallback for development/local
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

  return new Response(JSON.stringify({ count: result.count }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
