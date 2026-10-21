// What the live notes change about the compiled graph (src/assets/js/graph.js merge): notes posted
// since the compile go to the (unfiled) corner, notes deleted since are hidden, and a word left with
// fewer than two notes fades. No live list (the API is down): nothing changes.
const test = require("node:test");
const assert = require("node:assert/strict");
const { merge, unfiledSpot } = require("../src/assets/js/graph.js");

const compiled = [
  { id: "a", concepts: ["ego", "desire"] },
  { id: "b", concepts: ["desire"] },
  { id: "c", concepts: ["ego"] },
  { id: "s", concepts: [] },
];

test("API down: the compiled graph stands as it is", () => {
  assert.deepEqual(merge(compiled, null), { unfiled: [], hidden: [], faint: [] });
});

test("all notes live and nothing new: nothing changes", () => {
  const m = merge(compiled, compiled.map((t) => ({ id: t.id })));
  assert.deepEqual(m, { unfiled: [], hidden: [], faint: [] });
});

test("a note deleted since the compile is hidden, and a word left with one note fades", () => {
  const m = merge(compiled, [{ id: "a" }, { id: "b" }, { id: "s" }]);
  assert.deepEqual(m.hidden, ["c"]);
  assert.deepEqual(m.faint, ["ego"]);
});

test("a note posted since the compile goes to the unfiled corner", () => {
  const m = merge(compiled, [{ id: "new", title: "fresh" }, ...compiled.map((t) => ({ id: t.id }))]);
  assert.deepEqual(m.unfiled.map((t) => t.id), ["new"]);
  assert.deepEqual(m.hidden, []);
});

test("unfiled dots stay inside their corner", () => {
  const box = { x: 0, y: 510, w: 230, h: 150 };
  for (let i = 0; i < 40; i++) {
    const p = unfiledSpot(i, box);
    assert.ok(p.x > box.x && p.x < box.x + box.w, `x ${p.x}`);
  }
  assert.ok(unfiledSpot(0, box).y < box.y + box.h);
});
