/* MOCK (branch cap-group), on only with ?mock=group: the climate action plans as one project.
   The four plan cards leave the grid and live in a tray; one parent card takes Ahmedabad's place.
   A click on the parent fades everything else to the paper (the hover scrim, held) and lays the
   plans out beside it, on whichever side has room; on a phone they open inline under it. Escape,
   the parent again, or a click anywhere else closes it. Each plan card still opens its own story. */
(function () {
  if (!/[?&]mock=group\b/.test(location.search)) return;
  var grid = document.querySelector("[data-grid]");
  if (!grid) return;

  var KIDS = ["Ahmedabad Climate Action Plan", "Vadodara Climate Action Plan", "Surat Climate Action Plan", "Malaysia GCAP"];
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
  function byTitle(t) { return cards.filter(function (c) { var h = c.querySelector(".name"); return h && h.textContent.trim() === t; })[0]; }
  var kids = KIDS.map(byTitle).filter(Boolean);
  if (kids.length < 2) return;
  var host = kids[0];   // the parent takes the first plan's place (and, when arranged, its spot)

  var css = document.createElement("style");
  css.textContent = [
    ".work__grid{position:relative;}",
    // the parent: the same card, one quiet line more
    ".cg-parent .card__frame{cursor:pointer;}",
    ".cg-parent .cg-count{font-family:var(--mono);font-size:9.62px;letter-spacing:.04em;color:var(--accent);margin-left:.5em;white-space:nowrap;}",
    ".cg-parent .card__frame > img.cg-img{width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity 1.1s cubic-bezier(.4,0,.2,1),transform .9s cubic-bezier(.16,1,.3,1);}",
    ".cg-parent .card__frame > img.cg-img.on{opacity:1;}",
    ".cg-open .cg-parent .card__note{display:none;}",
    // the held scrim: everything but the parent and its plans fades to the paper
    ".work__grid.cg-open .card:not(.cg-parent){opacity:.14;filter:saturate(.4);pointer-events:none;}",
    ".work__grid.cg-open .cg-tray .card, .work__grid.cg-open .cg-parent{opacity:1 !important;filter:none !important;pointer-events:auto;}",
    ".work__grid.cg-open .work__break{opacity:.25;}",
    "body.cg-on .pin{opacity:.14;pointer-events:none;transition:opacity .45s ease;}",
    ".cg-open .cg-parent .card__frame{outline:1px solid var(--ink);outline-offset:6px;}",
    // the tray: the plans, two across, beside the parent
    ".cg-tray{position:absolute;z-index:10000;width:500px;visibility:hidden;pointer-events:none;}",
    ".cg-tray.on{visibility:visible;pointer-events:auto;}",
    ".cg-tray__head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;font-family:var(--mono);font-size:9.62px;letter-spacing:.04em;color:var(--mute);opacity:0;transition:opacity .3s ease;}",
    ".cg-tray.on .cg-tray__head{opacity:1;}",
    ".cg-tray__close{background:none;border:0;padding:0;font:inherit;color:var(--accent);cursor:pointer;}",
    ".cg-tray__close:hover{color:var(--ink);}",
    ".cg-tray__grid{display:grid;grid-template-columns:1fr 1fr;gap:35px 28px;align-items:start;}",
    ".cg-tray .card{position:relative !important;left:auto !important;top:auto !important;width:auto !important;max-width:none;margin:0;z-index:auto !important;",
    "  opacity:0 !important;transform:translateX(var(--from,-24px)) scale(.96);transition:opacity .35s ease,transform .5s cubic-bezier(.16,1,.3,1) !important;transition-delay:calc(var(--i) * 55ms) !important;}",
    ".cg-tray.on .card{opacity:1 !important;transform:none;}",
    ".cg-tray .card__thumbs{display:none;}",
    ".cg-tray .card .desc{font-size:.9em;}",
    // a phone: no tray to the side, the plans open under the parent in one column
    "@media (max-width:787px){",
    "  .cg-tray{position:static;width:auto;display:none;margin:28px 0 0;}",
    "  .cg-tray.on{display:block;}",
    "  .cg-tray__grid{grid-template-columns:1fr;}",
    "  .cg-tray .card{transform:translateY(-12px);}",
    "}",
    "@media (prefers-reduced-motion:reduce){ .cg-tray .card{transition:opacity .2s ease !important;transform:none;} }"
  ].join("\n");
  document.head.appendChild(css);

  // ---- the parent: a copy of the first plan's card, retitled, its frame cycling the four covers ----
  var parent = host.cloneNode(true);
  parent.classList.add("cg-parent");
  parent.removeAttribute("data-topics");
  var topics = [];
  kids.forEach(function (k) { (k.dataset.topics || "").split(" ").forEach(function (t) { if (t && topics.indexOf(t) < 0) topics.push(t); }); });
  parent.dataset.topics = topics.join(" ");
  var a = parent.querySelector(".card__click");
  a.removeAttribute("data-project");
  a.setAttribute("href", "#plans");
  a.setAttribute("aria-label", "climate action plans, " + kids.length + " plans");
  a.setAttribute("aria-expanded", "false");
  parent.querySelector(".name").textContent = "City Climate Action Plans";
  var desc = parent.querySelector(".desc");
  desc.innerHTML = "iclei · capacities · c40 · imt-gt<span class=\"cg-count\">(" + kids.length + " plans · 7 cities)</span>";
  var st = parent.querySelector(".status"); if (st) st.remove();
  parent.querySelector(".card__q").textContent = "one method, seven cities: what does a city learn when its ledger can be read beside another's?";
  parent.querySelector(".card__view").textContent = "(open the " + kids.length + " plans →)";
  var note = parent.querySelector(".card__note p");
  if (note) note.textContent = "Ahmedabad, Vadodara, Surat and four Malaysian cities, all on the same instrument.";
  var nlbl = parent.querySelector(".note__lbl"); if (nlbl) nlbl.textContent = "(click to open the set)";
  var strip = parent.querySelector(".card__thumbs"); if (strip) strip.remove();
  var fig = parent.querySelector(".card__fig"); if (fig) fig.textContent = "(" + kids.length + " plans)";
  var frame = parent.querySelector(".card__frame");
  frame.querySelectorAll("img").forEach(function (im) { im.remove(); });
  var imgs = kids.map(function (k, i) {
    var src = k.querySelector(".card__frame > img:not(.card__alt)");
    var im = document.createElement("img");
    im.className = "cg-img" + (i === 0 ? " on" : "");
    im.src = src ? src.getAttribute("src") : "";
    im.alt = "";
    frame.insertBefore(im, frame.firstChild);
    return im;
  });
  var shown = 0;
  setInterval(function () {
    if (document.hidden || grid.classList.contains("cg-open")) return;
    imgs[shown].classList.remove("on"); shown = (shown + 1) % imgs.length; imgs[shown].classList.add("on");
  }, 2600);
  host.parentNode.insertBefore(parent, host);

  // arranged by hand: the parent takes the highest of the spots the plans were put in (pins.js writes
  // each plan's style); the others are left empty until the boxes are moved again
  function follow() {
    var top = kids.filter(function (k) { return k.style.top; }).sort(function (x, y) { return parseFloat(x.style.top) - parseFloat(y.style.top); })[0];
    ["left", "top", "width", "zIndex"].forEach(function (k) { parent.style[k] = top ? top.style[k] : ""; });
  }
  follow();
  kids.forEach(function (k) { new MutationObserver(follow).observe(k, { attributes: true, attributeFilter: ["style"] }); });
  // a filter: the parent answers if any of its plans does
  function match() { parent.classList.toggle("match", kids.some(function (k) { return k.classList.contains("match"); })); }
  kids.forEach(function (k) { new MutationObserver(match).observe(k, { attributes: true, attributeFilter: ["class"] }); });

  // ---- the tray ----
  var tray = document.createElement("div");
  tray.className = "cg-tray";
  tray.id = "plans";
  tray.setAttribute("aria-label", "climate action plans");
  tray.innerHTML = '<div class="cg-tray__head"><span>(city climate action plans) one method, ' + kids.length + ' plans</span><button type="button" class="cg-tray__close">(close ×)</button></div><div class="cg-tray__grid"></div>';
  var tg = tray.querySelector(".cg-tray__grid");
  kids.forEach(function (k, i) { k.style.setProperty("--i", i); tg.appendChild(k); });
  grid.appendChild(tray);
  var wide = window.matchMedia("(min-width: 788px)");

  function place() {
    if (!wide.matches) { parent.parentNode === grid ? grid.insertBefore(tray, parent.nextSibling) : parent.parentNode.parentNode.insertBefore(tray, parent.parentNode.nextSibling); return; }
    if (tray.parentNode !== grid || tray.nextSibling) grid.appendChild(tray);
    var g = grid.getBoundingClientRect(), p = parent.getBoundingClientRect();
    var W = grid.clientWidth, gap = 56, tw = Math.min(500, W - 40);
    tray.style.width = tw + "px";
    // right of the parent if it fits, else left, else under it
    var left = p.right - g.left + gap, from = "-24px", below = false;
    if (left + tw > W) {
      if (p.left - g.left - gap - tw >= 0) { left = p.left - g.left - gap - tw; from = "24px"; }
      else { left = Math.max(0, Math.min(W - tw, p.left - g.left)); below = true; }
    }
    tray.style.left = left + "px";
    tray.style.top = (below ? p.bottom - g.top + 35 : p.top - g.top) + "px";
    tray.style.setProperty("--from", below ? "0px" : from);
    kids.forEach(function (k) { k.style.setProperty("--from", below ? "0px" : from); });
  }

  function open(on) {
    if (on) place();
    grid.classList.toggle("cg-open", on);
    document.body.classList.toggle("cg-on", on);
    tray.classList.toggle("on", on);
    a.setAttribute("aria-expanded", on ? "true" : "false");
    parent.querySelector(".card__view").textContent = on ? "(close ×)" : "(open the " + kids.length + " plans →)";
    if (on) {
      var r = tray.getBoundingClientRect();
      if (r.bottom > window.innerHeight || r.top < 0) window.scrollBy({ top: r.top - 120, behavior: "smooth" });
    }
  }
  a.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    open(!tray.classList.contains("on"));
  });
  tray.querySelector(".cg-tray__close").addEventListener("click", function () { open(false); a.focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && tray.classList.contains("on") && !document.body.classList.contains("pv-open")) open(false);
  });
  document.addEventListener("click", function (e) {
    if (!tray.classList.contains("on") || document.body.classList.contains("pv-open")) return;
    if (tray.contains(e.target) || parent.contains(e.target) || e.target.closest(".pv, .dock")) return;
    open(false);
  });
  window.addEventListener("resize", function () { if (tray.classList.contains("on")) place(); });
})();
