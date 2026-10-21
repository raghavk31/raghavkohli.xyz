# (thoughts) as a graph: an idea file (2026-10-21) — reviewed

Raghav's ask: a tab inside (thoughts) that builds a knowledge graph of every thought, "like an
Obsidian RAG framework, an Obsidian 'idea file' as Karpathy puts it". Karpathy's pattern: raw notes
go in, an LLM *compiles* them into a wiki of linked concept pages (summaries, backlinks), you browse
it as an Obsidian graph, and you can ask it questions that answer from your own notes.

## What exists (2026-10-21, read from the live API and the repo)

- `/thoughts/` (`src/thoughts.njk`) is one page: heading "a journal, of sorts.", the owner-only
  composer, and the **board** of post-its (`.board`, free canvas on desktop, columns under 820px).
- Source of truth is the worker's D1 `thoughts` table (`worker/src/index.js`, `GET /thoughts`).
  `src/thoughts/` holds no markdown entries today.
- **31 thoughts, all Raghav's.** 14 are written out (1.2k–6.3k chars). **17 are titles only**
  (body is `.`): "simulating thought", "the war within", "eco-machines", "painkiller vs vitamin"…
  These are seeds: ideas named and not yet written.
- The worker has only a D1 binding: no Workers AI, no vector index. The site is static (GitHub
  Pages); every write goes through the worker.

## The plan

### 1. One page, two views (decided 2026-10-21)
`(board)  (graph)` toggle under the journal heading, mono labels like every other `( )` control,
the current one in ink and the other in `--faint`. The board stays the default.
`/thoughts/#graph` opens the graph view directly so it can be linked. The graph takes the board's
place: page-edge wide (`--maxw` + `--gutter`), 78vh tall. The composer stays with the board only.

```
  (← home)   (thoughts)
  a journal, of sorts.                         first: the heading, as today
  (board)  (graph)                             second: the switch
  ┌──────────────────────────────────────┐
  │ graph: concepts labelled, thoughts   │     third: the graph
  │ as dots, titles on hover             │ ┌──────────┐
  │                                      │ │ post-it  │ fourth: the note, 300px, on click
  └──────────────────────────────────────┘ └──────────┘
  (key)
```

### 1b. The switch (decided 2026-10-21)
`(graph)`: each post-it scales and flies into its node (FLIP, 500ms ease-out), then the concept
lines draw in (200ms). **(eng D10)** Only post-its in the viewport fly, at most 40; the rest appear
at their nodes with the 240ms fade. `(board)` reverses it. Posts in the `(unfiled)` corner fly there too.
`prefers-reduced-motion`: a 240ms crossfade instead. Opening `/thoughts/#graph` directly skips the
flight and uses the load fade.

| step | does | feels | supported by |
|------|------|-------|--------------|
| 1 | lands on (thoughts), the board | at home, reading | the board as today |
| 2 | clicks `(graph)` | curious | the flight: notes become the web |
| 3 | sees the concepts | "that's how it all hangs together" | build-time layout, visual language (§6) |
| 4 | hovers "desire" | recognition | neighbours stay in ink, the rest fade |
| 5 | clicks a note, `(read)` | pulled back into the writing | panel → note on the board |

### 2. What the graph is made of (decided 2026-10-21: shared concepts, not similarity, not [[links]]-only)
- **Thought nodes**: every thought. Written ones are filled; title-only seeds are drawn hollow.
  **Seeds (decided 2026-10-21):** a ring, linked to concepts the compiler guesses from the title, so
  they sit beside related notes. A seed's panel reads `(a seed: named, not written yet)` under the
  title, never an empty body. When the body is written, the next compile fills it in.
- **Concept nodes**: the ideas that run through several thoughts (e.g. *ego*, *desire*,
  *perspectives*, *discipline*, *identity*, *the Kybalion*), named by the compile step below.
  Drawn as words, no circle (see §6).
- **Edges**: thought to concept ("this thought is about that"). No thought-to-thought edges drawn
  directly; two thoughts are related when they share concepts. Keeps the picture readable at 31
  nodes and still holds at 300.

### 3. How it's compiled (the "idea file")
`scripts/compile-ideas.mjs`, run by hand after writing:
1. `GET /thoughts` from the live worker, paging with `?before=` until a page returns <100 **(eng D6)**.
2. **(eng D5)** Key: `OPENROUTER_API_KEY` from the environment, else `worker/.dev.vars` (gitignored);
   missing key → exit with a one-line message. Ask Claude through OpenRouter (the model constant shared with `climate-ai.js`, structured output) for each thought's 2–5 concepts from a running
   vocabulary, so the same idea isn't named two ways, plus a one-line gist per concept and per thought.
   **Scale guard (decided 2026-10-21):** at most ~24 concepts, merging or broadening rare ones; a
   concept needs 2+ thoughts to be drawn as a word (one-offs stay in `ideas.json`, undrawn).
