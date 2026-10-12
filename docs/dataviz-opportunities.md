# Data-viz opportunities (2026-10-13)

Where a real chart would do more than a picture of a chart. Ranked by payoff for City Science
(urban analytics), and limited to data the site already has or the source PDFs already contain.
Each entry: the question, the data, the form, and what it takes.

## Homepage

**1. The work over time: built (branch `eco-time`).** One dot per project, 2017 to 2026, under
the diagram, linked both ways. It shows the practice moving from buildings and education
(school, 2017–2020) to energy, air and plans (2023–2026).
- Open: Climate Code and resilience ai aren't on the grid, so they aren't on the line yet.

**2. Which resources travel together (later).** Hovering a resource would show which other
resources share its projects, as a thin co-occurrence link.
- Blocked on the tag pass: the three CRCAPs and GCAP each carry 5–6 of 7 resources, so today
  every resource links to every other and the chart would say nothing. Revisit after the tags.

**3. A scale axis (idea, from earlier).** Place each project from household to neighbourhood,
city, region and many cities. It pairs with the time line as a second one-axis strip.
- Needs one new frontmatter field per project (`scale:`). You'd pick the value.

## Projects

**4. State of Cities: a live 15-city comparison. Highest payoff.**
- `src/_data/socCities.json` already holds, per city: population, energy GJ per capita,
  tCO₂e per capita, kWh per capita and the CSCAF score.
- Form:
  - A ranked dot plot (one row per city, one measure at a time, a toggle between measures) with
    a hover tooltip.
  - Or a scatter of tCO₂e per capita against kWh per capita, sized by population.
- One axis, no dual scales.
- It's the one place the site can show you working with a dataset across cities, which is City
  Science's whole register.
- About half a day: it's build-time SVG, the same way perspectivesViz.js is done.

**5. Ahmedabad (and Vadodara, Surat) CRCAP: the net-zero pathway as a real chart.**
- The numbers are already in your captions:
  - 15.09 MtCO₂e in 2021–22
  - 55.7% / 79.2% / 91% below BAU in 2030 / 2050 / 2070
  - Reduction shares: commercial 43%, industry 28%, homes 18%, green cover 2%
  - 13.4% growth over five years
- Form:
  - A stepped area chart: the BAU line with each sector's wedge peeled away as you scroll the
    story beats. The same chart for all three cities makes them comparable.
  - A plain sector bar for the inventory.
- Needs: the yearly series (2021–2070) for each scenario from the CRCAP spreadsheets or PDF
  tables. Only the anchor years are in the captions.
- The three CRCAPs merge into one card (the curation plan), and this chart is a good reason to:
  three cities, one instrument.

**6. Malaysia GCAP: four cities on one instrument.** The subtitle already says "four cities read
on one instrument".
- Form: small multiples, one per city (Kota Bharu, Langkawi, Kuching–Padawan, Penang Island),
  each an inventory-by-sector bar on a shared scale.
- Needs: the four inventories (in the GCAP reports).

**7. Sama: the price gap.**
- ₹2.50 paid against ₹6.40–6.80 cleared is the story's whole argument, and it's currently
  only text.
- Form: one horizontal bar pair, or a waterfall from ₹6.40 down to ₹2.50 through wheeling,
  banking, cross-subsidy and platform fee.
- That waterfall is the "honest note on the spread" your `next:` already promises.
- Needs: the per-state charge numbers. Until then, only the gross pair, labelled as gross.
- The /work/sama/feeder/ instrument is already the deep version, so this is the one-glance
  version.

**8. Perspectives: the figures are built; the data isn't.**
- perspectivesViz.js already draws from `perspectives.json`, but every row is SAMPLE.
- The highest-value step is the real attendance records, not new charts.

**9. Climate Code: already a data explorer.** The `climate-code` branch (in progress, separate
work) turns it into one map. Nothing to add here.

**10. Water Urbanism / CRCAP layer builds.** These are already planned as animations (make-anim.py).
- Not a chart, but the same idea: show the analysis being built rather than the finished plate.

## Suggested order
1. Merge the time line.
2. Fix the tags. This unlocks #2 and makes the counts honest.
3. Build the State of Cities comparison, since the data is in hand.
4. Pull the CRCAP pathway series, then build the shared pathway chart across the three cities.
5. Build GCAP small multiples, then the Sama spread waterfall once the charges are known.

Method for every chart (from the /dataviz pass):
- One axis.
- Ink as the single series colour; the accent only for the hovered or lit item.
- A tooltip on every mark.
- A table or caption that says the numbers in words.
- Checked in light, dark and random paper.
