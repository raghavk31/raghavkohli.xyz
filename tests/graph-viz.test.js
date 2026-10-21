// The build-time layout (scripts/graph-layout.js): the same ideas.json always gives the same picture,
// every node sits inside the drawing, and the note's corner and the (unfiled) corner stay empty.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { layout, W, H, NOTE, UNFILED } = require("../src/assets/js/graph-layout.js");

function fixture(nc = 14, nt = 31) {
  const concepts = Array.from({ length: nc }, (_, i) => ({ id: "c" + i, name: "concept " + i, gist: "g", thoughts: [], drawn: true }));
  const thoughts = Array.from({ length: nt }, (_, i) => {
    const cs = i % 5 === 4 ? [] : ["c" + (i % nc), "c" + ((i * 3) % nc)].filter((v, k, a) => a.indexOf(v) === k);
    cs.forEach((id) => concepts.find((c) => c.id === id).thoughts.push("t" + i));
    return { id: "t" + i, title: "note " + i, seed: i % 2 === 0, lead: "", created: i, concepts: cs };
  });
  return { compiled: "2026-10-21", concepts, thoughts };
}

const real = path.join(__dirname, "..", "src", "_data", "ideas.json");
const cases = [["fixture", fixture()], ["a big one", fixture(24, 300)]];
if (fs.existsSync(real)) cases.unshift(["ideas.json", JSON.parse(fs.readFileSync(real, "utf8"))]);

for (const [name, ideas] of cases) {
  test(`${name}: same input, same coordinates`, () => {
    assert.deepEqual(layout(ideas), layout(JSON.parse(JSON.stringify(ideas))));
  });

  test(`${name}: every node inside the drawing, both corners clear`, () => {
    const g = layout(ideas);
    for (const n of [...g.concepts, ...g.thoughts]) {
      assert.ok(n.x >= 0 && n.x <= W && n.y >= 0 && n.y <= H, `${n.id} at ${n.x},${n.y}`);
      for (const r of [NOTE, UNFILED]) {
        const inR = n.x > r.x && n.x < r.x + r.w && n.y > r.y && n.y < r.y + r.h;
        assert.ok(!inR, `${n.id} at ${n.x},${n.y} sits in a reserved corner`);
      }
    }
  });
}

test("no ideas.json yet: not ready", () => {
  assert.deepEqual(layout(null), { ready: false });
});
