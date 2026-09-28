#!/usr/bin/env node
/*
 * Physics contract tests:  node tools/physics.js
 *
 * Builds tiny test levels and drives the real Game at the fixed 120 Hz step
 * with scripted keyboard input, checking BOTH sides of the moves contract in
 * engine/game.js (and DESIGN.md), which tools/verify.js assumes: every move
 * that must work works, and every limit really is a limit.
 */
'use strict';
const R = require('./load.js').load();
const base = R.campaigns.get('hourglass');
const DT = R.PHYSICS_DT;

/** A level from layers; each layer is [z, (x, y) -> char]. Rows are exactly w wide. */
function level(w, h, layers, legend = {}) {
  return {
    id: 'test', name: 'test', width: w, height: h, legend: Object.assign({ '@': { base: '.', start: 'E' } }, legend),
    layers: layers.map(([z, fn]) => { const rows = []; for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += fn(x, y); rows.push(r); } return { z, map: rows }; }),
  };
}
function game(lv, cfg = {}) {
  const camp = Object.assign({}, base, { id: 'test', config: Object.assign({}, base.config, cfg) });
  Object.defineProperty(camp, 'levels', { value: [lv] });
  const log = [];
  const g = new R.Game(camp, { msg: t => log.push(t) });
  g.log = log;
  return g;
}
/** Run for `secs`, calling ctl(g, t) each tick for the input. */
function run(g, secs, ctl) {
  for (let t = 0; t < secs; t += DT) g.update(DT, (ctl && ctl(g, t)) || {});
  return g.player;
}
let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}  ${detail || ''}`); }
}
const inCorr = (x, y, w) => y >= 1 && y <= 3 && x >= 1 && x <= w - 2;
const f2 = v => v.toFixed(2);

// ---------------------------------------------------------------- gaps
const EDGE = 14;
/** Gap of `gap` cells after x = EDGE; the far floor is dz above the take-off floor. */
function gapLevel(gap, dz) {
  const W = EDGE + gap + 8;
  const far = x => x >= EDGE + gap, mid = x => x >= EDGE && x < EDGE + gap;
  if (dz === 0 || (dz > 0 && dz < 1.5)) {
    return level(W, 5, [[0, (x, y) => !inCorr(x, y, W) ? '#' : mid(x) ? (dz ? 'A' : '~') : far(x) ? (dz ? 'H' : '.') : x === 2 && y === 2 ? '@' : ',']],
      { 'H': { base: '.', fl: dz, cl: dz + 1.25 }, 'A': { pit: true, abyss: true, cl: 2.75 } });
  }
  if (dz === -1.5) {
    return level(W, 5, [
      [0, (x, y) => !inCorr(x, y, W) ? '#' : mid(x) ? '~' : far(x) ? '.' : '#'],
      [1.5, (x, y) => !inCorr(x, y, W) ? '#' : mid(x) || far(x) ? '_' : x === 2 && y === 2 ? '@' : '.'],
    ]);
  }
  if (dz === 1.5) {
    return level(W, 5, [
      [0, (x, y) => !inCorr(x, y, W) ? '#' : mid(x) ? 'A' : far(x) ? '#' : x === 2 && y === 2 ? '@' : ','],
      [1.5, (x, y) => !inCorr(x, y, W) ? '#' : far(x) ? '.' : '#'],
    ], { 'A': { pit: true, abyss: true, cl: 2.75 } });
  }
  throw new Error('dz');
}
/** Try a jump; how: 'stand' | 'walk' | 'run' | 'late' (jump pressed after walking off: coyote). */
function jump(gap, dz, how, opts = {}) {
  const g = game(gapLevel(gap, dz), opts.cfg);
  const p = g.player;
  if (how === 'stand') {
    p.x = EDGE - 3.5;
    run(g, 4, () => ({ fwd: 1, careful: true }));      // careful step stops at the edge
    run(g, 0.3, () => ({ careful: true }));
    run(g, 3, (g, t) => (t < DT ? { jump: true, fwd: 1 } : { fwd: 1 }));
  } else {
    const running = how !== 'walk';
    const at = opts.at ?? (how === 'late' ? EDGE + 0.22 : EDGE - 0.6);
    let pressed = false;
    run(g, 6, g => {
      const inp = { fwd: 1, run: running, careful: !!(opts.carefulInAir && !g.player.onGround) };
      if (!pressed && g.player.x >= at) { pressed = true; inp.jump = true; }
      return inp;
    });
  }
  const made = p.alive && p.onGround && p.x > EDGE + gap + 0.1 && Math.abs(p.z - (g.world.start.z + dz)) < 0.05;
  return { made, desc: `x=${f2(p.x)} z=${f2(p.z)} alive=${p.alive} act=${p.act ? p.act.kind : '-'}`, g };
}
function gapRow(label, gap, dz, how, want, opts) {
  const r = jump(gap, dz, how, opts);
  check(`${label}: ${want ? 'makes' : 'never makes'} a ${gap}-cell gap`, r.made === want, r.desc);
}
console.log('same level');
gapRow('standing jump', 1, 0, 'stand', true);
gapRow('standing jump', 2, 0, 'stand', false);
gapRow('walking jump', 1, 0, 'walk', true);
gapRow('running jump', 2, 0, 'run', true);
gapRow('running jump, pressed 0.4 before the lip, no edge-snap', 2, 0, 'run', true, { at: EDGE - 0.4, cfg: { edgeSnap: 0 } });
gapRow('running jump (catch the lip, pull up)', 3, 0, 'run', true);
gapRow('running jump', 4, 0, 'run', false);
gapRow('running jump pressed late (coyote)', 4, 0, 'late', false);
console.log('down one storey');
gapRow('standing jump down', 2, -1.5, 'stand', true);
gapRow('running jump down', 3, -1.5, 'run', true);
gapRow('running jump down (catch)', 4, -1.5, 'run', true);
gapRow('running jump down', 5, -1.5, 'run', false);
gapRow('running jump down pressed late (coyote)', 5, -1.5, 'late', false);
console.log('up');
gapRow('standing jump up +0.5', 1, 0.5, 'stand', true);
gapRow('running jump up +0.5', 1, 0.5, 'run', true);
gapRow('running jump up +1.0 (catch)', 2, 1.0, 'run', true);
gapRow('standing jump up one storey', 1, 1.5, 'stand', false);
gapRow('running jump up one storey', 1, 1.5, 'run', false);
{
  const r = jump(3, 0, 'run', { carefulInAir: true });
  check('catch with C held: hang from the lip', r.g.player.act && r.g.player.act.kind === 'hang', r.desc);
}

// ---------------------------------------------------------------- climbing
function climbTest(h) {
  const W = 12;
  const lv = level(W, 5, [[0, (x, y) => !inCorr(x, y, W) ? '#' : x >= 6 ? 'H' : x === 3 && y === 2 ? '@' : ',']],
    { 'H': { base: '.', fl: h, cl: h + 1.25 } });
  const g = game(lv);
  run(g, 1.5, () => ({ fwd: 1 }));                        // walk up to the face
  run(g, 2.5, (g, t) => (t < DT ? { jump: true, fwd: 1 } : { fwd: 1 }));
  return g.player;
}
console.log('climbing');
for (const [h, ok] of [[0.6, true], [1.0, true], [1.5, true], [1.75, true], [1.95, false]]) {
  const c = climbTest(h);
  const up = Math.abs(c.z - h) < 0.05 && c.x > 6;
  check(`${ok ? 'climb' : 'cannot climb'} a ${h} ledge`, up === ok, `z=${f2(c.z)} x=${f2(c.x)}`);
}
{
  const st = climbTest(0.3);
  check('walk up a 0.3 step', Math.abs(st.z - 0.3) < 0.05 && st.x > 6, `z=${f2(st.z)}`);
}

// ---------------------------------------------------------------- falls & hanging
/** A floor `storeys` storeys up ending in a drop to z = 0. */
function dropLevel(storeys) {
  const W = 14, top = storeys * 1.5, layers = [[0, (x, y) => !inCorr(x, y, W) ? '#' : x >= 6 ? '.' : '#']];
  for (let k = 1; k <= storeys; k++) layers.push([k * 1.5, (x, y) => !inCorr(x, y, W) ? '#' : x >= 6 ? '_' : k === storeys ? (x === 2 && y === 2 ? '@' : '.') : '#']);
  return { lv: level(W, 5, layers), top };
}
function walkOff(storeys) {
  const g = game(dropLevel(storeys).lv);
  run(g, 3, () => ({ fwd: 1 }));
  run(g, 1.5);
  return g.player;
}
/** Careful to the edge, press Forward again to hang, hold, then let go (or pull up). */
function hangTest(storeys, then) {
  const g = game(dropLevel(storeys).lv), p = g.player;
  run(g, 4, () => ({ fwd: 1, careful: true }));
  run(g, 0.2, () => ({ careful: true }));
  run(g, 1.0, () => ({ fwd: 1, careful: true }));
  const hanging = p.act && p.act.kind === 'hang';
  run(g, 1.0, () => ({ careful: true }));
  const still = p.act && p.act.kind === 'hang';
  if (then === 'pull') run(g, 2, (g, t) => (t < DT ? { jump: true, careful: true } : { careful: true }));
  else run(g, 2, () => ({}));
  run(g, 1);
  return { p, hanging, still };
}
console.log('falls');
{
  const w1 = walkOff(1), w2 = walkOff(2), w3 = walkOff(3);
  check('walk off 1 storey (1.5): no damage', w1.alive && w1.life === 3, `life=${w1.life}`);
  check('walk off 2 storeys (3.0): lose a life', w2.alive && w2.life === 2, `life=${w2.life}`);
  check('walk off 3 storeys (4.5): death', !w3.alive, `life=${w3.life}`);
  const h2 = hangTest(2), h3 = hangTest(3), hp = hangTest(2, 'pull');
  check('careful + Forward again at an edge: hang', h2.hanging && h2.still, `hanging=${h2.hanging} still=${h2.still}`);
  check('hang-drop 2 storeys (2.1): no damage', h2.p.alive && h2.p.life === 3 && h2.p.z < 0.05, `life=${h2.p.life} z=${f2(h2.p.z)}`);
  check('hang-drop 3 storeys (3.6): lose a life', h3.p.alive && h3.p.life === 2, `life=${h3.p.life} z=${f2(h3.p.z)}`);
  check('hang, then SPACE: pull back up', hp.p.alive && Math.abs(hp.p.z - 3) < 0.05 && hp.p.x < 6, `z=${f2(hp.p.z)} x=${f2(hp.p.x)}`);
}

// ---------------------------------------------------------------- loose floors
function looseTest(ctl) {
  const W = 16;
  const lv = level(W, 5, [
    [0, (x, y) => !inCorr(x, y, W) ? '#' : '.'],
    [1.5, (x, y) => !inCorr(x, y, W) ? '#' : x === 7 ? 'o' : x === 2 && y === 2 ? '@' : '.'],
  ]);
  const g = game(lv);
  run(g, 7, ctl);
  run(g, 1.5);
  return g.player;
}
console.log('loose floors');
{
  const stop = looseTest(g => (g.player.x < 7.5 ? { fwd: 1 } : {}));
  check('stop on a loose floor: it drops you a storey', stop.alive && stop.z < 0.05, `z=${f2(stop.z)}`);
  const walk = looseTest(() => ({ fwd: 1 }));
  check('walk across a loose floor: you make it', walk.alive && walk.z > 1.45 && walk.x > 9, `z=${f2(walk.z)} x=${f2(walk.x)}`);
  const runx = looseTest(() => ({ fwd: 1, run: true }));
  check('run across a loose floor: you make it', runx.alive && runx.z > 1.45, `z=${f2(runx.z)}`);
  const care = looseTest(() => ({ fwd: 1, careful: true }));
  check('careful step onto a loose floor: it drops you', care.alive && care.z < 0.05, `z=${f2(care.z)}`);
}

// ---------------------------------------------------------------- plate & gate
console.log('plates and gates');
{
  const W = 14;
  const lv = level(W, 5, [[0, (x, y) => !inCorr(x, y, W) ? '#' : x === 4 && y === 2 ? '=' : x === 8 ? '|' : x === 2 && y === 2 ? '@' : '.']], {
    '|': R.HG.gate('g'), '=': R.HG.plate({ opens: 'g', hold: 2 }),
  });
  const g = game(lv);
  const gateSpan = g.world.cellAt(8, 2).spans[0];
  run(g, 3, g => (g.player.x < 4.5 ? { fwd: 1 } : {}));
  const opened = gateSpan.door.state === 'open' || gateSpan.door.state === 'opening';
  run(g, 1.2, () => ({ fwd: -1 }));
  run(g, 6);
  check('plate opens a gate', opened, gateSpan.door.state);
  check('timed gate closes again', gateSpan.door.state === 'closed', gateSpan.door.state);
  g.player.x = 5.5; g.player.y = 1.5;
  run(g, 3, () => ({ fwd: 1 }));
  check('closed gate blocks the way', g.player.x < 8, `x=${f2(g.player.x)}`);
}

// ---------------------------------------------------------------- spikes
function spikeTest(opts, stopWhenHurt) {
  const W = 16;
  const lv = level(W, 5, [[0, (x, y) => !inCorr(x, y, W) ? '#' : x === 8 ? '^' : x === 2 && y === 2 ? '@' : '.']]);
  const g = game(lv);
  run(g, 9, g => (stopWhenHurt && g.player.life < 3 ? {} : Object.assign({ fwd: 1 }, opts)));
  return g.player;
}
console.log('spikes');
{
  check('running into spikes kills', !spikeTest({ run: true }).alive);
  const w = spikeTest({}, true);
  check('walking into spikes hurts and pushes you back', w.alive && w.life === 2 && w.x < 8.2, `life=${w.life} x=${f2(w.x)} alive=${w.alive}`);
  const c = spikeTest({ careful: true });
  check('careful steps through spikes are safe', c.alive && c.life === 3 && c.x > 9, `x=${f2(c.x)} life=${c.life}`);
}

// ---------------------------------------------------------------- checkpoints restore the world
console.log('checkpoints');
{
  const W = 18;
  const lv = level(W, 5, [
    [0, (x, y) => !inCorr(x, y, W) ? '#' : x >= 8 ? '~' : '.'],
    [1.5, (x, y) => !inCorr(x, y, W) ? '#' : x === 4 && y === 2 ? 'C' : x === 7 ? 'o' : x === 8 ? 'o' : x >= 9 ? '_' : x === 2 && y === 2 ? '@' : '.'],
  ]);
  const g = game(lv);
  run(g, 1.2, g => (g.player.x < 4.6 ? { fwd: 1 } : {}));  // light the brazier
  run(g, 3, g => (g.player.x < 7.5 ? { fwd: 1 } : {}));    // stop on the loose tile: it drops
  run(g, 3);
  const fell = !g.player.alive || g.player.z < 1;
  const dropped = g.world.cellAt(7, 2).spans.every(s => !s.loose);
  g.respawn();
  const back = g.world.cellAt(7, 2).spans.some(s => s.loose && s.loose.state === 'idle');
  check('a loose floor drops, then the checkpoint restores it', fell && dropped && back && Math.abs(g.player.x - 4.5) < 0.01, `fell=${fell} dropped=${dropped} restored=${back}`);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
