/* pop.js — people per cell, from Meta's High Resolution Settlement Layer (HRSL v1.5, 2020): census counts
   spread over the buildings found in satellite imagery, one value per 30 m pixel. It is a modelled
   estimate, not a count, and in a dense city it follows where buildings are more closely than where
   floors are. Meta publishes it as cloud-optimised GeoTIFFs; the page reads only the window under the
   grid, a few blocks of one file, through the site's worker (worker/src/hrsl.js), which adds the CORS
   header the bucket lacks. hrsl-index.json says which file covers which part of the world.

   population(G) → Float32Array of people per cell (also kept as G.pop) */
import { fromUrl } from "https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm";

let BASE = "";
export const setPopBase = (u) => { BASE = u; };
let index = null;

export function population(G) {
  if (!G.popP) G.popP = read(G).then((p) => (G.pop = p)).catch((e) => { G.popP = null; throw e; });
  return G.popP;
}

async function read(G) {
  if (!BASE) throw new Error("no population service is set for this build");
  index ||= fetch(new URL("./hrsl-index.json", import.meta.url)).then((r) => r.json()).catch((e) => { index = null; throw e; });
  const { files } = await index;
  const [w, s] = G.corner(0, G.n), [e, n] = G.corner(G.n, 0);
  const hit = files.filter((f) => f[1] < e && f[3] > w && f[2] < n && f[4] > s);
  if (!hit.length) throw new Error("no population grid covers this place");
  const out = new Float32Array(G.n * G.n);
  for (const [file] of hit) {
    const img = await (await fromUrl(`${BASE}/hrsl/${file}`)).getImage();
    const [ox, oy] = img.getOrigin(), [rx, ry] = img.getResolution(), W = img.getWidth(), H = img.getHeight();
    const cx = (v) => Math.max(0, Math.min(W, v)), cy = (v) => Math.max(0, Math.min(H, v));
    const x0 = cx(Math.floor((w - ox) / rx)), x1 = cx(Math.ceil((e - ox) / rx)), y0 = cy(Math.floor((n - oy) / ry)), y1 = cy(Math.ceil((s - oy) / ry));
    if (x1 <= x0 || y1 <= y0) continue;
    const [data] = await img.readRasters({ window: [x0, y0, x1, y1], samples: [0] });
    const ww = x1 - x0;
    for (let j = 0; j < y1 - y0; j++) for (let i = 0; i < ww; i++) {
      const v = data[j * ww + i];
      if (!(v > 0)) continue;
      const [c, r] = G.at(ox + (x0 + i + .5) * rx, oy + (y0 + j + .5) * ry);
      if (c >= 0 && r >= 0 && c < G.n && r < G.n) out[(r | 0) * G.n + (c | 0)] += v;
    }
  }
  return out;
}
