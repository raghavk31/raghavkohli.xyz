/* The homepage as an abstract ASCII city in plan, drawn on a fixed canvas behind everything.
   Plan view on the character grid, but no gridiron: long roads that jog, lanes that branch at right
   angles, turn, meet at T-junctions or dead-end. Buildings line the frontages, shaded by how dense
   that part of the city is; courtyards, parks, fields and a little waste fill what is left. A river
   meanders down the page. Slow flows: people, waste, the river, pulses on power lines, air. The
   ecology diagram's nodes bring one system forward.
   Mockup switch (branch ascii-city): ?city=a clears the city from under the content; ?city=b also draws
   it as figure-ground (blocks of one glyph, streets left empty); ?city=c swaps the generated city for
   Ahmedabad along the Sabarmati (city-ahmedabad.txt, built by scripts/make-city-map.py). */
(function () {
  "use strict";
  var FONT = 13, LH = 16, TICK = 150, SEED = 20261005;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MODE = (location.search.match(/[?&]city=([abc])/) || [])[1] || "", MAPTXT = null, X0 = 0;

  var cv = document.createElement("canvas");
  cv.className = "city";
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d");

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263 + SEED) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  function noise(u, v, su, sv) {
    var x = u / su, y = v / sv, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  // layers: 1 mobility, 2 water, 3 buildings, 4 food, 5 waste, 6 energy, 7 park (air)
  var cw = 8, cols = 0, rows = 0, ch = [], ly, dir, roads = [], lines = [];
  function build() {
    if (MODE === "c" && MAPTXT) return buildMap();
    ctx.font = FONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    cw = ctx.measureText("M").width;
    cols = Math.ceil(innerWidth / cw) + 1;
    rows = Math.ceil(Math.max(document.documentElement.scrollHeight, innerHeight) * 1.15 / LH) + 4;
    var n = cols * rows, R = rng(SEED);
    ch = new Array(n); ly = new Uint8Array(n); dir = new Uint8Array(n);
    for (var i = 0; i < n; i++) ch[i] = " ";
    var at = function (x, y) { return y * cols + x; };
    var inb = function (x, y) { return x >= 0 && y >= 0 && x < cols && y < rows; };
    var DX = [0, 0, 1, -1], DY = [-1, 1, 0, 0], BIT = [1, 2, 4, 8];   // up, down, right, left

    // the river first, so the roads know to bridge it
    for (var y = 0; y < rows; y++) {
      var c = cols * .66 + Math.sin(y / 41) * cols * .13 + Math.sin(y / 13) * 2.5, hw = 2 + (Math.sin(y / 27) + 1) * 1.6;
      for (var x = Math.floor(c - hw); x <= Math.ceil(c + hw); x++) if (inb(x, y)) ly[at(x, y)] = 2;
    }

    // roads: tracers. A cell is twice as tall as it is wide, so horizontal runs take twice the steps
    // to look the same length.
    roads = [];
    function trace(x, y, d, len, turn, stopOnHit) {
      for (var s = 0; s < len * (d > 1 ? 2 : 1); s++) {
        if (!inb(x, y)) break;
        var k = at(x, y);
        if (s > 2 && stopOnHit && ly[k] === 1) { dir[k] |= BIT[d ^ 1]; break; }
        if (s > 0) dir[k] |= BIT[d ^ 1];
        if (ly[k] === 2) dir[k] |= 16; else ly[k] = 1;   // 16: a bridge
        roads.push(k);
        if (R() < turn) { var nd = (d < 2 ? 2 : 0) + (R() < .5 ? 0 : 1); dir[k] |= BIT[nd]; d = nd; }
        else dir[k] |= BIT[d];
        x += DX[d]; y += DY[d];
      }
    }
    for (var r = 0; r < Math.ceil(rows / 16); r++)   // long roads that jog now and then
      trace(Math.floor(R() * cols), Math.floor(R() * rows), Math.floor(R() * 4), 40 + Math.floor(R() * 90), .025, false);
    for (var l = 0; l < Math.ceil(cols * rows / 140); l++) {   // lanes branching off them
      if (!roads.length) break;
      var k0 = roads[Math.floor(R() * roads.length)], x0 = k0 % cols, y0 = (k0 / cols) | 0;
      var horiz = (dir[k0] & 12) && !(dir[k0] & 3), d1 = (horiz ? 0 : 2) + (R() < .5 ? 0 : 1);
      trace(x0 + DX[d1], y0 + DY[d1], d1, 4 + Math.floor(R() * 18), .08, true);
    }

    // buildings along the frontages; the shade says how dense this part of the city is
    var SHADE = [":", "+", "=", "#"];
    for (var i2 = 0; i2 < roads.length; i2++) {
      var k = roads[i2], x = k % cols, y = (k / cols) | 0, dk = dir[k];
      var perp = (dk & 12) && !(dk & 3) ? [0, 1] : (dk & 3) && !(dk & 12) ? [2, 3] : null;
      if (!perp) continue;
      for (var pi = 0; pi < 2; pi++) {
        var pd = perp[pi], depth = pd < 2 ? 1 + Math.floor(hash(x >> 3, y >> 2) * 2) : 2 + Math.floor(hash(x >> 3, y >> 2) * 4);
        for (var s = 1; s <= depth; s++) {
          var xx = x + DX[pd] * s, yy = y + DY[pd] * s; if (!inb(xx, yy)) break;
          var kk = at(xx, yy); if (ly[kk] && ly[kk] !== 3) break;
          if (hash(xx * 7, yy * 3) < .07) break;   // a gap: a gate, a lane mouth
          var dens = noise(xx, yy, 60, 30);
          ly[kk] = 3; ch[kk] = SHADE[Math.min(3, Math.floor(dens * dens * 5.5))];
        }
      }
    }

    // what is left inside the blocks
    for (var y2 = 0; y2 < rows; y2++) for (var x2 = 0; x2 < cols; x2++) {
      var k2 = at(x2, y2); if (ly[k2]) continue;
      var nz = noise(x2 + 900, y2, 40, 20), h = hash(x2, y2);
      if (nz < .2) { if (h < .04) { ch[k2] = h < .02 ? "%" : "&"; ly[k2] = 5; } }
      else if (nz < .4) { if (h < .14) { ch[k2] = "♣"; ly[k2] = 7; } else if (h < .18) { ch[k2] = "\""; ly[k2] = 7; } }
      else if (nz > .47 && nz < .55) { if (y2 % 2 === 0 && h < .75) { ch[k2] = h < .4 ? "," : "\""; ly[k2] = 4; } }
      else if (h < .02) ch[k2] = ".";
    }

    // glyphs for roads and water
    var BOX = { 3: "│", 12: "─", 6: "┌", 10: "┐", 5: "└", 9: "┘", 7: "├", 11: "┤", 14: "┬", 13: "┴", 15: "┼", 1: "╵", 2: "╷", 4: "╶", 8: "╴" };
    for (var k3 = 0; k3 < n; k3++) {
      if (ly[k3] === 1) ch[k3] = BOX[dir[k3] & 15] || "┼";
      else if (ly[k3] === 2) ch[k3] = dir[k3] & 16 ? (dir[k3] & 12 ? "═" : "║") : "~";
    }

    // power lines beside a few long roads
    lines = [];
    for (var j = 0; j < Math.ceil(rows / 60); j++) {
      var k4 = roads[Math.floor(R() * Math.min(roads.length, 3000))]; if (k4 === undefined) break;
      var x4 = k4 % cols, y4 = (k4 / cols) | 0, hz = !!(dir[k4] & 12), line = [];
      for (var s2 = -70; s2 < 70; s2++) {
        var xx2 = hz ? x4 + s2 : x4 + 1, yy2 = hz ? y4 - 1 : y4 + s2; if (!inb(xx2, yy2)) continue;
        var kk2 = at(xx2, yy2); if (ly[kk2] === 1 || ly[kk2] === 2) continue;
        ly[kk2] = 6; ch[kk2] = s2 % 9 === 0 ? "╪" : hz ? "╌" : "╎"; line.push(kk2);
      }
      if (line.length) lines.push(line);
    }
    if (MODE === "b") figureGround();
    seedFlows();
  }

  // figure-ground: every block one glyph, streets and bridges left as paper, the river a solid band
  function figureGround() {
    for (var k = 0; k < ch.length; k++) {
      var l = ly[k];
      if (l === 1 || (l === 2 && dir[k] & 16)) ch[k] = " ";
      else if (l === 2) ch[k] = "~";
      else if (l === 7 || l === 4) { ch[k] = hash(k, 3) < .35 ? "\"" : " "; ly[k] = 7; }
      else { ch[k] = ":"; ly[k] = 3; }
    }
    lines = [];
  }

  // Ahmedabad: s street, l lane, w water, p park, r rail, h mapped building, b the rest of a block
  function buildMap() {
    ctx.font = FONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    cw = ctx.measureText("M").width;
    var L = MAPTXT.split(/\r?\n/); rows = L.length; cols = L[0].length;
    var n = cols * rows; ch = new Array(n); ly = new Uint8Array(n); dir = new Uint8Array(n); roads = []; lines = [];
    var G = { b: [":", 3], l: [":", 3], h: ["#", 3], s: [" ", 1], r: ["=", 1], w: ["~", 2], p: ["\"", 7] };
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var k = y * cols + x, g = G[L[y][x]] || G.b; ch[k] = g[0]; ly[k] = g[1];
      if (g[0] === "\"" && hash(x, y) < .55) ch[k] = " ";
      if (L[y][x] === "s") roads.push(k);
    }
    X0 = Math.max(0, Math.round((cols - innerWidth / cw) / 2));
    seedFlows();
  }

  // ---------- flows ----------
  var walkers = [], pulses = [], air = [], t = 0;
  function seedFlows() {
    var R = rng(SEED + 7);
    walkers = []; for (var i = 0; i < Math.min(1200, roads.length / (MODE === "c" ? 16 : 8)); i++) walkers.push({ k: roads[Math.floor(R() * roads.length)], d: -1, waste: R() < .16 });
    pulses = lines.map(function (l) { return { l: l, i: Math.floor(R() * l.length) }; });
    air = []; if (MODE !== "b" && MODE !== "c") for (var j = 0; j < Math.floor(cols * rows / 900); j++) air.push({ x: R() * cols, y: R() * rows });
  }
  var DX = [0, 0, 1, -1], DY = [-1, 1, 0, 0];
  function step() {
    t++;
    walkers.forEach(function (w) {
      if (w.waste && t % 2) return;
      var x = w.k % cols, y = (w.k / cols) | 0, opts = [], same = null;
      for (var d = 0; d < 4; d++) { var nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        var nk = ny * cols + nx; if (ly[nk] !== 1 && !(dir[nk] & 16)) continue;
        if ((d ^ 1) === w.d) continue; opts.push([d, nk]); if (d === w.d) same = [d, nk]; }
      if (!opts.length) { w.d = w.d ^ 1; return; }   // a dead end: turn round
      var pick = same && hash(w.k, t) < .88 ? same : opts[Math.floor(hash(t, w.k) * opts.length)];
      w.d = pick[0]; w.k = pick[1];
    });
    pulses.forEach(function (p) { p.i = (p.i + 3) % p.l.length; });
    air.forEach(function (a) { a.x += .35; a.y += .08; if (a.x >= cols) a.x = 0; if (a.y >= rows) a.y = 0; });
    draw();
  }

  // ---------- the diagram brings a system forward ----------
  var MAP = { mobility: 1, water: 2, buildings: 3, food: 4, waste: 5, energy: 6, air: 7 };
  var hover = null;
  document.addEventListener("mouseover", function (e) { var nd = e.target.closest && e.target.closest("[data-topic]"); hover = nd ? nd.getAttribute("data-topic") : null; draw(); });
  function focus() { var on = hover || ((document.querySelector(".eco__node.on") || {}).dataset || {}).topic; return MAP[on] || 0; }

  // ---------- drawing ----------
  var INK = "28,27,24", ACC = "46,58,87";
  var ALPHA = MODE === "b" || MODE === "c" ? [.1, .2, .24, .26, .13, .13, .14, .2] : [.1, .16, .17, .11, .13, .14, .13, .13];
  function rgba(c, a) { return "rgba(" + c + "," + a.toFixed(3) + ")"; }
  function draw() {
    var dpr = window.devicePixelRatio || 1, iw = innerWidth, ih = innerHeight;
    if (cv.width !== Math.round(iw * dpr) || cv.height !== Math.round(ih * dpr)) { cv.width = Math.round(iw * dpr); cv.height = Math.round(ih * dpr); cv.style.width = iw + "px"; cv.style.height = ih + "px"; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, iw, ih);
    ctx.font = FONT + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textBaseline = "top";
    var f = focus(), sy = window.scrollY, vis = Math.ceil(ih / LH) + 1, last = null;
    var top = MODE === "c" ? Math.min(1, sy / Math.max(1, document.documentElement.scrollHeight - ih)) * Math.max(0, rows - ih / LH) : sy / LH;
    var r0 = Math.floor(top), off = -(top - r0) * LH, x1 = Math.min(cols, X0 + Math.ceil(iw / cw) + 1);
    function style(l) { var a = ALPHA[l]; if (!f) return rgba(INK, a); if (l === f) return rgba(ACC, .5); return rgba(INK, a * .45); }
    for (var r = 0; r < vis; r++) { var y = r0 + r; if (y >= rows) break;
      var py = r * LH + off, base = y * cols;
      for (var x = X0; x < x1; x++) { var k = base + x, c = ch[k]; if (c === " ") continue;
        var l = ly[k];
        if (l === 2 && c === "~") { var hv = hash(x, y - (t >> 1)); if (hv > (MODE === "b" || MODE === "c" ? .9 : .55)) continue; c = hv < .4 ? "~" : "≈"; }   // the river runs
        var s = style(l); if (s !== last) { ctx.fillStyle = s; last = s; }
        ctx.fillText(c, (x - X0) * cw, py); } }
    function put(k, c, l, a) { var y = (k / cols) | 0; if (y < r0 || y >= r0 + vis) return;
      ctx.fillStyle = f && l === f ? rgba(ACC, .9) : rgba(INK, f ? a * .4 : a);
      ctx.fillText(c, (k % cols - X0) * cw, (y - r0) * LH + off); }
    walkers.forEach(function (w) { put(w.k, w.waste ? "∘" : "•", w.waste ? 5 : 1, .38); });
    pulses.forEach(function (p) { for (var j = 0; j < 3; j++) { var k = p.l[(p.i + p.l.length - j * 2) % p.l.length]; if (k !== undefined) put(k, "∙", 6, .45 - j * .12); } });
    air.forEach(function (a) { put(Math.floor(a.y) * cols + Math.floor(a.x), "˚", 7, .22); });
    if (MODE) clear(ih);
  }

  // the city stays out from under the words and the work: it shows in the margins and the gaps between
  var CLEAR = [[".work__head .eyebrow, .work__name, .work__why, .work__index, .work__filterbar, .work__break, .card__frame, .card figcaption, .about .reveal > *, .contact__row, .contact__fine", 1], [".eco", .7]];
  function clear(ih) {
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    if ("filter" in ctx) ctx.filter = "blur(12px)";
    CLEAR.forEach(function (c) { ctx.globalAlpha = c[1];
      document.querySelectorAll(c[0]).forEach(function (el) { var r = el.getBoundingClientRect();
        if (!r.width || r.bottom < -40 || r.top > ih + 40) return;
        ctx.fillRect(r.left - 18, r.top - 14, r.width + 36, r.height + 28); }); });
    ctx.restore();
  }

  var raf = 0;
  window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }, { passive: true });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); draw(); }, 200); });
  var ready = document.fonts ? document.fonts.ready : Promise.resolve();
  if (MODE === "c") ready = ready.then(function () { return fetch("/assets/js/city-ahmedabad.txt").then(function (r) { return r.text(); }).then(function (t) { MAPTXT = t.trim(); }); });
  ready.then(function () {
    build(); draw();
    if (!reduce) setInterval(step, TICK);
    setTimeout(function () { if (MODE !== "c" && document.documentElement.scrollHeight * 1.05 / LH > rows) { build(); draw(); } }, 2500);
  });
})();
