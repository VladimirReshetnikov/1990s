# Hourglass tools

Headless Node scripts (no dependencies) that load the real game into Node and
check it. Run them from `hourglass/`:

| Tool | What it does | When |
| --- | --- | --- |
| `node tools/verify.js [levelId] [--quiet]` | **Solver**: proves every level can be finished without damage using the moves contract; lints | after every level edit |
| `node tools/replay.js [levelId] [--all]` | **Edge replay**: performs the solver's moves in the real engine, one by one | after every level edit (route), before a release (`--all`) |
| `node tools/replay.js --selftest` | proves the replay's own inputs on synthetic levels, and that it rejects impossible moves | after changing `replay.js`, `verify.js` or the physics |
| `node tools/physics.js` | **Moves contract**: both sides of every row of DESIGN.md section 3, on synthetic corridors | after any engine change |
| `node tools/snap.js out.png [...]` | headless screenshot or automap with the real renderer | reviewing a level without a browser |

Every tool exits with code 1 when something fails, so they can be chained:
`node tools/physics.js && node tools/verify.js && node tools/replay.js`.

## How they fit together

```
 engine/game.js  --- the moves contract (header, DESIGN.md section 3) ---
        |                                 |
 physics.js proves the contract     verify.js assumes the contract and
 on synthetic corridors             searches each level with it (edges)
                                          |
                                  replay.js performs every edge in the
                                  real engine, in the real level geometry
```

`physics.js` shows the numbers are right in a clean corridor; `verify.js`
shows a level is finishable *if* each move works where it is used; `replay.js`
closes the gap by checking each move where it is used (walls next to the
landing, a pit one cell further, spikes in reach, a loose floor under you).

## load.js

`require('./load.js').load()` runs the scripts listed in `index.html` in order
inside Node and returns `RetroEngine` (`R`). A level file that throws is
skipped with a warning, so one broken level never stops the tools working on
the others.

## verify.js — the solver

```
node tools/verify.js            # every level
node tools/verify.js cells      # one level
node tools/verify.js --quiet    # without the per-round log
```

For each level: compiles it, runs a monotone Dijkstra over spans (seconds of
optimal play) with the contract's moves, collects keys and relics, presses
plates (a timed gate must be reachable within `1.25 x optimal + 1.5 s <= hold +
0.3`), pulls levers, applies lifts, and repeats in *rounds* until nothing new
opens. It prints the rounds, whether the exit is reachable, unreachable items
(an unreachable key or relic is an error), robustness warnings (a loose floor
falling early, or before a brazier, must not strand you) and lints (heights
within a hair of a contract threshold read ambiguously in play).

The moves (the file header has the exact numbers):

| Edge kind | Meaning |
| --- | --- |
| `walk`, `step` | into the next cell, at most 0.35 up or down (`careful` next to or on spikes) |
| `drop` | walk off an edge at walking speed and let go; the target is where you **come to rest**, from a 1-D simulation of the engine along the axis (you may sail over a narrow pit, slide on, fall again) |
| `hangdrop` | C + Forward to the edge, Forward again to lower into a hang, let go: straight down into the next cell, any drop up to 3.2; never from a loose floor |
| `climb` | Space facing a ledge 0.35..1.75 up, room to pull up |
| `jump`, `catch` | along the axis over k gap cells (k = 1 standing, k >= 2 running, needing the run-up cell behind), landing dz by the table in the header; `catch` ends by catching the lip and pulling up |
| `ride-loose` | stand still on a loose floor until it drops you to the span below |

Other rules: spans with spikes are entered and left only by careful steps;
floors that hurt (fire, acid...) are never stood on; lava and abyss kill.

### As a module

```js
const { solve, route, makeGame } = require('./verify.js');
const g = makeGame(levelDef);                 // a Game with just this level
const res = solve(g, null, { edges: true });  // from the level start
res.exit, res.exitSpan, res.exitTime, res.log
res.rounds[r] = { round, state, reach, pred, edges, goals }
route(res)    // [{ label, round, edges }]: start -> each goal, then start -> exit
```

