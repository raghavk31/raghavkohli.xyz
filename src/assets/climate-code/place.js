/* place.js — the six chapters that work for one point on earth (11–16), each one of the Resilience Stack
   days run in the browser against the same live services the Streamlit app used. The arithmetic is the
   day's own, line for line; the constants come from atlas.json (read out of the day's file), so a change
   there reaches here on the next build. Every step is `render(el, place, ctx)`; ctx carries the atlas
   tools (T), the map (ctx.points / ctx.fly) and the AI helper. */
import { fmt, big, usd, esc, lc, ok, stat, dl, bars, columns, pills, note, loading, failed, CAT } from "./ui.js";
import { cityGrid, walkMinutes, GRID } from "./grid.js";
import { gridLayer, swatchKey } from "./tiles.js";

/* ── the map for each step: a tile grid over the place (grid.js, tiles.js) ─────────────────────── */
const REGION = { n: 36, size: 1000, z: 11 };
const sumOf = (a) => a.reduce((s, x) => s + x, 0);
/* heat-island proxy: built and paved ground warms, green and water cool; 50 is a cell of neither */
export const heatIndex = (G, i) => Math.max(0, Math.min(100, 50 + 50 * (Math.min(1, G.cover[i] + G.paved[i]) - G.green[i] - G.water[i])));
const roofKwh = (G, i, ghi) => G.roof[i] * .6 * ghi * 365 * .2 * .8;   // city.js's arithmetic: 60% usable, 20% panels, PR 0.8
/* draw the grid when it arrives; a map that fails leaves the chapter's numbers standing */
const mapIt = (ctx, p, opts, make) => cityGrid(p, opts).then((G) => ctx.grid(make(G))).catch((e) => console.warn("grid", e));

/* ── fetching: one request per place and service, kept for the visit ─────────────────────────────── */
const cache = new Map();
export const once = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key);
};
const at = (p) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
export async function getJSON(url, opts = {}, ms = 30000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

export const geocode = (q) =>
  getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`)
    .then((d) => (d.results || []).map((r) => ({ name: r.name, admin1: r.admin1 || "", country: r.country || "", lat: r.latitude, lon: r.longitude })));

const forecast = (p) => once("f" + at(p), () => getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}`
  + "&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum&timezone=auto&forecast_days=7"));
// one five-year archive (2019–23) serves four days: 13's climate, 14's and 15's rain, 16's heat
export const archive = (p) => once("a" + at(p), () => getJSON(`https://archive-api.open-meteo.com/v1/archive?latitude=${p.lat}&longitude=${p.lon}`
  + "&start_date=2019-01-01&end_date=2023-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,apparent_temperature_max&timezone=auto", {}, 45000));
const projection = (p, y) => once(`c${y}` + at(p), () => getJSON(`https://climate-api.open-meteo.com/v1/climate?latitude=${p.lat}&longitude=${p.lon}`
  + `&start_date=${y}-01-01&end_date=${y}-12-31&models=EC_Earth3P_HR&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`, {}, 45000));
export const nasa = (p) => once("n" + at(p), () => getJSON("https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=ALLSKY_SFC_SW_DWN"
  + `&community=RE&longitude=${p.lon.toFixed(3)}&latitude=${p.lat.toFixed(3)}&start=2020&end=2023&format=JSON`, {}, 45000));
// overpass-api.de first, as Day 16 did; the mirrors when it refuses
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter"];
export const osm = (p, r = 2500) => once("o" + at(p), async () => {
  const a = `(around:${r},${p.lat},${p.lon})`;
  const q = `[out:json][timeout:25];(way["leisure"="park"]${a};way["leisure"="garden"]${a};way["natural"="wood"]${a};`
    + `way["landuse"="forest"]${a};way["natural"="water"]${a};node["amenity"="drinking_water"]${a};node["amenity"="fountain"]${a};);out center;`;
  for (const u of OVERPASS) {
    try { return await getJSON(u, { method: "POST", body: new URLSearchParams({ data: q }) }, 30000); } catch (e) { /* next mirror */ }
  }
  throw new Error("overpass");
});

/* ── the days' arithmetic ─────────────────────────────────────────────────────────────────────────── */
const byMonth = (dates, vals) => {
  const b = Array.from({ length: 12 }, () => []);
  dates.forEach((d, i) => { if (ok(vals[i])) b[+d.slice(5, 7) - 1].push(vals[i]); });
  return b;
};
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const km = (a, b) => {   // haversine_km()
  const R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lon - a.lon) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/* Day 01 heat_risk_level() */
const riskLevel = (peak) => peak >= 47 ? "extreme" : peak >= 43 ? "very high" : peak >= 40 ? "high" : peak >= 35 ? "moderate" : "low";

