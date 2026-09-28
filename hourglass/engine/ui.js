/*
 * UI: status bar (with reactive portrait), messages, area banners, automap,
 * dialogs, inventory screen and menus — all drawn into the low-res
 * framebuffer with the bitmap font, like it's 1994.
 */
(function (R) {
  'use strict';
  const U = R.util, F = R.Font, P = R.Palette.packRGB;
  const rgb = h => { const c = R.hex(h); return P(c[0] | 0, c[1] | 0, c[2] | 0); };
  R.rgb = rgb;
  const COL = {
    white: rgb('#ffffff'), text: rgb('#e8dcc0'), dim: rgb('#8a8070'), gold: rgb('#f0c040'), red: rgb('#e03a2a'),
    green: rgb('#50e060'), blue: rgb('#60a0ff'), black: rgb('#000000'), panel: rgb('#1a1612'), cyan: rgb('#60e0e0'),
  };
  R.UICOL = COL;
  const gradGold = r => [rgb('#fff4b0'), rgb('#ffe070'), rgb('#f8c840'), rgb('#e0a030'), rgb('#c88020'), rgb('#a86018'), rgb('#804010')][r];
  const gradRed = r => [rgb('#ffb0a0'), rgb('#ff7a60'), rgb('#f04a30'), rgb('#d03020'), rgb('#b02018'), rgb('#901810'), rgb('#701008')][r];
  const gradStone = r => [rgb('#ffffff'), rgb('#e8e8e0'), rgb('#d0ccc0'), rgb('#b8b0a0'), rgb('#a09888'), rgb('#888070'), rgb('#706858')][r];
  R.UIGRAD = { gold: gradGold, red: gradRed, stone: gradStone };

  // ------------------------------------------------------------ portrait
  /** Registers FACE_<tier>_<state> sprites. Campaigns may call with other colours. */
  R.defFaces = function (prefix = 'FACE', o = {}) {
    const skin = o.skin || '#c8906c', hat = o.hat || '#5a3a1e', band = o.band || '#2a1a0e', hair = o.hair || '#3a2414';
    const tiers = 3, states = ['C', 'L', 'R', 'OUCH', 'GRIN', 'DEAD'];
    for (let tier = 0; tier < tiers; tier++) for (const st of states) {
      R.defSprite(`${prefix}_${tier}_${st}`, {
        w: 26, h: 30,
        gen(p) {
          const sk = st === 'DEAD' ? '#9a9a8a' : skin;
          p.ball(13, 17, 9.5, sk, 1.25, 0.55);
          p.rect(4, 13, 2, 7, hair); p.rect(20, 13, 2, 7, hair);
          if (o.style === 'turban') {
            // wrapped turban with a jewel
            p.ellipse(13, 6.5, 11.5, 6.5, hat);
            for (let k = 0; k < 4; k++) p.line(3 + k, 9 - k * 2, 23 - k, 4 + k, R.hex(hat).map(v => v * (k % 2 ? 0.75 : 1.2)));
            p.ellipse(13, 10, 11, 2, R.hex(hat).map(v => v * 0.8));
            p.disc(13, 7, 1.8, band); p.px(12, 6, '#ffffff');
          } else {
            // hat
            p.ellipse(13, 9, 13, 2.6, hat); p.rect(6, 1, 14, 8, hat); p.ellipse(13, 1.5, 7, 1.5, R.hex(hat).map(v => v * 1.25));
            p.rect(6, 6, 14, 2, band); p.mul(6, 1, 2, 7, 1.3); p.mul(18, 1, 2, 7, 0.7);
          }
          // eyes
          const ey = 16;
          if (st === 'DEAD') {
            for (const ex of [9, 17]) { p.line(ex - 1, ey - 1, ex + 1, ey + 1, '#200000'); p.line(ex + 1, ey - 1, ex - 1, ey + 1, '#200000'); }
          } else if (st === 'OUCH') {
            p.rect(7, ey, 4, 1, '#201008'); p.rect(15, ey, 4, 1, '#201008');
            p.line(7, ey - 3, 11, ey - 1, '#201008'); p.line(19, ey - 3, 15, ey - 1, '#201008');
          } else {
            const dx = st === 'L' ? -1 : st === 'R' ? 1 : 0;
            for (const ex of [9, 17]) { p.rect(ex - 2, ey - 1, 4, 3, '#f0f0e8'); p.rect(ex - 1 + dx, ey - 1, 2, 3, '#3a2a1a'); p.px(ex - 1 + dx, ey - 1, '#101010'); }
            p.rect(6, ey - 3, 5, 1, hair); p.rect(15, ey - 3, 5, 1, hair);
          }
          p.line(13, 17, 12, 21, R.hex(sk).map(v => v * 0.7)); p.px(13, 21, R.hex(sk).map(v => v * 0.6));
          // mouth
          if (st === 'GRIN') { p.rect(9, 23, 8, 2, '#f0ece0'); p.rect(9, 25, 8, 1, '#6a2018'); p.px(8, 22, '#6a2018'); p.px(17, 22, '#6a2018'); }
          else if (st === 'OUCH') p.ellipse(13, 24.5, 2.5, 2, '#3a0a08');
          else if (st === 'DEAD') p.rect(10, 24, 6, 1, '#3a2a2a');
          else p.rect(10, 24, 6, 1, tier === 2 ? '#5a1a14' : '#7a3a2a');
          // damage
          if (tier >= 1 && st !== 'DEAD') { p.disc(19, 21, 1.5, '#7a4a6a'); p.px(6, 18, '#8a2020'); }
          if (tier >= 2 || st === 'DEAD') { p.rect(8, 11, 1, 5, '#b01010'); p.rect(9, 12, 1, 3, '#b01010'); p.disc(16, 21, 1.2, '#6a3a5a'); p.line(20, 11, 21, 15, '#a01010'); }
        },
      });
    }
  };
  R.defFaces();
  // Aladdin: a thief of the bazaar, in a red turban
  R.defFaces('TFACE', { style: 'turban', hat: '#c83020', band: '#e8c040', skin: '#b87a54', hair: '#1a1008' });

  class UI {
    constructor(app) {
      this.app = app;
      this.msgs = [];
      this.bannerText = null; this.bannerT = 0;
      this.face = 'C'; this.faceT = 0; this.faceHold = 0;
      this.mapZoom = 7;
      this.dialogState = null;
    }
    get W() { return this.app.W; }
    get H() { return this.app.H; }
    get s() { return this.app.uiScale; }
    get buf() { return this.app.buf; }

    // ---------------------------------------------------------- primitives
    rect(x, y, w, h, col) {
      const W = this.W, H = this.H, b = this.buf;
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      const x0 = Math.max(0, x), x1 = Math.min(W, x + w), y0 = Math.max(0, y), y1 = Math.min(H, y + h);
      for (let j = y0; j < y1; j++) b.fill(col, j * W + x0, j * W + x1);
    }
    shadeRect(x, y, w, h, a, tint = [0, 0, 0]) {
      const W = this.W, H = this.H, b = this.buf, ia = 1 - a;
      x = Math.round(x); y = Math.round(y);
      const x0 = Math.max(0, x), x1 = Math.min(W, x + Math.round(w)), y0 = Math.max(0, y), y1 = Math.min(H, y + Math.round(h));
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
        const k = j * W + i, p = b[k];
        b[k] = P((p & 255) * ia + tint[0] * a, ((p >> 8) & 255) * ia + tint[1] * a, ((p >> 16) & 255) * ia + tint[2] * a);
      }
    }
    text(str, x, y, col = COL.text, s = this.s, shadow = 0xff000000) { F.draw(this.buf, this.W, this.H, str, x, y, col, s, shadow); }
    textC(str, cx, y, col = COL.text, s = this.s, shadow) { this.text(str, cx - F.width(str, s) / 2 + s / 2, y, col, s, shadow); }
    textR(str, rx, y, col = COL.text, s = this.s) { this.text(str, rx - F.width(str, s), y, col, s); }
    bevel(x, y, w, h, hi, lo, t = 1) {
      this.rect(x, y, w, t, hi); this.rect(x, y, t, h, hi);
      this.rect(x, y + h - t, w, t, lo); this.rect(x + w - t, y, t, h, lo);
    }
    panel(x, y, w, h, bg = rgb('#14100c'), a = 0.82) {
      this.shadeRect(x, y, w, h, a, R.hex(bg));
      const t = this.s;
      this.bevel(x, y, w, h, rgb('#8a7050'), rgb('#2a2016'), t);
      this.bevel(x + t, y + t, w - 2 * t, h - 2 * t, rgb('#4a3a28'), rgb('#0a0806'), t);
    }
    /** Draw a bank sprite in screen space. */
    sprite(name, x, y, scale = this.s, level = 31, frame = 0) {
      const spr = this.app.bank.sprite(name), fr = spr.frames[frame % spr.frames.length];
      const set = this.app.pal.shades[0], base = level * 256, W = this.W, H = this.H, b = this.buf;
      for (let u = 0; u < spr.w; u++) for (let v = 0; v < spr.h; v++) {
        const t = fr[u * spr.h + v]; if (t === 255) continue;
        const c = set[base + t];
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const px = Math.round(x + u * scale + sx), py = Math.round(y + v * scale + sy);
          if (px >= 0 && py >= 0 && px < W && py < H) b[py * W + px] = c;
        }
      }
      return spr;
    }
    /** Fill a region with a tiled wall texture (for status bar / backdrops). */
    tile(texName, x, y, w, h, level = 16, scale = this.s) {
      const t = this.app.bank.texture(R.textures.id(texName));
      const set = this.app.pal.shades[0], base = level * 256, W = this.W, b = this.buf;
      for (let j = Math.max(0, y); j < Math.min(this.H, y + h); j++) {
        const v = Math.floor((j - y) / scale) & t.hmask;
        for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
          const u = Math.floor((i - x) / scale) & t.wmask;
          b[j * W + i] = set[base + t.data[u * t.h + v]];
        }
      }
    }

    // ---------------------------------------------------------- messages
    addMessage(text, secs = 4) {
      this.msgs.push({ text: String(text).toUpperCase(), t: secs });
      if (this.msgs.length > 4) this.msgs.shift();
    }
    banner(text, secs = 2.6) { this.bannerText = String(text).toUpperCase(); this.bannerT = secs; }
    setFace(st) {
      if (st === 'ouch') { this.face = 'OUCH'; this.faceHold = 0.5; }
      else if (st === 'grin') { this.face = 'GRIN'; this.faceHold = 1.2; }
      else if (st === 'dead') { this.face = 'DEAD'; this.faceHold = 1e9; }
      else { this.face = 'C'; this.faceHold = 0; }
    }
    tick(dt) {
      for (const m of this.msgs) m.t -= dt;
      this.msgs = this.msgs.filter(m => m.t > 0);
      this.bannerT -= dt;
      if (this.faceHold > 0) { this.faceHold -= dt; if (this.faceHold <= 0 && this.face !== 'DEAD') this.face = 'C'; }
      else {
        this.faceT -= dt;
        if (this.faceT <= 0) { const r = Math.random(); this.face = r < 0.6 ? 'C' : r < 0.8 ? 'L' : 'R'; this.faceT = 0.7 + Math.random() * 1.5; }
      }
    }
    drawMessages(banner = true) {
      const s = this.s;
      let y = 3 * s;
      for (const m of this.msgs) {
        const col = m.t < 0.6 && Math.floor(m.t * 10) % 2 ? COL.dim : COL.text;
        for (const line of U.wrap(m.text, Math.floor((this.W - 8 * s) / (6 * s)))) { this.text(line, 4 * s, y, col, s); y += 9 * s; }
      }
      if (banner && this.bannerT > 0 && this.bannerText) {
        const big = s * 2, y0 = Math.round(this.app.viewH * 0.22);
        if (this.bannerT > 0.4 || Math.floor(this.bannerT * 16) % 2) this.textC(this.bannerText, this.W / 2, y0, gradGold, big);
      }
    }

    // ---------------------------------------------------------- status bar
    drawStatusBar(game) {
      const s = this.s, W = this.W, y0 = this.app.viewH, h = this.H - y0;
      const camp = this.app.camp, hud = camp.hud || {};
      this.tile(camp.hudTexture || 'STONE_DARK', 0, y0, W, h, 14);
      this.rect(0, y0, W, s, rgb('#8a7050'));
      this.rect(0, y0 + s, W, s, rgb('#3a2a1a'));
      const L = Math.floor((W - 320 * s) / 2);
      const X = x => L + x * s, Y = y => y0 + y * s;
      const well = (x, y, w, hh) => { this.shadeRect(X(x), Y(y), w * s, hh * s, 0.7); this.bevel(X(x), Y(y), w * s, hh * s, rgb('#0a0806'), rgb('#6a5a44'), s); };
      const p = game.player;
      // life triangles
      well(3, 4, 98, 26);
      this.text('LIFE', X(8), Y(6), COL.dim, s);
      const red = rgb('#e02818'), redHi = rgb('#ff8060'), dark = rgb('#3a1410'), edge = rgb('#801008');
      for (let i = 0; i < game.cfg.lifeCap; i++) {
        if (i >= p.maxLife) break;
        const cx = X(12 + i * 14), cy = Y(15);
        const full = i < p.life;
        const blink = full && p.life === 1 && Math.floor(performance.now() / 250) % 2;
        for (let r = 0; r < 11 * s; r++) {
          const half = Math.floor((r / (11 * s)) * 6 * s);
          this.rect(cx - half, cy + r, half * 2 + 1, 1, full && !blink ? (r < 3 * s ? redHi : red) : dark);
          this.rect(cx - half, cy + r, 1, 1, edge); this.rect(cx + half, cy + r, 1, 1, edge);
        }
      }
      // gems
      well(104, 4, 38, 26);
      if (hud.gemSprite) this.sprite(hud.gemSprite, X(107), Y(9), s);
      this.textR(String(game.persist.gems), X(139), Y(14), COL.cyan, s);
      // face
      well(146, 1, 30, 31);
      const tier = p.life >= 3 ? 0 : p.life === 2 ? 1 : 2;
      this.sprite(`${camp.face || 'FACE'}_${tier}_${!p.alive ? 'DEAD' : this.face}`, X(148), Y(2), s);
      // keys
      well(179, 4, 58, 26);
      const keys = (hud.keys || []).filter(id => game.has(id));
      keys.slice(0, 3).forEach((id, i) => { const it = game.itemDef(id); this.sprite(it.icon || it.sprite, X(183 + i * 18), Y(10), s); });
      (hud.relics || []).filter(id => game.has(id)).slice(0, 1).forEach(id => { const it = game.itemDef(id); this.sprite(it.icon || it.sprite, X(221), Y(8), s); });
      if (!keys.length) this.textC('KEYS', X(208), Y(14), rgb('#4a4030'), s);
      // hourglass + time + level
      well(240, 4, 77, 26);
      const clock = game.persist.clock, limit = !!game.persist.timed;
      const shown = limit ? Math.max(0, 3600 - clock) : clock;
      this.drawHourglass(X(244), Y(7), s, limit ? Math.max(0, 1 - clock / 3600) : 1 - ((clock % 60) / 60));
      const warn = limit && shown < 300;
      this.textR(U.formatTime(shown), X(313), Y(8), warn ? gradRed : gradGold, s);
      this.textR(`LEVEL ${game.levelIndex + 1}`, X(313), Y(19), COL.dim, s);
    }
    /** A little hourglass icon; frac = sand remaining in the top bulb. */
    drawHourglass(x, y, s, frac) {
      const wood = rgb('#6a4424'), glass = rgb('#2a3040'), sand = rgb('#e0b050');
      this.rect(x, y, 13 * s, 2 * s, wood); this.rect(x, y + 18 * s, 13 * s, 2 * s, wood);
      for (let r = 0; r < 16 * s; r++) {
        const t = r / (16 * s), half = Math.max(1, Math.round(Math.abs(t - 0.5) * 2 * 5 * s));
        const cx = x + Math.round(6.5 * s);
        this.rect(cx - half, y + 2 * s + r, half * 2, 1, glass);
        const top = t < 0.5, fillTop = top && (0.5 - t) * 2 < frac, fillBot = !top && (t - 0.5) * 2 > frac;
        if (fillTop || fillBot) this.rect(cx - half + 1, y + 2 * s + r, Math.max(1, half * 2 - 2), 1, sand);
      }
      if (frac > 0 && frac < 1) this.rect(x + Math.round(6.5 * s), y + 10 * s, 1, 8 * s, sand);
    }

    // ---------------------------------------------------------- automap
    /** Top-down map of one storey: the player's, or mapDz above/below it (PgUp/PgDn). */
    drawAutomap(game) {
      const W = this.W, VH = this.app.viewH, s = this.s, world = game.world, p = game.player;
      this.rect(0, 0, W, VH, rgb('#000000'));
      const dz = this.mapDz || 0, z = p.z + dz, MW = world.W;
      const zoom = this.mapZoom * s;
      const cx = W / 2 - p.x * zoom, cy = VH / 2 - p.y * zoom;
      const b = this.buf;
      const line = (x0, y0, x1, y1, col) => {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let e = dx + dy;
        for (let n = 0; n < 4000; n++) {
          if (x0 >= 0 && y0 >= 0 && x0 < W && y0 < VH) b[y0 * W + x0] = col;
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
        }
      };
      // the span of a cell that belongs to the player's band
      const bandSpan = c => {
        if (!c) return null;
        let best = null;
        for (const sp of c.spans) if (sp.fl <= z + 1.2 && sp.cl > z + 0.3) best = sp;
        return best;
      };
      const cWall = rgb('#d04830'), cStep = rgb('#8a6a3a'), cDoor = rgb('#e0c060'), cGate = rgb('#60a0e0'), cLoose = rgb('#a08060');
      const keyCol = id => { const it = game.items[id]; return it && it.color ? rgb(it.color) : cDoor; };
      const x0 = Math.max(0, Math.floor(-cx / zoom) - 1), x1 = Math.min(MW - 1, Math.ceil((W - cx) / zoom) + 1);
      const y0 = Math.max(0, Math.floor(-cy / zoom) - 1), y1 = Math.min(world.H - 1, Math.ceil((VH - cy) / zoom) + 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const c = world.cells[y * MW + x];
        const sp = bandSpan(c);
        if (!sp || (!sp.seen && !game.revealMap)) continue;
        const sx = cx + x * zoom, sy = cy + y * zoom;
        const depth = z - sp.fl;
        if (sp.hazard === 'lava') this.rect(sx + 1, sy + 1, zoom - 1, zoom - 1, rgb('#6a1808'));
        else if (sp.hazard === 'abyss' || depth > 2.5) this.rect(sx + 1, sy + 1, zoom - 1, zoom - 1, rgb('#101018'));
        else if (depth > 0.6) this.rect(sx + 1, sy + 1, zoom - 1, zoom - 1, rgb('#1a1612'));
        else if (sp.fl - z > 0.6) this.rect(sx + 1, sy + 1, zoom - 1, zoom - 1, rgb('#2a2418'));
        if (sp.loose && sp.loose.state !== 'fallen') { line(sx + 2, sy + 2, sx + zoom - 2, sy + zoom - 2, cLoose); }
        if (sp.plate) this.rect(sx + zoom / 2 - s, sy + zoom / 2 - s, 2 * s + 1, 2 * s + 1, cGate);
        if (sp.exit) this.rect(sx + 2, sy + 2, zoom - 3, zoom - 3, rgb('#2a6a2a'));
        for (const [dx, dy, ax, ay, bx, by] of [[1, 0, sx + zoom, sy, sx + zoom, sy + zoom], [-1, 0, sx, sy, sx, sy + zoom], [0, 1, sx, sy + zoom, sx + zoom, sy + zoom], [0, -1, sx, sy, sx + zoom, sy]]) {
          const n = world.cellAt(x + dx, y + dy);
          const ns = bandSpan(n);
          let col = null;
          if (!ns) col = cWall;
          else if (ns.door && ns.door.state !== 'open' && !sp.door) col = ns.door.secret ? cWall : ns.door.remote ? cGate : ns.door.key ? keyCol(ns.door.key) : cDoor;
          else if (sp.door && sp.door.state !== 'open' && !ns.door) col = sp.door.secret ? cWall : sp.door.remote ? cGate : sp.door.key ? keyCol(sp.door.key) : cDoor;
          else if (Math.abs(ns.fl - sp.fl) > 0.3) col = cStep;
          if (col !== null) line(ax, ay, bx, by, col);
        }
      }
      for (const e of game.ents) {
        if (e.gone || !e.seen || e.type !== 'item' || Math.abs(e.z0 - z) > 1.5) continue;
        const it = game.items[e.spec.item];
        this.rect(cx + e.x * zoom - s, cy + e.y * zoom - s, 2 * s + 1, 2 * s + 1, it && it.color ? rgb(it.color) : COL.gold);
      }
      const px = cx + p.x * zoom, py = cy + p.y * zoom, a = p.ang, Lr = dz ? 3 * s : 5 * s;
      const tip = [px + Math.cos(a) * Lr, py + Math.sin(a) * Lr];
      line(tip[0], tip[1], px + Math.cos(a + 2.5) * Lr * 0.8, py + Math.sin(a + 2.5) * Lr * 0.8, COL.white);
      line(tip[0], tip[1], px + Math.cos(a - 2.5) * Lr * 0.8, py + Math.sin(a - 2.5) * Lr * 0.8, COL.white);
      line(px - Math.cos(a) * Lr * 0.6, py - Math.sin(a) * Lr * 0.6, tip[0], tip[1], COL.white);
      const lv = this.app.camp.levels[game.levelIndex];
      const k = Math.round(dz / 1.5);
      this.textC(lv.name.toUpperCase() + (k ? `  -  ${Math.abs(k)} STOREY${Math.abs(k) > 1 ? 'S' : ''} ${k > 0 ? 'ABOVE' : 'BELOW'}` : ''), W / 2, 4 * s, gradGold, s);
      this.textC('TAB: CLOSE   +/-: ZOOM   PGUP/PGDN: STOREY', W / 2, VH - 10 * s, COL.dim, s);
    }

    // ---------------------------------------------------------- dialog
    drawDialog(d) {
      const s = this.s, W = this.W, H = this.H;
      const maxChars = Math.min(46, Math.floor((W / s - 40) / 6));
      const lines = U.wrap(d.text, maxChars);
      const w = (maxChars * 6 + 20) * s, h = (lines.length * 9 + 36) * s;
      const x = Math.round((W - w) / 2), y = Math.round(Math.max(4 * s, (this.app.viewH - h) / 2));
      this.panel(x, y, w, h, '#1c140c', 0.9);
      this.textC(d.title.toUpperCase(), W / 2, y + 7 * s, gradGold, s);
      lines.forEach((ln, i) => this.text(ln.toUpperCase(), x + 10 * s, y + (20 + i * 9) * s, COL.text, s));
      if (Math.floor(performance.now() / 400) % 2) this.textC('PRESS SPACE', W / 2, y + h - 11 * s, COL.dim, s);
    }

    drawInventory(game) {
      const s = this.s, W = this.W;
      const ids = Object.keys(game.inv);
      const w = Math.min(W - 8 * s, 300 * s), rows = Math.max(1, ids.length);
      const h = (rows * 22 + 34) * s;
      const x = Math.round((W - w) / 2), y = Math.round(Math.max(4 * s, (this.app.viewH - h) / 2));
      this.panel(x, y, w, h, '#1c140c', 0.9);
      this.textC('INVENTORY', W / 2, y + 7 * s, gradGold, s);
      if (!ids.length) this.textC('YOU CARRY NOTHING OF NOTE.', W / 2, y + 22 * s, COL.dim, s);
      ids.forEach((id, i) => {
        const it = game.itemDef(id), yy = y + (20 + i * 22) * s;
        const spr = this.app.bank.sprite(it.icon || it.sprite);
        this.sprite(it.icon || it.sprite, x + 8 * s, yy + Math.max(0, (16 - spr.h) / 2) * s, s);
        this.text(it.name.toUpperCase() + (game.inv[id] > 1 ? ' X' + game.inv[id] : ''), x + 30 * s, yy, COL.gold, s);
        const d = U.wrap((it.desc || '').toUpperCase(), Math.floor((w / s - 40) / 6))[0] || '';
        this.text(d, x + 30 * s, yy + 9 * s, COL.dim, s);
      });
      this.textC('I: CLOSE', W / 2, y + h - 10 * s, COL.dim, s);
    }

    // ---------------------------------------------------------- menus
    /** items: [{label, action?, value?(): string, left?(), right?(), disabled?}] */
    drawMenu(title, items, cursor, y0, opts = {}) {
      const s = this.s, W = this.W;
      if (title) this.textC(title, W / 2, y0, gradGold, s * 2);
      let y = y0 + (title ? 26 * s : 0);
      const big = opts.big ? 2 : 1;
      items.forEach((it, i) => {
        const label = (it.label + (it.value ? ': ' + it.value() : '')).toUpperCase();
        const sel = i === cursor;
        const col = it.disabled ? rgb('#5a5040') : sel ? gradGold : gradStone;
        this.textC(label, W / 2, y, col, s * big);
        if (sel) {
          const wHalf = F.width(label, s * big) / 2;
          const fl = Math.floor(performance.now() / 150) % 2;
          this.sprite('CANDLE', W / 2 - wHalf - 14 * s, y - 4 * s * big + 2, s * big === 1 ? s : s, 31, fl);
          this.sprite('CANDLE', W / 2 + wHalf + 6 * s, y - 4 * s * big + 2, s, 31, fl);
        }
        y += (big === 2 ? 18 : 11) * s;
      });
      return y;
    }
  }
  R.UI = UI;
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
