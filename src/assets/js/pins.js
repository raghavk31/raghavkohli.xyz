/* The homepage as Raghav's collage, seen by everyone, changed only with the owner key (typed once on
   /thoughts/ via (key), kept in localStorage as "thoughts-key").
   Pins, from the thoughts worker (/pins), are of three kinds:
   - note: a sketch, thought or opinion on a black post-it. A click opens it.
   - image: a png (a picture or a symbol) placed as it is, transparency kept, no frame.
   - text: words in the site's face, at his size and colour.
   (+ note) (+ image) (+ text) in the dock, then a click on the page places one there; drag to move it,
   its corner to scale it (a text keeps its line breaks; shift-drag the corner to rewrap it instead).
   (to back) puts an image or a text behind the page's content; things behind are moved in (arrange).
   Images go up through the worker's /images, downscaled here first.
   Project boxes: once he has arranged them, the grid's rows and breaks give way to his arrangement
   (worker /layout, ids home-<slug>, in ten-thousandths of the grid's width so it holds at any width).
   (arrange) to drag a box or scale it by its corner, each change kept as it is made; (tidy) snaps every
   box to the columns at once; (back to grid) forgets the arrangement.
   Everything snaps to the work grid's twelve columns, carried on past its edges: a box hard (its left
   edge to a column, its width to whole columns, its top level with its neighbours or on a 7px step),
   a pin by a pull when an edge comes near a column line or another thing's top. Alt lets go.
   A pin stays exactly where it was dropped on the page: y from the top of the page, x from the page's
   centre line (so it keeps its place beside the content at another width). Nothing else moves it.
   Under 788px there is no free space: the pins hide and the boxes stack as before. */
