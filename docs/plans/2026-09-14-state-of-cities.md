# State of Cities — page plan

New page `/work/state-of-cities/` (`src/projects/2-state-of-cities.md`), built on the chapter
template from `2026-09-13-project-page.md`. Supersedes §A of `2026-09-13-book-projects.md`,
which was written before the folder was triaged.

Source: `images/NIUA/State-of-cities/` — 27 spreads, all 1920×960, from NIUA's *State of Cities*
(2023). `SOC_1A–4A` are the book's four section dividers (Global View · National Lens · City View ·
Way Forward); `SOC_5A` is the references page; `SOC_01–06` and `SOC_8` are the numbered
infographic spreads; `SOC_7-1…15` are the fifteen city profiles, one identical template each.

Principle (unchanged): **show the argument, not the book.** The `A` pages give the page its
structure and its numbers; their prose is institutional and is not reused. The site's voice is
first person and terse.

## Approved direction

> **Revised after first deploy (2026-09-14):** the ghost viewer did not read well live and the
> city spreads were too small. Chapter 03 is now: stat row → `SOC_06` *Where Cities Stand* as a
> full-width plate (fig.05) → a **full-width city carousel** (fig.06–20; prev/next, a fifteen-
> segment rule, arrow keys, swipe, lightbox on click) → text | ledger, where clicking a row turns
> the carousel to that city. The ghost survives only as `scripts/ghost.py`. The homepage thumb is
> `SOC_06`. The sections below describe the ghost design as reviewed; the state table's hover /
> held / prefetch / decode-gating / a11y rules carry over to the carousel unchanged.

`~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/state-of-cities-20260914/D-final.html`
(render: `variant-D-final.png`; `approved.json`). Real site CSS, real spreads, working JS —
hover, hold, Esc, touch and prefetch all behave as specified below. Round one (A grid /
B one-open+index / C filmstrip) was rejected; round two chose D (ghost + ledger) over E (pager)
and F (ghost + names). `D.html` is the pre-review artefact and carries dead CSS from the
rejected variants; **the canonical blocks are `.stats`, `.viewer`, `.ledger`** as they appear in
`D-final.html`.

The fifteen-city chapter is one component, **the ghost viewer**:

1. **Ghost plate.** The fifteen city spreads averaged into a single image (`ghost.jpg`). What is
   constant in the template stays sharp — headings, donut rings, the star row, the measures
   columns; what varies blurs — the city name, the numbers, the pie slices. The image is the
   chapter's argument ("the same page, fifteen times") before a word is read, and must carry it
   **without any hover** (see Prep: contrast stretch).
2. **Ledger.** Beside the chapter text, fifteen rows: `city · bar · tCO₂e/person · ★★★☆☆`.
   Sorted by per-capita emissions, most to least. One encoding per bar (D4A): plain `--accent`,
   no population fade. Stars are the book's CSCAF 2.0 rating. The ledger *is* the chart — there
   is no separate chart plate.
3. **Resolve.** Hover or focus a row and the ghost crossfades (450ms) into that city's spread;
   the caption becomes `fig.NN · City · year inventory · per-capita · population · CSCAF n/5`.
   Leave, and it returns to the ghost. Click holds a city; click again or `Esc` releases. Click
   the image to open the lightbox at that city. Full state table below.
4. **Sticky.** The plate sits full width inside chapter 03 and stays pinned while the ledger
   scrolls beneath it.

## Page map

