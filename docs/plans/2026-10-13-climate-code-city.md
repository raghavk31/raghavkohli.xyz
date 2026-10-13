# Climate Code: the city, cell by cell (2026-10-13)

Three asks: (1) every city-scale chapter draws its data on the map, not only a pin; (2) new city layers
for energy, mobility, food, water, waste, air and buildings, after MIT City Science; (3) a legible symbology for the map
(first ASCII glyphs; replaced the same day by CityScope's tiles, see below).

## Reference: City Science (MIT Media Lab)

CityScope reads a city as a grid of cells. Each cell carries a land use and a density, and the grid is
scored live on indicators. The Volpe/Kendall study's core three are **density**, **diversity**
(the mix of uses and amenities) and **proximity** (how much of daily life is within a short walk). Its
modules add energy, mobility, noise, stormwater and access. The explorer borrows that grammar: a fixed
square grid over the place, one number per cell per layer, and a closing chapter that reads the three
together, just as chapter 10 does for countries.

## The grid

- 32 × 32 cells of 150 m (a 4.8 km square) centred on the chosen place, so the whole thing is one walkable district plus its edges.
- Built in the browser for any point on earth from **OpenFreeMap's z14 vector tiles**, the same tiles the basemap draws (OpenStreetMap through OpenMapTiles), decoded by a small MVT reader (`mvt.js`). One tile of central Bengaluru carries 4,683 building footprints with heights, 4,310 points of interest, the street network, land use, land cover and water.
- Plus **Open-Meteo**: elevation (Copernicus 90 m DEM, a 12 × 12 sample), air quality (CAMS), and the five-year archive the place chapters already read.
- Per cell: building footprint and floor area (footprint × render_height ÷ 3.2 m), street length by class, green / water / farmland cover (rasterised at 25 m), and points of interest sorted into daily needs.

## The chapters (11–25)

| # | id | layer | value per cell | points |
|---|----|-------|----------------|-------|
| 11 | p-heat | this week | heat-island proxy: paved and built share against green and water | `^` |
| 12 | c-build | buildings | floor area ratio (floor area ÷ cell area) | `#` ramp |
| 13 | c-energy | energy | share of the buildings' electricity the roofs could make (NASA irradiance × roof area vs floor area × use) | `*` |
| 14 | c-move | mobility | walking minutes to the nearest bus, rail or metro stop | `=` ramp, stops as `o` `M` |
| 15 | c-food | food | walking minutes to fresh food (grocer, market, supermarket, baker, butcher) | `%`, shops as `g` `m` |
| 16 | c-water | water | stormwater: runoff on the wettest day of 2019–23, routed downhill over the DEM; where it gathers | `~` |
| 17 | c-waste | waste | walking minutes to the nearest recycling point; public bins as `·` | `x` |
| 18 | c-air | air | traffic exposure: weighted road length within ~300 m (relative, quintiles); CAMS PM2.5 and NO₂ as the headline | `:` |
| 19 | c-near | the city, all at once | daily needs within a 5-minute walk, in five bins (0–2, 3–4, 5–6, 7, all 8); diversity and density beside it (at 10 minutes every central cell read 8) | `0`–`8` |
| 20 | p-cool | cool spots | green, water, and built cells over 10 min from either, as three categorical tiles | taps |
| 21 | p-crop | the field | a 36 km land-cover grid at 1 km (fields `≡`, woods `♣`, grass `"`, built `#`, water `~`) | |
| 22 | p-sun | the roof | rooftop yield per cell, MWh a year | `*` |
| 23 | p-water | the tank | rain the roofs could collect per cell, kL a year | `u` |
| 24 | p-grid | off-grid | the energy balance at household use | `*` |
| 25 | home | the household | the proximity tiles | |

Walking minutes = straight line × 1.3 detour ÷ 80 m a minute. Every modelled value says so in its source line.

## Symbology: CityScope's table

The first pass drew one ASCII glyph a cell; he found it illegible ("not legible data"), so the grid is now
drawn as CityScope draws its table:

- **One filled square tile a cell**, a 2px paper gap between tiles; cells with no value stay on the table as faint outlined squares, so the grid is always visible. Hovering a tile outlines it in ink and shows its numbers.
- **Colour carries the value.** Sequential layers use one blue ramp in **five classes at most**: evenly picked from step 250 → 700 on light and 600 → 100 on dark, the range whose palest step still clears 2:1 on the paper. Six or more fail the adjacent-lightness check (dataviz validator, `--ordinal`, against #FAFAF8 and #0D0D0B), so every layer was re-binned to ≤ 5.
- **Points** are 8px dots with a 2px paper ring, in the categorical palette's orange and green, never blue, so they never read as a class of the tiles.
- **Categorical tiles** (land cover around the field; cool ground) take the categorical palette's first three slots in order, plus a neutral grey for towns.
- **Country layers** went back to plain colour fills; the glyph patterns are gone.

## Not in this round

Power infrastructure (substations, plants) is not in the tiles; it needs Overpass, which refuses often. Population is not estimated: no layer pretends to know who lives where.
