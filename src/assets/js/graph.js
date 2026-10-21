/* The (graph) view of /thoughts/: the ideas that run through the notes, drawn as words, the notes as
   dots, laid out at build time (scripts/graph-layout.js from src/_data/ideas.json). This file makes
   it move: the (board)/(graph) switch, the flight of the post-its into their dots, hover and focus
   lighting a word's notes, the post-it that opens on a click, the live notes main.js announces
   (posted since the compile → the (unfiled) corner; deleted since → hidden), and the list a phone shows.
   Plan: docs/plans/2026-10-21-thoughts-graph.md. */
(function (root) {
  "use strict";

  /* What the live list changes about the compiled graph. Pure, so tests/graph-merge.test.js can hold it.
     compiled: [{id, concepts}], live: [{id, ...}] or null (the API did not answer: change nothing). */
  function merge(compiled, live) {
    if (!live) return { unfiled: [], hidden: [], faint: [] };
    var liveIds = {}, compiledIds = {}, carried = {};
    live.forEach(function (t) { liveIds[t.id] = 1; });
    compiled.forEach(function (t) { compiledIds[t.id] = 1; });
    var hidden = compiled.filter(function (t) { return !liveIds[t.id]; }).map(function (t) { return t.id; });
    compiled.forEach(function (t) {
      if (!liveIds[t.id]) return;
      (t.concepts || []).forEach(function (c) { carried[c] = (carried[c] || 0) + 1; });
    });
    var all = {};
    compiled.forEach(function (t) { (t.concepts || []).forEach(function (c) { all[c] = 1; }); });
    var faint = Object.keys(all).filter(function (c) { return (carried[c] || 0) < 2; }).sort();
    var unfiled = live.filter(function (t) { return !compiledIds[t.id]; });
    return { unfiled: unfiled, hidden: hidden, faint: faint };
  }

  // where the n-th unfiled note sits in its corner: rows of dots, newest first
  function unfiledSpot(i, box) {
    var per = Math.max(1, Math.floor((box.w - 40) / 22));
    return { x: box.x + 28 + (i % per) * 22, y: box.y + box.h - 34 - Math.floor(i / per) * 22 };
  }

  if (typeof module !== "undefined" && module.exports) { module.exports = { merge: merge, unfiledSpot: unfiledSpot }; return; }

  var doc = root.document;
  var graph = doc.querySelector("[data-graph]"), tabs = doc.querySelector("[data-views]");
  var board = doc.querySelector("[data-wall]");
  if (!graph || !tabs || !board) return;
  var data = JSON.parse(graph.querySelector("[data-graph-data]").textContent);
  var svg = graph.querySelector(".graph__svg"), stage = graph.querySelector(".graph__stage");
  var note = graph.querySelector("[data-graph-note]"), label = graph.querySelector("[data-label]");
  var unfiledG = graph.querySelector("[data-unfiled]"), unfiledIndex = graph.querySelector("[data-unfiled-index]");
  var composer = doc.querySelector("[data-composer]");
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduce = root.matchMedia("(prefers-reduced-motion: reduce)");
  var phone = root.matchMedia("(max-width: 819px)");

  var thoughts = {}, concepts = {};
  data.thoughts.forEach(function (t) { thoughts[t.id] = t; });
  data.concepts.forEach(function (c) { concepts[c.id] = c; c.thoughts = []; });
  data.thoughts.forEach(function (t) { t.concepts.forEach(function (c) { if (concepts[c]) concepts[c].thoughts.push(t.id); }); });
  var live = null, liveById = {}, owner = false, opened = null, returnTo = null;

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || graph).querySelectorAll(sel)); };
  var dotOf = function (id) { return svg.querySelector('[data-t="' + id + '"]'); };
  var wordOf = function (id) { return svg.querySelector('.graph__word[data-c="' + id + '"]'); };

  /* ---------- the switch ---------- */
  tabs.hidden = false;
  var current = "board";
  function show(view, how) {
    if (view === current) return;
    var go = function () {
      current = view;
      $$("[data-view]", tabs).forEach(function (b) {
        var on = b.dataset.view === view;
        b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1;
      });
      graph.hidden = view !== "graph";
      board.hidden = view !== "board";
      if (composer) composer.classList.toggle("is-away", view !== "board");
      if (view === "board") { close(); root.dispatchEvent(new Event("resize")); }   // the board lays itself out again
      if (history.replaceState) history.replaceState(null, "", view === "graph" ? "#graph" : location.pathname + location.search);
    };
    if (how === "now" || phone.matches || reduce.matches) return fade(go);
    return view === "graph" ? flyIn(go) : flyOut(go);
  }
  tabs.addEventListener("click", function (e) { var b = e.target.closest("[data-view]"); if (b) show(b.dataset.view); });
  tabs.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var next = current === "board" ? "graph" : "board";
    show(next); tabs.querySelector('[data-view="' + next + '"]').focus();
  });

  /* ---------- motion: a fade, or the post-its flying into their dots ---------- */
  function fade(go) {
    var out = current === "graph" ? graph : board;
    out.classList.add("is-fading");
    setTimeout(function () {
      out.classList.remove("is-fading"); go();
      var into = current === "graph" ? graph : board;
      into.classList.add("is-fading"); void into.offsetWidth; into.classList.remove("is-fading");
    }, reduce.matches ? 0 : 240);
  }

  // the post-its on screen right now (at most 40); the rest just fade
  function visibleNotes() {
    var vh = root.innerHeight;
    return $$(".thought", board).filter(function (art) {
      var r = art.getBoundingClientRect();
      return r.bottom > 0 && r.top < vh && r.width > 0 && dotOf(art.dataset.id);
    }).slice(0, 40);
  }
  function flight(from, to, back) {
    // a copy of the note travels from its rect to its dot (or back), shrinking to nothing
    var ghost = from.art.cloneNode(true);
    ghost.removeAttribute("id"); ghost.classList.add("flying");
    ghost.style.cssText = "position:fixed;margin:0;left:" + from.r.left + "px;top:" + from.r.top + "px;width:" + from.r.width + "px;height:" + from.r.height + "px;";
    doc.body.appendChild(ghost);
    var dx = to.x - (from.r.left + from.r.width / 2), dy = to.y - (from.r.top + from.r.height / 2);
    var small = "translate(" + dx + "px," + dy + "px) scale(" + (6 / from.r.width) + ")";
    var frames = back ? [{ transform: small, opacity: 0.4 }, { transform: "none", opacity: 1 }] : [{ transform: "none", opacity: 1 }, { transform: small, opacity: 0.4 }];
    return ghost.animate(frames, { duration: 500, easing: "cubic-bezier(.16,1,.3,1)" }).finished.then(function () { ghost.remove(); });
  }
  function dotPoint(id) { var r = dotOf(id).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function flyIn(go) {
    var notes = visibleNotes();
    if (!notes.length || !live) return fade(go);   // before the live notes have loaded there is nothing to fly
    var from = notes.map(function (art) { return { art: art, r: art.getBoundingClientRect() }; });
    go();
    graph.classList.add("is-drawing");
    Promise.all(from.map(function (f) { return flight(f, dotPoint(f.art.dataset.id), false); }))
      .then(function () { graph.classList.remove("is-drawing"); graph.classList.add("is-drawn"); setTimeout(function () { graph.classList.remove("is-drawn"); }, 260); });
  }
  function flyOut(go) {
    var points = {};
    $$(".thought", board).forEach(function (art) { if (dotOf(art.dataset.id)) points[art.dataset.id] = dotPoint(art.dataset.id); });
    go();
    var notes = visibleNotes();
    if (!notes.length) return;
    notes.forEach(function (art) { art.style.visibility = "hidden"; });
    Promise.all(notes.map(function (art) {
      return points[art.dataset.id] ? flight({ art: art, r: art.getBoundingClientRect() }, points[art.dataset.id], true) : Promise.resolve();
    })).then(function () { notes.forEach(function (art) { art.style.visibility = ""; }); });
  }

  /* ---------- lighting: a word and its notes, or a note and its words ---------- */
  function neighbours(kind, id) {
    var t = {}, c = {};
    if (kind === "c") { c[id] = 1; (concepts[id] ? concepts[id].thoughts : []).forEach(function (x) { t[x] = 1; }); }
    else { t[id] = 1; (thoughts[id] ? thoughts[id].concepts : []).forEach(function (x) { c[x] = 1; }); }
    return { t: t, c: c };
  }
  function light(kind, id) {
    var n = neighbours(kind, id);
    svg.classList.add("is-lit");
    $$(".graph__dot", svg).forEach(function (el) { el.classList.toggle("on", !!n.t[el.dataset.t]); });
    $$(".graph__word", svg).forEach(function (el) { el.classList.toggle("on", !!n.c[el.dataset.c]); });
    $$(".graph__edge", svg).forEach(function (el) { el.classList.toggle("on", kind === "c" ? el.dataset.c === id : el.dataset.t === id); });
    if (kind === "t") showLabel(id); else label.textContent = "";
  }
  // an answer lights the notes it drew on, and their words
  function lightSet(ids) {
    var t = {}, c = {};
    ids.forEach(function (id) { t[id] = 1; (thoughts[id] ? thoughts[id].concepts : []).forEach(function (x) { c[x] = 1; }); });
    svg.classList.add("is-lit"); label.textContent = "";
    $$(".graph__dot", svg).forEach(function (el) { el.classList.toggle("on", !!t[el.dataset.t]); });
    $$(".graph__word", svg).forEach(function (el) { el.classList.toggle("on", !!c[el.dataset.c]); });
    $$(".graph__edge", svg).forEach(function (el) { el.classList.toggle("on", !!t[el.dataset.t]); });
  }
  function unlight() {
    if (opened && opened.kind === "a") return lightSet(opened.cites);
    if (opened) return light(opened.kind, opened.id);
    svg.classList.remove("is-lit"); label.textContent = "";
    $$(".on", svg).forEach(function (el) { el.classList.remove("on"); });
  }
  function showLabel(id) {
    var dot = dotOf(id), t = thoughts[id] || liveById[id];
    if (!dot || !t) return;
    var x = +dot.getAttribute("cx"), y = +dot.getAttribute("cy"), right = x > data.w * 0.62;
    label.textContent = t.title || "untitled";
    label.setAttribute("x", right ? x - 11 : x + 11); label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", right ? "end" : "start");
  }
  function target(e) {
    var el = e.target.closest && e.target.closest("[data-t], .graph__word");
    if (!el || !svg.contains(el)) return null;
    return el.classList.contains("graph__word") ? { kind: "c", id: el.dataset.c, el: el } : { kind: "t", id: el.dataset.t, el: el };
  }
  svg.addEventListener("pointerover", function (e) { var t = target(e); if (t) light(t.kind, t.id); });
  svg.addEventListener("pointerout", function (e) { if (target(e)) unlight(); });
  svg.addEventListener("focusin", function (e) { var t = target(e); if (t) light(t.kind, t.id); });
  svg.addEventListener("focusout", function () { unlight(); });
  svg.addEventListener("click", function (e) { var t = target(e); if (t) open(t.kind, t.id, t.el); });
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var t = target(e); if (t) { e.preventDefault(); open(t.kind, t.id, t.el); }
  });

  /* ---------- the post-it that opens ---------- */
  function firstLines(t) {
    var body = liveById[t.id] ? String(liveById[t.id].body || "") : t.lead || "";
    return body.split(/\n{2,}/).filter(Boolean).slice(0, 3).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br />") + "</p>"; }).join("");
  }
  function chips(ids) {
    return ids.filter(function (c) { return concepts[c]; }).map(function (c) {
      return '<button type="button" class="graph__chip" data-go-c="' + c + '">(' + esc(concepts[c].name) + ")</button>";
    }).join(" ");
  }
  function open(kind, id, from, quiet) {
    if (!quiet) returnTo = from || doc.activeElement;
    opened = { kind: kind, id: id };
    var html;
    if (kind === "c") {
      var c = concepts[id];
      var list = c.thoughts.filter(function (x) { return !dotOf(x) || !dotOf(x).classList.contains("is-gone"); });
      html = '<h2 class="graph__note-title">' + esc(c.name) + "</h2>" +
        '<p class="graph__note-gist">' + esc(c.gist) + "</p>" +
        '<ul class="graph__note-list">' + list.map(function (x) {
          var t = thoughts[x];
          return '<li><button type="button" data-go-t="' + x + '">' + esc(t.title || "untitled") + (t.seed ? ' <span class="graph__seed">(seed)</span>' : "") + "</button></li>";
        }).join("") + "</ul>";
    } else {
      var t = thoughts[id] || liveById[id];
      var gone = live && !liveById[id];
      var seed = t.seed || (liveById[id] && !/[\p{L}\p{N}]/u.test(String(liveById[id].body || "")));
      html = '<h2 class="graph__note-title">' + esc(t.title || "untitled") + "</h2>" +
        (gone ? '<p class="graph__note-gist">(removed)</p>'
          : seed ? '<p class="graph__note-gist">(a seed: named, not written yet)</p>'
          : '<div class="graph__note-body">' + firstLines(t) + "</div>") +
        (thoughts[id] && thoughts[id].concepts.length ? '<p class="graph__chips">' + chips(thoughts[id].concepts) + "</p>" : "") +
        (gone ? "" : '<p class="graph__note-foot"><button type="button" data-read="' + id + '">(read)</button></p>');
    }
    note.innerHTML = '<button type="button" class="graph__close" data-close aria-label="close">(×)</button>' + html;
    note.hidden = false;
    light(kind, id);
    if (!quiet) note.querySelector("[data-close]").focus({ preventScroll: true });
  }
  function close() {
    if (note.hidden) return;
    note.hidden = true; opened = null; unlight();
    if (returnTo && returnTo.focus && graph.contains(returnTo)) returnTo.focus({ preventScroll: true });
  }
  function read(id) {
    show("board", "now");
    setTimeout(function () {
      var art = board.querySelector('[data-id="' + id + '"]');
      if (!art) return;
      art.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "center" });
      art.classList.add("is-found"); setTimeout(function () { art.classList.remove("is-found"); }, 1600);
    }, 300);
  }
  graph.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || svg.contains(b)) return;
    if (b.hasAttribute("data-close")) return close();
    if (b.dataset.goC) return open("c", b.dataset.goC, wordOf(b.dataset.goC));
    if (b.dataset.goT) return open("t", b.dataset.goT, dotOf(b.dataset.goT));
    if (b.dataset.read) return read(b.dataset.read);
    if (b.dataset.open) return read(b.dataset.open);
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && current === "graph") close(); });

  /* ---------- (ask): owner-only, answered from the notes by the worker ---------- */
  var askForm = graph.querySelector("[data-ask]"), api = (board.dataset.api || "").replace(/\/$/, "");
  function answer(q, html, cites) {
    returnTo = askForm.querySelector("input");
    opened = { kind: "a", cites: cites || [] };
    note.innerHTML = '<button type="button" class="graph__close" data-close aria-label="close">(×)</button>' +
      '<h2 class="graph__note-title">' + esc(q) + "</h2>" + html;
    note.hidden = false;
    lightSet(opened.cites);
  }
  if (askForm) askForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var input = askForm.querySelector("input"), q = input.value.trim(), key = "";
    if (!q) return;
    try { key = localStorage.getItem("thoughts-key") || ""; } catch (err) {}
    answer(q, '<p class="graph__note-gist">(thinking…)</p>', []);
    fetch(api + "/ask", { method: "POST", headers: { "Content-Type": "application/json", "X-Owner-Key": key }, body: JSON.stringify({ question: q }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || ("error " + r.status)); return j; }); })
      .then(function (j) {
        var cites = (j.cites || []).filter(function (id) { return thoughts[id] || liveById[id]; });
        var links = cites.map(function (id) { var t = thoughts[id] || liveById[id]; return '<button type="button" data-go-t="' + esc(id) + '">(' + esc(t.title || "untitled") + ")</button>"; }).join(" ");
        answer(q, '<div class="graph__note-body graph__note-body--full"><p>' + esc(j.answer) + "</p></div>" +
          (links ? '<p class="graph__chips">' + links + "</p>" : '<p class="graph__note-gist">(nothing in the notes says this directly)</p>'), cites);
      })
      .catch(function (err) { answer(q, '<p class="graph__note-gist">(couldn’t ask: ' + esc(err.message) + ")</p>", []); });
  });

  /* ---------- the live notes, as main.js announces them ---------- */
  doc.addEventListener("thoughts:loaded", function (e) {
    live = e.detail.thoughts || []; owner = !!e.detail.owner;
    if (askForm) askForm.hidden = !owner;
    liveById = {}; live.forEach(function (t) { liveById[t.id] = t; });
    var m = merge(data.thoughts, live);
    $$(".graph__dot", svg).forEach(function (el) { el.classList.toggle("is-gone", m.hidden.indexOf(el.dataset.t) >= 0); });
    $$(".graph__edge", svg).forEach(function (el) { el.classList.toggle("is-gone", m.hidden.indexOf(el.dataset.t) >= 0); });
    $$(".graph__word", svg).forEach(function (el) { el.classList.toggle("is-faint", m.faint.indexOf(el.dataset.c) >= 0); });
    // the (unfiled) corner: notes posted since the compile, newest first
    unfiledG.textContent = "";
    var box = data.unfiled;
    if (m.unfiled.length) {
      var head = doc.createElementNS(SVGNS, "text");
      head.setAttribute("class", "graph__corner"); head.setAttribute("x", box.x + 22); head.setAttribute("y", box.y + box.h - 8);
      head.textContent = "(unfiled)"; unfiledG.appendChild(head);
    }
    m.unfiled.forEach(function (t, i) {
      var p = unfiledSpot(i, box), dot = doc.createElementNS(SVGNS, "circle");
      dot.setAttribute("class", "graph__dot graph__dot--unfiled"); dot.dataset.t = t.id;
      dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.setAttribute("r", 3);
      dot.setAttribute("tabindex", "0"); dot.setAttribute("role", "button"); dot.setAttribute("aria-label", (t.title || "untitled") + " (unfiled)");
      unfiledG.appendChild(dot);
    });
    unfiledIndex.hidden = !m.unfiled.length;
    unfiledIndex.querySelector("ul").innerHTML = m.unfiled.map(function (t) {
      return '<li><button type="button" data-open="' + esc(t.id) + '">' + esc(t.title || "untitled") + "</button></li>";
    }).join("");
    $$("[data-graph-index] [data-open]").forEach(function (b) { b.parentNode.hidden = m.hidden.indexOf(b.dataset.open) >= 0; });
    if (opened && opened.kind !== "a") open(opened.kind, opened.id, null, true);
  });

  if (location.hash === "#graph") show("graph", "now");
})(typeof window !== "undefined" ? window : globalThis);
