---
title: generative techniques
subtitle: A neighbourhood for 1,55,676 people in north Ahmedabad, designed as rules and searched by an evolutionary algorithm.
question: can a neighbourhood be designed as rules rather than a plan?
desc: ahmedabad · evolutionary computation
topics: [data]
size: md
offset: ""
qsize: 24px
fig: fig.01 — density as a rule
role: computational urban design · grasshopper · evolutionary search
period: 2020 · one semester
context: sabarmati · north ahmedabad · cept L2 studio
status: studio
live: false
date: 2020-05-01
thumb: /assets/projects/generative-techniques/00.jpg
thumbw: 1200
thumbh: 848
covers:
  - { t: /assets/projects/generative-techniques/c1.jpg, f: /assets/projects/generative-techniques/c1-f.jpg, w: 1200, h: 848 }
  - { t: /assets/projects/generative-techniques/c2.jpg, f: /assets/projects/generative-techniques/c2-f.jpg, w: 1200, h: 848 }
  - { t: /assets/projects/generative-techniques/c3.jpg, f: /assets/projects/generative-techniques/c3-f.jpg, w: 758, h: 536 }
  - { t: /assets/projects/generative-techniques/c4.jpg, f: /assets/projects/generative-techniques/c4-f.jpg, w: 900, h: 636 }
  - { t: /assets/projects/generative-techniques/c5.jpg, f: /assets/projects/generative-techniques/c5-f.jpg, w: 1200, h: 848 }
