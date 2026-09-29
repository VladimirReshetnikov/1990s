// Real-physics proof of the tower's dart stair (the one route corridor replay.js cannot plan:
// 17 hazard cells, all in the boulder's reach). Current engine, the real level file, 120 Hz,
// keyboard-like input only (turn to face, Forward, Shift for walking), no engine emulation.
//
// The player's rule is what a player does after watching one boulder go by: from a safe spot
// (the passage (24,7), an alcove (26,10) (26,13) (26,16)), look up the stair; go to the next
// safe spot only if the boulder will not be on that stretch while you are on it; else wait.
// The boulder moves on level time only, so "look up the stair" = its position over the next
// few seconds (predicted with the patrol entity's own update, on a probe copy).
//
//   node stair_proof.js            running (the default) and walking (Shift), 12 start moments each,
//                                  from the East Landing brazier (23,7) S6 to (23,20) S8, then on
//                                  through the darts to the Seal door (19,20); plus a control run
//                                  that climbs blind (no waiting, no ducking)
'use strict';
const V = require('../verify.js');
const { R, camp, makeGame } = V;
const DT = R.PHYSICS_DT;
const lv = camp.levels.find(l => l.id === 'tower');
const patrol = R.entityTypes.get('patrol');
const f2 = v => v.toFixed(2);

const HIT = 0.55 + 0.24;                 // boulder radius + body radius
const ALCOVES = [10, 13, 16];            // (26, y) beside the stair cell (25, y)

function trial(t0, { run, blind = false, stats }) {
  const g = makeGame(lv, { msg() {} });
  g.give('seal', { silent: true });
  while (g.time < t0) g.update(DT, {});
  g.teleport(23.5, 7.5, 9, 0);                       // the East Landing brazier, facing east
  const p = g.player, b = g.ents.find(e => e.spec.sprite === 'BOULDER');
  const lifeAt0 = p.life;
  let fail = null;
  const step = inp => { g.update(DT, inp); if (!p.alive) fail = fail || `died (${g.deathCause})`; else if (p.life < lifeAt0) fail = fail || `hurt at (${f2(p.x)},${f2(p.y)}) z${f2(p.z)}, boulder (${f2(b.x)},${f2(b.y)})`; return !fail; };
  const goTo = (tx, ty, maxT = 4) => {
    for (let t = 0; t < maxT; t += DT) {
      p.ang = Math.atan2(ty - p.y, tx - p.x);
      if (!step({ fwd: 1, run })) return false;
      if (Math.hypot(tx - p.x, ty - p.y) < 0.15) break;
    }
    for (let t = 0; t < 0.15; t += DT) if (!step({})) return false;
    return true;
  };
  const wait = s => { for (let t = 0; t < s; t += DT) if (!step({})) return false; return true; };
  // the boulder's position at level time t (probe copy: the real entity is untouched)
  const boulderAt = t => { const q = Object.assign({}, b, { x: undefined }); patrol.update(q, { time: t }); return [q.x, q.y]; };
  const cellTime = run ? 0.42 : 0.62;                // measured pace up the steps, with margin
  // is the stretch of stair from row y0 to row y1 (y1 > y0) clear of the boulder while we climb it?
  const clear = (y0, y1, extra) => {
    const T = (y1 - y0) * cellTime + extra;
    for (let t = 0; t <= T + 0.4; t += 0.05) {
      const [bx, by] = boulderAt(g.time + t);
      const py = Math.min(y1, y0 + t / cellTime) + 0.5;  // where we plan to be
      if (Math.hypot(bx - 25.5, by - py) < HIT + 0.25) return false;
    }
    return true;
  };
  if (!goTo(24.5, 7.5)) return fail;                 // the passage beside the foot: safe
  let y = 7, waited = 0; const waits = [];
  const stops = [...ALCOVES, 19];
  for (const next of stops) {
    // at a safe spot: wait until the stretch to the next safe spot is clear
    if (!blind) {
      let guard = 0;
      let w = 0;
      while (!clear(y, next, next === 19 ? 0.6 : 0.5) && guard++ < 600) { if (!wait(0.05)) return fail; waited += 0.05; w += 0.05; }
      waits.push(`${y === 7 ? '(24,7)' : `(26,${y})`} ${w.toFixed(1)}`);
    }
    if (y === 7) { if (!goTo(25.5, 7.5)) return fail; }
    else if (!blind) { if (!goTo(25.5, y + 0.5)) return fail; }   // step out of the alcove
    for (let yy = y + 1; yy <= next; yy++) if (!goTo(25.5, yy + 0.5, 2)) return fail;
    if (next !== 19 && !blind) { if (!goTo(26.5, next + 0.5)) return fail; }   // duck into the alcove
    y = next;
  }
  if (!goTo(25.5, 20.5)) return fail;                // the top turn, out of the boulder's reach
  if (!goTo(24.5, 20.5) || !goTo(23.5, 20.5)) return fail;
  const tStair = g.time - t0;
  // on through the darts (22,20) (21,20) to the door (19,20): go just after the far slot (21,20)
  // fires (its phase is 0.5); the near slot (22,20) fires 1.2 s later, when you are past it
  const darts = g.ents.filter(e => e.type === 'darts');
  if (!blind) {
    let guard = 0; const phase = t => ((t / 2.4 + 0.5) % 1);
    while (!(phase(g.time) > 0.0 && phase(g.time) < 0.04) && guard++ < 1200) if (!wait(DT)) return fail;
  }
  if (!goTo(22.5, 20.5) || !goTo(21.5, 20.5) || !goTo(20.5, 20.5)) return fail;
  stats.push({ tStair, waited, total: g.time - t0 });
  return `ok: stair ${f2(tStair)} s (waits ${waits.join(', ')}), to the door ${f2(g.time - t0)} s` + (darts.length ? '' : ' (no darts?)');
}

let allOk = true;
for (const [label, opts] of [['running', { run: true }], ['walking (Shift)', { run: false }]]) {
  const stats = [];
  console.log(`${label}:`);
  for (let k = 0; k < 12; k++) {
    const t0 = 0.5 + k * 0.5;
    const r = trial(t0, Object.assign({ stats }, opts));
    if (!r.startsWith('ok')) allOk = false;
    console.log(`  start t=${f2(t0)}: ${r}`);
  }
  if (stats.length) console.log(`  -> ${stats.length}/12 unhurt; stair ${f2(Math.min(...stats.map(s => s.tStair)))}..${f2(Math.max(...stats.map(s => s.tStair)))} s`);
}
const blindStats = [];
let hits = 0;
for (let k = 0; k < 12; k++) { const r = trial(0.5 + k * 0.5, { run: true, blind: true, stats: blindStats }); if (!r.startsWith('ok')) hits++; }
console.log(`control, running blind up the stair (no waiting, no ducking): hurt or killed ${hits}/12`);
console.log(allOk ? 'PASS: the dart stair is crossed unhurt from every start moment' : 'FAIL');
process.exit(allOk ? 0 : 1);
