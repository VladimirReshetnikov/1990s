/*
 * App shell: canvas sizing, keyboard input, the screen state machine
 * (title / intro / play / menu / dialog / dead / won) and the main loop.
 */
(function (R) {
  'use strict';
  const U = R.util;

  const OPT_KEY = 'retroengine.options';
  const saveKey = id => `retroengine.save.${id}`;

  class App {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx2d = canvas.getContext('2d', { alpha: false });
      this.keys = new Set();
      this.pressed = [];
      this.audio = new R.AudioSys();
      this.opts = Object.assign({ music: true, sound: true, detail: 200, alwaysRun: false, bob: true }, this.loadJSON(OPT_KEY) || {});
      this.audio.setMusic(this.opts.music); this.audio.setSfx(this.opts.sound);
      this.state = 'title';
      this.menuCursor = 0;
      this.menuStack = [];
      this.flashA = 0; this.flashRGB = [255, 0, 0];
      this.shakeT = 0;
      this.campIds = R.campaigns.names();
      const want = new URLSearchParams(globalThis.location ? location.search : '').get('campaign');
      this.selectCampaign(want && R.campaigns.has(want) ? want : this.campIds[0]);
      this.resize();
      globalThis.addEventListener('resize', () => this.resize());
      globalThis.addEventListener('keydown', e => this.onKey(e, true));
      globalThis.addEventListener('keyup', e => this.onKey(e, false));
      globalThis.addEventListener('blur', () => this.keys.clear());
      this.last = performance.now();
      requestAnimationFrame(t => this.frame(t));
    }

    loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
    saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
    saveOpts() { this.saveJSON(OPT_KEY, this.opts); }

    selectCampaign(id) {
      this.camp = R.campaigns.get(id);
      this.pal = new R.Palette(this.camp.palette || {});
      this.bank = new R.AssetBank(this.pal);
      this.renderer = new R.Renderer(this.pal, this.bank, this.camp.render || {});
      this.audio.registerSongs(this.camp.music);
      if (this.camp.register) this.camp.register(R); // late asset registration hook
      this.bank.buildAllTextures();
      this.ui = new R.UI(this);
      this.game = this.makeGame();
      this.attract = { t: 0 };
      if (this.W) this.resize();
      document.title = (this.camp.title || this.camp.id) + (this.camp.subtitle ? ' — ' + this.camp.subtitle : '');
    }
    makeGame() {
      const g = new R.Game(this.camp, {
        sound: (n, v, pan) => this.audio.play(n, v, pan),
        msg: (t, s) => this.ui.addMessage(t, s),
        dialog: (title, text, then) => { this.dialog = { title, text, then }; this.state = 'dialog'; this.audio.play('page'); },
        flash: (rgb, a) => { this.flashRGB = rgb; this.flashA = Math.max(this.flashA, a); },
        shake: t => { this.shakeT = Math.max(this.shakeT, t); },
        face: st => this.ui.setFace(st),
        area: label => this.ui.banner(label),
        music: name => { if (this.state === 'play') this.audio.playSong(name); },
        floorChanged: f => this.onFloorChanged(f),
        died: () => { this.state = 'dead'; this.deadT = 0; },
        won: info => { this.wonInfo = info; this.state = 'won'; this.wonT = 0; this.audio.playSong(this.camp.endingMusic || null); this.audio.play('fanfare'); this.clearSave(); },
      });
      return g;
    }
    onFloorChanged(f) {
      const fl = this.game.world.floors[f];
      this.ui.banner(fl.name, 2.2);
      this.audio.playSong(this.currentMusic());
      this.autosave();
    }

    /** Doom-style screen melt: the previous frame slides down in ragged columns. */
    startMelt() {
      if (!this.buf) return;
      this.meltSrc = this.buf.slice();
      this.meltCol = Math.max(2, Math.round(this.W / 160));
      const n = Math.ceil(this.W / this.meltCol), o = new Float32Array(n);
      let v = -Math.floor(Math.random() * 16);
      for (let c = 0; c < n; c++) { v = U.clamp(v + Math.floor(Math.random() * 3) - 1, -15, 0); o[c] = v; }
      this.meltOff = o;
    }
    drawMelt(dt) {
      if (!this.meltSrc || this.meltSrc.length !== this.buf.length) { this.meltSrc = null; return; }
      const W = this.W, H = this.H, o = this.meltOff, src = this.meltSrc, buf = this.buf, k = this.H / 200;
      const ticks = dt * 35;
      let done = true;
      for (let i = 0; i < o.length; i++) {
        let v = o[i];
        v = v < 0 ? v + ticks : v + Math.min(v + 1, 8) * ticks;
        o[i] = v;
        const off = Math.max(0, Math.floor(v * k));
        if (off < H) done = false;
        for (let c = i * this.meltCol; c < Math.min(W, (i + 1) * this.meltCol); c++)
          for (let y = H - 1; y >= off; y--) buf[y * W + c] = src[(y - off) * W + c];
      }
      if (done) this.meltSrc = null;
    }

    currentMusic() {
      const g = this.game, p = g.player;
      const c = g.world.resolve(p.floor, Math.floor(p.x), Math.floor(p.y)).cell;
      return c.music || g.world.floors[p.floor].music || this.camp.defaultMusic || null;
    }

    // ------------------------------------------------------------ sizing
    resize() {
      const iw = globalThis.innerWidth || 1280, ih = globalThis.innerHeight || 720;
      const aspect = U.clamp(iw / ih, 1.2, 2.4);
      const H = this.opts.detail;
      const W = Math.round(H * aspect / 2) * 2;
      this.W = W; this.H = H;
      this.uiScale = Math.max(1, Math.floor(H / 200));
      this.viewH = H - 32 * this.uiScale;
      this.canvas.width = W; this.canvas.height = H;
      this.img = this.ctx2d.createImageData(W, H);
      this.buf = new Uint32Array(this.img.data.buffer);
      this.renderer.setSize(W, H, this.viewH);
      let cw, ch;
      if (iw / ih > aspect) { ch = ih; cw = ih * aspect; } else { cw = iw; ch = iw / aspect; }
      this.canvas.style.width = cw + 'px'; this.canvas.style.height = ch + 'px';
    }
    toggleFullscreen() {
      const d = document;
      if (!d.fullscreenElement) (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen || (() => {})).call(d.documentElement);
      else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    }

    // ------------------------------------------------------------ input
    onKey(e, down) {
      const c = e.code;
      const block = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'PageUp', 'PageDown', 'Home', 'End', 'F2', 'F3', 'AltLeft', 'AltRight', 'Enter'];
      if (block.includes(c) || (e.altKey && c.startsWith('Arrow'))) e.preventDefault();
      if (down) {
        this.audio.init();
        if (!e.repeat) this.pressed.push(c);
        else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c) && this.state !== 'play') this.pressed.push(c);
        this.keys.add(c);
        if (this.state === 'play' && /^Key[A-Z]$/.test(c) && R.cheats) {
          this.typed = ((this.typed || '') + c.slice(3)).slice(-16);
          for (const [code, fn] of Object.entries(Object.assign({}, R.cheats, this.camp.cheats || {}))) if (this.typed.endsWith(code)) { this.typed = ''; fn(this.game); this.audio.play('secret'); }
        }
        if (c === 'CapsLock') { this.opts.alwaysRun = !this.opts.alwaysRun; this.ui.addMessage('ALWAYS RUN ' + (this.opts.alwaysRun ? 'ON' : 'OFF'), 2); this.saveOpts(); }
      } else this.keys.delete(c);
    }
    held(...codes) { return codes.some(c => this.keys.has(c)); }
    readInput() {
      const k = (...c) => this.held(...c);
      const alt = k('AltLeft', 'AltRight');
      let turn = 0, strafe = 0, fwd = 0;
      if (k('ArrowUp', 'KeyW')) fwd += 1;
      if (k('ArrowDown', 'KeyS')) fwd -= 1;
      if (alt) { if (k('ArrowLeft')) strafe -= 1; if (k('ArrowRight')) strafe += 1; }
      else { if (k('ArrowLeft')) turn -= 1; if (k('ArrowRight')) turn += 1; }
      if (k('KeyA', 'Comma')) strafe -= 1;
      if (k('KeyD', 'Period')) strafe += 1;
      let run = k('ShiftLeft', 'ShiftRight');
      if (this.opts.alwaysRun) run = !run;
      const look = (k('PageDown', 'KeyZ') ? 1 : 0) - (k('PageUp', 'KeyX') ? 1 : 0);
      return { fwd, strafe, turn, run, look: -look, center: k('Home', 'End', 'KeyC') };
    }
    wasPressed(...codes) { return this.pressed.some(c => codes.includes(c)); }

    // ------------------------------------------------------------ save/load
    autosave() { if (this.state === 'play' || this.state === 'dialog') this.saveGame(true); }
    saveGame(quiet) {
      const ok = this.saveJSON(saveKey(this.camp.id), this.game.serialize());
      if (!quiet) this.ui.addMessage(ok ? 'GAME SAVED.' : 'COULD NOT SAVE!', 2);
    }
    hasSave() { return !!this.loadJSON(saveKey(this.camp.id)); }
    clearSave() { try { localStorage.removeItem(saveKey(this.camp.id)); } catch (e) { /* ignore */ } }
    loadGame() {
      const s = this.loadJSON(saveKey(this.camp.id));
      if (!s) { this.ui.addMessage('NO SAVED GAME.', 2); return false; }
      try { this.game.deserialize(s); } catch (e) { console.warn(e); this.game = this.makeGame(); this.ui.addMessage('THAT SAVE CANNOT BE LOADED: ' + e.message, 4); return false; }
      this.ui.msgs = []; this.ui.setFace('normal');
      this.startMelt();
      this.state = 'play';
      const f = this.game.player.floor;
      this.audio.playSong(this.currentMusic());
      this.ui.banner(this.game.world.floors[f].name, 2);
      this.ui.addMessage('GAME LOADED.', 2);
      return true;
    }
    newGame() {
      this.startMelt();
      this.game = this.makeGame();
      this.ui.msgs = []; this.ui.setFace('normal');
      if (this.camp.intro) { this.state = 'intro'; this.introT = 0; this.audio.playSong(this.camp.introMusic || this.camp.titleMusic || null); }
      else this.beginPlay();
    }
    beginPlay() {
      this.startMelt();
      this.state = 'play';
      const f = this.game.player.floor;
      this.audio.playSong(this.currentMusic());
      this.ui.banner(this.game.world.floors[f].name, 2.5);
      if (this.camp.startMessage) this.ui.addMessage(this.camp.startMessage, 7);
    }

    // ------------------------------------------------------------ menus
    menuItems(kind) {
      const o = this.opts;
      const onoff = v => (v ? 'ON' : 'OFF');
      if (kind === 'title') {
        const items = [
          { label: 'New Game', action: () => this.newGame() },
          { label: 'Continue', disabled: !this.hasSave(), action: () => this.hasSave() && this.loadGame() },
        ];
        if (this.campIds.length > 1) items.push({ label: 'Variation', value: () => this.camp.title, left: () => this.cycleCampaign(-1), right: () => this.cycleCampaign(1), action: () => this.cycleCampaign(1) });
        items.push({ label: 'Options', action: () => this.openMenu('options') });
        items.push({ label: 'Controls', action: () => this.openMenu('controls') });
        items.push({ label: 'Story', action: () => { this.dialog = { title: this.camp.intro ? this.camp.intro.title : this.camp.title, text: this.camp.intro ? this.camp.intro.text : '', back: 'title' }; this.state = 'dialog'; } });
        return items;
      }
      if (kind === 'pause') {
        return [
          { label: 'Resume', action: () => this.closeMenus() },
          { label: 'Save Game', action: () => { this.saveGame(); this.closeMenus(); } },
          { label: 'Load Game', disabled: !this.hasSave(), action: () => this.loadGame() },
          { label: 'Options', action: () => this.openMenu('options') },
          { label: 'Controls', action: () => this.openMenu('controls') },
          { label: 'Quit to Title', action: () => { this.autosave(); this.startMelt(); this.state = 'title'; this.menuStack = []; this.menuCursor = 0; this.audio.playSong(this.camp.titleMusic || null); } },
        ];
      }
      if (kind === 'options') {
        const detail = { 200: 'LOW (CHUNKY)', 300: 'MEDIUM', 400: 'HIGH' };
        const cycleDetail = d => { const v = [200, 300, 400]; o.detail = v[U.mod(v.indexOf(o.detail) + d, 3)]; this.resize(); this.saveOpts(); };
        return [
          { label: 'Music', value: () => onoff(o.music), action: () => { o.music = !o.music; this.audio.setMusic(o.music); this.saveOpts(); } },
          { label: 'Sound', value: () => onoff(o.sound), action: () => { o.sound = !o.sound; this.audio.setSfx(o.sound); this.saveOpts(); } },
          { label: 'Detail', value: () => detail[o.detail] || o.detail, action: () => cycleDetail(1), left: () => cycleDetail(-1), right: () => cycleDetail(1) },
          { label: 'Always Run', value: () => onoff(o.alwaysRun), action: () => { o.alwaysRun = !o.alwaysRun; this.saveOpts(); } },
          { label: 'Head Bob', value: () => onoff(o.bob), action: () => { o.bob = !o.bob; this.saveOpts(); } },
          { label: 'Fullscreen', value: () => onoff(!!document.fullscreenElement), action: () => this.toggleFullscreen() },
          { label: 'Back', action: () => this.backMenu() },
        ];
      }
      return [{ label: 'Back', action: () => this.backMenu() }];
    }
    cycleCampaign(d) {
      const i = U.mod(this.campIds.indexOf(this.camp.id) + d, this.campIds.length);
      this.selectCampaign(this.campIds[i]);
      this.audio.songName = undefined; this.audio.playSong(this.camp.titleMusic || null);
    }
    openMenu(kind) { this.menuStack.push({ kind: this.menuKind, cursor: this.menuCursor }); this.menuKind = kind; this.menuCursor = 0; this.audio.play('select'); }
    backMenu() {
      const prev = this.menuStack.pop();
      if (!prev || !prev.kind) { this.closeMenus(); return; }
      this.menuKind = prev.kind; this.menuCursor = prev.cursor; this.audio.play('menu');
    }
    closeMenus() {
      this.menuStack = [];
      if (this.state === 'menu') { this.state = 'play'; }
      this.menuKind = this.state === 'title' ? 'title' : null;
    }
    menuInput(items) {
      if (this.wasPressed('ArrowDown', 'KeyS')) { do { this.menuCursor = U.mod(this.menuCursor + 1, items.length); } while (items[this.menuCursor].disabled); this.audio.play('menu'); }
      if (this.wasPressed('ArrowUp', 'KeyW')) { do { this.menuCursor = U.mod(this.menuCursor - 1, items.length); } while (items[this.menuCursor].disabled); this.audio.play('menu'); }
      const it = items[this.menuCursor];
      if (!it) return;
      if (this.wasPressed('ArrowLeft', 'KeyA') && it.left) { it.left(); this.audio.play('menu'); }
      if (this.wasPressed('ArrowRight', 'KeyD') && it.right) { it.right(); this.audio.play('menu'); }
      if (this.wasPressed('Enter', 'Space', 'NumpadEnter') && !it.disabled) { this.audio.play('select'); it.action(); }
    }

    // ------------------------------------------------------------ loop
    frame(t) {
      requestAnimationFrame(tt => this.frame(tt));
      let dt = (t - this.last) / 1000; this.last = t;
      if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
      try { this.step(dt); } catch (e) { console.error(e); this.fatal = e; }
      this.pressed = [];
      this.ctx2d.putImageData(this.img, 0, 0);
    }

    step(dt) {
      const g = this.game, ui = this.ui;
      if (this.wasPressed('KeyF')) this.toggleFullscreen();
      if (this.state === 'play') {
        if (this.wasPressed('Escape')) { this.state = 'menu'; this.menuKind = 'pause'; this.menuCursor = 0; this.menuStack = []; this.audio.play('select'); }
        else if (this.wasPressed('Tab', 'KeyM')) { this.showMap = !this.showMap; }
        else if (this.wasPressed('KeyI')) { this.state = 'inventory'; this.audio.play('menu'); }
        else if (this.wasPressed('F2')) this.saveGame();
        else if (this.wasPressed('F3')) this.loadGame();
        if (this.showMap) {
          if (this.wasPressed('Equal', 'NumpadAdd')) ui.mapZoom = Math.min(16, ui.mapZoom + 1);
          if (this.wasPressed('Minus', 'NumpadSubtract')) ui.mapZoom = Math.max(2, ui.mapZoom - 1);
        }
        const inp = this.readInput();
        inp.use = this.wasPressed('Space', 'Enter', 'KeyE', 'ControlLeft', 'ControlRight', 'NumpadEnter');
        const n = Math.ceil(dt / (1 / 60));
        for (let i = 0; i < n; i++) g.update(dt / n, i === 0 ? inp : Object.assign({}, inp, { use: false }));
      } else if (this.state === 'menu') {
        g.update(0, null);
        if (this.wasPressed('Escape')) this.backMenu();
        else this.menuInput(this.menuItems(this.menuKind));
      } else if (this.state === 'dialog') {
        if (this.wasPressed('Space', 'Enter', 'Escape', 'NumpadEnter')) {
          const d = this.dialog; this.dialog = null;
          this.state = d && d.back ? d.back : 'play';
          if (this.state === 'title') this.menuKind = 'title';
          if (d && d.then) g.runScript(d.then, {});
        }
      } else if (this.state === 'inventory') {
        if (this.wasPressed('KeyI', 'Escape', 'Space', 'Enter')) this.state = 'play';
      } else if (this.state === 'dead') {
        this.deadT += dt;
        g.update(dt, null);
        if (this.deadT > 1.2 && this.wasPressed('Enter', 'Space', 'NumpadEnter')) { g.respawn(); this.state = 'play'; this.ui.addMessage(this.camp.respawnMessage || 'YOU COME TO YOUR SENSES AGAIN...', 3); }
      } else if (this.state === 'won') {
        this.wonT += dt;
        g.update(dt, null);
        if (this.wonT > 3 && this.wasPressed('Enter', 'Space', 'Escape')) { this.startMelt(); this.state = 'title'; this.menuKind = 'title'; this.menuCursor = 0; this.game = this.makeGame(); this.audio.playSong(this.camp.titleMusic || null); }
      } else if (this.state === 'intro') {
        this.introT += dt;
        if (this.wasPressed('Enter', 'Space', 'Escape', 'NumpadEnter')) {
          const full = this.introT * 40 >= this.camp.intro.text.length;
          if (full || this.wasPressed('Escape')) this.beginPlay(); else this.introT = 1e3;
        }
      } else if (this.state === 'title') {
        if (!this.menuKind) this.menuKind = 'title';
        if (this.wasPressed('Escape')) this.backMenu();
        else this.menuInput(this.menuItems(this.menuKind));
        this.attract.t += dt;
        g.time += dt;
        g.update(0, null);
        if (!this.titleMusicStarted && this.audio.ctx) { this.titleMusicStarted = true; this.audio.playSong(this.camp.titleMusic || null); }
      }
      ui.tick(dt);
      this.flashA = Math.max(0, this.flashA - dt * 1.4);
      this.shakeT = Math.max(0, this.shakeT - dt);
      this.bank.tick(g.time);
      this.draw(dt);
    }

    camera() {
      const g = this.game, p = g.player, cfg = g.cfg;
      if (this.state === 'title') {
        const a = this.camp.attract || {};
        const s = g.world.start;
        const t = this.attract.t;
        const x = a.x ?? s.x, y = a.y ?? s.y, fl = a.floor ?? s.floor;
        const r = g.world.resolve(fl, Math.floor(x), Math.floor(y));
        return { x, y, z: r.cell.fl + r.dz + cfg.eyeHeight + (a.dz || 0), ang: (a.ang ?? s.ang) + Math.sin(t * 0.12) * (a.sweep ?? 0.9), pitch: 0, floor: fl, light: g.carriedLight() };
      }
      const bob = this.opts.bob ? Math.sin(p.bobPhase * 2) * 0.035 * p.bobAmp : 0;
      let z = p.viewZ + bob;
      if (!p.alive) z = p.z + 0.12 + Math.max(0, cfg.eyeHeight - 0.12 - (this.deadT || 0) * 0.8);
      const sh = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeT * 6 : 0;
      const light = g.carriedLight();
      let camLight = light;
      if (light && light.flicker) camLight = { radius: light.radius, bonus: light.bonus * (0.9 + 0.1 * Math.sin(g.time * 17) * Math.sin(g.time * 7.3)) };
      return { x: p.x, y: p.y, z, ang: p.ang, pitch: (p.pitch + sh) * (this.viewH / 168), floor: p.floor, light: camLight };
    }

    draw(dt = 0) {
      this.drawScene();
      if (this.meltSrc) this.drawMelt(Math.min(dt, 0.05));
    }
    drawScene() {
      const g = this.game, ui = this.ui, s = this.uiScale, W = this.W, H = this.H;
      const buf = this.buf;
      if (this.fatal) { buf.fill(0xff400000); ui.textC('ENGINE ERROR - SEE CONSOLE', W / 2, H / 2, R.UICOL.white, s); ui.textC(String(this.fatal.message).slice(0, 60).toUpperCase(), W / 2, H / 2 + 12 * s, R.UICOL.text, s); return; }
      const cam = this.camera();
      if (this.showMap && this.state === 'play') ui.drawAutomap(g);
      else {
        this.renderer.render(buf, g.world, cam, g.time);
        this.renderer.sprites(buf, g.spriteList(this.bank, this.renderer.frameNo), cam);
        if (this.state !== 'title') {
          const held = g.heldSprite();
          if (held && g.player.alive) {
            const p = g.player, b = this.opts.bob ? p.bobAmp : 0;
            this.renderer.held(buf, this.bank.sprite(held), Math.cos(p.bobPhase) * 7 * b, Math.abs(Math.sin(p.bobPhase)) * 6 * b + 4, 24);
          }
        }
        if (this.flashA > 0) this.renderer.tint(buf, this.flashRGB, Math.min(0.6, this.flashA));
        if (this.state === 'dead') this.renderer.tint(buf, [120, 0, 0], Math.min(0.55, (this.deadT || 0) * 0.5));
      }
      if (this.state === 'title') { this.drawTitle(); return; }
      if (this.state === 'intro') { this.drawIntro(); return; }
      ui.drawStatusBar(g);
      if (this.state === 'play' || this.state === 'dead') ui.drawMessages(!this.showMap);
      if (this.state === 'menu') {
        ui.shadeRect(0, 0, W, this.viewH, 0.6);
        const items = this.menuItems(this.menuKind);
        if (this.menuKind === 'controls') this.drawControls();
        else ui.drawMenu(this.menuKind === 'options' ? 'OPTIONS' : 'PAUSED', items, this.menuCursor, Math.round(this.viewH * 0.12));
      } else if (this.state === 'dialog' && this.dialog) ui.drawDialog(this.dialog);
      else if (this.state === 'inventory') ui.drawInventory(g);
      else if (this.state === 'dead') {
        ui.textC(this.camp.deathTitle || 'YOU HAVE PERISHED', W / 2, this.viewH * 0.35, R.UIGRAD.red, s * 2);
        if (this.deadT > 1.2) ui.textC('PRESS ENTER TO TRY AGAIN FROM THE LAST CHECKPOINT', W / 2, this.viewH * 0.35 + 24 * s, R.UICOL.text, s);
      } else if (this.state === 'won') this.drawWon();
    }

    drawTitle() {
      const ui = this.ui, W = this.W, H = this.H, s = this.uiScale, c = this.camp;
      ui.shadeRect(0, 0, W, H, 0.45);
      const t = this.attract.t;
      const ty = Math.round(H * 0.1);
      const ts = Math.max(s, Math.min(s * 4, Math.floor((W - 8 * s) / (c.title.length * 6))));
      ui.textC(c.title.toUpperCase(), W / 2, ty + (s * 4 - ts) * 3, R.UIGRAD.gold, ts);
      if (c.subtitle) ui.textC(c.subtitle.toUpperCase(), W / 2, ty + 34 * s, R.UIGRAD.stone, s);
      if (this.menuKind === 'controls') { this.drawControls(); return; }
      ui.drawMenu(this.menuKind === 'options' ? 'OPTIONS' : null, this.menuItems(this.menuKind), this.menuCursor, Math.round(H * 0.42));
      // footer strip where the status bar would be
      ui.tile(c.hudTexture || 'STONE_DARK', 0, this.viewH, W, H - this.viewH, 10);
      ui.rect(0, this.viewH, W, s, R.rgb('#8a7050'));
      const hint = 'ARROWS + ENTER TO CHOOSE   F: FULLSCREEN';
      if (!this.audio.ctx) { if (Math.floor(t * 2) % 2) ui.textC('PRESS ANY KEY', W / 2, H - 22 * s, R.UICOL.gold, s); }
      ui.textC(hint, W / 2, H - 11 * s, R.UICOL.dim, s);
      if (c.credit) ui.textR(c.credit.toUpperCase(), W - 4 * s, 4 * s, R.UICOL.dim, s);
    }
    drawControls() {
      const ui = this.ui, W = this.W, s = this.uiScale;
      const rows = this.camp.controlsText || [
        ['ARROWS / W S', 'WALK AND TURN'],
        ['A D  OR  , .', 'SIDESTEP'],
        ['ALT + ARROWS', 'SIDESTEP'],
        ['SHIFT', 'RUN   (CAPS LOCK: ALWAYS RUN)'],
        ['SPACE / ENTER / E', 'USE, OPEN, READ'],
        ['PGUP / PGDN / HOME', 'LOOK UP / DOWN / CENTRE'],
        ['TAB / M', 'AUTOMAP  (+/- ZOOM)'],
        ['I', 'INVENTORY'],
        ['F2 / F3', 'QUICK SAVE / LOAD'],
        ['F', 'TOGGLE FULLSCREEN'],
        ['ESC', 'MENU'],
      ];
      const h = (rows.length * 11 + 40) * s, w = Math.min(W - 8 * s, 300 * s);
      const x = Math.round((W - w) / 2), y = Math.round((this.H - h) / 2);
      ui.panel(x, y, w, h, '#14100c', 0.92);
      ui.textC('CONTROLS', W / 2, y + 8 * s, R.UIGRAD.gold, s);
      rows.forEach(([k, d], i) => { ui.text(k, x + 10 * s, y + (24 + i * 11) * s, R.UICOL.gold, s); ui.text(d, x + 124 * s, y + (24 + i * 11) * s, R.UICOL.text, s); });
      ui.textC('ESC: BACK', W / 2, y + h - 11 * s, R.UICOL.dim, s);
    }
    drawIntro() {
      const ui = this.ui, W = this.W, H = this.H, s = this.uiScale, intro = this.camp.intro;
      ui.shadeRect(0, 0, W, H, 0.8);
      ui.textC(intro.title.toUpperCase(), W / 2, 12 * s, R.UIGRAD.gold, s * 2);
      const shown = intro.text.slice(0, Math.floor(this.introT * 40));
      const maxC = Math.min(58, Math.floor((W / s - 24) / 6));
      const lines = U.wrap(shown.toUpperCase(), maxC);
      const x = Math.round((W - maxC * 6 * s) / 2);
      lines.forEach((ln, i) => ui.text(ln, x, (40 + i * 10) * s, R.UICOL.text, s));
      if (Math.floor(this.introT * 2) % 2) ui.textC('PRESS ENTER', W / 2, H - 14 * s, R.UICOL.dim, s);
    }
    drawWon() {
      const ui = this.ui, W = this.W, s = this.uiScale, g = this.game, info = this.wonInfo || {};
      const a = Math.min(0.85, this.wonT * 0.25);
      ui.shadeRect(0, 0, W, this.H, a);
      if (this.wonT < 1.5) return;
      ui.textC((info.title || 'THE END').toUpperCase(), W / 2, 10 * s, R.UIGRAD.gold, s * 2);
      const maxC = Math.min(56, Math.floor((W / s - 24) / 6));
      const lines = U.wrap((info.text || '').toUpperCase(), maxC);
      const x = Math.round((W - maxC * 6 * s) / 2);
      lines.forEach((ln, i) => ui.text(ln, x, (34 + i * 9) * s, R.UICOL.text, s));
      const st = g.stats;
      let y = (40 + lines.length * 9) * s;
      const row = (k, v) => { ui.text(k, W / 2 - 90 * s, y, R.UICOL.gold, s); ui.textR(v, W / 2 + 90 * s, y, R.UICOL.white, s); y += 10 * s; };
      row('TIME', U.formatTime(st.time));
      row('TREASURES', `${st.treasures} / ${st.treasureTotal}   (${st.score} PTS)`);
      row('SECRETS', `${st.secrets} / ${st.secretTotal}`);
      row('MISHAPS', String(st.deaths));
      if (this.wonT > 3 && Math.floor(this.wonT * 2) % 2) ui.textC('PRESS ENTER', W / 2, this.H - 12 * s, R.UICOL.dim, s);
    }
  }
  R.App = App;
  R.boot = function (canvas) {
    if (!R.campaigns.names().length) throw new Error('No campaigns registered');
    const app = new App(canvas);
    globalThis.APP = app;
    return app;
  };
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
