// The homepage grid: groups by method (plan 2026-09-19, D4), each a (label) and its cards by title.
// Order inside a group = the media lab plan's order. Shared by index.njk (the grid) and project.njk
// (a story's (next) link follows this order, wrapping at the end). A title in src/_data/sets.js is a
// set: one card for its plans, which (next) and the diagram walk in the set's order.
module.exports = [
  ["(energy & systems)",       ["Sama", "Climate Code"]],
  ["(plans & policy)",          ["City Climate Action Plans", "Malaysia GCAP", "State of Cities", "Urban Greening Policy"]],
  ["(participatory)",           ["Perspectives", "Koliwadas", "Living Heritage", "Rebel Bodies Rebel Cities", "Urban Performances"]],
  ["(computational & spatial)", ["Generative Techniques", "One is to One", "Water Urbanism", "Eco-Machine"]],
  ["(early work)",              ["Utopias to Heterotopias", "Exploring Majuli", "Pune Metro"]],
];
