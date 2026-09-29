#!/usr/bin/env node
/*
 * Level solver:  node tools/verify.js [levelId] [--quiet]
 *
 * Compiles every level and proves it can be finished WITHOUT TAKING DAMAGE
 * using only the moves the contract promises (engine/game.js header; proven
 * two-sided by tools/physics.js on synthetic corridors, and edge by edge in the
 * real level geometry by tools/replay.js). Storeys are 1.5 apart.
 *
 *   walk / step up <= 0.35 · walk off a drop <= 2.3: you land where the flight
 *   takes you (walking speed from the cell centre, walls stop you, you slide on
 *   and may fall again: simulated along the axis) · careful hang-drop (C, Forward
 *   twice) straight down into the next cell, any drop <= 3.2 · climb a ledge
 *   0.35..1.75 up (headroom above you) · loose floors (stop on one to ride it
 *   down) · keys · pressure plates (a timed gate must be reachable in time) ·
 *   levers · lifts · exit
 *   jumps along a corridor over k gap cells, by height change dz of the landing:
 *     -0.35 <= dz <= +0.1     standing k<=1 · running k<=3 (3 = catch the lip)
 *     +0.1 < dz <= +1.0       standing k<=1 · running k<=2 (catch)
 *     -2.3 <= dz < -0.35      standing k<=1 · running k<=3
 *   running jumps need 2 straight cells of run-up at the take-off height; every
 *   jump needs headroom (ceiling >= take-off + 1.15) over the take-off, the gap
 *   and the landing; a catch needs room to pull up from the last gap cell.
 *   Spikes: a span with spikes is entered and left only by careful steps (walk
 *   or step edges at careful speed); nothing lands on it, jumps or climbs off it,
 *   runs up across it, and a walk-off never comes to rest within their reach.
 *   Floors that hurt (fire, acid ...) are never stood on; lava and abyss kill.
 *   Loose floors: you cannot stand still on one, so no careful hang-drop or
 *   standing jump from it (a walking jump is fine). Dormant ones ({ armed: false })
 *   are plain floor. Knock a loose ceiling flag down with a straight-up jump when
 *   its underside is within reach (floor + 1.4): the hole opens for climbing.
 *   Moving floors ('bob', 'lift' anims) are tried at their low, middle and high points.
 *   Spans marked { forbid: true } must never be reached (an ERROR if they are).
 *   Timed gates (a plate or lever with `hold`) are never simply "open": standing on
 *   the plate (or at the lever) gives a 'timed' move to each cell just past the
 *   gate that is reachable within the budget (1.25 x the crossing + 1.5 s <=
 *   hold + 0.3), so every route through such a gate pays for its plate. Levers
 *   and plates that `close` a gate close it; a plate that only closes a gate is
 *   never stepped on while that gate is open. Solid entities (balustrade posts,
 *   barrels) block the crossings they stand in.
 *
 * Items whose position is reached are collected; the search repeats until
 * nothing new opens. Reports unreachable items, then robustness warnings: a
 * loose floor falling early, the exit from every checkpoint with that floor
 * gone, and heights that sit on a contract threshold (ambiguous in play).
 *
 * As a module:  const { solve, makeGame } = require('./verify.js')
 *   solve(g, from?, { edges: true }) also returns, per search round, the world
 *   state it assumed, every move edge it relaxed and a predecessor map;
 *   route(res) reconstructs the optimal legs (start -> each key/plate/lever that
 *   opened something, and start -> exit in the final round).
 */
'use strict';
const R = require('./load.js').load();
const camp = R.campaigns.get('hourglass');

const HEADROOM = 1.15;         // apex 0.50 + body 0.62, plus a little

function makeGame(lv, hooks = {}) {
  const c = Object.assign({}, camp);
  Object.defineProperty(c, 'levels', { value: [lv] });
  return new R.Game(c, hooks);
}

const tag = s => `(${s.cell.x},${s.cell.y} z${(+s.baseFl).toFixed(2)})`;

