// What the work is for: ecology, branched into the resources we live on, with education and economy
// running across every one of them. The homepage draws it (ecologyViz.js) and its nodes filter the
// grid, so each `id` is also a `topics:` value in src/projects/*.md.
// Every sentence here is Raghav's own, from his note of 2026-10-05. Trim, don't rewrite.
// Every node has a callout box on the diagram (index.njk); a node without a `note` shows "[note]"
// until he writes one.
module.exports = {
  root: "ecology",
  resources: [
    { id: "energy",    label: "energy" },
    { id: "food",      label: "food",      note: "no one has to be hungry" },
    { id: "water",     label: "water",     note: "no one in dearth of water, no one dying due to flooding" },
    { id: "waste",     label: "waste" },
    { id: "mobility",  label: "mobility" },
    { id: "air",       label: "air",       note: "no one breathing in poisonous air" },
    { id: "buildings", label: "buildings", note: "buildings and materiality" },
  ],
  threads: [
    { id: "education", label: "education", note: "we are educated to understand and study these resources" },
    { id: "economy",   label: "economy",   note: "to innovate with production, consumption and re-production, and to use our skills to serve and earn too",
      along: ["produce", "consume", "re-produce"] },
  ],
  // [draft] his paragraph, cut down but not reworded. He trims it.
  statement: [
    "how can humanity be involved in the work of restoration of the resources we consume, in the most efficient ways, such that no one has to be poor, or hungry, or in dearth of water, or die due to flooding, or breathe in poisonous air?",
    "it’s a shame we created an entity that is capable enough to think, yet we have been so unable to manage our resources efficiently so everyone could have the opportunity of living a decent life.",
  ],
};
