/* The idea file's rules, apart from any network: what a seed is, what the model is asked, how its
   answer is checked and trimmed into src/_data/ideas.json, and what changed since the last compile.
   scripts/compile-ideas.mjs does the fetching and the model call; tests/compile.test.js covers this.
   Plan: docs/plans/2026-10-21-thoughts-graph.md. */
"use strict";

const MAX_CONCEPTS = 24;   // drawn as words; more and the graph becomes a hairball (design decision 14)
const MIN_THOUGHTS = 2;    // a concept carried by one thought stays in the file but is not drawn
const LEAD = 320;          // characters of his own text kept for the note when the API is down

// a seed is a thought named and not yet written: a title, and a body with no letter or digit (today, ".")
const isSeed = (t) => !/[\p{L}\p{N}]/u.test(String(t.body || ""));

const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// worker/.dev.vars is KEY=value lines; only the one asked for is read
function readVar(text, name) {
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, "");
  }
  return "";
}

function lead(body) {
  const s = String(body || "").replace(/\s+/g, " ").trim();
  if (s.length <= LEAD) return s;
  const cut = s.slice(0, LEAD), at = cut.lastIndexOf(" ");
  return (at > LEAD * 0.6 ? cut.slice(0, at) : cut) + "…";
}

function prompt(thoughts, prev) {
  const vocab = (prev && prev.concepts || []).map((c) => `- ${c.id}: ${c.name} — ${c.gist}`).join("\n") || "(none yet)";
  const notes = thoughts.map((t) => isSeed(t)
    ? `<note id="${t.id}" seed="yes">\n<title>${t.title || ""}</title>\n</note>`
    : `<note id="${t.id}">\n<title>${t.title || ""}</title>\n<body>\n${t.body}\n</body>\n</note>`).join("\n\n");
  return `These are the notes of one person's public journal. Find the ideas that run through them, so they can be drawn as a graph: each idea a word, each note linked to the ideas it is about.

Rules:
- At most ${MAX_CONCEPTS} ideas in all. An idea should be carried by at least ${MIN_THOUGHTS} notes; fold a narrower idea into a broader one rather than keep it for one note.
- Name each idea in 1 to 3 lowercase words, plain and specific (e.g. "ego", "desire", "future of work"). Not vague words like "life" or "self" unless nothing narrower fits.
- Reuse the existing vocabulary below wherever the idea is the same: keep its id and its name exactly, even if you would have named it differently. Add new ideas only for what it does not cover.
- Each idea gets a one-line gist (under 110 characters) saying what the idea is in these notes, written about the notes, not in the writer's voice.
- Each written note links to 2 to 5 ideas. A note marked seed="yes" is only a title: link it to 1 to 3 ideas its title clearly points to, or none if it is unclear.
- Use only the note ids given. Ids for new ideas are kebab-case of the name.

Existing vocabulary:
${vocab}

Notes:
${notes}

Answer with JSON only, no prose and no code fence:
{"concepts":[{"id":"…","name":"…","gist":"…"}],"links":[{"note":"<note id>","concepts":["<idea id>"]}]}`;
}

// the model's answer → ideas.json: unknown ids dropped, the 24 most-carried drawn, one-offs kept undrawn
function normalize(answer, thoughts, meta) {
  const byId = new Map(thoughts.map((t) => [t.id, t]));
  const concepts = new Map();
  for (const c of answer.concepts || []) {
    const id = slug(c.id || c.name);
    if (!id || concepts.has(id)) continue;
    concepts.set(id, { id, name: String(c.name || id).toLowerCase().trim().slice(0, 40), gist: String(c.gist || "").trim().slice(0, 140), thoughts: [] });
  }
  const links = new Map();
  for (const l of answer.links || []) {
    if (!byId.has(l.note)) continue;
    const ids = [...new Set((l.concepts || []).map(slug))].filter((id) => concepts.has(id)).slice(0, 5);
    links.set(l.note, ids);
  }
  for (const [note, ids] of links) for (const id of ids) concepts.get(id).thoughts.push(note);
  const ranked = [...concepts.values()].filter((c) => c.thoughts.length).sort((a, b) => b.thoughts.length - a.thoughts.length || a.id.localeCompare(b.id));
  let drawnCount = 0;
  for (const c of ranked) {
    c.drawn = c.thoughts.length >= MIN_THOUGHTS && drawnCount < MAX_CONCEPTS;
    if (c.drawn) drawnCount++;
  }
  return {
    compiled: meta && meta.date || new Date().toISOString().slice(0, 10),
    model: meta && meta.model || "",
    concepts: ranked,
    thoughts: thoughts.map((t) => ({
      id: t.id, title: t.title || "", created: t.created, seed: isSeed(t),
      lead: isSeed(t) ? "" : lead(t.body), concepts: links.get(t.id) || [],
    })),
  };
}

// what changed, for his sign-off before he commits (design decision 13)
function diff(prev, next) {
  const P = new Map((prev && prev.concepts || []).map((c) => [c.id, c]));
  const N = new Map(next.concepts.map((c) => [c.id, c]));
  const added = [...N.keys()].filter((id) => !P.has(id));
  const dropped = [...P.keys()].filter((id) => !N.has(id));
  const renamed = [...N.keys()].filter((id) => P.has(id) && P.get(id).name !== N.get(id).name).map((id) => [P.get(id).name, N.get(id).name]);
  const pt = new Map((prev && prev.thoughts || []).map((t) => [t.id, (t.concepts || []).join(",")]));
  const moved = next.thoughts.filter((t) => pt.has(t.id) && pt.get(t.id) !== t.concepts.join(",")).map((t) => t.title || t.id);
  const fresh = next.thoughts.filter((t) => !pt.has(t.id)).map((t) => t.title || t.id);
  return { added, dropped, renamed, moved, fresh };
}

module.exports = { MAX_CONCEPTS, MIN_THOUGHTS, isSeed, slug, readVar, lead, prompt, normalize, diff };
