/* ground.js — the ground under the grid, read the way Ian McHarg read a site in Design with Nature (1969):
   the shape of the land first, then where water runs over it, and only then where to build. Elevation is
   the SRTM model averaged to each cell (grid.js elevation). Pits in that surface are mostly noise in a 30 m
   radar model of a city of buildings and trees, so they are filled first (priority-flood with a small rise, Barnes, Lehman and Mulla 2014), then
   every cell drains to its steepest-downhill neighbour (D8) and counts the cells upstream of it. Valleys
   are the cells that collect from 20 ha or more: enough ground to carry a stream when it rains, which in
   Bengaluru is where the old storm-water channels (rajakaluves) run. Contours are traced through the cell
   centres (marching squares).

   ground(G) → { Z, F, dir, acc, slope, T, valleys: [{ a, b, w }], contours: [{ z, major, segs }], step, lo, hi } */
import { elevation } from "./grid.js";

export const VALLEY_HA = 20;
export function ground(G) {
  if (!G.groundP) G.groundP = elevation(G).then((Z) => (G.ground = read(G, Z))).catch((e) => { G.groundP = null; throw e; });
  return G.groundP;
}

const NB = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

function read(G, Z) {
  const n = G.n, N = n * n, F = Float64Array.from(Z), seen = new Uint8Array(N);
  // priority-flood: start from the edge, always grow from the lowest cell reached; a neighbour lower than
  // where it was reached from is a pit, raised to just above it so water can leave
  const heap = new Heap();
  for (let i = 0; i < N; i++) {
    const c = i % n, r = (i / n) | 0;
    if (c === 0 || r === 0 || c === n - 1 || r === n - 1) { seen[i] = 1; heap.push(F[i], i); }
  }
  while (heap.size) {
    const i = heap.pop(), c = i % n, r = (i / n) | 0;
    for (const [dc, dr] of NB) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= n || rr >= n) continue;
      const j = rr * n + cc;
      if (seen[j]) continue;
      seen[j] = 1;
      if (F[j] <= F[i]) F[j] = F[i] + 1e-3;
      heap.push(F[j], j);
    }
  }
  // D8: each cell to its steepest-downhill neighbour; an edge cell with none drains out of the window
  const dir = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    const c = i % n, r = (i / n) | 0;
    let steep = 0;
    for (const [dc, dr] of NB) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= n || rr >= n) continue;
      const j = rr * n + cc, drop = (F[i] - F[j]) / Math.hypot(dc, dr);
      if (drop > steep) { steep = drop; dir[i] = j; }
    }
  }
  // the cells each one collects from, itself included: hand each cell's count down, highest first
  const acc = new Float32Array(N).fill(1), order = [...Array(N).keys()].sort((a, b) => F[b] - F[a]);
  for (const i of order) if (dir[i] >= 0) acc[dir[i]] += acc[i];
  // slope on the unfilled ground, as a percentage, from the neighbours either side
  const slope = new Float32Array(N), at = (c, r) => Z[Math.min(n - 1, Math.max(0, r)) * n + Math.min(n - 1, Math.max(0, c))];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const gx = (at(c + 1, r) - at(c - 1, r)) / (2 * G.size), gy = (at(c, r + 1) - at(c, r - 1)) / (2 * G.size);
    slope[r * n + c] = Math.hypot(gx, gy) * 100;
  }
  const T = Math.max(3, Math.round(VALLEY_HA * 1e4 / G.area));
  const valleys = [];
  for (let i = 0; i < N; i++) if (acc[i] >= T && dir[i] >= 0)
    valleys.push({ a: [i % n + .5, ((i / n) | 0) + .5], b: [dir[i] % n + .5, ((dir[i] / n) | 0) + .5], w: acc[i] / T });
  let lo = Infinity, hi = -Infinity;
  for (const z of Z) { if (z < lo) lo = z; if (z > hi) hi = z; }
  const step = niceStep((hi - lo) / 12), contours = [];
  for (let z = Math.ceil(lo / step) * step; z <= hi; z += step)
    contours.push({ z, major: Math.round(z / step) % 5 === 0, segs: trace(Z, n, z) });
  return { Z, F, dir, acc, slope, T, valleys, contours, step, lo, hi };
}

const niceStep = (x) => [1, 2, 5, 10, 20, 25, 50, 100, 200].find((s) => s >= x) || 500;

/* marching squares over the cell centres: the pieces of the line z, in cell units */
const CASES = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
  [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[3, 0]], []];
function trace(Z, n, z) {
  const segs = [];
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = [Z[r * n + c], Z[r * n + c + 1], Z[(r + 1) * n + c + 1], Z[(r + 1) * n + c]];
    const k = (v[0] >= z) | ((v[1] >= z) << 1) | ((v[2] >= z) << 2) | ((v[3] >= z) << 3);
    if (!k || k === 15) continue;
    const P = [[c, r], [c + 1, r], [c + 1, r + 1], [c, r + 1]];
    const edge = (e) => {   // edge e runs from corner e to corner (e + 1) % 4
      const a = e, b = (e + 1) % 4, t = (z - v[a]) / (v[b] - v[a] || 1e-9);
      return [P[a][0] + (P[b][0] - P[a][0]) * t + .5, P[a][1] + (P[b][1] - P[a][1]) * t + .5];
    };
    for (const [e1, e2] of CASES[k]) segs.push([edge(e1), edge(e2)]);
  }
  return segs;
}

/* a small binary min-heap of [key, value] */
export class Heap {
  constructor() { this.k = []; this.v = []; this.size = 0; }
  push(key, val) {
    let i = this.size++;
    this.k[i] = key; this.v[i] = val;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] <= key) break;
      this.k[i] = this.k[p]; this.v[i] = this.v[p]; i = p;
    }
    this.k[i] = key; this.v[i] = val;
  }
  pop() {
    const top = this.v[0], key = this.k[--this.size], val = this.v[this.size];
    let i = 0;
    for (;;) {
      let m = 2 * i + 1;
      if (m >= this.size) break;
      if (m + 1 < this.size && this.k[m + 1] < this.k[m]) m++;
      if (this.k[m] >= key) break;
      this.k[i] = this.k[m]; this.v[i] = this.v[m]; i = m;
    }
    this.k[i] = key; this.v[i] = val;
    return top;
  }
}
