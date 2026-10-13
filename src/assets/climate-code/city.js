/* city.js — the city, cell by cell (12–19). After MIT City Science's CityScope: one fixed grid of 150 m
   cells over the chosen place (grid.js), and one number per cell per system: buildings, energy, mobility,
   food, water, waste, air; then the three CityScope reads the city by, density, diversity and proximity,
   all at once. Every value is measured from OpenStreetMap's tiles or modelled from them in a way the
   chapter states; nothing is a population estimate. Each step is `render(el, place, ctx)` like place.js,
   and hands the map a tile layer through ctx.grid(). Points are dots in the categorical palette's
   second and third slots (orange, green), so they never read as a class of the blue tiles. */
import { fmt, big, esc, ok, stat, dl, bars, pills, note, loading, failed, CAT } from "./ui.js";
import { cityGrid, elevation, walkMinutes, DETOUR, PACE } from "./grid.js";
import { gridLayer } from "./tiles.js";
import { archive, nasa, ghiMonths, getJSON, once } from "./place.js";

const GRID = { n: 32, size: 150 };
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
  const green = walkMinutes(G, [...greenPts, ...(G.pts.green || [])]);
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

/* stormwater: what runs off each cell on the wettest day of 2019–23, routed downhill (D8) over the DEM */
function runoff(G, Z, mm) {
  const n = G.n, N = n * n, own = new Float32Array(N), acc = new Float32Array(N), C = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const b = G.cover[i], pv = Math.min(1 - b, G.paved[i]), gr = Math.min(1 - b - pv, G.green[i]), w = Math.min(1 - b - pv - gr, G.water[i]);
    C[i] = .95 * b + .9 * pv + .15 * gr + .45 * Math.max(0, 1 - b - pv - gr - w);
    own[i] = acc[i] = C[i] * mm / 1000 * G.area;
  }
  const order = [...Array(N).keys()].sort((a, b) => Z[b] - Z[a]);
  for (const i of order) {
    if (G.water[i] >= .5) continue;   // a lake or river keeps what reaches it
    const r = (i / n) | 0, c = i % n;
    let to = -1, steep = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const j = rr * n + cc, drop = (Z[i] - Z[j]) / Math.hypot(dr, dc);
      if (drop > steep) { steep = drop; to = j; }
    }
    if (to >= 0) acc[to] += acc[i];
  }
  return { own, acc, C };
}

/* traffic exposure: road length near a cell, weighted by how busy the road class is and how far it is */
function exposure(G) {
  const n = G.n, w = Float32Array.from({ length: n * n }, (_, i) => 3 * G.road[0][i] + 1.5 * G.road[1][i] + .3 * G.road[2][i]);
  const out = new Float32Array(n * n), k = 2;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    let s = 0;
    for (let dr = -k; dr <= k; dr++) for (let dc = -k; dc <= k; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      s += w[rr * n + cc] * Math.exp(-Math.hypot(dr, dc) * G.size / 150);
    }
    out[r * n + c] = s / (G.area / 1e4);   // weighted road metres per hectare
  }
  return out;
}
const quintiles = (vals, mask) => {
  const v = [...vals].filter((x, i) => mask(i) && ok(x)).sort((a, b) => a - b);
  return v.length < 5 ? [1, 2, 3, 4] : [.2, .4, .6, .8].map((q) => v[Math.floor(q * (v.length - 1))]).map((x, i, a) => (i && x <= a[i - 1] ? a[i - 1] + 1e-6 : x));
};

