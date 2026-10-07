"""Ahmedabad along the Sabarmati, as a character grid for the homepage city (src/assets/js/city.js).

One character cell is 15 m across and 30 m down, the same 1:2 as a cell of IBM Plex Mono at 13/16px,
so the plan is not stretched. Each cell gets one letter:
  s street (major roads, at least one cell wide)   l lane (a residential street, stays inside the block)
  w the river   k still water (lakes, tanks)   f wood (dense trees)   g green (parks, gardens, grass)
  t a mapped tree   a sand   o open ground (pitches, squares, vacant land)   r rail
  h mapped building   b the rest of a block
OSM's building coverage in Ahmedabad is patchy (the walled city is mostly unmapped), so `h` is only a
hint on top of `b`. Trees and grass come mostly from the satellite (--ndvi, made by
scripts/fetch-city-ndvi.py), since OSM maps little of the city's green: a block cell where over 55%
of the 5 m pixels have NDVI > .4 is wood, over 25% has trees, and a mean NDVI over .3 is grass.
Land more than ~75 m from any street or lane is taken to be open ground: it is
where the plan has nothing to reach it.

The river is the OSM water polygon when the download has one; otherwise its centre line at the
riverfront channel's width (about 275 m).

Usage:
  1. Download OSM data (Overpass, out geom) for S,W,N,E = 22.99,72.555,23.065,72.61 to scratch files
     outside the repo, any split you like:
       way["building"]; way["highway"]; way["waterway"]; way["railway"="rail"];
       nwr["natural"~"water|wood|scrub|grassland|sand|wetland|heath|bare_rock"]; nwr["waterway"="riverbank"];
       nwr["leisure"~"park|garden|pitch|playground|stadium|golf_course|nature_reserve|recreation_ground|common"];
       nwr["landuse"~"grass|forest|meadow|recreation_ground|village_green|cemetery|farmland|orchard|
                      greenfield|brownfield|allotments|plant_nursery"]; nwr["amenity"="grave_yard"];
       node["natural"="tree"]; way["natural"="tree_row"]
  2. uv run --with rasterio --with numpy python scripts/fetch-city-ndvi.py ndvi.png
  3. python scripts/make-city-map.py a.json [b.json ...] [--ndvi ndvi.png]   ->  src/assets/js/city-ahmedabad.txt
"""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

S, N, W, E = 22.99, 23.065, 72.555, 72.61
CW, CH = 15.0, 30.0           # metres per cell
RES = 1.5                     # metres per raster pixel
RIVER_W = 275
MAJOR = {"motorway": 30, "trunk": 30, "primary": 24, "secondary": 18, "tertiary": 12}
MINOR = {"residential": 7, "living_street": 5, "unclassified": 7, "pedestrian": 6}
GREEN = {"park", "garden", "nature_reserve", "common", "recreation_ground", "grass", "meadow", "village_green",
         "allotments", "plant_nursery", "farmland", "grassland", "heath", "scrub", "wetland", "cemetery", "grave_yard"}
WOOD = {"forest", "wood", "orchard"}
OPEN = {"pitch", "playground", "stadium", "golf_course", "greenfield", "brownfield", "square"}
SAND = {"sand", "bare_rock"}

