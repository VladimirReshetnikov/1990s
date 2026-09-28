/*
 * Game rules for Hourglass (fork of RetroEngine's game.js): a sequence of
 * layered 3-D levels with platforming physics — run, jump, climb onto ledges,
 * catch ledges in mid-air, careful steps, hanging from edges — plus loose
 * floors, pressure plates, timed gates, levers, life triangles, checkpoints
 * that restore the world as it was, and level progression.
 *
 * THE MOVES CONTRACT (R.GAME_DEFAULTS at the fixed 120 Hz step; storeys are
 * 1.5 apart; proven two-sided by tools/physics.js, assumed by tools/verify.js,
 * replayed move by move in the real levels by tools/replay.js):
 *   same level:  standing jump lands a 1-cell gap, never 2 · running jump lands 2,
 *                catches the lip of 3, never crosses 4
 *   down 1 storey: standing makes 2 · running lands 3, catches 4, never 5
 *   up:          climb a ledge 0.35..1.75 above the feet (one storey) from a stand ·
 *                in the air, catch a lip 0.10..0.90 above the feet
 *   falls:       measured from the last floor (never the jump apex): ≤ 2.3 safe,
 *                ≤ 3.8 cost a life, more kill · hanging lowers the feet 0.9
 * Support (ledges, loose floors, careful stops) uses a narrow foot circle;
 * walls and ceilings use the body circle.
 *
 * Space: hanging → pull up; a ledge ahead → climb; Forward held → jump (a running
 * jump waits for the edge); otherwise a straight-up jump.
 * C (held): careful step, stops at edges. At an edge press Forward again to
 * lower yourself into a hang; while hanging keep C held; let go (or Back) to drop.
 *
 * Scripts (campaign/level scripts[name](g, ctx)) receive this Game. API:
 *   g.msg(text) g.dialog(title, text) g.sound(name, x?, y?, vol?, z?) g.flash(rgb, a) g.shake(t)
 *   g.has(item) g.give(item) g.take(item) g.flag(name, value?) g.after(secs, fn)
 *   g.openDoor(tag, holdSecs?) g.closeDoor(tag) g.moveSpans(tag, 'fl'|'cl', target, speed, then?)
 *   g.setTex(tag, prop, tex) g.setSpans(tag, props) g.entities(tag) g.remove(e) g.spawn(spec)
 *   g.hurt(n, sx, sy, msg) g.kill(msg) g.heal(n) g.teleport(x, y, z?, ang?) g.win(info)
 *   g.spansTagged(tag) g.triggerLoose(span) g.dropFloor(span, instant?)
 *   g.armLoose(tag) — wake loose floors declared { loose: { armed: false } } (they are solid until then)
 *   g.crumble(tag, x, y, speed = 3.5, lag = 0.3) — a wave of falling floor spreading from (x, y)
 * Every change made through this API is remembered by the checkpoint event log.
 */
