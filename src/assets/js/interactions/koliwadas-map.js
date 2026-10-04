/* koliwadas-map — twelve villages on a schematic of the Mumbai coast.
   Mounted by story.js into a Koliwadas beat marked `interaction: true`; `villages` is
   src/_data/koliwadas.js (id, name, x, y, note) in the schematic's 100 × 125 box. Click, tap, or
   Enter / Space on a focused dot picks it: the dot fills and the frame's bottom-right reads
   "village NN · name · note". Drawn with the theme's tokens only. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  // a schematic, not a survey: the city as one peninsula, the western shore down the left, the
  // eastern shore and the harbour up the right, the island city narrowing to its tip at the bottom
  var LAND = "M30 0 L31 18 L33 34 L35 50 L38 64 L40 78 L42 92 L45 106 L48 118 L52 121 L56 108 " +
             "L59 94 L64 82 L72 72 L66 60 L68 48 L74 38 L79 22 L80 0 Z";

  window.StoryInteractions = window.StoryInteractions || {};
  window.StoryInteractions["koliwadas-map"] = {
    mount: function (root, villages) {
      villages = villages || [];
      var svg = svgEl("svg", { viewBox: "0 0 100 125", "class": "kmap", role: "group",
        "aria-label": "The koliwadas on a schematic of the Mumbai coast" });
      svg.appendChild(svgEl("path", { d: LAND, "class": "kmap__land" }));

      var tag = document.createElement("span");
      tag.className = "kmap__tag";
      tag.textContent = "(schematic, not to scale)";
      var out = document.createElement("div");
      out.className = "kmap__out";
      out.setAttribute("aria-live", "polite");

      var dots = villages.map(function (v) {
        var west = v.x < 55;
        var g = svgEl("g", { "class": "kmap__v", tabindex: "0", role: "button", "aria-pressed": "false",
          "aria-label": "village " + v.id + ", " + v.name, transform: "translate(" + v.x + " " + v.y + ")" });
        g.appendChild(svgEl("circle", { r: "4.2", "class": "kmap__hit" }));
        g.appendChild(svgEl("circle", { r: "1.7", "class": "kmap__dot" }));
        var n = svgEl("text", { x: west ? "-3.4" : "3.4", y: "1", "class": "kmap__n", "text-anchor": west ? "end" : "start" });
        n.textContent = v.id;
        g.appendChild(n);
        function pick() {
          dots.forEach(function (d) {
            d.classList.toggle("on", d === g);
            d.setAttribute("aria-pressed", d === g ? "true" : "false");
          });
          out.textContent = "village " + v.id + " · " + v.name + " · " + v.note;
          out.classList.add("on");
        }
        g.addEventListener("click", pick);
        g.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
        });
        svg.appendChild(g);
        return g;
      });

      root.classList.add("kmap-root");
      root.appendChild(svg);
      root.appendChild(tag);
      root.appendChild(out);
    }
  };
})();
