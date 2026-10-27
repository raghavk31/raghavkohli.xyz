/* earthos.js — the whole city (chapter c-city): the layers EarthOS builds for a city, read from the
   city's PMTiles archive in the data repo (github.com/raghavk31/earthos-data, built by
   github.com/raghavk31/EarthOS). Wards while the city fills the map, 150 m cells closer in. Every layer
   comes with its card: source, period, resolution, licence, method, how it was checked, and how sure it
   is. Modelled and assumed layers are hatched, on the map and in the key, so an estimate never looks
   like a measurement. The colours are the explorer's (ui.js classColour), in the archive's own
   quantile breaks, so the key never depends on which tiles have loaded. */
import { esc, fmt, ok, classColour } from "./ui.js";

export const DATA = "https://raghavk31.github.io/earthos-data";
export const CITIES = { bengaluru: "Bengaluru" };   // the cities EarthOS has built
const GRID_FROM = 12.5;                              // the zoom at which cells take over from wards
const CONF = ["measured", "modelled", "assumed"];    // strongest first
const THEMES = ["heat", "built", "ground", "water", "movement", "profile", "energy"];
const PARTS = { nain_2000: "integration, 2 km", nach_2000: "choice, 2 km", nain_n: "integration, whole city" };
const TITLES = { space_syntax: "space syntax", terrain_bare_earth: "bare ground", terrain_surface: "ground and roofs" };

