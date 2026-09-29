/*
 * LEVEL 1 — THE CELLS  (id 'cells', order 1)
 * The tutorial, and the worked example for level authors: copy its structure.
 *
 * Aladdin, the bazaar thief, wakes in a cell of the Vizier's dungeon: a barred
 * cage high on the west wall of the Warden's Hall. The way out is the hall's
 * east gate - and the iron plate that lifts it lies locked in the Warden's cage.
 *
 * STOREYS (layers)            grid 40 x 24, x grows east, y grows south (N = up)
 *   S0  z = 0    the undercroft, the gate passage, the Warden's Hall floor (the
 *                hall is three storeys tall), the teeth, the pits of the leaping hall
 *   S1  z = 1.5  your cell and the next one, the cell block, the leaping hall,
 *                the Warden's gallery (barred windows over the hall)
 *   S2  z = 3.0  the Warden's Walk (a ledge high on the hall's west wall), a crawl space
 *
 * SET-PIECES, in the order you meet them (coordinates are cells x,y):
 *  1.1 Your Cell (S1 12..14,9..11). Start at (13,10) facing east, ON a cracked
 *      flag, looking through the barred front of the cell (15,9..11) across the
 *      whole Warden's Hall at the east gate (27,10) and, through a high window
 *      above it, the round top of the moonlit arch of the way out (31,10).
 *      Through bars on the north side (13,8): a great potion glinting by a torch
 *      in the next cell (13,7). The flag shakes for 6 s - time to read the
 *      message and look around - then drops you one storey (safe: a falling
 *      flag never lands on its rider) into...
 *  1.2 The Undercroft (S0 12..14,9..11, dark). Hamid's bones; look up through the
 *      hole. West, through a low room (11,10), a crate (10,10, 0.75 high) blocks
 *      a tall passage - SPACE climbs it. Then the tall room (7..9,10..13): a
 *      one-storey ledge (1.5) up to the cell block - SPACE again. A gem on a
 *      second crate (7,10).
 *  1.3 The Cell Block (S1 8..10,14..20). A full-width band of cracked flags
 *      (8..9,16..17) over a cellar: walk or run straight across and they fall
 *      behind you; stop and you ride one down, then climb out through its hole.
 *  1.4 The Gate Passage (S0). Down a stair (11..15,19..20); a bronze plate
 *      (17,17) raises the see-through portcullis (17,14), three cells ahead and
 *      in plain view, for 6 s.
 *  1.5 The Warden's Hall (S0 16..26,7..13, 4.25 tall). The east gate (27,10)
 *      shows the way out; its iron plate sits in a barred, torch-lit cage (24,5)
 *      under the gallery, a notice (24,7) in front (signed by the Vizier). Look
 *      up: your own cell front (S1, west wall), the gallery windows (S1, north
 *      wall, 22/24/26), the Warden's Walk (S2, west wall), the splinted skeleton
 *      under it (16,12).
 *  1.6 The Teeth (S0, from the south door 24,14). Brazier (25,18) in a niche off
 *      the passage, a warning (24,20), the corner (24,21), a 5-cell straight
 *      corridor, a full-width spike trough (30) - lit brighter than the floor,
 *      rusty grating, spike tips glinting over its lip, a skeleton impaled on it
 *      in the line you walk (30,21) - then a two-cell trough (33..34). Hold C:
 *      careful steps never wake spikes. Running in kills you; the brazier is 10
 *      cells back. A potion after (35,22).
 *  1.7 The Leaping Hall (S1 36..37, heading NORTH, two storeys tall, sandstone).
 *      From the tall corner (36..37,20) climb onto the start ledge. Gaps over a
 *      lit checkered pit one storey deep: 1 cell (y 17, standing jump), 2 cells
 *      (y 12..13, running jump off a 3-cell carpet), 3 cells (y 6..8, run, jump,
 *      keep Forward held: catch the lip, pull up). The far half of pits B and C
 *      is 0.5 deeper, so their far face (2.0) cannot be climbed: a fall costs a
 *      climb back to the take-off and a retry. A gem at the bottom of pit B (37,12).
 *  1.8 The Warden's Gallery (S1 22..35,5, heading WEST). Brazier (34,4) in a
 *      niche. Barred windows over the hall. The cracked flag (24,5) lies right
 *      above the caged plate: walk over it, it falls, the rubble jams the plate
 *      and the east gate opens for good. (Ride it down instead and you land in
 *      the cage on the plate - the gate opens too - and climb back out onto the
 *      gallery.)
 *  1.9 The Warden's Walk (S2 16,5 and 15,5..13, heading SOUTH). Up a stair
 *      (21..17,5). If you jumped the gallery flag, the top of the walk (16,5)
 *      tells you the gate is still shut. The hall floor is two storeys down:
 *      walking off costs a life; a hang-drop (C to the edge, Forward again, let
 *      go of C) is safe - taught at (15,7), the first open edge. Then east along
 *      the carpet, through the open gate to the way out (28..30,9..11).
 *      Secret: a low crawl space off the walk (14,6) ends in a hole (12,6) into
 *      the next cell: the great potion (13,7) and the last prisoner's words on
 *      what the Vizier's hourglass counts (12,7). Climb back out the way you came.
 *
 * ROUTE: start (13,10 S1) -> drop -> crate (10,10) -> ledge (8,14 S1) -> band
 * -> stair -> plate (17,17) -> gate 1 -> hall -> south door (24,14) -> brazier
 * -> teeth -> climb (36,20) -> gaps 1, 2, 3 north -> brazier (34,4) -> gallery
 * west over the flag (24,5) -> stair up -> walk south -> hang-drop into the hall
 * -> east gate (27,10) -> the way out. verify.js puts the route at about 45 s
 * of optimal play (6 s of it waiting for the first flag); a first run takes a
 * few minutes.
 *
 * HOW IT IS BUILT (the patterns to copy):
 *  - Legend characters are for kinds of CELL: floors, walls, gates, plates,
 *    loose flags, torches. One-off entities - triggers, carvings, the notice,
 *    gems, braziers, bones - go in `ents` by coordinate ({ x, y, z, ...spec },
 *    z = the floor they stand on), built with the small helpers below (say,
 *    carving, deco). There `z` is the floor, so a sprite raised above its floor
 *    (a carving at eye height) gives its height as `zAbs`. The campaign's stock
 *    entity characters ('P') still work in a map: they stand on the plain floor
 *    around them (base 'auto').
 *  - Tall spaces are ',' (2.75) or ';' (4.25) in the lower layer with rock in
 *    the layers above; a hole is a pit character in the upper layer over a
 *    floor. A tall span cuts through the band above it, whatever that layer
 *    says, so check the rooms beside it: the low room (11,10) next to the tall
 *    crate passage is 1.45 tall, or your cell would have a hole in its wall.
 *  - Unclimbable pit walls: sink the floor 0.5 next to the far side (face 2.0).
 *  - Rock faces are pegged to the bottom of their storey (texture row 127 on
 *    the storey's floor, 64 rows a unit). A picture that spans two storeys is
 *    two textures: the moonlit arch is ']' in S0 and, through the S1 layer's
 *    own legend, a second texture in S1.
 *  - Torches are sprites pushed against a wall (dx/dy) in a cell whose light is
 *    raised (18-22) and flickers: every torch makes a pool of light. The level's
 *    `falloff` (0.8; the campaign's is 1.05) keeps the far walls of the
 *    three-storey hall readable across 15 cells.
 *  - See-through gates (portcullis, cell fronts, windows) draw their bars on the
 *    cell's mid-plane across the passage; gates side by side count as closed for
 *    each other, and `door.axis` names the plane outright ('x' for the cell
 *    front, three gates in a row across an east-west view).
 *  - Braziers stand in a 1-cell niche off a 1-wide passage, with a touch radius
 *    that reaches into the passage: you light them walking past, not through them.
 *  - Loose flags: `loose: { delay }`; a flag never lands on the rider it carries
 *    down. Rubble on a plate jams it for good and runs the plate's msg and
 *    script (eastGateOpens). Scripted variants: `loose: { armed: false }` with
 *    g.armLoose(tag), and g.crumble(tag, x, y) for a crumbling bridge.
 *  - Triggers teach each key the moment it is needed; a trigger with a script
 *    and `once: false` can check the world first (walkCheck).
 */
