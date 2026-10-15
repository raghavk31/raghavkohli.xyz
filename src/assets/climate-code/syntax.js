/* syntax.js — runs space syntax (syntax-worker.js) on a grid's streets once, and keeps the answer on the
   grid: G.syntax = { segs: [{ pts, nach, nain }], junctions: [[x, y, degree]], jcount: per cell } */
export function syntax(G) {
  if (G.syntaxP) return G.syntaxP;
  G.syntaxP = new Promise((resolve, reject) => {
    const w = new Worker(new URL("./syntax-worker.js" + new URL(import.meta.url).search, import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      w.terminate();
      if (e.data.error) return reject(new Error(e.data.error));
      // the streets read a kilometre past the window; mark the ones inside it, which are the ones counted
      const out = e.data, jcount = new Float32Array(G.n * G.n), n = G.n;
      for (const sg of out.segs) sg.in = sg.pts.some(([x, y]) => x >= 0 && y >= 0 && x < n && y < n);
      for (const [x, y] of out.junctions) {
        const c = Math.floor(x), r = Math.floor(y);
        if (c >= 0 && r >= 0 && c < G.n && r < G.n) jcount[r * G.n + c]++;
      }
      resolve((G.syntax = { ...out, jcount }));
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message || "the street analysis failed")); };
    w.postMessage({ lines: G.streets, size: G.size });
  }).catch((e) => { G.syntaxP = null; throw e; });
  return G.syntaxP;
}

/* five classes of a measure over the segments, by quantile, for the line weights */
export function syntaxBreaks(segs, key) {
  const v = segs.filter((s) => s.in !== false).map((s) => s[key]).filter((x) => x > 0).sort((a, b) => a - b);
  if (v.length < 5) return [1, 2, 3, 4];
  return [.4, .7, .85, .95].map((q) => v[Math.floor(q * (v.length - 1))]);
}
