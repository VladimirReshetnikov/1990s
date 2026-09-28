#!/usr/bin/env node
/*
 * Edge replay:  node tools/replay.js [levelId] [--all] [--quiet] [--calm] [--trace]
 *               node tools/replay.js --selftest
 *
 * Makes the solver's claims (tools/verify.js) trustworthy in the REAL level
 * geometry. The solver relaxes move edges (walk, step, drop, hang-drop, climb,
 * jump, catch, ride a loose floor) between spans; this tool takes each edge and
 * performs it in the real engine at R.PHYSICS_DT with canonical keyboard input:
 *
 *   world      a fresh Game for the level with the state the solver assumed in
 *              that round: keys held (their doors open), gates opened, lifts
 *              moved; exits other than the edge's target are switched off
 *   pose       teleported to the centre of the source cell facing the move
 *              (running jumps: the centre of the run-up cell behind it)
 *   walk/step  Forward at walking speed, released 0.3 before the target centre
 *              (careful steps, C held throughout, when either span has spikes)
 *   drop       walk off the edge (Forward until airborne), then let go
 *   hangdrop   C + Forward to the edge, release, Forward again to lower into a
 *              hang, hang 0.3 s, let go of C
 *   climb      Forward until the ledge is in reach, Space
 *   jump/catch k = 1: careful to the edge, stand, Space + Forward (from a loose
 *              floor, which you cannot stand on: a walking jump); k >= 2: run
 *              from the run-up cell (the one cell the solver requires behind
 *              the take-off), Space 0.6 before the lip (the running jump waits
 *              for the edge); over a floor level with you (fire, lava) there is
 *              no edge, so take off at the lip; Forward held in the air,
 *              released on landing
 *   ride-loose stand still on the loose floor until it drops you
 *
 * The edge passes when the player ends ALIVE, UNHURT and at rest on the target
 * span (a loose target: arrives on it) within the time limit. Overshooting onto
 * a neighbouring span of the same floor is allowed only if walking straight
 * back then lands on the target (reported as "+back").
 *
 * Default: the optimal route (start -> every key / plate / lever that opened
 * something, then start -> exit, each leg in its round's world). --all replays
 * every edge the solver relaxed in every round. Exit code 1 if a route edge
 * fails. --calm removes timed hazards (slicers, darts, rocks, vents, blades,
 * boulders, crushers) to isolate the physics; --trace prints the path of every
 * failing edge; --quiet prints only failures and summaries.
 */
'use strict';
const V = require('./verify.js');
const { R, camp } = V;
const DT = R.PHYSICS_DT;

const LIMIT = 8;                 // seconds of game time per edge
const sid = s => `${s.cell.x},${s.cell.y},${s.cell.spans.indexOf(s)}`;
const spanOf = (g, id) => { const [x, y, i] = id.split(',').map(Number); const c = g.world.cellAt(x, y); return c && c.spans[i]; };
const f2 = v => (+v).toFixed(2);
const where = s => (s ? `(${s.cell.x},${s.cell.y} z${f2(s.fl)})` : '(nowhere)');
const DIRNAME = { '1,0': 'E', '-1,0': 'W', '0,1': 'S', '0,-1': 'N' };
const TIMED = new Set(['slicer', 'darts', 'dart', 'rock', 'trap', 'patrol', 'pendulum', 'orbit']);

function describe(e) {
  const d = e.dir ? DIRNAME[e.dir.join(',')] : '-';
  let k = e.kind;
  if (e.kind === 'jump' || e.kind === 'catch') k += ` k${e.k} ${e.run ? 'run' : 'stand'} dz${e.dz >= 0 ? '+' : ''}${f2(e.dz)}`;
  else if (e.kind !== 'walk' && e.kind !== 'ride-loose') k += ` dz${e.dz >= 0 ? '+' : ''}${f2(e.dz)}`;
  if (e.careful) k += ' careful';
  return `${k} ${d} (${e.from.cell.x},${e.from.cell.y} z${f2(e.z)}) -> (${e.to.cell.x},${e.to.cell.y} z${f2(e.hu)})`;
}
const edgeKey = e => `${e.kind}|${sid(e.from)}|${sid(e.to)}|${e.dir}|${e.k}|${f2(e.z)}|${f2(e.hu)}`;

