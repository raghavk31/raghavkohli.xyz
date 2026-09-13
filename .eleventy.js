module.exports = function (eleventyConfig) {
  // Copy assets (CSS, images) straight through to the built site
  eleventyConfig.addPassthroughCopy("src/assets");
  // Copy the CNAME file so the custom domain survives every deploy
  eleventyConfig.addPassthroughCopy("src/CNAME");

  // A "projects" collection, newest first, driven by the `date` in each file
  eleventyConfig.addCollection("projects", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/projects/*.md")
      .sort((a, b) => a.inputPath.localeCompare(b.inputPath));
  });

  // Simple readable date filter, e.g. "2026" or "March 2026"
  eleventyConfig.addFilter("year", (dateObj) =>
    new Date(dateObj).getFullYear()
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
