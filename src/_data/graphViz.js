// The (thoughts) graph, laid out at build time from ideas.json (scripts/compile-ideas.mjs writes it,
// scripts/graph-layout.js places it). Without an ideas.json yet, { ready: false } and the (graph)
// switch stays hidden.
const fs = require("fs");
const path = require("path");
const { layout } = require("../../scripts/graph-layout.js");

const file = path.join(__dirname, "ideas.json");
module.exports = fs.existsSync(file) ? layout(JSON.parse(fs.readFileSync(file, "utf8"))) : { ready: false };
