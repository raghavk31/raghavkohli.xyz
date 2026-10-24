-- 2026-10-25: what the public AI routes have spent (budget.js). k is <route>:ip:<hashed ip>:<hour> or
-- <route>:day:<yyyy-mm-dd>; day is the UTC day the row belongs to, so old rows can be swept.
CREATE TABLE IF NOT EXISTS ai_usage (
  k    TEXT PRIMARY KEY,
  day  TEXT NOT NULL,
  n    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_usage_day ON ai_usage (day);
