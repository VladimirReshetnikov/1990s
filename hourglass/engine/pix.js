/*
 * Pix — a tiny RGBA float painter used by texture and sprite generators.
 * Coordinates wrap for tileable textures (set `wrap = false` for sprites).
 * Colours are '#rrggbb' strings, 0xRRGGBB numbers or [r,g,b] arrays.
 */
(function (R) {
  'use strict';
  const U = R.util;

  class Pix {
    constructor(w, h, wrap = true) {
      this.w = w; this.h = h; this.wrap = wrap;
      this.d = new Float32Array(w * h * 4);
    }
    static col(c) { return R.hex(c); }
    _i(x, y) {
      x = Math.floor(x); y = Math.floor(y);
      if (this.wrap) { x = U.mod(x, this.w); y = U.mod(y, this.h); }
      else if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
      return (y * this.w + x) * 4;
    }
    px(x, y, c, a = 1) {
      const i = this._i(x, y); if (i < 0) return this;
      c = Pix.col(c);
      if (a >= 1) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 1; }
      else {
        const d = this.d;
        d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a;
        d[i + 3] = Math.max(d[i + 3], a >= 0.5 ? 1 : d[i + 3]);
      }
      return this;
    }
    get(x, y) { const i = this._i(x, y); if (i < 0) return [0, 0, 0, 0]; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
    alpha(x, y) { const i = this._i(x, y); return i < 0 ? 0 : this.d[i + 3]; }
    fill(c) { return this.rect(0, 0, this.w, this.h, c); }
    clear() { this.d.fill(0); return this; }
    rect(x, y, w, h, c, a = 1) {
      c = Pix.col(c);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a);
      return this;
    }
    frame(x, y, w, h, c) {
      for (let i = 0; i < w; i++) { this.px(x + i, y, c); this.px(x + i, y + h - 1, c); }
      for (let j = 0; j < h; j++) { this.px(x, y + j, c); this.px(x + w - 1, y + j, c); }
      return this;
    }
    /** Multiply RGB of a region by f (only opaque pixels). */
    mul(x, y, w, h, f) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = this._i(x + i, y + j); if (k < 0 || this.d[k + 3] === 0) continue;
        this.d[k] *= f; this.d[k + 1] *= f; this.d[k + 2] *= f;
      }
      return this;
    }
    /** Raised bevel: lighter top/left, darker bottom/right. */
    bevel(x, y, w, h, hi = 1.25, lo = 0.7, t = 1) {
      for (let k = 0; k < t; k++) {
        this.mul(x + k, y + k, w - 2 * k, 1, hi); this.mul(x + k, y + k + 1, 1, h - 2 * k - 1, hi);
        this.mul(x + k, y + h - 1 - k, w - 2 * k, 1, lo); this.mul(x + w - 1 - k, y + k, 1, h - 2 * k - 1, lo);
      }
      return this;
    }
    /** Per-pixel brightness jitter. */
    noise(amt, seed = 1, x = 0, y = 0, w = this.w, h = this.h) {
      const r = U.rng(seed);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const k = this._i(x + i, y + j); if (k < 0 || this.d[k + 3] === 0) continue;
        const f = 1 + (r() * 2 - 1) * amt;
        this.d[k] *= f; this.d[k + 1] *= f; this.d[k + 2] *= f;
      }
      return this;
    }
    /** Apply fn(x, y, [r,g,b,a]) -> [r,g,b] | null over every pixel. */
    map(fn) {
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        const k = (y * this.w + x) * 4;
        const res = fn(x, y, [this.d[k], this.d[k + 1], this.d[k + 2], this.d[k + 3]]);
        if (res) { this.d[k] = res[0]; this.d[k + 1] = res[1]; this.d[k + 2] = res[2]; if (res.length > 3) this.d[k + 3] = res[3]; else this.d[k + 3] = 1; }
      }
      return this;
    }
    /** Modulate brightness with tileable fbm noise. */
    grain(amount, seed, period = null, octaves = 4, base = 4) {
      const n = U.fbm(seed, period || this.w, octaves, base);
      return this.map((x, y, c) => (c[3] ? [c[0] * (1 + (n(x, y) - 0.5) * amount * 2), c[1] * (1 + (n(x, y) - 0.5) * amount * 2), c[2] * (1 + (n(x, y) - 0.5) * amount * 2)] : null));
    }
    line(x0, y0, x1, y1, c, a = 1) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.px(x0, y0, c, a);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
      return this;
    }
    ellipse(cx, cy, rx, ry, c, a = 1) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.px(x, y, c, a);
        }
      return this;
    }
    disc(cx, cy, r, c, a = 1) { return this.ellipse(cx, cy, r, r, c, a); }
    ring(cx, cy, r, c, t = 1) {
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
        for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          if (d <= r && d > r - t) this.px(x, y, c);
        }
      return this;
    }
    /** Shaded sphere-ish disc: light from top-left. */
    ball(cx, cy, r, c, hi = 1.5, lo = 0.45) {
      c = Pix.col(c);
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r;
          const d2 = dx * dx + dy * dy;
          if (d2 > 1) continue;
          const lz = Math.sqrt(1 - d2);
          const l = U.clamp(0.35 + (-dx * 0.5 - dy * 0.6 + lz * 0.7) * 0.8, 0, 1);
          const f = lo + (hi - lo) * l;
          this.px(x, y, [c[0] * f, c[1] * f, c[2] * f]);
        }
      return this;
    }
    /** Scanline polygon fill; pts = [[x,y],...]. */
    poly(pts, c, a = 1) {
      let minY = Infinity, maxY = -Infinity;
      for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
          if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + (yc - y0) / (y1 - y0) * (x1 - x0));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2)
          for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c, a);
      }
      return this;
    }
    /** Vertical gradient fill. */
    vgrad(x, y, w, h, c0, c1) {
      c0 = Pix.col(c0); c1 = Pix.col(c1);
      for (let j = 0; j < h; j++) {
        const t = h > 1 ? j / (h - 1) : 0;
        this.rect(x, y + j, w, 1, [U.lerp(c0[0], c1[0], t), U.lerp(c0[1], c1[1], t), U.lerp(c0[2], c1[2], t)]);
      }
      return this;
    }
    /** Copy another Pix onto this one (opaque pixels only). */
    blit(src, dx, dy) {
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const k = (y * src.w + x) * 4;
        if (src.d[k + 3] > 0) this.px(dx + x, dy + y, [src.d[k], src.d[k + 1], src.d[k + 2]]);
      }
      return this;
    }
    /** Dark 1px outline around opaque areas (for sprites). */
    outline(c = '#000000') {
      const w = this.w, h = this.h, src = this.d.slice();
      const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (op(x, y)) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) this.px(x, y, c);
      }
      return this;
    }
    /** Build from ASCII art: rows of chars, key maps char -> colour ('.'/' ' transparent). */
    static fromAscii(rows, key) {
      const h = rows.length, w = Math.max(...rows.map(r => r.length));
      const p = new Pix(w, h, false);
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          const c = key[ch];
          if (c === undefined) throw new Error(`fromAscii: no colour for "${ch}"`);
          p.px(x, y, c);
        }
      });
      return p;
    }
    /** Nearest-neighbour upscale (for chunky pixel art drawn small). */
    scaled(f) {
      const p = new Pix(this.w * f, this.h * f, this.wrap);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const s = ((Math.floor(y / f) * this.w) + Math.floor(x / f)) * 4, k = (y * p.w + x) * 4;
        p.d[k] = this.d[s]; p.d[k + 1] = this.d[s + 1]; p.d[k + 2] = this.d[s + 2]; p.d[k + 3] = this.d[s + 3];
      }
      return p;
    }
    /** Quantize to palette. Column-major Uint8Array; alpha < .5 -> 255. */
    toIndexed(pal) {
      const out = new Uint8Array(this.w * this.h);
      for (let x = 0; x < this.w; x++) for (let y = 0; y < this.h; y++) {
        const k = (y * this.w + x) * 4;
        out[x * this.h + y] = this.d[k + 3] < 0.5 ? 255 : pal.nearest(this.d[k], this.d[k + 1], this.d[k + 2]);
      }
      return out;
    }
  }
  R.Pix = Pix;
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
