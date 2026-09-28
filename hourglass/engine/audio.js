/*
 * Audio: synthesized sound effects (WebAudio) and a tiny tracker-style music
 * sequencer. Everything is generated at runtime — no sample files.
 *
 * Sound effects are registered by name:
 *   RetroEngine.sfx.register('boing', (A, out, vol) => A.tone({ f0: 200, f1: 800, dur: 0.3, vol }, out))
 * Songs are plain data (see campaign `music`):
 *   { bpm: 90, steps: 2, tracks: [{ wave: 'triangle', vol: 0.2, pattern: 'A3 - C4 . E4 - . .' }] }
 *   tokens: note (C4, F#3, Bb2) | '.' rest | '-' hold | 'x' noise hit (for wave:'noise')
 */
(function (R) {
  'use strict';
  const SFX = R.sfx = new R.Registry('sound');

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteFreq(tok) {
    const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(tok);
    if (!m) return null;
    let n = NOTE[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const oct = parseInt(m[3], 10);
    const midi = (oct + 1) * 12 + n;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  R.noteFreq = noteFreq;

  class AudioSys {
    constructor() {
      this.ctx = null;
      this.sfxOn = true; this.musicOn = true;
      this.sfxVol = 0.8; this.musicVol = 0.45;
      this.song = null; this.songName = null;
      this.songs = {};
    }
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxOn ? this.sfxVol : 0; this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicOn ? this.musicVol : 0; this.musicBus.connect(this.master);
      // shared noise buffer
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // a small echo for atmosphere on the music bus
      const delay = ctx.createDelay(1); delay.delayTime.value = 0.33;
      const fb = ctx.createGain(); fb.gain.value = 0.28;
      const wet = ctx.createGain(); wet.gain.value = 0.35;
      this.musicBus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.master);
      this.timer = setInterval(() => this.schedule(), 25);
    }
    setSfx(on) { this.sfxOn = on; if (this.sfxBus) this.sfxBus.gain.value = on ? this.sfxVol : 0; }
    setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? this.musicVol : 0, this.ctx.currentTime, 0.1); }

    // ---------------------------------------------------------------- primitives
    tone(o, out) {
      const ctx = this.ctx, t0 = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(o.f0 || 440, t0);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + (o.dur || 0.2));
      if (o.detune) osc.detune.value = o.detune;
      const vol = (o.vol ?? 0.3), a = o.attack ?? 0.005, dur = o.dur || 0.2;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let node = osc;
      if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
      node.connect(g); g.connect(out);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    }
    noise(o, out) {
      const ctx = this.ctx, t0 = ctx.currentTime + (o.delay || 0), dur = o.dur || 0.2;
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
      src.playbackRate.value = o.rate || 1;
      const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass';
      f.frequency.setValueAtTime(o.f0 || 1000, t0);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
      f.Q.value = o.q || 1;
      const g = ctx.createGain(), vol = o.vol ?? 0.3;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (o.attack ?? 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
    }
    play(name, vol = 1, pan = 0) {
      if (!this.ctx || !this.sfxOn || vol <= 0.01) return;
      if (!SFX.has(name)) return;
      let out = this.sfxBus;
      if (pan && this.ctx.createStereoPanner) {
        const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(this.sfxBus); out = p;
      }
      try { SFX.get(name)(this, out, vol); } catch (e) { console.warn('sfx', name, e); }
    }

    // ---------------------------------------------------------------- music
    registerSongs(songs) { Object.assign(this.songs, songs || {}); }
    playSong(name) {
      if (name === this.songName) return;
      this.songName = name;
      if (!this.ctx) return;
      const def = name ? this.songs[name] : null;
      if (!def) { this.song = null; return; }
      const stepDur = 60 / def.bpm / (def.steps || 2);
      const start = this.ctx.currentTime + 0.1;
      this.song = {
        def, stepDur,
        tracks: def.tracks.map(t => ({ t, toks: t.pattern.trim().split(/\s+/), i: 0, next: start })),
      };
    }
    schedule() {
      const s = this.song;
      if (!s || !this.ctx) return;
      const horizon = this.ctx.currentTime + 0.2;
      for (const tr of s.tracks) {
        while (tr.next < horizon) {
          const tok = tr.toks[tr.i];
          if (tok !== '.' && tok !== '-') {
            let len = 1;
            while (tr.toks[(tr.i + len) % tr.toks.length] === '-' && len < tr.toks.length) len++;
            this.voice(tr.t, tok, tr.next, len * s.stepDur);
          }
          tr.i = (tr.i + 1) % tr.toks.length;
          tr.next += s.stepDur;
        }
      }
    }
    voice(t, tok, when, dur) {
      const ctx = this.ctx, out = this.musicBus;
      const vol = t.vol ?? 0.15;
      if (t.wave === 'noise' || tok === 'x' || tok === 'X') {
        const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = ctx.createBiquadFilter(); f.type = t.filter || 'highpass'; f.frequency.value = t.cutoff || (tok === 'X' ? 800 : 5000);
        const g = ctx.createGain(); const d = t.decay || 0.08;
        g.gain.setValueAtTime(vol * (tok === 'X' ? 1.4 : 1), when); g.gain.exponentialRampToValueAtTime(0.0001, when + d);
        src.connect(f); f.connect(g); g.connect(out); src.start(when, Math.random()); src.stop(when + d + 0.02);
        return;
      }
      const freq = noteFreq(tok);
      if (!freq) return;
      const env = t.env || {};
      const a = env.a ?? 0.01, dcy = env.d ?? 0.15, sus = env.s ?? 0.6, rel = env.r ?? 0.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol, when + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * sus), when + a + dcy);
      const end = when + Math.max(dur, a + dcy);
      g.gain.setValueAtTime(Math.max(0.0002, vol * sus), end);
      g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
      let dest = g;
      if (t.cutoff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = t.cutoff; f.connect(g); dest = f; }
      g.connect(out);
      const oscs = t.detune ? [-t.detune, t.detune] : [0];
      for (const dt of oscs) {
        const o = ctx.createOscillator(); o.type = t.wave || 'square'; o.frequency.value = freq * (t.oct ? Math.pow(2, t.oct) : 1); o.detune.value = dt;
        if (t.vibrato) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5; lg.gain.value = t.vibrato; lfo.connect(lg); lg.connect(o.frequency); lfo.start(when); lfo.stop(end + rel + 0.05); }
        o.connect(dest); o.start(when); o.stop(end + rel + 0.05);
      }
    }
  }
  R.AudioSys = AudioSys;

  // ---------------------------------------------------------------- stock sfx
  SFX.register('step', (A, o, v) => A.noise({ dur: 0.07, f0: 380 + Math.random() * 200, vol: 0.22 * v, filter: 'lowpass' }, o));
  SFX.register('land', (A, o, v) => { A.noise({ dur: 0.14, f0: 260, vol: 0.4 * v }, o); A.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.15, vol: 0.4 * v }, o); });
  SFX.register('door', (A, o, v) => { A.noise({ dur: 1.0, f0: 420, f1: 160, vol: 0.35 * v, filter: 'bandpass', q: 1.5, attack: 0.05 }, o); A.tone({ type: 'sawtooth', f0: 52, f1: 44, dur: 1.0, vol: 0.12 * v, lp: 300, attack: 0.05 }, o); });
  SFX.register('locked', (A, o, v) => { A.tone({ type: 'square', f0: 196, dur: 0.09, vol: 0.18 * v, lp: 1200 }, o); A.tone({ type: 'square', f0: 147, dur: 0.14, vol: 0.18 * v, lp: 1200, delay: 0.1 }, o); });
  SFX.register('noway', (A, o, v) => A.tone({ type: 'sine', f0: 120, f1: 70, dur: 0.12, vol: 0.3 * v }, o));
  SFX.register('key', (A, o, v) => { [659, 880, 1319].forEach((f, i) => A.tone({ type: 'square', f0: f, dur: 0.12, vol: 0.12 * v, delay: i * 0.07, lp: 3000 }, o)); });
  SFX.register('item', (A, o, v) => { [523, 659, 784, 1047].forEach((f, i) => A.tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.22 * v, delay: i * 0.08 }, o)); });
  SFX.register('treasure', (A, o, v) => { [1047, 1319, 1568, 2093, 2637].forEach((f, i) => A.tone({ type: 'triangle', f0: f, dur: 0.18, vol: 0.16 * v, delay: i * 0.05 }, o)); A.noise({ dur: 0.4, f0: 6000, filter: 'highpass', vol: 0.05 * v }, o); });
  SFX.register('health', (A, o, v) => A.tone({ type: 'sine', f0: 440, f1: 990, dur: 0.35, vol: 0.25 * v }, o));
  SFX.register('hurt', (A, o, v) => { A.noise({ dur: 0.22, f0: 900, vol: 0.35 * v, filter: 'bandpass', q: 0.8 }, o); A.tone({ type: 'square', f0: 210, f1: 70, dur: 0.22, vol: 0.18 * v, lp: 900 }, o); });
  SFX.register('death', (A, o, v) => { A.tone({ type: 'sawtooth', f0: 320, f1: 35, dur: 1.4, vol: 0.25 * v, lp: 1200 }, o); A.noise({ dur: 1.0, f0: 500, f1: 80, vol: 0.25 * v }, o); });
  SFX.register('crush', (A, o, v) => { A.noise({ dur: 0.35, f0: 240, vol: 0.6 * v }, o); A.tone({ type: 'sine', f0: 70, f1: 28, dur: 0.45, vol: 0.6 * v }, o); A.tone({ type: 'square', f0: 140, f1: 90, dur: 0.1, vol: 0.12 * v, lp: 800 }, o); });
  SFX.register('whoosh', (A, o, v) => A.noise({ dur: 0.55, f0: 500, f1: 1800, vol: 0.35 * v, filter: 'bandpass', q: 0.7, attack: 0.04 }, o));
  SFX.register('zap', (A, o, v) => { A.tone({ type: 'sawtooth', f0: 1400, f1: 300, dur: 0.18, vol: 0.18 * v, lp: 4000 }, o); A.noise({ dur: 0.12, f0: 3000, filter: 'highpass', vol: 0.2 * v }, o); });
  SFX.register('sizzle', (A, o, v) => A.noise({ dur: 0.3, f0: 2500, filter: 'highpass', vol: 0.25 * v }, o));
  SFX.register('swish', (A, o, v) => A.noise({ dur: 0.3, f0: 800, f1: 2400, filter: 'bandpass', q: 2, vol: 0.3 * v, attack: 0.08 }, o));
  SFX.register('clank', (A, o, v) => { A.tone({ type: 'square', f0: 180, dur: 0.08, vol: 0.12 * v, lp: 1500 }, o); A.tone({ type: 'triangle', f0: 1270, dur: 0.25, vol: 0.08 * v }, o); A.noise({ dur: 0.06, f0: 3000, filter: 'highpass', vol: 0.12 * v }, o); });
  SFX.register('switch', (A, o, v) => { A.tone({ type: 'square', f0: 900, dur: 0.03, vol: 0.2 * v }, o); A.tone({ type: 'square', f0: 500, dur: 0.05, vol: 0.2 * v, delay: 0.05 }, o); });
  SFX.register('secret', (A, o, v) => { [392, 523, 659, 784, 1047].forEach((f, i) => A.tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.14 * v, delay: i * 0.12 }, o)); });
  SFX.register('lift', (A, o, v) => { A.tone({ type: 'sawtooth', f0: 65, f1: 60, dur: 1.4, vol: 0.14 * v, lp: 260, attack: 0.1 }, o); A.noise({ dur: 1.4, f0: 300, vol: 0.12 * v, attack: 0.1 }, o); });
  SFX.register('splash', (A, o, v) => A.noise({ dur: 0.35, f0: 2400, f1: 300, vol: 0.3 * v }, o));
  SFX.register('page', (A, o, v) => A.noise({ dur: 0.15, f0: 3500, filter: 'highpass', vol: 0.15 * v, attack: 0.03 }, o));
  SFX.register('chime', (A, o, v) => { [1319, 1760].forEach((f, i) => A.tone({ type: 'sine', f0: f, dur: 0.6, vol: 0.12 * v, delay: i * 0.15 }, o)); });
  SFX.register('hum', (A, o, v) => A.tone({ type: 'sine', f0: 220 + Math.random() * 30, dur: 0.5, vol: 0.08 * v, attack: 0.2 }, o));
  SFX.register('place', (A, o, v) => { [262, 330, 392, 523].forEach(f => A.tone({ type: 'triangle', f0: f, dur: 1.2, vol: 0.12 * v, attack: 0.02 }, o)); A.noise({ dur: 0.6, f0: 5000, filter: 'highpass', vol: 0.06 * v }, o); });
  SFX.register('menu', (A, o, v) => A.tone({ type: 'square', f0: 660, dur: 0.05, vol: 0.12 * v, lp: 2500 }, o));
  SFX.register('select', (A, o, v) => { A.tone({ type: 'square', f0: 523, dur: 0.06, vol: 0.14 * v, lp: 2500 }, o); A.tone({ type: 'square', f0: 784, dur: 0.1, vol: 0.14 * v, lp: 2500, delay: 0.06 }, o); });
  SFX.register('fanfare', (A, o, v) => {
    const seq = [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.75], [1047, 0.9]];
    seq.forEach(([f, d]) => { A.tone({ type: 'square', f0: f, dur: 0.3, vol: 0.12 * v, delay: d, lp: 2500 }, o); A.tone({ type: 'triangle', f0: f / 2, dur: 0.3, vol: 0.15 * v, delay: d }, o); });
  });
  SFX.register('rumble', (A, o, v) => { A.noise({ dur: 2.5, f0: 120, vol: 0.5 * v, attack: 0.3 }, o); A.tone({ type: 'sine', f0: 40, f1: 30, dur: 2.5, vol: 0.4 * v, attack: 0.3 }, o); });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
