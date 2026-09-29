#!/usr/bin/env node
/*
 * Real-physics proofs for the Forge after the review fixes (the level file as it is; the
 * real Game at the fixed 120 Hz step, keyboard-style inputs, all hazards on). Boulders now
 * follow the floor in Game.update, so nothing here emulates the renderer.
 *   node forge_proofs.js            (the Bellows corridor has its own script: bellows_proof.js)
 */
'use strict';
const R = require('../load.js').load();
const U = R.util, DT = R.PHYSICS_DT;
const camp = R.campaigns.get('hourglass');
const lv = camp.levels.find(l => l.id === 'forge');

function game(t0 = 0) {
  const c = Object.assign({}, camp); Object.defineProperty(c, 'levels', { value: [lv] });
  const log = [];
  const g = new R.Game(c, { msg: t => log.push(t) });
  g.log = log;
  if (t0) { g.player.alive = false; for (let t = 0; t < t0 - 1e-9; t += DT) g.update(DT, null); g.player.alive = true; }
  return g;
}
const f2 = v => v.toFixed(2);
let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) { pass++; console.log(`  ok   ${name}  ${detail || ''}`); } else { fail++; console.log(`  FAIL ${name}  ${detail || ''}`); } }
const step = (g, inp) => g.update(DT, inp);
function until(g, cond, ctl, max = 30) {
  for (let t = 0; t < max; t += DT) { if (cond(g)) return true; step(g, (ctl && ctl(g)) || {}); if (!g.player.alive) return cond(g); }
  return cond(g);
}
function wait(g, secs, ctl) { for (let t = 0; t < secs; t += DT) step(g, (ctl && ctl(g)) || {}); }
const face = (g, dir) => { g.player.ang = U.dirAngle(dir); };
function moveTo(g, dir, target, run = false) {
  face(g, dir);
  const ax = dir === 'E' || dir === 'W' ? 'x' : 'y', s = dir === 'E' || dir === 'S' ? 1 : -1;
  const ok = until(g, g => (g.player[ax] - target) * s >= 0, () => ({ fwd: 1, run }), 20);
  until(g, g => Math.hypot(g.player.vx, g.player.vy) < 0.05, () => ({}), 2);
  return ok;
}
/** Walk (or run) through cell centres, stopping at the last. */
function path(g, pts, run = false) {
  for (let i = 0; i < pts.length; i++) {
    const tx = pts[i][0] + 0.5, ty = pts[i][1] + 0.5, last = i === pts.length - 1;
    for (let t = 0; t < 6; t += DT) {
      g.player.ang = Math.atan2(ty - g.player.y, tx - g.player.x);
      step(g, { fwd: 1, run });
      if (!g.player.alive) return false;
      if (Math.hypot(tx - g.player.x, ty - g.player.y) < (last ? 0.25 : 0.4)) break;
    }
  }
  wait(g, 0.4);
  return g.player.alive;
}
function toEdge(g, dir) { face(g, dir); until(g, g => g.player.edgeStop, () => ({ fwd: 1, careful: true }), 10); wait(g, 0.1, () => ({ careful: true })); }
function standJump(g, hold = false) {
  step(g, { jump: true, fwd: 1 });
  until(g, g => !g.player.onGround, () => ({ fwd: 1 }), 0.5);
  until(g, g => (g.player.onGround && !g.player.act) || !g.player.alive, () => (hold ? { fwd: 1 } : {}), 3);
  wait(g, 0.35, () => ({}));
}
const where = g => { const p = g.player; return `(${f2(p.x)},${f2(p.y)} z${f2(p.z)}) life ${p.life} alive ${p.alive}`; };
const cellIs = (g, x, y, z) => { const p = g.player; return Math.floor(p.x) === x && Math.floor(p.y) === y && Math.abs(p.z - z) < 0.06 && p.alive; };
const spanAtCell = (g, x, y, z) => R.spanAt(g.world.cellAt(x, y), z + 0.01) || R.spanBelow(g.world.cellAt(x, y), z + 0.01);
const phase = (g, period, ph) => U.mod(g.time / period + ph, 1);
const liftSpan = (g, x, y) => g.world.cellAt(x, y).spans.find(s => s.anim && s.anim.type === 'lift');

