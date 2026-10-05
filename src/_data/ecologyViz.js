// The homepage diagram, drawn at build time from ecology.js as a hub: ecology is the tile in the
// middle, the seven resources are pills on wires into it, and education and economy are two bands
// underneath. Wires close a loop (resource → ecology → education → economy → back out to the
// resources), and main.js runs small dots along every wire so the loop is seen to move. Two
// drawings: `wide` (the hub) and `tall` (the phone, a column). Every resource and band is a
// focusable node with data-topic, wired to the grid filter; the tile is the reset. Counts are the
// grid's own projects tagged with that topic.
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
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// a wire: the path the dots run along, in the direction they run
const wire = (d, flow, of) => `<path class="eco__wire" data-flow="${flow}"${of ? ` data-of="${of}"` : ""} d="${d}"/>`;

function nodeOpen(item, kind) {
  const n = count[item.id] || 0;
  return `<g class="eco__node eco__node--${kind}" data-topic="${item.id}" role="button" tabindex="0" aria-pressed="false" ` +
         `aria-label="${esc(item.label)}: ${n} ${n === 1 ? "project" : "projects"}"${item.note ? ` data-note="${esc(item.note)}"` : ""}>`;
}

// a pill: rounded label with its count. Width is estimated here and corrected in main.js once the
// font has loaded, so it holds with or without script.
function pill(x, y, item, anchor) {
  const n = count[item.id] || 0;
  const w = Math.round(30 + item.label.length * 7.6 + 22);
  const x0 = anchor === "end" ? x - w : x;
  return `<rect class="eco__pill" x="${x0}" y="${y - 15}" width="${w}" height="30" rx="15" data-anchor="${anchor}" data-x="${x}"/>` +
         `<text class="eco__label" x="${x0 + 15}" y="${y + 4.5}">${esc(item.label)}<tspan class="eco__count" dx="7">${n ? pad(n) : "–"}</tspan></text>`;
}

function band(x, y, w, h, item, cls, right, inner = "") {
  return nodeOpen(item, "band") +
    `<rect class="eco__band ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>` + inner +
    `<text class="eco__blabel" x="${x + 22}" y="${y + h / 2 + 4.5}">${esc(item.label)}<tspan class="eco__count" dx="8">${pad(count[item.id] || 0)}</tspan></text>` +
    (right ? `<text class="eco__bnote" x="${x + w - 22}" y="${y + h / 2 + 4.5}" text-anchor="end">${esc(right)}</text>` : "") +
    `</g>`;
}

function tile(cx, cy, w, h) {
  return `<g class="eco__tile" data-eco-home role="button" tabindex="0" aria-label="${esc(eco.root)}: show all work">` +
    `<rect class="eco__tile-out" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="30"/>` +
    `<rect class="eco__tile-in" x="${cx - w / 2 + 12}" y="${cy - h / 2 + 12}" width="${w - 24}" height="${h - 24}" rx="20"/>` +
    `<text class="eco__root" x="${cx}" y="${cy + 8}" text-anchor="middle">${esc(eco.root)}</text></g>`;
}

function desc() {
  return `<desc>${esc(eco.root)} at the centre, fed by ${eco.resources.map((r) => r.label).join(", ")}. ` +
         `Below it run ${eco.threads.map((t) => t.label + (t.note ? " (" + t.note + ")" : "")).join(" and ")}, and the loop returns to the resources.</desc>`;
}

const [ED, EC] = eco.threads;
const verbs = (EC.along || []).join("  →  ");

