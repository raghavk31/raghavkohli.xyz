/* syntax-worker.js — space syntax over the grid's streets, in a worker so the page stays live while it
   counts. Angular segment analysis after Turner (2001) and Hillier and Iida (2005): the street network
   is cut into segments between junctions, and the "depth" of a route is how much it turns, a right angle
   counting 1, not how long it is, because people read a city by its changes of direction. Two measures,
   normalised as Hillier, Yang and Turner (2012) do so places can be compared:
     integration (NAIN, radius 800 m): how few turns it takes to reach everything within a ten-minute
       walk. High integration is where people arrive: local centres, market streets.
     choice (NACH, radius 2 km): how many of the least-turning routes between all pairs of segments run
       through a segment. High choice is where people pass through: the through-routes.
   Radii are metric, along the route found. Over 2 500 segments, routes start from a seeded sample and the
   counts are scaled up, which shifts the values a little but not their order. The window has an edge:
   streets near it lose the routes that would come in from outside, so they read a little low.

   in:  { lines: [[[x, y], ...]] in cell units, size: metres a cell }
   out: { segs: [{ pts, nach, nain }], junctions: [[x, y, degree]] } */
import { Heap } from "./ground.js";

const SNAP = 3;       // metres: vertices closer than this are one node (tiles are cut and re-joined at their edges)
const R_INT = 800, R_CH = 2000, SAMPLE = 2500;

self.onmessage = (e) => {
  try { self.postMessage(analyse(e.data)); } catch (err) { self.postMessage({ error: String(err.message || err) }); }
};