3. Write `src/_data/ideas.json` (`{concepts:[{id,name,gist,thoughts:[]}], thoughts:[{id,gist,concepts:[]}]}`), committed.
4. The Eleventy build renders the graph from that file. The graph itself uses no runtime AI; only the owner-only `(ask)` (§5) calls Claude.
4b. **Sign-off (decided 2026-10-21):** the script prints a summary (new, renamed and dropped concepts;
   which thoughts moved) and writes `ideas.json`. Nothing is live until Raghav reads the diff and
   commits. A name he edits in the JSON is kept as vocabulary by the next compile.
5. **Unfiled notes (decided 2026-10-21):** the graph also reads the live `GET /thoughts`. Any id not
   in `ideas.json` is drawn as a small dot in a loose `(unfiled)` cluster at the lower left, title on
   hover, panel offers `(read)` only. The next compile files it. No key on the worker.

### 4. Reading it
- **Layout is computed at build (decided 2026-10-21):** the Eleventy build runs the force layout over
  `ideas.json` and writes positions into the page, so the graph appears in place and stays still.
  Only the `(unfiled)` corner is placed live.

| state | what he sees |
|-------|--------------|
| no JS | `(graph)` hidden; the board as today |
| loading | nodes fade in at their final spots (opacity only, 240ms ease-out); nothing settles in view |
| API down | the compiled graph only; no `(unfiled)` cluster; no error line |
| no `ideas.json` yet | `(graph)` hidden until the first compile |
| panel open on a thought since deleted | panel reads `(removed)` |
| thought deleted since the compile (eng D4) | once the live list loads, its dot and edges are hidden; a concept left with <2 visible thoughts fades to `--faint` |
| seed | ring, panel `(a seed: named, not written yet)` |
| unfiled | small dot in the `(unfiled)` corner, panel `(read)` only |

- Hover or tap a node: its neighbours stay at full ink, everything else fades to `--faint`.
- Click a thought: a side panel opens with its title, the first lines, the concepts it touches and
  a `(read)` link that opens the note on the board.
- Click a concept: the panel shows its gist and the list of thoughts that carry it.
- Concepts live **only in the panel** (decided 2026-10-21): no `/thoughts/ideas/<concept>/` pages,
  no synthesis paragraphs. The AI writes at most one line per concept; everything else is his words.

### 6. Visual language (decided 2026-10-21: words as nodes, ink on paper)
- One SVG on `--paper`; no background, no grid, no glow, no drop shadows.
- **Concepts** are words in `--sans`, sized 14–28px by how many thoughts carry them (sqrt scale),
  `--ink`, no circle, no box. The word is the node.
- **Thoughts** are 5px `--ink` dots; **seeds** are 5px rings (1px stroke); **unfiled** are 3px `--faint` dots.
  Titles appear on hover/focus in `--mono` 11px beside the dot.
- **Edges** are 0.75px `--line` hairlines, straight.
- **Hover/focus**: the node, its edges and neighbours stay in ink; everything else drops to 0.18 opacity (160ms).
- **The panel is the post-it (decided 2026-10-21):** `.board .thought` styling (white note, top
  shade, 1° tilt), 300px, pinned top-right over the graph; the build-time layout keeps that corner
  clear. Order: title → first ~6 lines (or the seed line) → concepts as `(desire) (identity)`, each
  jumping to its word → `(read)` (scrolls the board to the note). A concept's note shows the word,
  its gist, and its thoughts as a list of titles. `(×)` or Esc closes it.
- Dark mode comes free from the tokens (`--paper #0D0D0B`, `--ink #ECEAE3`, `--line #3A3933`).

