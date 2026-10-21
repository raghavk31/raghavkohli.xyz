// The idea file's rules (scripts/ideas-lib.js): seeds, the key file, trimming the model's answer to
// at most 24 drawn concepts each carried by 2+ notes, and the sign-off summary.
const test = require("node:test");
const assert = require("node:assert/strict");
const lib = require("../scripts/ideas-lib.js");

const written = (id, title) => ({ id, title, body: "a written note about " + title, created: 1 });
const seed = (id, title) => ({ id, title, body: ".", created: 1 });

test("a seed is a title with no letter or digit in its body", () => {
  assert.equal(lib.isSeed({ body: "." }), true);
  assert.equal(lib.isSeed({ body: "" }), true);
  assert.equal(lib.isSeed({ body: " … \n" }), true);
  assert.equal(lib.isSeed({ body: "ok" }), false);
  assert.equal(lib.isSeed({ body: "3" }), false);
  assert.equal(lib.isSeed({ body: "मन" }), false);
});

test("the key is read from .dev.vars and nothing else is", () => {
  const vars = "OWNER_KEY=abc\nOPENROUTER_API_KEY=\"sk-or-1\"\r\n";
  assert.equal(lib.readVar(vars, "OPENROUTER_API_KEY"), "sk-or-1");
  assert.equal(lib.readVar("OWNER_KEY=abc", "OPENROUTER_API_KEY"), "");
});

test("unknown notes and concepts are dropped; seeds carry no lead", () => {
  const thoughts = [written("a", "fomo"), written("b", "desire"), seed("s", "eco-machines")];
  const out = lib.normalize({
    concepts: [{ id: "death", name: "Death", gist: "g" }, { id: "desire", name: "desire", gist: "g" }],
    links: [{ note: "a", concepts: ["death", "desire", "nope"] }, { note: "b", concepts: ["desire", "death"] },
      { note: "s", concepts: ["desire"] }, { note: "ghost", concepts: ["death"] }],
  }, thoughts, { date: "2026-10-21", model: "m" });
  assert.deepEqual(out.thoughts.find((t) => t.id === "a").concepts, ["death", "desire"]);
  assert.equal(out.concepts.find((c) => c.id === "death").name, "death");
  assert.deepEqual(out.concepts.find((c) => c.id === "desire").thoughts, ["a", "b", "s"]);
  const s = out.thoughts.find((t) => t.id === "s");
  assert.equal(s.seed, true); assert.equal(s.lead, "");
});

test("at most 24 concepts are drawn, and only those with 2+ notes", () => {
  const thoughts = Array.from({ length: 59 }, (_, i) => written("t" + i, "n" + i));
  const concepts = Array.from({ length: 30 }, (_, i) => ({ id: "c" + i, name: "c" + i, gist: "g" }));
  // t0..t55: concept c(i/2), so c0..c27 have two notes each; t56 adds a third to c0;
  // t57 and t58 alone carry c28 and c29
  const links = thoughts.map((t, i) => ({ note: t.id, concepts: i < 56 ? ["c" + Math.floor(i / 2)] : [] }));
  links[56].concepts = ["c0"]; links[57].concepts = ["c28"]; links[58].concepts = ["c29"];
  const out = lib.normalize({ concepts, links }, thoughts, {});
  assert.equal(out.concepts.find((c) => c.id === "c0").thoughts.length, 3);
  const drawn = out.concepts.filter((c) => c.drawn);
  assert.equal(drawn.length, lib.MAX_CONCEPTS);
  assert.ok(drawn.every((c) => c.thoughts.length >= lib.MIN_THOUGHTS));
  assert.equal(drawn[0].id, "c0");                       // the most-carried first
  assert.equal(out.concepts.find((c) => c.id === "c28").drawn, false);
});

test("the summary names new, dropped and renamed concepts and notes that moved", () => {
  const prev = { concepts: [{ id: "ego", name: "ego" }, { id: "fear", name: "fear" }],
    thoughts: [{ id: "a", concepts: ["ego"] }, { id: "b", concepts: ["fear"] }] };
  const next = { concepts: [{ id: "ego", name: "the ego" }, { id: "death", name: "death" }],
    thoughts: [{ id: "a", title: "A", concepts: ["ego"] }, { id: "b", title: "B", concepts: ["death"] }, { id: "c", title: "C", concepts: [] }] };
  const d = lib.diff(prev, next);
  assert.deepEqual(d.added, ["death"]);
  assert.deepEqual(d.dropped, ["fear"]);
  assert.deepEqual(d.renamed, [["ego", "the ego"]]);
  assert.deepEqual(d.moved, ["B"]);
  assert.deepEqual(d.fresh, ["C"]);
});

test("the prompt carries the old vocabulary and marks seeds", () => {
  const p = lib.prompt([written("a", "fomo"), seed("s", "eco-machines")], { concepts: [{ id: "ego", name: "ego", gist: "the self" }] });
  assert.match(p, /- ego: ego — the self/);
  assert.match(p, /<note id="s" seed="yes">/);
  assert.doesNotMatch(p, /<note id="s" seed="yes">[\s\S]*?<body>[\s\S]*?<\/note>\s*$/);
});
