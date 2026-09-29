// PROOF for the replay's FAIL "through 15 hazard cells (15,21)->(16,7)": the Whispering Gallery can be crossed
// unhurt in the real engine (real level, all hazards live, 120 Hz, keyboard-shaped input: fwd/strafe/turn/run),
// for every moment you might arrive (24 start phases over the 6 s launcher cycle), by the plan the level teaches:
// watch a dart die, dash to the lit alcove (14,18), let the next dart pass, dash to the crossing's side cells under
// the bridge, let the next dart pass, then out by the exit alcove (16,9) into the slot room (16,7).
// Plans: 'strafe' (face north, A/D side-steps: the note's advice), 'steer' (turn while running: Up + Left/Right),
// and both again using the crossing's WEST side cells (14,11..15) instead of the east side.
const V = require('../verify.js');
const lv = V.camp.levels.find(l => l.id === 'blades');
const DT = V.R.PHYSICS_DT;
const angd = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function run(startT, plan, style) {
  let msg = '';
  const g = V.makeGame(lv, { msg: t => { msg = t; } });
  const p = g.player; p.alive = false;
  for (let t = 0; t < startT; t += DT) g.update(DT, null);          // wind the level clock (nobody there)
  p.alive = true; g.teleport(15.5, 22.5, 0, -Math.PI / 2); p.invuln = 0;
  const life0 = p.life;
  const darts = () => g.ents.filter(e => e.type === 'dart' && !e.gone);
  const conds = { none: () => darts().length === 0, passed: y => darts().length > 0 && darts().every(d => d.y > y + 0.6) };
  let i = 0; const t0 = g.time;
  for (let t = 0; t < 40; t += DT) {
    const st = plan[i]; if (!st) break;
    let inp = {};
    if (st.wait) {
      if (conds[st.wait](...(st.args || []))) { i++; continue; }
      if (style === 'steer') { const nx = plan[i + 1]; if (nx && nx.to) { const da = angd(Math.atan2(nx.to[1] - p.y, nx.to[0] - p.x), p.ang); if (Math.abs(da) > 0.05) inp = { turn: Math.sign(da) }; } }
    } else {
      const [tx, ty] = st.to, ex = tx - p.x, ey = ty - p.y, d = Math.hypot(ex, ey);
      if (d < 0.14) { i++; continue; }
      if (style === 'strafe') {                                        // facing north: Up/Down and A/D
        const k = 2.5, vx = Math.max(-1, Math.min(1, ex * k)), vy = Math.max(-1, Math.min(1, ey * k));
        inp = { fwd: -vy, strafe: vx, run: true };
      } else {                                                         // steering: Up + Left/Right while running
        const da = angd(Math.atan2(ey, ex), p.ang);
        inp = Math.abs(da) > 1.0 ? { turn: Math.sign(da) } : { turn: Math.abs(da) > 0.05 ? Math.sign(da) : 0, fwd: Math.min(1, d * 2.5), run: true };
      }
    }
    g.update(DT, inp);
    if (!p.alive || p.life < life0) return { ok: false, why: `${msg} at (${p.x.toFixed(2)},${p.y.toFixed(2)}) step ${i}` };
  }
  return { ok: i >= plan.length, why: 'timeout at step ' + i, T: g.time - t0 };
}
const east = [
  { wait: 'none' }, { to: [15.5, 18.5] }, { to: [14.5, 18.5] },            // a dart has died: dash to the alcove
  { wait: 'passed', args: [18.5] },                                           // the next one goes by
  { to: [15.5, 18.5] }, { to: [15.5, 15.5] }, { to: [16.5, 15.5] }, { to: [16.5, 11.5] },   // to the crossing, east side
  { wait: 'passed', args: [11.5] },
  { to: [15.5, 11.5] }, { to: [15.5, 9.5] }, { to: [16.5, 9.5] }, { to: [16.5, 7.5] },      // past the slots, out by the exit alcove
];
const west = [
  { wait: 'none' }, { to: [15.5, 18.5] }, { to: [14.5, 18.5] },
  { wait: 'passed', args: [18.5] },
  { to: [15.5, 18.5] }, { to: [15.5, 15.5] }, { to: [14.5, 15.5] }, { to: [14.5, 11.5] },   // the crossing, west side
  { wait: 'passed', args: [11.5] },
  { to: [15.5, 11.5] }, { to: [15.5, 9.5] }, { to: [16.5, 9.5] }, { to: [16.5, 7.5] },
];
const smooth = [                                                             // a steering player's line: cut the corners
  { wait: 'none' }, { to: [15.5, 18.6] }, { to: [14.5, 18.5] },
  { wait: 'passed', args: [18.5] },
  { to: [15.3, 17.5] }, { to: [15.5, 15.7] }, { to: [16.5, 15.3] }, { to: [16.5, 11.5] },
  { wait: 'passed', args: [11.5] },
  { to: [15.5, 10.5] }, { to: [15.5, 9.5] }, { to: [16.5, 9.5] }, { to: [16.5, 7.5] },
];
let allOk = true;
for (const [name, plan, style] of [['strafe, east side', east, 'strafe'], ['strafe, west side', west, 'strafe'], ['steer,  east side', east, 'steer'], ['steer,  west side', west, 'steer'], ['steer, smooth line', smooth, 'steer']]) {
  let ok = 0; const Ts = [], fails = [];
  for (let s = 0; s < 6; s += 0.25) { const r = run(s, plan, style); if (r.ok) { ok++; Ts.push(r.T); } else fails.push(`t0=${s.toFixed(2)}: ${r.why}`); }
  if (style === 'strafe' && ok < 24) allOk = false;
  console.log(`${name}: ${ok}/24 start phases unhurt${Ts.length ? `, ${Math.min(...Ts).toFixed(1)}-${Math.max(...Ts).toFixed(1)} s` : ''}${fails.length ? '; fails: ' + fails.join('; ') : ''}`);
}
console.log(allOk ? 'PROOF OK: the taught (strafing) plan crosses the gallery unhurt at every start phase' : 'PROOF FAILED');
process.exit(allOk ? 0 : 1);
