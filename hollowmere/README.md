# HOLLOWMERE — a 1990s-style first-person adventure

A keyboard-driven, Doom-looking **adventure** (not a shooter) that runs in the browser,
built on a small reusable engine (**RetroEngine**) so new variations are just data files.

* chunky 320×200-style software rendering (palette + light colormaps, fog, sky)
* sectors with real floor/ceiling heights: steps, ledges, windows, lifts, crushers
* several floors of a building joined by **seamless staircases**, plus outdoor grounds and a roof
* keys, tools and artifacts gate doors and obstacles; notes tell the story
* dangers are **predictable**: crushers, flame jets, sludge, electric floors, patrolling armour,
  clockwork dancers, wisps, pendulums, spikes, spores — nothing hunts you
* automap, inventory, save/load, screen-melt transitions, synthesized sound effects and
  tracker music, cheat codes

No build step and no dependencies: open `index.html` (in this `hollowmere/` folder) in a
browser (Chrome, Edge, Firefox). If your browser blocks local files, run
`python -m http.server 8000` inside this folder and open `http://localhost:8000`.
Press **F** for full screen.

## Controls

| Key | Action |
| --- | --- |
| ↑ ↓ / W S | walk forward / back |
| ← → | turn |
| A D, `,` `.`, or Alt + ← → | sidestep |
| Shift | run (Caps Lock toggles always-run) |
| Space / Enter / E / Ctrl | use, open, read, pick |
| PgUp / PgDn / Home | look up / down / centre |
| Tab / M | automap (`+` `-` zoom) |
| I | inventory |
| F2 / F3 | quick save / quick load |
| F | toggle full screen |
| Esc | menu (options: music, sound, detail, always-run, head bob) |

Items are picked up by walking over them. Locked doors open automatically if you carry
the right key. Dying returns you to the last checkpoint (the last door or staircase you
passed) with everything you had collected.

## The campaigns

* **Hollowmere** — the main adventure. An astronomer's manor at dusk: hedge maze,
  cemetery and mausoleum, greenhouse, library maze, cellar machinery and catacombs,
  a portrait gallery, a laboratory, an attic and a rooftop observatory. 4 floors,
  5 staircases, 9 treasures, 4 secrets.
* **Blackwater Light** — a short variation written as a commented template: a lighthouse
  island in a storm. Pick it on the title screen (*Variation*) or with `?campaign=lighthouse`.

## Project layout

```
index.html                    page + script list (add a line per campaign)
engine/core.js                namespace, registries, math, noise, MapGrid, maze generator
engine/palette.js             256-colour palette and 32-level light / fog colormaps
engine/pix.js                 tiny RGBA painter used by texture & sprite generators
engine/assets.js              texture/sprite registries, lazy palette-quantized AssetBank
engine/stock/textures.js      ~90 procedural wall/floor/sky textures
engine/stock/sprites.js       ~75 procedural / ASCII-art sprites (+ portrait frames)
engine/world.js               map compiler (legends, stairs, doors, portals), cell animations
engine/render.js              column raycaster with heights, portals, sky, sprites
engine/entities.js            entity behaviours (items, notes, traps, patrols, orbits, pendulums)
engine/game.js                rules: physics, doors, items, hazards, checkpoints, scripts, save
engine/audio.js               WebAudio sound effects + tracker-style music
engine/ui.js                  status bar & portrait, automap, dialogs, menus
engine/main.js                app shell: input, screens, main loop
engine/debug.js               console helpers (RE.tp, RE.give, RE.sim ...) and cheat codes
campaigns/hollowmere/         the main campaign (assets.js + campaign.js)
campaigns/lighthouse/         a small variation / template
tools/verify.js               compile every campaign and prove it is completable
tools/playtest.js             a bot that physically plays a campaign to the end
```

## Creating a new variation

1. Copy `campaigns/lighthouse/` to `campaigns/<yours>/` and change `id`, `title`, ...
2. Add `<script src="campaigns/<yours>/campaign.js" charset="utf-8"></script>` to `index.html`.
3. Run `node tools/verify.js` and `node tools/playtest.js <yours>` after every map change.
4. Open the game; your variation appears in the title menu (or use `?campaign=<yours>`).

### Campaign definition

```js
RetroEngine.registerCampaign({
  id, title, subtitle, credit,
  world: { width, height },            // size of every floor grid
  sky: 'SKY_DUSK',                     // any sky texture
  palette: { fogColor, ramps },        // optional palette changes
  render: { falloff },                 // light falloff with distance
  config: { walkSpeed, runSpeed, maxHealth, baseLight, ... },  // see R.GAME_DEFAULTS
  intro: { title, text }, startMessage,
  items: { id: { name, kind: 'key'|'tool'|'relic'|'treasure'|'health', sprite, color,
                 desc, msg, light: { radius, bonus, flicker }, held, heal, score } },
  hud: { keys: [ids], tools: [ids], relics: [ids], relicLabel },
  hazards: { name: { damage, interval, immune: itemId, immuneMsg, msg, sound, pit } },
  entityTemplates: { name: { type, ...spec } },    // reusable entity presets (tpl: 'name')
  floors: [ ... ],                     // bottom to top
  scripts: { name(g, ctx) { ... } },   // called by doors, switches, notes, triggers, items
  music: { song: { bpm, steps, tracks: [...] } },
  titleMusic, introMusic, endingMusic, defaultMusic, attract: { x, y, ang, sweep },
  verify: { remote: { tag: { script, items } }, goal: { script, items } },  // solver hints
});
```

