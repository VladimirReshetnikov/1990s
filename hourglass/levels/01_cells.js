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
 *      whole Warden's Hall at the east gate (27,10), the moonlit arch of the way
 *      out shining through a high window above it. Through bars on the north
 *      side (13,8): a great potion in the next cell. After 3.3 s of shaking the
 *      flag drops you one storey (safe) into...
 *  1.2 The Undercroft (S0 12..14,9..11, dark). Hamid's bones; look up through the
 *      hole. West: a crate (10,10, 0.75 high) blocks a tall passage - SPACE
 *      climbs it. Then the tall room (7..9,10..13): a one-storey ledge (1.5) up
 *      to the cell block - SPACE again. A gem on a second crate (7,10).
 *  1.3 The Cell Block (S1 8..10,14..20). A full-width band of cracked flags
 *      (8..9,16..17) over a cellar: walk or run straight across and they fall
 *      behind you; stop and you ride one down, then climb out through its hole.
 *  1.4 The Gate Passage (S0). Down a stair (11..15,19..20); a bronze plate
 *      (17,17) raises the see-through portcullis (17,14), three cells ahead and
 *      in plain view, for 6 s.
 *  1.5 The Warden's Hall (S0 16..26,7..13, 4.25 tall). The east gate (27,10)
 *      shows the way out; its iron plate sits in a barred, torch-lit cage (24,5)
 *      under the gallery, a notice (24,7) in front. Look up: your own cell front
 *      (S1, west wall), the gallery windows (S1, north wall, 22/24/26), the
 *      Warden's Walk (S2, west wall), the splinted skeleton under it (16,12).
 *  1.6 The Teeth (S0, from the south door 24,14). Brazier (24,18) in the passage,
 *      the corner (24,21), a 5-cell straight corridor, a full-width spike trough
 *      (30) with an impaled skeleton, then a two-cell trough (33..34). Hold C:
 *      careful steps never wake spikes. Running in kills you; the brazier is 9
 *      cells back. A potion after (35,22).
 *  1.7 The Leaping Hall (S1 36..37, heading NORTH, two storeys tall, sandstone).
 *      From the tall corner (36..37,20) climb onto the start ledge. Gaps over a
 *      lit checkered pit one storey deep: 1 cell (y 17, standing jump), 2 cells
 *      (y 12..13, running jump off a 3-cell carpet), 3 cells (y 6..8, run, jump,
 *      keep Forward held: catch the lip, pull up). The far half of pits B and C
 *      is 0.5 deeper, so their far face (2.0) cannot be climbed: a fall costs a
 *      climb back to the take-off and a retry. A gem at the bottom of pit B (37,12).
 *  1.8 The Warden's Gallery (S1 22..35,5, heading WEST). Brazier (34,5). Barred
 *      windows over the hall. The cracked flag (24,5) lies right above the caged
 *      plate: walk over it, it falls, the rubble jams the plate and the east gate
 *      opens for good. (Ride it down instead and you land in the cage on the
 *      plate - the gate opens too - and climb back out onto the gallery.)
 *  1.9 The Warden's Walk (S2 16,5 and 15,5..13, heading SOUTH). Up a stair
 *      (21..17,5). The hall floor is two storeys down: walking off costs a life;
 *      a hang-drop (C to the edge, Forward again, let go of C) is safe. Then east
 *      along the carpet, through the open gate to the way out (28..30,9..11).
 *      Secret: a low crawl space off the walk (14,6) ends in a hole (12,6) into
 *      the next cell and the great potion (13,6); climb back out the way you came.
 *
 * ROUTE: start (13,10 S1) -> drop -> crate (10,10) -> ledge (8,14 S1) -> band
 * -> stair -> plate (17,17) -> gate 1 -> hall -> south door (24,14) -> brazier
 * -> teeth -> climb (36,20) -> gaps 1, 2, 3 north -> brazier (34,5) -> gallery
 * west over the flag (24,5) -> stair up -> walk south -> hang-drop into the hall
 * -> east gate (27,10) -> the way out.  A scripted run with real keys takes 51 s
 * without a scratch; a first run takes a few minutes.
 *
 * HOW IT IS BUILT (the patterns to copy):
 *  - One legend character per kind of cell. Entities stand in cells via
 *    at(base, ...), so their floor height is explicit, not guessed from the
 *    neighbours (base 'auto' picks the lowest neighbour: fine for torches in a
 *    uniform room, wrong next to a crate or a tall passage).
 *  - Tall spaces are ',' (2.75) or ';' (4.25) in the lower layer with rock in
 *    the layers above; a hole is a pit character in the upper layer over a floor.
 *  - Unclimbable pit walls: sink the floor 0.5 next to the far side (face 2.0).
 *  - Torches are sprites pushed against a wall (dx/dy) in a cell whose light is
 *    raised and flickers: every torch makes a pool of light. Big spaces are lit
 *    brighter (22-26) or their far walls fade to black across 12+ cells.
 *  - Windows are portcullis gates no plate ever opens. Keep windows along a wall
 *    one cell apart: the bars' plane is guessed from the open neighbours.
 *  - Braziers in 1-wide passages are nudged <= 0.25 toward a wall, so you walk
 *    past (and light) them without walking through the flames.
 *  - Triggers teach each key the moment it is needed.
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
  // the spike troughs: dark iron grating the spikes come up through
  R.defTexture('CELLS_TROUGH', {
    gen(p, c) {
      p.fill('#241c16');
      for (let y = 4; y < 64; y += 10) for (let x = 4; x < 64; x += 10) { p.disc(x + 1, y + 1, 2.2, '#0a0806'); p.px(x, y, '#6a6a70'); }
      p.frame(0, 0, 64, 64, '#4a3a2a').grain(0.2, c.seed);
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
  // the way out: an arch open to the night, painted fullbright (emissive) so it shines from across
  // the level. 128 texels = 2 units, world-aligned: rows 0..127 run from z 2.0 down to z 0, so the
  // opening (rows 16..78) sits between z 0.8 and 1.75 and the plain rows repeat above z 2.
  R.defTexture('CELLS_MOONLIGHT', {
    h: 128, emissive: true,
    gen(p, c) {
      TH.blocks(p, c, { base: '#9a7a50', mortar: '#4a3420', bw: 32, bh: 16, cracks: 0.1, grain: 0.25 });
      p.ellipse(32, 30, 22, 16, '#c8a060'); p.rect(10, 30, 44, 50, '#c8a060');          // the arch frame
      p.ellipse(32, 30, 19, 14, '#0c1430'); p.rect(13, 30, 38, 48, '#0c1430');          // night beyond it
      p.vgrad(13, 44, 38, 34, '#0c1430', '#2a3a68');
      const r = c.rng;
      for (let i = 0; i < 22; i++) p.px(14 + r() * 36, 18 + r() * 44, r() < 0.3 ? '#ffffff' : '#a0b0d0');
      p.disc(41, 30, 6, '#f0ecd0'); p.disc(44, 28, 5, '#0c1430');                       // a crescent moon
      for (let k = 0; k < 4; k++) p.rect(13 + k * 3, 66 + k * 3, 38 - k * 6, 3, k % 2 ? '#8a6a40' : '#a07c4c'); // steps up and out
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

  // ------------------------------------------------------------ legend helpers
  /** Entities standing in a cell of kind `base` (explicit, so heights never come from a guess). */
  const at = (base, ...ents) => ({ base, ent: ents.length === 1 ? ents[0] : ents });
  /** A message the first time you walk here (radius in cells). */
  const say = (text, radius = 0.8) => ({ type: 'trigger', text, radius, time: 7 });
  /** Words scratched into the wall: a readable note pushed dx/dy against a wall. */
  const carving = (title, text, dx, dy) => ({ type: 'note', title, text, sprite: 'CELLS_CARVING', dx, dy, z: 0.3, hint: 'Words are scratched into the stone. Press E to read.' });
  /** A wall torch: a lit, flickering cell with a torch pushed against one wall; z is its height above
   *  the floor (an array puts one torch at each height). */
  const torchEnt = (dx, dy, z = 0.62) => ({ type: 'deco', sprite: 'TORCH', z, radius: 0.1, dx, dy });
  const torch = (dx, dy, z = 0.62, light = 20) => ({
    base: 'auto', light, anim: { type: 'flicker', depth: 3 }, ent: [].concat(z).map(h => torchEnt(dx, dy, h)),
  });
  const deco = (sprite, extra) => Object.assign({ type: 'deco', sprite, radius: 0.3 }, extra || {});
  /** A checkpoint brazier nudged toward a wall (dx/dy), so you walk past it in a 1-wide passage and it still lights. Keep
   *  the nudge <= 0.25: you respawn on the brazier, and your body (radius 0.24) must not overlap the wall. */
  const brazier = (base, dx = 0, dy = 0) => at(base, { type: 'checkpoint', dx, dy });

  R.defineLevel({
    id: 'cells', order: 1,
    name: 'The Cells',
    subtitle: 'Below the palace, where the Vizier keeps those who know too much.',
    width: 40, height: 24,
    music: 'cells',
    startMessage: 'Your cell. The cracked flag under your feet is giving way! (ARROWS walk and turn)',
    scripts: {
      // The opening drop, run by the start flag's `enter` (so it also runs when "Back to the Brazier"
      // puts you back on the flag before any brazier is lit). You stand on the flag, so it starts
      // shaking at once; 3.3 s later - just before its own 3.6 s delay runs out - it is removed
      // instantly, with no falling slab. ENGINE NOTE: a slab that falls with its rider lands with
      // them and hurts them ("Hit by falling masonry!"), and the first drop of the game must be safe.
      // Once the engine spares a riding player, delete this script and the flag's `enter`.
      cellFloor(g) {
        g.after(3.3, () => {
          const s = g.spansTagged('cellflag')[0];
          if (!s || !s.loose || s.loose.state === 'fallen') return;
          g.dropFloor(s, true);
          g.sound('crumble', s.cell.x + 0.5, s.cell.y + 0.5, 1, s.baseFl);
          g.shake(0.5);
        });
      },
      // runs when the east gate opens (the rubble on the caged plate holds it open for good)
      eastGateOpens(g) { g.msg('Clang! Down in the hall the east gate grinds open - and this time it stays open.', 6); },
    },
    legend: {
      // ---- rock: walls take the texture of the rock cell they belong to
      '(': { solid: true, wall: 'CELLS_TALLY' },                       // cell walls, scratched with tallies

      // ---- 1.1 your cell and the next one (S1)
      'c': { base: '.', light: 15, label: 'Your Cell' },
      '@': { base: 'c', start: 'E', tag: 'cellflag', loose: { delay: 3.6 }, ftex: 'LOOSE_FLAT', enter: 'cellFloor' },
      'H': at('c', carving('SCRATCHED INTO THE CELL WALL', 'THE FLOOR TOOK HAMID.\n\nThe cracked flag in the middle of this cell rattled for three days. Then it took him.', 0, -0.44),
        deco('CELLS_CHAINS', { dx: 0.3, dy: 0.2 })),
      'J': HG.gate('celldoor', { light: 22, door: { msg: "The cell door. Locked - and the key hangs on the Warden's belt." } }), // lit by the hall
      'w': HG.gate('bars', { door: { msg: 'Iron bars, set deep in the stone.' } }),
      'h': { base: '.', light: 17, label: 'The Next Cell' },
      '`': at('h', say('To climb back out: stand under the hole, face the crawl space (east) and press SPACE.', 0.6), deco('BONES', { dx: 0.1, dy: 0.3 })),

      // ---- 1.2 the undercroft (S0): a crate, then a one-storey ledge
      'u': { base: '.', ftex: 'DUNGEON_FLOOR', light: 11, label: 'The Undercroft' },
      'U': { base: 'u', cl: 2.75, light: 12 },                          // two storeys tall (rock above)
      'k': { base: 'U', fl: 0.75, ftex: 'CELLS_CRATE_TOP', low: 'CRATE_WALL' }, // a crate: a 0.75 step
      'K': at('k', { type: 'item', item: 'gem' }),                      // a second crate, a gem on top
      'Z': at('u', deco('SKELETON'), deco('RUBBLE', { dx: 0.25, dy: -0.2 })),   // Hamid
      '0': at('u', say('You fell through to the undercroft. Look up (PGUP) at the hole - then find another way up. West, a crate.')),
      'a': at('U', say('A crate blocks the way. Walk up to it and press SPACE to climb.')),
      'i': at('U', say('That ledge is a full storey up - SPACE climbs it too. Whenever SPACE: CLIMB shows at the bottom of the screen, you can climb.', 1.0)),
      'm': { base: 'u', light: 10, label: null },                       // the cellar under the band

      // ---- 1.3 the cell block (S1): cracked flags you must keep walking over
      's': { base: '.', light: 13, label: 'The Cell Block' },
      'Y': { base: 's', loose: {}, ftex: 'LOOSE_FLAT', light: 15 },    // a cracked flag (falls 0.7 s after you touch it)
      'b': at('s', say('Cracked flags ahead. They give way under a foot that stops - walk straight across and do not stop.', 1.0)),
      'l': at('s', carving('SCRATCHED INTO THE WALL', 'THE CRACKED STONES HATE THE TIMID.', -0.44, 0)),

      // ---- 1.4 the gate passage (S0): a plate and a see-through portcullis
      'p': { base: '.', light: 13, label: 'The Gate Passage' },
      '=': HG.plate({ opens: 'g1', hold: 6, msg: 'Click! A pressure plate. Ahead, the portcullis rises - it will not stay up for long.' }, { base: 'p', light: 17 }),
      '|': HG.gate('g1', { door: { msg: 'A portcullis. There must be a pressure plate nearby.' } }),

      // ---- 1.5 the Warden's Hall (S0, three storeys tall)
      'A': { base: ';', ftex: 'FLAGSTONE', light: 22, label: "The Warden's Hall" },
      '$': { base: 'A', ftex: 'CARPET_PERSIAN' },
      'j': HG.plate({ opens: 'g2', ftex: 'CELLS_IRON_PLATE' }, { base: '.', light: 24, label: null, ent: torchEnt(0, -0.42) }),   // the caged plate (hold 0: for good), lit by a torch
      '/': HG.gate('g2', { door: { msg: "The east gate. Its plate lies in the Warden's cage.", script: 'eastGateOpens' } }),
      '?': at('A', { type: 'note', title: "THE WARDEN'S CAGE", text: "The iron plate in this cage lifts the east gate.\n\nNo prisoner's hand can reach it. The Warden drops a stone on it from his gallery above, and the gate stays open until the stone is cleared.", hint: 'A notice by the cage. Press E to read.' }),
      'S': at('A', deco('CELLS_SPLINT', { radius: 0.4 })),
      'e': { base: 'E', exit: true, cl: 2.75, light: 26 },               // the way out: a tall room under a moonlit arch
      ']': { solid: true, wall: 'CELLS_MOONLIGHT' },                    // the arch: fullbright, a landmark seen from the start

      // ---- 1.6 the teeth (S0): spikes in sunken troughs
      'd': { base: '.', light: 13, label: 'The Teeth' },
      'V': { base: 'd', fl: -0.2, ftex: 'CELLS_TROUGH', light: 16, ent: { tpl: 'spikes' } },
      'X': { base: 'V', ent: [{ tpl: 'spikes' }, deco('SKELETON')] },   // a careless prisoner, still on the teeth
      'D': { base: 'd', cl: 2.75, light: 15 },                          // tall corner below the leaping hall
      'F': at('d', carving('SCRATCHED ABOVE THE TEETH', 'The spikes spring when a careless foot comes near.\n\nHold C and step slowly: careful feet never wake them.', 0, -0.44), deco('SKULL', { dx: 0.3, dy: 0.35 })),
      't': at('d', say('Spikes ahead! Hold C to step carefully and walk slowly between them. Run in and you die - but the brazier will bring you back.', 1.0)),
      '-': brazier('d', 0.2, 0),                                        // brazier 1: before the first lethal hazard
      'I': at('D', say('The leaping hall is up there. Face the ledge and press SPACE to climb.', 1.2), deco('BONES', { dx: 0.25, dy: 0.3 })),

      // ---- 1.7 the leaping hall (S1 platforms, two storeys tall) over pits at S0
      'y': { base: ',', ftex: 'SAND_FLOOR', light: 21, label: 'The Leaping Hall' },
      'R': { base: 'y', ftex: 'CARPET_PERSIAN' },                       // carpet run-ups
      '[': { pit: true, cl: 2.75, ctex: 'CEIL_DUNGEON', light: 15 },   // the gaps: open down to the pit floor
      'q': { base: '.', ftex: 'CELLS_CHECKER', light: 17, label: null }, // pit floor, one storey down
      'z': { base: 'q', fl: -0.5, light: 14 },                          // far half of a pit: its far face is 2.0, too high to climb
      'M': at('z', { type: 'item', item: 'gem' }),
      '6': at('y', say('A gap. Walk to the edge, hold FORWARD and press SPACE to jump. Fall in, and you can climb back out and try again.', 1.2)),
      '7': at('R', say('Two tiles is too far for a standing jump. Run along the carpet and press SPACE as you reach the edge.', 1.2)),
      '8': at('R', say('Three tiles is too far to land. Run, jump and keep FORWARD held: you will catch the far lip and pull yourself up.', 1.2)),

      // ---- 1.8 the Warden's gallery (S1): a cracked flag above the caged plate
      'g': { base: '.', ftex: 'CARPET_RED', light: 14, label: "The Warden's Gallery" },
      'f': { base: 'g', loose: {}, ftex: 'LOOSE_FLAT', light: 16 },
      '"': brazier('g', 0, -0.2),                                      // brazier 2: after the leaping hall
      '9': at('g', say("A cracked flag - right above the Warden's cage. Walk over it and let it fall.", 1.0)),

      // ---- 1.9 the Warden's Walk (S2) and the secret crawl space
      'W': { base: '.', ftex: 'SAND_FLOOR', cl: 1.0, light: 20, label: "The Warden's Walk" },   // 0.25 under the hall ceiling: a lintel frames it
      '&': at('W', say('The hall floor is two storeys down: walk off and it will hurt. Hold C, step to the edge, press FORWARD again to hang from the lip, then let go of C to drop.', 1.0)),
      'r': { base: '.', cl: 0.9, light: 10, secret: true, label: null },  // a crawl space (0.9 tall)
      ')': { base: 'r', secret: false },

      // ---- wall torches (the cell takes the floor of its neighbours): < > n v = on the W E N S wall
      '<': torch(-0.42, 0), '>': torch(0.42, 0), 'n': torch(0, -0.42), 'v': torch(0, 0.42),
      // the big spaces are lit brighter so they read across 15 cells: the hall and the leaping hall
      '{': torch(-0.42, 0, 0.62, 26), '}': torch(0.42, 0, [0.62, 2.2], 26), '*': torch(0, 0.42, 0.62, 26),
      'N': torch(0, -0.42, 2.4, 26),                                     // high on the hall's north wall, between the windows
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
        '               %AAAAAAAN?NA%       %zz% ', // 7
        '               %{AAAAAAAAAA%%%%%   %qq% ', // 8
        '            uuu%AAAAAAAAAA}%eee]   %  % ', // 9
        '       KUUkau0u%A$$$$$$$$$$/eee]   %  % ', // 10
        '       UUU  Zuu%AAAAAAAAAA}%eee]   %  % ', // 11
        '       <iU     %SPAAAAAAAAA%%%%%   %zM% ', // 12
        '       UUU     %AAA*AA*AAAA%       %qq% ', // 13
        '               %%|%%%%%%d%%%       %  % ', // 14
        '                 p      d          %  % ', // 15
        '        mm       p      d          %  % ', // 16
        '        mm       =      <          %qq% ', // 17
        '                 p      -          %  % ', // 18
        '           54321pp      d          %  % ', // 19
        '           54321vp      d          %DD% ', // 20
        '                        dddFdnVddVVdDI  ', // 21
        '                        dtddddXdvVVPDD  ', // 22
        '                                        ', // 23
      ] },
      // S1, z = 1.5: the cells, the cell block, the leaping hall, the Warden's gallery
      { z: 1.5, map: [
      // 0         1         2         3
      // 0123456789012345678901234567890123456789
        '                                        ', // 0
        '                                        ', // 1
        '                                        ', // 2
        '                                   %%%% ', // 3
        '                %%%%%%%%%%%%%%%%%%%%{y% ', // 4
        '           ((((( 54321ggfg9gggnggg"gyy% ', // 5
        '           (`Bh%%%%%%%w%w%w%       %[[% ', // 6
        '           (hhh%           %       %[[% ', // 7
        '           ((w(%           %%%%%   %[[% ', // 8
        '           (HccJ           %   ]   %{R% ', // 9
        '           (c@cJ           w   ]   %8R% ', // 10
        '           (cccJ           %   ]   %RR% ', // 11
        '           (((((           %%%%%   %[[% ', // 12
        '               %           %       %[[% ', // 13
        '        sb     %%%%%%%%%%%%%       %R}% ', // 14
        '        ls                         %7R% ', // 15
        '        YY                         %RR% ', // 16
        '        YY                         %[[% ', // 17
        '        s>                         %6y% ', // 18
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
        '            _)r&%%%%%%%%%%%%            ', // 6
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
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