### 7. Phones (decided 2026-10-21)
Under 820px (the board's own breakpoint) `(graph)` shows a **concept index** instead of the SVG:
concepts as headings in order of weight, each with its gist in `--faint`, its thoughts listed as
titles beneath (seeds suffixed `(seed)`, unfiled under a last `(unfiled)` heading). Rows are at least 44px;
tapping a title scrolls the board to the note. No flight on phones; the 240ms crossfade instead.
A thought under several concepts appears under each.

**Keyboard and screen readers (decided 2026-10-21):** `(board) (graph)` is a `role=tablist` with
two `role=tab` buttons (arrow keys switch). On desktop the SVG is `aria-hidden` and the same concept
index sits in the page visually hidden, so screen readers read concepts then thoughts in order.
The concept words and thought dots are focusable in that same order: Tab to move, Enter opens the
note, Esc closes it and returns focus to the node. Focus shows as a 2px `--accent` ring offset 3px.
The flight and fades are skipped under `prefers-reduced-motion`.

### 5. Asking it (the RAG half), decided 2026-10-21: owner-only
- `(ask)` appears in the graph view only once the owner key is entered, like the composer.
- Worker `POST /ask` (owner key required, refused otherwise) takes `{question}` only **(eng D3)**:
  it loads the thoughts from D1 and sends them with the question to Claude (the shared OpenRouter model; 31 notes = 40,776 chars ≈ 10k tokens, so no vector index
  yet), returns `{answer, cites:[thought ids]}`. **Key (eng D2):** reuses the worker's existing
  `OPENROUTER_API_KEY` and the model constant in `climate-ai.js` (one place to change it); no new
  secret. Raghav runs `wrangler deploy` himself, and `secret put OPENROUTER_API_KEY` if it isn't set yet.
- The answer appears in a post-it at the panel's spot, in his text face, cited titles as `(links)`;
  the browser maps `cites` to concepts with its own `ideas.json`, and the cited notes and their concepts stay in ink on the graph and the rest fade, like a hover.
- States: asking → the note reads `(thinking…)`; error → `(couldn't ask: <reason>)`; no cites →
  the answer plus `(nothing in the notes says this directly)`.

## NOT in scope
- Concept pages `/thoughts/ideas/<concept>/` and AI synthesis prose: declined (decision 3), so the AI's words stay off the site.
- Thought-to-thought similarity edges and `[[wikilinks]]`: declined (decision 1); revisit if he starts writing links.
- Public `(ask)`: declined (decision 12) because of cost, injection risk and an AI speaking for him to strangers.
- Auto-compile on post: declined (decision 5); compile stays a manual command.
- A vector index: not needed at ~10k tokens of notes (40,776 chars measured 2026-10-21); reconsider past ~150k.
- A Workers test harness (miniflare/vitest) for `/ask`: a curl 403 check covers the owner gate (eng D8).
- An eval of concept naming: his diff sign-off (design 13) is the quality gate (eng D8).

## What already exists (reuse)
- `src/thoughts.njk` page shell, `.detail`/`.journal` heading, `(key)` owner flow, composer gating.
- `.board .thought` post-it styling → the panel and the `(ask)` answer note.
- main.js `initWall` (live fetch of `GET /thoughts`, owner key in localStorage) → unfiled notes, owner-only `(ask)`.
- Colour/type tokens in `main.css` incl. dark mode; the `( )` mono control idiom; the 820px board breakpoint.
- Build-time SVG pattern: `src/_data/ecologyViz.js` / `perspectivesViz.js` (hand math, no layout library) → `src/_data/graphViz.js` (eng D1).
- Page-only scripts loaded conditionally in `src/_includes/base.njk:121-123` (`pins.js`, `sets.js`) → `graph.js` (eng D7).
- `worker/src/climate-ai.js`: OpenRouter call, model constant, `str()` input cleaning → `/ask` and the compile (eng D2, D5).
- Worker owner-key check (`index.js:44-45`, `X-Owner-Key`) → `/ask`.
- Worker paging (`GET /thoughts?before=`, `index.js:58`), unused until now → board + compile (eng D6).

## Implementation Tasks
Synthesized from the design and eng reviews. Effort ratios: features ~30x, tests ~50x, scaffolding ~100x.

- [ ] **T0 (P1, human: ~2h / CC: ~10min)** — wall fetch — exported paging function (`?before=` until a page returns <100); `initWall` uses it and dispatches `thoughts:loaded {thoughts, owner}` after load, post, edit, delete
  - Surfaced by: eng D6, D7, D9 (main.js:1457)
  - Files: src/assets/js/main.js, tests/wall-fetch.test.js, package.json (`"test": "node --test tests/"`)
  - Verify: `npm test`; /browse the board with the key: order, saved positions, edit/drag/scale/images/delete unchanged
- [ ] **T1 (P1, human: ~4h / CC: ~15min)** — compile — `scripts/compile-ideas.mjs`: paged fetch, key from env or `worker/.dev.vars`, OpenRouter structured output, vocabulary reuse, ≤24 concepts / min 2, seeds, gists, diff summary, write `src/_data/ideas.json`
  - Surfaced by: design 1, 4, 13, 14; eng D5, D6
  - Files: scripts/compile-ideas.mjs, src/_data/ideas.json, tests/compile.test.js
  - Verify: `npm test`; run twice on unchanged notes → no concept churn; no key → one-line exit; summary prints
- [ ] **T2 (P1, human: ~4h / CC: ~15min)** — layout — `src/_data/graphViz.js`: seeded deterministic force layout over ideas.json, no dependency, top-right 300px corner clear, all inside the viewBox
  - Surfaced by: design 6; eng D1
  - Files: src/_data/graphViz.js, tests/graph-viz.test.js
  - Verify: `npm test` (same input → same coords; corner clear; bounds); two builds → identical SVG
- [ ] **T3 (P1, human: ~1 day / CC: ~30min)** — view — `(board) (graph)` tablist, `#graph`, SVG in the §6 visual language, hover/focus dimming, post-it panel for thoughts, seeds, concepts
  - Surfaced by: design 2, 4, 8, 9; eng D7
  - Files: src/thoughts.njk, src/assets/js/graph.js, src/_includes/base.njk (load on /thoughts/ only), src/assets/css/main.css
  - Verify: /browse at 1440 light + dark; click a thought, seed, concept; `(read)` lands on the board note
- [ ] **T4 (P1, human: ~2h / CC: ~10min)** — states — unfiled corner and deleted-since-compile hiding from the `thoughts:loaded` list, `(removed)`, API down, no-JS, no ideas.json, load fade
  - Surfaced by: design 5, 6; eng D4
  - Files: src/assets/js/graph.js, src/thoughts.njk, tests/graph-merge.test.js
  - Verify: `npm test` (merge: unfiled, hidden, concept fades below 2); block the worker → compiled graph, no error; JS off → board only
- [ ] **T5 (P2, human: ~1 day / CC: ~40min)** — switch — FLIP flight for visible post-its (max 40), rest fade; lines draw in; reduced-motion crossfade; before-load fallback
  - Surfaced by: design 7; eng D10
  - Files: src/assets/js/graph.js, src/assets/css/main.css
  - Verify: switch both ways at 1440; emulate reduced motion → crossfade only
- [ ] **T6 (P1, human: ~3h / CC: ~15min)** — phone + a11y — concept index under 820px, the same index visually hidden for screen readers, keyboard order, Enter/Esc, `--accent` focus ring
  - Surfaced by: design 10, 11
  - Files: src/thoughts.njk, src/assets/css/main.css, src/assets/js/graph.js
  - Verify: /browse at 375; keyboard-only walk; screen reader reads concepts then thoughts
- [ ] **T7 (P2, human: ~1 day / CC: ~45min)** — ask — worker `POST /ask` (owner key, `{question}` only, D1 thoughts, OpenRouter, `{answer, cites}`), `(ask)` field after key, answer post-it, cites → concepts lit in the browser, three states
  - Surfaced by: design 12; eng D2, D3
  - Files: worker/src/ask.js, worker/src/index.js, src/assets/js/graph.js
  - Verify: curl `POST /ask` without key → 403; with key → answer cites real ids; Raghav runs `wrangler deploy` (and `secret put OPENROUTER_API_KEY` if unset)

## Eng outputs (2026-10-21)

### Failure modes
| path | realistic failure | handled | user sees |
|------|-------------------|---------|-----------|
| compile | no key on the laptop | one-line exit (D5), tested | a clear message in the terminal |
| compile | model returns malformed JSON | retry once, then exit without writing `ideas.json` (carried) | a message; the old `ideas.json` stays |
| compile | Claude renames concepts every run | vocabulary reuse + his diff sign-off | churn visible in the diff before commit |
| build | `graphViz.js` overlaps the panel corner | corner rule, tested (T2) | nothing; the test fails first |
| board/graph | worker down | compiled graph only (design 6) | the graph, no error |
| board/graph | >100 notes | paging (D6), tested (T0) | every note |
| graph | note deleted since compile | hidden once live (D4), tested (T4) | the note is gone, as on the board |
| /ask | OpenRouter 5xx or slow | 502 + `(couldn't ask: <reason>)` (design 12) | a readable error in the note |
| /ask | request without key | 403, curl-checked (T7) | nothing; the field never shows |

No critical gaps: every path has handling, and none fails silently.

### Test plan (kept here; the gstack state path was not used this session)
- Affected pages: `/thoughts/` (board unchanged with the key; graph view; phone index); worker `/ask`.
- Key interactions: switch board↔graph both ways; hover, focus and click on thought, seed, concept; `(read)`; `(ask)` with the key.
- Edge cases: 0 unfiled vs some; a deleted note; API blocked; JS off; reduced motion; 375px; keyboard only.
  - Value: protects=paging reads every note once; fails_when=loop stops early or repeats a page; why_new=no board tests exist; seam=exported fetch function; no_claim=live worker behavior (stubbed pages)
  - Value: protects=same ideas.json gives the same layout with the corner clear; fails_when=unseeded randomness or corner rule removed; why_new=new module; seam=none; no_claim=visual quality of the layout
  - Value: protects=deleted/unfiled merge; fails_when=compiled ids hidden wrongly or not at all; why_new=new logic; seam=exported pure merge; no_claim=DOM rendering
- Critical paths: the board with the key after T0 (order, positions, owner tools); the graph renders from a fresh build.
- Tests to retire: none.
- Pending decisions: none.

### Worktree parallelization
| Step | Modules touched | Depends on |
|------|-----------------|------------|
| T0 wall fetch | src/assets/js (main.js), tests/ | — |
| T1 compile | scripts/, src/_data/ | — |
| T2 layout | src/_data/, tests/ | T1 (ideas.json shape) |
| T3–T6 view, states, flight, a11y | src/assets/js (graph.js), src/assets/css, src/thoughts.njk, src/_includes | T0, T2 |
| T7 ask | worker/src/, src/assets/js (graph.js) | T3 |

Lane A: T0. Lane B: T1 → T2. Merge both, then T3 → T4 → T6 → T5, then T7. Conflict flag: `main.css` and `graph.js` are shared by T3–T7, so those stay in one lane.

### Eng completion summary
- Step 0: Scope Challenge: scope accepted as-is (structure A, D1)
- Reality rows (by hand; gstack-plan-reality not run): premise-table pass (31 notes, 17 seeds, owner-only writes; live API + index.js:70); already-done pass (no graph code on main or cap-group); surface-check pass (`node:test` probed on Node v24.14.0); binding-decisions pass (14 design decisions kept); numbers pass (40,776 chars measured); deferred-asks pass (no linked issue); pr-count pass (one PR)
- Architecture Review: 3 issues (A1 D3, A3 D4, A4 D5), plus S1 (D2) from Scope Challenge
- Code Quality Review: 2 issues (Q1 D6, Q2 D7)
- Test Review: diagram produced, 22 gaps; T1 (D8) and regression contract R1 (D9)
- Performance Review: 1 issue (P1 D10)
- NOT in scope: written (8 items)
- What already exists: written
- TODOS.md updates: 0 new
- Failure modes: 0 critical gaps
- Unresolved decisions: 0
- Outside voice: skipped (outside voices declined for this plan in the design review; Codex and subagent not run)
- Parallelization: 2 lanes at the start, then sequential
- Lake Score: 6/6 answers with Completeness scores picked the higher-scored option

## Design Review Completion Summary

```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | no DESIGN.md (tokens from main.css); UI scope: new view on /thoughts/ |
  | Step 0               | 4/10; all 7 passes                          |
  | Pass 1  (Info Arch)  | 4/10 → 9/10 after fixes                     |
  | Pass 2  (States)     | 2/10 → 9/10 after fixes                     |
  | Pass 3  (Journey)    | 5/10 → 8/10 after fixes                     |
  | Pass 4  (AI Slop)    | 3/10 → 9/10 after fixes                     |
  | Pass 5  (Design Sys) | 8/10 → 8/10 (no DESIGN.md; TODO noted)      |
  | Pass 6  (Responsive) | 2/10 → 9/10 after fixes                     |
  | Pass 7  (Decisions)  | 3 resolved, 0 deferred                      |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (5 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 1 item (existing DESIGN.md entry updated)   |
  | Approved Mockups     | 0 generated (designer not run), 0 approved  |
  | Decisions made       | 14 added to plan                            |
  | Decisions deferred   | 0                                           |
  | Overall design score | 2/10 → 8/10                                 |
  +====================================================================+
```

Every pass is at 8 or above, so the plan is design-complete. Run /design-review after implementation for visual QA.

### Unresolved Decisions
None.

## Eng review (2026-10-21)

Target: `docs/plans/2026-10-21-thoughts-graph.md` (this file).

**Scope record:** feature answers: none proposed (all design decisions kept); structure: A, Original
arrangement (D1): layout runs at build in `src/_data/graphViz.js`, a seeded deterministic force
layout with no new dependency, after `ecologyViz.js`; `ideas.json` holds concepts and gists only.
Accepted scope: the plan as designed. Pending remedies: S1, A1, A3, Q1, Q2, T1. Scope Challenge
result: scope accepted as-is.

**Factual correction (no decision):** writes are owner-only (`worker/src/index.js:70`
`if (!ownerHeader()) return json({ error: "no" }, 403);`; public posting removed 2026-09-25 per
`worker/wrangler.toml`). The compile reads only Raghav's writing.

**Carried specs of approved behavior (no decision):** a seed is a thought whose body has no letter or
digit (today's seeds are `.`); `/ask` clamps its question like `climate-ai.js`'s `str()` (500 chars,
newlines kept) and caps the answer at 800 tokens; if `(graph)` is clicked before the live notes have
loaded, the flight falls back to the 240ms fade.

## Decision ledger

### S1: which key `/ask` uses
Finding: [P2] (confidence: 9/10) worker/src/climate-ai.js:18,326-337 — Scope Challenge, reviewer Claude.
The plan adds a new `ANTHROPIC_KEY` secret, but the worker already calls Claude with
`const MODEL = "anthropic/claude-sonnet-4-5"` through OpenRouter using `env.OPENROUTER_API_KEY`.
Plan baseline: §5 "The key is a wrangler secret `ANTHROPIC_KEY`" (design decision 12).
Runtime evidence: the OpenRouter route exists in code; whether `OPENROUTER_API_KEY` is set on the live worker is unknown.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| S1 key/provider for /ask | new ANTHROPIC_KEY, Anthropic API direct | reuse OPENROUTER_API_KEY via OpenRouter, model constant shared with climate-ai.js | keep new ANTHROPIC_KEY |
| owner-only gate (design 12) | approved | unchanged | unchanged |
| A1, A3, Q1, Q2, T1 | pending | pending | pending |
Question D2: which key does (ask) use? (see AskUserQuestion D2)
Header: Ask key
Options:
A) Reuse OpenRouter key
B) New Anthropic key
State: approved
Actual answer: A) Reuse OpenRouter key (D2, 2026-10-21)
Accepted scope: `/ask` calls OpenRouter with `env.OPENROUTER_API_KEY` and the model constant shared with `climate-ai.js`; no `ANTHROPIC_KEY` secret.

