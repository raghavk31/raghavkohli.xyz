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

  // The story every chaptered project opens with, built from what the page already says, so no
  // project waits on a hand-written `story:`. One beat per chapter that has a picture: the chapter's
  // lead image on the stage, its title as the callout, its first sentence as the aside, and — when
  // a caption opens with a short sentence ("The aahars first.") — that sentence as the post-it.
  // `open` (or the first chapter) opens it with the subtitle. Words are cut from his, never written.
  const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const sentences = (s) => strip(s).split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘(])/);
  const firstSentences = (s, max) => {
    let out = "";
    for (const x of sentences(s)) {
      if (!x) continue;
      if (out && (out + " " + x).length > max) break;
      out = out ? out + " " + x : x;
      if (out.length > max * 0.6) break;
    }
    return out.length > max * 1.6 ? out.slice(0, max).replace(/\s+\S*$/, "") + "…" : out;
  };
  const noteFrom = (cap) => {
    // a voice, not a label: three words or more ("The first drawing, by hand."), never "Demography."
    const s = sentences(cap)[0] || "";
    return s.length <= 54 && s.split(/\s+/).length >= 3 ? s : "";
  };
  const pic = (c) => {
    const one = (x) => x && x.src && x.w && x.h ? { src: x.src, w: x.w, h: x.h, fig: x.fig, cap: x.cap, blend: x.blend } : null;
    if (c.plates && c.plates.length) return one(c.plates[0]);
    if (c.pair && c.pair.length) return one(c.pair[0]);
    if (c.stack) { const l = c.stack.items[c.stack.items.length - 1]; return one({ ...l, fig: c.stack.fig }) || one(c.stack.beside); }
    if (c.swap) { const l = c.swap.items[c.swap.items.length - 1]; return one({ src: l.src, w: l.sw, h: l.sh, fig: l.fig, cap: l.cap }); }
    if (c.strip && c.strip.items) return one({ ...c.strip.items[0], fig: c.strip.fig, cap: c.strip.items[0].cap || c.strip.cap });
    if (c.tiles && c.tiles.items) { const t = c.tiles.items[0]; return one({ src: t.src, w: t.w, h: t.h, fig: c.tiles.fig, cap: t.cap || c.tiles.cap }); }
    if (c.compare) { const t = c.compare.cities[0].items[0]; return one({ src: t.full, w: t.w, h: t.h, fig: c.compare.steps[0].fig, cap: c.compare.steps[0].cap }); }
    return null;
  };
  // where a beat's note sits on its frame: alternating corners, alternating tilt — set, not random
  const SPOTS = [{ x: 66, y: 5, r: 3 }, { x: -4, y: 60, r: -2.5 }, { x: 70, y: 64, r: -1.5 }, { x: -2, y: 4, r: 2 }];
  eleventyConfig.addFilter("storyFrom", (chapters, ch, open, subtitle, lead) => {
    const beats = [];
    const push = (p, text, aside, lbl) => {
      // the aside often opens by restating the title ("Three lines to 2070. Business as usual…")
      if (aside && text && aside.toLowerCase().startsWith(text.toLowerCase().replace(/[.]$/, ""))) {
        aside = aside.slice(text.length).replace(/^[.:,\s]+/, "");
      }
      let note = noteFrom(p.cap);
      if (note && beats.some((b) => b.text === note || (b.notes[0] && b.notes[0].t === note))) note = "";
      const spot = SPOTS[beats.length % SPOTS.length];
      beats.push({
        src: p.src, w: p.w, h: p.h, fig: p.fig, blend: p.blend, lbl,
        text, aside: aside && aside !== text ? aside : "",
        notes: note && note !== text ? [{ t: note, x: spot.x, y: spot.y, r: spot.r, alt: beats.length % 3 === 2 }] : [],
      });
    };
    const o = open && open.src ? pic({ plates: [open] }) : null;
    if (o) push(o, subtitle || firstSentences(lead, 160), "", "(opening)");
    (chapters || []).forEach((c, i) => {
      const p = pic(c);
      if (!p) return;
      let body = (ch && ch.byNum && ch.byNum[c.n]) || "";
      if (i === 0 && ch && ch.intro) body = ch.intro + body;
      // an untitled chapter (a photo run, a coda) speaks with its first sentence instead
      const said = firstSentences(body, 200);
      if (c.title) push(p, c.title, said, `(${c.n}) ${c.name}`);
      else if (said) push(p, firstSentences(body, 110), "", `(${c.n}) ${c.name}`);
      else push(p, noteFrom(p.cap) || sentences(p.cap)[0] || c.name, "", `(${c.n}) ${c.name}`);
    });
    return beats.slice(0, 9);
  });
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
