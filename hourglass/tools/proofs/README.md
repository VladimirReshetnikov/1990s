# Real-physics proofs

Scripts that play parts of the levels in the real engine (120 Hz, all hazards
live, keyboard-shaped input) where `replay.js` cannot plan its way through on
its own (long dart gauntlets, bobbing stones, lifts), plus full playthroughs.
Run any of them from anywhere: `node tools/proofs/<name>.js`.

| Script | Proves |
| --- | --- |
| `cells_probes.js` | the Cells' lessons fire in order and the taught hang-drop works |
| `chasm_stones.js` | the bobbing stepping stones are crossable from every start moment |
| `chasm_playthrough.js` | the Chasm from start to exit, no damage |
| `blades_dart_gallery.js` | the Whispering Gallery is crossed unhurt by the taught plan (strafe into the lit refuges) at every launcher phase |
| `forge_bellows.js` | the vent corridor is crossed unhurt from every start moment, with reaction error; walking straight through burns you |
| `forge_moves.js` | the Forge's lifts, sinking stones, chute and other set-pieces (19 checks) |
| `forge_playthrough.js` | the Forge from start to exit (about 180 s), no damage, all braziers |
| `tower_dart_stair.js` | the dart stair is climbed unhurt from every start moment by ducking into the alcoves; climbing blind fails |

When you change a level, re-run its proofs along with `verify.js` and
`replay.js`.
