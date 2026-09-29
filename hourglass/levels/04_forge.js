/*
 * LEVEL 4 — The Forge.
 *
 * The Vizier's foundry: a lava cavern (x 13..37, y 6..27), nine units from the lava to
 * the roof, lit by its own lake and ringed by halls. Aladdin comes in high on the west
 * wall, works down to the casting floor, round through the bellows, up the chain lifts,
 * along the east gallery to the slag pools, back west through the ore chute, out along
 * the flame causeway to the island of the Great Anvil for the Silver Key, leaps back to
 * the casting floor and rides the Vizier's own lift up towards the tower.
 *
 * STOREYS (layer z)
 *   S0 0.0  the lava lake (surface -0.5), the casting floor, the bellows, the foot of lift A
 *   S1 1.5  the shelf below the catwalk, the island (plaza, hammer house, anvil yard),
 *           the silver door, the Vizier's chamber and the foot of his lift
 *   S2 3.0  the cooled slag pit; the crucible on the hammer house roof (molten, at 3.5)
 *   S3 4.5  the start, the catwalk, the balcony and lift B, the east gallery, the slag
 *           pools, the foot of the ore chute
 *   S4 6.0  the top of the ore chute, the flame causeway, the top of the anvil lift
 *   S5 7.5  the exit. The cavern roof is at 8.75.
 *
 * SET-PIECES (cell x, y)
 *   4.1 The Glow. Start in the Forge Gate (5,12) S3. A barred window (7..8, 11) looks into
 *       the ore chute and its hopper: boulders rumble down and drop in (4.5, shown first).
 *       The catwalk (13..18, 12..13) runs out over the lava; passing (14,12) cracks a
 *       flagstone at its edge (16,11) (g.crumble) and the lava swallows it. A hint at (15,13)
 *       teaches the hang-drop from the catwalk's south edge to the shelf (13..18, 14..20) S1
 *       (3.0: a hang-drop is safe, walking off costs a life); the silver door (12,19) is in
 *       sight. Walk off one storey to the casting floor, crossing the lava channel x 21 on
 *       its 2-wide iron bridge (21, 23..24). No jumps yet. C1 (32,25).
 *   4.2 The Bellows (S0, y 29..32). Two demonstration vents (33,31) (35,31) in dead-end
 *       pockets of the south lane, walked beside on the north lane (32..36, 30): plaque,
 *       bellows, charred bones on the first grille. Then the lane of alternate vents (38,31)
 *       (40,31), 0.9 s of flame every 2.4 s, crossed one per breath; then the 4x3 A/B
 *       checkerboard (42..45, 30..32) puffing 0.6 s: hop one cell per breath, starting just
 *       before the next cell goes out (~0.4 s windows; walking straight through burns).
 *       Potion (47,31).
 *   4.3 Chain Lifts. Lift A (47,22), S0 <-> S3, waits 2.4 s at each stop, 18 s round.
 *       C2 (45,21). The lever (38,20) raises lift B (37,19) out of the lava to S3; a standing
 *       jump from the balcony (37,21) over one cell of lava onto B; B onto the east gallery
 *       (37, 6..18) S3, where three cracked flags (37, 13..15) fall 0.7 s after you touch
 *       them: keep walking (if they go, a running jump catches the far lip). Neither lift
 *       can crush: both rise in open air.
 *   4.4 Slag Stones (S3, y 1..4). Practice over the cooled slag pit (S2, climb out
 *       anywhere): stones (34,2) (30,2) and a sinker (32,2) that bubbles, then lowers you
 *       gently into the pit. Note; the hidden great potion is under the east bank (36,1) S2.
 *       C3 (28,3). Then six stones over lava, x 25 23 21 19 17 15 on y 2: the 3rd (21,2)
 *       and the 5th (17,2) go under (4.8 s cycle: 1.2 s of lava, bubbling for 0.9 s
 *       before; they go under 1.8 s apart). Potion (13,1).
 *   4.5 The Ore Chute. A 2-wide stepped trench (7..8, 2..9), S3 at the foot to S4 at the
 *       top. A boulder rolls out of a dark tunnel (2..6, 1) every 4.8 s (3 u/s), down the
 *       chute and into the hopper (7..8, 10). In by the east alcove (9,8), dodge in the
 *       west alcove (6,5), out by the east alcove at the top (9,2): alcoves every 3 cells,
 *       alternating sides. Walking straight up is too slow; the dodge leaves 1.6 s to set off
 *       (a sprinter can dash it in a 0.9 s window). Gem in the tunnel (4,1), for a runner
 *       between boulders. C4 (10,2).
 *   4.6 The Great Anvil. The flame causeway (15..22, 7) S4 over the lava, vents (16,7)
 *       (18,7) (20,7); the anvil lift (23,7) S4 <-> S1 (18 s, waiting at the causeway when
 *       the level starts) onto the plaza (24..30, 6..8), C5 (25,7); the hammer house
 *       (26..28, 9..13) with the crucible glowing on its roof; two hammers (27,11) (27,13)
 *       1.8 s apart with a safe cell between; the anvil yard (24..30, 14..16), C6 (29,15),
 *       the Silver Key on the Great Anvil (25,15). Leap south from the yard one storey down
 *       over two lava cells to the casting floor (the landing, x 24..30 y 19..22, is clear:
 *       the channel x 27 now starts at y 23, bridged at (27, 24..25)), go back west, climb
 *       onto the shelf, open the silver door (12,19): Qasim's order to the forge lies in his
 *       chamber. Ride his lift (11,18) S1 -> S5 (24 s round), looking out through the slot
 *       (12, 16..18) over the whole Forge, to the exit (9..10, 18), marked for the whole
 *       cavern by a torch high beside the shaft top. Gem on the slot's ledge (12,16), for
 *       stepping off the lift mid-ride.
 *
 * ROUTE (about 180 s of perfect play, lift waits included): gate, catwalk, hang-drop,
 * casting floor, C1, bellows, lift A, C2, lever, jump to B, east gallery, practice pit, C3,
 * six stones, passage, ore chute, C4, causeway, anvil lift, C5, hammers, C6, key, leap,
 * casting floor, shelf, silver door, the Vizier's lift, exit.
 *
 * LIGHT: falloff 0.5 (a vast cavern). The lava (30) is the brightest thing; the air over it
 * is 24, the cavern floors 21..23; the halls stay dark (15). Rock is typed by what it faces:
 * '|' veined cavern rock, '`' and '"' emissive rock lit by the lava at its foot (S0 and the
 * slag pools), '*' masonry, '%' sandstone round the Vizier's rooms.
 */
