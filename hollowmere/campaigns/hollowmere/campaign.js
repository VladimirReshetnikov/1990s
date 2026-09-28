/*
 * HOLLOWMERE — the default campaign.
 *
 * A complete example of a RetroEngine "variation": four floors (cellar,
 * ground floor + grounds, upper floor, attic + roof) joined by staircases,
 * keys and artifacts, predictable hazards, notes, secrets and a finale.
 *
 * Map conventions (see README.md for the full format):
 *   - each floor has a legend: map character -> cell template
 *   - '1'..'9' / 'a'..'i' are reserved for staircases (up / down)
 *   - legend entries with base: 'auto' are entities standing on whatever
 *     floor surrounds them
 */
(function (R) {
  'use strict';
  const U = R.util;

  // =====================================================================
  //  Cell templates shared by several floors
  // =====================================================================
  const OUT = { sky: true, fog: true, cl: 4.2, light: 24, music: 'dusk', label: 'The Grounds', ftex: 'GRASS', low: 'DIRT', wall: 'BRICK_RED', ctex: 'CEIL_STONE' };
  const WINDOW = { block: true, fl: 0.5, cl: 1.15, low: 'BRICK_RED', lowIn: 'WOOD_PANEL', up: 'BRICK_RED', upIn: 'PLASTER', ftex: 'STONE_FLOOR', ctex: 'STONE_FLOOR', light: 20, label: null };
  const PORTAL_GROUND = { portal: 'ground', sky: true, fog: true, block: true };
  const ent = (e, extra) => Object.assign({ base: 'auto', ent: e }, extra || {});
  const deco = (sprite, solid = true, radius = 0.3, more = {}) => ent(Object.assign({ type: 'deco', sprite, solid, radius }, more));
  const item = (id, more = {}) => ent(Object.assign({ type: 'item', item: id }, more));
  const note = (title, text) => ent({ type: 'note', title, text });

  // =====================================================================
  //  GROUND FLOOR — the house (36 x 24, placed at world 14,3)
  // =====================================================================
  const HOUSE_GROUND = [
    'KKKKKKWKKKBBWBWBBBBBBBWBBWBBWBBBBBBB',
    'KkkkkδkkkDrrrrrr#ρp#ψmmmmmmmmmψ####B',
    'KeeDkkkkkDrrrrrr#pp#mmmmmmmmm$m####B',
    'KddDkkkkkDrrrrrr#pp#mmNmmmmmmmm##66B',
    'KccDkkkkk+rFrrFr+pp#mmmmmmmmmmm##55B',
    'KbbDkkkkkDrrrrrr#pp#mmmmmγmmmmm##44B',
    'KaaDkkkkkDrrrrrr#pp#mmmmmmmmmmm##33B',
    'KDDDkkkkkDrrrrrr####mmmmmmmmmmm##22B',
    'KDDDkkkk_Drrrrrr#66#ψmmmmmmmmmψ##11B',
    'B#####+#####+####55######+#######..B',
    'W...............#44#...............B',
    'B####+########..#33#########+##CCCCB',
    'JlllllLlllll##..#22#####χnnnnnnssssV',
    'JlLLLlLlLLLl##..#11#####nnnnnnnss[sV',
    'JlLlllllllLl##+##XX#####nnnnnnnssssW',
    'JlLlLLLLLlLl#oooooooooo#nnnnnnnnnnnV',
    'JlllLlllLlll#o!oooooo!o#nnnΔnnnnΩnnV',
    'JLLlLlLlLLLl#oooooooooo#nnnnn0nnnnnV',
    'WllllllLllll+oooo0oooooRnnnnnnnnnnnW',
    'JlLLLlLLLLLL#oooooooooo#nnnnnnΣnnnnV',
    'JβllLlllllLL#oooooooooo#nnnnnnnnnnnV',
    'Jl-lLLLLl%tt#o!oooooo!o#nnnnnnnnnnnV',
    'Jl/llllLlL$]#oooooooooo#χnnnnnnnnμχV',
    'JJJWJJJJWJJJBBWBBEEBBWBBVVWVVWVVWVVV',
  ];

  const GREENHOUSE = [ // 8 x 15, placed at world 53,5
    'vvvvvvvv',
    'vπvζvvπv',
    'vπτvvτπv',
    'vπvzzvπv',
    'vvvσvvvv',
    'πππvπππv',
    'vvτvvςvv',
    'vzzvππzv',
    'vππvππvv',
    'vςvvτvvπ',
    'vππzzπvv',
    'vππvvπσv',
    'vvvvvvvv',
    'πτππππτπ',
    'vvvvvvvv',
  ];

  function buildGrounds() {
    const g = new R.MapGrid(64, 56, ',');
    g.ring(0, 0, 64, 56, 'T').ring(1, 1, 62, 54, 'T');
    // gardener's shed and its clearing
    g.rect(2, 2, 9, 8, ';');
    g.ring(3, 3, 7, 6, 'S');
    g.rect(4, 4, 5, 4, 'w');
    g.put(6, 8, 'w').put(5, 5, '<').put(8, 4, 'ε').put(4, 7, 'ε').put(8, 7, '_');
    // pond
    g.ellipse(7.5, 16.5, 4.5, 3.2, 'q');
    // porch, front path, fountain plaza
    g.rect(29, 27, 6, 2, '=');
    g.rect(31, 29, 2, 23, ':');
    g.rect(28, 36, 8, 8, ':');
    g.ring(30, 38, 4, 4, 'y');
    g.rect(31, 39, 2, 2, '^');
    g.put(31, 39, 'Φ');
    g.rect(8, 29, 23, 1, ':');
    g.rect(33, 29, 22, 1, ':');
    g.rect(51, 22, 1, 7, ':');
    g.rect(36, 44, 3, 1, ':');
    for (const [x, y] of [[30, 31], [33, 31], [27, 36], [36, 36], [27, 43], [36, 43], [30, 48], [33, 48], [13, 29], [49, 29]]) g.put(x, y, '{');
    // front wall with the locked iron gate
    g.rect(2, 52, 60, 1, 'x').rect(31, 52, 2, 1, 'I').rect(2, 53, 60, 1, ':');
    g.put(31, 51, '@').put(31, 50, 'α');
    // hedge maze (procedural but seeded -> identical every time)
    const mz = U.maze(23, 21, { wall: 'H', floor: 'j', seed: 1897, open: [[8, 7, 7, 7]], braid: 0.2 });
    g.stamp(mz.rows, 3, 31);
    g.put(25, 44, 'j').put(25, 45, 'j');
    g.put(12, 39, 'U').put(16, 39, 'U').put(12, 43, 'U').put(16, 43, 'U').put(14, 41, '>');
    let far = null, fd = -1;
    for (const [x, y] of mz.deadEnds) { const d = Math.abs(x - 22) + Math.abs(y - 13); if (d > fd && !(x >= 8 && x < 15 && y >= 7 && y < 14)) { fd = d; far = [x, y]; } }
    if (far) g.put(3 + far[0], 31 + far[1], 'ω');
    // cemetery
    g.rect(39, 31, 22, 20, ';').ring(39, 31, 22, 20, 'x').rect(39, 43, 1, 3, ';');
    for (let y = 34; y <= 49; y += 3) for (let x = 42; x <= 48; x += 3) g.put(x, y, (x + y) % 2 ? '}' : '|');
    for (const [x, y] of [[41, 33], [57, 46], [53, 48], [45, 36]]) g.put(x, y, ')');
    // mausoleum with the crypt stairs down to the catacombs
    g.ring(50, 34, 10, 9, 'M');
    g.rect(51, 35, 8, 7, 'u');
    g.rect(56, 37, 1, 5, 'M');
    'edcba'.split('').forEach((ch, i) => g.put(57, 37 + i, ch).put(58, 37 + i, ch));
    g.put(50, 38, 'G').put(56, 39, 'Ξ').put(52, 40, 'ϑ');
    // greenhouse
    g.rect(51, 3, 11, 19, ';');
    g.ring(52, 4, 10, 17, 'Z');
    g.stamp(GREENHOUSE, 53, 5);
    g.put(52, 12, 'Y');
    // trees, bushes, statues
    for (const [x, y] of [[12, 4], [12, 11], [2, 12], [3, 22], [9, 25], [12, 20], [4, 27], [11, 27], [54, 25], [60, 23], [60, 27], [57, 29], [38, 23], [37, 49], [27, 50], [36, 40]]) g.put(x, y, '&');
    for (const [x, y] of [[2, 30], [61, 31], [61, 40], [26, 31], [5, 51]]) g.put(x, y, '(');
    for (const [x, y] of [[16, 27], [20, 27], [24, 27], [39, 27], [43, 27], [47, 27], [27, 33], [36, 33]]) g.put(x, y, '*');
    g.put(28, 28, 'θ').put(35, 28, 'θ');
    g.put(10, 23, 'O').put(37, 38, '?');
    // the house itself
    g.stamp(HOUSE_GROUND, 14, 3);
    return g.rows();
  }

  const groundLegend = {
    // ---- outdoors
    ',': OUT,
    ';': { base: ',', cl: 2.2 },
    ':': { base: ',', ftex: 'GRAVEL' },
    '=': { base: ',', ftex: 'COBBLE' },
    'T': { base: ',', fl: 2.0, low: 'TREELINE', ftex: 'TREE_TOP' },
    'H': { base: ',', fl: 1.35, low: 'HEDGE', ftex: 'HEDGE_TOP', label: 'The Hedge Maze' },
    'j': { base: ',', ftex: 'GRASS', label: 'The Hedge Maze' },
    'q': { base: ',', fl: -0.25, ftex: 'WATER', low: 'DIRT', label: 'The Pond' },
    'y': { base: ':', fl: 0.4, ftex: 'STONE_FLOOR', low: 'STONE_BLOCKS' },
    '^': { base: ':', fl: 0.2, ftex: 'WATER', low: 'STONE_BLOCKS', block: true },
    'x': { base: ',', fl: 1.0, low: 'STONE_MOSSY', ftex: 'STONE_FLOOR', block: true },
    'I': { base: ',', fl: 1.5, low: 'GATE_IRON', ftex: 'STONE_FLOOR', block: true },
    // ---- mausoleum
    'M': { solid: true, wall: 'STONE_DARK', wallIn: 'CRYPT_WALL' },
    'u': { ftex: 'CRYPT_FLOOR', ctex: 'CEIL_STONE', cl: 1.8, light: 9, music: 'crypt', label: 'The Mausoleum', wall: 'CRYPT_WALL' },
    'G': { base: 'u', label: null, door: { remote: true, tex: 'GATE_IRON', h: 1.3, lintel: 'STONE_DARK', lintelIn: 'CRYPT_WALL', sound: 'gate', msg: 'The iron gate is locked fast. There is no keyhole on this side.' }, tag: 'mausgate' },
    'Ξ': { solid: true, wall: 'STONE_DARK', wallIn: 'SWITCH_OFF', use: 'mausLever', tag: 'mauslever' },
    // ---- greenhouse
    'Z': { solid: true, wall: 'GLASS_PANES' },
    'v': { base: ',', cl: 2.2, ftex: 'TERRACOTTA', light: 21, label: 'The Greenhouse' },
    'Y': { base: 'v', label: null, door: { key: 'key_yellow', tex: 'DOOR_YELLOW', h: 1.2, lintel: 'GLASS_PANES' } },
    'z': { base: 'v', fl: -0.08, ftex: 'SLUDGE', low: 'TERRACOTTA', hazard: 'acid' },
    'π': { base: 'v', fl: 0.45, low: 'PLANTER', ftex: 'SOIL', block: true },
    // ---- shed
    'S': { solid: true, wall: 'ATTIC_BOARDS' },
    'w': { ftex: 'WOOD_DARK', ctex: 'CEIL_ATTIC', cl: 1.3, light: 13, label: "The Gardener's Shed", music: 'dusk', wall: 'ATTIC_BOARDS' },
    // ---- the house: walls (exterior variants differ only in their inside face)
    'B': { solid: true, wall: 'BRICK_RED', wallIn: 'WALLPAPER_GREEN' },
    'K': { solid: true, wall: 'BRICK_RED', wallIn: 'TILE_WHITE' },
    'J': { solid: true, wall: 'BRICK_RED', wallIn: 'BOOKSHELF' },
    'V': { solid: true, wall: 'BRICK_RED', wallIn: 'MARBLE_WALL' },
    'W': WINDOW,
    '#': { solid: true, wall: 'WALLPAPER_GREEN' },
    'D': { solid: true, wall: 'TILE_WHITE' },
    'L': { solid: true, wall: 'BOOKSHELF' },
    'C': { solid: true, wall: 'CURTAIN' },
    // ---- the house: floors
    '.': { ftex: 'WOOD_FLOOR', ctex: 'CEIL_PLASTER', cl: 1.4, light: 16, music: 'manor', label: 'The Hallway', wall: 'WALLPAPER_GREEN' },
    'k': { base: '.', ftex: 'TERRACOTTA', ctex: 'CEIL_BEAMS', label: 'The Kitchen', light: 15, enter: 'kitchenHint' },
    'r': { base: '.', ftex: 'CARPET_RED', label: 'The Dining Room', light: 14 },
    'l': { base: '.', ftex: 'CARPET_GREEN', cl: 1.6, label: 'The Library', light: 12 },
    't': { base: 'l', label: 'A Hidden Alcove', light: 16 },
    'o': { base: '.', ftex: 'CHECKER', cl: 2.4, label: 'The Foyer', light: 19 },
    'n': { base: '.', ftex: 'PARQUET', cl: 2.2, label: 'The Ballroom', light: 18 },
    's': { base: 'n', fl: 0.3, low: 'STEP_WOOD', ftex: 'WOOD_DARK' },
    'm': { base: '.', ftex: 'MARBLE_FLOOR', cl: 1.6, label: 'The Music Room', light: 17 },
    'p': { base: '.', ftex: 'STONE_FLOOR', cl: 1.3, label: "The Butler's Pantry", light: 11 },
    // ---- doors
    '+': { base: '.', label: null, door: { tex: 'DOOR_WOOD' } },
    'E': { base: 'o', label: null, tag: 'frontdoor', door: { key: 'key_brass', tex: 'DOOR_FRONT', h: 1.25, lintel: 'BRICK_RED', lintelIn: 'WALLPAPER_GREEN', msg: 'The front door is locked. The letter said the gardener left the key somewhere in the grounds.', openMsg: 'The brass key turns stiffly. The front door groans open.' } },
    'R': { base: '.', label: null, door: { key: 'key_red', tex: 'DOOR_RED' } },
    'X': { base: 'o', label: null, tag: 'barricade', door: { key: 'crowbar', tex: 'PLANKS', h: 1.5, speed: 4, sound: 'crash', msg: 'The staircase is barricaded with thick planks. You would need a tool to pry them loose.', openMsg: 'You wrench the planks away with the crowbar!' } },
    '%': { base: 'l', label: null, door: { secret: true, tex: 'BOOKSHELF' } },
    // ---- entities
    '@': { base: ':', start: 'N' },
    'α': Object.assign(note('A LETTER', 'To the heir of Professor Aldous Crane.\n\nHollowmere is yours - if you can reach its heart. The Professor wished that his Great Orrery, up in the rooftop observatory, be set turning once more.\n\nThe front door key was left with the gardener, who hid it "where the green walls turn and turn again".\n\nMind the old place. It has... habits.\n\n- Wm. Pettigrew, Solicitor'), { base: ':' }),
    'β': note("THE PROFESSOR'S JOURNAL", 'The Orrery is finished. Three stones set it turning: the SUN, the MOON and the STAR.\n\nI have hidden them where only a patient guest will find them - the Moon below, the Star above, the Sun among the growing things.\n\nMy lantern stays here in the reading nook. The cellar stairs off the kitchen are black as pitch.'),
    'γ': note("A NOTE ON THE PIANO", 'The dancers were my wife\'s delight. Wind them once and they waltz forever, round and round, each in her own circle.\n\nWatch their circles and step between them. The BLUE KEY waits on the stage.'),
    'δ': note("COOK'S NOTE", 'DO NOT go down to the cellar without a lamp. The master\'s machines are still running down there, and the steam hammers do not care who is underneath.'),
    '&': deco('TREE', true, 0.35),
    '(': deco('PINE', true, 0.3),
    ')': deco('DEAD_TREE', true, 0.25),
    '*': deco('BUSH', true, 0.3),
    'θ': deco('ROSEBUSH', true, 0.3),
    '{': deco('LAMPPOST', true, 0.12),
    '}': deco('GRAVE', true, 0.3),
    '|': deco('GRAVE_CROSS', true, 0.25),
    '?': deco('STATUE', true, 0.35),
    'O': deco('WELL', true, 0.55),
    'Φ': Object.assign(deco('FOUNTAIN', true, 0.9, { dx: 0.5, dy: 0.5 }), { base: '^' }),
    'U': deco('PILLAR', true, 0.28),
    'ε': deco('CRATE', true, 0.35),
    '_': deco('BARREL', true, 0.28),
    'ψ': deco('PLANT', true, 0.25),
    'N': deco('PIANO', true, 0.5),
    'F': deco('TABLE', true, 0.45),
    '-': deco('DESK', true, 0.45),
    '!': deco('PILLAR', true, 0.28),
    '0': deco('CHANDELIER', false, 0.3, { dx: 0.5 }),
    'χ': deco('CANDELABRA', true, 0.2),
    'ϑ': deco('SKELETON', false, 0.3),
    '<': item('boots'),
    '>': Object.assign(item('key_brass', { z: 0.45 }), { ent: [{ type: 'deco', sprite: 'PEDESTAL', solid: true, radius: 0.22 }, { type: 'item', item: 'key_brass', z: 0.45 }] }),
    '/': item('lantern'),
    '[': item('key_blue'),
    '$': item('coins'),
    ']': item('goblet'),
    'ω': Object.assign(item('crown'), { secret: true }),
    'ρ': item('potion'),
    'μ': item('medkit'),
    'ζ': Object.assign(item('stone_sun', { z: 0.45 }), { ent: [{ type: 'deco', sprite: 'PEDESTAL', solid: true, radius: 0.22 }, { type: 'item', item: 'stone_sun', z: 0.45 }] }),
    'τ': ent({ tpl: 'thorns' }),
    'σ': ent({ tpl: 'spores', phase: 0 }),
    'ς': ent({ tpl: 'spores', phase: 0.5 }),
    'Δ': ent({ tpl: 'dancer', r: 1.9, period: 6.5, phase: 0 }),
    'Σ': ent({ tpl: 'dancer', r: 2.2, period: 8, phase: 0.4, ccw: true }),
    'Ω': ent({ tpl: 'dancer', r: 1.3, period: 4.5, phase: 0.7 }),
  };

  // =====================================================================
  //  CELLAR (placed at world 14,3 — same local coordinates as the house)
  // =====================================================================
  const CELLAR = [
    '                                              ',
    ' ##          #########MMMMMMMMMMMMMMMMMMMM    ',
    '#55#         #ttttttt#MmmXXmYYmZZmmmmmmmmO    ',
    '#44#         #ttttttt#MmmXXmYYmZZmmmmmmmmO    ',
    '#33#         #ttttttt#MmmMMMMMMMMMMM^^^^^O    ',
    '#22#         #t=tt/tt#MmmPPPPPPPPPPPmmmmmO    ',
    '#11#         #ttttttα#MmmPPPPPPPPPPPvvvvvO    ',
    '#LL#         #ttttttt#MmmPPPPPPPPPPPmmmmmO    ',
    '#..#         ####+####MγmPPPPPPPPPPPyyyyyO    ',
    '#.....................+mmPPPPPPPPPPPmmmmmO    ',
    '#.....................+mmPPPPPPPPPPPmmmmmO    ',
    '##.###############+###MmmPPPPPPPPPPP!mmm-O    ',
    '#wwwwwRwwwwww#kδkkkkkkMMMMMMMMMMMMMMMMMMMM    ',
    '#wRRwwRwRRRRw#kssssssssssssssssssk#           ',
    '#wRwwRRwwwwRw#kssssssssssssssssssk#           ',
    '#wRwRRwwRRwRw#ksssBssssssssssBsssk#           ',
    '#wwwRwwRRwwRw#kssssssssssssssssssk#CCCCCCCCCC ',
    '#RRwRwRRwwRRw#kssssssssssssssssssk#CuuuuuuuuC ',
    '#wwwwwRwwRwww#kssssssssssssssssssk#Cu(uuuu)uC ',
    '#wRRRwRwRRwRR#kssssssssssssssssssk#CuuuuuuuuC ',
    '#RRRRwRwwwRRw#ksssssssk*kksssssssk#uuuuouuuuC ',
    '#]w%wwRwRwwwR#kssssssskkkksssssssk#CuuuuuuuuC ',
    '#w$Rwwwwwwwww#kssssssssssssssssssk#Cu)uuuu&uC ',
    '##############ksssBssssssssssBsssk#CuuuuuuuuC ',
    '              kssssssssssssssssssk#CCCCuCCCCC ',
    '              kssssssssssssssssssk#   C~C     ',
    '              kssssssssssssssssssk#   CuC     ',
    '              kssssssssssssssssssk#   CuC     ',
    '              kkkkkkkkkkkkkkkkkkkk#   uuC     ',
    '             ######################   CuC     ',
    '                                      CuC     ',
    '                                      CuC     ',
    '                                      Cuu     ',
    '                                      CuC CCCC',
    '                                      CuC C55C',
    '                                      CuC C44C',
    '                                      uuC C33C',
    '                                      CuC C22C',
    '                                      CuC C11C',
    '                                      CuuβuuuC',
    '                                      CCCCCCCC',
  ];
  // the gate between cistern and catacombs sits in the cistern's east wall
  CELLAR[20] = CELLAR[20].slice(0, 34) + 'G' + CELLAR[20].slice(35);

  const cellarLegend = {
    ' ': { solid: true, wall: 'STONE_ROUGH' },
    '#': { solid: true, wall: 'STONE_ROUGH' },
    'B': { solid: true, wall: 'BRICK_OLD' },
    'R': { solid: true, wall: 'WINE_RACK' },
    'M': { solid: true, wall: 'METAL_PANEL' },
    'O': { solid: true, wall: 'BOILER' },
    'P': { solid: true, wall: 'PIPES' },
    'C': { solid: true, wall: 'CRYPT_WALL' },
    '.': { ftex: 'STONE_FLOOR', ctex: 'CEIL_STONE', cl: 1.1, light: 4, music: 'depths', label: 'The Cellar', wall: 'STONE_ROUGH' },
    'L': { base: '.', enter: 'cellarDark' },
    'w': { base: '.', ftex: 'FLAGSTONE', label: 'The Wine Cellar', cl: 1.15 },
    't': { base: '.', ftex: 'WOOD_DARK', ctex: 'CEIL_BEAMS', label: 'The Tool Room', light: 6 },
    'm': { base: '.', ftex: 'GRATE', ctex: 'CEIL_METAL', cl: 1.3, light: 13, label: 'The Boiler Room' },
    'X': { base: 'm', ctex: 'CRUSHER', up: 'CRUSHER', label: null, anim: { type: 'crusher', period: 3.0, phase: 0, min: 0.06, msg: 'The steam hammer crushes you!' } },
    'Y': { base: 'X', anim: { type: 'crusher', period: 3.0, phase: 0.67, min: 0.06, msg: 'The steam hammer crushes you!' } },
    'Z': { base: 'X', anim: { type: 'crusher', period: 3.0, phase: 0.33, min: 0.06, msg: 'The steam hammer crushes you!' } },
    'k': { base: '.', ftex: 'GRATE', ctex: 'CEIL_STONE', cl: 1.6, light: 9, label: 'The Cistern' },
    's': { base: 'k', fl: -0.3, ftex: 'SLUDGE', low: 'BRICK_OLD', hazard: 'acid', light: 10 },
    'u': { base: '.', ftex: 'CRYPT_FLOOR', ctex: 'CEIL_STONE', cl: 1.25, light: 5, music: 'crypt', label: 'The Catacombs', wall: 'CRYPT_WALL' },
    '+': { base: '.', label: null, door: { tex: 'DOOR_WOOD' } },
    'G': { base: 'u', label: null, door: { tex: 'GATE_IRON', h: 1.0, sound: 'gate' } },
    '%': { base: 'w', label: null, door: { secret: true, tex: 'WINE_RACK' } },
    '/': item('crowbar'),
    '-': item('key_red'),
    '*': item('stone_moon', { dx: 0.5, dy: 0.5 }),
    '$': item('coins'),
    ']': item('goblet'),
    '!': item('potion'),
    '&': item('medkit'),
    '=': deco('BARREL', true, 0.28),
    '(': deco('BONES', false),
    ')': deco('SKELETON', false),
    '^': ent({ tpl: 'flame', phase: 0 }),
    'v': ent({ tpl: 'flame', phase: 0.33 }),
    'y': ent({ tpl: 'flame', phase: 0.67 }),
    '~': ent({ tpl: 'wisp', path: [[0, 0], [0, 13]], speed: 1.5 }),
    'o': ent({ tpl: 'wispOrbit', r: 2.4, period: 7 }),
    'α': note('WORKSHOP LOG', 'Crowbar returned to the tool room.\n\nMind the CISTERN: the sludge eats through leather in a minute. The gardener keeps a pair of rubber boots in his shed by the pond - borrow those if you must wade.'),
    'γ': note('A GREASY NOTE', 'Steam hammers fall in turn, one after another, like a slow drum. Count the beats and dash through while they rise.\n\nThe furnace jets fire in rows - wait in the gaps between them.\n\nThe RED KEY to the east wing hangs by the furnace.'),
    'δ': note('A WARNING SIGN', 'CISTERN. The Moon Stone rests upon the island. Nobody wades this muck without proper rubber boots!'),
    'β': note('SCRATCHED ON THE WALL', 'The lever inside the mausoleum opens its gate from within.\n\nThe wisps drift up and down the long passage. Wait in the alcoves and let them pass.'),
  };

  // =====================================================================
  //  UPPER FLOOR (house plan, ringed by portal cells that show the grounds)
  // =====================================================================
  const HOUSE_UPPER = [
    'BBBBBWBWBWBBGGWGGGGGWGGBBBBBWBBWBBBB',
    'Btt#vvvv#..#yyKyyyyyJyy#...........B',
    'B$t%vvvv#..#yyyyyyyyyyy#...........B',
    'B##vvvvv#..+yyyyyyyyyyy+..###+###ffB',
    'Bvvvvvvv+..#yyyyyyyyyyy#..#sssss#eeB',
    'Bvvvvvvv#..#yyyyyyyyyyy#..#sssss#ddB',
    'Bvvvv-vv#..#yyyyyyyyyyy#..#sγsss#ccB',
    'Bvvvvvvv#..######yy#####..#sssss#bbB',
    'B####H###..######ff#kkk#..#sssss#aaB',
    'Brrrrrrr#..#qqqq#ee#kρk+..#sssss###B',
    'Wrrρrrrr+..#qqqq#dd#kkk#..#########B',
    'Brrrrrrr#..+qqqq#cc#####UU#########B',
    'Brrrrrrr#..#qμqq#bb#####zzδzzzzzzzzE',
    'B########..#qqqq#aa#####zZXZXZXZXZzE',
    'Buuuuuuu#..#############zXZXZXZXZXzE',
    'Buuuuuuu#..#kkkk########zZXZXZXZXZzE',
    'Wuuuuuuu#..+kρkk########zXZXZXZXZXzW',
    'Buuηuuuu#..#kkkk########zZXZXZXZXZzE',
    'Buuuuuuu+..#############zXZXZXZXZXzE',
    'Buuλuuβu#..#############zZXZXZXZXZzW',
    'Buuuuuuu#..Y12345#######zXZXZXZXZppE',
    'Bu]uuuuu#..Y12345#######zZXZXZXZX*pE',
    'Buuuuuuu#..#############zzzzzzzzzppE',
    'BBBWBBWBBBBBBBBBBBBBBBBBEEEWEEEWEEEE',
  ];
  const upperLegend = {
    '~': PORTAL_GROUND,
    'B': { solid: true, wall: 'BRICK_RED', wallIn: 'WALLPAPER_RED' },
    'G': { solid: true, wall: 'BRICK_RED', wallIn: 'PAINTING_RED' },
    'E': { solid: true, wall: 'BRICK_RED', wallIn: 'LAB_PANEL' },
    'W': WINDOW,
    '#': { solid: true, wall: 'WALLPAPER_RED' },
    'H': { solid: true, wall: 'FIREPLACE' },
    '.': { ftex: 'CARPET_BLUE', ctex: 'CEIL_PLASTER', cl: 1.3, light: 14, music: 'upstairs', label: 'The Upper Hall', wall: 'WALLPAPER_RED' },
    'y': { base: '.', ftex: 'PARQUET', cl: 1.6, light: 16, label: 'The Portrait Gallery' },
    'v': { base: '.', ftex: 'CARPET_RED', label: 'The Master Bedroom', light: 13 },
    't': { base: 'v', label: 'A Secret Closet', light: 10 },
    'r': { base: '.', fl: -0.12, ftex: 'WATER', ctex: 'CEIL_PLASTER', cl: 1.3, low: 'TILE_PLAIN', wall: 'TILE_WHITE', label: 'The Flooded Bathroom', light: 12 },
    'u': { base: '.', ftex: 'WOOD_FLOOR', label: 'The Nursery', light: 11 },
    'q': { base: '.', ftex: 'CARPET_GREEN', label: 'The Guest Room', light: 12 },
    'k': { base: '.', ftex: 'WOOD_DARK', label: 'A Closet', light: 9 },
    's': { base: '.', ftex: 'WOOD_DARK', ctex: 'CEIL_BEAMS', cl: 1.4, label: "The Professor's Study", light: 14 },
    'z': { base: '.', ftex: 'ELECTRIC_OFF', ctex: 'CEIL_METAL', cl: 1.5, label: 'The Laboratory', light: 15, wall: 'LAB_PANEL' },
    'Z': { base: 'z', anim: { type: 'cycle', period: 3.0, duty: 0.3, phase: 0, hazard: 'shock', texOn: 'ELECTRIC', texOff: 'ELECTRIC_OFF' } },
    'X': { base: 'z', anim: { type: 'cycle', period: 3.0, duty: 0.3, phase: 0.5, hazard: 'shock', texOn: 'ELECTRIC', texOff: 'ELECTRIC_OFF' } },
    'p': { base: 'z', fl: 0.15, ftex: 'METAL_PANEL', low: 'HAZARD' },
    '+': { base: '.', label: null, door: { tex: 'DOOR_WOOD' } },
    'U': { base: 'z', label: null, door: { key: 'key_blue', tex: 'DOOR_BLUE' } },
    'Y': { base: '.', label: null, door: { key: 'key_yellow', tex: 'DOOR_YELLOW', msg: 'The attic door is locked. It has a yellow lock plate.' } },
    '%': { base: 't', label: null, door: { secret: true, tex: 'PAINTING_RED', h: 1.3 } },
    'K': ent({ tpl: 'knight', path: [[0, 0], [0, 5]], phase: 0 }),
    'J': ent({ tpl: 'knight', path: [[0, 0], [0, 5]], phase: 0.5 }),
    '-': item('key_yellow'),
    '*': item('stone_star'),
    '$': item('coins'),
    ']': item('goblet'),
    'ρ': item('potion'),
    'μ': item('medkit'),
    'η': deco('ROCKING_HORSE', true, 0.35),
    'λ': deco('DANCER', true, 0.25),
    'γ': note("THE PROFESSOR'S DESK", 'Notes, much underlined:\n\nThe attic door takes the YELLOW key - I keep it in the bedroom.\n\nThe pendulums in the attic gallery guard my spare fuse. The roof shutter will not open without power.\n\nThe dome awaits its three stones.'),
    'β': note("NANNY'S DIARY", 'The Professor\'s laboratory floor sings with lightning. It pulses like a heartbeat - the squares take turns, like a chessboard, and between beats there is a moment when all is quiet.\n\nMove in the quiet. Never linger.'),
    'δ': note('LABORATORY NOTICE', 'DANGER: floor coils energise in alternating squares. Wait for the pause, then step.'),
  };

  // =====================================================================
  //  ATTIC + ROOF
  // =====================================================================
  const ATTIC = [
    'AAAAAAAAAAAAAAAAAAA' + 'ppppppppppppppppp',
    'A..X....X....X....A' + 'oooooooooooooooop',
    'A./X.XX.X.XX.X.XX.A' + 'ooooooooooooCooop',
    'A.XX..X.X.X...X...S' + 'ooooooooooooCooop',
    'A....XX.X.X.XXX.X.A' + 'oooooooooooooooop',
    'A.XX....X...X.....F' + 'oooooooooooooooop',
    'A.X..XX.XXX.X.XXX.A' + 'oooooooooooooooop',
    'A.X.X...X...X...X.A' + 'oooooooooooooooop',
    'A.X.....X.X...Xα..A' + 'ooooooOOOOOOOOOop',
    'AAAA.AAAAAAAAAAAA.A' + 'ooooooOnnnnnnnOop',
    'AyyyyyyPyyQyyRyyyyA' + 'ooooooOn?nnnnnOop',
    'AAAAAAAAAAAAAAAAA.A' + 'ooooooOnnDDDnnOop',
    'AXXXXXXXXXXXXXXXX.A' + 'ooooooOnnD&DnnOop',
    'AX..T...T...T...X.A' + 'ooooooOnnDDDnnOop',
    'AXV...V...V...V.X.A' + 'ooooooOnnnnnnnOop',
    'AX$...T...T...T...A' + 'ooooooOnnnnnβnOop',
    'AXV...V...V...V.X.A' + 'ooooooOOOO+OOOOop',
    'AX..T...T...T..ρX.A' + 'oooooooooooooooop',
    'AXXXXXXXXXXXXXXXX.A' + 'oooooooooooooooop',
    'AXXXXXXXXXXAAAAAA.A' + 'oooCCooooooooooop',
    'AXXXXXXXXXXAabcde.A' + 'oooCCooooooooooop',
    'AXXXXXXXXXXAabcde.A' + 'oooooooooooooooop',
    'AXXXXXXXXXXAAAAAAAA' + 'oooooooooooooooop',
    'AAAAAAAAAAAAAAAAAAA' + 'ppppppppppppppppp',
  ];
  const atticLegend = {
    '~': PORTAL_GROUND,
    'A': { solid: true, wall: 'BRICK_RED', wallIn: 'ATTIC_BOARDS' },
    'X': { solid: true, wall: 'CRATE_WALL' },
    '.': { ftex: 'WOOD_DARK', ctex: 'CEIL_ATTIC', cl: 1.0, light: 5, music: 'attic', label: 'The Attic', wall: 'ATTIC_BOARDS' },
    'y': { base: '.', cl: 1.9, ftex: 'WOOD_FLOOR', ctex: 'CEIL_BEAMS', light: 9, label: 'The Pendulum Gallery' },
    'S': { base: '.', label: null, tag: 'shutter', door: { remote: true, tex: 'SHUTTER', h: 1.0, lintel: 'BRICK_RED', lintelIn: 'ATTIC_BOARDS', sound: 'shutter', speed: 0.6, msg: 'A steel shutter, electrically operated. It will not budge - the power seems to be out.' } },
    'F': { solid: true, wall: 'BRICK_RED', wallIn: 'FUSEBOX_EMPTY', use: 'fusebox', tag: 'fusebox' },
    'o': { ftex: 'FLAGSTONE', sky: true, fog: true, cl: 1.4, light: 23, music: 'roof', label: 'The Roof', wall: 'BRICK_RED', low: 'STONE_BLOCKS' },
    'p': { base: 'o', fl: 0.12, low: 'STONE_BLOCKS', ftex: 'STONE_FLOOR', block: true },
    'C': { solid: true, wall: 'BRICK_OLD' },
    'O': { solid: true, wall: 'STONE_BLOCKS', wallIn: 'BRASS_RIBS' },
    'n': { ftex: 'MARBLE_FLOOR', ctex: 'DOME', cl: 2.2, light: 18, music: 'roof', label: 'The Observatory', tag: 'dome', wall: 'BRASS_RIBS', indoor: true },
    'D': { base: 'n', fl: 0.25, low: 'STEP_STONE', ftex: 'CHECKER' },
    '+': { base: 'n', label: null, tag: null, door: { tex: 'DOOR_WOOD', lintel: 'STONE_BLOCKS', lintelIn: 'BRASS_RIBS' } },
    '/': item('fuse'),
    '$': item('crown'),
    'ρ': item('potion'),
    '?': deco('TELESCOPE', true, 0.4),
    'P': ent({ tpl: 'pendulum', phase: 0 }),
    'Q': ent({ tpl: 'pendulum', phase: 0.33 }),
    'R': ent({ tpl: 'pendulum', phase: 0.66 }),
    'T': ent({ tpl: 'spikes', phase: 0 }),
    'V': ent({ tpl: 'spikes', phase: 0.5 }),
    '&': ent({ type: 'usable', sprite: 'ORRERY_0', sprites: ['ORRERY_0', 'ORRERY_1', 'ORRERY_2', 'ORRERY_3', 'ORRERY_SPIN'], script: 'orrery', radius: 0.55, solid: true }),
    'α': note('A NOTE PINNED TO A BEAM', 'The fuse box by the roof shutter has been empty since the storm.\n\nA spare fuse is kept in the far corner of the attic - beyond the pendulum gallery. Mind the blades: they swing to the wall and back, and they never miss a beat.'),
    'β': note('A BRASS PLAQUE', 'THE GREAT ORRERY OF HOLLOWMERE\n\nSet the Sun, the Moon and the Star in their sockets, and the heavens shall open.'),
  };

  // =====================================================================
  //  Music (tracker patterns; see engine/audio.js for the format)
  // =====================================================================
  const music = {
    dusk: {
      bpm: 68, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.09, detune: 7, env: { a: 0.4, d: 0.5, s: 0.7, r: 1.2 }, pattern: 'A3 - - - - - - - F3 - - - - - - - C4 - - - - - - - G3 - - - - - - - A3 - - - - - - - F3 - - - - - - - D4 - - - - - - - E4 - - - - - - -' },
        { wave: 'sine', vol: 0.16, env: { a: 0.05, d: 0.6, s: 0.5, r: 0.6 }, pattern: 'A2 - - - E3 - - - F2 - - - C3 - - - C3 - - - G2 - - - G2 - - - D3 - - - A2 - - - E3 - - - F2 - - - C3 - - - D3 - - - A2 - - - E2 - - - B2 - - -' },
        { wave: 'square', vol: 0.035, cutoff: 1600, vibrato: 3, env: { a: 0.02, d: 0.3, s: 0.5, r: 0.4 }, pattern: 'E5 - - - D5 - C5 - A4 - - - - - . . C5 - D5 - E5 - - - G5 - F5 - E5 - - - D5 - - - C5 - D5 - E5 - - - - - . . A4 - C5 - B4 - A4 - G#4 - - - - - . .' },
      ],
    },
    manor: {
      bpm: 100, steps: 2, tracks: [
        { wave: 'square', vol: 0.045, cutoff: 2200, env: { a: 0.005, d: 0.18, s: 0.08, r: 0.15 }, pattern: 'D4 F4 A4 F4 A4 F4 C4 E4 A4 E4 A4 E4 Bb3 D4 F4 D4 F4 D4 A3 C#4 E4 C#4 E4 C#4' },
        { wave: 'triangle', vol: 0.16, env: { a: 0.01, d: 0.4, s: 0.4, r: 0.3 }, pattern: 'D2 - - - - - C2 - - - - - Bb1 - - - - - A1 - - - - -' },
        { wave: 'sine', vol: 0.09, vibrato: 4, env: { a: 0.05, d: 0.3, s: 0.6, r: 0.5 }, pattern: 'A4 - - - - - G4 - - - F4 - E4 - - - D4 - C#4 - - - - - D4 - - - F4 - E4 - - - C4 - D4 - - - Bb3 - A3 - - - - - . . . . . .' },
      ],
    },
    depths: {
      bpm: 56, steps: 2, tracks: [
        { wave: 'sawtooth', vol: 0.05, cutoff: 380, detune: 9, env: { a: 1.0, d: 1, s: 0.8, r: 2 }, pattern: 'D2 - - - - - - - - - - - - - - - Eb2 - - - - - - - - - - - - - - -' },
        { wave: 'sine', vol: 0.07, env: { a: 0.005, d: 1.4, s: 0.0, r: 1.2 }, pattern: 'D5 . . . . . . . A4 . . . . . . . Eb5 . . . . . . . . . . . Bb4 . . . D5 . . . . . F5 . . . . . . . . . . . . . . . A4 . . Eb5 . . . . .' },
        { wave: 'noise', vol: 0.03, cutoff: 3000, decay: 0.06, pattern: 'x . . . . . . . . . . . . . . . . . . . . x . . . . . . . . . . . . . x . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
      ],
    },
    crypt: {
      bpm: 50, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.08, detune: 12, vibrato: 2, env: { a: 1.2, d: 1, s: 0.8, r: 2.2 }, pattern: 'E3 - - - - - - - G3 - - - - - - - F#3 - - - - - - - D#3 - - - - - - -' },
        { wave: 'sine', vol: 0.05, env: { a: 0.6, d: 1, s: 0.7, r: 1.5 }, pattern: 'B3 - - - - - - - B3 - - - - - - - C4 - - - - - - - B3 - - - - - - -' },
        { wave: 'sine', vol: 0.12, env: { a: 0.02, d: 0.8, s: 0.3, r: 0.8 }, pattern: 'E2 - - - . . . . . . . . . . . . E2 - - - . . . . D#2 - - - . . . .' },
      ],
    },
    upstairs: {
      bpm: 84, steps: 4, tracks: [
        { wave: 'triangle', vol: 0.07, env: { a: 0.002, d: 0.35, s: 0.0, r: 0.3 }, pattern: 'E5 . G5 . B5 . G5 . E5 . B4 . D5 . F#5 . A5 . F#5 . D5 . A4 . C5 . E5 . G5 . E5 . C5 . G4 . B4 . D#5 . F#5 . B5 . A5 . F#5 . D#5 .' },
        { wave: 'sine', vol: 0.12, env: { a: 0.02, d: 0.6, s: 0.4, r: 0.6 }, pattern: 'E3 - - - - - - - - - - - - - - - D3 - - - - - - - - - - - - - - - C3 - - - - - - - - - - - - - - - B2 - - - - - - - - - - - - - - -' },
      ],
    },
    attic: {
      bpm: 60, steps: 4, tracks: [
        { wave: 'noise', vol: 0.05, cutoff: 6000, decay: 0.03, pattern: 'x . . . x . . . x . . . x . . .' },
        { wave: 'noise', vol: 0.04, cutoff: 900, filter: 'bandpass', decay: 0.05, pattern: '. . x . . . . . . . x . . . . .' },
        { wave: 'square', vol: 0.03, cutoff: 900, env: { a: 0.01, d: 0.5, s: 0.2, r: 0.5 }, pattern: 'A2 . . . . . . . . . . . . . . . Bb2 . . . . . . . . . . . . . . . A2 . . . . . . . . . . . . . . . G#2 . . . . . . . . . . . . . . .' },
        { wave: 'sine', vol: 0.05, env: { a: 0.3, d: 1, s: 0.3, r: 1 }, pattern: 'E5 - - - - - - - . . . . . . . . . . . . . . . . Eb5 - - - - - - - . . . . . . . . . . . . . . . . . . . . . . . .' },
      ],
    },
    roof: {
      bpm: 64, steps: 4, tracks: [
        { wave: 'triangle', vol: 0.06, env: { a: 0.01, d: 0.6, s: 0.2, r: 0.8 }, pattern: 'A3 C4 E4 A4 E4 C4 A3 C4 F3 A3 C4 F4 C4 A3 F3 A3 C3 E3 G3 C4 G3 E3 C3 E3 G3 B3 D4 G4 D4 B3 G3 B3' },
        { wave: 'sine', vol: 0.08, vibrato: 3, env: { a: 0.3, d: 0.6, s: 0.7, r: 1 }, pattern: 'E5 - - - - - - - F5 - - - - - E5 - G5 - - - - - - - D5 - - - - - - -' },
        { wave: 'sine', vol: 0.13, env: { a: 0.05, d: 1, s: 0.5, r: 1 }, pattern: 'A2 - - - - - - - F2 - - - - - - - C2 - - - - - - - G2 - - - - - - -' },
      ],
    },
    finale: {
      bpm: 76, steps: 2, tracks: [
        { wave: 'triangle', vol: 0.09, detune: 6, env: { a: 0.2, d: 0.5, s: 0.7, r: 1 }, pattern: 'C4 - - - - - - - A3 - - - - - - - F3 - - - - - - - G3 - - - - - - -' },
        { wave: 'square', vol: 0.04, cutoff: 2000, env: { a: 0.01, d: 0.3, s: 0.5, r: 0.5 }, pattern: 'E5 - G5 - C6 - - - B5 - A5 - G5 - - - A5 - F5 - C5 - - - D5 - E5 - D5 - - -' },
        { wave: 'sine', vol: 0.15, env: { a: 0.02, d: 0.5, s: 0.5, r: 0.5 }, pattern: 'C2 - - - G2 - - - A1 - - - E2 - - - F1 - - - C2 - - - G1 - - - D2 - - -' },
      ],
    },
  };

  // =====================================================================
  //  The campaign definition
  // =====================================================================
  R.registerCampaign({
    id: 'hollowmere',
    title: 'Hollowmere',
    subtitle: 'The Orrery of Professor Crane',
    credit: 'A RetroEngine adventure',
    world: { width: 64, height: 56 },
    sky: 'SKY_DUSK',
    palette: { fogColor: '#2c3048' },
    render: { falloff: 1.15 },
    config: { baseLight: { radius: 2.2, bonus: 5 } },
    hudTexture: 'STONE_DARK',
    titleMusic: 'dusk', introMusic: 'dusk', endingMusic: 'finale', defaultMusic: 'manor',
    attract: { x: 31.5, y: 47.5, ang: -Math.PI / 2, sweep: 0.8 },
    startMessage: 'Use the ARROW KEYS to move, SPACE to use or read. Press ESC for the menu.',
    intro: {
      title: 'Hollowmere',
      text: 'Autumn, 1994.\n\nA letter from a solicitor informs you that your great-uncle, the reclusive astronomer Professor Aldous Crane, has died and left you his estate: Hollowmere.\n\nThere is one condition. The Professor\'s life work - the Great Orrery in the rooftop observatory - must be set turning once more.\n\nNobody from the village will come near the place. You arrive alone at dusk. As you step through, the iron gate clangs shut behind you...',
    },
    items: {
      key_brass: { name: 'Brass Key', kind: 'key', sprite: 'KEY_BRASS', color: '#e0b050', desc: 'Opens the front door of the manor.', msg: 'You found the BRASS KEY! It must open the front door.' },
      key_red: { name: 'Red Key', kind: 'key', sprite: 'KEY_RED', color: '#e03a2a', desc: 'Opens the red door to the east wing.', msg: 'You picked up the RED KEY.' },
      key_blue: { name: 'Blue Key', kind: 'key', sprite: 'KEY_BLUE', color: '#4a7aff', desc: 'Opens the blue laboratory door upstairs.', msg: 'You picked up the BLUE KEY.' },
      key_yellow: { name: 'Yellow Key', kind: 'key', sprite: 'KEY_YELLOW', color: '#f0d020', desc: 'Opens the attic door and the greenhouse.', msg: 'You picked up the YELLOW KEY.' },
      lantern: { name: 'Oil Lantern', kind: 'tool', sprite: 'LANTERN', light: { radius: 6.5, bonus: 21, flicker: true }, held: 'HELD_LANTERN', desc: 'Lights up dark places.', msg: 'You found an OIL LANTERN! Now you can see in the dark.' },
      crowbar: { name: 'Crowbar', kind: 'tool', sprite: 'CROWBAR', desc: 'Good for prying boards loose.', msg: 'You found a CROWBAR!' },
      boots: { name: 'Rubber Boots', kind: 'tool', sprite: 'BOOTS', desc: 'Protect your feet from caustic sludge.', msg: 'You found the gardener\'s RUBBER BOOTS!' },
      fuse: { name: 'Fuse', kind: 'tool', sprite: 'FUSE', desc: 'A heavy ceramic fuse. Something needs power.', msg: 'You found a spare FUSE!' },
      stone_sun: { name: 'Sun Stone', kind: 'relic', sprite: 'GEM_SUN', color: '#f0a020', desc: 'Warm as a summer noon. One of three.', msg: 'You found the SUN STONE!' },
      stone_moon: { name: 'Moon Stone', kind: 'relic', sprite: 'GEM_MOON', color: '#8ab0e0', desc: 'Cool and pale, like moonlight. One of three.', msg: 'You found the MOON STONE!' },
      stone_star: { name: 'Star Stone', kind: 'relic', sprite: 'GEM_STAR', color: '#e02040', desc: 'Glitters like a distant star. One of three.', msg: 'You found the STAR STONE!' },
      potion: { name: 'Tonic', kind: 'health', heal: 25, sprite: 'POTION' },
      medkit: { name: 'First-Aid Tin', kind: 'health', heal: 60, sprite: 'MEDKIT' },
      coins: { name: 'Gold Sovereigns', kind: 'treasure', score: 100, sprite: 'COINS' },
      goblet: { name: 'Silver Goblet', kind: 'treasure', score: 250, sprite: 'GOBLET' },
      crown: { name: 'Jewelled Crown', kind: 'treasure', score: 500, sprite: 'CROWN' },
    },
    hud: {
      keys: ['key_brass', 'key_red', 'key_blue', 'key_yellow'],
      tools: ['crowbar', 'boots', 'fuse'],
      relics: ['stone_sun', 'stone_moon', 'stone_star'],
      relicLabel: 'STONES',
    },
    hazards: {
      acid: { damage: 12, interval: 0.5, immune: 'boots', immuneMsg: 'Your rubber boots keep the sludge off your feet.', msg: 'The sludge burns!' },
    },
    entityTemplates: {
      flame: { type: 'trap', spriteOn: 'FLAME', spriteOff: 'VENT', period: 2.7, duty: 0.45, damage: 25, radius: 0.45, sound: 'whoosh', brightOn: true, msg: 'Scorched!' },
      spikes: { type: 'trap', spriteOn: 'SPIKES_UP', spriteOff: 'SPIKES_DOWN', period: 2.2, duty: 0.45, damage: 20, radius: 0.42, sound: 'clank', msg: 'Spikes!' },
      spores: { type: 'trap', spriteOn: 'SPORE_CLOUD', spriteOff: 'SPORE_POD', period: 3.2, duty: 0.4, damage: 15, radius: 0.6, sound: 'whoosh', msg: 'Choking spores!' },
      thorns: { type: 'trap', spriteOn: 'THORNS', spriteOff: 'THORNS', period: 1, duty: 2, damage: 10, radius: 0.42, msg: 'Thorns!' },
      knight: { type: 'patrol', sprite: 'KNIGHT', speed: 1.1, damage: 25, radius: 0.36, sound: 'clank', soundEvery: 0.9, msg: 'The suit of armour strikes you!' },
      wisp: { type: 'patrol', sprite: 'WISP', speed: 1.5, damage: 20, radius: 0.36, z: 0.2, sound: 'hum', soundEvery: 2, msg: 'The wisp chills you to the bone!' },
      wispOrbit: { type: 'orbit', sprite: 'WISP', damage: 20, radius: 0.36, z: 0.2, msg: 'The wisp chills you to the bone!' },
      dancer: { type: 'orbit', sprite: 'DANCER', damage: 15, radius: 0.36, msg: 'A clockwork dancer spins into you!' },
      pendulum: { type: 'pendulum', sprite: 'PENDULUM', axis: 'y', amp: 1.0, period: 2.6, damage: 30, radius: 0.3, msg: 'The blade slices you!' },
    },
    floors: [
      {
        id: 'cellar', name: 'The Cellar', origin: [14, 3], storey: 1.4, stairHead: 1.3, map: CELLAR, legend: cellarLegend, music: 'depths',
        stairUp: { ftex: 'STONE_FLOOR', low: 'STEP_STONE', ctex: 'CEIL_STONE', wall: 'STONE_ROUGH', light: 6, music: 'depths' },
      },
      {
        id: 'ground', name: 'Hollowmere Manor', origin: [0, 0], storey: 1.6, stairHead: 1.5, map: buildGrounds(), legend: groundLegend, music: 'manor',
        stairDown: { ftex: 'STONE_FLOOR', low: 'STEP_STONE', ctex: 'CEIL_STONE', wall: 'STONE_ROUGH', light: 8, music: 'depths' },
        stairUp: { ftex: 'CARPET_RED', low: 'STEP_CARPET', ctex: 'CEIL_PLASTER', wall: 'WALLPAPER_GREEN', light: 16, music: 'manor' },
      },
      {
        id: 'upper', name: 'The Upper Floor', origin: [13, 2], storey: 1.3, stairHead: 1.2, map: U.ringRows(HOUSE_UPPER, '~'), legend: upperLegend, music: 'upstairs',
        stairDown: { ftex: 'CARPET_RED', low: 'STEP_CARPET', ctex: 'CEIL_PLASTER', wall: 'WALLPAPER_GREEN', light: 15, music: 'upstairs' },
        stairUp: { ftex: 'WOOD_DARK', low: 'STEP_WOOD', ctex: 'CEIL_ATTIC', wall: 'ATTIC_BOARDS', light: 9, music: 'attic' },
      },
      {
        id: 'attic', name: 'The Attic & Roof', origin: [13, 2], map: U.ringRows(ATTIC, '~'), legend: atticLegend, music: 'attic',
        stairDown: { ftex: 'WOOD_DARK', low: 'STEP_WOOD', ctex: 'CEIL_ATTIC', wall: 'ATTIC_BOARDS', light: 7, music: 'attic' },
      },
    ],
    // Solver hints for tools/verify.js: remote doors and what opens them.
    verify: {
      remote: { mausgate: { script: 'mausLever', items: [] }, shutter: { script: 'fusebox', items: ['fuse'] } },
      goal: { script: 'orrery', items: ['stone_sun', 'stone_moon', 'stone_star'] },
    },
    scripts: {
      kitchenHint(g) {
        if (!g.flag('kitchenSeen')) { g.flag('kitchenSeen', true); g.msg('Stone steps lead down into darkness from the corner of the kitchen.', 5); }
      },
      cellarDark(g) {
        if (!g.has('lantern') && !g.flag('darkWarned')) { g.flag('darkWarned', true); g.msg("It's pitch black down here. You'd better find a light first.", 5); }
      },
      mausLever(g) {
        if (g.flag('mausOpen')) { g.msg('The lever is already down.'); return; }
        g.flag('mausOpen', true);
        g.setTex('mauslever', 'wallIn', 'SWITCH_ON');
        g.sound('switch');
        g.openDoor('mausgate');
        g.msg('You pull the lever. The iron gate grinds open.');
      },
      fusebox(g) {
        if (g.flag('power')) { g.msg('The fuse box hums quietly.'); return; }
        if (!g.has('fuse')) { g.msg('A fuse box - and the fuse is missing. No wonder the shutter has no power.'); g.sound('noway'); return; }
        g.take('fuse');
        g.flag('power', true);
        g.setTex('fusebox', 'wallIn', 'FUSEBOX_FULL');
        g.sound('switch');
        g.msg('You slot in the fuse. With a clatter, the shutter begins to roll up!', 5);
        g.openDoor('shutter');
      },
      orrery(g, ctx) {
        const e = ctx.entity, stones = ['stone_sun', 'stone_moon', 'stone_star'];
        if (g.flag('finale')) { g.msg('The Orrery turns, and the stars turn with it.'); return; }
        let placed = 0;
        for (const s of stones) if (g.has(s)) { g.take(s); g.flag('placed_' + s, true); placed++; }
        const total = stones.filter(s => g.flag('placed_' + s)).length;
        e.state = total;
        if (placed) { g.sound('place'); g.flash([180, 200, 255], 0.45); }
        if (total >= 3) {
          g.flag('finale', true);
          e.state = 4;
          g.sound('rumble'); g.shake(2.5);
          g.msg('The Great Orrery shudders... and begins to turn!', 5);
          g.after(2.0, gg => { gg.setCells('dome', { sky: true, fog: true }); gg.sound('gate'); gg.msg('With a groan of iron, the dome folds open to the stars.', 5); });
          g.after(7.0, gg => gg.win({
            title: 'The Heavens Open',
            text: 'The three stones blaze as the Great Orrery turns, and with a groan of old iron the dome folds open to the night.\n\nAbove Hollowmere the stars wheel exactly as the Professor\'s brass planets do. Below, the old house sighs and settles, its long vigil over.\n\nHollowmere is yours.',
          }));
        } else if (placed) g.msg(`The stone clicks into its socket. ${3 - total} socket${3 - total === 1 ? '' : 's'} still empty.`, 4);
        else g.msg(total ? `${3 - total} empty socket${3 - total === 1 ? '' : 's'} wait for their stones.` : 'The Great Orrery. Three empty sockets wait for the Sun, the Moon and the Star.', 4);
      },
    },
    music,
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
