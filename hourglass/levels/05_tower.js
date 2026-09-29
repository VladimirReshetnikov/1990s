/*
 * LEVEL 5 — The Vizier's Tower (the last level; its exit ends the game).
 *
 * STOREYS (Sk = floor at 1.5k): layers z = 0 (S0) .. 12 (S8, the roof), plus
 * z = 13.5, which only caps the enclosed top of the dart stair with sky.
 * Coordinates are (x, y), y growing south; map 30 x 22. The legend holds kinds of
 * cell; single things (wall torches, notes, rocks, dart slots, the boulder, the
 * Seal...) are placed by coordinate in `ents`, grouped by set-piece at the end.
 *
 * THE ATRIUM: box x 13..23, y 5..14; its 9 x 8 void (x 14..22, y 6..13) is
 * open from the S0 floor to the dawn sky (sky 'DAWN'; falloff 0.6, so its far
 * walls read from every storey). Its ring holds, storey by storey:
 * S0 a colonnade (ceiling 1.9); S2 an arcade all round (the Ring of Teeth; its
 * south side has fallen in, rubble below); S4 the Clockwork Gallery along the
 * north side; S6 the south balcony; S8 the roof round the hatch. Blue tile
 * friezes band the odd storeys so you can count them from anywhere. The Seal's
 * red-and-cream column (15..16, 7..8) rises from S0 to S6; three floating
 * stepping-stones hang at S6 east of it (18,7) (20,7) (22,7). The Vizier's great
 * hourglass (HOURGLASS_GREAT x2, the game's namesake) stands on an ablaq stand
 * (18,10) 2.0 high in the middle of the floor, in the first view and seen again
 * from the Ring of Teeth and the gallery; out of reach (2.0 is unclimbable, and
 * it is 4 cells from every ledge above it).
 *
 * SET-PIECES
 *  5.1 The Atrium (S0): enter from the south hall (start 19,17). The great
 *      hourglass, the S4 crushers and pendulum, the S6 bridge and stones are all
 *      seen from below. Climb the plinth (13,12) to S1 (brazier), then the arcade
 *      at (13,11), S2.
 *  5.2 The Ring of Teeth (S2 arcade): three 1-deep troughs of teeth (drawn 1.25x
 *      so their tips stand above the rim), each followed at once by a cracked flag
 *      and then solid floor - (13,8)/(13,7), (16,5)/(17,5), (20,5)/(21,5).
 *      Careful-step to the lip, standing jump, keep walking. Stopping on a flag
 *      drops you 3.0 into the atrium (-1) beside the plinth climb. East arc: the
 *      slicer door (24..28, 8), brazier (25,8), a thief cut in two (26,8), the
 *      jaws (27,8).
 *  East stair: flight (28, 7..3) to the S3 landing (28,2), flight (27..23, 2)
 *      to S4 (22,2), brazier (22,3).
 *  5.3 The Clockwork Gallery (S4, y 5): plate (22,5) raises the gate (13,5) for
 *      12 s (sand-glasses at both). Between them, straight west: crusher (19,5),
 *      crusher (17,5), pendulum (15,5), safe cells between. Too late? The hole
 *      (14,4) drops you 2.0 into the Undercroft (S3, y 3). Its landing (14,4) is
 *      sunk 0.5 below the corridor (steps (14,3)), so the lip above it is 2.0 and
 *      cannot be climbed: the loop is one-way, east to a climb (21,3) -> (22,3)
 *      back beside the plate - it never skips the gallery. Beyond the gate, the
 *      Clockwork Room (9..12, 3..7), the clockmaker's daybook (11,3): a cracked
 *      ceiling flag over (9,5). Jump straight up under it, step back, then climb
 *      west through the hole onto the Clockmaker's Loft (8,5), S5. This is the
 *      only way on (verify.js models the knock).
 *  S5 the Loft: gears in its walls; west past the clockmaker's last words (7,5)
 *      to his bones (6,5), then south along x 6. A rockfall niche with a skeleton
 *      at (5,10) shows the falling rocks; then rocks fall on the loft itself at
 *      (6,12) and (6,14) (dust first; wait at (6,13)); east along y 15, climb
 *      (12,15) -> (12,14). A secret door (11,14) opens on a stair down to a
 *      dead-end closet with the great potion (12,11) S4.
 *  5.4 The Seal (S6): south balcony (12..16, 14), brazier (12,14). The bridge
 *      (16, 13..9), one tile wide, rocks falling on (16,12) and (16,10), leads to
 *      the column top (15..16, 7..8). Its brazier (16,8) lights as you step on,
 *      always before you reach the Seal (at the column's centre, with the Vizier's
 *      letter beside it at (15,8)): a respawn there puts back the bridge and the
 *      Seal, and as the Seal is within reach of the brazier you take it again at
 *      once and the bridge falls again - never a half-fallen bridge in a snapshot.
 *      Taking the Seal (trigger, script sealTaken) sends g.crumble through the
 *      bridge from the column outward: its tiles are loose { armed: false }, solid
 *      until then (the solver treats them as floor). Onward east over the three
 *      bobbing stones (a trigger at (16,7) says how: hold C, standing jumps over
 *      1-cell gaps, stop on each 1x1 stone) to the East Landing (23,7), brazier.
 *      A fall from the bridge or the stones kills.
 *  5.5 The Dart Stair: a straight stair (25, 8..19), S6 -> S8, south = up.
 *      A boulder rolls down every 6 s from a niche (26,19) into a chute (26,7)
 *      beside the foot (rubble in it) - watch it go by from the passage (24,7),
 *      then climb; a torch at the foot (25,8) shows the turn south. Torch-lit
 *      alcoves every 3 steps (26,10) (26,13) (26,16). At the top a potion (23,20),
 *      then turn west: two dart slots fire across (22,20) and (21,20) alternately.
 *  5.6 The Roof (S8): the Seal opens the door (19,20) onto the roof at dawn. The
 *      south terrace (14..18, 16..20) is walled from the hatch and joins the ring
 *      at its SW corner (13,15) (brazier at the neck (13,16)), so the hatch is
 *      always a drop to the side: walk the ring, look straight down the whole
 *      climb, and go round to the north terrace and the way out (16..17, 2).
 *
 * ROUTE: hall -> atrium -> plinth -> west arc N -> north arc E -> east arc ->
 * slicer -> east stair -> plate -> gallery W -> gate -> room -> knock the flag ->
 * loft -> balcony -> bridge -> Seal -> stones E -> east landing -> dart stair S ->
 * darts W -> Seal door -> roof -> hatch -> exit N.  verify.js: about 41 s of
 * optimal play; about 2 minutes for a player who knows it (waits included); 3 or
 * more on a careful first run.
 *
 * Braziers: plinth (13,12) S1, slicer door (25,8) S2, stair top (22,3) S4,
 * balcony (12,14) S6, column top (16,8) S6, east landing (23,7) S6, terrace neck
 * (13,16) S8. Gems: (22,12) S0, (14,14) S2, (17,3) S3, (26,13) S7. Potions:
 * (23,12) S2, (12,6) S4, (10,15) S5, (23,20) S8; great potion (12,11) S4 behind
 * the secret door (11,14) in the loft.
 *
 * NOTE for tools/replay.js: the boulder reaches every cell of the dart stair, so
 * its whole climb (23,7) -> (23,20) is one 17-cell hazard corridor, beyond the
 * planner's 1000-trial budget (a replay limit, not a level fault). It is proven
 * with the real Game at 120 Hz: from the passage (24,7) or an alcove, go up to
 * the next alcove only when the boulder will not be on that stretch while you
 * are - unhurt from every start moment, running or walking (climbing blind is
 * hit every time). The stones are bobbing floors (not replayed).
 */
