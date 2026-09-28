/*
 * BLACKWATER LIGHT — a small second variation, written as a TEMPLATE.
 *
 * Copy this folder, rename the id, and change anything below. Everything a
 * variation needs lives in one registerCampaign() call:
 *
 *   1. (optional) custom assets     R.defTexture / R.defSprite / R.sfx.register
 *   2. (optional) custom behaviours R.entityTypes.register (see the 'storm')
 *   3. maps                         ASCII rows, or painted with R.MapGrid
 *   4. legends                      map character -> cell template
 *   5. items, hazards, entity templates, scripts, music, story text
 *
 * Then add one <script> line to index.html. Run `node tools/verify.js` and
 * `node tools/playtest.js lighthouse` to prove the variation is completable.
 */
(function (R) {
  'use strict';
  const U = R.util;

  // ---------------------------------------------------------------------
  // 1. Custom assets (anything not in engine/stock)
  // ---------------------------------------------------------------------
  R.defAsciiSprite('OILCAN', [
    '....DD......',
    '...DMMD.....',
    '....DD..DDD.',
    '.DDDDDDDDRD.',
    'DRRRRRRRRD..',
    'DRLRRRRRRD..',
    'DRLRRRRRRD..',
    'DRRRRRRRRD..',
    'DRRRRRRRRD..',
    'DMMMMMMMMD..',
    '.DDDDDDDD...',
  ], { D: '#201810', R: '#b02818', L: '#ff7a60', M: '#8a8a90' }, { scale: 1.7 });
  R.defAsciiSprite('MATCHES', [
    '..........',
    'DDDDDDDDDD',
    'DYYYYYYYYD',
    'DYRRRRRRYD',
    'DYYYYYYYYD',
    'DDDDDDDDDD',
    '.WWWWWWW..',
    '.RRRRRRR..',
  ], { D: '#3a2a10', Y: '#e0c040', R: '#c02018', W: '#e8e0c8' }, { scale: 1.6 });
  const lamp = on => (p) => {
    const brass = '#b89030', dark = '#4a3a18';
    p.rect(22, 72, 20, 8, dark).bevel(22, 72, 20, 8, 1.3, 0.6);
    p.rect(28, 50, 8, 22, brass).bevel(28, 50, 8, 22, 1.4, 0.6);
    p.ellipse(32, 30, 20, 22, on ? '#fff4c0' : '#3a4a5a');
    for (let k = -18; k <= 18; k += 6) p.line(32 + k, 10, 32 + k, 50, on ? '#ffe070' : '#5a6a7a');
    for (let k = -18; k <= 18; k += 7) p.line(12, 30 + k, 52, 30 + k, on ? '#ffd040' : '#4a5a6a');
    p.ring(32, 30, 20, brass, 2);
    if (on) { p.ellipse(32, 30, 8, 10, '#ffffff'); }
    p.rect(26, 4, 12, 6, brass);
  };
  R.defSprite('LAMP_OFF', { w: 64, h: 80, scale: 1.6, gen: lamp(false) });
  R.defSprite('LAMP_ON', { w: 64, h: 80, scale: 1.6, emissive: true, gen: lamp(true) });
  R.sfx.register('thunder', (A, o, v) => { A.noise({ dur: 2.6, f0: 300, f1: 60, vol: 0.55 * v, attack: 0.05 }, o); A.tone({ type: 'sine', f0: 50, f1: 30, dur: 2.2, vol: 0.35 * v }, o); });

  // ---------------------------------------------------------------------
  // 2. A custom behaviour: a storm that flashes lightning on a fixed rhythm
  // ---------------------------------------------------------------------
  R.entityTypes.register('storm', {
    init(e) { e.sprite = null; e.radius = 0; },
    update(e, g) {
      const k = Math.floor((g.time + (e.spec.offset || 4)) / (e.spec.every || 11));
      if (e.k === undefined) e.k = k;
      if (k !== e.k) { e.k = k; g.flash([210, 215, 255], 0.5); g.sound('thunder', undefined, undefined, 0.8); }
    },
  });

  // ---------------------------------------------------------------------
  // 3. Maps. The tower footprint (x 21..31, y 6..16) is shared by 3 floors.
  // ---------------------------------------------------------------------
  const TOWER_BASE = [ // island floor, placed at (21, 6); digits = stairs up
    'TTTTTTTTTTT',
    'ToooooooooT',
    'To=oooooooT',
    'Tooooooo##T',
    'Tooooooo55T',
    'Tooooooo44T',
    'Wooooooo33T',
    'Tooooooo22T',
    'Tooooooo11T',
    'ToooooooooT',
    'TTTTTETTTTT',
  ];
  const TOWER_MID = [ // watch room; letters = stairs from below, digits = up
    'TTTTTWTTTTT',
    'T.......β.T',
    'T..-......T',
    'T11.......T',
    'T22.....eeT',
    'W33.ZXZ.ddW',
    'T44.XGX.ccT',
    'T55.ZXZ.bbT',
    'T##..K..aaT',
    'T.......##T',
    'TTTTTTTTTTT',
  ];
  const TOWER_TOP = [ // lamp room with an outdoor gallery around it
    'yyyyyyyyyyyyy',
    'yGGGGGGGGGGGy',
    'yG.........Gy',
    'yG.........Gy',
    'yGaa.......Gy',
    'yGbb.......Gy',
    'yGcc..L....+y',
    'yGdd.......Gy',
    'yGee.......Gy',
    'yG.........Gy',
    'yG....γ....Gy',
    'yGGGGGGGGGGGy',
    'yyyyyyyyyyyyy',
  ];
  const COTTAGE = [ // placed at (5, 10)
    'HHHWHHHHH',
    'HkkkHkkkH',
    'HkMkHkΩkH',
    'Hkkk+kkkW',
    'HkkkHkKkH',
    'WkαkHkkkH',
    'Hk=kHkkkH',
    'HHH+HHHHH',
  ];
  const STORE = [ // placed at (24, 22)
    'SSSSSSSSSS',
    'Sϕ.......S',
    'S.CCC.CC.S',
    'D.......ψS',
    'S.CC.CCC.S',
    'Sχ.......S',
    'S.......OS',
    'SSSSSSSSSS',
  ];
  function island() {
    const g = new R.MapGrid(40, 40, '~');
    g.ellipse(20, 21, 17.6, 17.6, 'w');
    g.ellipse(20, 21, 16.2, 16.2, ',');
    for (const [x, y] of [[6, 24], [7, 24], [7, 25], [12, 30], [13, 30], [28, 33], [29, 33], [34, 15], [34, 16], [4, 19], [30, 19], [15, 6], [16, 6]]) g.put(x, y, 'R');
    g.stamp(COTTAGE, 5, 10).stamp(TOWER_BASE, 21, 6);
    g.rect(21, 19, 3, 13, 'w');
    for (let y = 19; y < 32; y++) g.put(22, y, 'v').put(23, y, 'u');
    g.stamp(STORE, 24, 22);
    g.rect(19, 18, 1, 19, ':').rect(8, 18, 12, 1, ':').rect(19, 17, 8, 1, ':').rect(20, 25, 1, 1, ':');
    // outdoor walls are as tall as the "sky height" of the cell in front of
    // them, so the cells ringing the tower get a tall one: a proper lighthouse
    g.replace(20, 5, 13, 13, { ',': ';', ':': '|' });
    g.rect(18, 35, 3, 5, 'p');
    g.put(19, 38, '@').put(19, 37, 'α').put(18, 35, '=').put(20, 35, 'ε');
    g.put(12, 21, ')').put(26, 30, ')').put(9, 28, ')');
    g.put(19, 36, '!');
    return g.rows();
  }

  // ---------------------------------------------------------------------
  // 4. Legends. Templates can inherit with `base`, entities use base 'auto'.
  // ---------------------------------------------------------------------
  const OUT = { sky: true, fog: true, cl: 3.0, light: 23, ftex: 'GRASS', low: 'DIRT', music: 'storm', label: 'Blackwater Island' };
  const ent = (e, extra) => Object.assign({ base: 'auto', ent: e }, extra || {});
  const deco = (sprite, radius = 0.3, solid = true) => ent({ type: 'deco', sprite, solid, radius });
  const item = (id, more) => ent(Object.assign({ type: 'item', item: id }, more || {}));
  const surf = phase => ({ base: ',', fl: -0.1, ftex: 'DIRT', label: 'The Tidal Channel', anim: { type: 'cycle', period: 4, duty: 0.35, phase, hazard: 'surf', texOn: 'WATER', texOff: 'DIRT' } });
  const WINDOW = { block: true, fl: 0.5, cl: 1.05, low: 'STONE_BLOCKS', lowIn: 'WOOD_PANEL', up: 'STONE_BLOCKS', upIn: 'PLASTER', ftex: 'STONE_FLOOR', ctex: 'STONE_FLOOR', light: 16, label: null };
  const RAIL_PORTAL = { portal: 'island', sky: true, fog: true, block: true };

  const islandLegend = {
    '~': { base: ',', fl: -0.8, ftex: 'WATER', low: 'STONE_ROUGH', block: true },
    ',': OUT,
    ':': { base: ',', ftex: 'GRAVEL' },
    ';': { base: ',', cl: 5.5 },
    '|': { base: ':', cl: 5.5 },
    'p': { base: ',', ftex: 'WOOD_DARK', low: 'WOOD_PANEL', label: 'The Jetty' },
    'R': { base: ',', fl: 1.3, low: 'STONE_ROUGH', ftex: 'STONE_FLOOR' },
    'w': surf(0), 'v': surf(0.25), 'u': surf(0.5),
    'H': { solid: true, wall: 'STONE_BLOCKS', wallIn: 'WALLPAPER_BLUE' },
    'W': WINDOW,
    'k': { ftex: 'WOOD_FLOOR', ctex: 'CEIL_BEAMS', cl: 1.3, light: 15, music: 'cottage', label: "The Keeper's Cottage", wall: 'WALLPAPER_BLUE' },
    '+': { base: 'k', label: null, door: { tex: 'DOOR_WOOD', lintel: 'STONE_BLOCKS', lintelIn: 'WALLPAPER_BLUE' } },
    'T': { solid: true, wall: 'PLASTER', wallIn: 'STONE_BLOCKS' },
    'o': { ftex: 'FLAGSTONE', ctex: 'CEIL_STONE', cl: 1.4, light: 11, music: 'tower', label: 'The Tower', wall: 'STONE_BLOCKS' },
    'E': { base: 'o', label: null, door: { key: 'key_tower', tex: 'DOOR_BLUE', lintel: 'PLASTER', lintelIn: 'STONE_BLOCKS' } },
    'S': { solid: true, wall: 'ATTIC_BOARDS' },
    'C': { solid: true, wall: 'CRATE_WALL' },
    '.': { ftex: 'WOOD_DARK', ctex: 'CEIL_ATTIC', cl: 1.4, light: 9, music: 'tower', label: 'The Storehouse', wall: 'ATTIC_BOARDS' },
    'D': { base: '.', label: null, door: { key: 'key_store', tex: 'DOOR_GREEN', lintel: 'ATTIC_BOARDS' } },
    '@': { base: 'p', start: 'N', ent: { type: 'storm', every: 11 } },
    'α': Object.assign(ent({ type: 'note', title: 'A TELEGRAM', text: 'RELIEF KEEPER - BLACKWATER LIGHT HAS GONE DARK STOP OLD KEEPER MISSING STOP CONVOY DUE TONIGHT STOP RELIGHT THE LAMP AT ALL COSTS STOP' })),
    'β': ent({ type: 'note', title: "THE KEEPER'S LOG", text: 'The generator throws sparks again - the floor around it bites in turns, like a chessboard. The storehouse key is on the far side of it.\n\nWe are nearly out of lamp oil up top. There is a full can in the storehouse, but the barrels have broken loose and roll about with every wave.' }),
    'γ': ent({ type: 'note', title: 'BRASS PLATE', text: 'FIRST-ORDER LENS. Fill the reservoir with oil, then light the wick.' }),
    'M': item('matches'), 'K': item('key_tower'), 'O': item('oilcan'), '!': item('potion'),
    'Ω': deco('BED', 0.45), '=': deco('BARREL', 0.28), 'ε': deco('CRATE', 0.35), ')': deco('DEAD_TREE', 0.25),
    'ϕ': ent({ tpl: 'barrel', path: [[0, 0], [7, 0]], phase: 0 }),
    'χ': ent({ tpl: 'barrel', path: [[0, 0], [7, 0]], phase: 0.5 }),
    'ψ': ent({ tpl: 'barrel', path: [[0, 0], [-7, 0]], phase: 0.25 }),
  };
  const towerLegend = {
    '~': RAIL_PORTAL,
    'T': { solid: true, wall: 'PLASTER', wallIn: 'STONE_BLOCKS' },
    'W': WINDOW,
    'G': { solid: true, wall: 'BOILER' },
    '.': { ftex: 'WOOD_FLOOR', ctex: 'CEIL_BEAMS', cl: 1.4, light: 12, music: 'tower', label: 'The Watch Room', wall: 'STONE_BLOCKS' },
    'Z': { base: '.', ftex: 'ELECTRIC_OFF', anim: { type: 'cycle', period: 2.4, duty: 0.35, phase: 0, hazard: 'shock', texOn: 'ELECTRIC', texOff: 'ELECTRIC_OFF' } },
    'X': { base: 'Z', anim: { type: 'cycle', period: 2.4, duty: 0.35, phase: 0.5, hazard: 'shock', texOn: 'ELECTRIC', texOff: 'ELECTRIC_OFF' } },
    'K': item('key_store'), '-': deco('DESK', 0.45), 'β': islandLegend['β'],
  };
  const topLegend = {
    '~': RAIL_PORTAL,
    'y': { sky: true, fog: true, cl: 1.8, light: 20, ftex: 'GRATE', low: 'STONE_BLOCKS', music: 'storm', label: 'The Gallery' },
    'G': { solid: true, wall: 'GLASS_PANES' },
    '.': { ftex: 'CHECKER', ctex: 'CEIL_METAL', cl: 1.8, light: 12, music: 'lamp', label: 'The Lamp Room', wall: 'GLASS_PANES' },
    '+': { base: '.', label: null, door: { tex: 'DOOR_WOOD', lintel: 'GLASS_PANES' } },
    'L': ent({ type: 'usable', sprites: ['LAMP_OFF', 'LAMP_ON'], script: 'lightLamp', radius: 0.6, solid: true }),
    'γ': islandLegend['γ'],
  };

  // ---------------------------------------------------------------------
  // 5. The campaign
  // ---------------------------------------------------------------------
  R.registerCampaign({
    id: 'lighthouse',
    title: 'Blackwater Light',
    subtitle: 'A night on the rock',
    credit: 'A RetroEngine template variation',
    world: { width: 40, height: 40 },
    sky: 'SKY_NIGHT',
    palette: { fogColor: '#26303f' },
    titleMusic: 'storm', introMusic: 'storm', endingMusic: 'lamp', defaultMusic: 'storm',
    attract: { x: 19.5, y: 38.5, ang: -Math.PI / 2 + 0.3, sweep: 0.7 },
    startMessage: 'Relight the lighthouse lamp. SPACE: use / read.  TAB: map.',
    intro: {
      title: 'Blackwater Light',
      text: 'The supply boat drops you at the jetty and turns back into the gale.\n\nBlackwater Light is dark. The old keeper is gone, a convoy is due before dawn, and the rocks around the island have sunk better ships than theirs.\n\nFind oil and fire, climb the tower, and light the lamp.',
    },
    items: {
      key_tower: { name: 'Tower Key', kind: 'key', sprite: 'KEY_SILVER', color: '#c8d0e0', desc: 'Opens the lighthouse door.' },
      key_store: { name: 'Storehouse Key', kind: 'key', sprite: 'KEY_GREEN', color: '#40c060', desc: 'Opens the storehouse by the channel.' },
      oilcan: { name: 'Lamp Oil', kind: 'tool', sprite: 'OILCAN', desc: 'A full can of paraffin for the great lamp.' },
      matches: { name: 'Matches', kind: 'tool', sprite: 'MATCHES', desc: 'Dry, thank goodness.' },
      potion: { name: 'Flask of Tea', kind: 'health', heal: 30, sprite: 'POTION' },
    },
    hud: { keys: ['key_tower', 'key_store'], tools: ['oilcan', 'matches'], relics: [] },
    hazards: {
      surf: { damage: 12, interval: 0.6, msg: 'A wave slams into you!', sound: 'splash' },
    },
    entityTemplates: {
      barrel: { type: 'patrol', sprite: 'BARREL', speed: 1.6, damage: 18, radius: 0.35, sound: 'clank', soundEvery: 1.5, msg: 'A rolling barrel knocks you flat!' },
    },
    floors: [
      { id: 'island', name: 'Blackwater Island', map: island(), legend: islandLegend, storey: 1.5, stairHead: 1.4, music: 'storm',
        stairUp: { ftex: 'STONE_FLOOR', low: 'STEP_STONE', ctex: 'CEIL_STONE', wall: 'STONE_BLOCKS', light: 10, music: 'tower' } },
      { id: 'tower', name: 'The Watch Room', origin: [20, 5], map: U.ringRows(TOWER_MID, '~'), legend: towerLegend, storey: 1.4, stairHead: 1.3, music: 'tower',
        stairDown: { ftex: 'STONE_FLOOR', low: 'STEP_STONE', ctex: 'CEIL_STONE', wall: 'STONE_BLOCKS', light: 10, music: 'tower' },
        stairUp: { ftex: 'STONE_FLOOR', low: 'STEP_STONE', ctex: 'CEIL_STONE', wall: 'STONE_BLOCKS', light: 10, music: 'tower' } },
      { id: 'lamp', name: 'The Lamp Room', origin: [19, 4], map: U.ringRows(TOWER_TOP, '~'), legend: topLegend, music: 'lamp',
        stairDown: { ftex: 'STONE_FLOOR', low: 'STEP_STONE', ctex: 'CEIL_STONE', wall: 'STONE_BLOCKS', light: 10, music: 'lamp' } },
    ],
    verify: { goal: { script: 'lightLamp', items: ['oilcan', 'matches'] } },
    scripts: {
      lightLamp(g, ctx) {
        const e = ctx.entity;
        if (g.flag('lit')) { g.msg('The great lamp blazes out over the black water.'); return; }
        const need = [];
        if (!g.has('oilcan')) need.push('oil');
        if (!g.has('matches')) need.push('something to light it with');
        if (need.length) { g.msg(`The great lamp is cold and dry. You need ${need.join(' and ')}.`, 4); g.sound('noway'); return; }
        g.take('oilcan'); g.take('matches'); g.flag('lit', true);
        e.state = 1;
        g.sound('whoosh'); g.sound('fanfare'); g.flash([255, 230, 150], 0.7);
        g.msg('You fill the reservoir and strike a match... the lamp roars into light!', 5);
        g.after(5, gg => gg.win({ title: 'The Light Returns', text: 'The beam sweeps out across Blackwater. Far off, a string of lights answers - the convoy turns, and passes the rocks in safety.\n\nWhen the dawn comes, grey and quiet, you are still up in the lamp room, watching the sea.' }));
      },
    },
    music: {
      storm: { bpm: 60, steps: 2, tracks: [
        { wave: 'noise', vol: 0.05, filter: 'lowpass', cutoff: 500, decay: 1.8, pattern: 'X . . . . . . . . . . . X . . . . . . . . . . .' },
        { wave: 'sawtooth', vol: 0.045, cutoff: 420, detune: 10, env: { a: 1, d: 1, s: 0.8, r: 2 }, pattern: 'D2 - - - - - - - - - - - C2 - - - - - - - - - - -' },
        { wave: 'sine', vol: 0.07, env: { a: 0.02, d: 1.2, s: 0.1, r: 1 }, pattern: 'A4 . . . F4 . . . . . . . G4 . . . E4 . . . . . . .' },
      ] },
      cottage: { bpm: 80, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.08, env: { a: 0.01, d: 0.4, s: 0.2, r: 0.4 }, pattern: 'G4 B4 D5 B4 A4 C5 E5 C5 F#4 A4 D5 A4 G4 B4 D5 G5' },
        { wave: 'sine', vol: 0.13, pattern: 'G2 - - - A2 - - - D2 - - - G2 - - -' },
      ] },
      tower: { bpm: 70, steps: 4, tracks: [
        { wave: 'noise', vol: 0.035, cutoff: 7000, decay: 0.03, pattern: 'x . . . x . . . x . . . x . . .' },
        { wave: 'square', vol: 0.03, cutoff: 800, env: { a: 0.02, d: 0.6, s: 0.3, r: 0.6 }, pattern: 'E3 . . . . . . . G3 . . . . . . . F#3 . . . . . . . D3 . . . . . . .' },
      ] },
      lamp: { bpm: 72, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.08, detune: 6, env: { a: 0.3, d: 0.5, s: 0.7, r: 1 }, pattern: 'C4 - - - - - - - G3 - - - - - - - A3 - - - - - - - F3 - - - - - - -' },
        { wave: 'sine', vol: 0.07, vibrato: 3, pattern: 'E5 - G5 - C6 - - - D5 - B4 - G4 - - - C5 - E5 - A5 - - - F5 - E5 - D5 - - -' },
      ] },
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
