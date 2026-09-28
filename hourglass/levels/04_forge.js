/*
 * LEVEL 4 — The Forge. (Placeholder: to be authored.)
 */
(function (R) {
  'use strict';
  R.defineLevel({
    id: 'forge', order: 4,
    name: 'The Forge',
    subtitle: 'Under construction.',
    width: 8, height: 5,
    music: 'forge',
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
