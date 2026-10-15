/* layers.js — the ten country chapters of Climate Code. Each takes its value, its class breaks and their
   names from the Resilience Stack day it was built from (atlas.json carries the day's own band tables),
   so a legend here says what the day said. A layer is:
     get(c, P)        the number to map for country record c under the chapter's settings P
     breaks / labels  ascending class breaks and one name per class (breaksFor/labelsFor when P changes them)
     controls(P)      the chapter's own switches; detail(c, P, x) the readout for the chosen country */
import { fmt, big, usd, lc, ok, stat, dl, bars, columns, spark, pills, note } from "./ui.js";

/* a day's band table ([threshold, LABEL, ...], highest first) → ascending breaks + lowercase names */
function bandsOf(table) {
  const asc = table.map((b) => [b[0], lc(b[1])]).sort((a, b) => a[0] - b[0]);
  return { breaks: asc.slice(1).map((b) => b[0]), labels: asc.map((b) => b[1]) };
}
export const breaksOf = (l, P) => (l.breaksFor ? l.breaksFor(P) : l.breaks);
export const labelsOf = (l, P) => (l.labelsFor ? l.labelsFor(P) : l.labels);
export const nameOf = (l, v, P) => labelsOf(l, P)[breaksOf(l, P).filter((b) => v >= b).length];
const M = ["j", "f", "m", "a", "m", "j", "j", "a", "s", "o", "n", "d"];

