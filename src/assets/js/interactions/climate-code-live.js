/* climate-code-live — one of the thirty Climate Code tools, embedded or linked, live.
   TODO: not built yet. Register the real module under the same name; the beat that mounts it is a
   Climate Code `story:` beat with `interaction: true`, and the project needs `interaction: climate-code-live`. */
(function () {
  "use strict";
  window.StoryInteractions = window.StoryInteractions || {};
  window.StoryInteractions["climate-code-live"] = {
    mount: function (root) {
      root.innerHTML = '<span class="frame__nojs">(climate-code-live · not built yet)</span>';
    }
  };
})();
