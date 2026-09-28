#!/usr/bin/env node
/*
 * Headless screenshots with the real renderer:
 *   node tools/snap.js out.png [--level 0] [--x 5.5 --y 3.5 --z 0 --ang 0 --pitch 0]
 *                             [--w 356 --h 200] [--scale 3] [--map] [--give key_bronze,...]
 * Without --x/--y the level start is used. --map draws the automap instead.
 * Handy for reviewing levels without a browser; pairs with an image viewer.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"/g)) vm.runInThisContext(fs.readFileSync(path.join(root, m[1]), 'utf8'), { filename: m[1] });
const R = globalThis.RetroEngine;

function writePNG(file, w, h, rgba) {
  const crcTable = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = buf => { let c = -1; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

/** Render one frame; returns {w, h, rgba}. opts: {level, x, y, z, ang, pitch, w, h, map, give, t} */
function snap(opts = {}) {
  const camp = R.campaigns.get(opts.campaign || R.campaigns.names()[0]);
  const W = opts.w || 356, H = opts.h || 200, uiScale = Math.max(1, Math.floor(H / 200)), viewH = H - 32 * uiScale;
  const pal = new R.Palette(camp.palette || {});
  const bank = new R.AssetBank(pal);
  bank.buildAllTextures();
  const renderer = new R.Renderer(pal, bank, camp.render || {});
  renderer.setSize(W, H, viewH);
  const buf = new Uint32Array(W * H);
  const app = { W, H, viewH, uiScale, buf, bank, pal, camp, opts: { timeLimit: false } };
  const ui = new R.UI(app);
  const g = new R.Game(camp, {});
  if (opts.level) g.loadLevel(+opts.level);
  for (const id of (opts.give || '').split(',').filter(Boolean)) g.give(id, { silent: true });
  if (opts.x !== undefined) g.teleport(+opts.x, +opts.y, opts.z !== undefined ? +opts.z : undefined, opts.ang !== undefined ? +opts.ang : undefined);
  else if (opts.ang !== undefined) g.player.ang = +opts.ang;
  for (let t = 0; t < (opts.t || 0.2); t += 1 / 60) g.update(1 / 60, {});
  g.player.pitch = +(opts.pitch || 0);
  const p = g.player;
  const cam = { x: p.x, y: p.y, z: p.viewZ, ang: p.ang, pitch: p.pitch * (viewH / 168), light: g.carriedLight() };
  bank.tick(g.time);
  if (opts.map) { g.revealMap = true; ui.mapZoom = +opts.zoom || 6; ui.drawAutomap(g); }
  else {
    renderer.render(buf, g.world, cam, g.time);
    renderer.sprites(buf, g.spriteList(bank, renderer.frameNo), cam);
  }
  ui.drawStatusBar(g);
  const rgba = Buffer.from(buf.buffer);
  return { w: W, h: H, rgba, game: g };
}
function upscale({ w, h, rgba }, k) {
  if (k <= 1) return { w, h, rgba };
  const out = Buffer.alloc(w * k * h * k * 4);
  for (let y = 0; y < h * k; y++) for (let x = 0; x < w * k; x++) rgba.copy(out, (y * w * k + x) * 4, (((y / k) | 0) * w + ((x / k) | 0)) * 4, (((y / k) | 0) * w + ((x / k) | 0)) * 4 + 4);
  return { w: w * k, h: h * k, rgba: out };
}

module.exports = { snap, writePNG, upscale };

if (require.main === module) {
  const args = process.argv.slice(2);
  const out = args[0] && !args[0].startsWith('--') ? args.shift() : 'snap.png';
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2), v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
    opts[k] = v;
  }
  const img = upscale(snap(opts), +(opts.scale || 2));
  writePNG(out, img.w, img.h, img.rgba);
  console.log(`wrote ${out} (${img.w}x${img.h})`);
}
