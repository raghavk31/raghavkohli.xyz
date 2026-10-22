// The homepage diagram, drawn at build time from ecology.js. Two drawings: `wide` and `tall` (the
// phone). Every resource and thread is a focusable node with data-topic, wired to the grid filter;
// ecology is the reset. Counts are the grid's own projects tagged with that topic. main.js runs dots
// along every wire (.eco__wire), tinted by data-tint (ink, violet for education, green for economy).
// The wide drawing (2026-10-23) is a row of resources with the work hanging from it, down to ecology
// at the foot; its projects are words that open them. See wide() below.
// The phone drawing is a plain tree: the lead above the ring, a spine down from it, one row per
// resource, each wire as long and heavy as its count; every dot on a topic's wire is one of its
// projects (data-p, [title, url] each; main.js parks them on the wire when the topic is chosen, and
// a parked dot names its project and opens it).
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const eco = require("./ecology.js");
const groups = require("./groups.js");
const sets = require("./sets.js");

// ---- counts: projects on the homepage grid, by topic (a set counts as its plans) ----
const order = groups.flatMap((g) => g[1]).flatMap((t) => (sets[t] ? sets[t].plans : [t]));
const onGrid = new Set(order);
const dir = path.join(__dirname, "..", "projects");
const count = {}, work = {}, page = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const d = matter(fs.readFileSync(path.join(dir, f), "utf8")).data;
  if (!onGrid.has(d.title)) continue;
  const url = `/work/${f.replace(/\.md$/, "").replace(/^\d+-/, "")}/`;
  for (const t of d.topics || []) { count[t] = (count[t] || 0) + 1; (work[t] = work[t] || []).push([d.title, url]); }
  page[d.title] = { topics: d.topics || [], url };
}
// the wide drawing's words: every card on the grid in its order, a set as one (its plans' topics, its tray)
const pieces = groups.flatMap((g) => g[1]).map((t) => sets[t]
  ? { title: t, name: `${t.toLowerCase()} ×${sets[t].plans.length}`, url: `#set-${sets[t].id}`, topics: [...new Set(sets[t].plans.flatMap((q) => page[q].topics))] }
  : { title: t, name: t.toLowerCase(), url: page[t].url, topics: page[t].topics });
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
// where they line up when the topic is chosen, clear of its label; `w` its weight; `n` how many
// plain dots run on it (else one every 110px); `pw` the project words it leads to (the wide drawing).
function wire(d, flow, o = {}) {
  const st = [o.grad ? `--g:url(#${o.grad})` : "", o.w ? `--w:${o.w}` : ""].filter(Boolean).join(";");
  return `<path class="eco__wire${o.cls ? " " + o.cls : ""}" data-flow="${flow}"` +
    (o.of ? ` data-of="${o.of}"` : "") + (o.tint ? ` data-tint="${o.tint}"` : "") +
    (o.p ? ` data-p="${esc(JSON.stringify(o.p))}" data-park="${o.park || "0.2 0.8"}"` : "") +
    (o.ppath ? ` data-ppath="${o.ppath}"` : "") + (o.n ? ` data-n="${o.n}"` : "") + (o.pw ? ` data-pw="${o.pw}"` : "") +
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

// ---- wide: the row and what hangs from it (2026-10-23, mock C, from his environment / architecture /
// body+mind reference). The resources in a row, the lead in the middle. Economy loops over the row and
// back, education is a dotted axis under it, with the projects that are only education sitting on it.
// Every project hangs from the resources it draws on: on one, it is listed off that resource's stem;
// on more, it hangs lower the more it draws on, where a line down from each of them meets it. Ecology
// is at the foot, where it all ends up, and is the reset. Each line is a wire inside its resource's
// node (so the resource lights its lines and main.js runs one dot down it) and names the projects it
// serves (data-pw), so a project word lights its own lines.
function wide() {
  const W = 1120, H = 700, top = 34, rowY = 118, axY = 164, xL = 40, xR = W - 40, x0 = 110, x1 = 940, k = 26;
  const half = Math.ceil(rest.length / 2), row = rest.slice(0, half).concat([lead], rest.slice(half));
  const rx = {}; row.forEach((r, i) => (rx[r.id] = x0 + (i * (x1 - x0)) / (row.length - 1)));
  const on = (p) => row.map((r) => r.id).filter((t) => p.topics.includes(t));
  const ps = pieces.map((p, i) => ({ ...p, i, res: on(p) }));
  const fs = 12.5, tw = (s) => s.length * fs * 0.5;
  const pw = (p, x, y, anchor) => `<a class="eco__pw" href="${p.url}" data-pw="${p.i}" data-ts="${p.topics.join(" ")}" aria-label="${esc(p.title)}">` +
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}"${anchor ? ` text-anchor="${anchor}"` : ""}>${esc(p.name)}</text></a>`;
  // a project that also runs on a thread says so after its name
  const also = (p, x, y, anchor) => [ED, EC].filter((t) => p.topics.includes(t.id)).map((t, j) =>
    `<text class="eco__also eco__also--${t === ED ? "ed" : "ec"}" x="${x.toFixed(1)}" y="${(y + j * 12).toFixed(1)}"${anchor ? ` text-anchor="${anchor}"` : ""}>+ ${esc(t.label)}</text>`).join("");

  let s = `<svg class="eco__svg eco__svg--wide" viewBox="0 0 ${W} ${H}" role="group" aria-label="what the work is for">${desc()}`;
  // economy: up from the row's ends, over the top and back, an arrow the way it returns
  const loop = `M${xR} ${rowY}V${top + k}Q${xR} ${top} ${xR - k} ${top}H${xL + k}Q${xL} ${top} ${xL} ${top + k}V${rowY}`;
  s += band(xL - 12, xR + 12, top, 32, EC, "eco__band--ec", verbs,
    wire(loop, "loop", { of: EC.id, tint: "ec", cls: "eco__wire--rail" }) +
    `<path class="eco__chev eco__chev--l" d="M${W / 2 + 4} ${top - 5}L${W / 2 - 3} ${top}L${W / 2 + 4} ${top + 5}"/>`, 40)
    .replace('class="eco__band eco__band--ec"', 'class="eco__band eco__band--ec" data-below');   // its note goes under it, not over the statement
  s += `<path class="eco__spine" d="M${xL} ${rowY}H${xR}"/>`;
  // education: a dotted axis, out both ways
  s += band(xL - 12, xR + 12, axY, 28, ED, "eco__band--ed", "",
    wire(`M${xL} ${axY}H${xR}`, "band", { of: ED.id, tint: "ed", cls: "eco__wire--dot" }) +
    `<path class="eco__chev eco__chev--ed" d="M${xL + 6} ${axY - 4}L${xL - 1} ${axY}L${xL + 6} ${axY + 4}M${xR - 6} ${axY - 4}L${xR + 1} ${axY}L${xR - 6} ${axY + 4}"/>`, 16);

  // where every project goes
  const single = {}, many = [], edOnly = [];
  ps.forEach((p) => (p.res.length === 1 ? (single[p.res[0]] = single[p.res[0]] || []).push(p) : p.res.length ? many.push(p) : edOnly.push(p)));
  const sTop = axY + 38, sGap = 19;
  // more than one: lower the more it draws on, under the middle of its resources, kept apart on a row
  const rows = {};
  many.forEach((p) => { const n = p.res.length; p.y = 300 + (n - 2) * 56; p.x = p.res.reduce((a, t) => a + rx[t], 0) / n; (rows[n] = rows[n] || []).push(p); });
  for (const n in rows) {
    const r = rows[n].sort((a, b) => a.x - b.x);
    for (let it = 0; it < 60; it++) for (let j = 1; j < r.length; j++) {
      const need = (tw(r[j - 1].name) + tw(r[j].name)) / 2 + 36, gap = r[j].x - r[j - 1].x;
      if (gap < need) { r[j - 1].x -= (need - gap) / 2; r[j].x += (need - gap) / 2; }
    }
  }

  // the resources, each with its lines
  row.forEach((it) => {
    const x = rx[it.id], y0 = rowY + 16, list = single[it.id] || [];
    s += nodeOpen(it, "res") + `<rect class="eco__hit" x="${x - 62}" y="${rowY - 20}" width="124" height="40"/>`;
    if (list.length) {
      const yl = sTop + (list.length - 1) * sGap;
      s += wire(`M${x} ${y0}V${yl}`, "in", { tint: "ink", cls: "eco__edge", n: 1, pw: list.map((p) => p.i).join(" ") });
      list.forEach((p, j) => (s += `<path class="eco__edge eco__tick" data-pw="${p.i}" d="M${x} ${sTop + j * sGap}H${x + 9}"/>`));
    }
    many.filter((p) => p.res.includes(it.id)).forEach((p) => {
      const ey = p.y - 15, m = (y0 + ey) / 2;
      s += wire(`M${x} ${y0}C${x} ${m + 20} ${p.x.toFixed(1)} ${m} ${p.x.toFixed(1)} ${ey}`, "in", { tint: "ink", cls: "eco__edge", n: 1, pw: "" + p.i });
    });
    s += label(x, rowY, it, "middle", it.lead) + `</g>`;
  });

  // the words, over every line
  for (const t in single) single[t].forEach((p, j) => {
    const x = rx[t] + 13, y = sTop + j * sGap + 4;
    s += pw(p, x, y, "") + also(p, x + tw(p.name) + 12, y);
  });
  many.forEach((p) => (s += pw(p, p.x, p.y, "middle") + also(p, p.x, p.y + 14, "middle")));
  const slots = [(rx[row[half - 1].id] + rx[lead.id]) / 2, (rx[lead.id] + rx[row[half + 1].id]) / 2, (rx[row[row.length - 2].id] + rx[row[row.length - 1].id]) / 2];
  edOnly.forEach((p, j) => {
    const x = slots[j % slots.length], w = tw(p.name) + 24;
    s += `<rect class="eco__chip" x="${(x - w / 2).toFixed(1)}" y="${axY - 10}" width="${w.toFixed(1)}" height="20"/>` +
      `<path class="eco__tick eco__tick--ed" d="M${(x - w / 2 + 4).toFixed(1)} ${axY - 6}V${axY + 6}M${(x + w / 2 - 4).toFixed(1)} ${axY - 6}V${axY + 6}"/>` + pw(p, x, axY + 4, "middle");
  });

  // ecology at the foot, a bracket gathering everything above into it; the way back to all work
  const by = Math.max(...many.map((p) => p.y), sTop) + 50, fy = by + 36;
  s += `<path class="eco__spine" d="M150 ${by - 18}V${by}Q150 ${by + 22} 172 ${by + 22}H${W / 2 - 66}M${W - 150} ${by - 18}V${by}Q${W - 150} ${by + 22} ${W - 172} ${by + 22}H${W / 2 + 66}"/>`;
  s += `<g class="eco__tile" data-eco-home role="button" tabindex="0" aria-label="${esc(eco.root)}: show all work">` +
    `<rect class="eco__hit" x="${W / 2 - 70}" y="${fy - 36}" width="140" height="64"/>` +
    `<text class="eco__root" x="${W / 2}" y="${fy}" text-anchor="middle" style="font-size:30px">${esc(eco.root)}</text>` +
    `<text class="eco__hint" x="${W / 2}" y="${fy + 20}" text-anchor="middle">(all work)</text></g>`;
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

module.exports = { wide: wide(), tall: tall(), count, work };
