/* raghavkohli.xyz — the story layout (project.njk, a project with `story:`)
   Callouts ("beats") on the left, a sticky media stage on the right. Every beat ships with its own
   frame inline (that is the phone layout, and the no-JS layout); on a wide screen this lifts the
   frames into the stage and shows the one whose beat sits in the middle of the scroll container.
   Also: post-its on the frames drag (pointer events, held inside the frame with a little overhang,
   reset when the beat changes, never saved), and a beat marked `interaction: true` mounts the
   project's interaction module from /assets/js/interactions/<name>.js.
   On a wide screen the stage is also a slideshow (2026-10-12): a pager under the picture, ← / →
   on the keyboard and (play) step through the beats, and the text on the left scrolls along with it.
   A beat's video (an animation of the work) plays only while it is on stage.

   Runs on the standalone /work/<slug>/ page by itself, and inside the homepage overlay when main.js
   calls Story.init(article, { root: panel }). Init returns { destroy }. */
(function () {
  "use strict";

  var WIDE = "(min-width: 718px)";
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

  /* ---------- a figure with its own layout, fitted to the stage ----------
     A swap, a stack, a comparison or a tile grid lays itself out at the stage's width; if that comes
     out taller than the screen it is scaled down, from the top centre, until all of it fits. */
  function fit(frame, stage) {
    var inner = frame && frame.querySelector(".frame__fit");
    if (!inner || !stage.offsetHeight) return;
    inner.style.transform = "";
    var k = Math.min(1, (frame.clientHeight || stage.clientHeight) / Math.max(1, inner.scrollHeight));
    if (k < 1) inner.style.transform = "scale(" + k.toFixed(4) + ")";
  }

  /* ---------- the stage ---------- */
  function init(article, opts) {
    opts = opts || {};
    var beats = slice(article.querySelectorAll(".beat"));
    var frames = beats.map(function (b) { return b.querySelector(".frame"); });
    var stage = article.querySelector(".story__stage");
    var mq = window.matchMedia(WIDE);
    var active = -1, shown = -1, io = null;
    var scroller = opts.root || null, ctl = null, pos = null, segs = [], playBtn = null;
    var lock = -1, lockT = 0, timer = 0;
    var STEP = 6000;   // (play): one beat every six seconds
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    mountAll(article);
    dragNotes(article);

    // wide: every frame in the stage, one showing; narrow: each frame back above its own text
    function place() {
      var wide = mq.matches && !!stage;
      article.classList.add("story--js");
      article.classList.toggle("story--staged", wide);
      if (wide) pager(); else stop();
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
      // a beat with no figure of its own (a text-only chapter) keeps the last one on stage
      var show = i;
      while (show > 0 && !frames[show]) show--;
      shown = show;
      frames.forEach(function (f, k) { if (f) f.classList.toggle("on", k === show); });
      if (frames[show]) { stick(frames[show]); if (stage) fit(frames[show], stage); }
      // only the picture on stage moves; the rest wait at their first frame
      frames.forEach(function (f, k) {
        if (!f) return;
        slice(f.querySelectorAll("video")).forEach(function (v) {
          if (k === show && !still) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else { v.pause(); if (k !== show) v.currentTime = 0; }
        });
      });
      if (pos) pos.textContent = pad(i + 1) + " / " + pad(beats.length);
      segs.forEach(function (g, k) { g.classList.toggle("on", k === i); });
      if (timer) { ctl.classList.remove("is-auto"); void ctl.offsetWidth; ctl.classList.add("is-auto"); }
    }
    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    /* ---------- the slideshow: a pager under the stage, the text scrolling along ---------- */
    function pager() {
      if (ctl || !stage || beats.length < 2) return;
      ctl = document.createElement("div");
      ctl.className = "story__ctl";
      var rule = document.createElement("div");
      rule.className = "story__rule";
      beats.forEach(function (b, k) {
        var g = document.createElement("button");
        g.type = "button";
        g.setAttribute("aria-label", "to " + pad(k + 1));
        g.addEventListener("click", function () { go(k); });
        rule.appendChild(g); segs.push(g);
      });
      var nav = document.createElement("div");
      nav.className = "story__nav";
      nav.innerHTML = '<button type="button" class="story__play" aria-pressed="false">(play)</button>' +
        '<button type="button" data-step="-1" aria-label="previous">(&larr;)</button>' +
        '<span class="story__pos"></span>' +
        '<button type="button" data-step="1" aria-label="next">(&rarr;)</button>';
      nav.addEventListener("click", function (e) {
        var t = e.target.closest("button");
        if (!t) return;
        if (t.dataset.step) go(active + +t.dataset.step);
        else if (timer) stop(); else play();
      });
      ctl.appendChild(rule); ctl.appendChild(nav);
      stage.appendChild(ctl);
      pos = nav.querySelector(".story__pos");
      playBtn = nav.querySelector(".story__play");
      pos.textContent = pad(active + 1) + " / " + pad(beats.length);
      segs.forEach(function (g, k) { g.classList.toggle("on", k === active); });
    }
    // step to a beat: the stage changes now, and the text scrolls so that beat sits in the reading band
    function go(i) {
      i = clamp(i, 0, beats.length - 1);
      if (i === active) return;
      setActive(i);
      lock = i; hold(500);
      var vh = scroller ? scroller.clientHeight : window.innerHeight;
      var top0 = scroller ? scroller.getBoundingClientRect().top : 0;
      var y = (scroller ? scroller.scrollTop : window.pageYOffset) + beats[i].getBoundingClientRect().top - top0 - vh * 0.3;
      (scroller || window).scrollTo({ top: Math.max(0, y), behavior: still ? "auto" : "smooth" });
      if (timer) { clearInterval(timer); timer = setInterval(tick, STEP); }
    }
    // while a step's scroll runs, the beats it passes do not take the stage
    function hold(ms) { clearTimeout(lockT); lockT = setTimeout(function () { lock = -1; }, ms); }
    function tick() { if (active >= beats.length - 1) stop(); else go(active + 1); }
    function play() {
      if (!ctl) return;
      if (active >= beats.length - 1) go(0);
      timer = setInterval(tick, STEP);
      ctl.classList.add("is-auto");
      playBtn.textContent = "(pause)"; playBtn.setAttribute("aria-pressed", "true");
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer); timer = 0;
      ctl.classList.remove("is-auto");
      playBtn.textContent = "(play)"; playBtn.setAttribute("aria-pressed", "false");
    }
    var onScroll = function () {
      if (lock >= 0) hold(160);
      else if (timer) stop();   // reading at your own pace takes over from (play)
    };
    (scroller || window).addEventListener("scroll", onScroll, { passive: true });
    var onKey = function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      if (!ctl || !article.classList.contains("story--staged") || !article.isConnected) return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;   // a swap or carousel in focus keeps its own arrows
      var b = document.body.classList;
      if (b.contains("lb-open") || (scroller && !b.contains("pv-open"))) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      go(active + (e.key === "ArrowRight" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);

    place();
    setActive(0);
    if ("IntersectionObserver" in window) {
      // the beat crossing a band a third of the way down is the one on stage: the pictures sit at the
      // top of the stage now, so the text that names one is read level with it, not at mid-screen
      io = new IntersectionObserver(function (entries) {
        if (lock >= 0) return;
        entries.forEach(function (e) { if (e.isIntersecting) setActive(beats.indexOf(e.target)); });
      }, { root: opts.root || null, rootMargin: "-28% 0px -62% 0px" });
      beats.forEach(function (b) { io.observe(b); });
    }
    // a late image (lazy, inside a hidden frame) can change a block's height: fit it again
    frames.forEach(function (f) {
      if (f && f.querySelector(".frame__fit")) f.addEventListener("load", function () { if (f.classList.contains("on")) fit(f, stage); }, true);
    });
    var onResize = function () { if (frames[shown]) fit(frames[shown], stage); };
    window.addEventListener("resize", onResize);
    var onChange = function () { place(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);

    return {
      destroy: function () {
        if (io) io.disconnect();
        stop(); clearTimeout(lockT);
        (scroller || window).removeEventListener("scroll", onScroll);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
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
