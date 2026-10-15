/* city.js — the city, cell by cell (12–20). After MIT City Science's CityScope: one grid of 150 m cells
   over the chosen place (grid.js), and one number per cell per system: buildings, energy, mobility,
   streets, food, the ground and its water, waste, air; then the three CityScope reads the city by,
   density, diversity and proximity, all at once, with a question to test against them. Every value is
   measured from OpenStreetMap's tiles or modelled from them in a way the chapter states; nothing is a
   population estimate. Each step is `render(el, place, ctx)` like place.js, and hands the map a tile
   layer through ctx.grid(). Points are dots in the categorical palette's second and third slots (orange,
   green), so they never read as a class of the blue tiles. */
import { fmt, big, esc, ok, stat, dl, bars, pills, note, loading, failed, CAT, dark } from "./ui.js";
import { cityGrid, walkMinutes, DETOUR, PACE, GRID } from "./grid.js";
import { gridLayer, kindLayer, streetKey } from "./tiles.js";
import { ground, VALLEY_HA as VALLEY } from "./ground.js";
import { syntax, syntaxBreaks } from "./syntax.js";
import { archive, nasa, ghiMonths, heatIndex, steps as placeSteps } from "./place.js";
import { population } from "./pop.js";

const pct = (a, b) => (b ? a / b * 100 : 0);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const MIN_BREAKS = [3, 5, 10, 15];
const MIN_LABELS = ["under 3 min", "3–5", "5–10", "10–15", "over 15, or none in view"];
const minTip = (G, i, k, what) => { const m = G.minutes[k]?.[i]; return `${ok(m) && m < 1e6 ? `${fmt(m)} min` : "none in view"} to ${what}`; };

/* cells that are somewhere a person is: land, and either built on or on a street */
const landOf = (G) => (i) => G.water[i] < .6;
const peopled = (G) => (i) => G.water[i] < .6 && (G.foot[i] > 0 || G.road[2][i] + G.road[3][i] > 60);
const builtCells = (G) => { const out = []; for (let i = 0; i < G.n * G.n; i++) if (G.foot[i] > 0) out.push(i); return out; };
const share = (cells, f) => pct(cells.filter(f).length, cells.length);
const ptsOf = (G, kinds, col) => kinds.flatMap((k) => (G.pts[k] || []).map(([c, r, name]) => ({ c, r, col, name })));
const ORANGE = () => CAT()[1], GREEN = () => CAT()[2];
const thin = (G) => {
  const b = sum(G.bcount);
  return b < 150 ? note(`OpenStreetMap maps only ${fmt(b)} buildings in this window. Where the map is thin, the grid is thin: a blank cell may be unmapped, not empty.`) : "";
};
const winName = (G) => `${G.n * G.size / 1000} km square, ${G.n * G.n} cells of ${G.size} m`;

/* minutes to the nearest of several kinds, cell by cell */
const nearest = (G, kinds) => {
  const out = new Float32Array(G.n * G.n).fill(Infinity);
  for (const k of kinds) { const m = G.minutes[k]; if (m) for (let i = 0; i < out.length; i++) out[i] = Math.min(out[i], m[i]); }
  return out;
};

/* the eight daily needs of the last chapter, each as minutes from every cell. NEAR is the walk that counts:
   ten minutes reaches everything in a city centre, so every core cell read 8; five is where cells differ */
export const NEAR = 5;
export function needs(G) {
  if (G.needs) return G.needs;
  const greenPts = [];
  for (let r = 0; r < G.n; r++) for (let c = 0; c < G.n; c++) if (G.green[r * G.n + c] >= .3) greenPts.push([c + .5, r + .5]);
  const green = walkMinutes(G, [...greenPts, ...(G.pts.green || []), ...(G.ptsOut.green || [])]);
  G.needs = [["fresh food", nearest(G, ["food"])], ["a clinic or pharmacy", nearest(G, ["health"])], ["a school", nearest(G, ["school"])],
    ["a bus or train", nearest(G, ["transit", "rail"])], ["a park", green], ["shops", nearest(G, ["shop"])],
    ["somewhere to eat", nearest(G, ["eat"])], ["a library, temple, post office", nearest(G, ["civic"])]];
  return G.needs;
}
export function nearCount(G) {
  if (G.near) return G.near;
  const N = needs(G), out = new Float32Array(G.n * G.n);
  for (let i = 0; i < out.length; i++) out[i] = N.filter(([, m]) => m[i] <= NEAR).length;
  return (G.near = out);
}
/* diversity: Shannon entropy of the kinds of place within 400 m, over the most it could be (0–1) */
function diversity(G) {
  if (G.mix) return G.mix;
  const n = G.n, per = Array.from({ length: n * n }, () => new Map()), all = new Set();
  for (const [c, r, cls] of G.classes) { const i = (r | 0) * n + (c | 0); per[i].set(cls, (per[i].get(cls) || 0) + 1); all.add(cls); }
  const R = 400 / G.size, ri = Math.ceil(R), out = new Float32Array(n * n), K = Math.log(Math.max(2, Math.min(all.size, 30)));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const m = new Map();
    for (let dr = -ri; dr <= ri; dr++) for (let dc = -ri; dc <= ri; dc++) {
      if (dr * dr + dc * dc > R * R) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      for (const [k, v] of per[rr * n + cc]) m.set(k, (m.get(k) || 0) + v);
    }
    const tot = sum([...m.values()]);
    out[r * n + c] = tot < 3 ? NaN : -sum([...m.values()].map((v) => v / tot * Math.log(v / tot))) / K;
  }
  return (G.mix = out);
}

/* rooftop solar, Day 02's panel arithmetic over every roof: 60% of a roof is usable, panels at 20%
   efficiency and a 0.8 performance ratio, under NASA's mean irradiance for this point */
export const ROOF_USABLE = .6, EFF = .2, PR = .8;
export const roofKwh = (G, i, ghi) => G.roof[i] * ROOF_USABLE * ghi * 365 * EFF * PR;

/* stormwater: what runs off each cell on the wettest day of 2019–23, handed down the ground's drainage
   (ground.js: pits filled, then steepest-downhill), highest cell first */
function runoff(G, T, mm, { cover = (i) => G.cover[i], paved = (i) => G.paved[i], green = (i) => G.green[i] } = {}) {
  const N = G.n * G.n, own = new Float32Array(N), acc = new Float32Array(N), C = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const b = cover(i), pv = Math.min(1 - b, paved(i)), gr = Math.min(1 - b - pv, green(i)), w = Math.min(1 - b - pv - gr, G.water[i]);
    C[i] = .95 * b + .9 * pv + .15 * gr + .45 * Math.max(0, 1 - b - pv - gr - w);
    own[i] = acc[i] = C[i] * mm / 1000 * G.area;
  }
  const order = [...Array(N).keys()].sort((x, y) => T.F[y] - T.F[x]);
  for (const i of order) if (G.water[i] < .5 && T.dir[i] >= 0) acc[T.dir[i]] += acc[i];   // a lake keeps what reaches it
  return { own, acc, C };
}
/* cells with a mapped drain, stream or lake in them */
function wetCells(G) {
  const n = G.n, out = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) if (G.water[i] >= .2) out[i] = 1;
  for (const line of G.ink.waterway) for (let k = 0; k < line.length - 1; k++) {
    const [a, b] = [line[k], line[k + 1]], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 3));
    for (let j = 0; j <= steps; j++) {
      const c = Math.floor(a[0] + (b[0] - a[0]) * j / steps), r = Math.floor(a[1] + (b[1] - a[1]) * j / steps);
      if (c >= 0 && r >= 0 && c < n && r < n) out[r * n + c] = 1;
    }
  }
  return out;
}
const near3 = (G, mark, i) => {
  const n = G.n, c = i % n, r = (i / n) | 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && cc >= 0 && rr < n && cc < n && mark[rr * n + cc]) return true;
  }
  return false;
};

/* land use: what most of a cell is for, from OpenStreetMap's landuse areas and parks; the kinds are the
   categorical palette's three hues and two greys (homes are the city's ground, so the lighter grey) */
