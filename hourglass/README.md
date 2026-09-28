# Hourglass — Escape from the Vizier's Dungeon

A first-person, keyboard-only, 1990s-style platform adventure in the spirit of
the original *Prince of Persia* dungeons, but in real 3-D: storeys stacked on
storeys that you look down into, drop through and climb between, with no
screen flipping and no combat.

Aladdin, the quickest thief of the great bazaar, cut the purse of the Grand
Vizier Qasim and found a plot to poison the Sultan at dawn. Now he is locked in
the Dungeon of Sands, and the Vizier has turned his great hourglass. Run, jump
and climb out through the cells, the chasm, the blade halls, the forge and the
Vizier's tower, and mind the floor.

## Play

Serve the repository folder and open the game:

```bash
python -m http.server 8642 --bind 127.0.0.1
```

Then browse to <http://localhost:8642/hourglass/> (full screen: F). Opening
`index.html` directly from disk also works.

## Controls

| Key | Action |
| --- | --- |
| ↑ / W, ↓ / S | forward / back |
| ← / → | turn (A / D or Alt + ← → to sidestep) |
| Shift (held) | walk (you run by default; Caps Lock swaps) |
| Space | jump; climb the ledge in front; pull up while hanging |
| C (held) | careful step: stops at edges, safe between spikes. At an edge press Forward again to hang; let go of C to drop |
| Q | turn around |
| E / Enter | drink, pull levers, open doors, read |
| PgUp / PgDn, Home | look up / down, centre |
| Tab / M | map · F fullscreen · Esc menu |

New Game offers **The Sultan's Hour** (60 minutes on the hourglass) or
**Wanderer** (no limit). Light a brazier and the dungeon remembers itself as it
was: if you die, you wake there with everything as it was when you lit it.

## For level authors

* [`DESIGN.md`](DESIGN.md): the design, the moves contract, the hazards.
* [`AUTHORING.md`](AUTHORING.md): how to write a level (one file in
  `levels/`), the legend, helpers, entities and the rules every level follows.
* `tools/`: `physics.js` proves the moves contract, `verify.js` solves every
  level with it, `snap.js` renders headless screenshots.

The engine in `engine/` is a fork of the Hollowmere RetroEngine with stacked
spans (room-over-room), platform physics, see-through gates and a checkpoint
event log.
