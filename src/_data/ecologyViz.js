// The homepage diagram, drawn at build time from ecology.js: ecology at the top, a branch down to
// each resource, and the two threads (education, economy) crossing every branch. Positions are
// laid out here; the strokes are then roughened with a seeded wobble and doubled, so it reads as
// drawn by hand but a rebuild gives the same lines. Two drawings: `wide` (a row) and `tall` (the
// phone, a column). Each resource and thread is a focusable node with data-topic, which main.js
// wires to the grid filter. Counts are the grid's own projects tagged with that topic.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const eco = require("./ecology.js");
const groups = require("./groups.js");

// ---- counts: projects on the homepage grid, by topic ----
const onGrid = new Set(groups.flatMap((g) => g[1]));
const dir = path.join(__dirname, "..", "projects");
const count = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const d = matter(fs.readFileSync(path.join(dir, f), "utf8")).data;
  if (!onGrid.has(d.title)) continue;
  for (const t of d.topics || []) count[t] = (count[t] || 0) + 1;
}
const pad = (n) => (n < 10 ? "0" + n : "" + n);

// mulberry32, as in perspectivesViz.js
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

const f1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// sample a straight line or a cubic into points
function line(a, b, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
}
function cubic(p0, p1, p2, p3, n = 32) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });
}

// A hand line: the points pushed sideways by a slow wobble (two sines at random phase, so no
// zigzag), the ends overshot or held short a little, then smoothed through Catmull-Rom.
function wobble(pts, rand, amp) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const k1 = (0.6 + rand()) * len / 260, k2 = (1.5 + rand() * 2) * len / 260;
  const ph1 = rand() * 6.28, ph2 = rand() * 6.28;
  const a = amp * Math.min(1, len / 120);
  const out = pts.map((p, i) => {
    const t = i / (pts.length - 1);
    const q = pts[Math.min(i + 1, pts.length - 1)], r = pts[Math.max(i - 1, 0)];
    let nx = -(q[1] - r[1]), ny = q[0] - r[0];
    const m = Math.hypot(nx, ny) || 1;
    nx /= m; ny /= m;
    const o = a * (0.65 * Math.sin(6.28 * k1 * t + ph1) + 0.35 * Math.sin(6.28 * k2 * t + ph2));
    return [p[0] + nx * o, p[1] + ny * o];
  });
  // overshoot / hold short at both ends
  const ext = (i, j) => {
    const dx = out[i][0] - out[j][0], dy = out[i][1] - out[j][1], m = Math.hypot(dx, dy) || 1, e = (rand() - 0.35) * 4;
    out[i] = [out[i][0] + (dx / m) * e, out[i][1] + (dy / m) * e];
  };
  ext(0, 1); ext(out.length - 1, out.length - 2);
  let d = `M${f1(out[0][0])} ${f1(out[0][1])}`;
  for (let i = 0; i < out.length - 1; i++) {
    const p0 = out[Math.max(i - 1, 0)], p1 = out[i], p2 = out[i + 1], p3 = out[Math.min(i + 2, out.length - 1)];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d;
}

// one stroke drawn twice, the second lighter, like a pen going back over it
function stroke(pts, rand, cls, amp = 2.2) {
  return `<path class="${cls}" pathLength="1" d="${wobble(pts, rand, amp)}"/>` +
         `<path class="${cls} eco__ghost" pathLength="1" d="${wobble(pts, rand, amp * 0.8)}"/>`;
}
function offset(pts, dx, dy) { return pts.map((p) => [p[0] + dx, p[1] + dy]); }

function label(x, y, text, cls, anchor = "middle", extra = "") {
  return `<text class="${cls}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}"${extra}>${esc(text)}</text>`;
}
function nodeOpen(item, n, kind) {
  const what = n === 1 ? "project" : "projects";
  return `<g class="eco__node eco__node--${kind}" data-topic="${item.id}" role="button" tabindex="0" aria-pressed="false" ` +
         `aria-label="${esc(item.label)}: ${n} ${what}"${item.note ? ` data-note="${esc(item.note)}"` : ""}>`;
}

function desc() {
  return `<desc>${esc(eco.root)} branches into ${eco.resources.map((r) => r.label).join(", ")}. ` +
         `Two threads cross every branch: ${eco.threads.map((t) => t.label + (t.note ? " (" + t.note + ")" : "")).join("; ")}.</desc>`;
}

