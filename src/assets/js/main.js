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

  /* ---------- (about) live serif switcher ---------- */
  var fontSwitch = document.querySelector("[data-fontswitch]");
  if (fontSwitch) {
    var fontBtns = fontSwitch.querySelectorAll("button[data-font]");
    fontBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.documentElement.style.setProperty("--serif", btn.getAttribute("data-font"));
        fontBtns.forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
      });
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

      pv.querySelectorAll('[data-pv="status"]').forEach(function (el) {
        el.textContent = d.status || "";
        el.style.color = d.live ? accent : faint;
      });

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