### A1: where `/ask` gets its context
Finding: [P2] (confidence: 8/10) plan §5 "sends the question, `ideas.json`'s concepts and the full thoughts" — Architecture, reviewer Claude. `ideas.json` is in the site repo; the worker only has D1 (`wrangler.toml` binding `DB`).
Plan baseline: §5 as quoted (design decision 12).
Runtime evidence: worker reads thoughts via `env.DB` (index.js:60); no access to site files.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| A1 context source | unspecified mechanism | worker reads thoughts from D1 only; browser maps `cites` to concepts with its copy of `ideas.json` | browser POSTs the concept list with the question; worker adds D1 thoughts |
| S1 key | approved: OpenRouter | unchanged | unchanged |
| A3, Q1, Q2, T1 | pending | pending | pending |
Question D3: where does (ask) get its context? (see AskUserQuestion D3)
Header: Ask context
Options:
A) Worker reads D1 only
B) Browser sends concepts
State: approved
Actual answer: A) Worker reads D1 only (D3, 2026-10-21)
Accepted scope: `POST /ask` takes `{question}` only; the worker loads thoughts from D1 and returns `{answer, cites}`; the browser lights cited notes' concepts from its own `ideas.json`.

### A3: a deleted thought's node between compiles
Finding: [P2] (confidence: 9/10) worker/src/index.js:122 `if (route === "thoughts" && req.method === "DELETE" && id)` vs static `src/_data/ideas.json` — Architecture, reviewer Claude. A note deleted live keeps its dot and concept edges on the graph until the next compile; the approved states table only covers its panel (`(removed)`).
Plan baseline: states table row "panel open on a thought since deleted → panel reads `(removed)`" (design decision 6).
Runtime evidence: graph not built; delete route verified in code.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| A3 compiled node absent from live list | drawn as normal | hidden (node + its edges) once the live list loads; a concept left with <2 thoughts fades to `--faint` | drawn as normal until recompile |
| API down (design 6) | compiled graph only | unchanged (nothing hidden without a live list) | unchanged |
| S1, A1 | approved | unchanged | unchanged |
| Q1, Q2, T1 | pending | pending | pending |
Question D4: what happens to a deleted note's dot? (see AskUserQuestion D4)
Header: Deleted
Options:
A) Hide it once live
B) Keep until recompile
State: approved
Actual answer: A) Hide it once live (D4, 2026-10-21)
Accepted scope: once the live list loads, compiled thoughts missing from it are hidden with their edges; a concept left with <2 visible thoughts fades to `--faint`; with no live list nothing is hidden.

