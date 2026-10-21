/* Where every word and dot of the (thoughts) graph sits, worked out once at build time
   (src/_data/graphViz.js) so the graph appears in place and never settles in front of anyone.
   A small force layout with no randomness: the start positions come from a seeded generator, so
   the same ideas.json always gives the same picture. Concepts (the drawn words) and thoughts (dots)
   pull along their links and push each other apart; two corners are kept empty, the top right for
   the note that opens on a click and the bottom left for (unfiled) notes posted since the compile.
   The same step() moves the graph in the browser when a node is dragged (graph.js), so the build and
   the page share one set of forces. Loaded both by Node (src/_data/graphViz.js, tests) and the page.
   Plan: docs/plans/2026-10-21-thoughts-graph.md §4, §6. */
(function (root) {
"use strict";

const W = 1155, H = 660;                                  // the page edge (--maxw) by a 78vh-ish height
const PAD = 28;
const NOTE = { x: W - 330, y: 0, w: 330, h: 350 };        // the post-it panel's corner
const UNFILED = { x: 0, y: H - 150, w: 230, h: 150 };     // the (unfiled) corner
const MIN_PX = 14, MAX_PX = 28;                           // concept type, by how many notes carry it

function rng(seed) {                                      // mulberry32
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inside = (p, r, m = 0) => p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m;

// push a point out of a rectangle through its nearest open side
function outOf(p, r, m) {
  if (!inside(p, r, m)) return;
  const left = p.x - (r.x - m), right = r.x + r.w + m - p.x, top = p.y - (r.y - m), bottom = r.y + r.h + m - p.y;
  const least = Math.min(r.x > 0 ? left : Infinity, r.x + r.w < W ? right : Infinity, r.y > 0 ? top : Infinity, r.y + r.h < H ? bottom : Infinity);
  if (least === left) p.x = r.x - m; else if (least === right) p.x = r.x + r.w + m;
  else if (least === top) p.y = r.y - m; else p.y = r.y + r.h + m;
}

// one tick of the forces: words and dots push apart and keep clear of each other, links pull, a
// gentle pull to the middle, and both corners stay empty. `held` (a dragged node) stays where it is.
const CX = (W - NOTE.w * 0.5) / 2, CY = H / 2;
function step(nodes, edges, heat, held) {
  const cx = CX, cy = CY;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x, dy = a.y - b.y;
      if (!dx && !dy) { dx = 0.1 * (i - j); dy = 0.1; }
      const d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      const k = (a.kind === "concept" && b.kind === "concept" ? 9000 : a.kind === "concept" || b.kind === "concept" ? 2200 : 900) / d2;
      a.vx += dx / d * k; a.vy += dy / d * k; b.vx -= dx / d * k; b.vy -= dy / d * k;
      // words keep clear of each other and of dots along their width
      const minX = a.half + b.half, minY = (a.kind === "concept" ? a.px : 8) / 2 + (b.kind === "concept" ? b.px : 8) / 2 + 10;
      if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
        const px = (minX - Math.abs(dx)) / 2, py = (minY - Math.abs(dy)) / 2;
        if (px < py) { const sx = dx < 0 ? -1 : 1; a.x += sx * px; b.x -= sx * px; }
        else { const sy = dy < 0 ? -1 : 1; a.y += sy * py; b.y -= sy * py; }
      }
    }
  }
  for (const [t, c] of edges) {
    const dx = c.x - t.x, dy = c.y - t.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - 95) * 0.02;
    t.vx += dx / d * f; t.vy += dy / d * f; c.vx -= dx / d * f * 0.4; c.vy -= dy / d * f * 0.4;
  }
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.0007; n.vy += (cy - n.y) * 0.0011;
    n.x += Math.max(-24, Math.min(24, n.vx)) * heat; n.y += Math.max(-24, Math.min(24, n.vy)) * heat;
    n.vx *= 0.55; n.vy *= 0.55;
    n.x = Math.max(PAD + n.half, Math.min(W - PAD - n.half, n.x));
    n.y = Math.max(PAD, Math.min(H - PAD, n.y));
    outOf(n, { x: NOTE.x - n.half, y: NOTE.y, w: NOTE.w + n.half, h: NOTE.h }, 6);
    outOf(n, { x: UNFILED.x, y: UNFILED.y, w: UNFILED.w + n.half, h: UNFILED.h }, 6);
  }
  if (held) { held.x = held.hx; held.y = held.hy; held.vx = 0; held.vy = 0; }
}