// ------------------------------------------------------------------ 4.1
console.log('4.1 the Glow: the flagstone falls; the hang-drop from the hint cell (15,13)');
{
  const g = game();
  g.teleport(11.5, 12.5, 4.5, 'E');
  const flag = g.spansTagged('flag')[0];
  moveTo(g, 'E', 14.6);
  wait(g, 2.5);
  const tile = g.ents.find(e => e.type === 'fallingTile');
  check('passing (14,12) crumbles the flagstone (16,11) into the lava (g.crumble, logged)', flag.loose.state === 'fallen' && tile && tile.landed && g.events.some(e => e[0] === 'drop') && g.log.some(t => /swallows/.test(t)),
    `state ${flag.loose.state}, rubble at z ${tile ? f2(tile.z) : '-'}, messages: ${g.log.join(' | ')}`);
  const h = game();
  h.teleport(15.5, 12.5, 4.5, 'S');
  moveTo(h, 'S', 13.3);
  const hinted = h.log.some(t => /Hold C/.test(t));
  toEdge(h, 'S');
  h.update(DT, { careful: true }); wait(h, 0.05, () => ({ careful: true }));
  wait(h, 0.8, () => ({ fwd: 1, careful: true }));
  const hanging = h.player.act && h.player.act.kind === 'hang';
  wait(h, 0.3, () => ({ careful: true }));
  wait(h, 1.5, () => ({}));
  check('the hint fires at (15,13); hang, let go: land on the shelf at (15,14), 4 cells from the lava edge', hinted && hanging && cellIs(h, 15, 14, 1.5) && h.player.life === 3, where(h));
}

// ------------------------------------------------------------------ 4.3
console.log('4.3 chain lifts (lift anim, 2.4 s dwell): ride lift A, the lever, the jump to B, the gallery flags');
{
  const g = game();
  g.teleport(47.5, 24.5, 0, 'N');
  const A = liftSpan(g, 47, 22);
  // arrive just as it leaves the bottom, the worst case: wait for the next dwell
  until(g, g => A.fl > 0.05, () => ({}), 20);
  until(g, g => A.fl < 0.001, () => ({}), 20);
  const tDwell = g.time;
  moveTo(g, 'N', 22.5);
  const tBoard = g.time - tDwell, boarded = cellIs(g, 47, 22, 0) && tBoard < 2.4;
  until(g, g => A.fl > 4.499, () => ({}), 15);
  const topZ = g.player.z;
  moveTo(g, 'N', 21.5);
  check('board lift A during its bottom dwell, ride S0 -> S3, step off during the top dwell', boarded && Math.abs(topZ - 4.5) < 0.02 && cellIs(g, 47, 21, 4.5) && g.player.life === 3, `boarded ${f2(tBoard)} s into the 2.4 s dwell; ${where(g)}`);
  moveTo(g, 'W', 38.5);
  face(g, 'N'); step(g, { use: true }); wait(g, 0.2);
  const B = g.spansTagged('liftB')[0];
  until(g, g => B.fl >= 4.5 - 1e-6, () => ({}), 10);
  moveTo(g, 'W', 37.5);
  toEdge(g, 'N');
  standJump(g);
  check('the lever raises B; standing jump from the balcony over the lava onto B', Math.abs(B.fl - 4.5) < 1e-6 && cellIs(g, 37, 19, 4.5) && g.player.life === 3, where(g));
  moveTo(g, 'N', 10.5);
  const fallen = [13, 14, 15].map(y => spanAtCell(g, 37, y, 4.5)).filter(s => !s || !s.loose || s.loose.state !== 'idle').length;
  check('walk north along the gallery over the cracked flags (37,13..15): they fall behind you', cellIs(g, 37, 10, 4.5) && g.player.life === 3, `${where(g)}; ${fallen} of 3 flags gone`);
  // stopping on a cracked flag is death in the lava
  const s = game();
  s.teleport(37.5, 16.5, 4.5, 'N');
  moveTo(s, 'N', 14.5);
  wait(s, 2.0);
  check('stopping on a cracked flag drops you into the lava', !s.player.alive, `${where(s)} ${s.deathCause || ''}`);
  // if the flags fall before you cross, a running jump catches the far lip (the solver's way back)
  const c = game();
  for (const y of [13, 14, 15]) c.dropFloor(spanAtCell(c, 37, y, 4.5), true);
  c.teleport(37.5, 18.5, 4.5, 'N');
  let pressed = false;
  until(c, c => (c.player.onGround && !c.player.act && c.player.y < 12.9) || !c.player.alive, c => { const i = { fwd: 1, run: true }; if (!pressed && c.player.y < 16.4) { pressed = true; i.jump = true; } return i; }, 6);
  wait(c, 0.5);
  check('with the flags gone, a running jump from (37,16) catches the lip of (37,12) and pulls up', cellIs(c, 37, 12, 4.5) || cellIs(c, 37, 11, 4.5), where(c));
}

