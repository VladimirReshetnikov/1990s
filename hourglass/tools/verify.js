#!/usr/bin/env node
/*
 * Level solver:  node tools/verify.js [levelId] [--quiet]
 *
 * Compiles every level and proves it can be finished with the real move set
 * (the numbers come from R.GAME_DEFAULTS; tools/physics.js proves the physics
 * delivers them):
 *   walk / step up <= stepUp · drop <= fallSafe + hangDrop · climb ledges up
 *   to climbMax · standing jump over 1 cell · running jump over 2 cells
 *   (needs a cell of run-up) · running jump over 3 cells onto a ledge at the
 *   same height (grab) · fall through loose floors · keys · pressure plates
 *   (timed gates must be reachable in time) · levers · lifts · exit.
 * Items whose position is reached are collected; the search repeats until
 * nothing new opens. Reports unreachable items and loose floors that would
 * make the level unwinnable if they fell early.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"/g)) vm.runInThisContext(fs.readFileSync(path.join(root, m[1]), 'utf8'), { filename: m[1] });
const R = globalThis.RetroEngine;
const camp = R.campaigns.get('hourglass');
const want = process.argv.slice(2).find(a => !a.startsWith('--'));
const quiet = process.argv.includes('--quiet');
let failed = false;

for (const lv of camp.levels) {
  if (want && lv.id !== want) continue;
  console.log(`\n=== level ${lv.order}: ${lv.id} — ${lv.name} ===`);
  try { verifyLevel(lv); } catch (e) { failed = true; console.error('  ERROR:', e.message); }
}
process.exit(failed ? 1 : 0);

function makeGame(lv) {
  const c = Object.assign({}, camp);
  Object.defineProperty(c, 'levels', { value: [lv] });
  return new R.Game(c, {});
}

function verifyLevel(lv) {
  const g = makeGame(lv);
  const world = g.world, cfg = g.cfg;
  const nSpans = world.cells.reduce((n, c) => n + c.spans.length, 0);
  console.log(`  ${world.W}x${world.H}, ${world.layers.length} layers, ${nSpans} spans, ${g.ents.length} entities`);
  const res = solve(g, null);
  const tag = (s) => `(${s.cell.x},${s.cell.y} z${(+s.fl).toFixed(1)})`;
  if (!quiet) for (const line of res.log) console.log('  ' + line);
  if (!res.exit) { failed = true; console.error(`  EXIT NOT REACHABLE. Reached ${res.reach.size} spans; items: ${[...res.inv].join(', ') || 'none'}; open: ${[...res.open].join(', ') || 'none'}`); }
  else console.log(`  exit reachable (${res.reach.size} spans reached)`);
  const missing = g.ents.filter(e => e.type === 'item' && !res.items.has(e.id));
  for (const e of missing) {
    const kind = g.itemDef(e.spec.item).kind;
    const msg = `  ${kind === 'key' || kind === 'relic' ? 'ERROR' : 'warn'}: unreachable ${e.spec.item} at (${Math.floor(e.x)},${Math.floor(e.y)}) z${e.z0}`;
    if (kind === 'key' || kind === 'relic') { failed = true; console.error(msg); } else console.warn(msg);
  }
  // robustness: each loose floor falling early must not make the exit unreachable
  if (res.exit) {
    for (const s of g.spansWith.loose) {
      const g2 = makeGame(lv);
      const s2 = g2.world.cellAt(s.cell.x, s.cell.y).spans.find(q => Math.abs(q.baseFl - s.baseFl) < 1e-6);
      g2.dropFloor(s2);
      const r2 = solve(g2, null);
      if (!r2.exit) console.warn(`  warn: if the loose floor at ${tag(s)} falls before you cross it, the exit becomes unreachable`);
    }
  }
  const gems = g.ents.filter(e => e.type === 'item' && g.itemDef(e.spec.item).kind === 'gem').length;
  console.log(`  gems ${gems - missing.filter(e => g.itemDef(e.spec.item).kind === 'gem').length}/${gems} reachable, checkpoints ${g.ents.filter(e => e.type === 'checkpoint').length}`);
}

/** Monotone reachability search. Returns {exit, reach, inv, open, items, log}. */
function solve(g) {
  const world = g.world, cfg = g.cfg;
  const inv = new Set(), open = new Set(), items = new Set(), used = new Set(), log = [];
  const lifted = new Map(); // span -> fl after a lift
  const fl = s => (lifted.has(s) ? lifted.get(s) : s.baseFl);
  const heights = s => (s.anim && s.anim.type === 'bob') ? [s.baseFl, s.baseFl + (s.anim.amp ?? 1) / 2, s.baseFl + (s.anim.amp ?? 1)] : [fl(s)];
  const top = s => (s.door ? s.doorTop : s.anim && s.anim.type === 'crusher' ? s.baseCl : s.baseCl);
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
      return s;
    }
    return null;
  };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function bfs(start, startZ) {
    const reach = new Map(); // span -> steps
    const q = [start]; reach.set(start, 0);
    while (q.length) {
      const s = q.shift(), c = s.cell, d0 = reach.get(s);
      const push = t => { if (t && !reach.has(t) && standable(t)) { reach.set(t, d0 + 1); q.push(t); } };
      for (const z of heights(s)) {
        const myTop = top(s);
        for (const [dx, dy] of DIRS) {
          const n = cellAt(c.x + dx, c.y + dy);
          if (!n) continue;
          // walk, step or drop
          const t = occupy(n, z);
          if (t && doorOk(t)) {
            const drop = z - Math.max(...heights(t).filter(h => h <= z + cfg.stepUp + 1e-6), -1e9);
            if (drop <= cfg.stepUp + 1e-6 || drop <= cfg.fallSafe + cfg.hangDrop) push(t);
          }
          // climb onto a ledge in the next cell
          for (const u of n.spans) {
            for (const hu of heights(u)) {
              const dh = hu - z;
              if (dh > cfg.climbMin - 1e-6 && dh <= cfg.climbMax + 1e-6 && myTop >= hu + cfg.height - 0.02 && top(u) - hu >= cfg.height && !(t === u && dh <= cfg.stepUp)) push(u);
            }
          }
          // jumps over pits along the axis
          for (let k = 1; k <= 3; k++) {
            let clear = true;
            for (let i = 1; i <= k && clear; i++) {
              const gc = cellAt(c.x + dx * i, c.y + dy * i);
              const gs = gc && occupy(gc, z);
              const air = gc && R.spanAt(gc, z + 0.1);
              if (!gc || !air || air.cl < z + cfg.height + 0.3) clear = false;
              else if (gs && standable(gs) && Math.min(...heights(gs)) >= z - cfg.stepUp) clear = false; // not a gap: just walk
            }
            if (!clear) break;
            if (k >= 2) {
              const back = cellAt(c.x - dx, c.y - dy), bs = back && occupy(back, z);
              if (!bs || Math.abs(fl(bs) - z) > cfg.stepUp) continue; // no run-up
            }
            const L = cellAt(c.x + dx * (k + 1), c.y + dy * (k + 1));
            if (!L) break;
            const hiMax = k === 3 ? 0.3 : 0.5, loMin = k === 3 ? -0.3 : -cfg.fallSafe;
            for (const u of L.spans) {
              if (!standable(u)) continue;
              const ok = heights(u).some(hu => hu - z <= hiMax && hu - z >= loMin && top(u) >= Math.max(hu, z) + cfg.height);
              if (ok) push(u);
            }
          }
        }
        // loose floor: let it fall and drop to the span below
        if (s.loose && s.loose.state !== 'fallen') {
          const i = c.spans.indexOf(s);
          const below = i > 0 ? c.spans[i - 1] : null;
          if (below && z - fl(below) <= cfg.fallSafe + 1e-6) push(below);
        }
      }
    }
    return reach;
  }

  const startCell = cellAt(Math.floor(world.start.x), Math.floor(world.start.y));
  const start = R.spanAt(startCell, world.start.z + 0.01);
  let reach, round = 0;
  for (;;) {
    reach = bfs(start);
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
          // can we get from the plate to the gate before it shuts?
          open.add(P.opens);
          const r2 = bfs(s);
          let best = Infinity;
          for (const gs of gates) {
            for (const [dx, dy] of DIRS) { const nc = cellAt(gs.cell.x + dx, gs.cell.y + dy); if (!nc) continue; for (const ns of nc.spans) if (r2.has(ns) && ns !== gs) best = Math.min(best, r2.get(ns) + 1); }
          }
          open.delete(P.opens);
          const budget = P.hold * cfg.runSpeed * 0.8 + 1;
          if (best > budget) { inTime = false; log.push(`plate ${`(${s.cell.x},${s.cell.y})`} → gate "${P.opens}": ${best === Infinity ? 'unreachable' : best + ' cells'} but only ~${budget.toFixed(0)} cells of running time`); }
        }
        if (inTime) { open.add(P.opens); got.push(`[plate opens ${P.opens}${P.hold ? ' for ' + P.hold + 's' : ''}]`); progress = true; }
      }
      if (P.lift && !used.has(s)) { for (const t of (world.tags.get(P.lift.tag) || [])) if ((P.lift.prop || 'fl') === 'fl') lifted.set(t, P.lift.to); got.push(`[lift ${P.lift.tag}]`); progress = true; }
      used.add(s);
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
  const exit = [...reach.keys()].some(s => s.exit);
  return { exit, reach, inv, open, items, log };
}
