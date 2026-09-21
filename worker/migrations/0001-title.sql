-- 2026-09-21: a title bar on each thought. For a database created before this:
--   npx wrangler d1 execute thoughts --remote --file=migrations/0001-title.sql
ALTER TABLE thoughts ADD COLUMN title TEXT;
