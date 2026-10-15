/* grid.js — the city as a grid of cells, after MIT City Science's CityScope: a fixed square grid laid over
   the place, every cell carrying what is built on it, what grows on it, what runs through it and what
   can be reached from it. Built in the browser for any point on earth from OpenFreeMap's vector tiles
   (OpenStreetMap through OpenMapTiles, the same tiles the basemap draws) and Open-Meteo's elevation.

   cityGrid(place) → { n, size, lat, lon, x0, y0, step, ...per-cell Float32Arrays, pts: {kind: [[col,row,name]]} }
   Cells are indexed i = row * n + col, row 0 at the north. Column/row coordinates are in cell units. */
import { getTile } from "./mvt.js";

const EARTH = 40075016.686;
const merc = (lon, lat) => [(lon + 180) / 360, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2];
const unmerc = (x, y) => [x * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI];

/* what a cell can reach: the point kinds, by OpenMapTiles poi class / subclass */
const KIND = (c, s) => {
  if (c === "bus" || s === "bus_stop" || s === "bus_station" || s === "tram_stop" || s === "subway_entrance" || s === "ferry_terminal") return "transit";
  if (c === "railway" || s === "station" || s === "halt" || s === "subway") return "rail";
  if (c === "grocery" || s === "marketplace" || s === "greengrocer" || s === "supermarket" || s === "butcher" || c === "bakery" || s === "convenience" || s === "deli") return "food";
  if (c === "restaurant" || c === "fast_food" || c === "cafe" || c === "bar" || c === "beer" || c === "ice_cream") return "eat";
  if (c === "hospital" || c === "pharmacy" || c === "dentist" || s === "doctors" || s === "clinic") return "health";
  if (c === "school" || c === "college" || s === "kindergarten" || s === "university") return "school";
  if (c === "library" || c === "town_hall" || c === "post" || c === "place_of_worship" || c === "theatre" || c === "cinema" || c === "museum"
    || s === "community_centre" || c === "police" || s === "fire_station") return "civic";
  if (c === "park" || c === "garden" || c === "playground" || c === "dog_park" || c === "picnic_site") return "green";
  if (s === "recycling" || s === "waste_disposal") return "recycle";
  if (s === "waste_basket") return "bin";
  if (s === "drinking_water" || c === "drinking_water" || s === "water_point") return "tap";
  if (c === "fuel") return "fuel";
  if (s === "charging_station") return "charge";
  if (c === "shop" || c === "clothing_store" || c === "alcohol_shop" || c === "jewelry" || c === "furniture" || c === "electronics"
    || c === "hairdresser" || c === "laundry" || c === "atm" || c === "bank") return "shop";
  return null;
};
/* the classes counted for diversity: everything a person goes to, not gates, bollards and car parks */
const NOT_A_PLACE = new Set(["gate", "lift_gate", "bollard", "entrance", "parking", "motorcycle_parking", "bicycle_parking", "information",
  "waste_basket", "toilets", "telephone", "cycle_barrier", "shelter", "atm", "art_gallery"]);
const ROAD = { motorway: 0, trunk: 0, primary: 0, secondary: 1, tertiary: 1, minor: 2, service: 2, path: 3, track: 3 };
const ROAD_W = [20, 12, 7, 3];   // a typical paved width, metres, per road group
const GREEN = new Set(["grass", "wood", "forest", "park", "scrub", "wetland", "meadow", "garden", "recreation_ground", "shrubbery", "allotments", "village_green"]);

/* the place names worth printing on the grid: suburbs before neighbourhoods, at most five, never crowding */
const PLACE_RANK = { suburb: 1, quarter: 2, neighbourhood: 3, town: 1, village: 2 };
function namesToShow(all, most = 5, apart = 7) {
  const out = [];
  for (const p of all.sort((a, b) => a.k - b.k)) {
    if (out.length >= most) break;
    if (out.some((o) => o.name === p.name || Math.hypot(o.c - p.c, o.r - p.r) < apart)) continue;
    out.push(p);
  }
  return out;
}

/* the window every city and place chapter reads: 150 m cells, as on CityScope's table, and a square of
   n cells a side that the reader can drag and resize on the map (16–64 cells, 2.4–9.6 km) */
