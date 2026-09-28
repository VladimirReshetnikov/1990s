/*
 * Hourglass — dungeon & palace assets (textures, sprites, sounds) on top of
 * the stock RetroEngine library. Every name used by the levels is defined here.
 */
(function (R) {
  'use strict';
  const U = R.util, C = R.hex, T = R.defTexture, S = R.defSprite, H = R.texHelpers;
  const sh = (c, f) => { c = C(c); return [c[0] * f, c[1] * f, c[2] * f]; };

  // ------------------------------------------------------------ walls
  T('SANDSTONE', { gen: (p, c) => H.blocks(p, c, { base: '#a07848', mortar: '#4a3420', bw: 32, bh: 16, cracks: 0.3, grain: 0.3 }) });
  T('SANDSTONE_DARK', { gen: (p, c) => H.blocks(p, c, { base: '#6a5034', mortar: '#2a1c10', bw: 32, bh: 16, cracks: 0.5, grain: 0.4 }) });
  T('DUNGEON_WALL', { gen: (p, c) => H.blocks(p, c, { base: '#6a5a48', mortar: '#1e1810', bw: 16, bh: 16, cracks: 0.4, grain: 0.45 }) });
  T('DUNGEON_BRICK', { gen: (p, c) => H.bricks(p, c, { base: '#7a5a3a', mortar: '#2a2016', vary: 0.25, grain: 0.35 }) });
  T('PALACE_TILE', {
    gen(p, c) {
      H.tiles(p, c, { ts: 16, base: '#2a6a8a', alt: '#d8c890', grout: '#4a3a20', vary: 0.08 });
      for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) { p.disc(x + 8, y + 8, 2.5, (x + y) % 32 ? '#c89a30' : '#1a4a6a'); }
    },
  });
  T('PALACE_ARCH', {
    h: 128,
    gen(p, c) {
      H.blocks(p, c, { base: '#c8b088', mortar: '#6a5438', bw: 32, bh: 16, cracks: 0.1, grain: 0.2 });
      p.rect(16, 30, 32, 70, '#1a2440'); p.ellipse(32, 30, 16, 14, '#1a2440');
      p.ring(32, 30, 16, '#c89a30', 2); p.rect(15, 30, 2, 70, '#c89a30'); p.rect(47, 30, 2, 70, '#c89a30');
    },
  });
  // portcullis: see-through (transparent between the bars), drawn on the gate cell's mid-plane;
  // 2 units tall, bottom-pegged so the spiked foot rises with the gate
  T('GATE_BARS', {
    h: 128,
    gen(p) {
      for (let x = 3; x < 64; x += 9) { p.rect(x, 0, 4, 120, '#4a4a4e'); p.rect(x, 0, 1, 120, '#8a8a92'); p.rect(x + 3, 0, 1, 120, '#2a2a2e'); }
      for (const y of [14, 62, 106]) { p.rect(0, y, 64, 4, '#3a3a3e'); p.rect(0, y, 64, 1, '#7a7a82'); p.rect(0, y + 3, 64, 1, '#1e1e22'); }
      for (let x = 3; x < 64; x += 9) p.poly([[x - 1, 120], [x + 2, 128], [x + 5, 120]], '#8a8a92');
    },
  });
  // slicer jaws: stretched over the corridor's full height; frame 0 open (tucked into floor
  // and ceiling), frame 3 shut (teeth meeting at waist height)
  T('SLICER_JAWS', {
    frames: 4,
    gen(p, c) {
      const k = c.frame / 3, gap = 4 + (1 - k) * 26, mid = 34;
      const steel = '#b8c0c8', hi = '#f0f4ff', dark = '#50545c';
      const top = mid - gap, bot = mid + gap;
      p.rect(2, 0, 60, Math.max(1, top - 3), steel); p.rect(2, 0, 60, 2, dark);
      p.rect(2, Math.min(63, bot + 3), 60, 64 - Math.min(63, bot + 3), steel); p.rect(2, 62, 60, 2, dark);
      for (let x = 2; x < 62; x += 6) {
        p.poly([[x, top - 3], [x + 3, top + 2], [x + 6, top - 3]], hi);
        p.poly([[x, bot + 3], [x + 3, bot - 2], [x + 6, bot + 3]], hi);
      }
      p.rect(2, 0, 2, 64, dark); p.rect(60, 0, 2, 64, dark);
      if (k > 0.9) p.rect(24, top - 6, 3, 10, '#8a1010');
    },
  });
  T('EXIT_DOOR', {
    gen(p, c) {
      H.door(p, c, { wood: '#5a3a1a' });
      p.rect(0, 0, 64, 6, '#c89a30'); p.rect(28, 20, 8, 12, '#e0c060');
    },
  });
  T('DART_SLOTS', {
    gen(p, c) {
      c.call('DUNGEON_WALL', p);
      for (const x of [14, 30, 46]) { p.rect(x, 24, 5, 5, '#050403'); p.bevel(x - 1, 23, 7, 7, 0.6, 1.3); }
    },
  });
  T('LEVER_UP', { gen: (p, c) => { c.call('SWITCH_OFF', p); } });
  T('LEVER_DOWN', { gen: (p, c) => { c.call('SWITCH_ON', p); } });

  // ------------------------------------------------------------ flats
  T('SAND_FLOOR', { gen: (p, c) => H.blocks(p, c, { base: '#8a6c44', mortar: '#3a2a18', bw: 32, bh: 32, cracks: 0.3, grain: 0.35 }) });
  T('DUNGEON_FLOOR', { gen: (p, c) => H.voronoi(p, c, { n: 8, base: '#5e5040', edge: '#1a140e', edgeW: 1.3, vary: 0.2, grain: 0.4 }) });
  T('LOOSE_FLAT', {
    gen(p, c) {
      c.call('SAND_FLOOR', p);
      const r = c.rng;
      for (let k = 0; k < 5; k++) { let x = 10 + r() * 44, y = 10 + r() * 44; for (let i = 0; i < 14; i++) { p.px(x, y, '#1a1008'); x += r() * 3 - 1.5; y += r() * 3 - 1.5; } }
      p.frame(0, 0, 64, 64, '#2a1c10');
    },
  });
  T('PLATE_FLAT', {
    gen(p, c) {
      c.call('SAND_FLOOR', p);
      p.rect(12, 12, 40, 40, '#8a7a5a').bevel(12, 12, 40, 40, 1.3, 0.55, 2);
      p.rect(20, 20, 24, 24, '#7a6a4a').bevel(20, 20, 24, 24, 0.7, 1.2, 1);
    },
  });
  T('EXIT_FLAT', { gen: (p, c) => { c.call('SAND_FLOOR', p); p.mul(0, 0, 64, 64, 1.2); for (let i = 0; i < 64; i += 8) p.rect(i, 0, 2, 64, '#c89a30'); } });
  T('ABYSS', { gen: p => { p.fill('#040306'); } });
  T('CEIL_DUNGEON', { gen: (p, c) => H.blocks(p, c, { base: '#4a3e30', mortar: '#140e08', bw: 32, bh: 32, grain: 0.5 }) });
  T('CARPET_PERSIAN', {
    gen(p, c) {
      p.fill('#7a1418').grain(0.12, c.seed);
      p.frame(2, 2, 60, 60, '#d0a030'); p.frame(5, 5, 54, 54, '#1a2a5a');
      p.poly([[32, 12], [52, 32], [32, 52], [12, 32]], '#1a2a5a'); p.poly([[32, 20], [44, 32], [32, 44], [20, 32]], '#d0a030');
      p.disc(32, 32, 3, '#7a1418');
    },
  });

  // ------------------------------------------------------------ sprites
  S('TORCH', {
    w: 12, h: 30, scale: 1.2, emissive: true, frames: 3, fps: 10,
    gen(p, c) {
      p.rect(5, 14, 3, 16, '#4a2e16'); p.rect(3, 12, 7, 3, '#6a6a70');
      const r = U.rng(5 + c.frame * 11);
      for (let y = 0; y < 13; y++) { const w = Math.sin((y / 12) * Math.PI) * 4 * (0.7 + r() * 0.5); p.rect(6 - w, y, w * 2, 1, y < 4 ? '#ffe070' : y < 8 ? '#ff9020' : '#e04010'); }
      p.rect(5, 6, 2, 5, '#fff0a0');
    },
  });
  const brazier = lit => (p, ctx) => {
    p.poly([[4, 14], [28, 14], [24, 24], [8, 24]], '#6a5030'); p.rect(4, 12, 24, 3, '#b08a30');
    p.rect(14, 24, 4, 12, '#4a3a20'); p.rect(8, 35, 16, 3, '#4a3a20');
    if (lit) {
      const r = U.rng(3 + ctx.frame * 7);
      for (let i = 0; i < 26; i++) { const x = 8 + r() * 16, y = 2 + r() * 11; p.disc(x, y, 1.5 + r() * 2, r() < 0.3 ? '#fff0a0' : r() < 0.6 ? '#ff9020' : '#e04010'); }
    } else { for (let x = 8; x < 24; x += 3) p.px(x, 12, '#3a2a1a'); }
  };
  S('BRAZIER', { w: 32, h: 38, scale: 1.2, gen: brazier(false) });
  S('BRAZIER_LIT', { w: 32, h: 38, scale: 1.2, emissive: true, frames: 3, fps: 10, gen: brazier(true) });
  S('SLICER', {
    w: 48, h: 80, scale: 1.3, frames: 4,
    gen(p, ctx) {
      // two blades; frame 0 = open (apart), 3 = shut (meeting in the middle)
      const k = ctx.frame / 3, gap = (1 - k) * 30;
      const steel = '#b8c0c8', edge = '#f0f4ff', dark = '#4a4e56';
      const topY = 40 - 2 - gap, botY = 40 + 2 + gap;
      p.poly([[4, topY - 30], [44, topY - 30], [44, topY], [24, topY + 4], [4, topY]], steel);
      p.line(4, topY, 24, topY + 4, edge); p.line(24, topY + 4, 44, topY, edge);
      p.poly([[4, botY + 30], [44, botY + 30], [44, botY], [24, botY - 4], [4, botY]], steel);
      p.line(4, botY, 24, botY - 4, edge); p.line(24, botY - 4, 44, botY, edge);
      p.rect(4, 0, 40, 4, dark); p.rect(4, 76, 40, 4, dark);
      if (k > 0.9) { p.rect(22, 30, 4, 20, '#a01010'); }
    },
  });
  S('DART', { w: 16, h: 4, scale: 1.2, gen(p) { p.rect(0, 1, 12, 2, '#6a4a2a'); p.poly([[12, 0], [16, 2], [12, 4]], '#c0c8d0'); p.rect(0, 0, 3, 4, '#c02020'); } });
  S('DUST', { w: 16, h: 40, scale: 1.2, frames: 3, fps: 12, gen(p, c) { const r = U.rng(9 + c.frame); for (let i = 0; i < 26; i++) p.px(5 + r() * 6, r() * 40, r() < 0.5 ? '#a08868' : '#6a5a48'); } });
  S('ROCK', { w: 28, h: 24, scale: 1.3, gen(p) { p.ball(14, 13, 11, '#7a6a58', 1.4, 0.4); p.ball(9, 9, 4, '#8a7a68', 1.3, 0.5); } });
  S('RUBBLE', { w: 36, h: 12, scale: 1.3, gen(p, c) { const r = c.rng; for (let i = 0; i < 12; i++) p.ball(4 + r() * 28, 7 + r() * 4, 2 + r() * 3, '#6a5a48', 1.3, 0.4); } });
  S('LOOSE_TILE', { w: 40, h: 14, scale: 1.4, gen(p) { p.rect(0, 2, 40, 10, '#8a6c44').bevel(0, 2, 40, 10, 1.3, 0.5, 2); p.line(8, 3, 16, 11, '#2a1a0a'); p.line(26, 3, 30, 11, '#2a1a0a'); } });
  S('BOULDER', {
    w: 56, h: 56, scale: 1.5, frames: 4, fps: 8,
    gen(p, c) {
      p.ball(28, 28, 26, '#7a6a58', 1.35, 0.35);
      const a = c.frame * Math.PI / 8;
      for (let k = 0; k < 4; k++) { const t = a + k * Math.PI / 2; p.line(28 + Math.cos(t) * 8, 28 + Math.sin(t) * 8, 28 + Math.cos(t) * 22, 28 + Math.sin(t) * 22, '#4a3e32'); }
    },
  });
  const flask = (liquid, hi, big) => (p) => {
    const w = big ? 16 : 12, h = big ? 22 : 16, x0 = (20 - w) / 2, y0 = 24 - h;
    p.rect(8, y0 - 5, 4, 6, '#c8b090');
    p.ellipse(10, y0 + h / 2 + 2, w / 2, h / 2, liquid);
    p.ellipse(8, y0 + h / 2, 2, 3, hi);
    p.ring(10, y0 + h / 2 + 2, w / 2, '#302020');
  };
  S('POTION_RED', { w: 20, h: 26, scale: 1.3, gen: flask('#d02030', '#ff9090', false) });
  S('POTION_BIG', { w: 20, h: 26, scale: 1.5, emissive: true, gen: flask('#30c040', '#b0ffb0', true) });
  S('POTION_BLUE', { w: 20, h: 26, scale: 1.3, gen: flask('#2040d0', '#90a0ff', false) });
  S('SEAL', {
    w: 20, h: 20, scale: 1.5, emissive: true,
    gen(p) { p.disc(10, 10, 9, '#8a6a10'); p.disc(10, 10, 7, '#e0b030'); p.poly([[10, 4], [12, 9], [16, 9], [13, 12], [14, 16], [10, 13], [6, 16], [7, 12], [4, 9], [8, 9]], '#8a1010'); },
  });
  S('SKULL', { w: 16, h: 14, scale: 1, gen(p) { p.ball(8, 6, 6, '#d8d0b8'); p.px(6, 6, '#101010'); p.px(10, 6, '#101010'); p.rect(6, 11, 5, 3, '#c8c0a8'); } });

  // ------------------------------------------------------------ sounds
  const S2 = R.sfx;
  S2.register('jump', (A, o, v) => A.noise({ dur: 0.12, f0: 700, f1: 300, vol: 0.18 * v }, o));
  S2.register('bump', (A, o, v) => A.tone({ type: 'sine', f0: 140, f1: 80, dur: 0.1, vol: 0.3 * v }, o));
  S2.register('grab', (A, o, v) => { A.noise({ dur: 0.08, f0: 1500, filter: 'bandpass', vol: 0.2 * v }, o); A.tone({ type: 'square', f0: 220, dur: 0.06, vol: 0.08 * v, lp: 800 }, o); });
  S2.register('climb', (A, o, v) => { for (let i = 0; i < 3; i++) A.noise({ dur: 0.08, f0: 900 + i * 200, filter: 'bandpass', vol: 0.18 * v, delay: i * 0.15 }, o); });
  S2.register('drop', (A, o, v) => A.noise({ dur: 0.1, f0: 600, vol: 0.15 * v }, o));
  S2.register('rattle', (A, o, v) => { for (let i = 0; i < 5; i++) A.noise({ dur: 0.05, f0: 400 + Math.random() * 300, vol: 0.25 * v, delay: i * 0.08 }, o); });
  S2.register('crumble', (A, o, v) => A.noise({ dur: 0.5, f0: 900, f1: 200, vol: 0.4 * v }, o));
  S2.register('crash', (A, o, v) => { A.noise({ dur: 0.45, f0: 1600, f1: 150, vol: 0.5 * v, filter: 'bandpass', q: 0.6 }, o); A.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.3, vol: 0.3 * v }, o); });
  S2.register('click', (A, o, v) => { A.tone({ type: 'square', f0: 300, dur: 0.04, vol: 0.2 * v, lp: 1200 }, o); A.noise({ dur: 0.1, f0: 500, vol: 0.2 * v }, o); });
  S2.register('slice', (A, o, v) => { A.noise({ dur: 0.18, f0: 5000, f1: 1500, filter: 'highpass', vol: 0.35 * v }, o); A.tone({ type: 'triangle', f0: 1800, f1: 900, dur: 0.15, vol: 0.12 * v }, o); A.tone({ type: 'square', f0: 120, dur: 0.06, vol: 0.2 * v, lp: 600, delay: 0.1 }, o); });
  S2.register('spikes', (A, o, v) => { A.noise({ dur: 0.1, f0: 3000, filter: 'highpass', vol: 0.3 * v }, o); A.tone({ type: 'square', f0: 400, f1: 200, dur: 0.08, vol: 0.12 * v, lp: 1500 }, o); });
  S2.register('dart', (A, o, v) => A.noise({ dur: 0.2, f0: 2500, f1: 800, filter: 'bandpass', q: 3, vol: 0.3 * v }, o));
  S2.register('creak', (A, o, v) => A.tone({ type: 'sawtooth', f0: 90, f1: 70, dur: 0.6, vol: 0.08 * v, lp: 400, attack: 0.1 }, o));
  S2.register('drink', (A, o, v) => { for (let i = 0; i < 3; i++) A.tone({ type: 'sine', f0: 300 + i * 40, dur: 0.1, vol: 0.2 * v, delay: i * 0.12 }, o); });
  S2.register('bigdrink', (A, o, v) => { [392, 494, 587, 784].forEach((f, i) => A.tone({ type: 'triangle', f0: f, dur: 0.3, vol: 0.18 * v, delay: i * 0.1 }, o)); });
  S2.register('gate', (A, o, v) => { A.noise({ dur: 1.2, f0: 900, f1: 300, vol: 0.3 * v, filter: 'bandpass', q: 3 }, o); A.tone({ type: 'sawtooth', f0: 110, f1: 70, dur: 1.2, vol: 0.1 * v, lp: 500 }, o); });
  S2.register('scream', (A, o, v) => { A.tone({ type: 'sawtooth', f0: 620, f1: 180, dur: 1.1, vol: 0.12 * v, lp: 1800, attack: 0.03 }, o); A.noise({ dur: 0.9, f0: 1200, f1: 400, filter: 'bandpass', q: 2, vol: 0.08 * v }, o); });
  S2.register('shing', (A, o, v) => A.tone({ type: 'triangle', f0: 2600, f1: 3400, dur: 0.22, vol: 0.1 * v, attack: 0.02 }, o));
  S2.register('dartclick', (A, o, v) => { A.tone({ type: 'square', f0: 900, dur: 0.02, vol: 0.12 * v, lp: 2500 }, o); A.tone({ type: 'square', f0: 700, dur: 0.02, vol: 0.1 * v, lp: 2500, delay: 0.07 }, o); });
  S2.register('clang', (A, o, v) => { A.tone({ type: 'square', f0: 180, f1: 150, dur: 0.25, vol: 0.18 * v, lp: 1400 }, o); A.noise({ dur: 0.2, f0: 2200, filter: 'bandpass', q: 4, vol: 0.2 * v }, o); });
  S2.register('ratchet', (A, o, v) => A.tone({ type: 'square', f0: 520, dur: 0.025, vol: 0.12 * v, lp: 1600 }, o));
  S2.register('rumble', (A, o, v) => A.noise({ dur: 1.4, f0: 160, f1: 90, vol: 0.35 * v, attack: 0.2 }, o));
  S2.register('chime', (A, o, v) => { [880, 1175, 880].forEach((f, i) => A.tone({ type: 'sine', f0: f, dur: 0.6, vol: 0.15 * v, delay: i * 0.35 }, o)); });
  S2.register('checkpoint', (A, o, v) => { A.noise({ dur: 0.6, f0: 400, f1: 1500, vol: 0.3 * v, attack: 0.05 }, o); [523, 659].forEach((f, i) => A.tone({ type: 'triangle', f0: f, dur: 0.4, vol: 0.12 * v, delay: 0.2 + i * 0.12 }, o)); });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
