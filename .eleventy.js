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