| # | chapter | text (draft, site voice) | plates |
|---|---|---|---|
| open | — | — | `SOC_01` Cities at Crossroads, **whole**, full width. Caption from CURATION §3: *"cities at crossroads — the argument, drawn: what climate change costs a city that cannot read itself."* `fig.01` |
| 00 | the unit | Cities are where emissions are made and where the data is worst. Why the report starts with the world's cities as the unit of account. | `SOC_02` **detail** (D1A): the world map with its city footprints, cropped at 2×. `fig.02 (detail)` |
| 01 | the nation | India's curve 1990–2019 and the two lines after it: business as usual vs. city action to 2070. What the national commitments ask of cities. | `SOC_04` **detail**: the GHG-rise chart with the projection fork, cropped at 2×. `fig.03 (detail)` |
| 02 | the instrument | CSCAF 2.0: the framework that turns a city into a star rating. Five sectors, five stars, ten cities already acting. | `SOC_05` **detail**: the CSCAF 2.0 findings column (five sectors) or the star scale — pick the one that reads at 6 columns. `fig.04 (detail)` |
| 03 | fifteen cities | "The same page, fifteen times" — the template is the point; read across it and the seams show: inventories from 2012 to 2021, a 3.5× spread in per-capita emissions, *and one city's total and its per-capita figure cannot both be true — the book's own sum only works if you pick the wrong one.* | **stat row** (first row of the chapter, under the eyebrow) · **ghost viewer** + **ledger** (`ghost.jpg`, fifteen `SOC_7-*`). `fig.05–19` in ledger order |
| 04 | the path | Assess, commit, plan, implement, monitor, revise. The book draws it as a loop; the loop needs one thing most cities do not have — a data layer they can maintain themselves. | `SOC_8` **whole**, as a narrow 10-column coda under the text (`chap--notext chap--narrow`, D3B). `fig.20` |
| outcome | built / recognised / next / **link** | `link: { label: "State of Cities (PDF)", href }` — a fourth `(label)` / value field | — |

Not used on the page: `SOC_03` Global Goals (timeline; the least city-specific spread),
`SOC_06` Where Cities Stand (the ledger redraws its per-capita data), `SOC_5A` References
(source for the caption credit lines), `SOC_1A/2A/4A` (dividers).

**Research question (D7A):** *can fifteen cities be read on one instrument — and what does the
instrument miss?*

### Stat row (from `SOC_3A` "What's ahead?")

Lives **inside** `section#ch-03` as its first full-width row, directly under the `(03) fifteen
cities` eyebrow; 40px above the viewer (the gap before the eyebrow is the normal chapter margin).
`15 (cities) · 24 M (people) · 38 Mt (CO₂e · one year) · 319 (actions · 147 adaptation + 172 mitigation)`.
Fraunces 400 `clamp(1.9rem, 3.6vw, 2.8rem)`, `letter-spacing: -.01em`, `--ink`; labels mono 11px
`.06em` `--faint-2`; one hairline `rgba(28,27,24,.09)` above; 12.5px `--faint` source line
spanning all columns: *State of Cities, NIUA 2023 · inventories by ICLEI South Asia, 2012–21.*
Four columns ≥821px, 2×2 below. The book also gives 246 M GJ energy and 27,973 M kWh
electricity — four numbers is the limit for one row.

### Chapter 03 hierarchy (desktop, what the eye meets in order)

```
(03) fifteen cities                                   eyebrow, 12 cols
15        24 M        38 Mt        319                 stat row, 12 cols
────────────────────────────────────────────
[            ghost / resolved city            ]        viewer, pinned, ≤ 12 cols
fig.05–19  The fifteen city spreads, averaged …        caption, aria-live
The same page,       | Panaji     ████████ 3.52 ★★☆☆☆
fifteen times        | Kochi      ██████   2.62 ★★☆☆☆   ledger, 6 cols, scrolls
body text, 5 cols    | …                              under the pinned plate
(static, not sticky) | Thane      ███      1.02 ★★★☆☆
                     | tCO₂e per person, most to least · stars = CSCAF 2.0
```

### Ledger data (`docs/plans/soc-cities.csv` → `src/_data/socCities.json`)

Read off the fifteen spreads; book order is alphabetical, ledger order is per-capita descending.

