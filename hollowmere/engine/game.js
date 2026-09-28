/*
 * Game state & rules: player physics, doors, items, hazards, checkpoints,
 * scripting API, save/load. UI, audio and rendering talk to the game only
 * through `hooks` (see main.js), so the rules can run headless (tools/verify).
 *
 * Scripts (campaign.scripts[name](g, ctx)) receive this Game instance.
 * Public scripting API:
 *   g.msg(text, secs)            g.dialog(title, text)        g.sound(name, x?, y?)
 *   g.has(item) g.give(item) g.take(item)                     g.flag(name, value?)
 *   g.openDoor(tag) g.closeDoor(tag)                          g.moveCells(tag, 'fl'|'cl', target, speed, then?)
 *   g.setTex(tag, prop, texName) g.setCells(tag, props)       g.entities(tag) g.remove(entity)
 *   g.flash(rgb, alpha) g.shake(secs) g.hurt(n) g.heal(n)     g.teleport(floor, x, y, ang?)
 *   g.win({ title, text })       g.player g.flags g.stats g.time
 */
(function (R) {
  'use strict';
  const U = R.util;

  R.GAME_DEFAULTS = {
    eyeHeight: 0.5, height: 0.62, radius: 0.24, stepUp: 0.3,
    walkSpeed: 2.4, runSpeed: 4.3, turnSpeed: 2.5, accel: 11, gravity: 12,
    maxHealth: 100, startHealth: 100, invuln: 0.8, knock: 5.5, useRange: 1.35,
    lookMax: 55, pitDamage: 25, crushDamage: 40, respawnInvuln: 2,
    baseLight: null, // e.g. { radius: 2, bonus: 4 } — light the player always carries
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
      this.newGame();
    }

    // ================================================================ setup
    newGame() {
      const cfg = this.cfg;
      this.world = R.compileWorld(this.camp);
      this.time = 0;
      this.inv = {};
      this.flags = {};
      this.won = false;
      this.stats = { time: 0, treasures: 0, treasureTotal: 0, score: 0, secrets: 0, secretTotal: 0, deaths: 0 };
      const s = this.world.start;
      this.player = {
        x: s.x, y: s.y, floor: s.floor, ang: s.ang, z: 0, vz: 0, vx: 0, vy: 0, kvx: 0, kvy: 0,
        pitch: 0, health: cfg.startHealth, maxHealth: cfg.maxHealth, invuln: 0, alive: true,
        bobPhase: 0, bobAmp: 0, viewZ: 0, onGround: true,
      };
      const c0 = this.world.resolve(s.floor, Math.floor(s.x), Math.floor(s.y));
      this.player.z = c0.cell.fl + c0.dz;
      this.player.viewZ = this.player.z + cfg.eyeHeight;
      this.checkpoint = { floor: s.floor, x: s.x, y: s.y, ang: s.ang };
      this.movers = [];
      this.timers = [];
      this.hazTimer = 0;
      this.lastCellKey = -1;
      this.lastLabel = null;
      this.animCells = this.world.floors.map(f => f.cells.filter(c => c && c.anim));
      this.spawnEntities();
      // totals for the end screen
      for (const e of this.ents) if (e.type === 'item' && this.itemDef(e.spec.item).kind === 'treasure') this.stats.treasureTotal++;
      for (const f of this.world.floors) for (const c of f.cells) if (c && (c.secret || (c.door && c.door.secret))) this.stats.secretTotal++;
      if (this.camp.onStart) this.runScript(this.camp.onStart, {});
    }

    spawnEntities() {
      this.ents = [];
      this.entsByFloor = this.world.floors.map(() => []);
      const templates = this.camp.entityTemplates || {};
      this.world.spawns.forEach((raw, i) => {
        let spec = raw;
        if (raw.tpl) {
          if (!templates[raw.tpl]) throw new Error(`Unknown entity template "${raw.tpl}"`);
          spec = Object.assign({}, templates[raw.tpl], raw);
        }
        const type = spec.type || 'deco';
        const def = R.entityTypes.get(type);
        const e = {
          id: i, type, def, spec, floor: spec.floor, x: spec.x, y: spec.y, x0: spec.x, y0: spec.y,
          sprite: spec.sprite || null, radius: spec.radius ?? 0.3, solid: !!spec.solid, gone: false,
          state: spec.state || 0, tag: spec.tag || null, z: 0, hang: !!spec.hang, seen: false,
        };
        if (def.init) def.init(e, this);
        if (spec.solid !== undefined) e.solid = !!spec.solid;
        this.ents.push(e);
        this.entsByFloor[e.floor].push(e);
      });
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
    sound(name, x, y, vol = 1) {
      if (!this.hooks.sound) return;
      if (x === undefined) { this.hooks.sound(name, vol, 0); return; }
      const p = this.player, d = U.dist(p.x, p.y, x, y), range = 14;
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
    /** Run a script (name or function) after `secs` seconds of game time. */
    after(secs, fn) { this.timers.push({ at: this.time + secs, fn }); }

    // ============================================================== items
    has(id) { return (this.inv[id] || 0) > 0; }
    take(id) { if (!this.inv[id]) return false; if (--this.inv[id] <= 0) delete this.inv[id]; return true; }
    give(id, opts = {}) {
      const it = this.itemDef(id);
      if (it.kind === 'treasure') {
        this.stats.treasures++; this.stats.score += it.score || 100;
        this.msg(it.msg || `Treasure: ${it.name}! (+${it.score || 100})`);
        this.sound(it.sound || 'treasure'); this.flash([255, 220, 80], 0.3); this.face('grin');
      } else if (it.kind === 'health') {
        this.heal(it.heal || 25);
        this.msg(it.msg || `${it.name}. (+${it.heal || 25} health)`);
        this.sound(it.sound || 'health'); this.flash([80, 200, 255], 0.25);
      } else {
        this.inv[id] = (this.inv[id] || 0) + 1;
        if (!opts.silent) {
          this.msg(it.msg || `You got the ${it.name}.`, 5);
          this.sound(it.sound || (it.kind === 'key' ? 'key' : 'item')); this.flash([255, 220, 80], 0.35); this.face('grin');
        }
      }
      if (it.onPickup) this.runScript(it.onPickup, opts);
    }
    heal(n) { const p = this.player; p.health = Math.min(p.maxHealth, p.health + n); }
    /** Best light source among carried items (or config baseLight). */
    carriedLight() {
      let best = this.cfg.baseLight || null;
      for (const id of Object.keys(this.inv)) {
        const l = this.items[id] && this.items[id].light;
        if (l && (!best || l.radius > best.radius)) best = l;
      }
      return best;
    }
    heldSprite() {
      let best = null;
      for (const id of Object.keys(this.inv)) { const it = this.items[id]; if (it && it.held) { if (!best || (it.heldPriority || 0) > (best.heldPriority || 0)) best = it; } }
      return best ? best.held : null;
    }

    // ============================================================== world helpers
    cellsTagged(tag) {
      const cs = this.world.tags.get(tag);
      if (!cs) console.warn('No cells tagged', tag);
      return cs || [];
    }
    setTex(tag, prop, name) { const id = R.textures.id(name); for (const c of this.cellsTagged(tag)) { c[prop] = id; c.dyn = true; } }
    setCells(tag, props) {
      for (const c of this.cellsTagged(tag)) {
        for (const [k, v] of Object.entries(props)) c[k] = ['ftex', 'ctex', 'wall', 'low', 'up'].includes(k) ? R.textures.id(v) : v;
        c.dyn = true;
      }
    }
    moveCells(tag, prop, target, speed = 1, then = null) {
      const cells = this.cellsTagged(tag);
      cells.forEach(c => (c.dyn = true));
      this.movers.push({ cells, prop, target, speed, then });
      if (cells.length) this.sound('lift', cells[0].x + 0.5, cells[0].y + 0.5);
    }
    entities(tag) { return this.ents.filter(e => e.tag === tag); }
    remove(e) { e.gone = true; }

    // ============================================================== doors
    openDoor(tagOrCell, silent = false) {
      const cells = typeof tagOrCell === 'string' ? this.cellsTagged(tagOrCell) : (tagOrCell.door && tagOrCell.door.group ? this.cellsTagged(tagOrCell.door.group) : [tagOrCell]);
      let played = false;
      for (const c of cells) {
        const d = c.door;
        if (!d || d.state === 'open' || d.state === 'opening') continue;
        d.state = 'opening';
        if (!silent && !played) { this.sound(d.sound, c.x + 0.5, c.y + 0.5); played = true; }
        if (d.secret && !d.found) { d.found = true; this.stats.secrets++; this.msg('You found a secret passage!'); this.sound('secret'); }
        if (d.script) this.runScript(d.script, { cell: c });
      }
    }
    closeDoor(tag) {
      for (const c of this.cellsTagged(tag)) if (c.door && c.door.state !== 'closed') { c.door.state = 'closing'; this.sound(c.door.sound, c.x + 0.5, c.y + 0.5); }
    }
    useDoor(c) {
      const d = c.door;
      if (d.state === 'open' || d.state === 'opening') return false;
      if (d.remote) { this.msg(d.msg || "It won't budge. It must open some other way."); this.sound('locked'); return true; }
      if (d.key && !d.unlocked) {
        if (!this.has(d.key)) {
          const it = this.itemDef(d.key);
          this.msg(d.msg || `Locked. You need the ${it.name}.`); this.sound('locked'); return true;
        }
        const it = this.itemDef(d.key);
        for (const gc of (d.group ? this.cellsTagged(d.group) : [c])) if (gc.door) gc.door.unlocked = true;
        this.msg(d.openMsg || `You use the ${it.name}.`);
        if (d.consume) this.take(d.key);
      }
      this.openDoor(c);
      return true;
    }
    updateDoors(dt) {
      for (const f of this.world.floors) {
        // doors are few; scan only dynamic list cached lazily
        if (!f.doorCells) f.doorCells = f.cells.filter(c => c && c.door);
        for (const c of f.doorCells) {
          const d = c.door;
          if (d.state === 'opening') {
            c.cl = Math.min(c.doorTop, c.cl + d.speed * dt);
            if (c.cl >= c.doorTop) { d.state = 'open'; d.openedAt = this.time; }
          } else if (d.state === 'closing') {
            c.cl = Math.max(c.fl, c.cl - d.speed * dt);
            if (c.cl <= c.fl) d.state = 'closed';
          }
        }
      }
    }
    updateMovers(dt) {
      for (const m of this.movers) {
        let done = true;
        for (const c of m.cells) {
          const v = c[m.prop];
          if (v === m.target) continue;
          const nv = v < m.target ? Math.min(m.target, v + m.speed * dt) : Math.max(m.target, v - m.speed * dt);
          c[m.prop] = nv;
          if (nv !== m.target) done = false;
        }
        if (done) { m.finished = true; if (m.then) this.runScript(m.then, {}); }
      }
      if (this.movers.some(m => m.finished)) this.movers = this.movers.filter(m => !m.finished);
    }

    // ============================================================== damage
    hurt(n, sx, sy, message) {
      const p = this.player;
      if (!p.alive || p.invuln > 0 || this.god) return false;
      p.health -= n;
      p.invuln = this.cfg.invuln;
      this.flash([255, 0, 0], Math.min(0.6, 0.2 + n / 80));
      this.face('ouch');
      this.shake(0.25);
      if (sx !== undefined && sx !== null) {
        let dx = p.x - sx, dy = p.y - sy; const l = Math.hypot(dx, dy) || 1;
        if (l < 1e-3) { dx = -Math.cos(p.ang); dy = -Math.sin(p.ang); }
        p.kvx = dx / l * this.cfg.knock; p.kvy = dy / l * this.cfg.knock;
      }
      if (message) this.msg(message, 3);
      if (p.health <= 0) { p.health = 0; this.die(); } else this.sound('hurt');
      return true;
    }
    die() {
      const p = this.player;
      p.alive = false; this.stats.deaths++;
      this.sound('death'); this.face('dead');
      this.hooks.died && this.hooks.died();
    }
    respawn() {
      const p = this.player, cp = this.checkpoint;
      p.floor = cp.floor; p.x = cp.x; p.y = cp.y; p.ang = cp.ang;
      const r = this.world.resolve(p.floor, Math.floor(p.x), Math.floor(p.y));
      p.z = r.cell.fl + r.dz; p.viewZ = p.z + this.cfg.eyeHeight; p.vz = 0;
      p.vx = p.vy = p.kvx = p.kvy = 0;
      p.health = p.maxHealth; p.alive = true; p.invuln = this.cfg.respawnInvuln; p.pitch = 0;
      this.face('normal');
      this.hooks.floorChanged && this.hooks.floorChanged(p.floor);
    }
    setCheckpoint() {
      const p = this.player;
      this.checkpoint = { floor: p.floor, x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5, ang: p.ang };
    }
    teleport(floor, x, y, ang) {
      const p = this.player;
      p.floor = floor; p.x = x; p.y = y; if (ang !== undefined) p.ang = U.dirAngle(ang);
      const r = this.world.resolve(floor, Math.floor(x), Math.floor(y));
      p.z = r.cell.fl + r.dz; p.viewZ = p.z + this.cfg.eyeHeight;
      this.hooks.floorChanged && this.hooks.floorChanged(floor);
    }
    win(info = {}) {
      if (this.won) return;
      this.won = true;
      this.hooks.won && this.hooks.won(info);
    }

    // ============================================================== movement
    /** Is position (nx,ny) blocked for the player? */
    blocked(nx, ny) {
      const cfg = this.cfg, p = this.player, r = cfg.radius, W = this.world;
      const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r), y0 = Math.floor(ny - r), y1 = Math.floor(ny + r);
      const ox0 = Math.floor(p.x - r), ox1 = Math.floor(p.x + r), oy0 = Math.floor(p.y - r), oy1 = Math.floor(p.y + r);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const res = W.resolve(p.floor, cx, cy), c = res.cell;
        if (c.solid) return true;
        const inside = cx >= ox0 && cx <= ox1 && cy >= oy0 && cy <= oy1;
        if (inside) continue;
        if (c.block || W.cellAt(p.floor, cx, cy).block) return true;
        const f = c.fl + res.dz, ce = c.cl + res.dz;
        if (f > p.z + cfg.stepUp) return true;
        if (ce - Math.max(f, p.z) < cfg.height) return true;
      }
      for (const e of this.entsByFloor[p.floor]) {
        if (!e.solid || e.gone) continue;
        const rr = r + e.radius;
        const dn = U.dist(nx, ny, e.x, e.y);
        if (dn < rr && dn < U.dist(p.x, p.y, e.x, e.y)) return true;
      }
      return false;
    }
    /** Highest floor and lowest ceiling under the player's bounding box. */
    supportAt(x, y) {
      const r = this.cfg.radius, W = this.world, p = this.player;
      let fz = -1e9, cz = 1e9;
      for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
        const res = W.resolve(p.floor, cx, cy), c = res.cell;
        if (c.solid) continue;
        fz = Math.max(fz, c.fl + res.dz); cz = Math.min(cz, c.cl + res.dz);
      }
      return { fz, cz };
    }

    update(dt, input) {
      const p = this.player;
      this.time += dt;
      if (!this.won) this.stats.time += dt;
      // animated sectors on this floor and its neighbours (visible through stairs)
      for (let f = p.floor - 1; f <= p.floor + 1; f++) {
        const list = this.animCells[f]; if (!list) continue;
        for (const c of list) {
          R.cellAnims.get(c.anim.type).update(c, this.time, this);
          if (f === p.floor && c.anim.justSlammed) { this.sound('crush', c.x + 0.5, c.y + 0.5, 0.8); if (!c.anim.sounded) c.anim.sounded = true; }
        }
      }
      this.updateDoors(dt);
      if (this.movers.length) this.updateMovers(dt);
      if (this.timers.length) {
        const due = this.timers.filter(t => t.at <= this.time);
        if (due.length) { this.timers = this.timers.filter(t => t.at > this.time); for (const t of due) this.runScript(t.fn, {}); }
      }
      if (p.alive && !this.won) this.updatePlayer(dt, input || {});
      else { p.vx = p.vy = 0; }
      const ents = this.entsByFloor[p.floor];
      for (const e of ents) {
        if (e.gone) continue;
        if (e.def.update) e.def.update(e, this, dt);
        if (p.alive && e.def.touch && !this.won) {
          const d = U.dist(p.x, p.y, e.x, e.y);
          if (d < e.radius + this.cfg.radius) {
            const r = this.world.resolve(e.floor, Math.floor(e.x), Math.floor(e.y));
            const ez = r.cell.fl + r.dz + (e.spec.z || 0);
            if (Math.abs(ez - p.z) < 0.7 || e.hang) e.def.touch(e, this);
          }
        }
      }
      p.invuln = Math.max(0, p.invuln - dt);
    }

    updatePlayer(dt, inp) {
      const cfg = this.cfg, p = this.player;
      const run = !!inp.run;
      p.ang += (inp.turn || 0) * cfg.turnSpeed * (run ? 1.3 : 1) * dt;
      p.ang = U.mod(p.ang + Math.PI, Math.PI * 2) - Math.PI;
      if (inp.look) p.pitch = U.clamp(p.pitch + inp.look * 110 * dt, -cfg.lookMax, cfg.lookMax);
      if (inp.center) p.pitch *= Math.max(0, 1 - dt * 12);

      const sp = run ? cfg.runSpeed : cfg.walkSpeed;
      let fwd = inp.fwd || 0, str = inp.strafe || 0;
      const l = Math.hypot(fwd, str); if (l > 1) { fwd /= l; str /= l; }
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      const tx = (dx * fwd - dy * str) * sp, ty = (dy * fwd + dx * str) * sp;
      const k = Math.min(1, cfg.accel * dt);
      p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
      const mx = (p.vx + p.kvx) * dt, my = (p.vy + p.kvy) * dt;
      const kd = Math.max(0, 1 - 7 * dt); p.kvx *= kd; p.kvy *= kd;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 0.15));
      for (let i = 0; i < n; i++) {
        if (!this.blocked(p.x + mx / n, p.y)) p.x += mx / n; else { p.vx = 0; p.kvx = 0; }
        if (!this.blocked(p.x, p.y + my / n)) p.y += my / n; else { p.vy = 0; p.kvy = 0; }
      }

      // vertical
      const sup = this.supportAt(p.x, p.y);
      if (sup.fz >= p.z) {
        if (sup.fz - p.z > 0.001) p.z = sup.fz;
        if (p.vz < -5.5) { this.sound('land', undefined, undefined, 0.6); }
        p.vz = 0; p.onGround = true;
      } else {
        p.vz -= cfg.gravity * dt; p.z += p.vz * dt; p.onGround = false;
        if (p.z <= sup.fz) { if (p.vz < -5.5) this.sound('land', undefined, undefined, 0.6); p.z = sup.fz; p.vz = 0; p.onGround = true; }
      }
      const target = p.z + cfg.eyeHeight;
      if (p.viewZ < target && p.onGround) p.viewZ = Math.min(target, p.viewZ + Math.max(0.6 * dt, (target - p.viewZ) * Math.min(1, dt * 10)));
      else p.viewZ = target;
      if (p.viewZ > sup.cz - 0.06) p.viewZ = Math.max(p.z + 0.08, sup.cz - 0.06);

      // head bob + footsteps
      const spd = Math.hypot(p.vx, p.vy);
      const prevPhase = p.bobPhase;
      p.bobPhase += spd * dt * 2.1;
      p.bobAmp += ((p.onGround ? Math.min(1, spd / cfg.runSpeed) : 0) - p.bobAmp) * Math.min(1, dt * 8);
      if (p.onGround && spd > 0.5 && Math.floor(prevPhase / Math.PI) !== Math.floor(p.bobPhase / Math.PI)) this.sound('step', undefined, undefined, 0.35);

      // floor switching through stair portals
      const cx = Math.floor(p.x), cy = Math.floor(p.y);
      const here = this.world.cellAt(p.floor, cx, cy);
      if (here.portal >= 0) {
        p.floor = here.portal; p.z -= here.pdz; p.viewZ -= here.pdz;
        this.setCheckpoint();
        this.hooks.floorChanged && this.hooks.floorChanged(p.floor);
      }
      const key = p.floor * 1e6 + cy * this.world.W + cx;
      const res = this.world.resolve(p.floor, cx, cy);
      if (key !== this.lastCellKey) { this.lastCellKey = key; this.enterCell(res.cell); }

      if (inp.use) this.useAction();
      this.applyHazards(dt, res.cell, res.dz);
    }

    enterCell(c) {
      if (c.door || c.checkpoint) this.setCheckpoint();
      if (c.secret && !c.secretFound) { c.secretFound = true; c.dyn = true; this.stats.secrets++; this.msg('A secret area!'); this.sound('secret'); }
      if (c.enter) this.runScript(c.enter, { cell: c });
      if (c.label && c.label !== this.lastLabel) { this.lastLabel = c.label; this.hooks.area && this.hooks.area(c.label); }
      if (c.music && this.hooks.music) this.hooks.music(c.music);
    }

    applyHazards(dt, c, dz) {
      const p = this.player, cfg = this.cfg;
      const onFloor = p.z <= c.fl + dz + 0.03;
      if (c.anim && c.anim.type === 'crusher' && c.anim.slam && (c.cl + dz) - p.z < cfg.height * 0.95) {
        this.hurt(c.anim.damage ?? cfg.crushDamage, null, null, c.anim.msg || 'CRUNCH!');
      }
      if (!c.hazard || !onFloor) { this.hazTimer = 0; return; }
      const h = this.hazardDefs[c.hazard];
      if (!h) return;
      if (h.immune && this.has(h.immune)) {
        if (h.immuneMsg && !this.flags['_imm_' + c.hazard]) { this.flags['_imm_' + c.hazard] = true; this.msg(h.immuneMsg); }
        return;
      }
      if (h.pit) {
        if (p.alive) {
          this.msg(h.msg || 'You fell!', 3);
          p.invuln = 0;
          const died = this.hurt(h.damage ?? cfg.pitDamage);
          if (p.alive) { this.respawn(); p.invuln = 1; }
        }
        return;
      }
      this.hazTimer -= dt;
      if (this.hazTimer <= 0) {
        this.hazTimer = h.interval ?? 0.7;
        p.invuln = 0;
        this.hurt(h.damage ?? 10, null, null, h.msg);
        if (h.sound) this.sound(h.sound);
      }
    }

    useAction() {
      const p = this.player, cfg = this.cfg;
      // entities in front
      let best = null, bd = 1e9;
      for (const e of this.entsByFloor[p.floor]) {
        if (e.gone || !e.def.use) continue;
        const d = U.dist(p.x, p.y, e.x, e.y);
        if (d > cfg.useRange + e.radius) continue;
        const a = Math.abs(U.angDiff(p.ang, Math.atan2(e.y - p.y, e.x - p.x)));
        if (a < 0.75 || d < e.radius + cfg.radius + 0.1) if (d < bd) { bd = d; best = e; }
      }
      if (best) { best.def.use(best, this); return; }
      // cells in front
      const pcx = Math.floor(p.x), pcy = Math.floor(p.y);
      const dx = Math.cos(p.ang), dy = Math.sin(p.ang);
      for (let s = 0.05; s <= cfg.useRange; s += 0.05) {
        const cx = Math.floor(p.x + dx * s), cy = Math.floor(p.y + dy * s);
        if (cx === pcx && cy === pcy) continue;
        const c = this.world.resolve(p.floor, cx, cy).cell;
        if (c.door && c.door.state !== 'open' && c.door.state !== 'opening') { this.useDoor(c); return; }
        if (c.use) { this.runScript(c.use, { cell: c }); return; }
        if (c.solid || c.block) break;
      }
      this.sound('noway', undefined, undefined, 0.5);
    }

    /** Build the sprite draw list for the renderer (incl. other floors seen through portals). */
    spriteList(bank, stamp) {
      const p = this.player, list = [], W = this.world.W, elev = this.world.elev;
      for (let f = 0; f < this.entsByFloor.length; f++) for (const e of this.entsByFloor[f]) {
        if (e.gone) continue;
        if (f !== p.floor) {
          // only draw other-floor sprites whose surroundings were actually rendered this frame
          const vis = this.world.floors[f].vis;
          if (!vis || stamp === undefined) continue;
          const cx = Math.floor(e.x), cy = Math.floor(e.y);
          let ok = false;
          for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1; dx++) if (vis[(cy + dy) * W + cx + dx] === stamp) { ok = true; break; }
          if (!ok) continue;
        }
        const name = e.def.sprite ? e.def.sprite(e, this) : e.sprite;
        if (!name) continue;
        const spr = bank.sprite(name);
        // hanging things keep the height of the cell they hang from
        const hang = e.hang || spr.hang;
        const r = hang ? this.world.resolve(e.floor, Math.floor(e.x0), Math.floor(e.y0)) : this.world.resolve(e.floor, Math.floor(e.x), Math.floor(e.y));
        const c = r.cell, off = elev[e.floor] - elev[p.floor];
        let z;
        if (hang) z = c.cl + r.dz - spr.h / 64 * spr.scale - (e.spec.drop || 0);
        else z = c.fl + r.dz + (e.spec.z || 0) + (e.bob ? 0.04 + 0.035 * Math.sin(this.time * 3 + e.id) : 0);
        e.z = z;
        z += off;
        const frame = spr.frames.length > 1 ? Math.floor((this.time + e.id * 0.37) * spr.fps) : 0;
        list.push({ x: e.x, y: e.y, z, spr, frame, light: Math.min(31, c.light + (e.spec.light || 0)), fog: c.fog, flip: !!e.flip, bright: !!e.bright, ent: e });
      }
      return list;
    }

    // ============================================================== save/load
    serialize() {
      const texName = id => (id < 0 ? null : R.textures.order[id]);
      const cells = [];
      this.world.floors.forEach((fl, f) => fl.cells.forEach((c, i) => {
        if (!c || !c.dyn) return;
        cells.push([f, i, {
          fl: c.fl, cl: c.cl, ftex: texName(c.ftex), ctex: texName(c.ctex), wall: texName(c.wall), low: texName(c.low), up: texName(c.up),
          hazard: c.hazard, block: c.block, solid: c.solid, use: c.use, light: c.light, secretFound: !!c.secretFound, enter: c.enter,
          door: c.door ? { state: c.door.state === 'opening' ? 'open' : c.door.state === 'closing' ? 'closed' : c.door.state, unlocked: !!c.door.unlocked, found: !!c.door.found } : null,
        }]);
      }));
      const ents = [];
      for (const e of this.ents) if (e.gone || e.state || e.fired) ents.push([e.id, e.gone ? 1 : 0, e.state, e.fired ? 1 : 0]);
      const seen = this.world.floors.map(fl => {
        const out = []; let cur = 0, run = 0;
        for (let i = 0; i < fl.seen.length; i++) { if (fl.seen[i] === cur) run++; else { out.push(run); cur = fl.seen[i]; run = 1; } }
        out.push(run); return out.join(',');
      });
      const p = this.player;
      return {
        v: 1, campaign: this.camp.id, sig: this.world.signature, savedAt: Date.now(), time: this.time,
        player: { x: p.x, y: p.y, z: p.z, floor: p.floor, ang: p.ang, health: p.health },
        inv: this.inv, flags: this.flags, stats: this.stats, checkpoint: this.checkpoint, cells, ents, seen,
        movers: this.movers.map(m => ({ tag: m.cells[0] && m.cells[0].tag, prop: m.prop, target: m.target, speed: m.speed, then: typeof m.then === 'string' ? m.then : null })),
      };
    }
    deserialize(s) {
      if (!s || s.campaign !== this.camp.id) throw new Error('Save belongs to another campaign');
      if (s.sig && s.sig !== R.compileWorld(this.camp).signature) throw new Error('Save was made with a different version of this campaign');
      this.newGame();
      const texId = n => (n === null ? -1 : R.textures.id(n));
      this.time = s.time; this.inv = s.inv || {}; this.flags = s.flags || {}; this.stats = Object.assign(this.stats, s.stats);
      this.checkpoint = s.checkpoint;
      for (const [f, i, st] of s.cells) {
        const c = this.world.floors[f].cells[i];
        if (!c) continue;
        Object.assign(c, { fl: st.fl, cl: st.cl, ftex: texId(st.ftex), ctex: texId(st.ctex), wall: texId(st.wall), low: texId(st.low), up: texId(st.up), hazard: st.hazard, block: st.block, solid: st.solid, use: st.use, light: st.light, secretFound: st.secretFound, enter: st.enter, dyn: true });
        if (c.door && st.door) {
          Object.assign(c.door, st.door);
          c.cl = c.door.state === 'open' ? c.doorTop : c.door.state === 'closed' ? c.fl : c.cl;
        }
      }
      for (const [id, gone, state, fired] of s.ents) { const e = this.ents[id]; if (!e) continue; e.gone = !!gone; e.state = state; e.fired = !!fired; }
      s.seen.forEach((str, f) => {
        const arr = this.world.floors[f].seen; let pos = 0, v = 0;
        for (const n of str.split(',').map(Number)) { arr.fill(v, pos, pos + n); pos += n; v ^= 1; }
      });
      for (const m of (s.movers || [])) if (m.tag) this.moveCells(m.tag, m.prop, m.target, m.speed, m.then);
      const p = this.player;
      Object.assign(p, s.player, { vx: 0, vy: 0, vz: 0, kvx: 0, kvy: 0, alive: true, invuln: 1 });
      p.viewZ = p.z + this.cfg.eyeHeight;
      this.lastCellKey = -1;
    }
  }
  R.Game = Game;

  // ------------------------------------------------ stock hazards
  R.hazards.register('acid', { damage: 8, interval: 0.6, msg: 'It burns!', sound: 'sizzle' });
  R.hazards.register('shock', { damage: 15, interval: 0.5, msg: 'ZZZAP!', sound: 'zap' });
  R.hazards.register('fire', { damage: 12, interval: 0.5, msg: 'Too hot!', sound: 'sizzle' });
  R.hazards.register('thorns', { damage: 6, interval: 0.7, msg: 'Thorns!' });
  R.hazards.register('pit', { pit: true, damage: 25, msg: 'You fell into the darkness...' });
  R.hazards.register('cold', { damage: 4, interval: 1.0, msg: 'The water is freezing!', sound: 'splash' });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
