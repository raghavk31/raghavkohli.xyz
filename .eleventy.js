module.exports = function (eleventyConfig) {
  // Copy assets (CSS, images) straight through to the built site
  eleventyConfig.addPassthroughCopy("src/assets");
  // Copy the CNAME file so the custom domain survives every deploy
  eleventyConfig.addPassthroughCopy("src/CNAME");

  // A "projects" collection, newest first, driven by the `date` in each file
  eleventyConfig.addCollection("projects", function (collectionApi) {
    const items = collectionApi
      .getFilteredByGlob("src/projects/*.md")
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath));
    // A homepage card (one with a `card:`) without `covers:` renders no hover strip (plan 2026-09-19, D6) — say so at
    // build time so a half-finished card cannot ship unnoticed.
    for (const p of items) {
      if ((p.data.card || p.data.weight) && !(p.data.covers && p.data.covers.length)) {
        console.warn(`[covers] card "${p.data.title}" has no covers — run scripts/prep-covers.py ${p.fileSlug.replace(/^\d+-/, "")}`);
      }
    }
    return items;
  });

  // The journal: every file in src/thoughts/, newest first by its `date`
  eleventyConfig.addCollection("thoughts", (api) =>
    api.getFilteredByGlob("src/thoughts/*.md").sort((a, b) => b.date - a.date)
  );

  // "21 september 2026" — the journal's date, lowercase like every label on the site
  eleventyConfig.addFilter("day", (d) => {
    const x = d ? new Date(d) : new Date();
    return `${x.getUTCDate()} ${x.toLocaleString("en-GB", { month: "long", timeZone: "UTC" }).toLowerCase()} ${x.getUTCFullYear()}`;
  });

  // The item after the one at `url` in a collection (the next older thought), or null
  eleventyConfig.addFilter("after", (arr, url) => {
    const i = (arr || []).findIndex((x) => x.url === url);
    return i >= 0 && i + 1 < arr.length ? arr[i + 1] : null;
  });

  // Simple readable date filter, e.g. "2026" or "March 2026"
  eleventyConfig.addFilter("year", (dateObj) =>
    (dateObj ? new Date(dateObj) : new Date()).getFullYear()
  );

  // Find one item in a list by a data key — used to compose the homepage grid
  // by project title, independent of file order.
  eleventyConfig.addFilter("find", (arr, key, val) =>
    (arr || []).find((i) => i && i.data && i.data[key] === val)
  );

  // Split a project's rendered body at `## NN name` headings so the chapter template can
  // place each piece beside its plates. Returns { intro, byNum: { "00": html, ... } };
  // text before the first numbered heading lands in `intro`. Headings without a leading
  // two-digit number stay inside the preceding chunk untouched.
  eleventyConfig.addFilter("chapters", (html) => {
    const out = { intro: "", byNum: {} };
    const parts = String(html || "").split(/(?=<h2[^>]*>\s*\d{2}\b)/);
    for (const part of parts) {
      const m = part.match(/^<h2[^>]*>\s*(\d{2})\b[^<]*<\/h2>\s*/);
      if (!m) { out.intro += part; continue; }
      out.byNum[m[1]] = (out.byNum[m[1]] || "") + part.slice(m[0].length);
    }
    return out;
  });

  // A named JSON file from src/_data, for frontmatter that points at a dataset by name
  // (`viewer: { data: socCities }`) instead of inlining fifteen rows.
  eleventyConfig.addFilter("dataset", (name) => require(`./src/_data/${name}.json`));

  // Fixed decimals that keep their trailing zero ("1.60"), unlike `round`
  eleventyConfig.addFilter("fixed", (n, d) => Number(n).toFixed(d));

  // "★★★☆☆" for a 0–5 rating (CSCAF stars in the state-of-cities ledger)
  eleventyConfig.addFilter("stars", (n) => "★".repeat(n) + "☆".repeat(5 - n));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
