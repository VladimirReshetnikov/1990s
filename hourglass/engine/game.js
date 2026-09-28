/*
 * Game rules for Hourglass (fork of RetroEngine's game.js): a sequence of
 * layered 3-D levels with platforming physics — run, jump, climb onto ledges,
 * careful steps, hang-and-drop — plus loose floors, pressure plates, timed
 * gates, levers, life triangles, checkpoints and level progression.
 *
 * All the movement numbers live in R.GAME_DEFAULTS; tools/physics.js checks
 * that they deliver the abilities that tools/verify.js assumes.
 *
 * Scripts (campaign.scripts[name](g, ctx)) receive this Game. API:
 *   g.msg(text) g.dialog(title, text) g.sound(name, x?, y?, z?) g.flash(rgb, a) g.shake(t)
 *   g.has(item) g.give(item) g.take(item) g.flag(name, value?) g.after(secs, fn)
 *   g.openDoor(tag, holdSecs?) g.closeDoor(tag) g.moveSpans(tag, 'fl'|'cl', target, speed, then?)
 *   g.setTex(tag, prop, tex) g.setSpans(tag, props) g.entities(tag) g.remove(e) g.spawn(spec)
 *   g.hurt(n, sx, sy, msg) g.kill(msg) g.heal(n) g.teleport(x, y, z?, ang?) g.win(info)
 */
