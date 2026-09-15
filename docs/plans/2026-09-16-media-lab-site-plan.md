# raghavkohli.xyz — plan for the Media Lab application (MAS, Dec 2026)

## Context

The site exists to get Raghav into the MIT Media Lab (MAS, Dec 2026 deadline, ~10 weeks) with
City Science and a climate/sustainability group as targets, and to serve job applications second.
Today it proves *drawing* and *embedding* well (living heritage, rebel bodies, one is to one, state
of cities) but the things the Media Lab reader weighs most — **building tools, urban analytics,
a current research direction** — are the least evidenced: cards 01/02/03/04/07/08 on the
homepage are empty frames, sama (card 01) reads as a live product but is an idea, the about/CV
is generic, and the `(index)` archive rows are placeholders. The full body of work Raghav listed
(school → CEPT → NIUA → ICLEI → Perspectives → resilience ai) is not yet on the site in a form a
faculty member can read in five minutes.

This plan is the curation + sequencing decision, not a page build. Pages are then built one at a
time with the existing pipeline (`scripts/prep-images.py`, chapter template in
`src/_includes/project.njk`, plans in `docs/plans/`), one commit + push each.

## The reader model (drives every cut)

A Media Lab faculty reader gives the portfolio URL ~5 minutes, looking for: (1) a research
question they can place in their group, (2) proof you build — data, code, tools, prototypes,
(3) technical depth at the group's level, (4) a maker's origin. Admissions committee and hiring
reviewers come second and are served by the same pages plus the CV.

Rule for the homepage: **nothing on the first two screens may be an empty frame or an
unverified claim by Dec 1.** Fill it or hide it.

## What changes (recommended)

### 1 · Homepage order tells the arc, evidence-first
Keep "one question, escalating instruments" but lead with the instruments the Lab cares about.
Target order of cards (`src/index.njk`), top → bottom:

| # | card | status today | action |
|---|---|---|---|
| 01 | **resilience ai** (consulting, live product) | not on site | new page — the "building" proof; role scoped honestly ("consulting: …") |
| 02 | **gcap — city analytics** (Malaysia, ADB) | not on site | new page = *the urban analytics page*: CRVA, GHG inventory, data pipeline, own charts |
| 03 | **capacities — 3 CRCAPs** (Ahmedabad/Surat/Vadodara) | staged | new page per `docs/plans/2026-09-13-book-projects.md §B`; ward-level maps |
| 04 | state of cities | live | keep; finish the "making" paragraph (TODOS) |
| 05 | climate code india | empty frame | fill: live Streamlit URLs + screenshots, or cut to archive |
| 06 | perspectives | empty frame | fill: CR2 → JPEG export, 4–6 photos + the system diagram |
| 07 | koliwadas | empty frame | fill from `D:\Work\Academic-CEPT\Sem_10` + CURATION §3 body |
| 08 | living heritage | live | keep |
| 09 | rebel bodies | live | keep |
| 10 | generative techniques | staged | new page — the computational studio; matters for City Science |
| 11 | one is to one | live | keep; **strip every `[confirm]`** before Dec |
| — | sama | empty frame, overclaims | see §3 — becomes the "(now)" research direction, not a product card |
| — | pune metro | empty frame | cut to an archive row credited as CCBA internship, unless the located source yields the map pair |
| — | water urbanism / eco-machine / utopias | staged | archive rows now; pages only if weeks 7–8 are free |

`2-city-climate.md` is retired into 02/03 (as the book-projects plan already intends).

### 2 · Urban analytics, made visible
GCAP is the analytics page: chapters = *mapping* (city base maps) → *risk* (CRVA method, hazard ×
exposure × vulnerability, one map at full res) → *inventory* (GHG accounting: scopes, sectors,
where the numbers come from; stat row) → *action* (sectoral projects). At least **two plates are
charts redrawn from Raghav's own data** (dataviz pass, site colours), and one plate is **code**:
a notebook excerpt or a small figure of the processing pipeline. CapaCities carries the
ward-level vulnerability maps. Both pages link the published PDFs from `(outcome)`.
Add a `#analytics` topic so the homepage filter surfaces the thread (gcap, capacities, state of
cities, climate code).

### 3 · "(now)" — a research-direction block, and an honest sama
Add a short block on the homepage between the grid and about (or at the top of about):
**(now)** — three lines: *resilience ai* (consulting; what he does there), *sama* (research
direction: "peer-to-peer rooftop solar — what would a household need to see to trade?"), and the
sentence that names the next instrument (what he wants to build at City Science). Sama's page
is rewritten as a direction with one real, small artifact built in the window (see §6, week 3):
a simulation/notebook on public solar + load data, one chart, honest `status: direction`.

