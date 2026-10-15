/* cc.js — Climate Code (/work/climate-code/): the sixteen Resilience Stack tools as one explorer.
   The left column is the story; whichever chapter sits in the middle of it drives the map on the right.
   The story runs in five acts: four country chapters paint the world (layers.js; the other six layers
   stay in the all-at-once score), then one place is read as a grid of 150 m cells after MIT City
   Science's CityScope (grid.js, city.js): what it stands on and is made of, where it fails its people
   (with Meta's population grid, pop.js), what one change would do, and one building. The place tools of
   the Resilience Stack (place.js) run inside those chapters. The city grids are drawn as CityScope draws its table, a square tile a cell, with
   McHarg's sheets over them (tiles.js); the square can be dragged and resized, and the place follows it. The basemap is OpenFreeMap's vector planet in a
   minimal style drawn from the site's own colour tokens, so it follows (light) (dark) and (random). */
import { esc, fmt, ok, ordinal, classColour, classOf, dark, note, failed, CAT } from "./ui.js";
import { makeLayers, breaksOf, labelsOf, nameOf } from "./layers.js";
import { steps as placeSteps, geocode, placeHeat } from "./place.js";
import { steps as citySteps } from "./city.js";
import { gridBounds, GRID, SIZES } from "./grid.js";
import { TileGrid } from "./tiles.js";
import { setPopBase } from "./pop.js";

const steps = { ...placeSteps, ...citySteps };
const local = (kind) => kind === "place" || kind === "city";

const root = document.querySelector("[data-cc]");
const WORLD = [[-168, -56], [190, 76]];
const DEFAULT_PLACE = { name: "Bengaluru", admin1: "Karnataka", country: "India", lat: 12.9719, lon: 77.5937 };   // Day 16's default
/* rank wording per chapter: [ascending?, what first place means] */
const RANK = { grid: [0, "most stressed"], sun: [0, "sunniest"], heat: [0, "hottest"], water: [0, "most water-stressed"],
  food: [0, "most fragile"], coast: [0, "most exposed"], forest: [1, "biggest loss"], air: [0, "most polluted"],
  move: [0, "under most pressure"], poly: [1, "least resilient"] };
const PLACE_SRC = {
  "p-heat": "open-meteo seven-day forecast",
  "p-cool": "openstreetmap via overpass · era5 reanalysis via open-meteo, 2019–23",
  "p-sun": "nasa power monthly irradiance, 2020–23 · day 02's panel model",
  "p-crop": "era5 via open-meteo, 2019–23 · ec-earth3p-hr (cmip6 highresmip) via open-meteo · day 13's crop envelopes",
  "p-water": "era5 rainfall via open-meteo, 2019–23 · day 15's tank model",
  "p-grid": "nasa power · era5 via open-meteo · day 14's sizing · roofs from openstreetmap via openfreemap",
  "c-build": "building footprints, heights and land use from openstreetmap, via openfreemap's vector tiles · local climate zones after stewart and oke (2012)",
  "c-heat": "openstreetmap via openfreemap · open-meteo forecast · era5 via open-meteo, 2019–23 · climate zones after stewart and oke (2012)",
  "c-people": "meta data for good, high resolution settlement layer v1.5 (2020) · the hazards of the chapters before · risk after ipcc ar6",
  "c-park": "openstreetmap · srtm elevation · era5 rainfall · meta hrsl · park cooling after bowler et al. (2010)",
  "p-home": "nasa power · era5 via open-meteo · days 02, 14 and 15 · roofs and buildings from openstreetmap via openfreemap",
  "c-energy": "roofs from openstreetmap via openfreemap · nasa power irradiance, 2020–23 · day 02's panel model",
  "c-move": "stops, stations and streets from openstreetmap via openfreemap",
  "c-street": "streets from openstreetmap via openfreemap · angular segment analysis after hillier and iida (2005), normalised after hillier, yang and turner (2012)",
  "c-food": "land cover, roofs and shops from openstreetmap via openfreemap · srtm elevation · yields and diet after icmr-nin",
  "c-water": "srtm elevation via the tilezen terrain tiles on aws open data · era5 rainfall, 2019–23 · drains, lakes and land cover from openstreetmap · after ian mcharg, design with nature (1969)",
  "c-near": "every point of interest in openstreetmap via openfreemap",
};
for (const id of ["p-heat", "p-cool", "p-sun", "p-water"]) PLACE_SRC[id] += " · the grid from openstreetmap via openfreemap";
PLACE_SRC["p-crop"] += " · land cover from openstreetmap via openfreemap";

