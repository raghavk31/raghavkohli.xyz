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
      // a story beat carries at most two post-its; project.njk renders the first two and drops the rest
      (p.data.story || []).forEach((b, i) => {
        if (b && b.notes && b.notes.length > 2) {
          console.warn(`[story] "${p.data.title}" beat ${i + 1} has ${b.notes.length} notes — only the first 2 are shown`);
        }
      });
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

  // The title after `title` in the homepage grid's order (src/_data/groups.js), wrapping at the end.
  // A project that is not on the grid gets the first card.
  eleventyConfig.addFilter("nextInGrid", (groups, title) => {
    const flat = (groups || []).flatMap((g) => g[1]);
    const i = flat.indexOf(title);
    return flat[(i + 1) % flat.length];
  });

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

  // The split story built from a project's own chapters: one beat per figure, in page order (plates,
  // a pair, a strip's items, a stack's plate beside it), and one `block` beat for a figure with its own
  // layout (swap, stack, compare, carousel, a tile grid), which project.njk renders with its macro.
  // The words stay short, so the work carries the page: a chapter's first beat gets its title and its
  // opening sentence or two; every later figure speaks with the first sentence of its caption, and the
  // rest of the caption sits under the picture. Cut from his words, never written.
  const strip = (x) => String(x || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const sentences = (x) => strip(x).split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘(])/).filter(Boolean);
  const firstSentences = (x, max) => {
    let out = "";
    for (const t of sentences(x)) {
      if (out && (out + " " + t).length > max) break;
      out = out ? out + " " + t : t;
      if (out.length > max * 0.6) break;
    }
    return out.length > max * 1.5 ? out.slice(0, max).replace(/\s+\S*$/, "") + "…" : out;
  };
  eleventyConfig.addFilter("splitBeats", (chapters, ch) => {
    const beats = [];
    (chapters || []).forEach((c, ci) => {
      const media = [];
      const img = (x, fig, cap) => {
        if (x && x.src) media.push({ src: x.src, w: x.w, h: x.h, fig: x.fig || fig, cap: x.cap || cap, blend: x.blend });
      };
      (c.plates || []).forEach((p) => img(p));
      (c.pair || []).forEach((p) => img(p));
      if (c.strip && c.strip.col) (c.strip.items || []).forEach((x) => img(x, c.strip.fig, c.strip.cap));
      if (c.stack && c.stack.beside) img(c.stack.beside);
      const block = c.carousel ? "carousel" : c.compare ? "compare" : c.swap ? "swap" : c.stack ? "stack" : "";
      if (block) media.push({ block });
      if (c.strip && !c.strip.col) (c.strip.items || []).forEach((x) => img(x, c.strip.fig, c.strip.cap));
      if (c.tiles) media.push({ block: "tiles" });
      if (!media.length) media.push({});
      let body = (ch && ch.byNum && ch.byNum[c.n]) || "";
      if (ci === 0 && ch && ch.intro) body = ch.intro + body;
      media.forEach((m, i) => {
        const b = { ...m, ci, lbl: `(${c.n}) ${c.name}`, first: i === 0 };
        if (i === 0) {
          b.text = c.title || firstSentences(body, 110);
          b.aside = c.title ? firstSentences(body, 220) : "";
        } else {
          const cs = sentences(m.cap);
          b.text = cs[0] || "";
          b.cap = cs.slice(1).join(" ");
        }
        beats.push(b);
      });
    });
    return beats;
  });
  // the opening beat: the subtitle, and the lead cut to a sentence or two
  eleventyConfig.addFilter("brief", (x, max) => firstSentences(x, max || 220));

  // whether any chapter has something to put on the stage (Sama, still text-only, does not)
  eleventyConfig.addFilter("anyMedia", (chapters) =>
    (chapters || []).some((c) => c.plates || c.pair || c.strip || c.tiles || c.swap || c.stack || c.compare || c.carousel)
  );

  // The card's hover post-it: `snippet:` when he has written one, else the first chapter's title —
  // the line the story itself opens on after the subtitle.
  eleventyConfig.addFilter("snippetOf", (d) => {
    if (d.snippet) return d.snippet;
    // skip a title that is only a date line ("One municipality, 2021–22")
    const c = (d.chapters || []).find((x) => x.title && x.title.length <= 70 && !/\d{4}[–-]\d{2}/.test(x.title));
    return c ? c.title : "";
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