### 4 · About rewrite (for the faculty reader)
Three short paragraphs replacing the current one: the question (keep); **origins** in two lines
(mother — teacher, drawing, spiritual leaning; the solar-powered RC car; the decentralised
waste-collector-bin pretotype; Universal Solidarity Movement) — the maker's story the Lab
likes, no more than that; **direction** (what he'd build, in one sentence). CV drawer: correct
the years, add an *analytics* skill line that names methods (CRVA, GPC-style GHG inventory,
QGIS/ArcGIS, Python/geopandas, R, Tableau) and where each was used, and list the partners once
(MoHUA, ADB, UNEP, WRI/TNC, UN Women, USAID, NITI Aayog) as institutions, not adjectives.

### 5 · Archive `(index)` — real rows, cut the aspirational ones
Replace `src/_data/archive.js` (teaching/writing/talks/open data/earlier work are placeholders)
with the real long list, one line each, PDF/link where one exists: Aldo van Eyck summer school
(Academy of Amsterdam) · Majuli winter school · Hunnarshala workshop · UPenn computational
design · CCBA (Metro PML3, urban development, HyperPort research, APU, proposals) · publications ·
installations (Big O's, ILF Ahmedabad) · competitions (Blankspace, Platypus, Gaudi, Singapore
sea-level rise) · Loss & Damage brief (UNEP–CCC) · NbS toolkit/forum (WRI, TNC, Shakti) · gender
inclusion (UN Women) · Udaipur Urban95 · US–South Asia mayoral platform (USAID) · high-level
committee presentation · urban greening policy, Ahmedabad · compendium of good climate
practices · student council / informal talks / publication · full CV. Two-to-three-word `cat`,
year, one-sentence blurb in the site voice.

### 6 · Sequence (deadline Dec 1; one commit + push per page; confirm before each push)
| week | ship |
|---|---|
| 1 (Sep 16–22) | CapaCities + GCAP pages (already queued for tomorrow) |
| 2 (Sep 23–29) | Raghav's notebooks → 2–3 redrawn charts into GCAP/CapaCities; retire city-climate |
| 3 (Sep 30–Oct 6) | resilience ai page (screenshots, role); sama rewrite + the small artifact |
| 4 (Oct 7–13) | climate code (live URLs) · perspectives photos · koliwadas fill |
| 5 (Oct 14–20) | about rewrite · (now) block · archive rows · homepage reorder · pune metro decision |
| 6 (Oct 21–27) | generative techniques page · `next:` chain set once for the whole arc |
| 7 (Oct 28–Nov 3) | strip all `[confirm]`s · phone QA · page weight (rebel bodies is 9 MB; check LCP) · OG/meta |
| 8 (Nov 4–10) | portfolio PDF exported from the site (`/make-pdf`) for the upload field; the statement of objectives and the site tell the same story |
| 9–10 | buffer; water urbanism / eco-machine / utopias only if everything above is live |

### 7 · Facts only Raghav can supply (block the pages they belong to)
- resilience ai: what can be shown publicly, his role in one line, the product URL.
- GCAP: disk says four Malaysian cities; `book-projects.md §C` says five plans — which is it.
- Years for ICLEI / NIUA / CCBA / Perspectives (the CV drawer and the user's list disagree).
- Every `[confirm]` currently live (one is to one, state of cities meta row).
- Which group is the climate/sustainability one, so the (now) sentence names it right.

## Files touched over the plan
`src/index.njk` (card order, (now) block, about), `src/_data/archive.js`, new
`src/projects/*-gcap.md`, `*-capacities.md`, `*-resilience-ai.md`, `*-generative-techniques.md`;
rewrites of `1-sama.md`, `4-koliwadas.md`, `5-perspectives.md`, `6-climate-code.md`; retire
`2-city-climate.md`; `CURATION.md` tracker updated as pages ship. Existing tooling reused:
`scripts/prep-images.py`, chapter template + `strip.col`/`blend`/`stats`, dataviz pass for charts.

## Verification
Per page: build (`npx @11ty/eleventy`), serve `_site`, screenshot desktop + 400px with the
headless browser (`$B viewport` → `scrollTo` → `screenshot --viewport`), lightbox and hover
panels checked, then commit and push on confirmation. At week 7: the five-minute test — open the
homepage cold, click the first three cards, confirm each has an image, a question, an outcome,
and no `[confirm]`; run the homepage through a phone; time the LCP of the heaviest page.
