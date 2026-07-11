# raghavkohli.xyz

Static site built with Eleventy. Design translated from the Claude Design prototype.

## Your weekly loop
Add a project: create `src/projects/N-slug.md` (the number sets order — lower = earlier
on the page). Fill the frontmatter (copy an existing file), write Markdown below it, commit.
Live in ~60s once GitHub Actions is set up.

## One-time setup
1. Edit `src/_data/site.js` — email, LinkedIn, GitHub, Scholar (set "" to hide a link).
2. Drop real images in `src/assets/projects/` matching each file's `thumb:` name.
   Until then, cards show a diagonal-stripe placeholder (no image needed to build).
3. Edit `src/_data/archive.js` for the (index) section rows.
4. Push to your GitHub Pages repo `main` branch.
5. Repo → Settings → Pages → Source → "GitHub Actions".
6. Confirm Settings → Pages → Custom domain = raghavkohli.xyz (CNAME is already included).

## Local preview
`npm install` once, then `npm start` → http://localhost:8080

## Card frontmatter fields
size: lg | wide | md | tall | sm   (controls width + aspect ratio)
offset: off-70 | off-130 | off-36 | ""   (vertical offset for the composed grid feel)
live: true   (shows accent-coloured status + a status tag in the caption)
question / role / period / context / status / desc / fig / lead / mediaHero / mediaPair / method / next
