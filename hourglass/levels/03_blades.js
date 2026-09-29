/*
 * LEVEL 3 — The Blade Halls.
 *
 * The Vizier's training halls: one great vault (7.25 high) over a roofless
 * labyrinth of 2.0-high walls. Five bays run north-south through it; a single
 * bridge crosses them all at mid-length, carried through full-height piers
 * (rows 12..14, and (21,15) beside the lane). Grid 30 x 28, x grows east, y
 * grows south. The upper layers follow from the S0 plan (every open S0 cell is
 * open to the vault; every maze wall 'k' and every doorway lintel tops out at
 * 2.0). Light falls off slowly (falloff 0.55): dim bays (13..16) and bright
 * torch pools (23..24), so the whole vault reads from the bridge. Each bay has
 * its own floor: sand (Singing Door), grey flags (Swinging Hall), dark slate
 * (Whispering Gallery), soot and rivets (Hammers), run-scuffed sand (lane).
 *
 * STOREYS
 *   S0  z = 0    the labyrinth: every set-piece is down here
 *   S1  z = 1.5  the balcony and cracked-flag spur over the Falling Gate's
 *                plate; the back way (a tunnel at 2.0, x=25); the wall and
 *                lintel tops at 2.0 ('l', forbid: the solver must never reach
 *                them). The stones over the hidden blades wear telltales for
 *                the bridge: hazard stripes over the crushers ('$'), a pivot
 *                slot over the pendulum beams ('&').
 *   S2  z = 3.0  the west stair and the hang-drop ledge (5,24) into bay A
 *   S3  z = 4.5  the Vizier's Gallery (23..24,6..14, start) and the Bridge of
 *                Previews (row 13).
 *   The S3 edges: a waist-high balustrade (solid posts 1.0 apart) closes the
 *   gallery's open west side (23,6..11), and a newel post the south lip of
 *   the bridge head (22,13); nothing there can be walked, run, jumped or
 *   hung off (proved in the engine). Everywhere else, walking off the bridge
 *   kills (4.5 into a bay) and a hang-drop costs a life (3.6) and lands in a
 *   bay, which still needs the key. The one wall top a fall from S3 could
 *   reach, the lintel over the lane's pendulum (22,15), lies behind that post
 *   and is cut off from the other tops by the pier (21,15): from it you can
 *   only drop into the lane. 2.0 is too high to climb from the floor, and
 *   nothing at 2.0 lies beside the stair, the ledge or the balcony (checked
 *   with the solver, and asserted by 'forbid').
 *
 * SET-PIECES (cells x,y)
 *   3.1 Bridge of Previews: from the gallery over the gauntlet lane, west
 *       through the pier arches (torches either side) over the Hammers (x=19),
 *       the dart gallery (x=15), the Swinging Hall (x=8..12) and the slicer
 *       bay (x=5). Below you the slicers, the hall's pendulum, the darts and
 *       the dart gallery's lit refuges move in plain sight; the crushers and
 *       the corridor and lane pendulums work under their 2.0 stones, which
 *       wear the telltales (and you hear the swish, the creak and the slam).
 *       West landing (1..2,13); the stair (2,14..18) down to S2, round to the
 *       ledge (5,24): hang and drop 2.1 into bay A. A secret door (1,12)
 *       (scratched X) off the landing hides the great potion (1,11).
 *   3.2 The Singing Door (bay A, north). Brazier (5,22). One slicer (5,17) in
 *       a lintelled doorway over a skeleton, a note: go right after the snap.
 *       Under the bridge, then two slicers (5,10) and (5,7), 1.2 s apart,
 *       with a 2-cell pocket (5,8..9) between. The bronze key (4,2), beside
 *       the drill-master's orders (Qasim's story: the blades keep the beat of
 *       his hourglass until the Sultan's last cup is poured).
 *   3.3 The Swinging Hall (bay B, south). One pendulum (10,7) over the middle
 *       three cells of the 5-wide hall: walk round it (a gem under it). Then a
 *       1-wide corridor with pendulums (10,18) (10,20) (10,22) at 0, 0.6 and
 *       1.2 s of a 2.4 s swing - each blade crosses twice a swing, so the
 *       first and third cross together and the second between them (A-B-A).
 *       Run in 0.1-0.3 s behind the first blade and you clear all three (every
 *       arrival moment, proved), or walk and rest in the gaps (10,19) (10,21).
 *       A potion after (11,24).
 *   3.4 The Whispering Gallery (bay C, north). Antechamber: a note (it teaches
 *       the A/D side-step) and a blue flask (poison) (15..16,25). A 12-cell
 *       corridor (15,9..20): two slots at its north end take turns, a dart
 *       every 3 s flying south at you, dying at y=20.25, before the
 *       antechamber. Refuges lit bright (24) against the dim corridor (13), on
 *       alternating sides: the alcove (14,18) (a torch at its mouth, a gem),
 *       the crossing's side cells (14,11..15) (16,11..15) under the bridge, the
 *       exit (16,9). Then the slot room (14..16,3..7): three cross-slots
 *       (13,4..6) fire east in a wave that rolls toward you (row 4, 5, 6, 0.3 s
 *       apart, every 3.6 s). Potion (16,3).
 *   3.5 The Hammers (bay D, south). A brazier in the doorway (17,3): it lights
 *       as you come in and respawns you facing the hammer (20,3), three cells
 *       ahead, which flattens a cart every 3.6 s (a gem under it). Two
 *       crushers (19,7) and (19,9) 1.8 s apart with a safe cell (19,8); the
 *       stair (19,18..22) up to the balcony (19..21,23) at S1, brazier.
 *   3.6 The Falling Gate (lane x=22). Plate (22,24) under the cracked flag;
 *       the gate (22,4) 20 cells north, straight ahead, under the Vizier's
 *       banner between two torches. On the way: a slicer (22,20), pendulums
 *       (22,17) (22,15), a dart lane (21..22,8..10: three slots fire one
 *       volley), a 1-cell trough (22,6) to jump. Hold 11 s (solver: 5.3 s
 *       optimal; a rhythm-aware bot needs 6.2-7.0 s over all press phases). A
 *       torch low on the lane's east wall (22,23) shows the 1.5 drop from the
 *       balcony. Clever route: the cracked flag on the spur (21..22,24), under
 *       a torch so it shows from the bridge: step onto it and back, or ride it
 *       down (unhurt): the rubble jams the plate and the gate stays open for
 *       good (the plate says so). Back way after a failure (hazard-free,
 *       one-way): the opening (23,5) by the gate, up to the tunnel at 2.0, and
 *       a 2.0 drop beside the plate at (22,25).
 *   Exit: through the gate, the bronze door (24,2), the Way Out (25..28,1..3).
 *
 * ROUTE  gallery (24,10) -> S to (24,13) -> bridge west -> landing -> stair ->
 * ledge (5,24), hang-drop -> brazier -> N through the three slicers -> key
 * (4,2) -> E door (7,3) -> S round the Swinging Hall pendulum, down the
 * pendulum corridor -> E door (13,24) -> N up the dart gallery, the slot room
 * -> E doorway (17,3), brazier -> S past the two crushers, up the stair ->
 * balcony (brazier) -> drop E into the lane -> plate (or the flag) -> N
 * through the gauntlet -> gate -> bronze door -> exit. About 105 s for a
 * player who knows it (bot-measured).
 *
 * One-off items, notes and decorations are placed by coordinate (level.ents).
 */