* `state` is the world the round assumed: `{ inv: [keys], open: [gate tags],
  lifted: [{x, y, i, fl}] }` (`i` = the span's index in its cell).
* `pred` maps a span to the edge that reached it on a shortest path; `goals`
  are the reached spans that opened something (a key, a plate, a lever, rubble
  jamming a plate).
* An edge is `{ kind, from, to, dir: [dx, dy] | null, z, hu, dz, k, run,
  careful, cost, round }`: `z` is the feet height at take-off, `hu` the landing
  floor. `edges` lists every edge relaxed in that round (only with
  `{ edges: true }`).

Requiring the module runs nothing; the command line part is guarded by
`require.main === module`.

## replay.js — edge replay

```
node tools/replay.js cells           # the optimal route of one level
node tools/replay.js                 # the route of every level
node tools/replay.js cells --all     # every edge the solver relaxed, in every round
node tools/replay.js cells --quiet   # only failures and the summary
node tools/replay.js cells --calm    # without timed hazards (physics only)
node tools/replay.js cells --trace   # print the path of each failing edge
node tools/replay.js --selftest
```

For each edge it builds a fresh `Game` for the level in the world state the
solver assumed in that round (keys held and their doors open, gates opened,
lifts moved; exits other than the edge's target switched off), teleports
Aladdin to a canonical pose, and feeds canonical keyboard input at
`R.PHYSICS_DT` (120 Hz):

| Kind | Pose | Input |
| --- | --- | --- |
| walk, step | centre of the source cell, facing the move | Forward (walking speed), released 0.3 before the target centre; C held throughout when `careful` |
| drop | centre of the source cell | Forward until airborne, then nothing |
| hangdrop | centre of the source cell | C + Forward to the edge, release, Forward again, hang 0.3 s, let go |
| climb | centre of the source cell | Forward until the ledge is in reach, Space |
| jump / catch, k = 1 | centre of the source cell | C + Forward to the edge, stand 0.2 s, Space + Forward, Forward held in the air, released on landing. From a loose floor (you cannot stand on one): a walking jump, Space 0.3 before the lip. Over a floor level with you (fire, lava): take off 0.05 before the lip |
| jump / catch, k >= 2 | centre of the run-up cell behind the source | run (Forward + run), Space 0.6 before the lip (the running jump waits for the edge), Forward held in the air, released on landing |
| ride-loose | centre of the loose floor | nothing |

An edge **passes** when Aladdin ends alive, unhurt and at rest on the target
span within 8 s (a loose target: when he arrives on it). If he comes to rest
on a neighbouring span of the same floor (a running jump down that carries one
cell further), he walks straight back; the edge passes only if that lands on
the target, and the line says `+back from (x,y z)`.

Output: one line per edge, `ok` or `FAIL` with the reason (`died: <cause>`,
`hurt: <message>`, `ended on (x,y z)`, `timeout (<phase>)`) and where it
happened, then a summary. The route is replayed leg by leg (`leg → plate → g1
(round 1)`), each leg in its own round's world; edges already replayed in an
earlier leg are not repeated. The route of the Cells takes about 0.3 s; `--all`
about 2-3 s.

Exit code 1 when an edge of the optimal route fails. With `--all`, failures of
edges off the route are reported (they are moves the solver believes in but
the route does not need) without failing the run. Edges from or onto a
bobbing floor are skipped (their timing is not replayed).

### Reading a failure

* **The solver is too generous**: the move cannot be done as the solver
  claims in this geometry (the flight carries you onto spikes, a loose floor
  falls before you can hang...). Fix the rule in `verify.js` and add a gym
  level to the self-test that shows it.
* **The canonical input is wrong**: the move works with sensible keys but
  not with the replay's (for example it takes off too early). Fix the input
  programme in `replayEdge`, and check `--selftest` still passes.
* **The engine is wrong**: the move breaks the contract (DESIGN.md section 3).
  Fix the engine and add a row to `physics.js`.
* **The level is wrong**: the move is legal but the geometry makes it
  unreliable (a landing one cell too short). Change the level.

Known limit: jump landings come from the contract table (landing cell = take-off
+ k + 1). Where the canonical jump carries you further (running jumps down one
storey land about 3 cells out), the replay accepts it only onto the same floor
and walks you back; anywhere else it fails the edge.

### Self-test

`--selftest` builds small gym levels (corridors, like `physics.js`): steps, a
one-storey drop, a two-storey shaft, gaps of 1, 2 and 3, jumps up, a loose
floor, spikes, a jump off a loose floor, a fire floor, a spike pit, a loose
floor at the lip of a shaft, and a level needing a key, a lever and a lift in
turn. Every edge of every gym must replay, every edge kind must be covered, and
the route of the key/lever/lift level must replay leg by leg. Then negative
controls: forged edges the contract forbids (a standing jump over 2, walking
off two storeys, a standing jump up +1.0 across 2, walking off into a pit next
to spikes, a hang-drop from a loose floor) must be rejected, and the solver must
not claim moves onto spikes or floors that hurt.

## physics.js — the moves contract

`node tools/physics.js` builds tiny test levels and drives the real `Game`
with scripted input, checking both sides of every row of the contract: jump
distances (standing, walking, running, up, down, with and without the edge
snap and coyote time), climbs, falls and hang-drops, loose floors (including
riding one down unhurt, and never hanging from a floor that has fallen away),
plates and gates, spikes, checkpoints. Run it after any change to
`engine/game.js` or `engine/entities.js`.

## snap.js — headless screenshots

```
node tools/snap.js out.png --level cells --x 5.5 --y 3.5 --z 1.5 --ang E --pitch -20
node tools/snap.js map.png --level cells --map --zoom 8 --x 10.5 --y 5.5 --z 1.5
```

Options: `--level 0|id`, `--x --y --z` (default: the level start), `--ang
0|E|N|W|S`, `--pitch`, `--w 356 --h 200`, `--scale 3`, `--map` (automap of
that storey), `--give key_bronze,...`. As a module: `snap(opts)` returns
`{ w, h, rgba, game }`; `writePNG(file, w, h, rgba)`, `upscale(img, k)`.