### Floors, maps and legends

```js
{ id: 'ground', name: 'Hollowmere Manor', origin: [0, 0], storey: 1.6, stairHead: 1.5,
  map: [ 'rows of characters', ... ],       // or new RetroEngine.MapGrid(...).rows()
  legend: { '#': { solid: true, wall: 'BRICK_RED' }, '.': { ftex, ctex, cl, light }, ... },
  stairUp: { ...template for steps going up }, stairDown: { ...coming up from below },
  music: 'manor' }
```

A **cell template** can contain:

| field | meaning |
| --- | --- |
| `base` | inherit another legend character (`'auto'` = the floor around it; for entities) |
| `solid`, `block` | wall / impassable open cell (windows, rails, fountains) |
| `fl`, `cl` | floor and ceiling height (1 unit = one map cell = 64 texels) |
| `ftex`, `ctex`, `wall`, `low`, `up` | floor, ceiling, wall, riser and upper-wall textures |
| `wallIn`, `lowIn`, `upIn` | the same faces as seen from indoors (brick outside, wallpaper inside) |
| `sky`, `fog`, `indoor`, `light` | open sky above, fog-fade colormap, keep indoor faces, light 0–31 |
| `door` | `{ key, tex, h, secret, remote, msg, openMsg, lintel, lintelIn, speed, sound, script }` |
| `hazard` | name of a hazard (`acid`, `shock`, `fire`, `thorns`, `pit`, `cold`, or your own) |
| `anim` | `{ type: 'crusher'|'cycle'|'bob'|'flicker', period, phase, ... }` |
| `tag` | group name for scripts (`g.openDoor(tag)`, `g.moveCells(tag, ...)` ...) |
| `use`, `enter` | script run when the player uses this wall / steps into this cell |
| `label`, `music` | area name banner and area music when entered |
| `portal` | id of another floor shown (and entered) through this cell |
| `start`, `ent` | player start direction; entity spec(s) spawned in this cell |
| `secret`, `checkpoint` | counts as a secret area / sets a respawn checkpoint |

**Stairs.** Characters `1`–`9` are steps of a staircase going *up* from this floor and
`a`–`i` are steps of a staircase coming *up from the floor below*. Draw the same footprint
on both floors (digits below, letters above, same index at the same world position) and
the engine joins the floors seamlessly; `storey` on the lower floor sets the climb.
`verify.js` reports any mismatch. Don't use `a`–`i` or `1`–`9` for anything else.

**Portals.** Upper floors can be ringed with portal cells (`{ portal: 'ground', block: true }`,
see `RetroEngine.util.ringRows`) so windows and roofs look out onto the real grounds below.

### Entities

Stock behaviours (`type`): `deco`, `item`, `note`, `usable`, `trigger`, `trap` (periodic
on/off with damage), `patrol` (walks a fixed path), `orbit` (circles), `pendulum`.
Add your own with `RetroEngine.entityTypes.register(name, { init, update, touch, use, sprite })`
— the lighthouse's lightning `storm` is an example. Moving hazards derive their position
from game time only, so they are always predictable.

### Scripting API (inside `scripts`)

`g.msg(text)`, `g.dialog(title, text)`, `g.sound(name)`, `g.has/give/take(item)`,
`g.flag(name, value)`, `g.openDoor(tag)`, `g.closeDoor(tag)`,
`g.moveCells(tag, 'fl'|'cl', target, speed, then)`, `g.setTex(tag, prop, tex)`,
`g.setCells(tag, props)`, `g.entities(tag)`, `g.after(seconds, fn)`, `g.flash(rgb, a)`,
`g.shake(t)`, `g.hurt(n)`, `g.heal(n)`, `g.teleport(floor, x, y, ang)`,
`g.win({ title, text })`; `ctx.entity` / `ctx.cell` identify the caller.

### Assets

```js
RetroEngine.defTexture('MY_WALL', { w: 64, h: 64, gen(p, ctx) { p.fill('#553322').noise(0.2, ctx.seed); } });
RetroEngine.defSprite('MY_THING', { w: 32, h: 48, scale: 1.4, emissive: false, gen(p) { p.ball(16, 16, 10, '#c0a060'); } });
RetroEngine.defAsciiSprite('MY_KEY', ['..XX..', '.X..X.', ...], { X: '#ffcc00' }, { scale: 1.6 });
RetroEngine.sfx.register('boing', (A, out, vol) => A.tone({ f0: 200, f1: 800, dur: 0.3, vol }, out));
```

Everything is painted procedurally and quantized to the palette at start-up; there are no
image or sound files. Music tracks are strings of notes (`C4`, `F#3`), rests (`.`) and holds (`-`).

## Tools and debugging

* `node tools/verify.js [id]` — compiles campaigns, checks stairs and maps, and runs a
  key/item solver proving every item and the goal can be reached.
* `node tools/playtest.js [id]` — a bot plays the campaign with the real physics (in god
  mode, counting hits) and must reach the ending.
* In the browser console: `RE.tp('upper', 31.5, 9, 0)`, `RE.give('key_red')`, `RE.where()`,
  `RE.reveal()`, `RE.god()`.
* Cheat codes (type while playing): `LAZARUS` god mode, `OPENSESAME` all keys and tools,
  `CARTOGRAPHER` full map.
