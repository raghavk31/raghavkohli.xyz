"""The homepage city: one real city in plan as a character grid, for src/assets/js/city.js.

Every map is the same window, 5.6 km by 8.3 km around a centre point, cut into cells twice as tall as
they are wide (the 1:2 of a cell of IBM Plex Mono at 13/16px, so the plan is not stretched). ZOOM sets
the ground per cell: at 1, 375 x 276 cells of 15 x 30 m; at 1.5, 250 x 184 cells of 22.5 x 45 m. The
glyphs keep their size on the page, so a larger ZOOM shows more of the city at once, from the same data.
Each cell gets one letter:
  s street (major roads, at least one cell wide)   l lane (a residential street)   r rail
  0-9 A-F the river, by the way it flows (sixteenths of a turn, 0 = north, clockwise)
  a sand, a bar in the riverbed   k still water (lakes, tanks, canals)   e open water (sea, bay)
  f wood (dense trees)   g green (parks, grass)   t a tree   o open ground   b the rest of a block

Sources, cached per city outside the repo (--cache, default ~/.cache/city-maps):
  OpenStreetMap, from Overpass: streets, rail, rivers and their flow, water, parks, woods, trees.
  Sentinel-2 L2A, one cloud-free scene from Element84's public COGs: NDVI (B08, B04) for the green,
    since OSM maps little of it in Indian cities, and NDWI (B03, B08) for water, since OSM has no
    polygon for the sea and a river's real wet channel moves with the season. Inside the OSM river
    area a cell is water where the satellite saw water and sand where it saw a bar, so the banks
    are the river's own, not the embankment's.
Land more than ~75 m from any street or lane is open ground: nothing in the plan reaches it.

Usage (needs rasterio, numpy, scipy, which the site does not):
  uv run --with rasterio --with numpy --with scipy --with pillow python scripts/make-city-map.py <slug> [--png out.png]
  -> src/assets/js/cities/<slug>.txt, and the city's entry in src/assets/js/cities/index.json
"""
import json, math, sys, urllib.request, urllib.parse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

# slug: name, centre (lat, lon), scene months to search (dry season in India, leaf-on in the north)
INDIA, NORTH = ("2025-10-15", "2026-03-15"), ("2025-05-15", "2025-09-15")
CITIES = {
    "ahmedabad": ("ahmedabad", (23.125, 72.655), INDIA),   # the Sabarmati past the riverfront's walls: sandbars, a meander, the Narmada canal over it
    "agra": ("agra", (27.182, 78.033), INDIA),            # the Yamuna's bend between the fort and the Taj
    "delhi": ("delhi", (28.603, 77.254), INDIA),          # Nizamuddin, Humayun's tomb and the Yamuna floodplain
    "bangalore": ("bangalore", (12.968, 77.596), INDIA),  # Cubbon Park, Lalbagh, Ulsoor lake
    "mumbai": ("mumbai", (19.034, 72.832), INDIA),        # Worli koliwada, Mahim bay, the creek
    "amsterdam": ("amsterdam", (52.370, 4.893), NORTH),   # the canal ring and the IJ
    "san-francisco": ("san francisco", (37.787, -122.422), NORTH),
    "boston": ("boston", (42.356, -71.080), NORTH),        # the Charles between MIT and Back Bay
    "new-york": ("new york", (40.776, -73.966), NORTH),    # Central Park between two rivers
}
ZOOM = 2.0   # ground per cell, against 15 x 30 m: 2 shows a whole district on one screen
WM, HM = 375 * 15.0, 276 * 30.0   # the window, in metres
MAJOR = {"motorway": 30, "trunk": 30, "primary": 24, "secondary": 18, "tertiary": 12}
MINOR = {"residential": 7, "living_street": 5, "unclassified": 7, "pedestrian": 6}
GREEN = {"park", "garden", "nature_reserve", "common", "recreation_ground", "grass", "meadow", "village_green",
         "allotments", "plant_nursery", "farmland", "grassland", "heath", "scrub", "wetland", "cemetery", "grave_yard"}
WOOD = {"forest", "wood", "orchard"}
OPEN = {"pitch", "playground", "stadium", "golf_course", "greenfield", "brownfield", "square"}
SAND = {"sand", "bare_rock", "beach"}
UA = {"User-Agent": "raghavkohli.xyz city map (github.com/raghavk31)"}