export const GRID = { n: 32, size: 150 };
export const SIZES = { min: 16, max: 64, step: 8 };
/* the streets space syntax reads: the drivable and walkable network, not service lanes, tracks or paths */
const STREET = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "minor"]);
/* land use, by OpenMapTiles landuse class */
const USE = { residential: "res", commercial: "work", retail: "work", industrial: "industry", railway: "industry", quarry: "industry",
  school: "inst", university: "inst", college: "inst", kindergarten: "inst", hospital: "inst", library: "inst", religious: "inst", military: "inst" };
/* the part of a segment a-b that lies inside the square 0..e (Liang–Barsky), or null */
function clipTo(a, b, e) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0]], [dx, e - a[0]], [-dy, a[1]], [dy, e - a[1]]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
}

const grids = new Map();
export function cityGrid(p, { n = 32, size = 150, z = 14 } = {}) {
  const key = `${p.lat.toFixed(4)},${p.lon.toFixed(4)},${n},${size},${z}`;
  if (!grids.has(key)) grids.set(key, build(p, n, size, z).catch((e) => { grids.delete(key); throw e; }));
  return grids.get(key);
}

async function build(p, n, size, z) {
  const cos = Math.cos(p.lat * Math.PI / 180);
  const step = size / (EARTH * cos);              // a cell, in mercator units (0..1 across the world)
  const [cx, cy] = merc(p.lon, p.lat);
  const x0 = cx - step * n / 2, y0 = cy - step * n / 2;
  const N = n * n, A = size * size;
  const G = { n, size, lat: p.lat, lon: p.lon, x0, y0, step, area: A,
    corner: (c, r) => unmerc(x0 + c * step, y0 + r * step),           // [lon, lat] of a cell-space point
    at: (lon, lat) => { const [x, y] = merc(lon, lat); return [(x - x0) / step, (y - y0) / step]; },   // and back
    foot: new Float32Array(N), floor: new Float32Array(N), height: new Float32Array(N), bcount: new Float32Array(N),
    roof: new Float32Array(N),
    road: [0, 1, 2, 3].map(() => new Float32Array(N)), rail: new Float32Array(N),
    green: new Float32Array(N), water: new Float32Array(N), farm: new Float32Array(N), built: new Float32Array(N),
    pts: {}, classes: [], tilesRead: 0, tilesMissed: 0,
    // the margin: 1 km of map read all round the window, so a cell at its edge still sees the shop, the stop
    // and the street just past it. Points there are kept apart (ptsOut) and only used for distances.
    M: Math.ceil(1000 / size), ptsOut: {},
    // what the city is read by, kept as drawn geometry in cell units so tiles.js can ink it over the grid:
    // main roads [group, line], rail and metro lines, drains and streams, water [tile clip, rings], place names
    ink: { roads: [], rail: [], waterway: [], water: [] }, places: [],
    // every street, cut at the tile edges so the network joins up again across them (space syntax, syntax.js)
    streets: [],
    res: new Float32Array(N), work: new Float32Array(N), industry: new Float32Array(N), inst: new Float32Array(N) };

  // the tiles that cover the window and its margin
  const Mg = Math.ceil(1000 / size), T = 2 ** z;
  const tx0 = Math.floor((x0 - step * Mg) * T), tx1 = Math.floor((x0 + step * (n + Mg)) * T), ty0 = Math.floor((y0 - step * Mg) * T), ty1 = Math.floor((y0 + step * (n + Mg)) * T);
  const jobs = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push([tx, ty]);
  const layers = ["building", "poi", "transportation", "landcover", "landuse", "park", "water", "waterway", "place"];
  const read = await Promise.allSettled(jobs.map(([tx, ty]) => getTile(z, tx, ty, layers)));

  // cover rasters at R sub-pixels a cell, so a park's edge lands where it is, not on a whole cell
  const R = 6, W = n * R;
  const raster = () => { const c = new OffscreenCanvas(W, W), g = c.getContext("2d", { willReadFrequently: true }); g.fillStyle = "#000"; return [c, g]; };
  const cover = { green: raster(), water: raster(), farm: raster(), built: raster(), res: raster(), work: raster(), industry: raster(), inst: raster() };
  const classCount = new Map();

  read.forEach((res, k) => {
    if (res.status !== "fulfilled") { G.tilesMissed++; return; }
    G.tilesRead++;
    const [tx, ty] = jobs[k], L = res.value;
    const ex = (L.building?.[0] || L.poi?.[0] || L.transportation?.[0])?.extent || 4096;
    // tile units → cell units
    const sx = 1 / (ex * T * step), ox = (tx / T - x0) / step, oy = (ty / T - y0) / step;
    const cc = (q) => [ox + q[0] * sx, oy + q[1] * sx];
    const inside = (q) => q[0] >= 0 && q[0] < ex && q[1] >= 0 && q[1] < ex;   // the tile's buffer belongs to its neighbour
    const cell = (c, r) => (c >= 0 && c < n && r >= 0 && r < n ? (r | 0) * n + (c | 0) : -1);

    // OpenFreeMap merges the buildings of a tile that share a height into one feature: split it back into
    // polygons (an outer ring, then the holes that follow it) and give each its own cell
    for (const f of L.building || []) {
      const h = +f.props.render_height || 0, floors = Math.max(1, Math.round(h / 3.2));
      const polys = [];
      for (const ring of f.rings) {
        let s2 = 0;
        for (let i = 0; i < ring.length - 1; i++) s2 += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
        if (s2 > 0 || !polys.length) polys.push({ a: s2 / 2, ring });   // MVT outer rings wind positive in tile space
        else polys[polys.length - 1].a += s2 / 2;
      }
      for (const { a, ring } of polys) {
        let mx = 0, my = 0;
        for (const q of ring) { mx += q[0]; my += q[1]; }
        const mid = [mx / ring.length, my / ring.length];
        if (!inside(mid)) continue;
        const [c, r] = cc(mid), i = cell(c, r);
        if (i < 0) continue;
        const m2 = Math.abs(a) * (sx * size) ** 2;   // tile units² → m²
        G.foot[i] += m2; G.floor[i] += m2 * floors; G.height[i] += m2 * Math.max(h, 3.2); G.bcount[i]++;
        G.roof[i] += m2;
      }
    }

    for (const f of L.poi || []) {
      const q = f.rings[0]?.[0];
      if (!q || !inside(q)) continue;
      const [c, r] = cc(q), cls = f.props.class, sub = f.props.subclass, kind = KIND(cls, sub);
      if (c < 0 || c >= n || r < 0 || r >= n) {
        if (kind && c >= -Mg && c < n + Mg && r >= -Mg && r < n + Mg) (G.ptsOut[kind] ||= []).push([c, r, ""]);
        continue;
      }
      if (kind) (G.pts[kind] ||= []).push([c, r, f.props["name:en"] || f.props.name || ""]);
      if (!NOT_A_PLACE.has(cls) && !NOT_A_PLACE.has(sub)) G.classes.push([c, r, cls]);
    }

    for (const f of L.transportation || []) {
      if (f.type !== 2) continue;
      const cls = f.props.class, g = cls === "rail" || cls === "transit" ? -1 : ROAD[cls];
      if (g === undefined) continue;
      const arr = g < 0 ? G.rail : G.road[g];
      if (g < 0 && f.props.brunnel !== "tunnel") for (const line of f.rings) G.ink.rail.push(line.map(cc));
      else if (g === 0 || cls === "secondary") for (const line of f.rings) G.ink.roads.push([g, line.map(cc)]);
      if (STREET.has(cls) && f.props.brunnel !== "tunnel") for (const line of f.rings) {
        let run = [];
        for (let i = 0; i < line.length - 1; i++) {
          const piece = clipTo(line[i], line[i + 1], ex);
          if (!piece) { if (run.length > 1) G.streets.push(run); run = []; continue; }
          const [a, b] = piece.map(cc);
          if (!run.length) run.push(a);
          run.push(b);
          if (piece[1][0] !== line[i + 1][0] || piece[1][1] !== line[i + 1][1]) { G.streets.push(run); run = []; }   // left the tile
        }
        if (run.length > 1) G.streets.push(run);
      }
      while (G.streets.length && !G.streets[G.streets.length - 1].some(([c, r]) => c >= -Mg && c <= n + Mg && r >= -Mg && r <= n + Mg)) G.streets.pop();   // past the margin
      for (const line of f.rings) for (let i = 0; i < line.length - 1; i++) {
        const a = line[i], b = line[i + 1], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (!inside(mid)) continue;
        const A2 = cc(a), B2 = cc(b), d = Math.hypot(B2[0] - A2[0], B2[1] - A2[1]), k = Math.max(1, Math.ceil(d * 4));
        for (let j = 0; j < k; j++) {
          const t = (j + .5) / k, idx = cell(A2[0] + (B2[0] - A2[0]) * t, A2[1] + (B2[1] - A2[1]) * t);
          if (idx >= 0) arr[idx] += d * size / k;
        }
      }
    }

    // land: drawn into the cover rasters, clipped to the tile itself
    const fill = (g, f) => {
      g.save(); g.beginPath();
      const a = cc([0, 0]), b = cc([ex, ex]);
      g.rect(a[0] * R, a[1] * R, (b[0] - a[0]) * R, (b[1] - a[1]) * R); g.clip();
      g.beginPath();
      for (const ring of f.rings) ring.forEach((q, i) => { const [c, r] = cc(q); i ? g.lineTo(c * R, r * R) : g.moveTo(c * R, r * R); });
      g.fill("evenodd"); g.restore();
    };
    for (const f of L.park || []) if (f.type === 3) fill(cover.green[1], f);
    for (const f of L.landcover || []) if (f.type === 3) {
      const c = f.props.class, s = f.props.subclass;
      if (c === "farmland" || s === "farmland" || s === "orchard" || s === "vineyard") fill(cover.farm[1], f);
      else if (GREEN.has(c) || GREEN.has(s)) fill(cover.green[1], f);
    }
    for (const f of L.landuse || []) if (f.type === 3) {
      const c = f.props.class;
      if (USE[c]) fill(cover[USE[c]][1], f);
      if (c === "residential" || c === "commercial" || c === "industrial" || c === "retail") fill(cover.built[1], f);
      else if (c === "pitch" || c === "playground" || c === "cemetery" || c === "recreation_ground") fill(cover.green[1], f);
    }
    for (const f of L.water || []) if (f.type === 3 && f.props.class !== "swimming_pool") {
      fill(cover.water[1], f);
      G.ink.water.push([[cc([0, 0]), cc([ex, ex])], f.rings.map((ring) => ring.map(cc))]);
    }
    for (const f of L.waterway || []) if (f.type === 2 && f.props.brunnel !== "tunnel") for (const line of f.rings) G.ink.waterway.push(line.map(cc));
    for (const f of L.place || []) {
      const q = f.rings[0]?.[0], name = f.props["name:en"] || f.props.name;
      if (!q || !name || !inside(q) || !PLACE_RANK[f.props.class]) continue;
      const [c, r] = cc(q);
      if (c >= 2 && r >= 2 && c < n - 2 && r < n - 2) G.places.push({ c, r, name, k: PLACE_RANK[f.props.class] * 100 + (+f.props.rank || 50) });
    }
  });
  G.places = namesToShow(G.places);
  if (!G.tilesRead) throw new Error("the map tiles did not load");

  for (const [k, [c, g]] of Object.entries(cover)) {
    const d = g.getImageData(0, 0, W, W).data, out = G[k];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 127) out[((y / R) | 0) * n + ((x / R) | 0)] += 1 / (R * R);
  }
  for (let i = 0; i < N; i++) {
    G.height[i] = G.foot[i] ? G.height[i] / G.foot[i] : 0;
    for (const k of ["green", "water", "res", "work", "industry", "inst"]) G[k][i] = Math.min(1, G[k][i]);
  }
  G.paved = Float32Array.from({ length: N }, (_, i) => Math.min(1, (G.road[0][i] * ROAD_W[0] + G.road[1][i] * ROAD_W[1] + G.road[2][i] * ROAD_W[2] + G.road[3][i] * ROAD_W[3]) / A));
  G.cover = Float32Array.from({ length: N }, (_, i) => Math.min(1, G.foot[i] / A));
  G.minutes = {};
  for (const k of new Set([...Object.keys(G.pts), ...Object.keys(G.ptsOut)])) G.minutes[k] = walkMinutes(G, [...(G.pts[k] || []), ...(G.ptsOut[k] || [])]);
  return G;
}

