/*
 * Entity behaviours. An entity is spawned from a legend entry's `ent` spec:
 *   ent: { type: 'item', item: 'key_red' }
 *   ent: { type: 'patrol', sprite: 'KNIGHT', path: [[0,0],[6,0]], speed: 1.2 }
 *
 * Register new behaviours with RetroEngine.entityTypes.register(name, def):
 *   init(e, g)        once, after spawn
 *   update(e, g, dt)  every tick while on the player's floor
 *   touch(e, g)       player overlaps e (distance < e.radius + player radius)
 *   use(e, g)         player presses USE while facing e
 *   sprite(e, g)      -> sprite name to draw (default e.sprite), or null
 *   solid             true = blocks player movement
 * Moving hazards derive their position from game time, so they are always
 * perfectly predictable (and deterministic after save/load).
 */
(function (R) {
  'use strict';
  const U = R.util;
  const T = R.entityTypes = new R.Registry('entity type');

  /** Periodic on/off helper: returns true while "on". */
  function phaseOn(g, spec) {
    const p = U.mod(g.time / (spec.period || 3) + (spec.phase || 0), 1);
    return p < (spec.duty ?? 0.5);
  }
  R.phaseOn = phaseOn;

  T.register('deco', {
    init(e) { if (e.spec.solid === undefined) e.solid = false; },
  });

  T.register('item', {
    init(e, g) {
      const it = g.itemDef(e.spec.item);
      e.sprite = e.spec.sprite || it.sprite;
      e.radius = e.spec.radius ?? 0.45;
      e.bob = true;
    },
    touch(e, g) {
      const it = g.itemDef(e.spec.item);
      if (it.kind === 'health' && g.player.health >= g.player.maxHealth) return;
      g.give(e.spec.item, { entity: e });
      e.gone = true;
    },
  });

  T.register('note', {
    init(e) { e.sprite = e.spec.sprite || 'NOTE'; e.radius = 0.5; },
    touch(e, g) { if (!e._hinted || g.time - e._hinted > 6) { e._hinted = g.time; g.msg(e.spec.hint || 'Something is written here. Press USE to read.'); } },
    use(e, g) { g.dialog(e.spec.title || 'A NOTE', e.spec.text || ''); if (e.spec.script) g.runScript(e.spec.script, { entity: e }); },
  });

  T.register('usable', {
    init(e) { e.radius = e.spec.radius ?? 0.5; if (e.spec.solid === undefined) e.solid = true; },
    use(e, g) { if (e.spec.script) g.runScript(e.spec.script, { entity: e }); else if (e.spec.text) g.msg(e.spec.text); },
    sprite(e) { return e.spec.sprites ? e.spec.sprites[e.state | 0] : e.sprite; },
  });

  /** Invisible trigger: runs a script when touched (once by default). */
  T.register('trigger', {
    init(e) { e.radius = e.spec.radius ?? 0.6; e.sprite = null; },
    touch(e, g) {
      if (e.spec.once !== false && e.fired) return;
      e.fired = true;
      if (e.spec.script) g.runScript(e.spec.script, { entity: e });
      if (e.spec.text) g.msg(e.spec.text, e.spec.time || 5);
    },
    sprite() { return null; },
  });

  /** Periodic trap: flame jets, spikes, spore pods, steam vents... */
  T.register('trap', {
    init(e) {
      e.radius = e.spec.radius ?? 0.35;
      e.solid = false;
    },
    update(e, g) {
      const on = phaseOn(g, e.spec);
      if (on && !e.on && e.spec.sound) g.sound(e.spec.sound, e.x, e.y);
      e.on = on;
      e.bright = on && e.spec.brightOn;
    },
    touch(e, g) { if (e.on) g.hurt(e.spec.damage ?? 20, e.x, e.y, e.spec.msg); },
    sprite(e) { return e.on ? e.spec.spriteOn : e.spec.spriteOff; },
  });

  /** Patroller: walks a fixed polyline, back-and-forth or in a loop. */
  T.register('patrol', {
    init(e) {
      const s = e.spec;
      const abs = s.abs;
      e.path = (s.path || [[0, 0], [3, 0]]).map(([px, py]) => (abs ? [px + 0.5, py + 0.5] : [e.x0 + px, e.y0 + py]));
      if (s.mode === 'loop') e.path.push(e.path[0]);
      e.segs = []; let L = 0;
      for (let i = 0; i + 1 < e.path.length; i++) {
        const l = U.dist(e.path[i][0], e.path[i][1], e.path[i + 1][0], e.path[i + 1][1]);
        e.segs.push(l); L += l;
      }
      e.len = L;
      e.radius = s.radius ?? 0.35;
      e.solid = false;
      T.get('patrol').update(e, { time: 0 });
    },
    update(e, g) {
      const s = e.spec, L = e.len || 1;
      let d = (g.time * (s.speed || 1)) + (s.phase || 0) * L;
      if (s.mode === 'loop') d = U.mod(d, L);
      else { d = U.mod(d, 2 * L); if (d > L) d = 2 * L - d; }
      let i = 0;
      while (i < e.segs.length - 1 && d > e.segs[i]) { d -= e.segs[i]; i++; }
      const a = e.path[i], b = e.path[i + 1], t = e.segs[i] ? U.clamp(d / e.segs[i], 0, 1) : 0;
      const nx = U.lerp(a[0], b[0], t), ny = U.lerp(a[1], b[1], t);
      if (e.x !== undefined && g.player) {
        // footstep / hum sound every unit travelled
        e.odo = (e.odo || 0) + U.dist(e.x, e.y, nx, ny);
        if (s.sound && e.odo > (s.soundEvery || 1.2)) { e.odo = 0; g.sound(s.sound, nx, ny, 0.6); }
      }
      e.x = nx; e.y = ny;
    },
    touch(e, g) { g.hurt(e.spec.damage ?? 20, e.x, e.y, e.spec.msg); },
  });

  /** Orbiter: circles around its spawn point (dancers, wisps...). */
  T.register('orbit', {
    init(e) { e.radius = e.spec.radius ?? 0.35; e.solid = false; T.get('orbit').update(e, { time: 0 }); },
    update(e, g) {
      const s = e.spec, a = (g.time / (s.period || 6) + (s.phase || 0)) * Math.PI * 2 * (s.ccw ? -1 : 1);
      e.x = e.x0 + Math.cos(a) * (s.r ?? 1.5) * (s.sx ?? 1);
      e.y = e.y0 + Math.sin(a) * (s.r ?? 1.5) * (s.sy ?? 1);
      e.flip = Math.sin(a) > 0;
    },
    touch(e, g) { g.hurt(e.spec.damage ?? 15, e.x, e.y, e.spec.msg); },
  });

  /** Pendulum blade: swings along x or y with a sine timetable. */
  T.register('pendulum', {
    init(e) { e.radius = e.spec.radius ?? 0.3; e.sprite = e.spec.sprite || 'PENDULUM'; e.hang = true; T.get('pendulum').update(e, { time: 0 }); },
    update(e, g) {
      const s = e.spec, v = Math.sin((g.time / (s.period || 2.4) + (s.phase || 0)) * Math.PI * 2) * (s.amp ?? 1.2);
      if (s.axis === 'y') { e.x = e.x0; e.y = e.y0 + v; } else { e.x = e.x0 + v; e.y = e.y0; }
      const prev = e.sv || 0; e.sv = v;
      if (g.player && Math.sign(prev) !== Math.sign(v) && s.sound !== false) g.sound(s.sound || 'swish', e.x, e.y, 0.5);
    },
    touch(e, g) { g.hurt(e.spec.damage ?? 25, e.x, e.y, e.spec.msg); },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
