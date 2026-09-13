# Project page redesign — "chapters"

Test case: `/work/living-heritage/`. Becomes the template for all seven `/work/*` pages.

## Problem

The detail page is body text → gallery → method list. The eleven plates are an appendix
to the argument instead of evidence beside it. Nothing is cropped any more, but the page
does not read as one project: the reader scrolls ~1400px of text before the first image,
the strongest drawing is last, sizes are ad hoc, and the method list repeats the H2s.

## Direction (approved mockup A)

`~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/project-page-20260913/A.html`
(render: `variant-A.png`). Real site CSS, real images.

1. **Opening plate.** After the lead paragraph, one full-width plate (living heritage: the axo,
   fig.11). Natural ratio, never cropped. Caption below.
2. **Chapters.** The page body becomes numbered chapters. Each chapter is one 12-column row:
   text in 5 columns, plates in 6, alternating sides per chapter. The text column is sticky
   (`top: 96px`) so the words stay in view while a tall plate scrolls.
   - Eyebrow: mono `(NN) name` with the number in `--accent` — this absorbs the `method`
     list, which is removed from the template.
   - H2: existing `.detail__body h2` type (Fraunces 500, clamp 1.4–2rem).
   - A chapter may also carry a full-width plate row under both columns (used for the
     four-photo fieldwork strip).
3. **One plate system.** `.plate`: image at its own ratio (`height:auto; object-fit:unset`),
   `--paper-2` ground while loading; `fig.NN` in mono 10.5px + caption in 12.5px `--faint`
   **below** the image, never overlaid. Pairs: `.pair` two-column grid. Strips: `.strip`
   justified flex row (`flex: <ar> 1 0%`) so every photo shares one height.
4. **Nothing cropped, anywhere.** Includes the homepage card (see Pass decisions).

## Living heritage chapter map

| # | chapter | text (from current body) | plates |
|---|---|---|---|
| open | — | — | 11 axo, full width |
| 00 | context | "The system nobody had mapped" | 01 evolution |
| 01 | embed | method-01 body, one paragraph | 02–05 fieldwork strip, full width |
| 02 | instrument | "Children as instrument" | 06 drawings |
| 03 | locate | jury quote + "few sites claimed by more than one group" | 09 perception map **stacked over** 10 strategy (D3: each at full 6-col width, not a pair) |
| 04 | co-design | "Designing into the overlap" + award line | 08 poster, 07 lego |

## Journey (Pass 3)

| step | reader does | feels | supported by |
|---|---|---|---|
| 0–5s | question + meta | a research question, not a thumbnail | `.detail__q`, meta (unchanged) |
| 5–15s | lead → opening plate | he can draw; this is a real place | opening plate |
| 15–60s | scans eyebrows `(00)…(04)` | there is a method | chapter eyebrows (method list removed) |
| 60–90s | wants the verdict | **(outcome) block** — D5 | see below |
| exit | next project | `(next)` unchanged | |

