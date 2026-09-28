/*
 * Loads the game's scripts (in index.html order) into this Node process and
 * returns RetroEngine. A level file that fails to load is skipped with a
 * warning, so one broken level never stops the tools working on the others.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

function load() {
  if (globalThis.RetroEngine && globalThis.RetroEngine.__loaded) return globalThis.RetroEngine;
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<script src="([^"]+)"/g)) {
    const file = m[1];
    const run = () => vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
    if (!file.startsWith('levels/')) { run(); continue; }
    try { run(); } catch (e) { console.warn(`warning: skipped ${file}: ${e.message}`); }
  }
  globalThis.RetroEngine.__loaded = true;
  return globalThis.RetroEngine;
}
module.exports = { load, root };