if (root) {
  if (!window.maplibregl) root.querySelector("[data-legend]").innerHTML = note("(the map library did not load)");
  else start().catch((e) => {
    console.error(e);
    root.querySelector("[data-legend]").innerHTML = note(`(the explorer could not start: ${esc(e.message)})`);
  });
}

async function start() {
  // the explorer fills the window under the site's header: tell the CSS how tall that header is
  const head = document.querySelector(".head"), fit = () => root.style.setProperty("--cc-head", `${head ? head.offsetHeight : 0}px`);
  fit(); addEventListener("resize", fit);
  if (/^https?:/.test(root.dataset.ai || "")) setPopBase(new URL(root.dataset.ai).origin);   // the worker also passes Meta's population grid
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${r.status} for ${u}`); return r.json(); });
  const [atlas, geo] = await Promise.all([get(root.dataset.atlas), get(root.dataset.geo)]);
  const C = atlas.countries, T = atlas.tools, L = makeLayers(atlas);
  const panel = root.querySelector("[data-panel]");
  const chapters = [...root.querySelectorAll("[data-ch]")];
  const byId = Object.fromEntries(chapters.map((el) => [el.dataset.ch, el]));
  const isos = new Set(geo.features.map((f) => f.properties.iso));
  for (const el of chapters) {   // each layer learns its chapter's number and name, for the summary in (10)
    const m = (el.querySelector(".cc-ch__lbl")?.textContent || "").match(/^\((\d+)\)\s*([^·]+)/);
    if (m && L[el.dataset.ch]) Object.assign(L[el.dataset.ch], { n: m[1], chapter: m[2].trim() });
  }

  /* ── state, and the URL that carries it: ?c=IND&p=lat,lon,name#chapter ───────────────────────── */
  const q = new URLSearchParams(location.search);
  const S = {
    ch: null, iso: C[(q.get("c") || "").toUpperCase()] ? q.get("c").toUpperCase() : "IND",
    P: { warm: 0, ssp: "SSP2-4.5", year: 2100, ndvi: false, ndviYear: 2022, when: "now", dim: "all" },
    place: parsePlace(q.get("p")) || DEFAULT_PLACE,
  };
  const gq = +q.get("g");
  if (gq >= SIZES.min && gq <= SIZES.max && gq % SIZES.step === 0) GRID.n = gq;
  const household = { people: 4, perCapita: 130, roof: 100, roofType: "Tile (clay/concrete)", garden: 20,
    gw: "Simple diversion → garden", kwh: 250, land: 50, autonomy: 2 };
  function parsePlace(s) {
    const m = (s || "").match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(.*))?$/);
    return m ? { lat: +m[1], lon: +m[2], name: m[3] || `${(+m[1]).toFixed(2)}°, ${(+m[2]).toFixed(2)}°`, admin1: "", country: "" } : null;
  }
  const placeName = () => [S.place.name, S.place.admin1, S.place.country].filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i).join(", ");
  function writeUrl() {
    const u = new URL(location.href);
    u.searchParams.set("c", S.iso);
    if (S.place !== DEFAULT_PLACE) u.searchParams.set("p", `${S.place.lat.toFixed(4)},${S.place.lon.toFixed(4)},${S.place.name}`);
    if (GRID.n !== 32) u.searchParams.set("g", GRID.n); else u.searchParams.delete("g");
    if (S.ch) u.hash = S.ch !== "top" ? S.ch : "";   // before the first chapter is active, keep the deep link the page opened with
    history.replaceState(null, "", u);
  }

  /* ── the map ──────────────────────────────────────────────────────────────────────────────────── */
  let k = colours();
  const map = new maplibregl.Map({
    container: root.querySelector("[data-map]"), style: baseStyle(k), bounds: WORLD, fitBoundsOptions: { padding: 16 },
    minZoom: .4, maxZoom: 16, dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.touchZoomRotate.disableRotation();
  await new Promise((r) => map.once("load", r));

  const FILL = ["interpolate", ["linear"], ["zoom"], 5, .94, 8, .3];
  map.addSource("countries", { type: "geojson", data: geo, promoteId: "iso" });
  map.addLayer({ id: "cc-fill", type: "fill", source: "countries",
    paint: { "fill-color": ["to-color", ["coalesce", ["feature-state", "c"], k.none]], "fill-opacity": FILL } }, "place-town");
  map.addLayer({ id: "cc-line", type: "line", source: "countries", paint: { "line-color": k.paper, "line-width": .5 } }, "place-town");
  map.addLayer({ id: "cc-hover", type: "line", source: "countries",
    paint: { "line-color": k.ink, "line-width": ["case", ["boolean", ["feature-state", "hov"], false], 1, 0] } }, "place-town");
  map.addLayer({ id: "cc-sel", type: "line", source: "countries",
    paint: { "line-color": k.ink, "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 1.75, 0] } }, "place-town");
  map.addSource("pts", { type: "geojson", data: fc([]) });
  map.addLayer({ id: "pts", type: "circle", source: "pts", paint: {
    "circle-color": ["to-color", ["get", "col"]], "circle-radius": ["coalesce", ["get", "r"], 5],
    "circle-stroke-color": k.paper, "circle-stroke-width": 1.5 } });

  const tiles = new TileGrid(map, map.getContainer());
  // McHarg's sheets: the (layers) list over the map, for every chapter with a grid
  const sheetsEl = root.querySelector("[data-layers]");
  tiles.onsheets = () => {
    const list = tiles.spec ? tiles.sheetList() : [];
    sheetsEl.hidden = !list.length;
    sheetsEl.querySelector("ul").innerHTML = list.map((x) => `<li><label><input type="checkbox" data-sheet="${x.id}"${x.on ? " checked" : ""}>
      ${esc(x.name)}${x.loading ? ` <span>(reading ${x.needs === "ground" ? "the ground" : "the streets"} …)</span>` : ""}</label></li>`).join("");
  };
  sheetsEl.addEventListener("change", (e) => { const id = e.target.dataset.sheet; if (id) tiles.toggle(id); });
  // the square, dragged or resized: the place moves to its centre and every chapter reads it again
  tiles.onmove = ({ lon, lat, n, size, moved }) => {
    if (size === GRID.size) GRID.n = n;
    if (!moved) { setPlace({ ...S.place }); return; }   // only resized: the same place, a bigger or smaller square
    setPlace({ lat, lon, name: `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? "E" : "W"}`,
      admin1: S.place.admin1, country: S.place.country, moved: true });
  };
  const pin = document.createElement("div");
  pin.className = "cc-pin"; pin.setAttribute("aria-hidden", "true");
  const marker = new maplibregl.Marker({ element: pin }).setLngLat([S.place.lon, S.place.lat]);

  function fc(points) {
    return { type: "FeatureCollection", features: points.map((p) => ({ type: "Feature",
      properties: { col: p.col, r: p.r || 5, label: p.label }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })) };
  }
  const setPoints = (points) => map.getSource("pts").setData(fc(points));

  /* ── painting a country layer ─────────────────────────────────────────────────────────────────── */
  let painted = null, values = {};
  const valuesOf = (id) => {
    const out = {};
    for (const iso of isos) { const v = C[iso] ? L[id].get(C[iso], S.P) : undefined; if (ok(v)) out[iso] = v; }
    return out;
  };
  function paint(id) {
    const l = L[id], br = breaksOf(l, S.P), n = br.length + 1, rev = l.reverseFor?.(S.P);
    const colourOf = (v) => { const i = classOf(v, br); return classColour(rev ? n - 1 - i : i, n, l.diverging); };
    values = valuesOf(id);
    for (const iso of isos) map.setFeatureState({ source: "countries", id: iso }, { c: ok(values[iso]) ? colourOf(values[iso]) : null });
    painted = id;
    legend(l, br, n, rev);
    if (id === "forest" && S.P.ndvi) root.querySelector("[data-legend]").innerHTML = `
      <p class="cc-lg__t">vegetation index (ndvi), june ${S.P.ndviYear} <span>· nasa modis terra, monthly</span></p>
      <div class="cc-lg__bar cc-lg__bar--ndvi"></div>
      <div class="cc-lg__ends"><span>bare ground</span><span>dense growth</span></div>`;
    if (id === "air") setPoints(Object.entries(T.d08.CITY_AIR).map(([name, a]) => ({ lat: a[0], lon: a[1], col: colourOf(a[2] / T.d08.WHO_2021), r: 4.5,
      label: `${name} · ${fmt(a[2])} µg/m³ · ${fmt(a[2] / T.d08.WHO_2021, 1)}× the WHO limit` })));
    else if (!String(S.ch).startsWith("p-")) setPoints([]);
    map.setPaintProperty("cc-fill", "fill-opacity", id === "forest" && S.P.ndvi ? 0 : FILL);
    ndvi(id === "forest" && S.P.ndvi);
  }
  function legend(l, br, n, rev) {
    const lb = labelsOf(l, S.P), sw = (i) => classColour(rev ? n - 1 - i : i, n, l.diverging);
    root.querySelector("[data-legend]").innerHTML = `
      <p class="cc-lg__t">${esc(l.title(S.P))} <span>· ${esc(l.unit)} · ${esc(String(l.src.year))}</span></p>
      <div class="cc-lg__bar">${lb.map((name, i) => `<i style="background:${sw(i)}" title="${esc(name)}"></i>`).join("")}</div>
      <div class="cc-lg__ticks">${br.map((b, i) => `<span style="left:${(i + 1) / n * 100}%">${fmt(b)}</span>`).join("")}</div>
      <div class="cc-lg__ends"><span>${esc(lb[0])}</span><span>${esc(lb[n - 1])}</span></div>
      <p class="cc-lg__nd"><i style="background:${k.none}"></i>no data</p>`;
  }
  let ndviOn = null;
  function ndvi(on) {
    const key = on ? S.P.ndviYear : null;
    if (key === ndviOn) return;
    if (map.getLayer("ndvi")) map.removeLayer("ndvi");
    if (map.getSource("ndvi")) map.removeSource("ndvi");
    ndviOn = key;
    if (!on) return;
    map.addSource("ndvi", { type: "raster", tileSize: 256, maxzoom: 7, attribution: "NASA GIBS · MODIS Terra",
      tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_Monthly/default/${key}-06-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`] });
    map.addLayer({ id: "ndvi", type: "raster", source: "ndvi", paint: { "raster-opacity": .92 } }, "cc-line");
  }

  /* ── a chapter's readout for the chosen country ───────────────────────────────────────────────── */
  function rankOf(id, values) {
    let [up, word] = RANK[id];
    if (id === "poly" && S.P.dim !== "all") [up, word] = [0, "most exposed"];
    if (id === "forest" && values[S.iso] > 0) [up, word] = [0, "biggest gain"];   // a country that grew forest ranks among the gains
    const order = Object.keys(values).sort((a, b) => (up ? values[a] - values[b] : values[b] - values[a]));
    const i = order.indexOf(S.iso);
    return i < 0 ? "" : `${ordinal(i + 1)} ${word} of ${order.length}`;
  }
  // every country chapter's readout is drawn up front and redrawn on a change, never on arrival: a
  // readout that appeared as its chapter scrolled in would push the chapters below it out of place
  function detail(id) {
    if (!byId[id]) return;   // a layer kept for the all-at-once score, with no chapter of its own
    const l = L[id], el = byId[id].querySelector("[data-body]"), c = C[S.iso], values = valuesOf(id);
    const html = c && l.detail(c, S.P, { rank: rankOf(id, values), all: L, P: S.P });
    el.innerHTML = `<p class="cc-who">${esc(c ? c.n : S.iso)}</p>`
      + (html || note(`There is no ${esc(l.chapter || id)} data for ${esc(c ? c.n : S.iso)} in this layer.`))
      + `<details class="cc-all"><summary>(every country, ranked)</summary><ol data-all></ol></details>`;
    el.querySelector("details").addEventListener("toggle", (e) => {
      if (!e.target.open) return;
      const [asc] = RANK[id], up = id === "poly" && S.P.dim !== "all" ? false : !!asc;
      e.target.querySelector("[data-all]").innerHTML = Object.keys(values).sort((a, b) => (up ? values[a] - values[b] : values[b] - values[a]))
        .map((iso) => `<li${iso === S.iso ? ' class="is-sel"' : ""}><button type="button" data-iso="${iso}">${esc(C[iso].n)}</button>
          <span>${fmt(values[iso], l.d || 0)} · ${esc(nameOf(l, values[iso], S.P))}</span></li>`).join("");
    });
  }
  function controls(id) {
    if (!byId[id]) return;
    const l = L[id], el = byId[id].querySelector("[data-ctl]");
    el.innerHTML = l.controls ? l.controls(S.P) : "";
  }

  /* ── choosing a country ───────────────────────────────────────────────────────────────────────── */
  const sel = root.querySelector("[data-country]");
  sel.innerHTML = [...isos].filter((i) => C[i]).sort((a, b) => C[a].n.localeCompare(C[b].n))
    .map((i) => `<option value="${i}">${esc(C[i].n)}</option>`).join("");
  function choose(iso, fly) {
    if (!C[iso]) return;
    map.setFeatureState({ source: "countries", id: S.iso }, { sel: false });
    S.iso = iso;
    map.setFeatureState({ source: "countries", id: iso }, { sel: true });
    sel.value = iso;
    Object.keys(L).forEach(detail);
    if (fly) {
      const f = geo.features.find((x) => x.properties.iso === iso), b = new maplibregl.LngLatBounds();
      f.geometry.coordinates.flat(2).forEach((pt) => b.extend(pt));
      map.fitBounds(b, { padding: 60, maxZoom: 4.5, duration: 900 });
    }
    writeUrl();
  }
  sel.addEventListener("change", () => choose(sel.value, true));
  Object.keys(L).forEach(controls);
  choose(S.iso, false);

  /* ── a place ──────────────────────────────────────────────────────────────────────────────────── */
  const rendered = {}, pts = {}, grids = {};
  const showGrid = (spec) => {
    tiles.set(spec); root.querySelector("[data-legend]").innerHTML = spec.legend || "";
    // a place reached by dragging the square takes the name of the neighbourhood nearest its middle
    const G = spec.G;
    if (S.place.moved && G?.places?.length && G.size === GRID.size) {
      const mid = G.n / 2, near = [...G.places].sort((a, b) => Math.hypot(a.c - mid, a.r - mid) - Math.hypot(b.c - mid, b.r - mid))[0];
      S.place = { ...S.place, name: `near ${near.name}`, moved: false };
      showPlaceName(); writeUrl();
    }
    // the legend sits off the grid: reframe when it changes height, not on every redraw of the same key
    const g = steps[S.ch]?.grid;
    if (g && root.querySelector("[data-legend]").offsetHeight !== fitLg) fitGrid(g, 600);
  };
  const placeKey = () => `${S.place.lat.toFixed(4)},${S.place.lon.toFixed(4)},${GRID.n}`;
  const nameEl = root.querySelector("[data-place-name]");
  const showPlaceName = () => { nameEl.textContent = placeName(); };
  showPlaceName();
  function setPlace(p) {
    S.place = p;
    showPlaceName();
    marker.setLngLat([p.lon, p.lat]);
    Object.keys(pts).forEach((id) => delete pts[id]);
    Object.keys(grids).forEach((id) => delete grids[id]);
    tiles.clear(); root.querySelector("[data-legend]").innerHTML = "";
    writeUrl();
    const el = byId[S.ch], kind = el?.dataset.kind;
    if (kind === "place" || kind === "city") { setPoints([]); view(S.ch); runStep(S.ch); }
  }
  const fly = (zoom) => map.flyTo({ center: [S.place.lon, S.place.lat], zoom, duration: 1400, essential: true });
  // the legend never covers the grid: on phones it sits over the top of the map and the grid is framed
  // below it; on wider screens it sits at the bottom left and the grid is framed above it
  let fitLg = -1;
  const fitGrid = (g, duration) => {
    const lg = root.querySelector("[data-legend]"), h = lg.offsetHeight;
    fitLg = h;
    const padding = mq.matches ? { top: h ? lg.offsetTop + h + 20 : 12, bottom: 12, left: 12, right: 12 }
      : { top: 28, left: 28, right: 28, bottom: h ? h + 32 : 28 };
    map.fitBounds(gridBounds(S.place, g), { padding, duration, essential: true });
  };
  // a chapter with a grid frames the grid; the rest fly to their zoom
  const view = (id) => {
    const g = steps[id]?.grid;
    if (g) fitGrid(g, 1400);
    else fly(steps[id]?.zoom || 10);
  };
  function ctxFor(id) {
    const key = placeKey();
    return { T, ai, household, placeName, placeHeat: () => placeHeat(S.place), sheet: (id) => tiles.on(id),
      points: (arr) => { pts[id] = arr; if (S.ch === id) setPoints(arr); },
      grid: (spec) => { if (key !== placeKey()) return; grids[id] = spec; if (S.ch === id) showGrid(spec); } };
  }
  function runStep(id) {
    const body = byId[id].querySelector("[data-body]");
    if (rendered[id] === placeKey()) { if (pts[id]) setPoints(pts[id]); if (grids[id]) showGrid(grids[id]); return; }
    rendered[id] = placeKey();
    const key = placeKey();
    steps[id].render(body, S.place, ctxFor(id)).catch((e) => {
      console.error(e);
      if (rendered[id] === key) { delete rendered[id]; body.innerHTML = failed(`The service for ${esc(placeName())}`); }
    });
  }
  // the search: Open-Meteo's geocoder, as every place tool used
  const form = root.querySelector("[data-place-form]"), input = form.querySelector("[data-place-input]"), hits = form.querySelector("[data-place-hits]");
  let found = [], timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const v = input.value.trim();
    if (v.length < 2) { hits.hidden = true; return; }
    timer = setTimeout(async () => {
      try { found = await geocode(v); } catch (e) { found = []; }
      hits.innerHTML = found.length ? found.map((h, i) => `<li><button type="button" data-hit="${i}">${esc([h.name, h.admin1, h.country].filter(Boolean).join(", "))}</button></li>`).join("")
        : `<li class="cc-hits__none">(nothing found)</li>`;
      hits.hidden = false;
    }, 280);
  });
  const pick = (h) => { if (!h) return; input.value = ""; hits.hidden = true; setPlace(h); };
  form.addEventListener("submit", (e) => { e.preventDefault(); pick(found[0]); });
  hits.addEventListener("click", (e) => { const b = e.target.closest("[data-hit]"); if (b) pick(found[+b.dataset.hit]); });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") hits.hidden = true; });

  /* ── the AI notes go through the thoughts worker, which holds the OpenRouter key ──────────────── */
  async function ai(tool, payload) {
    const url = root.dataset.ai;
    if (!/^https?:/.test(url)) throw new Error("no AI endpoint is set for this build");
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool, input: payload }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error(d.error || `${r.status}`);
    return d;
  }

  /* ── chapters: the one in the middle of the column drives the map ────────────────────────────── */
  function activate(id) {
    if (id === S.ch || !byId[id]) return;
    const prev = byId[S.ch]?.dataset.kind, el = byId[id], kind = el.dataset.kind;
    S.ch = id;
    tiles.chapter();
    root.dataset.kind = kind;
    root.querySelectorAll("[data-go]").forEach((a) => a.toggleAttribute("aria-current", a.dataset.go === id));
    const idx = root.querySelector("[data-index]"), cur = idx.querySelector("[aria-current]");   // phones: the index is one row that scrolls
    if (cur && idx.scrollWidth > idx.clientWidth) idx.scrollLeft = cur.parentElement.offsetLeft - idx.clientWidth / 2;
    const src = el.querySelector("[data-src]");
    if (!local(kind)) tiles.clear();
    if (L[id]) {
      paint(id);
      if (src) src.textContent = `(source) ${L[id].src.src.toLowerCase()}`;
      marker.remove();
      if (local(prev) || map.getZoom() > 5) map.fitBounds(WORLD, { padding: 16, duration: 1200 });
    } else if (local(kind)) {
      if (src) src.textContent = `(source) ${PLACE_SRC[id]}`;
      map.setPaintProperty("cc-fill", "fill-opacity", 0);
      ndvi(false);
      root.querySelector("[data-legend]").innerHTML = "";
      if (grids[id]) showGrid(grids[id]); else tiles.clear();
      setPoints(pts[id] || []);
      marker.setLngLat([S.place.lon, S.place.lat]).addTo(map);
      view(id);
      runStep(id);
    } else {   // the opening and the method: the last layer, all at once, as the cover
      marker.remove();
      const keep = S.P.dim; S.P.dim = "all"; paint("poly"); S.P.dim = keep;
      if (local(prev)) map.fitBounds(WORLD, { padding: 16, duration: 1200 });
    }
    writeUrl();
  }
  const mq = matchMedia("(max-width: 760px)");
  let io, jumping = false;
  function observe() {
    io?.disconnect();
    io = new IntersectionObserver((es) => es.forEach((e) => !jumping && e.isIntersecting && activate(e.target.dataset.ch)),
      // on a phone the map covers the top of the screen, so the band that picks the chapter sits lower
      { root: mq.matches ? null : panel, rootMargin: mq.matches ? "-72% 0px -24% 0px" : "-38% 0px -58% 0px" });
    chapters.forEach((el) => io.observe(el));
  }
  mq.addEventListener("change", observe);
  observe();
  root.querySelector("[data-index]").addEventListener("click", (e) => {
    const a = e.target.closest("[data-go]");
    if (!a) return;
    e.preventDefault();
    // a jump skips the chapters it passes: each one would render its readout on the way, the column
    // would grow above the target, and the scroll would stop a chapter short (seen on phones)
    jumping = true;
    activate(a.dataset.go);
    const done = () => { jumping = false; window.removeEventListener("scrollend", done); panel.removeEventListener("scrollend", done); };
    window.addEventListener("scrollend", done); panel.addEventListener("scrollend", done);
    setTimeout(done, 2000);   // scrollend is missing in older Safari
    byId[a.dataset.go].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  const first = location.hash.slice(1);
  if (byId[first]) {
    // a deep link: the chapters above it fill in as their data arrives and push it down, so it is
    // re-aligned each time a chapter changes size while the page settles, until the reader scrolls
    jumping = true;
    activate(first);
    const go = () => byId[first].scrollIntoView({ block: "start", behavior: "instant" });   // the site's html is scroll-behavior:smooth   // the site's html is scroll-behavior:smooth
    const ro = new ResizeObserver(go);
    const stop = () => { ro.disconnect(); clearTimeout(t); jumping = false; ["wheel", "touchstart", "keydown"].forEach((ev) => removeEventListener(ev, stop)); };
    const t = setTimeout(stop, 8000);
    ["wheel", "touchstart", "keydown"].forEach((ev) => addEventListener(ev, stop, { passive: true }));
    chapters.forEach((el) => ro.observe(el));   // the panel itself is fixed-height on wide screens
    go();
  } else activate("top");

  /* a chapter's switches */
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.iso) { choose(b.dataset.iso, true); return; }
    const d = b.dataset, P = S.P;
    if ("warm" in d) P.warm = +d.warm; else if ("ssp" in d) P.ssp = d.ssp; else if ("year" in d) P.year = +d.year;
    else if ("ndvi" in d) P.ndvi = d.ndvi === "1"; else if ("ndviYear" in d) P.ndviYear = +d.ndviYear;
    else if ("when" in d) P.when = d.when; else if ("dim" in d) P.dim = d.dim; else return;
    if (L[S.ch]) { controls(S.ch); paint(S.ch); detail(S.ch); if (S.ch !== "poly") detail("poly"); }
  });

  /* ── pointing at the map ──────────────────────────────────────────────────────────────────────── */
  const tip = root.querySelector("[data-tip]");
  let hov = null;
  const showTip = (e, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const r = map.getContainer().getBoundingClientRect(), x = e.point.x, y = e.point.y;
    tip.style.left = `${Math.min(x + 14, r.width - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.max(8, y - tip.offsetHeight - 10)}px`;
  };
  const hideTip = () => { tip.hidden = true; if (hov) map.setFeatureState({ source: "countries", id: hov }, { hov: false }); hov = null; };
  map.on("mousemove", "cc-fill", (e) => {
    const kind = byId[S.ch]?.dataset.kind;
    if (local(kind)) return;
    if (!e.features.length) return hideTip();
    const iso = e.features[0].id, l = L[painted];
    if (hov !== iso) { if (hov) map.setFeatureState({ source: "countries", id: hov }, { hov: false }); hov = iso; map.setFeatureState({ source: "countries", id: iso }, { hov: true }); }
    const v = values[iso];
    showTip(e, `<b>${esc(C[iso]?.n || e.features[0].properties.name)}</b><br>${ok(v) ? `${fmt(v, l.d || 0)} ${esc(l.unit)} · ${esc(nameOf(l, v, S.P))}` : "no data"}`);
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "cc-fill", () => { hideTip(); map.getCanvas().style.cursor = ""; });
  map.on("mousemove", "pts", (e) => showTip(e, esc(e.features[0].properties.label)));
  map.on("mousemove", (e) => {
    if (!local(byId[S.ch]?.dataset.kind)) return;
    const spec = tiles.spec, i = tiles.cellAt(e.point);
    map.getCanvas().style.cursor = spec?.click && i >= 0 ? "crosshair" : "";
    if (!spec || i < 0 || !spec.tip || !spec.cell(i)) { tip.hidden = true; tiles.hover(-1); return; }
    tiles.hover(i);
    showTip(e, spec.tip(i));
  });
  map.on("mouseout", () => { tip.hidden = true; tiles.hover(-1); });
  map.on("mouseleave", "pts", hideTip);
  map.on("click", (e) => {
    const kind = byId[S.ch]?.dataset.kind;
    if (local(kind)) {
      // a chapter with something picked to put on the grid takes the click; otherwise it moves the place
      const i = tiles.spec?.click ? tiles.cellAt(e.point) : -1;
      if (i >= 0) { tiles.spec.click(i); return; }
      const f = map.queryRenderedFeatures(e.point, { layers: ["cc-fill"] })[0];
      const { lat, lng } = e.lngLat;
      setPlace({ lat, lon: lng, name: `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? "E" : "W"}`,
        admin1: "", country: f ? (C[f.id]?.n || f.properties.name) : "" });
      return;
    }
    const f = map.queryRenderedFeatures(e.point, { layers: ["cc-fill"] })[0];
    if (f && C[f.id]) choose(f.id, false);
  });

  /* ── colour modes: the basemap and the layers follow the page ─────────────────────────────────── */
  document.addEventListener("themechange", () => {
    k = colours();
    for (const [id, prop, v] of [["land", "background-color", k.land], ["water", "fill-color", k.water], ["green", "fill-color", k.green],
      ["wood", "fill-color", k.green], ["building", "fill-color", k.line], ["road-minor", "line-color", k.line], ["road-major", "line-color", k.line],
      ["place-town", "text-color", k.soft], ["place-town", "text-halo-color", k.paper], ["place-city", "text-color", k.soft],
      ["place-city", "text-halo-color", k.paper], ["cc-line", "line-color", k.paper], ["cc-hover", "line-color", k.ink],
      ["cc-sel", "line-color", k.ink], ["pts", "circle-stroke-color", k.paper]]) map.setPaintProperty(id, prop, v);
    map.setPaintProperty("cc-fill", "fill-color", ["to-color", ["coalesce", ["feature-state", "c"], k.none]]);
    if (painted) paint(painted);
    // a grid's colours were fixed when it was made: forget them and remake the one on screen
    Object.keys(grids).forEach((id) => delete grids[id]);
    Object.keys(rendered).forEach((id) => delete rendered[id]);
    tiles.clear();
    const kind = byId[S.ch]?.dataset.kind;
    if (kind === "place" || kind === "city") runStep(S.ch);
  });
  root.querySelector("[data-built]").textContent = `(data rebuilt ${atlas.built} from the sixteen apps' own tables and formulas)`;
}

