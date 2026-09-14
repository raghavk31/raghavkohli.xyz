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