args = sys.argv[1:]
slug = args[0]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
cache = Path(opt("--cache", Path.home() / ".cache/city-maps")); cache.mkdir(parents=True, exist_ok=True)
name, (lat, lon), months = CITIES[slug]
if opt("--at"): lat, lon = map(float, opt("--at").split(",")); slug = opt("--as", slug)   # try another window
ZOOM = float(opt("--zoom", ZOOM)); slug = opt("--as", slug)
COLS, ROWS = round(375 / ZOOM), round(276 / ZOOM)
CW, CH = WM / COLS, HM / ROWS   # metres per cell
RES = 1.5 * ZOOM                # metres per raster pixel for OSM
mx, my = 111320 * math.cos(math.radians(lat)), 110570
W, E = lon - COLS * CW / 2 / mx, lon + COLS * CW / 2 / mx
S, N = lat - ROWS * CH / 2 / my, lat + ROWS * CH / 2 / my


def fetch(url, data=None, headers={}):
    req = urllib.request.Request(url, data=data, headers={**UA, **headers})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


# ---------- OpenStreetMap ----------
key = f"{slug}-{lat:.3f},{lon:.3f}"   # a moved window downloads afresh
osm_file = cache / f"{key}-osm.json"
if not osm_file.exists():
    import time
    PARTS = [   # three asks, so a dense city stays inside Overpass's time limit
        """way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|living_street|unclassified|pedestrian)(_link)?$"]({bb});
           way["waterway"~"^(river|canal)$"]({bb}); way["railway"="rail"]({bb});""",
        """nwr["natural"~"^(water|wood|scrub|grassland|sand|beach|wetland|heath|bare_rock)$"]({bb}); nwr["waterway"="riverbank"]({bb});
           nwr["leisure"~"^(park|garden|pitch|playground|stadium|golf_course|nature_reserve|recreation_ground|common)$"]({bb});
           nwr["landuse"~"^(grass|forest|meadow|recreation_ground|village_green|cemetery|farmland|orchard|greenfield|brownfield|allotments|plant_nursery|basin|reservoir)$"]({bb});
           nwr["amenity"="grave_yard"]({bb});""",
        """node["natural"="tree"]({bb}); way["natural"="tree_row"]({bb});""",
    ]
    def ask(part, box, depth=0):
        """One part over one box; a box that keeps timing out is asked again as four quarters."""
        bb = ",".join(f"{v:.5f}" for v in box)
        for host in ("https://overpass-api.de", "https://overpass.private.coffee", "https://maps.mail.ru/osm/tools/overpass"):
            try: res = json.loads(fetch(host + "/api/interpreter", urllib.parse.urlencode({"data": "[out:json][timeout:300];(" + part.replace("{bb}", bb) + ");out geom;"}).encode()))
            except Exception as err: print("overpass", host, err); time.sleep(15); continue
            if "remark" in res: print("overpass", host, res["remark"][:80]); time.sleep(15); continue   # a timeout comes back as 200
            return res["elements"]
        if depth >= 2: sys.exit("overpass failed for " + slug)
        s_, w_, n_, e_ = box; ms, mw = (s_ + n_) / 2, (w_ + e_) / 2
        print("overpass: asking in quarters")
        return [el for q in ((s_, w_, ms, mw), (s_, mw, ms, e_), (ms, w_, n_, mw), (ms, mw, n_, e_)) for el in ask(part, q, depth + 1)]
    got, seen = [], set()
    for part in PARTS:
        for el in ask(part, (S, W, N, E)):
            if (el["type"], el["id"]) not in seen: seen.add((el["type"], el["id"])); got.append(el)
    if len(got) < 100: sys.exit("overpass returned almost nothing for " + slug)
    osm_file.write_text(json.dumps({"elements": got}), encoding="utf8")
els = json.loads(osm_file.read_text(encoding="utf8"))["elements"]

