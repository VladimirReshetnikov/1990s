/*
 * Hourglass — music and extra sound effects. Songs are registered on the
 * campaign (one per level: cells, chasm, blades, forge, tower; plus title and
 * finale); sound effects on RetroEngine.sfx (same names override).
 *
 * MUSIC. Everything is in D Hijaz (Phrygian dominant: D Eb F# G A Bb C) over a
 * D drone, with darbuka-style percussion: a low "doum" (a short triangle thump)
 * and a high "tek" (a bandpassed noise slap; 'X' accented, 'x' a soft "ka").
 * The rhythmic songs run at 100 bpm, so one beat is 0.6 s: the dungeon's
 * hazard beat. A 16-step bar at steps: 4 (or an 8-step bar at steps: 2) lasts
 * 2.4 s, the period of a slicer, a pendulum or a dart launcher.
 *   ney   breathy triangle with vibrato (lonely, distant)
 *   oud   plucked, doubled-course sawtooth (two slightly detuned strings)
 *   zurna nasal, filtered square with vibrato (bright, urgent, triumphant)
 * Each bar below is one string, so every bar can be counted by eye.
 *
 * SOUND. Built from the engine's A.tone / A.noise plus three small helpers:
 *   N(...)      A.noise with a safe playback rate (see below)
 *   metal(...)  inharmonic partials for iron, steel blades and bells
 *   vox(...)    a formant-filtered voice for Aladdin's grunts and scream
 */
