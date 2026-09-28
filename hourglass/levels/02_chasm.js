/*
 * LEVEL 2 � The Chasm of Echoes.
 *
 * A natural chasm 34 cells long (x 8..41) and 9 wide (y 6..14), bottomless
 * (the abyss 'A' at the foot of every chasm column), roofed at 13.25. Every
 * chasm column is A / _ / _ / _ / V (V = air up to the roof). The route is one
 * anticlockwise loop you can follow, sconce by sconce, from the tunnel where
 * you start: down the west end, east along the south wall, north across a
 * bridge at the east end, west along the north wall, up to the exit terrace.
 *
 * STOREYS (layers): S0 z=0 (the practice trench; elsewhere only the abyss) �
 * S1 z=1.5 (causeway, rockfall ledge, stepping stones) � S2 z=3.0 (bridge,
 * north climb) � S3 z=4.5 (hang-drop ledge, north run) � S4 z=6.0 (the rim,
 * the exit terrace) � z=7.5 carries only the top of the Echo Arch.
 * Per-layer legends (hints.sN) hold the hint triggers and notes; there, and
 * only there, characters such as 6-9, 0, a, b, c, y mean layer-local things.
 *
 * SET-PIECES (cell coordinates x,y; storey)
 * 2.1 The Rim (S4). Start in a tunnel (2,10) facing east: its mouth frames the
 *     glowing Echo Arch (x20..21, underside 8.5) and two rows of wall sconces
 *     receding down the chasm. The balcony x5..6 y8..13 is sandstone; solid
 *     posts guard its lip at y8..11. Stepping out (trigger at (5,10)) makes
 *     the outer lip x7 y8..10 crumble tile by tile into the abyss: a long
 *     whistle, no landing.
 * 2.2 Hand over Hand. Walk off the balcony at y12..13 onto the S3 ledge
 *     x7..9 y11..14 (1.5, safe; it reaches 3 cells out so you can see it from
 *     the rim). From its east lip hang-drop 2 storeys onto the wide S1 ledge
 *     x10..14 y11..14 (walking off costs a life; a potion and a skeleton wait
 *     there). Brazier 1 at (13,14).
 * 2.3 The Broken Causeway (S1, y12..13, heading east over the abyss):
 *     1-gap x15 (standing jump) -> pier A x16..18 (skid marks) -> 2-gap
 *     x19..20 (running jump) -> pier B x21..23 -> 3-gap x24..26 (running
 *     catch) -> the 3x3 landing x27..29 y12..14. A fall kills; brazier 1 is
 *     ten seconds back. Secret: from pier B (22,13) a standing jump south over
 *     (22,14) into the L-shaped alcove (22,15)+x21..23 y16: the great potion.
 * 2.4 The Rockfall Ledge (S1, x30..38 y13..14) under a 2.75-high overhang.
 *     Rocks hit both lanes of x31, x34, x37 (period 3.6; hits 0.9 s apart,
 *     west to east). Watch a cycle from the landing; set off while a column
 *     trickles dust and its rock gets you (-1). Alcoves x32..33 (gem) and
 *     x35..36 at y15. Potion at (38,14); climb south onto the bridgehead.
 * 2.5 The Crumbling Bridge (S2). Bridgehead x38..41 y15..16 (brazier 2, a
 *     note). The bridge runs north along x40 from y14 to y6 with a 1-gap at
 *     y10; seen from below on the way, sand trickling from (40,12) and (40,8).
 *     It is solid until your centre enters (40,13); then the whole span
 *     crumbles from the south end, tile i (i = 14 - y) dropping 0.3 + i/3.5 s
 *     later - a 3.5 u/s wave. Runners escape; walkers, anyone who stops, and
 *     anyone who turns back fall. Nothing short of (40,13) can strand you.
 *     It lands on the north landing x39..41 y4..5 (S2).
 * 2.6 Stepping Stones and the Far Top. Drop west to the S1 ledge x36..38
 *     y4..6 (3 cells: a running drop cannot overshoot it). Two practice
 *     stones (x34, x32) bob over the S0 trench x31..35 y4..5, walled off from
 *     the chasm (a fall is safe; climb out; a gem lies at (33,4)). Brazier 3
 *     on the west ledge x29..30 y4..6. Six stones bob over the abyss along y6
 *     (x27, 25, 23, 21, 19, 17; period 4.8, tops 1.1..1.9, each 0.6 s behind
 *     the last so a crest runs west with you): careful to each edge, standing
 *     jump, seven times, onto the landing x13..15 y3..6 (brazier 4, potion).
 *     Climb west to the S2 ledge x10..12 y5..6, north to the S3 run x10..12
 *     y3..4, then run east and catch the lip across the 3-gap x13..15 at
 *     x16..18 (a miss drops you 3.0 onto the landing: -1, climb again).
 *     Climb east onto the S4 terrace x19..25 y3..5 (posts along its lip);
 *     the plates across x23 open the exit arch (26,3..4); exit x27..28.
 *
 * ROUTE: tunnel -> balcony -> walk off -> hang-drop -> brazier 1 -> three
 * causeway jumps -> watch the rocks -> rockfall ledge -> climb -> brazier 2
 * -> run the bridge -> drop -> practice stones -> brazier 3 -> six stones ->
 * brazier 4 -> climb, climb, run and catch -> climb -> plate -> exit.
 * A frame-perfect bot finishes in 83 s; good human play is about 2 minutes.
 */
