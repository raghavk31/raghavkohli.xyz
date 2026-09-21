CREATE TABLE IF NOT EXISTS thoughts (
  id       TEXT PRIMARY KEY,
  title    TEXT,
  body     TEXT NOT NULL,
  name     TEXT,
  owner    INTEGER NOT NULL DEFAULT 0,
  ip_hash  TEXT NOT NULL,
  created  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS thoughts_created ON thoughts (created DESC);
CREATE INDEX IF NOT EXISTS thoughts_ip ON thoughts (ip_hash, created);