// ------------------------------------------------------------------ 4.4
console.log('4.4 slag stones: sinkers at phases 0.25 / 0.625');
function slagRun(waitOnSinker, t0) {
  const g = game(t0);
  g.teleport(27.5, 2.5, 4.5, 'W');
  for (const x of [25, 23, 21, 19, 17, 15, 13]) {
    toEdge(g, 'W');
    const t = spanAtCell(g, x, 2, 4.5);
    if (t.anim && t.anim.type === 'cycle') until(g, g => { const p = phase(g, 4.8, t.anim.phase); return p >= 0.25 && p < 0.30; }, () => ({ careful: true }), 6);
    standJump(g);
    if (!cellIs(g, x, 2, 4.5)) return { g, ok: false, at: x };
    if (waitOnSinker && t.anim && t.anim.type === 'cycle') { wait(g, 5); return { g, ok: g.player.alive, at: x }; }
  }
  return { g, ok: true };
}
{
  let ok = 0; const n = 8;
  for (let k = 0; k < n; k++) { const r = slagRun(false, 0.6 * k); if (r.ok && r.g.player.life === 3) ok++; }
  check('cross the six stones, jumping onto each sinker just after it surfaces (8 arrival moments)', ok === n, `${ok}/${n}`);
  const w = slagRun(true, 0);
  check('waiting on a sinking stone kills you', !w.ok && !w.g.player.alive, `${where(w.g)} ${w.g.deathCause || ''}`);
  const g = game(0.2);
  g.teleport(32.5, 2.5, 4.5, 'W');
  wait(g, 2.2);
  check('the practice sinker lowers you into the cooled pit, unhurt', g.player.alive && g.player.life === 3 && g.player.z < 3.05, where(g));
}

// ------------------------------------------------------------------ 4.5
console.log('4.5 the ore chute: one boulder every 4.8 s at 3 u/s');
function chute(plan, runFast, t0 = 20) {
  const g = game(t0), p = g.player, b = g.ents.find(e => e.type === 'patrol');
  g.teleport(9.5, 8.5, 4.5, 'W');
  const past = (y, d) => { let prev = b.y; until(g, () => { const hit = prev <= y && b.y > y && b.x > 7.5; prev = b.y; return hit; }, () => ({}), 8); wait(g, d); return p.life === 3; };
  for (const [k, a, d] of plan) { if (k === 'wait' && !past(a, d)) return g; if (k === 'go' && !path(g, a, runFast)) return g; if (p.life < 3) return g; }
  return g;
}
const straightPts = [[8, 8], [8, 7], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [9, 2]];
const toAlcove = [[8, 8], [8, 7], [8, 6], [8, 5], [7, 5], [6, 5]], fromAlcove = [[7, 5], [7, 4], [7, 3], [7, 2], [8, 2], [9, 2]];
{
  let ok = 0; const ds = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  for (const d of ds) { const g = chute([['wait', 9.3, d], ['go', toAlcove], ['wait', 6.4, 0.2], ['go', fromAlcove]], false); if (cellIs(g, 9, 2, 6.0) && g.player.life === 3) ok++; }
  check('walk up by the west alcove: set off 0..1.0 s after a boulder passes the entry, wait in (6,5) for the next', ok === ds.length, `${ok}/${ds.length}`);
  let straight = 0;
  for (let d = 0; d < 4.8; d += 0.2) { const g = chute([['wait', 9.3, d], ['go', straightPts]], false); if (cellIs(g, 9, 2, 6.0) && g.player.life === 3) straight++; }
  check('walking straight up without the alcove fails at every moment (the dodge is needed)', straight === 0, `${straight}/24 got through`);
  // the gem at the tunnel's dead end, for a runner: from the exit alcove, after a boulder has turned down the chute
  const g = game(20), b = g.ents.find(e => e.type === 'patrol');
  g.teleport(9.5, 2.5, 6.0, 'W');
  let prev = b.y; until(g, () => { const hit = prev <= 3.4 && b.y > 3.4; prev = b.y; return hit; }, () => ({}), 8);
  const gem = g.ents.find(e => e.type === 'item' && e.spec.item === 'gem' && Math.floor(e.x) === 4 && Math.floor(e.y) === 1);
  path(g, [[8, 2], [8, 1], [7, 1], [6, 1], [5, 1], [4, 1]], true);
  path(g, [[5, 1], [6, 1], [7, 1], [8, 1], [8, 2], [9, 2]], true);
  check('a runner fetches the tunnel gem (4,1) between boulders', gem.gone && cellIs(g, 9, 2, 6.0) && g.player.life === 3, where(g));
}