/* the site's colours, read off the page (they change with the colour mode), mixed into map colours */
function colours() {
  const s = getComputedStyle(document.documentElement), g = (n, f) => s.getPropertyValue(n).trim() || f;
  const paper = g("--paper", "#FAFAF8"), ink = g("--ink", "#1C1B18"), line = g("--line", "#C2C0B7"), d = dark();
  return { paper, ink, line, soft: g("--ink-soft", ink),
    land: mix(paper, ink, d ? .07 : .04), water: mix(paper, g("--accent", "#2E3A57"), d ? .22 : .07),
    green: mix(paper, "#3F7D5A", d ? .32 : .18), none: mix(paper, ink, d ? .14 : .09) };
}
function rgb(c) {
  if (c.startsWith("#")) { const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join("") : c.slice(1, 7); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); }
  const m = c.match(/\d+(\.\d+)?/g);
  return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
}
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",")})`; }

function baseStyle(k) {
  const label = (size) => ({ "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": size, "text-max-width": 8 });
  const lpaint = { "text-color": k.soft, "text-halo-color": k.paper, "text-halo-width": 1.2 };
  return {
    version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet",
      attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' } },
    layers: [
      { id: "land", type: "background", paint: { "background-color": k.land } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": k.water } },
      { id: "green", type: "fill", source: "omt", "source-layer": "park", minzoom: 9, paint: { "fill-color": k.green } },
      { id: "wood", type: "fill", source: "omt", "source-layer": "landcover", minzoom: 9,
        filter: ["in", ["get", "class"], ["literal", ["wood", "grass"]]], paint: { "fill-color": k.green, "fill-opacity": .6 } },
      { id: "building", type: "fill", source: "omt", "source-layer": "building", minzoom: 14, paint: { "fill-color": k.line, "fill-opacity": .35 } },
      { id: "road-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 12,
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary"]]], paint: { "line-color": k.line, "line-width": .6 } },
      { id: "road-major", type: "line", source: "omt", "source-layer": "transportation", minzoom: 6,
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
        paint: { "line-color": k.line, "line-width": ["interpolate", ["linear"], ["zoom"], 6, .4, 14, 2] } },
      { id: "place-town", type: "symbol", source: "omt", "source-layer": "place", minzoom: 9,
        filter: ["in", ["get", "class"], ["literal", ["town", "suburb", "village"]]], layout: label(10), paint: lpaint },
      { id: "place-city", type: "symbol", source: "omt", "source-layer": "place", minzoom: 3.5,
        filter: ["==", ["get", "class"], "city"], layout: label(11), paint: lpaint },
    ],
  };
}
