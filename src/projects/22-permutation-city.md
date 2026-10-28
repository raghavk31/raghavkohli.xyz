---
title: Permutation City
subtitle: Urban plans for real Indian sites, generated from the land. Water, ground and climate come first; streets, blocks and buildings follow from them.
question: if a plan starts from the land, what does a city stop losing?
desc: generative design with nature · five indian sites
topics: [water, buildings, mobility]
size: lg
offset: ""
qsize: 21px
fig: fig.05 · one plan, generated from the land
role: research · computational design · code
period: 2026, ongoing
context: five indian sites · bengaluru's tank cascade as the demo
status: live · milestone A due 25 november 2026
live: true
# The repo's first commit is 15 October 2026; the earlier version of the story (/classic) is older. [confirm the start]
date: 2026-10-15
card: L
# Every figure is a screenshot of the live workbench, 28 October 2026, Bengaluru, run number 1
# (15 generations of 30), taken headless at 1600x1000 and cropped; picks in images/_picks/permutation-city/.
thumb: /assets/projects/permutation-city/00.jpg
thumbw: 840
thumbh: 810
covers:
  - { t: /assets/projects/permutation-city/c1.jpg, f: /assets/projects/permutation-city/c1-f.jpg, w: 810, h: 810 }
  - { t: /assets/projects/permutation-city/c2.jpg, f: /assets/projects/permutation-city/c2-f.jpg, w: 844, h: 844 }
  - { t: /assets/projects/permutation-city/c3.jpg, f: /assets/projects/permutation-city/c3-f.jpg, w: 844, h: 844 }
  - { t: /assets/projects/permutation-city/c4.jpg, f: /assets/projects/permutation-city/c4-f.jpg, w: 810, h: 810 }
  - { t: /assets/projects/permutation-city/c5.jpg, f: /assets/projects/permutation-city/c5-f.jpg, w: 832, h: 832 }
# The one place the address lives. It may move to permutation.raghavkohli.xyz; change `href` here
# and the (live) row and the outcome link both follow (`*url` below is a YAML alias of it).
tool:
  href: &url "https://permutationcity.vercel.app/"
  label: the story
  also:
    - { path: "workbench?site=bengaluru-cascade", label: "the workbench" }
