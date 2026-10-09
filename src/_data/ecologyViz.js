// The homepage diagram, drawn at build time from ecology.js. Ecology is a word in a ring at the
// centre. One loop holds the drawing: the resources run in on wires to the ring, a wire runs down
// out of it through education to economy, and economy runs out along the bottom and back up both
// edges as one rail, across the top, and into the lead resource (energy), which sits on the axis
// above the ring and drops into it. The other resources branch off the side rails. main.js runs
// dots along every wire, tinted along the way (data-tint), so the dots go in ink, come out violet
// through education, green along economy, and ink again by the time they are back at the top.
// Two drawings: `wide` and `tall` (the phone). Every resource and thread is a focusable node with
// data-topic, wired to the grid filter; the ring is the reset. Counts are the grid's own projects
// tagged with that topic.
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

const lead = eco.resources.find((r) => r.lead) || eco.resources[0];
const rest = eco.resources.filter((r) => r !== lead);
const [ED, EC] = eco.threads;
const verbs = (EC.along || []).join("  →  ");

// a wire: the path the dots run along, in the direction they run. `tint` names the dots' colours
// from start to end (ink, ed, ec); `grad` strokes it with one of the drawing's gradients.
function wire(d, flow, o = {}) {
  return `<path class="eco__wire${o.cls ? " " + o.cls : ""}" data-flow="${flow}"` +
    (o.of ? ` data-of="${o.of}"` : "") + (o.tint ? ` data-tint="${o.tint}"` : "") +
    (o.grad ? ` data-grad style="--g:url(#${o.grad})"` : "") + ` d="${d}"/>`;
}

// stroke gradients, in user space so they hold on straight lines: [id, x1, y1, x2, y2, stops]
function defs(list) {
  return `<defs>` + list.map(([id, x1, y1, x2, y2, stops]) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(([o, c, a]) => `<stop offset="${o}" style="stop-color:var(${c});stop-opacity:${a}"/>`).join("") +
    `</linearGradient>`).join("") + `</defs>`;
}

function nodeOpen(item, kind) {
  const n = count[item.id] || 0;
  return `<g class="eco__node eco__node--${kind}${item.lead ? " eco__node--lead" : ""}" data-topic="${item.id}" role="button" tabindex="0" aria-pressed="false" ` +
         `aria-label="${esc(item.label)}: ${n} ${n === 1 ? "project" : "projects"}"${item.note ? ` data-note="${esc(item.note)}"` : ""}>`;
}

// a label set on its wire: a paper chip (no outline) hides the wire under the words; it fills on
// hover and turns ink when chosen. The chip is sized here by an estimate and fitted to the real
// text in main.js once the font has loaded.
function label(x, y, item, anchor, big) {
  const n = count[item.id] || 0, fs = big ? 19 : 13.5, h = big ? 36 : 28;
  const w = Math.round(item.label.length * fs * 0.55 + (big ? 30 : 24));
  const x0 = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
  return `<rect class="eco__pill" x="${x0 - 12}" y="${y - h / 2}" width="${w + 24}" height="${h}" rx="${h / 2}" data-anchor="${anchor}"/>` +
         `<text class="eco__label${big ? " eco__label--lead" : ""}" x="${x}" y="${y + fs * 0.34}"${anchor === "start" ? "" : ` text-anchor="${anchor}"`}>` +
         `${esc(item.label)}<tspan class="eco__count" dx="${big ? 8 : 6}">${n ? pad(n) : "–"}</tspan></text>`;
}

// a thread: a lane the loop runs inside. Only its words show at rest; it fills on hover.
function band(x0, x1, y, h, item, cls, right, inner, inset) {
  return nodeOpen(item, "band") +
    `<rect class="eco__band ${cls}" x="${x0}" y="${y - h / 2}" width="${x1 - x0}" height="${h}" rx="${h / 2}"/>` + inner +
    `<text class="eco__blabel" x="${x0 + inset}" y="${y + 4.5}">${esc(item.label)}<tspan class="eco__count" dx="7">${pad(count[item.id] || 0)}</tspan></text>` +
    (right ? `<text class="eco__bnote" x="${x1 - inset}" y="${y + 4.5}" text-anchor="end">${esc(right)}</text>` : "") +
    `</g>`;
}

