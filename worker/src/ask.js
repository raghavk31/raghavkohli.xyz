/* ask.js — POST /ask for the (graph) view of /thoughts/: a question put to the journal, answered from
   the notes alone by Claude (through OpenRouter, the model in model.js), with the notes it drew on.
   Open to anyone since 2026-10-21 (it was owner-only); visitors get PER_HOUR questions an hour, the
   owner key none of that limit. The page sends {question} and nothing else; the notes come from D1 here.
   Plan: docs/plans/2026-10-21-thoughts-graph.md §5 (eng D2, D3). */
import { MODEL } from "./model.js";

const MAX_Q = 500;
const PER_HOUR = 10;                          // questions per visitor per hour, per worker isolate

const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (h.length >= PER_HOUR) return true;
  h.push(now); hits.set(ip, h);
  return false;
}

export async function ask(request, env, cors, owner) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json", "Cache-Control": "no-store" } });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply({ error: "POST only" }, 405);
  if (!owner && limited(request.headers.get("cf-connecting-ip") || "?")) return reply({ error: "too many questions this hour; try again later" }, 429);
  if (!env.OPENROUTER_API_KEY) return reply({ error: "asking is not switched on yet" }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ error: "bad request" }, 400); }
  const question = String(body && body.question || "").replace(/[<>`]/g, "").trim().slice(0, MAX_Q);
  if (!question) return reply({ error: "ask something first" }, 400);

  const { results } = await env.DB.prepare("SELECT id, title, body FROM thoughts ORDER BY created DESC").all();
  const written = results.filter((t) => /[\p{L}\p{N}]/u.test(String(t.body || "")));
  const notes = written.map((t) => `<note id="${t.id}">\n<title>${t.title || ""}</title>\n${t.body}\n</note>`).join("\n\n");
  const prompt = `These are the notes of one person's journal. Answer their question from these notes only.

${notes}

Question: ${question}

Answer in 2 to 5 plain sentences, speaking to them as "you" ("you wrote that…"). Say only what the notes support; if they don't speak to it, say so in one sentence. Then list the ids of the notes you drew on.
Reply with JSON only, no code fence: {"answer":"…","cites":["<note id>"]}`;

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json",
      "HTTP-Referer": "https://raghavkohli.xyz/thoughts/", "X-Title": "Idea file" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: 800, temperature: 0.3 }),
  });
  if (!r.ok) return reply({ error: `the model did not answer (${r.status})` }, 502);
  const d = await r.json();
  const text = d?.choices?.[0]?.message?.content || "";
  let out;
  try {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    out = JSON.parse(a >= 0 && b > a ? text.slice(a, b + 1) : text);
  } catch (e) { return reply({ error: "the answer was not readable; try again" }, 502); }
  const ids = new Set(written.map((t) => t.id));
  const cites = [...new Set(Array.isArray(out.cites) ? out.cites : [])].filter((id) => ids.has(id)).slice(0, 12);
  return reply({ answer: String(out.answer || "").trim().slice(0, 2000), cites });
}
