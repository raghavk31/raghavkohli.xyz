/* Sets (src/_data/sets.js): one card that holds several projects. A click on it holds the hover scrim
   (everything else fades to the paper) and lays its tray of plans out beside it, on whichever side has
   room, or under it; on a phone the tray opens inline under the set's row. Nothing reflows, so the
   free layout (pins.js) is untouched. Escape, the set again, (close ×) or a click anywhere else
   closes it. Each plan still opens its own story. Built from the cap-group mock (2026-10-15). */
(function () {
  "use strict";
  var grid = document.querySelector("[data-grid]");
  if (!grid) return;
  var wide = window.matchMedia("(min-width: 788px)");
  var GAP = 56, TRAY = 500;

  Array.prototype.forEach.call(grid.querySelectorAll(".card--set"), function (set) {
    var tray = document.getElementById("set-" + set.dataset.set);
    if (!tray) return;
    var a = set.querySelector(".card__click"), view = set.querySelector("[data-set-view]"), shut = view.textContent;
    var kids = Array.prototype.slice.call(tray.querySelectorAll(".card"));
    kids.forEach(function (k, i) { k.style.setProperty("--i", i); });

    function isOpen() { return tray.classList.contains("on"); }
    function place() {
      if (!wide.matches) {   // inline, after the row the set sits in
        var row = set.parentNode.classList.contains("work__row") ? set.parentNode : set;
        row.parentNode.insertBefore(tray, row.nextSibling);
        return;
      }
      if (tray.nextSibling) grid.appendChild(tray);
      var g = grid.getBoundingClientRect(), p = set.getBoundingClientRect();
      var W = grid.clientWidth, tw = Math.min(TRAY, W - 40);
      tray.style.width = tw + "px";
      // right of the set if it fits, else left, else under it
      var left = p.right - g.left + GAP, from = "-24px", below = false;
      if (left + tw > W) {
        if (p.left - g.left - GAP - tw >= 0) { left = p.left - g.left - GAP - tw; from = "24px"; }
        else { left = Math.max(0, Math.min(W - tw, p.left - g.left)); below = true; }
      }
      tray.style.left = left + "px";
      tray.style.top = (below ? p.bottom - g.top + 35 : p.top - g.top) + "px";
      tray.style.setProperty("--from", below ? "0px" : from);
    }
    function open(on) {
      if (on) place();
      set.classList.toggle("is-open", on);
      grid.classList.toggle("set-open", on);
      document.body.classList.toggle("set-on", on);
      tray.classList.toggle("on", on);
      a.setAttribute("aria-expanded", on ? "true" : "false");
      view.textContent = on ? "(close ×)" : shut;
      if (on) {
        var r = tray.getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 0) window.scrollBy({ top: r.top - 120, behavior: "smooth" });
      }
    }

    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      if (document.body.classList.contains("is-arranging")) return;   // pins.js: dragging, not opening
      open(!isOpen());
    });
    tray.querySelector("[data-set-close]").addEventListener("click", function () { open(false); a.focus(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen() && !document.body.classList.contains("pv-open")) open(false);
    });
    document.addEventListener("click", function (e) {
      if (!isOpen() || document.body.classList.contains("pv-open")) return;
      if (tray.contains(e.target) || set.contains(e.target) || e.target.closest(".pv, .dock")) return;
      open(false);
    });
    // the grid repacks under a filter and moves under the free layout: close rather than chase it
    document.addEventListener("ecotopic", function () { if (isOpen()) open(false); });
    window.addEventListener("resize", function () { if (isOpen()) place(); });
  });
})();