### A4: the compile script's model key
Finding: [P2] (confidence: 9/10) plan §3 step 2 "Ask Claude (Sonnet 5.5, structured output)" — Architecture, reviewer Claude. The script runs on Raghav's machine; the only local secret file, `worker/.dev.vars` (gitignored, worker/.gitignore:3), holds `OWNER_KEY` only.
Plan baseline: §3 (no credential named).
Runtime evidence: no `OPENROUTER`/`ANTHROPIC` key in scripts/ or worker/.dev.vars.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| A4 compile credential | unspecified | script reads `OPENROUTER_API_KEY` from env or `worker/.dev.vars`; calls OpenRouter with the shared model | worker gets an owner-only `POST /compile` that does the model call with its own key; script sends the owner key and saves the JSON |
| S1, A1, A3 | approved | unchanged | unchanged |
| Q1, Q2, T1 | pending | pending | pending |
Question D5: where does the compile's model key live? (see AskUserQuestion D5)
Header: Compile key
Options:
A) Local key in .dev.vars
B) Compile via the worker
State: approved
Actual answer: A) Local key in .dev.vars (D5, 2026-10-21)
Accepted scope: `compile-ideas.mjs` reads `OPENROUTER_API_KEY` from the environment, else from `worker/.dev.vars` (gitignored); calls OpenRouter with the model shared with `climate-ai.js`; exits with a clear message if the key is missing.

