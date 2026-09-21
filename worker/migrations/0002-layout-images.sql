-- 2026-09-22: notes can be moved, scaled and carry images. For a database created before this:
--   npx wrangler d1 execute thoughts --remote --file=migrations/0002-layout-images.sql
-- the image ids a thought carries, as a JSON array
ALTER TABLE thoughts ADD COLUMN images TEXT;
-- where a note sits on the board (a live id or a markdown slug); a note with no row flows by itself
CREATE TABLE IF NOT EXISTS layout (
  id       TEXT PRIMARY KEY,
  x        REAL NOT NULL,
  y        REAL NOT NULL,
  w        REAL NOT NULL,
  z        INTEGER NOT NULL DEFAULT 0,
  updated  INTEGER NOT NULL
);
-- the images themselves, downscaled in the browser before upload
CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  thought_id  TEXT,
  mime        TEXT NOT NULL,
  bytes       BLOB NOT NULL,
  created     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS images_thought ON images (thought_id);