/** Solve and report one level; returns true when it fails. */
function verifyLevel(lv, { quiet = false } = {}) {
  let failed = false;
  const g = makeGame(lv);
  const world = g.world;
  const nSpans = world.cells.reduce((n, c) => n + c.spans.length, 0);
  console.log(`  ${world.W}x${world.H}, ${world.layers.length} layers, ${nSpans} spans, ${g.ents.length} entities`);
  const res = solve(g);
  if (!quiet) for (const line of res.log) console.log('  ' + line);
  if (!res.exit) { failed = true; console.error(`  EXIT NOT REACHABLE. Reached ${res.reach.size} spans; items: ${[...res.inv].join(', ') || 'none'}; open: ${[...res.open].join(', ') || 'none'}`); }
  else console.log(`  exit reachable (${res.reach.size} spans reached; the route takes about ${res.routeTime.toFixed(0)} s of optimal play, not counting waits for hazards)`);
  for (const s of res.reach.keys()) if (s.forbid) { failed = true; console.error(`  ERROR: reached ${tag(s)}, marked forbid: true (a shortcut the author ruled out)`); }
  const missing = g.ents.filter(e => e.type === 'item' && !res.items.has(e.id));
  for (const e of missing) {
    const kind = g.itemDef(e.spec.item).kind;
    const msg = `  ${kind === 'key' || kind === 'relic' ? 'ERROR' : 'warn'}: unreachable ${e.spec.item} at (${Math.floor(e.x)},${Math.floor(e.y)}) z${e.z0}`;
    if (kind === 'key' || kind === 'relic') { failed = true; console.error(msg); } else console.warn(msg);
  }
  if (res.exit) {
    const cps = g.ents.filter(e => e.type === 'checkpoint');
    for (const s of g.spansWith.loose) {
      // a loose floor that fell early (or before a checkpoint was lit) must not strand you
      const g2 = makeGame(lv);
      const s2 = g2.world.cellAt(s.cell.x, s.cell.y).spans.find(q => Math.abs(q.baseFl - s.baseFl) < 1e-6);
      g2.dropFloor(s2, true);
      const r2 = solve(g2);
      if (!r2.exit) console.warn(`  warn: if the loose floor at ${tag(s)} falls before you cross it, the exit becomes unreachable from the start`);
      for (const cp of cps) {
        const c = g2.world.cellAt(Math.floor(cp.x), Math.floor(cp.y));
        const cs = c && (R.spanAt(c, cp.z0 + 0.02) || R.spanBelow(c, cp.z0 + 0.02));
        if (!cs || !res.reach.has(g.world.cellAt(c.x, c.y).spans.find(q => Math.abs(q.baseFl - cs.baseFl) < 1e-6))) continue;
        const r3 = solve(g2, cs);
        if (!r3.exit) console.warn(`  warn: with the loose floor at ${tag(s)} fallen, the exit is unreachable from the brazier at (${c.x},${c.y})`);
      }
    }
  }
  for (const w of lint(g)) console.warn('  lint: ' + w);
  const gems = g.ents.filter(e => e.type === 'item' && g.itemDef(e.spec.item).kind === 'gem').length;
  console.log(`  gems ${gems - missing.filter(e => g.itemDef(e.spec.item).kind === 'gem').length}/${gems} reachable, checkpoints ${g.ents.filter(e => e.type === 'checkpoint').length}`);
  return failed;
}

