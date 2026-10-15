/* tiles.js — the city grids drawn the way MIT City Science's CityScope draws its table: every cell a
   filled square tile, a 2px paper gap between tiles, the colour carrying the value. Empty cells stay on
   the table as faint squares so the grid itself is always legible. Over the tiles, in ink, what a city
   is read by (Lynch's paths, edges and districts): main roads, rail and metro, drains, lakes and a few
   neighbourhood names, so a cell can be found. Points of interest are 6px dots with a paper ring.
   The canvas sits over the map and redraws as it moves. */
import { cellRamp, classOf, esc, fmt, ok } from "./ui.js";
import { PACE } from "./grid.js";

function tokens() {
  const s = getComputedStyle(document.documentElement), g = (k, f) => s.getPropertyValue(k).trim() || f;
  return { ink: g("--ink", "#1C1B18"), paper: g("--paper", "#FAFAF8"), line: g("--line", "#C2C0B7"), mute: g("--mute", "#6b6a64"),
    mono: g("--mono", "ui-monospace, SFMono-Regular, Menlo, monospace") };
}

export class TileGrid {
  constructor(map, host) {
    this.map = map;
    this.cv = document.createElement("canvas");
    this.cv.className = "cc-tiles";
    this.cv.setAttribute("aria-hidden", "true");
    host.appendChild(this.cv);
    this.g = this.cv.getContext("2d");
    this.spec = null; this.hi = -1;
    let raf = 0;
    this.redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.draw(); }); };
    map.on("move", this.redraw); map.on("resize", this.redraw);
    addEventListener("resize", this.redraw);
  }
  /* spec: { G, cell(i) → {col, a?} | null, pts: [{c, r, col}], label } */
  set(spec) { this.spec = spec; this.hi = -1; this.redraw(); }
  clear() { this.spec = null; this.hi = -1; this.redraw(); }
  hover(i) { if (i !== this.hi) { this.hi = i; this.redraw(); } }

  frame() {
    const { G } = this.spec, m = this.map, P = (c, r) => m.project(G.corner(c, r));
    const o = P(0, 0), a = P(G.n, 0), b = P(0, G.n);
    return { o, s: (a.x - o.x) / G.n, t: (b.y - o.y) / G.n };
  }
  cellAt(pt) {
    if (!this.spec) return -1;
    const { G } = this.spec, { o, s, t } = this.frame();
    const c = Math.floor((pt.x - o.x) / s), r = Math.floor((pt.y - o.y) / t);
    return c >= 0 && r >= 0 && c < G.n && r < G.n ? r * G.n + c : -1;
  }

  draw() {
    const cv = this.cv, dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!this.spec) return;
    const spec = this.spec, { G, cell, pts = [], label } = spec, k = tokens(), { o, s, t } = this.frame(), n = G.n;
    if (o.x + s * n < 0 || o.y + t * n < 0 || o.x > w || o.y > h) return;

    // the table: paper under the grid, so the basemap stays a hint at the gaps
    g.fillStyle = k.paper; g.globalAlpha = .6;
    g.fillRect(o.x, o.y, s * n, t * n);
    g.globalAlpha = 1;

    const gap = s >= 9 ? 2 : s >= 5 ? 1 : 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = o.x + c * s, y = o.y + r * t;
      if (x > w || y > h || x + s < 0 || y + t < 0) continue;
      const d = cell(r * n + c);
      if (d) { g.globalAlpha = d.a ?? 1; g.fillStyle = d.col; g.fillRect(x + gap / 2, y + gap / 2, s - gap, t - gap); }
      else if (gap) { g.globalAlpha = .5; g.strokeStyle = k.line; g.lineWidth = .5; g.strokeRect(x + gap / 2 + .25, y + gap / 2 + .25, s - gap - .5, t - gap - .5); }
    }
    g.globalAlpha = 1;

    if (G.ink && spec.ink !== false && s >= 4) this.ink(G, k, o, s, t, n);

    // the hovered tile: an ink outline
    if (this.hi >= 0) {
      const c = this.hi % n, r = (this.hi / n) | 0;
      g.strokeStyle = k.ink; g.lineWidth = 1.5;
      g.strokeRect(o.x + c * s + .75, o.y + r * t + .75, s - 1.5, t - 1.5);
    }

    // the table's edge and scale
    g.strokeStyle = k.line; g.lineWidth = 1;
    g.strokeRect(o.x + .5, o.y + .5, s * n, t * n);
    if (label && s >= 5) {
      g.font = `500 9.62px ${k.mono}`; g.textAlign = "left"; g.textBaseline = "bottom"; g.fillStyle = k.mute;
      g.fillText(label, o.x, o.y - 4);
      // a scale: five minutes on foot, so the minutes in the legend have a length
      const m = 5 * PACE, bw = m / G.size * s, x1 = o.x + s * n, y = o.y - 7;
      if (bw >= 24 && bw < s * n / 2) {
        g.strokeStyle = k.ink; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x1 - bw + .5, y - 3); g.lineTo(x1 - bw + .5, y + .5); g.lineTo(x1 - .5, y + .5); g.lineTo(x1 - .5, y - 3); g.stroke();
        g.textAlign = "right"; g.fillStyle = k.mute;
        g.fillText(`${m} m · a 5-minute walk`, x1 - bw - 6, o.y - 4);
      }
    }

    // points: 6px dots, 1.5px paper ring
    if (pts.length && s >= 4) {
      g.lineWidth = 1.5; g.strokeStyle = k.paper;
      for (const p of pts) {
        const x = o.x + p.c * s, y = o.y + p.r * t;
        if (x < 0 || y < 0 || x > w || y > h) continue;
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2);
        g.fillStyle = p.col; g.fill(); g.stroke();
      }
    }

    // the neighbourhood names, last, so nothing covers them
    if (G.places?.length && spec.ink !== false && s >= 8) {
      g.font = `500 10.5px ${k.mono}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.lineWidth = 3.5; g.strokeStyle = k.paper; g.fillStyle = k.ink;
      for (const p of G.places) {
        const x = o.x + p.c * s, y = o.y + p.r * t, name = p.name.toLowerCase();
        g.strokeText(name, x, y); g.fillText(name, x, y);
      }
    }
  }

  /* the city's lines in ink, each on a paper casing so it reads on the palest tile and the darkest:
     lakes cut out of the grid, then drains, rail and metro dashed, main roads by weight */
  ink(G, k, o, s, t, n) {
    const g = this.g, X = (q) => o.x + q[0] * s, Y = (q) => o.y + q[1] * t;
    const path = (line) => { line.forEach((q, i) => (i ? g.lineTo(X(q), Y(q)) : g.moveTo(X(q), Y(q)))); };
    g.save();
    g.beginPath(); g.rect(o.x, o.y, s * n, t * n); g.clip();
    g.lineJoin = g.lineCap = "round";

    // water: paper over the tiles, an ink edge; each tile's polygons clipped to that tile, so the seams
    // where the vector tiles were cut never draw as shorelines. Region grids (km cells) skip it: there
    // water is a class of the tiles, and the generalised lakes only scatter shapes over them
    if (G.size <= 300) for (const [[a, b], rings] of G.ink.water) {
      g.save(); g.beginPath(); g.rect(X(a), Y(a), X(b) - X(a), Y(b) - Y(a)); g.clip();
      g.beginPath(); rings.forEach(path);
      g.globalAlpha = .92; g.fillStyle = k.paper; g.fill("evenodd");
      g.globalAlpha = 1; g.strokeStyle = k.ink; g.lineWidth = .8; g.stroke();
      g.restore();
    }
    const stroke = (lines, w, dash = []) => {
      if (!lines.length) return;
      g.beginPath(); lines.forEach(path);
      g.setLineDash([]); g.strokeStyle = k.paper; g.lineWidth = w + 2; g.stroke();
      g.setLineDash(dash); g.strokeStyle = k.ink; g.lineWidth = w; g.stroke();
    };
    stroke(G.ink.waterway, .7, [2, 2]);
    stroke(G.ink.roads.filter(([gr]) => gr === 1).map(([, l]) => l), .8);
    stroke(G.ink.roads.filter(([gr]) => gr === 0).map(([, l]) => l), 1.6);
    stroke(G.ink.rail, 1.2, [6, 3]);
    g.setLineDash([]);
    g.restore();
  }
}

/* legend rows: a square swatch (or a dot, for points) in its colour, the name in ink */
export const swatchKey = (rows, dot = false) => `<ul class="cc-sk${dot ? " cc-sk--dot" : ""}">${rows.map(([col, name]) =>
  `<li><i style="background:${col}"></i>${name}</li>`).join("")}</ul>`;

/* a classed tile layer: values per cell, ascending breaks (four at most: five classes is what the
   ramp holds) and a name per class. `good` is the end of the scale where nothing is wrong ("low" or
   "high"); that class is near-neutral and the rest are blue. With `weigh`, a tile's opacity follows the
   floor built on it (value by alpha, after Roth, Woodruff and Johnson 2010), so a yard or a street with
   nothing on it recedes and the crowded cells carry the map. Cells failing `mask` or without a value
   are empty table squares. The legend counts the cells in each class. */
export const floorAlpha = (G, i) => .22 + .78 * Math.min(1, Math.sqrt(G.floor[i] / G.area / 1.5));
export function gridLayer({ G, vals, breaks, labels, mask, good = "low", weigh = false, pts = [], ptsKey = [], title, unit, tip, label }) {
  const n = breaks.length + 1, ramp = cellRamp(n, good), count = new Array(n).fill(0);
  const cls = (i) => { const v = vals[i]; return !ok(v) || (mask && !mask(i)) ? -1 : classOf(v, breaks); };
  for (let i = 0; i < G.n * G.n; i++) { const c = cls(i); if (c >= 0) count[c]++; }
  const cell = (i) => { const c = cls(i); return c < 0 ? null : { col: ramp[c], a: weigh ? floorAlpha(G, i) : 1 }; };
  const legend = `<p class="cc-lg__t">${esc(title)} <span>· ${esc(unit)}</span></p>`
    + swatchKey(labels.map((l, k) => [ramp[k], `${esc(l)} <b>${fmt(count[k])}</b>`]))
    + (weigh ? `<p class="cc-lg__w"><i style="--c:${ramp[good === "high" ? 0 : n - 1]}"></i>fainter: less floor built on the cell</p>` : "")
    + (ptsKey.length ? swatchKey(ptsKey.map(([col, l]) => [col, esc(l)]), true) : "");
  return { G, cell, pts, legend, tip, label: label ?? `${G.n * G.size / 1000} km · ${G.size} m cells` };
}
