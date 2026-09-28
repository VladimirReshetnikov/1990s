/*
 * Hourglass — dungeon & palace art (textures, sprites) and default sound
 * effects, on top of the stock RetroEngine library. Every shared name the
 * levels use is defined here; a level adds its own names prefixed with its id
 * (CELLS_, CHASM_, BLADES_, FORGE_, TOWER_...).
 *
 * READABILITY (design review §2):
 *  - every walkable floor is ONE flagstone per 64x64 map cell with a dark joint
 *    on the cell grid, so gaps can be counted before a jump;
 *  - loose flags are pale, cracked and sit in a wide black gap; plates are raised
 *    bronze; the exit glows; the abyss is black with a faint mist;
 *  - colours are exact entries of the palette ramps (K below), so they survive
 *    quantization and the light tables without drifting to green or grey.
 *
 * WALLS repeat every 1.0 unit and are anchored to world z (doors: to their
 * bottom edge). The top 0.25 of a 1.25 corridor shows rows 48..63 again, so single
 * features (lever, carving, chains, sconce) live in rows 4..47. Storeys are 1.5
 * apart: on odd storeys (z = 1.5, 4.5 ...) a feature face shows shifted by half
 * a unit until the engine pegs rock faces to their band.
 *
 * CATALOGUE (besides the names below that the campaign already used)
 *  floors  SAND_FLOOR DUNGEON_FLOOR PALACE_FLOOR CHECK_LIGHT/CHECK_DARK (alternate them
 *          for a checkerboard) SKID_EW/SKID_NS (run-up scuffs along x / y) GRATE_FLOOR
 *          LIFT_PLANKS SLAG (cool crust) SLAG_HOT (glowing: cycle texOn) HAMMER (crusher
 *          face, as ctex) LOOSE_FLAT PLATE_FLAT EXIT_FLAT ABYSS CARPET_PERSIAN PALACE_TILE
 *  walls   DUNGEON_WALL DUNGEON_BRICK SANDSTONE SANDSTONE_DARK TOWER_STONE CAVE_ROCK
 *          FUNGUS_WALL LAVA_ROCK IRON_WALL PALACE_TILE PALACE_ARCH (128) EXIT_DOOR (128,
 *          a door tex) DART_SLOTS LEVER_UP/LEVER_DOWN CARVING CHAIN_WALL TORCH_WALL
 *          (emissive sconce) LEDGE (use as `low`: a coping stone right at the lip)
 *  skies   STARS (night over the palace) DAWN (the roof at daybreak) — level `sky`
 *  sprites TORCH BRAZIER BRAZIER_LIT POTION_RED POTION_BIG POTION_BLUE SEAL SKULL NOTE
 *          SKELETON_SITTING SKELETON_CLEAVED SKELETON_SPLINT CHAINS (hangs) SANDGLASS
 *          (timer pillar: at timed plates and gates) CRATE_SMALL RUBBLE LOOSE_TILE BOULDER
 *          DART DUST ROCK PEBBLES (hangs: grit under a crumbling bridge) FUNGUS CART
 *          CART_SMASHED ANVIL URN BANNER (hangs) HOURGLASS_GREAT SPIKES_UP SPIKES_DOWN
 */