/* Day 13 _parse_climate() */
function climate(daily) {
  const tmax = daily.temperature_2m_max.map((v, i) => [v, daily.temperature_2m_min[i]]).filter(([a, b]) => ok(a) && ok(b));
  const prec = daily.precipitation_sum.map((v) => (ok(v) ? v : 0));
  const years = Math.max(1, tmax.length / 365);
  return {
    mean_temp: Math.round(mean(tmax.map(([a, b]) => (a + b) / 2)) * 10) / 10,
    annual_precip: Math.round(prec.reduce((s, x) => s + x, 0) / years),
    frost_days: Math.round(tmax.filter(([, b]) => b < 0).length / years * 10) / 10,
    heat_stress_days: Math.round(tmax.filter(([a]) => a > 35).length / years * 10) / 10,
  };
}
/* Day 13 score_crop() and classify() */
function scoreCrop(c, k) {
  let s = 100;
  const { mean_temp: mt, annual_precip: pr, frost_days: fr, heat_stress_days: ht } = k;
  const [tl, th] = c.temp_opt, [al, ah] = c.temp_abs, [pl, ph] = c.precip_opt, [ql, qh] = c.precip_abs;
  if (mt < tl) { s -= (tl - mt) * 8; if (mt < al) s -= (al - mt) * 20; }
  else if (mt > th) { s -= (mt - th) * 8; if (mt > ah) s -= (mt - ah) * 20; }
  if (pr < pl) { s -= (pl - pr) / Math.max(pl, 1) * 30; if (pr < ql) s -= (ql - pr) / Math.max(ql, 1) * 20; }
  else if (pr > ph) { s -= (pr - ph) / Math.max(ph, 1) * 20; if (pr > qh) s -= (pr - qh) / Math.max(qh, 1) * 15; }
  if (fr > c.frost_days_max) s -= Math.min(55, (fr - c.frost_days_max) * (c.frost_days_max === 0 ? 3 : 1.5));
  if (ht > c.heat_days_max) s -= Math.min(45, (ht - c.heat_days_max) * (c.heat_days_max === 0 ? 1.5 : .8));
  return Math.max(0, Math.min(100, Math.trunc(s)));
}
const suited = (s) => s >= 70 ? "well suited" : s >= 45 ? "marginal" : "not suited";

/* Day 02 calc() and solar_class() */
const solarCalc = (T, ghi, n) => {
  const k = T.d02, kwh = ghi * n * k.PANEL_M2 * k.EFFICIENCY * k.PERF_RATIO * 365, peak = n * k.PANEL_W / 1000, cost = peak * 1000 * k.COST_USD_W;
  return { kwh, peak, cost, homes: kwh / 3500, trees: kwh * k.CO2_G_KWH / 1000 / 21, payback: kwh > 0 ? cost / (kwh * .12) : null };
};
const solarClass = (T, g) => lc((T.d02.SOLAR_BANDS.find((b) => g >= b[0]) || [0, "low"])[1]);
/* NASA POWER monthly → twelve monthly means (Day 02 _month_avg, Day 14 fetch_solar_ghi) */
export function ghiMonths(d) {
  const raw = d.properties.parameter.ALLSKY_SFC_SW_DWN, b = Array.from({ length: 12 }, () => []);
  for (const [k, v] of Object.entries(raw)) { const m = +k.slice(4, 6); if (m >= 1 && m <= 12 && v > 0) b[m - 1].push(v); }
  const months = b.map((x) => Math.round(mean(x) * 100) / 100);
  return { months, annual: Math.round(mean(months.filter(ok)) * 100) / 100 };
}

