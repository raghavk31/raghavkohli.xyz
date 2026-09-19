# Homepage grid — from hand-placed to one rule

*Plan, 2026-09-19. Brief from Raghav: keep the white space and the hover effect; fix the random-feeling placement of the project cards; keep the design philosophy.*

## Where it stands

Seventeen cards on an invisible 12-column grid, each placed by hand in `src/index.njk` — a
`grid-column` span, a `--cmt` offset (0–160 px), a `--car` frame ratio taken from its cover
image. The composition was authored once for seven cards and extended by appending; it now
reads as scattered. What works and stays: the white space (`--gutter`, 40 px column gap,
60–140 px row gap), the hover reveals (frosted glass + research question, floating meta panel,
strip of covers), the rotating covers, the `(label)` mono register, Fraunces headings, the
numbering, the plan's order (books → participatory → computational → early).

## Direction — approved (D16, supersedes D2): D · rows by relevance, hover scrim

Mockups built on the real CSS with the real cards (`_site/mock-A|B|C|D.html`, screenshots in
`~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/homepage-grid-20260919/`):

- **A** bands with a 7-column anchor — strongest hierarchy, ragged rows.
- **B** two strict columns, right column 140px lower — approved first (D2), then superseded:
  it fixed rhythm but not hierarchy, and its two tight columns left no room for the floating
  meta panel (`.card__meta` lands on the neighbour).
- **C** three columns, square frames — calm, but cropped the drawings.
- **D — approved (D16).** Raghav's direction: each card's width is its **weight** —
  1 = two per row (6 cols), 2 = three per row (4 cols), 3 = four per row (3 cols); rows pack
  greedily to 12 within each group, top-aligned, short last rows allowed. On hover a **scrim**
  fades every other card to the paper (opacity .14, saturate .4) and the group breaks to .25, so
  the meta panel floats beside the card again over nothing that matters. **Filtering by a chip
  re-weights** every card by its relevance to the tag — position in the page's ordered
  `topics:` list: first = 1, later = 2, absent = 3 and receded — and repacks with the existing
  FLIP animation; group breaks hide while filtering (D5).
- **D17 · weights — approved A.** 1: gcap, ahmedabad, state of cities, urban greening policy,
  koliwadas, living heritage, generative techniques. 2: vadodara, surat, rebel bodies, one is to
  one, water urbanism, eco-machine, utopias. 3: urban performances, majuli, pune metro. Stored as
  `weight:` in each page's frontmatter (default 2).

Carried over unchanged: D3 tagline line, D4 groups, D5 chips, D6 no-covers state, D7 (now)
statement, D8 portrait frames 4:5 contained, D9 no card reveal, D10 group breaks, D11–D13
responsive and a11y (the scrim also fires on `:focus-within`), D14 all 17 cards. Dropped: the
140px stagger. The floating meta panel keeps its side-flip logic; its text gets a paper ground.

## Decisions

### Pass 1 — information architecture (6 → 9)

- **D3 · first-screen orientation — approved A.** One serif line under `(selected work)`: the
  tagline *making invisible urban systems visible, legible, and participatory* in Fraunces,
  ~28px, max-width 18em, the same register as the about quote. It later hosts the (now)
  research-direction line beneath it. The hidden `<h1>` stays as the document title.
- **D4 · group labels — approved A (by method).** `(plans & policy)` · `(participatory)` ·
  `(computational & spatial)` · `(early work)`. Membership: plans & policy = gcap, ahmedabad,
  vadodara, surat, state of cities, urban greening policy; participatory = koliwadas, living
  heritage, rebel bodies, urban performances; computational & spatial = generative techniques,
  one is to one, water urbanism, eco-machine; early work = utopias, majuli, pune metro.
  Numbering continues 01–17 across groups.
- **D5 · chips vs. groups — approved A.** Chips stay as the topic filter but move to the right
  of the tagline line, one size smaller; groups are the primary structure. The filtered state
  keeps its current behaviour (grid flips to flex, matches float up), group breaks hide while a
  chip is active.

### Pass 2 — interaction states (8 → 10)

