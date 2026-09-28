/*
 * 256-colour palette + light "colormaps", in the spirit of PLAYPAL/COLORMAP.
 *
 * All textures and sprites are quantized to this palette. Lighting is done by
 * table lookup: shade[set][level * 256 + index] -> packed RGBA, with 32 light
 * levels (31 = full bright). Set 0 fades to black, set 1 fades to a fog colour
 * (used outdoors). Campaigns may override `palette.ramps` and `fogColor`.
 */
(function (R) {
  'use strict';

  const hex = h => {
    if (Array.isArray(h)) return h;
    if (typeof h === 'number') return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  R.hex = hex;

  // 15 ramps of 16 shades (dark -> mid -> light) + 1 row of specials.
  R.DEFAULT_RAMPS = [
    ['#000000', '#6e6e6e', '#ffffff'], // 0 neutral grey (index 0 = black)
    ['#140a04', '#7a4e26', '#ecc898'], // 1 wood brown
    ['#180303', '#9e2222', '#ffa088'], // 2 red
    ['#1c1006', '#b47444', '#ffe0bc'], // 3 tan / skin
    ['#181200', '#c49c22', '#fff8b0'], // 4 gold
    ['#050d03', '#3c6c26', '#b8e888'], // 5 foliage
    ['#031203', '#34b834', '#d0ffb0'], // 6 bright green (slime)
    ['#021014', '#24909a', '#b0fff4'], // 7 teal
    ['#03051a', '#2c4ea6', '#c0dcff'], // 8 blue
    ['#0c0318', '#6c2c9e', '#e8c0ff'], // 9 violet
    ['#18030e', '#a4346c', '#ffc0e0'], // 10 rose
    ['#07080c', '#5a6272', '#d8e0ee'], // 11 slate
    ['#120505', '#6e2c1c', '#d89878'], // 12 rust / mahogany
    ['#121008', '#8e8462', '#fffae6'], // 13 warm stone / cream
    ['#080a08', '#4c5c4a', '#c0d0b8'], // 14 moss grey
  ];
  R.DEFAULT_SPECIALS = [
    '#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0080ff', '#0000ff', '#8000ff',
    '#ff40a0', '#ffffff', '#fff0c0', '#c0f0ff', '#402000', '#204000', '#002040', /* 255 = transparent */ '#ff00ff',
  ];

  class Palette {
    constructor(opts = {}) {
      const ramps = opts.ramps || R.DEFAULT_RAMPS;
      const specials = opts.specials || R.DEFAULT_SPECIALS;
      this.rgb = new Uint8Array(256 * 3);
      let n = 0;
      for (let r = 0; r < 15; r++) {
        const [d, m, l] = (ramps[r] || R.DEFAULT_RAMPS[r]).map(hex);
        for (let k = 0; k < 16; k++) {
          const t = k / 15;
          let c;
          if (t < 0.5) c = d.map((v, i) => v + (m[i] - v) * (t * 2));
          else c = m.map((v, i) => v + (l[i] - v) * ((t - 0.5) * 2));
          this.rgb[n * 3] = Math.round(c[0]); this.rgb[n * 3 + 1] = Math.round(c[1]); this.rgb[n * 3 + 2] = Math.round(c[2]);
          n++;
        }
      }
      for (let k = 0; k < 16; k++) {
        const c = hex(specials[k] || '#ff00ff');
        this.rgb[n * 3] = c[0]; this.rgb[n * 3 + 1] = c[1]; this.rgb[n * 3 + 2] = c[2];
        n++;
      }
      this.TRANSPARENT = 255;
      this.cache = new Map();
      this.pack = new Uint32Array(256);
      for (let i = 0; i < 256; i++) this.pack[i] = Palette.packRGB(this.rgb[i * 3], this.rgb[i * 3 + 1], this.rgb[i * 3 + 2]);
      this.fogRGB = hex(opts.fogColor || '#3a4458');
      this.buildShades();
    }
    static packRGB(r, g, b) { return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }

    /** Nearest palette index (excluding the transparent key 255). */
    nearest(r, g, b) {
      r = r < 0 ? 0 : r > 255 ? 255 : r | 0;
      g = g < 0 ? 0 : g > 255 ? 255 : g | 0;
      b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      const hit = this.cache.get(key);
      if (hit !== undefined) return hit;
      let best = 0, bd = Infinity;
      const p = this.rgb;
      for (let i = 0; i < 255; i++) {
        const dr = r - p[i * 3], dg = g - p[i * 3 + 1], db = b - p[i * 3 + 2];
        const d = dr * dr * 3 + dg * dg * 4 + db * db * 2;
        if (d < bd) { bd = d; best = i; }
      }
      this.cache.set(key, best);
      return best;
    }

    /** Build the two 32-level shade sets (black fade and fog fade). */
    buildShades() {
      const p = this.rgb, fog = this.fogRGB;
      this.shades = [new Uint32Array(32 * 256), new Uint32Array(32 * 256)];
      for (let L = 0; L < 32; L++) {
        const f = L / 31;
        for (let i = 0; i < 256; i++) {
          const r = p[i * 3], g = p[i * 3 + 1], b = p[i * 3 + 2];
          // black fade (quantized back into the palette for authentic banding)
          const q = this.nearest(r * f, g * f, b * f);
          this.shades[0][L * 256 + i] = this.pack[q];
          const qf = this.nearest(fog[0] + (r - fog[0]) * f, fog[1] + (g - fog[1]) * f, fog[2] + (b - fog[2]) * f);
          this.shades[1][L * 256 + i] = this.pack[qf];
        }
      }
      this.fogPacked = Palette.packRGB(fog[0], fog[1], fog[2]);
    }
    color(i) { return [this.rgb[i * 3], this.rgb[i * 3 + 1], this.rgb[i * 3 + 2]]; }
  }
  R.Palette = Palette;
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