lead: "Our cities flood in light rain because they have no stormwater system. They have little green space within reach, and they build the same buildings everywhere, buildings that ignore the climate and lean on air conditioning. Permutation City takes a real site and reads its land first: the water, the ground, the heat and the wind. The rules come from that reading and from the bye-laws, and only then are streets, shared ground, blocks and buildings generated, bred by an evolutionary search and tested under a 100-year rain, a high-end sea and a heatwave. It continues two studios: Generative Techniques, where a neighbourhood was first written as rules and searched, and Water Urbanism, where the water was drawn before the city."
next: Generative Techniques · a neighbourhood as rules, not a plan
open: { src: /assets/projects/permutation-city/01.jpg, w: 1600, h: 1000, fig: fig.01, cap: "The workbench, mid-search. Generation 10 of 15 on the Bengaluru tank cascade: the best design so far on the map, its five scores on the right, the three best so far under it, and the designs kept from an earlier run in the pen along the bottom." }
chapters:
  - n: "00"
    name: the claim
    title: What a city stops losing when the land comes first
  - n: "01"
    name: site
    title: Reading the land in layers
    side: left
    plates:
      - { src: /assets/projects/permutation-city/02.jpg, w: 730, h: 510, fig: fig.02, cap: "McHarg's layer cake, as a stack. Ground, water, green and the city today, each a map of the same 240 hectares, lifted apart so they can be read one over another." }
      - { src: /assets/projects/permutation-city/03.jpg, w: 860, h: 810, fig: fig.03, cap: "Water, flow, valleys, ridges. The Haralur to Saul Kere cascade: four tanks in a row, the flow lines traced over the whole upstream catchment, and the valleys that carry the water from one tank to the next." }
  - n: "02"
    name: rules
    title: What the landform and the law forbid
    plates:
      - { src: /assets/projects/permutation-city/04.jpg, w: 1600, h: 1000, fig: fig.04, cap: "Twelve rules sort the ground. 83 hectares never built (the lake buffer, 28 hectares at the 30 m the law asks, 83 at the 75 m chosen here), 91 built with limits (valleys, rain hollows, a breeze edge along the water, existing trees), 149 free to design. Change a number and the map follows." }
  - n: "03"
    name: streets
    title: Routes merged on the ground, the way Frei Otto found paths
    side: left
    plates:
      - { src: /assets/projects/permutation-city/06.jpg, w: 840, h: 810, fig: fig.05, cap: "One plan from the run. Primary streets of 18 m, secondary streets of 12 m found by merging routes on a cost surface over the ground, and local streets of 9, 7.5 or 6 m following tensor fields drawn from the land; the tanks and their buffers left whole. The block in orange is the one massed in fig.11." }
      - { src: /assets/projects/permutation-city/08.jpg, w: 844, h: 900, fig: fig.06, cap: "Every street gets a frontage. Active, with shops at the ground floor, on the main routes; residential; a green edge on the parks; a lake edge on the water." }
  - n: "04"
    name: shared ground
    title: The parks and squares are drawn before the plots
    plates:
      - { src: /assets/projects/permutation-city/07.jpg, w: 844, h: 900, fig: fig.07, cap: "Shared ground, 46 % of the land. Parks reserved first, fourteen squares at the important junctions; within a walk of home, 88 % of the plan has doorstep green and all of it a park and a neighbourhood park. [confirm: share of homes or of land]" }
  - n: "05"
    name: building types
    title: A type for each block, chosen by its density
    side: left
    plates:
      - { src: /assets/projects/permutation-city/09.jpg, w: 844, h: 900, fig: fig.08, cap: "Building types, read through Spacematrix. 18 courtyard blocks, 89 perimeter blocks, 56 of row housing, no podium with towers in this design; a density of 2.00 asked, 1.80 given." }
  - n: "06"
    name: the search
    title: Hundreds of designs, and no single best one
    plates:
      - { src: /assets/projects/permutation-city/10.jpg, w: 664, h: 760, fig: fig.09, cap: "The trade-offs, every pair. Each square plots one score against another, better towards the top and right: flood storage, heat, embodied carbon, daylight and human scale. Ringed, the designs nothing else beats on every count." }
  - n: "07"
    name: the brief
    title: The brief doesn't fit, and the tool says so
    side: left
    plates:
      - { src: /assets/projects/permutation-city/05.jpg, w: 1600, h: 1000, fig: fig.10, cap: "The Brief step. Brief 591 hectares of floor area; the rules allow 181; designs aim for 181; 69 % can't fit, on 240 hectares of design ground and a 150 mm design storm." }
  - n: "08"
    name: a negative result
    title: Growing in steps did worse than designing in one go
  - n: "09"
    name: the workbench
    title: A designer edits the rules, not the drawing
    plates:
      - { src: /assets/projects/permutation-city/11.jpg, w: 1320, h: 908, fig: fig.11, cap: "Massing, one block in 3D. Block 123, 0.57 hectares and six plots: buildings bred inside the envelope the setbacks and height limits make, scored on winter sun, hot-season shade, sky view and the wind they block, beside the existing buildings in grey." }
outcome:
  built: "A working tool, live: a Python pipeline that fetches and layers any site's data, a TypeScript engine that turns it into rules, streets, shared ground, building types and massing, an evolutionary search (NSGA-II and MAP-Elites) with a shock battery, and a web workbench to run it all. Five Indian sites. Research, computational design and code."
  next: "Milestone A, due 25 November 2026: the tool, an evaluation, a video and a paper draft. The evaluation runs the claim, the plan generated from the land against the plan the same bye-laws give when plots come first, and states the cost in floor area beside the losses avoided."
  link: { lbl: live, label: "Open Permutation City", href: *url }
