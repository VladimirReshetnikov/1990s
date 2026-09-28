/*
 * HOURGLASS — Escape from the Vizier's Dungeon.
 *
 * The campaign: story, items, the shared legend of dungeon building blocks,
 * hazard presets and music. Levels live in ../levels/*.js (one file each,
 * registered with RetroEngine.defineLevel) and are played in `order`.
 *
 * STOREYS are 1.5 apart: layers sit at z = 0, 1.5, 3.0, 4.5 ... A standard room
 * is 1.25 tall with a 0.25 slab above it. Climbable faces are at most 1.55 (one
 * storey + a step); faces meant to stop you are at least 1.95.
 *
 * SHARED LEGEND (heights are relative to the layer's z):
 *   ' ' '#'  rock (dungeon wall)        '%'  rock faced with sandstone
 *   '.'      floor, ceiling 1.25         ':'  torch-lit floor
 *   ','      floor, ceiling 2.75 (two storeys tall: leave ' ' in the layer above)
 *   ';'      floor, ceiling 4.25 (three storeys tall)
 *   '_'      pit: no floor, falls to the open span below (must have one)
 *   '~'      bottomless abyss (a pit with nothing below)
 *   'o'      loose floor (drops 0.7 s after you touch it)   'O' the same, two storeys tall
 *   '1'..'5' stair steps 0.25 .. 1.25 high (a flight up one storey is 1..5, then the next layer)
 *   'L'      lava (death)     'E' level exit     '+' wooden door
 * Entities (they stand on the floor around them):
 *   '^' spikes (spring up when you come near; careful step is safe)   '!' spikes, always up
 *   'x' slicer (put it in a 1-wide corridor)   'T' wall torch   'C' checkpoint brazier
 *   'P' potion   'B' big life potion   'Q' poison   'G' gem
 * Each level adds its own characters for gates, plates, keys, notes, traps,
 * built with the RetroEngine.HG helpers below (gate, plate, keyDoor, lever...).
 */
