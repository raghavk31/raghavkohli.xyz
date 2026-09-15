# One is to One — construction technology page

New project page `/work/one-is-to-one/` + a ninth card on the index. Same chapter template as
`/work/living-heritage/` (`docs/plans/2026-09-13-project-page.md`). Small template/CSS/JS extensions (see tasks T3–T5).

Source: `images/CEPT/Construction Technology- One is to One/` — `CT_00.png` (cover), `CT_01.jpg`
(exploded axo), `1.jpg … 13.jpg` (build photos, in order). `Brick/` subfolder is out of scope.

## What the images are

| file | px | ratio | what |
|---|---|---|---|
| CT_00.png | 1205×1305 | 0.923 | illustrated axo of the finished tower in its grove — cream ground, no white margin |
| CT_01.jpg | 1240×1748 | 0.709 | exploded axo, the five material systems labelled: bamboo, concrete, metal, brick, wood — large white margins |
| 1 | 1201×1600 (trimmed) | 0.75 | tools laid out on the bench |
| 2 | 1600×1200 | 1.33 | bamboo poles being prepared in the workshop |
| 3 | 1600×1200 | 1.33 | metal chop saw, sparks |
| 4 | 900×1600 | 0.56 | foundation trench, brick and rebar |
| 5 | 1600×1200 | 1.33 | brick footing laid at night |
| 6 | 1600×900 | 1.78 | digging the trench under the trees |
| 7 | 1600×1200 | 1.33 | the bamboo roof frame carried overhead |
| 8 | 1600×1600 | 1.0 | scaffolded structure, brick walls rising |
| 9 | 1600×1200 | 1.33 | brick walls at night, work lights |
| 10 | 1600×1063 | 1.5 | bamboo roof joint, lashed |
| 11 | 1600×1578 | 1.01 | brick gable with bamboo roof [confirm: same structure or another group's?] |
| 12 | 1298×1600 | 0.81 | pavilion under the tree [confirm] |
| 13 | 1497×1600 | 0.94 | the tower, finished — tile roof, window (matches CT_00) |

**All thirteen photos are pasted onto 2000×2000 white squares.** The photo occupies ~1600px on
its long edge; the rest is white. `prep-images.py` has no trim step, so today it would ship
every plate with a white border inside the `--paper-2` ground.

## Facts to confirm (do not ship as-is)

- Studio and semester: CEPT, construction technology — Sem 01 `03_Construction and Structure`
  or Sem 02 `01_Construction & Structure II`? [confirm]
- Year: 2017 or 2018 [confirm]
- Site: CEPT campus, Ahmedabad? [confirm]
- Team: group build — how many students; Raghav's role in it [confirm]
- Whether 11 and 12 are the same structure as 13 [confirm]
- Recognition / outcome, if any [confirm]

## Direction (approved mockup C, 2026-09-15)

`~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/one-is-to-one-20260915/` — real site CSS,
real trimmed images, built from a scratch copy of `src/`. `variant-C.png` is the approved
chapter rhythm; `opening.png`, `closing.png`, `phone.png`, `index-card.png` are the rest of the
page. Board: `design-board.html`. Rejected: A (text alone + full-width three-photo strip,
three times in a row: the text column is orphaned and the rhythm is monotonous), B (hero +
full-width two-photo strip: the supporting photos come out as big as the hero, hierarchy flattens).

**Rule for the process chapters (01–03):** one hero photo beside the text in the 6-column
plates column, and the two supporting photos as a small justified strip *under the hero, in
the same column*. Text and hero alternate sides chapter to chapter. Every chapter has one
photo that matters and two that support it.

The user's bar: "it needs to be a beautiful experience for the user to browse through this
project." Browsing = the existing lightbox (`main.js initLightbox`): any plate or strip image
opens the page's fifteen images as a carousel, in page order, with captions, keys and swipe.
One small change (decision 3A): strip items take their own `cap`. The strip macro writes it
as `data-cap` on the `.strip > div`; `captionFor` (`main.js:438`) prefers `data-cap` on the
image's strip cell over the shared figcaption text, and falls back to the shared caption
when there is none (living heritage's strip keeps working unchanged). The page shows the
shared caption; the carousel shows the per-photo one. `alt` on each item = the per-photo cap.

States (Pass 2):

| feature | loading | error | success | partial |
|---|---|---|---|---|
| opening plate | `--paper-2` box at exact size (`w`/`h`); eager + `fetchpriority="high"` — it is the LCP element (decision 4A) | paper box + fig label | render at natural ratio | — |
| chapter plates | paper box, lazy | paper box + caption | image + fig + caption | — |
| column strips | paper boxes at `--ar` | box keeps its width | two photos, one height | one of two fails: row height holds |
| lightbox | `src` swap fades out then in on `load` (decision 4A) | alt text | slide + fig.NN + per-photo caption + "NN / 15" | — |
| index card 09 | `--stripe` ground | `img` removed, stripe shows | render, `contain`, nothing cropped | — |
| no-JS | lightbox never attaches; `.reveal` visible; strips are plain rows | | | |
| reduced motion | global rule (`main.css:375`): reveals and fades become cuts | | | |

## Chapter map

| # | chapter | text | plates (mockup file numbers = photo NN−1; final numbering per Image rules below) |
|---|---|---|---|
| open | — | — | 00 render, full width, natural ratio (1108×1200) |
| 00 | systems | five materials, one structure — what the drawing had to reconcile | 01 exploded axo, trimmed (992×1301), text left |
| 01 | tools | the bench before the site | hero 02 (tools, 0.75) · column strip 03 · 04 |
| 02 | ground | foundation first | `side: left` · hero 07 (digging, 1.78) · column strip 05 (0.56) · 06 |
| 03 | raise | walls, then the roof over our heads | hero 08 (roof carried, 1.33) · column strip 09 · 10 |
| 04 | joint | where bamboo meets bamboo — the detail the drawing could not specify | **coda** (`narrow: true` + text → `.chap--coda`): text across 8 cols, 11 alone at 10 cols (~800px). Decision 1A: the answer to the research question is the second-largest image on the page. |
| 05 | across the site | (no text) | `narrow: true`, pair 12 · 13 — the second structure (brick plinth, bamboo gable). One caption line from Raghav on what it is [confirm]. Decision 2A. |
| 06 | built | (no text) | `narrow: true`, 14 alone at 10 cols — the tower, finished. Caption ends "compare fig.01". The page closes the loop the opening plate started. |
| outcome | — | built / next | — |

Template change (small): a chapter's `strip` currently renders full width under both
columns. Add `col: true` on the strip to render it inside `.chap__pl` after the plates
(`{% if c.strip and c.strip.col %}` inside the `chap__pl` block; the full-width branch
gets `and not c.strip.col`); the strip figure gets class `strip--col`. Mockup C used a `pair`
for the supporting photos, which is uneven when the two ratios differ (chapter 02: 0.56 beside
1.33); the justified strip fixes that.

## Responsive + accessibility (Pass 6)

- **≤820px, `col` strips stack (decision 7A):** `.strip--col .strip{display:grid;gap:12px;
  overflow:visible;margin-inline:0;padding-inline:0}` and `.strip--col .strip > div{height:auto}`,
  `.strip--col .strip img{width:100%}`. The two-photo scroll row was wrong at phone width
  (chapter 02: 84px + 200px in a 342px column, no scroll, a hole; 01/03 scrolled by one finger).
  Full-width strips (living heritage's four photos) keep the 150px scroll row.
- Phone order per process chapter: eyebrow, title, text, hero, two stacked photos. `pair` in
  05 stacks (existing rule); coda chapters are already single column.
- Index card 09 at ≤900px: 4/3 frame, `contain`, stripe bars at the sides, same as living
  heritage's card. Accepted.
- Keyboard / screen reader: every plate and strip cell is already `role="button"` + `tabindex`
  with "open image N of 15"; the lightbox traps focus, returns it on close, Esc/arrows work
  (`main.js`). Strip items get `alt` = their per-photo `cap` (3A). The opening plate's `alt` is
  its caption. Captions are 12.5px `--faint` on `--paper` (existing site rule; body text is
  17px).
- Touch: strip cells are ≥150px on the phone after 7A (full width); lightbox halves tap to
  step. Reduced motion: reveals, the lightbox fade (4A) and any crossfade become cuts.

## Design system notes (Pass 5)

- No DESIGN.md (TODOS.md debt). Calibrated against `main.css` + `docs/plans/2026-09-13-project-page.md`.
- Reused: `plate`, `strip`, `pair`, `narrow`/`.chap--coda`, `(outcome)`, `thumbfit: contain`,
  `--stripe` card ground, `--paper-2` plate ground, mono fig labels, the lightbox.
- New, all extensions of existing vocabulary: `strip.col` (placement only), per-item `cap` on
  strip items (`data-cap`), and `blend: true` on a plate → `.plate--blend img{mix-blend-mode:
  multiply}` (decision 6A) so a black-on-white line drawing sits on the paper instead of in a
  white box. Trim rule: photos to 0px; drawings (`00`, `01` here) keep a ~3% margin so the ink
  never touches the edge. Reusable for water urbanism / generative techniques later.
- Mode (Pass 4): EXPERIENCE. No hard rejections; the `(NN) name` eyebrows and cream + Fraunces
  are the site's stated system, not defaults.

## Draft frontmatter + copy (placeholder voice; every fact [confirm])

Mocked in full at `scratchpad/mock/src/projects/9-one-is-to-one-c.md`; the shape below is what ships.

```yaml
title: one is to one
subtitle: Five materials, drawn as layers and built as joints.
question: what does a drawing not know until it has to stand up?
desc: cept · construction technology
topics: [studio]
qsize: 22px
fig: fig.01 — the tower, drawn
role: student builder · drawing and site          # [confirm]
period: 2018                                       # [confirm]
context: cept campus · ahmedabad · five materials  # [confirm]
status: built
live: false
date: 2018-04-01                                   # [confirm]
thumb: /assets/projects/one-is-to-one/00.jpg
thumbfit: contain
lead: A one-to-one studio at CEPT — a small tower drawn in five material systems and then
  built by the people who drew it. The drawing named bamboo, concrete, metal, brick and wood
  as if they were interchangeable layers. The site disagreed at every joint.
next: living heritage — embedded participatory method   # PLACEHOLDER — routing deferred (issue 8), decide before push
open: { src: …/00.jpg, w: 1108, h: 1200, fig: fig.01, cap: "The tower, drawn — brick base, timber floor, bamboo roof frame, tile. Sited in the grove behind the workshop." }
chapters:
  - { n: "00", name: systems, title: Five materials, one structure,
      plates: [ { src: …/01.jpg, w: 992, h: 1301, fig: fig.02, blend: true, cap: "Exploded axonometric — the five systems pulled apart. Concrete holds the ground, brick makes the room, wood makes the floor, metal ties the parts, bamboo carries the roof. Every seam between two of them is a joint someone had to make." } ] }
  - { n: "01", name: tools, title: The bench before the site,
      plates: [ { src: …/02.jpg, w: 1201, h: 1600, fig: fig.03, cap: "The bench — every tool laid out and counted before the first cut. The studio began with an inventory, not a site." } ],
      strip: { col: true, fig: fig.04–05, cap: "Bamboo poles cleaned and sized; the chop saw for the steel.",
               items: [ { src: …/03.jpg, w: 1600, h: 1200, cap: "Bamboo poles cleaned and cut to one length on the workshop floor." },
                        { src: …/04.jpg, w: 1600, h: 1201, cap: "Steel sections sized on the chop saw — the metal that ties the parts." } ] } }
  - { n: "02", name: ground, title: "Nothing to argue about until the ground was settled", side: left,
      plates: [ { src: …/07.jpg, w: 1600, h: 900, fig: fig.06, cap: "The trench under the trees — the first meeting: concrete to earth, and the line the brick would have to sit on." } ],
      strip: { col: true, fig: fig.07–08, cap: "Rebar and the first bricks in the trench; the footing laid after dark.",
               items: [ { src: …/05.jpg, w: 900, h: 1600, cap: "Rebar and the first bricks in the trench — concrete meets brick at the footing." },
                        { src: …/06.jpg, w: 1600, h: 1202, cap: "The footing laid after dark; the pour would not wait for morning." } ] } }
  - { n: "03", name: raise, title: "Walls, then the roof over our heads",
      plates: [ { src: …/08.jpg, w: 1600, h: 1201, fig: fig.09, cap: "The bamboo roof frame, made flat on the ground and carried in whole — the drawing showed it arriving, not how." } ],
      strip: { col: true, fig: fig.10–11, cap: "The brick walls rising inside the scaffold; the last courses under work lights.",
               items: [ { src: …/09.jpg, w: 1600, h: 1600, cap: "Brick walls rising inside the scaffold — the wall head where brick would have to meet bamboo." },
                        { src: …/10.jpg, w: 1600, h: 1202, cap: "The last courses under work lights." } ] } }
  - { n: "04", name: joint, title: Where bamboo meets bamboo, narrow: true,   # coda (1A)
      plates: [ { src: …/11.jpg, w: 1600, h: 1063, fig: fig.12, cap: "The roof joint — bamboo to bamboo, lashed, not bolted. The third meeting, and the one the drawing could not specify." } ] }
  - { n: "05", name: across the site, narrow: true,                                # 2A
      pair:   [ { src: …/12.jpg, w: 1600, h: 1578, fig: fig.13, cap: "[confirm] The second structure — brick plinth, bamboo gable …" },
                { src: …/13.jpg, w: 1298, h: 1600, fig: fig.14, cap: "[confirm] … under construction: bamboo posts on the plinth, before the roof." } ] }
  - { n: "06", name: built, narrow: true,
      plates: [ { src: …/14.jpg, w: 1497, h: 1600, fig: fig.15, cap: "The tower, finished — tile roof, timber window, brick to the sill. Compare fig.01." } ] }
outcome:
  built: "A two-storey tower of brick, wood, bamboo, metal and concrete, built to the drawing by its authors on the CEPT campus."  # [confirm]
  next: "Draw the joints first. Start the next drawing from the ten places where five materials meet, and let the form follow."  # [confirm]
```

Body (draft, one short paragraph per chapter; 05 and 06 have none). Decision 5A: every
chapter lands on a material meeting so the thread from the question to the joint never drops.
All placeholder voice, all [confirm]:

- **00 systems** — the brief: one small building in five material systems, drawn to be built.
  On paper the systems stack: *concrete holds the ground, brick makes the room, wood makes the
  floor, metal ties the parts, bamboo carries the roof.* The exploded drawing made that reading
  easy. It also hid the whole problem: five materials meet in ten possible pairs, and the drawing
  had nothing to say about any of the meetings.
- **01 tools** — the studio began on the bench, not the site. Tools counted, bamboo cut to a
  common length, steel sized on the chop saw. The first thing a 1:1 studio teaches is how long
  everything takes; the second is that every material arrives with its own tolerances.
- **02 ground** *(title: Nothing to argue about until the ground was settled)* — concrete
  first: a trench under the trees, rebar in it, the first bricks bedded after dark. The first
  meeting was concrete to brick at the footing, and it set the line every course above would
  have to keep.
- **03 raise** — walls up inside a scaffold a course at a time. The bamboo roof frame made flat
  on the ground and carried in whole, over our heads, by everyone at once. The drawing had shown
  it arriving; it had not said how, and it had not drawn the wall head where brick would take
  the bamboo.
- **04 joint** — where the drawing ran out. Bamboo does not take a bolt cleanly and does not sit
  flat on brick; it wanted lashing, packing, a tolerance the plan had not allowed. Resolved on the
  roof by hand, then drawn afterwards so the next group would know.

## Index card (decision 9A)

Ninth card, `09`, left-set: `{{ card(oto, "09", "2 / 7", 40, "0.923", 30, 3) }}`. Frame ratio
matches the render (1108×1200 → 0.923) so nothing is cropped or padded on desktop;
`thumbfit: contain` guards the ≤900px 4/3 frame (stripe bars at the sides, as living heritage).
Alone on the last row by arithmetic (nine cards in a zigzag of pairs); left-set continues the
zig and reads as a colophon, not an orphan. Hover panels verified at 1440 and 1280: 08's flips
left into the gap of the row above, 09's opens right into empty space. `topics: [studio]` —
a one-card chip, like `transit` and `energy` today.

Header nav says "08 projects · 2018—now" (`base.njk:19`) — becomes "09 projects"; the year
range depends on the confirmed period.

## Image rules (implementation)

- **Pick order = page order = fig number.** `images/_picks/one-is-to-one/NN-…` in the order the
  chapter map reads (00 cover, 01 exploded, 02 tools, 03 bamboo, 04 chop saw, 05 digging, 06 trench,
  07 footing, 08 roof carried, 09 walls, 10 night walls, 11 joint, 12 gable, 13 gable build, 14 tower).
  `prep-images.py` then emits `NN.jpg` with `w`/`h`; fig.NN+1 = file NN, as on living heritage.
  The mockup's file numbers (photo NN−1) are superseded by this.
- **Trim hint** `-trim-` in the pick name: crop a border row/column only while ≥99% of its
  pixels are ≥243 in every channel; photos to 0px, drawings (`-trim3-`) keep a 3% margin.
  After trimming a 2000² photo the long edge must land in 1550–1650px, else the script prints
  the name and refuses (a sky edge over-trimmed). `00` is a PNG: composited on white → JPG.
- `blend: true` on plate `01` (multiply); `open` plate eager + `fetchpriority="high"`.

## NOT in scope

- A page-level "next/prev image" affordance outside the lightbox — the carousel is the browse.
- Zoom-on-hover or parallax on plates — the site has one authored motion (reveal) and keeps it.
- A DESIGN.md — still TODOS.md debt; this review calibrated against `main.css`.
- Retitling the site's `(NN) name` eyebrow system or the cream/serif look — settled two reviews ago.
- The `Brick/` subfolder (CT_02–CT_15) — Raghav's instruction: 1–13 + CT_01 only.
- A dedicated "compare drawn vs built" side-by-side plate — the opening render and the closing
  tower already frame the loop; a third composite would repeat the mood.

## What already exists (reuse)

`project.njk` chapter template (`plate`, `strip`, `pair`, `narrow`/coda, `(outcome)`),
`main.css` plate/strip/coda/mobile rules, `main.js` lightbox (keys, swipe, focus, prefetch),
`prep-images.py` (size hints, `natural`, `resolve`), index `card()` macro with `thumbfit`,
`--stripe`/`--paper-2` grounds, the `(label)` vocabulary. Living heritage is the worked example.

## Implementation Tasks
Synthesized from this review's findings. Each task derives from a specific finding above.
Run with Claude Code or Codex; checkbox as you ship.

- [ ] **T1 (P1, human: ~1h / CC: ~10min)** — `scripts/prep-images.py` — add `trim` / `trim3` hints with the ≥99%/≥243 rule and the 1550–1650 long-edge check; PNG cover composited on white
  - Surfaced by: Pre-review audit — thirteen photos on 2000² white squares; Pass 5 6A — drawings keep a 3% margin
  - Files: `scripts/prep-images.py`
  - Verify: run on the pick folder; every photo's long edge 1550–1650; `01.jpg` has a visible margin
- [ ] **T2 (P1, human: ~30min / CC: ~5min)** — pick folder — `images/_picks/one-is-to-one/` in page order (00 cover … 14 tower) with hints; run the script; paste YAML
  - Surfaced by: Image rules — pick order = page order = fig
  - Files: `images/_picks/one-is-to-one/*`, `src/assets/projects/one-is-to-one/*`
  - Verify: 15 files 00–14; `w`/`h` match the plan's ratios
- [ ] **T3 (P1, human: ~1h / CC: ~10min)** — `project.njk` — `strip.col` (in-column strip, class `strip--col`), per-item `cap` → `data-cap` + `alt`, `blend` → `plate--blend`, `open` plate eager + `fetchpriority="high"`
  - Surfaced by: Direction (C); Pass 2 3A, 4A; Pass 5 6A
  - Files: `src/_includes/project.njk`
  - Verify: living heritage renders byte-identical except the eager attribute on its open plate
- [ ] **T4 (P1, human: ~30min / CC: ~5min)** — `main.css` — `.plate--blend img{mix-blend-mode:multiply}`; ≤820px `.strip--col` stacks full width
  - Surfaced by: Pass 5 6A; Pass 6 7A
  - Files: `src/assets/css/main.css`
  - Verify: 390px screenshot of chapters 01–03: hero, then two full-width photos; living heritage strip still scrolls
- [ ] **T5 (P1, human: ~40min / CC: ~5min)** — `main.js` — `captionFor` prefers `data-cap` on the strip cell; `.lb__img` fades out on `src` swap and in on `load` (respecting reduced motion)
  - Surfaced by: Pass 2 3A, 4A
  - Files: `src/assets/js/main.js`
  - Verify: open the carousel on fig.04 and fig.05 — different captions; step with a throttled network — no blank stage
- [ ] **T6 (P1, human: ~2h / CC: ~15min)** — `src/projects/8-one-is-to-one.md` — frontmatter + body per the plan (chapters 00–06, coda 04, pair 05, tower 06, outcome), all `[confirm]` markers kept
  - Surfaced by: Pass 1 1A, 2A; Pass 3 5A
  - Files: `src/projects/8-one-is-to-one.md`
  - Verify: `npx @11ty/eleventy`; `/work/one-is-to-one/` matches `variant-C.png` for 01–03, coda at 04, tower last
- [ ] **T7 (P1, human: ~20min / CC: ~3min)** — `index.njk` + `base.njk` — card 09 at `2 / 7`, drop 40, ratio 0.923; nav count "09 projects"
  - Surfaced by: Pass 7 9A; Index card section
  - Files: `src/index.njk`, `src/_includes/base.njk`
  - Verify: 1440 and 1280 hover on 08 and 09; 390px card shows the whole render
- [ ] **T8 (P2, human: ~20min / CC: ~5min)** — QA — desktop + 390px screenshots of the page and the card; lightbox on every plate; keyboard walk; one commit; ask before push
  - Surfaced by: Pass 6; memory: push = prod deploy
  - Files: —
  - Verify: screenshots attached to the commit message or this plan
- [ ] **T9 (P1, human: ~15min / CC: —)** — Raghav — facts: semester, year, site, role, what photos 12/13 (gable) are, recognition; routing (`next:`), the caption for chapter 05
  - Surfaced by: Facts to confirm; Pass 7 unresolved
  - Files: `src/projects/8-one-is-to-one.md`
  - Verify: no `[confirm]` left in the file before push

_No new tasks from Pass 4 (AI slop)._

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|---|---|---|---|
| chapters 01–03 | ~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/one-is-to-one-20260915/variant-C.png | hero beside text + two supporting photos under it in the plates column | supporting photos become a justified in-column strip (`col: true`), not a pair; stack on the phone (7A) |
| opening | …/one-is-to-one-20260915/opening.png | question → meta → lead → render full width → 00 exploded axo beside text | exploded axo gets `blend: true` (6A); open plate eager (4A) |
| closing | …/one-is-to-one-20260915/closing.png | superseded: 04 becomes a coda, 05 = pair (second build), 06 = tower alone (1A, 2A) | not re-rendered by choice; verify on the real page in T8 |
| phone | …/one-is-to-one-20260915/phone.png | single column 00–02 | strips stack full width below the hero (7A) |
| index card 09 | …/one-is-to-one-20260915/index-card.png | left-set `2 / 7`, ratio 0.923 | drop 40 not 90 (9A) |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Outside Review | Claude subagent via `/plan-design-review` (Codex CLI unavailable: model refused by ChatGPT account) | Independent 2nd opinion | 1 | issues_found (subagent-only) | 10 findings; 8 absorbed into passes 1–7, 2 accepted as-is |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score: 4/10 → 8/10, 8 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** design-outside-voices, phase plan-design-review: Codex CLI present but every model id refused for this account (CLI too old for gpt-5.5); native Claude subagent completed. Single-model coverage; no cross-model consensus claimed.
- **VERDICT:** DESIGN reviewed (8/10, three facts open); eng review required.

**UNRESOLVED DECISIONS:**
- `next:` routing for this page and the page pointing at it — deferred by Raghav ("we'll figure out routing at the end"); logged in TODOS.md; placeholder label "living heritage" in the frontmatter until decided.
- What photos 12/13 (the brick-plinth gable) are — another group's build, an earlier exercise, or a second structure by the same team; chapter 05's eyebrow and caption depend on it.
- Studio, year, site, role, recognition — all `[confirm]`; the meta row, `date:`, and the nav year range cannot ship without them.