(function (R) {
  'use strict';
  const { HG } = R;
  const T = R.defTexture, S = R.defSprite, H = R.texHelpers;

  // ------------------------------------------------------------------ level textures & sprites
  /** Glazed blue tiles with gold stars: the frieze that marks every storey of the atrium. */
  T('TOWER_BAND', {
    gen(p, c) {
      H.tiles(p, c, { ts: 16, base: '#1e5070', alt: '#246080', grout: '#0c1c28', vary: 0.1 });
      for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
        const cx = x + 8, cy = y + 8;
        p.poly([[cx, cy - 5], [cx + 2, cy - 2], [cx + 5, cy], [cx + 2, cy + 2], [cx, cy + 5], [cx - 2, cy + 2], [cx - 5, cy], [cx - 2, cy - 2]], '#d0a038');
        p.px(cx, cy, '#fff0b0');
      }
      p.rect(0, 0, 64, 3, '#c89a30').rect(0, 61, 64, 3, '#6a4a18');
    },
  });
  /** Red and cream voussoirs (ablaq): the Vizier's column. */
  T('TOWER_COLUMN', {
    gen(p, c) {
      const r = c.rng;
      for (let y = 0; y < 64; y += 16) {
        const red = (y / 16) % 2 === 1;
        p.rect(0, y, 64, 16, red ? '#8a3424' : '#cdb48a');
        for (let x = (red ? 8 : 0); x < 64; x += 16) p.rect(x, y, 1, 16, red ? '#4a1810' : '#7a6448');
        p.rect(0, y + 15, 64, 1, red ? '#4a1810' : '#7a6448');
        p.bevel(0, y, 64, 15, 1.15, 0.8);
      }
      for (let i = 0; i < 40; i++) p.px(r() * 64, r() * 64, '#000000', 0.25);
      p.grain(0.2, c.seed);
    },
  });
  /** An eight-pointed star in cream on night blue: the atrium floor. */
  T('TOWER_MOSAIC', {
    gen(p) {
      p.fill('#1a2a48');
      const star = (s, col) => { p.poly([[32 - s, 32 - s], [32 + s, 32 - s], [32 + s, 32 + s], [32 - s, 32 + s]], col); p.poly([[32, 32 - s * 1.41], [32 + s * 1.41, 32], [32, 32 + s * 1.41], [32 - s * 1.41, 32]], col); };
      star(20, '#c8a860'); star(16, '#e8dcc0'); star(9, '#8a2820'); star(5, '#d8b050');
      p.frame(0, 0, 64, 64, '#c8a860').frame(1, 1, 62, 62, '#0c1428');
      for (const [x, y] of [[4, 4], [59, 4], [4, 59], [59, 59]]) p.disc(x, y, 2, '#d8b050');
    },
  });
  /** Terracotta roof tiles. */
  T('TOWER_ROOF', { gen: (p, c) => H.tiles(p, c, { ts: 16, base: '#8a4a2a', alt: '#7a3e24', grout: '#3a1c10', vary: 0.12, grain: 0.2 }) });
  /** Bronze clockwork set in dark stone. */
  T('TOWER_GEARS', {
    gen(p, c) {
      c.call('SANDSTONE_DARK', p);
      const gear = (cx, cy, r, teeth) => {
        for (let k = 0; k < teeth; k++) { const a = k / teeth * Math.PI * 2; p.disc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.2, '#8a6a28'); }
        p.disc(cx, cy, r, '#a07a30'); p.disc(cx, cy, r - 3, '#5a4018'); p.disc(cx, cy, 2.5, '#c8a050');
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; p.line(cx, cy, cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3), '#a07a30'); }
      };
      gear(20, 22, 13, 12); gear(44, 42, 10, 9); gear(50, 12, 6, 7);
    },
  });
  /** The door to the roof, sealed with the Vizier's crest. */
  T('TOWER_SEALDOOR', {
    gen(p, c) {
      H.door(p, c, { wood: '#5a3414' });
      p.rect(0, 0, 64, 4, '#d0a030').rect(0, 0, 4, 64, '#d0a030').rect(60, 0, 4, 64, '#d0a030');
      p.disc(32, 30, 12, '#8a6a10'); p.disc(32, 30, 10, '#e0b030');
      p.poly([[32, 22], [35, 28], [41, 28], [36, 32], [38, 38], [32, 34], [26, 38], [28, 32], [23, 28], [29, 28]], '#8a1010');
    },
  });
  /** A sand-glass on a post: the timer of a timed gate (one at the plate, one at the gate). */
  S('TOWER_SANDGLASS', {
    w: 16, h: 34, scale: 1.2, emissive: true,
    gen(p) {
      p.rect(7, 22, 2, 12, '#4a3a20'); p.rect(3, 32, 10, 2, '#4a3a20');
      p.rect(2, 1, 12, 2, '#b08a30'); p.rect(2, 20, 12, 2, '#b08a30');
      p.poly([[3, 3], [13, 3], [9, 11], [7, 11]], '#a8c8d8'); p.poly([[7, 11], [9, 11], [13, 20], [3, 20]], '#a8c8d8');
      p.poly([[5, 5], [11, 5], [8, 10]], '#e8c060'); p.poly([[8, 12], [12, 20], [4, 20]], '#e8c060');
    },
  });

  /** The Ring of Teeth: tall steel teeth in a trough; they reach the rim so you can see them. */
  S('TOWER_TEETH', {
    w: 32, h: 34, scale: 1.8,
    gen(p) {
      for (let x = -2; x < 32; x += 5) {
        const h = 1 + ((x * 7 + 21) % 5);
        p.poly([[x, 34], [x + 2.5, h], [x + 5, 34]], '#8a9098');
        p.line(x + 2.5, h + 1, x + 2.5, 32, '#e0e4ec');
        p.px(x + 2.5, h, '#ffffff');
      }
      p.rect(0, 31, 32, 3, '#2a2a2e');
      p.px(9, 9, '#8a1010'); p.px(9, 10, '#8a1010'); p.px(21, 12, '#8a1010');
    },
  });

  // drawn 1.25x: the pointed tips stand just above the trough's rim, so a runner sees them coming
  const TEETH = { tpl: 'spikesUp', spriteOn: 'TOWER_TEETH', scale: 1.25, msg: 'Impaled on the teeth!' };
  const CAP_HIGH = { fl: 0.5, cl: 1.5, sky: true, ftex: 'TOWER_ROOF', low: 'SANDSTONE', light: 18 };

  // ------------------------------------------------------------------ entity specs for `ents` ({ x, y, z: floor, ...spec })
  const deco = (sprite, extra) => Object.assign({ type: 'deco', sprite }, extra || {});
  /** A torch on a wall: `z` of an ents entry is the floor, so its height is given as zAbs. */
  const torch = (x, y, z, dx = 0, dy = 0) => ({ x, y, z, type: 'deco', sprite: 'TORCH', radius: 0.1, dx, dy, zAbs: z + 0.55 });
  const note = (title, text, extra) => Object.assign({ type: 'note', title, text }, extra || {});
  const rock = phase => ({ tpl: 'rock', phase });

  R.defineLevel({
    id: 'tower', order: 5,
    name: "The Vizier's Tower",
    subtitle: 'Up through the atrium to the roof, before the last grain falls.',
    width: 30, height: 22,
    music: 'tower',
    sky: 'DAWN',                     // the roof at daybreak: domes and minarets above the terrace walls
    falloff: 0.6,                    // the atrium's far walls and upper storeys read from its floor
    startMessage: "The Vizier's Tower. His Seal waits high in the atrium, and above the roof the sky is already paling. Climb!",
    legend: {
      '@': { base: 'h', start: 'N' },
      'h': { base: ',', ftex: 'PALACE_TILE', light: 16, label: "The Vizier's Tower" },
      'A': { base: '.', ftex: 'TOWER_MOSAIC', light: 19, label: 'The Atrium' },
      'c': { base: '.', cl: 1.9, ftex: 'PALACE_TILE', light: 17, label: 'The Atrium' },
      'U': { solid: true, wall: 'TOWER_COLUMN' },
      'H': { base: 'A', fl: 0.5, low: 'TOWER_COLUMN' },           // S1: the top of the great hourglass's stand, 2.0 up
      'z': { solid: true, wall: 'TOWER_BAND' },
      'Z': { solid: true, wall: 'TOWER_GEARS' },
      '`': { base: '_', ctex: 'SANDSTONE_DARK', up: 'TOWER_COLUMN' },
      '*': { base: '_', sky: true },
      'p': { base: '.', cl: 2.75, low: 'SANDSTONE', light: 20, ent: [{ type: 'checkpoint' }, { type: 'deco', sprite: 'TORCH', z: 0.55, radius: 0.1, dx: -0.42 }] },
      'g': { base: '.', ftex: 'SAND_FLOOR', light: 16, label: 'The Ring of Teeth' },
      't': { base: 'g', fl: -1.0, cl: 1.25, ftex: 'DUNGEON_FLOOR', low: 'DUNGEON_WALL', light: 18, ent: TEETH },
      'f': { base: 'g', loose: {}, ftex: 'LOOSE_FLAT' },
      'e': { base: '.', ftex: 'PALACE_TILE', light: 15, label: 'The Slicer Door' },
      'l': { base: '.', light: 13, label: 'The Undercroft' },
      'u': { base: 'l', cl: 2.75, label: null },
      'v': { base: 'l', fl: -0.5 },                               // the landing under the hole: 2.0 below the gallery, too high to climb back
      'i': { base: 'l', fl: -0.25 },                              // a step up out of that landing
      'k': { base: '.', ftex: 'PALACE_TILE', light: 16 },
      'y': { base: '.', ftex: 'PALACE_TILE', light: 18, label: 'The Clockwork Gallery' },
      '=': HG.plate({ opens: 'clock', hold: 12, msg: 'Click! Far down the gallery the portcullis rises.' }, { light: 18, label: 'The Clockwork Gallery' }),
      '|': HG.gate('clock', { light: 21, door: { msg: 'A portcullis. The plate at the far end of the gallery raises it.' } }),
      'K': { base: 'y', ctex: 'CRUSHER', up: 'CRUSHER', anim: { type: 'crusher', period: 3.6, phase: 0 } },
      'J': { base: 'y', ctex: 'CRUSHER', up: 'CRUSHER', anim: { type: 'crusher', period: 3.6, phase: 11 / 12 } }, // 0.3 s after the first
      'R': { base: '.', ftex: 'PALACE_TILE', light: 17, label: 'The Clockwork Room' },
      'X': { base: 'R', ctex: 'LOOSE_FLAT' },
      'm': { base: '.', light: 14, label: "The Clockmaker's Loft" },
      ')': { base: 'm', label: null, door: { secret: true, tex: 'SANDSTONE' } },
      'b': { base: '.', ftex: 'CARPET_PERSIAN', light: 18, label: 'The Seal Bridge' },
      'd': { base: '.', loose: { armed: false, delay: 0.45 }, tag: 'sealbridge', ftex: 'SAND_FLOOR', light: 20, label: 'The Seal Bridge' },
      'V': { base: '.', ftex: 'PALACE_TILE', light: 20, label: "The Vizier's Seal" },
      '6': { base: '.', ftex: 'PALACE_TILE', low: 'TOWER_COLUMN', light: 19, label: 'The Floating Stones', anim: { type: 'bob', period: 4.8, phase: 0, amp: 0.8 } },
      '7': { base: '6', anim: { type: 'bob', period: 4.8, phase: 0.25, amp: 0.8 } },
      '8': { base: '6', anim: { type: 'bob', period: 4.8, phase: 0.5, amp: 0.8 } },
      'N': { base: ',', ftex: 'CARPET_PERSIAN', light: 20, label: 'The East Landing', ent: { type: 'checkpoint' } },
      'q': { base: '.', light: 16, label: 'The Dart Stair' },
      '0': { base: 'q', light: 8 },                               // the boulder's niche and chute: dim, not black
      '[': { base: '3', light: 21, ent: { type: 'deco', sprite: 'TORCH', z: 0.55, radius: 0.1, dx: -0.48 } },
      '{': { base: 'q', light: 21, ent: [{ type: 'deco', sprite: 'TORCH', z: 0.55, radius: 0.1, dx: -0.48 }, { type: 'item', item: 'gem', dx: 0.25 }] },
      'F': { fl: 0, cl: 3, sky: true, ftex: 'TOWER_ROOF', low: 'SANDSTONE', light: 19, label: 'The Roof at Dawn' },
      '-': { fl: 2.0, cl: 3, sky: true, ftex: 'TOWER_ROOF', low: 'SANDSTONE', light: 18 },
      '"': { base: '-', low: 'DART_SLOTS' },
      '$': { base: 'F', exit: true, ftex: 'EXIT_FLAT', label: 'The Way Out' },
      '/': HG.keyDoor('seal', { door: { tex: 'TOWER_SEALDOOR', openMsg: 'The Seal fits the crest. The door swings open - onto the roof, and the first grey of dawn!', msg: "A great door, sealed with the Vizier's crest. It wants his Seal." } }),
    },
    layers: [
      { z: 0, map: [ // S0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 3
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 4
        ' %%%%%%%%%%%%TcccccccccT%%%%% ', // 5
        ' %%%%%%%%%%%%cAAAAAAAAAc%%%%% ', // 6
        ' %%%%%%%%%%%%cAUUAAAAAAc%%%%% ', // 7
        ' %%%%%%%%%%%%cAUUAAAAAAc%%%%% ', // 8
        ' %%%%%%%%%%%%cAAAAAAAAAc%%%%% ', // 9
        ' %%%%%%%%%%%%cAAAAUAAAAc%%%%% ', // 10  the hourglass stand (18,10)
        ' %%%%%%%%%%%%cAAAAAAAAAc%%%%% ', // 11
        ' %%%%%%%%%%%%%AAAAAAAAGc%%%%% ', // 12
        ' %%%%%%%%%%%%cAAAAAAAAAc%%%%% ', // 13
        ' %%%%%%%%%%%%TcccccccccT%%%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%hh%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%hh%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%@h%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%TT%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 1.5, map: [ // S1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 3
        ' %%%%%%%%%%%%%%%#%%%#%%%%%%%% ', // 4
        ' %%%%%%%%%%%%zz#z#z#z#zz%%%%% ', // 5
        ' %%%%%%%%%%%%z_________z%%%%% ', // 6
        ' %%%%%%%%%%%%#_UU______z%%%%% ', // 7
        ' %%%%%%%%%%%#z_UU______z%%%%% ', // 8
        ' %%%%%%%%%%%%#_________z%%%%% ', // 9
        ' %%%%%%%%%%%%z____H____z%%%%% ', // 10
        ' %%%%%%%%%%%%z_________z%%%%% ', // 11
        ' %%%%%%%%%%%%p_________z%%%%% ', // 12
        ' %%%%%%%%%%%%z_________z%%%%% ', // 13
        ' %%%%%%%%%%%%zzzzzzzzzzz%%%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 3, map: [ // S2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%5 ', // 3
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%4 ', // 4
        ' %%%%%%%%%%%%gggtfggtfgg%%%%3 ', // 5
        ' %%%%%%%%%%%%g_________g%%%%2 ', // 6
        ' %%%%%%%%%%%%f_UU______g%%%%1 ', // 7
        ' %%%%%%%%%%%%t_UU______geCexe ', // 8
        ' %%%%%%%%%%%%g_________g%%%%% ', // 9
        ' %%%%%%%%%%%%g_________g%%%%% ', // 10
        ' %%%%%%%%%%%%g_________g%%%%% ', // 11
        ' %%%%%%%%%%%%%_________P%%%%% ', // 12
        ' %%%%%%%%%%%%g_________g%%%%% ', // 13
        ' %%%%%%%%%%%%gG_______gg%%%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 4.5, map: [ // S3
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%54321l ', // 2
        ' %%%%%%%%%%%%%illGlllu%%%%%%% ', // 3
        ' %%%%%%%%%%%%%v%%%%%%%%%%%%%% ', // 4
        ' %%%%%%%%%%%%zzzzzzzzzzz%%%%% ', // 5
        ' %%%%%%%%%%%%z_________z%%%%% ', // 6
        ' %%%%%%%%%%%%z_UU______z%%%%% ', // 7
        ' %%%%%%%%%%%%z_UU______z%%%%% ', // 8
        ' %%%%%%%%%%%%z_________z%%%%% ', // 9
        ' %%%%%%%%%%%%z_________z%%%%% ', // 10
        ' %%%%%%%%%%%%z_________z%%%%% ', // 11
        ' %%%%%%%%%%%%z_________z%%%%% ', // 12
        ' %%%%%%%%%%%%z_________z%%%%% ', // 13
        ' %%%%%%%%%%%%zzzzzzzzzzz%%%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 6, map: [ // S4
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%ZZZZZ%%%%%%%%%k%%%%%% ', // 2
        ' %%%%%%%ZRRRR%%%%%%%%%C%%%%%% ', // 3
        ' %%%%%%%ZRRRR%_%%%%%%%k%%%%%% ', // 4
        ' %%%%%%%ZXRRR|yyyJyKyy=y%%%%% ', // 5
        ' %%%%%%%ZRRRP%_________%%%%%% ', // 6
        ' %%%%%%%ZRRRR%_UU______%%%%%% ', // 7
        ' %%%%%%%ZZZZZ%_UU______%%%%%% ', // 8
        ' %%%%%%%%%%1%%_________%%%%%% ', // 9
        ' %%%%%%%%%%2%%_________%%%%%% ', // 10
        ' %%%%%%%%%%33%_________%%%%%% ', // 11
        ' %%%%%%%%%%4%%_________%%%%%% ', // 12
        ' %%%%%%%%%%5%%_________%%%%%% ', // 13
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 7.5, map: [ // S5
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 3
        ' %%%%%ZZZ%%%%%%%%%%%%%%%%%%%% ', // 4
        ' %%%%ZmmmoZ%%zzzzzzzzzzz%%%%% ', // 5
        ' %%%%Zm%%%%%%z_________z%%%%% ', // 6
        ' %%%%%m%%%%%%z_UU_`_`_`z%%%%% ', // 7
        ' %%%%%m%%%%%%z_UU______z%%%%% ', // 8
        ' %%%%%m%%%%%%z_________z%%%%% ', // 9
        ' %%%%mm%%%%%%z_________z%%%%% ', // 10
        ' %%%%%m%%%%%%z_________z%%%%% ', // 11
        ' %%%%%m%%%%%%z_________z%%%%% ', // 12
        ' %%%%%m%%%%%%z_________z%%%%% ', // 13
        ' %%%%%m%%%%)%zzzzzzzzzzz%%%%% ', // 14
        ' %%%%%mmmmPmu%%%%%%%%%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 9, map: [ // S6
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 3
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 4
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 5
        ' %%%%%%%%%%%%%_________%%%%%% ', // 6
        ' %%%%%%%%%%%%%_VV_6_7_8Nqq0%% ', // 7
        ' %%%%%%%%%%%%%_VV______%%1%%% ', // 8
        ' %%%%%%%%%%%%%__d______%%2%%% ', // 9
        ' %%%%%%%%%%%%%__d______%%3[%% ', // 10
        ' %%%%%%%%%%%%%__d______%%4%%% ', // 11
        ' %%%%%%%%%%%%%__d______%%5%%% ', // 12
        ' %%%%%%%%%%%%%__d______%%%%%% ', // 13
        ' %%%%%%%%%%%Cbbbb%%%%%%%%%%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 10.5, map: [ // S7
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 0
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 1
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 2
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 3
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 4
        ' %%%%%%%%%%%%zzzzzzzzzzz%%%%% ', // 5
        ' %%%%%%%%%%%%z_________z%%%%% ', // 6
        ' %%%%%%%%%%%%z_________z%%%%% ', // 7
        ' %%%%%%%%%%%%z_________z%%%%% ', // 8
        ' %%%%%%%%%%%%z_________z%%%%% ', // 9
        ' %%%%%%%%%%%%z_________z%%%%% ', // 10
        ' %%%%%%%%%%%%z_________z%%%%% ', // 11
        ' %%%%%%%%%%%%z_________z%%%%% ', // 12
        ' %%%%%%%%%%%%z_________z%q{%% ', // 13
        ' %%%%%%%%%%%%zzzzzzzzzzz%1%%% ', // 14
        ' %%%%%%%%%%%%%%%%%%%%%%%%2%%% ', // 15
        ' %%%%%%%%%%%%%%%%%%%%%%%%3[%% ', // 16
        ' %%%%%%%%%%%%%%%%%%%%%%%%4%%% ', // 17
        ' %%%%%%%%%%%%%%%%%%%%%%%%5%%% ', // 18
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 19
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 20
        ' %%%%%%%%%%%%%%%%%%%%%%%%%%%% ', // 21
      ] },
      { z: 12, map: [ // S8 roof
        '------------------------------', // 0
        '------------------------------', // 1
        '---------------F$$F-----------', // 2
        '---------------FFFF-----------', // 3
        '---------------FFFF-----------', // 4
        '-------------FFFFFFFFFFF------', // 5
        '-------------F*********F------', // 6
        '-------------F*********F------', // 7
        '-------------F*********F------', // 8
        '-------------F*********F------', // 9
        '-------------F*********F------', // 10
        '-------------F*********F------', // 11
        '-------------F*********F------', // 12
        '-------------F*********F------', // 13
        '-------------FFFFFFFFFFF------', // 14
        '-------------F----------------', // 15
        '-------------FFFFFF-----------', // 16
        '--------------FFFFF-----------', // 17
        '--------------FFFFF-----------', // 18
        '--------------FFFFF--""--q0---', // 19
        '--------------FFFFF/qqqqqq----', // 20
        '------------------------------', // 21
      ] },
      { z: 13.5, legend: { '-': CAP_HIGH }, map: [ // caps
        '                              ', // 0
        '                              ', // 1
        '                              ', // 2
        '                              ', // 3
        '                              ', // 4
        '                              ', // 5
        '                              ', // 6
        '                              ', // 7
        '                              ', // 8
        '                              ', // 9
        '                              ', // 10
        '                              ', // 11
        '                              ', // 12
        '                              ', // 13
        '                              ', // 14
        '                              ', // 15
        '                              ', // 16
        '                              ', // 17
        '                              ', // 18
        '                         --   ', // 19
        '                   -------    ', // 20
        '                              ', // 21
      ] },
    ],
    ents: [
      // 5.1 the hall and the atrium (S0)
      { x: 20, y: 17, z: 0, ...note('CARVED OVER THE DOOR', 'The tower of Qasim the Vizier.\n\nHis Seal opens the roof.') },
      { x: 18, y: 10, z: 2, ...deco('HOURGLASS_GREAT', { scale: 2 }) },         // the Vizier's great hourglass, on its stand
      { x: 17, y: 12, z: 0, ...deco('SKELETON') },
      ...[15, 16, 17, 18, 21].map(x => ({ x, y: 14, z: 0, ...deco('RUBBLE') })),   // under the fallen south arcade
      // 5.2 the Ring of Teeth (S2)
      torch(13, 11, 3, -0.42, 0),                                                // where you climb onto the arcade
      { x: 13, y: 10, z: 3, ...note('THE RING OF TEETH', 'Walk up to the teeth carefully (hold C), then jump from a standstill.\n\nThe flag beyond is cracked. Land and keep walking - never stop on it.', { dx: -0.36 }) },
      { x: 13, y: 8, z: 2, ...deco('SKULL', { dx: 0.28, dy: 0.25 }) },          // in the first trough
      torch(13, 5, 3, 0, -0.42),
      torch(23, 5, 3, 0.42, 0),
      torch(23, 7, 3, 0.42, 0),                                                  // beside the slicer door
      { x: 26, y: 8, z: 3, ...deco('SKELETON', { dx: -0.2 }) },                 // the thief the jaws cut in two
      { x: 26, y: 8, z: 3, ...deco('SKULL', { dx: 0.3, dy: 0.25 }) },
      // 5.3 the Clockwork Gallery, the Clockwork Room (S4)
      { x: 23, y: 5, z: 6, ...deco('TOWER_SANDGLASS', { dy: 0.36 }) },          // beside the plate
      torch(21, 5, 6, 0, -0.42),
      torch(16, 5, 6, 0, -0.42),
      { x: 15, y: 5, z: 6, tpl: 'pendulum', axis: 'y', amp: 1.2, period: 2.4, phase: 0 },
      { x: 14, y: 5, z: 6, ...deco('TOWER_SANDGLASS', { dy: 0.36 }) },          // beside the gate
      { x: 9, y: 3, z: 6, ...deco('CLOCK', { solid: true, radius: 0.1, dy: -0.3 }) }, // against the north wall
      torch(12, 3, 6, 0.42, 0),
      torch(12, 7, 6, 0.42, 0),
      { x: 11, y: 3, z: 6, ...note("THE CLOCKMAKER'S DAYBOOK", "The great hourglass is finished. The Vizier asked for one night exactly: dusk to dawn, not a grain more.\n\nTonight he turned it himself, and smiled. 'When the last grain falls,' he said, 'the Sultan will be thirsty.'\n\nI did not ask what he meant.", { dy: -0.36 }) },
      { x: 10, y: 7, z: 6, ...note('SCRATCHED ON THE WALL', 'The ceiling is cracked.\n\nStand under it and jump straight up (SPACE, no arrow), then step back.\n\nWhen it has fallen, face west under the hole and climb (SPACE).') },
      { x: 12, y: 11, z: 6.75, type: 'item', item: 'bigpotion' },              // the secret closet, down from the loft
      // S5 the Clockmaker's Loft
      { x: 6, y: 5, z: 7.5, ...deco('SKELETON_SITTING', { dx: -0.25, dy: -0.25 }) },
      { x: 7, y: 5, z: 7.5, ...note('SCRATCHED BESIDE THE BONES', 'He walled me in up here, so that I could never tell what his hourglass counts.\n\nDawn. The Sultan\'s cup.\n\nIf you can read this, you are quicker than I was. Run.', { dy: -0.3 }) },
      torch(6, 7, 7.5, -0.42, 0),
      { x: 5, y: 10, z: 7.5, ...rock(0) },                                       // the niche: it shows the rocks first
      { x: 5, y: 10, z: 7.5, ...deco('SKELETON') },
      { x: 6, y: 12, z: 7.5, ...rock(0.5) },
      { x: 6, y: 14, z: 7.5, ...rock(0.5) },
      torch(11, 15, 7.5, 0, 0.42),                                               // beside the secret door (11,14)
      // 5.4 the Seal bridge, the Seal, the stones (S6)
      { x: 16, y: 12, z: 9, ...rock(0) },
      { x: 16, y: 10, z: 9, ...rock(0.5) },
      // the brazier reaches onto the last bridge tile, so it is always lit before the Seal is taken; the Seal
      // (at the centre of the column top) reaches every path across it, and the brazier (you respawn there
      // and take it again); the trigger reaches a hair further than the Seal
      { x: 16, y: 8, z: 9, type: 'checkpoint', dx: 0.2, radius: 0.8 },
      { x: 15, y: 7, z: 9, type: 'item', item: 'seal', dx: 0.5, dy: 0.5, radius: 0.7 },
      { x: 15, y: 7, z: 9, type: 'trigger', script: 'sealTaken', once: false, radius: 0.75, dx: 0.5, dy: 0.5 },
      { x: 15, y: 8, z: 9, ...note('A LETTER UNDER THE SEAL', 'Cupbearer - at first light the Sultan will ask for his cup. Pour it from the second vial; the first was stolen by a bazaar thief, and he hangs at dawn.\n\nBring me word on the roof. My Seal opens the door.\n\n- Q.', { dx: 0.1 }) },
      { x: 16, y: 7, z: 9, type: 'trigger', radius: 0.3, time: 7, text: 'The stones: hold C and walk to the edge. Jump with C still held - you land and stay on the stone.' },
      // 5.5 the dart stair
      { x: 26, y: 7, z: 9, ...deco('RUBBLE') },                                  // where the boulder ends
      torch(25, 8, 9.25, 0.3, -0.35),                                            // the turn south, seen from the landing
      { x: 26, y: 19, z: 12, tpl: 'boulder', path: [[0, 0], [-1, 0], [-1, -12], [0, -12]], speed: 14 / 6 },
      { x: 23, y: 20, z: 12, type: 'item', item: 'potion' },                    // after the boulder, before the darts
      { x: 22, y: 20, z: 12, tpl: 'darts', dir: 'S', phase: 0 },
      { x: 21, y: 20, z: 12, tpl: 'darts', dir: 'S', phase: 0.5 },
      // 5.6 the roof
      { x: 13, y: 16, z: 12, type: 'checkpoint', radius: 0.8 },                 // the terrace's neck: before the ring round the hatch
    ],
    scripts: {
      /** Taking the Seal (a trigger on it, `once: false`: it reaches a hair further than the
       *  Seal, so it runs again just after the pickup): the bridge behind you crumbles, from the
       *  column outward. Its tiles are loose { armed: false }, solid until g.crumble wakes them.
       *  The column-top brazier was lit before the Seal was taken, so a respawn there puts back
       *  the bridge and the Seal; you respawn within the Seal's reach and take it again, and
       *  the bridge crumbles again. */
      sealTaken(g) {
        if (!g.has('seal') || g.flags.crumbled) return;
        g.flag('crumbled', true);
        g.msg('The Seal is yours - and the tower shudders! The bridge behind you is crumbling. East, over the floating stones!', 7);
        g.shake(0.8);
        g.sound('rumble');
        g.crumble('sealbridge', 16.5, 8.5, 3, 0.45);
      },
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
