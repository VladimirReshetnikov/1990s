/*
 * Entity behaviours (Hourglass fork). Entities spawn from legend `ent` specs:
 *   ent: { type: 'slicer', period: 2.4, phase: 0.5 }
 *   ent: { tpl: 'darts', dir: 'E', period: 2 }            (campaign template)
 * Register more with RetroEngine.entityTypes.register(name, def):
 *   init(e, g) · update(e, g, dt) · touch(e, g) · use(e, g) · sprite(e, g) -> name
 * e.z0 is the floor height the entity was placed on; e.z / e.height give its
 * vertical extent for touching (so things on other levels never touch you).
 * Set e.free = true to position e.z yourself (projectiles, falling things),
 * e.frame to pick a sprite frame. All moving hazards run on game time only:
 * they are predictable and deterministic.
 */
(function (R) {
  'use strict';
  const U = R.util;
  const T = R.entityTypes = new R.Registry('entity type');

  /** Periodic on/off helper: true while "on". */
  R.phaseOn = (g, spec) => U.mod(g.time / (spec.period || 3) + (spec.phase || 0), 1) < (spec.duty ?? 0.5);
  const phase = (g, s) => U.mod(g.time / (s.period || 3) + (s.phase || 0), 1);
  const harm = (e, g, def = 1) => {
    const s = e.spec;
    if (s.deadly) g.kill(s.msg);
    else g.hurt(s.damage ?? def, e.x, e.y, s.msg);
  };

  T.register('deco', { init(e) { if (e.spec.solid === undefined) e.solid = false; e.height = e.spec.height ?? 1.0; } });

  /** Items: keys, gems and relics are picked up on touch; bottles are drunk with Use. */
  T.register('item', {
    init(e, g) {
      const it = g.itemDef(e.spec.item);
      e.sprite = e.spec.sprite || it.sprite;
      e.radius = e.spec.radius ?? 0.45;
      e.bob = !g.isDrink(e.spec.item);
    },
    touch(e, g) {
      if (!g.isDrink(e.spec.item)) { g.give(e.spec.item, { entity: e }); g.remove(e); return; }
      if (!e._hinted || g.time - e._hinted > 8) { e._hinted = g.time; g.msg(e.spec.hint || 'A little bottle. Press E to drink.', 3); }
    },
    use(e, g) {
      const it = g.itemDef(e.spec.item), p = g.player;
      if (it.kind === 'life' && p.life >= p.maxLife) { g.msg('You are not hurt. Keep it for later.', 2); g.sound('noway', undefined, undefined, 0.5); return; }
      g.give(e.spec.item, { entity: e });
      g.remove(e);
    },
  });

  T.register('note', {
    init(e) { e.sprite = e.spec.sprite || 'NOTE'; e.radius = 0.5; },
    touch(e, g) { if (!e._hinted || g.time - e._hinted > 6) { e._hinted = g.time; g.msg(e.spec.hint || 'Something is written here. Press E to read.'); } },
    use(e, g) { g.dialog(e.spec.title || 'AN INSCRIPTION', e.spec.text || ''); if (e.spec.script) g.runScript(e.spec.script, { entity: e }); },
  });

  T.register('usable', {
    init(e) { e.radius = e.spec.radius ?? 0.5; if (e.spec.solid === undefined) e.solid = true; },
    use(e, g) { if (e.spec.script) g.runScript(e.spec.script, { entity: e }); else if (e.spec.text) g.msg(e.spec.text); },
    sprite(e) { return e.spec.sprites ? e.spec.sprites[e.state | 0] : e.sprite; },
  });

  T.register('trigger', {
    init(e) { e.radius = e.spec.radius ?? 0.6; e.sprite = null; e.height = 1.2; },
    touch(e, g) {
      if (e.spec.once !== false && e.fired) return;
      e.fired = true;
      if (e.initial && e.spec.once !== false) g.record(['fired', e.id]);
      if (e.spec.script) g.runScript(e.spec.script, { entity: e });
      if (e.spec.text) g.msg(e.spec.text, e.spec.time || 5);
    },
    sprite() { return null; },
  });

  /** Checkpoint brazier: lights when touched and becomes the respawn point. */
  T.register('checkpoint', {
    init(e) { e.radius = 0.5; e.solid = false; e.height = 1.0; },
    touch(e, g) {
      if (e.lit) return;
      for (const o of g.ents) if (o.type === 'checkpoint') o.lit = false;
      e.lit = true;
      g.record(['lit', e.id]);
      g.setCheckpoint(e.x0, e.y0, e.z0, g.player.ang);
      g.msg(e.spec.msg || 'The brazier flares up. You will return here if you fall.', 3);
      g.sound('checkpoint');
    },
    sprite(e) { return e.lit ? (e.spec.spriteOn || 'BRAZIER_LIT') : (e.spec.spriteOff || 'BRAZIER'); },
  });

  /** Periodic trap: flame jets, steam, spore pods... */
  T.register('trap', {
    init(e) { e.radius = e.spec.radius ?? 0.35; e.solid = false; e.height = e.spec.height ?? 1.0; },
    update(e, g) {
      const on = R.phaseOn(g, e.spec);
      if (on && !e.on && e.spec.sound) g.sound(e.spec.sound, e.x, e.y, 1, e.z);
      e.on = on;
      e.bright = on && e.spec.brightOn;
    },
    touch(e, g) { if (e.on) harm(e, g); },
    sprite(e) { return e.on ? e.spec.spriteOn : e.spec.spriteOff; },
  });

  /**
   * Spikes: spring up when a non-careful player is in their cell or next to it.
   * Running, falling or landing onto them kills; walking into them hurts and
   * pushes you back; a careful step threads between them.
   */
  T.register('spikes', {
    init(e) { e.radius = e.spec.radius ?? 0.42; e.height = 0.5; e.up = !!e.spec.static; e.t = 0; e.cx = Math.floor(e.x0); e.cy = Math.floor(e.y0); },
    update(e, g, dt) {
      if (e.spec.static) { e.up = true; return; }
      const p = g.player, px = Math.floor(p.x), py = Math.floor(p.y);
      const near = Math.abs(px - e.cx) + Math.abs(py - e.cy) <= (e.spec.range ?? 1);
      if (!e.up && p.alive && near && Math.abs(p.z - e.z0) < 0.7 && !(p.careful && p.onGround)) {
        e.up = true; e.t = 0; g.sound('spikes', e.x, e.y, 1, e.z0);
      }
      if (e.up) { if (near && Math.abs(p.z - e.z0) < 0.7) e.t = 0; else { e.t += dt; if (e.t > (e.spec.hold ?? 1.5)) e.up = false; } }
    },
    touch(e, g) {
      if (!e.up) return;
      const p = g.player, cfg = g.cfg, v = Math.hypot(p.vx, p.vy);
      if (p.careful && p.onGround && v < cfg.carefulSpeed + 0.25) return;
      if (!p.onGround || p.vz < -0.5 || v > cfg.walkSpeed * 1.2) { g.kill(e.spec.msg || 'Impaled on the spikes!'); return; }
      // walking into raised spikes: they hurt, and they always push you back out
      g.hurt(1, null, null, e.spec.hurtMsg || 'Spikes! Step carefully (hold C).');
      const dx = p.x - e.x, dy = p.y - e.y;
      const ax = Math.abs(dx) >= Math.abs(dy);
      p.kvx = ax ? Math.sign(dx || -Math.cos(p.ang)) * cfg.knock : 0; p.kvy = ax ? 0 : Math.sign(dy || -Math.sin(p.ang)) * cfg.knock;
      p.vx = p.vy = 0;
    },
    sprite(e) { return e.up ? (e.spec.spriteOn || 'SPIKES_UP') : (e.spec.spriteOff || 'SPIKES_DOWN'); },
  });

  /**
   * Slicer: steel jaws across a corridor that snap shut on a fixed beat. The jaws
   * are drawn as geometry on the cell's mid-plane (span.blade), so they read
   * the same from every angle; a whetted "shing" warns 0.3 s before the snap.
   */
  T.register('slicer', {
    init(e, g) {
      e.radius = e.spec.radius ?? 0.4; e.height = 1.3; e.frame = 0;
      const c = g.world.cellAt(Math.floor(e.x0), Math.floor(e.y0));
      const s = c && R.spanAt(c, e.z0 + 0.02);
      if (s && R.textures.has(e.spec.bladeTex || 'SLICER_JAWS')) { s.blade = { tex: R.textures.id(e.spec.bladeTex || 'SLICER_JAWS'), frame: 0 }; e.blade = s.blade; }
      else e.sprite = e.spec.sprite || 'SLICER';
    },
    update(e, g) {
      const period = e.spec.period || 2.4, p = phase(g, Object.assign({ period: 2.4 }, e.spec));
      let k;
      if (p < 0.06) k = p / 0.06; else if (p < 0.22) k = 1; else if (p < 0.4) k = 1 - (p - 0.22) / 0.18; else k = 0;
      e.closed = k > 0.6;
      e.frame = Math.min(3, Math.round(k * 3));
      if (e.blade) e.blade.frame = e.frame;
      const warn = 1 - 0.3 / period;
      if (p > warn && !e.warned) { e.warned = true; g.sound('shing', e.x, e.y, 0.6, e.z0); }
      if (p < 0.06 && !e.snapped) { e.snapped = true; e.warned = false; g.sound('slice', e.x, e.y, 1, e.z0); }
      if (p > 0.5) e.snapped = false;
    },
    touch(e, g) { if (e.closed) g.kill(e.spec.msg || 'The blades snap shut on you!'); },
    sprite(e) { return e.blade ? null : e.sprite; },
  });

  /** Dart trap: fires a dart along a direction on a fixed beat. Place it in the cell in front of the wall slot. */
  T.register('darts', {
    init(e) {
      e.sprite = e.spec.sprite || null; e.radius = 0; e.height = 0;
      const a = U.dirAngle(e.spec.dir || 'E'); e.dx = Math.cos(a); e.dy = Math.sin(a);
    },
    update(e, g) {
      const period = e.spec.period || 2.4, p = phase(g, Object.assign({ period: 2.4 }, e.spec));
      const warn = 1 - 0.6 / period;
      if (e.last !== undefined && e.last < warn && p >= warn) g.sound('dartclick', e.x, e.y, 0.6, e.z0);
      if (e.last !== undefined && p < e.last) {
        g.spawn({ type: 'dart', x: e.x - e.dx * 0.45, y: e.y - e.dy * 0.45, z0: e.z0, zFly: e.spec.zFly ?? 0.42, vx: e.dx * (e.spec.speed || 5), vy: e.dy * (e.spec.speed || 5), range: e.spec.range || 12, msg: e.spec.msg, damage: e.spec.damage });
        g.sound('dart', e.x, e.y, 0.8, e.z0);
      }
      e.last = p;
    },
  });
  T.register('dart', {
    init(e) { e.sprite = e.spec.sprite || 'DART'; e.radius = 0.16; e.height = 0.2; e.free = true; e.bright = true; e.z = e.z0 + (e.spec.zFly ?? 0.42); e.flown = 0; },
    update(e, g, dt) {
      const nx = e.x + e.spec.vx * dt, ny = e.y + e.spec.vy * dt;
      e.flown += Math.hypot(e.spec.vx, e.spec.vy) * dt;
      const c = g.world.cellAt(Math.floor(nx), Math.floor(ny));
      if (!c || !R.spanAt(c, e.z + 0.05) || e.flown > e.spec.range) { e.gone = true; return; }
      e.x = nx; e.y = ny;
      e.flip = e.spec.vx < 0;
    },
    touch(e, g) { g.hurt(e.spec.damage ?? 1, null, null, e.spec.msg || 'A dart!'); e.gone = true; },
  });

  /** Falling rock: dust trickles (warning), then a rock drops from the ceiling. */
  T.register('rock', {
    init(e) { e.radius = 0.5; e.height = 0.6; e.free = true; e.z = e.z0; },
    update(e, g) {
      const s = e.spec, p = phase(g, Object.assign({ period: 3.6 }, s));
      const c = g.world.cellAt(Math.floor(e.x0), Math.floor(e.y0));
      const sp = c && (R.spanAt(c, e.z0 + 0.02) || R.spanBelow(c, e.z0 + 0.02));
      const ceil = sp ? Math.min(sp.cl, sp.fl + 4) : e.z0 + 2;
      const fl = sp ? sp.fl : e.z0;
      e.stage = p < 0.3 ? 'dust' : p < 0.4 ? 'fall' : p < 0.65 ? 'rubble' : 'none';
      if (e.stage === 'dust') { e.z = ceil - 0.5; if (!e.warned) { e.warned = true; g.sound('creak', e.x, e.y, 0.7, fl); } }
      else if (e.stage === 'fall') { const f = (p - 0.3) / 0.1; e.z = ceil - 0.4 - (ceil - 0.4 - fl) * f * f; }
      else e.z = fl;
      if (e.stage === 'rubble' && !e.hit) {
        e.hit = true; g.sound('crash', e.x, e.y, 1, fl);
        const pl = g.player;
        if (Math.hypot(pl.x - e.x, pl.y - e.y) < 0.62 && Math.abs(pl.z - fl) < 0.5) { if (s.deadly) g.kill(s.msg); else g.hurt(s.damage ?? 1, null, null, s.msg || 'A falling rock!'); }
      }
      if (e.stage === 'none') { e.hit = false; e.warned = false; }
    },
    sprite(e) { return e.stage === 'dust' ? 'DUST' : e.stage === 'fall' ? 'ROCK' : e.stage === 'rubble' ? 'RUBBLE' : null; },
  });

  /** A loose floor tile falling to the level below. */
  T.register('fallingTile', {
    init(e) { e.free = true; e.z = e.z0; e.vz = 0; e.radius = 0.4; e.height = 0.3; e.sprite = e.spec.sprite || 'LOOSE_TILE'; },
    update(e, g, dt) {
      if (e.landed) return;
      e.vz -= 13 * dt; e.z += e.vz * dt;
      if (e.z <= e.spec.landZ) {
        e.z = e.spec.landZ; e.landed = true;
        if (e.spec.landZ < -30) { e.gone = true; return; }
        e.sprite = 'RUBBLE'; e.free = false; e.z0 = e.spec.landZ;
        g.sound('crash', e.x, e.y, 1, e.z);
        const p = g.player;
        if (Math.hypot(p.x - e.x, p.y - e.y) < 0.6 && Math.abs(p.z - e.z) < 0.4) g.hurt(1, null, null, 'Hit by falling masonry!');
      }
    },
  });

  /** Patroller: walks a fixed path — back and forth, in a loop, or one way and restart. */
  T.register('patrol', {
    init(e) {
      const s = e.spec, abs = s.abs;
      e.path = (s.path || [[0, 0], [3, 0]]).map(([px, py]) => (abs ? [px + 0.5, py + 0.5] : [e.x0 + px, e.y0 + py]));
      if (s.mode === 'loop') e.path.push(e.path[0]);
      e.segs = []; let L = 0;
      for (let i = 0; i + 1 < e.path.length; i++) { const l = U.dist(e.path[i][0], e.path[i][1], e.path[i + 1][0], e.path[i + 1][1]); e.segs.push(l); L += l; }
      e.len = L;
      e.radius = s.radius ?? 0.35;
      e.height = s.height ?? 0.8;
      e.solid = false;
      T.get('patrol').update(e, { time: 0 });
    },
    update(e, g) {
      const s = e.spec, L = e.len || 1;
      let d = g.time * (s.speed || 1) + (s.phase || 0) * L;
      if (s.mode === 'loop' || s.mode === 'oneway') d = U.mod(d, L);
      else { d = U.mod(d, 2 * L); if (d > L) d = 2 * L - d; }
      let i = 0;
      while (i < e.segs.length - 1 && d > e.segs[i]) { d -= e.segs[i]; i++; }
      const a = e.path[i], b = e.path[i + 1], t = e.segs[i] ? U.clamp(d / e.segs[i], 0, 1) : 0;
      const nx = U.lerp(a[0], b[0], t), ny = U.lerp(a[1], b[1], t);
      if (e.x !== undefined && g.player) {
        e.odo = (e.odo || 0) + U.dist(e.x, e.y, nx, ny);
        if (s.sound && e.odo > (s.soundEvery || 1.2)) { e.odo = 0; g.sound(s.sound, nx, ny, 0.6, e.z0); }
      }
      e.flip = e.x !== undefined && nx < e.x;
      e.x = nx; e.y = ny;
    },
    touch(e, g) { harm(e, g); },
  });

  T.register('orbit', {
    init(e) { e.radius = e.spec.radius ?? 0.35; e.height = e.spec.height ?? 0.8; e.solid = false; T.get('orbit').update(e, { time: 0 }); },
    update(e, g) {
      const s = e.spec, a = (g.time / (s.period || 6) + (s.phase || 0)) * Math.PI * 2 * (s.ccw ? -1 : 1);
      e.x = e.x0 + Math.cos(a) * (s.r ?? 1.5); e.y = e.y0 + Math.sin(a) * (s.r ?? 1.5);
      e.flip = Math.sin(a) > 0;
    },
    touch(e, g) { harm(e, g); },
  });

  T.register('pendulum', {
    init(e) { e.radius = e.spec.radius ?? 0.3; e.sprite = e.spec.sprite || 'PENDULUM'; e.hang = true; e.height = 1.0; T.get('pendulum').update(e, { time: 0 }); },
    update(e, g) {
      const s = e.spec, v = Math.sin((g.time / (s.period || 2.4) + (s.phase || 0)) * Math.PI * 2) * (s.amp ?? 1.0);
      if (s.axis === 'y') { e.x = e.x0; e.y = e.y0 + v; } else { e.x = e.x0 + v; e.y = e.y0; }
      const prev = e.sv || 0; e.sv = v;
      if (g.player && Math.sign(prev) !== Math.sign(v) && s.sound !== false) g.sound(s.sound || 'swish', e.x, e.y, 0.5, e.z0);
    },
    touch(e, g) { harm(e, g); },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
