/* tiles.js — the city grids drawn the way MIT City Science's CityScope draws its table: every cell a
   filled square tile, a 2px paper gap between tiles, the colour carrying the value. Empty cells stay on
   the table as faint squares so the grid itself is always legible. Points of interest are 8px dots with
   a 2px paper ring. The canvas sits over the map and redraws as it moves. */
import { cellRamp, classOf, esc, ok } from "./ui.js";

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
    const { G, cell, pts = [], label } = this.spec, k = tokens(), { o, s, t } = this.frame(), n = G.n;
    if (o.x + s * n < 0 || o.y + t * n < 0 || o.x > w || o.y > h) return;

    // the table: paper under the grid, so the basemap stays a hint at the gaps
    g.fillStyle = k.paper; g.globalAlpha = .82;
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
    }

    // points: 8px dots, 2px paper ring
    if (pts.length && s >= 4) {
      g.lineWidth = 2; g.strokeStyle = k.paper;
      for (const p of pts) {
        const x = o.x + p.c * s, y = o.y + p.r * t;
        if (x < 0 || y < 0 || x > w || y > h) continue;
        g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2);
        g.fillStyle = p.col; g.fill(); g.stroke();
      }
    }
  }
}

/* legend rows: a square swatch (or a dot, for points) in its colour, the name in ink */
export const swatchKey = (rows, dot = false) => `<ul class="cc-sk${dot ? " cc-sk--dot" : ""}">${rows.map(([col, name]) =>
  `<li><i style="background:${col}"></i>${name}</li>`).join("")}</ul>`;

/* a classed tile layer: values per cell, ascending breaks (four at most: five classes is what the
   validated ramp holds in both modes) and a name per class. Cells failing `mask` or without a value
   are empty table squares. */
export function gridLayer({ G, vals, breaks, labels, mask, pts = [], ptsKey = [], title, unit, tip, label }) {
  const n = breaks.length + 1, ramp = cellRamp(n);
  const cell = (i) => {
    const v = vals[i];
    if (!ok(v) || (mask && !mask(i))) return null;
    return { col: ramp[classOf(v, breaks)] };
  };
  const legend = `<p class="cc-lg__t">${esc(title)} <span>· ${esc(unit)}</span></p>`
    + swatchKey(labels.map((l, k) => [ramp[k], esc(l)]))
    + (ptsKey.length ? swatchKey(ptsKey.map(([col, l]) => [col, esc(l)]), true) : "");
  return { G, cell, pts, legend, tip, label: label ?? `${G.n * G.size / 1000} km · ${G.size} m cells` };
}
