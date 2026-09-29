/*
 * World compiler (Hourglass fork of RetroEngine): layered 3-D levels.
 *
 * A level is a W x H grid. Every cell holds a list of stacked OPEN SPANS
 * ({fl, cl, ...}, sorted by height, disjoint); everything else is solid rock.
 * Levels are authored as LAYERS: 2-D ASCII maps at a base elevation `z`.
 * A layer character's template describes the span it contributes:
 *
 *   { fl: 0, cl: 1.4, ftex, ctex, low, up, wall, light, ... }  open space
 *   { solid: true, wall: 'TEX' }                                rock in this band
 *   { pit: true, cl: 1.25 }      no floor: merges with the span below (a hole);
 *                                it must have open space below it...
 *   { pit: true, abyss: true }   ...unless it is a declared bottomless abyss
 *
 * Grids are strict: every layer map is exactly W x H printable ASCII (unless it
 * gives an `origin`), layer z values are multiples of camp.storey, and a loose
 * floor must have open space (or an abyss) below it.
 *
 * Heights are relative to the layer's z. The space between one layer's z and
 * the next is that layer's BAND; rock faces inside a band take their texture
 * from that band's template (`wall` for rock, `low` below a span's floor,
 * `up` above its ceiling), so walls look right whatever lies above or below.
 *
 * Span features: door (doors & portcullis gates), loose (falling floor),
 * plate (pressure plate), exit, hazard, anim, tag, use, enter, label, music,
 * checkpoint, secret, sky, forbid (the solver must never reach it). Legend
 * entries with base:'auto' inherit the plain floor around them (for entities).
 * Characters are free-form except ' ' (nothing).
 *
 * level.ents places entities by coordinate instead of by legend character:
 *   ents: [{ x: 12, y: 5, z: 1.5, tpl: 'darts', dir: 'W' }, ...]
 * (x, y the cell, z the height of the floor it stands on; dx/dy nudge it).
 * Rock faces are pegged to the storey (layer) they belong to, so a lever or a
 * sconce on a rock face looks the same on every storey.
 */