mx, my = 111320 * math.cos(math.radians((S + N) / 2)), 110570
cols, rows = int((E - W) * mx // CW), int((N - S) * my // CH)
pw, ph = int(cols * CW / RES), int(rows * CH / RES)
layers = {k: Image.new("L", (pw, ph), 0) for k in "slwkfgtaorh"}
draw = {k: ImageDraw.Draw(v) for k, v in layers.items()}
pt = lambda g: [((p["lon"] - W) * mx / RES, (N - p["lat"]) * my / RES) for p in g]
px = lambda m: max(1, round(m / RES))


def rings(members):
    """Join a multipolygon's member ways into closed rings, by role."""
    out = {"outer": [], "inner": []}
    for role in out:
        segs = [m["geometry"] for m in members if m.get("type") == "way" and m.get("geometry") and (m.get("role") or "outer") == role]
        while segs:
            ring = list(segs.pop())
            grown = True
            while grown and ring[0] != ring[-1]:
                grown = False
                for i, sg in enumerate(segs):
                    if sg[0] == ring[-1]: ring += sg[1:]
                    elif sg[-1] == ring[-1]: ring += sg[-2::-1]
                    elif sg[-1] == ring[0]: ring = sg[:-1] + ring
                    elif sg[0] == ring[0]: ring = sg[:0:-1] + ring
                    else: continue
                    segs.pop(i); grown = True; break
            if len(ring) > 2: out[role].append(ring)
    return out


def kind(t):
    if t.get("waterway") == "riverbank" or (t.get("natural") == "water" and t.get("water") == "river"): return "w"
    if t.get("natural") == "water": return "k"
    vals = {t.get("leisure"), t.get("landuse"), t.get("natural"), t.get("amenity"), t.get("place")}
    if vals & WOOD: return "f"
    if vals & GREEN: return "g"
    if vals & SAND: return "a"
    if vals & OPEN: return "o"
    return None


args = sys.argv[1:]
ndvi = None
if "--ndvi" in args:
    i = args.index("--ndvi"); ndvi = Image.open(args[i + 1]).convert("L"); del args[i:i + 2]
    ndvi = ndvi.resize((cols * 3, rows * 6), Image.BILINEAR).load()   # 5 m pixels, 3 x 6 to a cell

seen, els = set(), []
for f in args:
    for e in json.load(open(f, encoding="utf8"))["elements"]:
        if (e["type"], e["id"]) not in seen:
            seen.add((e["type"], e["id"])); els.append(e)

river_poly = any(kind(e.get("tags", {})) == "w" for e in els)
for e in els:
    t, g = e.get("tags", {}), e.get("geometry")
    if e["type"] == "node":
        if t.get("natural") == "tree":
            draw["t"].point(pt([e])[0], fill=255)
        continue
    k = kind(t)
    if e["type"] == "relation":
        if k:
            r = rings(e.get("members", []))
            for ring in r["outer"]: draw[k].polygon(pt(ring), fill=255)
            for ring in r["inner"]: draw[k].polygon(pt(ring), fill=0)
        continue
    if not g or len(g) < 2:
        continue
    hw = t.get("highway", "").replace("_link", "")
    if k and len(g) > 2 and g[0] == g[-1]:
        draw[k].polygon(pt(g), fill=255)
    elif "building" in t and len(g) > 2:
        draw["h"].polygon(pt(g), fill=255)
    elif hw in MAJOR:
        draw["s"].line(pt(g), fill=255, width=px(max(MAJOR[hw], CW * 1.05)), joint="curve")
    elif hw in MINOR:
        draw["l"].line(pt(g), fill=255, width=px(MINOR[hw] * 1.6), joint="curve")
    elif t.get("waterway") == "river" and not river_poly:
        draw["w"].line(pt(g), fill=255, width=px(RIVER_W), joint="curve")
    elif t.get("natural") == "tree_row":
        draw["t"].line(pt(g), fill=255, width=px(4))
    elif t.get("railway") == "rail":
        draw["r"].line(pt(g), fill=255, width=px(8))

# how far each cell is from a street or lane: square pixels of 15 m, a 11-px max filter = 75 m each way
reach = Image.new("L", (cols, rows * 2), 0)
cov = {k: v.resize((cols, rows), Image.BOX).load() for k, v in layers.items()}
rd = reach.load()
for y in range(rows):
    for x in range(cols):
        if cov["s"][x, y] > 60 or cov["l"][x, y] > 40: rd[x, 2 * y] = rd[x, 2 * y + 1] = 255
reach = reach.filter(ImageFilter.MaxFilter(11)).resize((cols, rows), Image.BOX).load()

out = []
for y in range(rows):
    line = []
    for x in range(cols):
        c = {k: cov[k][x, y] / 255 for k in cov}
        land = ("f" if c["f"] > .5 else "g" if c["g"] > .5 else "a" if c["a"] > .5 else "o" if c["o"] > .5 else None)
        ch = ("s" if c["s"] > .6 and c["w"] > .45 else   # a bridge
              "w" if c["w"] > .45 else "k" if c["k"] > .45 else "s" if c["s"] > .4 else "r" if c["r"] > .15 else
              land or ("l" if c["l"] > .3 else "h" if c["h"] > .3 else "o" if reach[x, y] < 40 else "b"))
        if c["t"] > 0 and ch in "bglo": ch = "t"
        if ndvi and ch in "bglo":
            vs = [ndvi[3 * x + i, 6 * y + j] for i in range(3) for j in range(6)]
            tf, mean = sum(v > 178 for v in vs) / 18, sum(vs) / 18   # 178 = NDVI .4, 166 = .3
            ch = "f" if tf > .55 else "t" if tf > .25 else "g" if mean > 166 and ch != "l" else ch
        line.append(ch)
    out.append("".join(line))
dst = Path(__file__).resolve().parent.parent / "src/assets/js/city-ahmedabad.txt"
dst.write_text("\n".join(out), encoding="utf8")
counts = {k: sum(r.count(k) for r in out) for k in "slwkfgtaorhb"}
print(cols, "x", rows, "river polygon" if river_poly else "river from centre line", counts)
