-- migration: 0000_create_likes_table.sql
CREATE TABLE IF NOT EXISTS likes (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);
