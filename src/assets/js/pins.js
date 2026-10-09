/* Notes pinned on the homepage's empty spaces: Raghav's workspace on the page, sketches, thoughts and
   opinions on black post-its, seen by everyone. They come from the thoughts worker (/pins).
   With the owner key (typed once on /thoughts/ via (key), kept in localStorage as "thoughts-key"):
   (+ note) by the city label, then click an empty spot to write there; drag a note to move it; (edit)
   and (×) on each. Images go up through the worker's /images, downscaled here first.
   A note hangs from the nearest section above it (the top, (selected work), a group break, about,
   contact), x measured from the page's centre line, so it stays by the same content at another width.
   Under 900px there is no free space, so the notes hide. */
(function () {
  "use strict";
  var me = document.currentScript, api = me && me.dataset.api;
  if (!api) return;
  var key = ""; try { key = localStorage.getItem("thoughts-key") || ""; } catch (e) {}
  var owner = !!key, pins = [], layer = document.createElement("div");
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

  // ---------- where things hang ----------
  function anchors() {
    var out = [{ key: "top", top: 0 }];
    var w = document.getElementById("work"); if (w) out.push({ key: "work", top: docTop(w) });
    document.querySelectorAll(".work__break").forEach(function (b) { out.push({ key: "break:" + b.textContent.trim(), top: docTop(b) }); });
    ["about", "contact"].forEach(function (id) { var el = document.getElementById(id); if (el) out.push({ key: id, top: docTop(el) }); });
    return out.sort(function (a, b) { return a.top - b.top; });
  }
  function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function place(docX, docY) {   // a point on the page -> {anchor, x, y}
    var A = anchors(), a = A[0];
    A.forEach(function (c) { if (c.top <= docY) a = c; });
    return { anchor: a.key, x: Math.round(docX - innerWidth / 2), y: Math.round(docY - a.top) };
  }
  function at(p) {   // {anchor, x, y} -> a point on the page
    var A = anchors(), a = A.filter(function (c) { return c.key === p.anchor; })[0] || A[0];
    return { left: innerWidth / 2 + p.x, top: a.top + p.y };
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
    el.style.width = p.w + "px";
    el.innerHTML = (p.images || []).map(function (i) { return '<img class="pin__img" src="' + api + "/images/" + i + '" alt="" loading="lazy" />'; }).join("") +
      (p.body ? "<p>" + esc(p.body) + "</p>" : "") +
      (owner ? '<span class="pin__tools"><a href="#" data-edit>(edit)</a> <a href="#" data-del>(×)</a></span>' : "");
    el.querySelectorAll("img").forEach(function (im) { im.addEventListener("load", position); });
    return el;
  }
  function position() {
    layer.querySelectorAll(".pin").forEach(function (el) {
      var p = byId(el.dataset.id) || draft; if (!p) return;
      var q = at(p), w = el.offsetWidth;
      el.style.left = Math.round(Math.min(Math.max(8, q.left), innerWidth - w - 8)) + "px";
      el.style.top = Math.round(q.top) + "px";
      el.style.zIndex = 2 + (p.z || 0);
    });
  }
  function byId(id) { return pins.filter(function (p) { return p.id === id; })[0]; }

  fetch(api + "/pins").then(function (r) { return r.json(); }).then(function (j) { pins = j.pins || []; render(); }, function () {});
  window.addEventListener("resize", position);
  if (window.ResizeObserver) new ResizeObserver(position).observe(document.body);
  setInterval(position, 1500);   // the grid repacks itself when a filter is chosen; follow it

  if (!owner) return;

  // ---------- the owner's tools ----------
  var add = document.createElement("button"), draft = null;
  add.type = "button"; add.className = "pin-add"; add.textContent = "(+ note)";
  add.title = "click, then click an empty spot on the page";
  document.body.appendChild(add);
  add.addEventListener("click", function (e) { e.stopPropagation(); document.body.classList.toggle("is-pinning"); });
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
