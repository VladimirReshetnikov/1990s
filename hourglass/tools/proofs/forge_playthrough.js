#!/usr/bin/env node
/*
 * The whole Forge, start to exit, in one run of the real Game (120 Hz, keyboard-style inputs,
 * all hazards on), after the review fixes: lifts with dwell, the new boulder, C6 at (29,15),
 * the anvil at the back of its cell. Prints the time of each stage.
 *   node playthrough.js
 */
'use strict';
const R = require('../load.js').load();
const U = R.util, DT = R.PHYSICS_DT;
const camp = R.campaigns.get('hourglass');
const lv = camp.levels.find(l => l.id === 'forge');

function game() {
  const c = Object.assign({}, camp); Object.defineProperty(c, 'levels', { value: [lv] });
  const log = [];
  const g = new R.Game(c, { msg: t => log.push(t) });
  g.log = log;
  return g;
}
const f2 = v => v.toFixed(2);
let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) { pass++; console.log(`  ok   ${name}  ${detail || ''}`); } else { fail++; console.log(`  FAIL ${name}  ${detail || ''}`); } }

function step(g, inp) { g.update(DT, inp); }     // boulders follow the floor in Game.update
/** Step until cond(g) or timeout; ctl(g) gives the input. Returns true if cond met. */
function until(g, cond, ctl, max = 30) {
  for (let t = 0; t < max; t += DT) { if (cond(g)) return true; step(g, (ctl && ctl(g)) || {}); if (!g.player.alive) return cond(g); }
  return cond(g);
}
function wait(g, secs, ctl) { for (let t = 0; t < secs; t += DT) step(g, (ctl && ctl(g)) || {}); }
const face = (g, dir) => { g.player.ang = U.dirAngle(dir); };
/** Walk (or run) along the facing axis until the centre passes the target coordinate on that axis. */
function moveTo(g, dir, target, run = false) {
  face(g, dir);
  const ax = dir === 'E' || dir === 'W' ? 'x' : 'y', s = dir === 'E' || dir === 'S' ? 1 : -1;
  const ok = until(g, g => (g.player[ax] - target) * s >= 0, () => ({ fwd: 1, run }), 20);
  until(g, g => Math.hypot(g.player.vx, g.player.vy) < 0.05, () => ({}), 2);
  return ok;
}
/** Walk along dir and stop close to the target coordinate (walking brakes in ~0.18). */
function goTo(g, dir, target) {
  face(g, dir);
  const ax = dir === 'E' || dir === 'W' ? 'x' : 'y', s = dir === 'E' || dir === 'S' ? 1 : -1;
  until(g, g => (target - g.player[ax]) * s <= 0.17, () => ({ fwd: 1 }), 20);
  until(g, g => Math.hypot(g.player.vx, g.player.vy) < 0.05, () => ({}), 2);
}
/** Careful step toward dir until the edge stops you. */
function toEdge(g, dir) {
  face(g, dir);
  until(g, g => g.player.edgeStop, () => ({ fwd: 1, careful: true }), 10);
  wait(g, 0.1, () => ({ careful: true }));
}
/** Standing jump along the facing, hands off after take-off; wait to land. */
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


// ================================================================== the whole level, start to exit
const g = game();
const marks = [];
const mark = name => { marks.push([name, g.time, g.player.life]); };
const lit = () => g.ents.filter(e => e.type === 'checkpoint' && e.lit).length;
const trap = (x, y) => g.ents.find(e => e.type === 'trap' && Math.floor(e.x) === x && Math.floor(e.y) === y);
const afterVent = (v, lo, hi) => until(g, g => { const p = phase(g, 2.4, v.spec.phase); return p >= lo && p < hi; }, () => ({}), 5);
const anim = (x, y) => g.world.cellAt(x, y).spans.find(s => s.anim);

