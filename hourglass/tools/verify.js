#!/usr/bin/env node
/*
 * Level solver:  node tools/verify.js [levelId] [--quiet]
 *
 * Compiles every level and proves it can be finished WITHOUT TAKING DAMAGE
 * using only the moves the contract promises (engine/game.js header; proven
 * two-sided by tools/physics.js). Storeys are 1.5 apart.
 *
 *   walk / step up <= 0.35 · walk off a drop <= 2.3 · careful hang-drop <= 3.2
 *   climb a ledge 0.35..1.75 up (headroom above you) · loose floors (stop on one
 *   to ride it down) · keys · pressure plates (a timed gate must be reachable
 *   in time) · levers · lifts · exit
 *   jumps along a corridor over k gap cells, by height change dz of the landing:
 *     -0.35 <= dz <= +0.1     standing k<=1 · running k<=3 (3 = catch the lip)
 *     +0.1 < dz <= +1.0       standing k<=1 · running k<=2 (catch)
 *     -2.3 <= dz < -0.35      standing k<=1 · running k<=3
 *   running jumps need 2 straight cells of run-up at the take-off height; every
 *   jump needs headroom (ceiling >= take-off + 1.15) over the take-off, the gap
 *   and the landing; a catch needs room to pull up from the last gap cell.
 *
 * Items whose position is reached are collected; the search repeats until
 * nothing new opens. Reports unreachable items, then robustness warnings: a
 * loose floor falling early, the exit from every checkpoint with that floor
 * gone, and heights that sit on a contract threshold (ambiguous in play).
 */
'use strict';
const R = require('./load.js').load();
const camp = R.campaigns.get('hourglass');
const want = process.argv.slice(2).find(a => !a.startsWith('--'));
const quiet = process.argv.includes('--quiet');
let failed = false;

const HEADROOM = 1.15;         // apex 0.50 + body 0.62, plus a little

for (const lv of camp.levels) {
  if (want && lv.id !== want) continue;
  console.log(`\n=== level ${lv.order}: ${lv.id} — ${lv.name} ===`);
  try { verifyLevel(lv); } catch (e) { failed = true; console.error('  ERROR:', e.stack || e.message); }
}
process.exit(failed ? 1 : 0);

function makeGame(lv) {
  const c = Object.assign({}, camp);
  Object.defineProperty(c, 'levels', { value: [lv] });
  return new R.Game(c, {});
}

