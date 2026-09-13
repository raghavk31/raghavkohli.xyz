# Book-based projects — format + prep checklist

Three projects, each built from 100+ page published books. Principle: **show the argument,
not the book.** A book earns 3–4 plates; at least one is data redrawn in the site's style so it
is readable on a phone. The 200-page folders under `images/ICLEI/*` and `images/NIUA/*` stay
as the archive; the site gets ~5 files per book.

Layout: the chapter template from `2026-09-13-project-page.md` (open plate, numbered chapters,
`(outcome)` block), plus three plate types the books need.

## New plate types

| type | frontmatter | renders as |
|---|---|---|
| **series strip** | `strip:` (exists) — one cover or one city map per plan, city order | one justified row, one height; says "a series" in a glance |
| **stat row** | `stats: [ { n: "5", l: "cities" }, { n: "2.4 Mt", l: "CO₂e inventoried" }, … ]` | 3–4 Fraunces numerals with mono `(label)`s, full width under a chapter |
| **chart plate** | `chart: { src: /assets/projects/<slug>/chart-01.svg, w, h, fig, cap }` | inline SVG built from a CSV with the dataviz pass; site colours (`--ink`, `--accent`, one highlight), Geist labels, no gridlines heavier than `--line`. Where no numbers exist: a 2400px crop of the book's chart as a normal plate, same caption style |
| **spread plate** | plain `plates:` item | one exported spread per book at natural ratio (like a drawing), never a screen photo |

Data status: **mixed** — redraw where numbers exist, crop where they don't; identical caption and
`fig.` treatment so the mix does not show. Rights: **all public** — each plan's published PDF is
linked from `(outcome)`.

## A · State of Cities → low carbon scenarios (NIUA)

Question (draft): *what does a low-carbon pathway cost a city that cannot read itself?*

| # | chapter | plates |
|---|---|---|
| open | — | the "cities at crossroads" spread (CURATION.md §3 caption) |
| 00 | context | one map/figure: which cities, what baseline year |
| 01 | inventory | **stat row** (cities · sectors · MtCO₂e · baseline) + one plate on where the numbers come from |
| 02 | scenarios | **chart plate** — BAU vs low-carbon curves to 2030/2050, the anchor of the page |
| 03 | argument | one spread + the report's central claim in the text |
| outcome | built / recognised / next | link to the published report |

Prep: 2 spreads · 1 map · CSV of the scenario series (year, scenario, MtCO₂e) · cover 1200px.

## B · CapaCities — 4 Climate Resilient City Action Plans (ICLEI)

Question (draft): *how does a city's own data become a plan the city adopts?*

| # | chapter | plates |
|---|---|---|
| open | — | **series strip**: 4 covers (or 4 city vulnerability maps), one height |
| 00 | framework | the CapaCities framework diagram (`images/ICLEI/CapaCities Overview`) — "data layer first" |
| 01 | four cities | **chart plate**: one metric across the 4 cities (per-capita emissions or sector split — whichever the plans actually compare) + **stat row** |
| 02 | one city, deep | Ahmedabad (or strongest): ward-by-ward vulnerability map at full res + one spread |
| 03 | adoption | which plans are in use, how; one photo/plate if any exists of the plan in a council setting |
| outcome | built / recognised / next | 4 PDF links |

Prep per plan: cover 1200px · 1 spread · 1 key map/figure at full res · CSV row of the shared metric. Plus the framework diagram once.

## C · GCAP — 5 action plans across South Asia

Question (draft): *does a method built for Indian cities travel?*

| # | chapter | plates |
|---|---|---|
| open | — | **series strip**: 5 covers/maps in geographic order |
| 00 | context | one regional map: the 5 cities located |
| 01 | what changed | text on how the method adapted per country; **stat row** |
| 02 | one city, deep | the strongest plan: map + spread |
| 03 | the set | **chart plate**: 5-city comparison on one shared metric |
| outcome | built / recognised / next | 5 PDF links |

Prep per plan: same as B. Plus one regional locator (can be drawn by us).

## Homepage

Seven cards today; these make nine (city-climate becomes B, A and C are new). The asymmetric
12-col composition in `src/index.njk` needs re-balancing for two more cards — do this when the
first of the three lands, not before. Thumbs: A = chart or spread; B/C = a cover or the strip's
first city, `thumbfit: contain` if portrait.

## Order

A first (single book, tests chart plates and stat rows), then B (tests series strip + deep city),
then C (reuses everything). One commit + push per project, confirm before push.

## Not in scope

- Plate zoom for the ward maps — decide at B (see TODOS.md).
- Malaysia GCAP / U20 / Climate Dialogues — one line in C's body if at all (CURATION.md).