/** The world as the solver assumed it in a round. */
function applyState(g, st) {
  for (const k of st.inv) g.inv[k] = (g.inv[k] || 0) + 1;
  for (const L of st.lifted) { const s = spanOf(g, `${L.x},${L.y},${L.i}`); if (s) s.fl = s.baseFl = L.fl; }
  for (const s of g.spansWith.door) {
    const d = s.door;
    const ok = d.remote ? st.open.includes(d.group || s.tag) : d.key ? st.inv.includes(d.key) : true;
    if (ok) { d.state = 'open'; d.holdUntil = 0; d.unlocked = true; s.cl = s.doorTop; }
  }
  // a plate whose lift the solver already applied has done its work
  const up = new Set(st.lifted.map(L => `${L.x},${L.y},${L.i}`));
  for (const s of g.spansWith.plate) {
    const tagged = s.plate.lift ? (g.world.tags.get(s.plate.lift.tag) || []) : [];
    if (tagged.length && tagged.every(t => up.has(sid(t)))) s.plate.lifted = true;
  }
}
function calm(g) {
  for (const e of g.ents) if (TIMED.has(e.type)) e.gone = true;
  for (const s of g.spansWith.anim) if (s.anim.type === 'crusher') s.cl = s.baseCl;
  g.spansWith.anim = g.spansWith.anim.filter(s => s.anim.type !== 'crusher');
}

