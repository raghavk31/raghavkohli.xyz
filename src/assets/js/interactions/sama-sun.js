/* sama-sun — a sun slider that prices a household's surplus.
   TODO: not built yet. Register the real module under the same name; the beat that mounts it is a
   Sama `story:` beat with `interaction: true`, and the project needs `interaction: sama-sun`. */
(function () {
  "use strict";
  window.StoryInteractions = window.StoryInteractions || {};
  window.StoryInteractions["sama-sun"] = {
    mount: function (root) {
      root.innerHTML = '<span class="frame__nojs">(sama-sun · not built yet)</span>';
    }
  };
})();