lead: "India will need to hold most of its population growth inside cities that already exist, and the usual answer — stack more floors on the same plan — throws away the ground. This studio took a 1.45 sq km site beside the Sabarmati, between Gandhi Ashram and a sewage treatment plant, and asked what densification would look like if the design were written as relationships instead of drawn as a masterplan: what should be dense, what should stay quiet, what must be kept open. Then it let an evolutionary algorithm search the plans those rules allow."
next: eco-machine — mumbai's eastern waterfront as a living machine
open: { src: /assets/projects/generative-techniques/01.jpg, w: 1674, h: 1357, fig: fig.01, blend: true, cap: "Density as a rule — bus stops, street edges and junctions attract high density so that the most people sit closest to transit; the swale, Gandhi Ashram, Kalam Kush and the treatment plant push density away, to keep their value and identity." }
chapters:
  - n: "00"
    name: site
    title: What to keep before deciding what to build
    plates:
      - { src: /assets/projects/generative-techniques/02.jpg, w: 1468, h: 1540, fig: fig.02, blend: true, cap: "Retained areas — 1.45 sq km of site, 1.38 to develop. The swale, Gandhi Ashram, the bio-swale and Kalam Kush (63,350 sq m together) are taken off the table first." }
  - n: "01"
    name: three horizons
    title: 2025, 2035, 2050
    side: left
    plates:
      - { src: /assets/projects/generative-techniques/05.jpg, w: 1726, h: 1623, fig: fig.03, cap: "T(2) 2050 — 1,55,676 people, 38,91,900 sq m of built space required; low 33 %, medium 24 %, high 43 %. The attractors' radii at their widest." }
    strip:
      col: true
      fig: fig.04–05
      cap: "The same attractors at T(0) 2025 and T(1) 2035 — the population doubling from 65,873 to 92,921, the share of high-density ground from 24 to 33 per cent."
      items:
        - { src: /assets/projects/generative-techniques/03.jpg, w: 1650, h: 1623, cap: "T(0) 2025 — 65,873 people; built required 16,46,825 sq m; low 45 %, medium 31 %, high 24 %." }
        - { src: /assets/projects/generative-techniques/04.jpg, w: 1651, h: 1623, cap: "T(1) 2035 — 92,921 people; built required 23,23,025 sq m; low 38 %, medium 29 %, high 33 %." }
  - n: "02"
    name: genepool
    title: A block, written as nine steps
    plates:
      - { src: /assets/projects/generative-techniques/06.jpg, w: 1552, h: 1610, fig: fig.06, blend: true, cap: "The block as a procedure — a constant 200 × 120 m plot; offsets, divisions, staggering, heights and non-uniform scaling each given a range rather than a value. Every range is a gene." }
    strip:
      col: true
      fig: fig.07
      cap: "Genepool against fitness criteria — what varies, and what each variation is judged on."
      items:
        - { src: /assets/projects/generative-techniques/07.jpg, w: 1030, h: 767, cap: "Genepool — plaza width, corridor offset, unit width, terrace scaling, height, shop depth — against the fitness criteria: open space on ground and rooftops, shade in the plaza, sunlight in corridors, built volume." }
  - n: "03"
    name: pareto fronts
    title: Most fit, least fit
    side: left
    plates:
      - { src: /assets/projects/generative-techniques/08.jpg, w: 1640, h: 1570, fig: fig.08, blend: true, cap: "Pareto fronts — the individuals no other solution beats on every objective, each with its radar of density, sunlight, open space and shade; below them, the most and least fit of the population." }
  - n: "04"
    name: typologies
    title: Eight neighbourhoods from one intention
    plates:
      - { src: /assets/projects/generative-techniques/09.jpg, w: 1800, h: 1240, fig: fig.09, cap: "The typology rules — residential and mixed-use: staggered units so that they merge, courtyards for sunlight, voids for wind and communal open space, small parcels merged incrementally, stepped forms from low to high." }
    tiles:
      ar: 1.46
      min: 200
      fig: fig.10–17
      cap: "Eight typologies from the same rule set — each shown as its axonometric and the grid, floor plates and unit cells that generate it."
      items:
        - { src: /assets/projects/generative-techniques/10.jpg, w: 794, h: 545, cap: "Type 1 — perimeter block on a coarse grid, staggered slabs." }
        - { src: /assets/projects/generative-techniques/11.jpg, w: 793, h: 586, cap: "Type 2 — clusters of small units on a fine grid." }
        - { src: /assets/projects/generative-techniques/12.jpg, w: 798, h: 532, cap: "Type 3 — a single deep courtyard, terraced." }
        - { src: /assets/projects/generative-techniques/13.jpg, w: 793, h: 532, cap: "Type 4 — a stepped courtyard block, low at the centre." }
        - { src: /assets/projects/generative-techniques/14.jpg, w: 793, h: 536, cap: "Type 5 — high, porous: many small voids through the block." }
        - { src: /assets/projects/generative-techniques/15.jpg, w: 795, h: 536, cap: "Type 6 — towers on a mat, the densest of the eight." }
        - { src: /assets/projects/generative-techniques/16.jpg, w: 793, h: 536, cap: "Type 7 — a courtyard block with an open corner." }
        - { src: /assets/projects/generative-techniques/17.jpg, w: 791, h: 474, cap: "Type 8 — a low mat around a large central void." }
  - n: "05"
    name: the search
    title: Four generations
    side: left
    plates:
      - { src: /assets/projects/generative-techniques/18.jpg, w: 1650, h: 1620, fig: fig.18, blend: true, cap: "Type 1, pseudo-code — a 60 m block; offset 12–18 m for a court; divide into 3 to 7.5 m cells; stack plates at 3 m; cull cells at eight points to make voids; scale non-uniformly; extrude." }
    tiles:
      ar: 2.15
      min: 300
      fig: fig.19–24
      cap: "Generations two to four, and the individuals ranked — each block beside its radar of eight fitness criteria. Click a sheet to read the numbers."
      items:
        - { src: /assets/projects/generative-techniques/19.jpg, w: 1800, h: 835, tile: /assets/projects/generative-techniques/19-t.jpg, tw: 640, th: 293, cap: "Generations two and three — the population, each individual with its fitness radar and the gene that changed." }
        - { src: /assets/projects/generative-techniques/20.jpg, w: 1800, h: 835, tile: /assets/projects/generative-techniques/20-t.jpg, tw: 640, th: 293, cap: "Generations three and four." }
        - { src: /assets/projects/generative-techniques/21.jpg, w: 1800, h: 835, tile: /assets/projects/generative-techniques/21-t.jpg, tw: 640, th: 295, cap: "Pareto fronts and the most fit individuals, with their eight fitness values." }
        - { src: /assets/projects/generative-techniques/22.jpg, w: 1800, h: 835, tile: /assets/projects/generative-techniques/22-t.jpg, tw: 640, th: 295, cap: "Most fit individuals, criteria five to eight; the least fit, one to four." }
        - { src: /assets/projects/generative-techniques/23.jpg, w: 1800, h: 835, tile: /assets/projects/generative-techniques/23-t.jpg, tw: 640, th: 297, cap: "Least fit individuals — the same block, G 4.03, at the bottom of every criterion." }
        - { src: /assets/projects/generative-techniques/24.jpg, w: 1800, h: 835, tile: /assets/projects/generative-techniques/24-t.jpg, tw: 640, th: 293, cap: "Inferences — which individuals suit commercial and mixed use, which residential, and why." }
  - n: "06"
    name: the street
    title: What the rules feel like
    plates:
      - { src: /assets/projects/generative-techniques/25.jpg, w: 1800, h: 900, fig: fig.25, cap: "A street inside the block — the voids culled from the mass become shaded ground, and the staggered plates become terraces above it." }
      - { src: /assets/projects/generative-techniques/26.jpg, w: 1800, h: 900, fig: fig.26, cap: "A court — incremental terraces, a community gathering space, voids for ventilation, the rooftops as the open space the ground could not provide." }
