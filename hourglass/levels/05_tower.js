/*
 * LEVEL 5 — The Vizier's Tower. (Placeholder: to be authored.)
 */
(function (R) {
  'use strict';
  R.defineLevel({
    id: 'tower', order: 5,
    name: "The Vizier's Tower",
    subtitle: 'Under construction.',
    width: 8, height: 5,
    music: 'tower',
    legend: { '@': { base: '.', start: 'E' } },
    layers: [
      { z: 0, map: [
        '########',
        '#......#',
        '#@...EE#',
        '#......#',
        '########',
      ] },
    ],
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