### Q1: reading more than 100 thoughts
Finding: [P2] (confidence: 9/10) src/assets/js/main.js:1457 `fetch(api + "/thoughts?limit=100")`; worker/src/index.js:59 `Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 100)` — Code quality, reviewer Claude. One page only: past 100 notes the board drops the oldest, and the graph's live merge (D4) would hide compiled notes as if deleted.
Plan baseline: none (the plan assumes one fetch; design 14 targets ~300 notes).
Runtime evidence: 31 thoughts live today; both caps read in code.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| Q1 how many thoughts the browser and the compile read | first 100 | all: follow `before=<oldest created>` until a page returns <100, in the board fetch (shared by the graph) and in the compile | first 100; the D4 hiding only applies to ids newer than the oldest fetched note |
| S1, A1, A3, A4 | approved | unchanged | unchanged |
| Q2, T1 | pending | pending | pending |
Question D6: should the board and compile read every thought? (see AskUserQuestion D6)
Header: Pagination
Options:
A) Page through all
B) Stay at 100, guard D4
State: approved
Actual answer: A) Page through all (D6, 2026-10-21)
Accepted scope: the board fetch (main.js `initWall`) and the compile both follow `?before=<oldest created>&limit=100` until a page returns <100; the graph uses the board's loaded list, no second fetch.