// ---- wide: the row ----
function wide() {
  const rand = rng(31);
  const W = 1148, H = 372, cx = W / 2, top = 64, ny = 172;
  const R = eco.resources, xs = R.map((_, i) => 82 + i * ((W - 164) / (R.length - 1)));
  const tY = [256, 318];
  let s = `<svg class="eco__svg eco__svg--wide" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  s += label(cx, 46, eco.root, "eco__root");

  // the stems run on under each resource through both threads: drawn first, so the threads cross them
  R.forEach((r, i) => { s += stroke(line([xs[i], ny + 26], [xs[i], tY[1] + 22], 10), rand, "eco__stem", 1.4); });

  // threads: education double, economy single, the verbs along it
  const [ed, ec] = eco.threads;
  s += nodeOpen(ed, count[ed.id] || 0, "thread");
  s += `<rect class="eco__hit" x="0" y="${tY[0] - 30}" width="${W}" height="38"/>`;
  const edLine = line([20, tY[0]], [W - 20, tY[0]], 60);
  s += stroke(edLine, rand, "eco__thread", 2.6) + stroke(offset(edLine, 0, 5), rand, "eco__thread", 2.6);
  s += label((xs[0] + xs[1]) / 2, tY[0] - 12, ed.label, "eco__tlabel");
  s += label((xs[0] + xs[1]) / 2 + 58, tY[0] - 14, pad(count[ed.id] || 0), "eco__count", "start");
  s += `</g>`;
  s += nodeOpen(ec, count[ec.id] || 0, "thread");
  s += `<rect class="eco__hit" x="0" y="${tY[1] - 30}" width="${W}" height="40"/>`;
  s += stroke(line([20, tY[1]], [W - 20, tY[1]], 60), rand, "eco__thread eco__thread--ec", 2.6);
  s += label((xs[0] + xs[1]) / 2, tY[1] - 12, ec.label, "eco__tlabel");
  s += label((xs[0] + xs[1]) / 2 + 52, tY[1] - 14, pad(count[ec.id] || 0), "eco__count", "start");
  (ec.along || []).forEach((v, i) => {
    const x = (xs[1 + i * 2] + xs[2 + i * 2]) / 2;   // in the gaps between stems: 1–2, 3–4, 5–6
    s += label(x, tY[1] + 26, v + (i < ec.along.length - 1 ? "  →" : ""), "eco__verb");
  });
  s += `</g>`;

  // knots where a stem crosses a thread
  R.forEach((r, i) => tY.forEach((y, k) => {
    s += `<circle class="eco__knot" cx="${f1(xs[i] + (rand() - 0.5) * 1.5)}" cy="${f1(y + (k ? 0 : 2.5))}" r="${k ? 2.6 : 3.2}"/>`;
  }));

  // branches + resource nodes
  R.forEach((r, i) => {
    const n = count[r.id] || 0;
    s += nodeOpen(r, n, "res");
    s += `<rect class="eco__hit" x="${f1(xs[i] - 70)}" y="${ny - 52}" width="140" height="92"/>`;
    s += stroke(cubic([cx + (i - 3) * 6, top], [cx + (i - 3) * 14, top + 50], [xs[i], ny - 92], [xs[i], ny - 30]), rand, "eco__branch");
    s += label(xs[i], ny, r.label, "eco__label");
    s += label(xs[i], ny + 20, n ? pad(n) : "–", "eco__count");
    s += `</g>`;
  });
  return s + `</svg>`;
}

// ---- tall: the column (phone) ----
function tall() {
  const rand = rng(57);
  const W = 360, R = eco.resources, ys = R.map((_, i) => 104 + i * 60), H = ys[ys.length - 1] + 92;
  const rail = [262, 316], trunkX = 30;
  let s = `<svg class="eco__svg eco__svg--tall" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  s += label(12, 42, eco.root, "eco__root", "start");
  s += stroke(line([trunkX, 56], [trunkX, ys[ys.length - 1] - 12], 40), rand, "eco__branch eco__trunk", 1.8);
  R.forEach((r, i) => { s += stroke(line([200, ys[i] - 8], [W - 14, ys[i] - 8], 14), rand, "eco__stem", 1.2); });

  const [ed, ec] = eco.threads;
  [[ed, rail[0], true], [ec, rail[1], false]].forEach(([t, x, dbl]) => {
    s += nodeOpen(t, count[t.id] || 0, "thread");
    s += `<rect class="eco__hit" x="${x - 22}" y="56" width="44" height="${H - 56}"/>`;
    const L = line([x, 64], [x, H - 16], 40);
    s += stroke(L, rand, "eco__thread" + (dbl ? "" : " eco__thread--ec"), 2.2);
    if (dbl) s += stroke(offset(L, 5, 0), rand, "eco__thread", 2.2);
    s += label(x - 10, H - 24, `${t.label} ${pad(count[t.id] || 0)}`, "eco__tlabel", "start", ` transform="rotate(-90 ${x - 10} ${H - 24})"`);
    s += `</g>`;
  });
  R.forEach((r, i) => rail.forEach((x, k) => {
    s += `<circle class="eco__knot" cx="${f1(x + (k ? 0 : 2.5))}" cy="${f1(ys[i] - 8 + (rand() - 0.5) * 1.5)}" r="${k ? 2.4 : 3}"/>`;
  }));

  R.forEach((r, i) => {
    const n = count[r.id] || 0;
    s += nodeOpen(r, n, "res");
    s += `<rect class="eco__hit" x="0" y="${ys[i] - 36}" width="220" height="52"/>`;
    s += stroke(cubic([trunkX, ys[i] - 40], [trunkX, ys[i] - 14], [trunkX + 14, ys[i] - 8], [52, ys[i] - 8], 16), rand, "eco__branch", 1.2);
    s += label(60, ys[i], r.label, "eco__label", "start");
    s += label(172, ys[i] - 1, n ? pad(n) : "–", "eco__count", "start");   // one column, so the counts line up
    s += `</g>`;
  });
  return s + `</svg>`;
}

module.exports = { wide: wide(), tall: tall(), count };
