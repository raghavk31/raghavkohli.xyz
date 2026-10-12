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
// 2026-10-12, the drawing carries data: every dot on a topic's wire is one of its projects
// (data-p, [title, url] each; main.js parks them on the wire when the topic is chosen, and a parked
// dot names its project and opens it), and a resource's wire is as heavy as its count. The phone
// drawing is a plain tree: a spine down from the ring, one row per resource.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const eco = require("./ecology.js");
const groups = require("./groups.js");

// ---- counts: projects on the homepage grid, by topic ----
const onGrid = new Set(groups.flatMap((g) => g[1]));
const dir = path.join(__dirname, "..", "projects");
const count = {}, work = {}, projs = [];
const order = groups.flatMap((g) => g[1]);
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const d = matter(fs.readFileSync(path.join(dir, f), "utf8")).data;
  if (!onGrid.has(d.title)) continue;
  const url = `/work/${f.replace(/\.md$/, "").replace(/^\d+-/, "")}/`;
  for (const t of d.topics || []) { count[t] = (count[t] || 0) + 1; (work[t] = work[t] || []).push([d.title, url]); }
  const dt = new Date(d.date);
  if (!isNaN(dt)) projs.push({ title: d.title, url, topics: d.topics || [], at: dt.getUTCFullYear() + (dt - Date.UTC(dt.getUTCFullYear(), 0, 1)) / 31557600000 });
}
for (const t in work) work[t].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
// a resource's wire weight: 1.1 for none, up to 3.4 for the most-told topic
const most = Math.max(1, ...Object.values(count));
const weight = (id) => (1.1 + 2.3 * Math.sqrt((count[id] || 0) / most)).toFixed(2);
// a share of a topic's projects for one of its wires (a band or the economy rail runs as two halves)
const share = (id, half) => { const w = work[id] || [], k = Math.ceil(w.length / 2); return half == null ? w : half ? w.slice(k) : w.slice(0, k); };
const pad = (n) => (n < 10 ? "0" + n : "" + n);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const lead = eco.resources.find((r) => r.lead) || eco.resources[0];
const rest = eco.resources.filter((r) => r !== lead);
const [ED, EC] = eco.threads;
const verbs = (EC.along || []).join("  →  ");

// a wire: the path the dots run along, in the direction they run. `tint` names the dots' colours
// from start to end (ink, ed, ec); `grad` strokes it with one of the drawing's gradients.
// `p` lists the projects that ride it as dots, `park` the stretch (from, to: 0–1 along the wire)
// where they line up when the topic is chosen, clear of its label; `w` its weight.
function wire(d, flow, o = {}) {
  const st = [o.grad ? `--g:url(#${o.grad})` : "", o.w ? `--w:${o.w}` : ""].filter(Boolean).join(";");
  return `<path class="eco__wire${o.cls ? " " + o.cls : ""}" data-flow="${flow}"` +
    (o.of ? ` data-of="${o.of}"` : "") + (o.tint ? ` data-tint="${o.tint}"` : "") +
    (o.p ? ` data-p="${esc(JSON.stringify(o.p))}" data-park="${o.park || "0.2 0.8"}"` : "") +
    (o.ppath ? ` data-ppath="${o.ppath}"` : "") +
    (o.grad ? ` data-grad` : "") + (st ? ` style="${st}"` : "") + ` d="${d}"/>`;
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
  const n = count[item.id] || 0, fs = big ? 21 : 15.5, h = big ? 38 : 30;
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
    `<text class="eco__root" x="${cx}" y="${cy + fs * 0.33}" text-anchor="middle" style="font-size:${fs}px">${esc(eco.root)}</text>` +
    `<text class="eco__hint" x="${cx}" y="${cy + fs * 0.33 + fs * 0.75}" text-anchor="middle">(all work)</text></g>`;
}

// the lead resource: its label on the top rail, its wire straight down into the ring. Its wire is
// too short to line its projects up on, so chosen they line up along the top rail to the left of its label.
function leadNode(cx, top, ringTop, mouth, step = 26) {
  // to the label's left: its note goes up on the right
  const x0 = cx - mouth - 16, ppath = `M${x0} ${top}H${x0 - step * share(lead.id).length}`;
  return nodeOpen(lead, "res") +
    `<rect class="eco__hit" x="${cx - 70}" y="${top - 22}" width="140" height="${ringTop - top + 22}"/>` +
    wire(`M${cx} ${top}V${ringTop}`, "in", { tint: "ink", w: weight(lead.id), p: share(lead.id), park: "0 1", ppath }) +
    label(cx, top, lead, "middle", true) + `</g>`;
}

function desc() {
  return `<desc>${esc(eco.root)} at the centre, fed by ${lead.label} from above and by ${rest.map((r) => r.label).join(", ")} from the sides. ` +
         `Out of it run ${eco.threads.map((t) => t.label + (t.note ? " (" + t.note + ")" : "")).join(" and ")}, and the loop returns up both edges to ${lead.label} and the resources.</desc>`;
}