### Q2: where the graph's browser code lives
Finding: [P3] (confidence: 7/10) src/assets/js/main.js (1,759 lines; `initWall` at :1315) — Code quality, reviewer Claude. Page-specific code already lives in its own files loaded conditionally: src/_includes/base.njk:121-123 (`city.js`, `pins.js`, `sets.js`).
Plan baseline: T3 "src/assets/js/main.js (or a new graph.js)".
Runtime evidence: as quoted.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| Q2 graph code location | undecided | new `src/assets/js/graph.js`, loaded only on /thoughts/; `initWall` dispatches one `thoughts:loaded` event carrying the list and the owner key state | inside `initWall` in main.js |
| S1, A1, A3, A4, Q1 | approved | unchanged | unchanged |
| T1 | pending | pending | pending |
Question D7: where does the graph's browser code live? (see AskUserQuestion D7)
Header: graph.js
Options:
A) Own graph.js file
B) Inside main.js
State: approved
Actual answer: A) Own graph.js file (D7, 2026-10-21)
Accepted scope: new `src/assets/js/graph.js`, loaded only on /thoughts/; `initWall` dispatches one `thoughts:loaded` CustomEvent `{thoughts, owner}` (and again after a post, edit or delete); graph.js never fetches `/thoughts` itself.

### T1: how the graph is tested
Finding: [P2] (confidence: 9/10) package.json `"scripts": { "start": ..., "build": "eleventy" }` (no test script; no test files) — Test review, reviewer Claude. 22 proposed paths, none covered. Node v24.14.0 has `node:test` built in.
Plan baseline: Implementation Tasks' "Verify" lines (manual /browse checks only).
Runtime evidence: `node -e "require('node:test')"` → ok.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| T1 automated tests | none | `npm test` = `node --test tests/`: graphViz (deterministic coords, panel corner clear, inside viewBox), compile pure functions (paging with stubbed fetch, isSeed, cap/min-2, missing key), graph.js merge + cites→concepts as pure functions; plus a /browse walk of the user flows and a curl check of /ask 403 | /browse walk + curl only, no `npm test` |
| T1 eval of concept naming | none | none (he signs off the diff, design 13) | none |
| S1, A1, A3, A4, Q1, Q2 | approved | unchanged | unchanged |
Question D8: how is the graph tested? (see AskUserQuestion D8)
Header: Tests
Options:
A) node:test + browse walk
B) Browse walk only
State: approved
Actual answer: A) node:test + browse walk (D8, 2026-10-21)
Accepted scope: `"test": "node --test tests/"` in package.json; tests/graph-viz.test.js, tests/compile.test.js, tests/graph-merge.test.js on the listed pure functions; a /browse walk of the user flows; a curl check that `/ask` returns 403 without the key. No eval of concept naming (design 13 sign-off covers it).