/** Replay one edge; returns { ok, note, secs, trace }. */
function replayEdge(lv, rnd, e, opts = {}) {
  const mov = s => s.anim && (s.anim.type === 'bob' || s.anim.type === 'lift');
  if (mov(e.from) || mov(e.to)) return { skip: true, note: 'moving floor (bob/lift): timing not replayed' };
  let lastMsg = '';
  const g = V.makeGame(lv, { msg: t => { lastMsg = t; } });
  applyState(g, rnd.state);
  if (opts.calm) calm(g);
  const from = spanOf(g, sid(e.from)), to = spanOf(g, sid(e.to));
  // loose ceiling flags the solver knocked down (map them all first: dropping re-indexes a cell's spans)
  for (const u of (rnd.gone || []).map(q => spanOf(g, sid(q)))) if (u && u.loose) g.dropFloor(u, true);
  for (const c of g.world.cells) for (const s of c.spans) if (s !== to) s.exit = false;
  const p = g.player, cfg = g.cfg;
  const [dx, dy] = e.dir || [1, 0];
  const cx = from.cell.x + 0.5, cy = from.cell.y + 0.5;
  const running = (e.kind === 'jump' || e.kind === 'catch') && e.run;
  g.teleport(running ? cx - dx : cx, running ? cy - dy : cy, e.z, Math.atan2(dy, dx));
  Object.assign(p, { invuln: 0, jumpBuf: -1, snapUntil: -1, prevFwd: false, edgeStop: false, lastGround: 0 });
  const life0 = p.life;
  const careful = !!e.careful;
  const toLoose = !!(to.loose && to.loose.state !== 'fallen');
  const along = () => (p.x - cx) * dx + (p.y - cy) * dy;
  // a gap whose floor is level with you (fire, lava) has no edge to stop at or snap to: take off at the lip
  const g1 = e.dir && g.world.cellAt(from.cell.x + dx, from.cell.y + dy), gf = g1 && g.occupy(g1, e.z);
  const flatGap = !!gf && gf.fl >= e.z - cfg.stepUp - 1e-6;
  const here = () => (p.onGround && !p.act ? g.footSpan() : null);
  const trace = [];

  // input programme: phase -> input for this tick (may switch phase)
  let phase, tPhase = 0, airborne = false, back = null, pressed = false;
  const go = ph => { phase = ph; tPhase = 0; };
  const start = {
    walk: 'go', step: 'go', drop: 'go', hangdrop: 'edge', climb: 'approach', 'ride-loose': 'wait',
    jump: running ? 'run' : from.loose ? 'walkup' : 'edge', catch: running ? 'run' : from.loose ? 'walkup' : 'edge',
  }[e.kind];
  go(start);
  const jumpLike = e.kind === 'jump' || e.kind === 'catch';
  function input() {
    switch (phase) {
      case 'go':                                   // walk / step / drop
        if (e.kind === 'drop' && !p.onGround) { go('air'); return {}; }
        if (e.kind !== 'drop' && along() >= 1.0 - (careful ? 0.1 : 0.3)) { go('coast'); return { careful }; }
        return { fwd: 1, careful };
      case 'edge':                                 // careful to the lip
        if (p.edgeStop || (jumpLike && flatGap && along() >= 0.36)) { go(jumpLike ? 'still' : 'pause'); return { careful: !jumpLike }; }   // careful braking: +0.09
        return { fwd: 1, careful: true };
      case 'pause': if (tPhase >= 0.15) go('lower'); return { careful: true };
      case 'lower':                                // Forward again: lower into a hang
        if (!pressed) { pressed = true; return { fwd: 1, careful: true }; }
        if (p.act && p.act.kind === 'hang') go('hang');
        else if (!p.act) go('coast');              // lowered straight onto the floor (or refused)
        return { careful: true };
      case 'hang': if (tPhase >= 0.3) { go('let'); return {}; } return { careful: true };
      case 'let': if (!p.act) go('air'); return {};
      case 'approach':                             // climb
        if (g.tryClimb(true)) { go('act'); return { fwd: 1, jump: true }; }
        return { fwd: 1 };
      case 'still': if (tPhase >= 0.2) { go('air'); return { fwd: 1, jump: true }; } return {};
      case 'walkup': if (along() >= (flatGap ? 0.45 : 0.2)) { go('air'); return { fwd: 1, jump: true }; } return { fwd: 1 };
      case 'run': if (along() >= (flatGap ? 0.45 : 0.5 - 0.6)) { go('air'); return { fwd: 1, run: true, jump: true }; } return { fwd: 1, run: true };
      case 'air':                                  // in flight (or waiting for the edge snap)
        if (p.act) { go('act'); return {}; }
        if (!p.onGround) airborne = true;
        else if (airborne) { go('coast'); return {}; }
        return jumpLike ? { fwd: 1, run: running } : {};
      case 'act': if (!p.act && tPhase > DT * 1.5) go('coast'); return {};
      case 'wait':                                 // ride-loose
        if (!p.onGround) airborne = true;
        else if (airborne) go('coast');
        return {};
      case 'back': {                               // overshot onto a neighbour: walk straight back
        const tx = to.cell.x + 0.5, ty = to.cell.y + 0.5;
        p.ang = Math.atan2(ty - p.y, tx - p.x);
        if (Math.hypot(tx - p.x, ty - p.y) < 0.35) { go('coast'); return { careful }; }
        return { fwd: 1, careful };
      }
      default: return { careful };               // coast
    }
  }
  const settled = () => p.onGround && !p.act && Math.hypot(p.vx, p.vy) < 0.05 && p.lock <= 0;
  const result = (ok, note) => ({ ok, note, secs: g.time, trace });
  for (let t = 0; t < LIMIT; t += DT) {
    const inp = input();
    g.update(DT, inp);
    tPhase += DT;
    if (opts.trace && Math.round(t / DT) % 6 === 0) trace.push(`t=${f2(t)} ${phase} x=${f2(p.x)} y=${f2(p.y)} z=${f2(p.z)} v=${f2(Math.hypot(p.vx, p.vy))} ${p.onGround ? 'ground' : 'air'}${p.act ? ' ' + p.act.kind : ''}`);
    if (!p.alive) return result(false, `died: ${g.deathCause || lastMsg || '?'} at x=${f2(p.x)} y=${f2(p.y)} z=${f2(p.z)}`);
    if (p.life < life0) return result(false, `hurt: ${lastMsg || '?'} at x=${f2(p.x)} y=${f2(p.y)} z=${f2(p.z)}`);
    const h = here();
    if (h === to && (toLoose || g.levelDone)) return result(true, back ? `+back from ${back}` : '');
    if (phase === 'coast' && settled()) {
      if (h === to) return result(true, back ? `+back from ${back}` : '');
      const hc = h && h.cell;
      if (!back && h && Math.abs(hc.x - to.cell.x) + Math.abs(hc.y - to.cell.y) === 1 && Math.abs(h.fl - to.fl) <= cfg.stepUp + 1e-6) { back = where(h); go('back'); continue; }
      return result(false, `ended on ${where(h)}${back ? ` after stepping back from ${back}` : ''} at x=${f2(p.x)} y=${f2(p.y)}`);
    }
  }
  return result(false, `timeout (${phase}) at x=${f2(p.x)} y=${f2(p.y)} z=${f2(p.z)} ${p.onGround ? 'on ground' : 'in the air'}${p.act ? ' ' + p.act.kind : ''}`);
}

