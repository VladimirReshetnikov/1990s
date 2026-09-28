# HOURGLASS — Escape from the Vizier's Dungeon

Design document (living). A first-person, keyboard-only, 1990s-style platform
adventure inspired by the dungeons of classic cinematic platformers: stone
corridors lit by torches, loose floors, spikes, slicing blades, portcullis gates
worked by pressure plates, and a race against an hourglass. Unlike its
inspiration the world is **real 3D** — stacked levels you can look down into
and climb between — with **no screen flipping** and **no combat**.

## 1. Story

Tariq, a carpet-weaver, overheard the Grand Vizier Qasim plotting to poison the
Sultan at dawn. He was thrown into the Dungeon of Sands beneath the palace.
The Vizier turned his great hourglass: when the last grain falls, the Sultan
drinks. Tariq must climb out through the dungeon, the chasm, the blade halls,
the forge and the Vizier's tower, and reach the palace roof before the sand
runs out.

## 2. Moves (numbers are the contract between physics, solver and levels)

Units: one map cell = 1.0 unit wide. Player radius 0.24, height 0.62, eye 0.5.

| Move | Keys | Rule |
| --- | --- | --- |
| Walk / turn | ↑ ↓ ← →, W S, A D strafe, Alt+← → strafe | walk 2.2 u/s |
| Run | Shift (Caps Lock = always run) | run 4.4 u/s |
| Careful step | C or Ctrl held | 1.1 u/s; never walks off an edge; does not trigger proximity spikes; can step onto extended spikes safely |
| Jump | Space | vz = 4.2, gravity 13 → apex 0.68, air time ≈ 0.65 s. Running jump clears a **2-cell gap**; standing jump adds a 2.6 u/s forward push and clears a **1-cell gap**. Air control 25 %. |
| Climb up | Space facing a wall (or automatically when a jump brings you against a ledge) | grabs ledges whose top is 0.35 … **2.1** above the feet (one dungeon level). 0.8 s pull-up animation. |
| Hang & drop | walk off an edge while holding Careful | lowers by 1.1 before letting go (fall distance reduced) |
| Use | E / Enter | levers, doors, notes |
| Step up | automatic | ≤ 0.35 |

Falls (height from the highest point of the fall to the landing):
≤ 2.3 safe · ≤ 4.4 lose 1 life · more = death. Landing on extended spikes,
lava or into a bottomless abyss = death.

Life: **3 life triangles** (PoP-style). Big life potion: +1 max (up to 6) and
full heal. Small potion: +1. Poison (blue): −1. Death → respawn at the last
checkpoint (level start or a lit checkpoint brazier) with full life; only time
is lost.

Time: an hourglass counts **60:00**. Options: *Time limit: 60 min / Off*
(default Off = relaxed; elapsed time is still shown and reported).

## 3. World model (engine change)

Each level is one grid; each cell holds a **list of open spans** stacked in
height (`[{fl, cl, …}, …]`), everything between/around them is solid. This
gives room-over-room, pits you can look down into, galleries above halls, and
floors that fall away. Levels are authored as **layers**: 2-D ASCII maps at a
base elevation (typically 0, 2, 4, 6 — two units per dungeon level). A layer
character's template gives a span relative to the layer's elevation. `pit`
templates have no floor and merge with the span below (holes, shafts, chasms);
if nothing is below, the pit is a bottomless abyss (death).

Rock faces between spans take the wall texture of the layer band they belong
to, so a corridor wall looks the same whether or not a room lies above it.

Other per-span features: doors/portcullis gates (ceiling slides, like Doom),
loose floors, pressure plates, hazards, animations, tags, labels, music, sky.

## 4. Hazards (all predictable, none pursue)

| Hazard | Behaviour | Effect |
| --- | --- | --- |
| Loose floor | shakes 0.5 s after you step on it, then falls to the level below and shatters | you fall with it if you stay |
| Spikes | retracted; spring up when you run or land within 1 cell; retract after 1.5 s. Pit spikes are always up | running/falling into them = death; careful step = safe |
| Slicer | jaws in a doorway snap shut on a fixed beat (2.4 s) | caught when shut = death |
| Portcullis + plate | a plate raises a gate that slowly falls again (timed runs) | blocks the way |
| Crusher | ceiling slams on a fixed beat | death |
| Pendulum blade | swings across a corridor | −1 life |
| Dart trap | wall launcher fires a dart down the corridor on a beat | −1 life |
| Flame jet | floor vent fires on a beat | −1 life |
| Falling rocks | a shadow grows for 0.8 s, then a rock drops | −1 life |
| Rolling boulder | rolls down a trench, re-appears at the top | −1 life + knock-back |
| Lava | glowing floor | death |
| Rising pillars | stepping-stones that bob up and down in waves | fall if you miss |
| Abyss | bottomless pit | death |

## 5. Items

Keys (bronze, silver, gold) for locked doors; life potions, big life potions,
poison; gems (optional collectibles, counted at the end); the **Vizier's Seal**
that opens the tower's roof door in the last level.

## 6. Levels

1. **The Cells** — tutorial: walking, first loose floor, first plate + gate,
   first climb, first jump, careful step past spikes, a hidden big life potion.
2. **The Chasm of Echoes** — a huge vertical chasm with ledges on both walls;
   climb down, running jumps across, collapsing bridges, falling rocks, a
   rising-pillar crossing; exit at the far top.
3. **The Blade Halls** — slicers, pendulums, dart corridors, crushers and a
   timed-gate gauntlet; galleries above let you preview what's below.
4. **The Forge** — lava floors, bobbing stepping-stones, flame jets, lifts,
   boulder trench.
5. **The Vizier's Tower** — a vertical climb up a tower with everything mixed;
   the Vizier's Seal opens the roof door; the roof under the stars is the end.

Each level ends at an exit door (opened by a plate/lever/key) and a staircase;
entering it shows the next level's title card.

## 7. Presentation

Same 90s look as Hollowmere: low-res palette rendering, torch-lit sandstone,
turbaned portrait that reacts, life triangles, hourglass timer, title card per
level, Middle-Eastern flavoured tracker music (Hijaz / Phrygian dominant),
synthesized SFX, Doom-style melt between screens, automap per height band.

## 8. Verification

* `tools/verify.js` compiles every level and runs a movement-aware solver
  (walk, step, climb ≤ 2.1, drop with fall rules, running jump over ≤ 2 cells,
  standing jump over 1 cell, doors/keys/plates/levers) proving the exit and all
  items are reachable.
* `tools/physics.js` checks that the physics honours the numbers above
  (a running jump really clears 2 cells, a 2.1 ledge is climbable, a 2.2 one is
  not, falls hurt at the right heights, careful step stops at edges).
* `tools/playtest.js` — a bot that plays each level to the exit with real
  physics.
