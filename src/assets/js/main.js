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

    document.querySelectorAll(".card__click[data-project]").forEach(function (card) {
      card.addEventListener("click", function (ev) {
        // let modifier / middle clicks open the real page in a new tab
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return;
        var key = card.getAttribute("data-project");
        lastFocus = card;
        if (openProject(key, card)) ev.preventDefault();
      });
    });

    pv.querySelectorAll("[data-pv-close]").forEach(function (el) {
      el.addEventListener("click", function (ev) { ev.preventDefault(); closeProject(); });
    });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeProject(); });
  }
})();