# ---------- Sentinel-2 ----------
sat_file = cache / f"{key}-s2.npz"
if not sat_file.exists():
    import rasterio
    from rasterio.warp import reproject, Resampling, transform_bounds
    from rasterio.transform import from_bounds
    body = {"collections": ["sentinel-2-l2a"], "bbox": [W, S, E, N], "datetime": f"{months[0]}T00:00:00Z/{months[1]}T00:00:00Z",
            "query": {"eo:cloud_cover": {"lt": 20}}, "limit": 100}
    items = json.loads(fetch("https://earth-search.aws.element84.com/v1/search", json.dumps(body).encode(), {"Content-Type": "application/json"}))["features"]

    def inside(px, py, poly):
        c = False
        for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
            if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1: c = not c
        return c
    def covers(it):
        g = it["geometry"]; outers = [g["coordinates"][0]] if g["type"] == "Polygon" else [p[0] for p in g["coordinates"]]
        return all(any(inside(x, y, p) for p in outers) for x, y in ((W, S), (W, N), (E, S), (E, N)))
    items = sorted([i for i in items if covers(i) and i["properties"].get("s2:nodata_pixel_percentage", 0) < 5],
                   key=lambda i: (i["properties"]["eo:cloud_cover"], -int(i["properties"]["datetime"][:10].replace("-", ""))))
    if not items: sys.exit("no cloud-free Sentinel-2 scene covers " + slug)
    it = items[0]; print("scene", it["id"], it["properties"]["eo:cloud_cover"], "% cloud")
    ow, oh = int(WM / 5), int(HM / 5)   # 5 m pixels, whatever the zoom
    dst_t = from_bounds(W, S, E, N, ow, oh)
    def band(key):
        with rasterio.open(it["assets"][key]["href"]) as src:
            l, b, r, t = transform_bounds("EPSG:4326", src.crs, W, S, E, N)
            win = src.window(l - 100, b - 100, r + 100, t + 100)
            out = np.zeros((oh, ow), "float32")
            reproject(src.read(1, window=win).astype("float32"), out, src_transform=src.window_transform(win), src_crs=src.crs,
                      dst_transform=dst_t, dst_crs="EPSG:4326", resampling=Resampling.bilinear)
            return out
    red, green, nir = band("red"), band("green"), band("nir")
    np.savez_compressed(sat_file, ndvi=(nir - red) / np.maximum(nir + red, 1), ndwi=(green - nir) / np.maximum(green + nir, 1), scene=it["id"])
sat = np.load(sat_file)
if sat["ndvi"].shape != (ROWS * 6, COLS * 3):   # 3 x 6 pixels to a cell
    sat = {k: ndimage.zoom(sat[k], (ROWS * 6 / sat[k].shape[0], COLS * 3 / sat[k].shape[1]), order=1) if k != "scene" else sat[k] for k in sat.files}
cells = lambda a: a.reshape(ROWS, 6, COLS, 3).transpose(0, 2, 1, 3).reshape(ROWS, COLS, 18)   # 3 x 6 pixels to a cell
ndvi, ndwi = cells(sat["ndvi"]), cells(sat["ndwi"])

# ---------- rasterise OSM ----------
pw, ph = int(COLS * CW / RES), int(ROWS * CH / RES)
layers = {k: Image.new("L", (pw, ph), 0) for k in "slwkfgtaor"}
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
    if t.get("waterway") == "riverbank" or (t.get("natural") == "water" and t.get("water") in ("river", "oxbow")): return "w"
    if t.get("natural") == "water" or t.get("landuse") in ("basin", "reservoir"): return "k"
    vals = {t.get("leisure"), t.get("landuse"), t.get("natural"), t.get("amenity")}
    if vals & WOOD: return "f"
    if vals & GREEN: return "g"
    if vals & SAND: return "a"
    if vals & OPEN: return "o"
    return None


flow = []   # river centre lines, drawn downstream: (x0, y0, x1, y1) in metres
for e in els:
    t, g = e.get("tags", {}), e.get("geometry")
    if e["type"] == "node":
        if t.get("natural") == "tree": draw["t"].point(pt([e])[0], fill=255)
        continue
    k = kind(t)
    if e["type"] == "relation":
        if k:
            r = rings(e.get("members", []))
            for ring in r["outer"]: draw[k].polygon(pt(ring), fill=255)
            for ring in r["inner"]: draw[k].polygon(pt(ring), fill=0)
        continue
    if not g or len(g) < 2: continue
    hw = t.get("highway", "").replace("_link", "")
    if k and len(g) > 2 and g[0] == g[-1]:
        draw[k].polygon(pt(g), fill=255)
    elif hw in MAJOR:
        draw["s"].line(pt(g), fill=255, width=px(max(MAJOR[hw], CW * 1.05)), joint="curve")
    elif hw in MINOR:
        draw["l"].line(pt(g), fill=255, width=px(MINOR[hw] * 1.6), joint="curve")
    elif t.get("waterway") == "river":
        p = [(x * RES, y * RES) for x, y in pt(g)]
        flow += [(a[0], a[1], b[0], b[1]) for a, b in zip(p, p[1:])]
    elif t.get("waterway") == "canal":
        draw["k"].line(pt(g), fill=255, width=px(12))
    elif t.get("natural") == "tree_row":
        draw["t"].line(pt(g), fill=255, width=px(4))
    elif t.get("railway") == "rail":
        draw["r"].line(pt(g), fill=255, width=px(8))

