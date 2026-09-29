// real-physics probes of the fixed cells level (behaviour the solver/replay do not cover)
const V = require('../verify.js');
const { R } = V;
const DT = R.PHYSICS_DT;
const lv = R.levels.get('cells');
function mk() {
  const msgs = [];
  let g = null;
  g = V.makeGame(lv, { msg: t => msgs.push(`[${g ? g.time.toFixed(2) : '0.00'}] ${t}`) });
  g._msgs = msgs;
  return g;
}
const pos = g => { const p = g.player; return `(${p.x.toFixed(2)},${p.y.toFixed(2)} z${p.z.toFixed(2)}) life=${p.life}/${p.maxLife} ${p.alive ? 'alive' : 'DEAD'}`; };
function run(g, secs, inp, until) { for (let t = 0; t < secs; t += DT) { const i = typeof inp === 'function' ? inp(g) : inp; g.update(DT, i || {}); if (until && until(g)) return true; if (!g.player.alive) return false; } return false; }
const ang = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
function tp(g, x, y, z, a) { g.teleport(x, y, z, ang[a]); Object.assign(g.player, { invuln: 0, jumpBuf: -1, snapUntil: -1, prevFwd: false, edgeStop: false, lastGround: g.time }); }
const flagState = (g, x, y, z) => { const c = g.world.cellAt(x, y); const s = c.spans.find(s => s.loose && Math.abs(s.baseFl - z) < 0.1); return s ? s.loose.state : 'fallen'; };
const g2 = g => g.spansWith.door.filter(s => s.tag === 'g2').map(s => s.door.state).join(',');
const lit = g => g.ents.filter(e => e.type === 'checkpoint').map(e => `(${e.x.toFixed(1)},${e.y.toFixed(1)})${e.lit ? ' LIT' : ''}`).join(' ');
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };

// 1. the start: stand still on the flag
{
  const g = mk(); let left = null, minLife = 9;
  run(g, 9, {}, g => { minLife = Math.min(minLife, g.player.life); if (left === null && !g.player.onGround) left = g.time; return false; });
  check(left > 5.9 && left < 6.4 && Math.abs(g.player.z) < 0.01 && minLife === 3, `start flag: leaves the floor at ${left && left.toFixed(2)} s, lands ${pos(g)}, lowest life ${minLife}`);
  console.log('     msgs:', g._msgs.join(' | '));
  // the west wall of the cell is closed now: walk W from the start for 2 s
  const h = mk(); run(h, 2, { fwd: 1, run: true }, null); h.player.ang = ang.W; run(h, 2, { fwd: 1, run: true });
  check(h.player.x > 12.2 && h.player.z > 1.4, `cell west wall: running W stops at ${pos(h)}`);
}
// 2. gallery flag: walk over it, and a running jump over it, then up the stair to the walk
for (const mode of ['walk', 'jump']) {
  const g = mk(); tp(g, 28.5, 5.5, 1.5, 'W');
  if (mode === 'walk') run(g, 4, { fwd: 1 }, g => g.player.x < 22.6);
  else run(g, 3, g => ({ fwd: 1, run: true, jump: g.player.x < 25.3 }), g => g.player.x < 22.8 && g.player.onGround);
  run(g, 1.5, {});
  const st = flagState(g, 24, 5, 1.5);
  console.log(`     ${mode}: ${pos(g)} flag ${st}, g2 ${g2(g)}, eastOpen ${g.flag('eastOpen')}`);
  // on up the stair to the top of the Walk (16,5 z3)
  g.player.ang = ang.W; run(g, 5, { fwd: 1 }, g => g.player.x < 16.6 && g.player.z > 2.9);
  run(g, 0.3, {});
  const warned = g._msgs.some(m => /still shut/.test(m));
  console.log(`     at the walk: ${pos(g)} msgs: ${g._msgs.join(' | ')}`);
  if (mode === 'walk') check(st === 'fallen' && g2(g) !== 'closed' && g.flag('eastOpen') === true && !warned && g._msgs.some(m => /Clang!/.test(m)), 'walk over the gallery flag: it falls, the plate jams, "Clang!" message, eastOpen set, no warning on the walk');
  else check(st === 'idle' && g2(g) === 'closed' && warned, 'running jump over the gallery flag: flag idle, gate shut, the walk warns you');
  // come back to the top of the walk: the warning is not repeated
  if (mode === 'jump') { const n = g._msgs.length; g.player.ang = ang.E; run(g, 0.6, { fwd: 1 }); g.player.ang = ang.W; run(g, 1, { fwd: 1 }); check(g._msgs.length === n, 'the walk warning is given once'); }
}
// 3. ride the gallery flag down into the cage: the plate jams, message + flag; climb out W
{
  const g = mk(); tp(g, 24.5, 5.5, 1.5, 'W');
  run(g, 3, {});
  check(Math.abs(g.player.z) < 0.05 && g.player.life === 3 && g2(g) !== 'closed' && g.flag('eastOpen') === true, `ride the gallery flag: ${pos(g)} g2 ${g2(g)} eastOpen ${g.flag('eastOpen')} msgs: ${g._msgs.join(' | ')}`);
}
// 4. braziers in niches: light them walking past (centre line and hugging either wall); respawn in the niche and walk out
for (const [name, x0, y0, z, dir, off, until] of [
  ['brazier 1 (walk S)', 24.5, 15.5, 0, 'S', [0, -0.25, 0.25], g => g.player.y > 20.4],
  ['brazier 2 (walk W)', 35.5, 5.5, 1.5, 'W', [0, -0.25, 0.25], g => g.player.x < 31.6],
]) {
  for (const o of off) {
    const g = mk(); const horiz = dir === 'W';
    tp(g, x0 + (horiz ? 0 : o), y0 + (horiz ? o : 0), z, dir);
    run(g, 5, { fwd: 1, run: true }, until);
    check(/LIT/.test(lit(g)), `${name}, ${o ? 'hugging a wall ' + o : 'centre line'}: ${lit(g)}`);
  }
}
{
  const g = mk(); tp(g, 24.5, 15.5, 0, 'S'); run(g, 4, { fwd: 1 }, g => g.player.y > 20.4);
  g.kill('probe'); g.respawn();
  const at = pos(g);
  g.player.ang = ang.W; run(g, 1.5, { fwd: 1 }); g.player.ang = ang.S; run(g, 1.5, { fwd: 1 });
  check(/25\.50,18\.50/.test(at) && g.player.x < 25 && g.player.y > 19, `respawn at brazier 1: ${at}, walks out to ${pos(g)}`);
  const h = mk(); tp(h, 35.5, 5.5, 1.5, 'W'); run(h, 3, { fwd: 1 }, g => g.player.x < 32.6);
  h.kill('probe'); h.respawn();
  const at2 = pos(h);
  h.player.ang = ang.S; run(h, 1, { fwd: 1 }); h.player.ang = ang.W; run(h, 2, { fwd: 1 });
  check(/34\.50,4\.50 z1\.50/.test(at2) && h.player.y > 5.2 && h.player.x < 33, `respawn at brazier 2: ${at2}, walks out to ${pos(h)}`);
}
// 5. triggers on the way: the teeth warning (24,20), the hang-drop lesson (15,7)
{
  const g = mk(); tp(g, 24.5, 18.5, 0, 'S'); run(g, 1.5, { fwd: 1 }, g => g.player.y > 21.2);
  check(g._msgs.some(m => /Spikes ahead/.test(m)), `teeth warning fires before the corner: ${g._msgs.join(' | ')}`);
  const h = mk(); tp(h, 15.5, 5.5, 3, 'S'); run(h, 1.5, { fwd: 1 }, g => g.player.y > 7.6);
  check(h._msgs.some(m => /Face the hall/.test(m)), `hang-drop lesson fires by (15,7): ${h._msgs.join(' | ')}`);
  // obey it: face east at (15,7), hold C, step to the edge, Forward again to hang, let go of C
  tp(h, 15.5, 7.5, 3, 'E'); let hung = false;
  run(h, 1.2, { fwd: 1, careful: true }); run(h, 0.2, { careful: true });
  run(h, 1.2, g => { if (g.player.act && g.player.act.kind === 'hang') hung = true; return { fwd: !hung, careful: true }; }, () => hung && false);
  run(h, 3, {});
  check(hung && Math.abs(h.player.z) < 0.05 && h.player.life === 3, `hang-drop from (15,7) as taught: hung ${hung}, ${pos(h)}`);
}
console.log(fails ? `${fails} FAILED` : 'all probes ok');
process.exit(fails ? 1 : 0);
