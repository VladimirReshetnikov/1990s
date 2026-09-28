/*
 * HOURGLASS — Escape from the Vizier's Dungeon.
 *
 * The campaign: story, items, the shared legend of dungeon building blocks,
 * hazard presets and music. Levels live in ../levels/*.js (one file each,
 * registered with RetroEngine.defineLevel) and are played in `order`.
 *
 * SHARED LEGEND (heights are relative to the layer's z; layers are usually
 * 2 units apart: z = 0, 2, 4, 6 ...):
 *   ' ' '#'  rock (dungeon wall)        '%'  rock faced with sandstone
 *   '.'      floor, ceiling 1.4          ':'  torch-lit floor
 *   ','      floor, ceiling 3.4 (tall: fills this layer and the next; leave ' ' above)
 *   ';'      floor, ceiling 5.4 (three layers tall)
 *   '_'      pit: no floor, falls to the span below (abyss if none)
 *   'o'      loose floor (falls ~0.55 s after you step on it)   'O' the same, tall
 *   '1'..'7' stair steps 0.25 .. 1.75 high (a flight up one layer is 1..7)
 *   'L'      lava (death)     'E' level exit     '+' wooden door
 * Entities (they stand on the floor around them):
 *   '^' spikes (spring up when you run/jump near)   '!' spikes, always up
 *   'x' slicer   'T' wall torch   'C' checkpoint brazier
 *   'P' potion   'B' big life potion   'Q' poison   'G' gem
 * Each level adds its own characters for gates, plates, keys, notes, traps.
 */
(function (R) {
  'use strict';
  const ent = (e, extra) => Object.assign({ base: 'auto', ent: e }, extra || {});
  const FLOOR = { fl: 0, cl: 1.4, ftex: 'SAND_FLOOR', ctex: 'CEIL_DUNGEON', wall: 'DUNGEON_WALL', light: 13, music: 'dungeon' };

  const legend = {
    ' ': { solid: true, wall: 'DUNGEON_WALL' },
    '#': { solid: true, wall: 'DUNGEON_WALL' },
    '%': { solid: true, wall: 'SANDSTONE' },
    '.': FLOOR,
    ':': { base: '.', light: 20 },
    ',': { base: '.', cl: 3.4 },
    ';': { base: '.', cl: 5.4 },
    '_': { pit: true, cl: 1.4, ftex: 'SAND_FLOOR', ctex: 'CEIL_DUNGEON' },
    'o': { base: '.', loose: {}, ftex: 'LOOSE_FLAT' },
    'O': { base: ',', loose: {}, ftex: 'LOOSE_FLAT' },
    'L': { base: '.', fl: -0.3, cl: 1.4, ftex: 'LAVA', hazard: 'lava', light: 26, label: null },
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
  for (let n = 1; n <= 7; n++) legend[String(n)] = { base: '.', fl: n * 0.25, cl: n * 0.25 + 1.4, low: 'SANDSTONE' };

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
    titleMusic: 'title', introMusic: 'title', endingMusic: 'finale', defaultMusic: 'dungeon',
    legend,
    intro: {
      title: 'The Hourglass',
      text: 'Tariq the carpet-weaver heard too much: the Grand Vizier Qasim means to poison the Sultan at dawn.\n\nNow Tariq lies in the Dungeon of Sands beneath the palace, and the Vizier has turned his great hourglass. When the last grain falls, the Sultan drinks.\n\nClimb out through the cells, the chasm, the blade halls, the forge and the Vizier\'s tower. Run, jump and climb - and mind the floor.',
    },
    ending: {
      title: 'Dawn',
      text: 'Tariq bursts onto the palace roof as the first light touches the minarets. The guards hear his cry; the Sultan\'s cup is struck from his hand before it reaches his lips.\n\nThe Vizier\'s hourglass lies shattered in the tower. Its sand, they say, still glitters in the dungeon cracks.',
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
      spikes: { type: 'spikes', spriteOn: 'SPIKES_UP', spriteOff: 'SPIKES_DOWN' },
      spikesUp: { type: 'spikes', static: true, spriteOn: 'SPIKES_UP' },
      slicer: { type: 'slicer', period: 2.4 },
      flame: { type: 'trap', spriteOn: 'FLAME', spriteOff: 'VENT', period: 2.6, duty: 0.4, damage: 1, radius: 0.42, sound: 'whoosh', brightOn: true, msg: 'Scorched!' },
      darts: { type: 'darts', period: 2.2, speed: 6.5 },
      rock: { type: 'rock', period: 4 },
      boulder: { type: 'patrol', sprite: 'BOULDER', mode: 'oneway', speed: 3.2, radius: 0.55, height: 1.0, damage: 1, sound: 'crumble', soundEvery: 2.5, msg: 'Flattened by a boulder!' },
      pendulum: { type: 'pendulum', axis: 'y', amp: 1.0, period: 2.6, damage: 1, radius: 0.3, msg: 'The blade slices you!' },
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
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