const useKinds = () => {
  const [blue, orange, green] = CAT();
  return [[dark() ? "#55534d" : "#cfcabd", "homes"], [orange, "shops and offices"], [dark() ? "#9a978e" : "#6b6a64", "industry and yards"],
    [blue, "schools, hospitals, campuses"], [green, "parks and green"]];
};
function landUse(G) {
  return Int8Array.from({ length: G.n * G.n }, (_, i) => {
    const f = [G.res[i], G.work[i], G.industry[i], G.inst[i], G.green[i]];
    const k = f.indexOf(Math.max(...f));
    return f[k] >= .25 && G.water[i] < .5 ? k : -1;
  });
}
/* local climate zones, after Stewart and Oke (2012), cut down to five and ordered by how much a cell is
   built over, which is what drives its heat: natural ground, sparsely built, open low-rise, open mid- and
   high-rise, and compact or large low-rise. Heights come from OpenStreetMap, where most buildings have
   none, so most cells read low-rise. */
const LCZ = ["trees, grass or water (lcz a–g)", "sparsely built (9)", "open low-rise (6)", "open mid- and high-rise (4–5)", "compact, or large low-rise (1–3, 8)"];
function climateZones(G) {
  return Float32Array.from({ length: G.n * G.n }, (_, i) => {
    const b = G.cover[i], h = G.height[i];
    if (G.water[i] >= .5 || G.green[i] >= .5 || (b < .03 && G.paved[i] < .1)) return 0;
    if (b >= .35 || (G.industry[i] >= .5 && b >= .2)) return 4;
    if (b < .1) return 1;
    return h >= 10 ? 3 : 2;
  });
}

const distSeg = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const meanOf = (a) => { const v = (a || []).filter(ok); return v.length ? sum(v) / v.length : null; };

/* the what-if: the eight daily needs, in needs()'s order, as one thing a person could add to a cell */
const WHAT = [["grocer", "a grocer"], ["clinic", "a clinic"], ["school", "a school"], ["bus stop", "a bus stop"], ["park", "a park"],
  ["shop", "a shop"], ["place to eat", "a place to eat"], ["library or temple", "a library or temple"]];
/* minutes to the nearest, once a few points are added: the same straight line × detour as walkMinutes */
function minutesWith(G, m, add) {
  const out = Float32Array.from(m), k = G.size * DETOUR / PACE;
  for (let r = 0; r < G.n; r++) for (let c = 0; c < G.n; c++)
    for (const q of add) out[r * G.n + c] = Math.min(out[r * G.n + c], Math.hypot(q.c - c - .5, q.r - r - .5) * k);
  return out;
}
/* the cell where one more of need j does the most: first the built cells it brings to all eight, then the
   built cells that gain that need at all. Only cells a person could put something on (land, built or on
   a street) are tried, and not the outermost row, whose own walk runs off the square. */
function bestCell(G, people, mins, near, j, can) {
  const R = NEAR * PACE / DETOUR / G.size, ri = Math.ceil(R), n = G.n, built = new Uint8Array(n * n);
  for (const i of people) built[i] = 1;
  let top = { i: -1, all: 0, gain: 0 };
  for (let q = 0; q < n * n; q++) {
    const qc = q % n, qr = (q / n) | 0;
    if (!can(q) || qc < 1 || qr < 1 || qc >= n - 1 || qr >= n - 1) continue;
    let all = 0, gain = 0;
    for (let dr = -ri; dr <= ri; dr++) for (let dc = -ri; dc <= ri; dc++) {
      const r = qr + dr, c = qc + dc;
      if (r < 0 || c < 0 || r >= n || c >= n || Math.hypot(dc, dr) > R) continue;
      const i = r * n + c;
      if (!built[i] || mins[j][i] <= NEAR) continue;
      gain++; if (near[i] === 7) all++;
    }
    if (all > top.all || (all === top.all && gain > top.gain)) top = { i: q, all, gain };
  }
  return top.gain ? top : { i: -1 };
}

/* the shade a person can walk to: cells at least 30% green or water, and the parks' own points */
const coolMinutes = (G) => {
  const pts = [];
  for (let r = 0; r < G.n; r++) for (let c = 0; c < G.n; c++) { const i = r * G.n + c; if (G.green[i] >= .3 || G.water[i] >= .3) pts.push([c + .5, r + .5]); }
  return walkMinutes(G, pts);
};
const HOT = 85;   // the heat index's hottest class (place.js heatIndex: built and paved against green and water)
const heatOf = (G) => Float32Array.from({ length: G.n * G.n }, (_, i) => heatIndex(G, i));
/* people a cell, or null where the population grid does not answer; and a weight that falls back to one
   a built cell, so every chapter can say "people" when it can and "built cells" when it cannot */
const peopleOr = (G) => population(G).catch((e) => { console.warn("population", e); return null; });
const ha = (G) => G.area / 1e4;
/* a park's reach on heat: the cell itself becomes park, and the cells around it are a little cooler.
   Stylised: city parks average about 1 °C cooler than their streets by day, and the effect reaches
   roughly one park-width out (Bowler et al., 2010); here that is 5 points of the heat index, one cell out */
const COOL = 5;
const cheb = (G, a, b) => Math.max(Math.abs(a % G.n - b % G.n), Math.abs(((a / G.n) | 0) - ((b / G.n) | 0)));
/* food growing: about 3 kg of vegetables a square metre a year from a tended urban plot (well below what
   intensive micro-gardens reach), against 300 g a person a day, the vegetables ICMR-NIN recommends */
const KG_M2 = 3, KG_PERSON = .3 * 365;

/* "near <the closest neighbourhood>", for a cell */
const whereOn = (G, i) => {
  const c = i % G.n, r = (i / G.n) | 0, pl = [...(G.places || [])].sort((x, y) => Math.hypot(x.c - c, x.r - r) - Math.hypot(y.c - c, y.r - r))[0];
  return pl && Math.hypot(pl.c - c, pl.r - r) < 8 ? `near ${esc(pl.name.toLowerCase())}` : "on the map";
};

