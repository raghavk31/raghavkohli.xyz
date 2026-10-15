/* ui.js — what every chapter of Climate Code draws with: number formats, the map's colour ramps, and
   small HTML charts (bars, a month row, a sparkline) that take their colours from the site's tokens. */

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const lc = (s) => String(s ?? "").toLowerCase();
export const ok = (v) => v !== null && v !== undefined && !Number.isNaN(v);
export const fmt = (v, d = 0) => ok(v)
  ? Number(v).toLocaleString("en-GB", { maximumFractionDigits: d, minimumFractionDigits: d }) : "–";
/* 1 234 567 → "1.2 m"; for people and money, where the third digit is noise */
export const big = (n) => !ok(n) ? "–" : Math.abs(n) >= 1e9 ? fmt(n / 1e9, 1) + " bn"
  : Math.abs(n) >= 1e6 ? fmt(n / 1e6, 1) + " m" : Math.abs(n) >= 1e4 ? fmt(n / 1e3, 0) + "k"
  : Math.abs(n) >= 1e3 ? fmt(n / 1e3, 1) + "k" : fmt(n);
export const usd = (n) => ok(n) ? "$" + big(n).replace(" ", "") : "–";
export const ordinal = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
export const dark = () => document.documentElement.dataset.theme === "dark";

/* Sequential: the reference data-viz palette's blue, steps 100 → 700. In dark mode the anchor flips,
   so "little" recedes into the dark paper and "a lot" is the brightest step. */
const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
/* Diverging: red (lost) ↔ a grey midpoint ↔ blue (gained), three steps an arm, stepped again for dark. */
const DIV = ["#b8322f", "#e2706a", "#f3b5ae", "#e4e2db", "#b7d3f6", "#5598e7", "#1c5cab"];
const DIV_DARK = ["#f08a84", "#c2504c", "#6e3331", "#383835", "#1c4a85", "#3987e5", "#9ec5f4"];
/* Categorical, for the few point layers (≤ 3 kinds, the count the palette validates all-pairs). */
export const CAT = () => dark() ? ["#3987e5", "#d95926", "#199e70"] : ["#2a78d6", "#eb6834", "#1baf7a"];

/* the colour of class i of n: spread across the ramp so four classes use steps 100/300/500/700 */
export function classColour(i, n, diverging = false) {
  if (diverging) return (dark() ? DIV_DARK : DIV)[Math.round(i * 6 / Math.max(1, n - 1))];
  const k = n === 1 ? 3 : Math.round(i * 6 / (n - 1));
  return dark() ? SEQ[6 - k] : SEQ[k];
}
/* The city tiles' ramp. The class where nothing is wrong is a near-neutral paper grey, so the eye goes to
   the exceptions: the cells that miss a bus, flood, or have no food near. The other classes are blue, on
   light from step 300 to 700, on dark from step 600 up to 100, so "worse" is always the strongest colour.
   Five classes at most. `good` says which end is fine: "low" (minutes, runoff, traffic: the first class
   is neutral) or "high" (daily needs reached: the last class is). */
const TILE = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"];
const TILE_DARK = ["#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef", "#9ec5f4", "#b7d3f6", "#cde2fb"];
const FINE = "#dcd9cf", FINE_DARK = "#3a3936";
export function cellRamp(n, good = "low") {
  if (n > 5) throw new Error(`a tile layer holds five classes, not ${n}`);
  const r = (dark() ? TILE_DARK : TILE).slice(dark() ? 2 : 1), fine = dark() ? FINE_DARK : FINE;
  if (n === 1) return [r[Math.floor(r.length / 2)]];
  const blues = Array.from({ length: n - 1 }, (_, i) => r[n === 2 ? r.length - 1 : Math.round(i * (r.length - 1) / (n - 2))]);
  return good === "high" ? [...blues.reverse(), fine] : [fine, ...blues];
}
/* class index of v against ascending breaks: below breaks[0] → 0 */
export const classOf = (v, breaks) => breaks.filter((b) => v >= b).length;

