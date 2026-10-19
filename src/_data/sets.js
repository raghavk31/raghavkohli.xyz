// Sets: several projects shown on the homepage as one card (2026-10-19, from the cap-group mock).
// A set's title stands in src/_data/groups.js where its projects would; the card opens a tray of
// them beside it (src/assets/js/sets.js). Each plan keeps its own page; (next) and the diagram's
// counts read through the set to its plans, in this order. Keyed by the title used in groups.js.
//   id      the tray's id and the box's layout id (home-set-<id>)
//   card    L | M | S, as a project's `card:`
//   count   the quiet line after desc
module.exports = {
  "City Climate Action Plans": {
    id: "plans",
    card: "L",
    desc: "iclei · capacities · c40 · imt-gt",
    count: "4 plans · 7 cities",
    question: "one method, seven cities: what does a city learn when its ledger can be read beside another's?",
    snippet: "Ahmedabad, Vadodara, Surat and four Malaysian cities, all on the same instrument.",
    plans: ["Ahmedabad Climate Action Plan", "Vadodara Climate Action Plan", "Surat Climate Action Plan", "Malaysia GCAP"],
  },
};