export function makeLayers(atlas) {
  const T = atlas.tools, S = atlas.sources;

  /* Day 05: projected_days() and labour_loss_pct(), as the day wrote them */
  const projected = (base, dt) => {
    if (base <= 0) return base + Math.max(0, dt * 6);
    const m = base < 15 ? .45 : base < 40 ? .32 : base < 80 ? .22 : .12;
    return Math.min(300, base * (1 + dt * m));
  };
  const labour = (days, agri) => Math.round(days * .027 * Math.min(agri / 100, .85) * 10) / 10;

  /* Day 06: effective_slr() and _pop_at_slr() */
  const slr = (P, sub) => T.d06.IPCC_SLR[P.ssp][String(P.year)] + sub * Math.max(0, P.year - 2024) / 1000;
  const exposedK = (k, s) => s <= 0 ? 0 : s <= 1 ? k.p1 * s : s <= 2 ? k.p1 + (k.p2 - k.p1) * (s - 1)
    : k.p2 + (k.p3 - k.p2) * Math.min(s - 2, 1);

  const warms = Object.values(T.d05.TEMP_DELTAS).map((v) => [v, v ? `+${v} °C` : "today"]);
  const dims = Object.keys(T.d10.DIMS);

  const L = {
    grid: {
      title: () => "grid stress", unit: "of 100", ...bandsOf(T.d01.BANDS), src: S.grid,
      get: (c) => c.grid?.s,
      detail(c, P, x) {
        const g = c.grid; if (!g) return null;
        return stat(fmt(g.s), `grid stress, of 100 · ${nameOf(this, g.s, P)}`, x.rank)
          + bars([["fossil share of electricity", g.fossil, "%"], ["people without electricity", g.gap, "%"],
                  ["lost on the wires", g.loss, "%"]])
          + dl([["renewables in the mix", fmt(g.renew, 1) + "%"],
                ["half the grid clean by", g.clean50 ? (g.clean50 > 2100 ? "after 2100" : g.clean50) : "not on its current trend"]]);
      },
    },
    sun: {
      title: () => "solar energy at the ground", unit: "kWh/m²/day", ...bandsOf(T.d02.SOLAR_BANDS), src: S.sun, d: 1,
      get: (c) => c.sun?.ghi,
      detail(c, P, x) {
        const s = c.sun; if (!s) return null;
        const kwh = s.ghi * 10 * T.d02.PANEL_M2 * T.d02.EFFICIENCY * T.d02.PERF_RATIO * 365;
        return stat(fmt(s.ghi, 2), `kWh per m² per day · ${nameOf(this, s.ghi, P)}`, x.rank)
          + columns(s.m, M, { unit: " kWh/m²/day", d: 2 })
          + note(`Ten panels at its centre would make about ${fmt(kwh)} kWh a year${c.grid ? `, in a country whose grid stress is ${fmt(c.grid.s)} of 100` : ""}.`);
      },
    },
    heat: {
      title: (P) => P.warm ? `days above 35 °C feels-like, at +${P.warm} °C` : "days above 35 °C feels-like",
      unit: "days a year", ...bandsOf(T.d05.HEAT_BANDS), src: S.heat,
      get: (c, P) => ok(c.heat?.days) ? projected(c.heat.days, P.warm) : undefined,
      controls: (P) => pills(warms, P.warm, "data-warm"),
      detail(c, P, x) {
        const h = c.heat; if (!h) return null;
        const now = projected(h.days, P.warm);
        return stat(fmt(now), `days a year above 35 °C feels-like${P.warm ? `, at +${P.warm} °C` : ""} · ${nameOf(this, now, P)}`, x.rank)
          + bars(warms.map(([v, l]) => [l, projected(h.days, v), " days"]), { max: 0 })
          + (ok(h.agri) ? dl([["people working in farming", fmt(h.agri) + "%"],
                              ["outdoor work hours lost to heat", fmt(labour(now, h.agri), 1) + "%"]]) : "");
      },
    },
    water: {
      title: () => "freshwater withdrawn", unit: "% of renewable resources", ...bandsOf(T.d03.BANDS), src: S.water,
      get: (c) => c.water?.w,
      detail(c, P, x) {
        const w = c.water; if (!w) return null;
        const fw = w.fw, th = T.d03.FW_THRESHOLDS.find((t) => ok(fw) && fw < t[0]);
        return stat(fmt(w.w, w.w < 10 ? 1 : 0) + "%", `of its renewable freshwater withdrawn each year · ${nameOf(this, w.w, P)}`, x.rank)
          + (ok(w.agri) ? bars([["farming", w.agri, "%"], ["industry", w.ind, "%"], ["homes and cities", w.dom, "%"]]) : "")
          + dl([["renewable water per person", ok(fw) ? `${fmt(fw)} m³ a year${th ? ` · ${th[1]}` : ""}` : "–"],
                ["people with safe drinking water", fmt(w.safe) + "%"]]);
      },
    },
    food: {
      title: () => "food system fragility", unit: "of 100", ...bandsOf(T.d04.FRAG_BANDS), src: S.food,
      get: (c) => c.food?.s,
      detail(c, P, x) {
        const f = c.food; if (!f) return null;
        return stat(fmt(f.s), `fragility, of 100 · ${nameOf(this, f.s, P)}`, x.rank)
          + bars([["food, as a share of imports", f.imp, "%"], ["people undernourished", f.undr, "%"]], { d: 1 })
          + dl([["food production, 2014–16 = 100", fmt(f.prod)], ["land in farming", fmt(f.agl) + "%"]]);
      },
    },
    coast: {
      title: (P) => `people below the sea, ${lc(P.ssp)} by ${P.year}`, unit: "% of people", ...bandsOf(T.d06.RISK_BANDS), src: S.coast, d: 1,
      get: (c, P) => c.coast ? exposedK(c.coast, slr(P, c.coast.sub)) / c.coast.pop * 100 : undefined,
      controls: (P) => pills(Object.keys(T.d06.SSP_LABELS).map((k) => [k, lc(k)]), P.ssp, "data-ssp")
        + pills([2030, 2050, 2070, 2100].map((y) => [y, y]), P.year, "data-year")
        + note(lc(T.d06.SSP_LABELS[P.ssp].split("—")[1] || "").trim()),
      detail(c, P, x) {
        const k = c.coast; if (!k) return null;
        const s = slr(P, k.sub), e = exposedK(k, s);
        return stat(big(e * 1000), `people below the sea by ${P.year} · ${fmt(e / k.pop * 100, 1)}% of the country`, x.rank)
          + bars([["below 1 m of rise", k.p1 / 1000, " m"], ["below 2 m", k.p2 / 1000, " m"], ["below 3 m", k.p3 / 1000, " m"]], { max: 0, d: 1 })
          + dl([["sea level by then, with sinking land", fmt(s, 2) + " m"], ["land sinking", fmt(k.sub, 1) + " mm a year"],
                ["coastline", fmt(k.km) + " km"]]);
      },
    },
    forest: {
      title: () => "change in forest area, 1990–2021", unit: "%", diverging: true, src: S.forest, d: 1,
      breaks: [-40, -20, -5, 5, 20, 40],
      labels: ["lost over 40%", "lost 20–40%", "lost 5–20%", "within 5%", "grew 5–20%", "grew 20–40%", "grew over 40%"],
      get: (c) => c.forest?.d,
      controls: (P) => pills([[0, "country change"], [1, "satellite"]], P.ndvi ? 1 : 0, "data-ndvi")
        + (P.ndvi ? pills(T.d07.COMPARE_YEARS.map((y) => [y, y]), P.ndviYear, "data-ndvi-year")
          + note("vegetation index, june of each year · nasa modis terra · darker green is denser growth") : ""),
      detail(c, P, x) {
        const f = c.forest; if (!f) return null;
        const years = f.ts.map((_, i) => String(1990 + i * 5));
        return stat((f.d > 0 ? "+" : "") + fmt(f.d, 1) + "%", `forest area since 1990 · ${nameOf(this, f.d, P)}`, x.rank)
          + spark(f.ts, years, { unit: "% forest", d: 1 })
          + dl([["forest cover now", fmt(f.pct, 1) + "% of land"], [f.dkm2 < 0 ? "forest lost" : "forest gained", fmt(Math.abs(f.dkm2)) + " km²"],
                ["carbon held in what is left", fmt(f.co2, 2) + " Gt CO₂"]]);
      },
    },
    air: {
      title: () => "fine particles (PM2.5), times the WHO guideline", unit: "× WHO 2021", src: S.air, d: 1,
      breaks: [1, 2, 3, 5, 7, 10],
      labels: ["within the guideline", "1–2× over", "2–3× over", "3–5× over", "5–7× over", "7–10× over", "over 10×"],
      get: (c) => c.air?.x,
      detail(c, P, x) {
        const a = c.air; if (!a) return null;
        return stat(fmt(a.x, 1) + "×", `the WHO limit · ${fmt(a.pm, 1)} µg/m³ a year`, x.rank)
          + spark(a.ts, a.ts.map((_, i) => String(1990 + i * 5)), { unit: " µg/m³", d: 1 })
          + dl([[`deaths from air pollution, ${S.air.mort_year}`, big(a.deaths)], ["per 100,000 people", fmt(a.mort)],
                ["what those deaths cost, a year", ok(a.cost) ? usd(a.cost * 1e9) : "–"]]);
      },
    },
    move: {
      title: (P) => `climate migration pressure, ${P.when === "2050" ? "2050" : "today"}`, unit: "of 100", src: S.move,
      breaks: [30, 50, 65, 80], labels: ["low", "moderate", "high", "severe", "extreme"],
      get: (c, P) => P.when === "2050" ? c.move?.s50 : c.move?.s,
      controls: (P) => pills([["now", "today"], ["2050", "2050"]], P.when, "data-when"),
      detail(c, P, x) {
        const m = c.move; if (!m) return null;
        const v = P.when === "2050" ? m.s50 : m.s;
        return stat(fmt(v), `pressure, of 100${P.when === "2050" ? ", in 2050" : ""} · ${nameOf(this, v, P)}`, x.rank)
          + bars([["water stress", m.parts[0]], ["hunger", m.parts[1]], ["heat", m.parts[2]], ["poverty", m.parts[3]]])
          + dl([["people at risk of moving by 2050", ok(m.risk50) ? fmt(m.risk50, 1) + " m" : "–"],
                ["newly displaced by disasters, 2022", ok(m.new) ? big(m.new * 1000) : "–"],
                ["living displaced, 2022", ok(m.stock) ? big(m.stock * 1000) : "–"]]);
      },
    },
    poly: {
      title: (P) => P.dim === "all" ? "resilience across all seven" : `${lc(P.dim)}: exposure against every other country`,
      unit: "of 100", src: S.poly,
      get: (c, P) => P.dim === "all" ? c.poly?.s : c.poly?.dims[dims.indexOf(P.dim)],
      controls: (P) => pills([["all", "all seven"], ...dims.map((d) => [d, lc(d)])], P.dim, "data-dim"),
      breaks: [20, 40, 60, 80],
      labelsFor: (P) => P.dim === "all"
        ? T.d10.RESILIENCE_BANDS.slice().sort((a, b) => a[0] - b[0]).map((b) => lc(b[2]))
        : ["least exposed fifth", "second fifth", "middle fifth", "fourth fifth", "most exposed fifth"],
      // resilience runs the other way: low is the worry, so the dark end of the ramp is the low end
      reverseFor: (P) => P.dim === "all",
      detail(c, P, x) {
        const p = c.poly; if (!p) return null;
        const res = T.d10.RESILIENCE_BANDS.find((b) => p.s >= b[0] && p.s <= b[1]);
        // the layers still told as chapters, each by its number; the others stay in the score but not in the list
        const every = ["grid", "sun", "heat", "water", "food", "coast", "forest", "air", "move"].filter((k) => x.all[k].n).map((k) => {
          const l = x.all[k], v = l.get(c, x.P);
          return [`(${l.n}) ${l.chapter}`, ok(v) ? `${fmt(v, l.d || 0)} · ${nameOf(l, v, x.P)}` : "no data"];
        });
        return stat(fmt(p.s), `resilience, of 100 · ${lc(res ? res[2] : "")}`, x.rank)
          + `<p class="cc-sub">exposure on each dimension: the share of countries less exposed</p>`
          + bars(dims.map((d, i) => [lc(d), p.dims[i]]))
          + `<p class="cc-sub">the same country, chapter by chapter</p>` + dl(every);
      },
    },
  };
  return L;
}
