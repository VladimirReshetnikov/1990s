/*
 * Stock sprite library: items, decorations, hazards and held items.
 * World size of a sprite = (pixels / 64) * scale map units.
 * `hang: true` sprites hang from the ceiling instead of standing on the floor.
 */
(function (R) {
  'use strict';
  const U = R.util, C = R.hex, S = R.defSprite, A = R.defAsciiSprite;
  const sh = (c, f) => { c = C(c); return [c[0] * f, c[1] * f, c[2] * f]; };

  // ------------------------------------------------------------ items
  const KEY = [
    '..DDDD..........',
    '.DLLMMD.........',
    'DLD..DMDDDDDDDDD',
    'DMD..DMLLLLLLLLD',
    'DMD..DMMMMMMMMMD',
    'DMMDDMMDDDMDDMD.',
    '.DMMMMD...DMD.D.',
    '..DDDD.....D....',
  ];
  const keyColors = { BRASS: ['#c8a040', '#f0d890'], RED: ['#c02020', '#ff8070'], BLUE: ['#2848d0', '#90b0ff'], YELLOW: ['#e0c010', '#fff8a0'], GREEN: ['#20a040', '#a0ffb0'], SILVER: ['#9098a8', '#f0f4ff'] };
  for (const [n, [m, l]] of Object.entries(keyColors)) A('KEY_' + n, KEY, { D: sh(m, 0.35), M: m, L: l }, { scale: 1.6 });

  A('LANTERN', [
    '....DDDD....',
    '...D....D...',
    '....DDDD....',
    '..DDDDDDDD..',
    '..DMYYYYMD..',
    '..DYWWWWYD..',
    '..DYWFFWYD..',
    '..DYWFFWYD..',
    '..DYWWWWYD..',
    '..DMYYYYMD..',
    '..DDDDDDDD..',
    '...DMMMMD...',
  ], { D: '#2a2218', M: '#b08a30', Y: '#e0a030', W: '#fff0a0', F: '#ffffff' }, { scale: 1.8, emissive: true });

  A('CROWBAR', [
    '............DD..',
    '...........DRRD.',
    '............DRD.',
    '...........DRD..',
    '..........DRD...',
    '.........DRD....',
    '........DRD.....',
    '.......DRD......',
    '......DRD.......',
    '.....DRD........',
    '....DRD.........',
    '...DRD..........',
    '..DRD...........',
    '.DRRD...........',
    'DRDD............',
    '.D..............',
  ], { D: '#1a1010', R: '#c02a20' }, { scale: 1.8 });

  S('BOOTS', {
    w: 18, h: 14, scale: 1.6,
    gen(p) {
      const boot = R.Pix.fromAscii([
        '.DDDDD..', '.DYYYD..', '.DGGGD..', '.DGLGD..', '.DGLGD..', '.DGGGD..', '.DGGGD..',
        '.DGGGD..', '.DGGGGD.', 'DGGGGGGD', 'DGGGGGGD', 'DBBBBBBD', '.DDDDDD.',
      ], { D: '#0a140a', Y: '#e0c020', G: '#2e7a2a', L: '#6ab05a', B: '#1a1a1a' });
      p.blit(boot, 9, 1); p.blit(boot, 2, 0);
    },
  });
  A('FUSE', [
    '..DDDDDD..', '.DMMMMMMD.', '.DMLLLLMD.', '..DDDDDD..', '..DWWWWD..', '..DWLWWD..', '..DWLWWD..',
    '..DWLWWD..', '..DWLWWD..', '..DWWWWD..', '..DDDDDD..', '.DMMMMMMD.', '.DMLLLLMD.', '..DDDDDD..',
  ], { D: '#201810', M: '#b86a2a', L: '#f0b070', W: '#d8d4c8' }, { scale: 1.6 });

  const GEM = [
    '....DDDDDD....',
    '...DLLMMMMD...',
    '..DLLLMMMMMD..',
    '.DLLLMMMMMMMD.',
    'DDDDDDDDDDDDDD',
    '.DMMMMMMMMMSD.',
    '..DMMMMMMMSD..',
    '...DMMMMMSD...',
    '....DMMMSD....',
    '.....DMSD.....',
    '......DD......',
  ];
  const gemColors = { SUN: ['#f0a020', '#fff0a0', '#a05010'], MOON: ['#8ab0e0', '#f0f8ff', '#4a6aa0'], STAR: ['#e02040', '#ffa0b0', '#801020'], EMERALD: ['#20c060', '#b0ffd0', '#106030'] };
  for (const [n, [m, l, s]] of Object.entries(gemColors)) {
    const sparkle = GEM.map((row, y) => (y === 1 ? row.slice(0, 4) + 'W' + row.slice(5) : row));
    A('GEM_' + n, [GEM, GEM, sparkle, GEM], { D: sh(m, 0.3), M: m, L: l, S: s, W: '#ffffff' }, { scale: 1.8, emissive: true, fps: 4 });
  }
  A('POTION', [
    '...DDD....', '...DCD....', '...DCD....', '..DDDDD...', '.DRRRRRD..', 'DRRLRRRRD.', 'DRLRRRRRD.',
    'DRRRRRRRD.', 'DRRRRRRRD.', '.DRRRRRD..', '..DDDDD...',
  ], { D: '#200808', C: '#c8a070', R: '#d02030', L: '#ff9090' }, { scale: 1.6 });
  A('MEDKIT', [
    '.....DDDD.......', '....D....D......', 'DDDDDDDDDDDDDDDD', 'DWWWWWWRRWWWWWWD', 'DWWWWWWRRWWWWWWD',
    'DWWWWRRRRRRWWWWD', 'DWWWWRRRRRRWWWWD', 'DWWWWWWRRWWWWWWD', 'DWWWWWWRRWWWWWWD', 'DGGGGGGGGGGGGGGD', 'DDDDDDDDDDDDDDDD',
  ], { D: '#202020', W: '#e0e0d8', R: '#c01818', G: '#8a8a84' }, { scale: 1.6 });
  A('COINS', [
    '......DDDD......', '....DDYYYYDD....', '...DYYLYYYYYD...', '..DYYYYYDDYYYD..', '.DDYLYYDYYDYYYD.',
    'DYYYYYDYLYYDYYYD', 'DYLYYYDYYYYDDDDD', '.DDDDDDDDDDDD...',
  ], { D: '#5a4008', Y: '#e0b020', L: '#fff0a0' }, { scale: 1.6 });
  A('GOBLET', [
    'DDDDDDDDDD', 'DYLYYYYYYD', 'DYLYYRYYYD', '.DYLYYYYD.', '..DYYYYD..', '...DYYD...', '....DD....',
    '....DY....', '....DY....', '...DYYD...', '..DYYYYD..', '.DDDDDDDD.',
  ], { D: '#5a4008', Y: '#e0b020', L: '#fff0a0', R: '#e02040' }, { scale: 1.6 });
  A('CROWN', [
    'D...D...D...D', 'DD.DYD.DYD.DD', 'DYDYYYDYYYDYD', 'DYYYRYYYBYYYD', 'DYLYYYYYYYYYD', 'DDDDDDDDDDDDD',
  ], { D: '#5a4008', Y: '#e0b020', L: '#fff0a0', R: '#e02040', B: '#2060e0' }, { scale: 1.8 });
  A('NOTE', [
    'DDDDDDDDDD.', 'DWWWWWWWWD.', 'DWLLLLLWWD.', 'DWWWWWWWWD.', 'DWLLLLLLWD.', 'DWLLLLWWWD.',
    'DWWWWWWWWD.', 'DWLLLLLLWD.', 'DWLLLWWWWD.', 'DWWWWWWWWDD', 'DDDDDDDDDD.',
  ], { D: '#5a4a30', W: '#e8dcb8', L: '#6a5a40' }, { scale: 1.5 });
  A('BOOK', [
    '..DDDDDDDDDD', '.DRRRRRRRRRD', 'DRRYRRRRRRD.', 'DRRRRRRRRRD.', 'DWWWWWWWWWD.', 'DDDDDDDDDD..',
  ], { D: '#200808', R: '#7a1c1c', Y: '#e0c040', W: '#e8dcb8' }, { scale: 1.6 });

  // ------------------------------------------------------------ decor
  S('TREE', {
    w: 64, h: 96, scale: 1.8,
    gen(p, c) {
      const r = c.rng;
      p.poly([[27, 96], [29, 50], [35, 50], [38, 96]], '#3a2616');
      p.poly([[22, 96], [28, 86], [27, 96]], '#2e1e10'); p.poly([[42, 96], [36, 86], [38, 96]], '#2e1e10');
      for (let y = 50; y < 96; y += 3) p.px(30 + r() * 5, y, '#5a4028');
      p.line(32, 60, 18, 40, '#3a2616'); p.line(33, 58, 48, 38, '#3a2616');
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 24;
        const x = 32 + Math.cos(a) * d * 1.1, y = 34 + Math.sin(a) * d * 0.8;
        p.ball(x, y, 4 + r() * 5, ['#2c5220', '#36602a', '#244418', '#3e6c2e'][Math.floor(r() * 4)], 1.5, 0.35);
      }
    },
  });
  S('DEAD_TREE', {
    w: 64, h: 96, scale: 1.8,
    gen(p, c) {
      const r = c.rng;
      const branch = (x, y, a, len, w, depth) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        for (let k = -w / 2; k <= w / 2; k += 0.5) p.line(x + k, y, x2 + k * 0.6, y2, k < 0 ? '#4a3a2e' : '#2a1e16');
        if (depth > 0) { branch(x2, y2, a - 0.4 - r() * 0.4, len * 0.7, Math.max(1, w * 0.6), depth - 1); branch(x2, y2, a + 0.3 + r() * 0.4, len * 0.65, Math.max(1, w * 0.6), depth - 1); }
      };
      branch(32, 96, -Math.PI / 2, 34, 7, 4);
    },
  });
  S('PINE', {
    w: 48, h: 96, scale: 1.9,
    gen(p) {
      p.rect(21, 76, 6, 20, '#3a2616');
      for (let k = 0; k < 5; k++) {
        const y = 8 + k * 14, w = 8 + k * 4.5;
        p.poly([[24, y - 4], [24 + w, y + 18], [24 - w, y + 18]], k % 2 ? '#1e3e1c' : '#244a20');
        p.poly([[24, y - 4], [24 + w, y + 18], [24 + w * 0.3, y + 18]], '#162e14');
      }
    },
  });
  S('BUSH', { w: 32, h: 22, scale: 1.4, gen(p, c) { const r = c.rng; for (let i = 0; i < 22; i++) p.ball(6 + r() * 20, 8 + r() * 10, 3 + r() * 4, ['#2c5220', '#36602a', '#3e6c2e'][Math.floor(r() * 3)], 1.4, 0.4); } });
  S('ROSEBUSH', { w: 32, h: 22, scale: 1.4, gen(p, c) { c.call('BUSH', p); const r = c.rng; for (let i = 0; i < 10; i++) p.disc(5 + r() * 22, 5 + r() * 12, 1.4, r() < 0.5 ? '#d02040' : '#f0f0f0'); } });
  S('LAMPPOST', {
    w: 16, h: 72, scale: 1.4, emissive: true,
    gen(p) {
      p.rect(7, 16, 3, 54, '#1a1a1e'); p.rect(4, 66, 9, 6, '#1a1a1e'); p.rect(7, 16, 1, 50, '#3a3a44');
      p.poly([[3, 4], [13, 4], [11, 16], [5, 16]], '#101014');
      p.rect(5, 6, 6, 9, '#ffd070'); p.rect(7, 8, 2, 5, '#ffffff');
      p.poly([[2, 4], [8, 0], [14, 4]], '#1a1a1e');
    },
  });
  S('CANDELABRA', {
    w: 24, h: 36, scale: 1.3, emissive: true, frames: 2, fps: 6,
    gen(p, c) {
      const b = '#b08a30';
      p.rect(11, 14, 2, 20, b); p.rect(7, 33, 10, 3, b); p.rect(3, 14, 18, 2, b);
      for (const x of [3, 11, 19]) { p.rect(x, 8, 2, 6, '#e8e0c8'); p.ellipse(x + 1, 5 - (c.frame && x === 11 ? 1 : 0), 1.5, 2.8, '#ffb030'); p.px(x + 1, 6, '#ffffff'); }
    },
  });
  S('CANDLE', { w: 8, h: 16, scale: 1, emissive: true, gen(p) { p.rect(2, 7, 4, 9, '#e8e0c8'); p.ellipse(4, 4, 1.5, 3, '#ffb030'); p.px(4, 5, '#fff'); } });
  S('CHANDELIER', {
    w: 48, h: 32, scale: 1.3, hang: true, emissive: true,
    gen(p) {
      const b = '#b08a30';
      p.rect(23, 0, 2, 14, '#3a3020');
      p.ellipse(24, 22, 20, 5, b); p.ellipse(24, 22, 17, 3, '#1a1408');
      p.ball(24, 18, 5, b);
      for (const x of [6, 15, 24, 33, 42]) { p.rect(x - 1, 14, 3, 7, '#e8e0c8'); p.ellipse(x, 11, 1.8, 3, '#ffb030'); p.px(x, 12, '#ffffff'); }
      for (let x = 8; x < 42; x += 4) p.line(x, 26, x, 29, '#d0e0f0');
    },
  });
  S('BARREL', {
    w: 20, h: 26, scale: 1.3,
    gen(p) {
      for (let x = 0; x < 20; x++) { const t = x / 19, f = 0.45 + Math.sin(t * Math.PI) * 0.8; p.rect(x, 1, 1, 24, sh('#6a4424', f)); if (x % 4 === 0) p.rect(x, 1, 1, 24, sh('#3a2412', f)); }
      for (const y of [4, 12, 21]) p.rect(0, y, 20, 2, '#2a2a2e');
      p.ellipse(10, 1.5, 10, 1.5, '#4a2e16');
    },
  });
  S('CRATE', {
    w: 24, h: 24, scale: 1.4,
    gen(p) {
      p.rect(0, 0, 24, 24, '#8a6a3a').bevel(0, 0, 24, 24, 1.3, 0.55, 2);
      for (let y = 6; y < 24; y += 6) p.rect(2, y, 20, 1, '#5a4020');
      p.line(2, 2, 21, 21, '#5a4020'); p.line(3, 2, 22, 21, '#a0804a');
      p.frame(0, 0, 24, 24, '#3a2a14');
    },
  });
  S('TABLE', {
    w: 40, h: 22, scale: 1.4,
    gen(p) {
      p.rect(0, 4, 40, 5, '#5a3218').bevel(0, 4, 40, 5, 1.4, 0.6); p.ellipse(20, 4, 20, 2, '#7a4a26');
      for (const x of [3, 34]) p.rect(x, 9, 3, 13, '#3a200e');
    },
  });
  S('DESK', { w: 40, h: 24, scale: 1.4, gen(p, c) { c.call('TABLE', p); p.rect(4, 9, 12, 12, '#4a2a14').bevel(4, 9, 12, 12, 1.3, 0.6); p.rect(24, 0, 10, 4, '#e8dcb8'); p.disc(8, 2, 2, '#1a3a6a'); } });
  S('CHAIR', { w: 16, h: 26, scale: 1.3, gen(p) { p.rect(2, 0, 12, 13, '#5a3218').bevel(2, 0, 12, 13, 1.3, 0.6); p.rect(4, 2, 8, 9, '#6a1418'); p.rect(0, 13, 16, 4, '#4a2814'); for (const x of [1, 13]) p.rect(x, 17, 2, 9, '#3a200e'); } });
  S('PLANT', {
    w: 20, h: 32, scale: 1.3,
    gen(p, c) {
      p.poly([[5, 22], [15, 22], [13, 32], [7, 32]], '#9a4a2a'); p.rect(4, 21, 12, 2, '#b85a34');
      const r = c.rng;
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.33; p.line(10, 22, 10 + Math.cos(a) * (10 + r() * 6), 22 + Math.sin(a) * (14 + r() * 7), i % 2 ? '#3a7a2a' : '#2a5a1c'); }
    },
  });
  S('STATUE', {
    w: 28, h: 64, scale: 1.6,
    gen(p) {
      const s = '#8a8680';
      p.rect(3, 52, 22, 12, sh(s, 0.8)).bevel(3, 52, 22, 12, 1.3, 0.6);
      p.poly([[8, 52], [10, 22], [18, 22], [21, 52]], s);
      p.poly([[10, 26], [2, 12], [5, 10], [12, 22]], sh(s, 1.15)); p.poly([[18, 26], [26, 12], [23, 10], [16, 22]], sh(s, 0.8));
      p.ball(14, 16, 5, s); p.ellipse(14, 9, 5, 1.3, '#b0aa9a');
      for (let y = 30; y < 52; y += 4) p.line(10, y, 19, y + 1, sh(s, 0.75));
    },
  });
  S('GRAVE', {
    w: 20, h: 26, scale: 1.3,
    gen(p) {
      p.rect(2, 8, 16, 18, '#6a6a66'); p.ellipse(10, 8, 8, 7, '#6a6a66');
      p.bevel(2, 8, 16, 18, 1.2, 0.7); p.rect(9, 7, 2, 10, '#3a3a38'); p.rect(6, 10, 8, 2, '#3a3a38');
      p.rect(0, 23, 20, 3, '#4a4a44'); p.noise(0.15, 5);
    },
  });
  S('GRAVE_CROSS', {
    w: 18, h: 30, scale: 1.4,
    gen(p) { p.rect(7, 2, 5, 25, '#7a7a74'); p.rect(1, 8, 17, 5, '#7a7a74'); p.bevel(7, 2, 5, 25, 1.3, 0.6); p.rect(3, 26, 13, 4, '#4a4a44'); p.noise(0.15, 9); },
  });
  S('PILLAR', {
    w: 20, h: 96, scale: 1.5,
    gen(p) {
      for (let x = 2; x < 18; x++) { const t = (x - 2) / 15, f = 0.5 + Math.sin(t * Math.PI) * 0.7; p.rect(x, 8, 1, 80, sh('#d0c8b8', f)); if ((x - 2) % 4 === 0) p.rect(x, 8, 1, 80, sh('#8a8478', f)); }
      p.rect(0, 0, 20, 8, '#c8c0b0').bevel(0, 0, 20, 8, 1.2, 0.6); p.rect(0, 88, 20, 8, '#c8c0b0').bevel(0, 88, 20, 8, 1.2, 0.6);
    },
  });
  const armor = (frame, eyes) => (p) => {
    const m = '#8a8c94', d = '#4a4c54';
    p.ball(12, 7, 6, m); p.rect(7, 6, 10, 2, '#101010');
    if (eyes) { p.px(9, 6, '#ff3020'); p.px(14, 6, '#ff3020'); }
    p.rect(6, 13, 12, 14, m).bevel(6, 13, 12, 14, 1.3, 0.6); p.rect(11, 13, 2, 14, d);
    p.ball(5, 15, 3, m); p.ball(19, 15, 3, m);
    p.rect(2, 16, 3, 13, d); p.rect(19, 16, 3, 13, d);
    p.rect(20, 4, 2, 34, '#6a5a3a'); p.poly([[19, 4], [21, -2], [23, 4]], '#c0c4cc');
    const off = frame ? 2 : 0;
    p.rect(7, 27, 10, 4, d);
    p.rect(7 - off, 31, 4, 18, m).bevel(7 - off, 31, 4, 18, 1.3, 0.6); p.rect(13 + off, 31, 4, 18, m).bevel(13 + off, 31, 4, 18, 1.3, 0.6);
    p.rect(6 - off, 48, 6, 3, d); p.rect(12 + off, 48, 6, 3, d);
  };
  S('ARMOR', { w: 24, h: 52, scale: 1.5, gen: armor(0, false) });
  S('KNIGHT', { w: 24, h: 52, scale: 1.5, frames: 2, fps: 3, gen: (p, c) => armor(c.frame, true)(p) });
  S('DANCER', {
    w: 26, h: 48, scale: 1.4, frames: 2, fps: 3,
    gen(p, c) {
      const skin = '#e8d8d0', dress = '#c05a8a';
      p.ball(13, 6, 4, skin); p.ellipse(13, 3, 4.5, 2, '#3a2010'); p.px(11, 6, '#101010'); p.px(15, 6, '#101010'); p.px(13, 8, '#c02030');
      p.rect(11, 10, 5, 10, dress);
      p.ellipse(13, 21, 12, 3.5, sh(dress, 1.2)); p.ellipse(13, 20, 10, 2, sh(dress, 0.8));
      if (c.frame) { p.line(11, 11, 3, 3, skin); p.line(16, 11, 23, 3, skin); } else { p.line(11, 11, 4, 16, skin); p.line(16, 11, 23, 6, skin); }
      p.rect(12, 24, 2, 22, skin); p.line(14, 24, c.frame ? 21 : 18, c.frame ? 32 : 40, skin);
      p.rect(11, 46, 4, 2, '#8a2a4a');
      p.rect(6, 13, 3, 2, '#b08a30'); p.rect(4, 12, 2, 4, '#b08a30'); // wind-up key
    },
  });
  S('WISP', {
    w: 20, h: 20, scale: 1.6, frames: 3, fps: 8, emissive: true,
    gen(p, c) {
      const k = [1, 0.85, 0.7][c.frame];
      p.disc(10, 10, 9 * k, '#1a4a6a'); p.disc(10, 10, 7 * k, '#3a8ab0'); p.disc(10, 10, 4.5 * k, '#a0e8ff'); p.disc(10, 10, 2, '#ffffff');
      p.px(3, 14 - c.frame, '#a0e8ff'); p.px(16, 5 + c.frame, '#a0e8ff');
    },
  });
  S('SKELETON', {
    w: 36, h: 12, scale: 1.3,
    gen(p) {
      const b = '#d8d0b8';
      p.ball(4, 6, 4, b); p.px(3, 5, '#101010'); p.px(5, 5, '#101010');
      p.rect(8, 5, 14, 2, b); for (let x = 10; x < 21; x += 3) p.rect(x, 2, 1, 8, b);
      p.line(22, 6, 34, 3, b); p.line(22, 6, 34, 9, b); p.line(12, 6, 16, 11, b);
    },
  });
  S('BONES', { w: 24, h: 10, scale: 1.2, gen(p) { const b = '#d8d0b8'; p.line(1, 8, 12, 4, b); p.line(8, 9, 22, 7, b); p.ball(18, 4, 3.5, b); p.px(17, 3, '#101010'); p.px(19, 3, '#101010'); } });
  S('COBWEB', {
    w: 32, h: 32, scale: 1.4, hang: true,
    gen(p) {
      const c = [200, 200, 210];
      for (let a = 0; a <= 6; a++) { const t = a / 6 * Math.PI / 2; p.line(0, 0, Math.cos(t) * 31, Math.sin(t) * 31, c); }
      for (let r = 6; r < 32; r += 6) for (let a = 0; a < 6; a++) { const t0 = a / 6 * Math.PI / 2, t1 = (a + 1) / 6 * Math.PI / 2; p.line(Math.cos(t0) * r, Math.sin(t0) * r, Math.cos(t1) * r, Math.sin(t1) * r, c); }
    },
  });
  S('CLOCK', {
    w: 18, h: 60, scale: 1.4,
    gen(p) {
      p.rect(2, 12, 14, 48, '#4a2814').bevel(2, 12, 14, 48, 1.3, 0.6); p.rect(0, 8, 18, 6, '#5a3218');
      p.disc(9, 18, 5, '#e8e0c8'); p.ring(9, 18, 5, '#b08a30'); p.line(9, 18, 9, 15, '#101010'); p.line(9, 18, 11, 18, '#101010');
      p.rect(5, 28, 8, 24, '#1a0e06'); p.line(9, 28, 9, 44, '#b08a30'); p.disc(9, 46, 2.5, '#d0a030');
    },
  });
  S('PIANO', {
    w: 48, h: 30, scale: 1.5,
    gen(p) {
      p.rect(0, 0, 48, 20, '#141010').bevel(0, 0, 48, 20, 1.5, 0.6);
      p.rect(2, 18, 44, 4, '#e8e4d8'); for (let x = 3; x < 46; x += 3) p.rect(x, 18, 1, 2, '#141010');
      for (const x of [3, 43]) p.rect(x, 22, 3, 8, '#141010');
      p.rect(10, 4, 28, 8, '#2a2018');
    },
  });
  S('BED', {
    w: 48, h: 24, scale: 1.6,
    gen(p) {
      p.rect(0, 2, 5, 22, '#4a2814'); p.rect(43, 8, 5, 16, '#4a2814');
      p.rect(3, 10, 42, 8, '#e0dcd0').bevel(3, 10, 42, 8, 1.1, 0.8); p.rect(15, 9, 30, 9, '#6a1a2a').bevel(15, 9, 30, 9, 1.2, 0.7);
      p.ellipse(9, 10, 5, 2.5, '#f0ece0');
      for (const x of [1, 44]) p.rect(x, 18, 3, 6, '#3a200e');
    },
  });
  S('TELESCOPE', {
    w: 32, h: 48, scale: 1.6,
    gen(p) {
      p.line(16, 28, 6, 47, '#3a3a40'); p.line(16, 28, 26, 47, '#3a3a40'); p.line(16, 28, 16, 47, '#3a3a40');
      for (let k = -3; k <= 3; k++) p.line(4 + k * 0.3, 30 + k, 28 + k * 0.3, 6 + k, k < 0 ? '#e0c060' : '#8a6a20');
      p.disc(28, 6, 4, '#8a6a20'); p.disc(28, 6, 2, '#101830');
    },
  });
  S('PEDESTAL', { w: 16, h: 22, scale: 1.4, gen(p) { p.rect(1, 0, 14, 3, '#9a948a'); p.rect(3, 3, 10, 16, '#8a847a'); p.rect(0, 19, 16, 3, '#6a665e'); p.bevel(3, 3, 10, 16, 1.3, 0.6); } });
  S('WELL', {
    w: 48, h: 48, scale: 1.6,
    gen(p) {
      p.rect(4, 28, 40, 20, '#6a665e'); for (let y = 30; y < 48; y += 5) for (let x = 4 + (y % 2) * 4; x < 44; x += 8) p.frame(x, y, 8, 5, '#3a3830');
      p.ellipse(24, 28, 20, 4, '#0a0a0a'); p.rect(6, 4, 3, 26, '#4a2e16'); p.rect(39, 4, 3, 26, '#4a2e16');
      p.poly([[0, 8], [24, 0], [48, 8]], '#5a2a1a'); p.rect(8, 14, 32, 2, '#3a2412'); p.line(24, 15, 24, 26, '#b0a080');
    },
  });
  S('FOUNTAIN', {
    w: 40, h: 56, scale: 1.8, frames: 3, fps: 6,
    gen(p, c) {
      const s = '#8a867e';
      p.rect(16, 24, 8, 32, s).bevel(16, 24, 8, 32, 1.3, 0.6);
      p.ellipse(20, 24, 14, 3, sh(s, 1.1)); p.ellipse(20, 25, 12, 2, '#2a6a8a');
      p.ball(20, 16, 4, s);
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2 + c.frame * 0.4; p.line(20, 10, 20 + Math.cos(ang) * 12, 24 + Math.sin(ang) * 1.5, '#a0d8f0'); }
      for (let y = 0; y < 10; y += 2) p.px(20 + ((y + c.frame) % 3) - 1, y, '#e0f8ff');
    },
  });

  // ------------------------------------------------------------ hazards
  S('FLAME', {
    w: 16, h: 40, scale: 1.4, emissive: true, frames: 3, fps: 12,
    gen(p, c) {
      const r = U.rng(31 + c.frame * 7);
      for (let y = 0; y < 40; y++) {
        const t = y / 39, w = Math.sin(t * Math.PI * 0.9 + 0.1) * 7 * (0.6 + t * 0.4);
        const off = (r() - 0.5) * 3 * (1 - t);
        const col = t < 0.3 ? '#ffe070' : t < 0.6 ? '#ff9020' : t < 0.85 ? '#e04010' : '#ffffff';
        p.rect(8 - w + off, y, w * 2, 1, col);
        if (t > 0.4) p.rect(8 - w * 0.4 + off, y, w * 0.8, 1, '#fff0a0');
      }
    },
  });
  S('VENT', { w: 18, h: 5, scale: 1.4, gen(p) { p.rect(0, 0, 18, 5, '#2a2a2e').bevel(0, 0, 18, 5, 1.3, 0.5); for (let x = 2; x < 16; x += 3) p.rect(x, 1, 1, 3, '#0a0a0a'); } });
  S('SPIKES_UP', {
    w: 32, h: 18, scale: 1.8,
    gen(p) { for (let x = 0; x < 32; x += 6) { p.poly([[x, 18], [x + 3, 0], [x + 6, 18]], '#9aa0a8'); p.line(x + 3, 1, x + 3, 17, '#d8dce4'); } p.rect(0, 16, 32, 2, '#3a3a3e'); },
  });
  S('SPIKES_DOWN', { w: 32, h: 3, scale: 1.8, gen(p) { p.rect(0, 0, 32, 3, '#3a3a3e'); for (let x = 2; x < 32; x += 6) p.rect(x, 1, 2, 1, '#050505'); } });
  S('PENDULUM', {
    w: 40, h: 96, scale: 1.25, hang: true,
    gen(p) {
      p.rect(19, 0, 2, 78, '#4a4a50'); p.rect(19, 0, 1, 78, '#8a8a94');
      p.poly([[2, 80], [20, 76], [38, 80], [30, 92], [20, 95], [10, 92]], '#aab0b8');
      p.poly([[4, 81], [20, 78], [36, 81], [20, 84]], '#e0e4ec');
      p.poly([[10, 92], [20, 95], [30, 92], [20, 90]], '#6a6e76');
    },
  });
  S('THORNS', {
    w: 32, h: 24, scale: 1.4,
    gen(p, c) {
      const r = c.rng;
      for (let i = 0; i < 14; i++) {
        let x = r() * 32, y = 24, a = -Math.PI / 2 + (r() - 0.5) * 1.6;
        for (let s = 0; s < 14; s++) { const nx = x + Math.cos(a) * 1.6, ny = y + Math.sin(a) * 1.6; p.line(x, y, nx, ny, '#3a4a1a'); if (s % 3 === 0) p.px(nx + 1, ny, '#c8c090'); x = nx; y = ny; a += (r() - 0.5) * 0.6; }
      }
      for (let i = 0; i < 4; i++) p.disc(4 + r() * 24, 4 + r() * 14, 1.3, '#8a1030');
    },
  });
  S('SPORE_POD', { w: 20, h: 14, scale: 1.4, gen(p) { p.ball(10, 8, 7, '#6a4a7a'); for (const [x, y] of [[7, 5], [12, 7], [9, 10], [14, 11]]) p.disc(x, y, 1.2, '#c0a0d0'); p.ellipse(10, 13, 9, 1.5, '#2a3a1a'); } });
  S('SPORE_CLOUD', {
    w: 36, h: 40, scale: 1.5, frames: 3, fps: 8, emissive: true,
    gen(p, c) {
      const r = U.rng(51 + c.frame * 9);
      for (let i = 0; i < 18; i++) p.disc(18 + (r() - 0.5) * 26, 8 + r() * 28, 3 + r() * 5, r() < 0.5 ? '#8ac04a' : '#b0e070');
      for (let i = 0; i < 12; i++) p.px(r() * 36, r() * 40, '#f0ffc0');
    },
  });
  S('STEAM', {
    w: 32, h: 48, scale: 1.5, frames: 3, fps: 10,
    gen(p, c) { const r = U.rng(71 + c.frame * 3); for (let i = 0; i < 20; i++) { const y = r() * 44; p.disc(16 + (r() - 0.5) * (6 + y * 0.5), 44 - y, 2 + y * 0.12, r() < 0.5 ? '#c8ccd0' : '#e8ecf0'); } },
  });
  S('SPARKS', { w: 24, h: 24, scale: 1.3, frames: 2, fps: 14, emissive: true, gen(p, c) { const r = U.rng(9 + c.frame); for (let i = 0; i < 8; i++) { const x = r() * 24, y = r() * 24; p.line(12, 12, x, y, '#a0d0ff'); } p.disc(12, 12, 2, '#ffffff'); } });

  // ------------------------------------------------------------ held
  // two hands gripping a ledge lip, seen from below (drawn at the top of the view while hanging)
  S('HANDS_GRIP', {
    w: 96, h: 30, scale: 1,
    gen(p) {
      const skin = '#b87a54', dark = R.hex(skin).map(v => v * 0.62), hi = R.hex(skin).map(v => v * 1.18), sleeve = '#6a1a14';
      for (const cx of [26, 70]) {
        p.rect(cx - 9, 16, 18, 14, sleeve); p.rect(cx - 9, 16, 18, 2, R.hex(sleeve).map(v => v * 1.4));
        p.ellipse(cx, 11, 12, 7, skin);
        for (let f = -1.5; f <= 1.5; f += 1) { const x = cx + f * 5.5; p.ellipse(x, 5, 2.8, 5, skin); p.line(x - 2, 1, x + 2, 1, dark); p.px(x - 1, 3, hi); }
        p.ellipse(cx + (cx < 48 ? 11 : -11), 12, 3, 5, skin);
        p.line(cx - 10, 15, cx + 10, 15, dark);
      }
    },
  });
  S('HELD_LANTERN', {
    w: 64, h: 88, scale: 1, emissive: true,
    gen(p) {
      const skin = '#c8906c', sleeve = '#3e3024', metal = '#2a2218', brass = '#b08a30';
      // sleeve and hand coming in from the lower right
      p.poly([[44, 40], [64, 30], [64, 88], [50, 88]], sleeve);
      p.poly([[48, 44], [64, 38], [64, 50], [52, 56]], R.hex(sleeve).map(v => v * 1.25));
      p.ellipse(44, 31, 9, 7.5, skin);
      p.ellipse(42, 29, 6, 4, R.hex(skin).map(v => v * 1.15));
      for (const y of [27, 31, 35]) p.line(36, y, 42, y + 1, R.hex(skin).map(v => v * 0.7));
      // bail ring from the fist to the cap
      p.ring(28, 34, 10, metal, 2);
      p.poly([[16, 44], [40, 44], [34, 36], [22, 36]], metal);
      p.disc(28, 35, 2.5, brass);
      // body: frame, glass, flame
      p.rect(15, 44, 26, 32, metal);
      p.rect(18, 46, 20, 28, '#e89830');
      p.rect(20, 48, 16, 24, '#ffe890');
      p.ellipse(28, 62, 5, 9, '#fff8d8'); p.ellipse(28, 64, 3, 6, '#ffffff');
      for (const x of [15, 27, 40]) p.rect(x, 44, 1, 32, brass);
      p.rect(15, 44, 26, 2, brass); p.rect(15, 74, 26, 2, brass);
      p.rect(13, 76, 30, 5, metal); p.rect(13, 76, 30, 1, brass);
      // glass highlights
      p.line(21, 50, 21, 70, '#fffff0'); p.line(35, 50, 35, 56, '#fff0c0');
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
