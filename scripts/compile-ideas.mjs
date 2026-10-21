#!/usr/bin/env node
/* The idea file: reads every thought from the worker, asks Claude (through OpenRouter, the worker's
   model) for the ideas that run through them, and writes src/_data/ideas.json for the (graph) view on
   /thoughts/. Nothing is live until the diff is read and committed. A concept renamed by hand in
   ideas.json is kept: the next compile is told to reuse the vocabulary exactly.

     node scripts/compile-ideas.mjs           compile and write
     node scripts/compile-ideas.mjs --dry     compile and print the summary, write nothing

   Key: OPENROUTER_API_KEY from the environment, else from worker/.dev.vars (gitignored). */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { MODEL } from "../worker/src/model.js";

const require = createRequire(import.meta.url);
const { fetchAllThoughts } = require("../src/assets/js/thoughts-fetch.js");
const lib = require("./ideas-lib.js");
const site = require("../src/_data/site.js");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "src", "_data", "ideas.json");
const dry = process.argv.includes("--dry");

function key() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const vars = path.join(root, "worker", ".dev.vars");
  return fs.existsSync(vars) ? lib.readVar(fs.readFileSync(vars, "utf8"), "OPENROUTER_API_KEY") : "";
}

async function ask(apiKey, content) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
      "HTTP-Referer": "https://raghavkohli.xyz/thoughts/", "X-Title": "Idea file" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content }], max_tokens: 6000, temperature: 0.2 }),
  });
  if (!r.ok) throw new Error(`the model did not answer (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const text = d?.choices?.[0]?.message?.content || "";
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? text.slice(a, b + 1) : text);
}

async function main() {
  const apiKey = key();
  if (!apiKey) {
    console.error("No OPENROUTER_API_KEY: set it in the environment or add OPENROUTER_API_KEY=… to worker/.dev.vars.");
    process.exit(1);
  }
  const api = String(site.thoughtsApi || "").replace(/\/$/, "");
  if (!api) { console.error("No thoughts API in src/_data/site.js."); process.exit(1); }

  const { thoughts } = await fetchAllThoughts(api, fetch);
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
  const seeds = thoughts.filter(lib.isSeed).length;
  console.log(`${thoughts.length} thoughts (${thoughts.length - seeds} written, ${seeds} seeds); asking ${MODEL}…`);

  const content = lib.prompt(thoughts, prev);
  let answer;
  try { answer = await ask(apiKey, content); }
  catch (e) {
    if (!(e instanceof SyntaxError)) throw e;
    console.log("the answer was not readable JSON; asking once more…");
    answer = await ask(apiKey, content);   // a second unreadable answer throws, and nothing is written
  }

  const next = lib.normalize(answer, thoughts, { model: MODEL });
  const d = lib.diff(prev, next);
  const drawn = next.concepts.filter((c) => c.drawn);
  console.log(`\n${drawn.length} concepts drawn, ${next.concepts.length - drawn.length} kept undrawn (one note each):`);
  for (const c of next.concepts) console.log(`  ${c.drawn ? "●" : "·"} ${c.name.padEnd(22)} ${String(c.thoughts.length).padStart(2)}  ${c.gist}`);
  const line = (label, xs) => xs.length && console.log(`${label}: ${xs.join("; ")}`);
  console.log("");
  line("new", d.added); line("dropped", d.dropped); line("renamed", d.renamed.map(([a, b]) => `${a} → ${b}`));
  line("notes that moved", d.moved); if (prev) line("notes filed for the first time", d.fresh);
  const loose = next.thoughts.filter((t) => !t.concepts.length).map((t) => t.title || t.id);
  line("notes with no concept", loose);

  if (dry) { console.log("\n--dry: nothing written."); return; }
  fs.writeFileSync(OUT, JSON.stringify(next, null, 2) + "\n");
  console.log(`\nwrote ${path.relative(root, OUT)}. Read the diff, then commit it to publish.`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
