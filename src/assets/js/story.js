/* raghavkohli.xyz — the story layout (project.njk, a project with `story:`)
   Callouts ("beats") on the left, a sticky media stage on the right. Every beat ships with its own
   frame inline (that is the phone layout, and the no-JS layout); on a wide screen this lifts the
   frames into the stage and shows the one whose beat sits in the middle of the scroll container.
   Also: post-its on the frames drag (pointer events, held inside the frame with a little overhang,
   reset when the beat changes, never saved), and a beat marked `interaction: true` mounts the
   project's interaction module from /assets/js/interactions/<name>.js.

   Runs on the standalone /work/<slug>/ page by itself, and inside the homepage overlay when main.js
   calls Story.init(article, { root: panel }). Init returns { destroy }. */
(function () {
  "use strict";

  var WIDE = "(min-width: 821px)";
  var OVERHANG = 30;   // px a post-it may hang past the frame's edge
  var slice = function (l) { return Array.prototype.slice.call(l); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- interactions: one module per file, registered by name ----------
     A module is window.StoryInteractions[name] = { mount: function (el, data) {} }. It is fetched the
     first time a story needs it; `data` is the JSON project.njk embedded from src/_data/interactions.js. */
  var registry = window.StoryInteractions = window.StoryInteractions || {};
  var loading = {};
  function load(name) {
    if (registry[name]) return Promise.resolve(registry[name]);
    if (!/^[a-z0-9-]+$/.test(name)) return Promise.reject(new Error("bad interaction name: " + name));
    if (!loading[name]) {
      loading[name] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "/assets/js/interactions/" + name + ".js";
        s.onload = function () { registry[name] ? resolve(registry[name]) : reject(new Error("not registered: " + name)); };
        s.onerror = function () { delete loading[name]; reject(new Error("could not load: " + name)); };
        document.head.appendChild(s);
      });
    }
    return loading[name];
  }
  function mountAll(article) {
    slice(article.querySelectorAll("[data-mount]")).forEach(function (el) {
      if (el.dataset.mounted) return;
      el.dataset.mounted = "1";
      var data = null, js = el.querySelector('script[type="application/json"]');
      if (js) { try { data = JSON.parse(js.textContent); } catch (e) { data = null; } }
      load(el.getAttribute("data-mount")).then(function (mod) {
        var nojs = el.querySelector(".frame__nojs");
        if (nojs) nojs.remove();
        mod.mount(el, data);
      }).catch(function (e) { console.warn("[story]", e.message); });
    });
  }

  /* ---------- post-its: drag inside the frame ---------- */
  function dragNotes(article) {
    slice(article.querySelectorAll(".frame .postit")).forEach(function (n) {
      var id = null, sx = 0, sy = 0, lim = null;
      n.addEventListener("pointerdown", function (e) {
        if (e.button !== 0 || id !== null) return;
        var box = n.parentNode;
        var dx = parseFloat(n.style.getPropertyValue("--dx")) || 0;
        var dy = parseFloat(n.style.getPropertyValue("--dy")) || 0;
        // offsetLeft/Top ignore the transform, so they are the note's resting place in the frame
        var L = n.offsetLeft, T = n.offsetTop, w = n.offsetWidth, h = n.offsetHeight;
        lim = { x0: -OVERHANG - L, x1: box.clientWidth - w + OVERHANG - L,
                y0: -OVERHANG - T, y1: box.clientHeight - h + OVERHANG - T };
        sx = e.clientX - dx; sy = e.clientY - dy;
        id = e.pointerId;
        try { n.setPointerCapture(id); } catch (err) {}
        n.classList.remove("stick");
        n.classList.add("dragging");
        e.preventDefault();
      });
      n.addEventListener("pointermove", function (e) {
        if (e.pointerId !== id) return;
        n.style.setProperty("--dx", clamp(e.clientX - sx, lim.x0, lim.x1) + "px");
        n.style.setProperty("--dy", clamp(e.clientY - sy, lim.y0, lim.y1) + "px");
      });
      function end(e) {
        if (e.pointerId !== id) return;
        id = null;
        n.classList.remove("dragging");
      }
      n.addEventListener("pointerup", end);
      n.addEventListener("pointercancel", end);
    });
  }
  // a beat's media appearing: its notes go back where they were authored and stick on again
  function stick(frame) {
    slice(frame.querySelectorAll(".postit")).forEach(function (n) {
      n.style.removeProperty("--dx");
      n.style.removeProperty("--dy");
      n.classList.remove("stick");
      void n.offsetWidth;   // restart the animation
      n.classList.add("stick");
    });
  }

  /* ---------- the stage ---------- */
  function init(article, opts) {
    opts = opts || {};
    var beats = slice(article.querySelectorAll(".beat"));
    var frames = beats.map(function (b) { return b.querySelector(".frame"); });
    var stage = article.querySelector(".story__stage");
    var mq = window.matchMedia(WIDE);
    var active = -1, io = null;

    mountAll(article);
    dragNotes(article);

    // wide: every frame in the stage, one showing; narrow: each frame back above its own text
    function place() {
      var wide = mq.matches && !!stage;
      article.classList.add("story--js");
      article.classList.toggle("story--staged", wide);
      frames.forEach(function (f, i) {
        if (!f) return;
        if (wide) { if (f.parentNode !== stage) stage.appendChild(f); }
        else if (f.parentNode !== beats[i]) beats[i].insertBefore(f, beats[i].firstChild);
      });
    }
    function setActive(i) {
      if (i < 0 || i === active) return;
      active = i;
      beats.forEach(function (b, k) { b.classList.toggle("on", k === i); });
      frames.forEach(function (f, k) { if (f) f.classList.toggle("on", k === i); });
      if (frames[i]) stick(frames[i]);
    }

    place();
    setActive(0);
    if ("IntersectionObserver" in window) {
      // the beat crossing the middle tenth of the scroll container is the one on stage
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) setActive(beats.indexOf(e.target)); });
      }, { root: opts.root || null, rootMargin: "-45% 0px -45% 0px" });
      beats.forEach(function (b) { io.observe(b); });
    }
    var onChange = function () { place(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);

    return {
      destroy: function () {
        if (io) io.disconnect();
        if (mq.removeEventListener) mq.removeEventListener("change", onChange); else mq.removeListener(onChange);
      }
    };
  }

  window.Story = { init: init };

  // the standalone /work/<slug>/ page: the window scrolls
  document.querySelectorAll("article[data-story]").forEach(function (a) {
    if (!a.closest(".pv")) init(a, { root: null });
  });
})();