/* Day 15 plan_water(), _simulate(), _tank_cost() */
function planWater(T, rainMonthly, h) {
  const k = T.d15, DAYS_MO = 30.4;
  const indoor = h.people * h.perCapita, garden = h.garden * k.GARDEN_L_PER_M2, total = indoor + garden, annualDemand = total * 365;
  const greyGen = indoor * k.F_GREYGEN, eff = k.GW_SYSTEMS[h.gw];
  const offset = h.gw.startsWith("Simple") ? garden : h.gw.startsWith("Treated") ? indoor * k.F_TOILET + garden : 0;
  const grey = Math.min(greyGen * eff, offset);
  const coll = rainMonthly.map((r) => Math.round(r * h.roof * k.ROOF_RUNOFF[h.roofType] * k.FIRST_FLUSH_EFF));
  const annualColl = coll.reduce((s, x) => s + x, 0);
  const remaining = Math.max(0, total - grey), annualRemaining = remaining * 365;
  const draw = Math.min(remaining, .95 * annualColl / 365), monthlyDraw = draw * DAYS_MO;
  let deficit = 0, maxDef = 0;
  for (let c = 0; c < 2; c++) for (let m = 0; m < 12; m++) { deficit = Math.max(0, deficit + monthlyDraw - coll[m]); maxDef = Math.max(maxDef, deficit); }
  let tank = Math.max(draw * 14, maxDef); tank = Math.min(tank, annualColl); tank = Math.max(1000, Math.ceil(tank / 500) * 500);
  let level = 0, supplied = 0, dry = 0, overflow = 0;
  for (let c = 0; c < 4; c++) {
    supplied = 0; overflow = 0; dry = 0;
    for (let m = 0; m < 12; m++) {
      level += coll[m]; if (level > tank) { overflow += level - tank; level = tank; }
      const use = Math.min(level, monthlyDraw); supplied += use; level -= use; if (use < monthlyDraw - 1) dry++;
    }
  }
  supplied = Math.min(supplied, annualRemaining);
  const greyAnnual = grey * 365, covered = greyAnnual + supplied;
  const coverage = Math.min(100, covered / Math.max(annualDemand, 1) * 100);
  const reliability = Math.max(0, (12 - dry) / 12);
  let tankCost = 0, prev = 0;
  for (const [cap, rate] of k.TANK_COST_TIERS) { const top = cap === null ? Infinity : cap, vol = Math.min(tank, top) - prev; if (vol <= 0) break; tankCost += vol * rate; prev = top; }
  return {
    score: Math.min(100, Math.round(coverage * (.7 + .3 * reliability))), coverage, coll, monthlyDraw, tank, dry, total, annualColl,
    rainPct: supplied / Math.max(annualDemand, 1) * 100, greyPct: greyAnnual / Math.max(annualDemand, 1) * 100, grey,
    units: Math.max(1, Math.ceil(tank / k.PRACTICAL_TANK_L)), supplyLimited: annualColl < annualRemaining,
    cost: tankCost + k.COST_COLLECTION + k.COST_FILTRATION + k.COST_PUMP + k.COST_GW[h.gw],
    dryList: coll.map((c, m) => (c - Math.round(monthlyDraw) < 0 ? MON[m] : null)).filter(Boolean),
  };
}

/* Day 14 calc_solar(), calc_battery(), calc_water(), calc_food(), independence_score() */
function offGrid(T, ghi, arc, h) {
  const k = T.d14, daily = h.kwh / 30;
  const wp = Math.ceil(daily * 1000 / (Math.min(...ghi.months) * .75) / 50) * 50, panels = Math.ceil(wp / 400);
  const gen = ghi.months.map((g) => wp / 1000 * g * .75 * 30), annualGen = gen.reduce((s, x) => s + x, 0);
  const solar = { wp, panels, area: panels * 2, gen, self: Math.min(100, annualGen / (h.kwh * 12) * 100), cost: wp * k.PANEL_COST_PER_WP + k.INVERTER_COST + k.BOS_COST };
  const need = daily * h.autonomy / (.8 * .95), units = Math.max(1, Math.ceil(need / 5.12));
  const battery = { kwh: units * 5.12, units, cost: units * 5.12 * k.BATTERY_COST_PER_KWH };
  const litres = h.people * 100, coll = arc.rain30.map((r) => r * h.roof * .85), needM = litres * 30;
  const def = coll.map((c) => Math.max(0, needM - c)), maxDef = Math.max(...def);
  let tank = maxDef > 0 ? Math.max(litres * 30, maxDef * 1.5) : litres * 14; tank = Math.ceil(tank / 500) * 500;
  const water = { coverage: Math.min(100, coll.reduce((s, x) => s + x, 0) / (needM * 12) * 100), tank, cost: tank * k.TANK_COST_PER_LITER + k.WATER_FILTER_COST };
  const grow = Math.max(3, arc.temp.filter((t) => t >= 10).length), per = Math.round(800 * 12 / grow), req = per * h.people;
  const food = { coverage: Math.min(100, h.land / Math.max(req, 1) * 100), required: req, grow, cost: h.land * k.GARDEN_PER_M2 };
  return { solar, battery, water, food, score: Math.min(100, Math.round(.4 * solar.self + .3 * water.coverage + .3 * food.coverage)),
           cost: solar.cost + battery.cost + water.cost + food.cost };
}

/* the five-year archive as the days read it */
export function readArchive(d) {
  const x = d.daily, dates = x.time;
  const rainD = byMonth(dates, x.precipitation_sum), tD = byMonth(dates, x.temperature_2m_max.map((v, i) => ok(v) && ok(x.temperature_2m_min[i]) ? (v + x.temperature_2m_min[i]) / 2 : null));
  const feels = x.apparent_temperature_max.filter(ok);
  return {
    climate: climate(x),
    rain30: rainD.map((v) => (v.length ? mean(v) * 30 : 50)),        // Day 14: × 30
    rain304: rainD.map((v) => (v.length ? mean(v) * 30.4 : 40)),     // Day 15: × 30.4
    temp: tD.map((v) => (v.length ? mean(v) : 15)),
    danger: Math.round(feels.filter((v) => v >= 35).length / (feels.length / 365.25)),   // Day 16 get_heat_context()
    peak: Math.round(Math.max(...feels)),
  };
}