function verifyLevel(lv) {
  const g = makeGame(lv);
  const world = g.world;
  const nSpans = world.cells.reduce((n, c) => n + c.spans.length, 0);
  console.log(`  ${world.W}x${world.H}, ${world.layers.length} layers, ${nSpans} spans, ${g.ents.length} entities`);
  const res = solve(g);
  const tag = s => `(${s.cell.x},${s.cell.y} z${(+s.baseFl).toFixed(2)})`;
  if (!quiet) for (const line of res.log) console.log('  ' + line);
  if (!res.exit) { failed = true; console.error(`  EXIT NOT REACHABLE. Reached ${res.reach.size} spans; items: ${[...res.inv].join(', ') || 'none'}; open: ${[...res.open].join(', ') || 'none'}`); }
  else console.log(`  exit reachable (${res.reach.size} spans reached, about ${res.exitTime.toFixed(0)} s of optimal play in the final round)`);
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

/** Monotone reachability search (Dijkstra on seconds). Returns {exit, reach, inv, open, items, log, exitTime}. */
function solve(g, from = null) {
  const world = g.world, cfg = g.cfg;
  const inv = new Set(), open = new Set(), items = new Set(), used = new Set(), log = [];
  const lifted = new Map(); // span -> fl after a lift
  const fl = s => (lifted.has(s) ? lifted.get(s) : s.baseFl);
  const heights = s => (s.anim && s.anim.type === 'bob') ? [s.baseFl, s.baseFl + (s.anim.amp ?? 1) / 2, s.baseFl + (s.anim.amp ?? 1)] : [fl(s)];
  const top = s => (s.door ? s.doorTop : s.baseCl);
  const deadly = s => s.hazard === 'lava' || s.hazard === 'abyss' || fl(s) < -40;
  const doorOk = s => {
    if (!s.door) return true;
    const d = s.door;
    if (d.remote) return open.has(d.group || s.tag);
    if (d.key) return inv.has(d.key);
    return true;
  };
  const standable = s => s && !deadly(s) && doorOk(s);
  const cellAt = (x, y) => world.cellAt(x, y);
  /** the span a body with feet at z occupies entering cell c (engine rule), or null */
  const occupy = (c, z) => {
    if (!c) return null;
    for (const s of c.spans) {
      const f = fl(s);
      if (f > z + cfg.stepUp + 1e-6) continue;
      if (top(s) - Math.max(f, z) < cfg.height - 1e-6) continue;
      if (s.door && !doorOk(s)) continue;
      return s;
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

  function search(start) {
    const dist = new Map(); // span -> seconds
    const heap = [[0, start]]; dist.set(start, 0);
    const relax = (t, cost, d0) => {
      if (!t || !standable(t)) return;
      const nd = d0 + cost;
      if (nd < (dist.has(t) ? dist.get(t) : Infinity)) { dist.set(t, nd); heap.push([nd, t]); }
    };
    while (heap.length) {
      let bi = 0; for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0]) bi = i;
      const [d0, s] = heap[bi]; heap[bi] = heap[heap.length - 1]; heap.pop();
      if (d0 > dist.get(s) + 1e-9) continue;
      const c = s.cell;
      for (const z of heights(s)) {
        const myTop = top(s);
        for (const [dx, dy] of DIRS) {
          const n = cellAt(c.x + dx, c.y + dy);
          if (!n) continue;
          // walk, step, drop off, or hang-drop
          const t = occupy(n, z);
          if (t && standable(t)) {
            const hs = heights(t).filter(h => h <= z + cfg.stepUp + 1e-6);
            const drop = z - Math.max(...hs, -1e9);
            if (drop <= cfg.stepUp + 1e-6) relax(t, 1 / RUN, d0);
            else if (drop <= cfg.fallSafe + 1e-6) relax(t, 1 / RUN + 0.5, d0);
            else if (drop <= cfg.fallSafe + cfg.hangDepth + 1e-6) relax(t, 2.5, d0); // careful to the edge, hang, let go
          }
          // climb onto a ledge in the next cell (needs room above you to pull up)
          for (const u of n.spans) {
            if (!doorOk(u)) continue;
            for (const hu of heights(u)) {
              const dh = hu - z;
              if (dh > cfg.climbMin - 1e-6 && dh <= cfg.climbMax + 1e-6 && myTop >= hu + cfg.height - 0.02 && top(u) - hu >= cfg.height + 0.05 && !(t === u && dh <= cfg.stepUp)) relax(u, cfg.climbTime + 0.3, d0);
            }
          }
          // jumps over gaps along the axis
          if (myTop < z + HEADROOM) continue;
          const back = cellAt(c.x - dx, c.y - dy), bs = back && occupy(back, z);
          const runUp = !!(bs && standable(bs) && Math.abs(fl(bs) - z) <= 0.05 && top(bs) >= z + HEADROOM);
          for (let k = 1; k <= 3; k++) {
            let clear = true;
            for (let i = 1; i <= k && clear; i++) {
              const gc = cellAt(c.x + dx * i, c.y + dy * i);
              if (!airFrom(gc, z, HEADROOM)) clear = false;
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
                relax(u, (k + 1) / RUN + (catchIt ? cfg.climbTime : 0.3) + (k >= 2 ? 0.5 : 0), d0);
              }
            }
          }
        }
        // loose floor: stop on it and ride it down
        if (s.loose && s.loose.state !== 'fallen') {
          const i = c.spans.indexOf(s);
          const below = i > 0 ? c.spans[i - 1] : null;
          if (below && z - fl(below) <= cfg.fallSafe + 1e-6) relax(below, 1.2, d0);
        }
      }
    }
    return dist;
  }

  const startCell = cellAt(Math.floor(world.start.x), Math.floor(world.start.y));
  const start = from || R.spanAt(startCell, world.start.z + 0.01);
  let reach, round = 0;
  for (;;) {
    reach = search(start);
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
        if (it.kind === 'key' || it.kind === 'relic') { if (!inv.has(e.spec.item)) { inv.add(e.spec.item); got.push(e.spec.item); progress = true; } }
      }
    }
    // plates
    for (const s of g.spansWith.plate) {
      if (!reach.has(s) || used.has(s)) continue;
      const P = s.plate;
      if (P.opens && !open.has(P.opens)) {
        const gates = world.tags.get(P.opens) || [];
        let inTime = true;
        if (P.hold) {
          // from the plate, through the gate, before it shuts: 1.25 x optimal + 1.5 s <= hold + 0.3
          open.add(P.opens);
          const r2 = search(s);
          let best = Infinity;
          for (const gs of gates) {
            if (!r2.has(gs)) continue;
            for (const [dx, dy] of DIRS) {
              const nc = cellAt(gs.cell.x + dx, gs.cell.y + dy);
              if (!nc) continue;
              for (const ns of nc.spans) if (r2.has(ns) && !gates.includes(ns) && r2.get(ns) > r2.get(gs)) best = Math.min(best, r2.get(ns));
            }
          }
          open.delete(P.opens);
          const need = 1.25 * best + 1.5;
          if (need > P.hold + 0.3) { inTime = false; log.push(`plate (${s.cell.x},${s.cell.y}) → gate "${P.opens}": ${best === Infinity ? 'unreachable' : `needs ${need.toFixed(1)} s (optimal ${best.toFixed(1)} s)`} but it holds ${P.hold} s`); }
          else got.push(`[gate ${P.opens}: ${best.toFixed(1)} s of ${P.hold} s]`);
        }
        if (inTime) { open.add(P.opens); got.push(`[plate opens ${P.opens}${P.hold ? ' for ' + P.hold + 's' : ''}]`); progress = true; }
      }
      if (P.lift && !used.has(s)) { for (const t of (world.tags.get(P.lift.tag) || [])) if ((P.lift.prop || 'fl') === 'fl') lifted.set(t, P.lift.to); got.push(`[lift ${P.lift.tag}]`); progress = true; }
      used.add(s);
    }
    // loose floors dropped onto plates hold them down for good
    for (const s of g.spansWith.plate) {
      const P = s.plate;
      if (!P.opens || open.has(P.opens) || P.hold === undefined) continue;
      const c = s.cell, i = c.spans.indexOf(s), above = c.spans[i + 1];
      if (above && above.loose && reach.has(above)) { open.add(P.opens); got.push(`[rubble jams plate → ${P.opens} open]`); progress = true; }
    }
    // levers (on rock faces next to reached spans)
    for (const c of world.cells) for (let k = 0; k < c.band.length; k++) {
      const b = c.band[k];
      if (!b.lever || used.has(b)) continue;
      let can = false;
      for (const [dx, dy] of DIRS) {
        const n = cellAt(c.x + dx, c.y + dy);
        if (!n) continue;
        for (const s of n.spans) {
          if (!reach.has(s)) continue;
          const eye = fl(s) + cfg.eyeHeight;
          if (world.band(eye) === k && !R.spanAt(c, eye)) can = true;
        }
      }
      if (!can) continue;
      used.add(b);
      const L = b.lever;
      if (L.opens) { open.add(L.opens); got.push(`[lever opens ${L.opens}]`); }
      if (L.lift) { for (const t of (world.tags.get(L.lift.tag) || [])) lifted.set(t, L.lift.to); got.push(`[lever lifts ${L.lift.tag}]`); }
      progress = true;
    }
    round++;
    log.push(`round ${round}: ${reach.size} spans${got.length ? '  + ' + got.join(', ') : ''}`);
    if (!progress) break;
  }
  const exits = [...reach.keys()].filter(s => s.exit);
  return { exit: exits.length > 0, exitTime: exits.length ? Math.min(...exits.map(s => reach.get(s))) : 0, reach, inv, open, items, log };
}
