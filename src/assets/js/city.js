/* The homepage drawn over a real city in plan, as characters on a fixed canvas behind everything.
   Each city is a 5.6 x 8.3 km window from scripts/make-city-map.py (OpenStreetMap + Sentinel-2):
   blocks, streets left as paper, green, sand, still water, the sea, and rivers whose current runs the
   way the river really flows. The map scrolls with the page, slower than it. The cities are the ones
   in Raghav's story; the label at the top right names the one showing and moves to the next.
   The ecology diagram's nodes bring one system forward; the map stays out from under the words. */
(function () {
  "use strict";
  var FONT = 13, LH = 16, TICK = 150, SEED = 20261005, BASE = "/assets/js/cities/";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // three looks after the references (2026-10-09), all on by default; ?look= picks some of them to compare
  // (?look=- for none):
  //   a  halftone: green and river glyphs sized by how green / how wet the satellite saw each cell
  //   b  contours: the ground's height as dashed hairlines, every fifth one darker
  //   c  one colour: only water keeps its tint, the green goes to ink
  //   d  flowing water: every water cell a short bowed stroke, along the current on the river, rocking on the sea
  var LOOK = (new URLSearchParams(location.search).get("look") || "abcd").toLowerCase();
  var HALF = LOOK.indexOf("a") >= 0, CONT = LOOK.indexOf("b") >= 0, MONO = LOOK.indexOf("c") >= 0, FLOWY = LOOK.indexOf("d") >= 0;
  var FIELDS = HALF || CONT;

  var cv = document.createElement("canvas");
  cv.className = "city";
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d");

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263 + SEED) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }

  // layers: 1 mobility, 2 water, 3 buildings, 7 green (air)
  // letters: s street, l lane, r rail, 0-9 A-F river (sixteenths of a turn it flows to, 0 = north),
  // a sand, k still water, e open water, f wood, g green, t a tree, o open ground, b a block
  var cw = 8, cols = 0, rows = 0, ch = [], ly, riv, FX, FY, BANK, roads = [], X0 = 0, OX = 0, city = null;
  var HEX = "0123456789ABCDEF";
  var GV, WV, SEGS = [], MX = 30, MY = 60;
  function build(data) {
    var txt = data.t, F = data.f;
    ctx.font = FONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    cw = ctx.measureText("M").width;
    var L = txt.split(/\r?\n/); rows = L.length; cols = L[0].length;
    var n = cols * rows; ch = new Array(n); ly = new Uint8Array(n); riv = new Uint8Array(n);
    GV = new Uint8Array(n); WV = new Uint8Array(n); SEGS = [];
    if (F) {
      for (var fy = 0; fy < rows; fy++) for (var fx = 0; fx < cols; fx++) { GV[fy * cols + fx] = +F.g[fy][fx]; WV[fy * cols + fx] = +F.w[fy][fx]; }
      if (CONT) contours(heights(F));
    }
    FX = new Float32Array(n); FY = new Float32Array(n); roads = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var k = y * cols + x, c = L[y][x], h = hash(x, y), g = " ", l = 0, d = HEX.indexOf(c);
      if (d >= 0) { g = "~"; l = 2; riv[k] = 1; FX[k] = Math.sin(d * Math.PI / 8); FY[k] = -Math.cos(d * Math.PI / 8); }
      else if (c === "b") { g = h < .15 ? ":" : "⁝"; l = 3; }   // a block: a three-dot hatch, a little denser than its lanes
      else if (c === "l") { g = "·"; l = 3; }                    // a lane: one dot, so the streets read between the blocks
      else if (c === "s") { l = 1; roads.push(k); }
      else if (c === "r") { g = "="; l = 1; }
      else if (c === "k") { g = "~"; l = 2; riv[k] = 2; }
      else if (c === "e") { g = "~"; l = 2; riv[k] = 3; }
      else if (c === "a") { l = 2; g = h < .3 ? "." : h < .38 ? "∴" : " "; }
      else if (c === "f") { l = 7; g = h < .42 ? "♣" : h < .6 ? "\"" : " "; }   // a wood: trees close together
      else if (c === "g") { l = 7; g = h < .16 ? "♣" : h < .4 ? "\"" : h < .52 ? "," : " "; }   // a park: grass, a few trees
      else if (c === "t") { l = 7; g = h < .7 ? "♣" : "\""; }
      else if (c === "o") { g = h < .07 ? "." : " "; }   // open ground: almost nothing
      ch[k] = g; ly[k] = l;
    }
    // the current's direction, smoothed over its neighbours so the hatch bends with the river, not in sixteenths
    for (var pass = 0; pass < 3; pass++) {
      var SX = new Float32Array(n), SY = new Float32Array(n);
      for (var q = 0; q < n; q++) { if (riv[q] !== 1) continue; var qx = q % cols, qy = (q / cols) | 0, ax = 0, ay = 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; var nq = ny * cols + nx; if (riv[nq] === 1) { ax += FX[nq]; ay += FY[nq]; } }
        var ln = Math.hypot(ax, ay) || 1; SX[q] = ax / ln; SY[q] = ay / ln; }
      FX = SX; FY = SY;
    }
    // how far each river cell is from its bank, in metres (the window is 5625 m across, 8280 m down)
    MX = 5625 / cols; MY = 8280 / rows;
    BANK = new Float32Array(n).fill(1e9);
    for (var p = 0; p < 2; p++) for (var i = p ? n - 1 : 0; p ? i >= 0 : i < n; p ? i-- : i++) {
      if (riv[i] !== 1) { BANK[i] = 0; continue; }
      var xx = i % cols, b = BANK[i], s = p ? 1 : -1;
      if (xx + s >= 0 && xx + s < cols) b = Math.min(b, BANK[i + s] + MX);
      var j = i + s * cols; if (j >= 0 && j < n) b = Math.min(b, BANK[j] + MY);
      BANK[i] = b;
    }
    X0 = Math.round(Math.min(Math.max(0, cols - innerWidth / cw), Math.max(0, city.fx * cols - innerWidth / cw / 2)));
    OX = Math.max(0, (innerWidth - cols * cw) / 2);   // a screen wider than the map: the map sits in the middle
    seedFlows();
  }

  // heights come as two base-64 characters a cell, 4096 steps between the lowest and highest point
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function heights(F) {
    var z = new Float32Array(cols * rows), k = (F.z1 - F.z0) / 4095;
    for (var y = 0; y < rows; y++) { var r = F.z[y];
      for (var x = 0; x < cols; x++) z[y * cols + x] = F.z0 + (B64.indexOf(r[2 * x]) * 64 + B64.indexOf(r[2 * x + 1])) * k; }
    return z;
  }

  // contours by marching squares over the cell centres: an interval that gives about two dozen lines whatever
  // the relief (flat Ahmedabad 1 m, hilly San Francisco 10 m). The pieces are joined into lines, so the dashes
  // run on along them: SEGS holds [points, every-fifth, top row, bottom row]
  function contours(z) {
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < z.length; i++) { if (z[i] < lo) lo = z[i]; if (z[i] > hi) hi = z[i]; }
    var NICE = [.5, 1, 2, 5, 10, 20, 25, 50, 100], step = 100;
    for (var s = 0; s < NICE.length; s++) if ((hi - lo) / NICE[s] <= 28) { step = NICE[s]; break; }
    var v, pts, pieces;
    function edge(p, q, x0, y0, x1, y1) { if ((p < v) !== (q < v)) { var u = (v - p) / (q - p); pts.push(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); } }
    for (v = Math.ceil(lo / step) * step; v < hi; v += step) {
      if (v <= 0) continue;   // not the sea's edge
      var major = Math.round(v / step) % 5 === 0 ? 1 : 0;
      pieces = [];
      for (var y = 0; y < rows - 1; y++) for (var x = 0; x < cols - 1; x++) {
        var a = z[y * cols + x], b = z[y * cols + x + 1], c = z[(y + 1) * cols + x + 1], d = z[(y + 1) * cols + x];
        pts = [];
        edge(a, b, x, y, x + 1, y); edge(b, c, x + 1, y, x + 1, y + 1); edge(d, c, x, y + 1, x + 1, y + 1); edge(a, d, x, y, x, y + 1);
        for (var p = 0; p + 3 < pts.length; p += 4) pieces.push([pts[p], pts[p + 1], pts[p + 2], pts[p + 3]]);
      }
      chain(pieces, major);
    }
  }
  // neighbouring cells compute a shared crossing identically, so pieces meet at exactly equal points
  function chain(pieces, major) {
    var at = {}, used = new Uint8Array(pieces.length), key = function (x, y) { return x + "," + y; };
    pieces.forEach(function (g, i) { [key(g[0], g[1]), key(g[2], g[3])].forEach(function (q) { (at[q] = at[q] || []).push(i); }); });
    function grow(line, x, y) {   // walk on from (x, y) through unused pieces, appending points
      for (;;) { var next = -1, list = at[key(x, y)] || [];
        for (var j = 0; j < list.length; j++) if (!used[list[j]]) { next = list[j]; break; }
        if (next < 0) return;
        used[next] = 1; var g = pieces[next];
        if (g[0] === x && g[1] === y) { x = g[2]; y = g[3]; } else { x = g[0]; y = g[1]; }
        line.push(x, y); }
    }
    for (var i = 0; i < pieces.length; i++) { if (used[i]) continue; used[i] = 1;
      var g = pieces[i], fwd = [g[0], g[1], g[2], g[3]], back = [];
      grow(fwd, g[2], g[3]); grow(back, g[0], g[1]);
      var line = []; for (var b = back.length - 2; b >= 0; b -= 2) line.push(back[b], back[b + 1]);
      line = line.concat(fwd);
      var lo = Infinity, hi = -Infinity; for (var q = 1; q < line.length; q += 2) { lo = Math.min(lo, line[q]); hi = Math.max(hi, line[q]); }
      SEGS.push([line, major, lo, hi]); }
  }

  // the river runs downstream: streaks travel along the flow, in lanes across it, fastest mid-stream and
  // slack by the banks. Every water cell is drawn faintly so the river reads as one body; the current is
  // the brighter part. Still water just breathes; the sea swells slowly.
  var WA = 1;
  function water(x, y, k) {
    WA = .45;
    var kind = riv[k];
    if (kind === 2) { if (hash(x, y + (t / 24 | 0)) < .15) WA = 1; return "~"; }
    if (kind === 3) { if (hash(x, y) > .55) return null; WA = .3; if (hash(x >> 2, (y + (t / 30 | 0)) >> 1) < .12) WA = .7; return "~"; }
    var bank = BANK[k];
    if (bank <= MX) return hash(x, y) < .4 ? "." : null;   // the edge, slack water
    var mX = x * MX, mY = y * MY, along = mX * FX[k] + mY * FY[k], across = mX * FY[k] - mY * FX[k];
    var sp = Math.min(1, bank / 90), q = hash(Math.round(across / 20), Math.floor((along - t * 9 * sp) / 75));
    if (q < .06 + .06 * sp) { WA = 1; return "≈"; }
    if (q < .25 + .2 * sp) WA = 1;
    return "~";
  }

  // all water, cell by cell. The river: a short stroke along its current, bowed a little to one side; bands of
  // brightness travel downstream, fastest mid-stream and slack by the banks, and the bow ripples as a band
  // passes, so strokes in line read as streamlines (its edge cells stay dots). The sea and lakes: a sparse
  // short bowed stroke, the bow rocking and rows of brighter swell rolling slowly through. Strokes go into
  // buckets by brightness and weight, one path each.
  function swell(x, y, k, cx, cy, out) {
    var ax, ay, len, bow, a, wt = .8;
    if (riv[k] === 1) {
      var bank = BANK[k], mX = x * MX, mY = y * MY, along = mX * FX[k] + mY * FY[k], across = mX * FY[k] - mY * FX[k];
      var sp = Math.min(1, bank / 150), ph = (along - t * 14 * sp) / 140 * 2 * Math.PI + hash(Math.round(across / 40), 7) * 6.283;
      var w = .5 + .5 * Math.sin(ph);
      ax = FX[k]; ay = FY[k];
      len = (6 + 8 * sp) * (HALF ? .7 + .45 * WV[k] / 9 : 1);
      bow = 1.8 * Math.sin(ph * .5 + across / 60);
      a = .22 + .78 * w * w; wt = .7 + .5 * sp;
    } else {
      var still = riv[k] === 2;
      if (hash(x, y) > (still ? .5 : .42)) return;   // the sea is sparse
      var sw = Math.sin(y * .45 + x * .06 - t * (still ? .03 : .06));
      ax = 1; ay = .12 * Math.sin(x * .2 + y);
      len = still ? 6 : 9; bow = (still ? .8 : 1.6) * Math.sin(x * .35 + y * .9 - t * .09);
      a = (still ? .3 : .22) + (still ? .2 : .35) * Math.max(0, sw);
    }
    var key = Math.min(4, Math.round(a * 4)) + "|" + (wt > .95 ? 1 : 0), b = out[key] || (out[key] = []);
    var hx = ax * len / 2, hy = ay * len / 2;
    b.push(cx - hx, cy - hy, cx - ay * bow, cy + ax * bow, cx + hx, cy + hy);
  }
  function swellLines(out, f) {
    ctx.save(); ctx.lineCap = "round";
    for (var key in out) { var b = out[key], m = .15 + .85 * key[0] / 4;
      ctx.lineWidth = key[2] === "1" ? 1.1 : .75;
      ctx.strokeStyle = f === 2 ? rgba(ACC, .5 * m) : rgba(TINT[2], ALPHA[2] * m * (f ? .45 : 1));
      ctx.beginPath();
      for (var j = 0; j < b.length; j += 6) { ctx.moveTo(b[j], b[j + 1]); ctx.quadraticCurveTo(b[j + 2], b[j + 3], b[j + 4], b[j + 5]); }
      ctx.stroke(); }
    ctx.restore();
  }

  // ---------- flows ----------
  var walkers = [], t = 0;
  function seedFlows() {
    var R = rng(SEED + 7);
    walkers = []; for (var i = 0; i < Math.min(1200, roads.length / 16); i++) walkers.push({ k: roads[Math.floor(R() * roads.length)], d: -1 });
  }
  var DX = [0, 0, 1, -1], DY = [-1, 1, 0, 0];
  function step() {
    if (document.body.classList.contains("pv-open") || document.hidden) return;   // still under an open project
    t++;
    walkers.forEach(function (w) {
      var x = w.k % cols, y = (w.k / cols) | 0, opts = [], same = null;
      for (var d = 0; d < 4; d++) { var nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        var nk = ny * cols + nx; if (ly[nk] !== 1) continue;
        if ((d ^ 1) === w.d) continue; opts.push([d, nk]); if (d === w.d) same = [d, nk]; }
      if (!opts.length) { w.d = w.d ^ 1; return; }   // a dead end: turn round
      var pick = same && hash(w.k, t) < .88 ? same : opts[Math.floor(hash(t, w.k) * opts.length)];
      w.d = pick[0]; w.k = pick[1];
    });
    draw();
  }

  // ---------- the diagram brings a system forward ----------
  var MAP = { mobility: 1, water: 2, buildings: 3, air: 7 };
  var hover = null;
  document.addEventListener("mouseover", function (e) { var nd = e.target.closest && e.target.closest("[data-topic]"); hover = nd ? nd.getAttribute("data-topic") : null; draw(); });
  function focus() { var on = hover || ((document.querySelector(".eco__node.on") || {}).dataset || {}).topic; return MAP[on] || 0; }

  // ---------- drawing ----------
  var INK, ACC, TINT;
  // the ink and accent come from the page's colours; water and green are lighter on a dark page
  function palette() {
    var css = getComputedStyle(document.documentElement), dark = document.documentElement.dataset.theme === "dark";
    function rgb(v) { var m = (v || "").match(/\d+/g); if (m && /rgb/.test(v)) return m.slice(0, 3).join(",");
      v = (v || "").trim().replace("#", ""); if (v.length === 3) v = v.replace(/./g, "$&$&"); var n = parseInt(v, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255].join(","); }
    INK = rgb(css.getPropertyValue("--ink")); ACC = rgb(css.getPropertyValue("--accent"));
    TINT = dark ? { 2: "122,162,232", 7: "128,190,136" } : { 2: "60,88,150", 7: "58,110,66" };
  }
  palette();
  document.addEventListener("themechange", function () { palette(); draw(); });
  var ALPHA = [.1, .2, .42, .4, .13, .13, .14, .26];
  function rgba(c, a) { return "rgba(" + c + "," + a.toFixed(3) + ")"; }
  function draw() {
    var dpr = window.devicePixelRatio || 1, iw = innerWidth, ih = innerHeight;
    if (cv.width !== Math.round(iw * dpr) || cv.height !== Math.round(ih * dpr)) { cv.width = Math.round(iw * dpr); cv.height = Math.round(ih * dpr); cv.style.width = iw + "px"; cv.style.height = ih + "px"; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, iw, ih);
    if (!rows) return;
    ctx.font = FONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    var f = focus(), sy = window.scrollY, vis = Math.ceil(ih / LH) + 1, last = null;
    var top = Math.min(1, sy / Math.max(1, document.documentElement.scrollHeight - ih)) * Math.max(0, rows - ih / LH);
    var r0 = Math.floor(top), off = -(top - r0) * LH, x1 = Math.min(cols, X0 + Math.ceil(iw / cw) + 1);
    function style(l, m) { var a = ALPHA[l] * m, c = (MONO && l === 7 ? INK : TINT[l]) || INK; if (!f) return rgba(c, a); if (l === f) return rgba(ACC, .5 * m); return rgba(c, a * .45); }
    if (CONT && SEGS.length) contourLines(r0, vis, off, x1, f);
    var half = HALF ? [[], [], [], []] : null, sea = FLOWY ? {} : null;
    for (var r = 0; r < vis; r++) { var y = r0 + r; if (y >= rows) break;
      var py = r * LH + off, base = y * cols;
      for (var x = X0; x < x1; x++) { var k = base + x, c = ch[k]; if (c === " ") continue;
        var m = c === "·" ? .5 : 1;   // a lane is lighter than the blocks either side of it
        if (sea && (riv[k] > 1 || (riv[k] === 1 && BANK[k] > MX))) { swell(x, y, k, OX + (x - X0 + .5) * cw, py + LH / 2, sea); continue; }
        if (riv[k]) { c = water(x, y, k); if (!c) continue; m = WA; }
        var s = style(ly[k], m);
        if (half && (ly[k] === 7 || riv[k] === 1)) {   // halftone: the same glyph, bigger where greener or wetter
          var v = ly[k] === 7 ? GV[k] : WV[k] * Math.min(1, BANK[k] / 60);
          half[v < 3 ? 0 : v < 5 ? 1 : v < 7 ? 2 : 3].push(c, OX + (x - X0 + .5) * cw, py + LH / 2, s); continue; }
        if (s !== last) { ctx.fillStyle = s; last = s; }
        ctx.fillText(c, OX + (x - X0) * cw, py); } }
    if (half) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      [7, 10, 13, 17].forEach(function (px, i) { var b = half[i]; ctx.font = px + "px 'IBM Plex Mono', ui-monospace, monospace";
        for (var j = 0; j < b.length; j += 4) { if (b[j + 3] !== last) { ctx.fillStyle = b[j + 3]; last = b[j + 3]; } ctx.fillText(b[j], b[j + 1], b[j + 2]); } });
      ctx.textAlign = "start"; ctx.textBaseline = "top"; ctx.font = FONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    }
    if (FLOWY) swellLines(sea, f);
    walkers.forEach(function (w) { var y = (w.k / cols) | 0; if (y < r0 || y >= r0 + vis) return;
      ctx.fillStyle = f === 1 ? rgba(ACC, .9) : rgba(INK, f ? .15 : .38);
      ctx.fillText("•", OX + (w.k % cols - X0) * cw, (y - r0) * LH + off); });
    clear(ih);
  }

  // the contours: dashed hairlines through the cell centres, under the glyphs, every fifth longer and darker
  function contourLines(r0, vis, off, x1, f) {
    var top = r0 - 1, bot = r0 + vis + 1;
    ctx.save();
    [0, 1].forEach(function (major) {
      ctx.beginPath();
      for (var i = 0; i < SEGS.length; i++) { var g = SEGS[i]; if (g[1] !== major || g[3] < top || g[2] > bot) continue;
        var P = g[0]; ctx.moveTo(OX + (P[0] - X0 + .5) * cw, (P[1] - r0 + .5) * LH + off);
        for (var p = 2; p < P.length; p += 2) ctx.lineTo(OX + (P[p] - X0 + .5) * cw, (P[p + 1] - r0 + .5) * LH + off); }
      ctx.setLineDash(major ? [7, 4] : [3, 4]);
      ctx.lineWidth = major ? .9 : .6;
      ctx.strokeStyle = rgba(INK, (major ? .4 : .26) * (f ? .5 : 1));
      ctx.stroke();
    });
    ctx.restore();
  }

  // the city stays out from under the words and the work: it shows in the margins and the gaps between
  var CLEAR = [[".work__head .eyebrow, .work__name, .work__why, .work__index, .work__filterbar, .work__break, .card__frame, .card figcaption, .about .reveal > *, .contact__row, .contact__fine, .dock, .pin", 1], [".eco", .7]];
  function clear(ih) {
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    if ("filter" in ctx) ctx.filter = "blur(12px)";
    CLEAR.forEach(function (c) { ctx.globalAlpha = c[1];
      document.querySelectorAll(c[0]).forEach(function (el) { var r = el.getBoundingClientRect();
        if (!r.width || r.bottom < -40 || r.top > ih + 40) return;
        ctx.fillRect(r.left - 18, r.top - 14, r.width + 36, r.height + 28); }); });
    ctx.restore();
  }

  // ---------- which city: the label names it, a click moves to the next (a shuffled order, every city once) ----------
  var cities = [], deck = [], texts = {}, busy = false;
  var pick = document.createElement("button");
  pick.type = "button"; pick.className = "city-pick";
  var dock = document.querySelector("[data-dock]");
  if (dock) dock.insertBefore(pick, dock.firstChild); else document.body.appendChild(pick);
  function label() {
    var ns = city.lat >= 0 ? "N" : "S", ew = city.lon >= 0 ? "E" : "W";
    pick.innerHTML = "(" + city.name + " <span class=\"city-pick__r\" aria-hidden=\"true\">↻</span>)";
    pick.title = Math.abs(city.lat).toFixed(2) + "°" + ns + " " + Math.abs(city.lon).toFixed(2) + "°" + ew + " · another city";
    pick.setAttribute("aria-label", "the map behind the page is " + city.name + "; show another city");
  }
  function load(c) {
    if (texts[c.slug]) return Promise.resolve(texts[c.slug]);
    var f = FIELDS ? fetch(BASE + c.slug + ".f.json").then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }) : null;   // only some cities have fields yet
    return Promise.all([fetch(BASE + c.slug + ".txt").then(function (r) { return r.text(); }), f])
      .then(function (r) { return (texts[c.slug] = { t: r[0].trim(), f: r[1] }); });
  }
  function show(c) {
    busy = true; cv.classList.add("is-out");
    return Promise.all([load(c), new Promise(function (ok) { setTimeout(ok, reduce ? 0 : 280); })]).then(function (r) {
      city = c; build(r[0]); label(); draw(); cv.classList.remove("is-out"); busy = false;
    }, function () { cv.classList.remove("is-out"); busy = false; });
  }
  pick.addEventListener("click", function () {
    if (busy || cities.length < 2) return;
    if (!deck.length) { var R = rng(Date.now()); deck = cities.filter(function (c) { return c !== city; });
      for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp; } }
    show(deck.shift());
  });

  var raf = 0;
  window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }, { passive: true });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (city) { build(texts[city.slug]); draw(); } }, 200); });
  var ready = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.all([ready, fetch(BASE + "index.json").then(function (r) { return r.json(); })]).then(function (r) {
    cities = r[1]; var at = new URLSearchParams(location.search).get("at"); city = cities.filter(function (c) { return c.slug === at; })[0] || cities[0];
    return load(city).then(function (s) { build(s); label(); draw(); if (!reduce) setInterval(step, TICK); });
  });
})();