// ---- wide ----
// 960 wide (was 1148): the same page width draws everything a fifth larger, and the wires shorter
function wide() {
  const W = 960, H = 372, cx = W / 2, cy = 168, r = 64, top = 36, xL = 24, xR = W - 24, k = 22;
  const eY = 290, cY = 344, gap = 62, mouth = 70;   // mouth: where the top rail stops short of the lead's label
  const L = rest.slice(0, Math.ceil(rest.length / 2)), R = rest.slice(L.length);

  let s = `<svg class="eco__svg eco__svg--wide" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  s += defs([
    ["eco-w-rail", 0, cY, 0, top, [[0, "--ec-ink", .6], [1, "--ink", .36]]],
    ["eco-w-down", 0, cy + r, 0, cY, [[0, "--ink", .36], [.5, "--ed-ink", .6], [1, "--ec-ink", .6]]],
  ]);

  // ecology down through education to economy, a joint where it meets each
  s += `<g class="eco__loop">` + wire(`M${cx} ${cy + r}V${cY}`, "down", { tint: "ink ed ec", grad: "eco-w-down" }) +
    `<circle class="eco__joint eco__joint--ed" cx="${cx}" cy="${eY}" r="3.5"/><circle class="eco__joint eco__joint--ec" cx="${cx}" cy="${cY}" r="3.5"/></g>`;
  // education spreads out from where the down wire crosses it; its note shows on hover, like the rest
  s += band(xL - 12, xR + 12, eY, 36, ED, "eco__band--ed", "",
    wire(`M${cx} ${eY}H${xL + 60}`, "band", { of: ED.id, tint: "ed", p: share(ED.id, 0), park: "0.06 0.6" }) +
    wire(`M${cx} ${eY}H${xR - 60}`, "band", { of: ED.id, tint: "ed", p: share(ED.id, 1), park: "0.06 0.9" }), 40);
  // economy: out along the bottom, up both edges, across the top into the lead resource; a chevron
  // half way up each edge says which way it runs
  const rail = (x, d) => `M${cx} ${cY}H${x - d * k}Q${x} ${cY} ${x} ${cY - k}V${top + k}Q${x} ${top} ${x - d * k} ${top}H${cx + d * mouth}`;
  const chev = (x) => { const y = (top + cY) / 2; return `<path class="eco__chev" d="M${x - 5} ${y + 3}L${x} ${y - 3}L${x + 5} ${y + 3}"/>`; };
  s += band(xL - 12, xR + 12, cY, 36, EC, "eco__band--ec", verbs,
    wire(rail(xL, -1), "loop", { of: EC.id, tint: "ec ink", grad: "eco-w-rail", cls: "eco__wire--rail", p: share(EC.id, 0), park: "0.06 0.2" }) +
    wire(rail(xR, 1), "loop", { of: EC.id, tint: "ec ink", grad: "eco-w-rail", cls: "eco__wire--rail", p: share(EC.id, 1), park: "0.06 0.2" }) +
    chev(xL) + chev(xR), 40);

  // the other resources branch off the side rails: a dot on the rail, the label on the wire, then a
  // bend into the ring, spread over its height; each wire as heavy as its count
  const side = (list, d) => list.forEach((it, i) => {
    const y = cy + (i - (list.length - 1) / 2) * gap, x0 = d > 0 ? xL : xR;
    const dy = (y - cy) * 0.45, ay = cy + dy, ax = cx - d * Math.sqrt(r * r - dy * dy), m = x0 + d * 236;
    s += nodeOpen(it, "res");
    s += `<rect class="eco__hit" x="${Math.min(x0, m)}" y="${y - 20}" width="296" height="40"/>`;
    s += wire(`M${x0} ${y}H${m}C${m + d * 90} ${y} ${(ax - d * 70).toFixed(1)} ${ay} ${ax.toFixed(1)} ${ay}`, "in",
      { tint: "ink", w: weight(it.id), p: share(it.id), park: "0.5 0.94" });
    s += `<circle class="eco__end" cx="${x0}" cy="${y}" r="3.5"/>`;
    s += label(x0 + d * 92, y, it, d > 0 ? "start" : "end");
    s += `</g>`;
  });
  side(L, 1);
  side(R, -1);

  s += leadNode(cx, top, cy - r, mouth);
  s += ring(cx, cy, r, 32);
  return s + `</svg>`;
}

// ---- tall: the phone. A plain tree: the ring at the top (the lead above it, as on the wide
// drawing), a spine down its left, one row per resource off the spine, each wire as long and as
// heavy as its count, and education and economy across the foot. ----
function tall() {
  const W = 360, cx = 180, cy = 100, r = 46, top = 22, sx = 22, xR = W - 14, x1 = 236;
  const n = rest.length, ys = rest.map((_, i) => 190 + i * 44);
  const eY = ys[n - 1] + 56, cY = eY + 46, H = cY + 22;
  const most = Math.max(1, ...rest.map((it) => count[it.id] || 0));

  let s = `<svg class="eco__svg eco__svg--tall" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  // the spine: out of the ring's lower left, down past every row to economy
  const a = Math.PI * 0.75, ax = cx + r * Math.cos(a), ay = cy + r * Math.sin(a);
  s += `<g class="eco__loop"><path class="eco__spine" d="M${ax.toFixed(1)} ${ay.toFixed(1)}Q${sx} ${(ay + 4).toFixed(1)} ${sx} ${(ay + 50).toFixed(1)}V${cY}"/>` +
    `<circle class="eco__joint eco__joint--ed" cx="${sx}" cy="${eY}" r="3.5"/><circle class="eco__joint eco__joint--ec" cx="${sx}" cy="${cY}" r="3.5"/></g>`;
  s += band(2, W - 2, eY, 32, ED, "eco__band--ed", "",
    wire(`M${xR - 10} ${eY}H${sx}`, "band", { of: ED.id, tint: "ed", p: share(ED.id), park: "0.04 0.5" }), 30);
  s += band(2, W - 2, cY, 32, EC, "eco__band--ec", "",
    wire(`M${xR - 10} ${cY}H${sx}`, "band", { of: EC.id, tint: "ec", p: share(EC.id), park: "0.04 0.5" }), 30);

  rest.forEach((it, i) => {
    const y = ys[i], c = count[it.id] || 0, xe = Math.round(x1 + (xR - x1) * c / most);
    s += nodeOpen(it, "res");
    s += `<rect class="eco__hit" x="0" y="${y - 20}" width="${W}" height="40"/>`;
    // the dots run in along the row to the spine
    s += wire(`M${xe} ${y}H${sx}`, "in", { tint: "ink", w: weight(it.id), p: share(it.id), park: "0.03 0.32" });
    s += `<circle class="eco__end" cx="${sx}" cy="${y}" r="3.5"/>`;
    s += label(sx + 22, y, it, "start");
    s += `</g>`;
  });

  s += leadNode(cx, top, cy - r, 40, 18);
  s += ring(cx, cy, r, 26);
  return s + `</svg>`;
}

