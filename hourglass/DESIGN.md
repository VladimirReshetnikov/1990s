# HOURGLASS — Escape from the Vizier's Dungeon

Design document (living). A first-person, keyboard-only, 1990s-style platform
adventure inspired by the dungeons of classic cinematic platformers: stone
corridors lit by torches, loose floors, spikes, slicing jaws, portcullis gates
worked by pressure plates, and a race against an hourglass. Unlike its
inspiration the world is **real 3D** — storeys stacked on storeys that you can
look down into, drop through and climb between — with **no screen flipping**
and **no combat**.

## 1. Story

**Aladdin** had the quickest fingers in the great bazaar. One night he cut the
purse of a hooded stranger and found in it a vial of poison and a letter: the
Sultan will drink it at dawn. The stranger was the Grand Vizier **Qasim**. His
guards caught Aladdin and threw him into the Dungeon of Sands beneath the
palace, and the Vizier turned his great hourglass: when the last grain falls,
the Sultan drinks — and the thief hangs.

Aladdin climbs out through the cells, the chasm, the blade halls, the forge
and the Vizier's tower, and reaches the palace roof at dawn. The Sultan pardons
the thief of the bazaar and makes him keeper of the palace keys.

## 2. Controls

| Key | Action |
| --- | --- |
| ↑ / W, ↓ / S | forward / back |
| ← / → | turn (A / D or Alt+← → sidestep) |
| Shift (held) | walk — running is the default; Caps Lock swaps them |
| Space | pull up (hanging) → climb (a ledge ahead) → jump (Forward held; a running jump waits for the edge) → straight-up jump |
| C (held) | careful step: never walks off an edge; safe between spikes. At an edge, press Forward again to lower into a hang; keep C held to hang, let go (or Back) to drop |
| Q | turn around |
| E / Enter | use: drink, levers, doors, notes |
| PgUp / PgDn, Home | look up / down, centre |
| Tab / M | map · F fullscreen · Esc menu |

**Ctrl is never bound** (Ctrl+W would close the tab mid-jump); leaving the page
during play asks first.

## 3. The moves contract

These numbers are the contract between the physics (`engine/game.js`), the
level solver (`tools/verify.js`) and the level authors. `tools/physics.js`
proves both sides of every row with the real game at the fixed 120 Hz step.

Units: a map cell is 1.0 wide; **storeys are 1.5 apart** (layers at z = 0, 1.5,
3.0 …); a standard room is 1.25 tall with a 0.25 slab above. Player: body
radius 0.24 (walls), foot radius 0.10 (ledges, loose floors, careful stops),
height 0.62, eye 0.5. Walk 2.2, run 4.2, careful 1.1 u/s. Jump vz 3.6, gravity
13 → apex 0.50, air time 0.55 s; horizontal speed is fixed at take-off (air
control may only steer and brake). Coyote time 0.06 s, jump buffer 0.15 s.

| | makes | never |
| --- | --- | --- |
| standing jump, same level | 1-cell gap | 2 |
| running jump, same level (2 straight cells of run-up) | lands 2, catches the lip of 3 | 4 |
| jump down one storey | standing 2; running lands 3, catches 4 | 5 |
| jump up +0.35 … +1.0 | across 1 (standing); +1.0 across 2 (running catch) | one storey up across any gap |
| climb (Space facing a face) | ledges 0.35 … 1.75 above the feet (one storey), 0.9 s | 1.95 |
| catch in mid-air | a lip 0.10 … 0.90 above the feet: Forward pulls up, C hangs | — |

Falls are measured from the **last floor** (or the hang), never from the jump
apex: ≤ 2.3 safe · ≤ 3.8 costs a life · more is death (a scream warns you as
you pass 3.8). Hanging lowers the feet 0.9, so walking off 1 storey is safe,
walking off 2 costs a life, and **hang-dropping 2 storeys is safe**; hanging
buys exactly one storey. Authors keep faces ≤ 1.55 (climbable) or ≥ 1.95
(walls), and drops away from 2.3 and 3.8.

**Life**: 3 triangles. Small potion +1, great potion +1 maximum (up to 6) and a
full heal, poison −1. Bottles are drunk with E while facing them (refused at
full life).

**Checkpoints**: braziers. Lighting one snapshots the world — fallen floors,
opened gates, levers, pickups, inventory. Dying puts everything back as it was
when the brazier was lit (full life); only time is lost. Nothing you did after
the brazier survives a death, so a fallen bridge can never strand you.

**Time**: New Game offers *The Sultan's Hour* (60:00, chimes at 15, 5 and 1
minutes; at zero the Sultan drinks) or *Wanderer* (no limit, time still shown).

## 4. World model

Each level is one grid; each cell holds a **list of open spans** stacked in
height (`[{fl, cl, …}, …]`); everything between and around them is rock. Levels
are authored as **layers**: 2-D ASCII maps, exactly W × H, at a base elevation
that is a multiple of the storey (1.5). A layer character's template gives a
span relative to the layer's z. `pit` templates have no floor and merge with the
open span below (holes, shafts); a pit with nothing below must be declared an
abyss (`~`). Loose floors must have open space or an abyss below them.