(function (R) {
  'use strict';
  const U = R.util, C = R.hex, T = R.defTexture, S = R.defSprite, H = R.texHelpers;
  const sh = (c, f) => { c = C(c); return [c[0] * f, c[1] * f, c[2] * f]; };
  const mix = (a, b, t) => { a = C(a); b = C(b); return [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t)]; };

  // ------------------------------------------------------------ palette picks (exact ramp entries)
  const K = {
    // ramp 1 brown
    b0: '#140a04', b1: '#221309', b2: '#2f1c0d', b3: '#3d2512', b4: '#4a2e16', b5: '#58371b', b6: '#66401f', b7: '#734924',
    b8: '#82562e', b9: '#91663d', b10: '#a0774c', b11: '#af875b', b12: '#be976a', b13: '#cea77a', b14: '#ddb889',
    // ramp 3 tan
    t4: '#6d4527', t5: '#81532f', t6: '#966038', t7: '#aa6d40', t8: '#b97b4c', t9: '#c38a5c', t10: '#cd986c', t11: '#d7a67c', t12: '#e1b58c', t13: '#ebc39c', t14: '#f5d2ac',
    // ramp 4 gold / bronze
    g2: '#463709', g3: '#5d490e', g4: '#745c12', g5: '#8b6e17', g6: '#a2801b', g7: '#b99320', g8: '#c8a22b', g9: '#d0ae3e', g10: '#d8bb51',
    g11: '#e0c764', g12: '#e7d377', g13: '#efdf8a', g14: '#f7ec9d', g15: '#fff8b0',
    // ramp 13 khaki stone
    s1: '#231f14', s2: '#332f20', s3: '#443e2c', s4: '#544e38', s5: '#655d44', s6: '#756d50', s7: '#867c5c', s8: '#968c6b', s9: '#a59c7c',
    s10: '#b4ab8e', s11: '#c3bba0', s12: '#d2cbb1', s13: '#e1dbc3', s14: '#f0ead4',
    // ramp 11 slate (iron, steel, night)
    i1: '#12141a', i2: '#1d2027', i3: '#282c35', i4: '#333842', i5: '#3e4450', i6: '#49505e', i7: '#545c6b', i8: '#626a7a', i9: '#737b8b',
    i10: '#848c9b', i11: '#959dac', i12: '#a6aebc', i13: '#b6becd', i14: '#c7cfdd', i15: '#d8e0ee',
    // ramp 12 rust
    r3: '#37150e', r4: '#431a11', r5: '#4f1f14', r6: '#5c2417', r7: '#68291a', r8: '#753322', r9: '#83422e', r10: '#91503b', r11: '#9f5e47', r12: '#ae6d53',
    // ramp 2 red
    red3: '#4e0f0f', red5: '#711818', red7: '#952020', red9: '#b13b36', red11: '#cb5d52', red13: '#e57e6d',
    // grey
    k1: '#0f0f0f', k2: '#1d1d1d', k3: '#2c2c2c', k4: '#3b3b3b', k5: '#494949', k6: '#585858', k8: '#787878', k10: '#9e9e9e', k12: '#c5c5c5',
    // fire (specials + light ramps)
    fRed: '#ff0000', fOrange: '#ff8000', fYellow: '#ffff00', fPale: '#fff8b0', fCream: '#fff0c0', white: '#ffffff',
    // teal / blue / green
    c3: '#10434a', c5: '#19656d', c7: '#228791', c9: '#40a6ac', c11: '#65c4c4', c13: '#8be1dc', c15: '#b0fff4',
    u2: '#0e183f', u3: '#132252', u4: '#192c65', u5: '#1e3677', u7: '#29499d', u9: '#4a6ab8', u11: '#7190d0',
    n5: '#248124', n7: '#31ad31', n9: '#53c64d', n11: '#7dd96e', n13: '#a6ec8f',
    v1: '#19082a', v2: '#260e3c', v3: '#32134e',
  };

  // ------------------------------------------------------------ helpers
  /** Multiply a ring k texels in from the edge. */
  const ring = (p, k, f, w = 64, h = 64) => {
    p.mul(k, k, w - 2 * k, 1, f).mul(k, h - 1 - k, w - 2 * k, 1, f);
    p.mul(k, k + 1, 1, h - 2 - 2 * k, f).mul(w - 1 - k, k + 1, 1, h - 2 - 2 * k, f);
  };
  /** A bevel ring: top/left edges x hi, bottom/right edges x lo. */
  const bev = (p, x, y, w, h, hi, lo) => {
    p.mul(x, y, w, 1, hi).mul(x, y + 1, 1, h - 1, hi);
    p.mul(x + 1, y + h - 1, w - 1, 1, lo).mul(x + w - 1, y + 1, 1, h - 2, lo);
  };
  /** A wandering hairline crack. */
  const crack = (p, r, x, y, len, col, hiCol, a) => {
    a = a ?? r() * Math.PI * 2;
    for (let i = 0; i < len; i++) {
      p.px(x, y, col);
      if (hiCol) p.px(x + 1, y + 1, hiCol);
      x += Math.cos(a); y += Math.sin(a); a += (r() - 0.5) * 0.9;
    }
  };
  /** Stone body: two ramp colours dithered by low-frequency noise, then grain. */
  const body = (p, c, x0, y0, w, h, A, B, t, grain, seed) => {
    const n = U.fbm(seed, 64, 3, 2), r = U.rng(seed + 7);
    A = C(A); B = C(B);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const v = n(x & 63, y & 63);
      p.px(x, y, r() < U.clamp(t + (v - 0.5) * 1.6, 0, 1) ? B : A);
    }
    p.grain(grain, seed + 3, 64, 3, 2);
  };

  /**
   * One flagstone per cell. o: { A, B, mix, paint(p, c) (a custom body instead of A/B),
   * joint, jw (joint width per side), grain, noise, specks, cracks, lit (worn-edge
   * highlight), detail(p, r) }.
   * The joint is on the cell grid: rows/cols 0..jw-1 and 64-jw..63.
   */
  function flag(p, c, o) {
    const r = c.rng, jw = o.jw ?? 2;
    if (o.paint) o.paint(p, c); else body(p, c, 0, 0, 64, 64, o.A, o.B || o.A, o.mix ?? 0.3, o.grain ?? 0.18, c.seed + 11);
    p.noise(o.noise ?? 0.05, c.seed + 2);
    const A = C(o.A);
    for (let i = 0; i < (o.specks ?? 26); i++) {
      const x = 5 + r() * 54, y = 5 + r() * 54, d = r() < 0.65;
      p.px(x, y, sh(A, d ? 0.62 : 1.22));
      if (d && r() < 0.4) p.px(x + 1, y, sh(A, 0.75));
    }
    for (let i = 0; i < (o.cracks ?? 1); i++) crack(p, r, 12 + r() * 40, 12 + r() * 40, 6 + r() * 10, sh(A, 0.5), null);
    if (o.detail) o.detail(p, r);
    // worn edge: light catches the rounded rim; a shadow line under it
    ring(p, jw, o.lit ?? 1.22); ring(p, jw + 1, 1.08); ring(p, jw + 2, 0.94);
    // the joint on the cell grid
    const J = C(o.joint || K.b1);
    for (let k = 0; k < jw; k++) {
      for (let i = k; i < 64 - k; i++) for (const [x, y] of [[i, k], [i, 63 - k], [k, i], [63 - k, i]]) p.px(x, y, sh(J, 0.85 + r() * 0.3));
    }
  }

  /**
   * Ashlar masonry with irregular block lengths per course, per-block colour
   * and chiselled faces. o: { bh (course height), layouts: [[w, w, ...], ...] block
   * widths summing to 64 (one picked per course), cols: [[A, B], ...] per-block
   * colour pairs, mix, mortar, vary, cracks, chips, grain, noise }.
   */
  function ashlar(p, c, o) {
    const r = c.rng, bh = o.bh || 16, M = C(o.mortar || K.b1);
    p.fill(M).noise(0.25, c.seed + 1);
    const layouts = o.layouts || [[32, 32], [24, 20, 20], [20, 24, 20], [16, 28, 20], [28, 18, 18]];
    for (let row = 0; row < p.h / bh; row++) {
      const lay = layouts[Math.floor(r() * layouts.length)];
      let x = Math.floor(r() * 64);
      for (const w of lay) {
        const y = row * bh;
        const [A, B] = o.cols[Math.floor(r() * o.cols.length)];
        const f = 1 + (r() * 2 - 1) * (o.vary ?? 0.08);
        body(p, c, x + 1, y + 1, w - 1, bh - 1, sh(A, f), sh(B, f), o.mix ?? 0.35, 0, c.seed + 100 + row * 7 + x);
        bev(p, x + 1, y + 1, w - 1, bh - 1, 1.24, 0.62);
        bev(p, x + 2, y + 2, w - 3, bh - 3, 1.07, 0.86);
        if (r() < (o.cracks ?? 0.25)) crack(p, r, x + 3 + r() * (w - 6), y + 2, 3 + r() * (bh - 4), sh(A, 0.45), null, Math.PI / 2 + (r() - 0.5));
        if (r() < (o.chips ?? 0.4)) { const cx = x + 1 + (r() < 0.5 ? 0 : w - 3), cy = y + 1 + (r() < 0.5 ? 0 : bh - 3); p.rect(cx, cy, 2, 2, M); }
        x += w;
      }
    }
    p.grain(o.grain ?? 0.22, c.seed + 3).noise(o.noise ?? 0.07, c.seed + 4);
    return p;
  }

  /** A flickering flame with its base at (cx, by). */
  function flame(p, cx, by, h, w, seed, o = {}) {
    const r = U.rng(seed), lean = (r() - 0.5) * (o.lean ?? 1.6);
    for (let j = 0; j < h; j++) {
      const t = j / (h - 1), y = by - j;
      const hw = w * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.3) / (t < 0.3 ? 0.5 : 0.7), 2))) * (0.85 + r() * 0.3);
      const x = cx + lean * t * t * w + Math.sin(t * 9 + seed * 1.7) * 0.6 * t;
      if (hw < 0.3) { if (r() < 0.6) p.px(x, y, K.fOrange); continue; }
      p.rect(x - hw, y, hw * 2, 1, t > 0.75 ? K.red11 : K.fOrange);
      if (t < 0.8) p.rect(x - hw * 0.62, y, hw * 1.24, 1, t > 0.55 ? K.fOrange : K.g11);
      if (t < 0.55) p.rect(x - hw * 0.36, y, hw * 0.72, 1, t < 0.3 ? K.white : K.fPale);
    }
    for (let i = 0; i < (o.sparks ?? 2); i++) p.px(cx + (r() - 0.5) * w * 2.2, by - h - 1 - r() * (o.sparkH ?? 4), r() < 0.5 ? K.fPale : K.fOrange);
  }

  /** DUNGEON_WALL painted once, as the base of the feature walls (levers, carvings, sconces...). */
  let wallCache = null, wallDef = null;
  const dungeonWall = p => {
    if (!wallCache || wallDef !== R.textures.get('DUNGEON_WALL')) { wallDef = R.textures.get('DUNGEON_WALL'); wallCache = R.paint(R.textures, 'DUNGEON_WALL'); }
    p.blit(wallCache, 0, 0);
  };

  // ============================================================ WALLS
  const DUNGEON_COLS = [[K.b8, K.s6], [K.b7, K.s5], [K.t5, K.b7], [K.b9, K.s7], [K.b6, K.s5]];
  T('DUNGEON_WALL', { gen: (p, c) => ashlar(p, c, { bh: 16, cols: DUNGEON_COLS, mortar: K.b1, mix: 0.4 }) });
  T('DUNGEON_BRICK', { gen: (p, c) => ashlar(p, c, { bh: 8, layouts: [[16, 16, 16, 16], [12, 16, 20, 16], [16, 20, 12, 16]], cols: [[K.b8, K.r9], [K.b7, K.r8], [K.b8, K.b7], [K.r9, K.r10]], mortar: K.b2, mix: 0.35, cracks: 0.1, chips: 0.2, grain: 0.18 }) });
  T('SANDSTONE', { gen: (p, c) => ashlar(p, c, { bh: 16, layouts: [[32, 32], [28, 36], [40, 24]], cols: [[K.b10, K.t7], [K.b11, K.b10], [K.b10, K.t8], [K.b9, K.t7]], mortar: K.b3, mix: 0.3, cracks: 0.3, grain: 0.18 }) });
  T('SANDSTONE_DARK', { gen: (p, c) => ashlar(p, c, { bh: 16, layouts: [[32, 32], [28, 36], [40, 24]], cols: [[K.b6, K.b7], [K.b5, K.b6], [K.b6, K.t4]], mortar: K.b1, mix: 0.3, cracks: 0.35, grain: 0.2, noise: 0.05 }) });
  T('TOWER_STONE', { gen: (p, c) => ashlar(p, c, { bh: 16, layouts: [[32, 32], [24, 40], [40, 24]], cols: [[K.s10, K.t12], [K.s11, K.s10], [K.s9, K.t11], [K.s10, K.s11]], mortar: K.s4, mix: 0.25, cracks: 0.12, chips: 0.2, grain: 0.14 }) });
  T('CAVE_ROCK', { gen: (p, c) => H.voronoi(p, c, { n: 16, base: K.s4, edge: K.b0, round: 8, edgeW: 1.4, vary: 0.3, grain: 0.4, color: q => (q[3] < 0.35 ? sh(K.b6, q[2]) : sh(K.s5, q[2])) }) });
  T('LAVA_ROCK', {
    gen(p, c) {
      H.voronoi(p, c, { n: 14, base: K.k3, edge: K.fOrange, round: 7, edgeW: 1.2, vary: 0.35, grain: 0.35, color: q => (q[3] < 0.4 ? sh(K.r4, q[2]) : sh(K.k3, q[2])) });
      // the seams glow hotter towards the bottom of each metre
      p.map((x, y, col) => (col[0] > 200 && col[1] > 90 ? (y > 40 ? C(K.fYellow) : y > 20 ? C(K.fOrange) : C(K.red9)) : null));
    },
  });

  T('PALACE_TILE', {
    gen(p, c) {
      // a 4x4 panel of glazed tiles framed on the 1-unit grid (reads as one panel per cell on floors)
      p.fill(K.b3);
      for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
        const x = 4 + tx * 14, y = 4 + ty * 14, blue = (tx + ty) % 2 === 0;
        p.rect(x, y, 13, 13, blue ? K.c5 : K.s12);
        bev(p, x, y, 13, 13, 1.25, 0.7);
        if (blue) { p.poly([[x + 6.5, y + 2], [x + 11, y + 6.5], [x + 6.5, y + 11], [x + 2, y + 6.5]], K.c9); p.disc(x + 6.5, y + 6.5, 1.6, K.g10); }
        else { p.ring(x + 6.5, y + 6.5, 4, K.u7, 1); p.disc(x + 6.5, y + 6.5, 1.5, K.u5); }
      }
      p.noise(0.04, c.seed);
      // gilt frame on the cell edge
      for (let k = 0; k < 3; k++) p.frame(k, k, 64 - 2 * k, 64 - 2 * k, [K.b2, K.g7, K.g5][k]);
      bev(p, 1, 1, 62, 62, 1.25, 0.7);
    },
  });
  T('PALACE_ARCH', {
    h: 128,
    gen(p, c) {
      ashlar(p, c, { bh: 16, layouts: [[32, 32], [24, 40]], cols: [[K.s11, K.s10], [K.s12, K.s11], [K.s10, K.t12]], mortar: K.s6, mix: 0.2, cracks: 0.05, chips: 0.1, grain: 0.1 });
      // a pointed (Persian) arch niche with a hanging lamp
      const niche = (x, y) => y >= 34 && y < 116 && Math.abs(x + 0.5 - 32) < 15 - (y < 50 ? Math.pow((50 - y) / 16, 1.6) * 15 : 0);
      p.map((x, y, col) => (niche(x, y) ? mix(K.u2, K.u4, U.clamp((y - 34) / 90, 0, 1)) : null));
      for (let y = 30; y < 118; y++) for (let x = 14; x < 51; x++) {
        if (niche(x, y)) continue;
        if (niche(x - 1, y) || niche(x + 1, y) || niche(x, y + 1) || niche(x - 2, y) || niche(x + 2, y) || niche(x, y + 2)) p.px(x, y, K.g8);
      }
      p.rect(14, 116, 37, 4, K.g6); bev(p, 14, 116, 37, 4, 1.3, 0.6);
      p.line(32, 40, 32, 62, K.g5); p.disc(32, 66, 4, K.g7); p.disc(32, 67, 2, K.fPale); p.poly([[29, 70], [35, 70], [32, 74]], K.g6);
      for (const [x, y] of [[24, 84], [40, 90], [30, 100], [22, 104], [42, 76]]) p.px(x, y, K.u9);
    },
  });

  // portcullis: see-through (transparent between the bars), drawn on the gate cell's mid-plane;
  // 2 units tall, bottom-pegged so the spiked foot rises with the gate
  T('GATE_BARS', {
    h: 128,
    gen(p, c) {
      const r = c.rng;
      for (let x = 3; x < 64; x += 9) {
        p.rect(x, 0, 4, 120, K.i5); p.rect(x, 0, 1, 120, K.i10); p.rect(x + 1, 0, 1, 120, K.i8); p.rect(x + 3, 0, 1, 120, K.i2);
        for (let i = 0; i < 6; i++) { const y = r() * 118; p.rect(x + 1, y, 2, 1 + r() * 3, K.r8); }
      }
      for (const y of [12, 60, 104]) {
        p.rect(0, y, 64, 5, K.i4); p.rect(0, y, 64, 1, K.i11); p.rect(0, y + 1, 64, 1, K.i8); p.rect(0, y + 4, 64, 1, K.i1);
        for (let x = 3; x < 64; x += 9) { p.disc(x + 2, y + 2.5, 1.6, K.i9); p.px(x + 1, y + 1, K.i13); }
      }
      for (let x = 3; x < 64; x += 9) { p.poly([[x - 1, 119], [x + 2, 128], [x + 5, 119]], K.i9); p.line(x + 2, 120, x + 2, 126, K.i14); }
    },
  });
  // slicer jaws: stretched over the corridor's full height; frame 0 open (tucked into floor
  // and ceiling), frame 3 shut (teeth meeting at waist height)
  T('SLICER_JAWS', {
    frames: 4,
    gen(out, c) {
      const p = new R.Pix(64, 64, false);                    // no wrap: the tucked jaws must not spill over
      const k = c.frame / 3, gap = 4 + (1 - k) * 26, mid = 34;
      const top = mid - gap, bot = mid + gap;
      const jaw = (y0, y1, down) => {
        if (y1 <= y0) return;
        p.vgrad(4, y0, 56, y1 - y0, down ? K.i8 : K.i11, down ? K.i11 : K.i8);
        p.rect(4, y0, 2, y1 - y0, K.i3); p.rect(58, y0, 2, y1 - y0, K.i3);
        for (let x = 12; x < 56; x += 14) for (let y = y0 + 3; y < y1 - 2; y += 8) { p.px(x, y, K.i13); p.px(x + 1, y + 1, K.i3); }
      };
      jaw(0, Math.max(0, top - 3), false);
      jaw(Math.min(64, bot + 3), 64, true);
      for (let x = 4; x < 60; x += 7) {
        p.poly([[x, top - 3], [x + 3.5, top + 3], [x + 7, top - 3]], K.i13); p.line(x + 1, top - 3, x + 3, top + 1, K.white);
        p.poly([[x, bot + 3], [x + 3.5, bot - 3], [x + 7, bot + 3]], K.i13); p.line(x + 1, bot + 3, x + 3, bot - 1, K.white);
      }
      p.rect(4, Math.max(0, top - 4), 56, 1, K.i15); p.rect(4, Math.min(63, bot + 3), 56, 1, K.i15);
      if (k > 0.9) { p.rect(22, top - 8, 3, 12, K.red7); p.rect(40, bot - 3, 2, 9, K.red5); p.px(23, top + 4, K.red7); }
      out.blit(p, 0, 0);
    },
  });

  T('EXIT_DOOR', {
    h: 128,
    gen(p, c) {
      ashlar(p, c, { bh: 16, layouts: [[32, 32], [24, 40]], cols: [[K.b10, K.t7], [K.b11, K.b10]], mortar: K.b3, mix: 0.3, cracks: 0.2, grain: 0.15 });
      // the door fills the bottom 80 rows (a 1.25 corridor): a pointed arch, double doors, gold
      const inArch = (x, y, m) => y >= 50 + m && Math.abs(x + 0.5 - 32) < 27 - m - (y < 72 + m ? Math.pow((72 + m - y) / 22, 1.6) * (27 - m) : 0);
      for (let y = 44; y < 128; y++) for (let x = 0; x < 64; x++) {
        if (inArch(x, y, 0)) {
          const leaf = x < 32 ? x - 5 : 58 - x, plank = Math.floor((x - 5) / 6);
          let col = sh(plank % 2 ? K.b5 : K.b6, 0.9 + ((x * 7 + plank * 13) % 5) * 0.03);
          if (!inArch(x, y, 3)) col = C(K.g8);
          else if (Math.abs(x + 0.5 - 32) < 1) col = C(K.b1);
          p.px(x, y, col);
          if (leaf < 0) p.px(x, y, K.g8);
        } else if (inArch(x, y, -3)) p.px(x, y, K.g5);
      }
      for (const y of [80, 100, 118]) for (let x = 8; x < 57; x += 6) if (inArch(x, y, 3)) { p.px(x, y, K.g13); p.px(x + 1, y + 1, K.g4); }
      p.rect(26, 92, 3, 8, K.g10); p.rect(35, 92, 3, 8, K.g10); p.ring(27.5, 101, 2, K.g8); p.ring(36.5, 101, 2, K.g8);
      p.disc(32, 66, 4, K.g9); p.disc(32, 66, 2, K.red9);
      p.rect(0, 124, 64, 4, K.s6); bev(p, 0, 124, 64, 4, 1.3, 0.6);
    },
  });

  // dart slots: dark slits at dart height (0.42 above the floor) on every storey
  T('DART_SLOTS', {
    gen(p, c) {
      dungeonWall(p);
      for (const y of [5, 37]) for (const x of [10, 28, 46]) {
        p.rect(x - 2, y - 3, 12, 7, K.s3); bev(p, x - 2, y - 3, 12, 7, 0.6, 1.35);
        p.rect(x, y - 1, 8, 3, K.k1); p.rect(x, y - 1, 8, 1, '#000000');
        p.px(x + 3, y + 3, K.s2); p.px(x + 4, y + 4, K.s2);
      }
    },
  });

  // Single features on rock faces (lever, carving, chains, sconce) stay inside rows 4..47:
  // rows 48..63 repeat at the top of a 1.25 corridor, so they are left plain.
  /** A bronze wall lever. Up = handle raised (knob high), down = handle pulled down. */
  const lever = up => (p, c) => {
    dungeonWall(p);
    p.rect(21, 11, 22, 34, K.i2); p.rect(22, 12, 20, 32, K.g4); bev(p, 22, 12, 20, 32, 1.4, 0.55);
    for (const [x, y] of [[24, 14], [39, 14], [24, 41], [39, 41]]) { p.px(x, y, K.g13); p.px(x + 1, y + 1, K.g2); }
    p.rect(30, 16, 4, 25, K.b0);
    const pv = 29, tip = up ? 10 : 42, dx = up ? 3 : -3;
    for (let k = -1; k <= 1; k++) p.line(32 + k, pv, 32 + k + dx, tip + (up ? 3 : -3), k ? K.i6 : K.i11);
    p.ball(32 + dx, tip, 4.5, K.g9, 1.5, 0.45); p.px(31 + dx, tip - 2, K.g15);
    p.disc(32, pv, 3.5, K.g6); p.disc(32, pv, 1.5, K.b1);
    // a scratched arrow beside it shows which way it went
    const a0 = up ? 30 : 16, a1 = up ? 16 : 30, hd = up ? 3 : -3;
    for (const col of [K.b1, K.s10]) { const o = col === K.b1 ? 1 : 0; p.line(48, a0 + o, 48, a1 + o, col); p.line(48, a1 + o, 46, a1 + hd + o, col); p.line(48, a1 + o, 50, a1 + hd + o, col); }
  };
  T('LEVER_UP', { gen: lever(true) });
  T('LEVER_DOWN', { gen: lever(false) });

  // scratched marks: tallies, crude script, a little hourglass (use with a note on the cell)
  T('CARVING', {
    gen(p, c) {
      dungeonWall(p);
      const r = U.rng(77), cut = K.s11, sh2 = K.b0;
      const mark = (x0, y0, x1, y1) => { p.line(x0 + 1, y0 + 1, x1 + 1, y1 + 1, sh2); p.line(x0, y0, x1, y1, cut); };
      for (let line = 0; line < 3; line++) {
        let x = 6 + r() * 4; const y = 14 + line * 9;
        while (x < 56) {
          const w = 2 + r() * 5, kind = r();
          if (kind < 0.35) { mark(x, y, x + w, y); mark(x + w, y, x + w, y - 3 - r() * 3); }
          else if (kind < 0.6) { mark(x, y - 3, x + w * 0.5, y); mark(x + w * 0.5, y, x + w, y - 2); }
          else if (kind < 0.8) { mark(x, y, x, y - 4); p.px(x + 2, y - 5, cut); }
          else { p.ring(x + 2, y - 2, 2, cut); }
          x += w + 2 + r() * 2;
        }
      }
      for (let i = 0; i < 7; i++) mark(10 + i * 3, 44, 10 + i * 3, 37);
      mark(8, 39, 30, 42);
      mark(42, 34, 52, 34); mark(42, 45, 52, 45); mark(42, 34, 52, 45); mark(52, 34, 42, 45);
    },
  });

  /** Iron ring and a chain with an open manacle. */
  const chainOn = (p, x, y0, y1) => {
    p.ring(x, y0, 3, K.i9, 2); p.px(x - 1, y0 - 2, K.i13);
    for (let y = y0 + 3, k = 0; y < y1; y += 4, k++) {
      if (k % 2) { p.rect(x - 1, y, 3, 4, K.i8); p.px(x, y + 1, K.i2); p.px(x, y + 2, K.i2); p.px(x - 1, y, K.i12); }
      else { p.rect(x, y, 1, 4, K.i10); p.px(x, y, K.i13); }
      p.px(x + 2, y + 2, K.s2);
    }
    p.ring(x, y1 + 3, 3.5, K.i8, 2); p.rect(x - 4, y1 + 5, 3, 2, K.i6);
  };
  T('CHAIN_WALL', { gen(p) { dungeonWall(p); chainOn(p, 18, 6, 34); chainOn(p, 46, 6, 38); } });

  /**
   * A wall sconce with a burning torch (animated). It is EMISSIVE - a light source you can
   * see from afar - so the stones carry their own torchlight falloff, painted in.
   * Put it on the wall of a lit (':') cell.
   */
  T('TORCH_WALL', {
    frames: 4, fps: 10, emissive: true,
    gen(p, c) {
      dungeonWall(p);                                      // the same stones in every frame
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const dy = Math.min(Math.abs(y - 20), 64 - Math.abs(y - 20)), dx = Math.min(Math.abs(x - 32), 64 - Math.abs(x - 32));
        const d = Math.min(1, Math.hypot(dx * 0.85, dy) / 34);
        p.mul(x, y, 1, 1, 0.34 + 0.62 * Math.pow(1 - d, 1.3));
      }
      for (let y = 0; y < 14; y++) for (let x = 25; x < 40; x++) if (Math.abs(x - 32) < 3 + (14 - y) * 0.25) p.mul(x, y, 1, 1, 0.55 + y * 0.02);
      p.rect(29, 34, 7, 3, K.i5); p.rect(31, 37, 3, 5, K.i5); p.rect(28, 41, 9, 3, K.i6); bev(p, 28, 41, 9, 3, 1.3, 0.6);
      p.rect(30, 23, 5, 12, K.b6); p.rect(30, 23, 1, 12, K.b9); p.rect(29, 25, 7, 2, K.b4); p.rect(29, 30, 7, 2, K.b4);
      p.rect(28, 21, 9, 3, K.i8); p.px(28, 21, K.i13);
      flame(p, 32.5, 21, 16, 4.0, 9 + c.frame * 17, { sparks: 2, sparkH: 2 });
    },
  });

  // ============================================================ FLATS (one flagstone per cell)
  T('SAND_FLOOR', { gen: (p, c) => flag(p, c, { A: K.b10, B: K.b9, mix: 0.3, joint: K.b1, specks: 30, cracks: 1 }) });
  T('DUNGEON_FLOOR', { gen: (p, c) => flag(p, c, { A: K.s7, B: K.b9, mix: 0.3, joint: K.b0, specks: 34, cracks: 2, grain: 0.22, lit: 1.3 }) });
  T('LOOSE_FLAT', {
    gen(p, c) {
      // darker, ashen and broken; a wide black gap all round (it has come away from its neighbours)
      const r = c.rng;
      body(p, c, 0, 0, 64, 64, K.s8, K.s7, 0.4, 0.14, c.seed + 5);
      p.noise(0.05, c.seed + 6);
      const cx = 30 + r() * 6, cy = 28 + r() * 6;
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + r() * 0.6, len = 22 + r() * 10;
        let x = cx, y = cy, ang = a;
        for (let i = 0; i < len; i++) {
          p.px(x, y, '#000000'); p.px(x + 1, y, K.b1); p.px(x, y - 1, K.s11);
          x += Math.cos(ang); y += Math.sin(ang); ang += (r() - 0.5) * 0.5;
        }
      }
      p.disc(cx, cy, 2.2, K.b0);
      for (let i = 0; i < 18; i++) p.px(8 + r() * 48, 8 + r() * 48, r() < 0.6 ? K.s4 : K.s10);
      // sunk: shadowed inner rim, then the gap
      ring(p, 5, 0.55); ring(p, 6, 0.7); ring(p, 7, 0.85);
      for (let k = 0; k < 5; k++) p.frame(k, k, 64 - 2 * k, 64 - 2 * k, k < 3 ? '#000000' : K.b0);
      for (const [x, y] of [[5, 5], [56, 6], [6, 55], [55, 56]]) p.rect(x, y, 3, 3, K.b0);
    },
  });
  T('PLATE_FLAT', {
    gen(p, c) {
      c.call('SAND_FLOOR', p);
      p.mul(9, 9, 46, 46, 0.45);                            // the recess it sits in
      p.rect(10, 10, 44, 44, K.g6);
      body(p, c, 11, 11, 42, 42, K.g6, K.g7, 0.35, 0.08, c.seed + 9);
      bev(p, 10, 10, 44, 44, 1.45, 0.5); bev(p, 11, 11, 42, 42, 1.25, 0.7);
      p.rect(19, 19, 26, 26, K.g5); bev(p, 19, 19, 26, 26, 0.6, 1.35);   // sunken centre
      p.poly([[24, 23], [40, 23], [32, 32]], K.g9); p.poly([[24, 41], [40, 41], [32, 32]], K.g9);   // an hourglass boss
      p.rect(24, 22, 16, 1, K.g11); p.rect(24, 41, 16, 1, K.g4);
      for (const [x, y] of [[13, 13], [49, 13], [13, 49], [49, 49]]) { p.disc(x + 0.5, y + 0.5, 1.6, K.g4); p.px(x, y, K.g14); }
    },
  });
  T('EXIT_FLAT', {
    frames: 4, fps: 5, emissive: true,
    gen(p, c) {
      const ph = c.frame / 4 * Math.PI * 2;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5) / 32, w = 0.5 + 0.5 * Math.sin(d * 9 - ph);
        p.px(x, y, mix(K.g8, K.g15, U.clamp(1 - d * 0.9 + w * 0.25, 0, 1)));
      }
      p.poly([[32, 14], [50, 32], [32, 50], [14, 32]], K.fCream); p.poly([[32, 22], [42, 32], [32, 42], [22, 32]], K.g13);
      p.disc(32, 32, 3, K.white);
      ring(p, 2, 1.1); ring(p, 3, 0.8);
      for (let k = 0; k < 2; k++) p.frame(k, k, 64 - 2 * k, 64 - 2 * k, K.g4);
    },
  });
  T('ABYSS', {
    frames: 3, fps: 2, emissive: true,
    gen(p, c) {
      p.fill('#000000');
      const n = U.fbm(4242, 64, 3, 2), r = U.rng(31 + c.frame);
      const sx = c.frame * 5;
      p.map((x, y) => { const v = n((x + sx) & 63, y); return v > 0.56 && r() < (v - 0.56) * 3 ? C(v > 0.66 ? K.i2 : K.i1) : [0, 0, 0]; });
    },
  });
  T('CEIL_DUNGEON', { gen: (p, c) => ashlar(p, c, { bh: 32, layouts: [[32, 32], [24, 40]], cols: [[K.s3, K.b4], [K.s4, K.s3], [K.b4, K.s3]], mortar: K.b0, mix: 0.4, cracks: 0.4, grain: 0.25 }) });
  T('CARPET_PERSIAN', {
    gen(p, c) {
      p.fill(K.red5); p.grain(0.12, c.seed); p.noise(0.05, c.seed + 1);
      p.frame(4, 4, 56, 56, K.g8); p.frame(5, 5, 54, 54, K.g6); p.frame(8, 8, 48, 48, K.u4); p.frame(9, 9, 46, 46, K.u4);
      for (let i = 12; i < 52; i += 4) { p.px(i, 6.5, K.u5); p.px(6.5, i, K.u5); p.px(i, 57, K.u5); p.px(57, i, K.u5); }
      p.poly([[32, 13], [51, 32], [32, 51], [13, 32]], K.u4); p.poly([[32, 17], [47, 32], [32, 47], [17, 32]], K.red7);
      p.poly([[32, 22], [42, 32], [32, 42], [22, 32]], K.g8); p.poly([[32, 26], [38, 32], [32, 38], [26, 32]], K.red5);
      p.disc(32, 32, 2, K.g12);
      for (const [x, y] of [[16, 16], [48, 16], [16, 48], [48, 48]]) { p.disc(x, y, 3, K.g6); p.disc(x, y, 1.5, K.u5); }
      for (let k = 0; k < 2; k++) p.frame(k, k, 64 - 2 * k, 64 - 2 * k, K.b1);        // the cell joint
      p.frame(2, 2, 60, 60, K.t9); p.frame(3, 3, 58, 58, K.red3);                     // fringe
    },
  });

  // --- new flats
  T('PALACE_FLOOR', {
    gen(p, c) {
      flag(p, c, { A: K.s11, B: K.s12, mix: 0.3, joint: K.s4, specks: 8, cracks: 0, grain: 0.1, lit: 1.12 });
      p.map((x, y, col) => { const t = Math.abs(Math.sin((x * 0.06 + y * 0.1 + Math.sin(y * 0.2) * 0.6) * Math.PI)); return t > 0.97 ? mix(col, K.s8, 0.6) : null; });
      p.frame(7, 7, 50, 50, K.u5); p.frame(8, 8, 48, 48, K.g8);
      const star = (cx, cy, R1, R2, col) => { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? R2 : R1; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } p.poly(pts, col); };
      star(32, 32, 14, 7, K.u5); star(32, 32, 9, 5, K.g8); p.disc(32, 32, 3, K.c7);
    },
  });
  // checkerboard halls: alternate CHECK_LIGHT and CHECK_DARK cells in the legend (one colour per cell)
  T('CHECK_LIGHT', { gen: (p, c) => flag(p, c, { A: K.s11, paint: (q, cc) => H.marble(q, cc, K.s11, K.s7, 0.55), joint: K.b1, specks: 6, cracks: 0, lit: 1.1 }) });
  T('CHECK_DARK', { gen: (p, c) => flag(p, c, { A: K.i3, paint: (q, cc) => H.marble(q, cc, K.i3, K.i8, 0.6), joint: '#000000', specks: 6, cracks: 0, lit: 1.4 }) });
  /** Run-up floors: scuffed skid marks along the run (EW = along x, NS = along y). */
  const skid = alongX => (p, c) => {
    c.call('SAND_FLOOR', p);
    const r = U.rng(c.seed + 40);
    for (let i = 0; i < 7; i++) {
      const a = 14 + r() * 36, b = 8 + r() * 20, len = 12 + r() * 22;
      for (let k = 0; k < len; k++) { const u = b + k, v = a + Math.sin(k * 0.3 + i) * 0.8; if (u > 5 && u < 59) (alongX ? p.mul(u, v, 1, 1, 0.66) : p.mul(v, u, 1, 1, 0.66)); }
    }
    for (let i = 0; i < 3; i++) { const v = 16 + i * 16; for (let u = 10; u < 54; u += 2) (alongX ? p.mul(u, v, 1, 2, 0.8) : p.mul(v, u, 2, 1, 0.8)); }
  };
  T('SKID_EW', { gen: skid(true) });
  T('SKID_NS', { gen: skid(false) });
  T('GRATE_FLOOR', {
    gen(p, c) {
      p.fill('#000000');
      const r = c.rng;
      for (let i = 0; i < 40; i++) p.px(r() * 64, r() * 64, K.i1);
      for (let x = 11; x < 60; x += 10) { p.rect(x, 0, 3, 64, K.i5); p.rect(x, 0, 1, 64, K.i9); p.rect(x + 2, 0, 1, 64, K.i2); }
      for (let y = 11; y < 60; y += 10) { p.rect(0, y, 64, 3, K.i6); p.rect(0, y, 64, 1, K.i10); p.rect(0, y + 2, 64, 1, K.i3); }
      for (let x = 11; x < 60; x += 10) for (let y = 11; y < 60; y += 10) p.px(x + 1, y + 1, K.i12);
      p.rect(0, 0, 64, 6, K.i5); p.rect(0, 58, 64, 6, K.i5); p.rect(0, 0, 6, 64, K.i5); p.rect(58, 0, 6, 64, K.i5);
      bev(p, 1, 1, 62, 62, 1.35, 0.6); bev(p, 5, 5, 54, 54, 0.6, 1.3);
      for (const x of [3, 32, 60]) for (const y of [3, 60]) { p.px(x, y, K.i13); p.px(y, x, K.i13); }
      for (let i = 0; i < 26; i++) p.px(r() * 64, r() * 64, K.r8);
      p.frame(0, 0, 64, 64, K.i1);
    },
  });
  T('LIFT_PLANKS', {
    gen(p, c) {
      H.planks(p, c, { ph: 8, len: 64, base: K.b7, vary: 0.15, seams: false });
      for (const y of [0, 58]) { p.rect(0, y, 64, 6, K.i5); bev(p, 0, y, 64, 6, 1.3, 0.6); for (let x = 4; x < 64; x += 10) { p.px(x, y + 2, K.i13); p.px(x + 1, y + 3, K.i2); } }
      p.rect(0, 0, 3, 64, K.i4); p.rect(61, 0, 3, 64, K.i4);
      p.ring(32, 32, 6, K.i8, 2); p.px(28, 28, K.i13);
      p.frame(0, 0, 64, 64, K.b0);
    },
  });
  /**
   * Slag stones: cooled crust plates split by cracks. SLAG (cool, safe) has dim embers in
   * the cracks; SLAG_HOT (emissive, animated) is the same stone glowing - use it as the
   * `cycle` anim's texOn with hazard 'lava' (never wait on a glowing stone).
   */
  const slagCells = (() => {
    let cache = null;
    return () => {
      if (cache) return cache;
      const r = U.rng(9091), pts = [];
      for (let i = 0; i < 7; i++) pts.push([6 + r() * 52, 6 + r() * 52, 0.85 + r() * 0.3]);
      cache = [];
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        let d1 = 1e9, d2 = 1e9, best = 0;
        pts.forEach((q, i) => { const d = Math.hypot(x + 0.5 - q[0], y + 0.5 - q[1]); if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d; });
        const edge = Math.min(x, y, 63 - x, 63 - y);           // the stone's own rim is a crack too
        cache.push({ e: Math.min(d2 - d1, edge * 1.4), d1, f: pts[best][2] });
      }
      return cache;
    };
  })();
  T('SLAG', {
    gen(p, c) {
      const cells = slagCells(), r = c.rng;
      p.map((x, y) => {
        const q = cells[y * 64 + x];
        if (q.e < 0.9) return C(r() < 0.5 ? K.red7 : K.r8);
        if (q.e < 2.4) return C(K.k1);
        return sh(r() < 0.25 ? K.r4 : K.k4, q.f * U.clamp(1.15 - q.d1 / 40, 0.7, 1.15));
      });
      p.grain(0.3, c.seed).noise(0.08, c.seed + 1);
      for (let i = 0; i < 16; i++) p.px(6 + r() * 52, 6 + r() * 52, K.k6);
    },
  });
  T('SLAG_HOT', {
    frames: 4, fps: 6, emissive: true,
    gen(p, c) {
      const cells = slagCells(), r = U.rng(77 + c.frame), pulse = 0.85 + 0.15 * Math.sin(c.frame / 4 * Math.PI * 2);
      p.map((x, y) => {
        const q = cells[y * 64 + x];
        if (q.e < 1.2) return C(r() < 0.25 ? K.white : K.fYellow);
        if (q.e < 2.6) return C(K.fOrange);
        if (q.e < 3.6) return C(K.red9);
        return sh(r() < 0.3 ? K.red7 : K.red5, q.f * pulse * U.clamp(1.2 - q.d1 / 36, 0.75, 1.2));
      });
      p.noise(0.06, 5 + c.frame);
    },
  });
  T('HAMMER', {
    gen(p, c) {
      p.fill(K.i4); p.grain(0.2, c.seed); p.noise(0.05, c.seed + 1);
      bev(p, 0, 0, 64, 64, 1.4, 0.5); bev(p, 1, 1, 62, 62, 1.2, 0.7);
      p.rect(12, 12, 40, 40, K.i5); bev(p, 12, 12, 40, 40, 1.35, 0.55);
      for (let y = 6; y < 64; y += 13) for (let x = 6; x < 64; x += 13) { p.disc(x, y, 2.2, K.i8); p.px(x - 1, y - 1, K.i14); p.px(x + 1, y + 1, K.i2); }
      for (let i = 0; i < 30; i++) p.px(c.rng() * 64, c.rng() * 64, K.r7);
    },
  });
  T('IRON_WALL', {
    gen(p, c) {
      p.fill(K.i4); p.grain(0.25, c.seed); p.noise(0.05, c.seed + 1);
      for (const [x, y, w, h] of [[0, 0, 32, 32], [32, 0, 32, 32], [0, 32, 64, 32]]) {
        bev(p, x, y, w, h, 1.35, 0.5);
        for (let k = 3; k < w - 2; k += 7) { p.px(x + k, y + 2, K.i12); p.px(x + k, y + h - 3, K.i12); }
      }
      const r = c.rng; for (let i = 0; i < 8; i++) { const x = r() * 64, y = r() * 64; for (let k = 0; k < 6 + r() * 10; k++) p.px(x + (r() - 0.5) * 2, y + k, k < 3 ? K.r8 : K.r6); }
    },
  });
  T('FUNGUS_WALL', {
    gen(p, c) {
      c.call('CAVE_ROCK', p);
      const r = U.rng(c.seed + 5);
      for (let k = 0; k < 4; k++) {
        const cx = 8 + r() * 48, cy = 12 + r() * 44;
        for (let i = 0; i < 6; i++) {
          const x = cx + (r() - 0.5) * 12, y = cy + (r() - 0.5) * 8, w = 2 + r() * 3;
          p.rect(x - 0.5, y, 1, 2 + r() * 2, K.c5);
          p.ellipse(x, y, w, w * 0.55, K.c11); p.ellipse(x, y - 0.5, w * 0.6, w * 0.3, K.c15);
        }
      }
    },
  });
  /** A coping stone for the face under a ledge (use as `low`): the texture is pegged to
   *  the floor edge, so the bright coping always sits exactly at the lip. */
  T('LEDGE', {
    gen(p, c) {
      c.call('SANDSTONE_DARK', p);
      p.rect(0, 0, 64, 6, K.s9); body(p, c, 0, 0, 64, 6, K.s9, K.s10, 0.4, 0.1, c.seed + 3);
      p.rect(0, 0, 64, 1, K.s13); p.rect(0, 5, 64, 1, K.s5); p.rect(0, 6, 64, 2, K.b1);
      for (let x = 0; x < 64; x += 16) p.rect(x, 0, 1, 6, K.s4);
    },
  });

  // ============================================================ SKIES (512 x 128; horizon ~ row 102)
  /** Night over the palace: stars, a crescent moon, domes and minarets. dawn: warm horizon. */
  const skyline = (p, dawn) => {
    const r = U.rng(dawn ? 71 : 70);
    const stops = dawn
      ? [[0, K.u2], [45, K.v3], [78, K.r8], [96, K.t9], [104, K.g12]]
      : [[0, '#02030c'], [50, K.u2], [88, K.u3], [104, K.u4]];
    for (let y = 0; y < 128; y++) {
      let a = stops[0], b = stops[stops.length - 1];
      for (let i = 0; i + 1 < stops.length; i++) if (y >= stops[i][0] && y <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
      const t = b[0] === a[0] ? 0 : U.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
      p.rect(0, y, 512, 1, mix(a[1], b[1], t));
    }
    for (let i = 0; i < (dawn ? 140 : 520); i++) {
      const y = 8 + Math.pow(r(), dawn ? 2.2 : 1.3) * 88, x = r() * 512, b = r();   // rows 0..7 stay plain: the renderer clamps to row 0 above it
      p.px(x, y, b < 0.08 ? K.white : b < 0.3 ? K.i14 : b < 0.6 ? K.i10 : K.i7);
      if (b < 0.02) { p.px(x - 1, y, K.i9); p.px(x + 1, y, K.i9); p.px(x, y - 1, K.i9); p.px(x, y + 1, K.i9); }
    }
    if (!dawn) {                                                            // the Milky Way
      const n = U.fbm(707, 512, 5, 8);
      p.map((x, y, col) => { const band = Math.exp(-Math.pow((y - 20 - 40 * Math.sin(x / 512 * Math.PI * 2)) / 14, 2)); const v = n(x, y * 2) * band; return v > 0.3 ? mix(col, K.i6, U.clamp((v - 0.3) * 1.6, 0, 0.6)) : null; });
    }
    const mx = dawn ? 120 : 300, my = dawn ? 20 : 26;                         // crescent moon
    p.disc(mx, my, 9, K.s14); p.disc(mx + 4, my - 2, 8.5, dawn ? K.u2 : '#02030c');
    // skyline: domes and minarets
    const sil = dawn ? K.v1 : '#010208';
    for (let x = 0; x < 512; x++) { const hh = 104 - 2 * Math.sin(x / 512 * Math.PI * 8) - 1.5 * Math.sin(x / 512 * Math.PI * 26); p.rect(x, Math.floor(hh), 1, 128 - Math.floor(hh), sil); }
    for (const [x, w, h] of [[40, 22, 12], [150, 30, 16], [205, 16, 9], [330, 36, 18], [420, 20, 11]]) { p.ellipse(x, 104 - h * 0.6, w / 2, h, sil); p.rect(x, 104 - h * 1.6 - 5, 1, 6, sil); p.disc(x, 104 - h * 1.6 - 6, 1.2, sil); }
    for (const [x, h] of [[18, 34], [70, 26], [128, 40], [178, 30], [300, 38], [362, 44], [460, 30], [492, 36]]) {
      p.rect(x - 2, 104 - h, 5, h, sil); p.rect(x - 3, 104 - h * 0.7, 7, 2, sil); p.rect(x - 3, 104 - h - 2, 7, 3, sil); p.poly([[x - 2, 104 - h - 2], [x + 0.5, 104 - h - 9], [x + 3, 104 - h - 2]], sil);
      if (!dawn && r() < 0.6) p.px(x, 104 - h * 0.5, K.g12);
    }
    for (let i = 0; i < 26; i++) p.px(r() * 512, 106 + r() * 16, dawn ? K.v2 : K.g6);   // lit windows / roofs
  };
  T('STARS', { w: 512, h: 128, sky: true, gen: p => skyline(p, false) });
  T('DAWN', { w: 512, h: 128, sky: true, gen: p => skyline(p, true) });

  // ============================================================ SPRITES
  S('TORCH', {
    w: 16, h: 34, scale: 1.1, emissive: true, frames: 4, fps: 10,
    gen(p, c) {
      p.poly([[6, 17], [10, 17], [9, 33], [7, 33]], K.b5); p.rect(7, 17, 1, 16, K.b8);
      for (const y of [19, 23, 27]) p.rect(6, y, 4, 2, K.b3);
      p.rect(4, 15, 8, 3, K.i6); p.rect(4, 15, 8, 1, K.i11); p.px(4, 17, K.i3); p.px(11, 17, K.i3);
      flame(p, 8, 15, 15, 4.2, 5 + c.frame * 11, { sparks: 2, sparkH: 2 });
    },
  });
  const brazier = lit => (p, ctx) => {
    for (const [x0, x1] of [[9, 5], [23, 27]]) { p.line(x0, 22, x1, 37, K.i3); p.line(x0 + 1, 22, x1 + 1, 37, K.i6); }
    p.rect(15, 22, 2, 15, K.i4); p.rect(4, 36, 8, 2, K.i3); p.rect(20, 36, 8, 2, K.i3);
    p.ellipse(16, 22, 6, 2, K.g4);
    p.poly([[2, 12], [30, 12], [26, 21], [6, 21]], K.g5);
    for (let x = 2; x < 30; x++) { const t = (x - 2) / 27; p.mul(x, 12, 1, 10, 0.6 + Math.sin(t * Math.PI) * 0.75); }
    p.rect(1, 10, 30, 3, K.g8); p.rect(1, 10, 30, 1, K.g12); p.rect(1, 12, 30, 1, K.g4);
    for (let x = 5; x < 28; x += 4) { p.px(x, 16, K.g11); p.px(x + 1, 17, K.g3); }
    if (lit) {
      p.rect(3, 9, 26, 2, K.fOrange); for (let x = 3; x < 29; x += 2) p.px(x, 9, K.red11);
      flame(p, 10, 9, 9, 3.2, 3 + ctx.frame * 7, { sparks: 1 });
      flame(p, 22, 9, 8, 3.0, 5 + ctx.frame * 13, { sparks: 1 });
      flame(p, 16, 9, 12, 4.6, 7 + ctx.frame * 5, { sparks: 3, sparkH: 3 });
    } else {
      p.rect(3, 9, 26, 2, K.k4); for (let x = 3; x < 29; x += 3) { p.px(x, 9, K.k2); p.px(x + 1, 9, K.k8); }
      p.px(14, 9, K.red7); p.px(19, 10, K.red5);
    }
  };
  S('BRAZIER', { w: 32, h: 38, scale: 1.0, gen: brazier(false) });
  S('BRAZIER_LIT', { w: 32, h: 38, scale: 1.0, emissive: true, frames: 4, fps: 10, gen: brazier(true) });
  S('SLICER', {
    w: 48, h: 80, scale: 1.3, frames: 4,
    gen(p, ctx) {
      // fallback when the SLICER_JAWS texture is not used; frame 0 = open, 3 = shut
      const k = ctx.frame / 3, gap = (1 - k) * 30;
      const steel = K.i11, edge = K.i15, dark = K.i4;
      const topY = 40 - 2 - gap, botY = 40 + 2 + gap;
      p.poly([[4, topY - 30], [44, topY - 30], [44, topY], [24, topY + 4], [4, topY]], steel);
      p.line(4, topY, 24, topY + 4, edge); p.line(24, topY + 4, 44, topY, edge);
      p.poly([[4, botY + 30], [44, botY + 30], [44, botY], [24, botY - 4], [4, botY]], steel);
      p.line(4, botY, 24, botY - 4, edge); p.line(24, botY - 4, 44, botY, edge);
      p.rect(4, 0, 40, 4, dark); p.rect(4, 76, 40, 4, dark);
      if (k > 0.9) { p.rect(22, 30, 4, 20, K.red7); }
    },
  });
  S('DART', {
    w: 22, h: 6, scale: 1.2,
    gen(p) {
      p.rect(3, 2, 14, 2, K.t12); p.rect(3, 2, 14, 1, K.t14);
      p.poly([[16, 0], [22, 3], [16, 6]], K.i15); p.line(17, 3, 21, 3, K.white);
      p.poly([[0, 0], [5, 2], [5, 4], [0, 6]], K.fRed); p.px(1, 3, K.red13);
    },
  });
  /** Falling-rock warning: a trickle of grit from the ceiling (light, chunky, easy to spot). */
  S('DUST', {
    w: 16, h: 40, scale: 1.2, frames: 3, fps: 12,
    gen(p, c) {
      const r = U.rng(9 + c.frame);
      p.ellipse(8, 1, 6, 1.5, K.s9);
      for (let i = 0; i < 40; i++) { const y = Math.pow(r(), 0.8) * 39, sp = 1 + y * 0.1; p.rect(8 + (r() - 0.5) * sp * 2, y, r() < 0.3 ? 2 : 1, r() < 0.3 ? 2 : 1, r() < 0.4 ? K.s12 : r() < 0.7 ? K.s10 : K.b10); }
      for (let i = 0; i < 4; i++) p.rect(6 + r() * 4, r() * 36, 2, 2, K.s7);
    },
  });
  S('ROCK', {
    w: 28, h: 24, scale: 1.3,
    gen(p) {
      p.poly([[3, 14], [7, 5], [15, 2], [23, 5], [26, 13], [22, 21], [11, 23], [4, 20]], K.s5);
      p.poly([[7, 5], [15, 2], [23, 5], [16, 9], [9, 9]], K.s8); p.poly([[3, 14], [7, 5], [9, 9], [8, 16]], K.s7);
      p.poly([[22, 21], [26, 13], [16, 15], [14, 22]], K.s3); p.line(9, 9, 16, 9, K.s10); p.line(16, 9, 16, 15, K.s4);
      p.noise(0.1, 3); p.outline(K.b0);
    },
  });
  /** Broken flags: angular pieces of floor slab, dust and pebbles. */
  S('RUBBLE', {
    w: 40, h: 14, scale: 1.3,
    gen(p) {
      const r = U.rng(21);
      p.ellipse(20, 12.5, 19.5, 2, K.s4);
      // [centre x, base y, width, height, top tilt]: pieces of the pale loose flag, a few sand bits
      const pcs = [[7, 13, 11, 6, 1], [30, 13, 12, 7, -1.5], [18, 13, 12, 9, 1.5], [13, 11, 7, 4, -1], [26, 10, 6, 3, 1], [36, 13, 6, 4, 0]];
      pcs.forEach(([cx, y, w, h, tilt], i) => {
        const x0 = cx - w / 2, x1 = cx + w / 2, sandy = i === 3 || i === 5;
        p.poly([[x0, y], [x0 + 1, y - h + tilt], [x1 - 1, y - h - tilt], [x1, y]], sandy ? K.b7 : K.s6);
        p.poly([[x0 + 1, y - h + tilt], [x1 - 1, y - h - tilt], [x1 - 3, y - h - tilt - 2], [x0 + 2, y - h + tilt - 2]], sandy ? K.b10 : K.s10);
        p.line(x0 + 1, y - h + tilt, x1 - 1, y - h - tilt, sandy ? K.b12 : K.s12);
        if (w > 8) p.line(cx + (r() - 0.5) * 3, y - h + 1, cx + (r() - 0.5) * 4, y - 1, '#000000');
      });
      for (let i = 0; i < 14; i++) p.rect(1 + r() * 38, 11 + r() * 3, r() < 0.3 ? 2 : 1, 1, r() < 0.5 ? K.s9 : K.b9);
      p.outline(K.b0);
    },
  });
  /** The falling flag (the loose flag's pale stone): a thick slab seen edge-on, cracked. */
  S('LOOSE_TILE', {
    w: 40, h: 14, scale: 1.4,
    gen(p) {
      p.poly([[1, 5], [39, 3], [39, 11], [1, 13]], K.s6);
      p.poly([[1, 5], [39, 3], [36, 0], [4, 1]], K.s9);
      p.line(1, 5, 39, 3, K.s12); p.line(1, 13, 39, 11, K.s3);
      p.line(14, 1, 17, 12, '#000000'); p.line(15, 1, 18, 12, K.s10); p.line(28, 2, 26, 11, '#000000'); p.line(21, 1, 24, 3, '#000000');
      p.noise(0.06, 4); p.outline(K.b0);
    },
  });
  /** Rolling boulder: pits and strata turn over the top as it rolls towards you. */
  S('BOULDER', {
    w: 56, h: 56, scale: 1.5, frames: 6, fps: 12,
    gen(p, c) {
      p.ball(28, 27, 26, K.s7, 1.45, 0.35);
      const rot = c.frame / 6 * Math.PI * 2 / 3, R0 = 25, r = U.rng(5);
      const put = (lat, th, fn) => {
        const cl = Math.sqrt(1 - lat * lat), z = cl * Math.cos(th + rot);
        if (z < 0.12) return;
        fn(28 + lat * R0, 27 - cl * Math.sin(th + rot) * R0, z);
      };
      for (let k = 0; k < 3; k++) for (let s = -1; s <= 1; s += 0.02) put(s, k * 2.094 + 0.4, (x, y, z) => p.mul(x, y, 1, 1, 0.66 + (1 - z) * 0.15));
      const feats = [];
      for (let i = 0; i < 6; i++) feats.push([(r() - 0.5) * 1.5, r() * 2.094, 1.6 + r() * 2.2]);
      for (let k = 0; k < 3; k++) for (const [lat, th, sz] of feats) put(lat, th + k * 2.094, (x, y, z) => { p.ellipse(x, y, sz, sz * z, K.s4); p.ellipse(x, y + sz * z * 0.5, sz * 0.8, sz * z * 0.4, K.s9); p.ellipse(x, y - sz * z * 0.15, sz * 0.8, sz * z * 0.6, K.s3); });
      p.noise(0.08, 7); p.outline(K.b0);
      p.ellipse(28, 54, 22, 2, K.s4);
    },
  });

  // --- bottles: a round red flask (+1), a tall ornate great potion, and a poison vial of another shape
  S('POTION_RED', {
    w: 16, h: 20, scale: 0.9, emissive: true,
    gen(p) {
      p.rect(6, 1, 4, 3, K.b8); p.rect(6, 1, 4, 1, K.b12);
      p.rect(6, 4, 4, 5, K.i10); p.rect(7, 4, 1, 5, K.i14);
      p.disc(8, 13.5, 6.3, K.i4);
      p.disc(8, 13.5, 5.4, K.red7); p.rect(3, 9, 10, 2, K.i9);
      p.ellipse(8, 15, 4.5, 3.5, K.red9); p.disc(6, 11.5, 1.5, K.red13); p.px(5, 11, K.white);
      p.rect(3, 19, 10, 1, K.i4);
      p.outline(K.b0);
    },
  });
  S('POTION_BIG', {
    w: 20, h: 34, scale: 1.0, emissive: true,
    gen(p) {
      p.poly([[7, 5], [10, 0], [13, 5]], K.g10); p.rect(7, 5, 6, 2, K.g7); p.px(10, 1, K.white);
      p.rect(8, 7, 4, 7, K.n7); p.rect(8, 7, 1, 7, K.n13);
      for (const y of [8, 12]) p.rect(7, y, 6, 1, K.g9);
      p.ellipse(10, 22, 8.5, 9, K.g5);
      p.ellipse(10, 22, 7.2, 7.8, K.n5); p.ellipse(10, 23.5, 6, 5.5, K.n7);
      p.ellipse(7, 19, 1.8, 3, K.n13); p.px(6, 17, K.white);
      for (let a = 0; a < 8; a++) p.px(10 + Math.cos(a * 0.785) * 8, 22 + Math.sin(a * 0.785) * 8.5, K.g12);
      p.rect(4, 30, 12, 3, K.g7); p.rect(4, 30, 12, 1, K.g12); p.rect(3, 33, 14, 1, K.g4);
      p.outline(K.b0);
    },
  });
  S('POTION_BLUE', {
    w: 18, h: 24, scale: 0.95, emissive: true,
    gen(p) {
      p.rect(7, 0, 4, 3, K.k4); p.rect(7, 0, 4, 1, K.k8);
      p.rect(7, 3, 4, 6, K.i7); p.rect(8, 3, 1, 6, K.i13);
      p.poly([[7, 9], [11, 9], [17, 22], [1, 22]], K.i3);
      p.poly([[7.5, 11], [10.5, 11], [15.5, 21], [2.5, 21]], K.c5);
      p.poly([[5, 15], [13, 15], [15.5, 21], [2.5, 21]], K.c9);
      p.line(8, 11, 4, 20, K.c13); p.px(10, 17, K.c15); p.px(7, 19, K.c15); p.px(12, 13, K.c13);
      p.disc(9, 18, 2, K.i2); p.px(8, 18, K.c11); p.px(10, 18, K.c11); p.px(9, 20, K.i2);   // a little skull mark
      p.rect(1, 22, 16, 2, K.i4);
      p.outline(K.b0);
    },
  });
  S('SEAL', {
    w: 20, h: 20, scale: 1.2, emissive: true,
    gen(p) {
      p.disc(10, 10, 9.5, K.g4); p.disc(10, 10, 8.5, K.g8); p.ring(10, 10, 7, K.g5); p.disc(10, 10, 6, K.g10);
      p.poly([[6, 5], [14, 5], [10, 10]], K.red7); p.poly([[6, 15], [14, 15], [10, 10]], K.red7);
      p.rect(6, 4, 8, 1, K.g4); p.rect(6, 15, 8, 1, K.g4); p.px(10, 12, K.g14); p.px(9, 13, K.g14); p.px(11, 13, K.g14);
      p.px(6, 3, K.white); p.px(5, 4, K.g15); p.px(4, 6, K.g13);
      for (let a = 0; a < 12; a++) p.px(10 + Math.cos(a * 0.524) * 8.7, 10 + Math.sin(a * 0.524) * 8.7, K.g12);
      p.outline(K.b0);
    },
  });
  S('SKULL', {
    w: 16, h: 14, scale: 1,
    gen(p) {
      p.ball(8, 6, 6, K.s12, 1.3, 0.55); p.rect(5, 10, 6, 3, K.s11);
      p.disc(5.5, 6.5, 1.6, K.b0); p.disc(10.5, 6.5, 1.6, K.b0); p.px(8, 9, K.b1);
      for (let x = 5; x < 11; x += 2) p.px(x, 12, K.s4);
      p.outline(K.b1);
    },
  });

  // --- bones for demonstrations: sitting against a wall, cut in two, a splinted leg
  const BONE = K.s12, BONE_D = K.s8, BONE_S = K.b1;
  const skull = (p, x, y, tilt) => { p.ball(x, y, 4, BONE, 1.3, 0.55); p.px(x - 2 + tilt, y, BONE_S); p.px(x + 1 + tilt, y, BONE_S); p.px(x - 2 + tilt, y + 1, BONE_S); p.px(x + 1 + tilt, y + 1, BONE_S); p.rect(x - 2 + tilt, y + 3, 4, 2, BONE_D); };
  const ribs = (p, x, y, w, h) => { p.rect(x + w / 2 - 1, y, 2, h, BONE); for (let k = 0; k < h; k += 3) { p.line(x, y + k + 1, x + w / 2, y + k, BONE); p.line(x + w / 2, y + k, x + w, y + k + 1, BONE); p.px(x, y + k + 2, BONE_D); p.px(x + w, y + k + 2, BONE_D); } };
  S('SKELETON_SITTING', {
    w: 30, h: 30, scale: 1.3,
    gen(p) {
      skull(p, 16, 6, 1);
      ribs(p, 10, 11, 12, 10);
      p.ellipse(16, 23, 6, 2.5, BONE); p.px(16, 23, BONE_S);
      p.line(10, 12, 6, 19, BONE); p.line(6, 19, 7, 26, BONE); p.line(22, 12, 25, 19, BONE); p.line(25, 19, 21, 25, BONE);
      p.line(12, 24, 5, 17, BONE); p.line(5, 17, 3, 28, BONE); p.line(20, 24, 26, 16, BONE); p.line(26, 16, 28, 28, BONE);
      p.line(1, 29, 5, 29, BONE); p.line(26, 29, 29, 29, BONE);
      p.disc(5, 17, 1.2, BONE_D); p.disc(26, 16, 1.2, BONE_D);
      p.outline(BONE_S);
    },
  });
  S('SKELETON_CLEAVED', {
    w: 48, h: 16, scale: 1.3,
    gen(p) {
      p.ellipse(24, 14, 22, 2, K.red3); p.ellipse(22, 14, 6, 1.5, K.red5);
      skull(p, 5, 9, 0); ribs(p, 9, 7, 7, 6);
      p.line(9, 8, 12, 3, BONE); p.line(12, 3, 16, 2, BONE); p.line(15, 13, 20, 11, BONE);
      p.line(17, 9, 19, 10, BONE_D); p.px(22, 12, BONE); p.px(25, 13, BONE);
      p.ellipse(30, 10, 3.5, 2.5, BONE); p.px(30, 10, BONE_S);
      p.line(32, 9, 40, 7, BONE); p.line(40, 7, 47, 9, BONE); p.line(32, 11, 40, 12, BONE); p.line(40, 12, 46, 14, BONE);
      p.disc(40, 7, 1.2, BONE_D); p.disc(40, 12, 1.2, BONE_D);
      p.outline(BONE_S);
    },
  });
  S('SKELETON_SPLINT', {
    w: 44, h: 14, scale: 1.3,
    gen(p) {
      skull(p, 5, 8, 0); ribs(p, 9, 5, 12, 6);
      p.ellipse(25, 8, 3.5, 2.5, BONE); p.px(25, 8, BONE_S);
      p.line(27, 7, 36, 5, BONE); p.line(36, 5, 43, 6, BONE);
      p.line(27, 10, 43, 11, BONE);
      p.rect(31, 8, 11, 2, K.b8); p.rect(31, 12, 11, 2, K.b8);
      for (const x of [33, 39]) p.rect(x, 8, 2, 6, K.s11);
      p.line(12, 6, 10, 12, BONE); p.line(18, 6, 20, 12, BONE);
      p.outline(BONE_S);
    },
  });
  S('CHAINS', {
    w: 24, h: 64, scale: 1.0, hang: true,
    gen(p) {
      const chain = (x, y1, end) => {
        for (let y = 0, k = 0; y < y1; y += 4, k++) {
          if (k % 2) { p.rect(x - 1, y, 3, 5, K.i7); p.px(x, y + 1, K.i1); p.px(x, y + 3, K.i1); p.px(x - 1, y, K.i12); }
          else { p.rect(x, y, 1, 5, K.i9); p.px(x, y, K.i13); }
        }
        if (end === 'cuff') { p.ring(x, y1 + 4, 4, K.i8, 2); p.rect(x - 5, y1 + 6, 4, 2, K.i6); p.px(x - 3, y1 + 1, K.i13); }
        else { p.line(x, y1, x, y1 + 5, K.i9); p.line(x, y1 + 5, x + 3, y1 + 8, K.i9); p.line(x + 3, y1 + 8, x + 5, y1 + 5, K.i9); }
      };
      chain(7, 44, 'cuff'); chain(17, 52, 'hook');
      p.outline(K.i1);
    },
  });
  /** The Vizier's sand timer on a pillar: put one at a timed plate and one at its gate. */
  S('SANDGLASS', {
    w: 20, h: 52, scale: 1.1, emissive: true, frames: 4, fps: 6,
    gen(p, c) {
      p.rect(5, 28, 10, 21, K.s5); for (let x = 5; x < 15; x++) p.mul(x, 28, 1, 21, 0.7 + Math.sin((x - 5) / 9 * Math.PI) * 0.55);
      p.rect(3, 48, 14, 4, K.s4); p.rect(3, 48, 14, 1, K.s8); p.rect(3, 25, 14, 3, K.s6); p.rect(3, 25, 14, 1, K.s10);
      p.rect(2, 2, 16, 2, K.g7); p.rect(2, 22, 16, 2, K.g7); p.rect(2, 2, 16, 1, K.g12); p.rect(2, 22, 16, 1, K.g12);
      p.rect(3, 4, 1, 18, K.g5); p.rect(16, 4, 1, 18, K.g5);
      const glass = y => (y < 13 ? 5.5 - (y - 4) * 0.52 : 1 + (y - 13) * 0.52);
      for (let y = 4; y < 22; y++) { const w = Math.max(0.8, glass(y)); p.rect(10 - w, y, w * 2, 1, K.i9); }
      for (let y = 7; y < 12; y++) { const w = Math.max(0.5, glass(y) - 0.8); p.rect(10 - w, y, w * 2, 1, K.g11); }
      for (let y = 17; y < 22; y++) { const w = Math.min(glass(y) - 0.8, (y - 16) * 1.3); p.rect(10 - w, y, w * 2, 1, K.g11); }
      for (let y = 12; y < 18; y++) if ((y + c.frame) % 2 === 0) p.px(9.5, y, K.g15);
      p.px(7, 6, K.white); p.px(7, 19, K.i14);
      p.outline(K.b0);
    },
  });
  S('CRATE_SMALL', {
    w: 20, h: 18, scale: 1.2,
    gen(p) {
      p.rect(0, 0, 20, 18, K.b8); bev(p, 0, 0, 20, 18, 1.3, 0.55);
      for (const y of [6, 12]) p.rect(1, y, 18, 1, K.b5);
      p.line(2, 2, 17, 15, K.b5); p.line(3, 2, 18, 15, K.b11);
      for (const [x, y] of [[0, 0], [16, 0], [0, 14], [16, 14]]) { p.rect(x, y, 4, 4, K.i5); p.px(x + 1, y + 1, K.i12); }
      p.frame(0, 0, 20, 18, K.b1);
    },
  });
  S('PEBBLES', {
    w: 12, h: 40, scale: 1.2, hang: true, frames: 3, fps: 10,
    gen(p, c) {
      const r = U.rng(40 + c.frame);
      for (let i = 0; i < 9; i++) { const y = r() * 38; p.rect(4 + r() * 4, y, r() < 0.3 ? 2 : 1, r() < 0.3 ? 2 : 1, r() < 0.5 ? K.b9 : K.s6); }
      for (let i = 0; i < 10; i++) p.px(5 + r() * 2, r() * 10, K.b10);
    },
  });
  S('FUNGUS', {
    w: 24, h: 16, scale: 1.1, emissive: true,
    gen(p) {
      for (const [x, y, w] of [[6, 10, 4.5], [14, 8, 6], [20, 11, 3.5], [10, 13, 3]]) {
        p.rect(x - 0.5, y, 2, 16 - y, K.c5);
        p.ellipse(x, y, w, w * 0.55, K.c9); p.ellipse(x, y - 0.8, w * 0.7, w * 0.3, K.c13); p.px(x - 1, y - 1, K.c15);
      }
      p.outline(K.c3);
    },
  });
  S('CART', {
    w: 40, h: 26, scale: 1.3,
    gen(p) {
      p.poly([[2, 4], [38, 4], [35, 18], [5, 18]], K.b7);
      for (let y = 7; y < 18; y += 4) p.line(3, y, 37, y, K.b5);
      p.rect(1, 3, 38, 2, K.i6); p.rect(1, 3, 38, 1, K.i11); p.rect(4, 17, 32, 2, K.i5);
      for (const x of [10, 30]) { p.disc(x, 21, 5, K.i4); p.ring(x, 21, 5, K.i8); p.disc(x, 21, 1.5, K.i10); }
      for (let i = 0; i < 6; i++) p.ball(8 + i * 5, 3, 3, K.s6, 1.4, 0.5);
      p.outline(K.b0);
    },
  });
  S('CART_SMASHED', {
    w: 44, h: 12, scale: 1.3,
    gen(p) {
      p.poly([[1, 11], [8, 6], [20, 8], [21, 11]], K.b7); p.poly([[20, 11], [26, 5], [42, 9], [43, 11]], K.b6);
      p.line(3, 9, 18, 8, K.b5); p.line(24, 8, 40, 9, K.b5);
      p.ellipse(12, 10, 5, 2, K.i4); p.ring(12, 10, 3, K.i8);
      for (let i = 0; i < 5; i++) p.ball(6 + i * 7, 9, 2.5, K.s6, 1.4, 0.5);
      p.line(28, 4, 36, 1, K.i8);
      p.outline(K.b0);
    },
  });
  S('ANVIL', {
    w: 40, h: 28, scale: 1.4,
    gen(p) {
      p.poly([[2, 3], [30, 3], [38, 6], [30, 9], [26, 9], [24, 14], [16, 14], [14, 9], [4, 9]], K.i5);
      p.rect(2, 3, 30, 2, K.i12); p.line(30, 3, 38, 6, K.i11);
      p.rect(14, 14, 12, 8, K.i4); p.poly([[8, 27], [12, 21], [28, 21], [32, 27]], K.i4); p.rect(8, 26, 24, 2, K.i3);
      p.rect(16, 14, 1, 8, K.i8);
      p.outline(K.b0);
    },
  });
  S('URN', {
    w: 20, h: 28, scale: 1.2,
    gen(p) {
      p.rect(6, 1, 8, 2, K.t8); p.rect(7, 3, 6, 4, K.t6);
      p.ellipse(10, 15, 8.5, 9, K.t7); p.rect(6, 23, 8, 3, K.t6); p.rect(4, 26, 12, 2, K.t5);
      for (let x = 1; x < 20; x++) p.mul(x, 6, 1, 22, 0.65 + Math.sin(x / 19 * Math.PI) * 0.6);
      p.rect(2, 12, 16, 2, K.u5); for (let x = 3; x < 18; x += 3) p.px(x, 15, K.g9);
      p.outline(K.b0);
    },
  });
  S('BANNER', {
    w: 24, h: 60, scale: 1.1, hang: true,
    gen(p) {
      p.rect(0, 0, 24, 3, K.g7); p.rect(0, 0, 24, 1, K.g12);
      p.poly([[2, 3], [22, 3], [22, 54], [12, 59], [2, 54]], K.red5);
      for (let x = 2; x < 22; x++) p.mul(x, 3, 1, 57, 0.8 + 0.25 * Math.sin(x * 0.9));
      p.rect(2, 3, 2, 51, K.g6); p.rect(20, 3, 2, 51, K.g6);
      p.poly([[7, 16], [17, 16], [12, 24]], K.g9); p.poly([[7, 32], [17, 32], [12, 24]], K.g9); p.rect(7, 15, 10, 1, K.g11); p.rect(7, 32, 10, 1, K.g11);
      p.disc(12, 42, 3, K.g8); p.poly([[12, 54], [12, 59], [2, 54]], K.red3);
    },
  });
  /** The Vizier's great hourglass (tower / finale decoration), about 1.3 units tall. */
  S('HOURGLASS_GREAT', {
    w: 40, h: 76, scale: 1.1, frames: 4, fps: 6,
    gen(p, c) {
      p.rect(2, 0, 36, 5, K.g6); p.rect(2, 71, 36, 5, K.g6); bev(p, 2, 0, 36, 5, 1.4, 0.6); bev(p, 2, 71, 36, 5, 1.4, 0.6);
      for (const x of [4, 34]) { p.rect(x, 5, 2, 66, K.b5); p.rect(x, 5, 1, 66, K.b9); }
      const w = y => (y < 38 ? 13 - (y - 5) * 0.36 : 1 + (y - 38) * 0.36);
      for (let y = 5; y < 71; y++) { const hw = Math.max(1, w(y)); p.rect(20 - hw, y, hw * 2, 1, K.i8); p.px(20 - hw, y, K.i12); }
      for (let y = 22; y < 36; y++) { const hw = Math.max(0.5, w(y) - 1.5); p.rect(20 - hw, y, hw * 2, 1, K.g10); }
      for (let y = 56; y < 71; y++) { const hw = Math.min(w(y) - 1.5, (y - 55) * 1.1); p.rect(20 - hw, y, hw * 2, 1, K.g9); }
      for (let y = 36; y < 58; y++) if ((y + c.frame * 2) % 3) p.px(19.5, y, K.g14);
      p.line(12, 10, 12, 24, K.white); p.line(13, 50, 13, 62, K.i13);
      p.outline(K.b0);
    },
  });

  /** Notes (the note entity's default sprite): an unrolled parchment weighted by a stone. */
  S('NOTE', {
    w: 20, h: 12, scale: 1.3,
    gen(p) {
      p.poly([[3, 3], [17, 1], [18, 10], [2, 11]], K.t13);
      for (let y = 4; y < 10; y += 2) p.line(5, y, 15, y - 1, K.b7);
      p.rect(1, 2, 3, 10, K.t10); p.rect(1, 2, 1, 10, K.t14); p.rect(17, 0, 3, 10, K.t10); p.rect(19, 0, 1, 10, K.t8);
      p.disc(14, 8, 1.8, K.red7); p.px(13, 7, K.red13);
      p.outline(K.b1);
    },
  });

  // spikes: bright tips that glint from afar; down = sharp points peeking out of floor slots
  S('SPIKES_UP', {
    w: 32, h: 18, scale: 1.8,
    gen(p) {
      for (let x = 0; x < 32; x += 6) {
        p.poly([[x - 0.5, 18], [x + 3, 0], [x + 6.5, 18]], K.i10);
        p.poly([[x + 3, 0], [x + 6.5, 18], [x + 3.5, 18]], K.i6);
        p.poly([[x + 1, 18], [x + 3, 2], [x + 3, 18]], K.i13);
        p.line(x + 3, 0, x + 3, 4, K.white); p.px(x + 2, 4, K.i15); p.px(x + 4, 3, K.i13);
        p.rect(x + 1, 12, 5, 3, K.r8); p.px(x + 2, 11, K.r7);
      }
      p.rect(0, 16, 32, 2, K.i2); p.rect(0, 16, 32, 1, K.i6);
    },
  });
  S('SPIKES_DOWN', {
    w: 32, h: 5, scale: 1.8,
    gen(p) {
      p.rect(0, 2, 32, 3, K.i2);
      for (let x = 0; x < 32; x += 6) { p.rect(x + 1, 3, 4, 1, '#000000'); p.poly([[x + 2, 3], [x + 3, 0], [x + 4, 3]], K.i10); p.px(x + 3, 0, K.i15); }
    },
  });

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