// ---- wide: the hub ----
function wide() {
  const W = 1148, H = 384, cx = W / 2, cy = 140, tw = 184, th = 124;
  const L = eco.resources.slice(0, 4), R = eco.resources.slice(4);
  const ly = L.map((_, i) => 52 + i * 58), ry = R.map((_, i) => 82 + i * 58);
  const xL = 52, xR = W - 52, eY = 286, cY = 342, bandH = 38;
  const tL = cx - tw / 2, tR = cx + tw / 2;
  const attach = (n, i) => cy - 36 + (72 * i) / Math.max(1, n - 1);

  let s = `<svg class="eco__svg eco__svg--wide" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;

  // ecology down into the bands
  s += `<g class="eco__loop">` + wire(`M${cx} ${cy + th / 2}V${cY}`, "down") + `</g>`;
  // bands. Each carries its own wires between its fill and its labels, so the dots run inside the
  // band and under the words: education spreads out from where the down wire crosses it; economy
  // runs out along its band and up both sides, back to the resources (the return loop).
  s += band(xL - 20, eY - bandH / 2, W - 2 * (xL - 20), bandH, ED, "eco__band--ed", ED.note,
    wire(`M${cx} ${eY}H${xL + 4}`, "band", ED.id) + wire(`M${cx} ${eY}H${xR - 4}`, "band", ED.id));
  s += band(xL - 20, cY - bandH / 2, W - 2 * (xL - 20), bandH, EC, "eco__band--ec", verbs,
    wire(`M${cx} ${cY}H${xL + 20}Q${xL} ${cY} ${xL} ${cY - 20}V${ly[0]}`, "loop", EC.id) +
    wire(`M${cx} ${cY}H${xR - 20}Q${xR} ${cY} ${xR} ${cY - 20}V${ry[0]}`, "loop", EC.id));

  // resources: wire from the outer dot, through the pill, bending into the tile
  const side = (list, ys, x0, edge, dir) => list.forEach((r, i) => {
    const y = ys[i], ay = attach(list.length, i), mid = (x0 + edge) / 2 + dir * 70;
    s += nodeOpen(r, "res");
    s += `<rect class="eco__hit" x="${Math.min(x0, mid) - 16}" y="${y - 22}" width="${Math.abs(mid - x0) + 32}" height="44"/>`;
    s += wire(`M${x0} ${y}H${mid}C${mid - dir * -60} ${y} ${edge + dir * -70} ${ay} ${edge} ${ay}`, "in");
    s += `<circle class="eco__end" cx="${x0}" cy="${y}" r="3.5"/>`;
    s += pill(x0 + dir * 24, y, r, dir > 0 ? "start" : "end");
    s += `</g>`;
  });
  side(L, ly, xL, tL, 1);
  side(R, ry, xR, tR, -1);

  s += tile(cx, cy, tw, th);
  return s + `</svg>`;
}

// ---- tall: the column (phone) ----
function tall() {
  const W = 360, R = eco.resources, ys = R.map((_, i) => 140 + i * 44);
  const cx = 168, cy = 56, tw = 150, th = 84, spine = 316, down = 340;
  const eY = ys[ys.length - 1] + 62, cY = eY + 50, H = cY + 30;
  let s = `<svg class="eco__svg eco__svg--tall" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  s += `<g class="eco__loop">` +
    wire(`M${cx + tw / 2} ${cy + 14}H${down - 16}Q${down} ${cy + 14} ${down} ${cy + 30}V${cY}`, "down") + `</g>`;
  s += band(4, eY - 17, W - 8, 34, ED, "eco__band--ed", "", wire(`M${down} ${eY}H${18}`, "band", ED.id));
  s += band(4, cY - 17, W - 8, 34, EC, "eco__band--ec", "",
    wire(`M${down} ${cY}H${30}Q${14} ${cY} ${14} ${cY - 16}V${ys[0]}`, "loop", EC.id));
  R.forEach((r, i) => {
    const y = ys[i];
    s += nodeOpen(r, "res");
    s += `<rect class="eco__hit" x="0" y="${y - 20}" width="${spine + 10}" height="40"/>`;
    s += wire(`M14 ${y}H${spine - 16}Q${spine} ${y} ${spine} ${y - 16}V${cy + 30}Q${spine} ${cy - 6} ${spine - 16} ${cy - 6}H${cx + tw / 2}`, "in");
    s += `<circle class="eco__end" cx="14" cy="${y}" r="3.5"/>`;
    s += pill(34, y, r, "start");
    s += `</g>`;
  });
  s += tile(cx, cy, tw, th);
  return s + `</svg>`;
}

module.exports = { wide: wide(), tall: tall(), count };