cites:
  - { a: "McHarg, I.L. (Penn)", y: 1969, t: "Design with Nature", in: "Natural History Press" }
  - { a: "Spirn, A.W. (Harvard)", y: 1984, t: "The Granite Garden: Urban Nature and Human Design", in: "Basic Books" }
  - { a: "Hillier, B. and Hanson, J. (UCL)", y: 1984, t: "The Social Logic of Space", in: "Cambridge University Press", href: "https://doi.org/10.1017/CBO9780511597237" }
  - { a: "Deb, K., Pratap, A., Agarwal, S. and Meyarivan, T. (IIT Kanpur)", y: 2002, t: "A fast and elitist multiobjective genetic algorithm: NSGA-II", in: "IEEE Transactions on Evolutionary Computation 6(2)", href: "https://doi.org/10.1109/4235.996017" }
  - { a: "Chen, G., Esch, G., Wonka, P., Müller, P. and Zhang, E. (Oregon State, Arizona State)", y: 2008, t: "Interactive procedural street modeling", in: "ACM Transactions on Graphics 27(3), SIGGRAPH 2008", href: "https://doi.org/10.1145/1360612.1360702" }
  - { a: "Otto, F. (Stuttgart)", y: 2009, t: "Occupying and Connecting: Thoughts on Territories and Spheres of Influence with Particular Reference to Human Settlement", in: "Edition Axel Menges" }
  - { a: "Berghauser Pont, M. and Haupt, P. (TU Delft)", y: 2010, t: "Spacematrix: Space, Density and Urban Form", in: "NAi Publishers" }
  - { a: "Mouret, J.-B. and Clune, J. (Pierre and Marie Curie, Wyoming)", y: 2015, t: "Illuminating search spaces by mapping elites", in: "arXiv:1504.04909", href: "https://arxiv.org/abs/1504.04909" }
  - { a: "Indian Roads Congress", y: 2018, t: "IRC:SP:118-2018, Manual for Planning and Development of Urban Roads and Streets", in: "Indian Roads Congress", href: "https://law.resource.org/pub/in/bis/irc/irc.gov.in.sp.118.2018.pdf" }
---

## 00 the claim

Designing with nature avoids the losses cities now take as normal. Under the same bye-laws and the
same floor-area target, a plan generated from the land should lose less floor area to rain, sea and
heat shocks, and put more people within a walk of green space, than the plan the same rules give
when plots are laid out first and water is handled afterwards.

The cost is part of the claim: the floor area given back to water and green ground is stated
rather than hidden. The comparison itself is what Milestone A runs, so on this page the claim is
a hypothesis being tested, not a result. [confirm wording once the runs are in]

The idea is old. Ian McHarg's *Design with Nature* laid a site out in layers and let the land say
where the city should not go; Anne Whiston Spirn's *The Granite Garden* read the city itself as
nature. Rajgir, in the Water Urbanism studio, drew the aahar-pyne before any street. What is new
here is making that order generative, under real Indian plot rules, and measuring what it saves.

## 01 site

Any site's data is fetched and layered, McHarg-style. Terrain from FABDEM; mapped water from
Overture, OpenStreetMap and ESA WorldCover; flow lines traced over the whole upstream catchment,
not only the site; seasonal ponds from Sentinel-2 imagery, every scene from August to October,
2019 to 2025; land surface temperature; regional wind from ERA5; the existing buildings and
streets.

The main demo is the Haralur to Saul Kere tank cascade in Bengaluru: 240 hectares, gently sloping,
32 metres of relief, four tanks in a chain, each spilling into the next.
Read together, the layers say what the land is doing in every spot before anyone proposes
anything.

## 02 rules