// ---- the work over time (2026-10-13): under the loop, one dot per project at its date, stacked
// where they fall close. Linked both ways in main.js: a chosen or hovered topic lights its years, and
// a dot under the pointer names its project and lights its resources and its dots on every wire. ----
function time(W, x0, x1, step, gap, short) {
  const y0 = Math.floor(Math.min(...projs.map((p) => p.at))), y1 = Math.floor(Math.max(...projs.map((p) => p.at))) + 1;
  const X = (a) => x0 + (x1 - x0) * (a - y0) / (y1 - y0);
  // stack: each dot takes the lowest level with no neighbour closer than `gap`
  const placed = [];
  projs.slice().sort((a, b) => a.at - b.at).forEach((p) => {
    const x = X(p.at); let k = 0;
    while (placed.some((q) => q.k === k && Math.abs(q.x - x) < gap)) k++;
    placed.push({ p, x, k });
  });
  const top = Math.max(...placed.map((q) => q.k)), ax = 18 + (top + 1) * step, H = ax + 24;
  let s = `<svg class="eco__time eco__time--${short ? "tall" : "wide"}" viewBox="0 0 ${W} ${H}" role="img" ` +
    `aria-label="the work by year: ${projs.length} projects, ${y0} to ${y1 - 1}">`;
  s += `<text class="eco__tlabel" x="${x0}" y="11">(by year)</text>`;
  s += `<path class="eco__axis" d="M${x0} ${ax}H${x1}"/>`;
  for (let y = y0; y <= y1; y++) {
    s += `<path class="eco__tick" d="M${X(y).toFixed(1)} ${ax - 3}V${ax + 3}"/>`;
    if (y < y1) s += `<text class="eco__year" x="${X(y + 0.5).toFixed(1)}" y="${ax + 17}" text-anchor="middle">${short ? "’" + String(y).slice(2) : y}</text>`;
  }
  placed.forEach(({ p, x, k }) => {
    s += `<circle class="eco__yr" cx="${x.toFixed(1)}" cy="${ax - 9 - k * step}" r="4.4" data-title="${esc(p.title)}" data-url="${p.url}" ` +
      `data-topics="${p.topics.join(" ")}" data-year="${Math.floor(p.at)}"/>`;
  });
  return s + `</svg>`;
}

module.exports = { wide: wide(), tall: tall(), timeWide: time(960, 24, 936, 11, 10.5), timeTall: time(360, 14, 346, 11, 10.5, true), count, work };
