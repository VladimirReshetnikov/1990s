/*
 * LEVEL 1 — The Cells (tutorial, and the reference example for level authors).
 *
 * Two storeys: z = 0 (lower dungeon) and z = 1.5 (upper). You start in a cell on
 * the upper layer; its cracked floor gives way and drops you to the corridor
 * below. A plate opens a gate; ledges in a tall hall teach climbing; pits over
 * a catch corridor teach jumping (falling is safe and loops back); spikes teach
 * the careful step; a timed plate/gate guards the exit.
 */
(function (R) {
  'use strict';
  const ent = (e, extra) => Object.assign({ base: 'auto', ent: e }, extra || {});
  const gate = tag => R.HG.gate(tag, { door: { msg: 'A portcullis. There must be a pressure plate somewhere.' } });
  const say = text => ent({ type: 'trigger', text, radius: 0.7 });

  R.defineLevel({
    id: 'cells', order: 1,
    name: 'The Cells',
    subtitle: 'Below the palace, where the Vizier keeps those who know too much.',
    width: 36, height: 16,
    music: 'cells',
    startMessage: 'The flagstones of your cell are cracked... Walk forward. (Arrows move; hold SHIFT to walk slowly.)',
    legend: {
      '@': { base: '.', start: 'E', label: 'Your Cell' },
      'H': { base: '.', fl: 1.0, cl: 2.75, low: 'SANDSTONE', label: 'The Hall of Ledges' },
      ',': { base: '.', cl: 2.75, label: 'The Hall of Ledges', light: 16 },
      '|': gate('g1'),
      '/': gate('g2'),
      '=': { base: '.', ftex: 'PLATE_FLAT', plate: { opens: 'g1', hold: 6, msg: 'Click! A pressure plate. Somewhere a gate grinds open.' } },
      '*': { base: '.', ftex: 'PLATE_FLAT', plate: { opens: 'g2', hold: 5, msg: 'Click! The exit gate rises - but it will not stay open long. Run!' } },
      'a': say('A ledge. Walk up to it and press SPACE to climb.'),
      'b': say('A pit. Walk up to it and press SPACE to jump over it.'),
      'c': say('Two tiles wide - you will need a running jump: run at it and press SPACE. If you fall, you can climb back up.'),
      'N': ent({ type: 'note', title: 'SCRATCHED INTO THE WALL', text: 'Spikes spring up when you come near.\n\nHold C and step slowly between them.' }),
    },
    layers: [
      { z: 0, map: [
        '                                    ',
        '                                    ',
        '              ,,,,HH                ',
        '              ,,,,HH                ',
        '   ..T...|...G,,,,HH                ',
        '   ....=.|....a,,,HH...........     ',
        '              ,,,,HH..........B     ',
        '              ,,T,HH                ',
        '              ,,,,HH                ',
        '                                    ',
        '                                    ',
        '                                    ',
        '                                    ',
        '                                    ',
        '                                    ',
        '                                    ',
      ] },
      { z: 1.5, map: [
        '                                    ',
        '                                    ',
        '  ....                              ',
        '  ...T                              ',
        '  @.o.                              ',
        '  ....              .b._c..__.....  ',
        '                    ..._..G__.C...  ',
        '                                ..  ',
        '                                N.  ',
        '                                ..  ',
        '                                ^^  ',
        '                                ..  ',
        '                                ^^  ',
        '                       EEEE/....*.  ',
        '                       EEEE/......  ',
        '                                    ',
      ] },
    ],
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