/* ── an AI note: a button that asks the worker, and what came back ───────────────────────────────── */
function askBlock(el, ctx, { label, tool, input, show }) {
  const box = document.createElement("div");
  box.className = "cc-ai";
  box.innerHTML = `<button type="button" class="cc-ai__go">(${label} ↗)</button><div class="cc-ai__out" aria-live="polite"></div>`;
  el.appendChild(box);
  const out = box.querySelector(".cc-ai__out"), go = box.querySelector("button");
  go.addEventListener("click", async () => {
    go.disabled = true; out.innerHTML = note("(writing … this takes ten to forty seconds)");
    try {
      const r = await ctx.ai(tool, typeof input === "function" ? input() : input);
      out.innerHTML = show(r); go.textContent = `(${label} again ↗)`;
    } catch (e) {
      out.innerHTML = note(`(the AI note is not available right now: ${esc(e.message)})`);
    } finally { go.disabled = false; }
  });
}
const paras = (t) => String(t || "").split(/\n{2,}|\n(?=[A-Z0-9])/).map((s) => `<p>${esc(s.trim())}</p>`).join("");
const list = (xs, f = (x) => esc(x)) => xs && xs.length ? `<ul class="cc-list">${xs.map((x) => `<li>${f(x)}</li>`).join("")}</ul>` : "";
const where = (p) => [p.name, p.admin1, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
const phases = (r, after) => ["phase1", "phase2", "phase3"].map((k) => r[k]).filter(Boolean).map((ph) => `
  <div class="cc-phase"><p class="cc-sub">${esc(lc(ph.title))} · ${esc(ph.timeframe)} · ${usd(ph.budget)} · ${after} ${fmt(ph[after === "score" ? "score_after" : "coverage_after"])}</p>
  <p>${esc(ph.highlight)}</p>${list(ph.actions, (a) => `${esc(a.title)} <span>· ${esc(a.detail)} · ${usd(a.cost)}</span>`)}</div>`).join("");

/* ── the steps ───────────────────────────────────────────────────────────────────────────────────── */
export const steps = {
  "p-heat": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("the seven-day forecast");
      const f = await forecast(p), d = f.daily;
      const feels = d.apparent_temperature_max, peak = Math.max(...feels.filter(ok)), lvl = riskLevel(peak);
      const days = d.time.map((t) => new Date(t + "T12:00").toLocaleDateString("en-GB", { weekday: "short" }).toLowerCase());
      el.innerHTML = stat(`${fmt(peak)}°`, `the hottest it will feel this week · ${lvl} heat risk`)
        + columns(feels, days, { unit: " °C feels-like", d: 0, ref: 35, refLabel: "35 °C", hi: (v) => v >= 35 })
        + dl(d.time.map((t, i) => [days[i], `${fmt(d.temperature_2m_max[i])} °C · feels ${fmt(feels[i])} °C · ${fmt(d.precipitation_sum[i], 1)} mm rain`]));
      mapIt(ctx, p, GRID, (G) => {
        const v = Float32Array.from({ length: G.n * G.n }, (_, i) => heatIndex(G, i));
        return gridLayer({ G, vals: v, mask: (i) => G.water[i] < .6, title: "where the heat will sit: a heat-island proxy", unit: "built and paved against green and water, 0–100",
          breaks: [40, 50, 60, 70], labels: ["coolest", "cool", "even", "warm", "hottest"],
          tip: (i) => `<b>heat index ${fmt(v[i])}</b><br>${fmt(Math.min(1, G.cover[i] + G.paved[i]) * 100)}% built or paved · ${fmt(G.green[i] * 100)}% green · ${fmt(G.water[i] * 100)}% water` });
      });
      askBlock(el, ctx, { label: "write the heat brief", tool: "heat-brief",
        input: { place: where(p), risk: lvl.toUpperCase(), days: d.time.map((t, i) => ({ date: t, tmax: d.temperature_2m_max[i], feels: feels[i], rain: d.precipitation_sum[i] })) },
        show: (r) => paras(r.text) });
    },
  },

  "p-cool": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("openstreetmap and five years of heat");
      const [cWater, cTap, cPark] = CAT();
      mapIt(ctx, p, GRID, (G) => {
        // three kinds, the categorical palette's first three slots in order: water blue, far-from-both
        // orange, green green; every other cell stays an empty square of the table
        const cool = [];
        for (let r = 0; r < G.n; r++) for (let c = 0; c < G.n; c++) { const i = r * G.n + c; if (G.green[i] >= .3 || G.water[i] >= .3) cool.push([c + .5, r + .5]); }
        const m = walkMinutes(G, cool), ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#1c1b18";
        const kind = (i) => G.water[i] >= .3 ? 0 : G.green[i] >= .3 ? 2 : (G.foot[i] > 0 && m[i] > 10 ? 1 : -1);
        const cols = [cWater, cTap, cPark];
        return { G, label: `${G.n * G.size / 1000} km · ${G.size} m cells`,
          cell: (i) => { const k = kind(i); return k < 0 ? null : { col: cols[k] }; },
          pts: (G.pts.tap || []).map(([c, r]) => ({ c, r, col: ink })),
          legend: `<p class="cc-lg__t">shade and water within reach <span>· walking minutes</span></p>`
            + swatchKey([[cPark, "park, wood, garden"], [cWater, "water"], [cTap, "built, over 10 min from either"]])
            + swatchKey([[ink, "drinking tap or fountain"]], true),
          tip: (i) => G.water[i] >= .3 ? "<b>water</b>" : G.green[i] >= .3 ? `<b>green</b> · ${fmt(G.green[i] * 100)}% of the cell` : `<b>${fmt(m[i])} min</b> to shade or water` };
      });
      const [o, a] = await Promise.allSettled([osm(p), archive(p)]);
      const heat = a.status === "fulfilled" ? readArchive(a.value) : null;
      const out = { parks: [], water: [], taps: [] };
      if (o.status === "fulfilled") for (const e of o.value.elements || []) {
        const t = e.tags || {}, lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        if (!ok(lat) || !ok(lon)) continue;
        const kind = ["drinking_water", "fountain"].includes(t.amenity) ? "taps" : t.natural === "water" ? "water" : "parks";
        out[kind].push({ lat, lon, name: t.name || "", d: km(p, { lat, lon }) });
      }
      const near = out.parks.filter((x) => x.name).sort((a, b) => a.d - b.d).slice(0, 5);
      el.innerHTML = (heat ? stat(fmt(heat.danger), `dangerous-heat days in a normal year · feels-like ≥ 35 °C, at worst ${heat.peak} °C`) : failed("the heat archive"))
        + (o.status === "fulfilled" ? `<ul class="cc-key">
            <li><i style="background:${cPark}"></i>${out.parks.length} parks, gardens and woods</li>
            <li><i style="background:${cWater}"></i>${out.water.length} bodies of water</li>
            <li><i style="background:${cTap}"></i>${out.taps.length} public drinking taps and fountains</li></ul>`
            + (near.length ? `<p class="cc-sub">the nearest named green space</p>` + dl(near.map((x) => [esc(x.name), `${fmt(x.d, 1)} km`])) : note("No named green space within 2.5 km in OpenStreetMap."))
          : failed("OpenStreetMap"));
      if (o.status === "fulfilled") askBlock(el, ctx, { label: "plan a cool route", tool: "cool-route",
        input: { place: where(p), heat: heat ? { danger_per_year: heat.danger, peak_feels_like: heat.peak } : null,
                 parks: out.parks.map((x) => x.name).filter(Boolean).slice(0, 25), water: out.water.map((x) => x.name).filter(Boolean).slice(0, 10), taps: out.taps.length },
        show: (r) => paras(r.text) });
    },
  },

  "p-sun": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("nasa power, 2020–23");
      const g = ghiMonths(await nasa(p)), T = ctx.T;
      let n = 10;
      const bench = Object.entries(T.d02.BENCHMARKS).sort((a, b) => b[1] - a[1]);
      const brighter = bench.filter(([, v]) => v > g.annual).slice(-2).map(([k]) => k), dimmer = bench.filter(([, v]) => v <= g.annual).slice(0, 2).map(([k]) => k);
      const draw = () => {
        const r = solarCalc(T, g.annual, n);
        out.innerHTML = stat(`${fmt(r.kwh)} kWh`, `a year from ${n} panels (${fmt(r.peak, 1)} kW)`)
          + dl([["homes it could power", fmt(r.homes, 1)], ["what it costs to put up", usd(r.cost)],
                ["pays for itself in", ok(r.payback) ? `${fmt(r.payback, 1)} years, at $0.12 a unit` : "–"],
                ["carbon it saves, in trees", fmt(r.trees)]]);
      };
      const india = p.lat >= 8 && p.lat <= 37 && p.lon >= 68 && p.lon <= 97;
      el.innerHTML = stat(fmt(g.annual, 2), `kWh per m² per day · ${solarClass(T, g.annual)}`,
          `${dimmer.length ? `brighter than ${dimmer.join(" and ")}` : ""}${dimmer.length && brighter.length ? "; " : ""}${brighter.length ? `dimmer than ${brighter.join(" and ")}` : ""}`)
        + columns(g.months, MON.map((m) => m[0]), { unit: " kWh/m²/day", d: 2 })
        + `<label class="cc-range">(panels) <input type="range" min="1" max="40" value="${n}" data-n /> <output data-nout>${n}</output></label>`
        + `<div data-out></div>`
        + `<p class="cc-sub">next steps</p>` + list(india
          ? [["PM Surya Ghar: rooftop subsidy", "https://pmsuryaghar.gov.in"], ["PM-KUSUM: solar pumps for farms", "https://mnre.gov.in/pm-kusum/"],
             ["PVGIS: a detailed simulation for this point", `https://re.jrc.ec.europa.eu/pvg_tools/en/?lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`]]
          : [["PVGIS: a detailed simulation for this point", `https://re.jrc.ec.europa.eu/pvg_tools/en/?lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`],
             ["PVWatts: savings at local prices", `https://pvwatts.nrel.gov/pvwatts.php?lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`],
             ["Global Solar Atlas", `https://globalsolaratlas.info/map?c=${p.lat.toFixed(4)},${p.lon.toFixed(4)},10`]],
          ([l, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(l)} ↗</a>`);
      const out = el.querySelector("[data-out]");
      el.querySelector("[data-n]").addEventListener("input", (e) => { n = +e.target.value; el.querySelector("[data-nout]").textContent = n; draw(); });
      draw();
      mapIt(ctx, p, GRID, (G) => {
        const v = Float32Array.from({ length: G.n * G.n }, (_, i) => roofKwh(G, i, g.annual) / 1000);
        return gridLayer({ G, vals: v, mask: (i) => G.roof[i] > 0, title: "what every roof in the cell could make", unit: "MWh a year",
          breaks: [500, 1000, 1500, 2000], labels: ["under 500", "500–1,000", "1,000–1,500", "1,500–2,000", "over 2,000"],
          tip: (i) => `<b>${fmt(v[i])} MWh a year</b><br>from ${fmt(G.roof[i])} m² of roof` });
      });
    },
  },

  "p-crop": {
    grid: REGION,
    async render(el, p, ctx) {
      el.innerHTML = loading("five years of weather and a 2040 climate model");
      const now = readArchive(await archive(p)).climate;
      const proj = {};
      for (const [y, dt, pr, fr, ht] of [[2030, .6, .97, .85, 1.3], [2040, 1.1, .94, .7, 1.65]]) {
        try { proj[y] = climate((await projection(p, y)).daily); }
        catch (e) {   // Day 13's fallback when the climate model does not answer
          proj[y] = { mean_temp: now.mean_temp + dt, annual_precip: Math.round(now.annual_precip * pr), frost_days: now.frost_days * fr, heat_stress_days: now.heat_stress_days * ht, est: true };
        }
      }
      const crops = Object.entries(ctx.T.d13.CROPS).map(([name, c]) => {
        const s = scoreCrop(c, now), s40 = scoreCrop(c, proj[2040]);
        return { name, cat: c.category, notes: c.notes, now: s, y30: scoreCrop(c, proj[2030]), y40: s40, d: s40 - s };
      }).sort((a, b) => b.now - a.now);
      const k = (x) => `${fmt(x.mean_temp, 1)} °C · ${fmt(x.annual_precip)} mm · ${fmt(x.heat_stress_days)} hot days · ${fmt(x.frost_days)} frost`;
      el.innerHTML = dl([["now (2019–23)", k(now)], ["2030", k(proj[2030])], ["2040" + (proj[2040].est ? " (estimated)" : ""), k(proj[2040])]])
        + `<table class="cc-table"><thead><tr><th>crop</th><th>now</th><th>2030</th><th>2040</th></tr></thead><tbody>${crops.map((c) => `
            <tr title="${esc(c.notes)}"><td>${esc(lc(c.name))}</td>${[c.now, c.y30, c.y40].map((s) => `<td><span class="cc-score" style="--s:${s}%">${s}</span></td>`).join("")}</tr>`).join("")}
          </tbody></table>`
        + note(`Scores of 100: 70 and over is well suited, 45–70 marginal. Best now: ${crops.slice(0, 3).map((c) => lc(c.name)).join(", ")}. Falling furthest by 2040: ${crops.filter((c) => c.now >= 40).sort((a, b) => a.d - b.d).slice(0, 3).map((c) => `${lc(c.name)} (${c.d})`).join(", ")}.`);
      mapIt(ctx, p, REGION, (G) => {
        // land use as CityScope colours it, one tile a km²: the categorical palette's first three slots for
        // water, fields and woods, and a neutral grey for towns (built land is the ground, not a series)
        const [cWater, cFields, cGreen] = CAT(), grey = getComputedStyle(document.documentElement).getPropertyValue("--mute").trim() || "#777";
        const kinds = [["farm", cFields, "fields"], ["green", cGreen, "woods and grass"], ["water", cWater, "water"], ["built", grey, "towns"]];
        const top = (i) => kinds.map(([k, col]) => [k, col, G[k][i]]).sort((a, b) => b[2] - a[2])[0];
        const farm = sumOf(G.farm) / (G.n * G.n);
        return { G, label: `${G.n * G.size / 1000} km · ${G.size / 1000} km cells`,
          cell: (i) => { const [, col, v] = top(i); return v < .15 ? null : { col }; },
          legend: `<p class="cc-lg__t">the land around ${esc(p.name)} <span>· what covers most of each km² · ${fmt(farm * 100)}% fields</span></p>`
            + swatchKey(kinds.map(([, col, l]) => [col, l])),
          tip: (i) => kinds.map(([k, , l]) => `${l} ${fmt(G[k][i] * 100)}%`).join(" · ") };
      });
      askBlock(el, ctx, { label: "ask for farming advice", tool: "crop-advice",
        input: { place: where(p), current: now, p2040: proj[2040],
                 top: crops.filter((c) => c.now >= 45).slice(0, 5).map((c) => ({ name: c.name, now: c.now, y40: c.y40 })),
                 declining: crops.filter((c) => c.d < -10 && c.now >= 40).sort((a, b) => a.d - b.d).slice(0, 3).map((c) => ({ name: c.name, now: c.now, y40: c.y40 })) },
        show: (r) => { const a = r.data || {}; return `<p class="cc-sub">grow now</p>` + list(a.grow_now, (g) => `${esc(g.name)} <span>· ${esc(g.window)} · ${esc(g.why)} ${esc(g.tip)}</span>`)
          + `<p class="cc-sub">adapt by 2035</p>` + list([...(a.adapt_2035?.varieties || []), ...(a.adapt_2035?.introduce || [])])
          + `<p class="cc-sub">by 2040</p>` + list([...(a.by_2040?.losing || []).map((x) => "losing: " + x), ...(a.by_2040?.gaining || []).map((x) => "gaining: " + x)])
          + `<p class="cc-sub">this season</p>` + list(a.actions, (x) => `${esc(x.title)} <span>· ${esc(x.when)} · ${esc(x.time)} · ${esc(x.cost)}</span>`); } });
    },
  },

  "p-water": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("five years of rainfall");
      const arc = readArchive(await archive(p)), k = ctx.T.d15;
      const h = ctx.household;   // shared with the off-grid chapter, so one household runs through both
      const sel = (name, obj, v) => `<select data-h="${name}">${Object.keys(obj).map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      el.innerHTML = `<div class="cc-form">
          <label>(people) <input type="number" min="1" max="20" value="${h.people}" data-h="people" /></label>
          <label>(use a day) <select data-h="perCapita">${Object.entries(k.PROFILES).map(([l, v]) => `<option value="${v}"${v === h.perCapita ? " selected" : ""}>${esc(lc(l))}</option>`).join("")}</select></label>
          <label>(roof, m²) <input type="number" min="10" max="2000" value="${h.roof}" data-h="roof" /></label>
          <label>(roof) ${sel("roofType", k.ROOF_RUNOFF, h.roofType)}</label>
          <label>(garden, m²) <input type="number" min="0" max="2000" value="${h.garden}" data-h="garden" /></label>
          <label>(greywater) ${sel("gw", k.GW_SYSTEMS, h.gw)}</label></div><div data-out></div>`;
      const out = el.querySelector("[data-out]");
      let last;
      const draw = () => {
        const r = last = planWater(ctx.T, arc.rain304, h);
        out.innerHTML = stat(`${r.score}`, `water security, of 100 · ${fmt(r.coverage)}% of ${fmt(r.total)} litres a day covered`)
          + columns(r.coll, MON.map((m) => m[0]), { unit: " litres collected", d: 0, ref: r.monthlyDraw, refLabel: "drawn", hi: (v) => v < r.monthlyDraw })
          + dl([["from rain", fmt(r.rainPct) + "%"], ["from greywater", fmt(r.greyPct) + "%"],
                ["tank", `${fmt(r.tank)} litres${r.units > 1 ? ` in ${r.units} tanks` : ""}`], ["dry months", r.dryList.length ? r.dryList.join(", ") : "none"],
                ["rain a year", `${fmt(arc.rain304.reduce((s, x) => s + x, 0))} mm`], ["what it costs", usd(r.cost)]])
          + (r.supplyLimited ? note("The roof cannot collect the whole demand; a bigger tank will not fix that, a bigger roof or less use will.") : "");
      };
      el.querySelectorAll("[data-h]").forEach((i) => i.addEventListener("input", () => {
        const v = i.value; h[i.dataset.h] = ["people", "perCapita", "roof", "garden"].includes(i.dataset.h) ? Math.max(0, +v || 0) : v; draw();
      }));
      draw();
      const rainYr = sumOf(arc.rain304);
      mapIt(ctx, p, GRID, (G) => {
        const v = Float32Array.from({ length: G.n * G.n }, (_, i) => G.roof[i] * rainYr / 1000 * .8);   // m³ = kL, 80% caught
        return gridLayer({ G, vals: v, mask: (i) => G.roof[i] > 0, title: "rain the roofs in each cell could catch", unit: `kL a year · ${fmt(rainYr)} mm of rain`,
          breaks: [250, 500, 1000, 2500], labels: ["under 250", "250–500", "500–1,000", "1,000–2,500", "over 2,500"],
          tip: (i) => `<b>${fmt(v[i])} kL a year</b><br>${fmt(G.roof[i])} m² of roof · enough for ${fmt(v[i] * 1000 / (h.perCapita * 365))} people at this household's use` });
      });
      askBlock(el, ctx, { label: "write the water roadmap", tool: "water-roadmap",
        input: () => ({ place: where(p), people: h.people, per_capita: h.perCapita, total_daily: last.total, annual_rain_mm: arc.rain304.reduce((s, x) => s + x, 0),
          roof_area: h.roof, runoff: k.ROOF_RUNOFF[h.roofType], annual_coll: last.annualColl, gw_system: h.gw, grey_usable: last.grey, coverage_pct: last.coverage,
          rain_pct: last.rainPct, grey_pct: last.greyPct, tank_liters: last.tank, deficit_months: last.dry, score: last.score, cost: last.cost }),
        show: (r) => { const a = r.data || {}; return `<p><strong>${esc(a.one_liner)}</strong></p>` + phases(a, "coverage")
          + `<p class="cc-sub">save water</p>` + list(a.tips, (t) => `${esc(t.tip)} <span>· ${esc(t.saving)}</span>`); } });
    },
  },

  "p-grid": {
    grid: GRID,
    async render(el, p, ctx) {
      el.innerHTML = loading("nasa power and five years of weather");
      const [g, a] = await Promise.all([nasa(p).then(ghiMonths), archive(p).then(readArchive)]);
      const h = ctx.household;
      el.innerHTML = `<div class="cc-form">
          <label>(people) <input type="number" min="1" max="20" value="${h.people}" data-h="people" /></label>
          <label>(kWh a month) <input type="number" min="20" max="3000" value="${h.kwh}" data-h="kwh" /></label>
          <label>(roof, m²) <input type="number" min="10" max="2000" value="${h.roof}" data-h="roof" /></label>
          <label>(land to grow, m²) <input type="number" min="0" max="20000" value="${h.land}" data-h="land" /></label>
          <label>(days of battery) <input type="number" min="1" max="7" value="${h.autonomy}" data-h="autonomy" /></label></div><div data-out></div>`;
      const out = el.querySelector("[data-out]");
      let last;
      const draw = () => {
        const r = last = offGrid(ctx.T, g, a, h);
        out.innerHTML = stat(`${r.score}`, `independence, of 100 · for ${usd(r.cost)}`)
          + bars([["electricity", r.solar.self, "%"], ["water", r.water.coverage, "%"], ["food", r.food.coverage, "%"]])
          + dl([["solar", `${fmt(r.solar.wp)} W · ${r.solar.panels} panels · ${fmt(r.solar.area)} m²${r.solar.area > h.roof ? " (more than the roof)" : ""}`],
                ["battery", `${fmt(r.battery.kwh, 1)} kWh · ${h.autonomy} days`], ["water tank", `${fmt(r.water.tank)} litres`],
                ["land to feed everyone", `${fmt(r.food.required)} m² · ${r.food.grow} growing months`]]);
      };
      el.querySelectorAll("[data-h]").forEach((i) => i.addEventListener("input", () => { h[i.dataset.h] = Math.max(0, +i.value || 0); draw(); }));
      draw();
      mapIt(ctx, p, GRID, (G) => {
        const v = Float32Array.from({ length: G.n * G.n }, (_, i) => (G.floor[i] ? roofKwh(G, i, g.annual) / (G.floor[i] * 50) * 100 : NaN));
        return gridLayer({ G, vals: v, mask: (i) => G.foot[i] > 0, title: "could the homes in each cell run on their own roofs?", unit: "% of a home's electricity, 50 kWh/m² a year",
          breaks: [25, 50, 100, 150], labels: ["under 25%", "25–50", "50–100", "100–150", "over 150: a surplus"],
          tip: (i) => `<b>${fmt(v[i])}%</b> from its roofs<br>${fmt(G.roof[i])} m² of roof under ${fmt(G.floor[i])} m² of floor` });
      });
      askBlock(el, ctx, { label: "write the off-grid roadmap", tool: "offgrid-roadmap",
        input: () => ({ place: where(p), people: h.people, monthly_kwh: h.kwh, score: last.score, budget: Math.round(last.cost),
          solar: { required_wp: last.solar.wp, annual_ghi: g.annual, self_suff_pct: Math.round(last.solar.self), cost: Math.round(last.solar.cost) },
          battery: { capacity_kwh: Math.round(last.battery.kwh * 10) / 10, autonomy_days: h.autonomy, cost: Math.round(last.battery.cost) },
          water: { coverage_pct: Math.round(last.water.coverage), tank_liters: last.water.tank, annual_rain_mm: Math.round(a.rain30.reduce((s, x) => s + x, 0)), cost: Math.round(last.water.cost) },
          food: { coverage_pct: Math.round(last.food.coverage), land_area: h.land, grow_months: last.food.grow, cost: Math.round(last.food.cost) } }),
        show: (r) => { const x = r.data || {}; return `<p><strong>${esc(x.one_liner)}</strong></p>` + phases(x, "score")
          + `<p class="cc-sub">risks</p>` + list(x.risks, (k) => `${esc(k.risk)} <span>· ${esc(k.severity)} · ${esc(k.mitigation)}</span>`); } });
    },
  },
};

/* what the household chapter can borrow from the place chapters: its heat, read once */
export const placeHeat = (p) => archive(p).then(readArchive).then((a) => a.danger).catch(() => null);