// ------------------------------------------------------------------ 4.6
console.log('4.6 the causeway, the anvil lift, the hammers, the key, the leap');
{
  const g = game();
  g.teleport(14.5, 7.5, 6.0, 'E');
  for (const x of [16, 18, 20]) {
    const v = g.ents.find(e => e.type === 'trap' && Math.floor(e.x) === x && Math.floor(e.y) === 7);
    until(g, g => { const p = phase(g, 2.4, v.spec.phase); return p >= 0.38 && p < 0.42; }, () => ({}), 5);
    moveTo(g, 'E', x + 1.35);
  }
  const pil = liftSpan(g, 23, 7);
  moveTo(g, 'E', 22.5);
  until(g, g => pil.fl > 5.999, () => ({}), 20);
  moveTo(g, 'E', 23.5);
  until(g, g => pil.fl < 1.501, () => ({}), 12);
  moveTo(g, 'E', 24.5);
  check('cross the flame causeway, board the anvil lift in its top dwell, ride it down to the plaza', cellIs(g, 24, 7, 1.5) && g.player.life === 3, where(g));
  const h = game();
  h.teleport(27.5, 9.5, 1.5, 'S');
  const h1 = spanAtCell(h, 27, 11, 1.5), h2 = spanAtCell(h, 27, 13, 1.5);
  until(h, h => { const p = phase(h, 3.6, h1.anim.phase); return p > 0.55 && p < 0.6; }, () => ({}), 8);
  moveTo(h, 'S', 12.3);
  until(h, h => { const p = phase(h, 3.6, h2.anim.phase); return p > 0.55 && p < 0.6; }, () => ({}), 8);
  moveTo(h, 'S', 14.5);
  path(h, [[29, 14], [29, 15]]);
  const lit = h.ents.find(e => e.type === 'checkpoint' && Math.floor(e.x) === 29 && Math.floor(e.y) === 15).lit;
  path(h, [[29, 14], [26, 14], [25, 14]]);
  face(h, 'S'); wait(h, 0.8, () => ({ fwd: 1 })); wait(h, 0.3);
  check('under both hammers, light C6 at (29,15), walk up to the Great Anvil for the Silver Key', lit && h.has('key_silver') && h.player.life === 3 && h.player.y > 15, `${where(h)}; messages: ${h.log.slice(-3).join(' | ')}`);
  // every leap from the yard's south edge, standing and running
  const bad = [];
  for (const x of [24, 26, 27, 28, 29, 30]) {
    const s = game();
    s.teleport(x + 0.5, 15.5, 1.5, 'S');
    toEdge(s, 'S'); standJump(s, true); wait(s, 0.5);
    if (!(s.player.alive && s.player.life === 3 && Math.abs(s.player.z) < 0.05 && s.player.y >= 19 && s.player.y < 23)) bad.push(`standing x=${x}: ${where(s)}`);
    const r = game();
    r.teleport(x + 0.5, 14.3, 1.5, 'S');
    let pressed = false;
    until(r, r => (r.player.onGround && !r.player.act && r.player.z < 0.05) || !r.player.alive, r => { const i = { fwd: 1, run: true }; if (!pressed && r.player.y > 15.6) { pressed = true; i.jump = true; } return i; }, 5);
    wait(r, 0.8);
    if (!(r.player.alive && r.player.life === 3 && Math.abs(r.player.z) < 0.05)) bad.push(`running x=${x}: ${where(r)} ${r.deathCause || ''}`);
    else if (r.player.y > 22.5) bad.push(`running x=${x} slid on to y=${f2(r.player.y)}`);
  }
  check('every standing and running leap south from the yard (x 24, 26..30) lands on the casting floor unhurt', bad.length === 0, bad.join('; '));
}

