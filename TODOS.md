# TODOS

## Design debt (from /plan-design-review, 2026-09-13)

### DESIGN.md
- **What:** capture the tokens and rules already in `src/assets/css/main.css` — Fraunces/Geist/mono,
  the `(label)` convention, `--accent`, image grounds, the plate system, the invisible 12-col grid —
  as a one-page design system doc (`/design-consultation` or by hand).
- **Why:** reviews currently infer the system from CSS; a stated system keeps the remaining six
  project pages consistent and lets gstack design tooling calibrate against it.
- **Pros:** faster curation; consistent pages. **Cons:** ~30 min; must track `main.css`.
- **Depends on:** nothing. Do after the chapter template lands (`docs/plans/2026-09-13-project-page.md`).

### Plate zoom for very large scans
- **What:** click-to-enlarge with a native `<dialog>` (no library) for plates whose source exceeds
  ~3000px; `prep-images.py` emits a 3600px variant for those.
- **Why:** water urbanism scans are 14k px wide; at 966px their annotations are unreadable and
  `fit: natural` cannot help.
- **Pros:** calm layout, readable drawings on demand. **Cons:** first interactive component on the
  site — needs focus trap, Esc, mobile pinch fallback.
- **Depends on:** chapter template; water urbanism pick folder. Decide when that project is curated.

## Design debt (from /plan-design-review, 2026-09-14 — state of cities)

### Device QA for the ghost viewer
- **What:** after `/work/state-of-cities/` ships, open it on an iPhone (Safari) and an Android
  (Chrome). Check: tap = hold, tap again = release; tapping the image opens the lightbox at the
  held city; the pinned plate behaves under Safari's collapsing URL bar; Settings → Reduce
  Motion turns the crossfade into a cut; no double-tap needed on iOS.
- **Why:** the viewer's touch model, iOS first-tap behaviour and reduced-motion cut are not
  observable in the headless browser used for every screenshot in the review.
- **Pros:** the one interactive component on the site is checked where most readers use it.
  **Cons:** 15 min with two phones; a fix cycle if something fails.
- **Depends on:** the page deployed (`docs/plans/2026-09-14-state-of-cities.md`, T1–T8).

## State of cities — final touch (parked 2026-09-15, do when all book pages are in)

### 1 · Tell the making, not the book
- **What:** one paragraph at the top of chapter 03 on what Raghav did — fifteen inventories from
  different years and boundaries, the decision to force them into one template, what it took.
  Fill the meta row: `role`, `period`, the C-Cube recognition line, the real PDF `href`
  (all still `[confirm]` on prod in `src/projects/2-state-of-cities.md`).
- **Why:** the page currently narrates NIUA's four sections; the Media Lab / hiring reader needs
  the author's method and contribution. Single biggest improvement available.
- **Depends on:** Raghav's account of the role.

### 2–5 · Same session, once the facts are in
- Opening plate → `SOC_9` (clean drawing, 7200px); `SOC_01` (with text) into the lightbox.
- Carousel shows one page at a time (the data page, 1:1) so the numbers read on the page;
  and/or 2× export of the spreads from the PDF (needs the PDF).
- Chapter 03 duplicates: keep the ledger, move `SOC_06` to the lightbox set.
- Detail crops 00–02 recut from the 2× files.

## One is to one (from /plan-design-review, 2026-09-15)

### Reading order (`next:` routing)
- **What:** decide where `/work/one-is-to-one/` sits in the `(next)` chain and which page points
  at it. Options weighed: pune metro → one is to one → living heritage (recommended in review);
  one is to one → sama with no incoming; climate code → one is to one → pune metro.
- **Why:** every page ends with `(next)`; without an incoming pointer the page is reachable only
  from the grid. Raghav: "we'll figure out routing at the end" — decide before the push, or when
  the remaining project pages are in and the whole chain can be set once.
- **Depends on:** `docs/plans/2026-09-15-one-is-to-one.md` T6/T9; the 2026-09-16 batch.