// 4.1 the glow: catwalk, hang-drop, walk off to the casting floor
moveTo(g, 'E', 15.3, true); mark('catwalk (flag falls)');
goTo(g, 'S', 13.2); toEdge(g, 'S');
wait(g, 0.05, () => ({ careful: true })); wait(g, 0.8, () => ({ fwd: 1, careful: true })); wait(g, 0.2, () => ({ careful: true })); wait(g, 1.2, () => ({}));
mark('hang-drop to the shelf');
moveTo(g, 'S', 21.4, true); wait(g, 0.3);
moveTo(g, 'S', 23.5, true); moveTo(g, 'E', 32.0, true); goTo(g, 'S', 25.5); goTo(g, 'E', 32.2); mark('C1 (casting floor)');
// 4.2 the bellows
goTo(g, 'W', 31.5); moveTo(g, 'S', 30.3, true); moveTo(g, 'E', 36.3, true); goTo(g, 'S', 31.5); goTo(g, 'E', 37.5);
for (const x of [38, 40]) { afterVent(trap(x, 31), 0.38, 0.42); goTo(g, 'E', x + 1.5); }
for (const x of [42, 43, 44, 45, 46]) { const v = trap(x, 31); if (v) afterVent(v, 0.16, 0.20); goTo(g, 'E', x + 0.5); }
mark('bellows crossed');
goTo(g, 'E', 47.5); moveTo(g, 'N', 23.6, true);
// 4.3 chain lifts
const A = anim(47, 22);
until(g, g => A.fl < 0.05, () => ({}), 20); goTo(g, 'N', 22.5); until(g, g => A.fl > 4.49, () => ({}), 15); goTo(g, 'N', 21.5);
mark('lift A up');
moveTo(g, 'W', 38.7, true); goTo(g, 'W', 38.5); face(g, 'N'); step(g, { use: true });
const B = g.spansTagged('liftB')[0];
until(g, g => B.fl >= 4.5 - 1e-6, () => ({}), 10);
goTo(g, 'W', 37.5); toEdge(g, 'N'); standJump(g); mark('jump to lift B');
moveTo(g, 'N', 4.7, true); goTo(g, 'N', 3.5);
// 4.4 slag pools: drop into the practice pit, walk it, climb out; then the six stones
face(g, 'W'); until(g, g => g.player.z < 3.1, () => ({ fwd: 1 }), 3); wait(g, 0.3);
moveTo(g, 'W', 29.8, true); face(g, 'W'); until(g, g => g.player.x < 29.3, () => ({ fwd: 1 }), 2); wait(g, 0.1);
step(g, { jump: true, fwd: 1 }); until(g, g => g.player.onGround && !g.player.act, () => ({}), 3); wait(g, 0.2);
goTo(g, 'W', 28.5); goTo(g, 'N', 2.5); mark('practice pit, C3');
for (const x of [25, 23, 21, 19, 17, 15, 13]) {
  toEdge(g, 'W');
  const t = anim(x, 2);
  if (t && t.anim.type === 'cycle') until(g, g => { const p = phase(g, 4.8, t.anim.phase); return p >= 0.25 && p < 0.30; }, () => ({ careful: true }), 6);
  standJump(g);
}
mark('six slag stones');
// 4.5 the ore chute
goTo(g, 'S', 4.5); moveTo(g, 'W', 11.5, true); goTo(g, 'W', 11.5); moveTo(g, 'S', 8.3, true); goTo(g, 'S', 8.5); goTo(g, 'W', 9.5);
const bould = g.ents.find(e => e.type === 'patrol');
until(g, g => bould.y > 9.3 || bould.y < 5.5, () => ({}), 8);
if (bould.y < 5.5) until(g, g => bould.y > 9.3, () => ({}), 8);
moveTo(g, 'W', 8.3, true); goTo(g, 'N', 5.5); goTo(g, 'W', 6.5);
until(g, g => bould.y > 6.6 && bould.y < 8, () => ({}), 8);
goTo(g, 'E', 7.9); goTo(g, 'N', 2.5); goTo(g, 'E', 9.5); mark('ore chute');
// 4.6 causeway, anvil lift, hammers, key, leap, silver door, the Vizier's lift
moveTo(g, 'E', 11.3, true); goTo(g, 'E', 11.5); moveTo(g, 'S', 7.3, true); goTo(g, 'S', 7.5); goTo(g, 'E', 14.5); mark('C4, causeway door');
for (const x of [16, 18, 20]) { afterVent(trap(x, 7), 0.38, 0.42); goTo(g, 'E', x + 1.5); }
goTo(g, 'E', 22.5);
const N = anim(23, 7);
until(g, g => N.fl > 5.95, () => ({}), 20); goTo(g, 'E', 23.5); until(g, g => N.fl < 1.55, () => ({}), 12); goTo(g, 'E', 25.2); mark('anvil lift down, C5');
goTo(g, 'E', 27.5); goTo(g, 'S', 9.5);
const h1 = anim(27, 11), h2 = anim(27, 13);
until(g, g => { const p = phase(g, 3.6, h1.anim.phase); return p > 0.55 && p < 0.6; }, () => ({}), 8); goTo(g, 'S', 12.5);
until(g, g => { const p = phase(g, 3.6, h2.anim.phase); return p > 0.55 && p < 0.6; }, () => ({}), 8); goTo(g, 'S', 14.6);
goTo(g, 'E', 29.5); goTo(g, 'S', 15.5); goTo(g, 'N', 14.5); goTo(g, 'W', 25.5); goTo(g, 'S', 15.3);
mark('hammers, C6, key ' + (g.has('key_silver') ? 'taken' : 'MISSING'));
goTo(g, 'N', 14.5); goTo(g, 'E', 26.5); goTo(g, 'N', 14.4);
face(g, 'S'); let pressed = false;
until(g, g => g.player.onGround && g.player.z < 0.05 && g.player.y > 18, g => { const i = { fwd: 1, run: true }; if (!pressed && g.player.y > 15.9) { pressed = true; i.jump = true; } return i; }, 5);
wait(g, 0.4); mark('leap to the casting floor');
moveTo(g, 'S', 23.3, true); goTo(g, 'S', 23.5); moveTo(g, 'W', 19.7, true); goTo(g, 'W', 19.5); goTo(g, 'N', 19.5);
face(g, 'W'); step(g, { jump: true, fwd: 1 }); until(g, g => g.player.onGround && !g.player.act, () => ({}), 3);
moveTo(g, 'W', 13.7, true); goTo(g, 'W', 13.5); face(g, 'W'); step(g, { use: true }); wait(g, 0.9);
goTo(g, 'W', 11.5); mark('silver door');
const X = anim(11, 18);
until(g, g => X.fl < 1.55, () => ({}), 26); goTo(g, 'N', 18.5); until(g, g => X.fl > 7.45, () => ({}), 15);
face(g, 'W'); until(g, g => g.levelDone, () => ({ fwd: 1 }), 3);
mark(g.levelDone ? 'EXIT' : 'exit NOT reached');
let prev = 0;
for (const [n, t, life] of marks) { console.log(`  ${t.toFixed(1).padStart(6)} s  (+${(t - prev).toFixed(1).padStart(5)})  life ${life}  ${n}`); prev = t; }
console.log('  braziers lit:', lit(), '(the last lit stays lit)', 'deaths:', g.persist.deaths, 'alive:', g.player.alive, 'life:', g.player.life);
const cps = g.events.filter(e => e[0] === 'lit').length;
console.log('  checkpoints lit along the way:', cps, 'at', g.events.filter(e => e[0] === 'lit').map(e => { const c = g.ents[e[1]]; return `(${Math.floor(c.x)},${Math.floor(c.y)})`; }).join(' '));
