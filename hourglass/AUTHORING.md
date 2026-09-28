# Authoring Hourglass levels

A level is one file in `levels/` that calls `RetroEngine.defineLevel({...})` and
is listed (after `game/campaign.js`) in `index.html`. Levels are played in
`order`. Read `DESIGN.md` first; `levels/01_cells.js` is the worked example.

```bash
node tools/verify.js <levelId>          # solve it with the moves contract; lints
node tools/replay.js <levelId>          # perform the solver's route move by move in the real engine (--all: every move)
node tools/snap.js out.png --level <levelId> --x 5.5 --y 3.5 --z 1.5 --ang E --pitch -20
node tools/snap.js map.png --level <levelId> --map --zoom 8 --x 10.5 --y 5.5 --z 1.5   # automap of that storey
node tools/physics.js                   # the moves contract itself (engine changes only)
```

`tools/README.md` documents every tool. A level is done when `verify.js` finds
the exit and `replay.js` replays its route with no FAIL; `replay.js --all`
also shows moves the solver believes in that the route does not use.

Open the game at `http://localhost:8642/hourglass/` (the `games` server in
`.claude/launch.json`); cheats: type `NEXTLEVEL`, `OPENSESAME`, `SANDMAN`
(god mode), `CARTOGRAPHER` (reveal map); `RE.level(n)`, `RE.tp(x, y, z, ang)` in the
console.

## The level definition

```js
(function (R) {
  'use strict';
  const { HG } = R;
  R.defineLevel({
    id: 'chasm', order: 2,                   // id must be unique (duplicates throw)
    name: 'The Chasm of Echoes',
    subtitle: 'One line under the title on the level card.',
    width: 40, height: 24,                   // every layer map is exactly width x height
    music: 'chasm',                          // song name (game/audio.js); a template's `music` switches songs for an area
    startMessage: 'Shown for 7 s when the level begins.',
    falloff: 0.5,                            // optional: how fast light fades with distance (campaign 1.05; lower for vast caverns)
    sky: 'STARS',                            // optional sky texture for `sky: true` spans
    legend: { /* level characters; must not shadow campaign characters */ },
    layers: [
      { z: 0,   map: [ /* height rows of width chars */ ] },
      { z: 1.5, map: [ ... ], legend: { /* characters for this layer only */ }, defaults: { light: 18 } },
    ],                                       // z is a multiple of 1.5 (a storey); `defaults` apply to every template of the layer
    ents: [                                  // entities placed by coordinate (saves legend characters)
      { x: 12, y: 5, z: 1.5, tpl: 'darts', dir: 'W' },     // z = height of the floor it stands on
      { x: 3, y: 9, z: 0, type: 'deco', sprite: 'SKELETON_SITTING', dx: -0.3 },
    ],
    scripts: { name(g, ctx) { ... } },        // for plate/lever/door/enter/use/trigger `script`
    onStart: 'name',                         // optional script at level start
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
```

## Geometry

* Each cell holds **stacked open spans**; a layer's character gives the span in
  that layer's band (from its z to the next layer's z). Heights in templates are
  **relative to the layer's z**.
* Storeys are **1.5** apart. A standard room is `fl 0, cl 1.25` (`.`); `,` is
  2.75 tall (two storeys: put `' '` rock in the layer above), `;` 4.25 tall.
* `_` is a hole: it merges with the open span below it (a pit you can fall into,
  a shaft, an opening over a lower room). There must be open space below it;
  a bottomless drop is `~` (abyss, deadly). A span may not cut into the span
  below it: the compiler tells you where.
