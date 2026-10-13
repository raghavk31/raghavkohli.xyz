/* mvt.js — a small reader for Mapbox Vector Tiles, enough to turn OpenFreeMap's tiles (the same ones the
   basemap draws) into numbers: every feature of the layers asked for, with its properties and its
   geometry in tile units (0..extent). No dependency: the format is protobuf, read by hand.
   Spec: https://github.com/mapbox/vector-tile-spec/tree/master/2.1 */

let tileUrl = null;
async function template() {
  if (!tileUrl) tileUrl = fetch("https://tiles.openfreemap.org/planet").then((r) => r.json()).then((j) => j.tiles[0])
    .catch((e) => { tileUrl = null; throw e; });
  return tileUrl;
}

const tiles = new Map();
/* one tile, decoded to { layer: [features] } for the layers named; kept for the visit */
export function getTile(z, x, y, want) {
  const key = `${z}/${x}/${y}`;
  if (!tiles.has(key)) tiles.set(key, (async () => {
    const url = (await template()).replace("{z}", z).replace("{x}", x).replace("{y}", y);
    const r = await fetch(url);
    if (r.status === 204 || r.status === 404) return {};
    if (!r.ok) throw new Error(`${r.status} for tile ${key}`);
    let buf = new Uint8Array(await r.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b) buf = await gunzip(buf);   // served gzipped without the header that would unzip it
    return decode(buf, want);
  })().catch((e) => { tiles.delete(key); throw e; }));
  return tiles.get(key);
}
async function gunzip(buf) {
  const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/* ── protobuf ──────────────────────────────────────────────────────────────────────────────────── */
class Pbf {
  constructor(buf, pos = 0, end = buf.length) { this.b = buf; this.pos = pos; this.end = end; }
  varint() {
    let v = 0, mul = 1, byte;
    do { byte = this.b[this.pos++]; v += (byte & 0x7f) * mul; mul *= 128; } while (byte & 0x80);
    return v;
  }
  svarint() { const v = this.varint(); return v % 2 === 1 ? (v + 1) / -2 : v / 2; }
  bytes() { const n = this.varint(), s = this.pos; this.pos += n; return [s, s + n]; }
  string() { const [s, e] = this.bytes(); return dec.decode(this.b.subarray(s, e)); }
  skip(wire) {
    if (wire === 0) this.varint(); else if (wire === 1) this.pos += 8; else if (wire === 2) this.pos = this.bytes()[1]; else if (wire === 5) this.pos += 4;
    else throw new Error("bad wire type " + wire);
  }
  each(fn) {   // fn(field, wire) must consume the field or return false to skip it
    while (this.pos < this.end) {
      const tag = this.varint(), f = tag >> 3, w = tag & 7, at = this.pos;
      if (fn(f, w) === false && this.pos === at) this.skip(w);
    }
  }
}
const dec = new TextDecoder();

function decode(buf, want) {
  const out = {}, p = new Pbf(buf);
  p.each((f, w) => {
    if (f !== 3 || w !== 2) return false;
    const [s, e] = p.bytes();
    const L = layer(new Pbf(buf, s, e), want);
    if (L) out[L.name] = L.features;
  });
  return out;
}

function layer(p, want) {
  let name = "", extent = 4096;
  const keys = [], values = [], raw = [];
  p.each((f, w) => {
    if (f === 1) name = p.string();
    else if (f === 2) raw.push(p.bytes());
    else if (f === 3) keys.push(p.string());
    else if (f === 4) { const [s, e] = p.bytes(); values.push(value(new Pbf(p.b, s, e))); }
    else if (f === 5) extent = p.varint();
    else return false;
  });
  if (want && !want.includes(name)) return null;
  return { name, features: raw.map(([s, e]) => feature(new Pbf(p.b, s, e), keys, values, extent)) };
}

function value(p) {
  let v = null;
  p.each((f) => {
    if (f === 1) v = p.string();
    else if (f === 2) { v = new DataView(p.b.buffer, p.b.byteOffset + p.pos, 4).getFloat32(0, true); p.pos += 4; }
    else if (f === 3) { v = new DataView(p.b.buffer, p.b.byteOffset + p.pos, 8).getFloat64(0, true); p.pos += 8; }
    else if (f === 4 || f === 5) v = p.varint();
    else if (f === 6) v = p.svarint();
    else if (f === 7) v = !!p.varint();
    else return false;
  });
  return v;
}

function feature(p, keys, values, extent) {
  const props = {};
  let type = 0, geom = null;
  p.each((f, w) => {
    if (f === 2) { const [st, e] = p.bytes(); p.pos = st; while (p.pos < e) { const k = p.varint(), v = p.varint(); props[keys[k]] = values[v]; } }
    else if (f === 3) type = p.varint();
    else if (f === 4) { const [s, e] = p.bytes(); geom = [s, e]; p.pos = e; }
    else return false;
  });
  const buf = p.b;
  return { type, props, extent, get rings() { return geometry(new Pbf(buf, geom[0], geom[1])); } };
}

/* geometry → array of rings/lines/point-sets, each an array of [x, y] in tile units */
function geometry(p) {
  const out = [];
  let x = 0, y = 0, cur = null;
  while (p.pos < p.end) {
    const c = p.varint(), id = c & 7, n = c >> 3;
    if (id === 1 || id === 2) {
      for (let i = 0; i < n; i++) {
        x += p.svarint(); y += p.svarint();
        if (id === 1) { cur = []; out.push(cur); }
        cur.push([x, y]);
      }
    } else if (id === 7) { if (cur && cur.length) cur.push(cur[0]); }
  }
  return out;
}