(function (R) {
  'use strict';
  const { HG } = R;
  const U = R.util, H = R.texHelpers, T = R.defTexture, S = R.defSprite;

  // ------------------------------------------------------------ textures
  T('CHASM_ROCK', { gen: (p, c) => H.voronoi(p, c, { n: 13, base: '#6a5846', edge: '#1c140c', edgeW: 1.5, round: 10, vary: 0.22, grain: 0.45 }) });
  T('CHASM_CEIL', { gen: (p, c) => H.voronoi(p, c, { n: 16, base: '#3e342a', edge: '#120e0a', edgeW: 1.6, round: 8, vary: 0.25, grain: 0.5 }) });
  // dark rock furred with glowing lichen; drawn full-bright so it reads from across the chasm
  T('CHASM_FUNGUS', {
    emissive: true,
    gen(p, c) {
      H.voronoi(p, c, { n: 13, base: '#2a221a', edge: '#0c0a08', edgeW: 1.5, round: 10, vary: 0.3, grain: 0.4 });
      const r = c.rng;
      for (let k = 0; k < 6; k++) {
        const x = r() * 64, y = r() * 64, n = 5 + ((r() * 7) | 0);
        for (let i = 0; i < n; i++) {
          const a = r() * 6.283, d = r() * 7;
          p.disc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 0.8 + r() * 1.6, r() < 0.35 ? '#b0fff4' : r() < 0.7 ? '#40c8b0' : '#248a7a');
        }
      }
    },
  });
  T('CHASM_PILLAR', { gen: (p, c) => H.blocks(p, c, { base: '#8a6a46', mortar: '#2a1c10', bw: 32, bh: 16, cracks: 0.55, grain: 0.4 }) });
  const edged = (p, col) => { p.frame(0, 0, 64, 64, col); p.frame(1, 1, 62, 62, col); };
  T('CHASM_LEDGE', { gen(p, c) { H.voronoi(p, c, { n: 9, base: '#726048', edge: '#2a2016', edgeW: 1.2, vary: 0.2, grain: 0.35 }); edged(p, '#3a2c1c'); } });
  T('CHASM_FLAGS', {
    gen(p, c) {
      H.blocks(p, c, { base: '#a88a5e', mortar: '#4a3620', bw: 32, bh: 32, cracks: 0.25, grain: 0.3 });
      p.frame(0, 0, 64, 64, '#5a3e20'); p.frame(3, 3, 58, 58, '#c8a870');
    },
  });
  T('CHASM_CAUSEWAY', { gen(p, c) { H.blocks(p, c, { base: '#9a7c54', mortar: '#3a2a18', bw: 32, bh: 32, cracks: 0.6, grain: 0.35 }); edged(p, '#3a2a18'); } });
  // run-up: dark skid streaks along the direction of the jump (world x)
  T('CHASM_SKID', {
    gen(p, c) {
      c.call('CHASM_CAUSEWAY', p);
      const r = c.rng;
      for (let k = 0; k < 6; k++) { const y = 8 + r() * 48, x = r() * 20, l = 24 + r() * 30; p.rect(x, y, l, 2, '#3a2412', 0.8); p.rect(x + 4, y + 2, l - 8, 1, '#5a3a20', 0.6); }
    },
  });
  T('CHASM_BRIDGE', {
    gen(p, c) {
      H.blocks(p, c, { base: '#a08660', mortar: '#3a2818', bw: 64, bh: 32, cracks: 0.9, grain: 0.3 });
      const r = c.rng;
      for (let k = 0; k < 7; k++) { let x = 6 + r() * 52, y = 6 + r() * 52; for (let i = 0; i < 18; i++) { p.px(x, y, '#140c06'); x += r() * 3 - 1.5; y += r() * 3 - 1.5; } }
      edged(p, '#2a1c10');
    },
  });
  T('CHASM_STONE', { gen(p, c) { H.voronoi(p, c, { n: 6, base: '#a08058', edge: '#3a2814', edgeW: 1.3, vary: 0.15, grain: 0.3 }); edged(p, '#e0c080'); } });

  // ------------------------------------------------------------ sprites
  S('CHASM_POST', {
    w: 16, h: 40, scale: 0.75,
    gen(p) {
      const s = '#b89868', d = '#6a5030', l = '#e0c898';
      p.rect(1, 34, 14, 6, d); p.rect(2, 33, 12, 2, s);
      p.rect(4, 12, 8, 21, s); p.rect(4, 12, 2, 21, l); p.rect(10, 12, 2, 21, d);
      p.ellipse(8, 22, 6, 6, s); p.ellipse(6, 20, 2, 3, l);
      p.rect(1, 4, 14, 8, s).bevel(1, 4, 14, 8, 1.25, 0.6); p.rect(3, 0, 10, 4, d);
    },
  });
  S('CHASM_SHROOMS', {
    w: 28, h: 16, scale: 1.2, emissive: true,
    gen(p) {
      const caps = [[5, 9, 4], [12, 6, 5], [20, 10, 4], [24, 12, 3], [9, 12, 3]];
      for (const [x, y, r] of caps) { p.rect(x - 1, y, 2, 16 - y, '#6aa8a0'); p.ellipse(x, y, r, r * 0.6, '#30c0a8'); p.ellipse(x - 1, y - 1, r * 0.5, r * 0.3, '#b0fff4'); }
    },
  });
  S('CHASM_CHAIN', {
    w: 6, h: 128, scale: 2.0, hang: true,
    gen(p) {
      for (let y = 0; y < 120; y += 6) { if ((y / 6) % 2) p.rect(2, y, 2, 7, '#5a5a60'); else p.rect(1, y, 4, 7, '#3a3a40').rect(2, y + 2, 2, 3, '#101014'); }
      p.poly([[3, 116], [6, 122], [3, 128], [1, 124], [3, 122]], '#6a6a70');
    },
  });

  // a big wall sconce for the chasm walls (the stock torch is too small to read 20 cells away)
  S('CHASM_SCONCE', {
    w: 16, h: 30, scale: 1.8, emissive: true, frames: 3, fps: 9,
    gen(p, c) {
      p.poly([[3, 17], [13, 17], [11, 23], [5, 23]], '#6a5a4a'); p.rect(2, 16, 12, 2, '#9a8a70'); p.rect(7, 23, 2, 7, '#4a3a2a');
      const r = U.rng(11 + c.frame * 5);
      for (let y = 0; y < 16; y++) { const w = Math.sin(((y + 1) / 17) * Math.PI) * 5 * (0.7 + r() * 0.5); p.rect(8 - w, y, w * 2, 1, y < 5 ? '#ffe070' : y < 10 ? '#ff9020' : '#e04010'); }
      p.rect(7, 8, 2, 6, '#fff0a0');
    },
  });
  // sand and pebbles trickling from a cracked slab
  S('CHASM_TRICKLE', {
    w: 10, h: 96, scale: 1.0, frames: 4, fps: 10, emissive: true,
    gen(p, c) {
      const r = U.rng(21 + c.frame * 13);
      for (let i = 0; i < 70; i++) { const y = (r() * 96 + c.frame * 6) % 96, x = 3 + r() * 4 + Math.sin(y * 0.2) * 0.8; p.px(x, y, r() < 0.3 ? '#a89878' : r() < 0.6 ? '#7a6448' : '#5a4834'); }
      for (let i = 0; i < 6; i++) { const y = (r() * 90 + c.frame * 11) % 90; p.rect(3 + r() * 3, y, 2, 2, '#8a7050'); }
    },
  });

  // a stone falling out of hearing
  R.sfx.register('CHASM_WHISTLE', (A, o, v) => {
    A.tone({ type: 'sine', f0: 1500, f1: 260, dur: 2.8, vol: 0.09 * v, attack: 0.05 }, o);
    A.noise({ dur: 2.4, f0: 2400, f1: 500, filter: 'bandpass', q: 5, vol: 0.05 * v, attack: 0.3 }, o);
  });

  // ------------------------------------------------------------ legend
  const ent = (e, extra) => Object.assign({ base: 'auto', ent: e }, extra || {});
  const say = (text, extra) => ent({ type: 'trigger', text, radius: 0.7, time: 6 }, extra);
  const deco = (sprite, extra) => Object.assign({ type: 'deco', sprite }, extra || {});
  const torch = (dx, dy) => ent(deco('TORCH', { z: 0.55, radius: 0.1, dx, dy }), { light: 25, anim: { type: 'flicker', depth: 3 } });
  const post = (dx, dy) => deco('CHASM_POST', { solid: true, radius: 0.3, height: 0.8, dx, dy });
  const rock = phase => ent({ tpl: 'rock', phase });
  const floor = (extra) => Object.assign({ base: '.', music: 'chasm', ftex: 'CHASM_LEDGE', ctex: 'CHASM_CEIL', wall: 'CHASM_ROCK', low: 'CHASM_ROCK', up: 'CHASM_ROCK', light: 18 }, extra);
  const air = (extra) => Object.assign({ pit: true, cl: 1.25, ftex: 'ABYSS', ctex: 'CHASM_CEIL', wall: 'CHASM_ROCK', low: 'CHASM_ROCK', up: 'CHASM_ROCK', light: 18 }, extra);
  // stepping stone: a pillar whose top bobs 0.8 (from 0.4 under the storey to 0.4 over it)
  const stone = (phase, extra) => floor(Object.assign({ fl: -0.4, cl: 1.25, ftex: 'CHASM_STONE', wall: 'CHASM_PILLAR', low: 'CHASM_PILLAR', light: 22, label: 'The Stepping Stones', anim: { type: 'bob', period: 4.8, amp: 0.8, phase } }, extra));
  // a plate across the whole terrace opens the exit arch for good
  const exitPlate = extra => Object.assign(HG.plate({ opens: 'exit', msg: 'Click! At the end of the terrace, the exit arch grinds open.' }), { music: 'chasm', cl: 2.75, wall: 'SANDSTONE', light: 25, label: 'The Far Top' }, extra);
  const bridge = extra => floor(Object.assign({ ftex: 'CHASM_BRIDGE', tag: 'bridge', low: 'CHASM_PILLAR', light: 22, label: 'The Crumbling Bridge' }, extra));

  const legend = {
    // air and rock
    'A': air({ abyss: true, light: 24 }),                               // foot of a chasm column: bottomless
    'V': air({ cl: 7.25 }),                                     // top of a chasm column: roof at 13.25
    'g': air({ light: 16 }),                                    // top of a cleft in the north wall (roof at 7.25)
    '-': air({ up: 'CHASM_PILLAR', light: 16 }),                // air under a bridge slab (the slab's edge)
    'w': { solid: true, wall: 'CHASM_ROCK' },
    '&': { solid: true, wall: 'CHASM_FUNGUS' },
    'I': { solid: true, wall: 'CHASM_PILLAR' },
    '"': Object.assign(air({ cl: 7.25 }), { ent: deco('CHASM_CHAIN', { hang: true }) }),   // a chain hangs from the roof

    // 2.1 the rim
    'D': floor({ ftex: 'DUNGEON_FLOOR', ctex: 'CEIL_DUNGEON', wall: 'DUNGEON_WALL', light: 13, label: 'The Rim' }),
    '@': floor({ ftex: 'DUNGEON_FLOOR', ctex: 'CEIL_DUNGEON', wall: 'DUNGEON_WALL', light: 13, label: 'The Rim', start: 'E' }),
    'R': floor({ ftex: 'CHASM_FLAGS', cl: 4.25, wall: 'SANDSTONE', light: 22, label: 'The Rim' }),
    'p': floor({ ftex: 'CHASM_FLAGS', cl: 4.25, wall: 'SANDSTONE', light: 22, label: 'The Rim', ent: post(0.35, 0) }),
    'k': floor({ ftex: 'LOOSE_FLAT', cl: 7.25, loose: { delay: 0.9 } }),       // the outer lip (lipFalls crumbles it)

    // 2.2 hand over hand
    'h': floor({ light: 21, label: 'Hand over Hand' }),
    'W': floor({ light: 21, label: 'Hand over Hand' }),

    // 2.3 the broken causeway (and the secret alcove)
    'u': floor({ ftex: 'CHASM_CAUSEWAY', low: 'CHASM_PILLAR', light: 21, label: 'The Broken Causeway' }),
    'K': floor({ ftex: 'CHASM_SKID', low: 'CHASM_PILLAR', light: 21, label: 'The Broken Causeway' }),
    'S': floor({ ftex: 'CHASM_FLAGS', wall: 'SANDSTONE_DARK', light: 14, secret: true, label: null }),

    // 2.4 the rockfall ledge
    'Z': floor({ light: 25, label: 'The Rockfall Ledge' }),
    'F': floor({ cl: 2.75, light: 17, label: 'The Rockfall Ledge' }),
    'J': rock(0.4), 'M': rock(0.15), 'X': rock(0.9),   // a rock hits at 0.4 of its period: x31 at 0, x34 at 0.9, x37 at 1.8 s of the 3.6 s beat
    'Y': floor({ light: 15, label: null }),

    // 2.5 the crumbling bridge
    'H': floor({ ftex: 'CHASM_FLAGS', cl: 2.75, wall: 'SANDSTONE', light: 25, label: 'The Crumbling Bridge' }),
    '=': bridge(),
    '/': bridge({ enter: 'crumble' }),
    '|': bridge({ ent: deco('CHASM_TRICKLE', { z: -1.75, radius: 0.1 }) }),   // sand trickles from under the slab

    // 2.6 stepping stones and the far top
    'N': floor({ ftex: 'CHASM_FLAGS', cl: 2.75, wall: 'SANDSTONE', light: 25, label: 'The Crumbling Bridge' }),
    'n': floor({ cl: 2.75, light: 21, label: 'The Stepping Stones' }),
    't': floor({ cl: 4.25, light: 15, label: 'The Stepping Stones' }),
    'm': floor({ cl: 2.75, light: 23, label: 'The Stepping Stones' }),
    'q': stone(0, { cl: 2.75 }), 'r': stone(7 / 8, { cl: 2.75 }),               // practice stones (over the trench)
    'a': stone(0), 'b': stone(7 / 8), 'c': stone(6 / 8), 'd': stone(5 / 8), 'e': stone(4 / 8), 'f': stone(3 / 8),
    'v': floor({ light: 23, label: 'The North Wall' }),
    's': floor({ light: 21, label: 'The North Wall' }),
    'i': floor({ light: 21, label: 'The North Wall' }),
    'j': floor({ cl: 2.75, light: 22, label: 'The North Wall' }),
    'z': floor({ ftex: 'CHASM_FLAGS', cl: 2.75, wall: 'SANDSTONE', light: 25, label: 'The Far Top' }),
    'U': floor({ ftex: 'CHASM_FLAGS', cl: 2.75, wall: 'SANDSTONE', light: 25, label: 'The Far Top', ent: post(0, 0.35) }),
    '$': exitPlate(),
    '<': HG.gate('exit', { music: 'chasm', wall: 'SANDSTONE', light: 22, door: { msg: 'The exit arch is shut. There was a plate on the terrace...' } }),
    '>': { base: 'E', exit: true, music: 'chasm', wall: 'SANDSTONE', light: 28 },

    // things that stand on the floor around them
    '[': torch(-0.42, 0), ']': torch(0.42, 0), '{': torch(0, -0.42), '}': torch(0, 0.42),
    '*': ent(deco('CHASM_SHROOMS', { radius: 0.1 }), { light: 21 }),
    '(': ent(deco('SKELETON', { radius: 0.1 })),
    ')': ent([deco('BONES', { radius: 0.1, dx: -0.15 }), deco('SKULL', { radius: 0.1, dx: 0.2, dy: 0.15 })]),
  };
  // hints, notes and layer-only pieces, per storey: these characters mean different things on different layers
  const hints = {
    s0: {},
    s1: {
      '8': say('Two tiles of nothing: run the length of the pier and jump at the edge.'),
      '9': say('Three tiles: too far to land. Keep FORWARD held and catch the far lip.'),
      "'": say('Dust trickles from the overhang. The rocks fall on a beat: watch, then go.'),
      '?': say('Stones rise and sink over the trench. Stop on each one, step to its edge, and jump.'),
      '`': say('Now the stones stand over the abyss. Stop, step to the edge, jump - one at a time.'),
      'y': HG.note('SCRATCHED BY THE BRAZIER', 'One step.\nA run.\nA leap - and hold on.\n\nThe abyss keeps what it takes.'),
    },
    s2: {
      'y': HG.note('CUT INTO THE BRIDGEHEAD', 'The bridge of Iskandar bears only the swift.\n\nOnce you set foot on it, run.\nDo not stop. Do not turn back.'),
    },
    s3: {
      '7': say('Two storeys is too far to fall. Hold C and walk to the edge, press FORWARD again to hang... then let go.'),
      '\\': say('Three tiles again. Run, jump, and hold on.'),
    },
    s4: {
      // sconces high on the chasm walls (hung in the air columns, their flames about 7.0 up: a storey over the rim)
      '8': Object.assign(air({ cl: 7.25 }), { ent: deco('CHASM_SCONCE', { hang: true, drop: 5.4, dy: -0.44, radius: 0.1 }) }),
      '9': Object.assign(air({ cl: 7.25 }), { ent: deco('CHASM_SCONCE', { hang: true, drop: 5.4, dy: 0.44, radius: 0.1 }) }),
      // the Echo Arch, a natural rock bridge across the chasm high over the route (underside 8.5, top 10.0)
      'a': air({ cl: 2.5 }),
      'c': Object.assign(air({ cl: 2.5 }), { ent: deco('CHASM_CHAIN', { hang: true }) }),   // a chain hangs from the arch
      '0': ent({ type: 'trigger', script: 'lipFalls', radius: 0.7 }),
      '7': exitPlate({ ent: post(0, 0.35) }),
      'b': floor({ ftex: 'CARPET_PERSIAN', cl: 2.75, wall: 'SANDSTONE', light: 25, label: 'The Far Top' }),   // the palace's carpet reaches the terrace
      '6': say('The rim is lower here. Walk off the edge: one storey is a safe drop.'),
    },
    s5: {
      'a': floor({ fl: 2.5, cl: 5.75, light: 12, label: null, low: 'CHASM_FUNGUS' }),   // the top of the Echo Arch (10.0): nobody walks here; its flanks glow
    },
  };

  R.defineLevel({
    id: 'chasm', order: 2,
    name: 'The Chasm of Echoes',
    subtitle: 'A crack in the world beneath the palace, older than the Sultans.',
    width: 44, height: 19,
    music: 'chasm',
    startMessage: 'Cold air breathes from the dark ahead. Somewhere far across the chasm, torches burn.',
    legend,
    layers: [
      { z: 0.0, legend: hints.s0, map: [
        '                                            ',
        '                                            ',
        '                                            ',
        '          wwwwwwwwwwwwwwwwwww wwwwwww       ',
        '          wwwwwwwwwwwwwwwwwwwwwtwGwtwwwwww  ',
        '       wwwwwwwwwwwwwwwwwwwwwwwwtwtw)wwwwwww ',
        '       wAAwwwwwwAIAIAIAIAIAIAwwwwwwwwwwAAAw ',
        '      wwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw ',
        '      wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw ',
        '      wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw ',
        '      wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAw ',
        '      wwwwwwwwwAAAAAAAAAAAAAAAAAAAAAAAAAAAw ',
        '       wwwwwwwwAIIIAAIIIAAAwwwAAAAAAAAAAAAw ',
        '       wwwwwwwwAIIIAAIIIAAAwwwwwwwwwwwwAAAw ',
        '       wwwwwwwwAAAAAAAAAAAAwwwwwwwwwwwwAAAw ',
        '              wwwwwwwwwwwwww    ww ww wwwww ',
        '                     www              wwww  ',
        '                                            ',
        '                                            ',
      ] },
      { z: 1.5, legend: hints.s1, map: [
        '                                            ',
        '                                            ',
        '            wwwww                           ',
        '          wwwv{Cwwwwwwwwwwwwwwwwwwwwwwww    ',
        '          wwwvvvwwwwwwwwwwwwwC{wrwqw{nnwww  ',
        '       wwwwwwvv*&&&&&&&&&&&&&mmwrwqwn?nwwww ',
        '       w__wwwPvv_f_e_d_c_b_a_m`wwwwwnnn_-_w ',
        '      ww________________________________-_w ',
        '      w_________________________________-_w ',
        '      w_________________________________-_w ',
        '      w___________________________________w ',
        '      wwwwWW*WW_________________________-_w ',
        '       wwwWPWWW_u8K__u9K___ZZ)__________-_w ',
        '       www(WWWW_uK*__uK*___\'ZZFJFFMFFXF_-_w ',
        '       wwwW}WCy____________Z}Z}JFFMFFXP_-_w ',
        '         wwwwwwwwwwwwwSwwwwwwwwwYGwY}wwwwww ',
        '                    w(SBw      wwwwwwwwwww  ',
        '                    wwwww                   ',
        '                                            ',
      ] },
      { z: 3.0, legend: hints.s2, map: [
        '                                            ',
        '                                            ',
        '            wwwww                           ',
        '          www___wwwwwwwwwwwww         wwwww ',
        '         wwww___wwwwwwwwwwwwwwwwwwwwwwwN{Nw ',
        '       wwws*s___&&&&&&&&&&&&&wwwwwwwwwwNNNw ',
        '       w__sss__________________wwwww____=_w ',
        '      ww________________________________=_w ',
        '      w_________________________________|_w ',
        '      w_________________________________=_w ',
        '      w___________________________________w ',
        '      wwww______________________________=_w ',
        '       www______________________________|_w ',
        '       www____________________wwwwwwwww_/_w ',
        '       www____________________wwwwwwwww_=_w ',
        '         wwwwwwwwwwwwwwwwwwwwww ww wwwH)H]w ',
        '                     www             wC}Hyw ',
        '                                     wwwwww ',
        '                                            ',
      ] },
      { z: 4.5, legend: hints.s3, map: [
        '                                            ',
        '                                            ',
        '         wwwwwwwwwww                        ',
        '         wi{i___j{jwwwwwwwwww               ',
        '         w\\ii___jjjwwwwwwwwwwwwwwwwwwwwwww  ',
        '       www______wwwwwwwwwwwwwwwwwwwwwwwwwww ',
        '       w_______________________wwwww______w ',
        '      ww__________________________________w ',
        '      w-__________________________________w ',
        '      w-__________________________________w ',
        '      w-__________________________________w ',
        '      w*hh________________________________w ',
        '      whh7________________________________w ',
        '      whhh____________________wwwwwwwww___w ',
        '      wh}h____________________wwwwwwwww___w ',
        '      wwwwwwwwwwwwwwwwwwwwwwwww ww ww wwwww ',
        '                     www              wwww  ',
        '                                            ',
        '                                            ',
      ] },
      { z: 6.0, legend: hints.s4, map: [
        '                                            ',
        '                                            ',
        '            wwwww wwwwwwwwwwww              ',
        '          wwwgggwwwz{zz${z<>>w              ',
        '         wwwwgggwwwbbbb$bb<>>wwwwwwwwwwwww  ',
        '       wwwggggggwwwUUUU7UUwwwwwwwwwwwwwwwww ',
        '       wV8VVVV8VVV8VaaV8VV8VVV8wwwwwVV8VVVw ',
        '    %%%wVVVVVVVVVVVVaaVVVVVVVVVVVVVVVVVVVVw ',
        '    %[pkVVVVVVVVVVVVcaVVVV"VVVVVVVVVVVVVVVw ',
        '    %RpkVVVV"VVVVVVVaaVVVVVVVVVVVVVVV"VVVVw ',
        ' D@{D0pkVVVVVVVVVVVVaaVVVVVVVVVVVVVVVVVVVVw ',
        '    %RpVVVVVVVVVVVVVacVVVVVVVVVVV"VVVVVVVVw ',
        '    %6RVVVVVVVVVVVVVaaVVVVVVVVVVVVVVVVVVVVw ',
        '    %[RVVVVVVVVVVVVVcaVVVVVVVVwwwwwwwwwVVVw ',
        '    %%%VVVVV9VVV9VV9aaVV9VVV9Vwwwwwwwww9VVw ',
        '      wwwwwwwwwwwwwwwwwwwwwwwww ww ww wwwww ',
        '                     www              wwww  ',
        '                                            ',
        '                                            ',
      ] },
      { z: 7.5, legend: hints.s5, map: [
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwaawwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
        'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
      ] },
    ],
    scripts: {
      /** The lip beyond the posts crumbles, tile by tile, into the abyss: nothing ever lands. */
      lipFalls(g) {
        [10, 9, 8].forEach((y, i) => {
          const c = g.world.cellAt(7, y);
          const s = c && c.spans.find(q => q.loose && q.loose.state === 'idle');
          if (!s) return;
          s.loose.delay = 0.7 + 0.45 * i;
          g.after(0.1 + 0.3 * i, gg => gg.triggerLoose(s));
        });
        g.after(1.2, gg => gg.sound('CHASM_WHISTLE', 7.5, 9.5, 1, 4));
        g.after(3.2, gg => gg.msg('The lip of the rim breaks away and falls... and falls. You never hear it land.', 5));
      },
      /**
       * The crumbling bridge: when you reach its second tile the whole span starts
       * to give way from the south end, a wave at 3.5 u/s (tile i drops 0.3 + i/3.5 s
       * later). The tiles are solid until then, so nothing can strand you short of it.
       */
      crumble(g) {
        const tiles = g.spansTagged('bridge');
        if (tiles.some(s => s.loose)) return;
        for (const s of tiles) {
          const i = 14 - s.cell.y;
          s.loose = { delay: 0.3 + i / 3.5, state: 'shaking', t: 0 };
          g.spansWith.loose.push(s);
        }
        g.sound('rattle', 40.5, 13.5, 1, 3);
        g.sound('rumble', 40.5, 12.5, 1, 3);
        g.shake(0.25);
      },
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