(function (R) {
  'use strict';
  const { HG } = R;
  const H = R.texHelpers;

  // ------------------------------------------------------------------ assets
  R.defTexture('BLADES_WALL', {
    gen(p, c) {
      H.blocks(p, c, { base: '#5e5042', mortar: '#1a140e', bw: 32, bh: 16, cracks: 0.3, grain: 0.4 });
      const r = c.rng;
      for (let k = 0; k < 3; k++) { // old blade scars
        const x = 6 + r() * 48, y = 8 + r() * 48;
        p.line(x, y, x + 9, y - 7, '#8e7e6a'); p.line(x + 1, y + 1, x + 10, y - 6, '#221a12');
      }
    },
  });
  R.defTexture('BLADES_BRIDGE', {
    gen(p, c) {
      H.blocks(p, c, { base: '#9a7446', mortar: '#3a2814', bw: 32, bh: 32, cracks: 0.2, grain: 0.3 });
      // a red runner along the bridge (world x runs along texture x)
      p.rect(0, 17, 64, 30, '#6a1216'); p.rect(0, 17, 64, 2, '#c89a30'); p.rect(0, 45, 64, 2, '#c89a30');
      for (let x = 0; x < 64; x += 16) { p.poly([[x + 8, 24], [x + 14, 32], [x + 8, 40], [x + 2, 32]], '#1a2a5a'); p.disc(x + 8, 32, 1.5, '#c89a30'); }
      p.grain(0.12, c.seed + 5);
    },
  });
  R.defTexture('BLADES_SECRET', {
    gen(p, c) {
      c.call('SANDSTONE', p);
      p.frame(14, 6, 36, 58, '#4a3420'); p.mul(15, 7, 34, 56, 0.93);
      p.line(30, 30, 34, 36, '#3a2818'); p.line(34, 30, 30, 36, '#3a2818');
    },
  });
  // bay floors (one flag per cell, like the campaign's): cool slate for the Whispering Gallery, soot for the Hammers
  R.defTexture('BLADES_SLATE', {
    gen(p, c) {
      c.call('DUNGEON_FLOOR', p);
      p.mul(2, 2, 60, 60, 0.8);
      const r = c.rng;
      for (let i = 0; i < 26; i++) p.px(5 + r() * 54, 5 + r() * 54, r() < 0.5 ? '#545c6b' : '#333842');
    },
  });
  R.defTexture('BLADES_SOOT', {
    gen(p, c) {
      c.call('SAND_FLOOR', p);
      const n = R.util.fbm(c.seed + 9, 64, 3, 2);
      p.map((x, y, col) => { const f = 0.5 + 0.45 * Math.min(1, Math.max(0, (n(x, y) - 0.25) * 2)); return [col[0] * f, col[1] * f, col[2] * f]; });
      for (const [x, y] of [[9, 9], [54, 9], [9, 54], [54, 54]]) { p.disc(x, y, 2, '#3e4450'); p.px(x - 1, y - 1, '#959dac'); }
      const r = c.rng;
      for (let i = 0; i < 10; i++) p.px(6 + r() * 52, 6 + r() * 52, '#753322');
    },
  });
  // the tops of the stones over the blades, as seen from the bridge: hazard stripes over a crusher,
  // a slot and a pivot bar over a pendulum's beam (the pendulums swing along x, so the slot runs along x)
  R.defTexture('BLADES_CAP_HAMMER', {
    gen(p, c) {
      p.fill('#3e4450'); p.grain(0.2, c.seed);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.min(x, y, 63 - x, 63 - y) < 9) p.px(x, y, ((x + y) >> 3) % 2 ? '#d8a810' : '#1a1a1a');
      p.frame(9, 9, 46, 46, '#12141a'); p.frame(10, 10, 44, 44, '#737b8b');
      for (const [x, y] of [[15, 15], [48, 15], [15, 48], [48, 48]]) { p.disc(x, y, 2, '#262a32'); p.px(x - 1, y - 1, '#a6aebc'); }
      p.disc(32, 32, 7, '#12141a'); p.ring(32, 32, 7, '#626a7a', 1.5);
    },
  });
  R.defTexture('BLADES_CAP_BEAM', {
    gen(p, c) {
      c.call('SANDSTONE', p);
      p.rect(3, 26, 58, 12, '#100c08'); p.rect(3, 26, 58, 1, '#3a2814'); p.rect(3, 37, 58, 1, '#c89a60');
      p.rect(2, 24, 60, 2, '#737b8b'); p.rect(2, 38, 60, 2, '#737b8b'); p.rect(2, 24, 60, 1, '#a6aebc');
      p.rect(29, 20, 6, 24, '#545c6b'); p.rect(29, 20, 6, 1, '#b6becd'); p.rect(34, 20, 1, 24, '#262a32');
    },
  });
  R.defSprite('BLADES_PENDULUM', { // 1.75 tall: hangs from a beam 1.75 above the floor
    w: 40, h: 112, scale: 1, hang: true,
    gen(p) {
      p.rect(13, 0, 14, 4, '#5a4a30'); p.rect(18, 0, 4, 80, '#3a3a40'); p.rect(18, 0, 1, 80, '#8a8a94');
      p.poly([[1, 82], [20, 76], [39, 82], [33, 98], [20, 104], [7, 98]], '#9aa0a8');
      p.poly([[3, 83], [20, 78], [37, 83], [20, 86]], '#eef2fa');
      p.poly([[7, 98], [20, 104], [33, 98], [20, 101]], '#50545c');
      p.disc(20, 85, 3, '#3a3a40');
    },
  });
  R.defSprite('BLADES_CART', { // a hand-cart the hammer has flattened: splintered planks, a buckled wheel
    w: 48, h: 24, scale: 1.5,
    gen(p) {
      const wood = '#c89858', dark = '#6a4420', line = '#2a1808', iron = '#6a6a74';
      p.poly([[1, 21], [18, 12], [21, 15], [4, 23]], wood); p.line(1, 21, 18, 12, line); p.line(4, 23, 21, 15, line);
      p.poly([[17, 22], [34, 13], [37, 16], [20, 23]], '#b08040'); p.line(17, 22, 34, 13, line);
      p.rect(8, 18, 24, 4, dark); p.rect(8, 18, 24, 1, wood);
      p.ring(37, 16, 7, iron, 2); p.line(30, 16, 44, 16, iron); p.line(37, 9, 37, 23, iron); p.disc(37, 16, 2, '#3a3a40');
      for (const [x, y] of [[6, 10], [24, 7], [42, 21], [13, 3]]) { p.line(x, y, x + 5, y - 5, wood); p.line(x + 1, y, x + 6, y - 5, line); }
    },
  });
  R.defSprite('BLADES_HOURGLASS', { // the sand-timer pillars at the plate and the gate
    w: 24, h: 48, scale: 1.4,
    gen(p) {
      p.rect(1, 44, 22, 4, '#6a5030'); p.rect(1, 0, 22, 4, '#6a5030');
      p.rect(3, 4, 2, 40, '#b08a30'); p.rect(19, 4, 2, 40, '#b08a30');
      p.poly([[6, 5], [18, 5], [13, 23], [11, 23]], '#a8b8c0'); p.poly([[11, 25], [13, 25], [18, 43], [6, 43]], '#a8b8c0');
      p.poly([[8, 9], [16, 9], [12.5, 22], [11.5, 22]], '#e0b060');
      p.poly([[7, 43], [17, 43], [14, 35], [10, 35]], '#e0b060');
      p.rect(11, 23, 2, 12, '#f0c870');
    },
  });
  R.defSprite('BLADES_BANNER', { // the Vizier's crescent
    w: 24, h: 48, scale: 1.3, hang: true,
    gen(p) {
      p.rect(0, 0, 24, 3, '#6a5030');
      p.poly([[2, 3], [22, 3], [22, 44], [12, 38], [2, 44]], '#1e5a3a');
      p.frame(2, 3, 20, 36, '#c89a30');
      p.disc(12, 18, 7, '#e0c060'); p.disc(15, 16, 6, '#1e5a3a');
    },
  });
  R.defSprite('BLADES_BALUSTER', { // a turned sandstone post of the gallery's balustrade: waist-high (0.4) on Aladdin (0.62)
    w: 12, h: 26, scale: 1,
    gen(p) {
      const lt = '#dcb47c', md = '#aa8250', dk = '#5e4024';
      for (let y = 3; y < 23; y++) {
        const t = (y - 3) / 20, w = 1.5 + 2.6 * Math.sin(t * Math.PI) * (t < 0.5 ? 1 : 0.8);
        p.rect(6 - w, y, 2 * w, 1, md); p.px(6 - w, y, lt); p.px(6 + w - 1, y, dk);
      }
      p.rect(0, 0, 12, 3, md); p.rect(0, 0, 12, 1, lt); p.rect(0, 2, 12, 1, dk);
      p.rect(1, 23, 10, 3, md); p.rect(1, 23, 10, 1, lt); p.rect(1, 25, 10, 1, dk);
    },
  });

  // ------------------------------------------------------------------ legend
  const deco = (sprite, extra) => Object.assign({ type: 'deco', sprite }, extra || {});
  const torch = (dx, dy) => HG.ent(deco('TORCH', { z: 1.0, radius: 0.1, dx, dy }), { light: 23 });
  const slicer = (base, phase) => ({ base, cl: 1.75, up: 'SANDSTONE', ent: { tpl: 'slicer', phase } }); // lethal only where the jaws are drawn
  const beam = (base, extra) => Object.assign({ base, cl: 1.75, up: 'SANDSTONE' }, extra || {});
  const pendulum = (base, phase, amp = 1.2, more = []) => beam(base, { ent: [{ tpl: 'pendulum', sprite: 'BLADES_PENDULUM', axis: 'x', amp, period: 2.4, phase }, ...more] });
  const crusher = (phase, more) => Object.assign({ base: 'd', cl: 1.75, up: 'CRUSHER', anim: { type: 'crusher', period: 3.6, phase, min: 0.08, msg: 'The hammer comes down on you!' } }, more || {});
  const dart = (dir, period, phase, range, extra) => Object.assign({ tpl: 'darts', dir, period, phase, range }, extra || {});
  // the vault above the bays (a pit: it takes the light of the bay floor below it)
  const U = { pit: true, cl: 2.75, ctex: 'CEIL_DUNGEON', light: 14 };
  // torches high on the walls, level with the bridge (legend of the z = 4.5 layer only)
  const hiTorch = (dx, dy) => Object.assign({ ent: deco('TORCH', { zAbs: 5.1, radius: 0.1, dx, dy }) }, U);
  const S3 = { 'I': hiTorch(-0.42, 0), 'J': hiTorch(0.42, 0), '"': hiTorch(0, -0.42), '`': hiTorch(0, 0.42) };
  // S0 only: the dart gallery's refuges (its alcove and the crossing's side cells) glow against the dim corridor
  const S0 = { '*': { base: 'c', light: 24 } };
  // S1 only: the stones over the blades wear telltales, so the bridge shows where each blade waits
  const S1 = { '$': { base: 'l', ftex: 'BLADES_CAP_HAMMER' }, '&': { base: 'l', ftex: 'BLADES_CAP_BEAM' } };
  const bay = (label, ftex, light, low = 'SANDSTONE') => ({ base: '.', light, ftex, wall: 'BLADES_WALL', up: 'BLADES_WALL', low, label });

  R.defineLevel({
    id: 'blades', order: 3,
    name: 'The Blade Halls',
    subtitle: 'Where the Vizier\'s blades keep time.',
    width: 30, height: 28,
    music: 'blades',
    falloff: 0.55,                  // one great vault: light carries (torch pools in dim bays)
    startMessage: 'The Vizier\'s blade halls lie below. Walk south along the gallery, then west over the bridge, and look down (PgDn): learn every blade\'s rhythm before you meet it.',
    legend: {
      // ---- floors of the five bays (tall: the layers above are open pits)
      'a': bay('The Singing Door', 'SAND_FLOOR', 15),
      'b': bay('The Swinging Hall', 'DUNGEON_FLOOR', 15),
      'c': bay('The Whispering Gallery', 'BLADES_SLATE', 13),
      'd': bay('The Hammers', 'BLADES_SOOT', 14, 'SANDSTONE_DARK'),
      'e': bay('The Falling Gate', 'SKID_NS', 16),
      'k': { solid: true, wall: 'BLADES_WALL' },          // maze wall (2.0 high: see layer 1.5)
      ']': { solid: true, wall: 'DART_SLOTS' },           // slotted maze wall
      '[': { solid: true, wall: 'DART_SLOTS' },           // slotted outer wall
      // ---- slicers (in 1-wide doorways under a sandstone lintel)
      'X': slicer('a', 0),
      'Y': slicer('a', 0),
      'Z': slicer('a', 0.5),
      'V': slicer('e', 0),
      // ---- pendulums hang from sandstone beams 1.75 above the floor
      'q': beam('b'),
      'p': pendulum('b', 0, 1.0, [{ type: 'item', item: 'gem' }]),
      // the corridor's three: 0, 0.6, 1.2 s - a blade crosses twice a swing, so the first and third cross together (A-B-A)
      'f': pendulum('b', 0),
      'g': pendulum('b', 0.25),
      'i': pendulum('b', 0.5),
      'H': pendulum('e', 0),
      'F': pendulum('e', 0.25),
      // ---- crushers (the piston is the rock above the span)
      'M': crusher(0, { ent: [deco('BLADES_CART', { dx: -0.1 }), { type: 'item', item: 'gem', dx: 0.25 }] }),   // the demonstration, straight ahead of the doorway
      'N': crusher(0),
      'W': crusher(0.5),
      // ---- dart launchers (in the cell in front of the slotted wall)
      'j': { base: 'c', ent: [dart('S', 6.0, 0, 11.2, { dx: -0.2 }), dart('S', 6.0, 0.5, 11.2, { dx: 0.2 })] },   // two slots take turns: a dart every 3 s
      // the slot room: a wave every 3.6 s, row 4 first, rows 5 and 6 0.3 s apart (it rolls toward the door)
      '6': { base: 'c', ent: dart('E', 3.6, 10 / 12, 3.2) },
      '7': { base: 'c', ent: dart('E', 3.6, 11 / 12, 3.2) },
      '8': { base: 'c', ent: dart('E', 3.6, 0, 3.2) },
      'A': { base: 'e', ent: dart('W', 2.4, 0, 2.2) },
      'S': { base: 'e', ent: dart('W', 2.4, 0, 2.2) },
      'U': { base: 'e', ent: dart('W', 2.4, 0, 2.2) },
      // ---- the Falling Gate
      '=': HG.plate({ opens: 'fall', hold: 11, script: 'fallPlate' }, { base: 'e' }),
      '|': HG.gate('fall', { light: 31, door: { msg: 'The Falling Gate. The plate at the south end of the hall raises it - but not for long.' } }),
      'v': { base: 'e', fl: -1.0 },                                              // the trough
      'D': HG.keyDoor('key_bronze', { light: 18 }),
      '<': torch(-0.42, 0), '>': torch(0.42, 0), '{': torch(0, -0.42), '}': torch(0, 0.42),
      // ---- S1: lintel and wall tops (never reachable), the balcony, the flag, the back way
      'l': { base: '.', fl: 0.5, cl: 1.25, ftex: 'SANDSTONE', low: 'SANDSTONE', wall: 'BLADES_WALL', light: 14, forbid: true },
      'm': { base: '.', light: 21, ftex: 'SANDSTONE', wall: 'BLADES_WALL', low: 'SANDSTONE', label: 'The Falling Gate' },
      '0': { base: 'm', loose: {}, ftex: 'LOOSE_FLAT' },
      'z': { base: '.', fl: 0.5, cl: 1.75, light: 14, ftex: 'DUNGEON_FLOOR', label: 'The Back Way' },
      'y': { base: 'z', fl: 0.25, cl: 1.5 },
      // ---- S2: the hang-drop ledge
      't': { base: '.', light: 18, ent: { type: 'trigger', radius: 0.7, text: 'Too far to jump down. Hold C, walk to the edge, press Forward again to hang - then let go.' } },
      // ---- S3: bays open to the vault, the bridge, the start hall
      'u': U,
      'r': { base: '.', cl: 2.75, light: 21, ftex: 'BLADES_BRIDGE', low: 'SANDSTONE', wall: 'SANDSTONE', label: 'The Bridge of Previews' },
      'R': { base: 'r', cl: 1.5, up: 'SANDSTONE' },
      'w': { base: '.', light: 18, ftex: 'SANDSTONE', wall: 'SANDSTONE', low: 'SANDSTONE' },
      '/': { base: 'w', label: null, door: { secret: true, tex: 'BLADES_SECRET' } },
      's': { base: '.', cl: 2.75, light: 19, ftex: 'SANDSTONE', wall: 'SANDSTONE', low: 'SANDSTONE', ctex: 'CEIL_DUNGEON', label: "The Vizier's Gallery" },
      '@': { base: 's', start: 'W', ent: deco('BLADES_BANNER', { hang: true, dx: 0.45 }) },
    },
    layers: [
      { z: 0, legend: S0, map: [
        //        1         2
        //23456789012345678901234567890
        '                              ',
        '                         EEEE ',
        '    aa>k<bbbkkkkkkkkkk..DEEEE ',
        '    aaa.bbbbkkccP.{dMk>  EEEE ',
        '    aaakbbbbk]8cckddkk|       ',
        '    kakkbbbbk]7c>kkdkk<e12    ',
        '    kakkbbbbk]6cckkdkkv  3    ',
        '    kZkkqqpqqkccckkNkke  4    ',
        '    kakkbbbbbkk]ckkdkeA[ 5    ',
        '    kakkbbbbbkkjckkWkeS[      ',
        '    kYkkbbbbbkkckkkdkeU[      ',
        '    <aak<bbbbk*c>k<ddk<       ',
        '    aaa bbbbb *c* ddd e       ',
        '    aaa bbbbb *c* ddd e       ',
        '    aaa bbbbb *c* ddd e       ',
        '    aa>kbbbb>k<c*kdd>kF       ',
        '    kakkkkbkkkkckk d ke       ',
        '    kXkkkkbkkkkckk d kH       ',
        '    kakkkkfkkk*ckk 1 ke       ',
        '    kak kk<kkkkckk 2 ke       ',
        '    aa> kkgkkkkckk 3 kV       ',
        '    aaa kkbkkkcc>k 4 k<       ',
        '    aCa kkikkkccck 5  e       ',
        '    <aa kkbkkk<cck    >       ',
        '        kkbPb.ccck    =       ',
        '        kkkkkkccQk    e       ',
        '                              ',
        '                              ',
      ] },
      { z: 1.5, legend: S1, map: [
        '                              ',
        '                              ',
        '    ___l____llllllllll        ',
        '    ___l____ll___l__$l        ',
        '    ___l____ll___l__ll        ',
        '    l_ll____ll___ll_ll_       ',
        '    l_ll____ll___ll_ll_       ',
        '    llllll&lll___ll$ll_       ',
        '    l_ll_____lll_ll_l__       ',
        '    l_ll_____ll__ll$l__  .    ',
        '    llll_____ll_lll_l__  y    ',
        '    ___l_____l___l___l_  z    ',
        '    ___ _____ ___ ___ _  z    ',
        '    ___ _____ ___ ___ _  z    ',
        '    ___ _____ ___ ___ _  z    ',
        '    ___l_____l___l___ &  z    ',
        '    l_llll_llll_ll _ l_  z    ',
        '    llllll_llll_ll _ l&  z    ',
        '    l_llll&lll__ll _ l_  z    ',
        '    l_l ll_llll_ll _ l_  z    ',
        '    ___ ll&llll_ll _ ll  z    ',
        '    ___ ll_lll___l _ l_  z    ',
        '    ___ ll&lll___l _  _  z    ',
        '    ___ ll_lll___l mCm_  z    ',
        '        ll___l___l   m0  z    ',
        '        llllll___l    _zzz    ',
        '                              ',
        '                              ',
      ] },
      { z: 3.0, map: [
        '                              ',
        '                              ',
        '    __________________        ',
        '    __________________        ',
        '    __________________        ',
        '    ___________________       ',
        '    ___________________       ',
        '    ___________________       ',
        '    ___________________       ',
        '    ___________________       ',
        '    ___________________       ',
        '    ___________________       ',
        '    ___ _____ ___ ___ _       ',
        '    ___ _____ ___ ___ _       ',
        '  5 ___ _____ ___ ___ _       ',
        '  4 _________________ _       ',
        '  3 ______________ _ __       ',
        '  2 ______________ _ __       ',
        '  1 ______________ _ __       ',
        '  . ___ __________ _ __       ',
        '  . ___ __________ _ __       ',
        '  . ___ __________ _ __       ',
        '  . ___ __________ _  _       ',
        '  . ___ __________ ____       ',
        '  .  t  __________   __       ',
        '  .  .  __________    _       ',
        '  ....                        ',
        '                              ',
      ] },
      { z: 4.5, legend: S3, map: [
        '                              ',
        '                              ',
        '    u"uuu"u"uuuuuuuuuu        ',
        '    Iuuuuuuuuuuuuuuuuu        ',
        '    uuuuuuuuuuuuuuuuuu        ',
        '    uuuuIuuuuuuuuuuuuuu       ',
        '    uuuuuuuuuuuuuuuuuuus{     ',
        '    uuuuuuuuuuuuuuuuuuuss     ',
        '    uuuuuuuuuuuuuuuuuuuss     ',
        '    uuuuuuuuuuuuuuuuuuuss     ',
        '    uuuuuuuuJuuuuuuuuuus@     ',
        ' Bw uuuuuuuuuuuuuuuuuuuss     ',
        ' /  IuJ IuuuJ IuJ IuJ I s     ',
        ' w{RrrrRrrrrrRrrrRrrrRrss     ',
        '    IuJ IuuuJ IuJ IuJ I }     ',
        '    uuuuuuuuuuuuuuuuu u       ',
        '    uuuuuuuuuuuuuu u uu       ',
        '    uuuuuuuuuuuuuu u uu       ',
        '    uuuuuuuuuuuuuu u uI       ',
        '    uuu uuuuuuuuuu u uu       ',
        '    uuu uuuuuuuuuu u uu       ',
        '    Iuu uuuuuuuuuu u uu       ',
        '    uuu uuuuuuuuJu u  u       ',
        '    uuu uuuuuuuuuu uuuu       ',
        '        uuuuuuuuuu   uu       ',
        '        uuuuuuu`uu    `       ',
        '                              ',
        '                              ',
      ] },
    ],
    // one-off items, notes and decoration, placed by coordinate (z = the floor they stand on)
    ents: [
      // the Singing Door
      { x: 6, y: 21, z: 0, type: 'note', title: 'SCRATCHED BESIDE THE DOOR', text: 'The door sings before it bites.\n\nWait for the jaws to snap shut - then walk through while they are open.' },
      { x: 5, y: 18, z: 0, type: 'deco', sprite: 'SKELETON', dy: 0.25 },
      { x: 5, y: 16, z: 0, type: 'deco', sprite: 'BONES', dx: 0.15 },
      { x: 4, y: 2, z: 0, type: 'item', item: 'key_bronze' },
      { x: 5, y: 2, z: 0, type: 'note', dy: -0.3, title: 'THE DRILL-MASTER\'S ORDERS', text: 'By order of the Grand Vizier Qasim:\n\nthe guard will train in these halls until the Sultan\'s last cup is poured. Every blade keeps the beat of my hourglass - learn it, or feed it.\n\nThe bronze key stays here, where no thief will live to reach it.' },
      // the Swinging Hall and its corridor
      { x: 12, y: 11, z: 0, type: 'deco', sprite: 'BONES', dx: -0.2 },
      { x: 10, y: 21, z: 0, type: 'deco', sprite: 'BONES', dx: -0.2 },
      // the Whispering Gallery: the poisoner's shelf, a lit alcove with a gem, a skeleton the darts found
      { x: 15, y: 25, z: 0, type: 'note', title: "A POISONER'S SHELF", text: 'Red flasks heal. Blue flasks are the Vizier\'s poison: leave them be.\n\nListen for the click at the dark end of the gallery, and step into a lit alcove before the dart arrives - A and D side-step, so you never take your eyes off the dark end.' },
      { x: 14, y: 18, z: 0, type: 'item', item: 'gem' },
      { x: 14, y: 18, z: 0, type: 'deco', sprite: 'TORCH', zAbs: 0.9, radius: 0.1, dx: 0.38, dy: -0.42 },   // at the alcove's mouth: seen from the antechamber
      { x: 15, y: 19, z: 0, type: 'deco', sprite: 'SKULL', dx: -0.3 },
      { x: 16, y: 13, z: 0, type: 'deco', sprite: 'SKELETON', dy: 0.2, dx: 0.1 },
      { x: 16, y: 13, z: 0, type: 'deco', sprite: 'DART', zAbs: 0.2, dx: 0.05, dy: 0.1 },   // too slow for the gallery
      // the Hammers: the brazier in the doorway, three cells short of the hammer
      { x: 17, y: 3, z: 0, type: 'checkpoint', dy: -0.3, scale: 0.8 },
      // the Falling Gate: sand-timer pillars at both ends, the Vizier's banner over the gate, bones in the trough
      { x: 22, y: 3, z: 0, type: 'deco', sprite: 'BLADES_HOURGLASS', dy: -0.2 },
      { x: 22, y: 25, z: 0, type: 'deco', sprite: 'BLADES_HOURGLASS', dy: 0.2 },
      { x: 22, y: 5, z: 0, type: 'deco', sprite: 'BLADES_BANNER', zAbs: 1.4, dy: -0.44 },
      ...[-0.36, 0.36].map(dx => ({ x: 22, y: 5, z: 0, type: 'deco', sprite: 'TORCH', zAbs: 1.7, radius: 0.1, dx, dy: -0.42 })),
      { x: 22, y: 6, z: -1, type: 'deco', sprite: 'BONES' },
      // S1: the mason's mark on the spur, and a torch over the cracked flag so it shows from the bridge
      { x: 21, y: 24, z: 1.5, type: 'note', title: "A MASON'S MARK", text: 'The flag over the Vizier\'s plate cracked the day they laid it.\n\nIt will not hold a grown man for long.' },
      { x: 22, y: 24, z: 1.5, type: 'deco', sprite: 'TORCH', zAbs: 2.5, radius: 0.1, dx: 0.42 },
      // S3: the balustrade along the gallery's open west edge (solid posts 1.0 apart: nobody slips between them)
      ...[6, 7, 8, 9, 10, 11].map(y => ({ x: 23, y, z: 4.5, type: 'deco', sprite: 'BLADES_BALUSTER', solid: true, radius: 0.3, dx: -0.42 })),
      // and a newel post on the south lip of the bridge head (22,13): below it lies the lintel over the lane's
      // pendulum (22,15), the one wall top a fall from the bridge could reach (a slim post: the walkway stays 1 wide)
      { x: 22, y: 13, z: 4.5, type: 'deco', sprite: 'BLADES_BALUSTER', solid: true, radius: 0.12, dy: 0.55, zAbs: 4.5 },
    ],
    scripts: {
      fallPlate(g, ctx) {
        g.msg(ctx.jammed ? 'The rubble holds the plate down. Far to the north, the Falling Gate stays open.' : 'Click! Far to the north the Falling Gate grinds up - run!');
      },
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