let R = null;
const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${r.status} for ${u}`); return r.json(); });
/** The layer specs and sources, as the build compiled them (EarthOS layers/dist/registry.json). */
export const registry = async () => (R ??= await get(`${DATA}/registry.json`));

let protocol = null;
/** A city's archive: its bounds, every layer's card, and every attribute's breaks and range. */
export async function loadCity(id) {
  await registry();
  if (!protocol) { protocol = new pmtiles.Protocol(); maplibregl.addProtocol("pmtiles", protocol.tile); }
  const url = `${DATA}/${id}/${id}.pmtiles`, p = new pmtiles.PMTiles(url);
  protocol.add(p);
  const [h, m] = await Promise.all([p.getHeader(), p.getMetadata()]);
  const e = m.earthos;
  return { id, url, name: CITIES[id] || id, bounds: [[h.minLon, h.minLat], [h.maxLon, h.maxLat]],
    cards: e.cards, scales: e.scales || {}, wards: e.wards, attribution: m.attribution };
}

/** A layer's confidence as shown: the weakest of its own and its inputs'. */
export function shown(layer) {
  const L = R.specs[layer];
  if (!L || !CONF.includes(L.confidence)) throw new Error(`layer ${layer} has no confidence`);
  return [L.confidence, ...(L.inputs || []).map(shown)].reduce((a, b) => (CONF.indexOf(b) > CONF.indexOf(a) ? b : a));
}
const isShare = (f) => (R.specs[f.layer]?.unit || "").startsWith("share") || (f.layer === "land_cover" && f.part);

/** The city's layers by theme; a layer with parts (land cover classes, syntax measures) lists them. */
export function fields(city) {
  const groups = {};
  for (const layer of Object.keys(city.cards)) {
    const spec = R.specs[layer];
    if (!spec) continue;
    const title = TITLES[layer] || spec.title;
    const parts = Object.keys(city.scales).filter((k) => k.startsWith(`${layer}.`)).map((k) => k.slice(layer.length + 1));
    const items = parts.length
      ? parts.map((p) => ({ id: `${layer}.${p}`, layer, part: p, short: PARTS[p] || p, label: `${title}: ${PARTS[p] || p}` }))
      : [{ id: layer, layer, part: null, short: title, label: title }];
    (groups[spec.theme] ||= []).push({ layer, title, items });
  }
  return THEMES.filter((t) => groups[t]).map((t) => ({ theme: t, entries: groups[t] }));
}
export const allFields = (city) => fields(city).flatMap((g) => g.entries.flatMap((e) => e.items));

/** A value as people read it: shares as percentages, the rest to sensible figures. */
export function value(f, v, bare = false) {
  if (!ok(v)) return "no value";
  if (isShare(f)) return `${fmt(v * 100, v < .1 ? 1 : 0)}%`;
  const unit = R.specs[f.layer]?.unit || "", d = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return `${fmt(v, d)}${unit && !bare ? ` ${unit}` : ""}`;
}

/* the hatch: the stripe of EarthOS's display rules (Sama's 45° hatch), in the paper colour, clear
   between stripes, laid over the colour so any tone reads as hatched */
function hatchImage(paper) {
  const scale = 2, size = 6, stroke = 2.4, n = Math.round(size * Math.SQRT2 * scale), data = new Uint8ClampedArray(n * n * 4);
  const [r, g, b] = paper;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = (((x - y) % n) + n) % n, across = Math.min(d, n - d) / Math.SQRT2, k = (y * n + x) * 4;
    data[k] = r; data[k + 1] = g; data[k + 2] = b; data[k + 3] = across <= (stroke * scale) / 2 ? 255 : 0;
  }
  return { width: n, height: n, data };
}

/** The city's layers on the explorer's map, under its place names. */
export class CityLayers {
  constructor(map, before) { this.map = map; this.before = before; this.city = null; this.field = null; }

  show(city, field, k) {
    const m = this.map;
    this.city = city; this.field = field;
    if (!m.getSource("eo")) {
      // every source is credited on its layer's card; the map carries one link to them all
      m.addSource("eo", { type: "vector", url: `pmtiles://${city.url}`,
        attribution: `<a href="https://github.com/raghavk31/earthos-data/blob/main/${city.id}/CREDITS.md" target="_blank" rel="noopener">EarthOS layers: sources and licences</a>` });
      m.addImage("eo-hatch", hatchImage(rgbOf(k.paper)), { pixelRatio: 2 });
      const add = (l) => m.addLayer(l, this.before);
      add({ id: "eo-wards", type: "fill", source: "eo", "source-layer": "wards", maxzoom: GRID_FROM, paint: { "fill-opacity": .9 } });
      add({ id: "eo-cells", type: "fill", source: "eo", "source-layer": "grid", minzoom: GRID_FROM,
        paint: { "fill-opacity": .92, "fill-outline-color": k.paper } });
      add({ id: "eo-wards-est", type: "fill", source: "eo", "source-layer": "wards", maxzoom: GRID_FROM, paint: { "fill-pattern": "eo-hatch", "fill-opacity": .4 } });
      add({ id: "eo-cells-est", type: "fill", source: "eo", "source-layer": "grid", minzoom: GRID_FROM, paint: { "fill-pattern": "eo-hatch", "fill-opacity": .4 } });
      add({ id: "eo-ward-line", type: "line", source: "eo", "source-layer": "wards",
        paint: { "line-color": k.ink, "line-width": .5, "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, .16, 13, .38] } });
      add({ id: "eo-edge", type: "line", source: "eo", "source-layer": "boundary", paint: { "line-color": k.ink, "line-width": 1.25 } });
      add({ id: "eo-hover-ward", type: "line", source: "eo", "source-layer": "wards", maxzoom: GRID_FROM,
        filter: ["==", ["get", "ward_id"], ""], paint: { "line-color": k.ink, "line-width": 1.75 } });
      add({ id: "eo-hover-cell", type: "line", source: "eo", "source-layer": "grid", minzoom: GRID_FROM,
        filter: ["==", ["get", "cell"], -1], paint: { "line-color": k.ink, "line-width": 1.75 } });
    }
    this.layers.forEach((id) => m.setLayoutProperty(id, "visibility", "visible"));
    this.paint();
  }
  get layers() { return ["eo-wards", "eo-cells", "eo-wards-est", "eo-cells-est", "eo-ward-line", "eo-edge", "eo-hover-ward", "eo-hover-cell"]; }
  hide() { if (this.map.getSource("eo")) this.layers.forEach((id) => this.map.setLayoutProperty(id, "visibility", "none")); }

  paint() {
    const m = this.map, f = this.field, s = this.city.scales[f.id] || {};
    const fill = (breaks) => {
      const n = breaks.length + 1, steps = [classColour(0, n)];
      breaks.forEach((b, i) => steps.push(b, classColour(i + 1, n)));
      return ["case", ["has", f.id], breaks.length ? ["step", ["to-number", ["get", f.id]], ...steps] : steps[0], "rgba(0,0,0,0)"];
    };
    m.setPaintProperty("eo-wards", "fill-color", fill(s.ward || []));
    m.setPaintProperty("eo-cells", "fill-color", fill(s.grid || []));
    const est = shown(f.layer) !== "measured";
    for (const id of ["eo-wards-est", "eo-cells-est"]) {
      m.setFilter(id, ["has", f.id]);
      m.setLayoutProperty(id, "visibility", est ? "visible" : "none");
    }
  }

  /** The colours changed (light, dark, random): the hatch and the lines take the new paper and ink. */
  restyle(k) {
    const m = this.map;
    if (!m.getSource("eo")) return;
    m.removeImage("eo-hatch"); m.addImage("eo-hatch", hatchImage(rgbOf(k.paper)), { pixelRatio: 2 });
    m.setPaintProperty("eo-cells", "fill-outline-color", k.paper);
    for (const id of ["eo-ward-line", "eo-edge", "eo-hover-ward", "eo-hover-cell"]) m.setPaintProperty(id, "line-color", k.ink);
    if (this.field) this.paint();
  }

  /** What is under a point on the map: the unit, its name and the value, and outline it. */
  at(point) {
    const m = this.map, cells = m.getZoom() >= GRID_FROM;
    const feat = m.queryRenderedFeatures(point, { layers: [cells ? "eo-cells" : "eo-wards"] })[0];
    m.setFilter("eo-hover-ward", ["==", ["get", "ward_id"], !cells && feat ? String(feat.properties.ward_id) : ""]);
    m.setFilter("eo-hover-cell", ["==", ["get", "cell"], cells && feat ? Number(feat.properties.cell) : -1]);
    if (!feat) return null;
    const p = feat.properties;
    return { unit: cells ? "grid" : "ward", name: cells ? null : p.name, v: ok(p[this.field.id]) ? Number(p[this.field.id]) : null };
  }
  unit() { return this.map.getZoom() >= GRID_FROM ? "grid" : "ward"; }
}