/* ── the chapters ───────────────────────────────────────────────────────────────────────────────── */
export const steps = {
  "c-build": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the buildings in the map tiles");
      const G = await cityGrid(p, GRID), N = G.n * G.n, far = Float32Array.from({ length: N }, (_, i) => G.floor[i] / G.area);
      const foot = sum(G.foot), floor = sum(G.floor), built = builtCells(G);
      const tall = built.reduce((a, i) => (G.height[i] > G.height[a] ? i : a), built[0] ?? 0);
      const use = landUse(G), zone = climateZones(G), kinds = useKinds(), used = [...use].filter((k) => k >= 0).length;
      let dim = "dense";
      const layer = () => dim === "use"
        ? kindLayer({ G, kind: (i) => use[i], kinds, title: "land use: what most of each cell is for", unit: "openstreetmap's land-use areas",
            tip: (i) => `<b>${use[i] >= 0 ? esc(kinds[use[i]][1]) : "no use mapped"}</b><br>homes ${fmt(G.res[i] * 100)}% · shops and offices ${fmt(G.work[i] * 100)}% · industry ${fmt(G.industry[i] * 100)}% · institutions ${fmt(G.inst[i] * 100)}% · green ${fmt(G.green[i] * 100)}%` })
        : dim === "lcz"
          ? gridLayer({ G, vals: zone, breaks: [1, 2, 3, 4], labels: LCZ, title: "local climate zones, simplified", unit: "stewart and oke (2012), least to most built over",
              tip: (i) => `<b>${LCZ[zone[i]]}</b><br>${fmt(G.cover[i] * 100)}% built over · ${fmt(G.paved[i] * 100)}% paved · ${fmt(G.green[i] * 100)}% green · about ${fmt(G.height[i])} m tall` })
          : gridLayer({ G, vals: far, mask: (i) => G.foot[i] > 0, title: "floor area ratio", unit: "floor area ÷ ground area, per cell",
              breaks: [.25, .5, 1, 2], labels: ["under 0.25", "0.25–0.5", "0.5–1", "1–2", "over 2"],
              tip: (i) => `<b>FAR ${fmt(far[i], 2)}</b><br>${fmt(pct(G.foot[i], G.area))}% of the ground built on · ${fmt(G.bcount[i])} buildings · about ${fmt(G.height[i])} m tall` });
      const ctl = () => pills([["dense", "density"], ["use", "land use"], ["lcz", "climate zones"]], dim, "data-bdim-v");
      el.innerHTML = `<div data-bdims>${ctl()}</div>`
        + stat(fmt(floor / (G.area * N), 2), `floor area ratio across the window · ${big(floor)} m² of floor on ${big(foot)} m² of ground`, winName(G))
        + dl([["ground built on", `${fmt(pct(foot, G.area * N))}%`], ["streets and paths", `${fmt(sum(G.road.map(sum)) / 1000)} km`],
              ["buildings mapped", fmt(sum(G.bcount))], ["the tallest cell, on average", `${fmt(G.height[tall])} m`],
              ["cells with any building", `${fmt(pct(built.length, N))}%`]])
        + `<p class="cc-sub">(cells by what most of them is for · ${fmt(pct(used, N))}% of cells have a use mapped)</p>`
        + bars(kinds.map(([, l], k) => [l, pct([...use].filter((u) => u === k).length, used), "%"]))
        + `<p class="cc-sub">(cells by climate zone)</p>`
        + bars(LCZ.map((l, k) => [l, pct([...zone].filter((z) => z === k).length, N), "%"]))
        + note("Floor area is each footprint times its height over 3.2 m a floor; a building with no height counts as one floor. Land use is OpenStreetMap's own areas, so where nobody drew them a cell is blank. Climate zones are the urban climatologist's reading of the same buildings (Stewart and Oke, 2012): how much of the ground is built over and how tall, which sets how much heat a street keeps at night.")
        + thin(G);
      ctx.grid(layer());
      el.querySelector("[data-bdims]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-bdim-v]"); if (!b2) return;
        dim = b2.dataset.bdimV; el.querySelector("[data-bdims]").innerHTML = ctl(); ctx.grid(layer());
      });
    },
  },

  "c-energy": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the roofs, and nasa's irradiance for this point");
      const [G, g] = await Promise.all([cityGrid(p, GRID), nasa(p).then(ghiMonths)]);
      const N = G.n * G.n;
      let eui = 100;
      const draw = () => {
        const sup = Float32Array.from({ length: N }, (_, i) => roofKwh(G, i, g.annual)), dem = Float32Array.from({ length: N }, (_, i) => G.floor[i] * eui);
        const cov = Float32Array.from({ length: N }, (_, i) => (dem[i] ? sup[i] / dem[i] * 100 : NaN));
        ctx.grid(gridLayer({ G, vals: cov, mask: (i) => G.foot[i] > 0, title: "what the roofs could make, of what the floors use", unit: `% · at ${eui} kWh/m² a year`,
          breaks: [25, 50, 75, 100], labels: ["under 25%", "25–50", "50–75", "75–100", "over 100: a surplus"],
          pts: [...ptsOf(G, ["fuel"], ORANGE()), ...ptsOf(G, ["charge"], GREEN())],
          ptsKey: [[ORANGE(), "fuel station"], [GREEN(), "charging point"]],
          tip: (i) => `<b>${fmt(cov[i])}% from its own roofs</b><br>${fmt(sup[i] / 1000)} MWh a year of ${fmt(dem[i] / 1000)} MWh used` }));
        const S = sum(sup), D = sum(dem);
        out.innerHTML = stat(`${fmt(pct(S, D))}%`, `of the window's electricity its roofs could make · ${fmt(S / 1e6, 1)} of ${fmt(D / 1e6, 1)} GWh a year`)
          + bars([["cells that could cover all of it", share(builtCells(G), (i) => cov[i] >= 100), "%"],
                  ["cells under a quarter", share(builtCells(G), (i) => cov[i] < 25), "%"]])
          + dl([["sun at the ground", `${fmt(g.annual, 2)} kWh/m² a day`], ["roof area", `${fmt(sum(G.roof) / 1e6, 2)} km²`],
                ["charging points mapped", fmt((G.pts.charge || []).length)], ["fuel stations mapped", fmt((G.pts.fuel || []).length)]]);
      };
      el.innerHTML = `<p class="cc-sub">(electricity a square metre of floor uses in a year)</p><div data-eui>${pills([[50, "homes · 50"], [100, "mixed · 100"], [200, "offices · 200"]], eui, "data-eui-v")}</div><div data-out></div>`
        + note(`Supply is Day 02's panel arithmetic over every mapped roof: ${ROOF_USABLE * 100}% of the roof usable, ${EFF * 100}% efficient panels, a ${PR} performance ratio. Demand is floor area times the use above. Tall, dense cells use more than their roofs can catch; that is the city's energy problem, drawn.`);
      const out = el.querySelector("[data-out]");
      el.querySelector("[data-eui]").addEventListener("click", (e) => {
        const b = e.target.closest("[data-eui-v]"); if (!b) return;
        eui = +b.dataset.euiV; el.querySelector("[data-eui]").innerHTML = pills([[50, "homes · 50"], [100, "mixed · 100"], [200, "offices · 200"]], eui, "data-eui-v"); draw();
      });
      draw();
    },
  },

  "c-move": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("stops and streets in the map tiles");
      const G = await cityGrid(p, GRID), m = nearest(G, ["transit", "rail"]), people = builtCells(G);
      const len = (k) => sum(G.road[k]) / 1000, km2 = G.n * G.n * G.area / 1e6;
      ctx.grid(gridLayer({ G, vals: m, mask: peopled(G), title: "walk to the nearest bus, tram, train or metro", unit: "minutes", weigh: true,
        breaks: MIN_BREAKS, labels: MIN_LABELS,
        pts: [...ptsOf(G, ["transit"], ORANGE()), ...ptsOf(G, ["rail"], GREEN())], ptsKey: [[ORANGE(), "bus or tram stop"], [GREEN(), "rail or metro station"]],
        tip: (i) => `<b>${minTip(G, i, "transit", "a bus or tram stop")}</b><br>${minTip(G, i, "rail", "a station")}` }));
      el.innerHTML = stat(`${fmt(share(people, (i) => m[i] <= 5))}%`, "of built cells within five minutes' walk of a stop", winName(G))
        + bars([["within 5 min", share(people, (i) => m[i] <= 5), "%"], ["5–10 min", share(people, (i) => m[i] > 5 && m[i] <= 10), "%"],
                ["further", share(people, (i) => m[i] > 10), "%"]])
        + dl([["stops mapped", fmt((G.pts.transit || []).length)], ["stations mapped", fmt((G.pts.rail || []).length)],
              ["main roads", `${fmt(len(0) + len(1))} km · ${fmt((len(0) + len(1)) / km2, 1)} km per km²`],
              ["local streets", `${fmt(len(2))} km`], ["footpaths and cycleways", `${fmt(len(3))} km`],
              ["rail and metro lines", `${fmt(sum(G.rail) / 1000, 1)} km`]])
        + note(`Minutes are straight-line distance × ${DETOUR} for the way streets bend, at ${PACE} m a minute.`) + thin(G);
    },
  },

  "c-street": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the streets in the map tiles");
      const G = await cityGrid(p, GRID);
      el.innerHTML = loading("every route between every pair of streets, counted by how much it turns");
      const X = await syntax(G), N = G.n * G.n, km2 = N * G.area / 1e6, segsIn = X.segs.filter((sg) => sg.in);
      const jIn = X.junctions.filter(([x, y]) => x >= 0 && y >= 0 && x < G.n && y < G.n);
      let key = "nach";
      // the street measures, read off at the cells: the strongest street through each one
      const best = { nach: new Float32Array(N), nain: new Float32Array(N) };
      for (const sg of segsIn) for (const q of sg.pts) {
        const c = Math.floor(q[0]), r = Math.floor(q[1]);
        if (c < 0 || r < 0 || c >= G.n || r >= G.n) continue;
        const i = r * G.n + c;
        best.nach[i] = Math.max(best.nach[i], sg.nach); best.nain[i] = Math.max(best.nain[i], sg.nain);
      }
      const rank = (k, v) => { const all = segsIn.map((sg) => sg[k]).sort((a, b) => a - b); let lo = 0; while (lo < all.length && all[lo] < v) lo++; return 100 - lo / all.length * 100; };
      const jc = X.jcount, three = jIn.filter((j) => j[2] === 3).length, four = jIn.filter((j) => j[2] >= 4).length;
      const name = { nach: "choice, 2 km: the routes people pass along", nain: "integration, 800 m: the streets easiest to reach" };
      // junctions a km² over the 450 m block around each cell: one cell is too small to count them in
      const jd = Float32Array.from({ length: N }, (_, i) => {
        const c = i % G.n, r = (i / G.n) | 0;
        let s2 = 0, k = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && cc >= 0 && rr < G.n && cc < G.n) { s2 += jc[rr * G.n + cc]; k++; }
        }
        return s2 / (k * G.area / 1e6);
      });
      const layer = () => ({ ...gridLayer({ G, vals: jd, mask: (i) => G.water[i] < .6, good: "high", fade: .32, title: "tiles: junctions a km², over the 450 m around each cell", unit: "where three or more streets meet",
          breaks: [40, 80, 120, 160], labels: ["under 40", "40–80", "80–120", "120–160", "over 160"], extra: streetKey(name[key]),
          tip: (i) => `<b>${fmt(jd[i])} junctions a km² around it</b>${best[key][i] ? `<br>its strongest street is in the top ${fmt(Math.max(1, rank(key, best[key][i])))}% for ${key === "nach" ? "choice" : "integration"}` : ""}`,
          sheets: { streets: true, roads: false } }), syntaxKey: key });
      // Hillier's movement economy: shops gather on the streets most routes use
      const top = (k) => { const br = syntaxBreaks(X.segs, k); return segsIn.filter((sg) => sg[k] >= br[2]); };
      const along = (pts, segs, m) => {
        if (!pts.length) return 0;
        const r = m / G.size;
        return pct(pts.filter(([c, r0]) => segs.some((sg) => sg.pts.some((q, j) => j && distSeg([c, r0], sg.pts[j - 1], q) <= r))).length, pts.length);
      };
      // street length inside the window: each piece counts if its middle is in
      const inWin = (a, b) => { const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2; return x >= 0 && y >= 0 && x < G.n && y < G.n; };
      const lenOf = (segs) => sum(segs.map((sg) => sum(sg.pts.map((q, j) => (j && inWin(sg.pts[j - 1], q) ? Math.hypot(q[0] - sg.pts[j - 1][0], q[1] - sg.pts[j - 1][1]) : 0))))) * G.size;
      const totalLen = lenOf(segsIn), tChoice = top("nach"), tInt = top("nain");
      const shops = [...(G.pts.shop || []), ...(G.pts.food || []), ...(G.pts.eat || [])], stops = G.pts.transit || [];
      const ctl = () => pills([["nach", "choice"], ["nain", "integration"]], key, "data-sk-v");
      el.innerHTML = `<div data-sks>${ctl()}</div>`
        + stat(fmt(jIn.length / km2), "junctions a km², where three or more streets meet", `${fmt(pct(four, three + four))}% of them four-way or more · ${fmt(segsIn.length)} street segments · ${fmt(totalLen / 1000)} km of street`)
        + `<p class="cc-sub">(the top 15% of streets by choice, the through-routes, are …)</p>`
        + bars([["of the street length", pct(lenOf(tChoice), totalLen), "%"], ["next to the bus stops", along(stops, tChoice, 30), "%"]])
        + `<p class="cc-sub">(the top 15% by integration, the streets easiest to reach, are …)</p>`
        + bars([["of the street length", pct(lenOf(tInt), totalLen), "%"], ["next to the shops and cafés", along(shops, tInt, 30), "%"]])
        + note("Next to means within 30 m. Where the second bar outruns the first, stops or shops gather on those streets more than their length alone would give.")
        + note("Space syntax reads a street network by how much a route turns, not how far it goes: people choose the way with fewest changes of direction, and a city's life follows those ways (Hillier, 1996). Choice counts how many of the least-turning routes between all pairs of streets pass along each one: the through-routes. Integration is how few turns it takes to reach every street within a ten-minute walk: where people arrive. Bill Hillier called the pull of shops toward both the movement economy; the bars test it here. Under the streets, the tiles count junctions: the more a cell has, the finer the grain a person can walk.")
        + note("The routes are counted over a kilometre more of the city all round the square, so the streets at its edge keep the journeys that come in from outside.") + thin(G);
      ctx.grid(layer());
      el.querySelector("[data-sks]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-sk-v]"); if (!b2) return;
        key = b2.dataset.skV; el.querySelector("[data-sks]").innerHTML = ctl(); ctx.grid(layer());
      });
    },
  },

  "c-food": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the ground, the green and the roofs");
      const G = await cityGrid(p, GRID), N = G.n * G.n, people = builtCells(G);
      const [T, pop] = await Promise.all([ground(G).catch(() => null), peopleOr(G)]);
      const m = G.minutes.food || new Float32Array(N).fill(Infinity);
      const valley = (i) => T && T.acc[i] >= T.T;
      // what each cell could give to growing, in m²: fields are fields; a valley floor's open ground is the
      // best soil and water the window has (McHarg's prime land); other open green; flat low roofs
      const open = (i) => Math.max(0, 1 - G.cover[i] - G.paved[i] - G.water[i]) * G.area;
      const [blue, orange, green] = CAT(), grey = dark() ? "#55534d" : "#cfcabd";   // roofs are the most of it, so the quietest
      const KINDS = [[orange, "fields already"], [blue, "valley floor, open ground"], [green, "open green ground"], [grey, "low roofs only"]];
      const kind = Int8Array.from({ length: N }, (_, i) => G.water[i] >= .5 ? -1 : G.farm[i] >= .3 ? 0 : valley(i) && open(i) >= .25 * G.area ? 1
        : G.green[i] >= .3 && open(i) >= .25 * G.area ? 2 : G.roof[i] >= .2 * G.area && G.height[i] < 15 ? 3 : -1);
      const area = (k) => sum([...Array(N).keys()].filter((i) => kind[i] === k).map((i) => (k === 0 ? G.farm[i] * G.area : k === 3 ? G.roof[i] * .5 : open(i) * .5)));
      const m2 = [0, 1, 2, 3].map(area), fed = m2.slice(1).map((x) => x * KG_M2 / KG_PERSON), total = pop ? sum(pop) : null;
      let dim = "grow";
      const layer = () => dim === "walk"
        ? gridLayer({ G, vals: m, mask: peopled(G), title: "walk to fresh food: a grocer, market, baker or butcher", unit: "minutes", weigh: true,
            breaks: MIN_BREAKS, labels: MIN_LABELS, pts: ptsOf(G, ["food"], ORANGE()), ptsKey: [[ORANGE(), "grocer, market, baker, butcher"]], sheets: { valleys: true },
            tip: (i) => `<b>${minTip(G, i, "food", "fresh food")}</b>` })
        : kindLayer({ G, kind: (i) => kind[i], kinds: KINDS, title: "where food could grow", unit: "what most of each cell could give to it", sheets: { valleys: true },
            tip: (i) => `<b>${kind[i] >= 0 ? KINDS[kind[i]][1] : "built over, or water"}</b><br>${fmt(open(i) / 1e4, 2)} ha open · ${fmt(G.roof[i])} m² of roof${valley(i) ? " · a valley floor" : ""}` });
      const ctl = () => pills([["grow", "where it could grow"], ["walk", "the walk to buy it"]], dim, "data-fdim-v");
      el.innerHTML = `<div data-fdims>${ctl()}</div>`
        + stat(big(sum(fed)), "people's vegetables, a year, if the window's valley floors, open green and low roofs were half planted",
            `${fmt(sum(m2.slice(1)) / 1e4)} ha that could grow · ${fmt(m2[0] / 1e4)} ha of fields already${total ? ` · about ${fmt(pct(sum(fed), total))}% of the people who live here` : ""}`)
        + `<p class="cc-sub">(the people each could feed with vegetables, at ${KG_M2} kg a m² and 300 g a person a day)</p>`
        + bars([["valley floors", fed[0], ""], ["open green", fed[1], ""], ["low roofs", fed[2], ""]], { max: Math.max(...fed, 1) })
        + `<p class="cc-sub">(and the walk to buy it)</p>`
        + bars([["within 5 min of fresh food", share(people, (i) => m[i] <= 5), "%"], ["over 15 min: a food desert", share(people, (i) => m[i] > 15), "%"]])
        + note("McHarg ranked the land a city should never build on, and its best farmland came first: the deep, wet soil of the valley floors. Those are the blue tiles, and the same valleys the ground chapter traces. A field floods and recovers; a house does not. Open green is the parks and grounds already there, and the low roofs are those under 15 m. Half of each is counted as planted, at a modest yield. The second view is the old question, the walk to a shop: street vendors and weekly markets rarely appear in OpenStreetMap, so in Indian cities it undercounts.") + thin(G);
      ctx.grid(layer());
      el.querySelector("[data-fdims]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-fdim-v]"); if (!b2) return;
        dim = b2.dataset.fdimV; el.querySelector("[data-fdims]").innerHTML = ctl(); ctx.grid(layer());
      });
    },
  },

  "c-heat": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the grid and its heat");
      const G = await cityGrid(p, GRID), N = G.n * G.n, built = builtCells(G), hi = heatOf(G), zone = climateZones(G), cool = coolMinutes(G);
      const pop = await peopleOr(G);
      const hot = (i) => hi[i] >= HOT, far = (i) => cool[i] > 10;
      const specs = {};
      let dim = "heat";
      specs.heat = gridLayer({ G, vals: hi, mask: (i) => G.water[i] < .6, weigh: true, title: "where the heat sits: a heat-island proxy", unit: "built and paved against green and water, 0–100",
        breaks: [50, 65, 75, HOT], labels: ["under 50: cool", "50–65", "65–75", "75–85: hot", "85 and over: hottest"],
        tip: (i) => `<b>heat index ${fmt(hi[i])}</b> · ${LCZ[zone[i]]}<br>${fmt(cool[i])} min to shade or water${pop ? ` · about ${fmt(pop[i])} people` : ""}` });
      const sub = (k) => ({ ...ctx, grid: (spec) => { if (!k) return; specs[k] = spec; if (dim === k) ctx.grid(spec); } });
      const ctl = () => pills([["heat", "where it sits"], ["shade", "shade within reach"]], dim, "data-hdim-v");
      const who = (f) => (pop ? `${big(sum([...Array(N).keys()].filter(f).map((i) => pop[i])))} people` : `${fmt(share(built, f))}% of built cells`);
      el.innerHTML = `<div data-hdims>${ctl()}</div>`
        + stat(`${fmt(share(built, hot))}%`, "of built cells are in the hottest class, where roofs and roads leave no room for green", pop ? `about ${who(hot)} live in them` : winName(G))
        + `<p class="cc-sub">(the hottest cells …)</p>`
        + bars([["more than 10 min from shade", pct(built.filter((i) => hot(i) && far(i)).length, Math.max(1, built.filter(hot).length)), "%"],
                ["compact, or large low-rise", pct(built.filter((i) => hot(i) && zone[i] === 4).length, Math.max(1, built.filter(hot).length)), "%"]])
        + (pop ? dl([["people in the hottest cells, far from shade", who((i) => hot(i) && far(i))]]) : "")
        + `<p class="cc-sub cc-sub--h">(this week)</p><div data-week></div>`
        + `<p class="cc-sub cc-sub--h">(a normal year, and where to cool down)</p><div data-cool></div>`
        + note("Heat is the climate risk an Indian city lives with most, and it is local: a street of roofs and asphalt keeps the day's heat into the night, a street of trees does not. The index is a proxy, the share of each cell built and paved against its green and water, the same reading the climate zones in the buildings chapter make. It is not a measured temperature; a satellite's land-surface temperature (Landsat, ECOSTRESS) would be the next step, and Singapore's Future Cities Laboratory took it further, modelling the city's heat street by street to test where cooling would work.");
      ctx.grid(specs.heat);
      placeSteps["p-heat"].render(el.querySelector("[data-week]"), p, sub(null)).catch((e) => { console.warn(e); el.querySelector("[data-week]").innerHTML = failed("The forecast"); });
      placeSteps["p-cool"].render(el.querySelector("[data-cool]"), p, sub("shade")).catch((e) => { console.warn(e); el.querySelector("[data-cool]").innerHTML = failed("OpenStreetMap"); });
      el.querySelector("[data-hdims]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-hdim-v]"); if (!b2) return;
        dim = b2.dataset.hdimV; el.querySelector("[data-hdims]").innerHTML = ctl();
        if (specs[dim]) ctx.grid(specs[dim]);
      });
    },
  },

  "c-people": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("meta's population grid for this window");
      const G = await cityGrid(p, GRID), N = G.n * G.n;
      const [pop, T] = await Promise.all([population(G), ground(G).catch(() => null)]);
      const hi = heatOf(G), near = nearCount(G), bus = nearest(G, ["transit", "rail"]);
      const RISK = [["on a valley floor", (i) => !!T && T.acc[i] >= T.T], ["in the hottest cells", (i) => hi[i] >= HOT],
        [`under 5 of 8 needs in ${NEAR} min`, (i) => near[i] < 5], ["10+ min from transit", (i) => bus[i] > 10]];
      const has = (i) => pop[i] >= 1, cells = [...Array(N).keys()].filter(has), total = sum(cells.map((i) => pop[i]));
      const count = Float32Array.from({ length: N }, (_, i) => (has(i) ? RISK.filter(([, f]) => f(i)).length : NaN));
      const dens = Float32Array.from(pop, (v) => v / ha(G));
      const byPeople = (i) => .2 + .8 * Math.min(1, Math.sqrt(dens[i] / 400));
      const of = (f) => pct(sum(cells.filter(f).map((i) => pop[i])), total);
      let dim = "risk";
      const layer = () => dim === "people"
        ? gridLayer({ G, vals: dens, mask: has, title: "people a hectare", unit: "meta's high resolution settlement layer, 2020: a modelled estimate",
            breaks: [50, 100, 200, 400], labels: ["under 50", "50–100", "100–200", "200–400", "over 400"], tip: (i) => `<b>about ${fmt(pop[i])} people</b><br>${fmt(dens[i])} a hectare` })
        : gridLayer({ G, vals: count, mask: has, weigh: byPeople, title: "how many of four risks the people in each cell live with", unit: "valley floor · hottest · far from daily needs · far from transit",
            breaks: [1, 2, 3], labels: ["none of the four", "one", "two", "three or four"],
            tip: (i) => `<b>about ${fmt(pop[i])} people</b><br>${RISK.filter(([, f]) => f(i)).map(([l]) => l).join(", ") || "none of the four"}` });
      const ctl = () => pills([["risk", "risks stacked"], ["people", "where people live"]], dim, "data-pdim-v");
      el.innerHTML = `<div data-pdims>${ctl()}</div>`
        + stat(big(total), "people live in this window, by Meta's estimate", `${fmt(total / (N * G.area / 1e6))} a km² · ${fmt(of((i) => count[i] >= 2))}% of them live with two or more of the four risks below`)
        + `<p class="cc-sub">(of the people who live here, the share who live …)</p>`
        + bars(RISK.map(([l, f]) => [l, of(f), "%"]))
        + note("A risk, as the IPCC counts it, is a hazard times who is exposed to it times how vulnerable they are. The chapters before measured hazards and the city's form; this one counts people. Meta's settlement layer spreads each census count over the buildings it finds in satellite images, one value per 30 m; in a dense city it follows the footprint of buildings more closely than their floors, so tall blocks read low and crowded low-rise reads right. Vulnerability, income or age, is not here: Meta's elderly and under-five layers are the next sheet to add.")
        + note("These numbers are estimates, and so is the 2020 base; the shares between places hold up better than the totals.");
      ctx.grid(layer());
      el.querySelector("[data-pdims]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-pdim-v]"); if (!b2) return;
        dim = b2.dataset.pdimV; el.querySelector("[data-pdims]").innerHTML = ctl(); ctx.grid(layer());
      });
    },
  },

  "c-water": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the ground's height, cell by cell, and five years of rain");
      const [G, a] = await Promise.all([cityGrid(p, GRID), archive(p)]);
      const T = await ground(G), Z = T.Z, rain = a.daily.precipitation_sum, mm = Math.max(...rain.filter(ok)), day = a.daily.time[rain.indexOf(mm)];
      const { own, acc, C } = runoff(G, T, mm), unit = mm / 1000 * G.area, cells = Float32Array.from(acc, (v) => v / unit);
      const N = G.n * G.n, land = [...Array(N).keys()].filter(landOf(G)), built = builtCells(G), wet = wetCells(G);
      const inValley = (i) => T.acc[i] >= T.T, valleyCells = land.filter(inValley);
      // McHarg's overlay: each reason not to build is a sheet; where they stack, the ground says no
      const lake = (i) => G.water[i] >= .3 || near3(G, Uint8Array.from({ length: N }, (_, j) => G.water[j] >= .5), i);
      const reasons = (i) => [inValley(i) && "a valley floor, where the water runs", lake(i) && "a lake or its edge", G.green[i] >= .3 && "green cover", T.slope[i] >= 10 && "a slope over 10%"].filter(Boolean);
      const count = Float32Array.from({ length: N }, (_, i) => reasons(i).length);
      let dim = "rain";
      const layer = () => dim === "mcharg"
        ? gridLayer({ G, vals: count, mask: landOf(G), title: "reasons not to build here, stacked", unit: "after mcharg's overlays: valley floor · lake edge · green · steep",
            breaks: [1, 2, 3], labels: ["none", "one", "two", "three or more"], sheets: { contours: true, valleys: true },
            tip: (i) => `<b>${reasons(i).length ? esc(reasons(i).join(", ")) : "no reason not to"}</b>${G.foot[i] > 0 && reasons(i).length ? "<br>and built on" : ""}` })
        : gridLayer({ G, vals: cells, mask: landOf(G), title: `where the rain of ${day} gathers`, unit: "cells' worth of runoff arriving",
            breaks: [1, 2, 5, 15], labels: ["its own or less", "1–2 cells", "2–5", "5–15", "over 15: where it pools"], sheets: { contours: true, valleys: true },
            pts: ptsOf(G, ["tap"], ORANGE()), ptsKey: [[ORANGE(), "drinking-water tap"]],
            tip: (i) => `<b>${fmt(acc[i])} m³ arrives</b> on the wettest day<br>${fmt(C[i] * 100)}% of its own rain runs off · ${fmt(Z[i])} m above sea${inValley(i) ? " · a valley floor" : ""}` });
      const vKm = sum(T.valleys.map((v) => Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]))) * G.size / 1000;
      const total = sum(land.map((i) => own[i])), fall = mm / 1000 * G.area * land.length;
      const ctl = () => pills([["rain", "the wettest day"], ["mcharg", "where not to build"]], dim, "data-gdim-v");
      el.innerHTML = `<div data-gdims>${ctl()}</div>`
        + stat(`${fmt(share(built, inValley))}%`, "of built cells stand on a valley floor, where the ground sends its water",
            `${fmt(vKm, 1)} km of valleys in the window · ground from ${fmt(T.lo)} to ${fmt(T.hi)} m · contours every ${fmt(T.step)} m`)
        + `<p class="cc-sub">(of the valley cells …)</p>` + bars([["with a drain or lake beside", share(valleyCells, (i) => near3(G, wet, i)), "%"]])
        + `<p class="cc-sub">(of the built cells …)</p>` + bars([["2+ reasons not to build", share(built, (i) => count[i] >= 2), "%"]])
        + `<p class="cc-sub">(of the rain of ${day}, ${fmt(mm)} mm in a day …)</p>`
        + bars([["ran off the land", pct(total, fall), "%"], ["pooled: 15+ cells' worth", share(land, (i) => cells[i] >= 15), "%"]])
        + dl([["ground built on or paved", `${fmt(pct(sum(land.map((i) => Math.min(1, G.cover[i] + G.paved[i]))), land.length))}%`],
              ["open water in the window", `${fmt(sum(G.water) * G.area / 1e4)} ha`], ["drains and streams mapped", `${fmt(sum(G.ink.waterway.map((l) => sum(l.map((q, j) => (j ? Math.hypot(q[0] - l[j - 1][0], q[1] - l[j - 1][1]) : 0))))) * G.size / 1000, 1)} km`],
              ["drinking taps mapped", fmt((G.pts.tap || []).length)]])
        + note(`Ian McHarg's method, in Design with Nature (1969): read the land before you draw on it. The ground is the SRTM elevation model through the Tilezen terrain tiles, about 30 m, averaged to each cell; its small pits are filled so water can leave them, then each cell drains to its steepest-downhill neighbour. Blue lines are the valleys this finds, wherever ${VALLEY} ha or more drains through a cell; the dashed ink lines are the drains and streams OpenStreetMap maps. Where a valley has no drain beside it, the water still goes there, through streets and ground floors. In Bengaluru, for one, the lakes were built as a chain down these valleys, joined by channels, and many of the channels are built over now.`)
        + note("The wettest day is a simple stormwater model: each cell sheds a share of the rain (95% of a roof, 90% of a road, 15% of a park, 45% of bare ground) and passes it down the same drainage. Where not to build stacks four of McHarg's sheets: valley floors, lakes and their edges, green cover, slopes over 10%.") + thin(G);
      ctx.grid(layer());
      el.querySelector("[data-gdims]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-gdim-v]"); if (!b2) return;
        dim = b2.dataset.gdimV; el.querySelector("[data-gdims]").innerHTML = ctl(); ctx.grid(layer());
      });
    },
  },

  "c-near": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("everything in the map tiles");
      const G = await cityGrid(p, GRID), N = G.n * G.n, base = nearCount(G), mix = diversity(G), far = Float32Array.from({ length: N }, (_, i) => G.floor[i] / G.area);
      const people = builtCells(G), need = needs(G), can = peopled(G), R = NEAR * PACE / DETOUR / G.size;
      let dim = "near", arm = null, plan = [], said = "";
      // the plan: what has been put on the map, and the city re-scored with it
      let mins = need.map(([, m]) => m), near = base;
      const rescore = () => {
        mins = need.map(([, m], j) => {
          const mine = plan.filter((q) => q.j === j);
          return mine.length ? minutesWith(G, m, mine) : m;
        });
        near = plan.length ? Float32Array.from({ length: N }, (_, i) => mins.filter((m) => m[i] <= NEAR).length) : base;
      };
      const missing = (i) => need.filter((_, j) => mins[j][i] > NEAR).map(([k]) => k);
      // the question: for each of the eight, the one cell where one more would do the most, and how much
      const asks = () => WHAT.map((w, j) => ({ j, ...bestCell(G, people, mins, near, j, can) })).filter((x) => x.i >= 0)
        .sort((x, y) => y.all - x.all || y.gain - x.gain);
      const layer = () => {
        if (dim === "mix") return gridLayer({ G, vals: mix, mask: can, title: "diversity: how mixed the places within 400 m are", unit: "shannon entropy, 0–1", good: "high", weigh: true,
          breaks: [.4, .55, .7, .85], labels: ["under 0.4: one kind of place", "0.4–0.55", "0.55–0.7", "0.7–0.85", "over 0.85: everything"],
          tip: (i) => `<b>diversity ${fmt(mix[i], 2)}</b>` });
        if (dim === "dense") return gridLayer({ G, vals: far, mask: (i) => G.foot[i] > 0, title: "density: floor area ratio", unit: "floor area ÷ ground area",
          breaks: [.25, .5, 1, 2], labels: ["under 0.25", "0.25–0.5", "0.5–1", "1–2", "over 2"],
          tip: (i) => `<b>FAR ${fmt(far[i], 2)}</b>` });
        const spec = gridLayer({ G, vals: near, mask: can, title: `daily needs within a ${NEAR}-minute walk${plan.length ? ", with what was added" : ""}`, unit: "of eight", good: "high", weigh: true,
          breaks: [3, 5, 7, 8], labels: ["0–2", "3–4", "5–6", "7", "all 8"],
          tip: (i) => `<b>${near[i]} of 8 within ${NEAR} min</b>${near[i] > base[i] ? ` · was ${base[i]}` : ""}<br>${missing(i).length ? "missing: " + esc(missing(i).join(", ")) : "everything"}`
            + (arm !== null ? `<br>(click to put ${esc(WHAT[arm][1])} here)` : "") });
        spec.marks = plan.length ? people.filter((i) => near[i] > base[i]) : [];
        spec.plan = plan.map((q) => ({ c: q.c, r: q.r, name: WHAT[q.j][0], rad: R }));
        if (arm !== null) spec.click = place;
        return spec;
      };
      // a click on the map while something is picked: put it on that cell, or take it off again
      const place = (i) => {
        const c = i % G.n + .5, r = ((i / G.n) | 0) + .5, at = plan.findIndex((q) => q.j === arm && q.c === c && q.r === r);
        if (at >= 0) plan.splice(at, 1); else plan.push({ j: arm, c, r });
        said = "";
        update();
      };
      const ctl = () => pills([["near", "proximity"], ["mix", "diversity"], ["dense", "density"]], dim, "data-dim-v");
      const mixMean = meanOf(people.map((i) => mix[i]));
      const out = () => {
        const was = share(people, (i) => base[i] === 8), now = share(people, (i) => near[i] === 8);
        const gained = people.filter((i) => near[i] === 8 && base[i] < 8), d = (a, b) => (plan.length && b !== a ? ` · ${b > a ? "+" : ""}${fmt(b - a)}` : "");
        return (plan.length
          ? stat(`${fmt(now)}%`, `of built cells reach all eight daily needs within ${NEAR} minutes on foot, with what was added · it was ${fmt(was)}%`,
              `${fmt(gained.length)} more cells reach all eight · ${big(sum(gained.map((i) => G.floor[i])))} m² of floor on them`)
          : stat(`${fmt(was)}%`, `of built cells reach all eight daily needs within ${NEAR} minutes on foot`, `density ${fmt(sum(G.floor) / (G.area * N), 2)} · diversity ${fmt(mixMean, 2)} · proximity ${fmt(meanOf(people.map((i) => base[i])), 1)} of 8`))
          + `<p class="cc-sub">(share of built cells within ${NEAR} minutes of …)</p>`
          + bars(need.map(([k, m], j) => { const a = share(people, (i) => m[i] <= NEAR), b = share(people, (i) => mins[j][i] <= NEAR); return [k, b, "%" + d(a, b)]; }));
      };
      const whereOf = (i) => {
        const c = i % G.n, r = (i / G.n) | 0, pl = [...(G.places || [])].sort((x, y) => Math.hypot(x.c - c, x.r - r) - Math.hypot(y.c - c, y.r - r))[0];
        return pl && Math.hypot(pl.c - c, pl.r - r) < 8 ? `near ${esc(pl.name.toLowerCase())}` : "on the map";
      };
      const whatif = () => {
        const list = asks(), top = Math.max(1, ...list.map((x) => x.all));
        return `<p class="cc-ask__q">Where would one more of something help most?</p>`
          + `<p class="cc-sub">(one more of each, at the one cell where it does the most: built cells it would bring to all eight)</p>`
          + `<ol class="cc-ask">${list.map((x) => `<li><button type="button" data-ask="${x.j}">
              <span class="cc-ask__l">one more ${esc(WHAT[x.j][0])}</span><span class="cc-ask__t"><i style="width:${x.all / top * 100}%"></i></span>
              <span class="cc-ask__v">+${fmt(x.all)}</span></button></li>`).join("")}</ol>`
          + (said ? `<p class="cc-ask__a">${said}</p>` : "")
          + `<p class="cc-sub">(or put one anywhere: pick it, then click a cell; click it again to take it away)</p>`
          + pills(WHAT.map(([l], j) => [j, l]), arm ?? "", "data-arm-v")
          + (plan.length ? `<div class="cc-pills"><button type="button" data-clear>(clear ${plan.length})</button></div>` : "");
      };
      const update = () => {
        rescore();
        el.querySelector("[data-out]").innerHTML = out();
        el.querySelector("[data-whatif]").innerHTML = dim === "near" ? whatif() : "";
        ctx.grid(layer());
      };
      el.innerHTML = `<div data-near><div data-dims>${ctl()}</div><div class="cc-whatif" data-whatif>${whatif()}</div><div data-out>${out()}</div>`
        + note("Density is how much is built, diversity how mixed it is, proximity how much of daily life is a short walk away. The fifteen-minute city is the same idea; here the walk is five minutes, about 300 m, because at ten nearly every cell of a city centre reaches everything. Chapter 10 read every country at once; this reads every cell.")
        + note("The question is the planner's: change the city and score it again. It measures reach, not use. People still shop where they choose: in US cities only about 14% of errand trips stay local, even where everything is close (Abbiasov et al., 2024).") + thin(G) + "</div>";
      ctx.grid(layer());
      el.querySelector("[data-near]").addEventListener("click", (e) => {
        const b = e.target.closest("[data-dim-v],[data-arm-v],[data-ask],[data-clear]"); if (!b) return;
        said = "";
        if (b.dataset.dimV) { dim = b.dataset.dimV; arm = null; el.querySelector("[data-dims]").innerHTML = ctl(); }
        else if (b.dataset.armV !== undefined) arm = arm === +b.dataset.armV ? null : +b.dataset.armV;
        else if (b.hasAttribute("data-clear")) plan = [];
        else {
          const j = +b.dataset.ask, x = bestCell(G, people, mins, near, j, can);
          if (x.i >= 0) {
            plan.push({ j, c: x.i % G.n + .5, r: ((x.i / G.n) | 0) + .5 });
            said = `One more ${esc(WHAT[j][0])}, ${whereOf(x.i)}: ${fmt(x.all)} more built cells would reach all eight needs, and ${fmt(x.gain)} would have ${esc(WHAT[j][1])} within ${NEAR} minutes. It is on the map, with the walk it serves. Ask again: the answer changes with what is already there.`;
          }
        }
        update();
      });
    },
  },

  "c-park": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the ground, the rain, the heat and the people");
      const G = await cityGrid(p, GRID), N = G.n * G.n, built = builtCells(G), can = peopled(G);
      const [T, a, pop] = await Promise.all([ground(G), archive(p), peopleOr(G)]);
      const rain = a.daily.precipitation_sum, mm = Math.max(...rain.filter(ok)), unit = mm / 1000 * G.area;
      const R = NEAR * PACE / DETOUR / G.size, parkMin = needs(G)[4][1], w = (i) => (pop ? pop[i] : 1), hi0 = heatOf(G);
      // the city with some cells made park: each loses its buildings and paving to grass and trees
      const state = (parks) => {
        const set = new Set(parks), cover = (i) => (set.has(i) ? 0 : G.cover[i]), paved = (i) => (set.has(i) ? .1 : G.paved[i]), green = (i) => (set.has(i) ? .9 : G.green[i]);
        const heat = Float32Array.from({ length: N }, (_, i) => {
          if (set.has(i)) return Math.max(0, 50 + 50 * (.1 - .9 - G.water[i]));
          return parks.some((q) => cheb(G, q, i) <= 1) ? Math.max(0, hi0[i] - COOL) : hi0[i];
        });
        const run = runoff(G, T, mm, { cover, paved, green });
        const pm = parks.length ? minutesWith(G, parkMin, parks.map((q) => ({ c: q % G.n + .5, r: ((q / G.n) | 0) + .5 }))) : parkMin;
        const live = (i) => !set.has(i);
        return { heat, cells: Float32Array.from(run.acc, (v) => v / unit), pm,
          hot: sum(built.filter((i) => live(i) && heat[i] >= HOT).map(w)), pooled: [...Array(N).keys()].filter((i) => G.water[i] < .6 && run.acc[i] / unit >= 15).length,
          reach: sum(built.filter((i) => live(i) && pm[i] <= NEAR).map(w)), floor: sum(parks.map((q) => G.floor[q])), moved: pop ? sum(parks.map((q) => pop[q])) : null };
      };
      const before = state([]);
      // the cell where one park does the most: people who gain a park within the walk, people in warm cells
      // it cools, rain it stops running off (twice over on a valley floor, where water arrives), less the
      // floor it takes; each part over its best, the three gains equal, the cost at half
      const suggest = (parks) => {
        const now = state(parks), cand = [...Array(N).keys()].filter((q) => can(q) && G.green[q] < .5 && !parks.includes(q));
        const rows = cand.map((q) => {
          const qc = q % G.n, qr = (q / G.n) | 0, ri = Math.ceil(R);
          let reach = 0, heat = 0;
          for (let dr = -ri; dr <= ri; dr++) for (let dc = -ri; dc <= ri; dc++) {
            const c = qc + dc, r = qr + dr; if (c < 0 || r < 0 || c >= G.n || r >= G.n || Math.hypot(dc, dr) > R) continue;
            const i = r * G.n + c;
            if (G.foot[i] > 0 && now.pm[i] > NEAR) reach += w(i);
            if (Math.max(Math.abs(dc), Math.abs(dr)) === 1 && G.foot[i] > 0 && now.heat[i] >= 75) heat += w(i);
          }
          const Cnow = .95 * G.cover[q] + .9 * Math.min(1 - G.cover[q], G.paved[q]) + .15 * G.green[q];
          const water = Math.max(0, Cnow - .225) * (T.acc[q] >= T.T ? 2 : 1);
          return { q, reach, heat, water, cost: G.floor[q] };
        });
        const top = (k) => Math.max(1e-9, ...rows.map((r) => r[k]));
        const [mr, mh, mw, mc] = ["reach", "heat", "water", "cost"].map(top);
        for (const r of rows) r.score = r.reach / mr + r.heat / mh + r.water / mw - .5 * r.cost / mc;
        return rows.sort((x, y) => y.score - x.score)[0];
      };
      let parks = [], said = "", dim = "heat";
      const layer = () => {
        const S = state(parks);
        const spec = dim === "water"
          ? gridLayer({ G, vals: S.cells, mask: landOf(G), title: `where the rain of the wettest day gathers${parks.length ? ", with the parks" : ""}`, unit: "cells' worth of runoff arriving",
              breaks: [1, 2, 5, 15], labels: ["its own or less", "1–2 cells", "2–5", "5–15", "over 15: where it pools"], sheets: { valleys: true }, tip: (i) => `<b>${fmt(S.cells[i], 1)} cells' worth</b> · was ${fmt(before.cells[i], 1)}` })
          : dim === "reach"
            ? gridLayer({ G, vals: S.pm, mask: can, weigh: true, title: "walk to a park", unit: "minutes", breaks: MIN_BREAKS, labels: MIN_LABELS, tip: (i) => `<b>${fmt(S.pm[i])} min to a park</b> · was ${fmt(before.pm[i])}` })
            : gridLayer({ G, vals: S.heat, mask: (i) => G.water[i] < .6, weigh: true, title: `the heat-island proxy${parks.length ? ", with the parks" : ""}`, unit: "0–100",
                breaks: [50, 65, 75, HOT], labels: ["under 50: cool", "50–65", "65–75", "75–85: hot", "85 and over: hottest"], tip: (i) => `<b>heat index ${fmt(S.heat[i])}</b> · was ${fmt(hi0[i])}` });
        const was = dim === "water" ? before.cells : dim === "reach" ? before.pm : hi0, now = dim === "water" ? S.cells : dim === "reach" ? S.pm : S.heat;
        spec.marks = [...Array(N).keys()].filter((i) => now[i] < was[i] - .01 && !parks.includes(i));
        spec.plan = parks.map((q) => ({ c: q % G.n + .5, r: ((q / G.n) | 0) + .5, name: "park", rad: R }));
        spec.click = (i) => { const k = parks.indexOf(i); if (k >= 0) parks.splice(k, 1); else if (G.water[i] < .6) parks.push(i); said = ""; update(); };
        return spec;
      };
      const unitWord = pop ? "people" : "built cells";
      const out = () => {
        const S = state(parks), row = (l, a2, b2, f = (x) => (pop ? big(x) : fmt(x))) => [l, parks.length ? `${f(a2)} → <b>${f(b2)}</b>` : f(a2)];
        return (parks.length
          ? stat(`${parks.length}`, `park${parks.length > 1 ? "s" : ""} of ${fmt(ha(G), 2)} ha, on ${big(S.floor)} m² of floor${S.moved !== null ? ` where about ${fmt(S.moved)} people live` : ""}`, "what the city gains, and what it gives up")
          : stat("?", "Where would one park do the most?", "click a cell to put a park there, or let the grid suggest one"))
          + dl([row(`${unitWord} in the hottest cells`, before.hot, S.hot), row("cells where the rain pools", before.pooled, S.pooled, fmt),
                row(`${unitWord} with a park within ${NEAR} min`, before.reach, S.reach)])
          + (said ? `<p class="cc-ask__a">${said}</p>` : "")
          + `<div class="cc-pills"><button type="button" data-psug>(suggest a cell)</button>${parks.length ? `<button type="button" data-pclear>(clear ${parks.length})</button>` : ""}</div>`;
      };
      const ctl = () => pills([["heat", "heat"], ["water", "water"], ["reach", "walk to a park"]], dim, "data-kdim-v");
      const update = () => { el.querySelector("[data-kout]").innerHTML = out(); ctx.grid(layer()); };
      el.innerHTML = `<div data-park><div data-kdims>${ctl()}</div><div data-kout>${out()}</div>`
        + note(`The point is to change one thing and watch every system answer at once. A park here is a whole 150 m cell given over to grass and trees: it stops being hot and its neighbours cool a little (${COOL} points of the index, one cell out, after Bowler et al., 2010); its ground soaks most of its own rain instead of shedding it, and less runs down the valley; and it puts a park within ${NEAR} minutes of everyone around it. The suggestion weighs the three gains equally against the floor the park takes, ${pop ? "counting people from Meta's estimate" : "counting built cells"}. Change the weights and the answer moves: that argument is the point of the tool.`)
        + "</div>";
      ctx.grid(layer());
      el.querySelector("[data-park]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-kdim-v],[data-psug],[data-pclear]"); if (!b2) return;
        if (b2.dataset.kdimV) { dim = b2.dataset.kdimV; el.querySelector("[data-kdims]").innerHTML = ctl(); ctx.grid(layer()); return; }
        if (b2.hasAttribute("data-pclear")) { parks = []; said = ""; }
        else {
          const best = suggest(parks);
          if (best) {
            parks.push(best.q);
            const S = state(parks), prev = state(parks.slice(0, -1));
            said = `A park ${whereOn(G, best.q)}: ${unitWord} with a park within ${NEAR} min ${fmt(prev.reach)} → ${fmt(S.reach)}; in the hottest cells ${fmt(prev.hot)} → ${fmt(S.hot)}; cells where rain pools ${fmt(prev.pooled)} → ${fmt(S.pooled)}. It takes ${big(G.floor[best.q])} m² of floor.`;
          }
        }
        update();
      });
    },
  },

  "p-home": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = `<div data-home><div data-odims></div><div data-card>${note("(click any cell on the map to read a typical building in it)")}</div>`
        + `<p class="cc-sub cc-sub--h">(the roof: what panels on it would make)</p><div data-sun></div>`
        + `<p class="cc-sub cc-sub--h">(the tank: could the roof keep the house in water)</p><div data-tank></div>`
        + `<p class="cc-sub cc-sub--h">(off the grid: how far from running on its own)</p><div data-off></div></div>`;
      const specs = {};
      let dim = "sun", pick = -1;
      const G = await cityGrid(p, GRID), [g, a, T, pop] = await Promise.all([nasa(p).then(ghiMonths), archive(p), ground(G).catch(() => null), peopleOr(G)]);
      const rainYr = sum(a.daily.precipitation_sum.filter(ok)) / 5, hi = heatOf(G), near = nearCount(G);
      const wrap = (spec) => ({ ...spec, marks: pick >= 0 ? [pick] : [], click: (i) => { pick = i; card(); show(); } });
      const show = () => { if (specs[dim]) ctx.grid(wrap(specs[dim])); };
      const sub = (k) => ({ ...ctx, grid: (spec) => { specs[k] = spec; if (dim === k) show(); } });
      const card = () => {
        const i = pick, nb = Math.max(1, G.bcount[i]), roof = G.roof[i] / nb;
        if (!G.bcount[i]) { el.querySelector("[data-card]").innerHTML = note(`(no building is mapped in that cell${G.green[i] >= .3 ? ": it is green" : G.water[i] >= .3 ? ": it is water" : ""}. Click a built one.)`); return; }
        el.querySelector("[data-card]").innerHTML = `<p class="cc-ask__q">A building ${whereOn(G, i)}</p>`
          + dl([["buildings in the cell", fmt(G.bcount[i])], ["a typical roof", `${fmt(roof)} m² · about ${fmt(G.height[i])} m tall`],
                ["its panels could make", `${fmt(roofKwh(G, i, g.annual) / nb)} kWh a year`], ["its roof could catch", `${fmt(roof * rainYr / 1000 * .8, 1)} kL of rain a year`],
                ["heat", `index ${fmt(hi[i])} · ${LCZ[climateZones(G)[i]]}`], ["the ground", T && T.acc[i] >= T.T ? "a valley floor: water comes here" : "not on a valley floor"],
                ["daily needs within 5 min", `${near[i]} of 8`], pop && ["people in the cell", `about ${fmt(pop[i])}`]])
          + `<div class="cc-pills"><button type="button" data-useroof>(use this roof below: ${fmt(Math.round(roof))} m²)</button></div>`;
      };
      const ctl = () => pills([["sun", "the roofs"], ["tank", "the rain"], ["off", "off the grid"]], dim, "data-odim-v");
      el.querySelector("[data-odims]").innerHTML = ctl();
      const run = () => {
        placeSteps["p-sun"].render(el.querySelector("[data-sun]"), p, sub("sun")).catch((e) => console.warn(e));
        placeSteps["p-water"].render(el.querySelector("[data-tank]"), p, sub("tank")).catch((e) => console.warn(e));
        placeSteps["p-grid"].render(el.querySelector("[data-off]"), p, sub("off")).catch((e) => console.warn(e));
      };
      run();
      el.querySelector("[data-home]").addEventListener("click", (e) => {
        const b2 = e.target.closest("[data-odim-v],[data-useroof]"); if (!b2) return;
        if (b2.dataset.odimV) { dim = b2.dataset.odimV; el.querySelector("[data-odims]").innerHTML = ctl(); show(); return; }
        ctx.household.roof = Math.max(10, Math.round(G.roof[pick] / Math.max(1, G.bcount[pick]))); run();
      });
    },
  },
};
