/* tiles.js — the city grids drawn the way MIT City Science's CityScope draws its table: every cell a
   filled square tile, a 2px paper gap between tiles, the colour carrying the value. Empty cells stay on
   the table as faint squares so the grid itself is always legible.

   Over the tiles lie sheets, after Ian McHarg's overlays in Design with Nature (1969): each a transparent
   layer of one system (the ground's contours and valleys, the drains and lakes, the streets as space
   syntax reads them, the main roads, rail and metro, the names of places), switched on and off in the
   (layers) list and stacked in a fixed order, ground first, so any chapter can be read against them.
   A chapter can set its own sheets; whatever the reader switches wins, in every chapter after. A sheet
   marked `only` belongs to the chapters that name it (the valleys: the ground and food) and is not offered
   anywhere else; switching it lasts until the chapter changes.
   Points of interest are 6px dots with a paper ring.

   The square moves and resizes, like Morphocode's Explorer: a (move) handle on its top edge and a handle
   on its corner. The grid is only rebuilt when the handle is let go. */
import { cellRamp, classOf, esc, fmt, ok, CAT } from "./ui.js";
import { PACE, SIZES } from "./grid.js";
import { ground } from "./ground.js";
import { syntax, syntaxBreaks } from "./syntax.js";

function tokens() {
  const s = getComputedStyle(document.documentElement), g = (k, f) => s.getPropertyValue(k).trim() || f;
  return { ink: g("--ink", "#1C1B18"), paper: g("--paper", "#FAFAF8"), line: g("--line", "#C2C0B7"), mute: g("--mute", "#6b6a64"),
    mono: g("--mono", "ui-monospace, SFMono-Regular, Menlo, monospace") };
}

/* the sheets, bottom to top. `needs` is what has to be read first, the ground (elevation) or the streets'
   space syntax; each loads the first time its sheet is switched on. */
export const SHEETS = [
  { id: "contours", name: "contours", on: false, needs: "ground" },
  { id: "lakes", name: "lakes and tanks", on: true },
  { id: "valleys", name: "valleys, from the ground's shape", on: false, needs: "ground", only: true },
  { id: "drains", name: "drains and streams, as mapped", on: true },
  { id: "streets", name: "streets, by space syntax", on: false, needs: "syntax" },
  { id: "roads", name: "main roads", on: true },
  { id: "rail", name: "rail and metro, with stations", on: true },
  { id: "names", name: "neighbourhood names", on: true },
];
/* street weights for the five classes of a space syntax measure, faintest first */
export const LINE_W = [.5, .8, 1.3, 2, 3], LINE_A = [.22, .38, .6, .85, 1];

