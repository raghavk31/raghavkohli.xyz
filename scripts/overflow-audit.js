/*
 * Overflow / text-cutting / overlap audit for raghavkohli.xyz
 * ------------------------------------------------------------
 * Catches three classes of layout bug across viewport widths:
 *   HOVF       — an element's content is wider than its box (horizontal text overflow)
 *   PASTVIEW   — an element pushes past the viewport edge (would cause horizontal scroll)
 *   VCLIP      — the hover overlay's question is taller than the card frame (clipped)
 *   CARDOVERLAP— two project cards physically overlap
 *
 * The floating hover panel (.card__meta) and thumb strip (.card__thumbs) live out
 * in the gutter on purpose and are clipped by `overflow-x:hidden`, so the audit
 * hides them before measuring to avoid false positives.
 *
 * HOW TO RUN
 *   Via the gstack browse tool (what Claude uses):
 *     $B goto http://localhost:8080/
 *     $B js "$(cat scripts/overflow-audit.js)"      # returns a report string
 *   Or paste window.__audit() into any browser devtools console.
 *
 * Run it at several widths (e.g. 1440, 1280, 1100, 960, 900, 768, 375) and after
 * adding or editing a project. "clean" at every width = no cuts or overlaps.
 */
(function () {
  var st = document.getElementById("__aud");
  if (!st) { st = document.createElement("style"); st.id = "__aud"; document.head.appendChild(st); }
  st.textContent = ".card__meta,.card__thumbs{display:none!important}";

  // reveal-on-scroll hides off-screen content; force it visible so we measure everything
  document.querySelectorAll(".reveal").forEach(function (e) { e.classList.add("in"); });

  var vw = window.innerWidth, out = [];
  document.querySelectorAll("main *").forEach(function (el) {
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    if (el.closest(".vh")) return; // sr-only text is deliberately clipped
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    var tag = (typeof el.className === "string" && el.className) ? "." + el.className.split(" ")[0] : el.tagName;
    var txt = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 26);
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0)
      out.push("HOVF " + tag + " sw" + el.scrollWidth + "/cw" + el.clientWidth + ' "' + txt + '"');
    if (r.right > vw + 1 || r.left < -1)
      out.push("PASTVIEW " + tag + " L" + Math.round(r.left) + " R" + Math.round(r.right) + '/' + vw + ' "' + txt + '"');
  });

  document.querySelectorAll(".card__overlay").forEach(function (o, i) {
    if (o.scrollHeight > o.clientHeight + 2)
      out.push("VCLIP card#" + i + " sh" + o.scrollHeight + "/ch" + o.clientHeight);
  });

  // skip cards mid-FLIP (an inline transform is set only during the filter
  // animation) so a settling card isn't mistaken for a real overlap
  var cards = [].slice.call(document.querySelectorAll(".work__grid .card"))
    .filter(function (c) { return getComputedStyle(c).transform === "none"; });
  for (var i = 0; i < cards.length; i++) for (var j = i + 1; j < cards.length; j++) {
    var a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
    var ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    var oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    if (ox > 4 && oy > 4) out.push("CARDOVERLAP " + i + "x" + j + " " + Math.round(ox) + "x" + Math.round(oy));
  }

  st.remove();
  return "W" + vw + ": " + (out.length ? out.length + " issues\n" + out.join("\n") : "clean");
})();
