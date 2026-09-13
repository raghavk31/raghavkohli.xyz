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
