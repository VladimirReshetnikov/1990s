/*
 * Developer helpers (browser console):
 *   RE.tp(x, y, z?, ang?)     teleport inside the current level (z picks the span)
 *   RE.level(n)               jump to level n (0-based)
 *   RE.give('key_bronze')     give items
 *   RE.sim(inputs, secs)      run the game loop headlessly; inputs: {fwd, run, jump, ...} or key codes
 *   RE.where()                position and the span under you
 *   RE.reveal() / RE.god()    reveal automap / toggle invulnerability
 * Cheat codes (type during play): SANDMAN god mode, OPENSESAME all keys,
 * CARTOGRAPHER full map, NEXTLEVEL skip the level.
 */
(function (R) {
  'use strict';
  const RE = globalThis.RE = {};
  const app = () => globalThis.APP;
  RE.sim = (inp = {}, secs = 1) => {
    const a = app();
    if (Array.isArray(inp)) { a.keys = new Set(inp); inp = null; }
    const n = Math.round(secs * 120);
    for (let i = 0; i < n; i++) {
      if (inp) a.game.update(R.PHYSICS_DT, Object.assign({}, inp, i === 0 ? {} : { jump: false, use: false, about: false }));
      else a.step(R.PHYSICS_DT);
    }
    a.keys = new Set();
    a.draw(); a.ctx2d.putImageData(a.img, 0, 0);
    return RE.where();
  };
  RE.tp = (x, y, z, ang) => {
    const a = app(), g = a.game;
    if (a.state !== 'play') a.state = 'play';
    g.teleport(x, y, z, ang === undefined ? g.player.ang : ang);
    a.ui.msgs = []; a.ui.bannerT = 0;
    return RE.sim({}, 0.05);
  };
  RE.level = n => { const a = app(); a.game.loadLevel(n); a.state = 'play'; return RE.sim({}, 0.05); };
  RE.give = (...ids) => { const g = app().game; for (const id of ids) g.give(id, { silent: true }); return Object.keys(g.inv); };
  RE.where = () => {
    const g = app().game, p = g.player, s = g.footSpan();
    return { level: g.levelIndex, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), ang: +p.ang.toFixed(2), life: p.life, act: p.act && p.act.kind, onGround: p.onGround, state: app().state, span: s && { fl: +s.fl.toFixed(2), cl: +s.cl.toFixed(2), label: s.label, hazard: s.hazard }, msgs: app().ui.msgs.map(m => m.text) };
  };
  RE.reveal = () => { app().game.revealMap = !app().game.revealMap; return app().game.revealMap; };
  RE.god = () => { app().game.god = !app().game.god; return app().game.god; };

  R.cheats = {
    SANDMAN: g => { g.god = !g.god; g.msg('GOD MODE ' + (g.god ? 'ON' : 'OFF')); },
    OPENSESAME: g => { for (const [id, it] of Object.entries(g.items)) if (it.kind === 'key' && !g.has(id)) g.give(id, { silent: true }); g.msg('ALL KEYS'); },
    CARTOGRAPHER: g => { g.revealMap = !g.revealMap; g.msg('FULL MAP ' + (g.revealMap ? 'ON' : 'OFF')); },
    NEXTLEVEL: g => { g.levelDone = true; g.hooks.levelDone && g.hooks.levelDone(); },
  };
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