export class TileGrid {
  constructor(map, host) {
    this.map = map;
    this.cv = document.createElement("canvas");
    this.cv.className = "cc-tiles";
    this.cv.setAttribute("aria-hidden", "true");
    host.appendChild(this.cv);
    this.g = this.cv.getContext("2d");
    this.spec = null; this.hi = -1; this.user = new Map(); this.scoped = new Map(); this.ghost = null; this.busy = new Set();
    let raf = 0;
    this.redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.draw(); }); };
    map.on("move", this.redraw); map.on("resize", this.redraw);
    addEventListener("resize", this.redraw);
    this.grips(host);
  }
  /* spec: { G, cell(i) → {col, a?} | null, pts: [{c, r, col}], sheets?: {id: bool}, syntaxKey?, plan?, marks?, click? } */
  set(spec) { this.spec = spec; this.hi = -1; this.redraw(); this.onsheets?.(); }
  clear() { this.spec = null; this.hi = -1; this.redraw(); this.onsheets?.(); }
  hover(i) { if (i !== this.hi) { this.hi = i; this.redraw(); } }

  /* a sheet is on if the reader said so, else if the chapter says so, else by default */
  on(id) {
    const sh = SHEETS.find((x) => x.id === id), own = this.spec?.sheets?.[id];
    if (sh.only) return own === undefined ? false : this.scoped.has(id) ? this.scoped.get(id) : own;
    if (this.user.has(id)) return this.user.get(id);
    return own ?? sh.on;
  }
  toggle(id) {
    (SHEETS.find((x) => x.id === id).only ? this.scoped : this.user).set(id, !this.on(id));
    this.redraw(); this.onsheets?.();
  }
  /* a new chapter: the sheets that belong to one chapter go back to what the next one says */
  chapter() { this.scoped.clear(); }
  sheetList() {
    const G = this.spec?.G, big = G && G.size > 300;
    return SHEETS.filter((x) => !(big && (x.id === "streets" || x.id === "lakes")) && !(x.only && this.spec?.sheets?.[x.id] === undefined))
      .map((x) => ({ ...x, on: this.on(x.id), loading: this.busy.has(x.needs) }));
  }
  /* read what an open sheet needs, once a grid, then draw again */
  need(G, what) {
    if (what === "ground" ? G.ground || G.groundFailed : G.syntax || G.syntaxFailed || G.size > 300) return;
    if (this.busy.has(what)) return;
    this.busy.add(what); this.onsheets?.();
    (what === "ground" ? ground(G) : syntax(G))
      .catch((e) => { console.warn(what, e); G[what + "Failed"] = true; })
      .finally(() => { this.busy.delete(what); this.redraw(); this.onsheets?.(); });
  }

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

  /* ── moving and resizing the square ───────────────────────────────────────────────────────────── */
  grips(host) {
    const move = this.moveEl = document.createElement("button"), size = this.sizeEl = document.createElement("button");
    move.type = size.type = "button";
    move.className = "cc-grip cc-grip--move"; size.className = "cc-grip cc-grip--size";
    move.setAttribute("aria-label", "move the square: drag it, or use the arrow keys");
    size.setAttribute("aria-label", "resize the square: drag the corner, or press + and −");
    move.hidden = size.hidden = true;
    host.append(move, size);
    const drag = (el, onMove) => {
      el.addEventListener("pointerdown", (e) => {
        if (!this.spec || e.button) return;
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic pointer */ }
        const { G } = this.spec, f = this.frame(), x0 = e.clientX, y0 = e.clientY;
        this.ghost = { dc: 0, dr: 0, n: G.n };
        const mv = (ev) => { onMove(ev.clientX - x0, ev.clientY - y0, f, G); this.redraw(); };
        const up = () => {
          el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
          const g = this.ghost; this.ghost = null; this.redraw();
          if (g && (Math.abs(g.dc) >= .5 || Math.abs(g.dr) >= .5 || g.n !== G.n)) this.commit(G, g);
        };
        el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      });
    };
    drag(move, (dx, dy, f) => { this.ghost.dc = dx / f.s; this.ghost.dr = dy / f.t; });
    drag(size, (dx, dy, f, G) => {
      // the corner pulls the square out from its centre, in steps of eight cells
      const half = G.n / 2 + Math.max(dx / f.s, dy / f.t);
      this.ghost.n = Math.max(SIZES.min, Math.min(SIZES.max, Math.round(2 * half / SIZES.step) * SIZES.step));
    });
    move.addEventListener("keydown", (e) => {
      const d = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
      if (d && this.spec) { e.preventDefault(); this.commit(this.spec.G, { dc: d[0], dr: d[1], n: this.spec.G.n }); }
    });
    size.addEventListener("keydown", (e) => {
      const d = { "+": 1, "=": 1, "-": -1, "−": -1 }[e.key];
      if (d && this.spec) {
        e.preventDefault();
        const n = Math.max(SIZES.min, Math.min(SIZES.max, this.spec.G.n + d * SIZES.step));
        if (n !== this.spec.G.n) this.commit(this.spec.G, { dc: 0, dr: 0, n });
      }
    });
  }
  /* the new square: its centre as lon, lat and its size in cells, handed to the explorer to rebuild */
  commit(G, g) {
    const [lon, lat] = G.corner(G.n / 2 + g.dc, G.n / 2 + g.dr);
    this.onmove?.({ lon, lat, n: g.n, size: G.size, moved: Math.abs(g.dc) >= .5 || Math.abs(g.dr) >= .5 });
  }
  placeGrips(o, s, t, n, G) {
    const show = this.spec && this.onmove && s >= 3, big = G.size > 300;
    this.moveEl.hidden = !show; this.sizeEl.hidden = !show || big;
    if (!show) return;
    const q = this.ghost, gn = q ? q.n : n, x = o.x + ((q?.dc || 0) - (gn - n) / 2) * s, y = o.y + ((q?.dr || 0) - (gn - n) / 2) * t;
    this.moveEl.textContent = `(move) ${fmt(gn * G.size / 1000, 1)} km · ${G.size >= 1000 ? `${G.size / 1000} km` : `${G.size} m`} cells`;
    this.moveEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y - 22)}px)`;
    this.sizeEl.style.transform = `translate(${Math.round(x + gn * s - 8)}px, ${Math.round(y + gn * t - 8)}px)`;
  }

  /* ── drawing ──────────────────────────────────────────────────────────────────────────────────── */
  draw() {
    const cv = this.cv, dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!this.spec) { this.moveEl.hidden = this.sizeEl.hidden = true; return; }
    const spec = this.spec, { G, cell, pts = [] } = spec, k = tokens(), { o, s, t } = this.frame(), n = G.n;
    this.placeGrips(o, s, t, n, G);
    if (o.x + s * n < 0 || o.y + t * n < 0 || o.x > w || o.y > h) return;
    for (const x of SHEETS) if (x.needs && this.on(x.id)) this.need(G, x.needs);

    // the table: paper under the grid, so the basemap stays a hint at the gaps
    g.fillStyle = k.paper; g.globalAlpha = .6;
    g.fillRect(o.x, o.y, s * n, t * n);

    const gap = s >= 9 ? 2 : s >= 5 ? 1 : 0, fade = this.ghost ? .35 : 1;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = o.x + c * s, y = o.y + r * t;
      if (x > w || y > h || x + s < 0 || y + t < 0) continue;
      const d = cell(r * n + c);
      if (d) { g.globalAlpha = (d.a ?? 1) * fade; g.fillStyle = d.col; g.fillRect(x + gap / 2, y + gap / 2, s - gap, t - gap); }
      else if (gap) { g.globalAlpha = .5 * fade; g.strokeStyle = k.line; g.lineWidth = .5; g.strokeRect(x + gap / 2 + .25, y + gap / 2 + .25, s - gap - .5, t - gap - .5); }
    }
    g.globalAlpha = 1;

    if (spec.ink !== false && s >= 2) this.sheets(G, k, o, s, t, n, spec);

    // the cells a what-if changed: a dashed ink outline
    if (spec.marks?.length) {
      g.setLineDash([2, 2]); g.strokeStyle = k.ink; g.lineWidth = 1;
      for (const i of spec.marks) g.strokeRect(o.x + (i % n) * s + 1.5, o.y + ((i / n) | 0) * t + 1.5, s - 3, t - 3);
      g.setLineDash([]);
    }

    // the hovered tile: an ink outline
    if (this.hi >= 0) {
      const c = this.hi % n, r = (this.hi / n) | 0;
      g.strokeStyle = k.ink; g.lineWidth = 1.5;
      g.strokeRect(o.x + c * s + .75, o.y + r * t + .75, s - 1.5, t - 1.5);
    }

    // the table's edge and a scale (its size is on the (move) handle)
    g.strokeStyle = k.line; g.lineWidth = 1;
    g.strokeRect(o.x + .5, o.y + .5, s * n, t * n);
    if (s >= 5 && !this.ghost) {
      // five minutes on foot, so the minutes in the legend have a length
      const m = 5 * PACE, bw = m / G.size * s, x1 = o.x + s * n, y = o.y - 7;
      if (bw >= 24 && bw < s * n / 2) {
        g.font = `500 9.62px ${k.mono}`; g.textBaseline = "bottom";
        g.strokeStyle = k.ink; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x1 - bw + .5, y - 3); g.lineTo(x1 - bw + .5, y + .5); g.lineTo(x1 - .5, y + .5); g.lineTo(x1 - .5, y - 3); g.stroke();
        g.textAlign = "right"; g.fillStyle = k.mute;
        g.fillText(`${m} m · a 5-minute walk`, x1 - bw - 6, o.y - 4);
      }
    }

    // points: 6px dots, 1.5px paper ring
    if (pts.length && s >= 4 && !this.ghost) {
      g.lineWidth = 1.5; g.strokeStyle = k.paper;
      for (const p of pts) {
        const x = o.x + p.c * s, y = o.y + p.r * t;
        if (x < 0 || y < 0 || x > w || y > h) continue;
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2);
        g.fillStyle = p.col; g.fill(); g.stroke();
      }
    }

    // what a what-if put on the map: an ink square on its cell, a dashed ring at the walk it serves, its name
    if (spec.plan?.length && !this.ghost) {
      g.font = `500 9.62px ${k.mono}`; g.textAlign = "left"; g.textBaseline = "middle"; g.lineJoin = "round";
      for (const p of spec.plan) {
        const x = o.x + p.c * s, y = o.y + p.r * t;
        g.setLineDash([4, 3]); g.strokeStyle = k.ink; g.lineWidth = 1.2;
        g.beginPath(); g.arc(x, y, p.rad * s, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = k.ink; g.strokeStyle = k.paper; g.lineWidth = 2;
        g.strokeRect(x - 5, y - 5, 10, 10); g.fillRect(x - 5, y - 5, 10, 10);
        g.lineWidth = 3; g.strokeText(p.name, x + 9, y); g.fillText(p.name, x + 9, y);
      }
    }

    // the neighbourhood names, last, so nothing covers them
    if (G.places?.length && spec.ink !== false && this.on("names") && s >= 8 && !this.ghost) {
      g.font = `500 10.5px ${k.mono}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.lineWidth = 3.5; g.strokeStyle = k.paper; g.fillStyle = k.ink;
      for (const p of G.places) {
        const x = o.x + p.c * s, y = o.y + p.r * t, name = p.name.toLowerCase();
        g.strokeText(name, x, y); g.fillText(name, x, y);
      }
    }

    // while the square is dragged: where it will land
    if (this.ghost) {
      const q = this.ghost, gx = o.x + (q.dc - (q.n - n) / 2) * s, gy = o.y + (q.dr - (q.n - n) / 2) * t;
      g.setLineDash([6, 4]); g.strokeStyle = k.ink; g.lineWidth = 1.5;
      g.strokeRect(gx, gy, q.n * s, q.n * t); g.setLineDash([]);
    }
  }

  /* the sheets that are on, bottom to top, each line on a paper casing so it reads on the palest tile
     and the darkest */
  sheets(G, k, o, s, t, n, spec) {
    const g = this.g, X = (q) => o.x + q[0] * s, Y = (q) => o.y + q[1] * t, on = (id) => this.on(id);
    const path = (line) => { line.forEach((q, i) => (i ? g.lineTo(X(q), Y(q)) : g.moveTo(X(q), Y(q)))); };
    const stroke = (lines, w, dash = []) => {
      if (!lines.length) return;
      g.beginPath(); lines.forEach(path);
      g.setLineDash([]); g.strokeStyle = k.paper; g.lineWidth = w + 2; g.stroke();
      g.setLineDash(dash); g.strokeStyle = k.ink; g.lineWidth = w; g.stroke();
      g.setLineDash([]);
    };
    g.save();
    g.beginPath(); g.rect(o.x, o.y, s * n, t * n); g.clip();
    g.lineJoin = g.lineCap = "round";
    const T = G.ground;

    // the ground's shape: thin contours, every fifth one heavier
    if (on("contours") && T) {
      for (const ct of T.contours) {
        g.beginPath();
        for (const [a, b] of ct.segs) { g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); }
        g.strokeStyle = k.ink; g.globalAlpha = ct.major ? .7 : .4; g.lineWidth = ct.major ? 1.1 : .7; g.stroke();
      }
      g.globalAlpha = 1;
    }

    // water: paper over the tiles, an ink edge; each tile's polygons clipped to that tile, so the seams
    // where the vector tiles were cut never draw as shorelines. Region grids (km cells) skip it: there
    // water is a class of the tiles, and the generalised lakes only scatter shapes over them
    if (on("lakes") && G.size <= 300) for (const [[a, b], rings] of G.ink.water) {
      g.save(); g.beginPath(); g.rect(X(a), Y(a), X(b) - X(a), Y(b) - Y(a)); g.clip();
      g.beginPath(); rings.forEach(path);
      g.globalAlpha = .92; g.fillStyle = k.paper; g.fill("evenodd");
      g.globalAlpha = 1; g.strokeStyle = k.ink; g.lineWidth = .8; g.stroke();
      g.restore();
    }

    // valleys: where the ground gathers water, in the palette's blue, heavier as more ground drains to them
    if (on("valleys") && T) {
      const blue = CAT()[0];
      for (const v of [...T.valleys].sort((a, b) => a.w - b.w)) {
        const lw = Math.min(5, 1 + 1.4 * Math.log2(v.w + 1));
        g.beginPath(); g.moveTo(X(v.a), Y(v.a)); g.lineTo(X(v.b), Y(v.b));
        g.strokeStyle = k.paper; g.lineWidth = lw + 2; g.stroke();
        g.strokeStyle = blue; g.lineWidth = lw; g.stroke();
      }
    }

    if (on("drains")) stroke(G.ink.waterway, .7, [2, 2]);

    // streets by space syntax: five classes of choice (or integration), the busiest heaviest and drawn last
    if (on("streets") && G.syntax) {
      const key = spec.syntaxKey || "nach", Sx = G.syntax;
      Sx.breaks ||= {};
      const br = (Sx.breaks[key] ||= syntaxBreaks(Sx.segs, key)), byClass = [[], [], [], [], []];
      for (const sg of Sx.segs) byClass[classOf(sg[key], br)].push(sg.pts);
      byClass.forEach((lines, c) => {
        if (!lines.length) return;
        g.beginPath(); lines.forEach(path);
        if (c >= 3) { g.strokeStyle = k.paper; g.lineWidth = LINE_W[c] + 2; g.stroke(); }
        g.globalAlpha = LINE_A[c]; g.strokeStyle = k.ink; g.lineWidth = LINE_W[c]; g.stroke(); g.globalAlpha = 1;
      });
    }

    if (on("roads")) {
      stroke(G.ink.roads.filter(([gr]) => gr === 1).map(([, l]) => l), .8);
      stroke(G.ink.roads.filter(([gr]) => gr === 0).map(([, l]) => l), 1.6);
    }
    if (on("rail")) {
      stroke(G.ink.rail, 1.2, [6, 3]);
      // stations: a paper dot with an ink ring
      if (s >= 4) for (const [c, r] of G.pts.rail || []) {
        g.beginPath(); g.arc(X([c, r]), Y([c, r]), 3.5, 0, Math.PI * 2);
        g.fillStyle = k.paper; g.fill(); g.strokeStyle = k.ink; g.lineWidth = 1.4; g.stroke();
      }
    }
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
export function gridLayer({ G, vals, breaks, labels, mask, good = "low", weigh = false, fade = 1, pts = [], ptsKey = [], title, unit, tip, label, sheets, extra = "" }) {
  const n = breaks.length + 1, ramp = cellRamp(n, good), count = new Array(n).fill(0);
  const cls = (i) => { const v = vals[i]; return !ok(v) || (mask && !mask(i)) ? -1 : classOf(v, breaks); };
  for (let i = 0; i < G.n * G.n; i++) { const c = cls(i); if (c >= 0) count[c]++; }
  // weigh: true fades by floor area; a function gives each cell its own opacity (by people, say)
  const cell = (i) => { const c = cls(i); return c < 0 ? null : { col: ramp[c], a: (typeof weigh === "function" ? weigh(i) : weigh ? floorAlpha(G, i) : 1) * fade }; };
  const legend = `<p class="cc-lg__t">${esc(title)} <span>· ${esc(unit)}</span></p>`
    + swatchKey(labels.map((l, k) => [ramp[k], `${esc(l)} <b>${fmt(count[k])}</b>`]))
    + (weigh ? `<p class="cc-lg__w"><i style="--c:${ramp[good === "high" ? 0 : n - 1]}"></i>fainter: ${typeof weigh === "function" ? "fewer people in the cell" : "less floor built on the cell"}</p>` : "")
    + (ptsKey.length ? swatchKey(ptsKey.map(([col, l]) => [col, esc(l)]), true) : "") + extra;
  return { G, cell, pts, legend, tip, sheets, label: label ?? `${G.n * G.size / 1000} km · ${G.size} m cells` };
}

/* a tile layer of kinds rather than amounts (land use): kind(i) → an index into kinds [[colour, name]], or -1 */
export function kindLayer({ G, kind, kinds, title, unit, tip, sheets }) {
  const count = new Array(kinds.length).fill(0);
  for (let i = 0; i < G.n * G.n; i++) { const c = kind(i); if (c >= 0) count[c]++; }
  const cell = (i) => { const c = kind(i); return c < 0 ? null : { col: kinds[c][0] }; };
  const legend = `<p class="cc-lg__t">${esc(title)} <span>· ${esc(unit)}</span></p>`
    + swatchKey(kinds.map(([col, l], k) => [col, `${esc(l)} <b>${fmt(count[k])}</b>`]));
  return { G, cell, pts: [], legend, tip, sheets };
}

/* a legend row for the street sheet, when a chapter turns it on: five line weights, faintest to heaviest */
export const streetKey = (what) => `<p class="cc-lg__s">lines: ${esc(what)}</p><ul class="cc-sk cc-sk--line">${[0, 1, 2, 3, 4].map((c) =>
  `<li><i style="height:${LINE_W[c]}px;opacity:${LINE_A[c]}"></i>${["least", "", "", "", "most"][c]}</li>`).join("")}</ul>`;
