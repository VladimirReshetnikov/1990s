/*
 * World compiler: turns a campaign's ASCII floor plans + legends into grids
 * of sector-like cells (floor/ceiling heights, textures, light, doors...).
 *
 * Reserved map characters:
 *   '1'..'9'  steps of a staircase going UP from this floor   (step index)
 *   'a'..'i'  steps of a staircase coming UP from the floor below
 * The same footprint must appear in both floors (digits below, letters above,
 * same index at the same world position). The lower half of a staircase is
 * geometry of the lower floor, the upper half of the upper floor; each floor
 * sees the other half through a "portal" cell, so stairs render seamlessly.
 */
(function (R) {
  'use strict';
  const U = R.util;
  R.cellAnims = new R.Registry('cell animation');
  R.hazards = new R.Registry('hazard');

  const texId = n => (n === null || n === undefined ? -1 : R.textures.id(n));

  R.CELL_DEFAULTS = {
    solid: false, block: false, fl: 0, cl: 1.2,
    ftex: 'STONE_FLOOR', ctex: 'CEIL_STONE', wall: 'STONE_BLOCKS', low: null, up: null,
    sky: false, light: 20, fog: false, hazard: null, tag: null, use: null, enter: null,
    checkpoint: false, secret: false, noMap: false,
  };
  R.STOCK_LEGEND = {
    ' ': { solid: true },
    '#': { solid: true },
    '.': {},
  };

  function makeCell(t, x, y, f) {
    const solid = !!t.solid;
    return {
      x, y, f,
      solid, block: !!t.block,
      fl: t.fl, cl: solid ? t.fl : t.cl,
      ftex: texId(t.ftex), ctex: texId(t.ctex), wall: texId(t.wall),
      low: texId(t.low ?? t.wall), up: texId(t.up ?? t.wall),
      // faces seen from indoor (non-sky) cells; -1 = same as outside
      wallIn: texId(t.wallIn ?? null), lowIn: texId(t.lowIn ?? null), upIn: texId(t.upIn ?? null),
      lintel: -1, lintelIn: -1, doorTop: 0,
      sky: !!t.sky, light: t.light, fog: !!t.fog, indoor: !!t.indoor,
      portal: -1, pdz: 0,
      hazard: t.hazard || null, door: null, anim: null,
      tag: t.tag || null, use: t.use || null, enter: t.enter || null,
      checkpoint: !!t.checkpoint, secret: !!t.secret, noMap: !!t.noMap,
      stair: 0, dyn: false, label: t.label || null, music: t.music || null,
      portalTo: t.portal || null,
    };
  }

  function resolveTemplate(legend, ch, where, depth = 0) {
    let t = legend[ch];
    if (t === undefined) throw new Error(`Unknown map character "${ch}" ${where}`);
    if (typeof t === 'string') return resolveTemplate(legend, t, where, depth + 1);
    if (depth > 16) throw new Error(`Legend cycle at "${ch}"`);
    if (t.base !== undefined) {
      const b = resolveTemplate(legend, t.base, where, depth + 1);
      const own = Object.assign({}, t); delete own.base;
      const merged = U.merge(b, own);
      // entities / start markers / doors are never inherited from a base
      if (!('ent' in own)) delete merged.ent;
      if (!('start' in own)) delete merged.start;
      if (!('door' in own)) delete merged.door;
      return merged;
    }
    return t;
  }

  function isUp(ch) { return ch >= '1' && ch <= '9'; }
  function isDown(ch) { return ch >= 'a' && ch <= 'i'; }
  function stepIndex(ch) { return isUp(ch) ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0) - 96; }

  /**
   * Compile a campaign into a World. Throws with a precise message on
   * authoring errors (unknown chars, mismatched stairs...).
   */
  R.compileWorld = function (camp) {
    const W = camp.world?.width || 64, Hh = camp.world?.height || 64;
    const floorsDef = camp.floors;
    const world = {
      W, H: Hh, floors: [], start: null, tags: new Map(), spawns: [], errors: [],
      voidCell: makeCell(U.merge(R.CELL_DEFAULTS, { solid: true }), -1, -1, -1),
    };
    const addTag = (tag, cell) => { if (!world.tags.has(tag)) world.tags.set(tag, []); world.tags.get(tag).push(cell); };

    floorsDef.forEach((fd, f) => {
      const legend = Object.assign({}, R.STOCK_LEGEND, camp.legend || {}, fd.legend || {});
      const defaults = U.merge(R.CELL_DEFAULTS, camp.cellDefaults, fd.defaults);
      const [ox, oy] = fd.origin || [0, 0];
      const cells = new Array(W * Hh);
      const chars = new Array(W * Hh).fill(' ');
      const rows = fd.map;
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          const x = ox + rx, y = oy + ry;
          if (x < 0 || y < 0 || x >= W || y >= Hh) {
            if (row[rx] !== ' ') throw new Error(`Floor "${fd.id}": map char at (${rx},${ry}) lies outside the ${W}x${Hh} world`);
            continue;
          }
          chars[y * W + x] = row[rx];
        }
      });
      const voidT = U.merge(defaults, resolveTemplate(legend, ' ', `(void) on floor "${fd.id}"`));
      const floor = {
        index: f, id: fd.id, name: fd.name || fd.id, def: fd, cells, seen: new Uint8Array(W * Hh),
        sky: texId(fd.sky || camp.sky || 'SKY_DUSK'), music: fd.music || null,
      };
      const isAuto = c => { const t = legend[c]; return t && typeof t === 'object' && t.base === 'auto'; };
      /** For `base: 'auto'` entries (entities): inherit the plain floor around them. */
      const autoBase = (x, y, where) => {
        const cands = [];
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) continue;
          const c2 = chars[ny * W + nx];
          if (isUp(c2) || isDown(c2) || legend[c2] === undefined || isAuto(c2)) continue;
          const t2 = U.merge(defaults, resolveTemplate(legend, c2, where));
          if (t2.solid || t2.door || t2.block) continue;
          cands.push(t2);
        }
        if (!cands.length) throw new Error(`No walkable neighbour to inherit from ${where}`);
        // ignore wall-like raised cells (hedges, planters...) and prefer plain floor
        const minFl = Math.min(...cands.map(t => t.fl));
        const low = cands.filter(t => t.fl <= minFl + 0.6);
        const plain = low.find(t => !(t.hazard || t.anim || t.enter || t.secret || t.tag || t.ent || t.start !== undefined || t.use));
        return plain || low[0];
      };
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const ch = chars[y * W + x];
        if (isUp(ch) || isDown(ch)) { cells[y * W + x] = null; continue; }
        const where = `at (${x},${y}) on floor "${fd.id}"`;
        let tpl;
        if (ch === ' ') tpl = voidT;
        else if (isAuto(ch)) {
          const own = Object.assign({}, legend[ch]); delete own.base;
          const b = Object.assign({}, autoBase(x, y, where)); delete b.ent; delete b.start;
          tpl = U.merge(defaults, b, own);
        } else tpl = U.merge(defaults, resolveTemplate(legend, ch, where));
        const cell = makeCell(tpl, x, y, f);
        cells[y * W + x] = cell;
        if (tpl.door) compileDoor(cell, tpl);
        if (tpl.anim) {
          if (!R.cellAnims.has(tpl.anim.type)) throw new Error(`Unknown cell anim "${tpl.anim.type}" ${where}`);
          cell.anim = Object.assign({}, tpl.anim); cell.baseFl = cell.fl; cell.baseCl = cell.cl;
        }
        if (tpl.hazard && !R.hazards.has(tpl.hazard) && !(camp.hazards && camp.hazards[tpl.hazard])) throw new Error(`Unknown hazard "${tpl.hazard}" ${where}`);
        if (cell.tag || cell.use || cell.door || cell.enter) cell.dyn = true;
        if (cell.tag) addTag(cell.tag, cell);
        if (tpl.start !== undefined) world.start = { floor: f, x: x + 0.5, y: y + 0.5, ang: U.dirAngle(tpl.start) };
        if (tpl.ent) {
          for (const e of (Array.isArray(tpl.ent) ? tpl.ent : [tpl.ent])) {
            world.spawns.push(Object.assign({}, e, { floor: f, x: x + 0.5 + (e.dx || 0), y: y + 0.5 + (e.dy || 0), cellX: x, cellY: y }));
          }
        }
      }
      floor.chars = chars;
      floor.defaults = defaults;
      world.floors.push(floor);
    });

    // ---- staircases (needs all floors) ----
    world.floors.forEach((floor, f) => {
      const fd = floor.def, chars = floor.chars, visited = new Uint8Array(W * Hh);
      for (let i = 0; i < W * Hh; i++) {
        const ch = chars[i];
        if (!(isUp(ch) || isDown(ch)) || visited[i]) continue;
        const up = isUp(ch);
        const group = [], stack = [i];
        visited[i] = 1;
        while (stack.length) {
          const k = stack.pop(); group.push(k);
          const x = k % W, y = (k / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) continue;
            const nk = ny * W + nx, c2 = chars[nk];
            if (!visited[nk] && (up ? isUp(c2) : isDown(c2))) { visited[nk] = 1; stack.push(nk); }
          }
        }
        const n = Math.max(...group.map(k => stepIndex(chars[k])));
        const lower = up ? f : f - 1, upper = up ? f + 1 : f;
        if (lower < 0 || upper >= world.floors.length) throw new Error(`Staircase on floor "${fd.id}" near (${i % W},${(i / W) | 0}) leads to a missing floor`);
        const lowerDef = floorsDef[lower];
        const storey = lowerDef.storey;
        if (!storey) throw new Error(`Floor "${lowerDef.id}" needs a "storey" height (distance to the floor above)`);
        const head = lowerDef.stairHead || 1.4;
        const style = up ? (fd.stairUp || {}) : (fd.stairDown || {});
        const legend = Object.assign({}, R.STOCK_LEGEND, camp.legend || {}, fd.legend || {});
        const baseStyle = style.base !== undefined ? resolveTemplate(legend, style.base, 'stair style') : {};
        for (const k of group) {
          const x = k % W, y = (k / W) | 0, s = stepIndex(chars[k]);
          const step = storey / (n + 1);
          const fl = up ? s * step : s * step - storey;
          const tpl = U.merge(floor.defaults, baseStyle, style, { fl, cl: fl + head, solid: false });
          delete tpl.base;
          const cell = makeCell(tpl, x, y, f);
          cell.stair = up ? s : -s;
          cell.stairN = n;
          const half = Math.floor(n / 2);
          if (up && s > half) { cell.portal = upper; cell.pdz = storey; }
          if (!up && s <= half) { cell.portal = lower; cell.pdz = -storey; }
          floor.cells[k] = cell;
        }
      }
    });
    // validate stair pairing
    world.floors.forEach((floor, f) => {
      for (let k = 0; k < W * Hh; k++) {
        const ch = floor.chars[k];
        if (!isUp(ch)) continue;
        const above = world.floors[f + 1];
        const ch2 = above.chars[k];
        if (!isDown(ch2) || stepIndex(ch2) !== stepIndex(ch)) {
          throw new Error(`Stair mismatch at world (${k % W},${(k / W) | 0}): floor "${floor.id}" has "${ch}" but floor "${above.id}" has "${ch2}" (expected "${String.fromCharCode(96 + stepIndex(ch))}")`);
        }
      }
      for (let k = 0; k < W * Hh; k++) {
        const ch = floor.chars[k];
        if (!isDown(ch)) continue;
        const below = world.floors[f - 1];
        const ch2 = below.chars[k];
        if (!isUp(ch2) || stepIndex(ch2) !== stepIndex(ch)) {
          throw new Error(`Stair mismatch at world (${k % W},${(k / W) | 0}): floor "${floor.id}" has "${ch}" but floor "${below.id}" has "${ch2}"`);
        }
      }
    });
    // absolute elevation of each floor (for portals and cross-floor sprites)
    world.elev = [floorsDef[0].elevation || 0];
    for (let f = 1; f < floorsDef.length; f++) world.elev[f] = world.elev[f - 1] + (floorsDef[f - 1].storey || 0);
    // named portals: cells with `portal: '<floor id>'` show (and lead to) that floor
    world.floors.forEach((floor, f) => {
      for (const c of floor.cells) {
        if (!c || !c.portalTo) continue;
        const to = world.floors.findIndex(fl => fl.id === c.portalTo);
        if (to < 0) throw new Error(`Portal to unknown floor "${c.portalTo}" at (${c.x},${c.y}) on floor "${floor.id}"`);
        c.portal = to; c.pdz = world.elev[to] - world.elev[f];
      }
    });
    world.floorIndex = id => world.floors.findIndex(fl => fl.id === id);
    // layout fingerprint: saves made on a different layout are refused
    world.signature = U.hash(world.floors.map(fl => fl.chars.join('')).join('|') + `|${world.spawns.length}`).toString(36);
    if (!world.start) throw new Error('No start position: give one legend entry a `start: "N"|"E"|"S"|"W"` field');

    world.cellAt = function (f, x, y) {
      if (x < 0 || y < 0 || x >= W || y >= Hh) return world.voidCell;
      return world.floors[f].cells[y * W + x];
    };
    /** Resolve portals: returns the cell that is actually there, and the height offset. */
    world.resolve = function (f, x, y) {
      let c = world.cellAt(f, x, y), dz = 0, g = 0;
      while (c.portal >= 0 && g++ < 4) { dz += c.pdz; f = c.portal; c = world.floors[f].cells[y * W + x]; }
      return { cell: c, dz, floor: f };
    };
    return world;
  };

  function compileDoor(cell, tpl) {
    const d = tpl.door;
    const h = d.h ?? (d.secret ? tpl.cl - tpl.fl : Math.min(1.0, tpl.cl - tpl.fl));
    cell.door = {
      key: d.key || null, h, speed: d.speed ?? 1.3, secret: !!d.secret, remote: !!d.remote,
      msg: d.msg || null, openMsg: d.openMsg || null, script: d.script || null, sound: d.sound || 'door',
      state: d.open ? 'open' : 'closed', consume: !!d.consume, group: d.group || tpl.tag || null, closeAfter: d.closeAfter || 0,
    };
    cell.up = texId(d.tex || 'DOOR_WOOD');
    cell.lintel = texId(d.lintel || tpl.up || tpl.wall);
    cell.lintelIn = texId(d.lintelIn || tpl.upIn || null);
    cell.doorTop = tpl.fl + h;
    cell.cl = d.open ? cell.doorTop : tpl.fl;
    cell.dyn = true;
    if (d.secret) cell.noMap = true;
  }

  // ------------------------------------------------ stock cell animations
  /** Crusher: ceiling slams down and slowly rises, on a fixed timetable. */
  R.cellAnims.register('crusher', {
    update(cell, t) {
      const a = cell.anim, period = a.period || 4, p = U.mod(t / period + (a.phase || 0), 1);
      const lo = cell.baseFl + (a.min ?? 0.08), hi = cell.baseCl;
      let k; // 0 = down, 1 = up
      if (p < 0.12) k = 1 - p / 0.12;
      else if (p < 0.3) k = 0;
      else if (p < 0.75) k = U.smooth((p - 0.3) / 0.45);
      else k = 1;
      const prev = cell.cl;
      cell.cl = lo + (hi - lo) * k;
      a.slam = (p >= 0.1 && p < 0.3);
      a.justSlammed = prev > lo + 0.02 && cell.cl <= lo + 0.02;
    },
  });
  /** Cycle: toggles a hazard + floor texture on a timetable (e.g. electric plates). */
  R.cellAnims.register('cycle', {
    update(cell, t) {
      const a = cell.anim, period = a.period || 3, p = U.mod(t / period + (a.phase || 0), 1);
      const on = p < (a.duty ?? 0.5);
      if (a.on !== on) {
        a.on = on;
        cell.hazard = on ? a.hazard : null;
        const tex = on ? a.texOn : a.texOff;
        if (tex) cell.ftex = texId(tex);
        a.changed = true;
      }
    },
  });
  /** Bob: floor moves up and down (moving platforms / stepping stones). */
  R.cellAnims.register('bob', {
    update(cell, t) {
      const a = cell.anim, period = a.period || 4;
      const s = 0.5 - 0.5 * Math.cos(2 * Math.PI * U.mod(t / period + (a.phase || 0), 1));
      cell.fl = cell.baseFl + (a.amp ?? 0.5) * s;
    },
  });
  /** Flicker: light level flickers (purely cosmetic). */
  R.cellAnims.register('flicker', {
    update(cell, t) {
      const a = cell.anim;
      if (a.base === undefined) a.base = cell.light;
      const n = Math.sin(t * 13.1 + cell.x * 3.7) + Math.sin(t * 7.3 + cell.y * 5.1);
      cell.light = n > 1.2 ? Math.max(0, a.base - (a.depth ?? 10)) : a.base;
    },
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