/** Heights that sit right on a contract threshold read ambiguously in play. */
function lint(g) {
  const out = [], world = g.world, cfg = g.cfg, seen = new Set();
  const near = (v, t, e = 0.12) => Math.abs(v - t) < e;
  for (const c of world.cells) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const n = world.cellAt(c.x + dx, c.y + dy);
    if (!n) continue;
    for (const a of c.spans) for (const b of n.spans) {
      if (a.hazard === 'abyss' || b.hazard === 'abyss' || a.door || b.door) continue;
      const lo = a.baseFl <= b.baseFl ? a : b, hi = lo === a ? b : a;
      const dh = hi.baseFl - lo.baseFl;
      if (dh < 0.3) continue;
      if (lo.baseCl < hi.baseFl + cfg.height) continue; // not an open face between them
      const key = `${Math.min(c.x, n.x)},${Math.min(c.y, n.y)},${dh.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const at = `(${c.x},${c.y})|(${n.x},${n.y})`;
      if (dh > cfg.climbMax - 0.2 && dh < cfg.climbMax + 0.2) out.push(`face ${dh.toFixed(2)} at ${at} is within 0.2 of the climb limit ${cfg.climbMax}: author climbable faces <= 1.55 and walls >= 1.95`);
      if (near(dh, cfg.fallSafe, 0.2)) out.push(`drop ${dh.toFixed(2)} at ${at} is within 0.2 of the safe-fall limit ${cfg.fallSafe}`);
      if (near(dh, cfg.fallHurt, 0.2)) out.push(`drop ${dh.toFixed(2)} at ${at} is within 0.2 of the lethal-fall limit ${cfg.fallHurt}`);
      if (near(dh, cfg.fallSafe + cfg.hangDepth, 0.15)) out.push(`drop ${dh.toFixed(2)} at ${at} is within 0.15 of the safe hang-drop limit ${cfg.fallSafe + cfg.hangDepth}`);
    }
  }
  return out;
}

/**
 * Monotone reachability search (Dijkstra on seconds).
 * Returns {exit, exitTime, exitSpan, start, reach, inv, open, items, log, pred, rounds}.
 *
 * rounds[r] = { round, state: {inv, open, lifted}, reach, pred, edges, goals }:
 *   state   what the search assumed (keys held, gate tags open, lifted floors as
 *           [{x, y, i, fl}] with i the span's index in its cell)
 *   pred    Map span -> edge that reached it on a shortest path
 *   edges   (with opts.edges) every edge relaxed in that round
 *   goals   [{span, what}] reached spans that opened something for the next round
 * An edge is { kind, from, to, dir: [dx, dy] | null, z, hu, dz, k, run, cost, round }:
 *   kind  walk | step | drop | hangdrop | climb | jump | catch | ride-loose | timed
 *         (timed: tag, hold, and path = the moves from the plate/lever through the gate)
 *   z     feet height at take-off; hu the landing floor; dz = hu - z
 *   k     gap cells jumped (jump / catch); run: a running jump (needs the run-up cell)
 *   careful  the step is taken at careful speed (spikes)
 */
function solve(g, from = null, opts = {}) {
  const world = g.world, cfg = g.cfg;
  const inv = new Set(), open = new Set(), items = new Set(), used = new Set(), log = [];
  const lifted = new Map(); // span -> fl after a lift
  const fl = s => (lifted.has(s) ? lifted.get(s) : s.baseFl);
  const moving = s => !!(s.anim && (s.anim.type === 'bob' || s.anim.type === 'lift'));
  const heights = s => { if (!moving(s)) return [fl(s)]; const a = s.anim.amp ?? (s.anim.type === 'lift' ? 1.5 : 1); return [s.baseFl, s.baseFl + a / 2, s.baseFl + a]; };
  const knocked = new Map(); // span -> its ceiling after the loose flag above it was knocked down
  const gone = new Set();    // loose flags knocked down
  const top = s => (knocked.has(s) ? knocked.get(s) : s.door ? s.doorTop : s.baseCl);
  const hazardDef = s => (s.hazard && g.hazardDefs[s.hazard]) || null;
  const deadly = s => s.hazard === 'lava' || s.hazard === 'abyss' || fl(s) < -40 || !!(hazardDef(s) && hazardDef(s).deadly);
  const hurts = s => !!hazardDef(s) && !(s.anim && s.anim.type === 'cycle');   // fire, acid ... (a timed vent is left to the author)
  const tempOpen = new Set();   // a timed gate held up while searching the crossing it allows
  const doorOk = s => {
    if (!s.door) return true;
    const d = s.door;
    if (d.remote) return open.has(d.group || s.tag) || tempOpen.has(d.group || s.tag);
    if (d.key) return inv.has(d.key);
    return true;
  };
  // a plate that only closes a gate is never stepped on while that gate is open
  const closerOf = new Map();
  for (const s of g.spansWith.plate) if (s.plate.closes && !s.plate.opens) closerOf.set(s, s.plate.closes);
  const standable = s => s && !gone.has(s) && !deadly(s) && !hurts(s) && doorOk(s) && !(closerOf.has(s) && open.has(closerOf.get(s)));
  const rideable = s => s.loose && s.loose.state === 'idle';
  const cellAt = (x, y) => world.cellAt(x, y);
  // spans with spikes: careful steps only (engine/entities.js 'spikes')
  const spiky = new Set();
  for (const e of g.ents) {
    if (e.type !== 'spikes' || e.gone) continue;
    const c = cellAt(Math.floor(e.x0), Math.floor(e.y0));
    const s = c && (R.spanAt(c, e.z0 + 0.02) || R.spanBelow(c, e.z0 + 0.02));
    if (s) spiky.add(s);
  }
  const spikeAt = new Map();   // "x,y" -> [{z0, radius}]
  for (const e of g.ents) if (e.type === 'spikes' && !e.gone) {
    const k = `${Math.floor(e.x0)},${Math.floor(e.y0)}`;
    if (!spikeAt.has(k)) spikeAt.set(k, []);
    spikeAt.get(k).push({ z0: e.z0, radius: e.radius });
  }
  /** the span a body with feet at z occupies entering cell c (engine rule), or null */
  const occupy = (c, z, up = cfg.stepUp) => {
    if (!c) return null;
    for (const s of c.spans) {
      const f = fl(s);
      if (f > z + up + 1e-6) continue;
      if (top(s) - Math.max(f, z) < cfg.height - 1e-6) continue;
      if (s.door && !doorOk(s)) continue;
      return s;
    }
    return null;
  };
  /**
   * Walk off the edge ahead at walking speed and let go: where do you come to
   * rest? The engine's physics in 1-D along the axis (a = offset from the source
   * centre): the foot circle leaves the lip, speed is kept in the air, a wall
   * stops the body, you land on the highest floor under the foot circle (a hard
   * landing keeps 30% of the speed), then brake, and fall again if the floor
   * runs out. Returns the span under your centre at rest, or null when a fall is
   * not safe, you cross a floor that hurts, or you end in reach of spikes.
   */
  const walkOff = (c, z, dx, dy) => {
    const r = cfg.radius, fr = cfg.footRadius, G = cfg.gravity, dt = 1 / 120;
    const cellI = i => cellAt(c.x + dx * i, c.y + dy * i);
    const idx = a => Math.floor(a + 0.5);
    const under = (i, zz) => { const cc = cellI(i); if (cc) for (const s of cc.spans) if (fl(s) <= zz + cfg.stepUp + 1e-6 && top(s) > zz + 0.01) return s; return null; };
    const centre = (a, zz) => { const cc = cellI(idx(a)); return cc && (R.spanAt(cc, zz + 0.02) || R.spanBelow(cc, zz + 0.02)); };
    let a = 0, zz = z, vz = 0, v = 0, ground = true, from = z, held = true;   // from a stand at the centre, Forward held until airborne
    for (let t = 0; t < 5; t += dt) {
      if (ground) v = held ? v + (cfg.walkSpeed - v) * (1 - Math.exp(-cfg.accel * dt)) : v * Math.exp(-cfg.brake * dt);
      const na = a + v * dt;
      if (idx(na + r) > idx(a + r) && !occupy(cellI(idx(na + r)), zz, ground ? cfg.stepUp : cfg.airStepUp)) v = 0; else a = na;
      let sup = null;
      for (let i = idx(a - fr); i <= idx(a + fr); i++) { const s = under(i, zz); if (s && (!sup || fl(s) > fl(sup))) sup = s; }
      const fz = sup ? fl(sup) : -1e9;
      if (ground) {
        if (fz < zz - cfg.stepUp) { ground = false; held = false; from = zz; vz = 0; }
        else zz = Math.max(fz, Math.min(zz, fz + 1e-9));
      }
      if (!ground) {
        zz += vz * dt - 0.5 * G * dt * dt; vz -= G * dt;
        if (zz <= fz) {
          if (from - fz > cfg.fallSafe + 1e-6) return null;
          if (from - fz > 0.6) v *= 0.3;
          zz = fz; ground = true;
        }
      }
      if (ground) {
        const s = centre(a, zz);
        if (!s || deadly(s) || hurts(s)) return null;
        if (v < 0.05) {
          for (let i = idx(a) - 1; i <= idx(a) + 1; i++) {
            const cc = cellI(i), sp = cc && spikeAt.get(`${cc.x},${cc.y}`);
            if (sp && sp.some(q => Math.abs(q.z0 - zz) < 0.7 && Math.abs(a - i) < q.radius + r + 0.02)) return null;
          }
          return { span: s, a };
        }
      }
    }
    return null;
  };
  /** open air in cell c from z up to z + h (a span covering it), or null */
  const airFrom = (c, z, h) => {
    if (!c) return null;
    const s = R.spanAt(c, z + 0.02);
    if (!s || (s.door && !doorOk(s))) return null;
    return top(s) >= z + h - 1e-6 ? s : null;
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const RUN = cfg.runSpeed;
  // solid entities block the crossings they stand in: a body (radius r) must pass through the shared face
  // somewhere clear of every solid within (its radius + r); "x,y,dx,dy" -> [{zlo, zhi, a, b}] blocked stretches
  const crossings = new Map();
  for (const e of g.ents) {
    if (!e.solid || e.gone) continue;
    const zlo = e.z0 + (e.zOff || 0), zhi = zlo + e.height, rr = e.radius + cfg.radius;
    for (let cy = Math.floor(e.y) - 1; cy <= Math.floor(e.y) + 1; cy++) for (let cx = Math.floor(e.x) - 1; cx <= Math.floor(e.x) + 1; cx++) {
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        // the face between (cx,cy) and (cx+dx, cy+dy): x = cx+1 (dx) or y = cy+1 (dy)
        const off = dx ? e.x - (cx + 1) : e.y - (cy + 1), along = dx ? e.y : e.x, lo = dx ? cy : cx;
        if (Math.abs(off) >= rr) continue;
        const w = Math.sqrt(rr * rr - off * off);
        if (along + w <= lo || along - w >= lo + 1) continue;
        for (const k of [`${cx},${cy},${dx},${dy}`, `${cx + dx},${cy + dy},${-dx},${-dy}`]) { if (!crossings.has(k)) crossings.set(k, []); crossings.get(k).push({ zlo, zhi, a: along - w - lo, b: along + w - lo }); }
      }
    }
  }
  const crossOk = (c, dx, dy, z) => {
    const l = crossings.get(`${c.x},${c.y},${dx},${dy}`);
    if (!l) return true;
    const bl = l.filter(q => z < q.zhi && z + cfg.height > q.zlo).sort((p, q) => p.a - q.a);
    // is there a spot in [r, 1 - r] along the face outside every blocked stretch?
    let x = cfg.radius;
    for (const q of bl) { if (q.a > x + 1e-6) return true; x = Math.max(x, q.b); }
    return x < 1 - cfg.radius - 1e-6;
  };
  // timed openers: plates and levers with a hold
  const leverTimed = [];
  for (const c of world.cells) for (let k = 0; k < c.band.length; k++) { const b = c.band[k]; if (b.lever && b.lever.opens && b.lever.hold) leverTimed.push({ c, k, L: b.lever }); }
  const timedCache = new Map(), timedLogged = new Set();
  /** 'timed' moves from span s: press the plate / pull the lever there, cross the gate within its hold. */
  function timedEdges(s) {
    const srcs = [];
    if (s.plate && s.plate.opens && s.plate.hold && !open.has(s.plate.opens)) srcs.push({ tag: s.plate.opens, hold: s.plate.hold, extra: 0, what: `plate (${s.cell.x},${s.cell.y})` });
    for (const lt of leverTimed) {
      if (open.has(lt.L.opens) || Math.abs(lt.c.x - s.cell.x) + Math.abs(lt.c.y - s.cell.y) !== 1) continue;
      const eye = fl(s) + cfg.eyeHeight;
      if (world.band(eye) === lt.k && !R.spanAt(lt.c, eye)) srcs.push({ tag: lt.L.opens, hold: lt.L.hold, extra: 0.5, what: `lever (${lt.c.x},${lt.c.y})` });
    }
    const out = [];
    for (const src of srcs) {
      const key = `${s.cell.x},${s.cell.y},${s.cell.spans.indexOf(s)}|${src.tag}`;
      if (timedCache.has(key)) { out.push(...timedCache.get(key)); continue; }
      tempOpen.add(src.tag);
      const r = search(s, null, true);
      tempOpen.delete(src.tag);
      const gates = world.tags.get(src.tag) || [], list = [];
      let best = Infinity;
      for (const gs of gates) {
        if (!r.dist.has(gs)) continue;
        for (const [dx, dy] of DIRS) {
          const nc = cellAt(gs.cell.x + dx, gs.cell.y + dy);
          if (!nc) continue;
          for (const ns of nc.spans) {
            if (!r.dist.has(ns) || gates.includes(ns) || r.dist.get(ns) <= r.dist.get(gs)) continue;
            const t = r.dist.get(ns) + src.extra;
            best = Math.min(best, t);
            if (1.25 * t + 1.5 > src.hold + 0.3) continue;
            const path = []; for (let q = ns; r.pred.has(q); q = r.pred.get(q).from) path.push(r.pred.get(q));
            path.reverse();
            if (!list.some(e => e.to === ns)) list.push({ kind: 'timed', from: s, to: ns, dir: null, z: fl(s), hu: fl(ns), dz: fl(ns) - fl(s), k: 0, run: false, cost: t, tag: src.tag, hold: src.hold, path });
          }
        }
      }
      if (!timedLogged.has(key)) {
        timedLogged.add(key);
        log.push(`${src.what} → gate "${src.tag}" (hold ${src.hold} s): ${best === Infinity ? 'the gate cannot be reached from here' : `crossing takes ${best.toFixed(1)} s, needs ${(1.25 * best + 1.5).toFixed(1)} s ${1.25 * best + 1.5 <= src.hold + 0.3 ? 'OK' : 'TOO SLOW'}`}`);
      }
      timedCache.set(key, list);
      out.push(...list);
    }
    return out;
  }
  const state = () => ({
    inv: [...inv], open: [...open],
    lifted: [...lifted].map(([s, v]) => ({ x: s.cell.x, y: s.cell.y, i: s.cell.spans.indexOf(s), fl: v })),
  });

  /** One Dijkstra from `start`; rec = {round, edges} records the edges (null: a scratch search). */
  function search(start, rec, noTimed = false) {
    const dist = new Map(); // span -> seconds
    const pred = new Map(); // span -> edge
    const heap = [[0, start]]; dist.set(start, 0);
    const relax = (e, d0) => {
      const t = e.to;
      if (!t || !standable(t)) return;
      // spikes: only careful steps in and out (a timed crossing's own moves already obey this)
      const careful = e.kind !== 'timed' && (spiky.has(t) || spiky.has(e.from));
      if (careful && e.kind !== 'walk' && e.kind !== 'step') return;
      if (careful) { e.careful = true; e.cost = 1 / cfg.carefulSpeed; }
      // boarding or leaving a lift or a bobbing floor: wait half its period on average
      if (moving(t) !== moving(e.from)) e.cost += ((moving(t) ? t : e.from).anim.period || 4.8) / 2;
      if (rec) { e.round = rec.round; if (rec.edges) rec.edges.push(e); }
      const nd = d0 + e.cost;
      if (nd < (dist.has(t) ? dist.get(t) : Infinity)) { dist.set(t, nd); pred.set(t, e); heap.push([nd, t]); }
    };
    const edge = (kind, s, t, dir, z, hu, cost, extra) => Object.assign({ kind, from: s, to: t, dir, z, hu, dz: hu - z, k: 0, run: false, cost }, extra);
    while (heap.length) {
      let bi = 0; for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i;
      const [d0, s] = heap[bi]; heap[bi] = heap[heap.length - 1]; heap.pop();
      if (d0 > dist.get(s) + 1e-9) continue;
      const c = s.cell;
      for (const z of heights(s)) {
        const myTop = top(s);
        for (const [dx, dy] of DIRS) {
          const dir = [dx, dy];
          const n = cellAt(c.x + dx, c.y + dy);
          if (!n) continue;
          // walk, step, walk off a drop (you land where the flight takes you), or lower
          // yourself over the edge and drop straight down into the next cell
          if (!crossOk(c, dx, dy, z)) continue;   // a post or a barrel stands in the way
          const t = occupy(n, z);
          if (t && standable(t)) {
            const hs = heights(t).filter(h => h <= z + cfg.stepUp + 1e-6);
            const hu = Math.max(...hs, -1e9), drop = z - hu;
            if (drop <= cfg.stepUp + 1e-6) relax(edge(Math.abs(drop) < 0.01 ? 'walk' : 'step', s, t, dir, z, hu, 1 / RUN), d0);
            else {
              if (drop <= cfg.fallSafe + 1e-6) {
                const L = walkOff(c, z, dx, dy);
                if (L && z - fl(L.span) <= cfg.fallSafe + 1e-6) relax(edge('drop', s, L.span, dir, z, fl(L.span), 1 / RUN + 0.5), d0);
              }
              if (drop <= cfg.fallSafe + cfg.hangDepth + 1e-6 && !rideable(s)) relax(edge('hangdrop', s, t, dir, z, hu, 2.5), d0); // careful to the edge, hang, let go
            }
          }
          // climb onto a ledge in the next cell (needs room above you to pull up)
          for (const u of n.spans) {
            if (!doorOk(u)) continue;
            for (const hu of heights(u)) {
              const dh = hu - z;
              if (dh > cfg.climbMin - 1e-6 && dh <= cfg.climbMax + 1e-6 && myTop >= hu + cfg.height - 0.02 && top(u) - hu >= cfg.height + 0.05 && !(t === u && dh <= cfg.stepUp)) relax(edge('climb', s, u, dir, z, hu, cfg.climbTime + 0.3), d0);
            }
          }
          // jumps over gaps along the axis
          if (myTop < z + HEADROOM) continue;
          const back = cellAt(c.x - dx, c.y - dy), bs = back && occupy(back, z);
          const runUp = !!(bs && standable(bs) && !spiky.has(bs) && Math.abs(fl(bs) - z) <= 0.05 && top(bs) >= z + HEADROOM);
          for (let k = 1; k <= 3; k++) {
            let clear = true;
            for (let i = 1; i <= k && clear; i++) {
              const gc = cellAt(c.x + dx * i, c.y + dy * i);
              if (!airFrom(gc, z, HEADROOM) || !crossOk(gc, dx, dy, z)) clear = false;
              else { const gs = occupy(gc, z); if (gs && standable(gs) && Math.max(...heights(gs)) >= z - cfg.stepUp) clear = false; } // not a gap: walk
            }
            if (!clear) break;
            const L = cellAt(c.x + dx * (k + 1), c.y + dy * (k + 1));
            if (!L) break;
            const last = cellAt(c.x + dx * k, c.y + dy * k);
            for (const u of L.spans) {
              if (!standable(u)) continue;
              for (const hu of heights(u)) {
                const dz = hu - z;
                let ok = false, catchIt = false;
                if (dz >= -cfg.stepUp && dz <= cfg.airStepUp) { ok = k === 1 || (runUp && k <= 3); catchIt = k === 3; }
                else if (dz > cfg.airStepUp && dz <= 1.0) { ok = k === 1 || (runUp && k === 2); catchIt = dz > cfg.airStepUp; }
                else if (dz < -cfg.stepUp && dz >= -cfg.fallSafe) ok = k === 1 || (runUp && k <= 3);
                if (!ok) continue;
                if (top(u) < Math.max(hu, z) + cfg.height) continue;
                if (dz < 0 && top(u) < z + HEADROOM) continue; // landing lower: the arc passes through at take-off height
                if (catchIt && !airFrom(last, Math.min(z, hu) - 1, hu - Math.min(z, hu) + 1 + cfg.height)) continue; // room to pull up
                relax(edge(catchIt ? 'catch' : 'jump', s, u, dir, z, hu, (k + 1) / RUN + (catchIt ? cfg.climbTime : 0.3) + (k >= 2 ? 0.5 : 0), { k, run: k >= 2 }), d0);
              }
            }
          }
        }
        // a timed plate or lever here: cross its gate within the hold
        if (!noTimed && z === heights(s)[0]) for (const e of timedEdges(s)) relax(e, d0);
        // loose floor: stop on it and ride it down
        if (rideable(s)) {
          const i = c.spans.indexOf(s);
          const below = i > 0 ? c.spans[i - 1] : null;
          if (below && z - fl(below) <= cfg.fallSafe + 1e-6) relax(edge('ride-loose', s, below, null, z, fl(below), 1.2), d0);
        }
      }
    }
    return { dist, pred };
  }

  const startCell = cellAt(Math.floor(world.start.x), Math.floor(world.start.y));
  const start = from || R.spanAt(startCell, world.start.z + 0.01);
  const rounds = [];
  let reach, pred, round = 0;
  for (;;) {
    const rec = { round, edges: opts.edges ? [] : null };
    timedCache.clear();
    const st = state();
    ({ dist: reach, pred } = search(start, rec));
    const goals = [];
    rounds.push({ round, state: st, reach, pred, edges: rec.edges, goals, knocked: [...knocked], gone: [...gone] });
    let progress = false;
    const got = [];
    // items
    for (const e of g.ents) {
      if (e.type !== 'item' || items.has(e.id)) continue;
      const c = cellAt(Math.floor(e.x), Math.floor(e.y));
      const s = c && (R.spanAt(c, e.z0 + 0.02) || R.spanBelow(c, e.z0 + 0.02));
      if (s && reach.has(s)) {
        items.add(e.id);
        const it = g.itemDef(e.spec.item);
        if (it.kind === 'key' || it.kind === 'relic') { if (!inv.has(e.spec.item)) { inv.add(e.spec.item); got.push(e.spec.item); goals.push({ span: s, what: e.spec.item }); progress = true; } }
      }
    }
    // plates
    for (const s of g.spansWith.plate) {
      if (!reach.has(s) || used.has(s)) continue;
      const P = s.plate;
      // a timed opening is a move (timedEdges), not a permanent state
      if (P.opens && !P.hold && !open.has(P.opens)) { open.add(P.opens); got.push(`[plate opens ${P.opens}]`); goals.push({ span: s, what: `plate → ${P.opens}` }); progress = true; }
      if (P.opens && P.closes && open.has(P.closes)) { open.delete(P.closes); got.push(`[plate closes ${P.closes}]`); }
      if (P.lift) { for (const t of (world.tags.get(P.lift.tag) || [])) if ((P.lift.prop || 'fl') === 'fl') lifted.set(t, P.lift.to); got.push(`[lift ${P.lift.tag}]`); goals.push({ span: s, what: `plate lifts ${P.lift.tag}` }); progress = true; }
      if (!(P.opens && P.hold)) used.add(s);
      else if (!P.lift) used.add(s);
    }
    // loose floors dropped onto plates hold them down for good
    for (const s of g.spansWith.plate) {
      const P = s.plate;
      if (!P.opens || open.has(P.opens) || P.hold === undefined) continue;
      const c = s.cell, i = c.spans.indexOf(s), above = c.spans[i + 1];
      if (above && rideable(above) && reach.has(above)) { open.add(P.opens); got.push(`[rubble jams plate → ${P.opens} open]`); goals.push({ span: above, what: `rubble → ${P.opens}` }); progress = true; }
    }
    // loose ceiling flags within reach of a straight-up jump: knock them down, climb through
    for (const s of reach.keys()) {
      if (knocked.has(s)) continue;
      const c = s.cell, i = c.spans.indexOf(s), u = c.spans[i + 1];
      // only a flag you cannot already reach from above (knocking it never takes away a floor you use)
      if (!u || !rideable(u) || gone.has(u) || reach.has(u) || moving(s)) continue;
      if (top(s) > fl(s) + cfg.upReach + 1e-6) continue;
      knocked.set(s, u.baseCl); gone.add(u);
      got.push(`[knock down the flag above (${c.x},${c.y})]`); goals.push({ span: s, what: `knock (${c.x},${c.y})` }); progress = true;
    }
    // levers (on rock faces next to reached spans)
    for (const c of world.cells) for (let k = 0; k < c.band.length; k++) {
      const b = c.band[k];
      if (!b.lever || used.has(b)) continue;
      let at = null;
      for (const [dx, dy] of DIRS) {
        const n = cellAt(c.x + dx, c.y + dy);
        if (!n) continue;
        for (const s of n.spans) {
          if (!reach.has(s)) continue;
          const eye = fl(s) + cfg.eyeHeight;
          if (world.band(eye) === k && !R.spanAt(c, eye) && (!at || reach.get(s) < reach.get(at))) at = s;
        }
      }
      if (!at) continue;
      const L = b.lever;
      if (!(L.opens && !L.hold) && !L.lift) continue;   // a timed lever is a move (timedEdges); a lever that only closes is never needed
      used.add(b);
      if (L.opens && !L.hold) { open.add(L.opens); got.push(`[lever opens ${L.opens}]`); }
      if (L.closes && open.has(L.closes)) { open.delete(L.closes); got.push(`[lever closes ${L.closes}]`); }
      if (L.lift) { for (const t of (world.tags.get(L.lift.tag) || [])) if ((L.lift.prop || 'fl') === 'fl') lifted.set(t, L.lift.to); got.push(`[lever lifts ${L.lift.tag}]`); }
      goals.push({ span: at, what: `lever (${c.x},${c.y})` });
      progress = true;
    }
    round++;
    log.push(`round ${round}: ${reach.size} spans${got.length ? '  + ' + got.join(', ') : ''}`);
    if (!progress) break;
  }
  const exits = [...reach.keys()].filter(s => s.exit);
  const exitSpan = exits.length ? exits.reduce((a, b) => (reach.get(b) < reach.get(a) ? b : a)) : null;
  // the whole route: start -> each goal in the order it was found -> exit, each leg in its round's world
  let routeTime = 0;
  if (exitSpan) {
    let cur = start;
    const legTime = (rnd, to) => {
      // replay that round's state, search from where we are, restore
      const save = { inv: [...inv], open: [...open], lifted: new Map(lifted), knocked: new Map(knocked), gone: new Set(gone) };
      inv.clear(); rnd.state.inv.forEach(x => inv.add(x)); open.clear(); rnd.state.open.forEach(x => open.add(x));
      lifted.clear(); for (const q of rnd.state.lifted) { const sp = cellAt(q.x, q.y).spans[q.i]; if (sp) lifted.set(sp, q.fl); }
      knocked.clear(); gone.clear(); for (const [a, b] of rnd.knocked || []) knocked.set(a, b); for (const a of rnd.gone || []) gone.add(a);
      timedCache.clear();
      const d = search(cur, null).dist.get(to);
      timedCache.clear();
      inv.clear(); save.inv.forEach(x => inv.add(x)); open.clear(); save.open.forEach(x => open.add(x));
      lifted.clear(); for (const [a, b] of save.lifted) lifted.set(a, b);
      knocked.clear(); for (const [a, b] of save.knocked) knocked.set(a, b); gone.clear(); for (const a of save.gone) gone.add(a);
      return d;
    };
    for (const rnd of rounds) {
      const gs = rnd.goals.slice().sort((a, b) => rnd.reach.get(a.span) - rnd.reach.get(b.span));
      for (const gl of gs) { const d = legTime(rnd, gl.span); routeTime += d === undefined ? rnd.reach.get(gl.span) : d; cur = gl.span; }
    }
    const d = legTime(rounds[rounds.length - 1], exitSpan);
    routeTime += d === undefined ? reach.get(exitSpan) : d;
  }
  return { exit: exits.length > 0, exitTime: exitSpan ? reach.get(exitSpan) : 0, routeTime, exitSpan, start, reach, inv, open, items, log, pred, rounds };
}

/** The edges of the shortest path from the round's start to `span` (in order). */
function pathTo(rnd, span) {
  const out = [];
  for (let t = span; rnd.pred.has(t); t = rnd.pred.get(t).from) out.push(rnd.pred.get(t));
  return out.reverse();
}
/** The optimal play-through as legs: start -> each goal of each round, then start -> exit. */
function route(res) {
  const legs = [];
  for (const rnd of res.rounds) for (const gl of rnd.goals) legs.push({ label: gl.what, round: rnd.round, edges: pathTo(rnd, gl.span) });
  if (res.exit) { const last = res.rounds[res.rounds.length - 1]; legs.push({ label: 'exit', round: last.round, edges: pathTo(last, res.exitSpan) }); }
  return legs;
}

module.exports = { solve, route, pathTo, makeGame, verifyLevel, lint, camp, R, HEADROOM, tag };

if (require.main === module) {
  const want = process.argv.slice(2).find(a => !a.startsWith('--'));
  const quiet = process.argv.includes('--quiet');
  let failed = false;
  for (const lv of camp.levels) {
    if (want && lv.id !== want) continue;
    console.log(`\n=== level ${lv.order}: ${lv.id} — ${lv.name} ===`);
    try { if (verifyLevel(lv, { quiet })) failed = true; } catch (e) { failed = true; console.error('  ERROR:', e.stack || e.message); }
  }
  process.exit(failed ? 1 : 0);
}
