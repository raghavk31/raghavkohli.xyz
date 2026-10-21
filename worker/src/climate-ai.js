/* climate-ai.js — POST /climate/ai for Climate Code (/work/climate-code/): the AI notes of the
   Resilience Stack, written by Claude through OpenRouter with the key this worker holds.

   Wired into index.js 2026-10-13. To turn it on:
     1. (done) in the worker's fetch handler, before its 404:
          import { climateAI } from "./climate-ai.js";
          if (url.pathname === "/climate/ai") return climateAI(request, env, corsHeaders);
        (corsHeaders = whatever headers the other routes already answer with; OPTIONS must answer too)
     2. npx wrangler secret put OPENROUTER_API_KEY      (run it yourself; the key never goes in a file)
     3. deploy as usual.

   The page never sends a prompt. It sends {tool, input}; each tool below takes only the fields it
   needs, clamps numbers, cuts strings, and builds the prompt here from the day's own template, so the
   endpoint cannot be used as a general way to spend the key. Prompts are copied from the days'
   Python (day01_heat_risk, day16_heat_mapper, day13_crop_advisor, day14_offgrid_calc,
   day15_water_security, day12_emergency_prep); change them there and here together. */

import { MODEL } from "./model.js";              // the model the days use (shared with /ask and the compile)
const PER_HOUR = 20;                          // AI notes per visitor per hour, per worker isolate

const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (h.length >= PER_HOUR) return true;
  h.push(now); hits.set(ip, h);
  return false;
}