(function () {
  "use strict";
  var me = document.currentScript, api = me && me.dataset.api;
  if (!api) return;
  var key = ""; try { key = localStorage.getItem("thoughts-key") || ""; } catch (e) {}
  var owner = !!key, pins = [], wide = window.matchMedia("(min-width: 788px)");
  // two layers: the front one over the page; the back one under its content (and over the city)
  var layer = document.createElement("div"), under = document.createElement("div");
  layer.className = "pins"; under.className = "pins pins--back";
  document.body.appendChild(under); document.body.appendChild(layer);
  var layers = [layer, under];

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function tilt(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return { r: ((h & 255) / 255 * 4 - 2).toFixed(2), alt: (h >> 8) & 1 }; }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function send(method, path, body, type) {
    var h = { "X-Owner-Key": key }; if (type) h["Content-Type"] = type;
    return fetch(api + path, { method: method, headers: h, body: body }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "failed"); return j; });
    });
  }

  // ---------- the grid everything snaps to ----------
  // the work grid's twelve columns with the 35px gutter its rows had, in page px
  var GAP = 35, T = 10, BASE = 7;
  var grid = document.querySelector("[data-grid]");
  function cols() {
    if (!grid) return null;
    var r = grid.getBoundingClientRect(), W = grid.clientWidth, pitch = (W + GAP) / 12;
    return { x: r.left + scrollX, y: r.top + scrollY, W: W, pitch: pitch, cw: pitch - GAP };
  }
  // the nearest of `cands` to v, if it is within the pull
  function pull(v, cands, t) {
    var best = null, d = t + 1e-6;
    cands.forEach(function (c) { var e = Math.abs(c - v); if (e < d) { d = e; best = c; } });
    return best;
  }
  // column edges, starts and ends, across the page (page px)
  function lines(g) {
    var out = []; for (var k = -6; k <= 18; k++) { out.push(g.x + k * g.pitch); out.push(g.x + k * g.pitch + g.cw); }
    return out;
  }

  // ---------- the project boxes, where he put them ----------
  // a set's plans sit in its tray (sets.js), not on the board: the set card is the box (home-set-<id>)
  var boxes = grid ? Array.prototype.slice.call(grid.querySelectorAll(".card")).filter(function (c) { return !c.closest(".set__tray"); }) : [];
  var U = 10000, spots = {}, arranging = false;
  function idOf(c) { if (c.dataset.layoutId) return c.dataset.layoutId; var a = c.querySelector(".card__click"); return "home-" + ((a && a.getAttribute("href")) || "").replace(/^\/work\//, "").replace(/\/$/, "").replace(/[^A-Za-z0-9_-]/g, "-"); }
  // a set not yet placed takes the highest of the spots its plans had, until it is moved
  function adopt() {
    boxes.forEach(function (c) {
      if (!c.dataset.kids || spots[idOf(c)]) return;
      var had = c.dataset.kids.split(" ").map(function (k) { return spots[k]; }).filter(Boolean).sort(function (x, y) { return x.y - y.y; })[0];
      if (had) spots[idOf(c)] = had;
    });
  }
  function hasSpots() { return boxes.some(function (c) { return spots[idOf(c)]; }); }
  function arrange() {
    if (!grid) return;
    var on = wide.matches && (arranging || hasSpots());
    grid.classList.toggle("is-free", on);
    if (!on) { boxes.forEach(function (c) { c.style.left = c.style.top = c.style.width = c.style.zIndex = ""; }); grid.style.height = ""; return; }
    var W = grid.clientWidth, bottom = 0, loose = [];
    // a box's z only orders it among the boxes (it climbs by one with every move); drawn as its rank,
    // so the stack stays under the project overlay (.pv, z-index 100) however often he rearranges
    var rank = {}; boxes.map(function (c) { return spots[idOf(c)]; }).filter(Boolean)
      .sort(function (a, b) { return (a.z || 0) - (b.z || 0); }).forEach(function (s, i) { rank[s.z || 0] = rank[s.z || 0] || i + 1; });
    boxes.forEach(function (c) { var s = spots[idOf(c)]; if (!s) { loose.push(c); return; }
      c.style.left = s.x / U * W + "px"; c.style.top = s.y / U * W + "px"; c.style.width = s.w / U * W + "px"; c.style.zIndex = rank[s.z || 0]; });
    boxes.forEach(function (c) { if (spots[idOf(c)]) bottom = Math.max(bottom, c.offsetTop + c.offsetHeight); });
    // a project added since he arranged them takes the free space to the right of the box before it in
    // the grid's order (its place in the rows); with no room there it waits in rows of three under the
    // rest until it is moved
    var rects = boxes.filter(function (c) { return spots[idOf(c)]; }).map(function (c) { return [c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight]; });
    var hits = function (r) { return rects.some(function (q) { return r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]; }); };
    var gap = W * .035, placed = boxes.filter(function (c) { return spots[idOf(c)]; });
    loose = loose.filter(function (c) {
      var prev = boxes[boxes.indexOf(c) - 1];
      if (placed.indexOf(prev) < 0) return true;
      var left = prev.offsetLeft + prev.offsetWidth + gap, width = W - left;
      if (width < W * .3) return true;
      c.style.left = left + "px"; c.style.top = prev.offsetTop + "px"; c.style.width = width + "px"; c.style.zIndex = 1;
      var r = [c.offsetLeft, c.offsetTop, c.offsetWidth, c.offsetHeight];
      if (hits(r)) return true;
      rects.push(r); placed.push(c);
      return false;
    });
    loose.forEach(function (c, i) { c.style.width = W * .3 + "px"; c.style.left = (i % 3) * W * .35 + "px"; c.style.top = bottom + 80 + Math.floor(i / 3) * W * .35 + "px"; c.style.zIndex = 1; });
    var end = 0; boxes.forEach(function (c) { end = Math.max(end, c.offsetTop + c.offsetHeight); });
    grid.style.height = end + 40 + "px";
  }
  if (grid) {
    // visitors on a wide screen: hold the grid back until the arrangement is known, so it does not jump
    var unwait = function () { grid.classList.remove("board-wait"); };
    if (wide.matches) { grid.classList.add("board-wait"); setTimeout(unwait, 1500); }
    fetch(api + "/layout").then(function (r) { return r.json(); }).then(function (j) {
      var L = j.layout || {}; Object.keys(L).forEach(function (k) { spots[k] = L[k]; }); adopt(); arrange(); unwait(); position();
    }, unwait);
    window.addEventListener("resize", arrange);
    if (wide.addEventListener) wide.addEventListener("change", arrange);
  }

  // ---------- where a pin sits ----------
  // the site went to 87.5% of its first size (2026-10-11); pins are stored at the old size, drawn at S of it
  var S = .875;
  function place(docX, docY) {   // a point on the page -> {anchor, x, y}
    return { anchor: "top", x: Math.round((docX - innerWidth / 2) / S), y: Math.round(docY / S) };
  }
  function at(p) {   // {anchor, x, y} -> a point on the page
    return { left: innerWidth / 2 + p.x * S, top: p.y * S };
  }

  // ---------- drawing the pins ----------
  var DEF = { note: 220, text: 480 };
  function kindOf(p) { return p.kind || "note"; }
  function styleOf(p) { return p.style || (p.style = {}); }
  function colour(c) { return !c ? "var(--ink)" : c.charAt(0) === "#" ? c : "var(--" + c + ")"; }
  function render() {
    layers.forEach(function (l) { l.querySelectorAll(":scope > .pin").forEach(function (el) { el.remove(); }); });
    pins.slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); }).forEach(function (p) {
      (styleOf(p).back ? under : layer).appendChild(pinEl(p));
    });
    position();
  }
  function pinEl(p) { var k = kindOf(p); return k === "image" ? picture(p) : k === "text" ? words(p) : note(p); }
  function toolsFor(p) {
    if (!owner) return "";
    var k = kindOf(p), back = styleOf(p).back;
    return '<span class="pin__tools">' + (k !== "image" ? '<a href="#" data-edit>(edit)</a> ' : "") +
      (k !== "note" ? '<a href="#" data-back>' + (back ? "(to front)" : "(to back)") + "</a> " : "") +
      '<a href="#" data-del>(×)</a></span><span class="grip" title="drag to scale' + (k === "text" ? ", shift-drag to rewrap" : "") + '"></span>';
  }
  function note(p) {
    var t = tilt(p.id), el = document.createElement("div");
    el.className = "pin postit" + (t.alt ? " alt" : "");
    el.dataset.id = p.id;
    el.style.setProperty("--r", t.r + "deg");
    el.style.setProperty("--s", ((p.w || 220) / 220).toFixed(3));
    el.innerHTML = (p.images || []).map(function (i) { return '<img class="pin__img" src="' + api + "/images/" + i + '" alt="" loading="lazy" />'; }).join("") +
      (p.body ? "<p>" + esc(p.body) + "</p>" : "") + toolsFor(p);
    el.querySelectorAll("img").forEach(function (im) { im.addEventListener("load", position); });
    return el;
  }
  function picture(p) {
    var el = document.createElement("div");
    el.className = "pin pin--img"; el.dataset.id = p.id;
    el.innerHTML = '<img src="' + api + "/images/" + (p.images || [])[0] + '" alt="" draggable="false" />' + toolsFor(p);
    return el;
  }
  function words(p) {
    var el = document.createElement("div");
    el.className = "pin pin--text"; el.dataset.id = p.id;
    el.innerHTML = "<p>" + esc(p.body) + "</p>" + toolsFor(p);
    look(el, p);
    return el;
  }
  function look(el, p) {
    var s = styleOf(p);
    el.style.fontSize = (s.size || 48) * S + "px";
    el.style.color = colour(s.color);
    el.style.fontWeight = s.bold ? 600 : 400;
  }
  function position() {
    layers.forEach(function (l) { l.querySelectorAll(":scope > .pin").forEach(function (el) {
      var p = byId(el.dataset.id) || draft; if (!p) return;
      var q = at(p), w = (p.w || DEF[kindOf(p)] || 220) * S;
      if (kindOf(p) !== "note") el.style.width = w + "px";
      el.style.left = Math.round(Math.min(Math.max(8, q.left), innerWidth - Math.min(w, innerWidth - 16) - 8)) + "px";
      el.style.top = Math.round(q.top) + "px";
      el.style.zIndex = styleOf(p).back ? 0 : 2 + (p.z || 0);
    }); });
  }
  function byId(id) { return pins.filter(function (p) { return p.id === id; })[0]; }

  fetch(api + "/pins").then(function (r) { return r.json(); }).then(function (j) { pins = j.pins || []; render(); }, function () {});
  window.addEventListener("resize", position);

  // ---------- opening a note ----------
  // A click opens it the way a note opens on /thoughts/: a big square of the same paper grows from where it
  // sits, over a scrim; the scrim, Escape and a click on it close it, and it shrinks back to its spot. The
  // square is a copy (the note on the board keeps its tilt, scale and place, hidden meanwhile).
  // Images and texts do not open: they are the page.
  var open = null, scrim = null, MORPH = 420, EASE = "cubic-bezier(.32,.72,.32,1)";
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // the note's own box on screen, as if untilted: its centre and its laid-out size times its scale
  function box(el) {
    var r = el.getBoundingClientRect(), s = parseFloat(el.style.getPropertyValue("--s")) || 1;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth * s, h: el.offsetHeight * s };
  }
  // the big square's transform that puts it over the note
  function over(z, el) {
    var a = box(el), b = z.getBoundingClientRect();
    return "translate(" + (a.x - b.left - b.width / 2) + "px," + (a.y - b.top - b.height / 2) + "px) rotate(" + (el.style.getPropertyValue("--r") || "0deg") +
      ") scale(" + a.w / b.width + "," + a.h / b.height + ")";
  }
  function openNote(el) {
    var p = byId(el.dataset.id); if (!p || kindOf(p) !== "note") return;
    if (!scrim) {
      scrim = document.createElement("div");
      scrim.className = "board__scrim";
      scrim.addEventListener("click", closeNote);
      document.body.appendChild(scrim);
    }
    var z = document.createElement("div");
    z.className = "pin-zoom" + (el.classList.contains("alt") ? " alt" : "");
    z.setAttribute("role", "dialog"); z.setAttribute("aria-modal", "true"); z.setAttribute("aria-label", "note");
    z.tabIndex = -1;
    z.innerHTML = ((p.images || []).length ? '<div class="pin-zoom__imgs">' + p.images.map(function (i) { return '<img src="' + api + "/images/" + i + '" alt="" />'; }).join("") + "</div>" : "") +
      (p.body ? "<p>" + esc(p.body) + "</p>" : "");
    z.addEventListener("click", closeNote);
    document.body.appendChild(z);
    if (z.animate) z.animate([{ transform: over(z, el) }, { transform: "none" }], { duration: still ? 0 : MORPH, easing: EASE });
    el.classList.add("is-open");
    scrim.offsetWidth; scrim.classList.add("on");
    document.body.classList.add("note-open");
    open = { el: el, z: z, focus: document.activeElement };
    z.focus({ preventScroll: true });
  }
  function closeNote() {
    if (!open) return;
    var o = open; open = null;
    scrim.classList.remove("on");
    document.body.classList.remove("note-open");
    var done = function () { if (!o.z.isConnected) return; o.z.remove(); o.el.classList.remove("is-open"); };
    if (o.z.animate && o.el.isConnected && !still) {
      o.z.style.pointerEvents = "none";
      o.z.animate([{ transform: "none" }, { transform: over(o.z, o.el) }], { duration: MORPH, easing: EASE, fill: "forwards" }).onfinish = done;
      setTimeout(done, MORPH + 150);   // a busy or hidden tab can hold the finish back
    } else done();
    if (o.focus && o.focus.focus) { try { o.focus.focus({ preventScroll: true }); } catch (e) {} }
  }
  layer.addEventListener("click", function (e) {
    var el = e.target.closest(".pin");
    if (!el || el.dataset.id === "draft" || el.classList.contains("is-editing") || e.target.closest("a, label, textarea, input, .grip")) return;
    if (el.dataset.moved) { delete el.dataset.moved; return; }   // the end of a drag, not a click
    openNote(el);
  });
  // capture, so Escape closes the note before the diagram or the overlay hear it
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) { e.stopPropagation(); closeNote(); }
  }, true);

  if (!owner) return;

  // ---------- the owner's tools ----------
  var tools = document.querySelector("[data-dock-tools]") || document.body, draft = null, adding = null;
  var adds = {};
  [["note", "(+ note)", "a black post-it"], ["image", "(+ image)", "a png, a picture or a symbol, as it is"], ["text", "(+ text)", "words at your size and colour"]].forEach(function (a) {
    var b = document.createElement("button"); b.type = "button"; b.className = "pin-add"; b.textContent = a[1];
    b.title = a[2] + ": click, then click a spot on the page";
    b.addEventListener("click", function (e) { e.stopPropagation(); startAdding(adding === a[0] ? null : a[0]); });
    tools.appendChild(b); adds[a[0]] = b;
  });
  function startAdding(k) {
    adding = k;
    document.body.classList.toggle("is-pinning", !!k);
    Object.keys(adds).forEach(function (n) { adds[n].classList.toggle("is-on", n === k); });
  }
  var arr = tool("(arrange)", "drag a box to move it, its corner to scale it; alt lets go of the columns"),
      tidy = tool("(tidy)", "snap every box to the columns"),
      back = tool("(back to grid)", "forget the arrangement");
  back.hidden = tidy.hidden = true;
  function tool(label, title) {
    var b = document.createElement("button"); b.type = "button"; b.className = "pin-add"; b.textContent = label; b.title = title;
    if (grid) tools.appendChild(b); return b; }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { startAdding(null); if (draft) cancel(); } });
  document.addEventListener("click", function (e) {
    if (!adding || e.target.closest(".pin, .pin-add")) return;
    e.preventDefault(); e.stopPropagation();
    var k = adding; startAdding(null);
    if (draft) cancel();
    var spot = place(e.pageX, e.pageY);
    if (k === "image") return pickImages(spot);
    draft = Object.assign({ id: "draft", kind: k, body: "", images: [], style: k === "text" ? { size: 48, color: "ink" } : {}, w: DEF[k], z: maxZ() + 1 }, spot);
    var el = pinEl(draft); layer.appendChild(el); position();
    (k === "text" ? editText : editNote)(el, draft);
  }, true);
  function maxZ() { return pins.reduce(function (m, p) { return Math.max(m, p.z || 0); }, 0); }
  function cancel() { var el = layer.querySelector('[data-id="draft"]'); if (el) el.remove(); draft = null; }
  function saved(p, j) { if (p === draft) { draft = null; pins.push(j.pin); } else pins[pins.indexOf(p)] = j.pin; render(); }
  function keyErr(err) { return err.message === "no" ? "the key was not accepted" : err.message; }

  // the note becomes a little form: text, its images (× drops one), (+ image), (save) (cancel)
  function editNote(el, p) {
    var imgs = (p.images || []).slice(), picks = [];
    el.classList.add("is-editing");
    el.innerHTML = '<textarea rows="4" placeholder="a thought, a sketch, an opinion…">' + esc(p.body) + '</textarea>' +
      '<span class="pin__thumbs"></span>' +
      '<span class="pin__bar"><label class="pin__pick">(+ image)<input type="file" accept="image/*" multiple hidden /></label>' +
      '<a href="#" data-save>(save)</a><a href="#" data-cancel>(cancel)</a></span><span class="pin__msg"></span>';
    var ta = el.querySelector("textarea"), thumbs = el.querySelector(".pin__thumbs"), msg = el.querySelector(".pin__msg");
    function showThumbs() {
      thumbs.innerHTML = imgs.map(function (i, n) { return '<span><img src="' + api + "/images/" + i + '" alt="" /><a href="#" data-rm-old="' + n + '">(×)</a></span>'; }).join("") +
        picks.map(function (b, n) { return '<span><img src="' + b.url + '" alt="" /><a href="#" data-rm-new="' + n + '">(×)</a></span>'; }).join("");
    }
    showThumbs(); ta.focus();
    el.querySelector("input").addEventListener("change", function (e) {
      Array.prototype.slice.call(e.target.files).slice(0, 6).forEach(function (f) {
        shrink(f).then(function (b) { picks.push({ blob: b, url: URL.createObjectURL(b) }); showThumbs(); }, function () { msg.textContent = "could not read " + f.name; });
      });
      e.target.value = "";
    });
    el.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a || !el.contains(a)) return;
      e.preventDefault();
      if (a.dataset.rmOld != null) { imgs.splice(+a.dataset.rmOld, 1); showThumbs(); }
      else if (a.dataset.rmNew != null) { picks.splice(+a.dataset.rmNew, 1); showThumbs(); }
      else if ("cancel" in a.dataset) { if (p === draft) cancel(); else render(); }
      else if ("save" in a.dataset) {
        msg.textContent = "saving…";
        Promise.all(picks.map(function (b) { return send("POST", "/images", b.blob, b.blob.type).then(function (j) { return j.id; }); }))
          .then(function (ids) {
            var body = { body: ta.value, images: imgs.concat(ids), anchor: p.anchor, x: p.x, y: p.y, w: p.w, z: p.z };
            return p === draft ? send("POST", "/pins", JSON.stringify(body), "application/json") : send("PUT", "/pins/" + p.id, JSON.stringify(body), "application/json");
          })
          .then(function (j) { saved(p, j); }, function (err) { msg.textContent = keyErr(err); });
      }
    });
  }

  // a text becomes its own form: the words where they will sit, at their size and colour, and under them
  // a bar: size, the site's colours or any other, (bold), (save) (cancel)
  var SWATCH = ["ink", "accent", "mute", "paper"];
  function editText(el, p) {
    var st = Object.assign({ size: 48, color: "ink" }, styleOf(p)), seen = { style: st };
    el.classList.add("is-editing");
    el.innerHTML = '<textarea rows="1" placeholder="words…">' + esc(p.body) + '</textarea>' +
      '<span class="pin__bar pin__bar--text">' +
        '<label>size <input type="number" min="8" max="400" step="1" value="' + st.size + '" data-size /></label>' +
        SWATCH.map(function (c) { return '<a href="#" class="pin__sw" data-color="' + c + '" title="' + c + '" style="--c:var(--' + c + ')"></a>'; }).join("") +
        '<label class="pin__sw pin__sw--any" title="any colour"><input type="color" value="' + (st.color.charAt(0) === "#" ? st.color : "#e8336d") + '" data-any /></label>' +
        '<a href="#" data-bold>(bold)</a><a href="#" data-save>(save)</a><a href="#" data-cancel>(cancel)</a>' +
      '</span><span class="pin__msg"></span>';
    var ta = el.querySelector("textarea"), msg = el.querySelector(".pin__msg"), size = el.querySelector("[data-size]");
    function fit() { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }
    function show() {
      look(el, seen);
      el.querySelectorAll("[data-color]").forEach(function (a) { a.classList.toggle("is-on", a.dataset.color === st.color); });
      el.querySelector(".pin__sw--any").classList.toggle("is-on", st.color.charAt(0) === "#");
      el.querySelector("[data-bold]").classList.toggle("is-on", !!st.bold);
      fit();
    }
    show(); ta.focus();
    ta.addEventListener("input", fit);
    size.addEventListener("input", function () { st.size = clamp(Math.round(+size.value || 48), 8, 400); show(); });
    el.querySelector("[data-any]").addEventListener("input", function (e) { st.color = e.target.value.toLowerCase(); show(); });
    el.addEventListener("click", function (e) {
      var a = e.target.closest("a"); if (!a || !el.contains(a)) return;
      e.preventDefault();
      if (a.dataset.color) { st.color = a.dataset.color; show(); }
      else if ("bold" in a.dataset) { st.bold = !st.bold; show(); }
      else if ("cancel" in a.dataset) { if (p === draft) cancel(); else render(); }
      else if ("save" in a.dataset) {
        if (!ta.value.trim()) { msg.textContent = "write something first"; return; }
        msg.textContent = "saving…";
        var style = { size: st.size, color: st.color }; if (st.bold) style.bold = true; if (styleOf(p).back) style.back = true;
        var body = { body: ta.value, style: style };
        (p === draft ? send("POST", "/pins", JSON.stringify(Object.assign(body, { kind: "text", anchor: p.anchor, x: p.x, y: p.y, w: p.w, z: p.z })), "application/json")
                     : send("PUT", "/pins/" + p.id, JSON.stringify(body), "application/json"))
          .then(function (j) { saved(p, j); }, function (err) { msg.textContent = keyErr(err); });
      }
    });
  }

  // (+ image): the file picker opens on the click that placed it; each file goes up and onto the page
  // at its own size (up to 420 wide), several stepping down from the spot
  function pickImages(spot) {
    var input = document.createElement("input");
    input.type = "file"; input.accept = "image/png,image/webp,image/gif,image/jpeg"; input.multiple = true;
    input.addEventListener("change", function () {
      var files = Array.prototype.slice.call(input.files).slice(0, 6), left = files.length;
      if (!left) return;
      adds.image.textContent = "(uploading…)";
      var done = function () { if (!--left) adds.image.textContent = "(+ image)"; };
      files.forEach(function (f, i) {
        keep(f).then(function (k) { return send("POST", "/images", k.blob, k.blob.type).then(function (j) { return { id: j.id, w: k.w }; }); })
          .then(function (k) {
            var body = { kind: "image", images: [k.id], anchor: "top", x: spot.x + i * 28, y: spot.y + i * 28, w: clamp(Math.round(k.w), 16, 420), z: maxZ() + 1 };
            return send("POST", "/pins", JSON.stringify(body), "application/json");
          })
          .then(function (j) { pins.push(j.pin); render(); done(); }, function (err) { done(); alert("could not add " + f.name + ": " + keyErr(err)); });
      });
    });
    input.click();
  }

  layers.forEach(function (l) { l.addEventListener("click", function (e) {
    var a = e.target.closest("[data-edit], [data-del], [data-back]"); if (!a || a.closest(".is-editing")) return;
    e.preventDefault();
    var el = a.closest(".pin"), p = byId(el.dataset.id);
    if ("edit" in a.dataset) return (kindOf(p) === "text" ? editText : editNote)(el, p);
    if ("back" in a.dataset) {
      var style = Object.assign({}, styleOf(p)); if (style.back) delete style.back; else style.back = true;
      return send("PUT", "/pins/" + p.id, JSON.stringify({ style: style }), "application/json").then(function (j) { saved(p, j); }, function (err) { alert(keyErr(err)); });
    }
    if (!confirm("take this down?")) return;
    send("DELETE", "/pins/" + p.id).then(function () { pins.splice(pins.indexOf(p), 1); render(); }, function (err) { alert(err.message); });
  }); });

  // ---------- the columns, shown while something moves ----------
  var guides = document.createElement("div");
  guides.className = "snap-guides"; guides.setAttribute("aria-hidden", "true");
  layer.appendChild(guides);
  var dragging = false;
  function showGuides() {
    var g = cols(), on = !!g && (arranging || dragging);
    guides.classList.toggle("on", on);
    if (!on) return;
    guides.style.setProperty("--gx", g.x - scrollX + "px");
    guides.style.setProperty("--pitch", g.pitch + "px");
    guides.style.setProperty("--cw", g.cw + "px");
  }
  window.addEventListener("resize", showGuides);

  // the tops of everything else on the page, for a moving pin to come level with (page px)
  function tops(skip) {
    var out = [];
    boxes.forEach(function (c) { var r = c.getBoundingClientRect(); out.push(r.top + scrollY); });
    layers.forEach(function (l) { l.querySelectorAll(":scope > .pin").forEach(function (o) { if (o !== skip) out.push(o.getBoundingClientRect().top + scrollY); }); });
    return out;
  }
  // a pin's left and top, pulled to a column line (either edge) and to another thing's top
  function snapPin(left, top, w, ys) {
    var g = cols(); if (!g) return { x: left, y: top };
    var L = lines(g), a = pull(left, L, T), b = pull(left + w, L, T);
    if (a != null && (b == null || Math.abs(a - left) <= Math.abs(b - left - w))) left = a; else if (b != null) left = b - w;
    var t = pull(top, ys, T); if (t != null) top = t;
    return { x: left, y: top };
  }

  // drag a pin to move it; it comes to the front and keeps where it was dropped
  layers.forEach(function (l) { l.addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".pin"); if (!el || el.classList.contains("is-editing") || e.target.closest("a, label") || e.button) return;
    var p = byId(el.dataset.id); if (!p) return;
    if (e.target.classList.contains("grip")) return scale(e, el, p);
    e.preventDefault();
    var r = el.getBoundingClientRect(), sx = e.pageX, sy = e.pageY, ox = parseFloat(el.style.left), oy = parseFloat(el.style.top), moved = false, ys = null;
    // the snap works on the box as drawn (a note is tilted and scaled), offset from its left/top
    var bx = r.left + scrollX - ox, by = r.top + scrollY - oy;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    function move(ev) {
      var dx = ev.pageX - sx, dy = ev.pageY - sy; if (!moved && Math.hypot(dx, dy) < 4) return;
      if (!moved) { moved = true; el.classList.add("is-dragging"); dragging = true; showGuides(); ys = tops(el); }
      var nl = ox + dx, nt = oy + dy;
      if (!ev.altKey) { var s = snapPin(nl + bx, nt + by, r.width, ys); nl = s.x - bx; nt = s.y - by; }
      el.style.left = nl + "px"; el.style.top = nt + "px"; }
    function up() {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
      el.classList.remove("is-dragging"); dragging = false; showGuides();
      if (!moved) return;
      el.dataset.moved = "1"; setTimeout(function () { delete el.dataset.moved; }, 80);   // swallows the click this drag ends with
      var q = place(parseFloat(el.style.left), parseFloat(el.style.top)), old = { anchor: p.anchor, x: p.x, y: p.y, z: p.z };
      Object.assign(p, q, { z: maxZ() + 1 }); position();
      send("PUT", "/pins/" + p.id, JSON.stringify({ anchor: p.anchor, x: p.x, y: p.y, z: p.z }), "application/json")
        .catch(function (err) { Object.assign(p, old); position(); alert("could not move it: " + err.message); });
    }
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }); });

  // a pin's corner scales it. A note: text and images together, 120 to 600 wide. An image: its width,
  // the right edge pulled to a column line. A text: width and size together, so its lines hold; with
  // shift held at the start, the width alone (the words rewrap)
  function scale(e, el, p) {
    e.preventDefault();
    var g = e.target, k = kindOf(p), sx = e.pageX, w0 = p.w || DEF[k] || 220, w = w0, rewrap = e.shiftKey;
    var st0 = styleOf(p), size0 = st0.size || 48, size = size0, lo = k === "note" ? 120 : 16, hi = k === "note" ? 600 : 2400;
    var left = el.getBoundingClientRect().left + scrollX, grid0 = cols(), L = grid0 ? lines(grid0) : [];
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
    dragging = true; showGuides();
    function move(ev) {
      w = Math.round(clamp(w0 + (ev.pageX - sx) / S, lo, hi));
      if (k === "note") { el.style.setProperty("--s", (w / 220).toFixed(3)); return; }
      if (!ev.altKey) { var b = pull(left + w * S, L, T); if (b != null && b > left) w = Math.round((b - left) / S); }
      el.style.width = w * S + "px";
      if (k === "text" && !rewrap) { size = clamp(Math.round(size0 * w / w0), 8, 400); el.style.fontSize = size * S + "px"; }
    }
    function up() {
      g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up); g.removeEventListener("pointercancel", up);
      dragging = false; showGuides();
      if (w === w0) return;
      var body = { w: w }, old = Object.assign({}, st0);
      if (size !== size0) { p.style = Object.assign({}, st0, { size: size }); body.style = p.style; }
      p.w = w; position();
      send("PUT", "/pins/" + p.id, JSON.stringify(body), "application/json")
        .catch(function (err) { p.w = w0; p.style = old; render(); alert("could not scale it: " + err.message); });
    }
    g.addEventListener("pointermove", move); g.addEventListener("pointerup", up); g.addEventListener("pointercancel", up);
  }

  // ---------- arranging the boxes ----------
  var fresh = false;   // the first arrangement is the grid as it stood; it is saved whole on the first change
  arr.addEventListener("click", function (e) {
    e.stopPropagation();
    arranging = !arranging;
    document.body.classList.toggle("is-arranging", arranging);
    arr.textContent = arranging ? "(done arranging)" : "(arrange)";
    if (arranging && !hasSpots()) { snapshot(); fresh = true; }
    if (!arranging && fresh) { spots = {}; fresh = false; }   // nothing was moved: the grid stays a grid
    back.hidden = !arranging || fresh || !hasSpots();
    tidy.hidden = !arranging;
    boxes.forEach(function (c) { var g = c.querySelector(":scope > .grip");
      if (arranging && !g) { g = document.createElement("span"); g.className = "grip"; g.title = "drag to scale"; c.appendChild(g); }
      if (!arranging && g) g.remove(); });
    arrange(); position(); showGuides();
  });
  back.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!confirm("put every box back in the grid?")) return;
    Promise.all(Object.keys(spots).map(function (id) { return send("DELETE", "/layout/" + id); })).then(function () {
      spots = {}; fresh = false; arr.click();
    }, function (err) { alert("could not reset: " + err.message); });
  });
  // every placed box to the columns at once: left edge to the nearest column, width to whole columns,
  // top to the 7px step
  tidy.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!confirm("snap every box to the columns?")) return;
    var g = cols(), ids = [];
    boxes.forEach(function (c) {
      var id = idOf(c); if (!spots[id]) return;
      var x = colLeft(g, c.offsetLeft, c.offsetWidth), w = colWidth(g, x, c.offsetWidth);
      spots[id] = { x: Math.round(x / g.W * U), y: Math.round(Math.round(c.offsetTop / BASE) * BASE / g.W * U), w: Math.round(w / g.W * U), z: spots[id].z || 0 };
      ids.push(id);
    });
    arrange(); position(); save(ids); fresh = false; back.hidden = false;
  });
  function snapshot() {
    var g = grid.getBoundingClientRect(), W = grid.clientWidth;
    boxes.forEach(function (c) { var r = c.getBoundingClientRect();
      spots[idOf(c)] = { x: Math.max(0, Math.round((r.left - g.left) / W * U)), y: Math.max(0, Math.round((r.top - g.top) / W * U)), w: Math.round(r.width / W * U), z: 0 }; });
  }
  function save(ids) {
    return Promise.all(ids.map(function (id) { return send("PUT", "/layout/" + id, JSON.stringify(spots[id]), "application/json"); }))
      .catch(function (err) { alert("could not keep that: " + err.message); });
  }
  // a box's left edge on a column (grid px), kept inside the grid
  function colLeft(g, x, w) { return clamp(Math.round(x / g.pitch), 0, 11) * g.pitch; }
  // a box's width as whole columns from its left edge, at least one, never past the grid's right edge
  function colWidth(g, x, w) {
    var right = Math.round((x + w + GAP) / g.pitch) * g.pitch - GAP;
    return clamp(right - x, g.cw, g.W - x);
  }
  // a box's top: level with another box's top or bottom, or a gutter under one, else on the 7px step
  function boxTop(c, t) {
    var h = c.offsetHeight, ys = [];
    boxes.forEach(function (o) { if (o === c) return; var ot = o.offsetTop, ob = ot + o.offsetHeight; ys.push(ot, ob + GAP, ob - h); });
    var y = pull(t, ys, T * 1.5);
    return Math.max(0, y != null ? y : Math.round(t / BASE) * BASE);
  }
  // while arranging, a click on a box does not open it
  document.addEventListener("click", function (e) { if (arranging && e.target.closest && e.target.closest(".work__grid .card")) { e.preventDefault(); e.stopPropagation(); } }, true);
  if (grid) grid.addEventListener("pointerdown", function (e) {
    if (!arranging || e.button) return;
    var c = e.target.closest(".card"); if (!c) return;
    e.preventDefault();
    var id = idOf(c), W = grid.clientWidth, sizing = e.target.classList.contains("grip"), g = cols();
    var sx = e.pageX, sy = e.pageY, ox = c.offsetLeft, oy = c.offsetTop, ow = c.offsetWidth, moved = false;
    try { c.setPointerCapture(e.pointerId); } catch (err) {}
    c.classList.add("is-dragging"); c.style.zIndex = 9998;
    function move(ev) {
      var dx = ev.pageX - sx, dy = ev.pageY - sy; if (!moved && Math.hypot(dx, dy) < 3) return; moved = true;
      if (sizing) {
        var nw = Math.min(Math.max(W * .05, ow + dx), W - ox);
        c.style.width = (ev.altKey ? nw : colWidth(g, ox, nw)) + "px";
      } else {
        var nl = Math.min(Math.max(0, ox + dx), W - ow), nt = Math.max(0, oy + dy);
        if (!ev.altKey) { nl = Math.min(colLeft(g, nl, ow), W - ow); nt = boxTop(c, nt); }
        c.style.left = nl + "px"; c.style.top = nt + "px";
      }
    }
    function up() {
      c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up);
      c.classList.remove("is-dragging");
      var z = 0; Object.keys(spots).forEach(function (k) { z = Math.max(z, spots[k].z || 0); });
      if (moved) spots[id] = { x: Math.round(c.offsetLeft / W * U), y: Math.round(c.offsetTop / W * U), w: Math.round(c.offsetWidth / W * U), z: z + 1 };
      arrange(); position();
      if (!moved) return;
      save(fresh ? Object.keys(spots) : [id]); fresh = false; back.hidden = false;
    }
    c.addEventListener("pointermove", move); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  });

  // a note's picture: the long edge to 1600px, JPEG at .85 (as the thoughts board does); a small gif goes up as it is
  function shrink(file) {
    if (file.type === "image/gif" && file.size < 1200000) return Promise.resolve(file);
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? resolve(b) : reject(); }, "image/jpeg", 0.85);
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(); };
      im.src = url;
    });
  }
  // a collage image keeps its transparency: a small png, webp or gif goes up as it is; anything bigger
  // is redrawn to 1600px on its long edge (a photo as JPEG, the rest as WebP, PNG where the browser cannot
  // write WebP), smaller again until it fits under the worker's cap. Resolves {blob, w: its natural width}
  function keep(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        URL.revokeObjectURL(url);
        var nw = im.naturalWidth, nh = im.naturalHeight, photo = file.type === "image/jpeg";
        if (!photo && file.size < 1200000 && Math.max(nw, nh) <= 1600) return resolve({ blob: file, w: nw });
        (function draw(edge) {
          var s = Math.min(1, edge / Math.max(nw, nh)), c = document.createElement("canvas");
          c.width = Math.round(nw * s); c.height = Math.round(nh * s);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(function (b) {
            if (!b) return reject(new Error("could not read it"));
            if (b.size > 1400000 && edge > 400) return draw(Math.round(edge * .75));
            resolve({ blob: b, w: Math.min(nw, c.width) });
          }, photo ? "image/jpeg" : "image/webp", photo ? .85 : .9);
        })(1600);
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("could not read it")); };
      im.src = url;
    });
  }
})();
