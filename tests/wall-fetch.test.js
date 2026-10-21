// The board and the compile read thoughts through one paging loop (src/assets/js/thoughts-fetch.js).
// A stubbed worker that behaves like GET /thoughts: newest first, at most 100, ?before= for older.
const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchAllThoughts, PAGE } = require("../src/assets/js/thoughts-fetch.js");

function worker(n, layout = { a: { x: 1, y: 2, w: 3, z: 1 } }) {
  // n thoughts, created 1..n ms; newest first like the D1 query
  const rows = Array.from({ length: n }, (_, i) => ({ id: "t" + (n - i), created: n - i }));
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    const u = new URL(url);
    const before = Number(u.searchParams.get("before")) || Infinity;
    const limit = Math.min(Number(u.searchParams.get("limit")) || 50, 100);
    const page = rows.filter((r) => r.created < before).slice(0, limit);
    return { ok: true, json: async () => ({ thoughts: page, layout }) };
  };
  return { fetchFn, calls };
}

test("one short page: every note, one request", async () => {
  const w = worker(31);
  const j = await fetchAllThoughts("https://api.test", w.fetchFn);
  assert.equal(j.thoughts.length, 31);
  assert.equal(w.calls.length, 1);
  assert.deepEqual(j.layout, { a: { x: 1, y: 2, w: 3, z: 1 } });
});

test("past a hundred: follows ?before= across pages, no note twice", async () => {
  const w = worker(250);
  const j = await fetchAllThoughts("https://api.test", w.fetchFn);
  assert.equal(j.thoughts.length, 250);
  assert.equal(new Set(j.thoughts.map((t) => t.id)).size, 250);
  assert.equal(w.calls.length, 3);
  assert.match(w.calls[1], /before=151/);
  // newest first, as the board places them
  assert.equal(j.thoughts[0].id, "t250");
  assert.equal(j.thoughts[249].id, "t1");
});

test("exactly a page: asks once more and stops on the empty page", async () => {
  const w = worker(PAGE);
  const j = await fetchAllThoughts("https://api.test", w.fetchFn);
  assert.equal(j.thoughts.length, PAGE);
  assert.equal(w.calls.length, 2);
});

test("a failing page rejects instead of returning a partial list", async () => {
  const fetchFn = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(fetchAllThoughts("https://api.test", fetchFn), /thoughts 500/);
});