* Steps `1`..`5` are floors at 0.25 .. 1.25 (a flight up one storey is
  `12345` and then the next layer's floor).
* Rock `' '`/`#` (dungeon wall), `%` (sandstone). Rock faces take the texture of
  the layer band they are in: `wall` for rock, `low` for the face under a
  span's floor, `up` for the face above its ceiling. Rock faces are pegged to
  the bottom of their storey, so a lever or sconce sits at the same height on
  every storey (keep wall features in texture rows 4..46: a 1.25 room shows
  the bottom 1.25 units of the texture).
* Open sky: spans with `sky: true` see the level's sky above the highest roof
  in the level (`rockTop`, computed; set `rockTop` on the level to change it).
* The top edge of every face with a floor on it, and the floor's edge above a
  drop, are drawn bright: ledges read without special textures.

## Campaign characters (game/campaign.js)

```
' ' '#' rock   '%' sandstone rock   '.' floor (cl 1.25)   ':' lit floor   ',' 2.75 tall   ';' 4.25 tall
'_' pit (open below)   '~' abyss   'o' loose floor   'O' loose, 2.75 tall   '1'..'5' steps
'L' lava (death)   'E' exit   '+' wooden door
'^' spikes   '!' spikes always up   'x' slicer   'T' torch   'C' checkpoint brazier
'P' potion   'B' great potion   'Q' poison   'G' gem
```

Entity characters (`^ x T C P B Q G` and anything built with `HG.ent`) stand on
the plain floor of the cells around them (`base: 'auto'`: the neighbour nearest
the layer's own height, never its hazards or animations). To put one on a
particular floor, give it a template: `HG.item('gem', {}, { base: 'd' })`.
The campaign floor sets no music: the level's `music` plays everywhere unless
a template sets its own.

## Helpers (`R.HG`) for level legends

```js
'|': HG.gate('g1'),                              // see-through portcullis, tag g1 (opened remotely)
'=': HG.plate({ opens: 'g1', hold: 8 }),         // plate: raises g1 for 8 s (hold 0 = for good)
'-': HG.plate({ closes: 'g1' }),                 // a closer plate
'k': HG.item('key_bronze'),                      // also key_silver, key_gold, seal, potion, bigpotion, poison, gem
                                                 // HG.item/note/trigger(…, spec, template): spec -> entity, template -> legend entry
'd': HG.keyDoor('key_bronze'),                   // locked wooden door
'v': HG.lever({ opens: 'g2' }),                  // rock face with a lever (use it with E from the next cell)
'n': HG.note('SCRATCHED ON THE WALL', 'text'),   // readable note (E)
'a': HG.trigger('A message when you walk here.'),
'q': HG.ent({ tpl: 'darts', dir: 'W', phase: 0.5 }),
'F': HG.floor({ light: 22, label: 'The Forge' }),
```

## Template fields (legend entries)

`base` (inherit another character; `'auto'` = the floor around it), `fl`,
`cl`, `ftex`, `ctex`, `wall`, `low`, `up`, `light` (0..31; pits and landings
>= 10), `fog`, `sky` (open to the sky), `hazard` (`lava` `abyss` deadly;
`fire` `shock` `acid` `thorns` hurt every 0.8 s), `label` (area banner),
`music`, `tag`, `checkpoint` (entering the span sets the respawn point),
`secret`, `exit`, `pit`, `abyss`, `solid`, `start: 'N'|'E'|'S'|'W'`,
`ent` (entity spec or array), `enter` (script when entered), `use` (script when
used, on rock), and:

* `loose: { delay }` — drops `delay` s (default 0.7) after it is touched.
  Walking or running crosses it; stopping or a careful step rides it down
  (safely: the slab never lands on its rider). A tile with a plate below jams
  the plate down for good (the plate's `msg` and `script` run then too).
  `loose: { armed: false }` is solid floor until a script calls
  `g.armLoose(tag)`; `g.crumble(tag, x, y, speed, lag)` sends a wave of falling
  floor through the tagged tiles from (x, y) — a crumbling bridge behind you.
  A straight-up jump under a loose flag (ceiling <= floor + 1.4) knocks it down.
* `forbid: true` — the solver must never reach this span (an ERROR if it does):
  use it on wall tops and beams that would be shortcuts.
* `plate: { opens, closes, hold, lift: { tag, to, prop, speed }, script, msg }`
* `door: { key, remote, see, axis, tex, h, speed, closeSpeed, sound, msg, openMsg, secret, open, script, group }`
  (`see`: see-through bars drawn on the cell's mid-plane across the passage; `axis: 'x'|'y'` picks that plane
  when the passage is ambiguous — 'x' is a plane of constant x, across an east-west corridor)
* `lever: { opens, closes, hold, lift, msg, once, texOn, texOff }` (on `solid: true`)
* `anim`:
  * `{ type: 'crusher', period: 3.6, phase, min, msg }` — ceiling slams (death); it creaks 0.3 s before
  * `{ type: 'cycle', period: 2.4, phase, duty, hazard, texOn, texOff }` — a floor that turns hazardous on a beat (vents, sinking slag)
  * `{ type: 'bob', period: 4.8, phase, amp }` — floor rises and falls smoothly (stepping stones); keep tops >= 1.2 below the ceiling
  * `{ type: 'lift', period: 9.6, phase, amp: 1.5, dwell: 2.4 }` — an automatic lift: waits `dwell` s at the bottom and at the top
  * `{ type: 'flicker', depth }` — torch light

## Entities (`ent: {...}`, or templates with `tpl`)

| type / tpl | fields |
| --- | --- |
| `spikes` (`^`), `spikesUp` (`!`) | `hold`, `range` |
| `slicer` (`x`) | `period` 2.4, `phase` — put it in a 1-wide corridor; the jaws span it |
| `darts` (`tpl: 'darts'`) | `dir` (flight direction), `period` 2.4, `phase`, `speed` 5, `range` — place it in the cell in front of the wall the darts come out of |
| `rock` (`tpl: 'rock'`) | `period` 3.6, `phase` — dust, then a falling rock on that cell |
| `flame` (`tpl: 'flame'`) | `period` 2.4, `phase`, `duty` — floor vent |
| `boulder` (`tpl: 'boulder'`) | `path: [[dx, dy], ...]` from the cell, `mode: 'oneway'`, `speed`, `phase`, `endSound` — it follows the floor (stairs) |
| `pendulum` (`tpl: 'pendulum'`) | `axis: 'x'|'y'` (swing direction), `amp`, `period`, `phase` |
| `patrol`, `orbit`, `trap` | see engine/entities.js |
| `item` | `item` |
| `note` | `title`, `text` |
| `trigger` | `text`, `script`, `once`, `radius` |
| `checkpoint` (`C`) | brazier: lighting it snapshots the world for respawns; `radius` (0.5) |
| `deco` | `sprite`, `z` (above its floor), `zAbs` (absolute height: a torch high on a chasm wall), `scale`, `solid`, `radius`, `height` |

Any entity takes `scale` (sprite size) and `dx`/`dy` (nudge within the cell).

Every period is a multiple of the 0.6 s beat. A `phase` is a fraction of the
period; choose phases so neighbouring hazards are offset by multiples of 0.3 s
(for a 2.4 s period: 0, 0.125, 0.25, 0.5 ...). Hazards run on level time, so
what you see from a gallery is what you will meet.

## The moves contract (DESIGN.md §3)

| | makes | never |
| --- | --- | --- |
| standing jump, same level | 1 gap | 2 |
| running jump, same level (2 straight cells of run-up at the take-off height) | lands 2, catches the lip of 3 | 4 |
| down one storey | standing 2; running 3 (4 with a catch) | 5 |
| up +0.35 .. +1.0 | across 1; +1.0 across 2 running | one storey up across a gap |
| climb | 0.35 .. 1.75 (one storey) | 1.95 |
| falls | walk off 1 storey safe; 2 costs a life; 3 kills | |
| hang-drop (C, forward twice at the edge) | 2 storeys safe; 3 costs a life | |

Jumps need **headroom**: ceiling >= take-off floor + 1.15 over the take-off
cell, the gap and the landing (a `.` corridor is exactly 1.25: fine). A catch
or climb needs room above you to pull up (the gap cell or your own cell must
be open to the ledge + 0.62).

## Rules for every level (from the design review)

* Teach, then test: every hazard is first shown safely (it kills a thing, or a
  safe version), then there is a brazier, then the lethal use, and only after
  that combinations.
* Every landing is visible from its take-off (with the automatic peek) or was
  seen in the last 20 s and is lit. Descending ledges step outward by >= 2
  cells per storey. Jumps run along a straight corridor axis; dodges are
  side alcoves.
* Nothing lethal within 2 cells after a corner, a doorway, a landing or a lift.
* After a jump that lands on a loose tile, solid floor within 1 cell.
* Timed gates: the gate is visible from its plate (at most one turn); after a
  failure there is a hazard-free way back to the plate; `verify.js` checks the
  budget (1.25 x optimal + 1.5 s <= hold + 0.3).
* Braziers every 60–90 s of optimal play and before each first lethal use.
* One hidden great potion (`B`) per level; potions after hard stretches; gems
  (`G`) in optional corners.
* Any fall that doesn't kill lands somewhere with a way onward or back.
* Heights: climbable faces <= 1.55, walls meant to stop you >= 1.95; drops away
  from 2.3 and 3.8 (the lints in verify.js flag these).
* Light: dungeon 12–16, torches/landings 18–22, pits and landing floors >= 10.

## Your own textures and sprites

Define them in your level file before `defineLevel`, prefixed with the level
id so they never clash: `R.defTexture('CHASM_FUNGUS', { gen(p, c) { ... } })`,
`R.defSprite('CHASM_BATS', { w, h, frames, gen(p, c) { ... } })`. See
`game/assets.js` and `engine/pix.js` for the painting API (`p.rect`, `p.disc`,
`p.poly`, `p.line`, `p.noise`, `H.blocks`, `H.bricks`, ...). Textures are 64 x 64
(or h: 128), columns wrap; transparent pixels (alpha < 0.5) show through only
on see-through gates and sprites.