cov = {k: np.asarray(v.resize((COLS, ROWS), Image.BOX), "float32") / 255 for k, v in layers.items()}

# ---------- water ----------
wet = (ndwi > 0.05).mean(2)                     # share of the cell the satellite saw as water
river = cov["w"] > .4
if flow and river.sum() < 50:                   # no riverbank polygon: the river is wherever the satellite saw water near its line
    near = Image.new("L", (COLS, ROWS), 0); d = ImageDraw.Draw(near)
    for x0, y0, x1, y1 in flow: d.line([(x0 / CW, y0 / CH), (x1 / CW, y1 / CH)], fill=255, width=3)
    near = ndimage.binary_dilation(np.asarray(near) > 0, iterations=round(12 / ZOOM))
    river = near & (wet > .3)
    lab, n = ndimage.label(river); keep = {lab[int(y0 / CH), int(x0 / CW)] for x0, y0, _, _ in flow if 0 <= y0 / CH < ROWS and 0 <= x0 / CW < COLS}
    river = np.isin(lab, [k for k in keep if k])
still = (cov["k"] > .45) & ~river
lab, n = ndimage.label((wet > .5) & ~river & ~still)
sizes = ndimage.sum(np.ones_like(lab), lab, range(n + 1))
sea = (sizes[lab] >= 400 / ZOOM ** 2) & (lab > 0)          # big water OSM doesn't draw: the sea, a bay, a wide creek
still |= (wet > .5) & (cov["k"] > .1) & ~river & ~sea

# the way each river cell flows: the direction of the nearest piece of centre line
if flow and river.any():
    seg = np.full((ROWS, COLS), -1, "int32"); im = Image.new("I", (COLS, ROWS), -1); d = ImageDraw.Draw(im)
    for i, (x0, y0, x1, y1) in enumerate(flow): d.line([(x0 / CW, y0 / CH), (x1 / CW, y1 / CH)], fill=i, width=1)
    seg = np.asarray(im)
    _, (iy, ix) = ndimage.distance_transform_edt(seg < 0, sampling=(CH, CW), return_indices=True)
    nearest = seg[iy, ix]
    ang = np.array([math.atan2(x1 - x0, -(y1 - y0)) for x0, y0, x1, y1 in flow])   # 0 = north, clockwise
    sixteenth = np.round(ang[nearest] / (2 * math.pi) * 16).astype(int) % 16
else:
    sixteenth = np.zeros((ROWS, COLS), int)

# ---------- reach: land more than ~75 m from a street or lane is open ground ----------
roads = (cov["s"] > .24) | (cov["l"] > .3)
reach = ndimage.distance_transform_edt(~roads, sampling=(CH, CW)) <= 75

HEX = "0123456789ABCDEF"
tf, mean = (ndvi > .4).mean(2), ndvi.mean(2)   # share of the cell in trees, and how green it is overall
out = []
for y in range(ROWS):
    line = []
    for x in range(COLS):
        c = {k: v[y, x] for k, v in cov.items()}
        wat = river[y, x] or still[y, x] or sea[y, x]
        if c["s"] > (.25 if wat else .4): ch = "s"   # a street, a bridge
        elif river[y, x]: ch = HEX[sixteenth[y, x]] if wet[y, x] > .3 else "a"
        elif still[y, x]: ch = "k"
        elif sea[y, x]: ch = "e"
        elif c["r"] > .15: ch = "r"
        elif c["l"] > .25: ch = "l"   # a lane stays a lane under its trees: city.js walks along s and l
        else:
            ch = ("f" if c["f"] > .5 else "g" if c["g"] > .5 else "a" if c["a"] > .5 else "o" if c["o"] > .5 else
                  "b" if reach[y, x] else "o")
            if c["t"] > 0 and ch in "bgo": ch = "t"
        if ch in "bgoa":
            ch = "f" if tf[y, x] > .55 else "t" if tf[y, x] > .25 else "g" if mean[y, x] > .3 and ch != "a" else ch
        line.append(ch)
    out.append("".join(line))

dst = Path(__file__).resolve().parent.parent / "src/assets/js/cities"
dst.mkdir(exist_ok=True)
(dst / f"{slug}.txt").write_text("\n".join(out), encoding="utf8")

