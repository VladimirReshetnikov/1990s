/*
 * RetroEngine — core namespace, registries and small utilities.
 *
 * Every engine file is a classic script that attaches to the global
 * `RetroEngine` object, so the game runs straight from file:// without a
 * build step, and the same files can be loaded under Node for validation.
 *
 * Extension points (all are Registries, see README.md):
 *   RetroEngine.textures     wall / flat / sky texture generators
 *   RetroEngine.sprites      billboard sprite generators
 *   RetroEngine.entityTypes  entity behaviours (items, traps, patrollers ...)
 *   RetroEngine.hazards      floor hazards (acid, electricity, pits ...)
 *   RetroEngine.cellAnims    animated sectors (crushers, cycling floors ...)
 *   RetroEngine.sfx          synthesized sound effects
 *   RetroEngine.campaigns    playable campaigns ("variations")
 */
(function (R) {
  'use strict';

  R.VERSION = '1.0.0';

  class Registry {
    constructor(kind) {
      this.kind = kind;
      this.map = new Map();
      this.order = [];
    }
    register(name, def) {
      if (!this.map.has(name)) this.order.push(name);
      this.map.set(name, def);
      return def;
    }
    get(name) {
      const d = this.map.get(name);
      if (d === undefined) throw new Error(`Unknown ${this.kind}: "${name}"`);
      return d;
    }
    has(name) { return this.map.has(name); }
    names() { return this.order.slice(); }
    /** Stable numeric id (registration order). */
    id(name) {
      const i = this.order.indexOf(name);
      if (i < 0) throw new Error(`Unknown ${this.kind}: "${name}"`);
      return i;
    }
  }
  R.Registry = Registry;

  // ---------------------------------------------------------------- math
  const U = R.util = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.mod = (a, n) => ((a % n) + n) % n;
  U.smooth = t => t * t * (3 - 2 * t);
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.DIRS = { E: 0, SE: Math.PI / 4, S: Math.PI / 2, SW: 3 * Math.PI / 4, W: Math.PI, NW: -3 * Math.PI / 4, N: -Math.PI / 2, NE: -Math.PI / 4 };
  U.dirAngle = d => (typeof d === 'number' ? d : (U.DIRS[d] ?? 0));

  /** Deterministic PRNG (mulberry32). */
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  /**
   * Tileable value noise. Returns fn(x, y) in [0,1] with period `period`
   * (in the same units as x,y) so textures wrap seamlessly.
   */
  U.tileNoise = function (seed, cells, period) {
    const r = U.rng(seed);
    const g = new Float32Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const s = cells / period;
    return function (x, y) {
      const fx = x * s, fy = y * s;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = U.smooth(fx - x0), ty = U.smooth(fy - y0);
      const xa = U.mod(x0, cells), xb = U.mod(x0 + 1, cells);
      const ya = U.mod(y0, cells), yb = U.mod(y0 + 1, cells);
      const a = g[ya * cells + xa], b = g[ya * cells + xb];
      const c = g[yb * cells + xa], d = g[yb * cells + xb];
      return U.lerp(U.lerp(a, b, tx), U.lerp(c, d, tx), ty);
    };
  };
  /** Fractal (fbm) tileable noise. */
  U.fbm = function (seed, period, octaves = 4, base = 4) {
    const layers = [];
    for (let o = 0; o < octaves; o++) layers.push(U.tileNoise(seed + o * 101, base << o, period));
    return function (x, y) {
      let v = 0, amp = 1, tot = 0;
      for (let o = 0; o < octaves; o++) { v += layers[o](x, y) * amp; tot += amp; amp *= 0.5; }
      return v / tot;
    };
  };

  /** Deep-ish merge for plain config objects (arrays are replaced). */
  U.merge = function (...objs) {
    const out = {};
    for (const o of objs) {
      if (!o) continue;
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object' && out[k] && !Array.isArray(out[k])) {
          out[k] = U.merge(out[k], v);
        } else out[k] = v;
      }
    }
    return out;
  };

  /** Word-wrap text to a max number of characters per line. */
  U.wrap = function (text, maxChars) {
    const out = [];
    for (const para of String(text).split('\n')) {
      if (para.trim() === '') { out.push(''); continue; }
      let line = '';
      for (const w of para.split(/\s+/)) {
        if (!w) continue;
        if (line.length === 0) line = w;
        else if (line.length + 1 + w.length <= maxChars) line += ' ' + w;
        else { out.push(line); line = w; }
      }
      if (line) out.push(line);
    }
    return out;
  };

  U.formatTime = function (sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const pad = n => String(n).padStart(2, '0');
    return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
  };

  /**
   * MapGrid — paint large maps procedurally, then emit ASCII rows.
   *   const g = new MapGrid(64, 56, ',');
   *   g.rect(3, 3, 7, 6, 'S').ring(...).put(x, y, ch).stamp(rows, x, y);
   *   floor.map = g.rows();
   */
  class MapGrid {
    constructor(w, h, fill = ' ') { this.w = w; this.h = h; this.g = []; for (let y = 0; y < h; y++) this.g.push(new Array(w).fill(fill)); }
    ok(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) { return this.ok(x, y) ? this.g[y][x] : null; }
    put(x, y, ch) { if (this.ok(x, y)) this.g[y][x] = ch; return this; }
    rect(x, y, w, h, ch) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, ch); return this; }
    ring(x, y, w, h, ch) { for (let i = 0; i < w; i++) { this.put(x + i, y, ch); this.put(x + i, y + h - 1, ch); } for (let j = 0; j < h; j++) { this.put(x, y + j, ch); this.put(x + w - 1, y + j, ch); } return this; }
    ellipse(cx, cy, rx, ry, ch) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.put(x, y, ch);
      }
      return this;
    }
    /** Replace chars inside a rectangle: map {from: to}. */
    replace(x, y, w, h, map) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = this.get(x + i, y + j); if (c !== null && map[c] !== undefined) this.put(x + i, y + j, map[c]); } return this; }
    /** Overlay ASCII rows at (x, y). Chars equal to `skip` are left untouched. */
    stamp(rows, x, y, skip = null) {
      rows.forEach((row, j) => { [...row].forEach((ch, i) => { if (ch !== skip) this.put(x + i, y + j, ch); }); });
      return this;
    }
    rows() { return this.g.map(r => r.join('')); }
  }
  U.MapGrid = MapGrid;
  R.MapGrid = MapGrid;

  /** Surround ASCII rows with a ring of `ch` (e.g. portal cells around a house plan). */
  U.ringRows = function (rows, ch) {
    const w = Math.max(...rows.map(r => r.length));
    return [ch.repeat(w + 2), ...rows.map(r => ch + r.padEnd(w, ' ') + ch), ch.repeat(w + 2)];
  };

  /**
   * Perfect maze (recursive backtracker) of size w x h (odd numbers) as rows of
   * wall/floor chars. opts: { wall, floor, seed, open: [[x,y,w,h]...], braid: 0..1 }
   * Returns { rows, deadEnds: [[x,y]...] }.
   */
  U.maze = function (w, h, opts = {}) {
    const wall = opts.wall || '#', floor = opts.floor || '.', rnd = U.rng(opts.seed || 1);
    const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(wall));
    const cw = (w - 1) >> 1, chh = (h - 1) >> 1;
    const seen = new Uint8Array(cw * chh);
    const stack = [[0, 0]]; seen[0] = 1; g[1][1] = floor;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < chh && !seen[ny * cw + nx]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = nb[Math.floor(rnd() * nb.length)];
      seen[ny * cw + nx] = 1;
      g[1 + cy * 2 + dy][1 + cx * 2 + dx] = floor;
      g[1 + ny * 2][1 + nx * 2] = floor;
      stack.push([nx, ny]);
    }
    for (const [x, y, ww, hh] of (opts.open || [])) for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) g[y + j][x + i] = floor;
    const isF = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && g[y][x] === floor;
    const deadEnds = [];
    for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
      if (g[y][x] !== floor) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => isF(x + dx, y + dy));
      if (n.length === 1) {
        if (opts.braid && rnd() < opts.braid) {
          const walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => g[y + dy][x + dx] === wall && isF(x + 2 * dx, y + 2 * dy));
          if (walls.length) { const [dx, dy] = walls[Math.floor(rnd() * walls.length)]; g[y + dy][x + dx] = floor; continue; }
        }
        deadEnds.push([x, y]);
      }
    }
    return { rows: g.map(r => r.join('')), deadEnds };
  };

  // ------------------------------------------------------------ registries
  R.campaigns = new Registry('campaign');
  /** Register a playable campaign (a "variation"). See README.md. */
  R.registerCampaign = function (def) {
    if (!def || !def.id) throw new Error('Campaign needs an id');
    R.campaigns.register(def.id, def);
    return def;
  };
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