/* input cleaning: every value the prompt sees passes through one of these */
const str = (v, n = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/[{}<>`]/g, "").slice(0, n).trim();
const num = (v, lo, hi, d = 1) => { const x = Number(v); return Number.isFinite(x) ? Math.round(Math.min(hi, Math.max(lo, x)) * 10 ** d) / 10 ** d : lo; };
const int = (v, lo, hi) => num(v, lo, hi, 0);
const strs = (a, k, n = 60) => (Array.isArray(a) ? a : []).slice(0, k).map((x) => str(x, n)).filter(Boolean);
const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
const usd = (n) => "$" + Math.round(n).toLocaleString("en-US");

const RISKS = ["Flooding / flash floods", "Wildfire", "Extreme heat", "Hurricane / cyclone / typhoon", "Earthquake",
  "Winter storm / blizzard", "Tornado", "Drought / water shortage", "Power grid failure", "Coastal storm surge"];
const SPECIAL = ["Pets", "Infants or young children", "Elderly household members", "Medical equipment (CPAP, oxygen, dialysis, etc.)",
  "Mobility limitations", "Dietary restrictions / food allergies", "Non-English speaking household"];
const BUDGETS = ["Under $50", "$50–150", "$150–350", "$350–750", "$750+"];
const HOUSING = ["Apartment / flat", "House with garden", "Rural / farm", "Vehicle or boat"];
const GW = ["None", "Simple diversion → garden", "Treated recycling → toilet + garden"];

const TOOLS = {
  /* Day 01 — Heat Risk Communicator */
  "heat-brief": { tokens: 600, json: false, prompt(i) {
    const place = str(i.place), risk = oneOf(str(i.risk, 12), ["LOW", "MODERATE", "HIGH", "VERY HIGH", "EXTREME"], "LOW");
    const days = (Array.isArray(i.days) ? i.days : []).slice(0, 7).map((d) =>
      `  ${str(d.date, 10)}: ${Math.round(num(d.tmax, -60, 60))}°C max (feels like ${Math.round(num(d.feels, -60, 70))}°C), rain ${Math.round(num(d.rain, 0, 500))}mm`).join("\n");
    return `You are a climate health communicator helping residents of Indian cities understand heat risk in plain language.

LOCATION: ${place}
HEAT RISK THIS WEEK: ${risk}

FORECAST (next 7 days):
${days}

Write a heat risk brief for residents. Structure it exactly like this:

HEAT RISK: ${risk}

[2–3 sentences explaining what this heat actually feels like and what it means day-to-day. No jargon. Concrete.]

WHO IS MOST AT RISK:
[2–3 sentences. Name specific groups likely present in this neighbourhood — outdoor workers, construction labour, the elderly, children, people without AC. Explain why heat hits them harder.]

WHAT YOU CAN DO THIS WEEK:
1. [Specific, actionable. Time of day matters. e.g. "Don't go outside between 11am–4pm"]
2. [Specific, actionable. Something about hydration, shelter, or helping a neighbour]
3. [Specific, actionable. One thing that costs nothing]

Keep the tone warm and direct. This is for real people making daily decisions.`;
  } },

  /* Day 16 — Urban Heat Relief Mapper, get_cool_route() */
  "cool-route": { tokens: 220, json: false, prompt(i) {
    const parks = strs(i.parks, 25).join(", ").slice(0, 400) || "none named";
    const water = strs(i.water, 10).join(", ").slice(0, 200) || "none named";
    const h = i.heat && typeof i.heat === "object" ? i.heat : null;
    const heatLine = h ? `This area sees about ${int(h.danger_per_year, 0, 366)} dangerous-heat days a year (feels-like ≥ 35 °C; peak felt ${int(h.peak_feels_like, -50, 70)} °C).`
      : "Heat data unavailable for this area.";
    return `You are a streetwise local helping someone beat the heat in ${str(i.place)}.

${heatLine}

Within ~2.5 km of them right now:
- Parks / green space: ${parks}
- Water bodies: ${water}
- Public water taps / fountains: ${int(i.taps, 0, 10000)}
- Community-marked cool spots:
No community spots marked here yet.

Write 4–5 short lines, like a friend texting. Name the single best place to head
to right now and the best time of day to go. Give one free thing they can do
immediately. Be specific to what actually exists near them — no generic advice,
no bullet points.`;
  } },

  /* Day 13 — Crop Climate Advisor, build_advice_prompt() */
  "crop-advice": { tokens: 1800, json: true, prompt(i) {
    const k = (x) => ({ t: num(x?.mean_temp, -40, 50), p: Math.round(num(x?.annual_precip, 0, 15000)), f: Math.round(num(x?.frost_days, 0, 366)), h: Math.round(num(x?.heat_stress_days, 0, 366)) });
    const c = k(i.current), p = k(i.p2040), place = str(i.place);
    const crops = (a, n) => (Array.isArray(a) ? a : []).slice(0, n).map((x) => `${str(x.name, 40)} (${int(x.now, 0, 100)}→${int(x.y40, 0, 100)} by 2040)`).join(", ") || "none";
    return `You are an expert agricultural advisor for smallholder farmers adapting to climate change.

LOCATION: ${place}
CURRENT CLIMATE: Mean ${c.t}°C, Rain ${c.p}mm/yr, Frost ${c.f} days/yr, Heat stress ${c.h} days/yr
2040 PROJECTION: Mean ${p.t}°C (+${(p.t - c.t).toFixed(1)}°C), Rain ${p.p}mm/yr, Heat ${p.h} days/yr
BEST CROPS NOW: ${crops(i.top, 5)}
CROPS DECLINING BY 2040: ${crops(i.declining, 3)}

Return ONLY valid JSON, no prose, no markdown fences, exactly this schema:
{
  "grow_now": [
    {
      "emoji":"🌾","name":"Sorghum",
      "why":"Matches your heat + low-rainfall profile exactly",
      "tip":"Plant at start of rains in May. Space 60cm apart. Intercrop with cowpeas.",
      "window":"May–August"
    }
  ],
  "adapt_2035": {
    "varieties": ["Switch to heat-tolerant Sorghum SC403 — 20% better yield above 32°C"],
    "introduce": ["Add Cowpeas as second crop — fixes nitrogen + handles heat stress days"]
  },
  "by_2040": {
    "losing": ["Coffee (Arabica) — heat stress days will exceed 10/yr tolerance by 2038"],
    "gaining": ["Pearl Millet — 2040 projections fall squarely in its optimal range"]
  },
  "actions": [
    {
      "icon":"🌱","title":"Diversity trial this season",
      "when":"This planting season",
      "steps":["Select 2 new heat-tolerant varieties from your list","Plant 1 row each alongside existing crops","Record germination and first-harvest yields for comparison"],
      "time":"3 hours","cost":"$8–15"
    }
  ]
}

grow_now: exactly 3 crops. adapt_2035.varieties: 2–3 items. adapt_2035.introduce: 2–3 items.
by_2040.losing: 2–3 items. by_2040.gaining: 2–3 items. actions: exactly 3 items.
Be specific to ${place} and this climate profile. Write for a smallholder with limited resources.`;
  } },

  /* Day 14 — Off-Grid Independence Calculator, build_roadmap_prompt() */
  "offgrid-roadmap": { tokens: 1800, json: true, prompt(i) {
    const s = i.solar || {}, b = i.battery || {}, w = i.water || {}, f = i.food || {}, place = str(i.place);
    const score = int(i.score, 0, 100);
    const total = num(s.cost, 0, 1e6, 0) + num(b.cost, 0, 1e6, 0) + num(w.cost, 0, 1e6, 0) + num(f.cost, 0, 1e6, 0);
    return `You are an off-grid systems expert. Return ONLY valid JSON (no markdown fences, no commentary) matching the schema below.

LOCATION: ${place}
HOUSEHOLD: ${int(i.people, 1, 50)} people, ${int(i.monthly_kwh, 1, 20000)} kWh/month
SOLAR: ${int(s.required_wp, 0, 1e6)}W · ${num(s.annual_ghi, 0, 10, 2)} kWh/m²/day · ${int(s.self_suff_pct, 0, 100)}% self-sufficient · ${usd(num(s.cost, 0, 1e6, 0))}
BATTERY: ${num(b.capacity_kwh, 0, 1e4)} kWh · ${int(b.autonomy_days, 1, 14)}d autonomy · ${usd(num(b.cost, 0, 1e6, 0))}
WATER: ${int(w.coverage_pct, 0, 100)}% coverage · ${int(w.tank_liters, 0, 1e7).toLocaleString("en-US")}L tank · ${int(w.annual_rain_mm, 0, 15000)}mm/yr · ${usd(num(w.cost, 0, 1e6, 0))}
FOOD: ${int(f.coverage_pct, 0, 100)}% caloric coverage · ${int(f.land_area, 0, 1e6)}m² · ${int(f.grow_months, 0, 12)} grow months · ${usd(num(f.cost, 0, 1e6, 0))}
CURRENT SCORE: ${score}/100  |  TOTAL COST: ${usd(total)}  |  BUDGET: ${usd(num(i.budget, 0, 1e7, 0))}

JSON schema (fill every field):
{
  "one_liner": "<one bold sentence about this household's independence path>",
  "phase1": {
    "title": "Quick Wins",
    "timeframe": "0–6 months",
    "budget": <integer USD>,
    "highlight": "<one sentence: what this phase achieves>",
    "score_after": <integer 0-100, must be > ${score}>,
    "actions": [
      {"icon": "<single emoji>", "title": "<short action>", "detail": "<specific product model or spec>", "cost": <integer USD>}
    ]
  },
  "phase2": {
    "title": "Core System",
    "timeframe": "6–18 months",
    "budget": <integer USD>,
    "highlight": "<one sentence>",
    "score_after": <integer 0-100, must be > phase1 score_after>,
    "actions": [...]
  },
  "phase3": {
    "title": "Full Independence",
    "timeframe": "18–36 months",
    "budget": <integer USD>,
    "highlight": "<one sentence>",
    "score_after": <integer 0-100, must be > phase2 score_after>,
    "actions": [...]
  },
  "risks": [
    {"icon": "<emoji>", "risk": "<short risk title>", "mitigation": "<practical fix>", "severity": "high|medium|low"}
  ],
  "products": [
    {"category": "Solar|Battery|Water|Food", "icon": "<emoji>", "name": "<product name>", "why": "<1-sentence reason specific to ${place}>"}
  ]
}

Rules: max 4 actions per phase · exactly 3–4 risks · exactly 4 products (one per category: Solar, Battery, Water, Food) · scores must increase each phase · be specific to ${place} climate. Return ONLY the JSON object.`;
  } },

  /* Day 15 — Water Security Planner, build_roadmap_prompt() */
  "water-roadmap": { tokens: 1800, json: true, prompt(i) {
    const place = str(i.place), cov = int(i.coverage_pct, 0, 100);
    return `You are a water-resilience engineer. Return ONLY valid JSON (no markdown fences, no commentary) matching the schema below.

LOCATION: ${place}
HOUSEHOLD: ${int(i.people, 1, 50)} people · ${int(i.per_capita, 10, 1000)} L/person/day · ${int(i.total_daily, 0, 1e6)} L/day total demand
RAINFALL: ${int(i.annual_rain_mm, 0, 15000)} mm/yr · roof ${int(i.roof_area, 0, 1e5)} m² (runoff ${num(i.runoff, 0, 1, 2)}) · ${int(i.annual_coll, 0, 1e9).toLocaleString("en-US")} L collectable/yr
GREYWATER: ${oneOf(i.gw_system, GW, "None")} · ${int(i.grey_usable, 0, 1e6)} L/day reusable
RESULT: ${cov}% of demand covered (${int(i.rain_pct, 0, 100)}% rain + ${int(i.grey_pct, 0, 100)}% greywater) · tank ${int(i.tank_liters, 0, 1e8).toLocaleString("en-US")} L · ${int(i.deficit_months, 0, 12)} dry months
SECURITY SCORE: ${int(i.score, 0, 100)}/100  |  SYSTEM COST: ${usd(num(i.cost, 0, 1e7, 0))}

JSON schema (fill every field):
{
  "one_liner": "<one bold sentence about this household's path to water security>",
  "phase1": {
    "title": "Quick Wins",
    "timeframe": "0–3 months",
    "budget": <integer USD>,
    "highlight": "<one sentence: what this phase achieves>",
    "coverage_after": <integer 0-100, must be > ${cov}>,
    "actions": [
      {"icon": "<single emoji>", "title": "<short action>", "detail": "<specific spec or product>", "cost": <integer USD>}
    ]
  },
  "phase2": {
    "title": "Core System",
    "timeframe": "3–12 months",
    "budget": <integer USD>,
    "highlight": "<one sentence>",
    "coverage_after": <integer 0-100, must be > phase1 coverage_after>,
    "actions": [...]
  },
  "phase3": {
    "title": "Full Water Security",
    "timeframe": "12–24 months",
    "budget": <integer USD>,
    "highlight": "<one sentence>",
    "coverage_after": <integer 0-100, must be > phase2 coverage_after>,
    "actions": [...]
  },
  "tips": [
    {"icon": "<emoji>", "tip": "<short conservation action>", "saving": "<estimated litres/day or % saved>"}
  ],
  "products": [
    {"category": "Collection|Storage|Filtration|Greywater", "icon": "<emoji>", "name": "<product name>", "why": "<1-sentence reason specific to ${place}>"}
  ]
}

Rules: max 4 actions per phase · exactly 3–4 conservation tips · exactly 4 products (one per category: Collection, Storage, Filtration, Greywater) · coverage must increase each phase · be specific to ${place} rainfall pattern. Return ONLY the JSON object.`;
  } },

  /* Day 12 — Emergency Preparedness Generator, build_prompt() (Day 11's gaps arrive in `gaps`) */
  "emergency-plan": { tokens: 4000, json: true, prompt(i) {
    const city = str(i.city), adults = int(i.adults, 1, 20), children = int(i.children, 0, 20);
    let household = `${adults} adult${adults !== 1 ? "s" : ""}`;
    if (children) household += ` + ${children} child${children !== 1 ? "ren" : ""}`;
    const special = (Array.isArray(i.special) ? i.special : []).filter((x) => SPECIAL.includes(x));
    const risks = (Array.isArray(i.risks) ? i.risks : []).filter((x) => RISKS.includes(x));
    const gaps = strs(String(i.gaps || "").split(","), 3, 20).join(", ");
    return `You are a senior emergency preparedness advisor.
Household: ${household} in ${city}. Housing: ${oneOf(i.housing, HOUSING, HOUSING[0])}. Budget: ${oneOf(i.budget, BUDGETS, BUDGETS[1])}. Special needs: ${special.join(", ") || "none"}. Risks: ${risks.join(", ") || "general emergencies"}.${gaps ? `\nPrioritise closing these weak areas: ${gaps}.` : ""}

Return ONLY valid JSON, no prose, no markdown fences, exactly this schema:
{
  "kit": [
    {"icon":"🔦","name":"Flashlight","qty":"2 units","note":"LED, 100hr battery life","priority":"critical"}
  ],
  "water": {
    "total_litres": 36,
    "containers": ["6× 6-litre bottles — $18 at Walmart"],
    "backup": ["Fill bathtub before storm (80L)", "Nearest creek: 1.2km north"],
    "purify": ["Boil 1 min", "Iodine tablets × 50", "Lifestraw filter"]
  },
  "food": [
    {"icon":"🥫","name":"Canned chickpeas","qty":"14 cans","note":"protein + fibre, 5yr shelf life"}
  ],
  "food_notes": "Rotate annually. Keep in cool dark place below 20°C. Open oldest first.",
  "meds": ["Paracetamol 500mg × 48 tabs", "Sterile bandages × 10", "Antiseptic wipes × 20"],
  "comms": {
    "call_order": ["999 / 911 (local emergency)", "Out-of-area contact: family member in different city"],
    "meet_near": "Corner of Main St & Park Ave — the red post office, 3 min walk",
    "meet_far": "City library car park, 8km inland, 45 High Street",
    "offline": ["Battery-powered AM/FM radio", "Written note under doormat with destination", "3 whistle blasts = help needed"]
  },
  "evac": {
    "go_when": ["Mandatory evacuation order issued", "Wildfire smoke visible from home", "Water level at doorstep"],
    "stay_when": ["Power outage only", "Heavy rain but no flooding risk", "Advisory (not mandatory) warning"],
    "bag_90s": ["Passport/ID", "Phone + charger", "Cash $200", "3-day medication"],
    "bag_5m": ["72hr kit bag", "Laptop + hard drive", "Pet carrier + food"],
    "bag_15m": ["Sleeping bags × 2", "3 days clothing", "Children school records"],
    "routes": ["Primary: Highway 1 North → Exit 42 → Red Cross shelter (12km)", "Backup: River Road East → County fairgrounds (9km, avoids highway)"]
  },
  "budget": [
    {"priority":1,"name":"Water storage (6× 6L bottles)","qty":"6 units","cost":"$18","where":"Walmart / dollar store"}
  ],
  "budget_total": "$145",
  "actions": [
    {
      "icon":"💧",
      "title":"Build your water cache",
      "when":"This weekend",
      "steps":["Buy 6× 6L bottles at Walmart ($18)","Fill and store under sink or in closet","Label with today's date — replace in 12 months"],
      "time":"45 minutes",
      "cost":"$18"
    }
  ]
}

Rules: kit ≥ 12 items. food ≥ 8 items. budget ≥ 8 items ordered by priority. Exactly 3 actions covering different days (Day 1–2, Day 3–5, Day 6–7). Be specific to ${city} — real local numbers, known hazards.`;
  } },
};

/* the days' own fence-stripping before JSON.parse */
function parseJSON(text) {
  let t = text.trim();
  if (t.startsWith("```")) t = t.split("\n").filter((l) => !l.trim().startsWith("```")).join("\n");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? t.slice(a, b + 1) : t);
}

export async function climateAI(request, env, cors = {}) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply({ error: "POST only" }, 405);
  if (!env.OPENROUTER_API_KEY) return reply({ error: "the AI notes are not switched on yet" }, 503);
  if (limited(request.headers.get("cf-connecting-ip") || "?")) return reply({ error: "too many notes this hour; try again later" }, 429);
  let body;
  try { body = await request.json(); } catch (e) { return reply({ error: "bad request" }, 400); }
  const tool = TOOLS[body && body.tool];
  if (!tool || typeof body.input !== "object" || body.input === null) return reply({ error: "unknown tool" }, 400);

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json",
      "HTTP-Referer": "https://raghavkohli.xyz/work/climate-code/", "X-Title": "Climate Code" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: tool.prompt(body.input) }],
      max_tokens: tool.tokens, temperature: tool.json ? .3 : .7 }),
  });
  if (!r.ok) return reply({ error: `the model did not answer (${r.status})` }, 502);
  const d = await r.json();
  const text = d?.choices?.[0]?.message?.content || "";
  if (!tool.json) return reply({ text: text.trim() });
  try { return reply({ data: parseJSON(text) }); } catch (e) { return reply({ error: "the model's answer was not readable; try again" }, 502); }
}