(function (R) {
  'use strict';
  const { HG } = R;
  const TH = R.texHelpers;

  // ------------------------------------------------------------ level assets (prefixed CELLS_)
  // cell walls: dungeon blocks with the tally marks of long-gone prisoners
  R.defTexture('CELLS_TALLY', {
    gen(p, c) {
      c.call('DUNGEON_WALL', p);
      const r = c.rng, s = '#b8a47c';
      for (let g = 0; g < 3; g++) {
        const x0 = 5 + g * 20, y0 = 14 + Math.floor(r() * 26);
        for (let k = 0; k < 4; k++) p.line(x0 + k * 3, y0, x0 + k * 3 + 1, y0 + 9, s);
        p.line(x0 - 2, y0 + 7, x0 + 12, y0 + 2, s);
      }
    },
  });
  // the floor of the leaping pits: big sandstone / slate checks, so the depth reads at a glance
  R.defTexture('CELLS_CHECKER', {
    gen(p, c) {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const lightSq = (i + j) % 2 === 0;
        p.rect(i * 32, j * 32, 32, 32, lightSq ? '#c09c64' : '#3a3230').bevel(i * 32, j * 32, 32, 32, 1.2, 0.7, 1);
      }
      p.grain(0.22, c.seed).noise(0.05, c.seed);
    },
  });
  // the iron plate in the Warden's cage
  R.defTexture('CELLS_IRON_PLATE', {
    gen(p, c) {
      c.call('SAND_FLOOR', p);
      p.rect(8, 8, 48, 48, '#50525a').bevel(8, 8, 48, 48, 1.45, 0.5, 2);
      for (const [x, y] of [[13, 13], [50, 13], [13, 50], [50, 50]]) p.disc(x, y, 2, '#9a9ca4');
      p.rect(18, 29, 28, 6, '#2c2e34');
    },
  });
  // the spike troughs: a rusty iron grating framed in bright rust, a steel tip glinting in every
  // slot - it must stand out from the dark corridor floor at running distance
  R.defTexture('CELLS_TROUGH', {
    gen(p, c) {
      p.fill('#4a3222');
      for (let y = 4; y < 64; y += 10) for (let x = 4; x < 64; x += 10) {
        p.disc(x + 1, y + 1, 2.4, '#0a0806');
        p.px(x + 1, y, '#f0f4ff'); p.px(x, y + 1, '#b6becd'); p.px(x + 1, y + 1, '#848c9b');
      }
      p.frame(0, 0, 64, 64, '#c47a44').frame(1, 1, 62, 62, '#9a5630').frame(2, 2, 60, 60, '#6a3a20').grain(0.2, c.seed);
    },
  });
  // the spikes at rest: their steel tips stand just above the lip of the trough and glint
  R.defSprite('CELLS_TEETH', {
    w: 32, h: 12, scale: 1.8,
    gen(p) {
      p.rect(0, 9, 32, 3, '#1d2027');
      for (let x = 0; x < 32; x += 6) {
        p.poly([[x + 1.5, 12], [x + 3, 0], [x + 4.5, 12]], '#848c9b');
        p.line(x + 3, 0, x + 3, 3, '#ffffff'); p.px(x + 2, 4, '#d8e0ee');
      }
    },
  });
  // crate lid
  R.defTexture('CELLS_CRATE_TOP', {
    gen(p, c) {
      TH.planks(p, c, { ph: 16, len: 64, base: '#8a6a3a' });
      p.frame(0, 0, 64, 64, '#3a2a14'); p.frame(2, 2, 60, 60, '#5a4020');
    },
  });
  // words scratched into a smoothed, paler patch of wall (a note sprite pushed against a wall)
  R.defSprite('CELLS_CARVING', {
    w: 32, h: 20, scale: 1.2,
    gen(p, c) {
      p.rect(1, 1, 30, 18, '#b09a70').bevel(1, 1, 30, 18, 1.2, 0.7, 1);
      const ink = '#3a2a18', r = c.rng;
      for (let row = 0; row < 3; row++) {
        let x = 4;
        const y = 4 + row * 5;
        while (x < 27 - 2 * row) {
          const k = Math.floor(r() * 4);                 // a scratched letter: | / \ or -
          if (k === 0) p.line(x, y, x, y + 3, ink);
          else if (k === 1) p.line(x, y + 3, x + 2, y, ink);
          else if (k === 2) p.line(x, y, x + 2, y + 3, ink);
          else { p.line(x, y + 1, x + 2, y + 1, ink); p.px(x + 1, y + 3, ink); }
          x += r() < 0.2 ? 5 : 3;                         // gaps between words
        }
      }
    },
  });
  // The way out: an arch open to the night in the far wall of the exit room (31,10), painted
  // fullbright (emissive) so it shines from across the level. Rock faces are pegged to the bottom of
  // their storey - row 127 sits on the storey's floor, 64 rows a unit - so the arch is two textures
  // that meet at z 1.5: LOW (S0 band, rows 127..32 = z 0..1.5) holds the opening and the steps up
  // and out, HIGH (S1 band, rows 127..48 = z 1.5..2.75) the round top and the moon, the part you
  // see from your cell through the high window above the east gate. The blocks around the arch are
  // painted darker than the sandstone so that, at full bright, they match the lit walls beside it.
  const ARCH = { frame: '#c8a060', night: '#0c1430', glow: '#2a3a68', x0: 5, x1: 59, o0: 10, o1: 54 };
  const archWall = (p, c) => TH.blocks(p, c, { base: '#6e5436', mortar: '#34240f', bw: 32, bh: 16, cracks: 0.1, grain: 0.25 });
  const stars = (p, c, inside, n) => {
    const r = c.rng;
    for (let i = 0; i < n; i++) {
      const x = ARCH.o0 + 1 + r() * (ARCH.o1 - ARCH.o0 - 2), y = r() * 128;
      if (inside(x, y)) p.px(x, y, r() < 0.3 ? '#ffffff' : '#a0b0d0');
    }
  };
  R.defTexture('CELLS_ARCH_LOW', {
    h: 128, emissive: true,
    gen(p, c) {
      archWall(p, c);
      p.rect(ARCH.x0, 0, ARCH.x1 - ARCH.x0, 128, ARCH.frame);                            // the jambs
      p.rect(ARCH.o0, 0, ARCH.o1 - ARCH.o0, 122, ARCH.night);                             // the night
      p.vgrad(ARCH.o0, 64, ARCH.o1 - ARCH.o0, 40, ARCH.night, ARCH.glow);                  // a glow low in the sky
      stars(p, c, (x, y) => y > 30 && y < 92, 26);
      p.poly([[ARCH.o0, 104], [20, 96], [30, 100], [42, 94], [ARCH.o1, 102], [ARCH.o1, 106], [ARCH.o0, 106]], '#141a30'); // far dunes
      for (let k = 0; k < 4; k++) {                                                         // steps up and out
        const y = 118 - k * 4, w = ARCH.o1 - ARCH.o0 - k * 8;
        p.rect(ARCH.o0 + k * 4, y, w, 4, k % 2 ? '#8a6a40' : '#a07c4c');
      }
      p.rect(ARCH.x0, 122, ARCH.x1 - ARCH.x0, 6, '#b08850');                              // the sill
      for (let y = 8; y < 128; y += 16) { p.line(ARCH.x0, y, ARCH.o0 - 1, y, '#8a6a40'); p.line(ARCH.o1, y, ARCH.x1 - 1, y, '#8a6a40'); }
    },
  });
  R.defTexture('CELLS_ARCH_HIGH', {
    h: 128, emissive: true,
    gen(p, c) {
      const cx = 32, spring = 83, ro = 27, ri = 22;                                         // springing line z 2.2
      archWall(p, c);
      p.disc(cx, spring, ro, ARCH.frame); p.rect(ARCH.x0, spring, ARCH.x1 - ARCH.x0, 128 - spring, ARCH.frame);
      p.disc(cx, spring, ri, ARCH.night); p.rect(ARCH.o0, spring, ARCH.o1 - ARCH.o0, 128 - spring, ARCH.night);
      stars(p, c, (x, y) => Math.hypot(x - cx, y - spring) < ri - 1 || y > spring, 30);
      p.disc(41, 72, 6, '#f0ecd0'); p.disc(44, 70, 5, ARCH.night);                         // a crescent moon
      for (let a = 0.35; a < Math.PI; a += 0.55) {                                         // the voussoirs
        const dx = Math.cos(a), dy = -Math.sin(a);
        p.line(cx + dx * ri, spring + dy * ri, cx + dx * ro, spring + dy * ro, '#8a6a40');
      }
      p.rect(28, spring - ro - 3, 8, 8, '#e0bc78').frame(28, spring - ro - 3, 8, 8, '#8a6a40'); // the keystone
      for (let y = 88; y < 128; y += 16) { p.line(ARCH.x0, y, ARCH.o0 - 1, y, '#8a6a40'); p.line(ARCH.o1, y, ARCH.x1 - 1, y, '#8a6a40'); }
    },
  });
  // a prisoner who walked off the Warden's Walk: a skeleton with a splinted leg
  R.defSprite('CELLS_SPLINT', {
    w: 40, h: 14, scale: 1.3,
    gen(p) {
      const b = '#d8d0b8', wood = '#8a6a3a', rope = '#c0a060';
      p.ball(4, 8, 4, b); p.px(3, 7, '#101010'); p.px(5, 7, '#101010');
      p.rect(8, 7, 13, 2, b); for (let x = 10; x < 20; x += 3) p.rect(x, 4, 1, 8, b);
      p.line(12, 8, 16, 13, b);
      p.line(21, 8, 38, 5, b); p.line(21, 8, 37, 12, b);
      p.rect(25, 9, 11, 2, wood); p.rect(25, 12, 11, 2, wood);
      p.line(28, 8, 28, 13, rope); p.line(33, 8, 33, 13, rope);
    },
  });
  // chains and a manacle hanging from a cell ceiling
  R.defSprite('CELLS_CHAINS', {
    w: 12, h: 40, scale: 1.1, hang: true,
    gen(p) {
      const m = '#6a6a72', hi = '#a0a0a8';
      for (const x of [3, 8]) for (let y = 0; y < 32; y += 4) { p.frame(x - 1, y, 3, 4, m); p.px(x, y + 1, hi); }
      p.ring(6, 35, 4, m, 2); p.px(4, 33, hi);
    },
  });

  // ------------------------------------------------------------ entity helpers (specs for `ents`)
  /** A message the first time you walk here (radius in cells). */
  const say = (text, radius = 0.8) => ({ type: 'trigger', text, radius, time: 7 });
  /** Words scratched into the wall: a whole `ents` entry, a readable note in cell (x, y) on the floor at
   *  z, pushed dx/dy against a wall, 0.3 above the floor (in `ents`, z is the floor, so the sprite's
   *  own height is given as zAbs). */
  const carving = (x, y, z, dx, dy, title, text) => ({ x, y, z, type: 'note', title, text, sprite: 'CELLS_CARVING', dx, dy, zAbs: z + 0.3, hint: 'Words are scratched into the stone. Press E to read.' });
  const deco = (sprite, extra) => Object.assign({ type: 'deco', sprite, radius: 0.3 }, extra || {});
  /** A checkpoint brazier in a 1-cell niche beside a 1-wide passage: the touch radius (1.1 + your 0.24)
   *  reaches across the niche mouth, so you light it walking past. You respawn in the niche. */
  const brazier = { type: 'checkpoint', radius: 1.1 };

  // ------------------------------------------------------------ legend helpers (kinds of cell)
  /** A wall torch: a lit, flickering cell with a torch pushed against one wall; z is its height above
   *  the floor (an array puts one torch at each height). base 'auto': the plain floor around it. */
  const torchEnt = (dx, dy, z = 0.62) => ({ type: 'deco', sprite: 'TORCH', z, radius: 0.1, dx, dy });
  const torch = (dx, dy, z = 0.62, light = 20) => ({
    base: 'auto', light, anim: { type: 'flicker', depth: 3 }, ent: [].concat(z).map(h => torchEnt(dx, dy, h)),
  });

  R.defineLevel({
    id: 'cells', order: 1,
    name: 'The Cells',
    subtitle: 'Below the palace, where the Vizier keeps those who know too much.',
    width: 40, height: 24,
    music: 'cells',
    falloff: 0.8,                                                       // the hall's far walls read from your cell
    startMessage: 'Your cell. The cracked flag under your feet is giving way! (ARROWS walk and turn)',
    scripts: {
      // the caged plate's script: it runs when the gallery flag's rubble (or its rider) jams the plate
      eastGateOpens(g) { g.flag('eastOpen', true); },
      // the top of the Warden's Walk: a running jump clears the gallery flag and leaves the gate shut
      walkCheck(g) {
        if (g.flag('eastOpen') || g.flag('warnedEast')) return;
        g.flag('warnedEast', true);
        g.msg('Far below, the east gate is still shut. The cracked flag on the gallery must fall onto the cage first.', 7);
      },
    },
    legend: {
      // ---- rock: walls take the texture of the rock cell they belong to
      '(': { solid: true, wall: 'CELLS_TALLY' },                       // cell walls, scratched with tallies

      // ---- 1.1 your cell and the next one (S1)
      'c': { base: '.', light: 15, label: 'Your Cell' },
      '@': { base: 'c', start: 'E', tag: 'cellflag', loose: { delay: 6 }, ftex: 'LOOSE_FLAT' },  // shakes from the start
      'J': HG.gate('celldoor', { light: 22, door: { axis: 'x', msg: "The cell door. Locked - and the key hangs on the Warden's belt." } }), // lit by the hall
      'w': HG.gate('bars', { door: { msg: 'Iron bars, set deep in the stone.' } }),
      'h': { base: '.', light: 17, label: 'The Next Cell' },

      // ---- 1.2 the undercroft (S0): a crate, then a one-storey ledge
      'u': { base: '.', ftex: 'DUNGEON_FLOOR', light: 11, label: 'The Undercroft' },
      'U': { base: 'u', cl: 2.75, light: 12 },                          // two storeys tall (rock above)
      'a': { base: 'u', cl: 1.45, light: 12 },                          // the low room before the crate: room to climb (0.75 + 0.62), and your cell's wall above
      'k': { base: 'U', fl: 0.75, ftex: 'CELLS_CRATE_TOP', low: 'CRATE_WALL' }, // a crate: a 0.75 step
      'm': { base: 'u', light: 10, label: null },                       // the cellar under the band

      // ---- 1.3 the cell block (S1): cracked flags you must keep walking over
      's': { base: '.', light: 13, label: 'The Cell Block' },
      'Y': { base: 's', loose: {}, ftex: 'LOOSE_FLAT', light: 15 },    // a cracked flag (falls 0.7 s after you touch it)

      // ---- 1.4 the gate passage (S0): a plate and a see-through portcullis
      'p': { base: '.', light: 13, label: 'The Gate Passage' },
      '=': HG.plate({ opens: 'g1', hold: 6, msg: 'Click! A pressure plate. Ahead, the portcullis rises - it will not stay up for long.' }, { base: 'p', light: 17 }),
      '|': HG.gate('g1', { door: { msg: 'A portcullis. There must be a pressure plate nearby.' } }),

      // ---- 1.5 the Warden's Hall (S0, three storeys tall)
      'A': { base: ';', ftex: 'FLAGSTONE', light: 22, label: "The Warden's Hall" },
      '$': { base: 'A', ftex: 'CARPET_PERSIAN' },
      'j': HG.plate({ opens: 'g2', ftex: 'CELLS_IRON_PLATE', msg: 'Clang! Down in the hall the east gate grinds open - and this time it stays open.', script: 'eastGateOpens' },
        { base: '.', light: 22, label: null, ent: torchEnt(0, -0.42) }),   // the caged plate (hold 0: for good), lit by a torch
      '/': HG.gate('g2', { door: { msg: "The east gate. Its plate lies in the Warden's cage." } }),
      'e': { base: 'E', exit: true, cl: 2.75, light: 22 },               // the way out: a tall room under the moonlit arch
      ']': { solid: true, wall: 'CELLS_ARCH_LOW' },                     // the arch (S0 part; S1 has its own ']'): fullbright, seen from the start

      // ---- 1.6 the teeth (S0): spikes in sunken troughs
      'd': { base: '.', light: 13, label: 'The Teeth' },
      'V': { base: 'd', fl: -0.2, ftex: 'CELLS_TROUGH', light: 20, ent: { tpl: 'spikes', spriteOff: 'CELLS_TEETH' } },
      'D': { base: 'd', cl: 2.75, light: 15 },                          // tall corner below the leaping hall

      // ---- 1.7 the leaping hall (S1 platforms, two storeys tall) over pits at S0
      'y': { base: ',', ftex: 'SAND_FLOOR', light: 21, label: 'The Leaping Hall' },
      'R': { base: 'y', ftex: 'CARPET_PERSIAN' },                       // carpet run-ups
      '[': { pit: true, cl: 2.75, ctex: 'CEIL_DUNGEON', light: 15 },   // the gaps: open down to the pit floor
      'q': { base: '.', ftex: 'CELLS_CHECKER', light: 17, label: null }, // pit floor, one storey down
      'z': { base: 'q', fl: -0.5, light: 14 },                          // far half of a pit: its far face is 2.0, too high to climb

      // ---- 1.8 the Warden's gallery (S1): a cracked flag above the caged plate
      'g': { base: '.', ftex: 'CARPET_RED', light: 14, label: "The Warden's Gallery" },
      'f': { base: 'g', loose: {}, ftex: 'LOOSE_FLAT', light: 16 },

      // ---- 1.9 the Warden's Walk (S2) and the secret crawl space
      'W': { base: '.', ftex: 'SAND_FLOOR', cl: 1.0, light: 20, label: "The Warden's Walk" },   // 0.25 under the hall ceiling: a lintel frames it
      'r': { base: '.', cl: 0.9, light: 10, secret: true, label: null },  // a crawl space (0.9 tall)
      ')': { base: 'r', secret: false },

      // ---- wall torches (the cell takes the floor of its neighbours): < > n v = on the W E N S wall
      '<': torch(-0.42, 0), '>': torch(0.42, 0), 'n': torch(0, -0.42), 'v': torch(0, 0.42),
      // the big spaces: the hall's torches, one pair high by the east gate's window
      '{': torch(-0.42, 0, 0.62, 22), '}': torch(0.42, 0, [0.62, 2.2], 22), '*': torch(0, 0.42, 0.62, 22),
      'N': torch(0, -0.42, 2.4, 22),                                     // high on the hall's north wall, between the windows
    },
    layers: [
      // S0, z = 0: undercroft, gate passage, the Warden's Hall, the teeth, the leaping pits
      { z: 0, map: [
      // 0         1         2         3
      // 0123456789012345678901234567890123456789
        '                                        ', // 0
        '                                        ', // 1
        '                                        ', // 2
        '                                   %%%% ', // 3
        '                                   %  % ', // 4
        '                        j          %  % ', // 5
        '               %%%%%%%%%w%%%       %zz% ', // 6
        '               %AAAAAAANANA%       %zz% ', // 7
        '               %{AAAAAAAAAA%%%%%   %qq% ', // 8
        '            uuu%AAAAAAAAAA}%eee%   %  % ', // 9
        '       kUUkauuu%A$$$$$$$$$$/eee]   %  % ', // 10
        '       UUU  uuu%AAAAAAAAAA}%eee%   %  % ', // 11
        '       <UU     %APAAAAAAAAA%%%%%   %zz% ', // 12
        '       UUU     %AAA*AA*AAAA%       %qq% ', // 13
        '               %%|%%%%%%d%%%       %  % ', // 14
        '                 p      d          %  % ', // 15
        '        mm       p      d          %  % ', // 16
        '        mm       =      <          %qq% ', // 17
        '                 p      dd         %  % ', // 18
        '           54321pp      d          %  % ', // 19
        '           54321vp      d          %DD% ', // 20
        '                        dddddnVddVVdDD  ', // 21
        '                        ddddddVdvVVPDD  ', // 22
        '                                        ', // 23
      ] },
      // S1, z = 1.5: the cells, the cell block, the leaping hall, the Warden's gallery
      { z: 1.5, legend: { ']': { solid: true, wall: 'CELLS_ARCH_HIGH' } }, map: [   // ']' here: the arch's round top
      // 0         1         2         3
      // 0123456789012345678901234567890123456789
        '                                        ', // 0
        '                                        ', // 1
        '                                        ', // 2
        '                                   %%%% ', // 3
        '                %%%%%%%%%%%%%%%%%%g%{y% ', // 4
        '           ((((( 54321ggfgggggngggggyy% ', // 5
        '           (hnh%%%%%%%w%w%w%       %[[% ', // 6
        '           (hhh%           %       %[[% ', // 7
        '           ((w(%           %%%%%   %[[% ', // 8
        '           (cccJ           %   %   %{R% ', // 9
        '           (c@cJ           w   ]   %RR% ', // 10
        '           (cccJ           %   %   %RR% ', // 11
        '           (((((           %%%%%   %[[% ', // 12
        '               %           %       %[[% ', // 13
        '        ss     %%%%%%%%%%%%%       %R}% ', // 14
        '        ss                         %RR% ', // 15
        '        YY                         %RR% ', // 16
        '        YY                         %[[% ', // 17
        '        s>                         %yy% ', // 18
        '        sss                        %y}% ', // 19
        '        sss                        %  % ', // 20
        '                                        ', // 21
        '                                        ', // 22
        '                                        ', // 23
      ] },
      // S2, z = 3.0: the Warden's Walk, the crawl space
      { z: 3, map: [
      // 0         1         2         3
      // 0123456789012345678901234567890123456789
        '                                        ', // 0
        '                                        ', // 1
        '                                        ', // 2
        '                                        ', // 3
        '                                        ', // 4
        '               WW                       ', // 5
        '            _)rW%%%%%%%%%%%%            ', // 6
        '               W           %            ', // 7
        '               W           %            ', // 8
        '               <           %            ', // 9
        '               W           %            ', // 10
        '               W           %            ', // 11
        '               W           %            ', // 12
        '               W           %            ', // 13
        '               %%%%%%%%%%%%%            ', // 14
        '                                        ', // 15
        '                                        ', // 16
        '                                        ', // 17
        '                                        ', // 18
        '                                        ', // 19
        '                                        ', // 20
        '                                        ', // 21
        '                                        ', // 22
        '                                        ', // 23
      ] },
    ],
    // one-off entities by coordinate: z is the floor they stand on
    ents: [
      // 1.1 your cell and the next one (S1)
      carving(12, 9, 1.5, 0, -0.44, 'SCRATCHED INTO THE CELL WALL', 'THE FLOOR TOOK HAMID.\n\nThe cracked flag in the middle of this cell rattled for three days. Then it took him.'),
      { x: 12, y: 9, z: 1.5, ...deco('CELLS_CHAINS', { dx: 0.3, dy: 0.2 }) },
      { x: 13, y: 7, z: 1.5, type: 'item', item: 'bigpotion', scale: 1.3 },   // the secret's prize, glinting behind the bars (13,8)
      { x: 12, y: 6, z: 1.5, ...say('To climb back out: stand under the hole, face the crawl space (east) and press SPACE.', 0.6) },
      { x: 12, y: 6, z: 1.5, ...deco('BONES', { dx: 0.1, dy: 0.3 }) },
      carving(12, 7, 1.5, -0.44, 0, 'SCRATCHED BY THE LAST MAN IN THIS CELL', "I WROTE THE VIZIER'S LETTERS, SO I KNOW WHAT HIS GREAT HOURGLASS COUNTS.\n\nNot our days. The Sultan's. When the last grain falls, the Sultan drinks.\n\nWhoever reads this: run."),
      // 1.2 the undercroft (S0)
      { x: 12, y: 11, z: 0, ...deco('SKELETON') },                            // Hamid
      { x: 12, y: 11, z: 0, ...deco('RUBBLE', { dx: 0.25, dy: -0.2 }) },
      { x: 13, y: 10, z: 0, ...say('You fell through to the undercroft. Look up (PGUP) at the hole - then find another way up. West, a crate.') },
      { x: 11, y: 10, z: 0, ...say('A crate blocks the way. Walk up to it and press SPACE to climb.') },
      { x: 7, y: 10, z: 0.75, type: 'item', item: 'gem' },                    // on a second crate
      { x: 8, y: 12, z: 0, ...say('That ledge is a full storey up - SPACE climbs it too. Whenever SPACE: CLIMB shows at the bottom of the screen, you can climb.', 1.0) },
      // 1.3 the cell block (S1)
      { x: 9, y: 14, z: 1.5, ...say('Cracked flags ahead. They give way under a foot that stops - walk straight across and do not stop.', 1.0) },
      carving(8, 15, 1.5, -0.44, 0, 'SCRATCHED INTO THE WALL', 'THE CRACKED STONES HATE THE TIMID.'),
      // 1.5 the Warden's Hall (S0)
      { x: 24, y: 7, z: 0, type: 'note', title: "THE WARDEN'S CAGE", hint: 'A notice by the cage. Press E to read.',
        text: "The iron plate in this cage lifts the east gate.\n\nNo prisoner's hand can reach it. The Warden drops a stone on it from his gallery above, and the gate stays open until the stone is cleared.\n\nBy order of the Grand Vizier Qasim: no one leaves before the last grain of his hourglass falls." },
      { x: 16, y: 12, z: 0, ...deco('CELLS_SPLINT', { radius: 0.4 }) },      // under the Walk: he walked off it
      // 1.6 the teeth (S0)
      { x: 25, y: 18, z: 0, ...brazier },                                     // brazier 1: before the first lethal hazard
      { x: 24, y: 20, z: 0, ...say('Spikes ahead. Hold C and step slowly between them - run in and you die.', 0.6) },
      carving(27, 21, 0, 0, -0.44, 'SCRATCHED ABOVE THE TEETH', 'The spikes spring when a careless foot comes near.\n\nHold C and step slowly: careful feet never wake them.'),
      { x: 27, y: 21, z: 0, ...deco('SKULL', { dx: 0.3, dy: 0.35 }) },
      { x: 30, y: 21, z: -0.2, ...deco('SKELETON') },                         // a careless prisoner, still on the teeth, in your path
      { x: 37, y: 21, z: 0, ...say('The leaping hall is up there. Face the ledge and press SPACE to climb.', 1.2) },
      { x: 37, y: 21, z: 0, ...deco('BONES', { dx: 0.25, dy: 0.3 }) },
      // 1.7 the leaping hall (S1) and its pits (S0)
      { x: 36, y: 18, z: 1.5, ...say('A gap. Walk to the edge, hold FORWARD and press SPACE to jump. Fall in, and you can climb back out and try again.', 1.2) },
      { x: 36, y: 15, z: 1.5, ...say('Two tiles is too far for a standing jump. Run along the carpet and press SPACE as you reach the edge.', 1.2) },
      { x: 36, y: 10, z: 1.5, ...say('Three tiles is too far to land. Run, jump and keep FORWARD held: you will catch the far lip and pull yourself up.', 1.2) },
      { x: 37, y: 12, z: -0.5, type: 'item', item: 'gem' },                   // the bottom of pit B
      // 1.8 the Warden's gallery (S1)
      { x: 34, y: 4, z: 1.5, ...brazier },                                     // brazier 2: after the leaping hall, in a niche
      { x: 26, y: 5, z: 1.5, ...say("A cracked flag - right above the Warden's cage. Walk over it and let it fall.", 1.0) },
      // 1.9 the Warden's Walk (S2)
      { x: 16, y: 5, z: 3, type: 'trigger', script: 'walkCheck', once: false, radius: 0.8 },
      { x: 15, y: 7, z: 3, ...say('The hall floor is two storeys down: walk off and it will hurt. Face the hall (east), hold C and step to the edge, press FORWARD again to hang, then let go of C.', 1.0) },
    ],
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