**`(outcome)` block** (D5): sits after the last chapter, before `(next)`. Same `(label)` /
value vocabulary as the meta row, three fields, all optional:
```yaml
outcome:
  built: "Play structures with micro-climate functions, sited only where boundaries overlapped."
  recognised: "CEPT Student Excellence Award — “identified pockets of potentiality and greater commonality.”"
  next: "Return with the same instrument five years on: did the pockets hold?"
```
The jury quote moves here from chapter 03 (03 keeps the one-line "few sites claimed by more
than one group"). The italic award sentence in the body is deleted.

## Frontmatter shape (proposal)

```yaml
open: { src: /assets/projects/<slug>/11.jpg, fig: fig.11, cap: "…" }
chapters:
  - { n: "00", name: context, title: "The system nobody had mapped", side: right,
      plates: [ { src: …/01.jpg, w: 1800, h: 1356, fig: fig.01, cap: "…" } ] }
  - { n: "01", name: embed, title: "Access before research",
      strip: { cap: "…", items: [ { src: …/02.jpg, w: 867, h: 736 }, … ] } }
  - { n: "02", name: instrument, title: "…", side: left, plates: [ … ] }
  - { n: "03", name: locate, title: "…", side: right, plates: [ …09, …10 ] }   # stacked (D3)
  - { n: "04", name: co-design, title: "…", side: left, pair: [ …08, …07 ] }
```
**Chapter text (D8):** stays in the markdown body. Each chapter starts with a heading
`## 03 locate` (number + name; the display title comes from frontmatter `title:`). An
Eleventy filter (`chapters`) splits the rendered body HTML on `<h2>` and matches the leading
two-digit number to `chapters[].n`. Text before the first numbered heading is dropped into
chapter 00. Pages whose body has no numbered headings render the legacy way, untouched.

**Homepage card (D9):** thumb becomes the axo (`00.jpg` regenerated from LH_08 at
≤1200px), card 05 ratio `--car: 1/1` in `src/index.njk:66`. The panel image leaves the
index; nothing on the site is cropped after this. A 1/1 frame is 25% taller than 5/4 on the
same 6-col span, so re-check the index composition at 1280 and 400 and re-tune `--cmt` on
cards 06/07 if they collide.

Backwards compatibility: pages without `chapters` (the other six, until curated) keep the
current body → gallery rendering. `prep-images.py` emits `w:`/`h:` per item (D4); `ar:` is retired.

## States (Pass 2)

| feature | loading | empty | error | success |
|---|---|---|---|---|
| plate | `<img width height>` from frontmatter (`w:`/`h:` emitted by `prep-images.py`) reserves exact space; `--paper-2` ground shows in the box. Zero layout shift. (D4) | chapter with no plates → text runs full 12 cols, no empty plate column | broken `src` → the `--paper-2` box stays with the fig label under it, so the gap is legible, not blank; `alt` = caption | image at natural ratio |
| strip | same; flex ratio derived from `w/h`, `ar:` field retired | strip with one item → renders as a single plate | — | one shared height |
| chapter text | — | chapter with plates but no text → plates take 12 cols (image-only beat allowed) | — | — |
| sticky text | text column taller than `100vh - 96px` → `position: static` for that chapter (template adds `.chap--long` when body > ~1400 chars; CSS also caps with `max-height` guard) | — | — | — |
| reveal | `.reveal` fade applies per chapter row, not per plate, so a chapter appears as one unit | — | no-JS: content visible (already fixed, F6) | — |

## What already exists (reuse, don't reinvent)

- Type + tokens in `src/assets/css/main.css`: `--serif` Fraunces display, `--sans` Geist body,
  `--mono` eyebrows, `(parenthetical)` labels, `--accent` slate blue, `--stripe`/`--paper-2`
  image grounds, `.detail__*` head block (question, meta, lead) — unchanged.
- Gallery mechanics shipped this week: `fit: natural`, `row:` justified strip with `ar`,
  `break: true`. The chapter template generalises these; `.gallery` stays for legacy pages.
- `scripts/prep-images.py` pick-folder pipeline; `CURATION.md §3` captions.
- `reveal` on-scroll fade (`main.js`), already no-JS safe.

## Responsive + accessibility (Pass 6)

| viewport | layout |
|---|---|
| ≥ 821px | chapter = 12-col row: text 5 cols (sticky, `top:96px`), plates 6 cols, 1-col gutter; `side:` flips it. Opening plate and strips span 12. Stacked plates in a chapter: 28px gap. |
| ≤ 820px | chapter stacks: eyebrow, H2, text, then plates full width (text stays adjacent to its evidence, no sticky). Pairs stack. **Strip becomes a horizontal scroll row at one height (~150px), bleeding to the screen edge (`margin-inline: calc(-1 * var(--gutter))`), `scroll-snap-type: x mandatory`, fourth photo peeking to signal scroll (D7).** Portrait plates run full width (poster ≈ 530px tall at 400px — acceptable, it is one plate). |
| print / no-JS | content visible (F6); reduced-motion already disables `.reveal`. |

Accessibility:
- `alt` = caption text (already the convention); decorative strip items with no caption get `alt=""` and the strip figure carries the caption.
- `fig.NN` is inside `<figcaption>` so screen readers get number + caption together.
- Captions stay 12.5px (they are captions, not body); body text remains 17px/1.7. Contrast `--faint` on `--paper` ≈ 5.2:1.
- Scroll strip: keyboard users can reach it (it is a focusable scroll container) and every photo is also exposed in DOM order; no content exists only via swipe.
- Landmarks: `<article>` + one `<h1>`; chapter H2s carry the outline; `(outcome)` is a `<section aria-label="outcome">`.

## Design system notes (Pass 5)

- No DESIGN.md. Build against `main.css` tokens; nothing new is introduced: mono `(label)`,
  `--accent` numerals, Fraunces H2, `--faint` 12.5px captions, `--paper-2` image ground.
- **One figure style site-wide (D6):** the legacy `.gallery` block is retrofitted so `.g__fig`
  + `.g__cap` render below the image exactly like `.plate__cap` (mono `fig.NN` + caption in one
  line, `--faint`). The overlaid label (`position:absolute; left:14px; bottom:12px`) is removed
  everywhere. Screenshot all six legacy pages after the change.
- Legacy `mediaHero` / `mediaPair` placeholder boxes (16:9, 4:3 `--stripe`) stay for pages that
  still use them; they are deleted per page as each is curated.

## NOT in scope

- Lightbox / zoom on plates — the plates are already shown at natural ratio up to 966px;
  revisit if a project needs 14k-px scans readable (water urbanism may).
- Re-curating the other six projects — one commit per project, after this template lands.
- Homepage card composition changes beyond the crop fix.
- A DESIGN.md — worth doing (`/design-consultation`) but the tokens in `main.css` are
  consistent enough to build against today.

## Implementation Tasks
Synthesized from this review's findings. Each task derives from a specific finding above.
Run with Claude Code; checkbox as you ship. One commit per task is fine; push once QA (T6) passes.

- [x] **T1 (P1, human: ~4h / CC: ~20min)** — template — chapter rendering
  - Surfaced by: D2 approved mockup A; D5 `(outcome)` block; D8 markdown slicing
  - Files: `src/_includes/project.njk`, `.eleventy.js` (a `chapters` filter splitting body HTML on `<h2>` by leading `NN`)
  - Partials: open plate, chapter row (text | plates, `side:`), `.plate`, `.pair`, `.strip`, `(outcome)`; pages without `chapters` render the legacy path
  - Verify: `npx @11ty/eleventy` builds; living heritage shows 5 chapters + outcome; koliwadas unchanged
- [x] **T2 (P1, human: ~2h / CC: ~10min)** — css — plate system
  - Surfaced by: Pass 1 D3 (stacked maps), Pass 5 D6 (one figure style), Pass 6 D7 (scroll strip)
  - Files: `src/assets/css/main.css`
  - `.chap` 12-col row, sticky text with `.chap--long` guard, `.plate` (height:auto, caption below), `.pair`, `.strip` (flex from w/h), ≤820px stack + edge-bleed scroll strip with snap; `.gallery` retrofit: `.g__fig` moves into `.g__cap`, overlay rule deleted
  - Verify: no `position:absolute` fig labels remain; strip items share one height at 1280 and at 400
- [x] **T3 (P1, human: ~1h / CC: ~5min)** — pipeline — dimensions
  - Surfaced by: Pass 2 D4 (zero layout shift)
  - Files: `scripts/prep-images.py`
  - Emit `w:`/`h:` for every item and the thumb; drop `ar:`; template writes `width`/`height` on every `<img>`
  - Verify: re-run for living-heritage; every gallery `<img>` in `_site` has width+height attributes
- [x] **T4 (P1, human: ~2h / CC: ~10min)** — content — living heritage
  - Surfaced by: chapter map; D3; D5
  - Files: `src/projects/3-living-heritage.md`, captions from `CURATION.md §3`
  - Body → `## 00 context` … `## 04 co-design`; `open:`, `chapters:` (03 stacked), `outcome:`; delete `method:` and the italic award line; card `fig:` → `fig.11 — the village, whole`
  - Verify: build + read the page top to bottom once
- [x] **T5 (P1, human: ~30min / CC: ~5min)** — index — last crop
  - Surfaced by: Pass 7 D9
  - Files: `src/index.njk:66`, `images/_picks/living-heritage/00-*.jpg`
  - Thumb = axo (LH_08) at ≤1200px; `--car` `1/1`; re-tune `--cmt` on cards 06/07 if they collide
  - Verify: index at 1280/400; `00.jpg` renders at its own ratio inside the frame
- [x] **T6 (P2, human: ~1h / CC: ~5min)** — qa — screenshots
  - Surfaced by: Pass 5 D6, Pass 6
  - Files: `_site/**`
  - Living heritage at 1280 + 400; all six legacy pages after the `.gallery` retrofit; index composition; programmatic check that every `<img>` renders at its natural ratio
  - Verify: `/design-review` after deploy

_No new tasks from Pass 4 (AI slop)._

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|---|---|---|---|
| project detail page | `~/.gstack/projects/raghavk31-raghavkohli.xyz/designs/project-page-20260913/variant-A.png` (live: `A.html`) | A · chapters — text beside its plates, alternating sides, opening plate, no method list | Amend per D3 (ch.03 maps stacked), D5 (`(outcome)` block before `(next)`), D7 (strip scrolls sideways ≤820px). B and C kept in the same folder for reference. |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score: 4/10 → 9/10, 7 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **VERDICT:** DESIGN CLEARED — ready to implement; eng review required

NO UNRESOLVED DECISIONS