The landform and the law then say what is forbidden or constrained. Valleys, ridges, flood ground,
lake and drain buffers; and real plot rules, each figure sourced from a document and given a
confidence level. For Bengaluru that is the Revised Master Plan 2015, the Building Bye-laws 2003 and
Karnataka's lake buffer rules: floor-area ratio by the width of the road a plot fronts, ground
coverage by plot size, setbacks rising with height.

Twelve rules sort the ground into never built, built with limits, and free to design. They are
written as numbers on the page, so a designer can disagree with one precisely, and the map redraws.

## 03 streets

The main streets are found the way Frei Otto found path systems: routes between the site's gates
and centres are laid on a cost surface over the ground and merged where they run close, so the
network detours to share a street rather than cutting straight across the water. Local streets
follow tensor fields drawn from the land, after Chen and colleagues' interactive procedural street
modelling.

Gradients, curve radii and cross-sections follow the Indian road standards, IRC:86 and
IRC:SP:118: a primary street is 18 metres, a secondary 12, a local street 9, 7.5 or 6. Each street
then gets a frontage type, active, residential, green or lake, which decides what its ground floor
faces.

## 04 shared ground

Squares at the important junctions and a hierarchy of parks within walking distance are reserved
before any plot is drawn. The usual order gives parks the leftover ground; here the plots get
what is left after the water and the shared ground have taken theirs.

In the design shown, that is 46 per cent of the land, and by the tool's walking measure all of
the plan is within reach of a park and a neighbourhood park. [confirm what the share is of]

## 05 building types

Each block gets a building type, courtyard, perimeter block, row housing or podium with towers,
chosen by the density it has to carry. The choice is read through Berghauser Pont and Haupt's
Spacematrix: coverage, storeys and floor-area ratio together, so that a type is a range of
densities rather than a style.

The depths, spacings and court sizes come from the bye-laws where they say something, and are
marked assumed where they don't.

## 06 the search

An evolutionary algorithm breeds hundreds of designs: NSGA-II keeps the ones nothing else beats on
every count, MAP-Elites keeps one of every kind. Each is scored on five measures, flood storage,
heat, embodied carbon, daylight and human scale, and tested under a shock battery: a 100-year
rain, high-end sea-level rise by 2100, and a heatwave 4.5 °C above today's.

A run of 15 generations of 30 on Bengaluru breeds 480 designs in about a minute in the browser.
There is no single best design. The tool shows the trade-offs and the designer picks the balance,
with the reasons visible: the method of the Generative Techniques studio, six years on, with
water and heat among the scores.

## 07 the brief

In Bengaluru, once the real plot rules apply and water and green ground come first, plans can hold
about 181 hectares of floor area. The brief asks for 591. Floor-area ratio there applies to a plot,
not to the whole site, and once streets, lake edges, valleys and parks are taken out, the plots are
a fraction of the ground.

The tool shows that gap instead of quietly overbuilding to meet the number. At the 30-metre lake
buffer the law asks, rather than the 75 metres chosen here, the site holds about 222 hectares;
the 591-hectare brief is itself an assumption, a floor-area ratio of 2.0 over the design ground.
[confirm the brief's source]

## 08 a negative result

Growing the site in three steps, 2025, 2035 and 2050, with foresight about the final year, did
worse than designing it in one go. It ended hotter on all five sites, worse on flood storage on
three, and far less diverse; it did better only on the wholeness of the design actually built.

It is written up rather than buried. Piecemeal growth earns its place as a way of working, a
phased plan with each phase scored in its own year, not as a better optimiser.

## 09 the workbench

The workbench is where all of this is used. A designer can edit any rule, draw constraints before a
run (a green spine, a main street, a plaza, ground left unbuilt, buildings to keep), run the
search, compare the designs it keeps, follow a design's family tree, and open any block in 3D to
breed its buildings inside the envelope the rules allow.

The instrument, not the plan, is the work. The plan on this page is one of thousands the same
rules allow; what the tool makes visible is why each one is the shape it is.
