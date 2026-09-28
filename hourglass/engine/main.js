/*
 * App shell (Hourglass): canvas sizing, keyboard input, screens
 * (title / intro / level card / play / menu / dialog / dead / complete / won /
 * time-up) and the main loop.
 */
(function (R) {
  'use strict';
  const U = R.util;

  const OPT_KEY = 'hourglass.options';
  const saveKey = id => `hourglass.save.${id}`;
  const TIME_LIMIT = 3600;

  class App {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx2d = canvas.getContext('2d', { alpha: false });
      this.keys = new Set();
      this.pressed = [];
      this.audio = new R.AudioSys();
      this.opts = Object.assign({ music: true, sound: true, detail: 200, alwaysRun: true, bob: true, peek: true }, this.loadJSON(OPT_KEY) || {});
      this.acc = 0;
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
      // a stray Ctrl+W or F5 mid-jump should not end the run without asking
      globalThis.addEventListener('beforeunload', e => { if (this.state === 'play' || this.state === 'menu' || this.state === 'dead') { e.preventDefault(); e.returnValue = ''; } });
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
      this.bank.buildAllTextures();
      this.ui = new R.UI(this);
      this.game = this.makeGame();
      this.attract = { t: 0 };
      if (this.W) this.resize();
      document.title = (this.camp.title || this.camp.id) + (this.camp.subtitle ? ' — ' + this.camp.subtitle : '');
    }
    makeGame() {
      return new R.Game(this.camp, {
        sound: (n, v, pan) => this.audio.play(n, v, pan),
        msg: (t, s) => this.ui.addMessage(t, s),
        dialog: (title, text, then) => { this.dialog = { title, text, then }; this.state = 'dialog'; this.audio.play('page'); },
        flash: (rgb, a) => { this.flashRGB = rgb; this.flashA = Math.max(this.flashA, a); },
        shake: t => { this.shakeT = Math.max(this.shakeT, t); },
        face: st => this.ui.setFace(st),
        area: label => this.ui.banner(label),
        music: name => { if (this.state === 'play') this.audio.playSong(name); },
        died: () => { this.state = 'dead'; this.deadT = 0; },
        levelDone: () => { this.state = 'complete'; this.completeT = 0; this.audio.play('fanfare'); },
        won: info => { this.wonInfo = info; this.state = 'won'; this.wonT = 0; this.audio.playSong(this.camp.endingMusic || null); this.audio.play('fanfare'); this.clearSave(); },
      });
    }
    currentMusic() {
      const g = this.game, s = g.footSpan();
      return (s && s.music) || this.camp.levels[g.levelIndex].music || this.camp.defaultMusic || null;
    }

    // ------------------------------------------------------------ transitions
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
      // Ctrl is never bound: Ctrl+W would close the tab mid-jump
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
    wasPressed(...codes) { return this.pressed.some(c => codes.includes(c)); }
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
      const careful = k('KeyC');
      if (careful) run = false;
      const look = this.showMap ? 0 : (k('PageDown', 'KeyZ') ? 1 : 0) - (k('PageUp', 'KeyX') ? 1 : 0);
      return {
        fwd, strafe, turn, run, careful, look: -look, center: k('Home', 'End'),
        jump: this.wasPressed('Space'), use: this.wasPressed('KeyE', 'Enter', 'NumpadEnter'), about: this.wasPressed('KeyQ'),
      };
    }

    // ------------------------------------------------------------ save/load (level starts)
    saveGame() { this.saveJSON(saveKey(this.camp.id), this.game.serialize()); }
    hasSave() { return !!this.loadJSON(saveKey(this.camp.id)); }
    savedLevel() { const s = this.loadJSON(saveKey(this.camp.id)); return s ? s.level : -1; }
    clearSave() { try { localStorage.removeItem(saveKey(this.camp.id)); } catch (e) { /* ignore */ } }
    continueGame() {
      const s = this.loadJSON(saveKey(this.camp.id));
      if (!s) return false;
      this.game = this.makeGame();
      try { this.game.deserialize(s); } catch (e) { console.warn(e); this.game = this.makeGame(); this.ui.addMessage('THAT SAVE CANNOT BE LOADED', 4); return false; }
      this.showCard();
      return true;
    }
    newGame(timed) {
      this.startMelt();
      this.game = this.makeGame();
      this.chimed = 99;
      this.game.persist.timed = !!timed;
      this.menuStack = []; this.menuKind = null;
      this.ui.msgs = []; this.ui.setFace('normal');
      if (this.camp.intro) { this.state = 'intro'; this.introT = 0; this.audio.playSong(this.camp.introMusic || this.camp.titleMusic || null); }
      else this.showCard();
    }
    /** Title card for the current level ("LEVEL 2 — THE CHASM"). */
    showCard() {
      this.startMelt();
      this.state = 'card'; this.cardT = 0;
      this.menuStack = []; this.menuKind = null;
      this.audio.playSong(this.camp.cardMusic || null);
    }
    beginLevel() {
      this.startMelt();
      this.state = 'play';
      this.ui.msgs = [];
      this.saveGame();
      this.audio.playSong(this.currentMusic());
      const lv = this.camp.levels[this.game.levelIndex];
      if (lv.startMessage) this.ui.addMessage(lv.startMessage, 7);
    }
    restartLevel() {
      this.game.restartLevel();
      this.showCard();
    }

    // ------------------------------------------------------------ menus
    menuItems(kind) {
      const o = this.opts, onoff = v => (v ? 'ON' : 'OFF');
      if (kind === 'title') {
        const lv = this.savedLevel();
        return [
          { label: 'New Game', action: () => this.openMenu('mode') },
          { label: lv >= 0 ? `Continue (Level ${lv + 1})` : 'Continue', disabled: lv < 0, action: () => this.continueGame() },
          { label: 'Options', action: () => this.openMenu('options') },
          { label: 'Controls', action: () => this.openMenu('controls') },
          { label: 'Story', action: () => { this.dialog = { title: this.camp.intro.title, text: this.camp.intro.text, back: 'title' }; this.state = 'dialog'; } },
        ];
      }
      if (kind === 'mode') {
        return [
          { label: "The Sultan's Hour", value: () => '60:00', action: () => this.newGame(true) },
          { label: 'Wanderer', value: () => 'NO LIMIT', action: () => this.newGame(false) },
          { label: 'Back', action: () => this.backMenu() },
        ];
      }
      if (kind === 'pause') {
        return [
          { label: 'Resume', action: () => this.closeMenus() },
          { label: 'Back to the Brazier', action: () => { this.closeMenus(); this.startMelt(); this.game.persist.deaths++; this.game.respawn(); this.state = 'play'; this.acc = 0; } },
          { label: 'Restart Level', action: () => this.restartLevel() },
          { label: 'Options', action: () => this.openMenu('options') },
          { label: 'Controls', action: () => this.openMenu('controls') },
          { label: 'Quit to Title', action: () => { this.startMelt(); this.state = 'title'; this.menuStack = []; this.menuKind = 'title'; this.menuCursor = 0; this.audio.playSong(this.camp.titleMusic || null); } },
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
          { label: 'Auto Peek', value: () => onoff(o.peek), action: () => { o.peek = !o.peek; this.saveOpts(); } },
          { label: 'Fullscreen', value: () => onoff(!!document.fullscreenElement), action: () => this.toggleFullscreen() },
          { label: 'Back', action: () => this.backMenu() },
        ];
      }
      return [{ label: 'Back', action: () => this.backMenu() }];
    }
    openMenu(kind) { this.menuStack.push({ kind: this.menuKind, cursor: this.menuCursor }); this.menuKind = kind; this.menuCursor = 0; this.audio.play('select'); }
    backMenu() {
      const prev = this.menuStack.pop();
      if (!prev || !prev.kind) { this.closeMenus(); return; }
      this.menuKind = prev.kind; this.menuCursor = prev.cursor; this.audio.play('menu');
    }
    closeMenus() {
      this.menuStack = [];
      if (this.state === 'menu') this.state = 'play';
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
        else if (this.wasPressed('Tab', 'KeyM')) { this.showMap = !this.showMap; ui.mapDz = 0; }
        if (this.showMap) {
          if (this.wasPressed('Equal', 'NumpadAdd')) ui.mapZoom = Math.min(16, ui.mapZoom + 1);
          if (this.wasPressed('Minus', 'NumpadSubtract')) ui.mapZoom = Math.max(2, ui.mapZoom - 1);
          if (this.wasPressed('PageUp')) ui.mapDz = Math.min(12, (ui.mapDz || 0) + 1.5);
          if (this.wasPressed('PageDown')) ui.mapDz = Math.max(-12, (ui.mapDz || 0) - 1.5);
        }
        // fixed physics step: jumps land the same at any frame rate
        const inp = this.readInput(), pend = this.pendingInput;
        if (pend) { inp.jump = inp.jump || pend.jump; inp.use = inp.use || pend.use; inp.about = inp.about || pend.about; this.pendingInput = null; }
        this.acc = Math.min(this.acc + dt, 0.1);
        let first = true;
        while (this.acc >= R.PHYSICS_DT && this.state === 'play') {
          this.acc -= R.PHYSICS_DT;
          g.update(R.PHYSICS_DT, first ? inp : Object.assign({}, inp, { use: false, jump: false, about: false }));
          first = false;
        }
        if (first) this.pendingInput = inp; // edge presses carry over to the next step
        if (g.persist.timed) {
          const left = TIME_LIMIT - g.persist.clock;
          for (const m of [15, 5, 1]) if (left <= m * 60 && (this.chimed || 99) > m) { this.chimed = m; this.audio.play('chime'); this.ui.addMessage(m === 1 ? 'ONE MINUTE LEFT! THE LAST GRAINS ARE FALLING.' : `${m} MINUTES LEFT IN THE HOURGLASS.`, 5); }
          if (left <= 0 && this.state === 'play') { this.state = 'timeup'; this.timeupT = 0; this.audio.play('death'); this.clearSave(); }
        }
      } else if (this.state === 'menu') {
        if (this.wasPressed('Escape')) this.backMenu();
        else this.menuInput(this.menuItems(this.menuKind));
      } else if (this.state === 'dialog') {
        if (this.wasPressed('Space', 'Enter', 'Escape', 'NumpadEnter', 'KeyE')) {
          const d = this.dialog; this.dialog = null;
          this.state = d && d.back ? d.back : 'play';
          if (this.state === 'title') this.menuKind = 'title';
          if (d && d.then) g.runScript(d.then, {});
        }
      } else if (this.state === 'dead') {
        this.deadT += dt;
        g.update(dt, null);
        if ((this.deadT > 0.6 && this.wasPressed('Enter', 'Space', 'NumpadEnter', 'KeyE')) || this.deadT > 1.8) { this.startMelt(); g.respawn(); this.state = 'play'; this.acc = 0; this.ui.addMessage(this.camp.respawnMessage || 'YOU TRY AGAIN...', 2); }
      } else if (this.state === 'complete') {
        this.completeT += dt;
        g.update(dt, null);
        if (this.completeT > 1.2) {
          if (g.nextLevel()) this.showCard();
          else { this.state = 'won'; this.wonT = 0; this.wonInfo = this.camp.ending || {}; this.clearSave(); }
        }
      } else if (this.state === 'card') {
        this.cardT += dt;
        if (this.cardT > 0.6 && this.wasPressed('Enter', 'Space', 'NumpadEnter', 'Escape')) this.beginLevel();
      } else if (this.state === 'won' || this.state === 'timeup') {
        const k = this.state === 'won' ? 'wonT' : 'timeupT';
        this[k] += dt;
        if (this.state === 'won') g.update(dt, null);
        if (this.state === 'timeup' && this[k] > 3 && this.wasPressed('Enter', 'Space')) {
          // the Sultan has drunk... but the thief may still walk out of the dungeon
          this.startMelt(); g.persist.timed = false; this.state = 'play'; this.acc = 0; this.saveGame();
          this.ui.addMessage('THE HOURGLASS IS EMPTY. YOU WANDER ON, WITHOUT A LIMIT.', 6);
          this.audio.playSong(this.currentMusic());
        } else if (this[k] > 3 && this.wasPressed('Enter', 'Space', 'Escape')) { this.startMelt(); this.state = 'title'; this.menuKind = 'title'; this.menuCursor = 0; this.game = this.makeGame(); this.audio.playSong(this.camp.titleMusic || null); }
      } else if (this.state === 'intro') {
        this.introT += dt;
        if (this.wasPressed('Enter', 'Space', 'Escape', 'NumpadEnter')) {
          const full = this.introT * 40 >= this.camp.intro.text.length;
          if (full || this.wasPressed('Escape')) this.showCard(); else this.introT = 1e3;
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
        const a = this.camp.attract || {}, s = g.world.start, t = this.attract.t;
        const x = a.x ?? s.x, y = a.y ?? s.y;
        const c = g.world.cellAt(Math.floor(x), Math.floor(y));
        const sp = c && (R.spanAt(c, (a.z ?? s.z) + 0.01) || c.spans[0]);
        return { x, y, z: (sp ? sp.fl : 0) + cfg.eyeHeight + (a.dz || 0), ang: (a.ang ?? s.ang) + Math.sin(t * 0.12) * (a.sweep ?? 0.8), pitch: a.pitch || 0, light: g.carriedLight() };
      }
      const bob = this.opts.bob ? Math.sin(p.bobPhase * 2) * 0.035 * p.bobAmp : 0;
      let z = p.viewZ + bob - p.dip;
      if (!p.alive) z = p.z + 0.12 + Math.max(0, cfg.eyeHeight - 0.12 - (this.deadT || 0) * 0.8);
      const sh = this.shakeT > 0 ? (Math.random() - 0.5) * this.shakeT * 6 : 0;
      let pitch = p.pitch + (this.opts.peek ? p.autoPitch : 0);
      if (p.act && p.act.kind === 'climb') pitch += 14 * Math.sin(Math.min(1, p.act.t / p.act.dur) * Math.PI);
      if (p.act && p.act.kind === 'hang') pitch -= 10 * Math.sin(Math.min(1, p.act.t / p.act.dur) * Math.PI);
      return { x: p.x, y: p.y, z, ang: p.ang, pitch: (pitch + sh) * (this.viewH / 168), light: g.carriedLight() };
    }

    draw(dt = 0) {
      this.drawScene();
      if (this.meltSrc) this.drawMelt(Math.min(dt, 0.05));
    }
    drawScene() {
      const g = this.game, ui = this.ui, s = this.uiScale, W = this.W, H = this.H, buf = this.buf;
      if (this.fatal) { buf.fill(0xff400000); ui.textC('ENGINE ERROR - SEE CONSOLE', W / 2, H / 2, R.UICOL.white, s); ui.textC(String(this.fatal.message).slice(0, 60).toUpperCase(), W / 2, H / 2 + 12 * s, R.UICOL.text, s); return; }
      if (this.state === 'card') { this.drawCard(); return; }
      const cam = this.camera();
      if (this.showMap && this.state === 'play') ui.drawAutomap(g);
      else {
        this.renderer.render(buf, g.world, cam, g.time);
        this.renderer.sprites(buf, g.spriteList(this.bank, this.renderer.frameNo), cam);
        this.drawHands(buf);
        if (this.flashA > 0) this.renderer.tint(buf, this.flashRGB, Math.min(0.6, this.flashA));
        if (this.state === 'dead' || this.state === 'timeup') this.renderer.tint(buf, [120, 0, 0], Math.min(0.55, ((this.deadT || this.timeupT) || 0) * 0.5));
      }
      if (this.state === 'title') { this.drawTitle(); return; }
      if (this.state === 'intro') { this.drawIntro(); return; }
      ui.drawStatusBar(g);
      if (this.state === 'play' || this.state === 'dead') ui.drawMessages(!this.showMap);
      if (this.state === 'play' && !this.showMap && g.player.hint) this.drawHint(g.player.hint);
      if (this.state === 'menu') {
        ui.shadeRect(0, 0, W, this.viewH, 0.6);
        if (this.menuKind === 'controls') this.drawControls();
        else ui.drawMenu(this.menuKind === 'options' ? 'OPTIONS' : 'PAUSED', this.menuItems(this.menuKind), this.menuCursor, Math.round(this.viewH * 0.1));
      } else if (this.state === 'dialog' && this.dialog) ui.drawDialog(this.dialog);
      else if (this.state === 'dead') {
        ui.textC(this.camp.deathTitle || 'YOU HAVE PERISHED', W / 2, this.viewH * 0.35, R.UIGRAD.red, s * 2);
        if (g.deathCause) ui.textC(g.deathCause.toUpperCase(), W / 2, this.viewH * 0.35 + 22 * s, R.UICOL.text, s);
        if (this.deadT > 0.6) ui.textC('PRESS ENTER', W / 2, this.viewH * 0.35 + 34 * s, R.UICOL.dim, s);
      } else if (this.state === 'complete') {
        ui.textC('LEVEL COMPLETE', W / 2, this.viewH * 0.35, R.UIGRAD.gold, s * 2);
      } else if (this.state === 'timeup') {
        ui.textC('THE LAST GRAIN HAS FALLEN', W / 2, this.viewH * 0.3, R.UIGRAD.red, s * 2);
        if (this.timeupT > 1.5) ui.textC(this.camp.timeupText || 'THE SULTAN DRINKS. YOU ARE TOO LATE.', W / 2, this.viewH * 0.3 + 24 * s, R.UICOL.text, s);
        if (this.timeupT > 3) ui.textC('ENTER: WANDER ON WITHOUT A LIMIT     ESC: TITLE', W / 2, this.H - 12 * s, R.UICOL.dim, s);
      } else if (this.state === 'won') this.drawWon();
    }

    /** Aladdin's hands on the lip while hanging, lowering, catching or pulling up. */
    drawHands(buf) {
      const p = this.game.player, a = p.act;
      if (!a || this.state !== 'play' || !this.bank.spr) return;
      let k = 0; // 0 = hidden above the view, 1 = fully in view
      if (a.kind === 'hang') k = 1;
      else if (a.kind === 'lower') k = Math.max(0, (a.t / a.dur - 0.3) / 0.7);
      else if (a.kind === 'climb') { const f = a.t / a.dur; k = f < 0.15 ? f / 0.15 : f < 0.55 ? 1 : Math.max(0, 1 - (f - 0.55) / 0.3); }
      if (k <= 0) return;
      let spr;
      try { spr = this.bank.sprite('HANDS_GRIP'); } catch (e) { return; }
      const scale = Math.max(1, Math.round(this.viewH / 150)), h = spr.h * scale;
      const c = this.game.cellAt(p.x, p.y), s = c && R.spanAt(c, p.z + 0.3);
      this.renderer.overlay(buf, spr, Math.round(-h + h * U.smooth(Math.min(1, k)) - 2 * scale), Math.min(31, (s ? s.light : 16) + 4));
    }
    /** A small prompt above the status bar: what Space / walking on would do here. */
    drawHint(hint) {
      const ui = this.ui, s = this.uiScale, W = this.W;
      const text = { CLIMB: 'SPACE: CLIMB', JUMP: 'SPACE: JUMP', HANG: 'PRESS FORWARD AGAIN: HANG FROM THE EDGE', EDGE: 'NO WAY DOWN HERE', HANGING: 'SPACE: PULL UP    LET GO OF C: DROP', DRINK: 'E: DRINK' }[hint];
      if (!text) return;
      const w = (text.length * 6 + 8) * s, x = Math.round((W - w) / 2), y = this.viewH - 14 * s;
      ui.panel(x, y, w, 11 * s, '#14100c', 0.55);
      ui.textC(text, W / 2, y + 2 * s, hint === 'EDGE' ? R.UICOL.dim : R.UICOL.gold, s);
    }
    drawCard() {
      const ui = this.ui, W = this.W, H = this.H, s = this.uiScale, g = this.game, lv = this.camp.levels[g.levelIndex];
      ui.tile(this.camp.cardTexture || this.camp.hudTexture || 'STONE_DARK', 0, 0, W, H, 8);
      ui.textC(`LEVEL ${g.levelIndex + 1}`, W / 2, Math.round(H * 0.22), R.UIGRAD.stone, s * 2);
      const name = lv.name.toUpperCase();
      const ts = Math.max(s, Math.min(s * 3, Math.floor((W - 8 * s) / (name.length * 6))));
      ui.textC(name, W / 2, Math.round(H * 0.36), R.UIGRAD.gold, ts);
      if (lv.subtitle) U.wrap(lv.subtitle.toUpperCase(), Math.floor((W / s - 24) / 6)).forEach((ln, i) => ui.textC(ln, W / 2, Math.round(H * 0.55) + i * 10 * s, R.UICOL.text, s));
      const p = g.persist;
      ui.textC(`TIME ${U.formatTime(p.clock)}${p.timed ? '   LEFT ' + U.formatTime(Math.max(0, TIME_LIMIT - p.clock)) : ''}`, W / 2, Math.round(H * 0.74), R.UICOL.dim, s);
      if (this.cardT > 0.6 && Math.floor(this.cardT * 2) % 2) ui.textC('PRESS ENTER', W / 2, H - 14 * s, R.UICOL.gold, s);
    }
    drawTitle() {
      const ui = this.ui, W = this.W, H = this.H, s = this.uiScale, c = this.camp;
      ui.shadeRect(0, 0, W, H, 0.4);
      const ty = Math.round(H * 0.09);
      const ts = Math.max(s, Math.min(s * 4, Math.floor((W - 8 * s) / (c.title.length * 6))));
      ui.textC(c.title.toUpperCase(), W / 2, ty + (s * 4 - ts) * 3, R.UIGRAD.gold, ts);
      if (c.subtitle) ui.textC(c.subtitle.toUpperCase(), W / 2, ty + 34 * s, R.UIGRAD.stone, s);
      if (this.menuKind === 'controls') { this.drawControls(); return; }
      ui.drawMenu(this.menuKind === 'options' ? 'OPTIONS' : null, this.menuItems(this.menuKind), this.menuCursor, Math.round(H * 0.42));
      ui.tile(c.hudTexture || 'STONE_DARK', 0, this.viewH, W, H - this.viewH, 10);
      ui.rect(0, this.viewH, W, s, R.rgb('#8a7050'));
      if (!this.audio.ctx && Math.floor(this.attract.t * 2) % 2) ui.textC('PRESS ANY KEY', W / 2, H - 22 * s, R.UICOL.gold, s);
      ui.textC('ARROWS + ENTER TO CHOOSE   F: FULLSCREEN', W / 2, H - 11 * s, R.UICOL.dim, s);
      if (c.credit) ui.textR(c.credit.toUpperCase(), W - 4 * s, 4 * s, R.UICOL.dim, s);
    }
    drawControls() {
      const ui = this.ui, W = this.W, s = this.uiScale;
      const rows = this.camp.controlsText || [
        ['ARROWS / W S', 'WALK AND TURN'],
        ['A D  OR  ALT + ARROWS', 'SIDESTEP'],
        ['SHIFT', 'WALK / RUN   (CAPS LOCK: ALWAYS RUN)'],
        ['Q', 'TURN AROUND'],
        ['SPACE', 'JUMP / CLIMB UP A LEDGE'],
        ['C (HOLD)', 'CAREFUL STEP - STOPS AT EDGES'],
        ['CAREFUL + WALK OFF', 'HANG AND DROP DOWN'],
        ['E / ENTER', 'USE, OPEN, READ, PULL'],
        ['PGUP / PGDN / HOME', 'LOOK UP / DOWN / CENTRE'],
        ['TAB / M', 'MAP  (+/- ZOOM)'],
        ['F', 'TOGGLE FULLSCREEN'],
        ['ESC', 'MENU'],
      ];
      const h = (rows.length * 11 + 40) * s, w = Math.min(W - 8 * s, 312 * s);
      const x = Math.round((W - w) / 2), y = Math.round((this.H - h) / 2);
      ui.panel(x, y, w, h, '#14100c', 0.92);
      ui.textC('CONTROLS', W / 2, y + 8 * s, R.UIGRAD.gold, s);
      rows.forEach(([k, d], i) => { ui.text(k, x + 8 * s, y + (24 + i * 11) * s, R.UICOL.gold, s); ui.text(d, x + 136 * s, y + (24 + i * 11) * s, R.UICOL.text, s); });
      ui.textC('ESC: BACK', W / 2, y + h - 11 * s, R.UICOL.dim, s);
    }
    drawIntro() {
      const ui = this.ui, W = this.W, H = this.H, s = this.uiScale, intro = this.camp.intro;
      ui.shadeRect(0, 0, W, H, 0.82);
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
      ui.shadeRect(0, 0, W, this.H, Math.min(0.85, this.wonT * 0.25));
      if (this.wonT < 1.5) return;
      ui.textC((info.title || 'THE END').toUpperCase(), W / 2, 10 * s, R.UIGRAD.gold, s * 2);
      const maxC = Math.min(56, Math.floor((W / s - 24) / 6));
      const lines = U.wrap((info.text || '').toUpperCase(), maxC);
      const x = Math.round((W - maxC * 6 * s) / 2);
      lines.forEach((ln, i) => ui.text(ln, x, (34 + i * 9) * s, R.UICOL.text, s));
      const p = g.persist;
      let y = (40 + lines.length * 9) * s;
      const row = (k, v) => { ui.text(k, W / 2 - 90 * s, y, R.UICOL.gold, s); ui.textR(v, W / 2 + 90 * s, y, R.UICOL.white, s); y += 10 * s; };
      row('TIME', U.formatTime(p.clock));
      row('GEMS', `${p.gems} / ${p.gemTotal || '?'}`);
      row('SECRETS', String(p.secrets));
      row('MISHAPS', String(p.deaths));
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
