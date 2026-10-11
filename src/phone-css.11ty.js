/* Phones keep the site's first size (2026-10-11). The site itself is drawn at 75%: every px in main.css and
   perspectives.css was scaled by .75. This writes a copy of each sheet with those sizes put back (x 4/3), which
   base.njk / perspectives.njk load after the sheet itself under (max-width: 540px). Edit only the sheets; the
   phone copies follow on every build.
   Left alone, as in the scaling: hairlines (1px and under) and SVG text and strokes, which scale with their
   viewBox. The card's --cpad / --cq come from index.njk at the 75% size, so they are multiplied here. */
const fs = require("fs");
const path = require("path");

const K = 4 / 3;
const PX = /(?<![\w.#-])(-?\d*\.?\d+)px\b/g;
const SVG = /fill:|stroke|(^|[\s,>])text\b(?!-)|eco__label|eco__count|kmap__n/;
const fmt = (v) => String(Math.round(v * 100) / 100);
const up = (s) => s.replace(PX, (m, n) => (Math.abs(+n) <= 1 ? m : fmt(+n * K) + "px"));
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

function phone(css) {
  css = css.replace(/var\(--(cpad|cq|tmin),([^)]*)px\)/g, (m, v, d) => `calc(var(--${v},${d}PX) * 4 / 3)`);
  css = css.replace(/@media[^{]*/g, (m) => m.replace(/(max|min)-width:\s*(\d+(?:\.\d+)?)px/g, (q, k, n) =>
    `${k}-width:${k === "min" ? fmt((+n - 1) * K + 1) : fmt(+n * K)}px`));
  css = css.replace(/([^{}]*)\{([^{}]*)\}/g, (m, sel, body) => {
    const s = noComments(sel).trim();
    if (s.startsWith("@") || SVG.test(s) || SVG.test(noComments(body))) return m;
    return sel + "{" + up(body) + "}";
  });
  return css.replace(/font-size:75%;/, "font-size:100%;").replace(/PX\)/g, "px)");
}

module.exports = class {
  data() {
    return {
      pagination: { data: "sheets", size: 1, alias: "sheet" },
      sheets: ["main", "perspectives"],
      permalink: (d) => `/assets/css/${d.sheet}.phone.css`,
      eleventyExcludeFromCollections: true,
    };
  }
  render({ sheet }) {
    return phone(fs.readFileSync(path.join(__dirname, "assets/css", sheet + ".css"), "utf8"));
  }
};