# ---------- fields, for the mockups in city.js (?look=): how green and how wet each cell is (0-9), and the ground's height ----------
# Height is Copernicus GLO-30, a surface model (it sees roofs and canopy), so it is smoothed to the lie of the land, ~250 m.
dem_file = cache / f"{key}-dem.npy"
if not dem_file.exists():
    import rasterio
    from rasterio.warp import reproject, Resampling
    from rasterio.transform import from_bounds
    dem = np.full((ROWS * 2, COLS * 2), np.nan, "float32")
    for la in range(math.floor(S), math.floor(N) + 1):
        for lo in range(math.floor(W), math.floor(E) + 1):
            t_ = f"Copernicus_DSM_COG_10_{'N' if la >= 0 else 'S'}{abs(la):02d}_00_{'E' if lo >= 0 else 'W'}{abs(lo):03d}_00_DEM"
            try:
                with rasterio.open(f"https://copernicus-dem-30m.s3.amazonaws.com/{t_}/{t_}.tif") as src:
                    part = np.full(dem.shape, np.nan, "float32")
                    reproject(rasterio.band(src, 1), part, dst_transform=from_bounds(W, S, E, N, COLS * 2, ROWS * 2), dst_crs="EPSG:4326",
                              dst_nodata=np.nan, resampling=Resampling.bilinear)
                    dem = np.where(np.isnan(dem), part, dem)
            except Exception as err: print("dem", t_, err)   # a tile over open sea does not exist
    np.save(dem_file, dem)
dem = np.load(dem_file)
dem = np.nan_to_num(dem, nan=0.0)
dem = ndimage.zoom(dem, (ROWS / dem.shape[0], COLS / dem.shape[1]), order=1)
dem = ndimage.gaussian_filter(dem, sigma=(250 / CH, 250 / CW))
lvl = lambda a: ["".join(str(int(v)) for v in r) for r in np.clip(np.round(a * 9), 0, 9)]
# height as two base-64 characters a cell, 4096 steps from the lowest to the highest point: z = z0 + n / 4095 * (z1 - z0)
B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
z0, z1 = float(dem.min()), float(dem.max())
zq = np.round((dem - z0) / max(z1 - z0, 1e-6) * 4095).astype(int)
fields = {"g": lvl((mean - .1) / .55), "w": lvl(wet), "z0": round(z0, 2), "z1": round(z1, 2),
          "z": ["".join(B64[v >> 6] + B64[v & 63] for v in r) for r in zq]}
(dst / f"{slug}.f.json").write_text(json.dumps(fields, separators=(",", ":")), encoding="utf8")
print("height", round(float(dem.min()), 1), "to", round(float(dem.max()), 1), "m")
if opt("--png"):   # a quick look, for checking a window before it goes on the page
    pal = {"s": (250, 250, 248), "l": (200, 198, 190), "r": (120, 120, 120), "b": (175, 172, 164), "o": (232, 230, 222),
           "a": (222, 205, 160), "k": (90, 120, 190), "e": (70, 100, 170), "f": (40, 100, 50), "g": (150, 190, 130), "t": (80, 140, 80)}
    img = Image.new("RGB", (COLS, ROWS))
    img.putdata([pal.get(ch, (60, 88, 150)) for r in out for ch in r])
    img.resize((COLS * 2, ROWS * 4), Image.NEAREST).save(opt("--png"))

# where a narrow screen should look: the river if there is one, else the shore, else the middle
shore = sea & ndimage.binary_dilation(~(sea | river | still), iterations=2)
wx = np.nonzero(river)[1] if river.sum() > 1000 / ZOOM ** 2 else np.nonzero(shore)[1] if shore.sum() > 200 / ZOOM else []
fx = round(float(np.median(wx)) / COLS, 3) if len(wx) else .5
if slug not in CITIES: sys.exit(print("trial", slug, "->", dst / f"{slug}.txt"))
idx_file = dst / "index.json"
idx = json.loads(idx_file.read_text(encoding="utf8")) if idx_file.exists() else []
idx = [c for c in idx if c["slug"] != slug] + [{"slug": slug, "name": name, "lat": lat, "lon": lon, "fx": fx}]
idx.sort(key=lambda c: list(CITIES).index(c["slug"]))
idx_file.write_text(json.dumps(idx, indent=1), encoding="utf8")
counts = {k: sum(r.count(k) for r in out) for k in "slr" + "akeftgob"}
counts["river"] = sum(sum(ch in HEX for ch in r) for r in out)
print(slug, COLS, "x", ROWS, str(sat["scene"]), counts)

