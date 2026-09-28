/*
 * Stock texture library — procedurally painted, palette-quantized.
 * Campaigns can use any of these by name, or register their own with
 * RetroEngine.defTexture(name, { w, h, gen(p, ctx) }).
 */
(function (R) {
  'use strict';
  const U = R.util, C = R.hex, T = R.defTexture;
  const sh = (c, f) => { c = C(c); return [c[0] * f, c[1] * f, c[2] * f]; };
  const mix = (a, b, t) => { a = C(a); b = C(b); return [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t)]; };

  // ------------------------------------------------------------ helpers
  const H = R.texHelpers = {};

  H.bricks = function (p, ctx, o = {}) {
    const bw = o.bw || 16, bh = o.bh || 8, base = C(o.base || '#8c3a28'), mortar = C(o.mortar || '#5e5650');
    const r = ctx.rng, vary = o.vary ?? 0.2;
    p.fill(mortar).noise(0.2, ctx.seed);
    for (let row = 0; row < p.h / bh; row++) {
      const off = (row % 2) * (bw / 2) + (o.shift || 0);
      for (let col = 0; col < p.w / bw; col++) {
        const x = col * bw + off, y = row * bh;
        const f = 1 + (r() * 2 - 1) * vary;
        const c = o.tint && r() < 0.25 ? mix(sh(base, f), o.tint, 0.35) : sh(base, f);
        p.rect(x + 1, y + 1, bw - 1, bh - 1, c);
        p.bevel(x + 1, y + 1, bw - 1, bh - 1, 1.12, 0.78);
      }
    }
    p.noise(o.noise ?? 0.14, ctx.seed + 1);
    if (o.grain !== 0) p.grain(o.grain || 0.25, ctx.seed + 2);
    return p;
  };

  H.blocks = function (p, ctx, o = {}) {
    const bw = o.bw || 32, bh = o.bh || 16, base = C(o.base || '#6e6c68'), mortar = C(o.mortar || '#2e2c2a');
    const r = ctx.rng;
    p.fill(mortar);
    for (let row = 0; row < p.h / bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = 0; col < p.w / bw; col++) {
        const x = col * bw + off, y = row * bh;
        const f = 1 + (r() * 2 - 1) * (o.vary ?? 0.15);
        p.rect(x + 1, y + 1, bw - 2, bh - 2, sh(base, f));
        p.bevel(x + 1, y + 1, bw - 2, bh - 2, 1.18, 0.7);
        if (r() < (o.cracks ?? 0.35)) { // crack
          let cx = x + 3 + r() * (bw - 6), cy = y + 2;
          for (let k = 0; k < bh - 4; k++) { p.px(cx, cy + k, sh(base, 0.45)); cx += Math.round(r() * 2 - 1); }
        }
      }
    }
    p.grain(o.grain ?? 0.35, ctx.seed + 3).noise(0.12, ctx.seed + 4);
    return p;
  };

  /** Toroidal Voronoi cells — for rubble walls, cobbles and flagstones. */
  H.voronoi = function (p, ctx, o = {}) {
    const n = o.n || 18, r = ctx.rng, pts = [];
    for (let i = 0; i < n; i++) pts.push([r() * p.w, r() * p.h, 1 + (r() * 2 - 1) * (o.vary ?? 0.2), r()]);
    const base = C(o.base || '#6a6660'), edge = C(o.edge || '#1e1c1a'), ew = o.edgeW ?? 1.6;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      let d1 = 1e9, d2 = 1e9, best = null;
      for (const q of pts) {
        let dx = Math.abs(x + 0.5 - q[0]), dy = Math.abs(y + 0.5 - q[1]);
        if (dx > p.w / 2) dx = p.w - dx;
        if (dy > p.h / 2) dy = p.h - dy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) { d2 = d1; d1 = d; best = q; } else if (d < d2) d2 = d;
      }
      const e = d2 - d1;
      if (e < ew) p.px(x, y, edge);
      else {
        const c = o.color ? o.color(best) : sh(base, best[2]);
        const rim = o.round ? U.clamp(1.2 - d1 / (o.round), 0.55, 1.15) : 1;
        p.px(x, y, sh(c, rim * (e < ew + 1.2 ? 0.8 : 1)));
      }
    }
    p.grain(o.grain ?? 0.3, ctx.seed + 5).noise(o.noise ?? 0.12, ctx.seed + 6);
    return p;
  };

  H.planks = function (p, ctx, o = {}) {
    const ph = o.ph || 8, len = o.len || 32, base = C(o.base || '#7a4e26'), r = ctx.rng, vertical = !!o.vertical;
    const W = vertical ? p.h : p.w, Hh = vertical ? p.w : p.h;
    const put = (a, b, c) => (vertical ? p.px(b, a, c) : p.px(a, b, c));
    for (let row = 0; row < Hh / ph; row++) {
      const off = Math.floor(r() * len);
      for (let s = 0; s < W / len + 1; s++) {
        const f = 1 + (r() * 2 - 1) * (o.vary ?? 0.18);
        const c = sh(base, f);
        const rowShade = [];
        for (let k = 0; k < ph; k++) rowShade.push(1 + (r() * 2 - 1) * 0.08);
        for (let a = 0; a < len; a++) for (let k = 0; k < ph; k++) {
          const x = s * len + off + a, y = row * ph + k;
          let f2 = rowShade[k];
          if (k === 0) f2 *= 1.18; if (k === ph - 1) f2 *= 0.6;
          if (a === 0 && o.seams !== false) f2 *= 0.55;
          put(x, y, sh(c, f2));
        }
        if (r() < 0.3) { // knot
          const kx = s * len + off + 4 + r() * (len - 8), ky = row * ph + ph / 2;
          if (vertical) p.ellipse(ky, kx, 1.5, 2.2, sh(c, 0.6)); else p.ellipse(kx, ky, 2.2, 1.5, sh(c, 0.6));
        }
      }
    }
    p.noise(o.noise ?? 0.07, ctx.seed + 7);
    if (o.nails) {
      for (let row = 0; row < Hh / ph; row++) for (let s = 0; s < W / len; s++) {
        const a = s * len + 2, b = row * ph + Math.floor(ph / 2);
        put(a, b, '#2a2a2a'); put(a + 1, b, '#9a9a9a');
      }
    }
    return p;
  };

  H.tiles = function (p, ctx, o = {}) {
    const ts = o.ts || 16, base = C(o.base || '#d8d8d0'), grout = C(o.grout || '#7a7a70'), r = ctx.rng;
    p.fill(grout);
    for (let ty = 0; ty < p.h / ts; ty++) for (let tx = 0; tx < p.w / ts; tx++) {
      const alt = o.alt && (tx + ty) % 2 ? C(o.alt) : base;
      const f = 1 + (r() * 2 - 1) * (o.vary ?? 0.06);
      p.rect(tx * ts + 1, ty * ts + 1, ts - 1, ts - 1, sh(alt, f));
      p.bevel(tx * ts + 1, ty * ts + 1, ts - 1, ts - 1, o.hi || 1.1, o.lo || 0.85);
    }
    p.noise(o.noise ?? 0.05, ctx.seed + 8);
    if (o.grain) p.grain(o.grain, ctx.seed + 9);
    return p;
  };

  H.marble = function (p, ctx, base = '#d8d0c8', vein = '#8a7a78', amount = 0.8) {
    const n = U.fbm(ctx.seed, p.w, 5, 4);
    const b = C(base), v = C(vein);
    p.map((x, y) => {
      const t = Math.abs(Math.sin((x * 0.05 + y * 0.09 + n(x, y) * 6) * Math.PI));
      const k = Math.pow(1 - t, 6) * amount;
      return mix(b, v, k).map(c => c * (0.95 + n(x * 2, y * 2) * 0.1));
    });
    return p;
  };

  /** Damask-ish wallpaper with chair rail and wainscot (64x128). */
  H.wallpaper = function (p, ctx, o) {
    const bg = C(o.bg), fg = C(o.fg), wood = C(o.wood || '#5a3218');
    const top = 80;
    p.rect(0, 0, 64, top, bg);
    for (let x = 0; x < 64; x += 16) p.rect(x, 0, 1, top, sh(bg, 0.85));
    const motif = (cx, cy) => {
      p.ellipse(cx, cy, 2.5, 4, fg); p.px(cx - 1, cy - 6, fg); p.px(cx, cy - 6, fg); p.px(cx - 1, cy + 5, fg); p.px(cx, cy + 5, fg);
      p.line(cx - 5, cy, cx - 3, cy - 2, fg); p.line(cx + 4, cy, cx + 2, cy - 2, fg);
      p.line(cx - 5, cy, cx - 3, cy + 2, fg); p.line(cx + 4, cy, cx + 2, cy + 2, fg);
      p.px(cx, cy, sh(fg, 1.3));
    };
    for (let y = 0; y < top - 4; y += 20) for (let x = 0; x < 64; x += 16) motif(x + 8 + ((y / 20) % 2) * 8, y + 10);
    p.noise(0.06, ctx.seed).grain(0.12, ctx.seed + 1);
    // rail
    p.rect(0, top, 64, 4, sh(wood, 1.2)); p.rect(0, top, 64, 1, sh(wood, 1.6)); p.rect(0, top + 3, 64, 1, sh(wood, 0.6));
    // wainscot panels
    p.rect(0, top + 4, 64, 128 - top - 4, wood);
    for (let x = 0; x < 64; x += 32) {
      p.rect(x + 4, top + 9, 24, 128 - top - 18, sh(wood, 0.9));
      p.bevel(x + 4, top + 9, 24, 128 - top - 18, 0.7, 1.3, 2);
    }
    p.rect(0, 124, 64, 4, sh(wood, 0.7));
    p.grain(0.15, ctx.seed + 2, 64).noise(0.05, ctx.seed + 3);
    return p;
  };

  H.door = function (p, ctx, o = {}) {
    const wood = C(o.wood || '#6a4424');
    H.planks(p, ctx, { vertical: true, ph: 11, len: 64, base: wood, seams: false, vary: 0.12 });
    p.frame(0, 0, 64, 64, sh(wood, 0.4)).frame(1, 1, 62, 62, sh(wood, 0.7));
    for (const y of [10, 50]) { p.rect(2, y, 60, 4, '#3a3a3e'); p.rect(2, y, 60, 1, '#6a6a70'); for (let x = 6; x < 60; x += 12) p.px(x, y + 2, '#9a9aa0'); }
    if (o.color) {
      const c = C(o.color);
      p.rect(0, 0, 64, 3, c).rect(0, 0, 3, 64, c).rect(61, 0, 3, 64, c).rect(0, 61, 64, 3, c);
      p.bevel(0, 0, 64, 64, 1.3, 0.6, 1);
      // emblem plate
      p.rect(24, 22, 16, 20, sh(c, 0.8)); p.bevel(24, 22, 16, 20, 1.4, 0.5, 1);
      p.disc(32, 29, 3, '#101010'); p.rect(31, 30, 2, 6, '#101010');
    } else {
      p.disc(50, 33, 3, '#2a2a2a'); p.ring(50, 36, 3, '#8a8a90');
    }
    return p;
  };

  // ============================================================ WALLS
  T('BRICK_RED', { gen: (p, c) => H.bricks(p, c, { base: '#8a3826', mortar: '#6a625a', tint: '#5a2a20' }) });
  T('BRICK_OLD', { gen: (p, c) => H.bricks(p, c, { base: '#5e4030', mortar: '#2c2622', vary: 0.3, grain: 0.45, tint: '#3a4a30' }) });
  T('BRICK_GRAY', { gen: (p, c) => H.bricks(p, c, { base: '#707074', mortar: '#3a3a3a' }) });
  T('STONE_BLOCKS', { gen: (p, c) => H.blocks(p, c) });
  T('STONE_DARK', { gen: (p, c) => H.blocks(p, c, { base: '#4a4844', mortar: '#1a1816', grain: 0.45 }) });
  T('STONE_MOSSY', {
    gen(p, c) {
      H.blocks(p, c, { base: '#6a6c64' });
      const n = U.fbm(c.seed + 9, 64, 4, 4), m = C('#3a5a24');
      p.map((x, y, col) => { const v = n(x, y) + (y / 64) * 0.25; return v > 0.62 ? mix(col, sh(m, 0.8 + n(x * 3, y * 3) * 0.5), 0.8) : null; });
    },
  });
  T('STONE_ROUGH', { gen: (p, c) => H.voronoi(p, c, { n: 22, base: '#5a544c', edge: '#141210', round: 7, grain: 0.35 }) });
  T('CRYPT_WALL', {
    gen(p, c) {
      H.blocks(p, c, { base: '#5a5850', mortar: '#1a1a18', cracks: 0.5 });
      p.rect(20, 18, 24, 30, '#0c0c0c'); p.ellipse(32, 18, 12, 8, '#0c0c0c');
      p.rect(19, 48, 26, 3, '#7a766c');
      // skull
      p.ellipse(32, 38, 6, 5.5, '#c8c0a8'); p.rect(29, 42, 7, 4, '#b8b098');
      p.disc(29.5, 38, 1.7, '#141414'); p.disc(34.5, 38, 1.7, '#141414'); p.px(32, 41, '#302820');
      p.line(30, 45, 34, 45, '#504838');
    },
  });
  T('HEDGE', {
    gen(p, c) {
      p.fill('#1c3614');
      const r = c.rng, greens = ['#2a5a1c', '#3a6e24', '#23481a', '#4a7e2c', '#305e20', '#5a8e34'];
      for (let i = 0; i < 700; i++) {
        const x = r() * 64, y = r() * 64, g = greens[Math.floor(r() * greens.length)];
        p.ellipse(x, y, 1.2 + r() * 1.6, 0.9 + r() * 1.1, sh(g, 0.8 + r() * 0.4));
      }
      p.noise(0.12, c.seed);
    },
  });
  T('HEDGE_TOP', { gen: (p, c) => { c.call('HEDGE', p); p.mul(0, 0, 64, 64, 1.12); } });
  T('TREELINE', {
    h: 128,
    gen(p, c) {
      const r = c.rng;
      p.vgrad(0, 0, 64, 128, '#0c160a', '#070a06');
      for (let i = 0; i < 5; i++) { // trunks
        const x = Math.floor(r() * 64), w = 3 + Math.floor(r() * 4);
        p.rect(x, 40, w, 88, sh('#3a2a1a', 0.7 + r() * 0.5)); p.rect(x, 40, 1, 88, sh('#5a4028', 0.8));
      }
      const gs = ['#1e3a16', '#28481c', '#163012', '#2e5220', '#1a2e14'];
      for (let i = 0; i < 520; i++) {
        const y = Math.pow(r(), 1.6) * 70, x = r() * 64;
        p.ellipse(x, y, 1.5 + r() * 3, 1.2 + r() * 2, sh(gs[Math.floor(r() * gs.length)], 0.8 + r() * 0.5));
      }
      for (let i = 0; i < 140; i++) p.ellipse(r() * 64, 108 + r() * 20, 1.5 + r() * 2, 1 + r() * 2, sh('#1c3014', 0.7 + r() * 0.5));
      p.noise(0.1, c.seed);
    },
  });
  T('TREE_TOP', { gen: (p, c) => { p.fill('#162c10'); const r = c.rng; for (let i = 0; i < 500; i++) p.ellipse(r() * 64, r() * 64, 1 + r() * 2.5, 1 + r() * 2, sh('#28481c', 0.6 + r() * 0.6)); } });

  T('WALLPAPER_GREEN', { h: 128, gen: (p, c) => H.wallpaper(p, c, { bg: '#2e4a34', fg: '#4e6e48' }) });
  T('WALLPAPER_RED', { h: 128, gen: (p, c) => H.wallpaper(p, c, { bg: '#5a1c22', fg: '#8a3a3a', wood: '#4a2814' }) });
  T('WALLPAPER_BLUE', { h: 128, gen: (p, c) => H.wallpaper(p, c, { bg: '#26304e', fg: '#48587e', wood: '#4a3020' }) });
  T('WALLPAPER_GOLD', { h: 128, gen: (p, c) => H.wallpaper(p, c, { bg: '#6a5a30', fg: '#9a8448', wood: '#3e2410' }) });
  T('WALLPAPER_ROSE', { h: 128, gen: (p, c) => H.wallpaper(p, c, { bg: '#7a5a60', fg: '#a07a80', wood: '#e0d8c8' }) });

  const painting = (bgName) => (p, c) => {
    c.call(bgName, p);
    const r = c.rng;
    const o = 18; // vertical offset: keeps the frame between rail and ceiling
    p.rect(14, 12 + o, 36, 48, '#b08a30'); p.bevel(14, 12 + o, 36, 48, 1.4, 0.5, 2);
    p.rect(18, 16 + o, 28, 40, '#2a2018');
    const hue = ['#6a3a2a', '#2a3a5a', '#3a4a2a', '#4a2a4a'][Math.floor(r() * 4)];
    p.vgrad(18, 16 + o, 28, 40, sh(hue, 0.6), sh(hue, 0.3));
    p.ellipse(32, 30 + o, 6, 7.5, '#c8a080'); p.ellipse(32, 26 + o, 7, 4, sh(hue, 0.25));
    p.disc(29.5, 30 + o, 0.9, '#1a1010'); p.disc(34.5, 30 + o, 0.9, '#1a1010'); p.line(30, 34 + o, 34, 34 + o, '#6a3a30');
    p.poly([[20, 56 + o], [23, 42 + o], [32, 38 + o], [41, 42 + o], [44, 56 + o]], sh(hue, 0.9));
    p.poly([[29, 39 + o], [32, 44 + o], [35, 39 + o]], '#e0d8c8');
    p.noise(0.1, c.seed + 11, 18, 16 + o, 28, 40);
  };
  T('PAINTING_GREEN', { h: 128, gen: painting('WALLPAPER_GREEN') });
  T('PAINTING_RED', { h: 128, gen: painting('WALLPAPER_RED') });
  T('PAINTING_BLUE', { h: 128, gen: painting('WALLPAPER_BLUE') });

  T('WOOD_PANEL', {
    gen(p, c) {
      H.planks(p, c, { vertical: true, ph: 16, len: 64, base: '#5a3419', seams: false });
      p.rect(0, 30, 64, 4, '#3a200e'); p.rect(0, 30, 64, 1, '#7a4a26');
      for (let x = 0; x < 64; x += 16) p.rect(x, 0, 1, 64, '#2a160a');
    },
  });
  T('BOOKSHELF', {
    gen(p, c) {
      const r = c.rng, wood = C('#4a2a14');
      p.fill(sh(wood, 0.35));
      const cols = ['#7a1c1c', '#1c3a6a', '#2a5a2a', '#6a5a1a', '#4a2a4a', '#8a6a3a', '#2a2a2a', '#6a2a14', '#1a4a4a', '#9a8a6a'];
      for (let s = 0; s < 3; s++) {
        const y0 = s * 21 + 2, y1 = y0 + 18;
        let x = 1;
        while (x < 63) {
          const w = 2 + Math.floor(r() * 4), hgt = 11 + Math.floor(r() * 7);
          if (r() < 0.08) { x += w; continue; }
          const col = C(cols[Math.floor(r() * cols.length)]);
          const ww = Math.min(w, 63 - x);
          p.rect(x, y1 - hgt, ww, hgt, col);
          p.rect(x, y1 - hgt, 1, hgt, sh(col, 1.35)); p.rect(x + ww - 1, y1 - hgt, 1, hgt, sh(col, 0.6));
          if (r() < 0.6) p.rect(x, y1 - hgt + 2, ww, 1, '#c8a848');
          if (r() < 0.4) p.rect(x, y1 - 4, ww, 1, '#c8a848');
          x += w;
        }
        p.rect(0, y1, 64, 3, wood); p.rect(0, y1, 64, 1, sh(wood, 1.5)); p.rect(0, y1 + 2, 64, 1, sh(wood, 0.6));
      }
      p.rect(0, 0, 64, 2, wood); p.rect(0, 0, 1, 64, sh(wood, 0.8)); p.rect(63, 0, 1, 64, sh(wood, 0.6));
      p.noise(0.08, c.seed);
    },
  });
  T('TILE_WHITE', { gen: (p, c) => { H.tiles(p, c, { ts: 16, base: '#d0d0c4', grout: '#6a6a60' }); p.rect(0, 40, 64, 8, '#2a4a6a').bevel(0, 40, 64, 8, 1.2, 0.8); } });
  T('TILE_PLAIN', { gen: (p, c) => H.tiles(p, c, { ts: 16, base: '#c8c8bc', grout: '#6a6a60' }) });
  T('MARBLE_WALL', {
    gen(p, c) {
      H.marble(p, c, '#dcd2c8', '#8a6a6a');
      for (let x = 0; x < 64; x += 32) { p.rect(x, 0, 2, 64, '#b89a40'); p.px(x + 1, 0, '#e8d080'); }
      p.rect(0, 0, 64, 3, '#b89a40'); p.rect(0, 61, 64, 3, '#8a6a30');
    },
  });
  T('METAL_PANEL', {
    gen(p, c) {
      p.fill('#5a5e64').grain(0.25, c.seed);
      for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) {
        p.bevel(x, y, 32, 32, 1.3, 0.55, 1);
        for (const [a, b] of [[3, 3], [28, 3], [3, 28], [28, 28]]) { p.px(x + a, y + b, '#a0a4aa'); p.px(x + a + 1, y + b + 1, '#26282c'); }
      }
      const r = c.rng; for (let i = 0; i < 12; i++) { const x = r() * 64, y = r() * 64; p.line(x, y, x + r() * 8 - 4, y + r() * 3, '#7a7e84'); }
      p.noise(0.08, c.seed + 1);
    },
  });
  T('PIPES', {
    gen(p, c) {
      p.fill('#26282a').grain(0.3, c.seed);
      for (const [x, w, col] of [[4, 10, '#6a4a2a'], [22, 14, '#5a5e64'], [44, 8, '#7a5a30'], [56, 6, '#4a4e54']]) {
        for (let i = 0; i < w; i++) { const t = i / (w - 1), f = 0.4 + Math.sin(t * Math.PI) * 0.9 + (t < 0.35 ? 0.2 : 0); p.rect(x + i, 0, 1, 64, sh(col, f)); }
        for (const y of [12, 44]) { p.rect(x - 1, y, w + 2, 4, sh(col, 0.9)); p.bevel(x - 1, y, w + 2, 4, 1.4, 0.6); }
      }
      p.noise(0.08, c.seed + 1);
    },
  });
  T('ATTIC_BOARDS', {
    gen(p, c) {
      H.planks(p, c, { ph: 10, len: 64, base: '#6a5034', vary: 0.25, nails: true });
      for (let y = 0; y < 64; y += 10) p.rect(0, y + 9, 64, 1, '#0e0a06');
      p.grain(0.3, c.seed + 4);
    },
  });
  T('GLASS_PANES', {
    gen(p, c) {
      const r = c.rng;
      p.fill('#6a9a8a');
      const n = U.fbm(c.seed, 64, 3, 4);
      p.map((x, y) => { const v = n(x, y); return v > 0.55 ? sh('#2a5a2a', 0.6 + v * 0.5) : sh('#7aa89a', 0.8 + v * 0.4); });
      for (let i = 0; i < 20; i++) { const x = r() * 64, y = r() * 64; p.line(x, y, x + 3, y - 3, '#c8e8e0'); }
      p.rect(0, 0, 64, 2, '#d8e0d0').rect(0, 0, 2, 64, '#d8e0d0').rect(31, 0, 2, 64, '#c8d0c0').rect(0, 31, 64, 2, '#c8d0c0');
      p.bevel(0, 0, 64, 64, 1.2, 0.8);
    },
  });
  T('PLASTER', {
    gen(p, c) {
      p.fill('#bab2a2').grain(0.18, c.seed).noise(0.04, c.seed + 1);
      const r = c.rng;
      for (let k = 0; k < 2; k++) { let x = r() * 64, y = r() * 64; for (let i = 0; i < 18; i++) { p.px(x, y, '#6a6458'); x += r() * 2 - 0.5; y += r() * 2 - 1; } }
      const n = U.fbm(c.seed + 3, 64, 3, 2); p.map((x, y, col) => (n(x, y) > 0.68 ? sh(col, 0.85) : null));
    },
  });
  T('LAB_PANEL', {
    gen(p, c) {
      c.call('METAL_PANEL', p);
      const r = c.rng;
      for (const [x, y] of [[16, 16], [46, 18]]) { p.disc(x, y, 8, '#1a1a1a'); p.disc(x, y, 7, '#d8d4c0'); p.line(x, y, x + 4, y - 5, '#aa1010'); p.ring(x, y, 7, '#606060'); }
      for (let i = 0; i < 6; i++) p.rect(8 + i * 8, 38, 5, 4, ['#e02020', '#20e020', '#e0e020', '#2080e0'][Math.floor(r() * 4)]).bevel(8 + i * 8, 38, 5, 4, 1.4, 0.5);
      for (let y = 48; y < 60; y += 2) p.rect(8, y, 48, 1, '#1a1c20');
    },
  });
  T('FIREPLACE', {
    gen(p, c) {
      H.blocks(p, c, { base: '#7a7068', bw: 16, bh: 8, cracks: 0.1 });
      p.rect(0, 0, 64, 8, '#4a2e18').bevel(0, 0, 64, 8, 1.4, 0.6);
      p.rect(12, 24, 40, 40, '#0a0806'); p.ellipse(32, 24, 20, 8, '#0a0806');
      const r = c.rng;
      for (let i = 0; i < 40; i++) p.px(14 + r() * 36, 56 + r() * 7, ['#ff6010', '#c02008', '#ffa030', '#601008'][Math.floor(r() * 4)]);
      p.rect(14, 58, 36, 2, '#3a2a1a');
    },
  });
  T('WINDOW_BRICK', {
    h: 128,
    gen(p, c) {
      c.call('BRICK_RED', p); // tiles over all 128 rows
      const x0 = 14, y0 = 30, w = 36, h = 64;
      p.rect(x0 - 3, y0 - 5, w + 6, 5, '#9a948a').bevel(x0 - 3, y0 - 5, w + 6, 5, 1.3, 0.7);
      p.rect(x0 - 4, y0 + h, w + 8, 4, '#9a948a').bevel(x0 - 4, y0 + h, w + 8, 4, 1.3, 0.6);
      p.vgrad(x0, y0, w, h, '#1a2240', '#0a0c18');
      p.line(x0 + 4, y0 + 20, x0 + 14, y0 + 6, '#5a6a9a'); p.line(x0 + 6, y0 + 24, x0 + 16, y0 + 10, '#3a4a7a');
      p.rect(x0 + w / 2 - 1, y0, 2, h, '#2a2420'); p.rect(x0, y0 + h / 2 - 1, w, 2, '#2a2420'); p.frame(x0, y0, w, h, '#2a2420');
    },
  });
  T('WINDOW_INSIDE', {
    h: 128,
    gen(p, c) {
      c.call('PLASTER', p);
      const x0 = 12, y0 = 22, w = 40, h = 70;
      p.rect(x0 - 3, y0 - 3, w + 6, h + 6, '#e0d8c8').bevel(x0 - 3, y0 - 3, w + 6, h + 6, 1.1, 0.7, 2);
      p.vgrad(x0, y0, w, h, '#101838', '#2a2a50');
      const r = c.rng; for (let i = 0; i < 14; i++) p.px(x0 + r() * w, y0 + r() * h * 0.6, '#e0e0ff');
      p.disc(x0 + 28, y0 + 14, 4, '#f0ecd0');
      p.rect(x0 + w / 2 - 1, y0, 2, h, '#e0d8c8'); p.rect(x0, y0 + 30, w, 2, '#e0d8c8');
      p.rect(0, y0 - 6, 64, 3, '#6a1a1a'); // curtain rod-ish
      for (const x of [2, 54]) { p.rect(x, y0 - 4, 8, h + 16, '#7a1a22'); for (let i = 0; i < 8; i += 3) p.rect(x + i, y0 - 4, 1, h + 16, '#4a0a12'); }
      p.rect(x0 - 4, y0 + h + 3, w + 8, 4, '#c8c0b0').bevel(x0 - 4, y0 + h + 3, w + 8, 4, 1.2, 0.6);
    },
  });

  // doors (64x64 = one map unit tall)
  T('DOOR_WOOD', { gen: (p, c) => H.door(p, c) });
  T('DOOR_RED', { gen: (p, c) => H.door(p, c, { color: '#c42020' }) });
  T('DOOR_BLUE', { gen: (p, c) => H.door(p, c, { color: '#2a54d8' }) });
  T('DOOR_YELLOW', { gen: (p, c) => H.door(p, c, { color: '#e0c020' }) });
  T('DOOR_GREEN', { gen: (p, c) => H.door(p, c, { color: '#28a848' }) });
  T('DOOR_FRONT', {
    gen(p, c) {
      H.planks(p, c, { vertical: true, ph: 8, len: 64, base: '#4a2a14', seams: false });
      for (const x of [3, 34]) { p.rect(x, 26, 27, 34, '#3a200e'); p.bevel(x, 26, 27, 34, 1.3, 0.6, 2); }
      p.rect(8, 6, 48, 16, '#e0b050'); p.ellipse(32, 8, 24, 8, '#e0b050');
      p.rect(10, 8, 44, 14, '#f8e0a0'); p.ellipse(32, 9, 21, 6, '#f8e0a0');
      for (let x = 14; x < 54; x += 8) p.rect(x, 4, 1, 18, '#3a200e');
      p.rect(31, 0, 2, 64, '#1a0e06');
      p.rect(27, 36, 3, 8, '#d0a030').rect(34, 36, 3, 8, '#d0a030');
      p.frame(0, 0, 64, 64, '#1a0e06');
    },
  });
  T('GATE_IRON', {
    gen(p, c) {
      p.fill('#0c0c0e');
      for (let x = 2; x < 64; x += 8) { p.rect(x, 0, 3, 64, '#3a3a40'); p.rect(x, 0, 1, 64, '#6a6a74'); p.poly([[x - 1, 6], [x + 1.5, 0], [x + 4, 6]], '#4a4a50'); }
      for (const y of [14, 50]) { p.rect(0, y, 64, 3, '#34343a'); p.rect(0, y, 64, 1, '#6a6a74'); }
      p.rect(28, 28, 8, 10, '#5a5048').bevel(28, 28, 8, 10, 1.4, 0.5);
      p.noise(0.1, c.seed);
    },
  });
  T('SHUTTER', {
    gen(p, c) {
      for (let y = 0; y < 64; y++) p.rect(0, y, 64, 1, sh('#7a7e84', 0.7 + 0.5 * Math.sin((y / 8) * Math.PI * 2)));
      for (let x = -64; x < 64; x += 12) p.poly([[x, 64], [x + 6, 64], [x + 18, 52], [x + 12, 52]], '#e0b010');
      for (let y = 52; y < 64; y++) for (let x = 0; x < 64; x++) if (((x + y) >> 3) % 2) p.px(x, y, '#e0b010'); else p.px(x, y, '#141414');
      p.rect(0, 50, 64, 2, '#3a3a3a');
      p.noise(0.08, c.seed).grain(0.2, c.seed + 1);
    },
  });
  T('PLANKS', {
    gen(p, c) {
      p.fill('#070605');
      const r = c.rng;
      const board = (y, ang, len) => {
        const col = sh('#7a5a34', 0.8 + r() * 0.4);
        for (let i = -4; i <= 4; i++) p.line(-4, y + i, 68, y + i + ang, i === -4 ? sh(col, 1.3) : i === 4 ? sh(col, 0.5) : col);
        p.px(6, y + ang * 0.1, '#9a9a9a'); p.px(58, y + ang * 0.9, '#9a9a9a');
      };
      board(12, 6, 64); board(34, -10, 64); board(52, 3, 64);
      p.noise(0.1, c.seed).grain(0.25, c.seed + 2);
    },
  });
  const switchTex = on => (p, c) => {
    H.blocks(p, c, { base: '#6e6c68' });
    p.rect(22, 14, 20, 36, '#3a3a40').bevel(22, 14, 20, 36, 1.4, 0.5, 2);
    p.rect(30, 22, 4, 20, '#141414');
    if (on) { p.rect(31, 32, 2, 14, '#909098'); p.disc(32, 47, 3, '#c01818'); }
    else { p.rect(31, 18, 2, 14, '#909098'); p.disc(32, 17, 3, '#c01818'); }
    p.disc(38, 18, 1.5, on ? '#30ff30' : '#ff3030');
  };
  T('SWITCH_OFF', { gen: switchTex(false) });
  T('SWITCH_ON', { gen: switchTex(true) });
  const fuseTex = full => (p, c) => {
    c.call('METAL_PANEL', p);
    p.rect(16, 10, 32, 44, '#3a3e44').bevel(16, 10, 32, 44, 1.3, 0.5, 2);
    p.rect(22, 18, 20, 22, '#141414');
    p.rect(26, 20, 12, 3, '#8a7a40'); p.rect(26, 35, 12, 3, '#8a7a40');
    if (full) { p.rect(28, 22, 8, 13, '#c8c0a0'); p.rect(28, 22, 8, 2, '#e8d890'); p.rect(28, 33, 8, 2, '#e8d890'); }
    p.disc(32, 47, 3, full ? '#30ff40' : '#601010');
    p.rect(20, 12, 24, 3, '#e0b010');
  };
  T('FUSEBOX_EMPTY', { gen: fuseTex(false) });
  T('FUSEBOX_FULL', { gen: fuseTex(true) });
  T('PLAQUE', {
    gen(p, c) {
      H.blocks(p, c, { base: '#6e6c68' });
      p.rect(14, 18, 36, 26, '#a08030').bevel(14, 18, 36, 26, 1.5, 0.5, 2);
      for (let y = 23; y < 40; y += 4) p.rect(19, y, 26 - (y % 8), 1, '#4a3a10');
      for (const [x, y] of [[16, 20], [47, 20], [16, 41], [47, 41]]) p.px(x, y, '#302008');
    },
  });
  T('STEP_WOOD', { gen: (p, c) => { for (let y = 0; y < 64; y += 16) { p.rect(0, y, 64, 16, '#5a3a1e'); p.rect(0, y, 64, 3, '#8a6036'); p.rect(0, y + 3, 64, 1, '#2a180a'); } p.grain(0.3, c.seed).noise(0.08, c.seed); } });
  T('STEP_STONE', { gen: (p, c) => { for (let y = 0; y < 64; y += 16) { p.rect(0, y, 64, 16, '#5e5a54'); p.rect(0, y, 64, 3, '#8a867e'); p.rect(0, y + 3, 64, 1, '#1e1c1a'); } p.grain(0.4, c.seed).noise(0.1, c.seed); } });
  T('STEP_CARPET', { gen: (p, c) => { for (let y = 0; y < 64; y += 16) { p.rect(0, y, 64, 16, '#6a1418'); p.rect(0, y, 64, 2, '#d0a840'); p.rect(0, y + 2, 64, 1, '#3a0808'); p.rect(0, y, 6, 16, '#4a2a14'); p.rect(58, y, 6, 16, '#4a2a14'); } p.noise(0.08, c.seed); } });
  T('STARCHART', {
    gen(p, c) {
      p.vgrad(0, 0, 64, 64, '#0c1030', '#141a44');
      const r = c.rng;
      for (let i = 0; i < 40; i++) p.px(r() * 64, r() * 64, r() < 0.3 ? '#ffffff' : '#8890c0');
      p.ring(32, 32, 26, '#6a5a2a'); p.ring(32, 32, 16, '#4a4020');
      const pts = [[12, 14], [22, 20], [30, 12], [40, 18], [48, 30], [36, 44]];
      for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#5a6aa0');
      for (const q of pts) p.disc(q[0], q[1], 1.2, '#fff8c0');
    },
  });
  T('BRASS_RIBS', {
    gen(p, c) {
      p.fill('#2a2830').grain(0.3, c.seed);
      for (const x of [0, 32]) { for (let i = 0; i < 6; i++) p.rect(x + i, 0, 1, 64, sh('#b08a30', 0.5 + Math.sin(i / 5 * Math.PI) * 0.9)); for (let y = 4; y < 64; y += 10) p.px(x + 3, y, '#f0d890'); }
      p.rect(0, 30, 64, 3, '#8a6a20');
    },
  });
  T('CURTAIN', {
    h: 128,
    gen(p, c) {
      p.map((x, y) => sh('#8a1a24', 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((x / 64) * Math.PI * 2 * 5 + Math.sin(y / 20) * 0.3))));
      for (let x = 0; x < 64; x++) p.rect(x, 118, 1, 10 - (x % 3), '#d0a840');
      p.rect(0, 116, 64, 2, '#b08a30');
      p.noise(0.05, c.seed);
    },
  });
  T('WINE_RACK', {
    gen(p, c) {
      p.fill('#120c08');
      for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
        p.disc(x + 8, y + 8, 6, '#1a2a14'); p.disc(x + 8, y + 8, 4, '#0a1208'); p.disc(x + 6, y + 6, 1.2, '#6a8a5a');
        if (c.rng() < 0.2) p.disc(x + 8, y + 8, 6, '#0a0806');
      }
      for (let i = 0; i < 64; i += 16) { p.rect(i, 0, 2, 64, '#5a3a1e'); p.rect(0, i, 64, 2, '#4a2e16'); }
      p.grain(0.2, c.seed);
    },
  });
  T('BARRELS', {
    gen(p, c) {
      p.fill('#100a06');
      for (const [x, y] of [[16, 16], [48, 16], [0, 48], [32, 48], [64, 48]]) {
        p.disc(x, y, 15, '#6a4424'); p.ring(x, y, 15, '#2a2a2a', 2); p.ring(x, y, 9, '#4a2e16');
        for (let k = -12; k <= 12; k += 6) p.line(x - 14, y + k, x + 14, y + k, sh('#6a4424', 0.8));
        p.disc(x, y, 2, '#2a1a0e');
      }
      p.grain(0.25, c.seed).noise(0.08, c.seed);
    },
  });
  T('BOILER', {
    gen(p, c) {
      c.call('METAL_PANEL', p);
      p.mul(0, 0, 64, 64, 0.7);
      p.rect(10, 30, 44, 26, '#1a0a04').bevel(10, 30, 44, 26, 0.6, 1.3, 2);
      for (let x = 14; x < 52; x += 5) p.rect(x, 32, 2, 22, '#2a2a2a');
      const r = c.rng; for (let i = 0; i < 60; i++) p.px(13 + r() * 38, 44 + r() * 10, ['#ff5010', '#c02008', '#ffa030'][Math.floor(r() * 3)]);
      p.disc(32, 16, 7, '#d8d4c0'); p.ring(32, 16, 7, '#3a3a3a'); p.line(32, 16, 36, 11, '#c01010');
    },
  });
  T('CRATE_WALL', {
    gen(p, c) {
      p.fill('#1a120a');
      const r = c.rng;
      for (const [x, y, w, h] of [[0, 0, 32, 32], [32, 0, 32, 32], [0, 32, 21, 32], [21, 32, 22, 32], [43, 32, 21, 32]]) {
        const col = sh('#8a6a3a', 0.75 + r() * 0.4);
        p.rect(x + 1, y + 1, w - 2, h - 2, col).bevel(x + 1, y + 1, w - 2, h - 2, 1.3, 0.55, 2);
        p.line(x + 3, y + 3, x + w - 4, y + h - 4, sh(col, 0.7)); p.line(x + 4, y + 3, x + w - 3, y + h - 4, sh(col, 1.2));
        for (let k = y + 8; k < y + h - 4; k += 8) p.rect(x + 3, k, w - 6, 1, sh(col, 0.75));
      }
      p.grain(0.25, c.seed).noise(0.08, c.seed);
    },
  });
  T('HAZARD', { gen: (p, c) => { p.map((x, y) => (((x + y) >> 3) % 2 ? C('#d8a810') : C('#1a1a1a'))); p.noise(0.1, c.seed).grain(0.2, c.seed); } });
  T('CRUSHER', {
    gen(p, c) {
      c.call('METAL_PANEL', p);
      for (let y = 52; y < 64; y++) for (let x = 0; x < 64; x++) p.px(x, y, ((x + y) >> 3) % 2 ? '#d8a810' : '#1a1a1a');
      for (let x = 2; x < 64; x += 8) p.poly([[x, 62], [x + 3, 64], [x + 6, 62]], '#9a9aa0');
    },
  });

  // ============================================================ FLATS
  T('GRASS', {
    gen(p, c) {
      p.fill('#3a6626').grain(0.45, c.seed, 64, 4, 2);
      const r = c.rng, gs = ['#4e8030', '#2a4e1c', '#5a8e38', '#34602a'];
      for (let i = 0; i < 380; i++) { const x = r() * 64, y = r() * 64; p.line(x, y, x + (r() - 0.5) * 2, y - 1 - r() * 2, gs[Math.floor(r() * 4)]); }
      for (let i = 0; i < 6; i++) p.px(r() * 64, r() * 64, r() < 0.5 ? '#e0e0a0' : '#c080c0');
      p.noise(0.08, c.seed);
    },
  });
  T('DIRT', { gen: (p, c) => { p.fill('#6a5034').grain(0.4, c.seed); const r = c.rng; for (let i = 0; i < 60; i++) p.disc(r() * 64, r() * 64, 0.8 + r(), sh('#8a7458', 0.6 + r() * 0.7)); p.noise(0.1, c.seed); } });
  T('GRAVEL', { gen: (p, c) => { p.fill('#5a564e'); const r = c.rng; for (let i = 0; i < 900; i++) p.disc(r() * 64, r() * 64, 0.6 + r() * 0.9, sh('#8a847a', 0.5 + r() * 0.8)); p.noise(0.08, c.seed); } });
  T('COBBLE', { gen: (p, c) => H.voronoi(p, c, { n: 28, base: '#6e6860', edge: '#262320', round: 5, edgeW: 1.3, vary: 0.25 }) });
  T('FLAGSTONE', { gen: (p, c) => H.voronoi(p, c, { n: 7, base: '#6a6660', edge: '#2a2826', edgeW: 1.1, vary: 0.18, grain: 0.35 }) });
  T('STONE_FLOOR', { gen: (p, c) => H.voronoi(p, c, { n: 9, base: '#4e4a44', edge: '#161412', edgeW: 1.3, vary: 0.2, grain: 0.45 }) });
  T('CRYPT_FLOOR', { gen: (p, c) => H.blocks(p, c, { base: '#4a4842', mortar: '#141412', bw: 32, bh: 32, cracks: 0.8, grain: 0.5 }) });
  T('WOOD_FLOOR', { gen: (p, c) => H.planks(p, c, { ph: 8, len: 32, base: '#76492a' }) });
  T('WOOD_DARK', { gen: (p, c) => H.planks(p, c, { ph: 8, len: 64, base: '#4a2c16', vary: 0.12 }) });
  T('PARQUET', {
    gen(p, c) {
      const r = c.rng;
      for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) {
        const hor = (bx + by) % 2 === 0;
        for (let k = 0; k < 4; k++) {
          const col = sh('#8a5a2e', 0.8 + r() * 0.35);
          if (hor) p.rect(bx * 16, by * 16 + k * 4, 16, 4, col).bevel(bx * 16, by * 16 + k * 4, 16, 4, 1.15, 0.75);
          else p.rect(bx * 16 + k * 4, by * 16, 4, 16, col).bevel(bx * 16 + k * 4, by * 16, 4, 16, 1.15, 0.75);
        }
      }
      p.noise(0.06, c.seed).grain(0.15, c.seed);
    },
  });
  const carpet = (bg, fg, edge) => (p, c) => {
    p.fill(bg).grain(0.15, c.seed).noise(0.08, c.seed + 1);
    const f = C(fg);
    for (const [cx, cy] of [[16, 16], [48, 48], [48, 16], [16, 48]]) {
      const big = (cx === cy);
      p.poly([[cx, cy - 9], [cx + 9, cy], [cx, cy + 9], [cx - 9, cy]], big ? f : sh(f, 0.7));
      p.poly([[cx, cy - 5], [cx + 5, cy], [cx, cy + 5], [cx - 5, cy]], bg);
      p.disc(cx, cy, 1.5, edge);
    }
    p.line(0, 0, 63, 63, sh(f, 0.5)); p.line(63, 0, 0, 63, sh(f, 0.5));
  };
  T('CARPET_RED', { gen: carpet('#6a1418', '#b08a30', '#e0c060') });
  T('CARPET_BLUE', { gen: carpet('#1a2450', '#8a7a40', '#c0b070') });
  T('CARPET_GREEN', { gen: carpet('#1e3a22', '#8a6a30', '#c0a060') });
  T('CHECKER', {
    gen(p, c) {
      const n = U.fbm(c.seed, 64, 4, 4);
      p.map((x, y) => {
        const dark = ((x >> 5) + (y >> 5)) % 2 === 1;
        const v = n(x, y), vein = Math.pow(1 - Math.abs(Math.sin((x * 0.07 + y * 0.04 + v * 5) * Math.PI)), 8);
        const base = dark ? [30, 28, 32] : [220, 214, 204];
        const vc = dark ? [90, 90, 100] : [140, 130, 130];
        return base.map((b, i) => U.lerp(b, vc[i], vein * 0.8) * (0.92 + v * 0.16));
      });
      for (let k = 0; k < 64; k += 32) { p.rect(k, 0, 1, 64, '#6a6060'); p.rect(0, k, 64, 1, '#6a6060'); }
    },
  });
  T('TERRACOTTA', { gen: (p, c) => H.tiles(p, c, { ts: 16, base: '#9a4a2a', grout: '#4a3a30', vary: 0.14, grain: 0.2 }) });
  T('MARBLE_FLOOR', {
    gen(p, c) {
      H.marble(p, c, '#d8d0c4', '#7a6a60', 0.7);
      p.rect(0, 0, 64, 1, '#b89a40').rect(0, 0, 1, 64, '#b89a40').rect(0, 32, 64, 1, '#8a7a50').rect(32, 0, 1, 64, '#8a7a50');
    },
  });
  T('CEIL_PLASTER', { gen: (p, c) => { p.fill('#a8a090').grain(0.15, c.seed).noise(0.04, c.seed); p.frame(0, 0, 64, 64, '#8a8274'); } });
  T('CEIL_BEAMS', {
    gen(p, c) {
      c.call('CEIL_PLASTER', p);
      for (const y of [0, 32]) { p.rect(0, y, 64, 8, '#4a2c16'); p.bevel(0, y, 64, 8, 1.3, 0.6); }
      p.grain(0.1, c.seed + 3);
    },
  });
  T('CEIL_STONE', { gen: (p, c) => H.blocks(p, c, { base: '#4a4640', mortar: '#161412', bw: 32, bh: 32, grain: 0.45 }) });
  T('CEIL_METAL', { gen: (p, c) => { c.call('METAL_PANEL', p); p.mul(0, 0, 64, 64, 0.8); } });
  T('CEIL_ATTIC', {
    gen(p, c) {
      H.planks(p, c, { ph: 8, len: 64, base: '#4a3620', vary: 0.3 });
      for (const x of [0, 32]) { p.rect(x, 0, 6, 64, '#2e1e10'); p.bevel(x, 0, 6, 64, 1.3, 0.6); }
    },
  });
  T('GRATE', {
    gen(p, c) {
      p.fill('#0a0a0a');
      for (let i = 0; i < 64; i += 8) { p.rect(i, 0, 3, 64, '#4a4c50'); p.rect(0, i, 64, 3, '#5a5c60'); p.px(i, i, '#8a8c90'); }
      p.noise(0.15, c.seed);
    },
  });
  const liquid = (a, b, hi, bubbles) => ({
    frames: 8, fps: 6,
    gen(p, c) {
      const t = c.t * Math.PI * 2, A = C(a), B = C(b), Hh = C(hi);
      const n = U.fbm(1234, 64, 3, 4);
      p.map((x, y) => {
        const w = Math.sin((x / 64) * Math.PI * 4 + t + Math.sin((y / 64) * Math.PI * 2) * 2) + Math.sin((y / 64) * Math.PI * 2 * 3 - t + n(x, y) * 4);
        const k = U.clamp(0.5 + w * 0.25, 0, 1);
        const col = mix(A, B, k);
        return w > 1.55 ? mix(col, Hh, 0.6) : col;
      });
      if (bubbles) { const r = U.rng(99 + c.frame); for (let i = 0; i < 6; i++) p.ring(r() * 64, r() * 64, 1.5 + r() * 1.5, hi); }
    },
  });
  T('WATER', liquid('#10304e', '#2a6a8a', '#8ac8e0', false));
  T('SLUDGE', Object.assign(liquid('#1e4a0c', '#4a9a1a', '#b0ff60', true), { emissive: false }));
  T('LAVA', Object.assign(liquid('#801808', '#e05010', '#ffd040', true), { emissive: true }));
  T('ELECTRIC', {
    frames: 4, fps: 12, emissive: true,
    gen(p, c) {
      p.fill('#101828');
      const r = U.rng(77 + c.frame * 13);
      for (let k = 0; k < 5; k++) {
        let x = r() * 64, y = 0;
        while (y < 64) { const nx = x + (r() * 12 - 6), ny = y + 4 + r() * 6; p.line(x, y, nx, ny, '#80c0ff'); p.line(x + 1, y, nx + 1, ny, '#f0f8ff'); x = nx; y = ny; }
      }
      p.frame(0, 0, 64, 64, '#3050a0');
    },
  });
  T('ELECTRIC_OFF', {
    gen(p, c) {
      c.call('METAL_PANEL', p);
      p.mul(0, 0, 64, 64, 0.75);
      for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) { p.ring(x, y, 5, '#b06a2a', 2); p.disc(x, y, 1.5, '#3a3a3a'); }
    },
  });
  T('SLATE_ROOF', { gen: (p, c) => { const r = c.rng; for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 12) { const o = (y / 8) % 2 * 6; p.rect(x + o, y, 11, 8, sh('#3a3e4a', 0.8 + r() * 0.4)).bevel(x + o, y, 11, 8, 1.2, 0.6); } p.noise(0.1, c.seed); } });
  T('LAMP_CEIL', {
    emissive: false,
    gen(p, c) {
      c.call('CEIL_PLASTER', p);
      p.disc(32, 32, 14, '#b89a40'); p.disc(32, 32, 11, '#fff4c0'); p.disc(32, 32, 7, '#ffffff');
    },
  });
  T('DOME', { gen: (p, c) => { c.call('STARCHART', p); for (let x = 0; x < 64; x += 16) p.rect(x, 0, 2, 64, '#8a6a20'); } });

  // ============================================================ SKIES
  T('SKY_DUSK', {
    w: 512, h: 128, sky: true,
    gen(p, c) {
      const stops = [[0, '#07061a'], [40, '#1c1840'], [70, '#4a2e5e'], [88, '#9a4a5e'], [100, '#e08a5a']];
      for (let y = 0; y < 128; y++) {
        let a = stops[0], b = stops[stops.length - 1];
        for (let i = 0; i + 1 < stops.length; i++) if (y >= stops[i][0] && y <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
        const t = b[0] === a[0] ? 0 : U.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
        p.rect(0, y, 512, 1, mix(a[1], b[1], t));
      }
      const r = c.rng;
      for (let i = 0; i < 160; i++) { const y = 4 + Math.pow(r(), 1.8) * 66; p.px(r() * 512, y, r() < 0.2 ? '#ffffff' : '#a0a0d0'); }
      // clouds
      const n = U.fbm(c.seed, 512, 5, 8);
      p.map((x, y, col) => {
        if (y < 30 || y > 100) return null;
        const band = Math.exp(-Math.pow((y - 72) / 16, 2));
        const v = n(x, y * 3) * band;
        return v > 0.42 ? mix(col, y > 80 ? '#c06a6a' : '#3a2a50', U.clamp((v - 0.42) * 4, 0, 0.85)) : null;
      });
      // moon
      p.disc(140, 34, 9, '#f8f0d0'); p.disc(137, 32, 2, '#d8d0b0'); p.disc(143, 37, 1.5, '#d8d0b0');
      for (let rr = 10; rr < 16; rr++) p.ring(140, 34, rr, '#7a6a8a', 1);
      // distant hills & tree silhouettes
      for (let x = 0; x < 512; x++) {
        const hh = 100 - (6 + 5 * Math.sin(x / 512 * Math.PI * 2 * 3) + 3 * Math.sin(x / 512 * Math.PI * 2 * 7 + 1) + 2 * Math.sin(x / 512 * Math.PI * 2 * 17));
        const tree = (Math.sin(x * 0.9) * Math.sin(x * 0.37) > 0.3) ? 4 + Math.abs(Math.sin(x * 1.7)) * 4 : 0;
        p.rect(x, Math.floor(hh - tree), 1, 128 - Math.floor(hh - tree), '#0a0a14');
      }
    },
  });
  T('SKY_NIGHT', {
    w: 512, h: 128, sky: true,
    gen(p, c) {
      p.vgrad(0, 0, 512, 128, '#02030c', '#141a3a');
      const r = c.rng;
      for (let i = 0; i < 400; i++) p.px(r() * 512, 4 + r() * 96, r() < 0.25 ? '#ffffff' : r() < 0.5 ? '#c0c8ff' : '#6a70a0');
      const n = U.fbm(c.seed + 1, 512, 5, 8);
      p.map((x, y, col) => { const band = Math.exp(-Math.pow((y - 30 - x * 0.05 % 30) / 20, 2)); const v = n(x, y * 2) * band; return v > 0.35 ? mix(col, '#5a5a8a', (v - 0.35) * 0.9) : null; });
      p.disc(380, 30, 10, '#fffae0');
      for (let x = 0; x < 512; x++) { const hh = 108 - 4 * Math.sin(x / 512 * Math.PI * 6) - 2 * Math.sin(x / 512 * Math.PI * 22); p.rect(x, Math.floor(hh), 1, 128 - Math.floor(hh), '#05060c'); }
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
