// A thought is one markdown file in src/thoughts/: `title:` and `date:` in the frontmatter, the
// thought below. The filename is its slug (a leading date is dropped from the URL):
//   src/thoughts/2026-09-21-drawing-the-water-first.md  ->  /thoughts/drawing-the-water-first/
// The journal at /thoughts/ shows every thought in full, newest first (src/thoughts.njk).
module.exports = {
  layout: "thought.njk",
  tags: "thought",
  eleventyComputed: {
    permalink: (data) => `/thoughts/${data.page.fileSlug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}/`,
  },
};
