/*
 * Developer helpers for campaign authors (open the browser console):
 *   RE.tp(floorIndexOrId, x, y, angleOrDir)   teleport (world coordinates)
 *   RE.give('key_red', ...)                     give items
 *   RE.sim(['ArrowUp'], 2)                      run the game loop headlessly for 2 s
 *   RE.where()                                  print position and the cell under you
 *   RE.reveal() / RE.god()                      reveal automap / toggle invulnerability
 * Cheat codes (type during play, 1990s style):
 *   LAZARUS  god mode   OPENSESAME  all keys & tools   CARTOGRAPHER  full automap
 */
(function (R) {
  'use strict';
  const RE = globalThis.RE = {};
  const app = () => globalThis.APP;
  RE.sim = (codes = [], secs = 1, press = []) => {
    const a = app(); a.keys = new Set(codes); const n = Math.round(secs * 60);
    for (let i = 0; i < n; i++) { if (i === 0) a.pressed = press.slice(); a.step(1 / 60); a.pressed = []; }
    a.keys = new Set(); a.ctx2d.putImageData(a.img, 0, 0);
    return RE.where();
  };
  RE.tp = (f, x, y, ang) => {
    const a = app(), g = a.game;
    const fi = typeof f === 'string' ? g.world.floorIndex(f) : f;
    if (a.state !== 'play') a.state = 'play';
    g.teleport(fi, x, y, ang === undefined ? g.player.ang : ang);
    a.ui.msgs = []; a.ui.bannerT = 0;
    return RE.sim([], 0.05);
  };
  RE.give = (...ids) => { const g = app().game; for (const id of ids) g.give(id, { silent: true }); return Object.keys(g.inv); };
  RE.where = () => {
    const g = app().game, p = g.player, c = g.world.resolve(p.floor, Math.floor(p.x), Math.floor(p.y)).cell;
    return { floor: g.world.floors[p.floor].id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), ang: +p.ang.toFixed(2), hp: p.health, state: app().state, cell: { fl: c.fl, cl: +c.cl.toFixed(2), label: c.label, hazard: c.hazard }, msgs: app().ui.msgs.map(m => m.text) };
  };
  RE.reveal = () => { app().game.revealMap = !app().game.revealMap; return app().game.revealMap; };
  RE.god = () => { app().game.god = !app().game.god; return app().game.god; };

  /** Cheat codes: the app feeds typed letters here. */
  R.cheats = {
    LAZARUS: g => { g.god = !g.god; g.msg('GOD MODE ' + (g.god ? 'ON' : 'OFF')); },
    OPENSESAME: g => { for (const [id, it] of Object.entries(g.items)) if (it.kind === 'key' || it.kind === 'tool') if (!g.has(id)) g.give(id, { silent: true }); g.msg('ALL KEYS AND TOOLS'); },
    CARTOGRAPHER: g => { g.revealMap = !g.revealMap; g.msg('FULL MAP ' + (g.revealMap ? 'ON' : 'OFF')); },
  };
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