/* walking minutes from every cell's middle to the nearest point: straight line × 1.3 for the street detour,
   at 80 m a minute (4.8 km/h). Points in the 1 km margin count, so the edge reads right. */
export const DETOUR = 1.3, PACE = 80;
export function walkMinutes(G, pts) {
  const n = G.n, out = new Float32Array(n * n).fill(Infinity);
  if (!pts || !pts.length) return out;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let best = Infinity;
    for (const q of pts) { const dx = q[0] - c - .5, dy = q[1] - r - .5, d = dx * dx + dy * dy; if (d < best) best = d; }
    out[r * n + c] = Math.sqrt(best) * G.size * DETOUR / PACE;
  }
  return out;
}

/* elevation, one value a cell: the mean of a 4 × 4 sample inside it, read from the Tilezen terrain tiles on
   AWS Open Data (terrarium PNGs: height = R × 256 + G + B / 256 − 32768 m; SRTM, about 30 m, over most land),
   at zoom 13, about 19 m a pixel at the equator. A handful of image tiles covers a window, with no rate limit.
   If they fail, a 12 × 12 sample from Open-Meteo (Copernicus GLO-90) interpolated to the grid stands in:
   Open-Meteo counts every point as a call, so a sample a cell would trip its limit on one load. */
const elev = new Map();
const TERRAIN = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium";
export function elevation(G) {
  const key = `${G.lat.toFixed(4)},${G.lon.toFixed(4)},${G.n},${G.size}`;
  if (!elev.has(key)) elev.set(key, terrain(G).catch((e) => { console.warn("terrain tiles", e); return openMeteo(G, 12); })
    .catch((e) => { elev.delete(key); throw e; }));
  return elev.get(key);
}
async function terrain(G) {
  const z = 13, T = 2 ** z, n = G.n, S = 4, step = G.step;
  const tx0 = Math.floor(G.x0 * T), tx1 = Math.floor((G.x0 + step * n) * T), ty0 = Math.floor(G.y0 * T), ty1 = Math.floor((G.y0 + step * n) * T);
  const tiles = new Map();
  await Promise.all([...Array((tx1 - tx0 + 1) * (ty1 - ty0 + 1)).keys()].map(async (k) => {
    const tx = tx0 + (k % (tx1 - tx0 + 1)), ty = ty0 + Math.floor(k / (tx1 - tx0 + 1));
    const r = await fetch(`${TERRAIN}/${z}/${tx}/${ty}.png`);
    if (!r.ok) throw new Error(`${r.status} for terrain tile ${z}/${tx}/${ty}`);
    const bmp = await createImageBitmap(await r.blob()), cv = new OffscreenCanvas(256, 256), g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    tiles.set(`${tx},${ty}`, g.getImageData(0, 0, 256, 256).data);
  }));
  const out = new Float32Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let sum = 0, cnt = 0;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const X = (G.x0 + (c + (i + .5) / S) * step) * T, Y = (G.y0 + (r + (j + .5) / S) * step) * T;
      const d = tiles.get(`${Math.floor(X)},${Math.floor(Y)}`);
      if (!d) continue;
      const px = Math.min(255, Math.floor((X % 1) * 256)), py = Math.min(255, Math.floor((Y % 1) * 256)), o = (py * 256 + px) * 4;
      sum += d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768; cnt++;
    }
    out[r * n + c] = cnt ? sum / cnt : NaN;
  }
  if (out.some((v) => Number.isNaN(v))) throw new Error("the terrain tiles left gaps");
  return out;
}
async function openMeteo(G, k) {
  const pts = [];
  for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) pts.push(G.corner((i + .5) * G.n / k, (j + .5) * G.n / k));
  const zs = [];
  for (let s = 0; s < pts.length; s += 100) {
    const part = pts.slice(s, s + 100);
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${part.map((q) => q[1].toFixed(5)).join(",")}&longitude=${part.map((q) => q[0].toFixed(5)).join(",")}`);
    if (!r.ok) throw new Error(`${r.status} from the elevation service`);
    zs.push(...(await r.json()).elevation);
  }
  const n = G.n, out = new Float32Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const u = Math.min(k - 1, Math.max(0, (c + .5) * k / n - .5)), v = Math.min(k - 1, Math.max(0, (r + .5) * k / n - .5));
    const i = Math.min(k - 2, u | 0), j = Math.min(k - 2, v | 0), fu = u - i, fv = v - j, Z = (a, b) => zs[b * k + a];
    out[r * n + c] = (Z(i, j) * (1 - fu) + Z(i + 1, j) * fu) * (1 - fv) + (Z(i, j + 1) * (1 - fu) + Z(i + 1, j + 1) * fu) * fv;
  }
  return out;
}

/* the window a grid will cover, before it is built: [[west, south], [east, north]] */
export function gridBounds(p, { n = 32, size = 150 } = {}) {
  const step = size / (EARTH * Math.cos(p.lat * Math.PI / 180)), [cx, cy] = merc(p.lon, p.lat), h = step * n / 2;
  const [w, nn] = unmerc(cx - h, cy - h), [e, s] = unmerc(cx + h, cy + h);
  return [[w, s], [e, nn]];
}