| city | pop M | year | CSCAF | energy M GJ | GJ/cap | GHG Mt | tCO₂e/cap | elec M kWh | kWh/cap |
|---|---|---|---|---|---|---|---|---|---|
| Ahmedabad | 7.18 | 2020-21 | 4 | 84.2 | 11.73 | 13.1 | 1.83 | 11,690 | 1,628 |
| Coimbatore | 1.89 | 2020-21 | 3 | 21.13 | 10.48 | 3.22 | 1.60 | 2,192 | 1,088 |
| Gwalior | 1.11 | 2013-14 | 2 | 8.76 | 7.89 | 1.19 | 1.08 | 735 | 662 |
| Kochi | 0.6 | 2018-19 | 2 | 1.74 (printed) | 28.29 | 1.61 | 2.62 | 523 | 847 |
| Nagpur | 2.4 | 2017-18 | 3 | 19.04 | 7.03 | 3.03 | 1.13 | 1,822 | 678 |
| Panaji | 0.04 | 2013-14 | 2 | 1.19 | 29.05 | 0.14 | 3.52 | 92 | 2,232 |
| Pimpri-Chinchwad | 1.7 | 2012-13 | 4 | 21.9 | 11.08 | 3.18 | 1.61 | 2,641 | 1,335 |
| Rajkot | 1.79 | 2020-21 | 4 | 17 | 9.5 | 2.27 | 1.26 | 1,712 | 953 |
| Shimla | 0.14 | 2013-14 | 3 | 1.64 | 9.14 | 0.21 | 1.24 | 139 | 790 |
| Siliguri | 0.69 | 2020-21 | 2 | 16.22 | 23.52 | 1.67 | 2.43 | 507 | 735 |
| Thane | 1.84 | 2017-18 | 3 | 13.06 | 5.83 | 2.29 | 1.02 | 1,677 | 749 |
| Tiruchirappalli | 1.02 | 2020-21 | 2 | 9.18 | 8.95 | 1.88 | 1.84 | 1,155 | 1,125 |
| Tirunelveli | 0.55 | 2020-21 | 2 | 4.8 | 8.76 | 0.66 | 1.2 | 448 | 810 |
| Udaipur | 0.53 | 2020-21 | 3 | 8.18 | 15.40 | 1.16 | 2.19 | 775 | 1,460 |
| Vadodara | 2.24 | 2020-21 | 4 | 18.11 | 8.09 | 2.66 | 1.19 | 1,865 | 832 |

Sums: population 23.7 M (book: 24 M ✓), GHG 38.3 Mt (book: 38 ✓), energy 246.2 M GJ (book: 246 ✓).
**The seam, as printed:** Kochi's 1.74 M GJ and 28.29 GJ per person cannot both be true for
0.6 M people (1.74 gives 2.9); at 1.74 the city's electricity alone (523 M kWh ≈ 1.88 M GJ)
exceeds its total energy; and the book's 246 M GJ total only sums with the 1.74. The chapter's
last sentence claims exactly this and nothing more — it is checkable against pp. 40–41 and 31
of the book, no ICLEI inventory needed.

## Interaction states — viewer + ledger

| state | what the reader sees |
|---|---|
| loading | ghost `<img loading="eager">`; box reserved by `aspect-ratio: 2/1` on `--paper-2`; city `<img>` has **no `src`** at rest (`src=""` draws a broken icon), `decoding="async"` |
| prefetch (D2A) | when the viewer enters the viewport (`IntersectionObserver`, 200px margin) all fifteen **1024px resolve renditions** are fetched (`new Image()`), 1.1 MB total (the viewer is never wider than 966px); the full-size files are used only by the lightbox |
| hover (mouse only, `@media (hover:hover)`) | row name → `--ink`, bar → `--ink`; caption swaps immediately; the city image is shown **only after `img.decode()` resolves**, guarded by a request token so a slower earlier hover cannot overwrite a newer one; `pointerleave` starts a 120ms timer back to the ghost (or the held city), cancelled if the pointer enters the image |
| focus (keyboard) | as hover; the site's global 2px `--accent` `:focus-visible` outline is kept |
| held (click / Enter) | row name in `--accent`, stars replaced by mono `(held)`; distinct from hover; second click or `Esc` releases; hover on other rows previews over a held city and returns to it on leave |
| touch (`hover:none`) | no hover binding; tap = hold, tap again = release; caption sentence swaps to "Tap a city to resolve it; tap again to release."; rows `min-height: 44px` |
| click the image | opens the lightbox on the **fifteen-city set in ledger order**, at the held city, or at the first row if nothing is held; `initLightbox` skips `.viewer`; `initViewer` registers the set from the rows' `data-src/fig/cap/w/h` via `openLightbox` |
| error (city 404) | ghost stays, caption reverts, the row's value gets mono `(missing)` |
| no-JS | ghost + static ledger; each row is a real `<a href>` to the full-size spread; the hover sentence is `.js-only` |
| reduced motion | the global `prefers-reduced-motion` rule zeroes transitions — the crossfade becomes a cut; no JS-driven fade |
| empty / partial | not applicable — the set is fixed at fifteen; a city with no row is a data error, not a state |

