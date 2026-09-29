// A full playthrough of the chasm with real physics and keyboard-style inputs only (no teleports).
'use strict';
const R = require('../load.js').load();
const camp = R.campaigns.get('hourglass'), lv = R.levels.get('chasm'), DT = R.PHYSICS_DT, U = R.util;
const c = Object.assign({}, camp); Object.defineProperty(c, 'levels', { value: [lv] });
const log = [];
const g = new R.Game(c, { msg: t => log.push(`[${g.time.toFixed(1)}] ${t}`) });
const p = g.player;
const f2 = v => v.toFixed(2);
const where = () => `t=${g.time.toFixed(1)} (${f2(p.x)},${f2(p.y)}) z=${f2(p.z)} life=${p.life} alive=${p.alive}`;
let failed = false;
function step(inp) { if (g.levelDone) throw new Error('DONE'); g.update(DT, inp || {}); if (!p.alive && !failed) { failed = true; throw new Error('died: ' + where()); } }
function idle(secs) { for (let t = 0; t < secs; t += DT) step({}); }
function turnTo(dir) {
  const target = U.dirAngle(dir);
  for (let i = 0; i < 400; i++) {
    const d = U.angDiff(p.ang, target);
    if (Math.abs(d) < 0.03) break;
    step({ turn: Math.sign(d) });
  }
  p.ang = target;
}
/** run (or walk) along the facing axis until the coordinate passes `to` */
function go(to, opts = {}) {
  const ax = Math.abs(Math.cos(p.ang)) > 0.5 ? 'x' : 'y';
  const sgn = ax === 'x' ? Math.sign(Math.cos(p.ang)) : Math.sign(Math.sin(p.ang));
  for (let i = 0; i < 2400; i++) {
    const v = p[ax];
    if ((v - to) * sgn >= 0 && p.onGround && !p.act) break;
    step({ fwd: 1, run: opts.walk ? false : true });
  }
  if (opts.stop !== false) for (let i = 0; i < 60 && Math.hypot(p.vx, p.vy) > 0.05; i++) step({});
}
function carefulToEdge() {
  for (let i = 0; i < 600 && !p.edgeStop; i++) step({ fwd: 1, careful: true });
  for (let i = 0; i < 12; i++) step({ careful: true });
}
function standingJump() { step({ jump: true, fwd: 1 }); for (let i = 0; i < 160; i++) step({}); }
function climb() { step({ jump: true, fwd: 1 }); for (let i = 0; i < 140; i++) step({}); }
/** run along the facing and press SPACE when the axis coordinate passes `at`; stop once past `landed` */
function runJump(at, landed) {
  const ax = Math.abs(Math.cos(p.ang)) > 0.5 ? 'x' : 'y';
  const sgn = ax === 'x' ? Math.sign(Math.cos(p.ang)) : Math.sign(Math.sin(p.ang));
  let pressed = false;
  for (let i = 0; i < 1200; i++) {
    if (pressed && p.onGround && !p.act && (p[ax] - landed) * sgn > 0) break;
    const inp = { fwd: 1, run: true };
    if (!pressed && (p[ax] - at) * sgn > 0) { pressed = true; inp.jump = true; }
    step(inp);
  }
  for (let i = 0; i < 60 && Math.hypot(p.vx, p.vy) > 0.05; i++) step({});
}
function hang() {
  carefulToEdge();
  for (let i = 0; i < 12; i++) step({ careful: true });
  for (let i = 0; i < 80; i++) step({ fwd: 1, careful: true });   // press forward again: lower into a hang
  for (let i = 0; i < 30; i++) step({ careful: true });
  for (let i = 0; i < 180; i++) step({});                         // let go
}
const marks = [];
const lit = () => g.ents.filter(e => e.type === 'checkpoint' && e.lit).map(e => `(${e.x0},${e.y0})`).join(' ');
const mark = name => { marks.push([name, g.time]); console.log(`  ${g.time.toFixed(1).padStart(6)} s  ${name.padEnd(58)} ${where()}`); };
try {
  mark('start in the tunnel');
  go(5.6);                                   mark('onto the balcony (the lip falls)');
  turnTo('S'); go(12.5); turnTo('E');
  go(8.2);                                   mark('walked off onto the S3 ledge');
  hang();                                    mark('hang-dropped onto the wide ledge');
  carefulToEdge();                           mark('walked east to the causeway lip; lit: ' + lit());
  standingJump();                            mark('1-gap -> pier A');
  runJump(18.3, 20.8);                       mark('2-gap -> pier B');
  runJump(23.3, 27.2);                       mark('3-gap catch -> the landing');
  turnTo('S'); go(13.5); turnTo('E'); go(29.5);
  while (U.mod(g.time, 3.6) < 0.95 || U.mod(g.time, 3.6) > 1.3) step({});   // go when the second rock lands
  mark('watched the rocks; go');
  go(38.5);                                  mark('crossed the rockfall ledge');
  turnTo('S'); go(14.5); climb();            mark('climbed onto the bridgehead');
  go(16.0); turnTo('E'); go(40.5); turnTo('N'); mark('at the bridge; lit: ' + lit());
  runJump(11.7, 5.6);                        mark('ran the crumbling bridge');
  turnTo('W'); go(36.4);                     mark('dropped to the north ledge');
  carefulToEdge(); standingJump(); carefulToEdge(); standingJump(); carefulToEdge(); standingJump();
  mark('practice stones');
  turnTo('S'); go(6.5); turnTo('W');
  carefulToEdge();                           mark('at the first abyss stone; lit: ' + lit());
  standingJump();
  for (let i = 0; i < 6; i++) { carefulToEdge(); standingJump(); }
  mark('six stones over the abyss');
  go(13.35); climb();                        mark('climbed to the S2 ledge; lit: ' + lit());
  turnTo('N'); go(5.35); climb();            mark('climbed to the S3 run');
  turnTo('W'); go(10.3); turnTo('E');
  runJump(12.4, 16.1);                       mark('S3 3-gap running catch');
  go(18.65); climb();                        mark('climbed onto the terrace');
  go(27.5);                                  mark('plate, arch, exit');
} catch (e) { if (e.message === 'DONE') mark('EXIT reached'); else console.log('  FAILED:', e.message); }
console.log(`\n  levelDone=${g.levelDone} total ${g.time.toFixed(1)} s, life ${p.life}/${p.maxLife}, gems ${g.persist.gems}, deaths ${g.persist.deaths}`);
console.log('  messages:\n    ' + log.join('\n    '));