(function (R) {
  'use strict';
  const { HG } = R;
  const U = R.util, T = R.defTexture, S = R.defSprite, TH = R.texHelpers;

  // ================================================================ FORGE_ textures
  // basalt masonry with ember-lit cracks (the built halls, the hammer house)
  T('FORGE_BASALT', {
    gen(p, c) {
      TH.blocks(p, c, { base: '#463a36', mortar: '#140c0a', bw: 32, bh: 16, cracks: 0.45, grain: 0.45, vary: 0.2 });
      const r = c.rng;
      for (let i = 0; i < 4; i++) {
        let x = Math.floor(r() * 64), y = Math.floor(r() * 64);
        for (let k = 0; k < 9; k++) { p.px(x, y, k % 3 ? '#7a2208' : '#c84a10'); x += Math.round(r() * 2 - 1); y += 1; }
      }
    },
  });
  // natural cavern rock, veined with lava. Lit like any wall (the level's low falloff keeps
  // the cavern readable across the lake); the veins are painted hot so they still glint.
  T('FORGE_ROCK', {
    gen(p, c) {
      TH.voronoi(p, c, { n: 6, base: '#44221a', edge: '#0c0404', edgeW: 2.0, vary: 0.35, grain: 0.25, noise: 0.06 });
      const r = c.rng;
      for (let i = 0; i < 2; i++) {
        let x = r() * 64, y = r() * 64, a = Math.PI / 2 + (r() - 0.5);
        for (let k = 0; k < 30; k++) {
          p.rect(x, y, 2, 2, k % 7 === 0 ? '#ffe070' : '#ff6a18'); p.px(x + 2, y, '#8a2004');
          a += (r() - 0.5) * 0.7; x += Math.cos(a) * 1.5; y += Math.sin(a) * 1.5;
        }
      }
    },
  });
  // rock lit by the lava it stands in (emissive, 2 units tall: 128 rows). Rock faces are pegged
  // to the bottom of their storey (a face below the lowest storey to z 0), so the lava line sits
  // at row (storey z + 2 - lava z) * 64 mod 128: row 32 for the lake at z -0.5 (S0 band, pegged
  // at 0), row 64 for the slag pools at z 4.0 (their '"' rock is in the S2 band, pegged at 3.0).
  const hotRock = row0 => ({
    h: 128, emissive: true,
    gen(p, c) {
      TH.voronoi(p, c, { n: 18, base: '#4a3830', edge: '#120a08', edgeW: 1.4, vary: 0.3, grain: 0.3 });
      const hot = R.hex('#ff6a18'), deep = R.hex('#a02808');
      p.map((x, y, col) => {
        const hgt = (((row0 - y) % 128) + 128) % 128 / 64;       // height above the lava, 0..2
        const g = Math.max(0, 1 - hgt / 0.85), k = g * g;
        const dark = hgt > 1.2 ? 0.45 : 1 - (hgt / 1.2) * 0.55;
        const t = Math.min(1, k * 0.9);
        const tgt = hgt < 0.2 ? hot : deep;
        return [col[0] * dark * (1 - t) + tgt[0] * t, col[1] * dark * (1 - t) + tgt[1] * t, col[2] * dark * (1 - t) + tgt[2] * t];
      });
      const r = c.rng;
      for (let i = 0; i < 7; i++) {
        let x = Math.floor(r() * 64), y = row0 - 2;
        for (let k = 0; k < 10 + r() * 16; k++) { p.px(x, y, k < 8 ? '#ffb040' : '#d05010'); x += Math.round(r() * 2 - 1); y -= 1; }
      }
    },
  });
  T('FORGE_HOT0', hotRock(32));
  T('FORGE_HOT3', hotRock(64));
  // the casting floor: packed foundry sand with iron plates and slag spatter
  T('FORGE_CAST', {
    gen(p, c) {
      p.fill('#6e5a44').grain(0.35, c.seed);
      const r = c.rng;
      for (let i = 0; i < 40; i++) p.disc(r() * 64, r() * 64, 0.6 + r() * 1.6, r() < 0.5 ? '#3a2e24' : '#8a7458');
      p.rect(6, 6, 22, 22, '#56504c').bevel(6, 6, 22, 22, 1.3, 0.55, 1);
      p.rect(36, 38, 22, 20, '#524c48').bevel(36, 38, 22, 20, 1.3, 0.55, 1);
      p.frame(0, 0, 64, 64, '#2a2018'); p.frame(1, 1, 62, 62, '#8a765e');
    },
  });
  // soot-dark flagstones
  T('FORGE_FLOOR', { gen: (p, c) => TH.blocks(p, c, { base: '#5e5046', mortar: '#1a120e', bw: 32, bh: 32, cracks: 0.4, grain: 0.4 }) });
  // the cavern roof: rough rock
  T('FORGE_CEIL', { gen: (p, c) => TH.voronoi(p, c, { n: 10, base: '#342a26', edge: '#0e0808', edgeW: 1.5, vary: 0.25, grain: 0.4 }) });
  // iron catwalk grating with the glow of the lava showing through
  T('FORGE_GRATE', {
    gen(p, c) {
      p.fill('#5a1a08');
      for (let i = 0; i < 64; i += 16) {
        p.rect(i, 0, 5, 64, '#3e3a38'); p.rect(i, 0, 1, 64, '#76706a');
        p.rect(0, i, 64, 5, '#48433f'); p.rect(0, i, 64, 1, '#86807a');
      }
      for (let y = 2; y < 64; y += 16) for (let x = 2; x < 64; x += 16) p.px(x, y, '#b0aaa4');
      p.frame(0, 0, 64, 64, '#221c1a');
      p.noise(0.1, c.seed);
    },
  });
  // riveted iron plates (lift pillars, pistons, bridges)
  T('FORGE_IRON', {
    gen(p, c) {
      p.fill('#4c4644').grain(0.3, c.seed);
      for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) {
        p.bevel(x, y, 32, 32, 1.3, 0.5, 2);
        for (const [a, b] of [[4, 4], [27, 4], [4, 27], [27, 27]]) { p.disc(x + a, y + b, 1.5, '#9a948e'); p.px(x + a + 1, y + b + 1, '#1a1614'); }
      }
      const r = c.rng;
      for (let i = 0; i < 18; i++) p.disc(r() * 64, r() * 64, 1 + r() * 2, '#6a3418', 0.5);
    },
  });
  // top of a stepping stone: cooled slag crust with molten veins
  T('FORGE_CRUST', {
    gen(p, c) {
      TH.voronoi(p, c, { n: 7, base: '#403430', edge: '#b03a10', edgeW: 1.2, vary: 0.3, grain: 0.3 });
      p.frame(0, 0, 64, 64, '#1a1210'); p.frame(1, 1, 62, 62, '#6a5a50');
    },
  });
  // a stone gone under: lava with the stone's dark ghost (emissive, like the lava)
  T('FORGE_MOLTEN', {
    frames: 8, fps: 6, emissive: true,
    gen(p, c) { c.call('LAVA', p); p.frame(4, 4, 56, 56, '#7a1808'); p.frame(5, 5, 54, 54, '#7a1808'); },
  });
  // the floor of the cooled slag pit
  T('FORGE_SLAG', {
    gen(p, c) {
      TH.voronoi(p, c, { n: 14, base: '#2e2a28', edge: '#0a0808', edgeW: 1.3, vary: 0.35, grain: 0.5 });
      const r = c.rng;
      for (let i = 0; i < 18; i++) p.disc(r() * 64, r() * 64, 0.8 + r() * 1.5, '#5e544c');
      p.frame(0, 0, 64, 64, '#141010');
    },
  });
  // a bellows vent in the floor: a round grille over embers
  T('FORGE_VENT', {
    gen(p, c) {
      c.call('FORGE_FLOOR', p);
      p.disc(32, 32, 25, '#1a1210');
      p.map((x, y, col) => {
        const d = Math.hypot(x + 0.5 - 32, y + 0.5 - 32);
        if (d > 22) return null;
        if (x % 7 < 2) return R.hex('#56504c');
        return R.hex(d < 9 ? '#d85a10' : d < 15 ? '#8a2a0a' : '#3a160a');
      });
      p.ring(32, 32, 23, '#7a746e', 2);
    },
  });
  // the Vizier's door: dark wood banded with silver
  T('FORGE_DOOR_SILVER', {
    gen(p, c) {
      TH.planks(p, c, { ph: 64, len: 64, base: '#4a2a14', vertical: true, vary: 0.2 });
      for (const y of [8, 30, 52]) { p.rect(0, y, 64, 5, '#b8c0cc'); p.rect(0, y, 64, 1, '#f0f4ff'); p.rect(0, y + 4, 64, 1, '#5a6070'); }
      for (const y of [10, 32, 54]) for (let x = 4; x < 64; x += 12) p.disc(x, y + 0.5, 1.2, '#6a7080');
      p.disc(46, 42, 4, '#c8d0dc'); p.rect(45, 42, 2, 6, '#101014');
    },
  });
  // the deck of a lift: iron with a hazard border
  T('FORGE_LIFT', {
    gen(p, c) {
      c.call('FORGE_IRON', p);
      for (let i = 0; i < 64; i++) for (let j = 0; j < 5; j++) {
        const col = ((i + j) >> 2) % 2 ? '#d8a810' : '#1a1a1a';
        p.px(i, j, col); p.px(i, 63 - j, col); p.px(j, i, col); p.px(63 - j, i, col);
      }
      p.disc(32, 32, 11, '#8a6a20'); p.disc(32, 32, 8, '#c89a30'); p.disc(32, 32, 4, '#f0d060');
    },
  });

  // ================================================================ FORGE_ sprites
  S('FORGE_ANVIL', {
    w: 48, h: 32, scale: 1.6,
    gen(p) {
      const dark = '#26262a', mid = '#4a4a54', hi = '#9a9aa8';
      p.poly([[3, 5], [33, 5], [46, 8], [33, 12], [29, 12], [27, 19], [36, 29], [11, 29], [19, 19], [17, 12], [9, 12], [3, 9]], mid);
      p.rect(3, 5, 30, 2, hi); p.line(33, 5, 46, 8, hi); p.line(3, 5, 3, 9, hi);
      p.poly([[19, 19], [27, 19], [36, 29], [11, 29]], dark);
      p.rect(9, 29, 30, 3, '#3a2a1a');
      p.line(20, 13, 26, 13, '#6a6a76');
    },
  });
  S('FORGE_CHAIN', {
    w: 8, h: 128, scale: 1.5, hang: true,
    gen(p) {
      for (let y = 0; y < 120; y += 8) {
        if ((y / 8) % 2) { p.rect(3, y, 2, 9, '#5e5a58'); p.px(3, y, '#9a9690'); }
        else { p.ring(4, y + 4, 3, '#6e6a66'); p.px(2, y + 2, '#a8a29c'); }
      }
      p.poly([[1, 118], [7, 118], [6, 127], [2, 127]], '#3e3a38');
    },
  });
  S('FORGE_GLOW', {
    w: 24, h: 20, scale: 1.4, emissive: true, frames: 3, fps: 10,
    gen(p, c) {
      const r = U.rng(11 + c.frame * 5);
      for (let i = 0; i < 10; i++) { const x = 3 + r() * 18, y = 7 + r() * 12; p.disc(x, y, 1 + r() * 2, r() < 0.4 ? '#ffe070' : '#ff7010'); }
      for (let i = 0; i < 7; i++) p.px(2 + r() * 20, r() * 9, '#ffb040');
    },
  });
  S('FORGE_BELLOWS', {
    w: 40, h: 34, scale: 1.4,
    gen(p) {
      p.poly([[4, 10], [30, 4], [30, 30], [4, 24]], '#5a3a1e');
      for (let x = 8; x < 30; x += 5) p.line(x, 9 - (x - 8) / 5, x, 25 + (x - 8) / 5, '#3a2410');
      p.rect(30, 3, 3, 28, '#6a4a28'); p.rect(33, 14, 7, 5, '#4a4a50');
      p.rect(0, 30, 36, 4, '#3a2a1a');
    },
  });

  // ================================================================ legend helpers
  const ent = HG.ent;
  const torch = (dx, dy) => ent({ type: 'deco', sprite: 'TORCH', z: 0.55, radius: 0.1, dx, dy }, { light: 21, anim: { type: 'flicker', depth: 3 } });
  // a hint placed by coordinate (level.ents): shown once, when you walk over it
  const say = (x, y, z, text, extra = {}) => Object.assign({ x, y, z, type: 'trigger', text, radius: 0.7, time: 6 }, extra);
  const deco = (sprite, extra = {}) => ent(Object.assign({ type: 'deco', sprite }, extra));
  // the warning glow on a sinking stone: bubbles for the 0.9 s before it goes under (harmless: height 0)
  const glow = phase => ({ type: 'trap', spriteOn: 'FORGE_GLOW', spriteOff: null, period: 4.8, phase: (phase + 0.1875) % 1, duty: 0.1875, height: 0, radius: -1, brightOn: true, sound: 'sizzle' });
  const sink = phase => ({ base: 's', anim: { type: 'cycle', period: 4.8, phase, duty: 0.25, hazard: 'lava', texOn: 'FORGE_MOLTEN', texOff: 'FORGE_CRUST' }, ent: glow(phase) });
  const vent = (phase, duty = 0.375) => ({ base: 'F', ftex: 'FORGE_VENT', light: 17, label: null, ent: { tpl: 'flame', phase, duty } });
  const hammer = phase => ({ base: 'f', ctex: 'CRUSHER', up: 'FORGE_IRON', light: 17, anim: { type: 'crusher', period: 3.6, phase, msg: 'The great hammer falls on you!' } });
  // the automatic lifts: they wait 2.4 s at each stop and never move faster than ~1 u/s
  const lift = (amp, period, phase) => ({ ftex: 'FORGE_LIFT', low: 'FORGE_IRON', anim: { type: 'lift', amp, period, phase, dwell: 2.4 } });
  const FORGE = { ftex: 'FORGE_FLOOR', ctex: 'FORGE_CEIL', wall: 'FORGE_BASALT', low: 'FORGE_BASALT', up: 'FORGE_BASALT' };

  R.defineLevel({
    id: 'forge', order: 4,
    name: 'The Forge',
    subtitle: 'Where the Vizier casts his chains, the floor itself is molten.',
    width: 50, height: 34,
    music: 'forge',
    falloff: 0.5,                                               // a vast cavern: light carries across the lake
    startMessage: 'Heat rolls up from below. Somewhere in this forge the Silver Key lies on the Great Anvil.',
    legend: {
      // ---- rock and floors
      '*': { solid: true, wall: 'FORGE_BASALT' },
      '|': { solid: true, wall: 'FORGE_ROCK' },
      '`': { solid: true, wall: 'FORGE_HOT0' },
      '"': { solid: true, wall: 'FORGE_HOT3' },
      'f': Object.assign({ base: '.', light: 15 }, FORGE),
      'F': { base: 'f', cl: 2.75 },
      'h': { base: 'f', ftex: 'FORGE_CAST', low: 'FORGE_HOT0', light: 22, label: 'The Casting Floor' },
      'e': { base: 'f', light: 21 },
      'n': { base: 'f', light: 22, label: 'The Great Anvil' },
      '-': { base: 'f', ftex: 'FORGE_GRATE', low: 'FORGE_IRON', light: 21 },
      '=': { base: 'f', light: 21, label: 'The Flame Causeway' },
      'I': { base: 'h', ftex: 'FORGE_IRON', low: 'FORGE_IRON', label: null },
      'r': { base: 'f', ftex: 'SAND_FLOOR', wall: 'SANDSTONE', light: 16 },
      'K': { base: 'f', ftex: 'CARPET_PERSIAN', cl: 2.75, wall: 'SANDSTONE', light: 18, label: "The Vizier's Lift" },
      'c': { base: 'f', ftex: 'FORGE_SLAG', light: 21 },
      '>': { base: 'f', label: 'The Bellows' },
      // ---- lava and open air
      'w': { base: 'f', fl: -0.5, cl: 1.25, ftex: 'LAVA', hazard: 'lava', light: 30 },
      'v': { pit: true, cl: 1.25, ctex: 'FORGE_CEIL', wall: 'FORGE_BASALT', low: 'FORGE_BASALT', up: 'FORGE_BASALT', light: 24 },
      'u': { base: 'v', low: 'FORGE_IRON' },
      'p': { base: 'v', cl: 1.5, light: 14 },
      '[': { base: 'w', fl: 0.5, label: null },                 // the crucible on the hammer house: molten metal at 3.5
      // ---- the ore chute: stepped floor, tall ceiling (pits 'p' above)
      '0': { base: 'f', light: 15, label: 'The Ore Chute' },
      '6': { base: '0', fl: 0.25, cl: 1.5 },
      '7': { base: '0', fl: 0.5, cl: 1.75 },
      '8': { base: '0', fl: 0.75, cl: 2.0 },
      '9': { base: '0', fl: 1.0, cl: 2.25 },
      '/': { base: '0', fl: 1.25, cl: 2.5 },
      't': { base: '0', cl: 1.5 },
      'D': { base: 'f', cl: 1.5, light: 7, label: null },
      // ---- slag stones
      's': { base: 'e', ftex: 'FORGE_CRUST', low: 'FORGE_HOT0', light: 23 },
      // the sinkers go under 1.8 s apart; both are safe for the first 1.8 s of level time
      'S': sink(0.25),
      'Z': sink(0.625),
      'V': { base: 's', anim: { type: 'bob', period: 4.8, amp: -1.5, phase: 0 }, ent: glow(0) },
      // ---- lifts
      'A': Object.assign({ base: 'f', light: 18, label: 'The Chain Lifts' }, lift(4.5, 18.0, 0)),     // S0 <-> S3
      'N': Object.assign({ base: 'e' }, lift(4.5, 18.0, 0.5)),                                        // S1 <-> S4, waits at the top first
      'X': Object.assign({ base: 'K', cl: 1.25 }, lift(6.0, 24.0, 0)),                                // S1 <-> S5
      'b': { base: 'e', ftex: 'FORGE_CRUST', low: 'FORGE_HOT0', tag: 'liftB' },
      'l': HG.lever({ lift: { tag: 'liftB', to: 4.5, speed: 1.0 }, msg: 'Chains clatter inside the wall. A pillar of stone rises out of the lava!' }),
      // ---- hazards
      'y': vent(0),
      'Y': vent(0.5),
      'i': vent(0, 0.25),                                       // checkerboard: short puffs, A/B
      'W': vent(0.5, 0.25),
      'H': hammer(0),
      'J': hammer(0.5),
      'q': { base: '-', loose: { delay: 0.7 }, ftex: 'LOOSE_FLAT', tag: 'flag' },     // the flagstone that falls at the start
      'j': { base: '-', loose: {}, ftex: 'LOOSE_FLAT' },                           // cracked flags on the east gallery: keep walking
      // ---- doors, keys, gates
      '@': { base: 'r', start: 'E', label: 'The Forge Gate' },
      'g': HG.gate('window', Object.assign({ door: { msg: 'Iron bars. Beyond them the ore chute empties into a pit of fire.', axis: 'y' }, light: 18 }, FORGE)),
      'd': HG.keyDoor('key_silver', Object.assign({ door: { tex: 'FORGE_DOOR_SILVER', msg: 'A door banded with silver. It will open for the Silver Key.', openMsg: 'The Silver Key turns. Behind the door, a lift waits.' } }, FORGE, { ftex: 'CARPET_PERSIAN', light: 18 })),
      'k': ent([                                                // the anvil stands at the back of its cell: you can walk up to the key
        { type: 'deco', sprite: 'FORGE_ANVIL', solid: true, radius: 0.3, height: 0.8, dy: 0.35 },
        { type: 'item', item: 'key_silver', z: 0.66, dy: 0.25 },    // lying on its face
      ], { light: 22 }),
      // ---- messages and notes
      'a': HG.trigger('A flagstone at the edge of the catwalk cracks...', { script: 'flagDrop', radius: 0.8, time: 3 }, { label: 'The Glow' }),
      'M': HG.note('CHALKED ON THE FORGE GATE', 'The forge of Qasim.\n\nHis Silver Key lies on the Great Anvil, past the hammers.'),
      'R': HG.note('A SOOTY PLAQUE', 'THE BELLOWS\n\nWhere a grille glows, fire follows.\nWalk beside the grilles. Where you must cross one, wait for its breath to pass.'),
      'U': HG.note('SCRATCHED INTO THE SLAG', 'The stones sink and rise again.\n\nWhen a stone bubbles and glows, it is going under.\nNever wait on a glowing stone.', {}, { label: 'The Slag Pools' }),
      // ---- decoration
      // wall torches keep legend characters: a torch also lights its cell and makes it flicker,
      // which an entity placed by level.ents cannot do (ents carry only the high landmark torch)
      '(': torch(-0.4, 0), ')': torch(0.4, 0), '{': torch(0, -0.4), '}': torch(0, 0.4),
      'm': { base: 'v', ent: { type: 'deco', sprite: 'FORGE_CHAIN', hang: true } },
      '<': deco('FORGE_BELLOWS', { solid: true, radius: 0.35 }),
      ']': deco('BARREL', { solid: true, radius: 0.3 }),
      '$': deco('BONES'),
      'z': deco('SKELETON'),
      '?': deco('SKULL'),
    },
    layers: [
      { z: 0, map: [
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '            |```````````|     |```````|           ',
        '            `wwwwwwwwwww`*****`wwwwwww`           ',
        '            `wwwwwwwwww`******`wwwwwww`           ',
        '            `wwwwwwwwwww``***``wwwwwww`           ',
        '      *``*  `wwwwwwwwwwwww`*`wwwwwwwww`           ',
        '      `ww`  `wwwwwwwwwwwww`*`wwwwwwwww`           ',
        '      *``*  `wwwwwwwwwwwww`*`wwwwwwwww`           ',
        '            `wwwwwwwwwwwww`*`wwwwwwwww`           ',
        '            `wwwwwwwwwwwww`*`wwwwwwwww`           ',
        '            |``````wwwww``***``wwwwwww`           ',
        '             *****`wwwww`*****`wwwwwww`           ',
        '             *****`wwwww```````wwwwwww`           ',
        '             *****`wwwwwwwwwwwwwwwwwww`           ',
        '             *****`wwwwwwwwwwwwwwwwwww`           ',
        '             *****|hhwhhhhhhhhhhhwwwwb|           ',
        '            |||||||hhwhhhhhhhhhhhwwwww`           ',
        '            |hhhhhhhhwhhhhhhhhhhhwwwww`       *** ',
        '            |hhhhhhhhwhhhhhhhhhhhwwwww`       *A* ',
        '            |hhhhhhhhIhhhhhwhhhhhwwwww`       *f* ',
        '            |(hhhhhhhIhhhhhIhhhhhwwwww`       *f* ',
        '            |hhhhhhhhwhhhhhIhhhhCwwwww`       *f* ',
        '            |hhhhhhhhwhhhhhwhhhhhwwwww`       *)* ',
        '            |h}hhhhhhwhh}hGwh$h}hwwwww`       *f* ',
        '            |||||||||`|||||`|||>|`````|       *f* ',
        '                              *f******   ******f* ',
        '                              *FRFFFF*****iWiW*f* ',
        '                              *<<y*yFFYFYFWiWiFP* ',
        '                              ************iWiW*** ',
        '                                         ******   ',
      ] },
      { z: 1.5, map: [
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '            |||||||||||||||||||||||||||           ',
        '            |vvvvvvvvvvvnnnnnnzvvvvvvv|           ',
        '            |vvvvvvvvvvNnCnnnnnvvvvvvv|           ',
        '            |vvvvvvvvvvvnn}n}nnvvvvvvv|           ',
        '      ****  |vvvvvvvvvvvvv*f*vvvvvvvvv|           ',
        '      *uu*  |vvvvvvvvvvvvv*$*vvvvvvvvv|           ',
        '      ****  |vvvvvvvvvvvvv*H*vvvvvvvvv|           ',
        '            |vvvvvvvvvvvvv*f*vvvvvvvvv|           ',
        '            |vvvvvvvvvvvvv*J*vvvvvvvvv|           ',
        '            |eeeeeevvvvvnn{n{nnvvvvvvv|           ',
        '            |eeeeeevvvvvnknnnCnvvvvvvv|           ',
        '            |(eeeeevvvvvPnnnnnnvvvvvvv|           ',
        '          %%%eeeeeevvvvvvvvvvvvvvvvvvv|           ',
        '        %%%X%eeeeeevvvvvvvvvvvvvvvvvvv|           ',
        '        %KKKdeeeeeevvvvvvvvvvvvvvvvvvv|           ',
        '        %TKK%eeeeeevvvvvvvvvvvvvvvvvvv|           ',
        '        %%%%%vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *u* ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |||||||||||||||||||||||||||       *** ',
        '                              ********   ******** ',
        '                              ******************* ',
        '                              ******************* ',
        '                              ******************* ',
        '                                         ******   ',
      ] },
      { z: 3, map: [
        '              """"""""""""" **********            ',
        '             """""""""""""""*cccccccB*            ',
        '             """""""""""""""*c|c|c|c**            ',
        '             """""""""""""""*ccccccc*             ',
        '             """""""""""""""*ccccccc*             ',
        '            ||"""""""""""""||||||||||||           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvuvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '      ****  |vvvvvvvvvvvvv[[[vvvvvvvvv|           ',
        '      *uu*  |vvvvvvvvvvvvv[[[vvvvvvvvv|           ',
        '      ****  |vvvvvvvvvvvvv[[[vvvvvvvvv|           ',
        '            |vvvvvvvvvvvvv[[[vvvvvvvvv|           ',
        '            |vvvvvvvvvvvvv[[[vvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '          %%%vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '        %%%u%vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '        %%%%%vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '        %%%%%vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '        %%%%%vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *u* ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |||||||||||||||||||||||||||           ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
      ] },
      { z: 4.5, map: [
        '            *||||||||||||||||||||||||**           ',
        '            *Pwwwwwwwwwwwww{?vvvvvvvf{*           ',
        '      ****  *fwswZwswSwswswffvsvVvsvff*           ',
        '      *//****fwwwwwwwwwwwwwfCvvvvvvvff*           ',
        '     **99**fffwwwwwwwwwwwwwffvvvvvvvUf*           ',
        '     *888**f|||||||||||||||||||||||||f|           ',
        '     **77**)|vvvvvvvvvvvvvvvvvvvvvvvv-|           ',
        '      *66**f|vvvvvvvvvvuvvvvvvvvvvvvv-|           ',
        '      *000ff|vvvvvvvvvvvvvvvvvvvvvvvv)|           ',
        '      *0z***|vvvvvvvvvvvvvvvvvvvvvvvv-|           ',
        '      *uu*  |vvvvvvvvvvvvvvvvvvvvvvvv-|           ',
        ' %%%%%%gg***|vvvqvvvvvvvvvvvvvvvvvvvv-|           ',
        ' %]r{@rfffff{-a----vvvvvvvvvvvvvvvvvv)|           ',
        ' %rrrrrMff}ff------vvvvvvvvvvvvvvvvvvj|           ',
        ' %rrrrr*****|vvvvvvvvvvvvvvvvvvvvvvvvj|           ',
        ' %]]}rr*   *|vvvvvvvvvvvvvvvvvvvvvvvvj|           ',
        ' %%%%%%*   *Gvvvvvvvvvvvvvvvvvvvvvvvv)|           ',
        '          **evvvvvvvvvvvvvvvvvvvvvvvv-|           ',
        '          *u}vvvvvvvvvvvvvvvvvvvvvvvv-|           ',
        '          **|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvvl********** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvveffff}ffCff* ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|********u* ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |||||||||||||||||||||||||||           ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
      ] },
      { z: 6, map: [
        '  ********  |||||||||||||||||||||||||||           ',
        ' *DDGDDtt***|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '  *****tttCf|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '      *pp**f|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '     **pp**f|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '     *ppp**(|||||||||||||||||||||||||||           ',
        '     **pp**f|==vvvvvvvvvvvvvvvvvvvvvvv|           ',
        '      *pp**ff===y=Y=y==uvvvvvvvvvvvvvv|           ',
        '      *pp***|==vvvvvvvvvvvvvvvvvvvvvvv|           ',
        '      *pp***|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '      ****  |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        ' ***********|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        ' ***********|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        ' ***********|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        ' ***********|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        ' *******   ||vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        ' *******   |vvvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '          *|vvvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '          *uvvvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '          *||vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|********** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|********** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|********** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|       *** ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |||||||||||||||||||||||||||           ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
      ] },
      { z: 7.5, map: [
        '  ********  |||||||||||||||||||||||||||           ',
        '  **********|||||||||||||||||||||||||||           ',
        '  **********|||||||||||||||||||||||||||           ',
        '      ******|||||||||||||||||||||||||||           ',
        '     *******|||||||||||||||||||||||||||           ',
        '     *******|||||||||||||||||||||||||||           ',
        '     *******|vvvvvvmvvvvvvvvvvvvvvvvvv|           ',
        '      ******|vvvvvvvvvvuvvvvvvvvvvvvvv|           ',
        '      ******|vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '      ****  |vvvvvvvvvvvvvvvvvvvvmvvvv|           ',
        '      ****  |vvvvvvvmvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '           ||vvvvvvvvvvvvvvvvvvvvvmvvv|           ',
        '           |vvvvmvvvvvvvvvvvvvvvvvvvvv|           ',
        '        ***|vvvvvvvvvmvvvvvvvvvvvvvvvv|           ',
        '        *EEuvvvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '        ***||vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvmvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvmvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |vvvvvvvvvvvvvvvvvvvvvvvvv|           ',
        '            |||||||||||||||||||||||||||           ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
        '                                                  ',
      ] },
    ],
    ents: [
      // 4.1 the hang-drop hint: drop from x 15, well away from the shelf's east edge over the lava
      say(15, 13, 4.5, 'The ledge below is two storeys down - too far to drop. Hold C, step to the edge, press forward again to hang, then let go.'),
      // 4.2 the demonstration vent: charred bones on its grille, between the bellows and the wall
      { x: 33, y: 31, z: 0, type: 'deco', sprite: 'BONES', dx: 0.3 },
      // 4.3 the east gallery: three cracked flags (37, 13..15) between its torches; one already lies in the lava below
      { x: 37, y: 14, z: 0, type: 'deco', sprite: 'RUBBLE' },
      // 4.5 the ore boulder: out of the dark tunnel's end (2.6,1.5), east to the chute (8,1.5), down it
      // and into the hopper at (8,10.5): 14.4 u at 3 u/s, one boulder every 4.8 s
      { x: 2, y: 1, z: 6, tpl: 'boulder', dx: 0.1, path: [[0, 0], [5.4, 0], [5.4, 9]], speed: 3.0, phase: 0, msg: 'An ore boulder flattens you!' },
      // 4.6 the causeway, and the way back from the Great Anvil
      say(13, 7, 6, 'The causeway to the Great Anvil. The vents breathe fire on the beat - cross between breaths.'),
      say(27, 15, 1.5, 'The way back is a leap south: the casting floor is one storey down, across two strides of lava.'),
      // the Vizier's chamber: his order to the forge, left by his lift
      { x: 9, y: 19, z: 1.5, type: 'note', dx: -0.3, title: 'SEALED WITH BLACK WAX', text: 'To the Master of the Forge.\n\nCast the new chains before the last grain falls. At dawn the Sultan drinks his cup, and by noon his loyal men will need them.\n\nThe first link is for the thief who cut my purse.\n\n- Qasim' },
      // the way out: a torch high on the cavern wall beside the top of the Vizier's shaft (S5), seen from the catwalk
      { x: 12, y: 18, z: 4.5, type: 'deco', sprite: 'TORCH', zAbs: 8.05, dy: 0.4, radius: 0.1 },
    ],
    scripts: {
      /** The first thing you see: a flagstone at the catwalk's edge cracks and falls into the lava. */
      flagDrop(g) {
        g.crumble('flag', 16.5, 11.5, 3.5, 0.7);      // a no-op once the flag has gone
        g.after(2.0, gg => {
          gg.sound('sizzle', 16.5, 11.5, 1, 0);
          gg.msg('...and the lava swallows it with a hiss.', 3);
        });
      },
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
