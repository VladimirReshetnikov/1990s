/*
 * LEVEL 3 — The Blade Halls. (Placeholder: to be authored.)
 */
(function (R) {
  'use strict';
  R.defineLevel({
    id: 'blades', order: 3,
    name: 'The Blade Halls',
    subtitle: 'Under construction.',
    width: 8, height: 5,
    music: 'blades',
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
