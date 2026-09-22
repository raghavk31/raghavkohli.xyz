/* The thoughts API. Anyone can read and post; nobody logs in.
   GET    /thoughts?before=<ms>&limit=<n>   the newest posts (id, title, body, name, owner, images, created)
                                            plus `layout`: {id: {x, y, w, z}} for every note that has been placed
   POST   /thoughts  {body, title?, name?, images?, turnstile?, key?}   a new post; `key` = OWNER_KEY marks it as Raghav's
   DELETE /thoughts/<id>                    with header X-Owner-Key: OWNER_KEY (its images and layout go with it)
   PUT    /layout/<id>  {x, y, w, z}        where a note sits on the board (owner); <id> is a live id or a markdown slug
   DELETE /layout/<id>                      the note flows again (owner)
   POST   /images      <image bytes>        an image for a note (owner); Content-Type is the mime; returns {id}
   GET    /images/<id>                      the image, cached for a year
   Guards, all without login: a Turnstile token when TURNSTILE_SECRET is set, RATE_PER_HOUR posts per
   IP (IPs are stored only as a salted hash), MAX_BODY (visitors only) / MAX_TITLE / MAX_NAME lengths. Images live in
   D1 as blobs (R2 is not enabled on the account); the browser downscales them first, MAX_IMAGE caps
   what the worker accepts, and only the owner can attach them. */

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGES = 6;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Owner-Key",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors } });
    const isOwner = (key) => !!env.OWNER_KEY && key === env.OWNER_KEY;
    const ownerHeader = () => isOwner(req.headers.get("X-Owner-Key"));

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const m = url.pathname.match(/^\/(thoughts|layout|images)(?:\/([A-Za-z0-9_-]+))?\/?$/);
    if (!m) return json({ error: "not found" }, 404);
    const route = m[1], id = m[2];

    /* ---------- thoughts ---------- */
    if (route === "thoughts" && req.method === "GET" && !id) {
      const before = Number(url.searchParams.get("before")) || Date.now() + 1;
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
      const [{ results }, lay] = await Promise.all([
        env.DB.prepare("SELECT id, title, body, name, owner, images, created FROM thoughts WHERE created < ? ORDER BY created DESC LIMIT ?").bind(before, limit).all(),
        env.DB.prepare("SELECT id, x, y, w, z FROM layout").all(),
      ]);
      const layout = {};
      for (const r of lay.results) layout[r.id] = { x: r.x, y: r.y, w: r.w, z: r.z };
      return json({ thoughts: results.map(withImages), layout });
    }

    if (route === "thoughts" && req.method === "POST" && !id) {
      let data;
      try { data = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const body = String(data.body || "").replace(/\r\n?/g, "\n").trim();
      const title = String(data.title || "").replace(/\s+/g, " ").trim().slice(0, Number(env.MAX_TITLE) || 80);
      const name = String(data.name || "").trim().slice(0, Number(env.MAX_NAME) || 40);
      const owner = isOwner(data.key);
      // images: ids from POST /images, owner only (flip `owner` here to let anyone attach them)
      let images = Array.isArray(data.images) ? data.images.filter((s) => typeof s === "string" && /^[a-z0-9]+$/.test(s)).slice(0, MAX_IMAGES) : [];
      if (!owner) images = [];
      if (!body && !images.length) return json({ error: "write something first" }, 400);
      if (!owner && body.length > (Number(env.MAX_BODY) || 2000)) return json({ error: "too long" }, 400); // the owner's text has no cap
      const ip = req.headers.get("CF-Connecting-IP") || "0.0.0.0";
      let ipHash = "owner";
      if (!owner) {
        // the bot check, when the secret is configured
        if (env.TURNSTILE_SECRET) {
          const ok = await verifyTurnstile(env.TURNSTILE_SECRET, data.turnstile, ip);
          if (!ok) return json({ error: "could not verify you are a person; try again" }, 403);
        }
        // the rate limit: RATE_PER_HOUR posts per IP, IPs as salted hashes only
        ipHash = await sha256(`${env.IP_SALT || ""}:${ip}`);
        const { count } = await env.DB.prepare("SELECT COUNT(*) AS count FROM thoughts WHERE ip_hash = ? AND created > ?")
          .bind(ipHash, Date.now() - 3600_000).first();
        if (count >= (Number(env.RATE_PER_HOUR) || 3)) return json({ error: "that is enough for one hour; come back later" }, 429);
      }
      if (images.length) {
        // only images that were uploaded and not yet attached to a note
        const q = `SELECT id FROM images WHERE thought_id IS NULL AND id IN (${images.map(() => "?").join(",")})`;
        const { results } = await env.DB.prepare(q).bind(...images).all();
        const ok = new Set(results.map((r) => r.id));
        images = images.filter((i) => ok.has(i));
      }
      const row = { id: newId(), title: title || null, body, name: name || null, owner: owner ? 1 : 0, images, created: Date.now() };
      const stmts = [
        env.DB.prepare("INSERT INTO thoughts (id, title, body, name, owner, ip_hash, created, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(row.id, row.title, row.body, row.name, row.owner, ipHash, row.created, images.length ? JSON.stringify(images) : null),
      ];
      if (images.length) {
        stmts.push(env.DB.prepare(`UPDATE images SET thought_id = ? WHERE id IN (${images.map(() => "?").join(",")})`).bind(row.id, ...images));
      }
      await env.DB.batch(stmts);
      return json({ thought: row }, 201);
    }

    if (route === "thoughts" && req.method === "DELETE" && id) {
      if (!ownerHeader()) return json({ error: "no" }, 403);
      const [r] = await env.DB.batch([
        env.DB.prepare("DELETE FROM thoughts WHERE id = ?").bind(id),
        env.DB.prepare("DELETE FROM images WHERE thought_id = ?").bind(id),
        env.DB.prepare("DELETE FROM layout WHERE id = ?").bind(id),
      ]);
      return json({ deleted: r.meta.changes > 0 });
    }

    /* ---------- layout: where a note sits ---------- */
    if (route === "layout" && id && (req.method === "PUT" || req.method === "DELETE")) {
      if (!ownerHeader()) return json({ error: "no" }, 403);
      if (req.method === "DELETE") {
        await env.DB.prepare("DELETE FROM layout WHERE id = ?").bind(id).run();
        return json({ ok: true });
      }
      let data;
      try { data = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const n = (v, lo, hi) => Math.min(Math.max(Number(v) || 0, lo), hi);
      const pos = { x: n(data.x, 0, 20000), y: n(data.y, 0, 200000), w: n(data.w, 120, 2000), z: Math.round(n(data.z, 0, 1e9)) };
      await env.DB.prepare(
        "INSERT INTO layout (id, x, y, w, z, updated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET x = excluded.x, y = excluded.y, w = excluded.w, z = excluded.z, updated = excluded.updated"
      ).bind(id, pos.x, pos.y, pos.w, pos.z, Date.now()).run();
      return json({ layout: pos });
    }

    /* ---------- images ---------- */
    if (route === "images" && req.method === "POST" && !id) {
      if (!ownerHeader()) return json({ error: "no" }, 403);
      const mime = (req.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
      if (!IMAGE_TYPES.includes(mime)) return json({ error: "not an image" }, 415);
      const max = Number(env.MAX_IMAGE) || 1_500_000;
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ error: "empty" }, 400);
      if (buf.byteLength > max) return json({ error: "image too large" }, 413);
      const imgId = newId();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO images (id, thought_id, mime, bytes, created) VALUES (?, NULL, ?, ?, ?)").bind(imgId, mime, buf, Date.now()),
        // uploads that never made it onto a note are cleared after a day
        env.DB.prepare("DELETE FROM images WHERE thought_id IS NULL AND created < ?").bind(Date.now() - 86400_000),
      ]);
      return json({ id: imgId }, 201);
    }

    if (route === "images" && req.method === "GET" && id) {
      const row = await env.DB.prepare("SELECT mime, bytes FROM images WHERE id = ?").bind(id).first();
      if (!row) return new Response("not found", { status: 404, headers: cors });
      const bytes = row.bytes instanceof ArrayBuffer ? row.bytes : new Uint8Array(row.bytes);
      return new Response(bytes, {
        headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", ...cors },
      });
    }

    return json({ error: "method not allowed" }, 405);
  },
};

function withImages(row) {
  let images = [];
  try { images = row.images ? JSON.parse(row.images) : []; } catch {}
  return { ...row, images };
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret); form.append("response", token); form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const j = await r.json().catch(() => ({}));
  return !!j.success;
}

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newId() {
  // time-sortable, URL-safe: base36 time + 8 random chars
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  return Date.now().toString(36) + [...rnd].map((b) => (b % 36).toString(36)).join("");
}