outcome:
  built: "A rule-based neighbourhood for north Ahmedabad — density attractors, a nine-step block procedure, eight typologies and a four-generation evolutionary search across eight fitness criteria. L2 studio, Bachelor of Urban Design, CEPT University, with Radhika Amin, Arpi Maheshwari and Anuradha Ramchandani. May 2020."
  next: "The fitness criteria were spatial — sunlight, shade, open space, volume. The next version of this search should carry a carbon and a water number per individual, so the algorithm is arguing about the same things the climate plans argue about."
---

## 00 site

The site is in the central north of Ahmedabad, on the Sabarmati: 1.45 square kilometres with a
green belt, a swale that once made it a retention basin, a sewage treatment plant, Kalam Kush
and Gandhi Ashram on its edges, and bus and metro stops that tie it into the larger network.
The studio brief was blunt — urban growth will demand thousands of new cities, and the question
is whether high density can be held without giving up spatial quality, climate, open space and
a mix of uses.

Before any rule was written, the site was read for what it should not lose. The retained
entities set the low-density attractors; the transit stops and junctions set the high. **The
plan began as a list of what to preserve.**

## 01 three horizons

The arithmetic was done first. At 2050 the site has to hold 1,55,676 people — 38,91,900 square
metres of built space and 14,01,084 of open space, which is more open space than there is site.
Stacking floors alone reaches a hundred and fifty storeys. Put the required open space on
rooftops as well as the ground, and it comes down to twelve.

So the density distribution is not one drawing but three. The same attractors are run at 2025,
2035 and 2050, their radii widening as the population grows; the share of high-density ground
moves from a quarter to nearly half. **A density map that is a function of time**, not a fixed
zoning.

## 02 genepool

At the block scale, design intent is written as a procedure. The plot is constant, 200 by 120
metres. The residential block offset, the division into units, the staggering between them, the
depth of the shops, the number of floors, the scaling of the terraces — each is given a range
rather than a value. Those ranges are the genepool.

Against them sit the fitness criteria: maximise open space on ground and rooftops, maximise shade
in the plaza, maximise sunlight in the circulation corridors, maximise built volume. The
relationships between the two — which gene moves which criterion — are the design. **Encoding
intent this way makes it arguable**: you can disagree with a rule precisely, in a way you
cannot with a rendering.

## 03 pareto fronts

The evolutionary solver breeds populations of blocks, scores each against all criteria, and
keeps the ones no other individual beats on every objective — the Pareto front. Below the front
sit the most and least fit of each generation. The radar for each individual shows the
trade-off directly: a block that wins on density loses on open space; one that wins on sunlight
loses on shade. There is no single best answer, only a set of honest compromises, and the
designer chooses among them with the reasons visible.

## 04 typologies

The same method produces the building types. Four primitives — single courtyard, L, U, tower —
are given residential and commercial body plans: grid size 3 to 7.5 metres, depth 12 to 18,
height 0 to 24, voids of 36 to 180 cubic metres, staggering at a factor of 1 to 1.5. Eight
typologies come out of one rule set, from a coarse perimeter block to towers on a mat, each with
the grid, plates and cells that generate it drawn beside it. **The grid is the argument**: what
looks like eight designs is one intention, resolved eight ways.

## 05 the search

For Type 1 the procedure is written out as pseudo-code — a 60-metre block, an offset for the
court, a division into cells, plates stacked at three metres, cells culled at eight points to
make voids, non-uniform scaling, extrusion — and run for four generations. Every individual is
scored on eight criteria and drawn beside its radar.

The inferences are the kind a masterplan cannot give. Blocks with larger unit cells produce
larger open spaces and more access points, are more porous, and suit commerce and mixed use.
Blocks with smaller cells produce private, close-knit voids the size of a community gathering,
with access under the units, and suit housing. One individual, G 4.03, sits at the bottom of
every criterion at once — which is its own kind of information.

## 06 the street

What the rules produce, at eye level, is a brick neighbourhood where the voids culled from the
mass are the shaded streets and courts, and the staggered plates are the terraces that carry
the open space the ground could not. It is the earliest project on this site where the design
object is a system rather than a place — the thread that, later, becomes tools.
