/*
 * Hollowmere — campaign-specific assets. Shows how a variation can add its own
 * textures, sprites and sounds on top of the stock library.
 */
(function (R) {
  'use strict';
  const C = R.hex;
  const sh = (c, f) => { c = C(c); return [c[0] * f, c[1] * f, c[2] * f]; };

  R.defTexture('PLANTER', {
    gen(p, c) {
      R.texHelpers.planks(p, c, { ph: 8, len: 64, base: '#5a3a1e' });
      p.rect(0, 0, 64, 5, '#3a2a14');
      const r = c.rng; for (let i = 0; i < 40; i++) p.px(r() * 64, r() * 5, '#6a5a3a');
    },
  });
  R.defTexture('SOIL', {
    gen(p, c) {
      c.call('DIRT', p);
      const r = c.rng;
      for (let i = 0; i < 26; i++) { const x = r() * 64, y = r() * 64; p.line(x, y, x + 3, y - 4, '#3a7a2a'); p.line(x, y, x - 3, y - 3, '#2a6a20'); }
    },
  });

  // --- the Great Orrery: states 0..3 = stones placed, 4 = running
  const orrery = (placed, frame) => (p) => {
    const brass = '#c89a3a', dark = '#6a4a18';
    p.rect(20, 56, 24, 8, dark).bevel(20, 56, 24, 8, 1.3, 0.6);
    p.rect(29, 30, 6, 26, brass).bevel(29, 30, 6, 26, 1.4, 0.6);
    const cx = 32, cy = 26, a = frame * 0.45;
    p.ring(cx, cy, 22, brass, 2); p.ring(cx, cy, 14, sh(brass, 0.8), 1);
    for (let k = 0; k < 3; k++) {
      const ang = a + k * 2.1 + (k === 1 ? 0.6 : 0);
      const rr = [22, 14, 18][k];
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.45;
      const cols = [['#f0a020', '#fff0a0'], ['#8ab0e0', '#f0f8ff'], ['#e02040', '#ffa0b0']][k];
      if (k < placed) { p.ball(x, y, 4, cols[0], 1.6, 0.5); p.px(x - 1, y - 1, cols[1]); }
      else { p.ring(x, y, 4, '#3a2a10'); p.disc(x, y, 2, '#1a1008'); }
    }
    p.ball(cx, cy, 5, placed >= 3 ? '#fff4c0' : brass, 1.5, 0.5);
  };
  for (let k = 0; k <= 3; k++) R.defSprite('ORRERY_' + k, { w: 64, h: 64, scale: 2.0, gen: orrery(k, 0) });
  R.defSprite('ORRERY_SPIN', {
    w: 64, h: 64, scale: 2.0, frames: 8, fps: 10, emissive: true,
    gen(p, ctx) { orrery(3, ctx.frame)(p); },
  });
  R.defSprite('ROCKING_HORSE', {
    w: 32, h: 26, scale: 1.3,
    gen(p) {
      p.ellipse(16, 23, 15, 3, '#5a3a1e'); p.ellipse(16, 23, 13, 1.5, '#1a0e06');
      for (const x of [8, 22]) p.rect(x, 12, 2, 10, '#8a6a3a');
      p.ellipse(16, 11, 10, 4, '#e0d8c8'); p.rect(23, 2, 4, 9, '#e0d8c8'); p.ellipse(26, 3, 4, 2.5, '#e0d8c8');
      p.px(27, 2, '#101010'); p.rect(20, 1, 3, 8, '#8a3a1a'); p.line(6, 10, 3, 16, '#8a3a1a');
      p.disc(12, 10, 1.5, '#303030'); p.disc(17, 12, 1.2, '#303030');
    },
  });

  R.sfx.register('crash', (A, o, v) => { A.noise({ dur: 0.6, f0: 1800, f1: 200, vol: 0.5 * v, filter: 'bandpass', q: 0.6 }, o); A.tone({ type: 'square', f0: 120, f1: 50, dur: 0.3, vol: 0.2 * v, lp: 600 }, o); });
  R.sfx.register('gate', (A, o, v) => { A.noise({ dur: 1.4, f0: 900, f1: 300, vol: 0.3 * v, filter: 'bandpass', q: 3 }, o); A.tone({ type: 'sawtooth', f0: 110, f1: 70, dur: 1.4, vol: 0.1 * v, lp: 500 }, o); });
  R.sfx.register('shutter', (A, o, v) => { for (let i = 0; i < 8; i++) A.tone({ type: 'square', f0: 90 + i * 4, dur: 0.12, vol: 0.12 * v, lp: 700, delay: i * 0.15 }, o); A.noise({ dur: 1.3, f0: 500, vol: 0.25 * v }, o); });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