/** The key, in the explorer's legend style: one swatch per class, the break values under them. */
export function legendHtml(city, f, unit) {
  const s = city.scales[f.id] || {}, br = s[unit] || [], span = s.range?.[unit], n = br.length + 1;
  const est = shown(f.layer) !== "measured", spec = R.specs[f.layer], agg = spec.aggregate?.[unit] || "";
  const edges = span ? [span[0], ...br, span[1]] : br, unitWord = isShare(f) || !spec.unit ? "" : `${spec.unit} · `;
  return `
    <p class="cc-lg__t">${esc(f.label)} <span>· ${esc(unitWord)}${unit === "ward" ? "ward" : "150 m cell"} ${esc(agg)}</span></p>
    <div class="cc-lg__bar${est ? " cc-lg__bar--est" : ""}">${Array.from({ length: n }, (_, i) => `<i style="background:${classColour(i, n)}"></i>`).join("")}</div>
    <div class="cc-lg__ticks">${edges.map((v, i) => `<span style="left:${i / Math.max(1, edges.length - 1) * 100}%">${esc(value(f, v, true))}</span>`).join("")}</div>
    <p class="cc-lg__nd">${est ? `<i class="cc-lg__est"></i>hatched: ${esc(shown(f.layer))}, an estimate` : "solid: measured"}</p>`;
}

/** The card: what the layer is, where it comes from, how sure it is, and how it was checked. */
export function cardHtml(city, f) {
  const b = city.cards[f.layer], spec = R.specs[f.layer], src = b.source ? R.sources[b.source] : null, c = shown(f.layer);
  const res = src && src.resolution_m !== undefined ? (src.resolution_m === "vector" ? "vector" : `${src.resolution_m} m`) : "";
  const from = src ? [src.title, src.publisher, src.period, res, src.licence].filter(Boolean).join(" · ")
    : `computed from ${(spec.inputs || []).map((k) => R.specs[k]?.title || k).join(", ")}`;
  const weaker = c !== spec.confidence ? ` (its inputs are ${c})` : "";
  const rows = [
    [c, `${esc(spec.method.trim())}${esc(weaker)}`, `cc-conf--${c}`],
    ["source", esc(from)],
    ...(b.skipped || []).map(([k, why]) => ["passed over", `${esc(R.sources[k]?.title || k)}: ${esc(why)}`]),
    src && ["credit", esc(src.attribution)],
    ["built", esc(b.built)],
  ].filter(Boolean);
  const v = b.meta?.validation;
  return `<dl class="cc-conf cc-conf--eo" aria-label="what this layer rests on">${rows.map(([k, d, cls]) =>
    `<div${cls ? ` class="${cls}"` : ""}><dt>(${k})</dt><dd>${d}</dd></div>`).join("")}</dl>`
    + (v?.why ? `<details class="cc-all"><summary>(how it was checked${v.checked ? `, ${esc(v.checked)}` : ""})</summary><p class="cc-ch__text">${esc(v.why)}</p></details>` : "");
}

/** The layer picker: each theme a row of the explorer's round buttons. */
export function pickerHtml(city, f) {
  return `<div class="cc-eo">${fields(city).map((g) => `
    <div class="cc-eo__row"><span class="cc-eo__theme">(${esc(g.theme)})</span><div class="cc-pills" role="group">${g.entries.flatMap((e) =>
      e.items.map((x) => `<button type="button" data-eo="${esc(x.id)}" aria-pressed="${x.id === f.id}" title="${esc(x.label)}${shown(x.layer) !== "measured" ? `, ${shown(x.layer)}` : ""}">(${esc(x.short)})</button>`)).join("")}
    </div></div>`).join("")}</div>`;
}

function rgbOf(c) {
  if (c.startsWith("#")) { const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join("") : c.slice(1, 7); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [250, 250, 248];
}