(function (R) {
  'use strict';
  const U = R.util;

  R.GAME_DEFAULTS = {
    eyeHeight: 0.5, height: 0.62, radius: 0.24, footRadius: 0.1, stepUp: 0.35, airStepUp: 0.1,
    walkSpeed: 2.2, runSpeed: 4.2, carefulSpeed: 1.1, turnSpeed: 2.6, accel: 8, brake: 12, airControl: 0.25,
    gravity: 13, jumpV: 3.6, standJumpPush: 2.1, coyote: 0.06, jumpBuffer: 0.15, edgeSnap: 0.9, snapWait: 0.25,
    climbMin: 0.35, climbMax: 1.75, climbReach: 0.4, climbTime: 0.9, catchLow: 0.1, catchHigh: 0.9,
    hangDepth: 0.9, hangOut: 0.3, lowerTime: 0.5, pullTime: 0.6, upReach: 1.4,
    fallSafe: 2.3, fallHurt: 3.8, looseDelay: 0.7,
    maxLife: 3, lifeCap: 6, invuln: 1.0, knock: 3.5, useRange: 1.35, drinkRange: 1.0,
    lookMax: 80, respawnInvuln: 1.5, turnAroundTime: 0.3, magnet: 0.12,
    baseLight: null,
  };
  R.PHYSICS_DT = 1 / 120;
  const DRINKS = ['life', 'bigLife', 'poison'];

  class Game {
    /** opts.level: the level index to start at (default 0). */
    constructor(camp, hooks = {}, opts = {}) {
      this.camp = camp;
      this.cfg = U.merge(R.GAME_DEFAULTS, camp.config);
      this.hooks = hooks;
      this.items = camp.items || {};
      this.scripts = camp.scripts || {};
      this.hazardDefs = {};
      for (const n of R.hazards.names()) this.hazardDefs[n] = Object.assign({}, R.hazards.get(n));
      for (const [n, h] of Object.entries(camp.hazards || {})) this.hazardDefs[n] = Object.assign({}, this.hazardDefs[n] || {}, h);
      this.persist = { life: this.cfg.maxLife, maxLife: this.cfg.maxLife, clock: 0, gems: 0, deaths: 0, secrets: 0, relics: {}, timed: false };
      this.loadLevel(opts.level || 0);
    }

    // ================================================================ levels
    loadLevel(index, opts = {}) {
      const lv = this.camp.levels[index];
      if (!lv) throw new Error(`No level ${index}`);
      this.levelIndex = index;
      this.level = lv;
      this.scripts = Object.assign({}, this.camp.scripts || {}, lv.scripts || {});
      this.world = R.compileLevel(this.camp, lv);
      this.time = 0;
      this.inv = {};
      for (const [id, n] of Object.entries(this.persist.relics)) if (n > 0) this.inv[id] = n;
      this.flags = {};
      this.won = false;
      this.levelDone = false;
      this.movers = [];
      this.timers = [];
      this.events = [];
      this.replaying = false;
      this.hazTimer = 0;
      this.lastSpan = null;
      this.lastLabel = null;
      const s = this.world.start, cfg = this.cfg;
      this.player = {
        x: s.x, y: s.y, z: s.z, vx: 0, vy: 0, vz: 0, ang: s.ang, pitch: 0, autoPitch: 0,
        onGround: true, fallFrom: s.z, lastGround: 0, jumpBuf: -1, snapUntil: -1, airCap: 0, act: null,
        viewZ: s.z + cfg.eyeHeight, dip: 0, bobPhase: 0, bobAmp: 0, kvx: 0, kvy: 0, turnLeft: 0, turnHeld: 0,
        life: this.persist.maxLife, maxLife: this.persist.maxLife, invuln: 0, alive: true, careful: false,
        edgeStop: false, prevFwd: false, lock: 0, upJump: false, screamed: false, hint: null, hintT: 0,
      };
      if (!opts.respawn) this.levelStart = { persist: JSON.parse(JSON.stringify(this.persist)) };
      this.spansWith = { anim: [], door: [], loose: [], plate: [] };
      for (const c of this.world.cells) for (const sp of c.spans) {
        if (sp.anim) this.spansWith.anim.push(sp);
        if (sp.door) this.spansWith.door.push(sp);
        if (sp.loose) this.spansWith.loose.push(sp);
        if (sp.plate) this.spansWith.plate.push(sp);
      }
      this.hasBob = this.spansWith.anim.some(s => s.anim.type === 'bob' || s.anim.type === 'lift');
      this.spawnEntities();
      this.cp = { x: s.x, y: s.y, z: s.z, ang: s.ang, nEvents: 0, inv: Object.assign({}, this.inv), persist: JSON.parse(JSON.stringify(this.persist)), maxLife: this.player.maxLife };
      if (lv.onStart && !opts.respawn) this.runScript(lv.onStart, {});
    }
    nextLevel() {
      this.persist.maxLife = this.player.maxLife; this.persist.life = this.player.life;
      if (this.levelIndex + 1 >= this.camp.levels.length) return false;
      this.loadLevel(this.levelIndex + 1);
      return true;
    }
    /** Restart the current level as it was when you arrived. */
    restartLevel() {
      const keep = { clock: this.persist.clock, deaths: this.persist.deaths, timed: this.persist.timed };
      this.persist = Object.assign(JSON.parse(JSON.stringify(this.levelStart.persist)), keep);
      this.loadLevel(this.levelIndex);
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
      if (spec.scale !== undefined) e.scale = spec.scale;
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
    isDrink(id) { return DRINKS.includes(this.itemDef(id).kind); }
    /** How many gems the whole campaign hides (for the final tally). */
    totalGems() {
      if (this._gemTotal !== undefined) return this._gemTotal;
      const templates = this.camp.entityTemplates || {};
      let n = 0;
      for (const lv of this.camp.levels) {
        try {
          for (const raw of R.compileLevel(this.camp, lv).spawns) {
            const spec = raw.tpl ? Object.assign({}, templates[raw.tpl], raw) : raw;
            if (spec.type === 'item' && this.items[spec.item] && this.items[spec.item].kind === 'gem') n++;
          }
        } catch (e) { /* a broken level counts nothing */ }
      }
      return (this._gemTotal = n);
    }

    // ============================================================== checkpoint event log
    /** Record a permanent change so a checkpoint can rebuild the world as it was. */
    record(ev) { if (!this.replaying) this.events.push(ev); }
    spanByBase(x, y, baseFl) {
      const c = this.world.cellAt(x, y);
      return c && c.spans.find(s => Math.abs((s.origFl ?? s.baseFl) - baseFl) < 1e-6);
    }
    applyEvent(ev) {
      const [kind] = ev;
      if (kind === 'drop') { const s = this.spanByBase(ev[1], ev[2], ev[3]); if (s && s.loose) this.dropFloor(s, true); }
      else if (kind === 'open') { const s = this.spanByBase(ev[1], ev[2], ev[3]); if (s && s.door) { s.door.state = 'open'; s.door.holdUntil = 0; s.cl = s.doorTop; s.door.found = true; } }
      else if (kind === 'unlock') { const s = this.spanByBase(ev[1], ev[2], ev[3]); if (s && s.door) s.door.unlocked = true; }
      else if (kind === 'lever') { const c = this.world.cellAt(ev[1], ev[2]); const b = c && c.band[ev[3]]; if (b && b.lever) this.pullLever(b, c, true); }
      else if (kind === 'move') { for (const s of (this.world.tags.get(ev[1]) || [])) { s[ev[2]] = ev[3]; if (ev[2] === 'fl') s.baseFl = ev[3]; else s.baseCl = ev[3]; } }
      else if (kind === 'gone') { const e = this.ents[ev[1]]; if (e) e.gone = true; }
      else if (kind === 'lit') { for (const o of this.ents) if (o.type === 'checkpoint') o.lit = false; const e = this.ents[ev[1]]; if (e) e.lit = true; }
      else if (kind === 'fired') { const e = this.ents[ev[1]]; if (e) e.fired = true; }
      else if (kind === 'flag') this.flags[ev[1]] = ev[2];
      else if (kind === 'arm') { for (const s of (this.world.tags.get(ev[1]) || [])) if (s.loose && s.loose.state === 'dormant') s.loose.state = 'idle'; }
    }
    /** Make the current position (a brazier, a landing...) the respawn point. */
    setCheckpoint(x, y, z, ang) {
      const p = this.player;
      this.cp = {
        x: x ?? p.x, y: y ?? p.y, z: z ?? p.z, ang: ang ?? p.ang,
        nEvents: this.events.length, inv: Object.assign({}, this.inv),
        persist: JSON.parse(JSON.stringify(this.persist)), maxLife: p.maxLife,
      };
    }

    // ============================================================== hooks
    msg(text, secs = 4) { this.hooks.msg && this.hooks.msg(text, secs); }
    dialog(title, text, then) { this.hooks.dialog && this.hooks.dialog(title, text, then); }
    flash(rgb, a = 0.35) { this.hooks.flash && this.hooks.flash(rgb, a); }
    shake(t = 0.4) { this.hooks.shake && this.hooks.shake(t); }
    face(state) { this.hooks.face && this.hooks.face(state); }
    sound(name, x, y, vol = 1, z) {
      if (!this.hooks.sound || this.replaying) return;
      if (x === undefined) { this.hooks.sound(name, vol, 0); return; }
      const p = this.player, dz = z === undefined ? 0 : (p.z - z);
      const d = Math.hypot(p.x - x, p.y - y, dz * 1.5), range = 14;
      if (d > range) return;
      const a = U.angDiff(p.ang, Math.atan2(y - p.y, x - p.x));
      const slabs = Math.floor(Math.abs(dz) / 1.5);
      this.hooks.sound(name, vol * Math.pow(1 - d / range, 1.5) * Math.pow(0.5, slabs), Math.sin(a) * Math.min(1, Math.hypot(p.x - x, p.y - y) / 2));
    }
    runScript(name, ctx = {}) {
      if (typeof name === 'function') return name(this, ctx);
      const fn = this.scripts[name];
      if (!fn) { console.warn('Missing script', name); return; }
      return fn(this, ctx);
    }
    flag(name, value) { if (value !== undefined) { this.flags[name] = value; this.record(['flag', name, value]); } return this.flags[name]; }
    after(secs, fn) { this.timers.push({ at: this.time + secs, fn }); }

    // ============================================================== items
    has(id) { return (this.inv[id] || 0) > 0; }
    take(id) { if (!this.inv[id]) return false; if (--this.inv[id] <= 0) delete this.inv[id]; if (this.persist.relics[id]) this.persist.relics[id]--; return true; }
    give(id, opts = {}) {
      const it = this.itemDef(id), p = this.player;
      const say = (t, snd, col) => { if (!opts.silent) { this.msg(t, 4); this.sound(snd); if (col) this.flash(col, 0.3); } };
      switch (it.kind) {
        case 'life': p.life = Math.min(p.maxLife, p.life + (it.heal || 1)); say(it.msg || 'You feel better.', it.sound || 'drink', [255, 80, 80]); this.face('grin'); break;
        case 'bigLife': p.maxLife = Math.min(this.cfg.lifeCap, p.maxLife + 1); p.life = p.maxLife; this.persist.maxLife = p.maxLife; say(it.msg || 'You feel stronger!', it.sound || 'bigdrink', [255, 220, 120]); this.face('grin'); break;
        case 'poison': if (!opts.silent) this.sound('drink'); this.hurt(it.damage || 1, null, null, it.msg || 'Poison!'); break;
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
    /** Span a body with feet at z would occupy in `cell` (stepping up at most `up`), or null. */
    occupy(cell, z, up = this.cfg.stepUp) {
      if (!cell) return null;
      const h = this.cfg.height;
      for (const s of cell.spans) {
        if (s.fl > z + up + 1e-6) continue;
        if (s.cl - Math.max(s.fl, z) < h - 1e-6) continue;
        return s;
      }
      return null;
    }
    /** The span a body with feet at z is in (or steps up into), or null (rock). */
    spanFor(c, z) {
      if (!c) return null;
      const up = this.cfg.stepUp + 1e-6;
      for (const s of c.spans) if (s.fl <= z + up && s.cl > z + 0.01) return s;
      return null;
    }
    /** Is (nx, ny) blocked for the body at feet height z? */
    blocked(nx, ny, z = this.player.z, up = this.cfg.stepUp) {
      const cfg = this.cfg, p = this.player, r = cfg.radius, W = this.world;
      const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r), y0 = Math.floor(ny - r), y1 = Math.floor(ny + r);
      const ox0 = Math.floor(p.x - r), ox1 = Math.floor(p.x + r), oy0 = Math.floor(p.y - r), oy1 = Math.floor(p.y + r);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const c = W.cellAt(cx, cy);
        if (!c) return true;
        if (this.occupy(c, z, up)) continue;
        const inside = cx >= ox0 && cx <= ox1 && cy >= oy0 && cy <= oy1;
        if (inside && R.spanAt(c, z + 0.01)) continue; // squeezed by a crusher or gate: let them out
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
    /** Floor under the feet (narrow foot circle) and ceiling over the head (body circle). */
    supportAt(x, y, z = this.player.z) {
      const fr = this.cfg.footRadius, r = this.cfg.radius;
      let fz = -1e9, cz = 1e9, top = null;
      for (let cy = Math.floor(y - fr); cy <= Math.floor(y + fr); cy++) for (let cx = Math.floor(x - fr); cx <= Math.floor(x + fr); cx++) {
        const s = this.spanFor(this.world.cellAt(cx, cy), z);
        if (s && s.fl > fz) { fz = s.fl; top = s; }
      }
      for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const s = this.spanFor(this.world.cellAt(cx, cy), z);
        if (s && s.cl < cz) cz = s.cl;
      }
      return { fz, cz, span: top };
    }
    /** Floor spans touched by the foot circle at the current height (loose floors, plates). */
    footSpans() {
      const p = this.player, fr = this.cfg.footRadius, out = [];
      for (let cy = Math.floor(p.y - fr); cy <= Math.floor(p.y + fr); cy++) for (let cx = Math.floor(p.x - fr); cx <= Math.floor(p.x + fr); cx++) {
        const s = this.spanFor(this.world.cellAt(cx, cy), p.z);
        if (s && Math.abs(s.fl - p.z) < 0.08) out.push(s);
      }
      return out;
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
    setTex(tag, prop, name) { const id = R.textures.id(name); for (const s of this.spansTagged(tag)) s[prop] = id; }
    setSpans(tag, props) { for (const s of this.spansTagged(tag)) for (const [k, v] of Object.entries(props)) s[k] = ['ftex', 'ctex', 'wall', 'low', 'up'].includes(k) ? R.textures.id(v) : v; }
    moveSpans(tag, prop, target, speed = 1, then = null) {
      const spans = this.spansTagged(tag);
      this.record(['move', tag, prop, target]);
      if (this.replaying) { for (const s of spans) { s[prop] = target; if (prop === 'fl') s.baseFl = target; else s.baseCl = target; } return; }
      this.movers.push({ spans, prop, target, speed, then });
      if (spans.length) this.sound('lift', spans[0].cell.x + 0.5, spans[0].cell.y + 0.5, 1, spans[0].fl);
    }
    entities(tag) { return this.ents.filter(e => e.tag === tag); }
    remove(e) { e.gone = true; if (e.initial) this.record(['gone', e.id]); }

    openDoor(tagOrSpan, holdSecs = 0, silent = false) {
      const spans = typeof tagOrSpan === 'string' ? this.spansTagged(tagOrSpan)
        : (tagOrSpan.door && tagOrSpan.door.group ? this.spansTagged(tagOrSpan.door.group) : [tagOrSpan]);
      let played = false;
      for (const s of spans) {
        const d = s.door;
        if (!d) continue;
        const permanent = d.state === 'open' && !d.holdUntil;
        if (holdSecs) { if (!permanent) d.holdUntil = Math.max(d.holdUntil || 0, this.time + holdSecs + (s.doorTop - s.cl) / d.speed); }
        else { d.holdUntil = 0; this.record(['open', s.cell.x, s.cell.y, s.baseFl]); }
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
        for (const gs of (d.group ? this.spansTagged(d.group) : [s])) if (gs.door) { gs.door.unlocked = true; this.record(['unlock', gs.cell.x, gs.cell.y, gs.baseFl]); }
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
          const r = cfg.radius;
          // a gate never closes on you: it stops above your head while you are under it
          if (Math.abs(p.x - (s.cell.x + 0.5)) < 0.5 + r && Math.abs(p.y - (s.cell.y + 0.5)) < 0.5 + r && p.z < s.doorTop && p.z + cfg.height > s.fl - 0.1) nc = Math.max(nc, Math.min(s.cl, p.z + cfg.height + 0.02));
          const tick = Math.floor(s.cl * 8) !== Math.floor(nc * 8);
          s.cl = nc;
          if (tick) this.sound('ratchet', s.cell.x + 0.5, s.cell.y + 0.5, 0.5, s.fl);
          if (s.cl <= s.fl) { d.state = 'closed'; this.sound('clang', s.cell.x + 0.5, s.cell.y + 0.5, 0.8, s.fl); }
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
      this.world.edgeEpoch = (this.world.edgeEpoch || 0) + 1;
      if (this.movers.some(m => m.finished)) this.movers = this.movers.filter(m => !m.finished);
    }

    // ============================================================== loose floors, plates, levers
    triggerLoose(s) {
      if (!s.loose || s.loose.state !== 'idle') return;
      s.loose.state = 'shaking'; s.loose.t = 0;
      this.sound('rattle', s.cell.x + 0.5, s.cell.y + 0.5, 0.9, s.fl);
    }
    /** Wake loose floors declared { loose: { armed: false } }: until now they were solid. */
    armLoose(tag) {
      for (const s of this.spansTagged(tag)) if (s.loose && s.loose.state === 'dormant') s.loose.state = 'idle';
      this.record(['arm', tag]);
    }
    /** A crumbling wave: every loose floor tagged `tag` starts to shake as the wave (speed u/s) reaches it from (x, y), and drops `lag` s later. */
    crumble(tag, x, y, speed = 3.5, lag = 0.3) {
      for (const s of this.spansTagged(tag)) {
        const L = s.loose;
        if (!L || (L.state !== 'idle' && L.state !== 'dormant')) continue;
        L.state = 'shaking'; L.t = -Math.hypot(s.cell.x + 0.5 - x, s.cell.y + 0.5 - y) / speed; L.delay = lag; L.wave = true;
      }
      this.sound('crumble', x, y, 0.8);
    }
    updateLoose(dt) {
      const p = this.player;
      for (const s of this.spansWith.loose) {
        const L = s.loose;
        if (L.state !== 'shaking') continue;
        const was = L.t;
        L.t += dt;
        if (L.t < 0) continue;              // the wave has not reached this tile yet
        if (was < 0) this.sound('rattle', s.cell.x + 0.5, s.cell.y + 0.5, 0.6, s.fl);
        s.fl = s.baseFl + Math.sin(L.t * 70) * 0.012;
        if (p.onGround && Math.abs(p.z - s.baseFl) < 0.1 && Math.abs(p.x - s.cell.x - 0.5) < 0.6 && Math.abs(p.y - s.cell.y - 0.5) < 0.6) this.shake(0.03);
        if (L.t >= (L.delay ?? this.cfg.looseDelay)) this.dropFloor(s);
      }
    }
    /** Remove the floor slab under span s: it falls to the span below and shatters. */
    dropFloor(s, instant = false) {
      const c = s.cell, i = c.spans.indexOf(s);
      if (i < 0 || !s.loose) return;
      s.loose.state = 'fallen';
      this.record(['drop', c.x, c.y, s.baseFl]);
      const x = c.x + 0.5, y = c.y + 0.5, z0 = s.baseFl;
      const sprite = this.camp.looseSprite || 'LOOSE_TILE';
      // riding it down is a move, not an accident: the tile never lands on its rider
      const p = this.player, rider = !instant && p.alive && p.onGround && !p.act && this.footSpans().includes(s);
      if (i > 0) {
        const below = c.spans[i - 1];
        below.cl = below.baseCl = s.cl; below.ctex = s.ctex; below.sky = below.sky || s.sky;
        c.spans.splice(i, 1);
        for (const b of c.band) if (b.span === s) b.span = below;
        if (below.plate) below.plate.jammed = true; // rubble holds a plate down for good
        if (instant) this.spawn({ type: 'deco', x, y, z0: below.fl, sprite: 'RUBBLE' });
        else this.spawn({ type: 'fallingTile', x, y, z0, landZ: below.fl, sprite, rider });
      } else {
        s.origFl = s.baseFl; s.fl = s.baseFl = -60; s.hazard = 'abyss';
        if (!instant) this.spawn({ type: 'fallingTile', x, y, z0, landZ: -40, sprite });
      }
      if (!instant) this.sound('crumble', x, y, 1, z0);
      this.spansWith.loose = this.spansWith.loose.filter(q => q !== s);
      c.spans.forEach((q, k) => { q.index = k; });
      this.world.edgeEpoch = (this.world.edgeEpoch || 0) + 1;
    }
    updatePlates(feet) {
      const p = this.player;
      for (const s of this.spansWith.plate) {
        const P = s.plate;
        if (P.jammed && !P.jamDone && !(P.closes && !P.opens)) {
          P.jamDone = true; P.pressed = true; s.fl = s.baseFl - 0.04;
          this.sound('click', s.cell.x + 0.5, s.cell.y + 0.5, 1, s.fl);
          if (P.opens) this.openDoor(P.opens, 0);
          if (P.lift && !P.lifted) { P.lifted = true; this.moveSpans(P.lift.tag, P.lift.prop || 'fl', P.lift.to, P.lift.speed || 0.8); }
          if (P.script && !this.replaying) this.runScript(P.script, { span: s, jammed: true });
          if (P.msg && !P.said && !this.replaying) { P.said = true; this.msg(P.msg); }
        }
        if (P.jamDone) continue;
        const on = p.onGround && feet.includes(s);
        if (on && !P.pressed) {
          P.pressed = true; s.fl = s.baseFl - 0.04;
          this.sound('click', s.cell.x + 0.5, s.cell.y + 0.5, 1, s.fl);
          if (P.opens) this.openDoor(P.opens, P.hold || 0);
          if (P.closes) this.closeDoor(P.closes);
          if (P.lift && !P.lifted) { P.lifted = true; this.moveSpans(P.lift.tag, P.lift.prop || 'fl', P.lift.to, P.lift.speed || 0.8); }
          if (P.script) this.runScript(P.script, { span: s });
          if (P.msg && !P.said) { P.said = true; this.msg(P.msg); }
        } else if (!on && P.pressed) { P.pressed = false; s.fl = s.baseFl; }
      }
    }
    /** Declarative lever: { opens, closes, lift: {tag, to, prop, speed}, hold, msg, script, once }. */
    pullLever(band, c, replay = false) {
      const L = band.lever;
      if (L.on && L.once !== false) { if (!replay) { this.msg(L.doneMsg || 'The lever will not move any further.'); this.sound('noway'); } return; }
      L.on = !L.on;
      band.wall = R.textures.id(L.on ? (L.texOn || 'LEVER_DOWN') : (L.texOff || 'LEVER_UP'));
      this.record(['lever', c.x, c.y, c.band.indexOf(band)]);
      if (!replay) this.sound('switch', c.x + 0.5, c.y + 0.5);
      if (L.on) {
        if (L.opens) { if (replay) for (const s of (this.world.tags.get(L.opens) || [])) { if (s.door) { s.door.state = 'open'; s.cl = s.doorTop; } } else this.openDoor(L.opens, L.hold || 0); }
        if (L.closes && !replay) this.closeDoor(L.closes);
        if (L.lift) this.moveSpans(L.lift.tag, L.lift.prop || 'fl', L.lift.to, L.lift.speed || 0.8);
      } else if (L.opens) this.closeDoor(L.opens);
      if (!replay && L.msg) this.msg(L.msg);
      if (!replay && L.script) this.runScript(L.script, { cell: c, band });
    }

    // ============================================================== damage & death
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
      this.die(message);
      return true;
    }
    die(cause) {
      const p = this.player;
      p.alive = false; this.persist.deaths++;
      p.act = null; this.deathCause = cause || null;
      this.sound('death'); this.face('dead');
      this.hooks.died && this.hooks.died(cause);
    }
    /** Back to the last checkpoint, with the world as it was when it was lit. */
    respawn() {
      const cp = this.cp, keep = { clock: this.persist.clock, deaths: this.persist.deaths, timed: this.persist.timed };
      const evs = this.events.slice(0, cp.nEvents);
      this.persist = Object.assign(JSON.parse(JSON.stringify(cp.persist)), keep);
      this.loadLevel(this.levelIndex, { respawn: true });
      this.replaying = true;
      for (const ev of evs) this.applyEvent(ev);
      this.replaying = false;
      this.events = evs;
      this.inv = Object.assign({}, cp.inv);
      this.cp = cp;
      const p = this.player, cfg = this.cfg;
      Object.assign(p, { x: cp.x, y: cp.y, z: cp.z, ang: cp.ang, fallFrom: cp.z, invuln: cfg.respawnInvuln, maxLife: cp.maxLife, life: cp.maxLife });
      p.viewZ = p.z + cfg.eyeHeight;
      this.face('normal');
      this.hooks.respawned && this.hooks.respawned();
    }
    teleport(x, y, z, ang) {
      const p = this.player;
      p.x = x; p.y = y;
      const c = this.cellAt(x, y);
      const s = z !== undefined ? (R.spanAt(c, z + 0.01) || R.spanBelow(c, z + 0.01)) : c.spans[0];
      p.z = s ? s.fl : (z || 0); p.vz = 0; p.vx = p.vy = 0; p.onGround = true; p.fallFrom = p.z; p.act = null; p.lock = 0;
      if (ang !== undefined) p.ang = U.dirAngle(ang);
      p.viewZ = p.z + this.cfg.eyeHeight;
    }
    win(info = {}) {
      if (this.won) return;
      this.won = true;
      this.hooks.won && this.hooks.won(info);
    }

    // ============================================================== main update
    update(dt, input) {
      const p = this.player;
      this.time += dt;
      if (!this.won && !this.levelDone) this.persist.clock += dt;
      if (this.hasBob) this.world.edgeEpoch = (this.world.edgeEpoch || 0) + 1;
      for (const s of this.spansWith.anim) {
        R.cellAnims.get(s.anim.type).update(s, this.time, this);
        if (s.anim.justSlammed) this.sound('crush', s.cell.x + 0.5, s.cell.y + 0.5, 0.8, s.fl);
        if (s.anim.justWarned) this.sound('creak', s.cell.x + 0.5, s.cell.y + 0.5, 0.7, s.fl);
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
      const fwdIn = inp.fwd || 0;
      const fwdEdge = fwdIn > 0 && !p.prevFwd;
      p.prevFwd = fwdIn > 0;
      if (inp.jump) p.jumpBuf = this.time;
      if (inp.about && p.turnLeft <= 0 && !p.act) p.turnLeft = Math.PI;
      if (p.act) { this.updateAction(dt, inp, fwdEdge); this.afterMove(dt); return; }

      // turning (gentle ramp for fine aiming), quick about-face, axis magnetism
      if (inp.turn) p.turnHeld += dt; else p.turnHeld = 0;
      const ramp = p.turnHeld < 0.12 ? 0.35 : 1;
      p.ang += (inp.turn || 0) * cfg.turnSpeed * ramp * (inp.run ? 1.25 : 1) * dt;
      if (p.turnLeft > 0) { const a = Math.min(p.turnLeft, Math.PI / cfg.turnAroundTime * dt); p.ang += a; p.turnLeft -= a; }
      else if (!inp.turn && fwdIn > 0 && p.onGround) {
        const q = Math.round(p.ang / (Math.PI / 2)) * (Math.PI / 2), off = U.angDiff(p.ang, q);
        if (Math.abs(off) < cfg.magnet && Math.abs(off) > 1e-4) p.ang += Math.sign(off) * Math.min(Math.abs(off), 0.44 * dt);
      }
      p.ang = U.mod(p.ang + Math.PI, Math.PI * 2) - Math.PI;
      if (inp.look) p.pitch = U.clamp(p.pitch + inp.look * 120 * dt, -cfg.lookMax, cfg.lookMax);
      if (inp.center) p.pitch *= Math.max(0, 1 - dt * 12);

      // landing recovery: a moment to find your feet
      let fwd = fwdIn, str = inp.strafe || 0;
      if (p.lock > 0) { p.lock -= dt; fwd = 0; str = 0; p.jumpBuf = -1; }
      const sp = p.careful ? cfg.carefulSpeed : inp.run ? cfg.runSpeed : cfg.walkSpeed;
      const l = Math.hypot(fwd, str); if (l > 1) { fwd /= l; str /= l; }
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      const tx = (dx * fwd - dy * str) * sp, ty = (dy * fwd + dx * str) * sp;
      if (p.onGround) {
        const slowing = Math.hypot(tx, ty) < Math.hypot(p.vx, p.vy) - 0.05;
        const k = 1 - Math.exp(-(slowing ? cfg.brake : cfg.accel) * dt);
        p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
      } else if (fwd || str) {
        // in the air you may steer and brake a little, never gain speed (C held to catch does not brake)
        const k = 1 - Math.exp(-cfg.accel * cfg.airControl * dt), sa = (inp.run ? cfg.runSpeed : cfg.walkSpeed) / sp;
        p.vx += (tx * sa - p.vx) * k; p.vy += (ty * sa - p.vy) * k;
        const v = Math.hypot(p.vx, p.vy), cap = Math.max(p.airCap, 0.01);
        if (v > cap) { p.vx *= cap / v; p.vy *= cap / v; }
      }

      // ---- Space: climb a ledge ahead, else jump (a running jump waits for the edge)
      const canJump = p.onGround || (this.time - p.lastGround < cfg.coyote && p.vz <= 0);
      if (p.jumpBuf >= 0 && this.time - p.jumpBuf <= cfg.jumpBuffer && canJump && p.snapUntil < 0) {
        p.jumpBuf = -1;
        if (p.onGround && this.tryClimb()) { this.afterMove(dt); return; }
        const speed = Math.hypot(p.vx, p.vy);
        if (p.onGround && fwd > 0 && speed > 1.5 && this.dropAhead(cfg.edgeSnap) > 0) p.snapUntil = this.time + cfg.snapWait;
        else this.doJump(fwd);
      }
      if (p.snapUntil >= 0) {
        const ahead = Math.hypot(p.vx, p.vy) * dt + 0.05;
        if (!p.onGround || this.dropAhead(ahead, true) >= 0 || this.time > p.snapUntil) { p.snapUntil = -1; this.doJump(fwd); }
      }

      // ---- horizontal movement with collision (sub-stepped)
      const mx = (p.vx + p.kvx) * dt, my = (p.vy + p.kvy) * dt;
      const knocked = Math.hypot(p.kvx, p.kvy) > 0.3;
      const kd = Math.exp(-7 * dt); p.kvx *= kd; p.kvy *= kd;
      const up = p.onGround ? cfg.stepUp : cfg.airStepUp;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 0.08));
      let edge = false;
      for (let i = 0; i < n; i++) {
        const sx = mx / n, sy = my / n;
        if (this.edgeGuard(p.x + sx, p.y, knocked)) { p.vx = 0; p.kvx = 0; edge = true; }
        else if (!this.blocked(p.x + sx, p.y, p.z, up)) p.x += sx; else { p.vx = 0; p.kvx = 0; }
        if (this.edgeGuard(p.x, p.y + sy, knocked)) { p.vy = 0; p.kvy = 0; edge = true; }
        else if (!this.blocked(p.x, p.y + sy, p.z, up)) p.y += sy; else { p.vy = 0; p.kvy = 0; }
      }
      // careful at an edge: press Forward again to lower yourself into a hang
      // (only from the ground: the floor may have fallen away under you since you stopped)
      if (edge && fwd > 0) p.edgeStop = true;
      else if (!p.careful || !p.onGround || fwd < 0 || Math.hypot(p.vx, p.vy) > 0.3) p.edgeStop = false;
      if (p.edgeStop && fwdEdge && p.careful && p.onGround && this.tryLower()) { p.edgeStop = false; this.afterMove(dt); return; }
      // in the air, near a ledge you face: catch it (C held: hang; Forward: pull up)
      if (!p.onGround && (fwd > 0 || p.careful) && this.tryCatch()) { this.afterMove(dt); return; }

      // ---- vertical (exact kinematics; support from the height before moving)
      const sup = this.supportAt(p.x, p.y);
      if (p.onGround && sup.fz < p.z - 0.001 && sup.fz >= p.z - cfg.stepUp && p.vz <= 0) p.z = sup.fz;
      if (sup.fz >= p.z - 0.001 && p.vz <= 0) {
        if (!p.onGround) this.land(sup);
        p.z = Math.max(p.z, sup.fz); p.vz = 0; p.onGround = true; p.lastGround = this.time;
      } else {
        if (p.onGround) { p.onGround = false; p.fallFrom = p.z; p.airCap = Math.max(Math.hypot(p.vx, p.vy), 0.5); p.screamed = false; }
        const prevVz = p.vz;
        p.z += p.vz * dt - 0.5 * cfg.gravity * dt * dt;
        p.vz -= cfg.gravity * dt;
        if (p.upJump && prevVz > 0 && p.vz <= 0) { p.upJump = false; this.reachUp(); }
        if (p.z + cfg.height > sup.cz) {
          p.z = sup.cz - cfg.height;
          if (p.vz > 0) { p.vz = 0; this.sound('bump', undefined, undefined, 0.4); this.reachUp(); }
        }
        if (!p.screamed && p.fallFrom - p.z > cfg.fallHurt) { p.screamed = true; this.sound('scream'); this.face('ouch'); }
        if (p.z <= sup.fz) { p.z = sup.fz; this.land(sup); p.vz = 0; p.onGround = true; p.lastGround = this.time; }
      }
      // head bob + footsteps
      const spd = Math.hypot(p.vx, p.vy), prevPhase = p.bobPhase;
      p.bobPhase += spd * dt * 2.1;
      p.bobAmp += ((p.onGround && !p.careful ? Math.min(1, spd / cfg.runSpeed) : 0) - p.bobAmp) * Math.min(1, dt * 8);
      if (p.onGround && spd > 0.5 && Math.floor(prevPhase / Math.PI) !== Math.floor(p.bobPhase / Math.PI)) this.sound('step', undefined, undefined, p.careful ? 0.12 : 0.35);
      if (inp.use) this.useAction();
      this.afterMove(dt);
    }

    doJump(fwd) {
      const p = this.player, cfg = this.cfg;
      let dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      // a jump started close to a corridor axis flies straight along it
      const q = Math.round(p.ang / (Math.PI / 2)) * (Math.PI / 2);
      const onAxis = Math.abs(U.angDiff(p.ang, q)) < 0.14;
      if (onAxis) { dx = Math.round(Math.cos(q)); dy = Math.round(Math.sin(q)); }
      if (fwd > 0) {
        const along = Math.max(p.vx * dx + p.vy * dy, cfg.standJumpPush);
        const lat = onAxis ? 0 : -p.vx * dy + p.vy * dx;
        p.vx = dx * along - dy * lat; p.vy = dy * along + dx * lat;
        p.upJump = false;
      } else { p.vx *= 0.2; p.vy *= 0.2; p.upJump = true; }
      p.vz = cfg.jumpV; p.onGround = false; p.fallFrom = p.z; p.lastGround = -10; p.screamed = false;
      p.airCap = Math.max(Math.hypot(p.vx, p.vy), 0.5);
      this.sound('jump', undefined, undefined, 0.5);
    }
    /** Distance along the velocity to the first drop (> stepUp), or -1. centre: test the centre point only. */
    dropAhead(maxD, centre = false) {
      const p = this.player, v = Math.hypot(p.vx, p.vy);
      if (v < 0.1) return -1;
      const ux = p.vx / v, uy = p.vy / v;
      for (let d = 0.02; d <= maxD + 1e-9; d += 0.02) {
        const x = p.x + ux * d, y = p.y + uy * d;
        const fz = centre ? (this.spanFor(this.cellAt(x, y), p.z) || { fl: -1e9 }).fl : this.supportAt(x, y).fz;
        if (fz < p.z - this.cfg.stepUp) return d;
        if (this.blocked(x, y)) return -1;
      }
      return -1;
    }
    /** Careful steps (and knock-back) never carry you over an edge. */
    edgeGuard(nx, ny, knocked) {
      const p = this.player;
      if (!p.onGround || (!p.careful && !knocked)) return false;
      return this.supportAt(nx, ny).fz < p.z - this.cfg.stepUp;
    }
    /** Reaching up at the top of a jump (or bumping the ceiling) knocks a loose slab down. */
    reachUp() {
      const p = this.player, c = this.cellAt(p.x, p.y);
      if (!c) return;
      const cur = R.spanAt(c, p.z + 0.02) || R.spanBelow(c, p.z + 0.02);
      const up = cur && c.spans[c.spans.indexOf(cur) + 1];
      if (up && up.loose && cur.cl <= p.fallFrom + this.cfg.upReach + 1e-6) this.triggerLoose(up);
    }

    land(sup) {
      const p = this.player, cfg = this.cfg;
      const drop = p.fallFrom - sup.fz;
      p.dip = Math.min(0.15, 0.03 * Math.max(0, -p.vz));
      const s = sup.span;
      p.fallFrom = sup.fz;
      if (s && s.hazard === 'abyss') return;
      if (drop > cfg.fallHurt) { this.sound('land', undefined, undefined, 1); this.kill('The fall killed you.'); return; }
      if (drop > cfg.fallSafe) { this.sound('land', undefined, undefined, 1); p.dip = 0.3; p.lock = 0.6; this.hurt(1, null, null, 'A hard landing!'); }
      else if (drop > 0.6) { this.sound('land', undefined, undefined, drop > 1.2 ? 0.8 : 0.5); p.lock = 0.25; p.vx *= 0.3; p.vy *= 0.3; }
      this.hooks.landed && this.hooks.landed(drop);
    }

    /** Dominant facing axis: {ax: 'x'|'y', s: ±1}. */
    facingAxis() {
      const dx = Math.cos(this.player.ang), dy = Math.sin(this.player.ang);
      return Math.abs(dx) >= Math.abs(dy) ? { ax: 'x', s: dx >= 0 ? 1 : -1 } : { ax: 'y', s: dy >= 0 ? 1 : -1 };
    }
    /** The ledge across the cell boundary ahead (within `reach`) with a lip in [lo, hi] above the feet. */
    ledgeAhead(lo, hi, reach) {
      const p = this.player, cfg = this.cfg, { ax, s } = this.facingAxis();
      const pos = ax === 'x' ? p.x : p.y;
      const bound = s > 0 ? Math.floor(pos) + 1 : Math.floor(pos);
      if (Math.abs(bound - pos) > reach) return null;
      const cx = ax === 'x' ? (s > 0 ? bound : bound - 1) : Math.floor(p.x);
      const cy = ax === 'y' ? (s > 0 ? bound : bound - 1) : Math.floor(p.y);
      const C = this.world.cellAt(cx, cy);
      if (!C) return null;
      const here = this.supportAt(p.x, p.y);
      for (const sp of C.spans) {
        if (sp.fl < p.z + lo - 1e-6 || sp.fl > p.z + hi + 1e-6) continue;
        if (sp.cl - sp.fl < cfg.height + 0.05 || sp.hazard === 'lava' || sp.hazard === 'abyss') continue;
        if (here.cz < sp.fl + cfg.height - 0.02) continue; // no room to pull up in your own column
        const ex = ax === 'x' ? bound + s * 0.35 : p.x, ey = ax === 'y' ? bound + s * 0.35 : p.y;
        if (this.blockedAtDest(ex, ey, sp.fl)) continue;
        const hx = ax === 'x' ? bound - s * cfg.hangOut : p.x, hy = ax === 'y' ? bound - s * cfg.hangOut : p.y;
        return { span: sp, z: sp.fl, ex, ey, hx, hy };
      }
      return null;
    }
    /** Space facing a ledge 0.35..1.75 above the feet: climb onto it. */
    tryClimb(dry = false) {
      const p = this.player, cfg = this.cfg;
      const L = this.ledgeAhead(cfg.climbMin, cfg.climbMax, cfg.climbReach);
      if (!L) return false;
      if (dry) return true;
      p.act = { kind: 'climb', t: 0, dur: cfg.climbTime, x0: p.x, y0: p.y, z0: p.z, x1: L.ex, y1: L.ey, z1: L.z };
      p.vx = p.vy = p.vz = 0; p.onGround = false; p.snapUntil = -1;
      this.sound(L.z - p.z > 0.9 ? 'climb' : 'grab', undefined, undefined, 0.7);
      return true;
    }
    /** In the air: catch a lip 0.10..0.90 above the feet. C held: hang there; else pull straight up. */
    tryCatch() {
      const p = this.player, cfg = this.cfg;
      const L = this.ledgeAhead(cfg.catchLow, cfg.catchHigh, cfg.radius + 0.03); // on contact with the face
      if (!L) return false;
      p.vx = p.vy = p.vz = 0; p.kvx = p.kvy = 0; p.onGround = false; p.snapUntil = -1; p.upJump = false;
      const hz = L.z - cfg.hangDepth;
      const ledge = { z: L.z, ex: L.ex, ey: L.ey, span: L.span };
      if (p.careful) p.act = { kind: 'lower', t: 0, dur: 0.15, x0: p.x, y0: p.y, z0: p.z, x1: L.hx, y1: L.hy, z1: hz, ledge };
      else p.act = { kind: 'climb', t: 0, dur: cfg.climbTime * Math.max(0.5, (L.z - p.z + 0.4) / 1.3), x0: p.x, y0: p.y, z0: p.z, x1: L.ex, y1: L.ey, z1: L.z };
      this.sound('grab', undefined, undefined, 0.8);
      this.face('ouch');
      return true;
    }
    blockedAtDest(x, y, z) {
      const r = this.cfg.radius;
      for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const c = this.world.cellAt(cx, cy);
        if (!c || !this.occupy(c, z)) return true;
      }
      return false;
    }
    /** Careful-stopped at an edge: lower yourself over it into a hang (facing the drop). */
    tryLower(dry = false) {
      const p = this.player, cfg = this.cfg, fr = cfg.footRadius;
      const here = this.supportAt(p.x, p.y);
      if (here.fz < p.z - 0.05) return false;           // the floor under you is gone (a loose floor fell): no ledge to hang from
      const f = this.facingAxis();
      const other = f.ax === 'x' ? { ax: 'y', s: Math.sin(p.ang) >= 0 ? 1 : -1 } : { ax: 'x', s: Math.cos(p.ang) >= 0 ? 1 : -1 };
      for (const { ax, s } of [f, other]) {
        const pos = ax === 'x' ? p.x : p.y;
        const lip = s > 0 ? Math.floor(pos - fr) + 1 : Math.floor(pos + fr);
        if (Math.abs(lip - pos) > fr + 0.05) continue;
        const hx = ax === 'x' ? lip + s * cfg.hangOut : p.x, hy = ax === 'y' ? lip + s * cfg.hangOut : p.y;
        const cell = this.cellAt(hx, hy);
        const below = R.spanBelow(cell, p.z - cfg.stepUp);
        if (!below || below.cl < p.z + 0.2) continue;
        const depth = p.z - below.fl;
        if (depth <= cfg.stepUp) continue;
        const toFloor = depth <= cfg.hangDepth + 0.05;
        const z1 = toFloor ? below.fl : p.z - cfg.hangDepth;
        let ok = true;
        const r = cfg.radius;
        for (let cy = Math.floor(hy - r); cy <= Math.floor(hy + r) && ok; cy++) for (let cx = Math.floor(hx - r); cx <= Math.floor(hx + r); cx++) {
          const c = this.world.cellAt(cx, cy);
          const sp = c && R.spanAt(c, z1 + 0.01);
          if (!sp || sp.cl < z1 + cfg.height) { ok = false; break; }
        }
        if (!ok) continue;
        if (dry) return true;
        const ledge = { z: p.z, ex: ax === 'x' ? lip - s * 0.35 : p.x, ey: ax === 'y' ? lip - s * 0.35 : p.y, span: here.span };
        p.act = { kind: 'lower', t: 0, dur: cfg.lowerTime, x0: p.x, y0: p.y, z0: p.z, x1: hx, y1: hy, z1, ledge, toFloor };
        p.vx = p.vy = p.vz = 0; p.onGround = false;
        this.sound('grab', undefined, undefined, 0.6);
        return true;
      }
      return false;
    }
    updateAction(dt, inp, fwdEdge) {
      const p = this.player, a = p.act, cfg = this.cfg;
      a.t += dt;
      const f = a.dur ? Math.min(1, a.t / a.dur) : 1;
      if (a.kind === 'climb') {
        // rise in your own column first, then step onto the ledge (never through its lip)
        const up = U.smooth(Math.min(1, f / 0.6)), fwd = U.smooth(Math.max(0, (f - 0.6) / 0.4));
        p.z = a.z0 + (a.z1 - a.z0) * up;
        p.x = a.x0 + (a.x1 - a.x0) * fwd; p.y = a.y0 + (a.y1 - a.y0) * fwd;
        if (f >= 1) { p.act = null; p.z = a.z1; p.onGround = true; p.fallFrom = p.z; p.lastGround = this.time; p.vz = 0; }
      } else if (a.kind === 'lower') {
        const out = U.smooth(Math.min(1, f / 0.45)), down = U.smooth(Math.max(0, (f - 0.35) / 0.65));
        p.x = a.x0 + (a.x1 - a.x0) * out; p.y = a.y0 + (a.y1 - a.y0) * out;
        p.z = a.z0 + (a.z1 - a.z0) * down;
        if (f >= 1) {
          if (a.toFloor) { p.act = null; p.onGround = true; p.fallFrom = p.z; p.lastGround = this.time; this.sound('drop', undefined, undefined, 0.4); }
          else p.act = { kind: 'hang', t: 0, x: a.x1, y: a.y1, z: a.z1, ledge: a.ledge };
        }
      } else if (a.kind === 'hang') {
        p.x = a.x; p.y = a.y; p.z = a.z;
        const L = a.ledge.span, gone = !!(L && L.loose && L.loose.state === 'fallen');   // the ledge (a loose floor) fell away
        if (!gone && ((p.jumpBuf >= 0 && this.time - p.jumpBuf <= cfg.jumpBuffer) || (fwdEdge && a.t > 0.2))) {
          p.jumpBuf = -1;
          if (this.blockedAtDest(a.ledge.ex, a.ledge.ey, a.ledge.z)) { this.sound('noway', undefined, undefined, 0.5); return; }
          p.act = { kind: 'climb', t: 0, dur: cfg.pullTime, x0: p.x, y0: p.y, z0: p.z, x1: a.ledge.ex, y1: a.ledge.ey, z1: a.ledge.z };
          this.sound('climb', undefined, undefined, 0.6);
        } else if (gone || !p.careful || (inp.fwd || 0) < 0) {
          // let go: the fall is measured from the hang
          p.act = null; p.onGround = false; p.vz = 0; p.vx = p.vy = 0; p.fallFrom = p.z; p.airCap = 0.3; p.screamed = false;
          this.sound('drop', undefined, undefined, 0.5);
        }
      }
    }

    /** After moving: view height, auto-peek, hints, spans entered, hazards. */
    afterMove(dt) {
      const p = this.player, cfg = this.cfg;
      const target = p.z + cfg.eyeHeight;
      if (p.act) p.viewZ = target;
      else if (p.viewZ < target && p.onGround) p.viewZ = Math.min(target, p.viewZ + Math.max(0.8 * dt, (target - p.viewZ) * Math.min(1, dt * 10)));
      else p.viewZ = target;
      p.dip = Math.max(0, p.dip - dt * 0.75);
      const sup = this.supportAt(p.x, p.y);
      if (p.viewZ > sup.cz - 0.05) p.viewZ = Math.max(p.z + 0.08, sup.cz - 0.05);
      // what the keys would do here, and where to look (pitch in view pixels at 168 lines)
      p.hintT -= dt;
      if (p.hintT <= 0) {
        p.hintT = 0.1;
        p.hint = null;
        if (p.act && p.act.kind === 'hang') p.hint = 'HANGING';
        else if (p.onGround && !p.act) {
          if (p.edgeStop && p.careful) p.hint = this.tryLower(true) ? 'HANG' : 'EDGE';
          else if (this.tryClimb(true)) p.hint = 'CLIMB';
          else if (this.drinkAhead()) p.hint = 'DRINK';
          else if (Math.hypot(p.vx, p.vy) > 1.5 && this.dropAhead(1.2) > 0) p.hint = 'JUMP';
        }
      }
      let want = 0;
      if (p.act && (p.act.kind === 'hang' || p.act.kind === 'lower')) want = -60;
      else if (p.careful && p.edgeStop) want = -55;
      else if (!p.onGround && p.vz < -1 && !p.act) want = -26;
      else if (p.onGround && Math.hypot(p.vx, p.vy) > 0.5 && this.dropAhead(1.0) > 0) want = -18;
      else if (p.hint === 'CLIMB') want = 30;
      p.autoPitch += (want - p.autoPitch) * Math.min(1, dt * (want === 0 ? 5 : 7));

      const foot = this.footSpan();
      if (foot && foot !== this.lastSpan) { this.lastSpan = foot; this.enterSpan(foot); }
      if (p.onGround && !p.act) {
        const feet = this.footSpans();
        for (const s of feet) if (s.loose) this.triggerLoose(s);
        this.updatePlates(feet);
      } else this.updatePlates([]);
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
      if (s.anim && s.anim.type === 'crusher' && s.anim.slam && s.cl - p.z < cfg.height * 0.95) { this.kill(s.anim.msg || 'Crushed!'); return; }
      if (s.hazard === 'abyss') { if (p.z < p.fallFrom - cfg.fallHurt) this.kill('You fell into the abyss.'); return; }
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

    /** The drinkable bottle in front of you (within drinkRange), if any. */
    drinkAhead() {
      const p = this.player, cfg = this.cfg;
      let best = null, bd = 1e9;
      for (const e of this.ents) {
        if (e.gone || e.type !== 'item' || !this.isDrink(e.spec.item)) continue;
        if (Math.abs(e.z0 - p.z) > 0.5) continue;
        const d = Math.hypot(p.x - e.x, p.y - e.y);
        if (d > cfg.drinkRange + 0.2) continue;
        const a = Math.abs(U.angDiff(p.ang, Math.atan2(e.y - p.y, e.x - p.x)));
        if ((a < 0.7 || d < 0.45) && d < bd) { bd = d; best = e; }
      }
      return best;
    }
    useAction() {
      const p = this.player, cfg = this.cfg;
      const drink = this.drinkAhead();
      if (drink) { drink.def.use(drink, this); return; }
      let best = null, bd = 1e9;
      for (const e of this.ents) {
        if (e.gone || !e.def.use || e.type === 'item') continue;
        if (Math.abs(e.z - p.z) > 1.0) continue;
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
        for (const sp of c.spans) if (sp.door && sp.fl <= p.z + cfg.stepUp && sp.doorTop >= p.z + 0.3 && sp.door.state !== 'open' && sp.door.state !== 'opening') { this.useDoor(sp); return; }
        const band = c.band[this.world.band(eyeZ)];
        if (band && band.lever && !R.spanAt(c, eyeZ)) { this.pullLever(band, c); return; }
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
        const zAbs = e.spec.zAbs, zq = zAbs !== undefined ? zAbs : e.free ? e.z : (e.zf ?? e.z0);
        const s = c && (R.spanAt(c, zq + 0.02) || R.spanBelow(c, zq + 0.02));
        let z;
        if (zAbs !== undefined) z = zAbs;       // mounted at an absolute height (a torch high on a chasm wall)
        else if (e.hang || spr.hang) z = (s ? s.cl : e.z0 + 1.25) - spr.h / 64 * spr.scale * (e.scale || 1) - (e.spec.drop || 0);
        else if (e.free) z = e.z;
        else z = (s ? s.fl : e.z0) + e.zOff + (e.bob ? 0.04 + 0.035 * Math.sin(this.time * 3 + e.id) : 0);
        if (!e.free && zAbs === undefined && e.zf === undefined) e.z = e.hang ? (s ? s.fl : e.z0) : z;
        const frame = e.frame !== undefined ? e.frame : spr.frames.length > 1 ? Math.floor((this.time + e.id * 0.37) * spr.fps) : 0;
        list.push({ x: e.x, y: e.y, z, spr, frame, light: Math.min(31, (s ? s.light : 16) + (e.spec.light || 0)), fog: s ? s.fog : false, flip: !!e.flip, bright: !!e.bright, scale: e.scale, ent: e });
      }
      return list;
    }

    // ============================================================== save/load
    /** Saves are made at level starts: level index + what carries over. */
    serialize() {
      const persist = Object.assign(JSON.parse(JSON.stringify(this.levelStart.persist)), { clock: this.persist.clock, deaths: this.persist.deaths, timed: this.persist.timed });
      return { v: 2, campaign: this.camp.id, level: this.levelIndex, persist, savedAt: Date.now() };
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
