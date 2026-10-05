// The data each story interaction is mounted with, by the name a project's `interaction:` gives.
// project.njk embeds it as JSON beside the beat; the module (src/assets/js/interactions/<name>.js)
// reads it on mount. An interaction with no data here is mounted with null.
module.exports = {
  "koliwadas-map": require("./koliwadas.js"),
};