/** Replay a level's route (or all edges); returns { routeFails, fails, ok, skipped, total }. */
function replayLevel(lv, opts = {}) {
  const t0 = Date.now();
  const res = V.solve(V.makeGame(lv), null, { edges: true });
  const legs = V.route(res);
  const routeKeys = new Set();
  const out = { routeFails: 0, fails: 0, ok: 0, skipped: 0, total: 0, back: 0, kinds: {}, res };
  const print = (line, isFail) => { if (!opts.quiet || isFail) console.log(line); };
  const run = (rnd, e, onRoute) => {
    const r = replayEdge(lv, rnd, e, opts);
    out.total++;
    if (r.skip) { out.skipped++; print(`    skip ${describe(e)}  ${r.note}`); return; }
    const kind = e.kind + (e.careful ? ' careful' : '') + ((e.kind === 'jump' || e.kind === 'catch') ? (e.run ? ' run' : ' stand') : '');
    if (r.ok) { out.ok++; out.kinds[kind] = (out.kinds[kind] || 0) + 1; if (r.note) out.back++; print(`    ok   ${describe(e)}  ${f2(r.secs)} s${r.note ? '  ' + r.note : ''}`); return; }
    out.fails++; if (onRoute) out.routeFails++;
    print(`    FAIL ${describe(e)}${onRoute && opts.all ? '  [route]' : ''}  ${r.note}`, true);
    if (opts.trace) for (const line of r.trace) console.log('         ' + line);
  };
  if (!res.exit && !opts.noExit) console.log('  (the solver finds no exit: replaying the legs it has)');
  for (const leg of legs) {
    const rnd = res.rounds[leg.round];
    const fresh = leg.edges.filter(e => { const k = edgeKey(e); if (routeKeys.has(k)) return false; routeKeys.add(k); return true; });
    if (!opts.all) {
      print(`  leg → ${leg.label} (round ${leg.round + 1}): ${leg.edges.length} edges${fresh.length < leg.edges.length ? `, ${leg.edges.length - fresh.length} already replayed` : ''}`);
      for (const e of fresh) run(rnd, e, true);
    }
  }
  if (opts.all) {
    const seen = new Set();
    for (const rnd of res.rounds) {
      const list = rnd.edges.filter(e => { const k = edgeKey(e); if (seen.has(k)) return false; seen.add(k); return true; });
      print(`  round ${rnd.round + 1}: ${list.length} new edges (${rnd.edges.length} relaxed)`);
      for (const e of list) run(rnd, e, routeKeys.has(edgeKey(e)));
    }
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ${opts.all ? 'all edges' : 'route'}: ${out.total} replayed, ${out.ok} ok${out.back ? ` (${out.back} after a step back)` : ''}, ${out.fails} failed${opts.all ? ` (${out.routeFails} on the route)` : ''}${out.skipped ? `, ${out.skipped} skipped` : ''}  [${secs} s]`);
  return out;
}

// ------------------------------------------------------------------ self-test
/**
 * Synthetic gym levels (corridors 3 wide, like tools/physics.js) that between
 * them make the solver relax every kind of edge; all of them must replay. Then
 * negative controls: edges the contract forbids, which the replay must reject
 * (so a green replay means something), and solver rules that must hold.
 */
function gymLevel(id, w, layers, legend = {}) {
  const h = 5, corr = (x, y) => y >= 1 && y <= 3 && x >= 1 && x <= w - 2;
  return {
    id, name: id, width: w, height: h,
    legend: Object.assign({
      '@': { base: '.', start: 'E' }, 'A': { pit: true, abyss: true, cl: 2.75 },
      'H': { base: '.', fl: 0.5, cl: 2.75 }, 'J': { base: '.', fl: 1.5, cl: 2.75 }, 'F': { base: ',', hazard: 'fire' },
    }, legend),
    layers: layers.map(([z, fn]) => ({ z, map: Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (corr(x, y) ? fn(x, y) : '#')).join('')) })),
  };
}
const at = (row, start = true) => (x, y) => (start && x === 1 && y === 2 ? '@' : row[x] === '@' ? ',' : row[x]);
const GYM = [
  ['steps', 14, [[0, at('#,....123333#')]], ['walk', 'step']],
  ['drop', 14, [[0, (x) => (x >= 7 ? '.' : '#')], [1.5, (x, y) => (x >= 7 ? '_' : x === 2 && y === 2 ? '@' : '.')]], ['drop', 'climb', 'jump stand', 'jump run']],
  ['hang', 14, [[0, (x) => (x >= 7 ? '.' : '#')], [1.5, (x) => (x >= 7 ? '_' : '#')], [3, (x, y) => (x >= 7 ? '_' : x === 2 && y === 2 ? '@' : '.')]], ['hangdrop']],
  ['gaps', 22, [[0, at('#,,,,~,,,~~,,,~~~,,,,#')]], ['jump stand', 'jump run', 'catch run']],
  ['up', 17, [[0, at('#,,,,AHHHAAJJJJJ#')]], ['catch stand', 'catch run']],
  ['loose', 14, [[0, () => '.'], [1.5, (x, y) => (x === 7 ? 'o' : x === 2 && y === 2 ? '@' : '.')]], ['ride-loose']],
  ['spikes', 14, [[0, (x, y) => (x === 7 ? '^' : x === 2 && y === 2 ? '@' : '.')]], ['walk careful']],
  ['loosejump', 14, [[0, (x) => (x === 5 ? '~' : '#')], [1.5, at('#,,,,o~,,,,,,#')]], ['jump stand']],
  ['fire', 19, [[0, at('#,,,,,F,,,FF,,,,,,#')]], ['jump stand', 'jump run']],
  // walking off into the pit carries you onto the spikes: only the careful hang-drop reaches x = 7
  ['spikepit', 14, [[0, x => (x === 8 ? '^' : x >= 7 ? '.' : '#')], [1.5, (x, y) => (x >= 7 ? '_' : x === 2 && y === 2 ? '@' : '.')]], ['hangdrop']],
  // a loose tile at the lip of a two-storey shaft (a room under it): you cannot stand on it to hang
  ['loosehang', 14, [[0, x => (x >= 7 ? '.' : '#')], [1.5, x => (x >= 7 ? '_' : x === 6 ? '.' : '#')], [3, (x, y) => (x >= 7 ? '_' : x === 6 ? 'o' : x === 2 && y === 2 ? '@' : '.')]], ['ride-loose']],
  // world state per round: key -> key door -> lever -> gate -> plate lifts a floor -> climb to the exit
  ['state', 18, [[0, (x, y) => (x === 4 && y === 2 ? 'k' : x === 8 && y === 1 ? 'v' : x === 12 && y === 2 ? '=' : at('#@,,,,d,,,|,,lKXX#')(x, y))]], ['climb'], {
    'k': R.HG.item('key_bronze'), 'd': R.HG.keyDoor('key_bronze'), 'v': R.HG.lever({ opens: 'g1' }), '|': R.HG.gate('g1'),
    '=': R.HG.plate({ lift: { tag: 'L1', to: 1.0 } }), 'l': { base: ';', tag: 'L1' },
    'K': { base: '.', fl: 2.2, cl: 3.5 }, 'X': { base: 'K', exit: true, ftex: 'EXIT_FLAT' },
  }],
];
function selftest() {
  let bad = 0;
  const say = (ok, msg) => { if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
  const levels = {};
  for (const [id, w, layers, want, legend] of GYM) {
    const lv = levels[id] = gymLevel(id, w, layers, legend);
    console.log(`\n=== gym: ${id} ===`);
    const out = replayLevel(lv, { all: true, quiet: true, noExit: !legend });
    const kinds = Object.entries(out.kinds).map(([k, n]) => `${k} ${n}`).join(', ');
    say(out.fails === 0, `every edge replays (${kinds})`);
    for (const k of want) say(Object.keys(out.kinds).some(x => x === k || x.startsWith(k + ' ')), `covers ${k}`);
    if (legend) {                                  // a level with an exit: the route replays too, leg by leg
      say(out.res.exit, `solved in ${out.res.rounds.length} rounds: ${out.res.log.join(' | ')}`);
      const r = replayLevel(lv, { quiet: true });
      say(r.fails === 0 && r.total > 0, `the route replays (${r.total} edges)`);
    }
  }
  console.log('\n=== negative controls ===');
  const solved = {};
  const solveGym = id => solved[id] || (solved[id] = V.solve(V.makeGame(levels[id]), null, { edges: true }));
  const edgesOf = id => solveGym(id).rounds.flatMap(r => r.edges);
  /** Take a relaxed edge, change what it claims, and replay the forgery: it must fail. */
  const forged = (id, pick, change, what) => {
    const base = edgesOf(id).find(pick);
    if (!base) return say(false, `${what}: no edge to forge`);
    const r = replayEdge(levels[id], solveGym(id).rounds[base.round], Object.assign({}, base, typeof change === 'function' ? change(base) : change));
    say(!r.ok, `${what} is rejected (${r.ok ? 'it passed!' : r.note})`);
  };
  forged('gaps', e => e.kind === 'jump' && e.run && e.k === 2 && e.dir[0] === 1, { run: false }, 'a standing jump over 2 cells');
  forged('hang', e => e.kind === 'hangdrop', { kind: 'drop' }, 'walking off two storeys');
  forged('up', e => e.kind === 'catch' && e.run && e.k === 2, { run: false }, 'a standing jump up +1.0 across 2 cells');
  forged('spikepit', e => e.kind === 'hangdrop' && e.dir[0] === 1, { kind: 'drop' }, 'walking off into the pit next to the spikes');
  const shaft = (edgesOf('loosehang').find(e => e.from.cell.x === 7 && e.z < 0.1) || {}).from;
  forged('loosehang', e => e.kind === 'ride-loose', b => ({ kind: 'hangdrop', dir: [1, 0], to: shaft, hu: 0, dz: -b.z }), 'a hang-drop from a loose floor');
  // solver rules: spikes only by careful steps; a floor that hurts is never stood on; no hang-drop from a loose floor
  const sp = edgesOf('spikes').filter(e => e.from.cell.x === 7 || e.to.cell.x === 7);
  say(sp.length > 0 && sp.every(e => (e.kind === 'walk' || e.kind === 'step') && e.careful), 'spikes: only careful steps in and out');
  const fire = edgesOf('fire');
  const farSide = [...solveGym('fire').reach.keys()].some(s => s.cell.x === 17);
  say(farSide && !fire.some(e => e.to.hazard) && fire.some(e => e.kind === 'jump'), 'a fire floor is never stood on (it is jumped over)');
  say(!edgesOf('loosehang').some(e => e.kind === 'hangdrop' && e.from.loose), 'no hang-drop from a loose floor');
  say(!edgesOf('spikepit').some(e => e.kind === 'drop' && e.to.cell.x >= 8), 'no walk-off landing on or beside spikes');
  console.log(`\n  self-test ${bad ? `FAILED (${bad})` : 'passed'}`);
  return !bad;
}

module.exports = { replayEdge, replayLevel, applyState, describe, selftest, gymLevel };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  const want = args.find(a => !a.startsWith('--'));
  const opts = { all: args.includes('--all'), quiet: args.includes('--quiet'), calm: args.includes('--calm'), trace: args.includes('--trace') };
  const levels = camp.levels.filter(l => !want || l.id === want);
  if (!levels.length) { console.error(`No level "${want}". Levels: ${camp.levels.map(l => l.id).join(', ')}`); process.exit(2); }
  let bad = false;
  for (const lv of levels) {
    console.log(`\n=== level ${lv.order}: ${lv.id} — ${lv.name} ===`);
    try { if (replayLevel(lv, opts).routeFails) bad = true; } catch (err) { bad = true; console.error('  ERROR:', err.stack || err.message); }
  }
  process.exit(bad ? 1 : 0);
}
