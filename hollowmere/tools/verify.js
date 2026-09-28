#!/usr/bin/env node
/*
 * Headless campaign checker:  node tools/verify.js [campaignId]
 *
 *  1. loads the engine + every campaign listed in index.html
 *  2. compiles each world (catches bad map chars, stair mismatches, ...)
 *  3. runs a solver: flood-fills the map with the keys/tools collected so far,
 *     picks up every reachable item, opens remote doors whose switches are
 *     reachable, and repeats — then checks the goal can be reached.
 * Exit code 1 on any error.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
for (const s of scripts) vm.runInThisContext(fs.readFileSync(path.join(root, s), 'utf8'), { filename: s });
const R = globalThis.RetroEngine;

let failed = false;
const want = process.argv[2];
for (const id of R.campaigns.names()) {
  if (want && id !== want) continue;
  const camp = R.campaigns.get(id);
  console.log(`\n=== ${id}: ${camp.title} ===`);
  try { check(camp); } catch (e) { failed = true; console.error('ERROR:', e.message); }
}
process.exit(failed ? 1 : 0);

function check(camp) {
  // row-length sanity
  for (const f of camp.floors) {
    const lens = new Set(f.map.map(r => [...r].length));
    if (lens.size > 1) console.warn(`  warn: floor "${f.id}" has rows of different lengths: ${[...lens].join(', ')}`);
  }
  const g = new R.Game(camp, {});
  const world = g.world, cfg = g.cfg, W = world.W;
  console.log(`  compiled ${world.floors.length} floors, ${g.ents.length} entities, start on "${world.floors[world.start.floor].id}"`);
  for (const f of world.floors) {
    const n = f.cells.filter(c => c && !c.solid).length;
    console.log(`   - ${f.id.padEnd(8)} elev ${world.elev[f.index].toFixed(2)}  open cells ${n}`);
  }
  const verify = camp.verify || {};
  const inv = new Set();
  const opened = new Set();
  const key = (f, x, y) => `${f}:${x},${y}`;
  const hazardOk = c => {
    if (!c.hazard) return true;
    const h = g.hazardDefs[c.hazard];
    if (!h) return true;
    if (h.pit) return false;
    if (h.immune) return inv.has(h.immune);
    return true;
  };
  function heightOf(f, x, y) { const r = world.resolve(f, x, y); return { c: r.cell, fl: r.cell.fl + r.dz, dz: r.dz }; }
  function flood() {
    const s = world.start;
    const start = [s.floor, Math.floor(s.x), Math.floor(s.y)];
    const seen = new Set([key(...start)]);
    const q = [start];
    while (q.length) {
      const [f, x, y] = q.shift();
      const cur = heightOf(f, x, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        const raw = world.cellAt(f, nx, ny);
        const r = world.resolve(f, nx, ny), t = r.cell;
        if (t.solid || t.block || raw.block) continue;
        if (t.door) {
          const d = t.door;
          if (d.remote && !opened.has(d.group || t.tag)) continue;
          if (d.key && !inv.has(d.key)) continue;
        }
        if (!hazardOk(t)) continue;
        const tfl = t.fl + r.dz;
        let tcl = (t.door ? t.doorTop : t.anim && t.anim.type === 'crusher' ? t.baseCl : t.cl) + r.dz;
        if (tfl - cur.fl > cfg.stepUp + 1e-6) continue;
        if (tcl - Math.max(tfl, cur.fl) < cfg.height) continue;
        const nf = raw.portal >= 0 ? raw.portal : f;
        const k = key(nf, nx, ny);
        if (seen.has(k)) continue;
        seen.add(k); q.push([nf, nx, ny]);
      }
    }
    return seen;
  }
  const adjacentSeen = (seen, f, x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(key(f, x + dx, y + dy)));
  const taken = new Set();
  let round = 0, seen;
  for (;;) {
    seen = flood();
    let progress = false;
    const got = [];
    for (const e of g.ents) {
      if (e.type !== 'item' || taken.has(e.id)) continue;
      if (seen.has(key(e.floor, Math.floor(e.x), Math.floor(e.y)))) {
        taken.add(e.id);
        const it = g.itemDef(e.spec.item);
        if (it.kind !== 'treasure' && it.kind !== 'health') { if (!inv.has(e.spec.item)) got.push(e.spec.item); inv.add(e.spec.item); progress = true; }
      }
    }
    for (const [tag, rule] of Object.entries(verify.remote || {})) {
      if (opened.has(tag)) continue;
      if (!(rule.items || []).every(i => inv.has(i))) continue;
      const sw = [];
      for (const fl of world.floors) for (const c of fl.cells) if (c && c.use === rule.script) sw.push(c);
      if (sw.some(c => adjacentSeen(seen, c.f, c.x, c.y))) { opened.add(tag); got.push(`[${tag} opened]`); progress = true; }
    }
    round++;
    console.log(`  round ${round}: reachable cells ${seen.size}${got.length ? '  +' + got.join(', ') : ''}`);
    if (!progress) break;
  }
  // report
  const missing = g.ents.filter(e => e.type === 'item' && !taken.has(e.id));
  for (const e of missing) {
    failed = true;
    console.error(`  UNREACHABLE item "${e.spec.item}" on ${world.floors[e.floor].id} at (${Math.floor(e.x)},${Math.floor(e.y)})`);
  }
  const notes = g.ents.filter(e => e.type === 'note' && !adjacentSeen(seen, e.floor, Math.floor(e.x), Math.floor(e.y)));
  for (const e of notes) console.warn(`  warn: unreachable note "${e.spec.title}" on ${world.floors[e.floor].id} at (${Math.floor(e.x)},${Math.floor(e.y)})`);
  if (verify.goal) {
    const goalEnt = g.ents.find(e => e.spec.script === verify.goal.script);
    const ok = goalEnt && adjacentSeen(seen, goalEnt.floor, Math.floor(goalEnt.x), Math.floor(goalEnt.y)) && verify.goal.items.every(i => inv.has(i));
    if (!ok) { failed = true; console.error(`  GOAL NOT REACHABLE (goal entity ${goalEnt ? 'found' : 'missing'}; items: ${verify.goal.items.filter(i => !inv.has(i)).join(', ') || 'ok'})`); }
    else console.log('  goal reachable: the campaign can be completed.');
  }
  console.log(`  treasures ${g.stats.treasureTotal}, secrets ${g.stats.secretTotal}, items collected: ${[...inv].join(', ')}`);
}