(function (R) {
  'use strict';
  const U = R.util;

  R.GAME_DEFAULTS = {
    eyeHeight: 0.5, height: 0.62, radius: 0.24, stepUp: 0.35,
    walkSpeed: 2.2, runSpeed: 4.4, carefulSpeed: 1.1, turnSpeed: 2.6, accel: 12, airControl: 0.25,
    gravity: 13, jumpV: 4.2, standJumpPush: 2.6, coyote: 0.1, jumpBuffer: 0.15,
    climbMin: 0.35, climbMax: 2.1, airGrabLow: -0.3, airGrabHigh: 1.35, climbTimePerUnit: 0.32, climbTimeMin: 0.35,
    hangDrop: 1.1, fallSafe: 2.3, fallHurt: 4.4,
    maxLife: 3, lifeCap: 6, invuln: 1.0, knock: 5, useRange: 1.35,
    lookMax: 55, respawnInvuln: 1.5,
    baseLight: null,
  };

  class Game {
    constructor(camp, hooks = {}) {
      this.camp = camp;
      this.cfg = U.merge(R.GAME_DEFAULTS, camp.config);
      this.hooks = hooks;
      this.items = camp.items || {};
      this.scripts = camp.scripts || {};
      this.hazardDefs = {};
      for (const n of R.hazards.names()) this.hazardDefs[n] = Object.assign({}, R.hazards.get(n));
      for (const [n, h] of Object.entries(camp.hazards || {})) this.hazardDefs[n] = Object.assign({}, this.hazardDefs[n] || {}, h);
      this.persist = { life: this.cfg.maxLife, maxLife: this.cfg.maxLife, clock: 0, gems: 0, gemTotal: 0, deaths: 0, secrets: 0, relics: {} };
      this.loadLevel(0);
    }

    // ================================================================ levels
    loadLevel(index) {
      const lv = this.camp.levels[index];
      if (!lv) throw new Error(`No level ${index}`);
      this.levelIndex = index;
      this.world = R.compileLevel(this.camp, lv);
      this.time = 0;
      this.inv = {};
      for (const [id, n] of Object.entries(this.persist.relics)) if (n > 0) this.inv[id] = n;
      this.flags = {};
      this.won = false;
      this.levelDone = false;
      this.movers = [];
      this.timers = [];
      this.hazTimer = 0;
      this.lastSpan = null;
      this.lastLabel = null;
      const s = this.world.start;
      const cfg = this.cfg;
      this.player = {
        x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, ang: s.ang, pitch: 0,
        onGround: true, airPeak: s.z, lastGround: 0, jumpBuf: -1, mode: 'move', act: null,
        viewZ: s.z + cfg.eyeHeight, dip: 0, bobPhase: 0, bobAmp: 0, kvx: 0, kvy: 0,
        life: this.persist.life, maxLife: this.persist.maxLife, invuln: 0, alive: true, careful: false, edgeT: 0,
      };
      this.checkpoint = { x: s.x, y: s.y, z: s.z, ang: s.ang };
      this.spansWith = { anim: [], door: [], loose: [], plate: [] };
      for (const c of this.world.cells) for (const sp of c.spans) {
        if (sp.anim) this.spansWith.anim.push(sp);
        if (sp.door) this.spansWith.door.push(sp);
        if (sp.loose) this.spansWith.loose.push(sp);
        if (sp.plate) this.spansWith.plate.push(sp);
      }
      this.spawnEntities();
      this.levelGems = this.ents.filter(e => e.type === 'item' && this.itemDef(e.spec.item).kind === 'gem').length;
      if (lv.onStart) this.runScript(lv.onStart, {});
    }
    nextLevel() {
      this.persist.life = this.player.life; this.persist.maxLife = this.player.maxLife;
      if (this.levelIndex + 1 >= this.camp.levels.length) return false;
      this.loadLevel(this.levelIndex + 1);
      return true;
    }

    spawnEntities() {
      this.ents = [];
      for (const raw of this.world.spawns) this.spawn(raw, true);
    }
    /** Add an entity at runtime (projectiles, falling tiles...). */
    spawn(raw, initial = false) {
      const templates = this.camp.entityTemplates || {};
      let spec = raw;
      if (raw.tpl) {
        if (!templates[raw.tpl]) throw new Error(`Unknown entity template "${raw.tpl}"`);
        spec = Object.assign({}, templates[raw.tpl], raw);
      }
      const type = spec.type || 'deco';
      const def = R.entityTypes.get(type);
      const e = {
        id: this.ents.length, type, def, spec, x: spec.x, y: spec.y, x0: spec.x, y0: spec.y,
        z0: spec.z0 ?? 0, z: spec.z0 ?? 0, zOff: spec.z || 0, height: spec.height ?? 0.6,
        sprite: spec.sprite || null, radius: spec.radius ?? 0.3, solid: !!spec.solid, gone: false,
        state: spec.state || 0, tag: spec.tag || null, hang: !!spec.hang, seen: false, initial,
      };
      if (def.init) def.init(e, this);
      if (spec.solid !== undefined) e.solid = !!spec.solid;
      this.ents.push(e);
      return e;
    }
    itemDef(id) {
      const it = this.items[id];
      if (!it) throw new Error(`Unknown item "${id}"`);
      return it;
    }

    // ============================================================== hooks
    msg(text, secs = 4) { this.hooks.msg && this.hooks.msg(text, secs); }
    dialog(title, text, then) { this.hooks.dialog && this.hooks.dialog(title, text, then); }
    flash(rgb, a = 0.35) { this.hooks.flash && this.hooks.flash(rgb, a); }
    shake(t = 0.4) { this.hooks.shake && this.hooks.shake(t); }
    face(state) { this.hooks.face && this.hooks.face(state); }
    sound(name, x, y, vol = 1, z) {
      if (!this.hooks.sound) return;
      if (x === undefined) { this.hooks.sound(name, vol, 0); return; }
      const p = this.player, d = Math.hypot(p.x - x, p.y - y, z === undefined ? 0 : (p.z - z) * 1.5), range = 14;
      if (d > range) return;
      const a = U.angDiff(p.ang, Math.atan2(y - p.y, x - p.x));
      this.hooks.sound(name, vol * Math.pow(1 - d / range, 1.5), Math.sin(a) * Math.min(1, d / 2));
    }
    runScript(name, ctx = {}) {
      if (typeof name === 'function') return name(this, ctx);
      const fn = this.scripts[name];
      if (!fn) { console.warn('Missing script', name); return; }
      return fn(this, ctx);
    }
    flag(name, value) { if (value !== undefined) this.flags[name] = value; return this.flags[name]; }
    after(secs, fn) { this.timers.push({ at: this.time + secs, fn }); }

    // ============================================================== items
    has(id) { return (this.inv[id] || 0) > 0; }
    take(id) { if (!this.inv[id]) return false; if (--this.inv[id] <= 0) delete this.inv[id]; if (this.persist.relics[id]) this.persist.relics[id]--; return true; }
    give(id, opts = {}) {
      const it = this.itemDef(id), p = this.player;
      const say = (t, snd, col) => { if (!opts.silent) { this.msg(t, 4); this.sound(snd); if (col) this.flash(col, 0.3); } };
      switch (it.kind) {
        case 'life': p.life = Math.min(p.maxLife, p.life + (it.heal || 1)); say(it.msg || 'You feel better.', it.sound || 'drink', [255, 80, 80]); this.face('grin'); break;
        case 'bigLife': p.maxLife = Math.min(this.cfg.lifeCap, p.maxLife + 1); p.life = p.maxLife; say(it.msg || 'You feel stronger!', it.sound || 'bigdrink', [255, 220, 120]); this.face('grin'); break;
        case 'poison': this.hurt(it.damage || 1, null, null, it.msg || 'Poison!'); if (!opts.silent) this.sound('drink'); break;
        case 'gem': this.persist.gems++; say(it.msg || `${it.name}!`, it.sound || 'treasure', [120, 220, 255]); break;
        default:
          this.inv[id] = (this.inv[id] || 0) + 1;
          if (it.kind === 'relic') this.persist.relics[id] = (this.persist.relics[id] || 0) + 1;
          say(it.msg || `You got the ${it.name}.`, it.sound || (it.kind === 'key' ? 'key' : 'item'), [255, 220, 80]);
          this.face('grin');
      }
      if (it.onPickup) this.runScript(it.onPickup, opts);
    }
    heal(n) { const p = this.player; p.life = Math.min(p.maxLife, p.life + n); }
    carriedLight() { return this.cfg.baseLight || null; }
    heldSprite() { return null; }

    // ============================================================== world queries
    cellAt(x, y) { return this.world.cellAt(Math.floor(x), Math.floor(y)); }
    /** Span a body with feet at z would occupy in `cell`, or null if blocked. */
    occupy(cell, z) {
      if (!cell) return null;
      const cfg = this.cfg;
      for (const s of cell.spans) {
        if (s.fl > z + cfg.stepUp + 1e-6) continue;
        if (s.cl - Math.max(s.fl, z) < cfg.height - 1e-6) continue;
        return s;
      }
      return null;
    }
    /** Is (nx, ny) blocked for the player at feet height z? */
    blocked(nx, ny, z = this.player.z) {
      const cfg = this.cfg, p = this.player, r = cfg.radius, W = this.world;
      const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r), y0 = Math.floor(ny - r), y1 = Math.floor(ny + r);
      const ox0 = Math.floor(p.x - r), ox1 = Math.floor(p.x + r), oy0 = Math.floor(p.y - r), oy1 = Math.floor(p.y + r);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const c = W.cellAt(cx, cy);
        if (!c) return true;
        if (this.occupy(c, z)) continue;
        const inside = cx >= ox0 && cx <= ox1 && cy >= oy0 && cy <= oy1;
        if (inside && R.spanAt(c, z + 0.01)) continue; // being squeezed (crusher / closing gate): let them out
        return true;
      }
      for (const e of this.ents) {
        if (!e.solid || e.gone) continue;
        if (z + cfg.height < e.z || z > e.z + e.height) continue;
        const rr = r + e.radius, dn = Math.hypot(nx - e.x, ny - e.y);
        if (dn < rr && dn < Math.hypot(p.x - e.x, p.y - e.y)) return true;
      }
      return false;
    }
    /** The span a body with feet at z is in (or steps up into) in this cell, or null (rock). */
    spanFor(c, z) {
      if (!c) return null;
      const up = this.cfg.stepUp + 1e-6;
      for (const s of c.spans) if (s.fl <= z + up && s.cl > z + 0.01) return s;
      return null;
    }
    /** Highest floor under the body, lowest ceiling above it, and the span stood on. */
    supportAt(x, y, z = this.player.z) {
      const r = this.cfg.radius;
      let fz = -1e9, cz = 1e9, top = null;
      for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const s = this.spanFor(this.world.cellAt(cx, cy), z);
        if (!s) continue;
        if (s.fl > fz) { fz = s.fl; top = s; }
        if (s.cl < cz) cz = s.cl;
      }
      return { fz, cz, span: top };
    }
    /** The span directly under the player's centre (what you stand on). */
    footSpan() {
      const p = this.player, c = this.cellAt(p.x, p.y);
      return R.spanAt(c, p.z + 0.02) || R.spanBelow(c, p.z + 0.02);
    }

    // ============================================================== tags / doors / movers
    spansTagged(tag) {
      const s = this.world.tags.get(tag);
      if (!s) console.warn('No spans tagged', tag);
      return s || [];
    }
    setTex(tag, prop, name) {
      const id = R.textures.id(name);
      for (const s of this.spansTagged(tag)) s[prop] = id;
    }
    setSpans(tag, props) {
      for (const s of this.spansTagged(tag)) for (const [k, v] of Object.entries(props)) s[k] = ['ftex', 'ctex', 'wall', 'low', 'up'].includes(k) ? R.textures.id(v) : v;
    }
    moveSpans(tag, prop, target, speed = 1, then = null) {
      const spans = this.spansTagged(tag);
      this.movers.push({ spans, prop, target, speed, then });
      if (spans.length) this.sound('lift', spans[0].cell.x + 0.5, spans[0].cell.y + 0.5);
    }
    entities(tag) { return this.ents.filter(e => e.tag === tag); }
    remove(e) { e.gone = true; }

    openDoor(tagOrSpan, holdSecs = 0, silent = false) {
      const spans = typeof tagOrSpan === 'string' ? this.spansTagged(tagOrSpan)
        : (tagOrSpan.door && tagOrSpan.door.group ? this.spansTagged(tagOrSpan.door.group) : [tagOrSpan]);
      let played = false;
      for (const s of spans) {
        const d = s.door;
        if (!d) continue;
        if (holdSecs) d.holdUntil = this.time + holdSecs + (s.doorTop - s.cl) / d.speed;
        if (d.state === 'open' || d.state === 'opening') continue;
        d.state = 'opening';
        if (!silent && !played) { this.sound(d.sound, s.cell.x + 0.5, s.cell.y + 0.5, 1, s.fl); played = true; }
        if (d.secret && !d.found) { d.found = true; this.persist.secrets++; this.msg('You found a secret passage!'); this.sound('secret'); }
        if (d.script) this.runScript(d.script, { span: s });
      }
    }
    closeDoor(tag) {
      for (const s of this.spansTagged(tag)) if (s.door && s.door.state !== 'closed') { s.door.state = 'closing'; s.door.holdUntil = 0; this.sound(s.door.sound, s.cell.x + 0.5, s.cell.y + 0.5, 0.7, s.fl); }
    }
    useDoor(s) {
      const d = s.door;
      if (d.state === 'open' || d.state === 'opening') return false;
      if (d.remote) { this.msg(d.msg || 'It will not budge. Something else must open it.'); this.sound('locked'); return true; }
      if (d.key && !d.unlocked) {
        if (!this.has(d.key)) { this.msg(d.msg || `Locked. You need the ${this.itemDef(d.key).name}.`); this.sound('locked'); return true; }
        for (const gs of (d.group ? this.spansTagged(d.group) : [s])) if (gs.door) gs.door.unlocked = true;
        this.msg(d.openMsg || `You use the ${this.itemDef(d.key).name}.`);
        if (this.itemDef(d.key).consume) this.take(d.key);
      }
      this.openDoor(s);
      return true;
    }
    updateDoors(dt) {
      const p = this.player, cfg = this.cfg;
      for (const s of this.spansWith.door) {
        const d = s.door;
        if (d.state === 'opening') {
          s.cl = Math.min(s.doorTop, s.cl + d.speed * dt);
          if (s.cl >= s.doorTop) d.state = 'open';
        } else if (d.state === 'open') {
          if (d.holdUntil && this.time >= d.holdUntil) { d.state = 'closing'; d.holdUntil = 0; this.sound(d.sound, s.cell.x + 0.5, s.cell.y + 0.5, 0.6, s.fl); }
        } else if (d.state === 'closing') {
          let nc = Math.max(s.fl, s.cl - d.closeSpeed * dt);
          // never close onto the player
          const r = cfg.radius;
          if (Math.abs(p.x - (s.cell.x + 0.5)) < 0.5 + r && Math.abs(p.y - (s.cell.y + 0.5)) < 0.5 + r && p.z < s.doorTop && p.z + cfg.height > s.fl - 0.1) nc = Math.max(nc, Math.min(s.cl, p.z + cfg.height + 0.02));
          s.cl = nc;
          if (s.cl <= s.fl) d.state = 'closed';
        }
      }
    }
    updateMovers(dt) {
      for (const m of this.movers) {
        let done = true;
        for (const s of m.spans) {
          const v = s[m.prop];
          if (v === m.target) continue;
          const nv = v < m.target ? Math.min(m.target, v + m.speed * dt) : Math.max(m.target, v - m.speed * dt);
          s[m.prop] = nv;
          if (m.prop === 'fl') s.baseFl = nv; else s.baseCl = nv;
          if (nv !== m.target) done = false;
        }
        if (done) { m.finished = true; if (m.then) this.runScript(m.then, {}); }
      }
      if (this.movers.some(m => m.finished)) this.movers = this.movers.filter(m => !m.finished);
    }

    // ============================================================== loose floors & plates
    triggerLoose(s) {
      if (!s.loose || s.loose.state !== 'idle') return;
      s.loose.state = 'shaking'; s.loose.t = 0;
      this.sound('rattle', s.cell.x + 0.5, s.cell.y + 0.5, 0.9, s.fl);
    }
    updateLoose(dt) {
      for (const s of this.spansWith.loose) {
        const L = s.loose;
        if (L.state !== 'shaking') continue;
        L.t += dt;
        s.fl = s.baseFl + (Math.sin(L.t * 70) * 0.012);
        if (L.t >= L.delay) this.dropFloor(s);
      }
    }
    /** Remove the floor slab under span s: it falls to the span below. */
    dropFloor(s) {
      const c = s.cell, i = c.spans.indexOf(s);
      if (i < 0) return;
      s.loose.state = 'fallen';
      const x = c.x + 0.5, y = c.y + 0.5, z0 = s.baseFl;
      if (i > 0) {
        const below = c.spans[i - 1];
        below.cl = below.baseCl = s.cl; below.ctex = s.ctex; below.sky = below.sky || s.sky;
        c.spans.splice(i, 1);
        for (const b of c.band) if (b.span === s) b.span = below;
        this.spawn({ type: 'fallingTile', x, y, z0, landZ: below.fl, sprite: this.camp.looseSprite || 'LOOSE_TILE' });
      } else {
        s.fl = s.baseFl = -60; s.hazard = 'abyss'; s.loose = null;
        this.spawn({ type: 'fallingTile', x, y, z0, landZ: -40, sprite: this.camp.looseSprite || 'LOOSE_TILE' });
      }
      this.sound('crumble', x, y, 1, z0);
      this.spansWith.loose = this.spansWith.loose.filter(q => q !== s);
    }
    updatePlates(foot) {
      for (const s of this.spansWith.plate) {
        const on = foot === s && this.player.onGround;
        const P = s.plate;
        if (on && !P.pressed) {
          P.pressed = true; s.fl = s.baseFl - 0.04;
          this.sound('click', s.cell.x + 0.5, s.cell.y + 0.5, 1, s.fl);
          if (P.opens) this.openDoor(P.opens, P.hold || 0);
          if (P.closes) this.closeDoor(P.closes);
          if (P.script) this.runScript(P.script, { span: s });
          if (P.msg && !P.said) { P.said = true; this.msg(P.msg); }
        } else if (!on && P.pressed) { P.pressed = false; s.fl = s.baseFl; }
      }
    }

    // ============================================================== damage
    hurt(n, sx, sy, message) {
      const p = this.player;
      if (!p.alive || p.invuln > 0 || this.god) return false;
      p.life -= n;
      p.invuln = this.cfg.invuln;
      this.flash([255, 0, 0], Math.min(0.6, 0.25 + n * 0.15));
      this.face('ouch');
      this.shake(0.3);
      if (sx !== undefined && sx !== null) {
        let dx = p.x - sx, dy = p.y - sy; const l = Math.hypot(dx, dy) || 1;
        if (l < 1e-3) { dx = -Math.cos(p.ang); dy = -Math.sin(p.ang); }
        p.kvx = dx / l * this.cfg.knock; p.kvy = dy / l * this.cfg.knock;
      }
      if (message) this.msg(message, 3);
      if (p.life <= 0) { p.life = 0; this.die(message); } else this.sound('hurt');
      return true;
    }
    kill(message) {
      const p = this.player;
      if (!p.alive || this.god) return false;
      p.life = 0;
      this.flash([255, 0, 0], 0.7);
      if (message) this.msg(message, 3);
      this.die(message);
      return true;
    }
    die() {
      const p = this.player;
      p.alive = false; this.persist.deaths++;
      p.mode = 'move'; p.act = null;
      this.sound('death'); this.face('dead');
      this.hooks.died && this.hooks.died();
    }
    respawn() {
      const p = this.player, cp = this.checkpoint, cfg = this.cfg;
      Object.assign(p, { x: cp.x, y: cp.y, z: cp.z, ang: cp.ang, vx: 0, vy: 0, vz: 0, kvx: 0, kvy: 0, pitch: 0,
        onGround: true, airPeak: cp.z, mode: 'move', act: null, alive: true, invuln: cfg.respawnInvuln, life: p.maxLife });
      p.viewZ = p.z + cfg.eyeHeight;
      this.face('normal');
      this.hooks.respawned && this.hooks.respawned();
    }
    setCheckpoint(x, y, z, ang) {
      const p = this.player;
      this.checkpoint = { x: x ?? p.x, y: y ?? p.y, z: z ?? p.z, ang: ang ?? p.ang };
    }
    teleport(x, y, z, ang) {
      const p = this.player;
      p.x = x; p.y = y;
      const c = this.cellAt(x, y);
      const s = z !== undefined ? (R.spanAt(c, z + 0.01) || R.spanBelow(c, z + 0.01)) : c.spans[0];
      p.z = s ? s.fl : (z || 0); p.vz = 0; p.onGround = true; p.airPeak = p.z; p.mode = 'move'; p.act = null;
      if (ang !== undefined) p.ang = U.dirAngle(ang);
      p.viewZ = p.z + this.cfg.eyeHeight;
    }
    win(info = {}) {
      if (this.won) return;
      this.won = true;
      this.persist.life = this.player.life;
      this.hooks.won && this.hooks.won(info);
    }

    // ============================================================== main update
    update(dt, input) {
      const p = this.player;
      this.time += dt;
      if (!this.won && !this.levelDone) this.persist.clock += dt;
      for (const s of this.spansWith.anim) {
        R.cellAnims.get(s.anim.type).update(s, this.time, this);
        if (s.anim.justSlammed) this.sound('crush', s.cell.x + 0.5, s.cell.y + 0.5, 0.8, s.fl);
      }
      this.updateDoors(dt);
      if (this.movers.length) this.updateMovers(dt);
      this.updateLoose(dt);
      if (this.timers.length) {
        const due = this.timers.filter(t => t.at <= this.time);
        if (due.length) { this.timers = this.timers.filter(t => t.at > this.time); for (const t of due) this.runScript(t.fn, {}); }
      }
      if (p.alive && !this.won && !this.levelDone) this.updatePlayer(dt, input || {});
      else { p.vx = p.vy = 0; }
      const cfg = this.cfg;
      for (const e of this.ents) {
        if (e.gone) continue;
        if (e.def.update) e.def.update(e, this, dt);
        if (!p.alive || this.won || !e.def.touch) continue;
        if (Math.abs(p.x - e.x) > 2 || Math.abs(p.y - e.y) > 2) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d < e.radius + cfg.radius && p.z < e.z + e.height && p.z + cfg.height > e.z) e.def.touch(e, this);
      }
      p.invuln = Math.max(0, p.invuln - dt);
    }

    updatePlayer(dt, inp) {
      const cfg = this.cfg, p = this.player;
      p.careful = !!inp.careful;
      if (inp.jump) p.jumpBuf = this.time;
      // ---- scripted actions (climbing, hanging)
      if (p.act) { this.updateAction(dt); this.afterMove(dt); return; }

      p.ang += (inp.turn || 0) * cfg.turnSpeed * (inp.run ? 1.25 : 1) * dt;
      p.ang = U.mod(p.ang + Math.PI, Math.PI * 2) - Math.PI;
      if (inp.look) p.pitch = U.clamp(p.pitch + inp.look * 110 * dt, -cfg.lookMax, cfg.lookMax);
      if (inp.center) p.pitch *= Math.max(0, 1 - dt * 12);

      const sp = p.careful ? cfg.carefulSpeed : inp.run ? cfg.runSpeed : cfg.walkSpeed;
      let fwd = inp.fwd || 0, str = inp.strafe || 0;
      const l = Math.hypot(fwd, str); if (l > 1) { fwd /= l; str /= l; }
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      const tx = (dx * fwd - dy * str) * sp, ty = (dy * fwd + dx * str) * sp;
      const k = Math.min(1, cfg.accel * dt * (p.onGround ? 1 : cfg.airControl));
      if (p.onGround || fwd || str) { p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k; }

      // ---- jumping (with buffer and coyote time)
      const canJump = p.onGround || this.time - p.lastGround < cfg.coyote;
      if (p.jumpBuf >= 0 && this.time - p.jumpBuf <= cfg.jumpBuffer && canJump && p.vz <= 0.01) {
        p.jumpBuf = -1;
        if (this.tryClimb(false)) { this.afterMove(dt); return; }
        p.vz = cfg.jumpV; p.onGround = false; p.airPeak = p.z; p.lastGround = -10;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 1.2) { p.vx += dx * cfg.standJumpPush * (fwd >= 0 ? 1 : -0.5); p.vy += dy * cfg.standJumpPush * (fwd >= 0 ? 1 : -0.5); }
        this.sound('jump', undefined, undefined, 0.5);
      }

      // ---- horizontal movement with collision (sub-stepped)
      const mx = (p.vx + p.kvx) * dt, my = (p.vy + p.kvy) * dt;
      const kd = Math.max(0, 1 - 7 * dt); p.kvx *= kd; p.kvy *= kd;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 0.12));
      let hitWall = false;
      for (let i = 0; i < n; i++) {
        const sx = mx / n, sy = my / n;
        if (this.edgeGuard(p.x + sx, p.y)) { p.vx = 0; hitWall = 'edge'; }
        else if (!this.blocked(p.x + sx, p.y)) p.x += sx; else { p.vx = 0; p.kvx = 0; hitWall = true; }
        if (this.edgeGuard(p.x, p.y + sy)) { p.vy = 0; hitWall = 'edge'; }
        else if (!this.blocked(p.x, p.y + sy)) p.y += sy; else { p.vy = 0; p.kvy = 0; hitWall = hitWall || true; }
      }
      // careful step at an edge, still pushing forward: hang and drop
      if (hitWall === 'edge' && fwd > 0) { p.edgeT += dt; if (p.edgeT > 0.25 && this.tryHangDrop()) { p.edgeT = 0; this.afterMove(dt); return; } }
      else p.edgeT = 0;
      // in the air against a wall: grab a ledge
      if (!p.onGround && hitWall === true && fwd > 0 && this.tryClimb(true)) { this.afterMove(dt); return; }

      // ---- vertical
      const sup = this.supportAt(p.x, p.y);
      if (p.onGround && sup.fz < p.z - 0.001 && sup.fz >= p.z - cfg.stepUp && p.vz <= 0) {
        p.z = sup.fz; // walking down small steps
      }
      if (sup.fz >= p.z - 0.001 && p.vz <= 0) {
        if (!p.onGround) this.land(sup);
        p.z = Math.max(p.z, sup.fz); p.vz = 0; p.onGround = true; p.lastGround = this.time;
      } else {
        if (p.onGround) { p.onGround = false; p.airPeak = p.z; }
        p.vz -= cfg.gravity * dt;
        p.z += p.vz * dt;
        if (p.z > p.airPeak) p.airPeak = p.z;
        if (p.z + cfg.height > sup.cz) { p.z = sup.cz - cfg.height; if (p.vz > 0) { p.vz = 0; this.sound('bump', undefined, undefined, 0.4); } }
        if (p.z <= sup.fz) { p.z = sup.fz; this.land(sup); p.vz = 0; p.onGround = true; p.lastGround = this.time; }
      }
      // head bob + footsteps
      const spd = Math.hypot(p.vx, p.vy), prevPhase = p.bobPhase;
      p.bobPhase += spd * dt * 2.1;
      p.bobAmp += ((p.onGround ? Math.min(1, spd / cfg.runSpeed) : 0) - p.bobAmp) * Math.min(1, dt * 8);
      if (p.onGround && spd > 0.5 && Math.floor(prevPhase / Math.PI) !== Math.floor(p.bobPhase / Math.PI)) this.sound('step', undefined, undefined, p.careful ? 0.15 : 0.35);
      if (inp.use) this.useAction();
      this.afterMove(dt);
    }

    /** Careful step: refuse moves that would leave the floor for a drop. */
    edgeGuard(nx, ny) {
      const p = this.player;
      if (!p.careful || !p.onGround) return false;
      const s = this.supportAt(nx, ny);
      return s.fz < p.z - this.cfg.stepUp;
    }

    land(sup) {
      const p = this.player, cfg = this.cfg;
      const drop = p.airPeak - sup.fz;
      p.dip = Math.min(0.18, 0.04 + drop * 0.05);
      const s = sup.span;
      if (s && (s.hazard === 'abyss')) return;
      if (drop > cfg.fallHurt) { this.sound('land', undefined, undefined, 1); this.kill('You fell to your death.'); return; }
      if (drop > cfg.fallSafe) { this.sound('land', undefined, undefined, 1); this.hurt(1, null, null, 'A hard landing!'); }
      else if (drop > 0.9) this.sound('land', undefined, undefined, 0.6);
      p.airPeak = sup.fz;
      this.hooks.landed && this.hooks.landed(drop);
    }

    /**
     * Try to climb onto the ledge in front. fromAir: grab while jumping/falling.
     * Returns true when a climb starts.
     */
    tryClimb(fromAir) {
      const p = this.player, cfg = this.cfg;
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      const lo = fromAir ? p.z + cfg.airGrabLow : p.z + cfg.climbMin;
      const hi = fromAir ? p.z + cfg.airGrabHigh : p.z + cfg.climbMax;
      // the first cell ahead that differs from ours
      const cx = Math.floor(p.x), cy = Math.floor(p.y);
      let tx = null, ty = null, dist = 0;
      for (let s = 0.05; s <= 0.8; s += 0.05) {
        const ax = Math.floor(p.x + dx * s), ay = Math.floor(p.y + dy * s);
        if (ax !== cx || ay !== cy) { tx = ax; ty = ay; dist = s; break; }
      }
      if (tx === null) return false;
      const C = this.world.cellAt(tx, ty);
      if (!C) return false;
      const occ = this.occupy(C, p.z);
      if (occ && occ.fl <= p.z + cfg.stepUp && !fromAir) return false; // not a wall: just walk
      const here = this.supportAt(p.x, p.y);
      for (const s of C.spans) {
        if (s.fl < lo || s.fl > hi) continue;
        if (s.cl - s.fl < cfg.height + 0.02) continue;
        if (fromAir && occ === s) continue;
        if (here.cz < s.fl + cfg.height - 0.02) continue; // no room to pull up
        const ex = p.x + dx * (dist + 0.34), ey = p.y + dy * (dist + 0.34);
        if (this.blockedAtDest(ex, ey, s.fl)) continue;
        const dh = s.fl - p.z;
        p.act = { kind: 'climb', t: 0, dur: Math.max(cfg.climbTimeMin, 0.25 + Math.max(0, dh) * cfg.climbTimePerUnit), x0: p.x, y0: p.y, z0: p.z, x1: ex, y1: ey, z1: s.fl };
        p.vx = p.vy = p.vz = 0; p.onGround = false;
        this.sound(dh > 1 ? 'climb' : 'grab', undefined, undefined, 0.7);
        return true;
      }
      return false;
    }
    blockedAtDest(x, y, z) {
      const r = this.cfg.radius;
      for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const c = this.world.cellAt(cx, cy);
        if (!c) return true;
        const s = this.occupy(c, z);
        if (!s) return true;
      }
      return false;
    }
    /** Careful step over an edge: lower yourself and let go. */
    tryHangDrop() {
      const p = this.player, cfg = this.cfg;
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      for (const reach of [0.55, 0.7]) {
        const ex = p.x + dx * reach, ey = p.y + dy * reach;
        const cell = this.cellAt(ex, ey);
        if (!cell) continue;
        const below = R.spanBelow(cell, p.z - cfg.stepUp);
        if (!below || below.cl < p.z + cfg.height) continue;
        const depth = p.z - below.fl;
        if (depth <= cfg.stepUp) continue;
        const z1 = p.z - Math.min(cfg.hangDrop, depth - 0.05);
        // the body must fit in that column while hanging
        const r = cfg.radius; let ok = true;
        for (let cy = Math.floor(ey - r); cy <= Math.floor(ey + r) && ok; cy++) for (let cx = Math.floor(ex - r); cx <= Math.floor(ex + r); cx++) {
          const c = this.world.cellAt(cx, cy);
          const s = c && (R.spanAt(c, z1 + 0.01) || null);
          if (!s || s.cl < z1 + cfg.height) { ok = false; break; }
        }
        if (!ok) continue;
        p.act = { kind: 'hang', t: 0, dur: 0.55, x0: p.x, y0: p.y, z0: p.z, x1: ex, y1: ey, z1 };
        p.vx = p.vy = p.vz = 0; p.onGround = false;
        this.sound('grab', undefined, undefined, 0.6);
        return true;
      }
      return false;
    }
    updateAction(dt) {
      const p = this.player, a = p.act;
      a.t += dt;
      const f = Math.min(1, a.t / a.dur);
      if (a.kind === 'climb') {
        const up = U.smooth(Math.min(1, f / 0.65)), fwd = U.smooth(Math.max(0, (f - 0.55) / 0.45));
        p.z = a.z0 + (a.z1 - a.z0) * up + (f < 0.65 ? 0 : 0);
        p.x = a.x0 + (a.x1 - a.x0) * fwd; p.y = a.y0 + (a.y1 - a.y0) * fwd;
        if (f >= 1) { p.act = null; p.z = a.z1; p.onGround = true; p.airPeak = p.z; p.lastGround = this.time; p.vz = 0; }
      } else if (a.kind === 'hang') {
        const fwd = U.smooth(Math.min(1, f / 0.5)), down = U.smooth(Math.max(0, (f - 0.35) / 0.65));
        p.x = a.x0 + (a.x1 - a.x0) * fwd; p.y = a.y0 + (a.y1 - a.y0) * fwd;
        p.z = a.z0 + (a.z1 - a.z0) * down;
        if (f >= 1) { p.act = null; p.onGround = false; p.vz = 0; p.airPeak = p.z; this.sound('drop', undefined, undefined, 0.5); }
      }
    }

    /** Things that happen after moving: view height, spans entered, hazards. */
    afterMove(dt) {
      const p = this.player, cfg = this.cfg;
      const target = p.z + cfg.eyeHeight;
      if (p.act) p.viewZ = target;
      else if (p.viewZ < target && p.onGround) p.viewZ = Math.min(target, p.viewZ + Math.max(0.8 * dt, (target - p.viewZ) * Math.min(1, dt * 10)));
      else p.viewZ = target;
      p.dip = Math.max(0, p.dip - dt * 0.8);
      const sup = this.supportAt(p.x, p.y);
      if (p.viewZ > sup.cz - 0.06) p.viewZ = Math.max(p.z + 0.08, sup.cz - 0.06);
      const foot = this.footSpan();
      if (foot && foot !== this.lastSpan) { this.lastSpan = foot; this.enterSpan(foot); }
      if (p.onGround && !p.act) {
        if (foot && foot.loose && Math.abs(foot.fl - p.z) < 0.08) this.triggerLoose(foot);
        this.updatePlates(foot && Math.abs(foot.fl - p.z) < 0.1 ? foot : null);
      } else this.updatePlates(null);
      if (p.alive) this.applyHazards(dt, foot);
      if (foot && foot.exit && p.onGround && !this.levelDone) {
        this.levelDone = true;
        this.hooks.levelDone && this.hooks.levelDone();
      }
    }
    enterSpan(s) {
      if (s.checkpoint) this.setCheckpoint(s.cell.x + 0.5, s.cell.y + 0.5, s.fl, this.player.ang);
      if (s.secret && !s.secretFound) { s.secretFound = true; this.persist.secrets++; this.msg('A secret area!'); this.sound('secret'); }
      if (s.enter) this.runScript(s.enter, { span: s });
      if (s.label && s.label !== this.lastLabel) { this.lastLabel = s.label; this.hooks.area && this.hooks.area(s.label); }
      if (s.music && this.hooks.music) this.hooks.music(s.music);
    }
    applyHazards(dt, s) {
      const p = this.player, cfg = this.cfg;
      if (!s) return;
      // squeezed by a crusher
      if (s.anim && s.anim.type === 'crusher' && s.anim.slam && s.cl - p.z < cfg.height * 0.95) { this.kill(s.anim.msg || 'Crushed!'); return; }
      if (s.hazard === 'abyss') { if (p.z < p.airPeak - 3) this.kill('You fell into the abyss.'); return; }
      const onFloor = p.z <= s.fl + 0.03;
      if (!s.hazard || !onFloor) { this.hazTimer = 0; return; }
      const h = this.hazardDefs[s.hazard];
      if (!h) return;
      if (h.immune && this.has(h.immune)) return;
      if (h.deadly) { this.kill(h.msg || 'You died.'); return; }
      this.hazTimer -= dt;
      if (this.hazTimer <= 0) {
        this.hazTimer = h.interval ?? 0.8;
        p.invuln = 0;
        this.hurt(h.damage ?? 1, null, null, h.msg);
        if (h.sound) this.sound(h.sound);
      }
    }

    useAction() {
      const p = this.player, cfg = this.cfg;
      let best = null, bd = 1e9;
      for (const e of this.ents) {
        if (e.gone || !e.def.use) continue;
        if (Math.abs(e.z - p.z) > 1.2) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d > cfg.useRange + e.radius) continue;
        const a = Math.abs(U.angDiff(p.ang, Math.atan2(e.y - p.y, e.x - p.x)));
        if ((a < 0.75 || d < e.radius + cfg.radius + 0.1) && d < bd) { bd = d; best = e; }
      }
      if (best) { best.def.use(best, this); return; }
      const pcx = Math.floor(p.x), pcy = Math.floor(p.y);
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang), eyeZ = p.z + cfg.eyeHeight;
      for (let s = 0.05; s <= cfg.useRange; s += 0.05) {
        const cx = Math.floor(p.x + dx * s), cy = Math.floor(p.y + dy * s);
        if (cx === pcx && cy === pcy) continue;
        const c = this.world.cellAt(cx, cy);
        if (!c) break;
        // a door whose opening is at our height
        for (const sp of c.spans) if (sp.door && sp.fl <= p.z + cfg.stepUp && sp.doorTop >= p.z + 0.3 && sp.door.state !== 'open' && sp.door.state !== 'opening') { this.useDoor(sp); return; }
        const band = c.band[this.world.band(eyeZ)];
        if (band && band.use && !R.spanAt(c, eyeZ)) { this.runScript(band.use, { cell: c, band }); return; }
        if (!R.spanAt(c, eyeZ)) break;
      }
      this.sound('noway', undefined, undefined, 0.5);
    }

    /** Build the sprite list for the renderer (culling cells not rendered this frame). */
    spriteList(bank, stamp) {
      const p = this.player, list = [], W = this.world.W, vis = this.world.vis;
      for (const e of this.ents) {
        if (e.gone) continue;
        const name = e.def.sprite ? e.def.sprite(e, this) : e.sprite;
        if (!name) continue;
        if (vis && stamp !== undefined && Math.hypot(e.x - p.x, e.y - p.y) > 1.5) {
          const cx = Math.floor(e.x), cy = Math.floor(e.y);
          let ok = false;
          for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1; dx++) if (vis[(cy + dy) * W + cx + dx] === stamp) { ok = true; break; }
          if (!ok) continue;
        }
        const spr = bank.sprite(name);
        const c = this.world.cellAt(Math.floor(e.hang ? e.x0 : e.x), Math.floor(e.hang ? e.y0 : e.y));
        const s = c && (R.spanAt(c, e.z0 + 0.02) || R.spanBelow(c, e.z0 + 0.02));
        let z;
        if (e.hang || spr.hang) z = (s ? s.cl : e.z0 + 1.4) - spr.h / 64 * spr.scale * (e.scale || 1) - (e.spec.drop || 0);
        else if (e.free) z = e.z;
        else z = (s ? s.fl : e.z0) + e.zOff + (e.bob ? 0.04 + 0.035 * Math.sin(this.time * 3 + e.id) : 0);
        if (!e.free) e.z = e.hang ? (s ? s.fl : e.z0) : z;
        const frame = e.frame !== undefined ? e.frame : spr.frames.length > 1 ? Math.floor((this.time + e.id * 0.37) * spr.fps) : 0;
        list.push({ x: e.x, y: e.y, z, spr, frame, light: Math.min(31, (s ? s.light : 16) + (e.spec.light || 0)), fog: s ? s.fog : false, flip: !!e.flip, bright: !!e.bright, scale: e.scale, ent: e });
      }
      return list;
    }

    // ============================================================== save/load
    /** Saves are made at level starts: level index + what carries over. */
    serialize() {
      return { v: 2, campaign: this.camp.id, level: this.levelIndex, persist: this.persist, savedAt: Date.now() };
    }
    deserialize(s) {
      if (!s || s.campaign !== this.camp.id) throw new Error('Save belongs to another game');
      if (!this.camp.levels[s.level]) throw new Error('Save refers to a missing level');
      this.persist = Object.assign(this.persist, s.persist);
      this.loadLevel(s.level);
    }
  }
  R.Game = Game;

  // ------------------------------------------------ stock hazards
  R.hazards.register('lava', { deadly: true, msg: 'You fell into the lava!', sound: 'sizzle' });
  R.hazards.register('abyss', { deadly: true, msg: 'You fell into the abyss.' });
  R.hazards.register('fire', { damage: 1, interval: 0.8, msg: 'Too hot!', sound: 'sizzle' });
  R.hazards.register('shock', { damage: 1, interval: 0.8, msg: 'ZZZAP!', sound: 'zap' });
  R.hazards.register('acid', { damage: 1, interval: 0.8, msg: 'It burns!', sound: 'sizzle' });
  R.hazards.register('thorns', { damage: 1, interval: 1.0, msg: 'Thorns!' });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
