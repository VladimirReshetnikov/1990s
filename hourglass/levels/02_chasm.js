/*
 * LEVEL 2 — The Chasm of Echoes. (Placeholder: to be authored.)
 */
(function (R) {
  'use strict';
  R.defineLevel({
    id: 'chasm', order: 2,
    name: 'The Chasm of Echoes',
    subtitle: 'Under construction.',
    width: 8, height: 5,
    music: 'chasm',
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