function ring(cx, cy, r, fs) {
  return `<g class="eco__tile" data-eco-home role="button" tabindex="0" aria-label="${esc(eco.root)}: show all work">` +
    `<circle class="eco__ring" cx="${cx}" cy="${cy}" r="${r}"/>` +
    `<text class="eco__root" x="${cx}" y="${cy + fs * 0.33}" text-anchor="middle" style="font-size:${fs}px">${esc(eco.root)}</text></g>`;
}

// the lead resource: its label on the top rail, its wire straight down into the ring
function leadNode(cx, top, ringTop) {
  return nodeOpen(lead, "res") +
    `<rect class="eco__hit" x="${cx - 70}" y="${top - 22}" width="140" height="${ringTop - top + 22}"/>` +
    wire(`M${cx} ${top}V${ringTop}`, "in", { tint: "ink" }) +
    label(cx, top, lead, "middle", true) + `</g>`;
}

function desc() {
  return `<desc>${esc(eco.root)} at the centre, fed by ${lead.label} from above and by ${rest.map((r) => r.label).join(", ")} from the sides. ` +
         `Out of it run ${eco.threads.map((t) => t.label + (t.note ? " (" + t.note + ")" : "")).join(" and ")}, and the loop returns up both edges to ${lead.label} and the resources.</desc>`;
}

