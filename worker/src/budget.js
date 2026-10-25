/* budget.js: what a public route may spend of the OpenRouter key, counted in D1 so the limits hold
   across worker isolates (an in-memory Map only counts what one isolate saw).
   Two counters per route: one per visitor per hour (the IP, hashed with the day so the table never
   holds an address), and one for the whole route per UTC day. Rows older than yesterday are swept now
   and then. Table: migrations/0005-ai-usage.sql. If D1 cannot count, the route stays shut. */

const day = (t) => new Date(t).toISOString().slice(0, 10);

async function bump(db, k, d) {
  const row = await db.prepare("INSERT INTO ai_usage (k, day, n) VALUES (?, ?, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n")
    .bind(k, d).first();
  return row.n;
}

async function hashed(ip, d) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${d}|${ip}`));
  return [...new Uint8Array(b).slice(0, 8)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// null when the call may go ahead; otherwise the reason it may not
export async function spend(env, route, ip, { perHour, perDay, what = "notes" }) {
  const now = Date.now(), d = day(now);
  try {
    if (Math.random() < 0.02) await env.DB.prepare("DELETE FROM ai_usage WHERE day < ?").bind(day(now - 864e5)).run();
    const hour = Math.floor(now / 3600e3);
    if (await bump(env.DB, `${route}:ip:${await hashed(ip, d)}:${hour}`, d) > perHour) return `too many ${what} this hour; try again later`;
    if (await bump(env.DB, `${route}:day:${d}`, d) > perDay) return `the ${what} are resting for today; try again tomorrow`;
    return null;
  } catch (e) {
    return `the ${what} are paused`;
  }
}