| card state | what the reader sees |
|---|---|
| loading | `--stripe` ground in the frame until the lazy image lands; caption already in place |
| image 404 | thumb removes itself; ground + fig label remain (existing `onerror`) |
| no JS | thumb only, no rotation, no reveal animation |
| reduced motion | strip works on hover; nothing rotates; no fig-label fade |
| touch (hover:none) | overlay static and visible; no meta panel, no strip |
| filter active | grid flips to flex, matches float up and grow, others recede at .38; **group breaks hidden** (D5) |
| **no covers** | **D6 · approved A** — no strip rendered at all; `eleventy` build prints `card <title> has no covers` so it cannot ship unnoticed. The lettered placeholder squares are removed from the macro. |

### Pass 3 — journey (7 → 9)

| step | reader does | reader feels | specified by |
|---|---|---|---|
| 0–5 s | lands: tagline line + gcap / ahmedabad | an urbanist who measures | D3; order |
| 5–30 s | scans band one, hovers a card | the question, then the covers | glass, meta, strip (kept) |
| 30 s–2 min | scrolls the four bands | there is a method to this | D4 labels; B stagger |
| 2–4 min | reaches the about block | wants the person and the direction | **D7** |
| after | index rows, contact | there is more | rows (done); footer links out of scope |
| return | remembers the rotating covers, the numbering | recognisable | rotation (kept) |

- **D7 · about block — approved A.** The about quote becomes the **(now) statement**: the
  current research question in the same big serif — drafted from the pages (one question,
  escalating instruments; urban analytics and sama as what comes next), to be edited once
  Raghav sends the sama paragraph. Body paragraph and CV stay. The tagline therefore appears
  once, at the top (D3). Contact links stay as they are (placeholder social links are tracked in
  site-open-items, not this plan).

### Pass 4 — slop risk (7 → 9) · mode: EXPERIENCE

Hard rejections: none after D7. Litmus: brand in first screen YES (D3); one visual anchor NO
(accepted — a composed pair, not a hero); scannable by headlines YES (D4); one job per section
YES; cards necessary YES (the card is the interaction); motion improves hierarchy: covers YES,
scroll-reveal NO (D9); premium without shadows YES. Calibration: the cream / serif / mono
family is the stated philosophy — noted, not changed. The 1.04 image zoom on hover is a listed
detector tell; it is part of the hover the brief keeps.

