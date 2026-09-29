#!/usr/bin/env node
/*
 * Regressions for engine bugs found by the adversarial code review, reproduced
 * in the real levels:  node tools/proofs/engine_regressions.js
 */
'use strict';
const R = require('../load.js').load();
const camp = R.campaigns.get('hourglass'), DT = R.PHYSICS_DT;
const mk = id => new R.Game(camp, {}, { level: camp.levels.findIndex(l => l.id === id) });
const run = (g, s, f) => { for (let t = 0; t < s; t += DT) g.update(DT, (f && f(t)) || {}); };
let fails = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}  ${detail}`); if (!ok) fails++; };

// a careful mid-air catch at a low stair lip must not hang with the feet in the floor
{ const g = mk('cells'); g.teleport(17.3, 19.5, 0, 'W'); run(g, 0.1);
  run(g, 0.8, t => (t < DT ? { jump: true, fwd: 1, careful: true } : { fwd: 1, careful: true })); run(g, 0.2, () => ({ careful: true })); run(g, 2);
  const p = g.player; check('careful catch at a stair step', p.alive && p.z > -0.05, `z=${p.z.toFixed(2)}`); }
// climbing onto a rising lift ends on the deck, not inside the rock under it
{ const g = mk('forge'), L = g.world.cellAt(47, 22).spans[0];
  run(g, 0.05); let n = 0; while (L.fl > 0.001 && n++ < 5000) run(g, DT); n = 0; while (L.fl < 0.5 && n++ < 5000) run(g, DT);
  g.teleport(47.5, 23.3, 0, 'N'); run(g, 0.02, t => (t < DT ? { jump: true } : {})); run(g, 5);
  const p = g.player; check('climb onto a rising lift', p.alive && !!R.spanAt(g.cellAt(p.x, p.y), p.z + 0.01), `z=${p.z.toFixed(2)}`); }
// toes on a rising lift: the deck slides past, never lifting you into the rock
{ const g = mk('forge'), L = g.world.cellAt(47, 22).spans[0];
  run(g, 0.05); let n = 0; while (L.fl > 0.001 && n++ < 5000) run(g, DT);
  g.teleport(47.5, 23.05, 0, 'N'); run(g, 8);
  const p = g.player; check('toes on a rising lift', !!R.spanAt(g.cellAt(p.x, p.y), p.z + 0.01), `(${p.x.toFixed(2)},${p.y.toFixed(2)}) z=${p.z.toFixed(2)}`); }
// respawning at a brazier nudged against a wall: you can walk away
{ const g = mk('blades'); g.teleport(15.5, 3.5, 0, 'E'); run(g, 0.8, () => ({ fwd: 1 }));
  g.kill(); g.respawn(); const q = g.player, x0 = q.x, y0 = q.y; q.ang = 0; run(g, 1, () => ({ fwd: 1 }));
  check('respawn at the doorway brazier', Math.hypot(q.x - x0, q.y - y0) > 0.5, `moved ${Math.hypot(q.x - x0, q.y - y0).toFixed(2)}`); }
// a raised item (the silver key on the anvil) is taken by walking up to it, without the renderer
{ const g = mk('forge'), key = g.ents.find(e => e.spec.item === 'key_silver');
  g.teleport(25.5, 14.5, 1.5, 'S'); run(g, 1.5, () => ({ fwd: 1 }));
  check('walk up to the key on the anvil', key.gone && g.has('key_silver'), `taken=${key.gone}`); }
// the map survives a respawn
{ const g = mk('cells'); for (const c of g.world.cells) c.seen = true; g.respawn();
  check('automap kept across a respawn', g.world.cells.every(c => c.seen), ''); }
console.log(`\n  ${fails ? fails + ' FAILED' : 'all passed'}`);
process.exit(fails ? 1 : 0);
