// Everything the Perspectives page draws, derived at build time from perspectives.json: the
// co-attendance network (one panel per city), the reproduction metric, and the topic graph.
// Nothing here is hand-placed. The layouts are a small seeded force simulation, so the same
// rows always give the same picture and the page needs no script to show it. With no rows the
// result is { empty: true } and the page prints that, instead of drawing anything.
const data = require("./perspectives.json");

const rows = (data.rows || []).filter((r) => r && r.circle_id && r.participant_id);
const anchorMin = (data.config && data.config.anchor_min) || 3;

// mulberry32: a seeded random, so a rebuild does not reshuffle the drawing
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fruchterman-Reingold in a w x h box. `pull(i)` is an optional target per node (a cluster centre).
function layout(nodes, edges, w, h, opts = {}) {
  const n = nodes.length;
  if (!n) return;
  const rand = rng(opts.seed || 7);
  const k = opts.k || Math.sqrt((w * h) / n) * 0.75;
  for (const p of nodes) {
    p.x = w / 2 + (rand() - 0.5) * w * 0.6;
    p.y = h / 2 + (rand() - 0.5) * h * 0.6;
  }
  const iters = opts.iters || 400;
  let t = w / 8;
  for (let it = 0; it < iters; it++) {
    const dx = new Float64Array(n), dy = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let x = nodes[i].x - nodes[j].x, y = nodes[i].y - nodes[j].y;
        let d2 = x * x + y * y;
        if (d2 < 0.01) { x = rand() - 0.5; y = rand() - 0.5; d2 = 0.01; }
        const f = (k * k) / d2;
        dx[i] += x * f; dy[i] += y * f; dx[j] -= x * f; dy[j] -= y * f;
      }
    }
    for (const e of edges) {
      const a = nodes[e.s], b = nodes[e.t];
      const x = a.x - b.x, y = a.y - b.y;
      const d = Math.sqrt(x * x + y * y) || 0.01;
      const f = (d / k) * Math.min(e.w, 4) * 0.5;
      dx[e.s] -= x * f; dy[e.s] -= y * f; dx[e.t] += x * f; dy[e.t] += y * f;
    }
    for (let i = 0; i < n; i++) {
      const tx = opts.pull ? opts.pull(nodes[i]).x : w / 2;
      const ty = opts.pull ? opts.pull(nodes[i]).y : h / 2;
      dx[i] += (tx - nodes[i].x) * (opts.gravity || 0.04) * k / 10;
      dy[i] += (ty - nodes[i].y) * (opts.gravity || 0.04) * k / 10;
      const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
      nodes[i].x += (dx[i] / d) * Math.min(d, t);
      nodes[i].y += (dy[i] / d) * Math.min(d, t);
    }
    t = Math.max(t * 0.985, 0.5);
  }
  // fit into the box with a margin, keeping the aspect
  const pad = opts.pad || 40;
  const xs = nodes.map((p) => p.x), ys = nodes.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  for (const p of nodes) {
    p.x = +((p.x - x0) * s + ox).toFixed(1);
    p.y = +((p.y - y0) * s + oy).toFixed(1);
  }
}