function analyse({ lines, size }) {
  // nodes: every vertex, merged with any other within SNAP metres
  const xs = [], ys = [], hash = new Map(), key = (a, b) => `${a},${b}`;
  const node = (x, y) => {
    const hx = Math.round(x / SNAP), hy = Math.round(y / SNAP);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = hash.get(key(hx + dx, hy + dy));
      if (list) for (const id of list) if (Math.hypot(xs[id] - x, ys[id] - y) <= SNAP) return id;
    }
    const id = xs.length;
    xs.push(x); ys.push(y);
    const k = key(hx, hy);
    if (!hash.has(k)) hash.set(k, []);
    hash.get(k).push(id);
    return id;
  };
  const adj = [], edges = new Set();
  for (const line of lines) {
    let prev = -1;
    for (const q of line) {
      const id = node(q[0] * size, q[1] * size);
      if (prev >= 0 && prev !== id) {
        const k = prev < id ? `${prev}-${id}` : `${id}-${prev}`;
        if (!edges.has(k)) { edges.add(k); (adj[prev] ||= []).push(id); (adj[id] ||= []).push(prev); }
      }
      prev = id;
    }
  }
  const deg = (i) => (adj[i] ? adj[i].length : 0);

  // segments: runs of edges between nodes that are not simple bends (degree other than 2)
  const used = new Set(), segs = [];
  const ek = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const walk = (u, v) => {
    const path = [u, v];
    used.add(ek(u, v));
    let prev = u, cur = v;
    while (deg(cur) === 2 && cur !== u) {
      const nx = adj[cur][0] === prev ? adj[cur][1] : adj[cur][0];
      if (used.has(ek(cur, nx))) break;
      used.add(ek(cur, nx));
      path.push(nx); prev = cur; cur = nx;
    }
    segs.push(path);
  };
  for (let u = 0; u < xs.length; u++) if (deg(u) && deg(u) !== 2) for (const v of adj[u]) if (!used.has(ek(u, v))) walk(u, v);
  for (let u = 0; u < xs.length; u++) if (deg(u) === 2) for (const v of adj[u]) if (!used.has(ek(u, v))) walk(u, v);   // closed loops

  const S = segs.length;
  const A = new Int32Array(S), B = new Int32Array(S), len = new Float64Array(S), bend = new Float64Array(S);
  const ax = new Float64Array(S), ay = new Float64Array(S), bx = new Float64Array(S), by = new Float64Array(S);
  const at = [];   // node → segments that end there
  segs.forEach((p, s) => {
    A[s] = p[0]; B[s] = p[p.length - 1];
    let L = 0, turn = 0, pdx = 0, pdy = 0;
    for (let i = 1; i < p.length; i++) {
      const dx = xs[p[i]] - xs[p[i - 1]], dy = ys[p[i]] - ys[p[i - 1]], d = Math.hypot(dx, dy) || 1e-9;
      L += d;
      if (i > 1) turn += angle(pdx, pdy, dx / d, dy / d);
      pdx = dx / d; pdy = dy / d;
      if (i === 1) { ax[s] = dx / d; ay[s] = dy / d; }
    }
    bx[s] = pdx; by[s] = pdy; len[s] = L; bend[s] = turn;
    (at[A[s]] ||= []).push(s);
    if (B[s] !== A[s]) (at[B[s]] ||= []).push(s);
  });

  // states: 2s runs a segment A → B, 2s + 1 runs it B → A
  const endOf = (st) => (st & 1 ? A[st >> 1] : B[st >> 1]);
  const outX = (st) => (st & 1 ? -ax[st >> 1] : bx[st >> 1]), outY = (st) => (st & 1 ? -ay[st >> 1] : by[st >> 1]);
  const inX = (st) => (st & 1 ? -bx[st >> 1] : ax[st >> 1]), inY = (st) => (st & 1 ? -by[st >> 1] : ay[st >> 1]);

  let sources = [...Array(S).keys()];
  if (S > SAMPLE) {
    let seed = 20261015;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let i = S - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sources[i], sources[j]] = [sources[j], sources[i]]; }
    sources = sources.slice(0, SAMPLE);
  }
  const scale = S / sources.length;
  const CH = new Float64Array(S), TD = new Float64Array(S), TD8 = new Float64Array(S), NC8 = new Float64Array(S);
  const cost = new Float64Array(2 * S), metric = new Float64Array(2 * S), pred = new Int32Array(2 * S), done = new Uint8Array(2 * S);
  const settled = new Int32Array(S).fill(-1), acc = new Float64Array(2 * S);
  for (const src of sources) {
    cost.fill(Infinity); done.fill(0); pred.fill(-1); settled.fill(-1); acc.fill(0);
    const heap = new Heap(), order = [];
    for (const st of [2 * src, 2 * src + 1]) { cost[st] = 0; metric[st] = len[src] / 2; heap.push(0, st); }
    while (heap.size) {
      const st = heap.pop();
      if (done[st]) continue;
      done[st] = 1; order.push(st);
      const s = st >> 1;
      if (settled[s] < 0) {
        settled[s] = st;
        const d = cost[st];
        TD[s] += d;
        if (metric[st] <= R_INT) { TD8[s] += d; NC8[s] += 1; }
      }
      const X = endOf(st), ox = outX(st), oy = outY(st);
      for (const t of at[X] || []) {
        for (const nt of (A[t] === X ? [2 * t] : []).concat(B[t] === X ? [2 * t + 1] : [])) {
          if ((nt >> 1) === s || done[nt]) continue;
          const m = metric[st] + len[s] / 2 + len[t] / 2;
          if (m > R_CH) continue;
          const c = cost[st] + angle(ox, oy, inX(nt), inY(nt)) + bend[t];
          if (c < cost[nt]) { cost[nt] = c; metric[nt] = m; pred[nt] = st; heap.push(c, nt); }
        }
      }
    }
    // choice: every segment reached is one route's end; hand the counts back up the tree of routes
    for (let i = order.length - 1; i >= 0; i--) {
      const st = order[i], s = st >> 1, own = settled[s] === st ? 1 : 0;
      acc[st] += own;
      if (pred[st] >= 0) {
        acc[pred[st]] += acc[st];
        if (s !== src) CH[s] += acc[st] - own;
      }
    }
  }
  const out = segs.map((p, s) => ({
    pts: p.map((id) => [xs[id] / size, ys[id] / size]),
    nach: Math.log(CH[s] * scale + 1) / Math.log(TD[s] * scale + 3),
    nain: NC8[s] ? (NC8[s] * scale) ** 1.2 / (TD8[s] * scale + 2) : 0,
  }));
  const junctions = [];
  for (let i = 0; i < xs.length; i++) if (deg(i) >= 3) junctions.push([xs[i] / size, ys[i] / size, deg(i)]);
  return { segs: out, junctions };
}

/* the turn between two unit directions, a right angle counting 1 and a U-turn 2 */
function angle(x1, y1, x2, y2) {
  const d = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2));
  return Math.acos(d) / (Math.PI / 2);
}