**Sticky (desktop, ≥821px):** the pin wrapper is a full-width grid item of `section.chap--viewer`
(viewer, text and ledger share one grid so the pin lasts the whole ledger): `position: sticky;
top: 62px; padding-top: 26px; background: var(--paper); z-index: 2` — the header is 62px and
the padding closes the slot under it. Viewer width `clamp(320px, calc(2 * (100vh − 88px − 460px)),
100%)`, centred — at 900px tall that is 704px wide and leaves nine ledger rows visible under
the caption. `@media (max-height: 640px)` → the pin is static and the viewer full width.
Chapter 03's text column is `position: static` (the template's `sticky; top: 96px` would slide
it under the plate).

## Frontmatter shape (additions to the chapter template)

```yaml
question: can fifteen cities be read on one instrument — and what does the instrument miss?
open: { src: /assets/projects/state-of-cities/01.jpg, w: 1920, h: 960, fig: fig.01, cap: "…" }
chapters:
  - { n: "00", name: the unit, title: "…", plates: [ { src: …/02.jpg, w: …, h: …, fig: "fig.02 (detail)", cap: "…" } ] }
  - { n: "01", name: the nation, title: "…", side: left, plates: [ …/03.jpg ] }
  - { n: "02", name: the instrument, title: "…", plates: [ …/04.jpg ] }
  - n: "03"
    name: fifteen cities
    title: The same page, fifteen times
    stats:
      src: "State of Cities, NIUA 2023 · inventories by ICLEI South Asia, 2012–21"
      items: [ { n: "15", l: "cities" }, { n: "24 M", l: "people" }, { n: "38 Mt", l: "CO₂e · one year" }, { n: "319", l: "actions · 147 adaptation + 172 mitigation" } ]
    viewer:
      ghost: { src: …/ghost.jpg, w: 1920, h: 960, fig: "fig.05–19", cap: "The fifteen city spreads, averaged into one image. What stays sharp is the template; what blurs is the city.", cap_short: "Fifteen spreads, averaged." }
      data: socCities        # src/_data/socCities.json — rows carry src (full), resolve (1280px), w, h, fig
      sort: tco2e_pc desc
      unit: "tCO₂e per person, most to least · stars = CSCAF 2.0"
  - { n: "04", name: the path, title: "…", narrow: true, plates: [ { src: …/20.jpg, w: 1920, h: 960, fig: fig.20, cap: "…" } ] }
outcome: { built: "…", recognised: "…", next: "…", link: { label: "State of Cities (PDF)", href: "…" } }
next: koliwadas — embedded participatory method     # → capacities once B exists
```

Template: a `viewer(v)` macro next to `plate` / `strip` renders the pin wrapper, `<figure class=
"plate viewer">` (ghost `<img>` + src-less `<img class="city">`, caption `aria-live="polite"`),
then `<ol class="ledger">` whose rows are `<a href="<full>" data-src="<resolve>" data-city
data-fig data-cap aria-label="Panaji — 3.52 tonnes CO₂e per person, 0.04 million people, CSCAF
2 of 5, 2013–14 inventory">` with the glyph spans `aria-hidden`. `initViewer(root)` in `main.js`
sits beside `initLightbox` (~50 lines, no library) and runs first. Chapter 04 keeps the eyebrow
and title above a narrow plate: `chap--notext chap--narrow` with the text block rendered inside
the plate column (as in `D-final.html`).

## Responsive

| | ≥ 821px | ≤ 820px |
|---|---|---|
| stat row | 4 columns | 2 × 2 |
| viewer | pinned, `clamp(320px, …, 100%)` wide | pinned `top: 61px`, full width (352 × 176) + **one-line caption** (`cap_short` + the tap sentence) ≈ 240px pinned; ≥ 8 rows visible on an iPhone SE |
| ledger | beside the text, 6 cols; grid `9.5em 1fr 3.4em 4.8em`, 8px row padding, 11px track `rgba(28,27,24,.05)` | full width under the text; grid `7.5em 1fr 3.4em`, **stars hidden** (D6A — they remain in the resolved caption), rows `min-height: 44px` |
| chapter text | static, 5 cols | — |
| 00–02 details | 6-col plates, `side:` alternating | full width |
| 04 coda | 10 cols, centred | full width |
| open plate | 12 cols | full width |

