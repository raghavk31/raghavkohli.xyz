/* The thoughts API. Anyone can read and post; nobody logs in.
   GET    /thoughts?before=<ms>&limit=<n>   the newest posts (id, body, name, owner, created)
   POST   /thoughts  {body, name?, turnstile?, key?}   a new post; `key` = OWNER_KEY marks it as Raghav's
   DELETE /thoughts/<id>   with header X-Owner-Key: OWNER_KEY
   Guards, all without login: a Turnstile token when TURNSTILE_SECRET is set, RATE_PER_HOUR posts per
   IP (IPs are stored only as a salted hash), MAX_BODY / MAX_NAME lengths. */

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Owner-Key",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const m = url.pathname.match(/^\/thoughts(?:\/([A-Za-z0-9_-]+))?\/?$/);
    if (!m) return json({ error: "not found" }, 404);
    const id = m[1];

    if (req.method === "GET" && !id) {
      const before = Number(url.searchParams.get("before")) || Date.now() + 1;
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100);
      const { results } = await env.DB.prepare(
        "SELECT id, body, name, owner, created FROM thoughts WHERE created < ? ORDER BY created DESC LIMIT ?"
      ).bind(before, limit).all();
      return json({ thoughts: results });
    }

    if (req.method === "POST" && !id) {
      let data;
      try { data = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const body = String(data.body || "").replace(/\r\n?/g, "\n").trim();
      const name = String(data.name || "").trim().slice(0, Number(env.MAX_NAME) || 40);
      if (!body) return json({ error: "write something first" }, 400);
      if (body.length > (Number(env.MAX_BODY) || 2000)) return json({ error: "too long" }, 400);
      const owner = !!env.OWNER_KEY && data.key === env.OWNER_KEY;
      const ip = req.headers.get("CF-Connecting-IP") || "0.0.0.0";
      if (!owner) {
        // the bot check, when the secret is configured
        if (env.TURNSTILE_SECRET) {
          const ok = await verifyTurnstile(env.TURNSTILE_SECRET, data.turnstile, ip);
          if (!ok) return json({ error: "could not verify you are a person; try again" }, 403);
        }
        // the rate limit: RATE_PER_HOUR posts per IP, IPs as salted hashes only
        const ipHash = await sha256(`${env.IP_SALT || ""}:${ip}`);
        const { count } = await env.DB.prepare("SELECT COUNT(*) AS count FROM thoughts WHERE ip_hash = ? AND created > ?")
          .bind(ipHash, Date.now() - 3600_000).first();
        if (count >= (Number(env.RATE_PER_HOUR) || 3)) return json({ error: "that is enough for one hour; come back later" }, 429);
        const row = { id: newId(), body, name: name || null, owner: 0, created: Date.now() };
        await env.DB.prepare("INSERT INTO thoughts (id, body, name, owner, ip_hash, created) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(row.id, row.body, row.name, 0, ipHash, row.created).run();
        return json({ thought: row }, 201);
      }
      const row = { id: newId(), body, name: name || null, owner: 1, created: Date.now() };
      await env.DB.prepare("INSERT INTO thoughts (id, body, name, owner, ip_hash, created) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(row.id, row.body, row.name, 1, "owner", row.created).run();
      return json({ thought: row }, 201);
    }

    if (req.method === "DELETE" && id) {
      if (!env.OWNER_KEY || req.headers.get("X-Owner-Key") !== env.OWNER_KEY) return json({ error: "no" }, 403);
      const r = await env.DB.prepare("DELETE FROM thoughts WHERE id = ?").bind(id).run();
      return json({ deleted: r.meta.changes > 0 });
    }

    return json({ error: "method not allowed" }, 405);
  },
};

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