(function (R) {
  'use strict';
  const ent = (e, extra) => Object.assign({ base: 'auto', ent: e }, extra || {});
  // (no music here: a level plays its own `music`; a template may switch songs for an area)
  const FLOOR = { fl: 0, cl: 1.25, ftex: 'SAND_FLOOR', ctex: 'CEIL_DUNGEON', wall: 'DUNGEON_WALL', light: 13 };

  /**
   * Building blocks for level legends (spread them into a legend entry):
   *   '|': HG.gate('g1')                    see-through portcullis, opened by plates/levers
   *   '=': HG.plate({ opens: 'g1', hold: 8 })   pressure plate (hold: seconds the gate stays up)
   *   'k': HG.item('key_bronze')            'n': HG.note('TITLE', 'text')
   *   'd': HG.keyDoor('key_bronze')         'v': HG.lever({ opens: 'g2' }) (a rock face with a lever)
   *   'a': HG.trigger('text')              any char: HG.floor({ light: 20 }), HG.ent({ tpl: 'darts', dir: 'W' })
   * HG.item / HG.note / HG.trigger take (…, spec, template): `spec` goes to the entity,
   * `template` to the legend entry (e.g. { base: 'd' } to stand on a specific floor).
   */
  const HG = R.HG = {
    floor: (extra = {}) => Object.assign({ base: '.' }, extra),
    gate: (tag, { door, ...rest } = {}) => Object.assign({ base: '.', tag, label: null, door: Object.assign({ remote: true, see: true, tex: 'GATE_BARS', speed: 2.5, closeSpeed: 0.45, sound: 'gate' }, door || {}) }, rest),
    plate: (plate, extra = {}) => Object.assign({ base: '.', plate: Object.assign({ hold: 0 }, plate), ftex: plate.ftex || 'PLATE_FLAT' }, extra),
    keyDoor: (key, { door, ...rest } = {}) => Object.assign({ base: '.', label: null, door: Object.assign({ key, tex: 'DOOR_WOOD' }, door || {}) }, rest),
    lever: (lever, extra = {}) => Object.assign({ solid: true, wall: 'LEVER_UP', lever }, extra),
    item: (item, extra = {}, tpl = {}) => ent(Object.assign({ type: 'item', item }, extra), tpl),
    note: (title, text, extra = {}, tpl = {}) => ent(Object.assign({ type: 'note', title, text }, extra), tpl),
    trigger: (text, extra = {}, tpl = {}) => ent(Object.assign({ type: 'trigger', text }, extra), tpl),
    ent,
  };

  const legend = {
    ' ': { solid: true, wall: 'DUNGEON_WALL' },
    '#': { solid: true, wall: 'DUNGEON_WALL' },
    '%': { solid: true, wall: 'SANDSTONE' },
    '.': FLOOR,
    ':': { base: '.', light: 20 },
    ',': { base: '.', cl: 2.75 },
    ';': { base: '.', cl: 4.25 },
    '_': { pit: true, cl: 1.25, ftex: 'SAND_FLOOR', ctex: 'CEIL_DUNGEON', light: 13 },
    '~': { pit: true, abyss: true, cl: 1.25, ftex: 'ABYSS', ctex: 'CEIL_DUNGEON', light: 10 },
    'o': { base: '.', loose: {}, ftex: 'LOOSE_FLAT' },
    'O': { base: ',', loose: {}, ftex: 'LOOSE_FLAT' },
    'L': { base: '.', fl: -0.3, cl: 1.25, ftex: 'LAVA', hazard: 'lava', light: 26, label: null },
    'E': { base: '.', exit: true, ftex: 'EXIT_FLAT', light: 22, label: 'The Way Out' },
    '+': { base: '.', label: null, door: { tex: 'DOOR_WOOD' } },
    '^': ent({ tpl: 'spikes' }),
    '!': ent({ tpl: 'spikesUp' }),
    'x': ent({ tpl: 'slicer' }),
    'T': ent({ type: 'deco', sprite: 'TORCH', z: 0.55, radius: 0.1 }),
    'C': ent({ type: 'checkpoint' }),
    'P': ent({ type: 'item', item: 'potion' }),
    'B': ent({ type: 'item', item: 'bigpotion' }),
    'Q': ent({ type: 'item', item: 'poison' }),
    'G': ent({ type: 'item', item: 'gem' }),
  };
  for (let n = 1; n <= 5; n++) legend[String(n)] = { base: '.', fl: n * 0.25, cl: n * 0.25 + 1.25, low: 'SANDSTONE' };

  R.registerCampaign({
    id: 'hourglass',
    title: 'Hourglass',
    subtitle: "Escape from the Vizier's Dungeon",
    credit: 'A RetroEngine platform adventure',
    sky: 'SKY_NIGHT',
    palette: { fogColor: '#241c18' },
    render: { falloff: 1.05 },
    face: 'TFACE',
    hudTexture: 'SANDSTONE_DARK',
    cardTexture: 'SANDSTONE_DARK',
    looseSprite: 'LOOSE_TILE',
    storey: 1.5,
    titleMusic: 'title', introMusic: 'title', endingMusic: 'finale', defaultMusic: 'dungeon',
    legend,
    intro: {
      title: 'The Hourglass',
      text: "Aladdin had the quickest fingers in the great bazaar. Last night he cut the purse of a hooded stranger - and found in it a vial of poison and a letter: the Sultan will drink it at dawn.\n\nThe stranger was the Grand Vizier Qasim. His guards caught Aladdin by the fountain and threw him into the Dungeon of Sands beneath the palace. Then the Vizier turned his great hourglass: when the last grain falls, the Sultan drinks - and the thief hangs.\n\nNo lock ever held Aladdin for long. Climb out through the cells, the chasm, the blade halls, the forge and the Vizier's tower. Run, jump and climb - and mind the floor.",
    },
    ending: {
      title: 'Dawn',
      text: "Aladdin bursts onto the palace roof as the first light touches the minarets. The guards hear his cry; the Sultan's cup is struck from his hand before it reaches his lips, and the Vizier's letter is read aloud in the court.\n\nThe Sultan pardons the thief of the bazaar - and makes him keeper of the palace keys. The Vizier's hourglass lies shattered in the tower; its sand, they say, still glitters in the dungeon cracks.",
    },
    items: {
      key_bronze: { name: 'Bronze Key', kind: 'key', sprite: 'KEY_BRASS', color: '#c08040', desc: 'Opens a bronze-banded door.' },
      key_silver: { name: 'Silver Key', kind: 'key', sprite: 'KEY_SILVER', color: '#c8d0e0', desc: 'Opens a silver-banded door.' },
      key_gold: { name: 'Gold Key', kind: 'key', sprite: 'KEY_YELLOW', color: '#f0d020', desc: 'Opens a gold-banded door.' },
      seal: { name: "Vizier's Seal", kind: 'relic', sprite: 'SEAL', color: '#e0b030', desc: 'Opens the way to the roof.' },
      potion: { name: 'Potion', kind: 'life', heal: 1, sprite: 'POTION_RED', msg: 'A healing draught. (+1 life)' },
      bigpotion: { name: 'Great Potion', kind: 'bigLife', sprite: 'POTION_BIG', msg: 'A potion of life! Your strength grows.' },
      poison: { name: 'Poison', kind: 'poison', sprite: 'POTION_BLUE', msg: 'Ugh - poison!' },
      gem: { name: 'Gem', kind: 'gem', sprite: 'GEM_EMERALD', msg: 'A gem!' },
    },
    hud: { keys: ['key_bronze', 'key_silver', 'key_gold'], relics: ['seal'], gemSprite: 'GEM_EMERALD' },
    entityTemplates: {
      spikes: { type: 'spikes', spriteOn: 'SPIKES_UP', spriteOff: 'SPIKES_DOWN', hold: 1.5 },
      spikesUp: { type: 'spikes', static: true, spriteOn: 'SPIKES_UP' },
      // every periodic hazard runs on the 0.6 s dungeon beat: periods are multiples of 0.6
      slicer: { type: 'slicer', period: 2.4, bladeTex: 'SLICER_JAWS', radius: 0.25 },
      flame: { type: 'trap', spriteOn: 'FLAME', spriteOff: 'VENT', period: 2.4, duty: 0.375, damage: 1, radius: 0.42, sound: 'whoosh', brightOn: true, msg: 'Scorched!' },
      darts: { type: 'darts', period: 2.4, speed: 5 },
      rock: { type: 'rock', period: 3.6 },
      boulder: { type: 'patrol', sprite: 'BOULDER', mode: 'oneway', speed: 3.0, radius: 0.55, height: 1.0, damage: 1, sound: 'rumble', soundEvery: 2.5, msg: 'Flattened by a boulder!' },
      pendulum: { type: 'pendulum', axis: 'y', amp: 1.2, period: 2.4, damage: 1, radius: 0.3, msg: 'The blade slices you!' },
    },
    get levels() { return R.levels.names().map(n => R.levels.get(n)).sort((a, b) => (a.order || 0) - (b.order || 0)); },
    verify: {},
    scripts: {},
    music: {
      title: { bpm: 70, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.09, detune: 6, env: { a: 0.3, d: 0.5, s: 0.7, r: 1 }, pattern: 'D3 - - - - - - - Eb3 - - - - - - - D3 - - - - - - - C3 - - - - - - -' },
        { wave: 'square', vol: 0.035, cutoff: 1500, vibrato: 4, env: { a: 0.02, d: 0.3, s: 0.5, r: 0.5 }, pattern: 'D5 - Eb5 - F#5 - G5 - A5 - - - G5 F#5 Eb5 - D5 - - - . . . . A4 - Bb4 - C5 - Bb4 A4 G4 - F#4 - G4 - A4 - - - . . . .' },
        { wave: 'noise', vol: 0.03, cutoff: 900, filter: 'bandpass', decay: 0.07, pattern: 'X . . x . . x . X . . x . . . .' },
      ] },
      dungeon: { bpm: 64, steps: 2, tracks: [
        { wave: 'sawtooth', vol: 0.045, cutoff: 420, detune: 8, env: { a: 1, d: 1, s: 0.8, r: 2 }, pattern: 'D2 - - - - - - - - - - - - - - - Eb2 - - - - - - - D2 - - - - - - -' },
        { wave: 'sine', vol: 0.06, env: { a: 0.005, d: 1.2, s: 0.0, r: 1 }, pattern: 'A4 . . . . . F#4 . . . . . . . . . G4 . . . Eb4 . . . . . . . D4 . . .' },
        { wave: 'noise', vol: 0.025, cutoff: 700, filter: 'bandpass', decay: 0.1, pattern: 'X . . . . . x . . . . . . . . .' },
      ] },
      finale: { bpm: 84, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.09, detune: 6, env: { a: 0.1, d: 0.4, s: 0.7, r: 1 }, pattern: 'D3 - - - F#3 - - - G3 - - - A3 - - -' },
        { wave: 'square', vol: 0.04, cutoff: 2000, pattern: 'D5 - F#5 - A5 - D6 - C6 - A5 - G5 - F#5 - - - - - . .' },
      ] },
    },
  });
  // one song per level (game/audio.js replaces these placeholders)
  const camp = R.campaigns.get('hourglass');
  for (const id of ['cells', 'chasm', 'blades', 'forge', 'tower']) if (!camp.music[id]) camp.music[id] = camp.music.dungeon;
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