// ------------------------------------------------------------------ the Vizier's lift
console.log("the Vizier's lift (24 s round, 2.4 s dwell) and the slot gem");
{
  const g = game();
  g.give('key_silver', { silent: true });
  g.teleport(13.5, 19.5, 1.5, 'W');
  face(g, 'W'); step(g, { use: true }); wait(g, 1.2);
  moveTo(g, 'W', 11.5);
  const X = liftSpan(g, 11, 18);
  until(g, g => X.fl < 1.501, () => ({}), 26);
  moveTo(g, 'N', 18.5);
  until(g, g => X.fl > 7.499, () => ({}), 15);
  face(g, 'W');
  until(g, g => g.levelDone, () => ({ fwd: 1 }), 3);
  check('open the silver door, ride the lift to the top in one go, step into the exit', g.levelDone, where(g));
  const n = game();
  n.teleport(10.5, 19.5, 1.5, 'W');
  const note = n.ents.find(e => e.type === 'note' && /Master of the Forge/.test(e.spec.text || ''));
  step(n, { use: true });
  check("Qasim's order lies in his chamber (9,19)", !!note && Math.floor(note.x) === 9 && Math.floor(note.y) === 19);
  // mid-ride: step off east onto the slot ledge at 4.5, fetch the gem, get back on as it passes
  const m = game();
  m.teleport(11.5, 19.5, 1.5, 'N');
  const Y = liftSpan(m, 11, 18);
  until(m, m => Y.fl < 1.501, () => ({}), 26);
  moveTo(m, 'N', 18.5);
  until(m, m => Y.fl > 4.40, () => ({}), 15);
  face(m, 'E');
  until(m, m => Math.floor(m.player.x) === 12 && m.player.onGround, () => ({ fwd: 1 }), 2);
  wait(m, 0.3);
  const offOk = cellIs(m, 12, 18, 4.5);
  path(m, [[12, 17], [12, 16]]);
  const gotGem = !m.ents.some(e => e.type === 'item' && e.spec.item === 'gem' && Math.floor(e.x) === 12 && Math.floor(e.y) === 16 && !e.gone);
  path(m, [[12, 17], [12, 18]]);
  face(m, 'W');
  // the lift comes back past 4.5 on its way down: step on while it is within a step of the ledge
  until(m, m => Y.fl < 4.5 + 0.2 && Y.fl > 4.5 - 0.2 && Y.fl < Y.baseFl + 5.9, () => ({}), 30);
  until(m, m => Math.floor(m.player.x) === 11 || !m.player.alive, () => ({ fwd: 1 }), 1.5);
  wait(m, 0.2);
  const onLift = Math.floor(m.player.x) === 11 && m.player.alive;
  until(m, m => Y.fl < 1.501, () => ({}), 15);
  until(m, m => Y.fl > 7.499, () => ({}), 26);
  face(m, 'W');
  until(m, m => m.levelDone, () => ({ fwd: 1 }), 3);
  check('mid-ride: step off onto the slot ledge, take the gem (12,16), step back on as the lift passes, ride on to the exit', offOk && gotGem && onLift && m.levelDone && m.player.life === 3, `off ${offOk} gem ${gotGem} back on ${onLift} ${where(m)}`);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
