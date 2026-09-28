/*
 * Texture & sprite registries and the lazily-built AssetBank.
 *
 *   RetroEngine.defTexture('BRICK', { w:64, h:64, gen(p, ctx) { ... } })
 *   RetroEngine.defSprite('LAMP',   { w:16, h:48, emissive:true, gen(p, ctx) { ... } })
 *   RetroEngine.defAsciiSprite('KEY', ['..XX..', ...], { X:'#ffcc00' })
 *
 * Generators paint into a Pix (RGBA float canvas); the bank quantizes them to
 * the palette once, on first use. ctx = { rng, frame, frames, seed, call }
 * where call(name, p) runs another texture's generator (for variants).
 * Texture world size: 64 texels = 1 map unit. Wall textures are 64 wide and
 * 64 or 128 tall. Flats are 64x64. Sky textures are any width x 128.
 */
(function (R) {
  'use strict';
  const U = R.util;
  R.textures = new R.Registry('texture');
  R.sprites = new R.Registry('sprite');

  R.defTexture = function (name, def) {
    def = Object.assign({ w: 64, h: 64, frames: 1, fps: 8, emissive: false }, def);
    return R.textures.register(name, def);
  };
  R.defSprite = function (name, def) {
    def = Object.assign({ w: 32, h: 32, frames: 1, fps: 8, emissive: false, scale: 1 }, def);
    return R.sprites.register(name, def);
  };
  R.defAsciiSprite = function (name, rows, key, opts = {}) {
    const frames = Array.isArray(rows[0]) ? rows : [rows];
    const h = frames[0].length, w = Math.max(...frames[0].map(r => r.length));
    return R.defSprite(name, Object.assign({
      w: w * (opts.upscale || 1), h: h * (opts.upscale || 1), frames: frames.length,
      gen(p, ctx) {
        let src = R.Pix.fromAscii(frames[ctx.frame], key);
        if (opts.upscale) src = src.scaled(opts.upscale);
        if (opts.outline) src.outline(opts.outline);
        p.blit(src, 0, 0);
      },
    }, opts));
  };

  function makeCtx(name, frame, frames, wrap) {
    const seed = U.hash(name) + frame * 7919;
    return {
      rng: U.rng(seed), seed, frame, frames, name, t: frame / frames,
      call(other, p, extra) {
        const d = R.textures.has(other) ? R.textures.get(other) : R.sprites.get(other);
        d.gen(p, Object.assign(makeCtx(other, frame, frames, wrap), extra || {}));
      },
    };
  }

  /** Render a registered generator to a Pix (used by the bank and the HUD). */
  R.paint = function (reg, name, frame = 0) {
    const def = reg.get(name);
    const p = new R.Pix(def.w, def.h, reg === R.textures);
    def.gen(p, makeCtx(name, frame, def.frames, reg === R.textures));
    return p;
  };

  class AssetBank {
    constructor(pal) {
      this.pal = pal;
      this.tex = [];          // by texture id
      this.spr = new Map();   // by sprite name
      this.anim = [];
    }
    texture(id) {
      let t = this.tex[id];
      if (t) return t;
      const name = R.textures.order[id];
      const def = R.textures.get(name);
      const frames = [];
      for (let f = 0; f < def.frames; f++) frames.push(R.paint(R.textures, name, f).toIndexed(this.pal));
      t = {
        id, name, w: def.w, h: def.h, frames, data: frames[0], fps: def.fps,
        emissive: !!def.emissive, hmask: def.h - 1, wmask: def.w - 1, sky: !!def.sky,
      };
      this.tex[id] = t;
      if (frames.length > 1) this.anim.push(t);
      return t;
    }
    buildAllTextures() { for (let i = 0; i < R.textures.order.length; i++) this.texture(i); }
    sprite(name) {
      let s = this.spr.get(name);
      if (s) return s;
      const def = R.sprites.get(name);
      const frames = [];
      for (let f = 0; f < def.frames; f++) frames.push(R.paint(R.sprites, name, f).toIndexed(this.pal));
      s = { name, w: def.w, h: def.h, frames, fps: def.fps, emissive: !!def.emissive, scale: def.scale || 1, hang: !!def.hang };
      this.spr.set(name, s);
      return s;
    }
    tick(t) {
      for (const a of this.anim) a.data = a.frames[Math.floor(t * a.fps) % a.frames.length];
    }
  }
  R.AssetBank = AssetBank;
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
