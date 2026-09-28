#!/usr/bin/env node
/*
 * Physics contract tests:  node tools/physics.js
 *
 * Builds tiny test levels and drives the real game physics with scripted
 * keyboard input, checking that the moves promised in DESIGN.md (and assumed
 * by tools/verify.js) really work — and that the limits really are limits.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="([^"]+)"/g)) vm.runInThisContext(fs.readFileSync(path.join(root, m[1]), 'utf8'), { filename: m[1] });
const R = globalThis.RetroEngine;
const base = R.campaigns.get('hourglass');

/** A level from a list of layers; each layer is a function (x, y) -> char. */
function level(w, h, layers, legend = {}) {
  return {
    id: 'test', name: 'test', width: w, height: h, legend,
    layers: layers.map(([z, fn]) => { const rows = []; for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += fn(x, y); rows.push(r); } return { z, map: rows }; }),
  };
}
function game(lv) {
  const camp = Object.assign({}, base, { levels: [lv], id: 'test' });
  Object.defineProperty(camp, 'levels', { value: [lv] });
  const log = [];
  const g = new R.Game(camp, { msg: t => log.push(t) });
  g.log = log;
  return g;
}
/** Run for `secs`, calling ctl(g, t) each tick for the input. */
function run(g, secs, ctl) {
  const dt = 1 / 60;
  for (let t = 0; t < secs; t += dt) g.update(dt, ctl(g, t) || {});
  return g.player;
}
let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}  ${detail || ''}`); }
}
const corridor = (x, y) => (y >= 1 && y <= 3);

// ---------------------------------------------------------------- gaps
function gapTest(gap, running, jumpAt) {
  const edge = 12;
  const lv = level(26, 5, [[0, (x, y) => (!corridor(x, y) || x < 1 || x > 24) ? '#' : (x >= edge && x < edge + gap) ? '_' : x === 2 && y === 2 ? '@' : '.']], { '@': { base: '.', start: 'E' } });
  const g = game(lv);
  let jumped = false;
  const p = run(g, 5, (g) => {
    const p = g.player;
    const inp = { fwd: 1, run: running };
    if (!running && p.x < jumpAt) inp.fwd = 1;
    if (!running && p.x >= jumpAt && !jumped) { jumped = true; return { fwd: 0, jump: true }; }
    if (running && p.x >= jumpAt && !jumped) { jumped = true; inp.jump = true; }
    return inp;
  });
  return { alive: p.alive, x: p.x, z: p.z };
}
{
  // standing jump: walk carefully to the edge, stop, then jump with forward held
  function standing(gap) {
    const edge = 12;
    const lv = level(26, 5, [[0, (x, y) => (!corridor(x, y) || x < 1 || x > 24) ? '#' : (x >= edge && x < edge + gap) ? '_' : x === 9 && y === 2 ? '@' : '.']], { '@': { base: '.', start: 'E' } });
    const g = game(lv);
    run(g, 4, () => ({ fwd: 1, careful: true }));       // careful step stops at the edge
    const atEdge = g.player.x;
    let t0 = null;
    run(g, 0.4, () => ({}));                              // stand still
    run(g, 2, (g, t) => (t < 0.02 ? { jump: true, fwd: 1 } : { fwd: 1 }));
    return { alive: g.player.alive, x: g.player.x, atEdge };
  }
  const s1 = standing(1), s2 = standing(2);
  check('careful step stops at the edge', s1.atEdge > 11.6 && s1.atEdge < 12.3, `stopped at x=${s1.atEdge.toFixed(2)}`);
  check('standing jump clears a 1-cell gap', s1.alive && s1.x > 13, `x=${s1.x.toFixed(2)} alive=${s1.alive}`);
  check('standing jump does not clear a 3-cell gap', !standing(3).alive || standing(3).x < 12);
  const r2 = gapTest(2, true, 11.4), r2early = gapTest(2, true, 11.0);
  check('running jump clears a 2-cell gap (jump near the edge)', r2.alive && r2.x > 14, JSON.stringify(r2));
  check('running jump clears a 2-cell gap (jump a bit early)', r2early.alive && r2early.x > 14, JSON.stringify(r2early));
  const r4 = gapTest(4, true, 11.6);
  check('running jump cannot clear a 4-cell gap', !r4.alive || r4.x < 16, JSON.stringify(r4));
  const r3 = gapTest(3, true, 11.6);
  console.log(`  info running jump over 3 cells (land or grab): ${r3.alive && r3.x > 15 ? 'makes it' : 'fails'}`);
}

// ---------------------------------------------------------------- climbing
function climbTest(h) {
  const lv = level(12, 5, [[0, (x, y) => (!corridor(x, y) || x < 1 || x > 10) ? '#' : x >= 6 ? 'H' : x === 3 && y === 2 ? '@' : 'f']],
    { '@': { base: '.', start: 'E', cl: 4 }, 'f': { base: '.', cl: 4 }, 'H': { base: '.', fl: h, cl: h + 1.6 } });
  const g = game(lv);
  run(g, 1.2, () => ({ fwd: 1 }));                        // walk into the wall
  run(g, 2.5, (g, t) => (t < 0.02 ? { jump: true, fwd: 1 } : { fwd: 1 }));
  return g.player;
}
{
  const c1 = climbTest(1.0), c2 = climbTest(2.1), c3 = climbTest(2.25);
  check('climb a 1.0 ledge', Math.abs(c1.z - 1.0) < 0.05 && c1.x > 6, `z=${c1.z.toFixed(2)} x=${c1.x.toFixed(2)}`);
  check('climb a 2.1 ledge', Math.abs(c2.z - 2.1) < 0.05 && c2.x > 6, `z=${c2.z.toFixed(2)} x=${c2.x.toFixed(2)}`);
  check('cannot climb a 2.25 ledge', c3.z < 0.5, `z=${c3.z.toFixed(2)}`);
  const st = climbTest(0.3);
  check('walk up a 0.3 step', Math.abs(st.z - 0.3) < 0.05 && st.x > 6, `z=${st.z.toFixed(2)}`);
}
{
  // grab a ledge in mid-air after a running jump that falls short and low
  const lv = level(26, 5, [[0, (x, y) => (!corridor(x, y) || x < 1 || x > 24) ? '#' : x >= 12 && x < 15 ? '_' : x >= 15 ? 'H' : x === 2 && y === 2 ? '@' : '.']],
    { '@': { base: '.', start: 'E' }, 'H': { base: '.', fl: 0.8, cl: 2.2 } });
  const g = game(lv);
  let j = false;
  run(g, 4, (g) => { const p = g.player; if (p.x > 11.5 && !j) { j = true; return { fwd: 1, run: true, jump: true }; } return { fwd: 1, run: true }; });
  check('mid-air grab onto a ledge across a 3-cell gap', g.player.alive && g.player.x > 15 && Math.abs(g.player.z - 0.8) < 0.05, `x=${g.player.x.toFixed(2)} z=${g.player.z.toFixed(2)} alive=${g.player.alive}`);
}

// ---------------------------------------------------------------- falls
function fallTest(h, careful) {
  // an upper floor at z = h ending in a drop to z = 0
  const lv = level(14, 5, [
    [0, (x, y) => (!corridor(x, y) || x < 1 || x > 12) ? '#' : x >= 6 ? '.' : ' '],
    [h, (x, y) => (!corridor(x, y) || x < 1 || x > 12) ? '#' : x < 6 ? (x === 2 && y === 2 ? '@' : '.') : '_'],
  ], { '@': { base: '.', start: 'E' } });
  const g = game(lv);
  run(g, careful ? 4 : 2.5, () => ({ fwd: 1, careful }));
  run(g, 1.5, () => ({}));
  return g.player;
}
{
  const f22 = fallTest(2.2), f30 = fallTest(3.0), f46 = fallTest(4.6), h30 = fallTest(3.0, true);
  check('fall 2.2: no damage', f22.alive && f22.life === 3, `life=${f22.life}`);
  check('fall 3.0: lose one life', f30.alive && f30.life === 2, `life=${f30.life}`);
  check('fall 4.6: death', !f46.alive);
  check('hang-drop 3.0 (careful): no damage', h30.alive && h30.life === 3 && h30.z < 0.1, `life=${h30.life} z=${h30.z.toFixed(2)}`);
}

// ---------------------------------------------------------------- loose floor, plate & gate
{
  const lv = level(14, 5, [
    [0, (x, y) => (!corridor(x, y) || x < 1 || x > 12) ? '#' : '.'],
    [2, (x, y) => (!corridor(x, y) || x < 1 || x > 12) ? '#' : x === 6 ? 'o' : x === 2 && y === 2 ? '@' : '.'],
  ], { '@': { base: '.', start: 'E' } });
  const g = game(lv);
  run(g, 3, (g) => (g.player.x < 6.4 ? { fwd: 1 } : {}));
  run(g, 1.5, () => ({}));
  check('loose floor gives way and drops you one level', g.player.alive && g.player.z < 0.1, `z=${g.player.z.toFixed(2)}`);
}
{
  const lv = level(14, 5, [[0, (x, y) => (!corridor(x, y) || x < 1 || x > 12) ? '#' : x === 4 && y === 2 ? '=' : x === 8 ? '|' : x === 2 && y === 2 ? '@' : '.']], {
    '@': { base: '.', start: 'E' },
    '|': { base: '.', tag: 'g', door: { remote: true, tex: 'GATE_BARS', h: 1.4, speed: 3, closeSpeed: 0.5 } },
    '=': { base: '.', plate: { opens: 'g', hold: 2 } },
  });
  const g = game(lv);
  const gateSpan = g.world.cellAt(8, 2).spans[0];
  run(g, 3, (g) => (g.player.x < 4.5 ? { fwd: 1 } : {}));
  const opened = gateSpan.door.state === 'open' || gateSpan.door.state === 'opening';
  run(g, 1.2, () => ({ fwd: -1 }));                       // step off the plate, back away
  run(g, 5, () => ({}));
  check('plate opens a gate', opened, gateSpan.door.state);
  check('timed gate closes again', gateSpan.door.state === 'closed', gateSpan.door.state);
  g.player.x = 5.5; g.player.y = 1.5;                     // beside the plate, not on it
  run(g, 3, () => ({ fwd: 1 }));
  check('closed gate blocks the way', g.player.x < 8, `x=${g.player.x.toFixed(2)}`);
}

// ---------------------------------------------------------------- spikes
function spikeTest(opts) {
  const lv = level(16, 5, [[0, (x, y) => (!corridor(x, y) || x < 1 || x > 14) ? '#' : x === 8 && y === 2 ? '^' : x === 2 && y === 2 ? '@' : '.']], { '@': { base: '.', start: 'E' } });
  const g = game(lv);
  run(g, 6, () => Object.assign({ fwd: 1 }, opts));
  return g.player;
}
{
  check('running over spikes kills', !spikeTest({ run: true }).alive);
  const c = spikeTest({ careful: true });
  check('careful steps over spikes are safe', c.alive && c.x > 9, `x=${c.x.toFixed(2)} alive=${c.alive}`);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
