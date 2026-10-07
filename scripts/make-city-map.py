"""Ahmedabad along the Sabarmati, as a character grid for the homepage city (src/assets/js/city.js).

One character cell is 15 m across and 30 m down, the same 1:2 as a cell of IBM Plex Mono at 13/16px,
so the plan is not stretched. Each cell gets one letter:
  s street (major roads, drawn at least one cell wide)   l lane (a residential street)
  w water   p park   r rail   h mapped building   b the rest of a block
OSM's building coverage in Ahmedabad is patchy (the walled city is mostly unmapped), so `h` is only a
hint on top of `b`; city.js decides how much to show it.

The river polygon was not in the download, so the Sabarmati is drawn from its centre line at the
riverfront channel's width (about 275 m, measured between the embankment roads).

Usage:
  1. Download the OSM ways (Overpass, ~14 MB) to a scratch file, outside the repo:
       [out:json][timeout:170];(way["building"](S,W,N,E);way["highway"](S,W,N,E);
       way["natural"="water"](S,W,N,E);way["waterway"](S,W,N,E);way["leisure"="park"](S,W,N,E);
       way["railway"="rail"](S,W,N,E););out geom;
     with S,W,N,E = 22.99,72.555,23.065,72.61
  2. python scripts/make-city-map.py <that.json>   ->  src/assets/js/city-ahmedabad.txt
"""
import json, math, sys
from pathlib import Path
from PIL import Image, ImageDraw

S, N, W, E = 22.99, 23.065, 72.555, 72.61
CW, CH = 15.0, 30.0           # metres per cell
RES = 1.5                     # metres per raster pixel
RIVER_W = 275
MAJOR = {"motorway": 30, "trunk": 30, "primary": 24, "secondary": 18, "tertiary": 12}
MINOR = {"residential": 7, "living_street": 5, "unclassified": 7, "pedestrian": 6}

mx, my = 111320 * math.cos(math.radians((S + N) / 2)), 110570
wm, hm = (E - W) * mx, (N - S) * my
cols, rows = int(wm // CW), int(hm // CH)
pw, ph = int(cols * CW / RES), int(rows * CH / RES)
layers = {k: Image.new("L", (pw, ph), 0) for k in "slwprh"}
draw = {k: ImageDraw.Draw(v) for k, v in layers.items()}
pt = lambda g: [((p["lon"] - W) * mx / RES, (N - p["lat"]) * my / RES) for p in g]
px = lambda m: max(1, round(m / RES))

for e in json.load(open(sys.argv[1], encoding="utf8"))["elements"]:
    t, g = e.get("tags", {}), e.get("geometry")
    if not g or len(g) < 2:
        continue
    hw = t.get("highway", "").replace("_link", "")
    if "building" in t and len(g) > 2:
        draw["h"].polygon(pt(g), fill=255)
    elif hw in MAJOR:   # at least a cell wide, so every major road reads as a street
        draw["s"].line(pt(g), fill=255, width=px(max(MAJOR[hw], CW * 1.05)), joint="curve")
    elif hw in MINOR:
        draw["l"].line(pt(g), fill=255, width=px(MINOR[hw] * 1.6), joint="curve")
    elif t.get("waterway") == "river":
        draw["w"].line(pt(g), fill=255, width=px(RIVER_W), joint="curve")
    elif t.get("natural") == "water" and len(g) > 2:
        draw["w"].polygon(pt(g), fill=255)
    elif t.get("leisure") == "park" and len(g) > 2:
        draw["p"].polygon(pt(g), fill=255)
    elif t.get("railway") == "rail":
        draw["r"].line(pt(g), fill=255, width=px(8))

cov = {k: v.resize((cols, rows), Image.BOX).load() for k, v in layers.items()}
out = []
for y in range(rows):
    line = []
    for x in range(cols):
        c = {k: cov[k][x, y] / 255 for k in cov}
        line.append("w" if c["w"] > .45 else "s" if c["s"] > .4 else "r" if c["r"] > .15 else
                    "p" if c["p"] > .5 else "l" if c["l"] > .3 else "h" if c["h"] > .3 else "b")
    out.append("".join(line))
dst = Path(__file__).resolve().parent.parent / "src/assets/js/city-ahmedabad.txt"
dst.write_text("\n".join(out), encoding="utf8")
print(cols, "x", rows, "->", dst)