## Accessibility

- Ledger rows are links with the full `aria-label` above; bar, value and stars `aria-hidden`.
- Viewer caption region is `aria-live="polite"`; it announces on **hold only** (hover/focus
  updates are visual — the row's own label already speaks the city).
- Global 2px `--accent` focus outline retained; `Esc` releases a held city; tab order is the
  ledger's visual order.
- City `<img>` `alt` = city name on resolve, empty at rest; ghost `alt` = "fifteen spreads averaged".
- Contrast unchanged from the site (`--faint` on `--paper` ≈ 5.2:1); 10.5px mono values are
  captions, not body; body stays 17px / 1.7.
- Touch targets ≥ 44px under `(hover:none)`.

## Prep

- `images/_picks/state-of-cities/` (as built): `00-ghost` (thumb), `01` SOC_01 whole, `02–04` the
  three details, `05` ghost, `06–20` the fifteen cities in ledger order, `21` SOC_8 →
  `python scripts/prep-images.py state-of-cities`. File numbers ≠ fig numbers (cities are
  fig.05–19, the coda fig.20), as on living heritage.
- `prep-images.py`: a `resolve` filename hint (`06-lg-natural-resolve-panaji.jpg`) also writes
  `NN-r.jpg` at 1024px / q72, emitted as `resolve:`; `socCities.json` carries it per city. The 2×
  lightbox slot is not built yet — add when the PDF export exists.
- `scripts/ghost.py`: size check, pixel mean, then a levels stretch (2nd–98th percentile → full
  range) blended back at `--strength 0.5` — the full stretch made the donuts garish. Verified:
  rings, headings and the star row stay crisp; rerun if any spread is re-exported.
- **2× export [confirm]:** if the source PDF still exists, export `SOC_01, 02, 04, 05, 8` and the
  fifteen `SOC_7-*` at 3840×1920. The three detail crops (00–02) are cut from the 2× files; the
  lightbox uses them; the page plates stay ≤ 1920. Without the PDF the details are cut from
  the 1920 files and will be soft — acceptable, not good.
- CSV → `src/_data/socCities.json` (checked in; a 20-line script, or by hand once).

## Homepage

Ninth card (`book-projects.md`: re-balance the 12-col composition when the first of the three
lands — this is the first). Thumb = the ghost; **`--car: 2/1` on this card** (D5A), no `contain`
bands; `fig: fig.05–19 — fifteen cities, one instrument · niua`. Re-check the index at 1280 and
400 and re-tune `--cmt` where cards collide.

## What already exists (reuse, don't reinvent)

- Chapter template (`project.njk`): `plate`, `strip`, `.chap` 12-col row, `side:`, `narrow:`,
  `(outcome)` block, `chapters` filter splitting the body on `## NN name`.
- Lightbox carousel (`main.js:388`): keyboard, swipe, focus return — the viewer only registers
  a set; it does not build a viewer of its own.
- Tokens in `main.css`: Fraunces / Geist / mono, `(label)` convention, `--accent`, `--paper-2`
  grounds, hairline `rgba(28,27,24,.09)`, `.reveal`, reduced-motion rule.
- `scripts/prep-images.py` pick-folder pipeline; `CURATION.md §3` caption for the open plate.

## NOT in scope

- **A generic "series viewer" for CapaCities and GCAP** — the ghost technique may transfer to
  four covers or five maps; decide when B is curated, not now.
- **Redrawing `SOC_04`'s India projection as an SVG chart** — the series is not tabulated; a
  detail crop at 2× is honest and reads.
- **A DESIGN.md** — still worth doing (`TODOS.md`); the tokens in `main.css` were enough to
  build against today.
- **Codex outside voice** — unavailable on this account (model not supported); the review ran
  single-model with an independent Claude subagent.
- **Kochi against the ICLEI inventory** — the page claims only the book-internal inconsistency;
  whether 17.4 is the true figure is a question for ICLEI, not for this page.

## Implementation Tasks
Synthesized from this review's findings. Each task derives from a specific finding above.
Run with Claude Code; checkbox as you ship. One commit per task is fine; push once QA (T8) passes.

- [x] **T1 (P1, human: ~2h / CC: ~10min)** — prep — picks, ghost, renditions
  - Surfaced by: Prep; Pass 3 (ghost must argue unaided); Pass 2 D2A (1280px resolve)
  - Files: `images/_picks/state-of-cities/*`, `scripts/ghost.py`, `scripts/prep-images.py` (`--resolve`, `--lightbox`), `docs/plans/soc-cities.csv` → `src/_data/socCities.json`
  - Verify: `ghost.jpg` shows crisp donut rings and headings; every item in the emitted YAML has `w/h`; 05–19 have `resolve:`
- [x] **T2 (P1, human: ~3h / CC: ~15min)** — template — `viewer` macro + `stats` + ch04 narrow-with-text
  - Surfaced by: Approved direction; Pass 1 (stats inside ch03, fig numbering); D3B
  - Files: `src/_includes/project.njk`
  - Verify: `npx @11ty/eleventy` builds; ch03 renders eyebrow → stats → pin → text | ledger; rows are `<a href>` to the full file with `aria-label`
- [x] **T3 (P1, human: ~2h / CC: ~10min)** — css — `.stats`, `.viewer`, `.ledger`, pin, mobile
  - Surfaced by: Pass 5 (numbers from `D-final.html`); Pass 6 (responsive table); sticky spec
  - Files: `src/assets/css/main.css`
  - Verify: no see-through slot under the header at 1280×900; plate never collapses at 900×400; ≤820px rows show name · bar · value at ≥44px
- [x] **T4 (P1, human: ~3h / CC: ~15min)** — js — `initViewer`
  - Surfaced by: Interaction states table (decode gating, token, hover:hover gate, held/Esc, prefetch, error, lightbox set)
  - Files: `src/assets/js/main.js`
  - Verify: first hover after prefetch crossfades without a pop; `initLightbox` skips `.viewer`; clicking the image opens the lightbox at the held city with counter `n / 15`; `Esc` releases
- [x] **T5 (P1, human: ~2h / CC: ~10min)** — content — `2-state-of-cities.md`
  - Surfaced by: Page map; D7A question; Pass 3 (Kochi sentence, `outcome.link`)
  - Files: `src/projects/2-state-of-cities.md`, `src/projects/projects.11tydata.js` if ordering needs it
  - Verify: build + read the page top to bottom once; meta row has no `[confirm]` left
- [x] **T6 (P1, human: ~1h / CC: ~10min)** — index — ninth card
  - Surfaced by: Homepage, D5A
  - Files: `src/index.njk`
  - Verify: card renders the ghost edge to edge in a 2:1 frame; index at 1280 and 400 without collisions
- [x] **T7 (P2, human: ~30min / CC: ~5min)** — outcome — `link:` field
  - Surfaced by: Pass 3 (no slot for the published report)
  - Files: `src/_includes/project.njk`, `src/assets/css/main.css` (`.detail__outcome` fourth field)
  - Verify: living heritage unchanged (no `link:`); state of cities shows `(report)` → PDF
- [x] **T8 (P2, human: ~1h / CC: ~5min)** — qa — screenshots + a11y pass
  - Surfaced by: Pass 6
  - Files: `_site/**`
  - Verify: 1280 + 400 of the page; hover/held/focus states captured; `aria-live` announces on hold only; `/design-review` after deploy
  - Done headless (1280/400, hover, held, lightbox at the held city, homepage overlay). Real-device pass is the TODOS.md item.

_No new tasks from Pass 4 (AI slop) beyond the plain-bar change folded into T3._

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|---|---|---|---|
| chapter 03 · ghost viewer + ledger (+ ch02 detail, ch04 coda) | `~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/state-of-cities-20260914/variant-D-final.png` (live: `D-final.html`) | D · the fifteen spreads averaged into one image; a ledger that is chart, index and viewer; hover resolves, click holds | Built to the reviewed spec: stats inside ch03, fig numbering, plain bars, three states, sticky fixed, ch04 narrow coda. Round-one (`variant-A/B/C.png`) and round-two (`variant-D/E/F.png`) kept for reference. |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score: 4/10 → 9/10, 9 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **CROSS-MODEL:** outside voice ran single-model (independent Claude subagent; Codex unavailable on this account). 21 findings, 19 absorbed into Passes 1–6, 2 deferred to NOT in scope.
- **VERDICT:** DESIGN CLEARED — ready to implement; eng review required

NO UNRESOLVED DECISIONS
