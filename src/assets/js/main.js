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

  /* ---------- (index) hover-preview ---------- */
  var idxList = document.querySelector("[data-idxlist]");
  if (idxList) {
    var pvMedia = document.querySelector('.index__pv-img [data-pv="media"]');
    var pvName = document.querySelector('.index__pv-name[data-pv="name"]');
    var pvBlurb = document.querySelector('.index__pv-blurb[data-pv="blurb"]');
    idxList.querySelectorAll(".index__row").forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        idxList.querySelectorAll(".index__row").forEach(function (r) { r.classList.remove("on"); });
        row.classList.add("on");
        if (pvMedia) pvMedia.textContent = row.getAttribute("data-media");
        if (pvName) pvName.textContent = row.getAttribute("data-name");
        if (pvBlurb) pvBlurb.textContent = row.getAttribute("data-blurb");
      });
    });
  }

  /* ---------- (work) keyword filter — reorders + resizes the grid, FLIP-animated ---------- */
  var grid = document.querySelector("[data-grid]");
  var filterBar = document.querySelector("[data-filters]");
  if (grid && filterBar) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));

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

      if (topic) {
        grid.classList.add("filtering");
        cards.forEach(function (c) {
          c.classList.toggle("match", topicsOf(c).indexOf(topic) !== -1);
        });
      } else {
        grid.classList.remove("filtering");
        cards.forEach(function (c) { c.classList.remove("match"); });
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
      initViewer(clone);
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
    var strip = img.closest(".strip");
    var m = /^(fig\.)(\d+)[–-](\d+)$/.exec(n);
    if (strip && m) {
      var i = Array.prototype.indexOf.call(strip.querySelectorAll("img"), img);
      var k = parseInt(m[2], 10) + i;
      if (k <= parseInt(m[3], 10)) n = m[1] + (k < 10 ? "0" + k : "" + k);
    }
    return { n: n, t: t };
  }

  function showLightbox(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIdx];
    lbImg.src = it.src;
    lbImg.alt = it.alt;
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

  /* ---------- ghost viewer — one averaged plate that resolves into a city from its ledger ----------
     Hover (mouse only) or focus a ledger row: the city image is shown once it has decoded, so the
     crossfade never pops; leave and it returns to the ghost (or to the held city). Click / Enter
     holds; click again or Esc releases. Touch has no hover, so tap = hold. Clicking the image
     opens the lightbox on the fifteen cities, at the held one. The fifteen resolve renditions are
     prefetched once the viewer scrolls into view. Without JS the rows are plain links. */
  function initViewer(root) {
    if (!root) return;
    root.querySelectorAll(".chap--viewer").forEach(function (chap) {
      var v = chap.querySelector(".viewer"), city = v && v.querySelector(".viewer__city");
      var capN = v && v.querySelector(".plate__cap .n"), capT = v && v.querySelector(".plate__cap .t");
      var rows = Array.prototype.slice.call(chap.querySelectorAll(".ledger a[data-src]"));
      if (!v || !city || !rows.length) return;
      var ghostN = capN.textContent, ghostT = capT.innerHTML;
      var canHover = window.matchMedia("(hover:hover)").matches;
      var held = null, timer = null, token = 0;

      function show(row) {
        var my = ++token;
        capN.textContent = row.dataset.fig;
        capT.textContent = row.dataset.cap;
        var im = new Image();
        im.src = row.dataset.src;
        var ready = im.decode ? im.decode() : Promise.resolve();
        ready.then(function () {
          if (my !== token) return;
          city.src = row.dataset.src; city.alt = row.dataset.city;
          v.classList.add("on"); row.classList.remove("err");
        }, function () {
          if (my !== token) return;
          row.classList.add("err"); reset(true);
        });
      }
      function reset(force) {
        if (held && !force) { show(held); return; }
        token++;
        v.classList.remove("on");
        city.removeAttribute("src"); city.alt = "";
        capN.textContent = ghostN; capT.innerHTML = ghostT;
      }
      function hold(row) {
        rows.forEach(function (r) { r.classList.remove("on"); });
        if (held === row) { held = null; reset(); }
        else { held = row; row.classList.add("on"); show(row); }
      }
      rows.forEach(function (row) {
        if (canHover) {
          row.addEventListener("pointerenter", function () { clearTimeout(timer); show(row); });
          row.addEventListener("pointerleave", function () { timer = setTimeout(function () { reset(); }, 120); });
        }
        row.addEventListener("focus", function () { show(row); });
        row.addEventListener("blur", function () { reset(); });
        row.addEventListener("click", function (e) { e.preventDefault(); hold(row); });
      });
      v.addEventListener("pointerenter", function () { clearTimeout(timer); });
      chap.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && held) { held = null; rows.forEach(function (r) { r.classList.remove("on"); }); reset(); }
      });

      // the image opens the lightbox on the fifteen, in ledger order, at the held city
      var items = rows.map(function (row) {
        return { src: row.dataset.full || row.dataset.src, alt: row.dataset.city, w: row.dataset.w, h: row.dataset.h, n: row.dataset.fig, t: row.dataset.cap };
      });
      var box = v.querySelector(".plate__img");
      box.classList.add("lb-src");
      box.setAttribute("tabindex", "0");
      box.setAttribute("role", "button");
      box.setAttribute("aria-label", "open the city spreads");
      function openSet() { openLightbox(items, held ? rows.indexOf(held) : 0, box); }
      box.addEventListener("click", openSet);
      box.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSet(); } });

      // prefetch the resolve renditions once the viewer is near the viewport
      function prefetch() { rows.forEach(function (row) { var im = new Image(); im.src = row.dataset.src; }); }
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (en) {
          if (en.some(function (e) { return e.isIntersecting; })) { prefetch(); io.disconnect(); }
        }, { rootMargin: "200px" });
        io.observe(v);
      } else { prefetch(); }
    });
  }

  function initLightbox(root) {
    if (!root) return;
    var imgs = Array.prototype.slice.call(root.querySelectorAll(".plate__img img, .strip img, .g__frame img"))
      .filter(function (img) { return !img.closest(".viewer"); }); // the ghost viewer registers its own set
    if (!imgs.length) return;
    var items = imgs.map(function (img) {
      var c = captionFor(img);
      return { src: img.currentSrc || img.src, alt: img.alt || c.t, w: img.getAttribute("width"), h: img.getAttribute("height"), n: c.n, t: c.t };
    });
    imgs.forEach(function (img, i) {
      var box = img.closest(".plate__img, .strip > div, .g__frame") || img;
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
  initViewer(document.querySelector("article.detail"));
  initLightbox(document.querySelector("article.detail"));
})();
