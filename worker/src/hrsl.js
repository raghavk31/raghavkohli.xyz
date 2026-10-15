/* GET /hrsl/<file>.tif — Meta's High Resolution Settlement Layer (people per 30 m pixel, 2020), passed
   through for Climate Code's "who is exposed" chapter. Meta publishes it as cloud-optimised GeoTIFFs on
   AWS Open Data, which a browser reads a window at a time with range requests, but the bucket sends no
   CORS header, so the page cannot read it directly. This route adds that header and nothing else.
   Only the general-population v1.5 files, only ranged GETs, and at most 16 MB a request: it cannot be
   used to pull anything else, or a whole file. Public data, so any origin may read it. */
const BASE = "https://dataforgood-fb-data.s3.amazonaws.com/hrsl-cogs/hrsl_general/v1.5/";
const FILE = /^cog_globallat_-?\d+_lon_-?\d+_general-v1\.5\.\d+\.tif$/;
const MAX = 16 * 1024 * 1024;

export async function hrsl(req, url) {
  const h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    "Access-Control-Max-Age": "86400",
  };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "GET") return new Response("GET only", { status: 405, headers: h });
  const file = url.pathname.slice("/hrsl/".length);
  if (!FILE.test(file)) return new Response("not found", { status: 404, headers: h });
  const m = (req.headers.get("Range") || "").match(/^bytes=(\d+)-(\d+)$/);
  if (!m || +m[2] < +m[1] || +m[2] - +m[1] + 1 > MAX) return new Response("a byte range of at most 16 MB is required", { status: 416, headers: h });
  const r = await fetch(BASE + file, { headers: { Range: `bytes=${m[1]}-${m[2]}` } });
  const out = new Headers(h);
  for (const k of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "ETag", "Last-Modified"]) if (r.headers.get(k)) out.set(k, r.headers.get(k));
  out.set("Cache-Control", "public, max-age=2592000");
  return new Response(r.body, { status: r.status, headers: out });
}
