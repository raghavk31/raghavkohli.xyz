/* perspectives-circle — how a circle mixes strangers.
   TODO: not built yet. Register the real module under the same name; the beat that mounts it is a
   Perspectives `story:` beat with `interaction: true`, and the project needs `interaction: perspectives-circle`.
   Note Perspectives renders through perspectives.njk, not project.njk: its layout would need the
   story branch too before a story shows there. */
(function () {
  "use strict";
  window.StoryInteractions = window.StoryInteractions || {};
  window.StoryInteractions["perspectives-circle"] = {
    mount: function (root) {
      root.innerHTML = '<span class="frame__nojs">(perspectives-circle · not built yet)</span>';
    }
  };
})();
