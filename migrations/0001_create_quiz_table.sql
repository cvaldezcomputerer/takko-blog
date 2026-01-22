-- migration: 0001_create_quiz_table.sql
CREATE TABLE IF NOT EXISTS quiz_votes (
  quiz_id TEXT,
  option_index INTEGER,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (quiz_id, option_index)
);