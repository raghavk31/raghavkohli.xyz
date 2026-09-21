/* raghavkohli.xyz — interactions ported from Portfolio.dc.html
   Everything is guarded so pages without a given block (e.g. /work/*) are safe. */
(function () {
  "use strict";

  /* ---------- reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal, [data-reveal]");
  if (reveals.length) {
    if (!("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- card: flip the floating meta panel to whichever side has room ---------- */
  document.querySelectorAll(".card__click").forEach(function (card) {
    card.addEventListener("mouseenter", function () {
      var meta = card.querySelector(".card__meta");
      if (!meta) return;
      var r = card.getBoundingClientRect();
      var need = 200, vw = window.innerWidth;
      var rs = vw - r.right, ls = r.left;
      var side = rs >= need ? "right" : (ls >= need ? "left" : (rs >= ls ? "right" : "left"));
      meta.classList.remove("left", "right");
      meta.classList.add(side);
    });
  });

  /* ---------- card: rotating covers ----------
     The frame holds the thumb plus N pre-cropped alternates (.card__alt); one is "on" at a time.
     While a card is in view it steps every COVER_MS, each card offset by its position so the grid
     never blinks in unison. Hovering a square in the strip shows that cover; the pointer over the
     card otherwise holds the current one. Reduced motion: the strip still works, nothing rotates. */
  (function () {
    var COVER_MS = 5200, STAGGER = 900;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card__click"));
    cards.forEach(function (card, ci) {
      var alts = Array.prototype.slice.call(card.querySelectorAll(".card__alt"));
      if (!alts.length) return;
      var squares = Array.prototype.slice.call(card.querySelectorAll(".card__thumb[data-i]"));
      var n = alts.length + 1, idx = 0, timer = null, inView = false, held = false;
      var frame = card.querySelector(".card__frame");
      function show(i) {
        idx = (i + n) % n;
        frame.classList.toggle("is-alt", idx !== 0); // the fig label names the thumb only
        alts.forEach(function (im, k) { im.classList.toggle("on", k + 1 === idx); });
        squares.forEach(function (sq, k) { sq.classList.toggle("on", k + 1 === idx); });
      }
      function tick() { timer = null; if (!inView || held || document.hidden) return; show(idx + 1); timer = setTimeout(tick, COVER_MS); }
      function sync(delay) {
        var run = inView && !held && !reduce && !document.hidden;
        if (run && timer === null) timer = setTimeout(tick, delay == null ? COVER_MS : delay);
        if (!run && timer !== null) { clearTimeout(timer); timer = null; }
      }
      squares.forEach(function (sq, k) {
        sq.addEventListener("mouseenter", function () { show(k + 1); });
        sq.addEventListener("focus", function () { show(k + 1); });
      });
      // the squares join the tab order only while the card holds focus (D12), so a keyboard
      // reader tabs card → its covers → next card, not through every square on the page
      card.addEventListener("focusin", function () { squares.forEach(function (sq) { sq.tabIndex = 0; }); });
      card.addEventListener("focusout", function (e) { if (!card.contains(e.relatedTarget)) squares.forEach(function (sq) { sq.tabIndex = -1; }); });
      card.addEventListener("mouseenter", function () { held = true; sync(); });
      card.addEventListener("mouseleave", function () { held = false; sync(); });
      document.addEventListener("visibilitychange", function () { sync(); });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (en) {
          inView = en[0].isIntersecting;
          // first step after a stagger keyed to the card's place in the grid
          sync(COVER_MS + (ci % 4) * STAGGER);
        }, { threshold: 0.35 }).observe(card);
      }
    });
  })();

  /* ---------- (work) keyword filter — reorders + resizes the grid, FLIP-animated ---------- */
  var grid = document.querySelector("[data-grid]");
  var filterBar = document.querySelector("[data-filters]");
  if (grid && filterBar) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
    // the authored structure: each group break followed by its cards, in resting order
    var resting = [];
    Array.prototype.forEach.call(Array.prototype.slice.call(grid.children), function (el) {
      if (el.classList.contains("work__break")) resting.push({ brk: el, cards: [] });
      else if (el.classList.contains("work__row")) {
        if (!resting.length) resting.push({ brk: null, cards: [] });
        Array.prototype.push.apply(resting[resting.length - 1].cards, Array.prototype.slice.call(el.children));
      }
    });

    // union of every card's topics, in first-seen order
    var topics = [];
    cards.forEach(function (c) {
      (c.getAttribute("data-topics") || "").split(/\s+/).forEach(function (t) {
        if (t && topics.indexOf(t) === -1) topics.push(t);
      });
    });

    var active = null;

    function topicsOf(card) {
      return (card.getAttribute("data-topics") || "").split(/\s+/);
    }

    function applyFilter(topic) {
      // FLIP: measure, mutate, invert, play — so the reflow animates smoothly
      var first = cards.map(function (c) { return c.getBoundingClientRect(); });

      // relevance re-weights the grid: the tag's position in a card's ordered topics decides its
      // width — first topic → two per row, a later topic → three, absent → four and receded.
      // Without a topic every card returns to its resting weight (data-weight).
      var SPAN = { 1: 6, 2: 4, 3: 3 };
      function pack(list, into) {
        // the same greedy packing as index.njk: rows of up to twelve units, cards grow by --span
        var row = null, fill = 0;
        list.forEach(function (c) {
          var span = +c.style.getPropertyValue("--span") || 4;
          if (!row || fill + span > 12) { row = document.createElement("div"); row.className = "work__row"; into.appendChild(row); fill = 0; }
          row.appendChild(c); fill += span;
        });
      }
      grid.querySelectorAll(".work__row, .work__rest").forEach(function (r) { r.remove(); });
      if (topic) {
        grid.classList.add("filtering");
        var primary = [], secondary = [], rest = [];
        cards.forEach(function (c) {
          var k = topicsOf(c).indexOf(topic);
          var w = k === 0 ? 1 : (k > 0 ? 2 : 3);
          c.classList.toggle("match", k !== -1);
          c.style.setProperty("--span", SPAN[w]);
          (k === 0 ? primary : (k > 0 ? secondary : rest)).push(c);
        });
        // matches first (primary, then secondary), the rest after; the breaks stay in place, hidden
        pack(primary.concat(secondary), grid);
        var restWrap = document.createElement("div"); restWrap.className = "work__rest"; pack(rest, restWrap); grid.appendChild(restWrap);
      } else {
        grid.classList.remove("filtering");
        cards.forEach(function (c) {
          c.classList.remove("match");
          c.style.setProperty("--span", SPAN[c.getAttribute("data-weight") || 2]);
        });
        // restore the authored structure: each break, then its cards repacked
        resting.forEach(function (seg) { if (seg.brk) grid.appendChild(seg.brk); pack(seg.cards, grid); });
      }

      cards.forEach(function (c, i) {
        var last = c.getBoundingClientRect();
        var dx = first[i].left - last.left;
        var dy = first[i].top - last.top;
        if (!dx && !dy) return;
        c.classList.remove("flip");
        c.style.transform = "translate(" + dx + "px," + dy + "px)";
      });
      // force reflow so the inverted start position is committed
      void grid.offsetWidth;
      requestAnimationFrame(function () {
        cards.forEach(function (c) {
          c.classList.add("flip");
          c.style.transform = "";
        });
      });
    }

    // "× reset" control — only visible while a filter is active
    var resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "work__reset";
    resetBtn.textContent = "× reset";
    resetBtn.setAttribute("aria-label", "reset arrangement");
    resetBtn.hidden = true;

    function setActive(topic) {
      active = topic || null;
      filterBar.querySelectorAll(".work__chip").forEach(function (b) {
        var on = !!active && b.getAttribute("data-topic") === active;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      resetBtn.hidden = !active;
      applyFilter(active);
    }

    topics.forEach(function (t) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "work__chip";
      chip.textContent = "#" + t;
      chip.setAttribute("data-topic", t);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", function () {
        setActive(active === t ? null : t);
      });
      filterBar.appendChild(chip);
    });

    resetBtn.addEventListener("click", function () { setActive(null); });
    filterBar.appendChild(resetBtn);

    // Escape also resets, unless the project overlay is open (it owns Escape then)
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && active && !document.body.classList.contains("pv-open")) setActive(null);
    });
  }

  /* ---------- (about) full-cv disclosure ---------- */
  var cvBtn = document.querySelector(".about__expand");
  var cvPanel = document.getElementById("about-cv");
  if (cvBtn && cvPanel) {
    cvPanel.inert = true; // collapsed content shouldn't be tabbable
    cvBtn.addEventListener("click", function () {
      var open = cvPanel.classList.toggle("open");
      cvBtn.setAttribute("aria-expanded", open ? "true" : "false");
      cvPanel.inert = !open;
    });
  }

  /* ---------- project overlay — zooms open from the clicked card ---------- */
  var pv = document.getElementById("pv");
  var dataEl = document.getElementById("pvdata");
  if (pv && dataEl) {
    var DATA = {};
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { DATA = {}; }
    var accent = "#2E3A57", faint = "#8A887F";
    var panel = pv.querySelector(".pv__panel");
    var pairWrap = pv.querySelector("[data-pv-pair]");
    var heroWrap = pv.querySelector(".pv__hero");
    var galleryWrap = pv.querySelector("[data-pv-gallery]");
    var subEl = pv.querySelector('[data-pv="subtitle"]');
    var methodWrap = pv.querySelector("[data-pv-methodwrap]");
    var methodList = pv.querySelector("[data-pv-method]");
    var lastFocus = null;

    function setField(key, value) {
      pv.querySelectorAll('[data-pv="' + key + '"]').forEach(function (el) { el.textContent = value || ""; });
    }

    function openProject(key, originEl) {
      var d = DATA[key];
      if (!d) return false;

      setField("name", d.name);
      setField("question", d.question);
      setField("role", d.role);
      setField("period", d.period);
      setField("context", d.context);
      setField("lead", d.lead);
      setField("mediaHero", "(" + (d.mediaHero || "project media") + ")");
      setField("next", d.next);

      if (subEl) {
        subEl.textContent = d.subtitle || "";
        subEl.hidden = !d.subtitle;
      }

      pv.querySelectorAll('[data-pv="status"]').forEach(function (el) {
        el.textContent = d.status || "";
        el.style.color = d.live ? accent : faint;
      });

      // media: a real gallery replaces the placeholder hero + pair when present
      var gallery = d.gallery || [];
      galleryWrap.innerHTML = "";
      if (gallery.length) {
        if (heroWrap) heroWrap.hidden = true;
        pairWrap.hidden = true;
        galleryWrap.hidden = false;
        gallery.forEach(function (g) {
          var fig = document.createElement("figure");
          fig.className = "g g--" + (g.size || "md");
          var frame = document.createElement("div");
          frame.className = "g__frame";
          if (g.src) {
            var img = document.createElement("img");
            img.src = g.src;
            img.alt = g.cap || "";
            img.loading = "lazy";
            img.addEventListener("error", function () { img.remove(); });
            frame.appendChild(img);
          }
          var fg = document.createElement("div");
          fg.className = "g__fig";
          fg.textContent = g.fig || "";
          frame.appendChild(fg);
          fig.appendChild(frame);
          if (g.cap) {
            var cap = document.createElement("figcaption");
            cap.className = "g__cap";
            cap.textContent = g.cap;
            fig.appendChild(cap);
          }
          galleryWrap.appendChild(fig);
        });
      } else {
        if (heroWrap) heroWrap.hidden = false;
        pairWrap.hidden = false;
        galleryWrap.hidden = true;
      }

      // paired media placeholders
      pairWrap.innerHTML = "";
      (d.mediaPair || []).forEach(function (lbl) {
        var cell = document.createElement("div");
        var fig = document.createElement("div");
        fig.className = "fig";
        fig.textContent = "(" + lbl + ")";
        cell.appendChild(fig);
        pairWrap.appendChild(cell);
      });

      // method steps
      var method = d.method || [];
      if (method.length) {
        methodWrap.classList.remove("hide");
        methodList.innerHTML = "";
        method.forEach(function (m) {
          var row = document.createElement("div");
          row.className = "m";
          var n = document.createElement("span");
          n.className = "mn";
          n.textContent = m.n;
          var body = document.createElement("div");
          var t = document.createElement("div");
          t.className = "mt";
          t.textContent = m.title;
          var b = document.createElement("div");
          b.className = "mb";
          b.textContent = m.body;
          body.appendChild(t); body.appendChild(b);
          row.appendChild(n); row.appendChild(body);
          methodList.appendChild(row);
        });
      } else {
        methodWrap.classList.add("hide");
        methodList.innerHTML = "";
      }

      // zoom origin = centre of the clicked card, in viewport coords
      if (originEl) {
        var r = originEl.getBoundingClientRect();
        panel.style.setProperty("--pv-origin", (r.left + r.width / 2) + "px " + (r.top + r.height / 2) + "px");
      }
      if (panel) panel.scrollTop = 0;

      document.body.classList.add("pv-open");
      pv.setAttribute("aria-hidden", "false");
      // force a frame so the transition runs from the collapsed state
      requestAnimationFrame(function () { requestAnimationFrame(function () { pv.classList.add("open"); }); });
      return true;
    }

    function closeProject() {
      if (!pv.classList.contains("open")) return;
      pv.classList.remove("open");
      document.body.classList.remove("pv-open");
      pv.setAttribute("aria-hidden", "true");
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    }

    // The overlay shows the REAL project page: fetch /work/<slug>/, lift its <article class="detail">
    // into the panel, and reveal it with the same zoom. One template, one source of truth — chapter
    // pages and legacy pages both render exactly as they do standalone. The JSON path above is
    // only the fallback for when the fetch fails (offline, file://).
    var pageCache = {};
    var jsonBody = pv.querySelector(".pv__body");
    var pageBody = document.createElement("div");
    pageBody.className = "pv__page";
    pageBody.hidden = true;
    if (jsonBody) jsonBody.parentNode.insertBefore(pageBody, jsonBody.nextSibling);

    function fetchPage(url) {
      if (!pageCache[url]) {
        pageCache[url] = fetch(url, { credentials: "same-origin" }).then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        }).then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var art = doc.querySelector("article.detail");
          if (!art) throw new Error("no article");
          return art;
        });
        pageCache[url].catch(function () { delete pageCache[url]; });
      }
      return pageCache[url];
    }

    function showPage(art, name, originEl) {
      pageBody.innerHTML = "";
      var clone = art.cloneNode(true);
      // in-page links back to the grid close the overlay instead of navigating
      clone.querySelectorAll('a[href^="/#"], a[href^="#"]').forEach(function (a) {
        a.addEventListener("click", function (ev) { ev.preventDefault(); closeProject(); });
      });
      pageBody.appendChild(clone);
      initCarousel(clone);
      initStack(clone);
      initLightbox(clone);
      pageBody.hidden = false;
      if (jsonBody) jsonBody.hidden = true;
      setField("name", name);
      // reveal-on-scroll inside the panel (the panel is the scroll container, not the window)
      var items = clone.querySelectorAll(".reveal, [data-reveal]");
      if ("IntersectionObserver" in window) {
        var pio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); pio.unobserve(e.target); } });
        }, { root: panel, rootMargin: "0px 0px -8% 0px" });
        items.forEach(function (el) { pio.observe(el); });
      } else {
        items.forEach(function (el) { el.classList.add("in"); });
      }
      if (originEl) {
        var r = originEl.getBoundingClientRect();
        panel.style.setProperty("--pv-origin", (r.left + r.width / 2) + "px " + (r.top + r.height / 2) + "px");
      }
      if (panel) panel.scrollTop = 0;
      document.body.classList.add("pv-open");
      pv.setAttribute("aria-hidden", "false");
      requestAnimationFrame(function () { requestAnimationFrame(function () { pv.classList.add("open"); }); });
    }

    document.querySelectorAll(".card__click[data-project]").forEach(function (card) {
      var url = card.getAttribute("data-project");
      // warm the cache on intent so the open feels instant
      card.addEventListener("mouseenter", function () { fetchPage(url).catch(function () {}); }, { passive: true });
      card.addEventListener("focus", function () { fetchPage(url).catch(function () {}); }, { passive: true });
      card.addEventListener("click", function (ev) {
        // let modifier / middle clicks open the real page in a new tab
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
        ev.preventDefault();
        lastFocus = card;
        var d = DATA[url] || {};
        fetchPage(url).then(function (art) {
          showPage(art, d.name, card);
        }).catch(function () {
          // fallback: JSON reconstruction, or plain navigation if even that is missing
          pageBody.hidden = true;
          if (jsonBody) jsonBody.hidden = false;
          if (!openProject(url, card)) window.location.href = url;
        });
      });
    });

    pv.querySelectorAll("[data-pv-close]").forEach(function (el) {
      el.addEventListener("click", function (ev) { ev.preventDefault(); closeProject(); });
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !document.body.classList.contains("lb-open")) closeProject();
    });
  }

  /* ---------- lightbox — any project image opens the page's images as a carousel ----------
     Collects every plate / strip / gallery image inside an <article class="detail"> in page order.
     Runs on the standalone project page at load, and on the fetched article when the overlay
     shows it (see showPage). The markup is built once, on first open. */
  var lb = null, lbImg, lbN, lbT, lbCount, lbItems = [], lbIdx = 0, lbLastFocus = null;

  function buildLightbox() {
    lb = document.createElement("div");
    lb.className = "lb";
    lb.setAttribute("aria-hidden", "true");
    lb.innerHTML =
      '<div class="lb__backdrop" data-lb-close></div>' +
      '<div class="lb__panel" role="dialog" aria-modal="true" aria-label="Image">' +
        '<div class="lb__bar"><span class="lb__count"></span><button type="button" class="lb__nav" data-lb-close>(close)</button></div>' +
        '<div class="lb__stage">' +
          '<button type="button" class="lb__arrow lb__arrow--prev" data-lb-prev aria-label="previous image">(&larr; prev)</button>' +
          '<img class="lb__img" alt="" />' +
          '<button type="button" class="lb__arrow lb__arrow--next" data-lb-next aria-label="next image">(next &rarr;)</button>' +
        '</div>' +
        '<div class="lb__cap"><span class="n"></span><span class="t"></span></div>' +
      '</div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector(".lb__img");
    lbN = lb.querySelector(".lb__cap .n");
    lbT = lb.querySelector(".lb__cap .t");
    lbCount = lb.querySelector(".lb__count");
    lb.querySelectorAll("[data-lb-close]").forEach(function (el) { el.addEventListener("click", closeLightbox); });
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { stepLightbox(-1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { stepLightbox(1); });
    // swipe on touch
    var px = null;
    var stage = lb.querySelector(".lb__stage");
    stage.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") px = e.clientX; }, { passive: true });
    stage.addEventListener("pointerup", function (e) {
      if (px === null) return;
      var dx = e.clientX - px; px = null;
      if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
    }, { passive: true });
    // capture phase so an open lightbox owns the keys before the overlay / filter handlers see them
    window.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") { e.stopPropagation(); closeLightbox(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stepLightbox(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepLightbox(-1); }
    }, true);
  }

  // caption for one image: its figure's label + text. A strip shares one "fig.03–06" label, so
  // each photo in it gets its own number from that range.
  function captionFor(img) {
    var fig = img.closest("figure");
    var cap = fig && fig.querySelector("figcaption");
    var n = "", t = "";
    if (cap) {
      var nEl = cap.querySelector(".n, .g__fig");
      n = nEl ? nEl.textContent.trim() : "";
      var tEl = Array.prototype.filter.call(cap.children, function (c) { return c !== nEl; })[0];
      t = tEl ? tEl.textContent.trim() : "";
    }
    var strip = img.closest(".strip, .tiles");
    var m = /^(fig\.)(\d+)[–-](\d+)$/.exec(n);
    if (strip && m) {
      var i = Array.prototype.indexOf.call(strip.querySelectorAll("img"), img);
      var k = parseInt(m[2], 10) + i;
      if (k <= parseInt(m[3], 10)) n = m[1] + (k < 10 ? "0" + k : "" + k);
    }
    // a strip cell may carry its own caption (data-cap) for the carousel; the page keeps the shared one
    var cell = img.closest(".strip > div, .tiles > div");
    if (cell && cell.dataset.cap) t = cell.dataset.cap;
    return { n: n, t: t };
  }

  var lbToken = 0;
  function showLightbox(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIdx];
    // fade out, decode the next image off-screen, swap, fade in — never a blank stage (same as the city carousel)
    var my = ++lbToken;
    lb.classList.add("lb--swapping");
    var pre = new Image(); pre.src = it.src;
    (pre.decode ? pre.decode() : Promise.resolve()).then(function () {
      if (my !== lbToken) return;
      lbImg.src = it.src; lbImg.alt = it.alt;
      lb.classList.remove("lb--swapping");
    }, function () { if (my === lbToken) { lbImg.src = it.src; lbImg.alt = it.alt; lb.classList.remove("lb--swapping"); } });
    if (it.w && it.h) { lbImg.width = it.w; lbImg.height = it.h; }
    lbN.textContent = it.n;
    lbT.textContent = it.t;
    lbCount.textContent = (lbIdx + 1 < 10 ? "0" : "") + (lbIdx + 1) + " / " + (lbItems.length < 10 ? "0" : "") + lbItems.length;
    lb.classList.toggle("lb--single", lbItems.length < 2);
    // warm the neighbours so the step feels instant
    [1, -1].forEach(function (d) {
      var nx = lbItems[(lbIdx + d + lbItems.length) % lbItems.length];
      if (nx && nx.src !== it.src) { var im = new Image(); im.src = nx.src; }
    });
  }
  function stepLightbox(d) { if (lbItems.length > 1) showLightbox(lbIdx + d); }

  function openLightbox(items, i, originEl) {
    if (!lb) buildLightbox();
    lbItems = items;
    lbLastFocus = originEl;
    showLightbox(i);
    document.body.classList.add("lb-open");
    lb.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { requestAnimationFrame(function () { lb.classList.add("open"); }); });
    var closeBtn = lb.querySelector(".lb__nav");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }
  function closeLightbox() {
    if (!lb || !lb.classList.contains("open")) return;
    lb.classList.remove("open");
    document.body.classList.remove("lb-open");
    lb.setAttribute("aria-hidden", "true");
    if (lbLastFocus && lbLastFocus.focus) { try { lbLastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- city carousel — one spread at full width; the ledger beside the text is its index ----------
     Prev / next links, the fifteen-segment rule and the ledger rows all turn to a city; arrow keys
     work while focus is inside the chapter; swipe on touch. The image is swapped only after it has
     decoded (a short fade out / in, never a pop). Clicking the image opens the lightbox on the full
     set at the current city. The 1024px renditions are prefetched once the carousel is near view. */
  function initCarousel(root) {
    if (!root) return;
    root.querySelectorAll(".chap--carousel").forEach(function (chap) {
      var car = chap.querySelector("[data-carousel]");
      var rows = Array.prototype.slice.call(chap.querySelectorAll(".ledger a[data-src]"));
      if (!car || !rows.length) return;
      var img = car.querySelector(".carousel__img"), capN = car.querySelector(".plate__cap .n"), capT = car.querySelector(".plate__cap .t");
      var prev = car.querySelector("[data-step='-1']"), next = car.querySelector("[data-step='1']"), pos = car.querySelector(".carousel__pos");
      var segs = Array.prototype.slice.call(car.querySelectorAll(".carousel__rule a"));
      var n = rows.length, idx = 0, token = 0;
      var two = function (k) { return (k < 10 ? "0" : "") + k; };

      function show(i, scroll) {
        idx = (i + n) % n;
        var row = rows[idx], my = ++token;
        rows.forEach(function (r, k) { r.classList.toggle("on", k === idx); });
        segs.forEach(function (a, k) { a.classList.toggle("on", k === idx); });
        var p = rows[(idx - 1 + n) % n], q = rows[(idx + 1) % n];
        prev.innerHTML = "(&larr;<span class=\"long\"> " + p.dataset.city.toLowerCase() + "</span>)"; prev.href = p.href;
        next.innerHTML = "(<span class=\"long\">" + q.dataset.city.toLowerCase() + " </span>&rarr;)"; next.href = q.href;
        pos.innerHTML = two(idx + 1) + " / " + two(n) + " · " + row.dataset.city.toLowerCase() + "<span class=\"long\"> · " + (row.dataset.cap.split(" · ")[1] || "").replace(" inventory", "") + "</span>";
        var im = new Image(); im.src = row.dataset.src;
        car.classList.add("is-swapping");
        (im.decode ? im.decode() : Promise.resolve()).then(function () {
          if (my !== token) return;
          img.src = row.dataset.src; img.alt = row.dataset.city;
          capN.textContent = row.dataset.fig; capT.textContent = row.dataset.cap;
          car.classList.remove("is-swapping"); row.classList.remove("err");
        }, function () { if (my === token) { car.classList.remove("is-swapping"); row.classList.add("err"); } });
        if (scroll) car.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      // autoplay: the spreads rotate while the carousel is in view; the pointer over the chapter
      // or keyboard focus inside it pauses; any manual step hands control to the reader for good
      var AUTO_MS = 4000, auto = null, inView = false, held = false, taken = false;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function tick() { auto = null; if (!inView || held || taken || document.hidden) return; show(idx + 1); auto = setTimeout(tick, AUTO_MS); }
      function sync() {
        var run = inView && !held && !taken && !reduce && !document.hidden;
        if (run && auto === null) auto = setTimeout(tick, AUTO_MS);
        if (!run && auto !== null) { clearTimeout(auto); auto = null; }
        car.classList.toggle("is-auto", run);
      }
      function take() { taken = true; sync(); }
      chap.addEventListener("mouseenter", function () { held = true; sync(); });
      chap.addEventListener("mouseleave", function () { held = false; sync(); });
      chap.addEventListener("focusin", function () { held = true; sync(); });
      chap.addEventListener("focusout", function (e) { if (!chap.contains(e.relatedTarget)) { held = false; sync(); } });
      document.addEventListener("visibilitychange", sync);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (en) { inView = en[0].isIntersecting; sync(); }, { threshold: 0.4 }).observe(car);
      }
      prev.addEventListener("click", function (e) { e.preventDefault(); take(); show(idx - 1); });
      next.addEventListener("click", function (e) { e.preventDefault(); take(); show(idx + 1); });
      segs.forEach(function (a, k) { a.addEventListener("click", function (e) { e.preventDefault(); take(); show(k); }); });
      rows.forEach(function (r, k) { r.addEventListener("click", function (e) { e.preventDefault(); take(); show(k, true); }); });
      chap.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); take(); show(idx + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); take(); show(idx - 1); }
      });
      // swipe on touch
      var px = null, box = car.querySelector(".plate__img");
      box.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") px = e.clientX; }, { passive: true });
      box.addEventListener("pointerup", function (e) {
        if (px === null) return;
        var dx = e.clientX - px; px = null;
        if (Math.abs(dx) > 40) { e.preventDefault(); take(); show(dx < 0 ? idx + 1 : idx - 1); box.dataset.swiped = "1"; }
      });
      // the image opens the lightbox on the full set, at the current city
      var items = rows.map(function (row) {
        return { src: row.dataset.full || row.dataset.src, alt: row.dataset.city, w: row.dataset.w, h: row.dataset.h, n: row.dataset.fig, t: row.dataset.cap };
      });
      box.classList.add("lb-src");
      box.setAttribute("tabindex", "0");
      box.setAttribute("role", "button");
      box.setAttribute("aria-label", "open the city spreads");
      function openSet() { if (box.dataset.swiped) { delete box.dataset.swiped; return; } take(); openLightbox(items, idx, box); }
      box.addEventListener("click", openSet);
      box.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSet(); } });
      // prefetch the renditions once the carousel is near the viewport
      function prefetch() { rows.forEach(function (row) { var im = new Image(); im.src = row.dataset.src; }); }
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (en) {
          if (en.some(function (e) { return e.isIntersecting; })) { prefetch(); io.disconnect(); }
        }, { rootMargin: "300px" });
        io.observe(car);
      } else { prefetch(); }
      show(0);
    });
  }

  /* ---------- layer stack — registered drawings of one ground, built up a layer at a time ----------
     Every frame contains the ones before it, so fading the next frame in over the last reads as a
     layer being drawn. The stack builds itself once: when it scrolls into view and the frames have
     decoded, the whole dissolves to the first layer and the layers come back one a second, ending on
     the whole again. The key under it, the arrow keys and a swipe step it by hand, and any of those
     ends the build for good. Clicking the stage opens the lightbox on the frames at the current
     layer. Reduced motion: no build, the whole stands and the key steps it. Without JS: the last
     frame and its caption. */
  function initStack(root) {
    if (!root) return;
    root.querySelectorAll("[data-stack]").forEach(function (st) {
      var layers = Array.prototype.slice.call(st.querySelectorAll(".stack__stage > img"));
      var keys = Array.prototype.slice.call(st.querySelectorAll(".stack__key a"));
      var stage = st.querySelector(".stack__stage"), capN = st.querySelector(".plate__cap .n"), capT = st.querySelector(".plate__cap .t");
      var n = layers.length;
      if (n < 2 || !stage) return;
      var m = /^(fig\.)(\d+)/.exec(st.dataset.fig || ""), start = m ? parseInt(m[2], 10) : 0;
      var idx = n - 1, taken = false, built = false, auto = null, capTimer = null;
      var fig = function (k) { var v = start + k; return m ? m[1] + (v < 10 ? "0" : "") + v : (st.dataset.fig || ""); };
      var STEP_MS = 1000;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      st.classList.add("stack--js");

      function show(i) {
        idx = Math.max(0, Math.min(n - 1, i));
        layers.forEach(function (im, k) { im.classList.toggle("on", k <= idx); });
        keys.forEach(function (a, k) {
          a.classList.toggle("done", k <= idx); a.classList.toggle("on", k === idx);
          if (k === idx) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
        // the caption follows the layer: fade the old line out, swap, fade in
        st.classList.add("is-swapping");
        if (capTimer) clearTimeout(capTimer);
        capTimer = setTimeout(function () {
          if (m) capN.textContent = fig(idx);
          capT.textContent = layers[idx].dataset.cap || "";
          st.classList.remove("is-swapping");
        }, reduce ? 0 : 180);
      }
      function tick() {
        auto = null;
        if (taken || idx >= n - 1) { st.classList.remove("is-auto"); return; }
        if (document.hidden) { auto = setTimeout(tick, STEP_MS); return; }   // wait for the tab
        show(idx + 1);
        auto = setTimeout(tick, STEP_MS);
      }
      function take() { taken = true; if (auto !== null) { clearTimeout(auto); auto = null; } st.classList.remove("is-auto"); }
      function load() { layers.forEach(function (im) { im.loading = "eager"; }); }
      function build() {
        if (built || taken || reduce) return;
        built = true;
        load();
        Promise.all(layers.map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); })).then(function () {
          if (taken) return;
          st.classList.add("is-auto");
          auto = setTimeout(function () { show(0); auto = setTimeout(tick, STEP_MS + 200); }, 500);
        });
      }
      if ("IntersectionObserver" in window) {
        var near = new IntersectionObserver(function (en) {
          if (en.some(function (e) { return e.isIntersecting; })) { load(); near.disconnect(); }
        }, { rootMargin: "400px" });
        near.observe(st);
        var seen = new IntersectionObserver(function (en) {
          if (en.some(function (e) { return e.isIntersecting; })) { build(); seen.disconnect(); }
        }, { threshold: 0.45 });
        seen.observe(stage);
      } else { load(); }

      keys.forEach(function (a, k) { a.addEventListener("click", function (e) { e.preventDefault(); take(); show(k); }); });
      st.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); take(); show(idx + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); take(); show(idx - 1); }
      });
      // swipe on touch steps a layer
      var px = null;
      stage.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") px = e.clientX; }, { passive: true });
      stage.addEventListener("pointerup", function (e) {
        if (px === null) return;
        var dx = e.clientX - px; px = null;
        if (Math.abs(dx) > 40) { e.preventDefault(); take(); show(dx < 0 ? idx + 1 : idx - 1); stage.dataset.swiped = "1"; }
      });
      // the stage opens the lightbox on the frames, at the current layer
      var items = layers.map(function (im, k) {
        return { src: im.src, alt: im.alt, w: im.getAttribute("width"), h: im.getAttribute("height"), n: fig(k), t: im.dataset.cap || "" };
      });
      stage.classList.add("lb-src");
      stage.setAttribute("tabindex", "0");
      stage.setAttribute("role", "button");
      stage.setAttribute("aria-label", "open the layers");
      function openSet() { if (stage.dataset.swiped) { delete stage.dataset.swiped; return; } take(); openLightbox(items, idx, stage); }
      stage.addEventListener("click", openSet);
      stage.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSet(); } });
      show(n - 1);
    });
  }
  function initLightbox(root) {
    if (!root) return;
    var imgs = Array.prototype.slice.call(root.querySelectorAll(".plate__img img, .strip img, .tiles img, .g__frame img"))
      .filter(function (img) { return !img.closest("[data-carousel], [data-stack]"); }); // the city carousel and the layer stack register their own sets
    if (!imgs.length) return;
    var items = imgs.map(function (img) {
      var c = captionFor(img);
      // a tile shows a small file and names the full one (data-full, with its own size)
      return { src: img.dataset.full || img.currentSrc || img.src, alt: img.alt || c.t, w: img.dataset.w || img.getAttribute("width"), h: img.dataset.h || img.getAttribute("height"), n: c.n, t: c.t };
    });
    imgs.forEach(function (img, i) {
      var box = img.closest(".plate__img, .strip > div, .tiles > div, .g__frame") || img;
      box.classList.add("lb-src");
      box.setAttribute("tabindex", "0");
      box.setAttribute("role", "button");
      box.setAttribute("aria-label", "open image " + (i + 1) + " of " + imgs.length);
      box.addEventListener("click", function () { openLightbox(items, i, box); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(items, i, box); }
      });
    });
  }
  /* ---------- thoughts: the wall ----------
     Anyone can post; nobody logs in. Posts come from the worker (data-api) and are merged with the
     markdown entries already on the page, newest first. A Turnstile widget (data-turnstile-key) sits
     in the composer when configured. The owner key, typed once via (key) and kept in localStorage,
     marks posts as Raghav's and shows a (delete) on every post — the worker checks it, the page only
     remembers it. */
  function initWall() {
    var wall = document.querySelector("[data-wall]");
    if (!wall || !wall.dataset.api) return;
    var api = wall.dataset.api.replace(/\/$/, ""), tsKey = wall.dataset.turnstileKey;
    var form = document.querySelector("[data-composer]"), msg = form && form.querySelector(".composer__msg");
    var keyLink = document.querySelector("[data-owner-key]");
    var key = ""; try { key = localStorage.getItem("thoughts-key") || ""; } catch (e) {}
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var day = function (ms) {
      var d = new Date(ms);
      return d.getDate() + " " + d.toLocaleString("en-GB", { month: "long" }).toLowerCase() + " " + d.getFullYear();
    };
    function render(t) {
      var art = document.createElement("article");
      art.className = "thought thought--live" + (t.owner ? " thought--owner" : "");
      art.dataset.created = t.created; art.dataset.id = t.id;
      var paras = String(t.body).split(/\n{2,}/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br />") + "</p>"; }).join("");
      art.innerHTML = '<span class="thought__date">' + day(t.created) + '<span class="thought__by"> · ' + esc(t.owner ? "raghav" : (t.name || "someone")) + "</span></span>" +
        '<div class="thought__body">' + paras + "</div>" +
        (key ? '<a class="thought__del" href="#" data-del>(delete)</a>' : "");
      return art;
    }
    function place(art) {
      // newest first: before the first entry that is older
      var c = Number(art.dataset.created);
      var rows = Array.prototype.slice.call(wall.querySelectorAll(".thought"));
      var next = rows.filter(function (r) { return Number(r.dataset.created) < c; })[0];
      wall.insertBefore(art, next || null);
      var empty = wall.querySelector("[data-empty]"); if (empty) empty.remove();
    }
    function load() {
      fetch(api + "/thoughts?limit=100").then(function (r) { return r.json(); }).then(function (j) {
        (j.thoughts || []).forEach(function (t) { if (!wall.querySelector('[data-id="' + t.id + '"]')) place(render(t)); });
      }).catch(function () {});
    }
    // the composer
    var widget = null;
    if (form) {
      form.hidden = false;
      var tsBox = form.querySelector("[data-turnstile]");
      if (tsKey && tsBox) {
        var mount = function () {
          if (!window.turnstile) return setTimeout(mount, 200);
          widget = window.turnstile.render(tsBox, { sitekey: tsKey, appearance: "interaction-only", theme: "light" });
        };
        mount();
      }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var body = form.body.value.trim(); if (!body) return;
        var payload = { body: body, name: form.name.value.trim() };
        if (key) payload.key = key;
        if (widget !== null && window.turnstile) payload.turnstile = window.turnstile.getResponse(widget);
        form.classList.add("is-busy"); msg.textContent = "";
        fetch(api + "/thoughts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            form.classList.remove("is-busy");
            if (!res.ok) { msg.textContent = res.j.error || "that did not go through"; return; }
            var art = render(res.j.thought); place(art); art.classList.add("in");
            form.body.value = ""; msg.textContent = "posted.";
            if (widget !== null && window.turnstile) window.turnstile.reset(widget);
          })
          .catch(function () { form.classList.remove("is-busy"); msg.textContent = "that did not go through"; });
      });
    }
    // delete, with the key
    wall.addEventListener("click", function (e) {
      var a = e.target.closest("[data-del]"); if (!a) return;
      e.preventDefault();
      var art = a.closest(".thought"); if (!art || !confirm("delete this thought?")) return;
      fetch(api + "/thoughts/" + art.dataset.id, { method: "DELETE", headers: { "X-Owner-Key": key } })
        .then(function (r) { if (r.ok) art.remove(); });
    });
    // the owner key: typed once, kept on this device
    if (keyLink) {
      keyLink.textContent = key ? "(key ✓)" : "(key)";
      keyLink.addEventListener("click", function (e) {
        e.preventDefault();
        var v = prompt("the owner key (leave empty to forget it)", key || "");
        if (v === null) return;
        key = v.trim();
        try { key ? localStorage.setItem("thoughts-key", key) : localStorage.removeItem("thoughts-key"); } catch (err) {}
        keyLink.textContent = key ? "(key ✓)" : "(key)";
        wall.querySelectorAll(".thought--live").forEach(function (art) {
          var del = art.querySelector("[data-del]");
          if (key && !del) art.insertAdjacentHTML("beforeend", '<a class="thought__del" href="#" data-del>(delete)</a>');
          if (!key && del) del.remove();
        });
      });
    }
    load();
  }
  initWall();

  initCarousel(document.querySelector("article.detail"));
  initStack(document.querySelector("article.detail"));
  initLightbox(document.querySelector("article.detail"));
})();