// ---- wide ----
function wide() {
  const W = 1148, H = 372, cx = W / 2, cy = 168, r = 64, top = 36, xL = 24, xR = W - 24, k = 22;
  const eY = 290, cY = 344, gap = 62, mouth = 66;   // mouth: where the top rail stops short of the lead's label
  const L = rest.slice(0, Math.ceil(rest.length / 2)), R = rest.slice(L.length);

  let s = `<svg class="eco__svg eco__svg--wide" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  s += defs([
    ["eco-w-rail", 0, cY, 0, top, [[0, "--ec-ink", .6], [1, "--ink", .36]]],
    ["eco-w-down", 0, cy + r, 0, cY, [[0, "--ink", .36], [.5, "--ed-ink", .6], [1, "--ec-ink", .6]]],
  ]);

  // ecology down through education to economy
  s += `<g class="eco__loop">` + wire(`M${cx} ${cy + r}V${cY}`, "down", { tint: "ink ed ec", grad: "eco-w-down" }) + `</g>`;
  // education spreads out from where the down wire crosses it
  s += band(xL - 12, xR + 12, eY, 36, ED, "eco__band--ed", ED.note,
    wire(`M${cx} ${eY}H${xL + 60}`, "band", { of: ED.id, tint: "ed" }) + wire(`M${cx} ${eY}H${xR - 60}`, "band", { of: ED.id, tint: "ed" }), 40);
  // economy: out along the bottom, up both edges, across the top into the lead resource
  const rail = (x, d) => `M${cx} ${cY}H${x - d * k}Q${x} ${cY} ${x} ${cY - k}V${top + k}Q${x} ${top} ${x - d * k} ${top}H${cx + d * mouth}`;
  s += band(xL - 12, xR + 12, cY, 36, EC, "eco__band--ec", verbs,
    wire(rail(xL, -1), "loop", { of: EC.id, tint: "ec ink", grad: "eco-w-rail", cls: "eco__wire--rail" }) +
    wire(rail(xR, 1), "loop", { of: EC.id, tint: "ec ink", grad: "eco-w-rail", cls: "eco__wire--rail" }), 40);

  // the other resources branch off the side rails: a dot on the rail, the label on the wire, then a
  // bend into the ring, spread over its height
  const side = (list, d) => list.forEach((it, i) => {
    const y = cy + (i - (list.length - 1) / 2) * gap, x0 = d > 0 ? xL : xR;
    const dy = (y - cy) * 0.45, ay = cy + dy, ax = cx - d * Math.sqrt(r * r - dy * dy), m = x0 + d * 300;
    s += nodeOpen(it, "res");
    s += `<rect class="eco__hit" x="${Math.min(x0, m)}" y="${y - 20}" width="300" height="40"/>`;
    s += wire(`M${x0} ${y}H${m}C${m + d * 110} ${y} ${(ax - d * 80).toFixed(1)} ${ay} ${ax.toFixed(1)} ${ay}`, "in", { tint: "ink" });
    s += `<circle class="eco__end" cx="${x0}" cy="${y}" r="3.5"/>`;
    s += label(x0 + d * 150, y, it, d > 0 ? "start" : "end");
    s += `</g>`;
  });
  side(L, 1);
  side(R, -1);

  s += leadNode(cx, top, cy - r);
  s += ring(cx, cy, r, 30);
  return s + `</svg>`;
}

// ---- tall: the phone. The resources stack in a column off the left rail; their wires climb a
// bundle on the right (each at its own x, outer rows outermost, so none cross) and turn into the
// ring. The down wire leaves the ring's upper right and drops past the bundle to the threads. ----
function tall() {
  const W = 360, cx = 180, cy = 100, r = 48, top = 22, xL = 12, xR = W - 12, k = 16, mouth = 52, dX = 330;
  const n = rest.length, ys = rest.map((_, i) => 188 + i * 42);
  const eY = ys[n - 1] + 54, cY = eY + 44, H = cY + 22;
  const a0x = cx + r * 0.5, a0y = cy - r * 0.866, hy = a0y - 16;   // where the down wire leaves the ring

  let s = `<svg class="eco__svg eco__svg--tall" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  s += defs([
    ["eco-t-rail", 0, cY, 0, top, [[0, "--ec-ink", .6], [1, "--ink", .36]]],
    ["eco-t-down", 0, top, 0, cY, [[0, "--ink", .36], [.8, "--ed-ink", .6], [1, "--ec-ink", .6]]],
  ]);
  s += `<g class="eco__loop">` +
    wire(`M${a0x} ${a0y}Q${a0x + 10} ${hy} ${a0x + 30} ${hy}H${dX - k}Q${dX} ${hy} ${dX} ${hy + k}V${cY}`, "down", { tint: "ink ed ec", grad: "eco-t-down" }) + `</g>`;
  s += band(2, W - 2, eY, 32, ED, "eco__band--ed", "", wire(`M${dX} ${eY}H${xL + 30}`, "band", { of: ED.id, tint: "ed" }), 30);
  const rail = (x, d) => `M${dX} ${cY}H${x - d * k}Q${x} ${cY} ${x} ${cY - k}V${top + k}Q${x} ${top} ${x - d * k} ${top}H${cx + d * mouth}`;
  s += band(2, W - 2, cY, 32, EC, "eco__band--ec", "",
    wire(rail(xL, -1), "loop", { of: EC.id, tint: "ec ink", grad: "eco-t-rail", cls: "eco__wire--rail" }) +
    wire(rail(xR, 1), "loop", { of: EC.id, tint: "ec ink", grad: "eco-t-rail", cls: "eco__wire--rail" }), 30);

  rest.forEach((it, i) => {
    const y = ys[i], sx = 268 + i * 7, ty = cy + ((n - 1) / 2 - i) * 7, ax = cx + Math.sqrt(r * r - (ty - cy) ** 2);
    s += nodeOpen(it, "res");
    s += `<rect class="eco__hit" x="0" y="${y - 20}" width="${sx + 8}" height="40"/>`;
    s += wire(`M${xL} ${y}H${sx - 12}Q${sx} ${y} ${sx} ${y - 12}V${ty + 12}Q${sx} ${ty} ${sx - 12} ${ty}H${ax.toFixed(1)}`, "in", { tint: "ink" });
    s += `<circle class="eco__end" cx="${xL}" cy="${y}" r="3.5"/>`;
    s += label(34, y, it, "start");
    s += `</g>`;
  });

  s += leadNode(cx, top, cy - r);
  s += ring(cx, cy, r, 24);
  return s + `</svg>`;
}

module.exports = { wide: wide(), tall: tall(), count };