function layout(ideas) {
  if (!ideas || !Array.isArray(ideas.concepts) || !Array.isArray(ideas.thoughts)) return { ready: false };
  const drawn = ideas.concepts.filter((c) => c.drawn);
  const most = Math.max(1, ...drawn.map((c) => c.thoughts.length));
  const rand = rng(20261021);

  const nodes = [];
  const byId = new Map();
  for (const c of drawn) {
    const px = MIN_PX + (MAX_PX - MIN_PX) * Math.sqrt((c.thoughts.length - 1) / Math.max(1, most - 1));
    const n = { kind: "concept", id: c.id, name: c.name, gist: c.gist, n: c.thoughts.length, px: Math.round(px * 10) / 10,
      half: c.name.length * px * 0.29 + 6, x: 0, y: 0, vx: 0, vy: 0 };
    nodes.push(n); byId.set("c:" + c.id, n);
  }
  const drawnIds = new Set(drawn.map((c) => c.id));
  for (const t of ideas.thoughts) {
    const links = (t.concepts || []).filter((id) => drawnIds.has(id));
    const n = { kind: "thought", id: t.id, title: t.title, seed: !!t.seed, lead: t.lead || "", created: t.created,
      concepts: links, half: 6, x: 0, y: 0, vx: 0, vy: 0 };
    nodes.push(n); byId.set("t:" + t.id, n);
  }
  const edges = [];
  for (const n of nodes) if (n.kind === "thought") for (const id of n.concepts) edges.push([n, byId.get("c:" + id)]);

  // start: concepts on an ellipse in order of weight, thoughts near the middle of their concepts,
  // loose thoughts scattered round the edge
  const cx = CX, cy = CY;
  drawn.forEach((c, i) => {
    const n = byId.get("c:" + c.id), a = (i / Math.max(1, drawn.length)) * Math.PI * 2 + 0.4;
    n.x = cx + Math.cos(a) * W * 0.28; n.y = cy + Math.sin(a) * H * 0.3;
  });
  for (const n of nodes) {
    if (n.kind !== "thought") continue;
    const cs = n.concepts.map((id) => byId.get("c:" + id));
    if (cs.length) {
      n.x = cs.reduce((s, c) => s + c.x, 0) / cs.length + (rand() - 0.5) * 60;
      n.y = cs.reduce((s, c) => s + c.y, 0) / cs.length + (rand() - 0.5) * 60;
    } else {
      const a = rand() * Math.PI * 2;
      n.x = cx + Math.cos(a) * W * 0.42; n.y = cy + Math.sin(a) * H * 0.42;
    }
  }

  // settle
  const STEPS = 420;
  for (let s = 0; s < STEPS; s++) step(nodes, edges, 1 - s / STEPS);

  const r1 = (v) => Math.round(v * 10) / 10;
  const out = (n) => n.kind === "concept"
    ? { id: n.id, name: n.name, gist: n.gist, n: n.n, px: n.px, x: r1(n.x), y: r1(n.y) }
    : { id: n.id, title: n.title, seed: n.seed, lead: n.lead, created: n.created, concepts: n.concepts, x: r1(n.x), y: r1(n.y) };
  return {
    ready: true, w: W, h: H, note: NOTE, unfiled: UNFILED, compiled: ideas.compiled,
    concepts: nodes.filter((n) => n.kind === "concept").map(out),
    thoughts: nodes.filter((n) => n.kind === "thought").map(out),
    edges: edges.map(([t, c]) => ({ t: t.id, c: c.id, x1: r1(t.x), y1: r1(t.y), x2: r1(c.x), y2: r1(c.y) })),
    // the drawn concepts as a list, each with its notes, for phones and screen readers
    index: ideas.concepts.filter((c) => c.drawn).map((c) => ({ id: c.id, name: c.name, gist: c.gist,
      thoughts: c.thoughts.map((id) => byId.get("t:" + id)).filter(Boolean).map((t) => ({ id: t.id, title: t.title, seed: t.seed })) })),
  };
}

const api = { layout, step, half: (name, px) => name.length * px * 0.29 + 6, W, H, NOTE, UNFILED };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.GraphLayout = api;
})(typeof window !== "undefined" ? window : globalThis);
