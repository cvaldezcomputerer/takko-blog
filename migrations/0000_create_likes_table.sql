-- migration: 0000_create_likes_table.sql
CREATE TABLE likes (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);
