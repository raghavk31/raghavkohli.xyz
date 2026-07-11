module.exports = {
  layout: "project.njk",
  tags: "project-page",
  eleventyComputed: {
    // Strip the numeric ordering prefix ("1-sama" -> "sama") for clean URLs
    permalink: (data) =>
      `/work/${data.page.fileSlug.replace(/^\d+-/, "")}/`,
  },
};