(function (R) {
  'use strict';
  const camp = R.campaigns.get('hourglass');

  // ================================================================== music
  const bars = (...b) => b.join(' ');
  const rep = (s, n) => Array(n).fill(s).join(' ');
  const hold = (note, n) => [note].concat(Array(n - 1).fill('-')).join(' ');   // a note held for n steps

  // instruments (spread into a track, then add vol and pattern)
  const DRONE = { wave: 'sawtooth', cutoff: 340, detune: 7, env: { a: 2, d: 1, s: 0.9, r: 2 } };
  const NEY = { wave: 'triangle', vibrato: 4, env: { a: 0.07, d: 0.3, s: 0.75, r: 0.3 } };
  const OUD = { wave: 'sawtooth', cutoff: 1300, detune: 5, env: { a: 0.003, d: 0.26, s: 0, r: 0.1 } };
  const ZURNA = { wave: 'square', cutoff: 2200, vibrato: 5, env: { a: 0.02, d: 0.2, s: 0.75, r: 0.14 } };
  const DOUM = { wave: 'triangle', env: { a: 0.002, d: 0.2, s: 0, r: 0.05 } };
  const TEK = { wave: 'noise', filter: 'bandpass', cutoff: 3200, decay: 0.05 };
  const BREATH = { wave: 'noise', filter: 'bandpass', cutoff: 1300, decay: 0.18 };

  camp.music.title = {
    bpm: 100, steps: 2, tracks: [   // 8 bars of 8 (19.2 s): the theme on the ney over an oud ostinato
      Object.assign({}, DRONE, { vol: 0.028, pattern: hold('D2', 64) }),
      Object.assign({}, DRONE, { vol: 0.018, pattern: hold('A2', 64) }),
      Object.assign({}, OUD, { vol: 0.07, pattern: bars(
        'D3 . D4 . A3 . F#3 G3', 'A3 . G3 F#3 Eb3 . D3 .', 'D3 . D4 . A3 . F#3 G3', 'A3 Bb3 A3 G3 F#3 . Eb3 .',
        'D3 . D4 . A3 . F#3 G3', 'A3 . G3 F#3 Eb3 . D3 .', 'G3 . Bb3 . A3 G3 F#3 Eb3', 'D3 . . . D3 . . .') }),
      Object.assign({}, NEY, { vol: 0.072, pattern: bars(
        '. . . . . . . .', '. . . . A4 - Bb4 -', 'A4 - - - G4 F#4 G4 -', 'A4 - - - - - . .',
        'D5 - C5 Bb4 A4 - Bb4 A4', 'G4 - F#4 - Eb4 - F#4 -', 'G4 - F#4 Eb4 D4 - - -', '- - - - . . . .') }),
      Object.assign({}, BREATH, { vol: 0.04, pattern: bars(
        '. . . . . . . .', '. . . . x . . .', 'x . . . . . . .', 'x . . . . . . .',
        'x . . . . . . .', 'x . . . . . . .', 'x . . . . . . .', '. . . . . . . .') }),
      Object.assign({}, DOUM, { vol: 0.17, pattern: rep('D2 . . . D2 . . .', 7) + ' D2 . . . D2 . D2 .' }),   // maqsum
      Object.assign({}, TEK, { vol: 0.09, pattern: rep('. X . x . . X .', 8) }),
    ],
  };

  camp.music.cells = {
    bpm: 100, steps: 2, tracks: [   // sparse and lonely: a bare drone, a far-off ney, drips and a slow heartbeat doum
      Object.assign({}, DRONE, { vol: 0.032, cutoff: 280, pattern: hold('D2', 48) + ' ' + hold('Eb2', 16) }),
      Object.assign({}, NEY, { vol: 0.048, vibrato: 5, env: { a: 0.14, d: 0.4, s: 0.7, r: 0.45 }, pattern: bars(
        '. . . . . . . .', 'A4 - - - Bb4 - A4 -', '- - - - - - . .', '. . . . . . . .',
        'G4 - A4 - Bb4 - C5 -', 'Bb4 - A4 - - - G4 F#4', 'Eb4 - - - D4 - - -', '- - - - - - . .') }),
      Object.assign({}, BREATH, { vol: 0.025, pattern: bars(
        '. . . . . . . .', 'x . . . . . . .', '. . . . . . . .', '. . . . . . . .',
        'x . . . . . . .', '. . . . . . . .', 'x . . . . . . .', '. . . . . . . .') }),
      { wave: 'sine', vol: 0.06, env: { a: 0.001, d: 0.09, s: 0, r: 0.05 }, pattern: bars(   // water dripping in a cell
        '. . . . . D6 . .', '. . . . . . . .', '. . . . . . . A5', '. . . . . . . .',
        '. . . . . . D6 .', '. Bb5 . . . . . .', '. . . . . . . .', '. A5 . . . . . .') },
      Object.assign({}, DOUM, { vol: 0.11, env: { a: 0.002, d: 0.3, s: 0, r: 0.08 }, pattern: rep('D2 . . . . . . .', 8) }),
    ],
  };

  camp.music.chasm = {
    bpm: 100, steps: 2, tracks: [   // vast and slow: a deep drone, a D - Eb - D pad, a high far ney, a distant boom every 4.8 s
      Object.assign({}, DRONE, { vol: 0.034, cutoff: 230, detune: 10, pattern: hold('D2', 64) }),
      { wave: 'triangle', vol: 0.028, env: { a: 2.5, d: 1, s: 0.8, r: 3 }, pattern: hold('A3', 32) + ' ' + hold('Bb3', 16) + ' ' + hold('A3', 16) },
      { wave: 'triangle', vol: 0.024, env: { a: 2.5, d: 1, s: 0.8, r: 3 }, pattern: hold('F#3', 32) + ' ' + hold('G3', 16) + ' ' + hold('F#3', 16) },
      { wave: 'sine', vol: 0.046, vibrato: 6, env: { a: 0.35, d: 0.5, s: 0.8, r: 0.9 }, pattern: bars(
        '. . . . . . . .', 'A5 - - - - - - -', '- - - - G5 - F#5 -', 'G5 - - - - - . .',
        '. . . . . . . .', 'Bb5 - - - A5 - G5 -', 'F#5 - Eb5 - - - D5 -', '- - - - - - - .') },
      { wave: 'sine', vol: 0.075, env: { a: 0.004, d: 1.6, s: 0, r: 0.5 }, pattern: rep('D2 ' + rep('.', 15), 4) },
      { wave: 'noise', filter: 'bandpass', cutoff: 1100, decay: 0.3, vol: 0.06, pattern: rep('.', 24) + ' x ' + rep('.', 31) + ' x ' + rep('.', 7) },
    ],
  };

  camp.music.blades = {
    bpm: 100, steps: 4, tracks: [   // tense and metallic: maqsum on 16ths, a ticking blade on every beat, a stabbing Eb
      Object.assign({}, DRONE, { vol: 0.022, cutoff: 260, pattern: hold('D2', 64) }),
      Object.assign({}, DOUM, { vol: 0.16, env: { a: 0.002, d: 0.14, s: 0, r: 0.04 }, pattern: bars(
        'D2 . . . . . . . D2 . . . . . . .', 'D2 . . . . . . . D2 . . . . . . .',
        'D2 . . . . . . . D2 . . . . . . .', 'D2 . . . . . . . D2 . . D2 . . D2 .') }),
      Object.assign({}, TEK, { vol: 0.085, decay: 0.04, pattern: rep('. . X . . . X x . . . . X . x .', 3) + ' . . X . . . X x . . X . X x X x' }),
      { wave: 'triangle', vol: 0.045, detune: 35, env: { a: 0.001, d: 0.07, s: 0, r: 0.03 }, pattern: rep('D6 . . . A5 . . . D6 . . . A5 . . .', 4) },
      { wave: 'sawtooth', vol: 0.1, cutoff: 480, env: { a: 0.003, d: 0.12, s: 0.25, r: 0.06 }, pattern: bars(
        'D2 . . D2 . . Eb2 . D2 . . D2 . . C2 .', 'D2 . . D2 . . Eb2 . D2 . . D2 . . C2 .',
        'D2 . . D2 . . Eb2 . D2 . . D2 . . C2 .', 'D2 . . D2 . . Eb2 . D2 . . Eb2 . . F#2 .') },
      { wave: 'square', vol: 0.05, cutoff: 1800, detune: 4, env: { a: 0.003, d: 0.15, s: 0.15, r: 0.08 }, pattern: bars(
        'A4 . . Bb4 . . A4 . . . . . . . . .', 'A4 . . Bb4 . . C5 . Bb4 . A4 . . . . .',
        'D5 . . Eb5 . . D5 . C5 . Bb4 . A4 . . .', 'G4 . F#4 . Eb4 . F#4 . D4 . . . . . . .') },
    ],
  };

  camp.music.forge = {
    bpm: 100, steps: 4, tracks: [   // heavy and low: saidi (the doubled doum), a pounding 3-3-2 bass, anvils on the backbeat
      Object.assign({}, DOUM, { vol: 0.15, env: { a: 0.002, d: 0.22, s: 0, r: 0.05 }, pattern: bars(
        'D2 . . . . . D2 . D2 . . . . . . .', 'D2 . . . . . D2 . D2 . . . . . . .',
        'D2 . . . . . D2 . D2 . . . . . . .', 'D2 . . . . . D2 . D2 . . . D2 . D2 .') }),
      Object.assign({}, TEK, { vol: 0.08, cutoff: 2600, pattern: rep('. . X . . . . . . . . . X . . .', 3) + ' . . X . . . . . . . . . X x X x' }),
      { wave: 'sawtooth', vol: 0.055, cutoff: 360, detune: 8, env: { a: 0.004, d: 0.25, s: 0.5, r: 0.08 }, pattern: bars(
        'D2 - - D2 - - Eb2 - D2 - - D2 - - A1 -', 'D2 - - D2 - - Eb2 - D2 - - C2 - - Bb1 -',
        'D2 - - D2 - - Eb2 - D2 - - D2 - - A1 -', 'D2 - - F#2 - - G2 - A2 - - G2 - - F#2 Eb2') },
      { wave: 'triangle', vol: 0.034, detune: 40, env: { a: 0.001, d: 0.3, s: 0, r: 0.1 }, pattern: bars(
        '. . . . A5 . . . . . . . A5 . . .', '. . . . A5 . . . . . . . A5 . . .',
        '. . . . A5 . . . . . . . A5 . . .', '. . . . A5 . . . . . . . A5 . A5 .') },
      Object.assign({}, ZURNA, { vol: 0.036, cutoff: 900, vibrato: 3, pattern: bars(
        'D3 - - - - - - - Eb3 - - - D3 - - -', 'F#3 - - - G3 - - - A3 - - - - - - -',
        'Bb3 - - - A3 - - - G3 - F#3 - G3 - - -', 'F#3 - Eb3 - D3 - - - - - - - . . . .') }),
    ],
  };

  camp.music.tower = {
    bpm: 100, steps: 4, tracks: [   // rising and urgent: the harmony climbs D - Eb - F#dim - Gm/A, running oud 16ths
      Object.assign({}, DOUM, { vol: 0.17, env: { a: 0.002, d: 0.14, s: 0, r: 0.04 }, pattern: rep('D2 . . . D2 . . . D2 . . . D2 . . .', 3) + ' D2 . . . D2 . . . D2 . D2 . D2 . D2 .' }),
      Object.assign({}, TEK, { vol: 0.09, decay: 0.04, pattern: rep('. . x . . . X . . . x . . . X x', 4) }),
      Object.assign({}, OUD, { vol: 0.062, cutoff: 1500, env: { a: 0.002, d: 0.14, s: 0, r: 0.06 }, pattern: bars(
        'D3 F#3 A3 D4 A3 F#3 D3 F#3 D3 F#3 A3 D4 A3 F#3 D3 F#3', 'Eb3 G3 Bb3 Eb4 Bb3 G3 Eb3 G3 Eb3 G3 Bb3 Eb4 Bb3 G3 Eb3 G3',
        'F#3 A3 C4 Eb4 C4 A3 F#3 A3 F#3 A3 C4 Eb4 C4 A3 F#3 A3', 'G3 Bb3 D4 G4 D4 Bb3 G3 Bb3 A3 C4 Eb4 F#4 Eb4 C4 A3 F#3') }),
      { wave: 'sawtooth', vol: 0.038, cutoff: 300, detune: 6, env: { a: 0.01, d: 0.4, s: 0.6, r: 0.1 }, pattern: bars(
        hold('D2', 16), hold('Eb2', 16), hold('F#2', 16), hold('G2', 8) + ' ' + hold('A1', 8)) },
      Object.assign({}, ZURNA, { vol: 0.036, pattern: bars(
        'D5 - - - Eb5 - F#5 - G5 - - - F#5 - Eb5 -', 'Eb5 - - - F#5 - G5 - A5 - - - G5 - F#5 -',
        'F#5 - - - G5 - A5 - Bb5 - - - A5 - G5 -', 'G5 - - - A5 - Bb5 - C6 - Bb5 - A5 - - -') }),
    ],
  };

  const arp = (r, t, f, o) => `${r} ${f} ${o} ${f} ${t} ${f} ${o} ${f}`;   // oud: root, fifth, octave, fifth, third above ...
  const CH = { D: arp('D3', 'F#4', 'A3', 'D4'), Eb: arp('Eb3', 'G4', 'Bb3', 'Eb4'), Gm: arp('G3', 'Bb4', 'D4', 'G4'), Cm: arp('C3', 'Eb4', 'G3', 'C4') };
  camp.music.finale = {
    bpm: 100, steps: 2, tracks: [   // triumphant dawn: the Hijaz tonic is a major chord; zurna over oud, full maqsum
      Object.assign({}, DRONE, { vol: 0.029, cutoff: 480, env: { a: 0.5, d: 1, s: 0.9, r: 1.5 }, pattern: hold('D2', 64) }),
      Object.assign({}, DRONE, { vol: 0.019, cutoff: 480, env: { a: 0.5, d: 1, s: 0.9, r: 1.5 }, pattern: hold('A2', 64) }),
      Object.assign({}, OUD, { vol: 0.06, pattern: bars(CH.D, CH.Eb, CH.D, CH.D, CH.Gm, CH.Cm, CH.D, CH.D) }),
      Object.assign({}, ZURNA, { vol: 0.042, cutoff: 2400, pattern: bars(
        'D5 - - - F#5 - A5 -', 'G5 - F#5 - Eb5 - D5 -', 'F#5 - G5 - A5 - Bb5 A5', 'A5 - - - - - . .',
        'D6 - C6 - Bb5 - A5 -', 'G5 - A5 - Bb5 - A5 G5', 'F#5 - Eb5 - F#5 - G5 -', 'F#5 - - - D5 - . .') }),
      Object.assign({}, DOUM, { vol: 0.15, pattern: bars(rep('D2 . . . D2 . . .', 3), 'D2 . . D2 D2 . . .', rep('D2 . . . D2 . . .', 3), 'D2 . . D2 D2 . D2 .') }),
      Object.assign({}, TEK, { vol: 0.085, pattern: rep('. X . X . . X .', 7) + ' . X x X x X X x' }),
    ],
  };

  // ================================================================== sound effects
  const SFX = R.sfx;
  const reg = (name, fn) => SFX.register(name, fn);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const T = (A, out, o) => A.tone(o, out);
  // A.noise plays the shared 2-second noise buffer from a random offset of up to
  // 1.5 s, so at rate 1 anything longer than ~0.45 s can run off its end and stop
  // dead. Slowing the playback keeps it going (and only darkens the top octave).
  const N = (A, out, o) => A.noise(Object.assign({}, o, { rate: Math.min(o.rate || 1, 0.48 / ((o.dur || 0.2) + 0.05)) }), out);

  // [frequency ratio, amplitude, decay] of the modes of struck metal
  const BAR = [[1, 1, 1], [2.756, 0.5, 0.6], [5.404, 0.28, 0.35], [8.933, 0.14, 0.2]];   // an iron bar or grille
  const BLADE = [[1, 1, 1], [2.32, 0.45, 0.5], [4.25, 0.22, 0.3], [6.63, 0.1, 0.2]];    // thin steel
  const BELL = [[0.5, 0.35, 1.2], [1, 1, 1], [1.19, 0.4, 0.8], [1.5, 0.28, 0.6], [2, 0.3, 0.5], [2.52, 0.12, 0.35], [3.01, 0.08, 0.25]];
  function metal(A, out, f, o, modes = BAR) {
    for (const [r, a, d] of modes) {
      const fr = f * r;
      if (fr > 9000) continue;
      T(A, out, { type: 'sine', f0: fr, f1: o.bend ? fr * o.bend : 0, dur: Math.max(0.03, o.dur * d), vol: o.vol * a, attack: o.attack ?? 0.002, delay: o.delay || 0 });
    }
  }
  // Aladdin's voice: a buzzing glottal sawtooth through three vowel formants [Hz, Q, gain]
  const AH = [[760, 6, 1], [1180, 7, 0.55], [2550, 9, 0.22]];
  const UH = [[580, 6, 1], [1000, 7, 0.45], [2400, 9, 0.16]];
  function vox(A, out, o) {
    const ctx = A.ctx, t0 = ctx.currentTime + (o.delay || 0), dur = o.dur, a = o.attack ?? 0.02;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t0 + dur);
    if (o.vib) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vibRate || 6; lg.gain.value = o.vib;
      lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    const g = ctx.createGain(), vol = o.vol, held = t0 + Math.max(a + 0.01, dur * (o.hold ?? 0.4));
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + a);
    g.gain.setValueAtTime(vol, held);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(out);
    for (const [f, q, k] of o.formants || AH) {
      const bp = ctx.createBiquadFilter(), fg = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; fg.gain.value = k;
      osc.connect(bp); bp.connect(fg); fg.connect(g);
    }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
    if (o.breath) N(A, out, { dur, f0: 1400, filter: 'bandpass', q: 1, vol: o.breath, attack: a, delay: o.delay || 0 });
  }

  // ------------------------------------------------------------ Aladdin
  reg('step', (A, o, v) => {   // sandy: two grains of grit and a soft heel
    const f = rnd(1500, 2400);
    N(A, o, { dur: 0.05, f0: f, filter: 'bandpass', q: 1.3, vol: 0.13 * v, attack: 0.003 });
    N(A, o, { dur: 0.04, f0: f * rnd(1.3, 1.7), filter: 'bandpass', q: 2, vol: 0.07 * v, delay: rnd(0.015, 0.03) });
    N(A, o, { dur: 0.07, f0: rnd(220, 320), vol: 0.2 * v, attack: 0.004 });
  });
  reg('jump', (A, o, v) => {   // a push-off scuff and a rush of air
    N(A, o, { dur: 0.08, f0: 1800, f1: 800, filter: 'bandpass', q: 1.2, vol: 0.18 * v, attack: 0.002 });
    N(A, o, { dur: 0.2, f0: 600, f1: 1400, filter: 'bandpass', q: 1.5, vol: 0.08 * v, attack: 0.06 });
    N(A, o, { dur: 0.06, f0: 280, vol: 0.15 * v });
  });
  reg('land', (A, o, v) => {   // a thud that gets heavier (lower, longer, crunchier) with the volume: 0.5 soft, 0.8 hard, 1 hurt
    const w = Math.min(1, v);
    T(A, o, { type: 'sine', f0: 135 - 45 * w, f1: 38, dur: 0.1 + 0.2 * w, vol: 0.5 * v, attack: 0.003 });
    N(A, o, { dur: 0.08 + 0.14 * w, f0: 520 - 220 * w, f1: 120, vol: 0.4 * v, attack: 0.002 });
    N(A, o, { dur: 0.06, f0: rnd(1800, 2400), filter: 'bandpass', q: 1, vol: 0.12 * v, delay: 0.01 });   // sand spray
    if (v > 0.9) N(A, o, { dur: 0.09, f0: 900, filter: 'bandpass', q: 2, vol: 0.3 * v, delay: 0.015 });   // the crunch of a bad landing
  });
  reg('grab', (A, o, v) => {   // two hands slap onto the stone lip
    N(A, o, { dur: 0.045, f0: 1700, filter: 'bandpass', q: 1.4, vol: 0.3 * v, attack: 0.002 });
    N(A, o, { dur: 0.05, f0: 1300, filter: 'bandpass', q: 1.4, vol: 0.24 * v, delay: 0.035, attack: 0.002 });
    T(A, o, { type: 'triangle', f0: 190, f1: 120, dur: 0.07, vol: 0.14 * v });
  });
  reg('climb', (A, o, v) => {   // a strained breath, cloth scraping up the stone, a knee on the ledge
    vox(A, o, { f0: 165, f1: 150, dur: 0.3, vol: 0.35 * v, attack: 0.05, hold: 0.5, formants: UH, breath: 0.08 * v });
    N(A, o, { dur: 0.3, f0: 700, f1: 1500, filter: 'bandpass', q: 2.5, vol: 0.16 * v, attack: 0.06 });
    N(A, o, { dur: 0.07, f0: 320, vol: 0.24 * v, delay: 0.33 });
    N(A, o, { dur: 0.04, f0: 2000, filter: 'bandpass', q: 1.5, vol: 0.08 * v, delay: 0.35 });
  });
  reg('drop', (A, o, v) => {   // let go: cloth flaps, hands brush the lip
    N(A, o, { dur: 0.14, f0: 1000, f1: 450, filter: 'bandpass', q: 1.2, vol: 0.2 * v, attack: 0.01 });
    N(A, o, { dur: 0.035, f0: 1600, filter: 'bandpass', q: 1.5, vol: 0.14 * v });
  });
  reg('bump', (A, o, v) => {   // head on the ceiling: a dull knock
    T(A, o, { type: 'triangle', f0: 240, f1: 110, dur: 0.1, vol: 0.3 * v });
    T(A, o, { type: 'sine', f0: 95, f1: 60, dur: 0.12, vol: 0.28 * v });
    N(A, o, { dur: 0.06, f0: 900, filter: 'bandpass', q: 1.2, vol: 0.2 * v });
  });
  reg('scream', (A, o, v) => {   // "Aaaaah..." falling away, the pitch sagging
    vox(A, o, { f0: 560, f1: 290, dur: 1.4, vol: 0.55 * v, attack: 0.04, hold: 0.35, vib: 14, vibRate: 7, formants: AH, breath: 0.05 * v });
  });
  reg('hurt', (A, o, v) => {   // "Ugh!" and the blow
    vox(A, o, { f0: 205, f1: 140, dur: 0.24, vol: 0.48 * v, attack: 0.01, hold: 0.3, formants: UH, breath: 0.05 * v });
    N(A, o, { dur: 0.12, f0: 700, filter: 'bandpass', q: 0.8, vol: 0.27 * v, attack: 0.001 });
    T(A, o, { type: 'sine', f0: 150, f1: 60, dur: 0.15, vol: 0.27 * v });
  });
  reg('death', (A, o, v) => {   // a groan, the body falls, a low bell tolls
    vox(A, o, { f0: 230, f1: 90, dur: 0.9, vol: 0.45 * v, attack: 0.02, hold: 0.35, vib: 6, vibRate: 5, formants: AH, breath: 0.04 * v });
    N(A, o, { dur: 0.3, f0: 380, vol: 0.32 * v, delay: 0.6 });
    T(A, o, { type: 'sine', f0: 90, f1: 35, dur: 0.4, vol: 0.36 * v, delay: 0.6 });
    metal(A, o, 146.8, { vol: 0.11 * v, dur: 2.4, delay: 0.62 }, BELL);
    metal(A, o, 155.6, { vol: 0.04 * v, dur: 2.0, delay: 0.64 }, BELL);   // D against Eb: the Hijaz rub, a sour toll
  });

  // ------------------------------------------------------------ floors, plates, gates
  reg('rattle', (A, o, v) => {   // LOOSE FLOOR: the slab chatters in its seat, faster and faster, over a grinding groan
    let t = 0, gap = 0.085;
    for (let i = 0; i < 12 && t < 0.62; i++) {
      const f = rnd(900, 1500);
      N(A, o, { dur: 0.035, f0: f, filter: 'bandpass', q: 2.5, vol: (0.45 + 0.035 * i) * v, delay: t, attack: 0.001 });
      T(A, o, { type: 'triangle', f0: f * 0.45, dur: 0.035, vol: 0.2 * v, delay: t });
      t += gap; gap = Math.max(0.04, gap * 0.88);
    }
    N(A, o, { dur: 0.7, f0: 240, vol: 0.28 * v, attack: 0.12 });
    T(A, o, { type: 'sawtooth', f0: 62, f1: 58, dur: 0.7, vol: 0.1 * v, lp: 300, attack: 0.1 });
    for (let i = 0; i < 6; i++) N(A, o, { dur: 0.02, f0: rnd(2800, 4500), filter: 'bandpass', q: 3, vol: 0.09 * v, delay: rnd(0.1, 0.6) });   // grit trickling through
  });
  reg('crumble', (A, o, v) => {   // the slab cracks away and falls
    N(A, o, { dur: 0.08, f0: 2200, filter: 'bandpass', q: 0.8, vol: 0.42 * v, attack: 0.001 });
    T(A, o, { type: 'sine', f0: 160, f1: 60, dur: 0.15, vol: 0.28 * v });
    N(A, o, { dur: 0.5, f0: 1200, f1: 250, vol: 0.26 * v, attack: 0.02, delay: 0.03 });
    for (let i = 0; i < 5; i++) N(A, o, { dur: 0.03, f0: rnd(1500, 3500), filter: 'bandpass', q: 3, vol: 0.1 * v, delay: rnd(0.05, 0.4) });
  });
  reg('crash', (A, o, v) => {   // stone lands and shatters, shards skitter away
    T(A, o, { type: 'sine', f0: 110, f1: 35, dur: 0.35, vol: 0.4 * v, attack: 0.002 });
    N(A, o, { dur: 0.3, f0: 1800, f1: 300, filter: 'bandpass', q: 0.7, vol: 0.36 * v, attack: 0.001 });
    N(A, o, { dur: 0.25, f0: 420, vol: 0.28 * v, attack: 0.001 });
    for (let i = 0; i < 9; i++) N(A, o, { dur: 0.03, f0: rnd(1200, 4000), filter: 'bandpass', q: 3, vol: 0.16 * v * (1 - i / 10), delay: 0.04 + i * i * 0.008 + rnd(0, 0.02) });
  });
  reg('click', (A, o, v) => {   // pressure plate: the stone sinks - ka-CHUNK - and something turns in the wall
    T(A, o, { type: 'triangle', f0: 190, f1: 140, dur: 0.07, vol: 0.32 * v });
    N(A, o, { dur: 0.05, f0: 500, vol: 0.26 * v });
    T(A, o, { type: 'square', f0: 1400, dur: 0.02, vol: 0.07 * v, lp: 3000, delay: 0.05 });
    N(A, o, { dur: 0.025, f0: 3000, filter: 'bandpass', q: 3, vol: 0.2 * v, delay: 0.05, attack: 0.001 });
    T(A, o, { type: 'sine', f0: 90, f1: 60, dur: 0.14, vol: 0.22 * v, delay: 0.09 });
  });
  reg('gate', (A, o, v) => {   // portcullis: chain links over a sprocket and iron grinding in the grooves
    const L = 0.65;
    for (let t = 0; t < L; t += 0.045) N(A, o, { dur: 0.05, f0: 1300 + t * 900, filter: 'bandpass', q: 5, vol: rnd(0.12, 0.2) * v, delay: t, attack: 0.002 });
    N(A, o, { dur: L, f0: 500, f1: 800, filter: 'bandpass', q: 2, vol: 0.2 * v, attack: 0.05 });
    T(A, o, { type: 'sawtooth', f0: 70, f1: 85, dur: L, vol: 0.12 * v, lp: 380, attack: 0.05 });
  });
  let pawl = 0;
  reg('ratchet', (A, o, v) => {   // one tick of the falling gate's pawl; alternate ticks are pitched tick / tock
    const k = (pawl++ & 1) ? 1 : 0.84;
    N(A, o, { dur: 0.03, f0: 2600 * k, filter: 'bandpass', q: 4, vol: 0.45 * v, attack: 0.001 });
    T(A, o, { type: 'square', f0: 1500 * k, dur: 0.015, vol: 0.11 * v, lp: 3500 });
    T(A, o, { type: 'triangle', f0: 330 * k, dur: 0.05, vol: 0.24 * v });
  });
  reg('clang', (A, o, v) => {   // the portcullis hits the floor: a heavy iron grille ringing
    metal(A, o, 165, { vol: 0.13 * v, dur: 0.9 }, BAR);
    metal(A, o, 247, { vol: 0.065 * v, dur: 0.6, delay: 0.01 }, BAR);
    N(A, o, { dur: 0.12, f0: 1800, filter: 'bandpass', q: 1, vol: 0.22 * v, attack: 0.001 });
    T(A, o, { type: 'sine', f0: 100, f1: 45, dur: 0.25, vol: 0.26 * v });
    N(A, o, { dur: 0.05, f0: 2200, filter: 'bandpass', q: 2, vol: 0.08 * v, delay: 0.13 });   // a small bounce
  });
  reg('switch', (A, o, v) => {   // a lever: a creaking pull, then it clunks home
    T(A, o, { type: 'sawtooth', f0: 130, f1: 95, dur: 0.18, vol: 0.12 * v, lp: 700, attack: 0.02 });
    N(A, o, { dur: 0.16, f0: 900, filter: 'bandpass', q: 3, vol: 0.16 * v, attack: 0.03 });
    metal(A, o, 280, { vol: 0.13 * v, dur: 0.4, delay: 0.17 }, BAR);
    N(A, o, { dur: 0.05, f0: 1500, filter: 'bandpass', q: 1, vol: 0.25 * v, delay: 0.17, attack: 0.001 });
    T(A, o, { type: 'sine', f0: 110, f1: 60, dur: 0.15, vol: 0.22 * v, delay: 0.17 });
  });
  reg('lift', (A, o, v) => {   // a platform on chains: links clatter over the wheel, stone scrapes, a deep strain
    const L = 1.6;
    metal(A, o, 210, { vol: 0.08 * v, dur: 0.3 }, BAR);
    for (let t = 0.05; t < L - 0.1; t += 0.11) N(A, o, { dur: 0.04, f0: rnd(1400, 1800), filter: 'bandpass', q: 5, vol: 0.1 * v, delay: t });
    T(A, o, { type: 'sawtooth', f0: 55, f1: 50, dur: L, vol: 0.12 * v, lp: 220, attack: 0.15 });
    N(A, o, { dur: L, f0: 380, filter: 'bandpass', q: 2, vol: 0.16 * v, attack: 0.15 });
  });

  // ------------------------------------------------------------ traps
  reg('shing', (A, o, v) => {   // slicer warning, 0.3 s before the snap: a blade drawn along a whetstone
    N(A, o, { dur: 0.22, f0: 2500, f1: 6000, filter: 'bandpass', q: 6, vol: 0.55 * v, attack: 0.03 });
    metal(A, o, 1900, { vol: 0.08 * v, dur: 0.35, delay: 0.1 }, BLADE);
  });
  reg('slice', (A, o, v) => {   // the jaws snap shut: a swish, steel on steel, the SNAP
    N(A, o, { dur: 0.1, f0: 5000, f1: 1500, filter: 'bandpass', q: 1.2, vol: 0.35 * v, attack: 0.002 });
    N(A, o, { dur: 0.05, f0: 2500, filter: 'bandpass', q: 1, vol: 0.35 * v, delay: 0.06, attack: 0.001 });
    metal(A, o, 620, { vol: 0.2 * v, dur: 0.45, delay: 0.06 }, BLADE);
    T(A, o, { type: 'sine', f0: 140, f1: 70, dur: 0.12, vol: 0.3 * v, delay: 0.06 });
  });
  reg('spikes', (A, o, v) => {   // spikes spring up: a rising scrape, a bristle of steel points, the frame clacks
    N(A, o, { dur: 0.08, f0: 1500, f1: 5000, filter: 'bandpass', q: 1.5, vol: 0.32 * v });
    for (let i = 0; i < 4; i++) metal(A, o, rnd(1100, 1600), { vol: 0.05 * v, dur: 0.2, delay: 0.05 + i * 0.012 }, BLADE);
    T(A, o, { type: 'triangle', f0: 260, f1: 130, dur: 0.08, vol: 0.22 * v, delay: 0.05 });
    N(A, o, { dur: 0.04, f0: 900, filter: 'bandpass', q: 1, vol: 0.26 * v, delay: 0.05 });
  });
  reg('dartclick', (A, o, v) => {   // dart warning, 0.6 s before: the launcher cocks - tk-CHK
    N(A, o, { dur: 0.025, f0: 2200, filter: 'bandpass', q: 3, vol: 0.45 * v, attack: 0.001 });
    T(A, o, { type: 'square', f0: 700, dur: 0.02, vol: 0.13 * v, lp: 2000 });
    N(A, o, { dur: 0.03, f0: 1700, filter: 'bandpass', q: 3, vol: 0.55 * v, delay: 0.09, attack: 0.001 });
    T(A, o, { type: 'square', f0: 520, dur: 0.025, vol: 0.15 * v, lp: 2000, delay: 0.09 });
  });
  reg('dart', (A, o, v) => {   // launch: the spring lets go (twang) and the dart goes thwip
    N(A, o, { dur: 0.05, f0: 1200, filter: 'bandpass', q: 2, vol: 0.3 * v, attack: 0.001 });
    T(A, o, { type: 'sawtooth', f0: 230, f1: 190, dur: 0.18, vol: 0.1 * v, lp: 900 });
    N(A, o, { dur: 0.22, f0: 3500, f1: 900, filter: 'bandpass', q: 4, vol: 0.34 * v, attack: 0.01, delay: 0.02 });
  });
  reg('creak', (A, o, v) => {   // falling-rock warning: the ceiling groans (two beating saws) and grit trickles down
    T(A, o, { type: 'sawtooth', f0: 95, f1: 72, dur: 0.7, vol: 0.12 * v, lp: 380, attack: 0.12 });
    T(A, o, { type: 'sawtooth', f0: 101, f1: 75, dur: 0.6, vol: 0.08 * v, lp: 380, attack: 0.1, delay: 0.05 });
    N(A, o, { dur: 0.6, f0: 350, filter: 'bandpass', q: 4, vol: 0.18 * v, attack: 0.15 });
    for (let i = 0; i < 10; i++) N(A, o, { dur: 0.02, f0: rnd(2500, 4500), filter: 'bandpass', q: 3, vol: rnd(0.05, 0.1) * v, delay: 0.2 + i * 0.08 + rnd(0, 0.04) });
  });
  reg('rumble', (A, o, v) => {   // a rolling boulder (repeats every ~0.8 s while it rolls): a low roar with bumps on the cobbles
    N(A, o, { dur: 1.0, f0: 170, vol: 0.34 * v, attack: 0.15 });
    T(A, o, { type: 'sine', f0: 48, f1: 42, dur: 1.0, vol: 0.22 * v, attack: 0.15 });
    N(A, o, { dur: 0.9, f0: 650, filter: 'bandpass', q: 1, vol: 0.12 * v, attack: 0.15 });   // gravel crunching under it
    for (let i = 0; i < 3; i++) N(A, o, { dur: 0.08, f0: 480, vol: 0.21 * v, delay: 0.1 + i * 0.28 + rnd(0, 0.05) });
  });
  reg('crush', (A, o, v) => {   // a crusher slams down: stone on stone, a boom, grit
    T(A, o, { type: 'sine', f0: 75, f1: 28, dur: 0.5, vol: 0.45 * v, attack: 0.002 });
    N(A, o, { dur: 0.35, f0: 300, vol: 0.38 * v, attack: 0.001 });
    N(A, o, { dur: 0.08, f0: 1500, filter: 'bandpass', q: 0.8, vol: 0.28 * v, attack: 0.001 });
    for (let i = 0; i < 4; i++) N(A, o, { dur: 0.03, f0: rnd(1500, 3500), filter: 'bandpass', q: 3, vol: 0.1 * v, delay: rnd(0.08, 0.35) });
  });
  reg('whoosh', (A, o, v) => {   // a flame vent fires (it burns 0.9 s): ignition thump, a roar, crackles
    T(A, o, { type: 'sine', f0: 55, f1: 85, dur: 0.25, vol: 0.18 * v, attack: 0.02 });
    N(A, o, { dur: 0.9, f0: 300, f1: 1500, filter: 'bandpass', q: 0.6, vol: 0.22 * v, attack: 0.05 });
    N(A, o, { dur: 0.9, f0: 500, vol: 0.2 * v, attack: 0.03 });
    for (let i = 0; i < 8; i++) N(A, o, { dur: 0.015, f0: rnd(2000, 4000), filter: 'bandpass', q: 2, vol: 0.08 * v, delay: rnd(0.1, 0.8) });
  });
  reg('sizzle', (A, o, v) => {   // burning: spitting crackles over a hiss
    for (let i = 0; i < 6; i++) N(A, o, { dur: rnd(0.04, 0.1), f0: rnd(3000, 5000), filter: 'bandpass', q: 1, vol: rnd(0.1, 0.2) * v, delay: i * 0.05 + rnd(0, 0.03) });
    N(A, o, { dur: 0.4, f0: 3500, filter: 'bandpass', q: 0.7, vol: 0.1 * v, attack: 0.02 });
    T(A, o, { type: 'sine', f0: 120, f1: 70, dur: 0.2, vol: 0.15 * v });
  });
  reg('swish', (A, o, v) => {   // a pendulum blade sweeping through the middle of its swing: vwOOSH
    N(A, o, { dur: 0.4, f0: 500, f1: 1400, filter: 'bandpass', q: 1.6, vol: 0.32 * v, attack: 0.15 });
    T(A, o, { type: 'sine', f0: 190, f1: 140, dur: 0.35, vol: 0.06 * v, attack: 0.12 });
  });

  // ------------------------------------------------------------ potions, fire, pickups
  reg('drink', (A, o, v) => {   // the cork, then three gulps
    N(A, o, { dur: 0.05, f0: 2500, filter: 'bandpass', q: 3, vol: 0.12 * v });
    for (let i = 0; i < 3; i++) {
      T(A, o, { type: 'sine', f0: 420 - i * 30, f1: 240, dur: 0.09, vol: 0.26 * v, delay: 0.1 + i * 0.17 });
      N(A, o, { dur: 0.06, f0: 700, filter: 'bandpass', q: 6, vol: 0.14 * v, delay: 0.1 + i * 0.17 });
    }
  });
  reg('bigdrink', (A, o, v) => {   // gulps, then strength flows in: a rising Hijaz run and a bell
    SFX.get('drink')(A, o, v * 0.8);
    [293.7, 370, 440, 587.3, 740].forEach((f, i) => T(A, o, { type: 'triangle', f0: f, dur: 0.5, vol: 0.13 * v, delay: 0.6 + i * 0.09 }));
    metal(A, o, 1174.7, { vol: 0.05 * v, dur: 1.2, delay: 0.95 }, BELL);
  });
  reg('checkpoint', (A, o, v) => {   // a brazier catches: fwoomp, crackles, and a bright chime
    N(A, o, { dur: 0.7, f0: 250, f1: 1400, vol: 0.36 * v, attack: 0.08 });
    T(A, o, { type: 'sine', f0: 60, f1: 90, dur: 0.3, vol: 0.25 * v, attack: 0.03 });
    for (let i = 0; i < 8; i++) N(A, o, { dur: 0.015, f0: rnd(2000, 4000), filter: 'bandpass', q: 2, vol: 0.08 * v, delay: rnd(0.15, 0.9) });
    metal(A, o, 587.3, { vol: 0.09 * v, dur: 1.4, delay: 0.3 }, BELL);
    metal(A, o, 880, { vol: 0.06 * v, dur: 1.2, delay: 0.45 }, BELL);
  });
  reg('chime', (A, o, v) => {   // the Vizier's hourglass: a temple bell tolls twice, falling a fourth
    metal(A, o, 587.3, { vol: 0.12 * v, dur: 1.8 }, BELL);
    metal(A, o, 440, { vol: 0.12 * v, dur: 2.2, delay: 0.6 }, BELL);
    N(A, o, { dur: 1.2, f0: 5000, filter: 'bandpass', q: 1.5, vol: 0.015 * v, attack: 0.4, delay: 0.3 });   // sand running
  });
  reg('secret', (A, o, v) => {   // a hidden way: a Hijaz run up to a ringing D
    [587.3, 622.3, 740, 880, 1174.7].forEach((f, i) => T(A, o, { type: 'triangle', f0: f, dur: 0.6, vol: 0.13 * v, delay: i * 0.11 }));
    metal(A, o, 1174.7, { vol: 0.05 * v, dur: 1.2, delay: 0.44 }, BELL);
  });
  reg('fanfare', (A, o, v) => {   // level done: a zurna flourish D F# A (Bb A) D over doum and tek
    const seq = [[587.3, 0, 0.14], [740, 0.12, 0.14], [880, 0.24, 0.14], [932.3, 0.36, 0.1], [880, 0.46, 0.14], [1174.7, 0.6, 0.8]];
    for (const [f, d, len] of seq) {
      T(A, o, { type: 'square', f0: f, dur: len, vol: 0.065 * v, delay: d, lp: 2400, attack: 0.01 });
      T(A, o, { type: 'triangle', f0: f / 2, dur: len, vol: 0.09 * v, delay: d, attack: 0.01 });
    }
    T(A, o, { type: 'triangle', f0: 146.8, dur: 0.9, vol: 0.13 * v, delay: 0.6 });
    for (const d of [0, 0.6]) T(A, o, { type: 'sine', f0: 110, f1: 55, dur: 0.2, vol: 0.22 * v, delay: d });   // doum
    for (const d of [0.36, 0.46]) N(A, o, { dur: 0.05, f0: 3200, filter: 'bandpass', q: 1, vol: 0.14 * v, delay: d });   // tek
  });
  reg('key', (A, o, v) => {   // keys jingle on a ring, then two notes
    metal(A, o, 2100, { vol: 0.08 * v, dur: 0.25 }, BLADE);
    metal(A, o, 2600, { vol: 0.07 * v, dur: 0.25, delay: 0.05 }, BLADE);
    metal(A, o, 2350, { vol: 0.06 * v, dur: 0.3, delay: 0.1 }, BLADE);
    [880, 1174.7].forEach((f, i) => T(A, o, { type: 'triangle', f0: f, dur: 0.35, vol: 0.15 * v, delay: 0.16 + i * 0.09 }));
  });
  reg('item', (A, o, v) => {   // a relic: D F# A D and a bell
    [587.3, 740, 880, 1174.7].forEach((f, i) => T(A, o, { type: 'triangle', f0: f, dur: 0.3, vol: 0.18 * v, delay: i * 0.08 }));
    metal(A, o, 880, { vol: 0.06 * v, dur: 1.0, delay: 0.24 }, BELL);
  });
  reg('treasure', (A, o, v) => {   // a gem: a quick sparkle
    [1174.7, 1480, 1760, 2349.3].forEach((f, i) => T(A, o, { type: 'triangle', f0: f, dur: 0.2, vol: 0.14 * v, delay: i * 0.05 }));
    metal(A, o, 2349.3, { vol: 0.05 * v, dur: 0.5, delay: 0.2 }, BLADE);
  });
  reg('noway', (A, o, v) => {   // cannot: two dull knocks
    T(A, o, { type: 'triangle', f0: 160, f1: 120, dur: 0.1, vol: 0.3 * v });
    T(A, o, { type: 'triangle', f0: 120, f1: 95, dur: 0.12, vol: 0.3 * v, delay: 0.11 });
  });
  reg('locked', (A, o, v) => {   // the latch rattles, the door will not give
    for (let i = 0; i < 3; i++) {
      N(A, o, { dur: 0.03, f0: 2000 + i * 150, filter: 'bandpass', q: 5, vol: 0.26 * v, delay: i * 0.07, attack: 0.001 });
      T(A, o, { type: 'square', f0: 330 - i * 20, dur: 0.03, vol: 0.06 * v, lp: 1500, delay: i * 0.07 });
    }
    T(A, o, { type: 'triangle', f0: 120, f1: 90, dur: 0.12, vol: 0.26 * v, delay: 0.2 });
    N(A, o, { dur: 0.08, f0: 400, vol: 0.2 * v, delay: 0.2 });
  });
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
