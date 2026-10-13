/* home.js — chapter 17, the household: Day 11's resilience audit, whose weakest areas become the brief for
   Day 12's emergency plan (in the apps a file passed them across; here they pass in the page). The
   questions, their scores and the actions are Day 11's own SECTIONS, read out of the day's file. */
import { fmt, esc, lc, stat, bars, note, pills } from "./ui.js";

const BUDGETS = ["Under $50", "$50–150", "$150–350", "$350–750", "$750+"];   // Day 12's radio
const HOUSING = ["Apartment / flat", "House with garden", "Rural / farm", "Vehicle or boat"];

export async function renderHome(el, ctx) {
  const T = ctx.T.d11, P = ctx.T.d12;
  // Day 11 _default_answers(): the middle option of every question
  const answers = {};
  T.SECTIONS.forEach((s) => s.questions.forEach((q) => { answers[q.key] = Math.floor(q.options.length / 2); }));
  const vuln = () => Object.fromEntries(T.SECTIONS.map((s) => [s.name,
    s.questions.reduce((t, q) => t + q.options[answers[q.key]][1], 0) / s.questions.length]));
  const resilience = (v) => Math.max(0, Math.min(100, Math.round((100 - T.SECTIONS.reduce((t, s) => t + v[s.name] * s.weight, 0)) * 10) / 10));
  const band = (r) => lc((T.RESILIENCE_BANDS.find((b) => r >= b[0] && r <= b[1]) || [0, 0, ""])[2]);
  const level = (v) => (v >= 60 ? "critical" : v >= 35 ? "moderate" : "good");

  el.innerHTML = `<form class="cc-audit" data-audit>${T.SECTIONS.map((s) => `
      <fieldset><legend>(${esc(lc(s.name))}) <span>${esc(lc(s.desc))}</span></legend>
      ${s.questions.map((q) => `<p class="cc-audit__q">${esc(q.text)}</p><div class="cc-audit__opts">${q.options.map((o, i) => `
        <label><input type="radio" name="${q.key}" value="${i}"${i === answers[q.key] ? " checked" : ""} /> ${esc(o[0])}</label>`).join("")}</div>`).join("")}
      </fieldset>`).join("")}</form>
    <div class="cc-audit__out" data-out aria-live="polite"></div>
    <div class="cc-plan" data-plan></div>`;
  const out = el.querySelector("[data-out]"), plan = el.querySelector("[data-plan]");

  const heat = await ctx.placeHeat().catch(() => null);
  const risks = new Set(heat >= 20 ? ["Extreme heat"] : []);
  const special = new Set();
  const form = { adults: 2, children: 0, budget: BUDGETS[1], housing: HOUSING[0] };

  function gaps() {
    const v = vuln();
    return T.SECTIONS.slice().sort((a, b) => v[b.name] - v[a.name]).filter((s) => v[s.name] >= 35).slice(0, 3).map((s) => s.name);
  }
  function drawScore() {
    const v = vuln(), r = resilience(v);
    const weakest = T.SECTIONS.slice().sort((a, b) => v[b.name] - v[a.name]).slice(0, 2);
    out.innerHTML = stat(fmt(r), `household resilience, of 100 · ${band(r)}`)
      + bars(T.SECTIONS.map((s) => [lc(s.name), 100 - v[s.name]]))
      + weakest.map((s) => `<p class="cc-sub">start with ${esc(lc(s.name))} · ${level(v[s.name])}</p><ul class="cc-list">${
          s.actions[level(v[s.name])].map((a) => `<li>${esc(a[0])} <span>· ${esc(a[1])} · ${esc(lc(a[2]))}</span></li>`).join("")}</ul>`).join("");
    const head = plan.querySelector("[data-gaps]");
    if (head) head.textContent = brief();
  }
  const brief = () => { const g = gaps(); return `an emergency plan for ${ctx.placeName()}${g.length ? `, closing ${g.map(lc).join(", ")}` : ""}`; };
  function drawPlanForm() {
    plan.innerHTML = `<p class="cc-sub" data-gaps>${esc(brief())}</p>
      <div class="cc-form">
        <label>(adults) <input type="number" min="1" max="20" value="${form.adults}" data-f="adults" /></label>
        <label>(children) <input type="number" min="0" max="20" value="${form.children}" data-f="children" /></label>
        <label>(home) <select data-f="housing">${HOUSING.map((h) => `<option${h === form.housing ? " selected" : ""}>${esc(h)}</option>`).join("")}</select></label>
      </div>
      <p class="cc-sub">budget</p>${pills(BUDGETS.map((b) => [b, b]), form.budget, "data-budget")}
      <p class="cc-sub">risks here</p><div class="cc-checks">${P.RISK_OPTIONS.map((r) => `<label><input type="checkbox" data-risk value="${esc(r)}"${risks.has(r) ? " checked" : ""} /> ${esc(lc(r))}</label>`).join("")}</div>
      <p class="cc-sub">in the household</p><div class="cc-checks">${P.SPECIAL_OPTIONS.map((r) => `<label><input type="checkbox" data-special value="${esc(r)}"${special.has(r) ? " checked" : ""} /> ${esc(lc(r))}</label>`).join("")}</div>
      <div class="cc-ai"><button type="button" class="cc-ai__go" data-go>(write my emergency plan ↗)</button><div class="cc-ai__out" data-res aria-live="polite"></div></div>`;
    plan.querySelectorAll("[data-f]").forEach((i) => i.addEventListener("input", () => { form[i.dataset.f] = i.type === "number" ? +i.value : i.value; }));
    plan.querySelectorAll("[data-budget]").forEach((b) => b.addEventListener("click", () => {
      form.budget = b.dataset.budget; plan.querySelectorAll("[data-budget]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    }));
    plan.querySelectorAll("[data-risk]").forEach((c) => c.addEventListener("change", () => (c.checked ? risks.add(c.value) : risks.delete(c.value))));
    plan.querySelectorAll("[data-special]").forEach((c) => c.addEventListener("change", () => (c.checked ? special.add(c.value) : special.delete(c.value))));
    const go = plan.querySelector("[data-go]"), res = plan.querySelector("[data-res]");
    go.addEventListener("click", async () => {
      go.disabled = true; res.innerHTML = note("(writing … this takes up to a minute)");
      try {
        const r = await ctx.ai("emergency-plan", { city: ctx.placeName(), adults: form.adults, children: form.children, budget: form.budget,
          housing: form.housing, risks: [...risks], special: [...special], gaps: gaps().join(", ") });
        res.innerHTML = showPlan(r.data || {});
      } catch (e) { res.innerHTML = note(`(the AI note is not available right now: ${esc(e.message)})`); }
      finally { go.disabled = false; }
    });
  }
  el.querySelector("[data-audit]").addEventListener("change", (e) => {
    if (e.target.name in answers) { answers[e.target.name] = +e.target.value; drawScore(); }
  });
  drawPlanForm();
  drawScore();
}

const li = (xs, f) => (xs && xs.length ? `<ul class="cc-list">${xs.map((x) => `<li>${f(x)}</li>`).join("")}</ul>` : "");
const t = (x) => esc(x);
function showPlan(d) {
  return `<p class="cc-sub">the kit</p>` + li(d.kit, (k) => `${t(k.name)} <span>· ${t(k.qty)} · ${t(k.note)}</span>`)
    + `<p class="cc-sub">water · ${t(d.water?.total_litres)} litres</p>` + li([...(d.water?.containers || []), ...(d.water?.backup || []), ...(d.water?.purify || [])], t)
    + `<p class="cc-sub">food</p>` + li(d.food, (k) => `${t(k.name)} <span>· ${t(k.qty)}</span>`) + (d.food_notes ? `<p>${t(d.food_notes)}</p>` : "")
    + `<p class="cc-sub">medicine</p>` + li(d.meds, t)
    + `<p class="cc-sub">who to call, where to meet</p>` + li([...(d.comms?.call_order || []), d.comms?.meet_near && "near: " + d.comms.meet_near, d.comms?.meet_far && "far: " + d.comms.meet_far].filter(Boolean), t)
    + `<p class="cc-sub">leave when</p>` + li(d.evac?.go_when, t) + `<p class="cc-sub">stay when</p>` + li(d.evac?.stay_when, t)
    + `<p class="cc-sub">in 90 seconds, grab</p>` + li(d.evac?.bag_90s, t)
    + `<p class="cc-sub">buy first · ${t(d.budget_total)}</p>` + li(d.budget, (b) => `${t(b.name)} <span>· ${t(b.cost)} · ${t(b.where)}</span>`)
    + `<p class="cc-sub">this week</p>` + li(d.actions, (a) => `${t(a.title)} <span>· ${t(a.when)} · ${t(a.time)} · ${t(a.cost)}</span>`);
}
