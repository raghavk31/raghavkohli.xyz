CREATE TABLE IF NOT EXISTS thoughts (
  id       TEXT PRIMARY KEY,
  title    TEXT,
  body     TEXT NOT NULL,
  name     TEXT,
  owner    INTEGER NOT NULL DEFAULT 0,
  ip_hash  TEXT NOT NULL,
  created  INTEGER NOT NULL,
  images   TEXT
);
CREATE INDEX IF NOT EXISTS thoughts_created ON thoughts (created DESC);
CREATE INDEX IF NOT EXISTS thoughts_ip ON thoughts (ip_hash, created);
-- where a note sits on the board (a live id or a markdown slug); a note with no row flows by itself
CREATE TABLE IF NOT EXISTS layout (
  id       TEXT PRIMARY KEY,
  x        REAL NOT NULL,
  y        REAL NOT NULL,
  w        REAL NOT NULL,
  z        INTEGER NOT NULL DEFAULT 0,
  updated  INTEGER NOT NULL
);
-- the images notes carry, downscaled in the browser before upload
CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  thought_id  TEXT,
  mime        TEXT NOT NULL,
  bytes       BLOB NOT NULL,
  created     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS images_thought ON images (thought_id);
-- notes pinned on the homepage's empty spaces (pins.js): text and/or images, placed by the owner.
-- anchor names the page section the note hangs from; x is from the page's centre line, y from the anchor's top
CREATE TABLE IF NOT EXISTS pins (
  id       TEXT PRIMARY KEY,
  body     TEXT,
  images   TEXT,
  anchor   TEXT NOT NULL,
  x        REAL NOT NULL,
  y        REAL NOT NULL,
  w        REAL NOT NULL,
  z        INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL,
  updated  INTEGER NOT NULL
);
