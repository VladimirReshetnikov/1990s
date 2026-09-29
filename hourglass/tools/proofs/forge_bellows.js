#!/usr/bin/env node
/*
 * Proof for the Bellows corridor (4.2), the one route segment replay.js cannot plan in its
 * 1000-trial budget ("FAIL through 17 hazard cells (31,30) -> (47,31)").
 *
 * Real engine, 120 Hz, the level file as it is, all hazards on. One continuous run from the
 * Bellows door (31,30) to the potion (47,31), played like a player who watches the grilles:
 *   - the north lane beside the demonstration vents (33,31) (35,31): just walk;
 *   - the alternating lane (38,31) (40,31): at the safe cell before a vent, walk over it as soon
 *     as its flame dies (both vents share a beat, so you cross one per breath);
 *   - the checkerboard (42..45, 30..32): from each cell, hop to the next one 0.1 s before the
 *     next cell's puff ends (the hop takes ~0.45 s, so you arrive as it goes out);
 *   - then walk out to (46,31) and the potion (47,31).
 * Every departure is shifted by the same reaction error j (early or late), and on top of that by
 * a random per-hop error; the run starts at every moment of the 2.4 s beat. It must arrive unhurt.
 *   node bellows_proof.js
 */
'use strict';
const V = require('../verify.js');
const R = V.R, DT = R.PHYSICS_DT;
const lv = V.camp.levels.find(l => l.id === 'forge');
const PER = 2.4;

function run(T0, j, rnd) {
  const g = V.makeGame(lv, {}), p = g.player;
  g.time = T0 - 3; p.alive = false; for (let t = 0; t < 3 - 1e-9; t += DT) g.update(DT, null); p.alive = true;
  g.teleport(31.5, 30.5, 0, 0);
  Object.assign(p, { invuln: 0 });
  const life0 = p.life;
  const vent = (x, y) => g.ents.find(e => e.type === 'trap' && Math.floor(e.x) === x && Math.floor(e.y) === y);
  const ph = e => ((g.time / PER + e.spec.phase) % 1 + 1) % 1;
  let err = null;
  const tick = inp => { g.update(DT, inp); if (p.life < life0 || !p.alive) { err = err || `hurt at x=${p.x.toFixed(2)} y=${p.y.toFixed(2)} t=${g.time.toFixed(2)}`; return true; } return false; };
  const walkTo = (x, y) => {
    const tx = x + 0.5, ty = y + 0.5;
    for (let t = 0; t < 5; t += DT) { p.ang = Math.atan2(ty - p.y, tx - p.x); if (tick({ fwd: 1 })) return false; if (Math.hypot(tx - p.x, ty - p.y) < 0.3) break; }
    for (let t = 0; t < 0.25; t += DT) if (tick({})) return false;
    return true;
  };
  // wait until vent e's phase (on for [0, duty)) reaches `at` seconds before it goes out (at < 0: after), shifted by the reaction error
  const waitFor = (e, before) => {
    const target = ((e.spec.duty - (before - j - (rnd ? (Math.random() - 0.5) * 0.2 : 0)) / PER) % 1 + 1) % 1;
    let prev = ph(e);
    for (let t = 0; t < 2 * PER; t += DT) {
      if (tick({})) return false;
      const cur = ph(e);
      if ((prev < target && cur >= target) || (prev > cur && (target >= prev || target < cur))) return true;
      prev = cur;
    }
    return true;
  };
  const steps = [
    () => walkTo(32, 30), () => walkTo(33, 30), () => walkTo(34, 30), () => walkTo(35, 30), () => walkTo(36, 30),
    () => walkTo(36, 31), () => walkTo(37, 31),
    () => waitFor(vent(38, 31), -0.05), () => walkTo(38, 31), () => walkTo(39, 31),
    () => waitFor(vent(40, 31), -0.05), () => walkTo(40, 31), () => walkTo(41, 31),
    () => waitFor(vent(42, 31), 0.1), () => walkTo(42, 31),
    () => waitFor(vent(43, 31), 0.1), () => walkTo(43, 31),
    () => waitFor(vent(44, 31), 0.1), () => walkTo(44, 31),
    () => waitFor(vent(45, 31), 0.1), () => walkTo(45, 31),
    () => walkTo(46, 31), () => walkTo(47, 31),
  ];
  for (const s of steps) if (!s()) return { ok: false, note: err };
  const ok = Math.floor(p.x) === 47 && Math.floor(p.y) === 31 && p.life === life0;
  return { ok, note: ok ? `arrived t=${(g.time - T0).toFixed(2)} s after the door` : `ended at (${p.x.toFixed(2)},${p.y.toFixed(2)})` };
}

let fails = 0, total = 0;
for (const j of [-0.15, -0.1, 0, 0.1, 0.15]) {
  let ok = 0, n = 0, worst = 0, firstFail = '';
  for (let s = 0; s < PER - 1e-9; s += 0.1) {
    const r = run(10 + s, j, false);
    n++; if (r.ok) { ok++; worst = Math.max(worst, +r.note.match(/t=([\d.]+)/)[1]); } else if (!firstFail) firstFail = `start +${s.toFixed(1)}: ${r.note}`;
  }
  total += n; fails += n - ok;
  console.log(`reaction ${j >= 0 ? '+' : ''}${j.toFixed(2)} s: ${ok}/${n} start moments get through unhurt${ok ? ` (slowest ${worst.toFixed(1)} s)` : ''}${firstFail ? '  first failure ' + firstFail : ''}`);
}
{
  let ok = 0; const n = 48;
  for (let k = 0; k < n; k++) if (run(10 + (k % 24) * 0.1, 0, true).ok) ok++;
  total += n; fails += n - ok;
  console.log(`random +-0.1 s error on every departure: ${ok}/${n} get through unhurt`);
}
// negative control: walking straight through without waiting burns you
{
  let burnt = 0; const n = 24;
  for (let k = 0; k < n; k++) {
    const g = V.makeGame(lv, {}), p = g.player;
    g.time = 10 + k * 0.1; g.teleport(36.5, 31.5, 0, 0); Object.assign(p, { invuln: 0 });
    for (let t = 0; t < 6 && p.x < 46.5; t += DT) g.update(DT, { fwd: 1 });
    if (p.life < 3 || !p.alive) burnt++;
  }
  console.log(`control: walking straight through from (36,31) without stopping burns you from ${burnt}/${n} start moments`);
}
console.log(fails ? `FAIL: ${fails}/${total} runs hurt` : `ok: all ${total} runs through the Bellows unhurt`);
process.exit(fails ? 1 : 0);