Rock faces take the wall texture of the layer band they belong to; the top edge
of every ledge face is drawn with a bright lip so drops read at a glance.
Portcullis bars and slicer jaws are thin masked walls on the cell's mid-plane,
so you can see through gates and read the jaws from any angle.

Per-span features: doors and portcullis gates (ceiling slides; see-through
gates), loose floors, pressure plates (rubble from a loose floor jams a plate
down for good), hazards, animations, tags, labels, music, sky, checkpoints.

## 5. Hazards (all predictable, none pursue; every period is a multiple of the 0.6 s beat)

| Hazard | Behaviour | Effect |
| --- | --- | --- |
| Loose floor | rattles when touched, drops 0.7 s later | walkers and runners cross; stop (or step carefully) and you ride it down |
| Crumble bridge | a wave of loose tiles falling behind you | keep running |
| Spikes | spring up when you come within a cell without C; stay up 1.5 s after you leave | running / falling / landing onto them: death; walking into them: −1 and pushed back; careful: safe |
| Slicer | steel jaws across a corridor, period 2.4 s, shut ~0.45 s; a "shing" 0.3 s before | death |
| Portcullis + plate | a plate raises a gate for H seconds; it ratchets down and never closes on you | blocks the way |
| Crusher | ceiling slams on a fixed beat (3.6 s) | death |
| Pendulum blade | swings across a corridor (2.4 s) | −1 life |
| Dart trap | a click 0.6 s before, then a dart down the corridor (2.4 s, 5 u/s) | −1 life |
| Flame vent | 0.9 s of flame every 2.4 s, glow first | −1 life |
| Falling rocks | dust trickles, then a rock drops (3.6 s) | −1 life |
| Rolling boulder | rolls down a trench, re-appears at the top | −1 life + knock-back |
| Lava, abyss | glowing floor / bottomless pit | death |
| Bobbing stones | stepping-stones rising and falling in waves | fall if you miss |

Fairness rule: every hazard can be seen, or clearly heard, for at least a
second from the direction you approach it before it can hurt you.

## 6. Items

Keys (bronze, silver, gold) for locked doors; potions, great potions, poison;
gems (optional, counted at the end); the **Vizier's Seal** that opens the roof
door in the last level.

## 7. Levels

1. **The Cells** — the tutorial: a cracked flag drops you out of your cell;
   climbs; loose flags you must keep walking over; a plate and a see-through
   portcullis; the teeth (careful step); the leaping hall (1, 2 and 3-cell
   jumps over a safe pit); a gallery where a dropped flag jams a plate; a
   hang-drop to the exit courtyard.
2. **The Chasm of Echoes** — a huge chasm with ledges on both walls; hang-drops
   down, a broken causeway of jumps, a rockfall ledge, a crumbling bridge,
   bobbing stepping-stones; the exit at the far top.
3. **The Blade Halls** — slicers, pendulums, a dart gallery, crushers and a
   timed-gate gauntlet; a bridge above lets you preview what's below.
4. **The Forge** — lava lighting the whole cavern, flame vents, lifts, slag
   stones that sink, a boulder trench, the great anvil.
5. **The Vizier's Tower** — an atrium climbed storey by storey; the Seal, a
   crumbling bridge behind you, the dart stair, the roof under the stars.

Every level: each hazard is shown safely before it can kill; braziers every
60–90 s of optimal play and before every first lethal use; one hidden great
potion; any fall that doesn't kill lands somewhere with a way on or back.

## 8. Presentation

Same 90s look as Hollowmere: low-res palette rendering, torch-lit sandstone,
Aladdin's portrait in the status bar reacting to what happens, life triangles,
the draining hourglass, a title card per level, Middle-Eastern flavoured
tracker music (Hijaz), synthesized sound effects, Doom-style melt transitions,
an automap per storey, and a prompt showing what Space / E would do right now
(CLIMB, JUMP, HANG, PULL UP, DRINK). The camera peeks down when you stand at an
edge, hang or fall, and up when a ledge is ahead.

## 9. Verification

* `tools/physics.js` — the moves contract, both sides, with the real game.
* `tools/verify.js` — compiles every level and proves the exit is reachable
  **without damage** with the contract's moves (jumps need run-up and headroom;
  timed gates need 1.25 × optimal + 1.5 s ≤ hold + 0.3), lists unreachable
  items, warns when a loose floor falling early (or before a brazier) could
  strand you, and lints heights that sit on a threshold.
* `tools/replay.js` — performs each move the solver relied on (the optimal
  route, or with `--all` every move it relaxed) in the real engine, in the real
  level geometry and the world state of that search round, with canonical
  keyboard input; fails a move that does not end alive, unhurt and on its
  target. `--selftest` proves it on synthetic levels.
* `tools/snap.js` — headless screenshots with the real renderer.

See `tools/README.md`.
