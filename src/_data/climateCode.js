// Climate Code (/work/climate-code/): the words of the explorer, one entry per chapter, in reading order.
// The page renders these into the left column; src/assets/climate-code/cc.js gives each chapter its map
// (by `id`), its controls and its readout. `day` is the Resilience Stack day the chapter is built from.
// `kind`: world = a country layer, city = a layer of the 150 m grid (city.js), place = a live tool for one
// point. A chapter with no `day` is new to the explorer; `tag` names what it draws on. `act` opens one of
// the five parts of the story (why here, what is here, where it fails, what if, one building).
// COPY: first pass in his voice done 2026-10-13; the question, lead, acts and the new chapters (heat, who
// is exposed, food, one park, one building) were drafted 2026-10-15 for him to edit.
module.exports = {
  title: "Climate Code",
  question: "Where in a city should the next climate decision go?",
  lead: "Climate risk is measured for countries. It is lived, and fixed, one street at a time. This explorer starts with the world, then reads one city as a grid of 150 m cells: what it stands on, what it is made of, where it fails its people, and what one change would do. It ends with one building. It is built from sixteen tools I made in May and June 2026, and it works for any city on earth.",
  how: "Scroll to move through the story. Click a country to carry it through the first four chapters; search a city, or drag the square, for the rest.",
  chapters: [
    { id: "heat", n: "01", name: "heat", day: "05", kind: "world", act: "why here",
      q: "How many days a year is it too hot to work outside?",
      text: "Days the capital felt hotter than 35 °C, averaged over 2018–22. Move the slider to warm the world. The count climbs fastest where it is already high." },
    { id: "water", n: "02", name: "water", day: "03", kind: "world",
      q: "How much of its water has a country already spent?",
      text: "What a country withdraws, as a share of the freshwater that renews each year. Past 40% is high stress. Past 100%, it is drawing down aquifers, or rivers it shares with its neighbours. Almost everywhere, farms take most of it." },
    { id: "coast", n: "03", name: "coast", day: "06", kind: "world",
      q: "Who lives below the waterline of 2100?",
      text: "The share of each country's people living below the sea level projected for that year, under each emissions pathway, with the sinking of the land added. Fifty-seven countries have published estimates. The rest are blank, not safe." },
    { id: "poly", n: "04", name: "all at once", day: "10", kind: "world",
      q: "What does a country look like with every layer read at once?",
      text: "The polycrisis score ranks every country against every other on seven things: energy, water, food, air, heat, economy and carbon. Then it combines the ranks. Darker is less resilient. It says which countries are exposed. It cannot say where, inside them, to act. For that, zoom in to one city." },

    { id: "c-water", n: "05", name: "the ground", day: "15", kind: "city", act: "what is here",
      q: "Which way does the ground drain?",
      text: "From here on, one city, read as a grid of 150 m cells, one number per cell for each system. Drag the square anywhere, or pull its corner to read more. Start where Ian McHarg started: read the land before you build on it. The contours are the ground's shape; the blue lines are its valleys, where the rain goes whether or not a drain is there. Pour the wettest day of the last five years over it and the darkest tiles are where the water gathers. Switch to where not to build to stack McHarg's reasons." },
    { id: "c-build", n: "06", name: "buildings", kind: "city", tag: "floor area",
      q: "How much city is standing on this ground?",
      text: "A building's footprint times its height gives its floor area. Floor area over the ground of the cell is the cell's floor area ratio: density, the first thing to know about a district. Switch to land use for what the ground is for, or to climate zones for how much heat it keeps." },
    { id: "c-street", n: "07", name: "streets", kind: "city", tag: "space syntax",
      q: "Which streets carry the city?",
      text: "Space syntax reads streets by how much a route turns, not how far it goes. People take the way with the fewest changes of direction, and shops, crowds and buses follow them. The heaviest lines are the through-routes most journeys pass along. Switch to integration to see the streets everything else is easiest to reach from." },
    { id: "c-move", n: "08", name: "mobility", kind: "city", tag: "walk time",
      q: "How far is the nearest bus, train or metro?",
      text: "Walking minutes from every cell to the nearest stop, with the streets around it. Most people will walk five minutes to a bus. Past ten, they take a car or a two-wheeler." },
    { id: "c-energy", n: "09", name: "energy", day: "02 + 14", kind: "city",
      q: "Could the city's roofs power the city?",
      text: "Every roof in the grid, under the sun NASA measured for this point, set against the electricity its floors use. Low, spread-out cells can make more than they need. Tall, dense ones never can. Change what a square metre of floor uses and watch the balance move." },
    { id: "c-heat", n: "10", name: "heat", day: "01 + 16", kind: "city",
      q: "Which blocks keep the heat?",
      text: "A street of roofs and asphalt holds the day's heat into the night; a street of trees lets it go. Each tile weighs what is built and paved against what is green and wet. Below the map, this week's forecast for the place, a normal year's dangerous days, and how far each block is from shade or water." },

    { id: "c-people", n: "11", name: "who is exposed", kind: "city", tag: "meta hrsl", act: "where it fails",
      q: "Who lives with these risks?",
      text: "Everything so far was the city's form. A risk needs people in it. Meta's population grid puts an estimate of who lives in every cell, and four of the chapters' findings are stacked on it: a valley floor, the hottest blocks, too few daily needs within a short walk, and no bus or train nearby." },
    { id: "c-food", n: "12", name: "food", day: "04 + 13", kind: "city",
      q: "Where could this city grow its food?",
      text: "The valley floors that flood a house are the best ground a city has for growing: deep soil, and water that comes to it. Add the open green and the low roofs, plant half, and count the people it could keep in vegetables. Then the old question, how far the walk to buy them is." },
    { id: "p-crop", n: "13", name: "the field", day: "13", kind: "place",
      q: "What will still grow here in 2040?",
      text: "Twenty-five crops, scored against this place's climate today and against a high-resolution climate model for 2030 and 2040. The ones that fall are the ones a farmer should stop betting on." },

    { id: "c-near", n: "14", name: "one more of something", kind: "city", tag: "proximity", act: "what if",
      q: "How much of daily life is a short walk away?",
      text: "A district can be read by three numbers: density, diversity and proximity. Here each tile's shade is how many of eight daily needs sit within five minutes on foot: fresh food, a clinic, a school, a bus or train, a park, shops, somewhere to eat and a civic place. Then the planner's question: where would one more of something help most?" },
    { id: "c-park", n: "15", name: "one park", kind: "city", tag: "mcharg + bowler",
      q: "What would one park change?",
      text: "One change, every system at once. Give a cell to grass and trees and watch three numbers move together: the people in the hottest blocks, the cells where rain pools, the people with a park a short walk away. Against them, the floor the park takes. Let the grid suggest a cell, or put one anywhere." },

    { id: "p-home", n: "16", name: "one building", day: "02 + 14 + 15", kind: "city", act: "one building",
      q: "And what can one building do?",
      text: "Click any cell to read a typical building in it: its roof, its rain, its heat, the ground under it. Below, the three calculators: what panels on that roof would make, whether it could keep the house in water, and how far it is from running on its own." },
  ],
};
