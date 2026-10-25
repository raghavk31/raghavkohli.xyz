# Climate Code, Phase B: a city climate atlas (plan, 2026-10-25)

Plan only. Building starts after 25 November 2026. The brief is the "Climate Code: next phase brief"
of 2026-10-25; this answers its B9: the shared layer library, the source table, where the explorer
lives, phases and estimates, risks and questions.

Items marked **(check)** are facts I could not confirm from a primary source while writing this; each
is a step-0 task in the phase that needs it, not something to build on yet.

---

## 0. What the audit found

**Climate Code (this repo).** A static Eleventy page with vanilla ES modules, no build step. Every city
layer is computed in the browser from OpenFreeMap vector tiles (OSM), Open-Meteo, NASA POWER and Meta
HRSL (through the worker's range proxy). That makes it work for any point on earth, but it caps the
explorer at a 4.8 to 9.6 km square, with only OSM's buildings, heights and land use, and no measured
heat. `ground.js` (priority-flood, D8, contours) and `syntax-worker.js` (angular segment analysis,
NAIN at 800 m, NACH at 2 km, sampled past 2,500 segments) are written independently of Permutation
City's and do not share its tests.

**Permutation City.** It has three parts that matter here:

- `pc/` (Python, about 7,000 lines): fetch (Copernicus GLO-30, FABDEM, ESA WorldCover, Landsat LST
  from Planetary Computer, ERA5 wind, Google Open Buildings 2.5D heights, Overture in six themes),
  `layers.py` (McHarg columns on a hex or quad grid), `landform.py` (stream burning, priority-flood,
  Strahler order, catchments, ridges, relief with confidence), `lst.py` (hot-season median, QA
  masking, 5 K uncertainty cut) and `syntax.py`.
- `app/engine/` (TypeScript): `syntax.ts` is line-for-line parity with `syntax.py`, with fixture
  tests; `massing/sun.ts` handles sun position and shade; `ground.ts` builds the design ground.
- `service/` plus GitHub Actions: builds one drawn site (at most 4 km² and 4,500 cells, 6 builds an
  hour, cached in Vercel Blob by a key that includes the Overture release and `LAYERS_VERSION`).

What this means for the atlas: the layer *service* is shaped for small design sites built on demand
in minutes. A city atlas needs whole cities (Bengaluru is about 740 km²) built ahead of time. So the
atlas should share Permutation City's **layer definitions, sources and algorithms**, not its service.

**Sama.** Next.js. Its convention is in `components/charts/marks.tsx`: *hatched means estimated or
simulated, solid means measured*, with a `HatchDefs` SVG pattern per tone and a `.hatched` class for
HTML. The atlas uses that rule on maps: measured layers are solid tiles; modelled and assumed ones
are hatched tiles.

**climate-30.** `build_atlas.py` already rebuilds the country layers from the days' own code, with
no retyped constants. The country chapters can keep using it, unchanged, as the atlas's intro or
side panel.

---

## 1. The shared layer library

### 1.1 What it is

It has four parts, kept together in one place, and each layer is defined once:

1. **Layer specs**, in data (YAML in the repo, compiled to JSON). One file per layer:

   ```yaml
   id: lst_hot_season
   theme: heat
   title: land surface temperature, hot season
   unit: "°C"
   kind: raster            # raster | vector | grid | ward
   method: >
     Median of clear Landsat 8/9 C2 L2 surface-temperature scenes in the hot months of the
     chosen years; QA bits 0 to 5 masked; ST_QA uncertainty over 5 K dropped.
   confidence: measured    # measured | modelled | assumed (the layer's own, before any source swap)
   aggregate: {grid: mean, ward: mean}
   sources: [landsat_c2_l2_st]          # ordered candidates; the registry picks per geography
   implements: {py: pc.lst.fetch_lst}   # where the code lives
   ```

2. **The source registry**, also data. One entry per source:

   ```yaml
   id: landsat_c2_l2_st
   publisher: USGS
   access: planetary-computer-stac      # no key
   coverage: global
   resolution_m: 30                     # native: thermal band ~100 m, resampled to 30 m by USGS
   period: 2013-
   licence: public-domain
   commercial: true
   tier: global-established             # india-official | global-established | community | derived
   reliability_note: ""
   ```

   A layer's `sources` is a ranked list. For each geography, the registry walks the list and picks the
   first source that (a) covers it, (b) is allowed under the current licence setting, and (c) has
   passed its validation for that city (see 1.4). The rule in the brief, Indian official sources
   first and then established global ones, is the default ranking. I propose one exception, written
   into the entry: an Indian source drops below a global one only where a published validation shows
   it is less accurate. CartoDEM against Copernicus GLO-30 is the likely case. Each such exception
   goes in `reliability_note` with its citation, so it is a recorded decision, not a silent one.

3. **Algorithms**, one implementation each, in the language that runs it:
   - Python (city builds, offline): fetch, landform/drainage, LST, syntax at city scale, zonal
     statistics to grid and wards, AlphaEarth classification.
   - TypeScript (browser, live): angular segment analysis (`syntax.ts`), sun and shade (`sun.ts`),
     walk time, the "what if" recomputations, the risk weighting.
   - Where an algorithm exists in both (syntax today, possibly drainage later), parity fixtures
     like Permutation City's: Python writes the fixture, TS must match it.

4. **Display rules**, in TS: the square-tile renderer, the hatch-for-estimates rule (from Sama), the
   metadata card, and the licence switch. Every layer comes with its card, so no page can show a
   layer without its confidence.

### 1.2 The metadata every layer carries (shown in the UI)

`source · publisher · date or period · native resolution · licence · method (one line plus a link) ·
confidence (measured / modelled / assumed) · which source the registry chose here and why (for example
"FABDEM skipped: non-commercial setting off")`.

Confidence is inherited and can only get weaker. A layer computed from a modelled input is modelled.
An index built with assumed weights is assumed. The UI derives this from the spec, so it cannot drift
from the code.

### 1.3 Own data

The atlas accepts uploads of GeoJSON, KML/KMZ, zipped Shapefile, GeoPackage, GeoTIFF/COG, or CSV with
lon/lat or ward names.

- Everything is read **in the browser**, with no upload to a server and no account: `shpjs` for
  Shapefile, `@tmcw/togeojson` for KML, `geotiff.js` for TIFF/COG, `sql.js` for GeoPackage, and
  Papa Parse for CSV with fuzzy ward-name matching against the city's ward table. Files stay on the
  person's machine unless they export.
- The person says whether the upload **replaces** a layer (it then takes that layer's id, unit and
  aggregation) or sits **beside** it. They must also give it a confidence (measured, modelled or
  assumed) before it draws. The default is "assumed", hatched.
- Their data is aggregated to the same 150 m grid and to wards, so it joins the risk weighting and
  the exports like any other layer.

### 1.4 Licence-aware

There is a setting with two values: **non-commercial** (the default, matching the site) and
**commercial**. Each source has `commercial: true/false`. Switching to commercial re-runs the
registry choice. Every layer whose source changed shows the swap ("terrain: FABDEM (CC BY-NC-SA) →
Copernicus GLO-30 DSM; buildings and trees now raise the ground, so drainage reads worse"). Layers
with no commercial source left are greyed out with the reason. Earth Engine-derived layers follow
the same rule (section 5).

Validation per city: before a source becomes a city's default, the build compares it with one other
source for the same layer (for example GHS-BUILT-H against Open Buildings heights, or WorldCover
against Dynamic World). It writes the agreement into the layer's card. That check is what turns
"the most reliable source" from a claim into a number.

### 1.5 Two spatial units

- **The 150 m grid**, for the whole city (Bengaluru: about 33,000 cells). This is the same grid the
  explorer draws now, extended from a window to the city.
- **Wards** (section 2.1 has the sources). Every layer is aggregated to wards with its spec's
  `aggregate` rule: mean, sum, share or max. Population-weighted means are used where that is the
  honest reading (heat exposure is a population-weighted LST, not the ward's mean LST).

### 1.6 How the explorer uses it (and what happens to ground.js and syntax.js)

The browser cannot run Python, and a static site cannot run a city build. So the work splits:

| | where it runs | when |
|---|---|---|
| city-wide layers (terrain, drainage, LST, buildings, land cover, population, risk inputs) | Python, on GitHub Actions (as Permutation City builds sites today) | once per city, then on a schedule or a source release |
| the outputs | Cloudflare R2: one **PMTiles** archive per city (grid and wards as vector tiles, with every layer's values as attributes) and **COGs** for the rasters worth seeing at native resolution (LST, terrain, embeddings classes) | read by the browser with HTTP range requests |
| the square's live reading (space syntax inside the window, walk time, "what if", sun and shade, risk weights) | TS from the library, in a web worker | live |

- **`ground.js` is retired, not ported.** Drainage becomes a precomputed city layer from
  `landform.py`, run on the 30 m DEM for the whole city. It is better than the browser's version: it
  uses stream burning from mapped channels, a bare-earth DEM, and flat-land handling. The window just
  reads it. Contours come from the same DEM, also precomputed into the PMTiles.
- **`syntax-worker.js` is replaced by the library's `syntax.ts`** in a worker, for the window. The
  city-wide syntax layer is precomputed in Python. Two decisions are needed:
  - **Radii.** Permutation City uses 400 m, 800 m and n; the explorer uses 800 m integration and 2 km
    choice. I propose the library computes **800 m, 2 km and n** and Permutation City adds 2 km. This
    needs your call, because it changes Permutation City's metrics.
  - **City-scale speed.** Bengaluru's network is of the order of 10⁵ segments. Exact angular choice at
    2 km in pure Python will be too slow. Options: sample origins (as the explorer does today, scaled
    up and documented); port the hot loop to a compiled extension (numba); or run depthmapX's CLI
    for the city layer and keep `syntax.ts` for the window. I recommend numba first, with a parity
    fixture against `syntax.ts`.
- **The square stays.** At the city view the map shows the precomputed layers. Dragging the square
  turns on the live layers inside it, as now.

---

## 2. Source table

These are defaults for the pilots (Bengaluru, Mumbai, Delhi, Ahmedabad, Guwahati) and the global
fallback. "Conf." is the confidence the layer is shown with. Pilots: ✓ works, ~ partial or needs work,
✗ not available.

### 2.1 The city profile

| Layer | Default source (India) | Global fallback | Resolution | Period | Licence | Conf. | Pilots |
|---|---|---|---|---|---|---|---|
| City boundary | DataMeet municipal_spatial_data (BBMP, BMC, Delhi, AMC) | geoBoundaries / OSM admin | vector | 2017 to 2023, varies | CC BY 4.0 (DataMeet); ODbL (OSM) | measured | B ~ (see wards), M ✓, D ✓, A ✓, G ✗ in DataMeet: OSM or GMC |
| Wards | DataMeet (`BBMP.geojson`, `BMC_Wards`, `Delhi_Wards`, `Ahmedabad/Wards`) | OSM admin_level 9 to 10 where mapped | vector | varies **(check vintage per city)** | CC BY 4.0 | measured | B ~ (boundaries redrawn 2023 and under the Greater Bengaluru Authority, 2025), D ~ (MCD redrawn 2022), M ✓, A ✓, G ✗ |
| Population, grid | Meta HRSL v1.5 (as now) | WorldPop constrained 100 m; GHS-POP R2023A | 30 m | 2020 | CC BY 4.0 | modelled | all ✓ |
| Population, ward | Census 2011 ward PCA (where the ward key survives), else HRSL summed to wards | HRSL or WorldPop summed | ward | 2011 / 2020 | GODL-India; CC BY 4.0 | measured (2011) / modelled | ~ in all: 2011 wards no longer match current wards |
| Density | derived: population ÷ land area (excluding water) | same | grid, ward | as population | derived | modelled | all ✓ |
| Age structure | Census 2011 (ward tables where published) | WorldPop age and sex structures 100 m | ward / 100 m | 2011 / 2020 | GODL; CC BY 4.0 | measured (2011) / modelled | ~ |
| Terrain, surface | Copernicus GLO-30 DSM | same | 30 m | 2011 to 2015 | Copernicus DEM licence (commercial use allowed, with attribution) | measured | all ✓ |
| Terrain, bare earth | FABDEM | Copernicus GLO-30 (commercial setting) | 30 m | from GLO-30 | **CC BY-NC-SA 4.0** | modelled | all ✓ |
| Terrain, Indian | CartoDEM v3 (Bhuvan) as a candidate, ranked below GLO-30 unless validation says otherwise | n/a | 30 m | 2005 to 2008 | NRSC data policy **(check redistribution)** | measured | needs a Bhuvan login |
| Drainage, valleys, catchments | derived: `landform.py` on bare earth, burned with OSM/Overture channels and India-WRIS drainage **(check access)** | same, without WRIS | 30 m → grid | as DEM | derived | modelled | all ✓ (flat Ahmedabad: valleys from mapped water only, as landform.py already does) |
| Building footprints | Overture buildings (conflated: OSM, Google Open Buildings, Microsoft) | same | vector | monthly releases | ODbL | measured (traced) / modelled (ML-detected) | all ✓ |
| Building heights | Google Open Buildings 2.5D Temporal | GHSL GHS-BUILT-H (100 m) | about 4 m effective **(check)** | 2016 to 2023, annual | CC BY 4.0 | modelled | all ✓ (it covers the Global South; the non-Indian pilot must be inside its coverage, or it falls back to GHSL) |
| Floor area ratio | derived: footprint × height ÷ 3.2 m a floor | same | grid, ward | as heights | derived | modelled (no longer one floor by default) | all ✓ |
| Open space | OSM/Overture parks + WorldCover trees and grass | same | vector / 10 m | current / 2021 | ODbL; CC BY 4.0 | measured | all ✓ |
| Land cover | ESA WorldCover 2021 | Dynamic World (annual composite, as a second opinion) | 10 m | 2021 / 2015- | CC BY 4.0 | modelled (classified) | all ✓ |
| Land cover, Indian | Bhuvan LULC 1:50k | n/a | 1:50k | 2015-16 and later cycles **(check latest)** | NRSC **(check download and redistribution)** | modelled | probably WMS view-only |
| Land use (what land is for) | OSM/Overture land use; city master plan where open | same | vector | current | ODbL | measured (where mapped) | ~ coverage varies |
| Markets, industry, institutions | Overture places + OSM | same | points | monthly | CDLA-Permissive-2.0 (places) **(check)**; ODbL | measured (incomplete) | all ~ (street markets undercounted, as the chapter already says) |
| Heritage | ASI centrally protected monuments + state lists | OSM `historic=*` | points | current | ASI site, **(check reuse)** | measured | ~ (ASI lists have names, not always coordinates) |
| Farmland in and around | WorldCover cropland + Dynamic World crops | same | 10 m | 2021 / annual | CC BY 4.0 | modelled | all ✓ |
| District crop production | DES Crop Production Statistics, district-wise (UPAg / data.desagri.gov.in) | FAO GAEZ v4 | district | annual, to 2022-23 **(check)** | GODL-India | measured (reported) | all ✓ (Indian pilots) |
| Food consumption | MoSPI HCES 2022-23, urban per-capita by state × population | FAO food balance (country) | state → city | 2022-23 | GODL-India | assumed (per-capita × people) | all ✓, hatched |
| Food waste | UNEP Food Waste Index 2024 (household, per capita) × population | same | country → city | 2022 | UNEP terms **(check)** | assumed | all ✓, hatched |
| The field (crop futures) | kept as is: ERA5 + EC-Earth3P-HR via Open-Meteo, day 13's envelopes; add NEX-GDDP ranges in phase B3 | same | 25 km | 2019 to 23; 2030, 2040 | CC BY 4.0 | modelled | all ✓ |
| Surface water | JRC Global Surface Water (occurrence, change); OSM/Overture water | same | 30 m | 1984 to 2021 | Copernicus licence (free, attribution) **(check)** | measured | all ✓ |
| Reservoirs, rivers | India-WRIS water bodies and reservoirs | HydroRIVERS; GRanD | vector | varies | India-WRIS **(check)**; HydroSHEDS licence **(check)** | measured | ✓ |
| Groundwater | CGWB well levels (India-WRIS / data.gov.in); CGWB Dynamic Ground Water Resources, block stage of extraction | WRI Aqueduct groundwater | wells; block | quarterly; assessment 2023 or 2024 **(check)** | GODL-India | measured (wells) / modelled (assessment) | all ✓ |
| Water demand | CPHEEO norm (135 lpcd; 150 lpcd for metros) × population | WHO/utility norms | ward | norm | public | assumed | all ✓, hatched |
| Supply and losses | utility publications (BWSSB, MCGM, DJB, AMC, GMDA/Guwahati) | n/a | city | as published | as published | measured (reported) | ~, entered by hand with a citation |
| Waste generation | CPCB Annual Report on SWM (state per-capita) and SBM-U city figures × population | World Bank What a Waste 2.0 | city → ward | 2020-21 to latest **(check)** | GODL-India | assumed (per capita) / reported | all ✓, hatched |
| Waste composition | CPHEEO SWM Manual 2016 ranges; city studies | What a Waste 2.0 | city | 2016 | public | assumed | ✓ |
| Processing and landfill sites | SBM-U and CPCB reports; OSM `landuse=landfill` | OSM | points | current | ODbL | measured (where mapped) | ~ |
| Power plants | Global Energy Monitor trackers | WRI Global Power Plant Database (frozen 2021) | points | 2024 to 2025 | CC BY 4.0 | measured (reported) | all ✓ |
| Clean vs fossil share | CEA installed capacity and generation by state; Ember India data | Ember | state | annual | GODL; CC BY 4.0 | measured (reported) | all ✓ |
| Rooftop solar potential | derived: Open Buildings footprints and heights + `sun.ts` shade + NASA POWER (or PVGIS-ERA5) | same | building → grid | 2020 to 23 | derived | modelled | all ✓ |
| Electricity use | state per-capita consumption (CEA General Review) × population; DISCOM data where published | night lights as proxy | state → ward | annual | GODL | assumed / proxy | all ✓, hatched |
| Night lights | VIIRS VNL annual (EOG) | same | 500 m | 2012- | CC BY 4.0 | measured (radiance), proxy for activity | all ✓ |
| Streets, space syntax | Overture/OSM streets; `syntax.py` (city) and `syntax.ts` (window) | same | segment → grid | current | ODbL | modelled | all ✓ |
| Walk time to transit | OSM stops + GTFS stops; walk along streets | same | grid | current | ODbL; per feed | modelled | all ✓ |
| Transit routes | GTFS where published: Delhi (OTD Delhi), Bengaluru (BMTC) **(check both licences and freshness)**; Mumbai, Ahmedabad, Guwahati **(check)** | Mobility Database | routes | per feed | per feed | measured | D ~, B ~, others ✗ unless found |
| Air quality, stations | CPCB CAAQMS via OpenAQ v3 | OpenAQ | points | hourly, 2016- | per provider **(check CPCB terms on OpenAQ)** | measured | all ✓ (Guwahati has few stations) |
| Air quality, NO2 | Sentinel-5P TROPOMI tropospheric NO2 | same | about 5.5 × 3.5 km | 2018- | Copernicus licence | measured (column, not ground level) | all ✓ |
| Heat, measured | Landsat 8/9 hot-season LST (`lst.py`) | same | 30 m (100 m thermal) | chosen years, hot months | public domain | measured (surface, not air) | all ✓; Guwahati and Mumbai: cloud cuts the usable scenes (lst.py already relaxes the uncertainty cut for Mumbai) |
| Heat, why | the current built-vs-green index, kept as a secondary layer | same | grid | current | derived | modelled, labelled "why", not "how hot" | all ✓ |

### 2.2 Climate trends and projections

| Layer | Source | Resolution | Period | Licence | Conf. | Pilots |
|---|---|---|---|---|---|---|
| Rainfall trend and extremes | IMD gridded daily rainfall | 0.25° | 1901 to latest | **(check IMD data policy for redistribution of derived maps)** | measured (gridded from gauges) | all ✓ |
| Temperature trend and extremes | IMD gridded daily max/min temperature | 1° | 1951 to latest | **(check)** | measured (gridded) | all ✓, but 1° (about 110 km) is coarser than a city: shown as the city's region, not inside it |
| Global fallback | ERA5 (via Open-Meteo or CDS) | 0.25° | 1940- | CC BY 4.0 | modelled (reanalysis) | non-Indian pilot |
| Projections: heat days, heavy rain | NASA NEX-GDDP-CMIP6, SSP2-4.5 and SSP5-8.5, all models available for the variable | 0.25° | 2015 to 2100 (history 1950 to 2014) | CC0 or CC BY 4.0 per model (CC0 since 2022 per the AWS registry) | modelled | all ✓ |
| Sea level | IPCC AR6 sea level projections (NASA tool), nearest tide gauge, plus vertical land motion | gauge | 2020 to 2150 | CC BY 4.0 **(check)** | modelled | M ✓; others n/a |

Projections are always shown as a **range across models** (10th to 90th percentile, with the median
marked), for two scenarios, for two horizons (2041 to 60, 2081 to 2100). Never a single line.

### 2.3 Emissions (others' estimates, side by side)

| Source | What | Resolution | Licence | Pilots |
|---|---|---|---|---|
| Climate TRACE | assets and city totals by sector | asset / city | CC BY 4.0 | all ✓ |
| EDGAR (latest release) | gridded by sector | 0.1° | CC BY 4.0 | all ✓ |
| City inventories | Mumbai Climate Action Plan (2022); Bengaluru Climate Action and Resilience Plan (2023); others **(check Delhi, Ahmedabad, Guwahati)** | city, by sector | as published | M ✓, B ✓, others **(check)** |

Shown as bars per sector, one per source, with the spread between them stated ("the three disagree by
a factor of 2.4 on transport"). Every bar is hatched and labelled "others' estimate". There is no total
of our own.

### 2.4 Risk and vulnerability

| Layer | Source | Resolution | Licence | Conf. | Pilots |
|---|---|---|---|---|---|
| River flood by return period | JRC global river flood hazard maps (10 to 500 years) | about 90 m | CC BY 4.0 **(check)** | modelled (coarse for cities) | all ~ |
| Pluvial pooling | derived: `layers.py` pooling + the wettest day from IMD and NEX-GDDP extremes | grid | derived | modelled | all ✓ |
| Observed floods | Bhuvan/NRSC flood hazard atlas (Assam); Sentinel-1 flood extents for named events | 10 m (S1) | NRSC **(check)**; Copernicus | measured (events) | G ✓ (Assam atlas); others by event |
| Extreme heat | Landsat LST + humidity (ERA5) → heat index and wet-bulb (Stull 2011) | 30 m / 25 km | derived | modelled | all ✓ |
| Water stress | CGWB stage of extraction (block) + WRI Aqueduct 4.0 | block / basin | GODL; CC BY 4.0 | modelled | all ✓ |
| Coastal flooding | Copernicus DEM + AR6 sea level + surge (as Permutation City's Mumbai site does) | 30 m | derived | modelled | M ✓; others n/a |
| Cyclones | IBTrACS tracks; IMD cyclone e-Atlas | tracks | public / IMD | measured | M ✓ (Arabian Sea), others n/a |
| Landslides | GSI national landslide susceptibility (Bhukosh) | 1:50k | GSI **(check login and licence)** | modelled | G ✓ (hill wards); others n/a |
| Population exposed | as 2.1 | | | modelled | all ✓ |
| Informal settlements | Census 2011 slum counts (ward); DataMeet Mumbai `slumClusters`; AlphaEarth classification (section 5) | ward / polygon / 10 m | GODL; CC BY 4.0 | measured (2011) / modelled | M ✓ polygons; others via AlphaEarth |
| Health care access | Overture/OSM hospitals and clinics, walk time; Health Facility Registry (NHA) **(check)** | grid | ODbL | modelled | all ✓ |
| Cooling access | tree canopy: Meta and WRI 1 m canopy height; household cooler/AC ownership: NFHS-5 district **(check that the indicator exists at district level)** | 1 m / district | CC BY 4.0; DHS terms | modelled | ~ |
| Age (over 60, under 5) | as 2.1 | | | | ~ |

The combination follows IPCC AR6: **risk = hazard × exposure × vulnerability**, per cell and per ward.
Each term is normalised (percentile within the city, as the polycrisis chapter already does for
countries), and the weights are on screen with sliders. The ward ranking re-sorts live. The default
weights are equal and are labelled "assumed". A "where the weights don't matter" view shows wards that
stay in the top 10% under every weighting in a sweep; those are the robust hotspots.

### 2.5 Where to act

- **Hotspot types**, from the risk terms: heat × density; flood × informal settlement; water stress ×
  growth; heat × age. Each type links to the families of intervention the established guides name for
  it: NDMA heat action plan guidelines; the CPHEEO and MoHUA storm-water drainage manual; NIUA's
  ClimateSmart Cities Assessment Framework; and the WRI/C40 cooling guidance **(check exact titles and
  editions)**. The links point to those guides; there is no generated strategy text.
- **Tools**: "one more of something" and "one park" become the section's tools, joined by a
  tree-lined street (canopy along a segment: shade and LST effect after the cooling literature, with
  the coefficient shown as assumed), a retention pond (a cell given to storage: pooling downstream),
  and a cool roof programme (roof albedo across a ward: an LST and indoor-heat estimate, assumed).
  Each shows its before and after with the assumptions on the card.
- **"Design this in Permutation City"**: select a hotspot or draw an area of at most 4 km² (Permutation
  City's limit; the atlas clips or warns). The button opens `permutationcity.vercel.app/new.html` with
  the polygon in the URL. Permutation City's `new.html` reads `?id=` today, but not a boundary, so this
  needs a small change there: accept `?boundary=<encoded polygon>&name=&from=climate-atlas`, prefill
  the drawing, and let the person press build. The site then builds through the existing Actions
  pipeline with the same layer library, so the layers match.

### 2.6 One building

This is kept, now with Open Buildings heights for the roof and the building's height, and `sun.ts`
shade from its neighbours (from the same heights) on the panels and the street.

---

## 3. Where the explorer lives (recommendation)

**Recommendation: a new app on Permutation City's stack (Vite, TypeScript, Svelte, MapLibre, on
Vercel), in a new repo that also holds the shared layer library. The site keeps the story page, which
links into the atlas.**

```
city-layers/                 (new repo; name to decide)
  layers/specs/*.yaml          layer specs
  layers/sources/*.yaml        source registry
  packages/layers-py/          the Python half (fetch, landform, lst, syntax, zonal), from pc/
  packages/layers-ts/          the TS half (syntax.ts, sun.ts, walk, tiles, hatch, metadata card)
  pipelines/city/              the city build (GitHub Actions → PMTiles and COGs on R2)
  apps/atlas/                  the atlas
```

Permutation City then depends on `layers-py` and `layers-ts` (git dependencies: `uv` with a git URL
and a tag; npm with a GitHub tag). Its own `pc/` modules become thin re-exports, moved over after its
Milestone A, not during it. Sama joins later the same way.

| | stay in the site repo | own repo, PC's stack (recommended) | inside the Permutation City repo |
|---|---|---|---|
| shared code | copy or vendored files: the duplication we want to end | one package, versioned | trivially shared |
| build step / TS | none today; adding Vite to Eleventy is possible but awkward | native | native |
| data hosting | GitHub Pages: 1 GB soft limit, 100 MB files, no range-request guarantees | R2 (free egress, range requests; the Cloudflare account already exists) | same as recommended |
| coupling | the portfolio's deploys carry a data app | independent deploys | atlas releases wait on PC, and PC's Milestone A work is in flight |
| story page | already there | stays on the site, links in | stays on the site |
| cost | lowest now, highest later | one more repo and Vercel project | lowest repo count, highest coupling |

The current explorer stays live at `/work/climate-code/` until the atlas reaches the same depth. Then
the page becomes the story (the question, the country chapters shortened, and the method) with a link
to "open the atlas", and the old city chapters are retired.

---

## 4. Phases and estimates

A "session" is one working session like Phase A. Each phase is one PR, with small commits.

| Phase | What | Sessions |
|---|---|---|
| B0 | Repo, layer spec and source registry formats, metadata card, hatch rule, licence switch; move `syntax`, `sun` and `lst` into the library with their tests; parity fixtures | 3 to 4 |
| B1 | City build pipeline for **Bengaluru**: boundary, wards, grid, the profile layers of 2.1 that need no login; PMTiles and COGs on R2; validation pairs | 4 to 5 |
| B2 | The atlas app: city-first first screen, zoom world → city → square, the square with live layers, the country chapters as an intro or side panel, AI notes through the existing worker | 4 to 5 |
| B3 | Climate trends (IMD) and projections (NEX-GDDP ranges); The field gets ranges | 2 to 3 |
| B4 | Emissions side by side | 1 to 2 |
| B5 | Risk and vulnerability, live weights, ward ranking, robust hotspots | 3 to 4 |
| B6 | Where to act: hotspot types, guides, the four tools, the Permutation City handoff (including the PC `new.html` change, as a PC PR) | 3 |
| B7 | AlphaEarth: informal settlements, wetlands, farmland, trees; held-out accuracy; change detection; "find places like this" | 3 to 4 |
| B8 | Exports: PNG/PDF maps, GeoTIFF/GeoJSON layers, CSV ward tables, the one-click city profile PDF | 2 to 3 |
| B9 | Mumbai, Delhi, Ahmedabad, Guwahati, and one global city: per-city ward work, coastal and hill layers, the global fallback | 5 to 8 |
| | **Total** | **30 to 41** |

At about three sessions a week, that is roughly three months from 25 November. Bengaluru on its own
is usable at the end of B2 (about 12 to 14 sessions in).

The order matters: B0 to B2 give one city end to end before breadth. B5 needs B1's layers. B7 can run
alongside B3 to B6.

---

## 5. AlphaEarth satellite embeddings

- **Data access without Earth Engine.** The annual 64-band, 10 m embeddings are also published as
  COGs outside Earth Engine (on Google Cloud Storage, and listed on the AWS Open Data registry), under
  **CC BY 4.0** with attribution to Google and Google DeepMind. Reading those files directly means
  Earth Engine's terms do not apply to the data at all. **(check)** whether the copy we read is
  requester-pays (the GCS bucket is, per the catalog page) and which years each copy holds (sources
  disagree: 2017 to 2025, or 2018 to 2024).
- **If Earth Engine is used** (it is convenient for labelling and quick tests), it is free only for
  registered **noncommercial** projects, with a monthly compute quota: the Community tier has 150
  EECU-hours. Paid or contract work needs a commercial project. So under the licence switch,
  "commercial" turns Earth Engine-computed layers off unless a commercial project is configured. The
  file-based pipeline above keeps working in both settings.
- **Classification:** a few hundred labelled points per class per city, drawn on the map in the
  atlas (a labelling mode) and stored in the repo. Train a k-NN or logistic classifier on the 64-d
  vectors and **report accuracy on held-out points** (a 70/30 split by spatial blocks, so neighbours
  don't leak), per class, on the layer's card. Classes: informal settlement, wetland, farmland, tree
  cover. Below an agreed accuracy (say 0.8 F1), the layer is not shown.
- **Change:** the cosine distance between years per pixel, thresholded and checked against JRC GSW
  for water loss and GHSL for built-up growth. It is shown as "changed between 2018 and 2024", with
  the class it changed into where the classifier is confident.
- **Find places like this:** pick a cell; the atlas ranks the city's cells by cosine similarity to it.
  This runs in the browser on a quantised (int8) copy of the city's embeddings at 150 m (about 2 MB
  for Bengaluru).
- Size: at 10 m, Bengaluru is about 7.4 million pixels × 64 bytes, about 470 MB a year. That is fine
  in the pipeline and too big for the browser, hence the 150 m copy.

---

## 6. Risks

1. **Ward boundaries.**
   - Bengaluru's wards were redrawn in 2023 and the city was reorganised under the Greater Bengaluru
     Authority in 2025, so DataMeet's file may be one or two delimitations old.
   - Delhi's MCD wards were redrawn in 2022 (from 272 to 250).
   - Guwahati is not in DataMeet.
   - Census 2011 data is keyed to 2011 wards, so joining it to current wards needs an areal
     interpolation (marked modelled).
   - Mitigation: a ward source per city with its vintage on the card; when nothing current is open,
     digitise from the corporation's published map (a manual task, logged as such).
2. **Indian official data access.** Bhuvan, Bhukosh and parts of India-WRIS need logins, serve
   view-only WMS, or have unclear redistribution terms. Deriving a layer from them and publishing the
   derivative may not be allowed. Mitigation: each is a **(check)** before B1. Where use is unclear, the
   registry ranks the source as "view in the atlas (WMS) but not export", which is a real state in the
   licence switch.
3. **IMD data terms.** IMD's gridded data is widely used in research, but its terms for redistributing
   derived maps were not confirmable while writing. If they are restrictive, the trend layers show the
   result (a trend per decade, a count of extreme days) with a link, not the gridded data.
4. **Earth Engine.** Covered in section 5. The main risk is building on Earth Engine and then losing it
   under the commercial setting. Mitigation: the file-based pipeline is the default from the start.
5. **City-scale compute.** Syntax at 10⁵ segments and landform on the 30 m city DEM are heavier than
   anything Permutation City builds today. GitHub Actions runners have 6-hour job limits and modest
   memory. Mitigation: tile the city with overlap for landform; numba for syntax; measure on Bengaluru
   in B1 before promising the other cities.
6. **Sparse or biased open data.** OSM's land use, markets and street vendors are thin in Indian
   cities, and Overture places carry the same bias. The atlas must show where a layer is thin (a
   coverage mask per layer), not only what it says.
7. **Cloud in LST.** In monsoon cities (Mumbai, Guwahati), few clear hot-season scenes. Mitigation:
   pool more years and state the scene count on the card.
8. **The 4 km² handoff limit.** Hotspots bigger than Permutation City's design limit must be cut down.
   The atlas proposes the worst 4 km² within the hotspot.
9. **Scope.** Thirty-plus sessions is a lot. If cuts are needed, I would cut, in order: B7's change
   detection and "find places like this" (keep the classification), the emissions phase (link out
   instead), and the non-Indian pilot (keep one).

---

## 7. Questions for you

1. **Where it lives:** the recommended new repo plus a shared library, or something else? And a name
   for the repo and the atlas.
2. **Space syntax radii:** change Permutation City to 800 m, 2 km and n (adding 2 km), or keep its
   400/800/n and have the atlas follow?
3. **Indian first versus most reliable:** agree with the exception rule in 1.1 (an Indian source drops
   only on a cited validation)?
4. **Default licence setting:** non-commercial by default (it lets FABDEM, and Earth Engine if used,
   in)?
5. **Ward vintages:** for Bengaluru and Delhi, current wards (more work, possibly hand-digitised) or
   the DataMeet ones with their date shown?
6. **Guwahati wards:** is there a source you know of (GMC or GMDA), or should I digitise from the
   corporation's map?
7. **The non-Indian city:** which one? It should sit inside Open Buildings 2.5D coverage so heights
   work; for example Nairobi, Jakarta, Dhaka or Lagos.
8. **Hosting:** R2 on the existing Cloudflare account for PMTiles and COGs (my recommendation), or
   Vercel Blob as Permutation City uses?
9. **Permutation City changes:** OK to plan a small PR there (boundary in the URL, radii, and later
   moving `pc/` onto the library), after its Milestone A?
10. **Uploads:** browser-only (no storage, nothing leaves the machine), or should people be able to
   save and share an atlas with their own layers? Sharing needs storage and moderation.