(function (R) {
  'use strict';
  const U = R.util;
  R.cellAnims = new R.Registry('cell animation');
  R.hazards = new R.Registry('hazard');

  const texId = n => (n === null || n === undefined ? -1 : R.textures.id(n));
  const SKY_TOP = 100;
  R.SKY_TOP = SKY_TOP;

  R.CELL_DEFAULTS = {
    solid: false, pit: false, fl: 0, cl: 1.4,
    ftex: 'STONE_FLOOR', ctex: 'CEIL_STONE', wall: 'STONE_BLOCKS', low: null, up: null,
    sky: false, light: 18, fog: false, hazard: null, tag: null, use: null, enter: null,
    checkpoint: false, secret: false, exit: false, noMap: false,
  };
  R.STOCK_LEGEND = { ' ': { solid: true } };

  /** A legend entry, following string aliases ('a': 'b'). */
  function lookup(legend, ch, where, depth = 0) {
    if (depth > 16) throw new Error(`Legend cycle at "${ch}" ${where}`);
    const t = legend[ch];
    if (t === undefined) throw new Error(`Unknown map character "${ch}" ${where}`);
    return typeof t === 'string' ? lookup(legend, t, where, depth + 1) : t;
  }
  function resolveTemplate(legend, ch, where, depth = 0) {
    const t = lookup(legend, ch, where, depth);
    if (t.base === 'auto' && depth > 0) throw new Error(`"${ch}" is an entity character (base: 'auto') and cannot be a base ${where}: give the new character its own floor, e.g. { base: '.', ent: ... }`);
    if (t.base !== undefined && t.base !== 'auto') {
      const b = resolveTemplate(legend, t.base, where, depth + 1);
      const own = Object.assign({}, t); delete own.base;
      const merged = U.merge(b, own);
      for (const k of ['ent', 'start', 'door', 'loose', 'plate', 'exit', 'use', 'lever']) if (!(k in own)) delete merged[k];
      return merged;
    }
    return t;
  }

  function makeSpan(t, z, cell, band) {
    const sky = !!t.sky;
    const s = {
      cell, band,
      fl: z + t.fl, cl: sky ? SKY_TOP : z + t.cl,
      ftex: texId(t.ftex), ctex: texId(t.ctex),
      light: t.light, sky, fog: !!t.fog, indoor: !!t.indoor,
      hazard: t.hazard || null, anim: null, tag: t.tag || null,
      enter: t.enter || null, label: t.label || null, music: t.music || null,
      checkpoint: !!t.checkpoint, secret: !!t.secret, exit: !!t.exit, noMap: !!t.noMap,
      door: null, doorTop: 0, loose: null, plate: null, pit: !!t.pit,
      seen: false, dyn: false,
    };
    if (t.door) {
      const d = t.door, h = d.h ?? Math.min(1.2, t.cl - t.fl);
      s.doorTop = s.fl + h;
      s.door = {
        key: d.key || null, h, tex: texId(d.tex || 'DOOR_WOOD'), speed: d.speed ?? 1.4, closeSpeed: d.closeSpeed ?? 0.5,
        secret: !!d.secret, remote: !!d.remote, msg: d.msg || null, openMsg: d.openMsg || null,
        script: d.script || null, sound: d.sound || 'door', group: d.group || t.tag || null,
        state: d.open ? 'open' : 'closed', closeAfter: d.closeAfter || 0, unlocked: false, see: !!d.see,
        axis: d.axis || null,
      };
      s.cl = d.open ? s.doorTop : s.fl;
      s.dyn = true;
    }
    if (t.loose) s.loose = { delay: t.loose.delay ?? null, state: t.loose.armed === false ? 'dormant' : 'idle', t: 0 };
    s.abyss = !!t.abyss;
    s.forbid = !!t.forbid;
    if (t.plate) s.plate = Object.assign({ pressed: false }, t.plate);
    if (t.anim) {
      if (!R.cellAnims.has(t.anim.type)) throw new Error(`Unknown cell anim "${t.anim.type}"`);
      s.anim = Object.assign({}, t.anim);
    }
    s.baseFl = s.fl; s.baseCl = s.cl;
    if (s.tag || s.door || s.loose || s.plate || s.enter) s.dyn = true;
    return s;
  }

  /**
   * Compile one level of a campaign into a World.
   * level = { id, name, width, height, legend, layers: [{ z, map, legend?, origin? }], sky, music }
   */
  R.compileLevel = function (camp, lv) {
    const W = lv.width, Hh = lv.height;
    if (!W || !Hh) throw new Error(`Level "${lv.id}" needs width and height`);
    const baseLegend = Object.assign({}, R.STOCK_LEGEND, camp.legend || {}, lv.legend || {});
    const defaults = U.merge(R.CELL_DEFAULTS, camp.cellDefaults, lv.defaults);
    const layers = lv.layers.map((L, k) => {
      const legend = Object.assign({}, baseLegend, L.legend || {});
      const chars = new Array(W * Hh).fill(' ');
      const [ox, oy] = L.origin || [0, 0];
      if (camp.storey && Math.abs(L.z / camp.storey - Math.round(L.z / camp.storey)) > 1e-6) throw new Error(`Level "${lv.id}" layer ${k}: z=${L.z} is not a multiple of the storey height ${camp.storey}`);
      if (!L.origin) {
        if (L.map.length !== Hh) throw new Error(`Level "${lv.id}" layer ${k} (z=${L.z}): ${L.map.length} rows, expected exactly ${Hh}`);
        L.map.forEach((row, ry) => { if (row.length !== W) throw new Error(`Level "${lv.id}" layer ${k} (z=${L.z}) row ${ry}: ${row.length} chars, expected exactly ${W}: "${row}"`); });
      }
      L.map.forEach((row, ry) => { if (!/^[\x20-\x7e]*$/.test(row)) throw new Error(`Level "${lv.id}" layer ${k} row ${ry}: only printable ASCII allowed`); });
      L.map.forEach((row, ry) => {
        [...row].forEach((ch, rx) => {
          const x = ox + rx, y = oy + ry;
          if (x < 0 || y < 0 || x >= W || y >= Hh) { if (ch !== ' ') throw new Error(`Level "${lv.id}" layer ${k}: char at (${rx},${ry}) outside the ${W}x${Hh} grid`); return; }
          chars[y * W + x] = ch;
        });
      });
      return { z: L.z, legend, chars, defaults: U.merge(defaults, L.defaults), index: k, lightMin: L.lightMin };
    });
    for (let k = 1; k < layers.length; k++) if (!(layers[k].z > layers[k - 1].z)) throw new Error(`Level "${lv.id}": layer z values must increase`);
    const bandZ = layers.map(l => l.z);
    const world = {
      id: lv.id, W, H: Hh, cells: new Array(W * Hh), bandZ, layers, start: null,
      tags: new Map(), rockTags: new Map(), spawns: [], level: lv,
      sky: texId(lv.sky || camp.sky || 'SKY_NIGHT'),
    };
    const addTag = (tag, s) => { if (!world.tags.has(tag)) world.tags.set(tag, []); world.tags.get(tag).push(s); };

    const isAuto = (legend, c) => legend[c] !== undefined && lookup(legend, c, `(legend "${c}")`).base === 'auto';
    const autoBase = (L, x, y, where) => {
      const cands = [];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) continue;
        const c2 = L.chars[ny * W + nx];
        if (L.legend[c2] === undefined || isAuto(L.legend, c2)) continue;
        const t2 = U.merge(L.defaults, resolveTemplate(L.legend, c2, where));
        if (t2.solid || t2.door || t2.pit) continue;
        cands.push(t2);
      }
      if (!cands.length) throw new Error(`No walkable neighbour to inherit from ${where}`);
      // the plain floor nearest the layer's own height (not a trough or a step beside it)
      const special = t => !!(t.hazard || t.anim || t.enter || t.secret || t.tag || t.ent || t.start !== undefined || t.use || t.loose || t.plate || t.exit || t.checkpoint);
      cands.sort((a, b) => (special(a) - special(b)) || (Math.abs(a.fl) - Math.abs(b.fl)));
      return cands[0];
    };

    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const cell = { x, y, spans: [], band: [], seen: false, wall: -1 };
      const raw = [];
      for (const L of layers) {
        const ch = L.chars[y * W + x];
        const where = `at (${x},${y}) layer z=${L.z} of level "${lv.id}"`;
        let t;
        if (isAuto(L.legend, ch)) {
          const own = Object.assign({}, lookup(L.legend, ch, where)); delete own.base;
          const b = Object.assign({}, autoBase(L, x, y, where));
          for (const k of ['ent', 'start', 'door', 'loose', 'plate', 'exit', 'use', 'lever', 'anim', 'hazard', 'tag', 'enter', 'secret', 'checkpoint', 'forbid']) delete b[k];
          t = U.merge(L.defaults, b, own);
        } else t = U.merge(L.defaults, resolveTemplate(L.legend, ch, where));
        if (L.lightMin !== undefined && !t.solid) t = Object.assign({}, t, { light: Math.max(t.light ?? 0, L.lightMin) });
        const info = {
          solid: !!t.solid, wall: texId(t.wall), low: texId(t.low ?? t.wall), up: texId(t.up ?? t.wall),
          use: t.use || null, tag: t.tag || null, span: null, ch,
          lever: t.lever ? Object.assign({ on: false }, t.lever) : null,
        };
        if (!t.solid) {
          const s = makeSpan(t, L.z, cell, L.index);
          info.span = s;
          raw.push(s);
          if (s.tag) addTag(s.tag, s);
        } else if (t.tag) {
          // tagged rock (e.g. a lever wall) — scripts can retexture it
          if (!world.rockTags.has(t.tag)) world.rockTags.set(t.tag, []);
          world.rockTags.get(t.tag).push(info);
        }
        if (t.start !== undefined) world.start = { x: x + 0.5, y: y + 0.5, z: L.z + (t.solid ? 0 : t.fl), ang: U.dirAngle(t.start) };
        if (t.ent) {
          for (const e of (Array.isArray(t.ent) ? t.ent : [t.ent])) {
            world.spawns.push(Object.assign({}, e, { x: x + 0.5 + (e.dx || 0), y: y + 0.5 + (e.dy || 0), z0: L.z + (t.solid ? 0 : t.fl), layer: L.index, cellX: x, cellY: y }));
          }
        }
        cell.band.push(info);
      }
      if (cell.band.length) cell.wall = cell.band[0].wall;
      // pits merge with the span below them; a pit with nothing below is an abyss
      raw.sort((a, b) => a.fl - b.fl);
      const spans = [];
      for (const s of raw) {
        if (s.pit) {
          const below = spans[spans.length - 1];
          if (below) {
            if (below.door) throw new Error(`Level "${lv.id}" (${x},${y}) layer z=${lv.layers[s.band].z}: a pit over a door or gate (a door's opening is its ceiling). Put rock above the door, or move the hole to a neighbouring cell.`);
            below.cl = Math.max(below.cl, s.cl); below.baseCl = below.cl;
            below.ctex = s.ctex; below.sky = below.sky || s.sky;
            if (s.sky) below.cl = below.baseCl = SKY_TOP;
            cell.band[s.band].span = below;
            continue;
          }
          if (!s.abyss && !camp.loosePits) throw new Error(`Level "${lv.id}" (${x},${y}) layer z=${lv.layers[s.band].z}: a pit with nothing below it. Open the layer below, or use an abyss (pit + abyss: true).`);
          s.fl = s.baseFl = -60; s.hazard = s.hazard || 'abyss'; s.ftex = texId('ABYSS');
          spans.push(s);
          continue;
        }
        if (s.loose && !spans.length) throw new Error(`Level "${lv.id}" (${x},${y}) layer z=${lv.layers[s.band].z}: a loose floor over solid rock (it would fall into nothing). Put open space or an abyss below it.`);
        const below = spans[spans.length - 1];
        if (s.loose && below && below.door) throw new Error(`Level "${lv.id}" (${x},${y}) layer z=${lv.layers[s.band].z}: a loose floor over a door or gate (it would fall into the door's opening). Put rock between them.`);
        if (below && below.cl > s.fl + 1e-6) {
          throw new Error(`Level "${lv.id}" (${x},${y}): the span from layer z=${lv.layers[s.band].z} (floor ${s.fl}) cuts into the span below (ceiling ${below.cl}). Use ' ' or a pit in the upper layer, or lower the ceiling below.`);
        }
        spans.push(s);
      }
      spans.forEach((s, i) => { s.index = i; });
      cell.spans = spans;
      world.cells[y * W + x] = cell;
    }
    world.cellAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= Hh ? null : world.cells[y * W + x]);
    // entities placed by coordinate
    for (const e of (lv.ents || [])) {
      const where = `level "${lv.id}" ents entry at (${e.x},${e.y}) z=${e.z}`;
      const c = world.cellAt(Math.floor(e.x), Math.floor(e.y));
      if (!c) throw new Error(`${where}: outside the grid`);
      const s = R.spanAt(c, (e.z ?? 0) + 0.02) || R.spanBelow(c, (e.z ?? 0) + 0.02);
      if (!s) throw new Error(`${where}: no floor there`);
      const spec = Object.assign({}, e); delete spec.z;
      if (e.above !== undefined) { spec.z = e.above; delete spec.above; }   // height above its floor (a deco's z)
      world.spawns.push(Object.assign(spec, { x: Math.floor(e.x) + 0.5 + (e.dx || 0), y: Math.floor(e.y) + 0.5 + (e.dy || 0), z0: s.fl, layer: s.band, cellX: c.x, cellY: c.y }));
    }
    // rock never rises above the highest roof: above it, open sky spans see the sky
    let roof = -1e9;
    for (const c of world.cells) for (const s of c.spans) {
      if (!s.sky) roof = Math.max(roof, s.cl, s.door ? s.doorTop : 0);
      else if (s.fl > -30) roof = Math.max(roof, s.baseFl + (s.anim && s.anim.amp > 0 ? s.anim.amp : 0));   // a terrace wall's top
    }
    world.rockTop = lv.rockTop ?? (roof > -1e9 ? roof : SKY_TOP);
    if (!world.start) throw new Error(`Level "${lv.id}" has no start: give one legend entry a \`start: "N"|"E"|"S"|"W"\` field`);
    const sc = world.cells[Math.floor(world.start.y) * W + Math.floor(world.start.x)];
    const ss = R.spanAt(sc, world.start.z + 0.01);
    if (!ss) throw new Error(`Level "${lv.id}": the start position is inside rock`);
    world.start.z = ss.fl;
    world.signature = U.hash(layers.map(l => l.chars.join('')).join('|') + `|${world.spawns.length}`).toString(36);
    world.band = z => { let k = 0; while (k + 1 < bandZ.length && z >= bandZ[k + 1] - 1e-6) k++; return k; };
    return world;
  };

  /** The open span containing height z in a cell (feet or eye), or null. */
  R.spanAt = function (cell, z) {
    if (!cell) return null;
    const sp = cell.spans;
    for (let i = 0; i < sp.length; i++) if (z >= sp[i].fl - 1e-4 && z < sp[i].cl) return sp[i];
    return null;
  };
  /** Highest span whose floor is at or below z (what you'd stand on / fall onto). */
  R.spanBelow = function (cell, z) {
    if (!cell) return null;
    const sp = cell.spans;
    for (let i = sp.length - 1; i >= 0; i--) if (sp[i].fl <= z + 1e-4) return sp[i];
    return null;
  };

  /**
   * Texture and pegging for a rock/structure piece of `cell` between heights
   * lo..hi (already known to be solid). Returns an array of
   * [lo, hi, texId, pegMode, pegZ] pieces split at band boundaries.
   * pegMode: 0 = world-aligned, 1 = top-pegged at pegZ, 2 = bottom-pegged at pegZ.
   */
  R.solidPieces = function (world, cell, lo, hi, out) {
    out.length = 0;
    const bz = world.bandZ;
    let a = lo;
    let k = world.band(lo + 1e-4);
    while (a < hi - 1e-6) {
      const top = k + 1 < bz.length ? Math.min(hi, bz[k + 1]) : hi;
      const info = cell.band[k];
      const s = info && info.span;
      if (!info || info.solid || !s) {
        // a lower storey's floor raised into this band (fl above its storey): the face under it is that floor's low face
        let rs = null, ri = null;
        for (let j = k - 1; j >= 0 && !rs; j--) { const ij = cell.band[j], sj = ij && ij.span; if (sj && sj.band === j && sj.fl > a + 1e-4) { rs = sj; ri = ij; } }
        if (rs && rs.fl > a + 1e-4) {
          const m = Math.min(top, rs.fl);
          out.push(a, m, ri.low, 1, rs.fl);
          if (m < top - 1e-6) out.push(m, top, info ? info.wall : cell.wall, 2, bz[k]);
        } else {
          // rock: pegged to the bottom of its storey, so features on it sit the same on every storey
          out.push(a, top, info ? info.wall : cell.wall, 2, bz[k]);
        }
      } else if (top <= s.fl + 1e-4) {
        out.push(a, top, info.low, 1, s.fl);
      } else if (a >= s.cl - 1e-4) {
        if (s.door && a < s.doorTop - 1e-4) {
          const m = Math.min(top, s.doorTop);
          out.push(a, m, s.door.tex, 2, s.cl);
          if (m < top) out.push(m, top, info.up, 2, s.doorTop);
        } else out.push(a, top, info.up, 2, s.door ? s.doorTop : s.cl);
      } else {
        out.push(a, top, info.wall, 2, bz[k]);
      }
      a = top; k++;
      if (k >= bz.length) { if (a < hi) out.push(a, hi, info ? info.up : cell.wall, 2, bz[bz.length - 1]); break; }
    }
    return out;
  };

  // ------------------------------------------------ stock span animations
  /** Crusher: ceiling slams down and slowly rises, on a fixed timetable; a creak warns 0.3 s before. */
  R.cellAnims.register('crusher', {
    update(s, t) {
      const a = s.anim, period = a.period || 4, p = U.mod(t / period + (a.phase || 0), 1);
      const warn = p >= 1 - 0.3 / period;
      a.justWarned = warn && !a.warned; a.warned = warn;
      const lo = s.baseFl + (a.min ?? 0.08), hi = s.baseCl;
      let k;
      if (p < 0.12) k = 1 - p / 0.12;
      else if (p < 0.3) k = 0;
      else if (p < 0.75) k = U.smooth((p - 0.3) / 0.45);
      else k = 1;
      const prev = s.cl;
      s.cl = lo + (hi - lo) * k;
      a.slam = p >= 0.1 && p < 0.3;
      a.justSlammed = prev > lo + 0.02 && s.cl <= lo + 0.02;
    },
  });
  /** Cycle: toggles a hazard + floor texture on a timetable. */
  R.cellAnims.register('cycle', {
    update(s, t) {
      const a = s.anim, period = a.period || 3, p = U.mod(t / period + (a.phase || 0), 1);
      const on = p < (a.duty ?? 0.5);
      if (a.on !== on) {
        a.on = on;
        s.hazard = on ? a.hazard : null;
        const tex = on ? a.texOn : a.texOff;
        if (tex) s.ftex = texId(tex);
      }
    },
  });
  /** Bob: the floor rises and falls smoothly (stepping-stone pillars, lifts). */
  R.cellAnims.register('bob', {
    update(s, t) {
      const a = s.anim, period = a.period || 4;
      const k = 0.5 - 0.5 * Math.cos(2 * Math.PI * U.mod(t / period + (a.phase || 0), 1));
      s.fl = s.baseFl + (a.amp ?? 1) * k;
    },
  });
  /**
   * Lift: the floor rides between baseFl and baseFl + amp, waiting `dwell`
   * seconds at each end (bottom first); the travel takes the rest of the period.
   */
  R.cellAnims.register('lift', {
    update(s, t) {
      const a = s.anim, period = a.period || 9.6, dwell = Math.min(a.dwell ?? 2.4, period / 2 - 0.1);
      const q = U.mod(t + (a.phase || 0) * period, period), move = period / 2 - dwell;
      let k;
      if (q < dwell) k = 0;
      else if (q < dwell + move) k = U.smooth((q - dwell) / move);
      else if (q < 2 * dwell + move) k = 1;
      else k = 1 - U.smooth((q - 2 * dwell - move) / move);
      s.fl = s.baseFl + (a.amp ?? 1.5) * k;
    },
  });
  /** Flicker: light level flickers (torches). Purely cosmetic. */
  R.cellAnims.register('flicker', {
    update(s, t) {
      const a = s.anim;
      if (a.base === undefined) a.base = s.light;
      const n = Math.sin(t * 13.1 + s.cell.x * 3.7) + Math.sin(t * 7.3 + s.cell.y * 5.1);
      s.light = n > 1.2 ? Math.max(0, a.base - (a.depth ?? 4)) : a.base;
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
