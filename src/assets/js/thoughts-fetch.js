/* Every thought the worker holds, page by page. GET /thoughts answers at most 100 at a time, newest
   first; ?before=<created> asks for the ones older than that, so this follows the oldest note of each
   page until a page comes back short. The layout map rides along on every page; the first is kept.
   One loop for the board (main.js initWall, the graph reads the same list) and the idea-file compile
   (scripts/compile-ideas.mjs), so neither drops notes past the first hundred. */
(function (root) {
  "use strict";
  var PAGE = 100;

  function fetchAllThoughts(api, fetchFn) {
    var get = fetchFn || root.fetch.bind(root);
    var all = [], seen = {}, layout = null;
    function page(before) {
      var url = api + "/thoughts?limit=" + PAGE + (before ? "&before=" + before : "");
      return get(url).then(function (r) {
        if (!r.ok) throw new Error("thoughts " + r.status);
        return r.json();
      }).then(function (j) {
        var list = j.thoughts || [];
        if (!layout) layout = j.layout || {};
        list.forEach(function (t) { if (!seen[t.id]) { seen[t.id] = 1; all.push(t); } });
        if (list.length < PAGE) return { thoughts: all, layout: layout };
        return page(list[list.length - 1].created);
      });
    }
    return page(0);
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { fetchAllThoughts: fetchAllThoughts, PAGE: PAGE };
  else root.fetchAllThoughts = fetchAllThoughts;
})(typeof window !== "undefined" ? window : globalThis);
