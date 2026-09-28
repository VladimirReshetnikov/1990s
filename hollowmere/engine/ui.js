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
          // hat
          p.ellipse(13, 9, 13, 2.6, hat); p.rect(6, 1, 14, 8, hat); p.ellipse(13, 1.5, 7, 1.5, R.hex(hat).map(v => v * 1.25));
          p.rect(6, 6, 14, 2, band); p.mul(6, 1, 2, 7, 1.3); p.mul(18, 1, 2, 7, 0.7);
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
      this.tile(this.app.camp.hudTexture || 'STONE_DARK', 0, y0, W, h, 14);
      this.rect(0, y0, W, s, rgb('#8a7050'));
      this.rect(0, y0 + s, W, s, rgb('#3a2a1a'));
      const L = Math.floor((W - 320 * s) / 2);
      const X = x => L + x * s, Y = y => y0 + y * s;
      const well = (x, y, w, hh) => { this.shadeRect(X(x), Y(y), w * s, hh * s, 0.7); this.bevel(X(x), Y(y), w * s, hh * s, rgb('#0a0806'), rgb('#6a5a44'), s); };
      const p = game.player, camp = this.app.camp, hud = camp.hud || {};
      // health
      well(3, 4, 58, 26);
      this.text('HEALTH', X(9), Y(6), COL.dim, s);
      const hp = Math.max(0, Math.ceil(p.health));
      this.textC(hp + '%', X(32), Y(14), hp > 60 ? gradGold : gradRed, s * 2);
      // keys
      well(64, 4, 50, 26);
      (hud.keys || []).slice(0, 4).forEach((id, i) => {
        const x = X(68 + (i % 2) * 22), y = Y(8 + Math.floor(i / 2) * 11);
        if (game.has(id)) this.sprite(game.itemDef(id).icon || game.itemDef(id).sprite, x, y, s);
        else this.rect(x + 4 * s, y + 3 * s, 8 * s, s, rgb('#2a2218'));
      });
      // face
      well(146, 1, 30, 31);
      const tier = p.health >= 67 ? 0 : p.health >= 34 ? 1 : 2;
      const fst = !p.alive ? 'DEAD' : this.face;
      const prefix = camp.face || 'FACE';
      this.sprite(`${prefix}_${tier}_${fst === 'DEAD' ? 'DEAD' : fst}`, X(148), Y(2), s);
      // tools
      well(117, 4, 26, 26);
      well(179, 4, 74, 26);
      const tools = (hud.tools || []).filter(id => game.has(id));
      tools.slice(0, 4).forEach((id, i) => {
        const it = game.itemDef(id);
        const spr = this.app.bank.sprite(it.icon || it.sprite);
        const sc = spr.w > 16 || spr.h > 16 ? 1 : 1;
        const x = X(182 + i * 18), y = Y(6 + Math.max(0, (16 - spr.h) / 2));
        this.sprite(it.icon || it.sprite, x, y, s * sc);
      });
      // light / held indicator slot
      const held = Object.keys(game.inv).map(k => game.items[k]).find(it => it && it.light);
      if (held) this.sprite(held.icon || held.sprite, X(121), Y(7), s);
      else this.text('-', X(128), Y(14), COL.dim, s);
      // relics
      well(256, 4, 61, 26);
      (hud.relics || []).slice(0, 3).forEach((id, i) => {
        const it = game.itemDef(id);
        const x = X(260 + i * 19), y = Y(10);
        const placed = game.flags['placed_' + id];
        if (game.has(id)) this.sprite(it.icon || it.sprite, x, y, s);
        else if (placed) { this.sprite(it.icon || it.sprite, x, y, s, 8); }
        else this.rect(x + 5 * s, y + 5 * s, 4 * s, 4 * s, rgb('#2a2218'));
      });
      if (hud.relicLabel) this.textC(hud.relicLabel, X(286), Y(24), COL.dim, s);
      if (tools.length === 0) this.textC('ITEMS', X(216), Y(14), rgb('#4a4030'), s);
    }

    // ---------------------------------------------------------- automap
    drawAutomap(game) {
      const W = this.W, VH = this.app.viewH, s = this.s, world = game.world, p = game.player;
      this.rect(0, 0, W, VH, rgb('#000000'));
      const floor = world.floors[p.floor], cells = floor.cells, seen = floor.seen, MW = world.W;
      const z = this.mapZoom * s;
      const cx = W / 2 - p.x * z, cy = VH / 2 - p.y * z;
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
      const cWall = rgb('#d04830'), cStep = rgb('#8a6a3a'), cDoor = rgb('#e0c060'), cWin = rgb('#4a8aa0'), cStair = rgb('#6a5a8a');
      const keyCol = id => { const it = game.items[id]; return it && it.color ? rgb(it.color) : cDoor; };
      const x0 = Math.max(0, Math.floor(-cx / z) - 1), x1 = Math.min(MW - 1, Math.ceil((W - cx) / z) + 1);
      const y0 = Math.max(0, Math.floor(-cy / z) - 1), y1 = Math.min(world.H - 1, Math.ceil((VH - cy) / z) + 1);
      const hazCol = { acid: rgb('#1a3a0a'), shock: rgb('#10204a'), fire: rgb('#4a1808'), pit: rgb('#202020'), thorns: rgb('#2a2a0a'), cold: rgb('#0a2030') };
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const k = y * MW + x;
        if (!seen[k] && !game.revealMap) continue;
        const c = cells[k];
        if (!c || c.solid) continue;
        const sx = cx + x * z, sy = cy + y * z;
        const hz = c.hazard || (c.anim && c.anim.type === 'cycle' ? c.anim.hazard : null);
        if (hz && hazCol[hz]) this.rect(sx + 1, sy + 1, z - 1, z - 1, hazCol[hz]);
        if (c.stair) { for (let i = 1; i < 3; i++) line(sx + 1, sy + i * z / 3, sx + z - 1, sy + i * z / 3, cStair); }
        if (c.anim && c.anim.type === 'crusher') { line(sx, sy, sx + z, sy + z, cWall); line(sx + z, sy, sx, sy + z, cWall); }
        const nb = [[1, 0, sx + z, sy, sx + z, sy + z], [-1, 0, sx, sy, sx, sy + z], [0, 1, sx, sy + z, sx + z, sy + z], [0, -1, sx, sy, sx + z, sy]];
        for (const [dx, dy, ax, ay, bx, by] of nb) {
          const n = world.cellAt(p.floor, x + dx, y + dy);
          let col = null;
          if (n.solid || (n.door && n.noMap && n.door.state !== 'open')) col = cWall;
          else if (n.door && n.door.state !== 'open' && !c.door) col = n.door.key ? keyCol(n.door.key) : cDoor;
          else if (c.door && c.door.state !== 'open' && !n.door) col = c.door.key ? keyCol(c.door.key) : cDoor;
          else if (n.block && !c.block) col = cWin;
          else if (Math.abs((n.portal >= 0 ? n.fl : n.fl) - c.fl) > 0.05 && !(c.stair && n.stair)) col = cStep;
          if (col !== null) line(ax, ay, bx, by, col);
        }
      }
      // known items
      for (const e of game.entsByFloor[p.floor]) {
        if (e.gone || !e.seen || e.type !== 'item') continue;
        const it = game.items[e.spec.item];
        const col = it && it.color ? rgb(it.color) : COL.gold;
        this.rect(cx + e.x * z - s, cy + e.y * z - s, 2 * s + 1, 2 * s + 1, col);
      }
      // player arrow
      const px = cx + p.x * z, py = cy + p.y * z, a = p.ang, L = 5 * s;
      const tip = [px + Math.cos(a) * L, py + Math.sin(a) * L];
      const l1 = [px + Math.cos(a + 2.5) * L * 0.8, py + Math.sin(a + 2.5) * L * 0.8];
      const l2 = [px + Math.cos(a - 2.5) * L * 0.8, py + Math.sin(a - 2.5) * L * 0.8];
      line(tip[0], tip[1], l1[0], l1[1], COL.white); line(tip[0], tip[1], l2[0], l2[1], COL.white);
      line(px - Math.cos(a) * L * 0.6, py - Math.sin(a) * L * 0.6, tip[0], tip[1], COL.white);
      this.textC(floor.name.toUpperCase(), W / 2, 4 * s, gradGold, s);
      this.textC('TAB: CLOSE   +/-: ZOOM', W / 2, VH - 10 * s, COL.dim, s);
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