- **D8 · portrait frames — approved A.** Portrait covers sit in a **4:5 frame with the image
  contained** on the `--stripe` ground (the site's idiom for drawings); landscape covers keep
  their native ratio. Nothing is cropped; column heights stay within a band so the 140px stagger
  reads. Rotating alternates for portrait cards are re-cropped by `prep-covers.py` to 4:5.
- **D9 · scroll reveal — approved A.** `.reveal` comes off the cards; it stays on the section
  heads only. The rotating covers are the page's one authored motion.

### Pass 5 — system alignment (6 → 9)

No `DESIGN.md` (debt already in TODOS.md — not re-raised). Tokens this plan commits to, all
existing: `--line`, `--stripe`, `--faint`, `--mono` 11.5px `(label)`, Fraunces display, the 12-col
grid with 40px column gap, row gap `clamp(60px, 9vw, 140px)`.

- **D10 · group break — approved A.** A new component in the existing vocabulary: a 1px
  `--line` rule spanning all 12 columns; the mono `(label)` 12px below it, left-aligned; 110px
  above the rule, 48px below the label. Hidden while a filter chip is active (D5). No count.

### Pass 6 — responsive & accessibility (5 → 9)

| viewport | layout |
|---|---|
| ≥ 1200 | two columns (1/7, 7/13), right column `--cmt: 140px`; group break spans 12; tagline line max 18em; chips right of the tagline |
| 900–1200 | same two columns; chips wrap under the tagline; stagger 100px |
| ≤ 900 | one column, no stagger; **D11 · approved A** — frames follow the D8 rule (landscape native, portrait 4:5 contained), the 4:3 override goes; overlay static as today; group breaks stay (rule + label), 72px above; tagline 22px |

- **D12 · keyboard — approved A.** `.card__click:focus-visible` (and `:focus-within`) triggers
  the same reveal as hover: glass + question, meta panel, covers strip. Strip squares get
  `tabindex="0"` and respond to focus like mouseenter, so a keyboard user can pick a cover.
  The reveal persists while focus is inside the card.
- **D13 · touch targets — approved A.** Chips and the reset control get `padding-block: 16px`
  at ≤ 900px (≥ 44px hit area); text size unchanged.
- Screen readers: alternates keep `alt=""`; the thumb keeps the title; the strip is `aria-hidden`
  on touch where it is not rendered. Reduced motion: no rotation, no reveal (D9), no fig fade.

### Pass 7 — remaining decisions

- **D14 · card count — approved B.** All 17 stay as cards for now; the three thinnest (pune
  metro, majuli, urban performances) can move to index rows later in one edit.
- The (now) statement ships as a draft for Raghav to edit (D7); not a design decision.

## Not in scope

- Footer placeholder social links and the Node 20 deploy warning — site-open-items.
- `DESIGN.md` — TODOS.md debt; this plan adds the tokens it uses to that list.
- The project pages, the lightbox and the state-of-cities carousel — unchanged.
- Rewriting the about body paragraph — copy, later.

## What already exists and is reused

The 12-column grid and its gaps; the card macro (frame, glass overlay, meta panel, strip,
rotating covers, `thumbfit: contain`); the `(label)` mono register and `--line` hairlines
(index rows, outcome block); the chip filter and its flex reflow; `:focus-visible` ring;
reduced-motion rules; `prep-covers.py` frame-ratio crops.

## Implementation Tasks
Synthesized from this review's findings. Each task derives from a specific finding above.
Run with Claude Code; checkbox as you ship.

- [x] **T (P1, human: ~3h / CC: ~30min)** — `src/index.njk`, `src/projects/*.md` — Replace the hand-placed grid with the weight rule: `weight:` in each page's frontmatter (D17), a `groups` list in the template (D4), each card `grid-column: span 6|4|3` by weight, rows packed greedily to 12 within a group (a break before a card that would overflow), no `--cmt`; numbering continues 01–17.
  - Surfaced by: Direction (D16, D17) + Pass 1 (D4)
  - Files: `src/index.njk`, `src/projects/*.md`
  - Verify: build; `_site/index.html` lists 17 cards in D4 order with spans only 6/4/3; no row exceeds 12.
- [x] **T (P1, human: ~30min / CC: ~5min)** — group break component — 12-column hairline in `--line`, mono `(label)` 12px below, 110px above / 48px below; hidden while `.work__grid.filtering`.
  - Surfaced by: Pass 5 (D10), Pass 1 (D5)
  - Files: `src/index.njk`, `src/assets/css/main.css`
  - Verify: four breaks visible at 1440; click a chip → breaks hidden; reset → back.
- [x] **T (P1, human: ~30min / CC: ~5min)** — tagline line — Fraunces ~28px, max-width 18em, under `(selected work)`; chips move to its right, one size smaller (`.work__chip` 10.5px), wrapping under it at ≤1200px; the hidden `<h1>` stays.
  - Surfaced by: Pass 1 (D3, D5)
  - Files: `src/index.njk`, `src/assets/css/main.css`
  - Verify: screenshot at 1440 and 1024; first viewport shows the line + first two cards.
- [x] **T (P1, human: ~45min / CC: ~10min)** — frame rule — portrait covers get `--car: 0.8` and `class="contain"` on thumb and alternates (macro decides from `thumbw/thumbh`); landscape keep native `--car`; remove the ≤900px `aspect-ratio: 4/3` override; `prep-covers.py` COVERS ratios for portrait slugs → 0.8 and re-run for those slugs.
  - Surfaced by: Pass 4 (D8), Pass 6 (D11)
  - Files: `src/index.njk`, `src/assets/css/main.css`, `scripts/prep-covers.py`, `src/assets/projects/*/c*-f.jpg`
  - Verify: no cropped drawing at 1440 or 375; portrait frames all 4:5.
- [x] **T (P2, human: ~20min / CC: ~3min)** — no-covers state — macro renders no strip when `covers` is empty; `.eleventy.js` (or the macro) logs `card <title> has no covers` at build.
  - Surfaced by: Pass 2 (D6)
  - Files: `src/index.njk`, `.eleventy.js`
  - Verify: temporarily remove `covers:` from one page → no strip, warning in build log.
- [x] **T (P2, human: ~1h / CC: ~10min)** — (now) statement — the about quote becomes the current research question (draft from the pages; marked for Raghav's edit); tagline appears only at the top.
  - Surfaced by: Pass 3 (D7)
  - Files: `src/index.njk`
  - Verify: the tagline sentence occurs once in `_site/index.html`.
- [x] **T (P2, human: ~15min / CC: ~3min)** — remove `.reveal` from cards; keep it on section heads.
  - Surfaced by: Pass 4 (D9)
  - Files: `src/index.njk`, `src/assets/js/main.js` (no change needed if selector-driven)
  - Verify: cards visible immediately on scroll; heads still fade in once.
- [x] **T (P2, human: ~30min / CC: ~5min)** — keyboard reveal — `.card__click:focus-visible, .card__click:focus-within` trigger the hover rules; strip squares `tabindex="0"`, `focus` handled like `mouseenter` in `initCovers`.
  - Surfaced by: Pass 6 (D12)
  - Files: `src/assets/css/main.css`, `src/assets/js/main.js`, `src/index.njk`
  - Verify: Tab to a card → glass, question, meta and strip appear; Tab into strip → covers switch.
- [x] **T (P2, human: ~10min / CC: ~2min)** — chips and reset `padding-block: 16px` at ≤900px.
  - Surfaced by: Pass 6 (D13)
  - Files: `src/assets/css/main.css`
  - Verify: chip height ≥ 44px at 375.
- [x] **T (P1, human: ~30min / CC: ~10min)** — screenshot pass at 1440, 1024 and 375 before commit; compare against `mock-B2`; push only after Raghav's look.
  - Surfaced by: Pass 6 table
  - Files: none
  - Verify: three screenshots in `.gstack/browse-reports/`.

- [x] **T (P1, human: ~1h / CC: ~10min)** — hover scrim — `.work__grid:has(.card__click:hover, .card__click:focus-within) .card:not(:has(:hover, :focus-within)) { opacity:.14; filter:saturate(.4) }`, breaks to .25, hovered card `z-index` up, `.card__meta` text on a paper ground; off under `hover:none`; transitions .45s; reduced-motion instant.
  - Surfaced by: Direction (D16), Pass 6 (D12)
  - Files: `src/assets/css/main.css`
  - Verify: hover card 03 → all others faded, meta panel readable over the neighbour; Tab does the same.
- [x] **T (P1, human: ~3h / CC: ~30min)** — relevance filter — `main.js` filter: on chip, weight each card by the tag's index in `data-topics` (0 → 6 cols, 1+ → 4 cols, absent → 3 cols + `.match`-less recede), repack rows, FLIP as today; reset restores `weight:`; breaks hidden while filtering.
  - Surfaced by: Direction (D16), Pass 1 (D5)
  - Files: `src/assets/js/main.js`, `src/index.njk` (emit `data-weight`), `src/assets/css/main.css` (drop the flex `filtering` widths in favour of spans)
  - Verify: click #water → water urbanism and eco-machine two-per-row at the top, koliwadas three-per-row, the rest small and faded; reset → resting weights.

_No new tasks from Pass 7 (D14 keeps the status quo)._

## GSTACK REVIEW REPORT

| Runs | Status | Findings |
|---|---|---|
| /plan-design-review · 2026-09-19 · homepage grid | complete | 15 decisions made (D2–D17; D16 supersedes D2), 12 tasks, 1 TODO |

Scores (before → after): IA 6→9 · states 8→10 · journey 7→9 · slop risk 7→9 · system 6→9 ·
responsive & a11y 5→9. Mode: EXPERIENCE. Hard rejections: none after D7. Mockups: four
placement directions built on the real CSS (`_site/mock-A|B|C|D.html`), B approved then
superseded by D (`_site/mock-D.html`; hover-meta studies `mock-H1|H2|H3.html` moot under D; PNGs in
`~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/homepage-grid-20260919/`).
OUTSIDE COVERAGE: not run (gstack designer needs an OpenAI key; Codex unavailable on this
account) — single-model review.

VERDICT: ready to implement — T1–T12 above, then Raghav's look at 1440 / 375 before push.

NO UNRESOLVED DECISIONS