const air = (p) => once("aq" + p.lat.toFixed(3) + p.lon.toFixed(3), () => getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}`
  + "&hourly=pm2_5,nitrogen_dioxide&past_days=7&forecast_days=1&timezone=auto"));
const meanOf = (a) => { const v = (a || []).filter(ok); return v.length ? sum(v) / v.length : null; };

/* ── the chapters ───────────────────────────────────────────────────────────────────────────────── */
export const steps = {
  "c-build": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the buildings in the map tiles");
      const G = await cityGrid(p, GRID), N = G.n * G.n, far = Float32Array.from({ length: N }, (_, i) => G.floor[i] / G.area);
      const foot = sum(G.foot), floor = sum(G.floor), built = builtCells(G);
      const tall = built.reduce((a, i) => (G.height[i] > G.height[a] ? i : a), built[0] ?? 0);
      ctx.grid(gridLayer({ G, vals: far, mask: (i) => G.foot[i] > 0, title: "floor area ratio", unit: "floor area ÷ ground area, per cell",
        breaks: [.25, .5, 1, 2], labels: ["under 0.25", "0.25–0.5", "0.5–1", "1–2", "over 2"],
        tip: (i) => `<b>FAR ${fmt(far[i], 2)}</b><br>${fmt(pct(G.foot[i], G.area))}% of the ground built on · ${fmt(G.bcount[i])} buildings · about ${fmt(G.height[i])} m tall` }));
      el.innerHTML = stat(fmt(floor / (G.area * N), 2), `floor area ratio across the window · ${big(floor)} m² of floor on ${big(foot)} m² of ground`, winName(G))
        + dl([["ground built on", `${fmt(pct(foot, G.area * N))}%`], ["streets and paths", `${fmt(sum(G.road.map(sum)) / 1000)} km`],
              ["buildings mapped", fmt(sum(G.bcount))], ["the tallest cell, on average", `${fmt(G.height[tall])} m`],
              ["cells with any building", `${fmt(pct(built.length, N))}%`]])
        + note("Floor area is each footprint times its height over 3.2 m a floor; a building with no height counts as one floor. CityScope starts here: density is the first thing the table measures.")
        + thin(G);
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
      ctx.grid(gridLayer({ G, vals: m, mask: peopled(G), title: "walk to the nearest bus, tram, train or metro", unit: "minutes",
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

  "c-food": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("grocers and markets in the map tiles");
      const G = await cityGrid(p, GRID), m = G.minutes.food || new Float32Array(G.n * G.n).fill(Infinity), people = builtCells(G);
      const desert = people.filter((i) => m[i] > 15);
      ctx.grid(gridLayer({ G, vals: m, mask: peopled(G), title: "walk to fresh food: a grocer, market, baker or butcher", unit: "minutes",
        breaks: MIN_BREAKS, labels: MIN_LABELS,
        pts: ptsOf(G, ["food"], ORANGE()), ptsKey: [[ORANGE(), "grocer, market, baker, butcher"]],
        tip: (i) => `<b>${minTip(G, i, "food", "fresh food")}</b><br>${fmt(G.farm[i] * 100)}% farmland · ${fmt(G.green[i] * 100)}% green` }));
      el.innerHTML = stat(`${fmt(share(people, (i) => m[i] <= 10))}%`, "of built cells within ten minutes' walk of fresh food", `${fmt((G.pts.food || []).length)} food shops mapped`)
        + bars([["within 5 min", share(people, (i) => m[i] <= 5), "%"], ["5–15 min", share(people, (i) => m[i] > 5 && m[i] <= 15), "%"],
                ["over 15 min: a food desert", pct(desert.length, people.length), "%"]])
        + dl([["farmland in the window", `${fmt(sum(G.farm) * G.area / 1e4)} ha`], ["green ground that could grow food", `${fmt(sum(G.green) * G.area / 1e4)} ha`],
              ["places to eat out", fmt((G.pts.eat || []).length)]])
        + note("Day 04 read food at the scale of a country's imports; this is the last mile, the walk to the shop. Street vendors and weekly markets rarely appear in OpenStreetMap, so in many Indian cities this undercounts.") + thin(G);
    },
  },

  "c-water": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the ground's height, and five years of rain");
      const [G, a] = await Promise.all([cityGrid(p, GRID), archive(p)]);
      const Z = await elevation(G), rain = a.daily.precipitation_sum, mm = Math.max(...rain.filter(ok)), day = a.daily.time[rain.indexOf(mm)];
      const { own, acc, C } = runoff(G, Z, mm), unit = mm / 1000 * G.area, cells = Float32Array.from(acc, (v) => v / unit);
      ctx.grid(gridLayer({ G, vals: cells, mask: landOf(G), title: `where the rain of ${day} gathers`, unit: "cells' worth of runoff arriving",
        breaks: [1, 2, 5, 15], labels: ["its own or less", "1–2 cells", "2–5", "5–15", "over 15: where it pools"],
        pts: ptsOf(G, ["tap"], ORANGE()), ptsKey: [[ORANGE(), "drinking-water tap"]],
        tip: (i) => `<b>${fmt(acc[i])} m³ arrives</b> on the wettest day<br>${fmt(C[i] * 100)}% of its own rain runs off · ${fmt(Z[i])} m above sea` }));
      const land = [...Array(G.n * G.n).keys()].filter(landOf(G)), total = sum(land.map((i) => own[i]));
      const fall = mm / 1000 * G.area * land.length, zs = land.map((i) => Z[i]);
      el.innerHTML = stat(`${fmt(mm)} mm`, `fell in one day, ${day}, the wettest of 2019–23 here · ${big(total)} m³ of it ran off the window's land`)
        + bars([["of the rain that ran off", pct(total, fall), "%"], ["cells where it pools (15+ cells' worth)", share(land, (i) => cells[i] >= 15), "%"]])
        + dl([["lowest and highest ground", `${fmt(Math.min(...zs))}–${fmt(Math.max(...zs))} m`], ["ground built on or paved", `${fmt(pct(sum(land.map((i) => Math.min(1, G.cover[i] + G.paved[i]))), land.length))}%`],
              ["open water in the window", `${fmt(sum(G.water) * G.area / 1e4)} ha`], ["drinking taps mapped", fmt((G.pts.tap || []).length)]])
        + note("CityScope's stormwater module, simplified: each cell sheds a share of the rain (95% of a roof, 90% of a road, 15% of a park, 45% of bare ground), and what it sheds flows to its steepest-downhill neighbour on Copernicus's 90 m elevation model. The darkest tiles are where a city floods first, and where a tank or a soak pit does the most.") + thin(G);
    },
  },

  "c-waste": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("bins and recycling points in the map tiles");
      const G = await cityGrid(p, GRID), m = G.minutes.recycle || new Float32Array(G.n * G.n).fill(Infinity), people = builtCells(G);
      const bins = (G.pts.bin || []).length, rec = (G.pts.recycle || []).length, streets = (sum(G.road[1]) + sum(G.road[2]) + sum(G.road[3])) / 1000;
      ctx.grid(gridLayer({ G, vals: m, mask: peopled(G), title: "walk to the nearest recycling point", unit: "minutes",
        breaks: [5, 10, 15, 20], labels: ["under 5 min", "5–10", "10–15", "15–20", "over 20, or none in view"],
        pts: [...ptsOf(G, ["recycle"], ORANGE()), ...ptsOf(G, ["bin"], GREEN())], ptsKey: [[ORANGE(), "recycling point"], [GREEN(), "public bin"]],
        tip: (i) => `<b>${minTip(G, i, "recycle", "recycling")}</b><br>${minTip(G, i, "bin", "a public bin")}` }));
      el.innerHTML = stat(fmt(rec), `recycling points mapped in the window · ${fmt(bins)} public bins, ${fmt(bins / Math.max(1, streets), 1)} a km of street`)
        + bars([["built cells within 10 min of recycling", share(people, (i) => m[i] <= 10), "%"],
                ["within 5 min of a public bin", share(people, (i) => (G.minutes.bin?.[i] ?? Infinity) <= 5), "%"]])
        + (rec ? "" : note("OpenStreetMap shows no recycling point here. That may be the map rather than the city: in much of India, recycling runs through kabadiwalas and informal collectors no map records."))
        + note("Waste is the system cities map least. This chapter measures only what is mapped, and says so; a blank here is a question for the city, not an answer.") + thin(G);
    },
  },

  "c-air": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("roads in the map tiles, and the week's air from copernicus");
      const [G, aq] = await Promise.all([cityGrid(p, GRID), air(p).catch(() => null)]);
      const e = exposure(G), land = landOf(G), br = quintiles(e, land), people = builtCells(G);
      ctx.grid(gridLayer({ G, vals: e, mask: land, title: "traffic near each cell", unit: "fifths of this window, quietest to busiest",
        breaks: br, labels: ["quietest fifth", "second", "middle", "fourth", "busiest fifth"],
        tip: (i) => `<b>${["quietest fifth", "second fifth", "middle fifth", "fourth fifth", "busiest fifth"][br.filter((b) => e[i] >= b).length]}</b><br>${fmt(G.road[0][i] + G.road[1][i])} m of main road in the cell · ${fmt(G.green[i] * 100)}% green` }));
      const pm = meanOf(aq?.hourly?.pm2_5), no2 = meanOf(aq?.hourly?.nitrogen_dioxide);
      el.innerHTML = (ok(pm) ? stat(`${fmt(pm / 5, 1)}×`, `the WHO's annual limit for fine particles, this past week · ${fmt(pm, 1)} µg/m³ PM2.5`, ok(no2) ? `nitrogen dioxide ${fmt(no2, 1)} µg/m³ · who annual limit 10` : "")
          : failed("Copernicus's air-quality service"))
        + bars([["built cells in the busiest two-fifths", share(people, (i) => e[i] >= br[2]), "%"],
                ["main roads with green within the cell", share([...Array(G.n * G.n).keys()].filter((i) => G.road[0][i] + G.road[1][i] > 100), (i) => G.green[i] > .15), "%"]])
        + note("The week's air is Copernicus's model (CAMS), about 40 km a pixel: it says how bad the air is, not where. The grid says where. Nitrogen dioxide falls to background within a few hundred metres of a busy road, so each cell weighs the main road (×3), secondary road (×1.5) and local street (×0.3) metres around it, fading over 150 m. It is relative: the busiest fifth of this window, not a measured dose.") + thin(G);
    },
  },

  "c-near": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("everything in the map tiles");
      const G = await cityGrid(p, GRID), N = G.n * G.n, near = nearCount(G), mix = diversity(G), far = Float32Array.from({ length: N }, (_, i) => G.floor[i] / G.area);
      const people = builtCells(G), need = needs(G);
      let dim = "near";
      const layer = () => dim === "near"
        ? gridLayer({ G, vals: near, mask: peopled(G), title: `daily needs within a ${NEAR}-minute walk`, unit: "of eight",
            breaks: [3, 5, 7, 8], labels: ["0–2", "3–4", "5–6", "7", "all 8"],
            tip: (i) => `<b>${near[i]} of 8 within ${NEAR} min</b><br>${need.some(([, m]) => m[i] > NEAR) ? "missing: " + esc(need.filter(([, m]) => m[i] > NEAR).map(([k]) => k).join(", ")) : "everything"}` })
        : dim === "mix"
          ? gridLayer({ G, vals: mix, mask: peopled(G), title: "diversity: how mixed the places within 400 m are", unit: "shannon entropy, 0–1",
              breaks: [.4, .55, .7, .85], labels: ["under 0.4: one kind of place", "0.4–0.55", "0.55–0.7", "0.7–0.85", "over 0.85: everything"],
              tip: (i) => `<b>diversity ${fmt(mix[i], 2)}</b>` })
          : gridLayer({ G, vals: far, mask: (i) => G.foot[i] > 0, title: "density: floor area ratio", unit: "floor area ÷ ground area",
              breaks: [.25, .5, 1, 2], labels: ["under 0.25", "0.25–0.5", "0.5–1", "1–2", "over 2"],
              tip: (i) => `<b>FAR ${fmt(far[i], 2)}</b>` });
      const ctl = () => pills([["near", "proximity"], ["mix", "diversity"], ["dense", "density"]], dim, "data-dim-v");
      const all = share(people, (i) => near[i] === 8), mixMean = meanOf(people.map((i) => mix[i]));
      el.innerHTML = `<div data-dims>${ctl()}</div>`
        + stat(`${fmt(all)}%`, `of built cells reach all eight daily needs within ${NEAR} minutes on foot`, `density ${fmt(sum(G.floor) / (G.area * N), 2)} · diversity ${fmt(mixMean, 2)} · proximity ${fmt(meanOf(people.map((i) => near[i])), 1)} of 8`)
        + `<p class="cc-sub">(share of built cells within ${NEAR} minutes of …)</p>`
        + bars(need.map(([k, m]) => [k, share(people, (i) => m[i] <= NEAR), "%"]))
        + note("City Science reads a district by three numbers: density (how much is built), diversity (how mixed it is) and proximity (how much of daily life is a short walk away). The fifteen-minute city is the same idea; here the walk is five minutes, about 300 m, because at ten nearly every cell of a city centre reaches everything. Chapter 10 read every country at once; this reads every cell.") + thin(G);
      ctx.grid(layer());
      el.querySelector("[data-dims]").addEventListener("click", (e) => {
        const b = e.target.closest("[data-dim-v]"); if (!b) return;
        dim = b.dataset.dimV; el.querySelector("[data-dims]").innerHTML = ctl(); ctx.grid(layer());
      });
    },
  },
};

export { GRID };