function build() {
  if (!rows.length) return { empty: true };

  // ---- circles, in date order ----
  const circles = new Map();
  for (const r of rows) {
    if (!circles.has(r.circle_id)) {
      circles.set(r.circle_id, { id: r.circle_id, date: r.date, city: r.city, topic: r.topic, cat: r.topic_category, initiator: r.initiator, people: [] });
    }
    const c = circles.get(r.circle_id);
    if (!c.people.includes(r.participant_id)) c.people.push(r.participant_id);
  }
  const order = [...circles.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.id.localeCompare(b.id));

  // ---- people ----
  const people = new Map();
  for (const c of order) {
    for (const id of c.people) {
      if (!people.has(id)) people.set(id, { id, count: 0, cities: {} });
      const p = people.get(id);
      p.count++;
      p.cities[c.city] = (p.cities[c.city] || 0) + 1;
    }
  }
  for (const p of people.values()) {
    p.city = Object.entries(p.cities).sort((a, b) => b[1] - a[1])[0][0];
    p.anchor = p.count >= anchorMin;
  }

  // ---- ties: walk the circles in order with a union-find, so each tie knows whether the two
  // people had any path to each other through earlier circles when it formed ----
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const id of people.keys()) parent.set(id, id);
  const ties = new Map();
  for (const c of order) {
    const ps = c.people;
    const before = ps.map(find);
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const [a, b] = ps[i] < ps[j] ? [ps[i], ps[j]] : [ps[j], ps[i]];
        const key = a + "|" + b;
        if (!ties.has(key)) ties.set(key, { a, b, w: 0, fresh: before[i] !== before[j] });
        ties.get(key).w++;
      }
    }
    for (let i = 1; i < ps.length; i++) parent.set(find(ps[i]), find(ps[0]));
  }

  // ---- the network, one panel per city ----
  const cityNames = [...new Set(order.map((c) => c.city))];
  const W = 600, H = 600;
  let crossCity = 0;
  const panels = cityNames.map((city, ci) => {
    const nodes = [...people.values()].filter((p) => p.city === city).map((p) => ({ ...p }));
    const idx = new Map(nodes.map((p, i) => [p.id, i]));
    const edges = [];
    for (const t of ties.values()) {
      const s = idx.get(t.a), u = idx.get(t.b);
      if (s === undefined || u === undefined) continue;
      edges.push({ s, t: u, w: t.w, fresh: t.fresh });
    }
    layout(nodes, edges, W, H, { seed: 11 + ci, iters: 500 });
    for (const p of nodes) p.r = +(4 + 4 * Math.sqrt(p.count)).toFixed(1);
    // all ties of one kind as a single path: thousands of <line>s would weigh the page down
    const path = (fresh) => edges.filter((e) => e.fresh === fresh)
      .map((e) => `M${nodes[e.s].x} ${nodes[e.s].y}L${nodes[e.t].x} ${nodes[e.t].y}`).join("");
    return {
      city, w: W, h: H,
      nodes: nodes.sort((a, b) => a.anchor - b.anchor || a.count - b.count),
      freshPath: path(true), priorPath: path(false),
      people: nodes.length, circles: order.filter((c) => c.city === city).length,
    };
  });
  for (const t of ties.values()) if (people.get(t.a).city !== people.get(t.b).city) crossCity++;

  const tieList = [...ties.values()];
  const anchors = [...people.values()].filter((p) => p.anchor);
  const repeatTotal = [...people.values()].reduce((s, p) => s + Math.max(0, p.count - 1), 0);
  const repeatAnchors = anchors.reduce((s, p) => s + (p.count - 1), 0);
  const network = {
    panels,
    people: people.size,
    ties: tieList.length,
    fresh: tieList.filter((t) => t.fresh).length,
    crossCity,
    anchors: anchors.length,
    anchorMin,
    repeatTotal,
    repeatAnchors,
    repeatShare: repeatTotal ? Math.round((100 * repeatAnchors) / repeatTotal) : 0,
    freshShare: tieList.length ? Math.round((100 * tieList.filter((t) => t.fresh).length) / tieList.length) : 0,
  };

  // ---- reproduction: of everyone who initiated, how many had sat in someone else's circle first ----
  const firstInit = new Map();
  for (const c of order) if (c.initiator && !firstInit.has(c.initiator)) firstInit.set(c.initiator, c);
  let fromParticipants = 0;
  for (const [id, first] of firstInit) {
    const sat = order.some((c) => c.date < first.date && c.initiator !== id && c.people.includes(id));
    if (sat) fromParticipants++;
  }
  // later_initiated is recorded per row; it should agree with what the dates say
  const flagged = new Set(rows.filter((r) => r.later_initiated).map((r) => r.participant_id));
  const disagree = [...flagged].filter((id) => !firstInit.has(id)).length;
  const reproduction = {
    initiators: firstInit.size,
    fromParticipants,
    share: firstInit.size ? Math.round((100 * fromParticipants) / firstInit.size) : 0,
    disagree,
  };

  // ---- topics: linked by the people they share, clustered by theme ----
  const topics = new Map();
  for (const c of order) {
    if (!topics.has(c.topic)) topics.set(c.topic, { name: c.topic, cat: c.cat, circles: 0, people: new Set(), cities: new Set() });
    const t = topics.get(c.topic);
    t.circles++;
    t.cities.add(c.city);
    for (const id of c.people) t.people.add(id);
  }
  const tnodes = [...topics.values()];
  const tedges = [];
  for (let i = 0; i < tnodes.length; i++) {
    for (let j = i + 1; j < tnodes.length; j++) {
      let w = 0;
      for (const id of tnodes[i].people) if (tnodes[j].people.has(id)) w++;
      if (w) tedges.push({ s: i, t: j, w });
    }
  }
  const cats = [...new Set(tnodes.map((t) => t.cat))];
  const TW = 1000, TH = 640;
  const centre = (cat) => {
    const a = (2 * Math.PI * cats.indexOf(cat)) / Math.max(cats.length, 1) - Math.PI / 2;
    const rr = cats.length > 1 ? 0.3 : 0;
    return { x: TW / 2 + Math.cos(a) * TW * rr, y: TH / 2 + Math.sin(a) * TH * rr };
  };
  layout(tnodes, tedges, TW, TH, { seed: 5, iters: 500, gravity: 0.12, pull: (p) => centre(p.cat), pad: 150 });   // room for labels, which grow on the phone
  const maxC = Math.max(...tnodes.map((t) => t.circles));
  const ranked = [...tnodes].sort((a, b) => b.circles - a.circles || b.people.size - a.people.size);
  const labelled = new Set(ranked.slice(0, 24).map((t) => t.name));
  const maxW = Math.max(1, ...tedges.map((e) => e.w));
  const catLabels = cats.map((cat) => {
    const m = tnodes.filter((t) => t.cat === cat);
    const x = m.reduce((s, t) => s + t.x, 0) / m.length;
    const y = Math.min(...m.map((t) => t.y)) - 34;
    return { cat, x: +x.toFixed(1), y: +Math.max(y, 24).toFixed(1), n: m.length };
  });
  const graph = {
    w: TW, h: TH,
    nodes: tnodes.map((t) => ({
      name: t.name, cat: t.cat, x: t.x, y: t.y, circles: t.circles, people: t.people.size,
      cities: [...t.cities].join(" · "),
      r: +(6 + 16 * Math.sqrt(t.circles / maxC)).toFixed(1),
      label: labelled.has(t.name), major: ranked.indexOf(t) < 8,
    })),
    edges: tedges.map((e) => ({
      x1: tnodes[e.s].x, y1: tnodes[e.s].y, x2: tnodes[e.t].x, y2: tnodes[e.t].y, w: e.w,
      sw: +(0.8 + 3.2 * (e.w / maxW)).toFixed(2),
    })),
    cats: catLabels,
    table: ranked.map((t) => ({ name: t.name, cat: t.cat, circles: t.circles, people: t.people.size })),
    topics: tnodes.length,
    links: tedges.length,
  };

  return {
    empty: false,
    sample: rows.some((r) => r.sample),
    sampleRows: rows.filter((r) => r.sample).length,
    rows: rows.length,
    circles: order.length,
    cities: cityNames,
    network,
    reproduction,
    graph,
  };
}

module.exports = build();
