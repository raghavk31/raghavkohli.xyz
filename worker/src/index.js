/* The thoughts API. Anyone can read; only the owner writes.
   GET    /thoughts?before=<ms>&limit=<n>   the newest posts (id, title, body, name, owner, images, created)
                                            plus `layout`: {id: {x, y, w, z}} for every note that has been placed
   POST   /thoughts  {body, title?, name?, images?}       a new post          - X-Owner-Key
   PUT    /thoughts/<id>  {body?, title?, name?, images?}  edit one in place   - X-Owner-Key
   DELETE /thoughts/<id>                    its images and layout go with it   - X-Owner-Key
   PUT    /layout/<id>  {x, y, w, z}        where a note sits; <id> is a live id or a markdown slug
   DELETE /layout/<id>                      the note flows again
   POST   /images      <image bytes>        an image for a note; Content-Type is the mime; returns {id}
   GET    /images/<id>                      the image, cached for a year
   Every write takes the X-Owner-Key header and nothing else; there is no login and no public path.
   Until 2026-09-25 anyone could post, guarded by a Turnstile token and a per-IP hourly limit; both
   went with the public path, so reopening the wall means bringing them back, not relaxing a check.
   MAX_TITLE / MAX_NAME cap those fields (the body has no cap). Images live in D1 as blobs (R2 is not
   enabled on the account); the browser downscales them first and MAX_IMAGE caps what the worker takes. */

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
      if (!ownerHeader()) return json({ error: "no" }, 403);
      let data;
      try { data = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const f = fields(data, env);
      const images = await keepImages(env, f.images, null);
      if (!f.body && !images.length) return json({ error: "write something first" }, 400);
      const row = { id: newId(), title: f.title, body: f.body, name: f.name, owner: 1, images, created: Date.now() };
      const stmts = [
        env.DB.prepare("INSERT INTO thoughts (id, title, body, name, owner, ip_hash, created, images) VALUES (?, ?, ?, ?, 1, 'owner', ?, ?)")
          .bind(row.id, row.title, row.body, row.name, row.created, images.length ? JSON.stringify(images) : null),
      ];
      if (images.length) {
        stmts.push(env.DB.prepare(`UPDATE images SET thought_id = ? WHERE id IN (${images.map(() => "?").join(",")})`).bind(row.id, ...images));
      }
      await env.DB.batch(stmts);
      return json({ thought: row }, 201);
    }

    /* Edit a note in place. A field that is absent keeps its value, so the board can save just a
       body; `images` is the note's whole list, and an image dropped from it is deleted with it. */
    if (route === "thoughts" && req.method === "PUT" && id) {
      if (!ownerHeader()) return json({ error: "no" }, 403);
      let data;
      try { data = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const cur = await env.DB.prepare("SELECT id, title, body, name, owner, images, created FROM thoughts WHERE id = ?").bind(id).first();
      if (!cur) return json({ error: "not found" }, 404);
      const f = fields(data, env);
      const row = withImages(cur);
      if ("title" in data) row.title = f.title;
      if ("name" in data) row.name = f.name;
      if ("body" in data) row.body = f.body;
      let dropped = [];
      if ("images" in data) {
        const next = await keepImages(env, f.images, id);
        dropped = row.images.filter((i) => !next.includes(i));
        row.images = next;
      }
      if (!row.body && !row.images.length) return json({ error: "write something first" }, 400);
      const stmts = [
        env.DB.prepare("UPDATE thoughts SET title = ?, body = ?, name = ?, images = ? WHERE id = ?")
          .bind(row.title, row.body, row.name, row.images.length ? JSON.stringify(row.images) : null, id),
      ];
      if (row.images.length) {
        stmts.push(env.DB.prepare(`UPDATE images SET thought_id = ? WHERE id IN (${row.images.map(() => "?").join(",")})`).bind(id, ...row.images));
      }
      if (dropped.length) {
        stmts.push(env.DB.prepare(`DELETE FROM images WHERE id IN (${dropped.map(() => "?").join(",")})`).bind(...dropped));
      }
      await env.DB.batch(stmts);
      return json({ thought: row });
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
      // the board keeps every note whole and inside itself (main.js clamps the drag), so x starts at 0
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

// title and name are squeezed and capped; the body keeps its shape and has no cap
function fields(data, env) {
  return {
    body: String(data.body || "").replace(/\r\n?/g, "\n").trim(),
    title: String(data.title || "").replace(/\s+/g, " ").trim().slice(0, Number(env.MAX_TITLE) || 80) || null,
    name: String(data.name || "").trim().slice(0, Number(env.MAX_NAME) || 40) || null,
    images: Array.isArray(data.images) ? data.images.filter((v) => typeof v === "string" && /^[a-z0-9]+$/.test(v)).slice(0, MAX_IMAGES) : [],
  };
}

// keep only ids that were really uploaded and are still free (or already on this note)
async function keepImages(env, ids, thoughtId) {
  if (!ids.length) return [];
  const q = `SELECT id FROM images WHERE id IN (${ids.map(() => "?").join(",")}) AND (thought_id IS NULL${thoughtId ? " OR thought_id = ?" : ""})`;
  const { results } = await env.DB.prepare(q).bind(...ids, ...(thoughtId ? [thoughtId] : [])).all();
  const ok = new Set(results.map((r) => r.id));
  return ids.filter((i) => ok.has(i));
}

function withImages(row) {
  let images = [];
  try { images = row.images ? JSON.parse(row.images) : []; } catch {}
  return { ...row, images };
}



function newId() {
  // time-sortable, URL-safe: base36 time + 8 random chars
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  return Date.now().toString(36) + [...rnd].map((b) => (b % 36).toString(36)).join("");
}
