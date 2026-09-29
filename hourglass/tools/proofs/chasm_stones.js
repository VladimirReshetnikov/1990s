// Cross the six abyss stones (or the practice stones) with a canonical careful-edge + standing-jump rhythm,
// starting at different moments; report deaths/hurts.
const path = require('path');
const V = require(path.join(__dirname, '..', 'verify.js'));
const lv = V.camp.levels.find(l => l.id === 'chasm');
const DT = 1/120;
const which = process.argv[2] || 'abyss';
const cfgs = {
  abyss: { x: 29.5, y: 6.5, z: 1.5, stops: [27, 25, 23, 21, 19, 17, 15], y0: 6 },
  practice: { x: 36.5, y: 5.5, z: 1.5, stops: [34, 32, 30], y0: 5 },
};
const C = cfgs[which];
const stillT = +(process.argv[3] || 0.2);
function attempt(delay) {
  let msg = '';
  const g = V.makeGame(lv, { msg: t => { msg = t; } });
  const p = g.player;
  // wind level time
  g.teleport(C.x, C.y, C.z, Math.PI);
  for (let t = 0; t < delay; t += DT) g.update(DT, {});
  const life0 = p.life;
  let hop = 0, phase = 'edge', tp = 0, airborne = false, t = 0;
  const log = [];
  while (t < 60) {
    let inp = {};
    if (phase === 'edge') { if (p.edgeStop) { phase = 'still'; tp = 0; } else inp = { fwd: 1, careful: true }; }
    else if (phase === 'still') { if (tp >= stillT) { phase = 'air'; airborne = false; inp = { fwd: 1, jump: true }; } }
    else if (phase === 'air') {
      if (p.act) { inp = { fwd: 1 }; }
      else if (!p.onGround) { airborne = true; inp = { fwd: 1 }; }
      else if (airborne) { phase = 'settle'; tp = 0; }
      else inp = { fwd: 1 };
    } else if (phase === 'settle') {
      if (tp > 0.15) {
        const cx = Math.floor(p.x);
        log.push(`${cx}@${t.toFixed(1)}(z${p.z.toFixed(2)})`);
        if (cx !== C.stops[hop]) return { ok: false, why: `landed x${cx} expected ${C.stops[hop]}`, log };
        hop++;
        if (hop >= C.stops.length) return { ok: true, t, log };
        // recentre facing W
        p.ang = Math.PI; phase = 'edge'; tp = 0;
      }
    }
    g.update(DT, inp); t += DT; tp += DT;
    if (!p.alive) return { ok: false, why: `died (${g.deathCause || msg}) at x=${p.x.toFixed(2)} z=${p.z.toFixed(2)} hop ${hop}`, log };
    if (p.life < life0) return { ok: false, why: `hurt (${msg}) at x=${p.x.toFixed(2)} hop ${hop}`, log };
  }
  return { ok: false, why: 'timeout ' + phase, log };
}
let okc = 0, n = 0;
for (let d = 0; d < 4.8; d += 0.15) {
  const r = attempt(d); n++; if (r.ok) okc++;
  console.log(`start +${d.toFixed(2)}s: ${r.ok ? 'ok ' + r.t.toFixed(1) + ' s' : 'FAIL ' + r.why}  ${r.log.join(' ')}`);
}
console.log(`${okc}/${n} ok`);
