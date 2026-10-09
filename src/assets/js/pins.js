/* The homepage as Raghav's workspace, seen by everyone, changed only with the owner key (typed once on
   /thoughts/ via (key), kept in localStorage as "thoughts-key").
   Notes: sketches, thoughts and opinions on black post-its, from the thoughts worker (/pins). (+ note)
   by the city label, then click an empty spot to write there; drag a note to move it, its corner to
   scale it; (edit) and (×) on each. Images go up through the worker's /images, downscaled here first.
   Project boxes: once he has arranged them, the grid's rows and breaks give way to his arrangement
   (worker /layout, ids home-<slug>, in ten-thousandths of the grid's width so it holds at any width).
   (arrange) to drag a box or scale it by its corner, each change kept as it is made; (back to grid)
   forgets the arrangement.
   A note stays exactly where it was dropped on the page: y from the top of the page, x from the page's
   centre line (so it keeps its place beside the content at another width). Nothing else moves it.
   Under 900px there is no free space: the notes hide and the boxes stack as before. */
(function () {
  "use strict";
  var me = document.currentScript, api = me && me.dataset.api;
  if (!api) return;
  var key = ""; try { key = localStorage.getItem("thoughts-key") || ""; } catch (e) {}
  var owner = !!key, pins = [], layer = document.createElement("div"), wide = window.matchMedia("(min-width: 901px)");
  layer.className = "pins";
  document.body.appendChild(layer);

  function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function tilt(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return { r: ((h & 255) / 255 * 4 - 2).toFixed(2), alt: (h >> 8) & 1 }; }
  function send(method, path, body, type) {
    var h = { "X-Owner-Key": key }; if (type) h["Content-Type"] = type;
    return fetch(api + path, { method: method, headers: h, body: body }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "failed"); return j; });
    });
  }

  // ---------- the project boxes, where he put them ----------
  var grid = document.querySelector("[data-grid]"), boxes = grid ? Array.prototype.slice.call(grid.querySelectorAll(".card")) : [];
  var U = 10000, spots = {}, arranging = false;
  function idOf(c) { var a = c.querySelector("[data-project]"); return "home-" + ((a && a.getAttribute("data-project")) || "").replace(/^\/work\//, "").replace(/\/$/, "").replace(/[^A-Za-z0-9_-]/g, "-"); }
  function hasSpots() { return boxes.some(function (c) { return spots[idOf(c)]; }); }
  function arrange() {
    if (!grid) return;
    var on = wide.matches && (arranging || hasSpots());
    grid.classList.toggle("is-free", on);
    if (!on) { boxes.forEach(function (c) { c.style.left = c.style.top = c.style.width = c.style.zIndex = ""; }); grid.style.height = ""; return; }
    var W = grid.clientWidth, bottom = 0, loose = [];
    boxes.forEach(function (c) { var s = spots[idOf(c)]; if (!s) { loose.push(c); return; }
      c.style.left = s.x / U * W + "px"; c.style.top = s.y / U * W + "px"; c.style.width = s.w / U * W + "px"; c.style.zIndex = 1 + (s.z || 0); });
    boxes.forEach(function (c) { if (spots[idOf(c)]) bottom = Math.max(bottom, c.offsetTop + c.offsetHeight); });
    // a project added since he arranged them waits in rows of three under the rest until it is moved
    loose.forEach(function (c, i) { c.style.width = W * .3 + "px"; c.style.left = (i % 3) * W * .35 + "px"; c.style.top = bottom + 80 + Math.floor(i / 3) * W * .35 + "px"; c.style.zIndex = 1; });
    var end = 0; boxes.forEach(function (c) { end = Math.max(end, c.offsetTop + c.offsetHeight); });
    grid.style.height = end + 40 + "px";
  }
  if (grid) {
    // visitors on a wide screen: hold the grid back until the arrangement is known, so it does not jump
    var unwait = function () { grid.classList.remove("board-wait"); };
    if (wide.matches) { grid.classList.add("board-wait"); setTimeout(unwait, 1500); }
    fetch(api + "/layout").then(function (r) { return r.json(); }).then(function (j) {
      var L = j.layout || {}; Object.keys(L).forEach(function (k) { spots[k] = L[k]; }); arrange(); unwait(); position();
    }, unwait);
    window.addEventListener("resize", arrange);
    if (wide.addEventListener) wide.addEventListener("change", arrange);
  }

  // ---------- where a note sits ----------
  function place(docX, docY) {   // a point on the page -> {anchor, x, y}
    return { anchor: "top", x: Math.round(docX - innerWidth / 2), y: Math.round(docY) };
  }
  function at(p) {   // {anchor, x, y} -> a point on the page
    return { left: innerWidth / 2 + p.x, top: p.y };
  }

  // ---------- drawing the notes ----------
  function render() {
    layer.innerHTML = "";
    pins.forEach(function (p) { layer.appendChild(note(p)); });
    position();
  }
  function note(p) {
    var t = tilt(p.id), el = document.createElement("div");
    el.className = "pin postit" + (t.alt ? " alt" : "");
    el.dataset.id = p.id;
    el.style.setProperty("--r", t.r + "deg");
    el.style.setProperty("--s", ((p.w || 220) / 220).toFixed(3));
    el.innerHTML = (p.images || []).map(function (i) { return '<img class="pin__img" src="' + api + "/images/" + i + '" alt="" loading="lazy" />'; }).join("") +
      (p.body ? "<p>" + esc(p.body) + "</p>" : "") +
      (owner ? '<span class="pin__tools"><a href="#" data-edit>(edit)</a> <a href="#" data-del>(×)</a></span><span class="grip" title="drag to scale"></span>' : "");
    el.querySelectorAll("img").forEach(function (im) { im.addEventListener("load", position); });
    return el;
  }
  function position() {
    layer.querySelectorAll(".pin").forEach(function (el) {
      var p = byId(el.dataset.id) || draft; if (!p) return;
      var q = at(p), w = p.w || 220;
      el.style.left = Math.round(Math.min(Math.max(8, q.left), innerWidth - w - 8)) + "px";
      el.style.top = Math.round(q.top) + "px";
      el.style.zIndex = 2 + (p.z || 0);
    });
  }
  function byId(id) { return pins.filter(function (p) { return p.id === id; })[0]; }

  fetch(api + "/pins").then(function (r) { return r.json(); }).then(function (j) { pins = j.pins || []; render(); }, function () {});
  window.addEventListener("resize", position);

  if (!owner) return;

  // ---------- the owner's tools ----------
  var add = document.createElement("button"), draft = null;
  add.type = "button"; add.className = "pin-add"; add.textContent = "(+ note)";
  add.title = "click, then click an empty spot on the page";
  document.body.appendChild(add);
  add.addEventListener("click", function (e) { e.stopPropagation(); document.body.classList.toggle("is-pinning"); });
  var arr = tool("(arrange)", "drag a box to move it, its corner to scale it", 110), back = tool("(back to grid)", "forget the arrangement", 132);
  back.hidden = true;
  function tool(label, title, top) {
    var b = document.createElement("button"); b.type = "button"; b.className = "pin-add"; b.textContent = label; b.title = title; b.style.top = top + "px";
    if (grid) document.body.appendChild(b); return b; }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { document.body.classList.remove("is-pinning"); if (draft) cancel(); } });
  document.addEventListener("click", function (e) {
    if (!document.body.classList.contains("is-pinning") || e.target.closest(".pin, .pin-add")) return;
    e.preventDefault(); e.stopPropagation();
    document.body.classList.remove("is-pinning");
    if (draft) cancel();
    draft = Object.assign({ id: "draft", body: "", images: [], w: 220, z: maxZ() + 1 }, place(e.pageX, e.pageY));
    var el = note(draft); layer.appendChild(el); position(); edit(el, draft);
  }, true);
  function maxZ() { return pins.reduce(function (m, p) { return Math.max(m, p.z || 0); }, 0); }
  function cancel() { var el = layer.querySelector('[data-id="draft"]'); if (el) el.remove(); draft = null; }

  // the note becomes a little form: text, its images (× drops one), (+ image), (save) (cancel)
  function edit(el, p) {
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
          .then(function (j) { if (p === draft) { draft = null; pins.push(j.pin); } else pins[pins.indexOf(p)] = j.pin; render(); },
                function (err) { msg.textContent = err.message === "no" ? "the key was not accepted" : err.message; });
      }
    });
  }

  layer.addEventListener("click", function (e) {
    var a = e.target.closest("[data-edit], [data-del]"); if (!a) return;
    e.preventDefault();
    var el = a.closest(".pin"), p = byId(el.dataset.id);
    if ("edit" in a.dataset) return edit(el, p);
    if (!confirm("take this note down?")) return;
    send("DELETE", "/pins/" + p.id).then(function () { pins.splice(pins.indexOf(p), 1); render(); }, function (err) { alert(err.message); });
  });

  // drag a note to move it; it comes to the front and keeps where it was dropped
  layer.addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".pin"); if (!el || el.classList.contains("is-editing") || e.target.closest("a, label") || e.button) return;
    var p = byId(el.dataset.id); if (!p) return;
    if (e.target.classList.contains("grip")) return scale(e, el, p);
    var sx = e.pageX, sy = e.pageY, ox = parseFloat(el.style.left), oy = parseFloat(el.style.top), moved = false;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    function move(ev) {
      var dx = ev.pageX - sx, dy = ev.pageY - sy; if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true; el.classList.add("is-dragging");
      el.style.left = ox + dx + "px"; el.style.top = oy + dy + "px"; }
    function up() {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.classList.remove("is-dragging");
      if (!moved) return;
      var q = place(parseFloat(el.style.left), parseFloat(el.style.top)), old = { anchor: p.anchor, x: p.x, y: p.y, z: p.z };
      Object.assign(p, q, { z: maxZ() + 1 }); position();
      send("PUT", "/pins/" + p.id, JSON.stringify({ anchor: p.anchor, x: p.x, y: p.y, z: p.z }), "application/json")
        .catch(function (err) { Object.assign(p, old); position(); alert("could not move it: " + err.message); });
    }
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up);
  });

  // a note's corner scales it, text and images together, 120 to 600px wide
  function scale(e, el, p) {
    e.preventDefault();
    var g = e.target, sx = e.pageX, w0 = p.w || 220, w = w0;
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
    function move(ev) { w = Math.round(Math.min(600, Math.max(120, w0 + ev.pageX - sx))); el.style.setProperty("--s", (w / 220).toFixed(3)); }
    function up() {
      g.removeEventListener("pointermove", move); g.removeEventListener("pointerup", up);
      if (w === w0) return;
      p.w = w; position();
      send("PUT", "/pins/" + p.id, JSON.stringify({ w: w }), "application/json")
        .catch(function (err) { p.w = w0; el.style.setProperty("--s", (w0 / 220).toFixed(3)); position(); alert("could not scale it: " + err.message); });
    }
    g.addEventListener("pointermove", move); g.addEventListener("pointerup", up);
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
    boxes.forEach(function (c) { var g = c.querySelector(":scope > .grip");
      if (arranging && !g) { g = document.createElement("span"); g.className = "grip"; g.title = "drag to scale"; c.appendChild(g); }
      if (!arranging && g) g.remove(); });
    arrange(); position();
  });
  back.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!confirm("put every box back in the grid?")) return;
    Promise.all(Object.keys(spots).map(function (id) { return send("DELETE", "/layout/" + id); })).then(function () {
      spots = {}; fresh = false; arr.click();
    }, function (err) { alert("could not reset: " + err.message); });
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
  // while arranging, a click on a box does not open it
  document.addEventListener("click", function (e) { if (arranging && e.target.closest && e.target.closest(".work__grid .card")) { e.preventDefault(); e.stopPropagation(); } }, true);
  if (grid) grid.addEventListener("pointerdown", function (e) {
    if (!arranging || e.button) return;
    var c = e.target.closest(".card"); if (!c) return;
    e.preventDefault();
    var id = idOf(c), W = grid.clientWidth, sizing = e.target.classList.contains("grip");
    var sx = e.pageX, sy = e.pageY, ox = c.offsetLeft, oy = c.offsetTop, ow = c.offsetWidth, moved = false;
    try { c.setPointerCapture(e.pointerId); } catch (err) {}
    c.classList.add("is-dragging"); c.style.zIndex = 9998;
    function move(ev) {
      var dx = ev.pageX - sx, dy = ev.pageY - sy; if (!moved && Math.hypot(dx, dy) < 3) return; moved = true;
      if (sizing) c.style.width = Math.min(Math.max(W * .05, ow + dx), W - ox) + "px";
      else { c.style.left = Math.min(Math.max(0, ox + dx), W - ow) + "px"; c.style.top = Math.max(0, oy + dy) + "px"; }
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

  // the long edge to 1600px, JPEG at .85 (as the thoughts board does); a small gif goes up as it is
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
})();