/* a headline number and what it is */
export const stat = (value, label, sub) =>
  `<div class="cc-stat"><span class="cc-stat__v">${value}</span><span class="cc-stat__l">${label}</span>${sub ? `<span class="cc-stat__s">${sub}</span>` : ""}</div>`;

/* label / value rows */
export const dl = (rows) => `<dl class="cc-dl">${rows.filter(Boolean).map(([k, v]) =>
  `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;

/* horizontal bars, one series, values against a shared max; rows = [label, value, suffix] */
export function bars(rows, { max = 100, d = 0 } = {}) {
  const top = Math.max(max, ...rows.map((r) => (ok(r[1]) ? r[1] : 0)));
  return `<div class="cc-bars">${rows.map(([l, v, u = ""]) => `
    <div class="cc-bar" title="${esc(l)}: ${fmt(v, d)}${esc(u)}">
      <span class="cc-bar__l">${l}</span>
      <span class="cc-bar__t"><i style="width:${ok(v) ? Math.max(0, v) / top * 100 : 0}%"></i></span>
      <span class="cc-bar__v">${fmt(v, d)}${u}</span>
    </div>`).join("")}</div>`;
}

/* a row of columns (months, days); `ref` draws a dashed line across at that value, named `refLabel` */
export function columns(values, labels, { unit = "", d = 1, ref, refLabel = "", hi } = {}) {
  const top = Math.max(...values.filter(ok), ok(ref) ? ref : 0) * 1.08 || 1;
  const cols = values.map((v, i) => `
    <span class="cc-col${hi && hi(v, i) ? " is-hi" : ""}" title="${esc(labels[i])}: ${fmt(v, d)}${esc(unit)}">
      <i style="height:${ok(v) ? Math.max(0, v) / top * 100 : 0}%"></i><b>${esc(labels[i])}</b>
    </span>`).join("");
  const line = ok(ref) ? `<span class="cc-cols__ref" style="bottom:${ref / top * 100}%"><em>${esc(refLabel)}</em></span>` : "";
  return `<div class="cc-cols" role="img" aria-label="${esc(values.map((v, i) => labels[i] + " " + fmt(v, d)).join(", "))}">${cols}${line}</div>`;
}

/* a small line over time: values (some may be null) at labels; first and last labelled */
export function spark(values, labels, { unit = "", d = 0 } = {}) {
  const pts = values.map((v, i) => [i, v]).filter((p) => ok(p[1]));
  if (pts.length < 2) return "";
  const W = 300, H = 64, P = 6;
  const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  const x = (i) => P + i / (values.length - 1) * (W - 2 * P);
  const y = (v) => hi === lo ? H / 2 : H - P - (v - lo) / (hi - lo) * (H - 2 * P);
  const path = pts.map((p, k) => `${k ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
  const [f, l] = [pts[0], pts[pts.length - 1]];
  return `<figure class="cc-spark"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="${esc(labels[f[0]])} ${fmt(f[1], d)}${unit} to ${esc(labels[l[0]])} ${fmt(l[1], d)}${unit}">
      <path d="${path}" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(l[0])}" cy="${y(l[1])}" r="3"/></svg>
    <figcaption><span>${esc(labels[f[0]])} · ${fmt(f[1], d)}${unit}</span><span>${esc(labels[l[0]])} · ${fmt(l[1], d)}${unit}</span></figcaption></figure>`;
}

/* small round buttons in a row; `on` is the pressed value */
export const pills = (items, on, attr) => `<div class="cc-pills" role="group">${items.map(([v, l]) =>
  `<button type="button" ${attr}="${esc(v)}" aria-pressed="${String(v) === String(on)}">(${l})</button>`).join("")}</div>`;

export const note = (s) => `<p class="cc-note">${s}</p>`;
export const loading = (what) => `<p class="cc-note cc-note--wait">(reading ${what} …)</p>`;
export const failed = (what) => `<p class="cc-note">(${what} did not answer. Try again in a minute, or pick another place.)</p>`;
