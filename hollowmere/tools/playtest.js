#!/usr/bin/env node
/*
 * Headless bot playthrough:  node tools/playtest.js [campaignId]
 *
 * Plans a route with the same rules as verify.js, then *physically* walks it
 * with the real game physics: steering to cell centres, opening doors, pulling
 * switches, picking items up, climbing stairs between floors and finally using
 * the goal. God mode is on, but every hit is counted, so traps on the route
 * show up in the report. Exit code 1 if the bot cannot finish.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"/g)) vm.runInThisContext(fs.readFileSync(path.join(root, m[1]), 'utf8'), { filename: m[1] });
const R = globalThis.RetroEngine;
const U = R.util;

const id = process.argv[2] || R.campaigns.names()[0];
const camp = R.campaigns.get(id);
const log = [];
let won = false;
const g = new R.Game(camp, {
  msg: t => log.push(t),
  won: () => { won = true; },
  died: () => { throw new Error('bot died'); },
});
g.god = true;
let hits = 0;
const hurt = g.hurt.bind(g);
g.hurt = (n, sx, sy, m) => { if (g.player.invuln <= 0) hits++; return hurt(n, sx, sy, m); };

const world = g.world, cfg = g.cfg, verify = camp.verify || {};
const DT = 1 / 60;
let simTime = 0;
function tick(input) { g.update(DT, input); simTime += DT; }

// ---------------------------------------------------------------- planning
const key = (f, x, y) => `${f}:${x},${y}`;
function passable(f, x, y, nx, ny, opened) {
  const raw = world.cellAt(f, nx, ny);
  const r = world.resolve(f, nx, ny), t = r.cell;
  if (t.solid || t.block || raw.block) return null;
  if (t.door) {
    const d = t.door;
    if (d.remote && !opened.has(d.group || t.tag) && d.state !== 'open') return null;
    if (d.key && !g.has(d.key) && !d.unlocked) return null;
  }
  if (t.hazard) { const h = g.hazardDefs[t.hazard]; if (h && (h.pit || (h.immune && !g.has(h.immune)))) return null; }
  const cur = world.resolve(f, x, y), cfl = cur.cell.fl + cur.dz;
  const tfl = t.fl + r.dz;
  const tcl = (t.door ? t.doorTop : t.anim && t.anim.type === 'crusher' ? t.baseCl : t.cl) + r.dz;
  if (tfl - cfl > cfg.stepUp + 1e-6) return null;
  if (tcl - Math.max(tfl, cfl) < cfg.height) return null;
  return raw.portal >= 0 ? raw.portal : f;
}
const propCells = new Set(g.ents.filter(e => e.solid && e.radius >= 0.1).map(e => key(e.floor, Math.floor(e.x), Math.floor(e.y))));
function route(goalFn, opened) {
  const p = g.player, sf = p.floor, sx = Math.floor(p.x), sy = Math.floor(p.y);
  const prev = new Map([[key(sf, sx, sy), null]]);
  const q = [[sf, sx, sy]];
  while (q.length) {
    const n = q.shift();
    if (goalFn(...n)) { const out = []; let k = key(...n), c = n; while (c) { out.unshift(c); c = prev.get(key(...c)); } return out; }
    const [f, x, y] = n;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nf = passable(f, x, y, x + dx, y + dy, opened);
      if (nf === null) continue;
      const k = key(nf, x + dx, y + dy);
      if (prev.has(k)) continue;
      if (propCells.has(k) && !goalFn(nf, x + dx, y + dy)) continue;
      prev.set(k, n); q.push([nf, x + dx, y + dy]);
    }
  }
  return null;
}

// ---------------------------------------------------------------- acting
function faceTo(x, y) { const p = g.player; p.ang = Math.atan2(y - p.y, x - p.x); }
function walkTo(tx, ty, tf, limit = 12) {
  const p = g.player;
  const t0 = simTime;
  let usedAt = -10, best = 1e9, bestAt = simTime;
  while (simTime - t0 < limit) {
    const d = Math.hypot(tx - p.x, ty - p.y);
    if (d < 0.12 && p.floor === tf) return true;
    if (d < best - 0.01) { best = d; bestAt = simTime; }
    // blocked by a solid prop standing in the cell centre: close enough
    if (d < 0.8 && p.floor === tf && simTime - bestAt > 1.5) return true;
    faceTo(tx, ty);
    // closed door ahead? press use
    const ax = Math.floor(p.x + Math.cos(p.ang) * 0.6), ay = Math.floor(p.y + Math.sin(p.ang) * 0.6);
    const c = world.resolve(p.floor, ax, ay).cell;
    let use = false;
    if (c.door && c.door.state === 'closed' && simTime - usedAt > 1) { use = true; usedAt = simTime; }
    tick({ fwd: d > 0.35 ? 1 : 0.4, strafe: 0, turn: 0, run: false, use });
  }
  return false;
}
function followRoute(path) {
  for (let i = 1; i < path.length; i++) {
    const [f, x, y] = path[i];
    if (!walkTo(x + 0.5, y + 0.5, f)) {
      const p = g.player;
      throw new Error(`stuck walking to ${world.floors[f].id} (${x},${y}); at ${world.floors[p.floor].id} (${p.x.toFixed(2)},${p.y.toFixed(2)}) z=${p.z.toFixed(2)}`);
    }
  }
}
function useFacing(x, y) { faceTo(x, y); tick({ use: true }); for (let i = 0; i < 90; i++) tick({}); }

// ---------------------------------------------------------------- main loop
const opened = new Set();
const t0 = Date.now();
let steps = 0;
for (;;) {
  if (++steps > 200) throw new Error('too many steps');
  const p = g.player;
  // 1) nearest uncollected item that is reachable
  // health pickups are optional (and refused at full health)
  const targets = g.ents.filter(e => e.type === 'item' && !e.gone && g.itemDef(e.spec.item).kind !== 'health');
  const want = new Map(targets.map(e => [key(e.floor, Math.floor(e.x), Math.floor(e.y)), e]));
  const r = route((f, x, y) => want.has(key(f, x, y)), opened);
  if (r) {
    const e = want.get(key(...r[r.length - 1]));
    followRoute(r);
    walkTo(e.x, e.y, e.floor, 4);
    for (let i = 0; i < 20; i++) tick({});
    if (!e.gone) throw new Error(`could not pick up ${e.spec.item}`);
    console.log(`  t=${simTime.toFixed(0).padStart(4)}s  got ${e.spec.item.padEnd(11)} on ${world.floors[g.player.floor].id}`);
    continue;
  }
  // 2) remote switches we can now operate
  let acted = false;
  for (const [tag, rule] of Object.entries(verify.remote || {})) {
    if (opened.has(tag) || !(rule.items || []).every(i => g.has(i))) continue;
    const sws = [];
    for (const fl of world.floors) for (const c of fl.cells) if (c && c.use === rule.script) sws.push(c);
    for (const sw of sws) {
      const nb = new Set([[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => key(sw.f, sw.x + dx, sw.y + dy)));
      const rr = route((f, x, y) => nb.has(key(f, x, y)), opened);
      if (!rr) continue;
      followRoute(rr);
      useFacing(sw.x + 0.5, sw.y + 0.5);
      opened.add(tag);
      console.log(`  t=${simTime.toFixed(0).padStart(4)}s  used switch "${rule.script}" -> ${tag}`);
      acted = true; break;
    }
    if (acted) break;
  }
  if (acted) continue;
  break;
}
// 3) the goal
const goal = verify.goal && g.ents.find(e => e.spec.script === verify.goal.script);
if (goal) {
  const nb = new Set([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => key(goal.floor, Math.floor(goal.x) + dx, Math.floor(goal.y) + dy)));
  const rr = route((f, x, y) => nb.has(key(f, x, y)), opened);
  if (!rr) {
    console.error('  goal not reachable');
    if (process.env.DEBUG) {
      const left = g.ents.filter(e => e.type === 'item' && !e.gone).map(e => `${e.spec.item}@${world.floors[e.floor].id}(${Math.floor(e.x)},${Math.floor(e.y)})`);
      console.error('  items left:', left.join(' '));
      const p = g.player; console.error('  bot at', world.floors[p.floor].id, p.x.toFixed(2), p.y.toFixed(2));
      propCells.clear();
      const cb = g.ents.find(e => e.spec.item === 'crowbar');
      const r2 = route((f, x, y) => f === cb.floor && x === Math.floor(cb.x) && y === Math.floor(cb.y), opened);
      console.error('  route to crowbar without props:', r2 ? r2.length : null);
    }
    process.exit(1);
  }
  followRoute(rr);
  useFacing(goal.x, goal.y);
  for (let i = 0; i < 60 * 12 && !won; i++) tick({});
}
const st = g.stats;
console.log(`\n  ${won ? 'WON' : 'DID NOT WIN'} after ${U.formatTime(simTime)} of game time (${((Date.now() - t0) / 1000).toFixed(1)}s real)`);
console.log(`  hits taken on the way: ${hits}; treasures ${st.treasures}/${st.treasureTotal}; secrets ${st.secrets}/${st.secretTotal}`);
process.exit(won ? 0 : 1);