### R1: regression contract for the board's fetch (D6 changes it)
Finding: [P1] (confidence: 9/10) src/assets/js/main.js:1457 — Test review, IRON RULE, reviewer Claude. D6 replaces the board's single `fetch(api + "/thoughts?limit=100")` with a paging loop; the board (render order, free-canvas layout, owner tools) has no tests.
Plan baseline: D6 approved paging; no regression contract yet.
Runtime evidence: board live with 31 notes, all owner.
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| R1 board behavior to preserve | untested | same notes in the same newest-first order, saved free-canvas positions unchanged, owner tools (edit, drag, scale, images, delete) unchanged; intended change: >100 notes all render | same, verified only by the /browse walk |
| R1 proof | none | tests/wall-fetch.test.js: paging function returns 31 of 31 on one page, 250 of 250 across 3 stubbed pages, stops on a short page, no duplicates; plus the /browse walk of the board with the key | /browse walk of the board with the key |
| D8 tests | approved | unchanged | unchanged |
Question D9: how is the board protected when its fetch changes? (see AskUserQuestion D9)
Header: Board guard
Options:
A) Paging test + walk
B) Browse walk only
State: approved
Actual answer: A) Paging test + walk (D9, 2026-10-21)
Accepted scope: the paging loop is a small exported function (shared by the board and graph); tests/wall-fetch.test.js covers 31/31 on one page, 250/250 over 3 stubbed pages, stop on a short page, no duplicates; a /browse walk of the board with the key checks order, saved positions and every owner tool.

### P1: how many post-its fly
Finding: [P3] (confidence: 6/10) plan §1b "each post-it scales and flies into its node (FLIP, 500ms ease-out)" — Performance, reviewer Claude. At 200+ notes (design 14's horizon) most post-its are off-screen; animating all of them, some with full-bleed images, risks dropped frames.
Plan baseline: design decision 7 (all notes fly).
Runtime evidence: 31 notes today; not measured (nothing built).
Comparison grid:
| Choice | Current | A | B |
|---|---|---|---|
| P1 which notes fly | all | only post-its intersecting the viewport (max 40); the rest appear at their nodes with the 240ms fade | all |
| design 7 timing, reduced-motion fallback | approved | unchanged | unchanged |
Question D10: should every post-it fly, or only the visible ones? (see AskUserQuestion D10)
Header: Flight cap
Options:
A) Visible ones, max 40
B) Every post-it
State: approved
Actual answer: A) Visible ones, max 40 (D10, 2026-10-21)
Accepted scope: only post-its intersecting the viewport fly (at most 40); the rest appear at their nodes with the 240ms fade; timing and reduced-motion fallback unchanged.

Approval readiness: PASS (S1 D2, A1 D3, A3 D4, A4 D5, Q1 D6, Q2 D7, T1 D8, R1 D9, P1 D10; structure D1).

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Outside Review | — | Independent 2nd opinion | 0 | skipped | declined in design review (D3); not run in eng review |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | issues_open (all decided) | 6 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score: 2/10 → 8/10, 14 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **OUTSIDE COVERAGE:** codex / plan-review: skipped; Claude subagent: skipped. No outside findings.
- **VERDICT:** DESIGN CLEARED. ENG REVIEWED: 6 issues, every one decided (9 approved remedies), so it's ready to implement. Not written to the gstack review log because the gstack scripts weren't run this session, so the gstack dashboard won't list it.

NO UNRESOLVED DECISIONS
