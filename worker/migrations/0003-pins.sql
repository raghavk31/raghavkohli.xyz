-- 2026-10-09: notes pinned on the homepage (pins.js)
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
