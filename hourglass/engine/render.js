/*
 * Renderer (Hourglass fork): a column raycaster over cells that hold STACKED
 * open spans. Each screen column keeps a list of vertical windows, each one
 * looking through one span. At every cell boundary a window is split into the
 * openings shared with the neighbour cell's spans; the solid parts in between
 * are drawn as walls. Floors and ceilings are drawn per window span. This gives
 * room-over-room, pits you can look down into, galleries and ledges, with the
 * same palette/colormap lighting, sky, fog and depth-buffered sprites as before.
 *
 * Thin masked walls sit on a cell's mid-plane, across the corridor: see-through
 * portcullis bars (door.see) and slicer jaws (span.blade). They are collected
 * while tracing a column and drawn far-to-near over it afterwards. The top edge
 * of every ledge face gets a bright lip, and so does the floor's edge above a
 * drop (a 4-texel coping band), so drops read at a glance.
 */
(function (R) {
  'use strict';
  const MAXSTEPS = 110;
  const MAXWIN = 24;
  const MAXTHIN = 8;
  const OFF = 64 * 4096; // keeps texel accumulators positive so |0 == floor

  class Renderer {
    constructor(pal, bank, opts = {}) {
      this.pal = pal;
      this.bank = bank;
      this.falloff = opts.falloff ?? 1.15;
      this.projK = opts.projK ?? 0.85;
      this.contrast = opts.contrast ?? 1;
      this.wt = new Int32Array(MAXWIN); this.wb = new Int32Array(MAXWIN); this.ws = new Array(MAXWIN);
      this.nt = new Int32Array(MAXWIN); this.nb = new Int32Array(MAXWIN); this.ns = new Array(MAXWIN);
      this.pieces = [];
      this.mkD = new Float64Array(MAXTHIN); this.mkT = new Int32Array(MAXTHIN); this.mkB = new Int32Array(MAXTHIN);
      this.mkU = new Int32Array(MAXTHIN); this.mkL = new Int32Array(MAXTHIN); this.mkLo = new Float64Array(MAXTHIN); this.mkHi = new Float64Array(MAXTHIN);
      this.mkData = new Array(MAXTHIN); this.mkTex = new Array(MAXTHIN); this.mkSet = new Array(MAXTHIN); this.mkStretch = new Uint8Array(MAXTHIN);
      this.nm = 0;
    }
    /**
     * Sides of span s's floor that end in a drop (bits: 1 east, 2 west, 4 south, 8 north),
     * cached until world.edgeEpoch changes (floors fall, lifts move).
     */
    edgeMask(world, s) {
      const ep = world.edgeEpoch || 0;
      if (s.edgeEp === ep) return s.edgeBits;
      const c = s.cell, f = s.fl;
      let bits = 0;
      const dirs = [[1, 0, 1], [-1, 0, 2], [0, 1, 4], [0, -1, 8]];
      for (const [dx, dy, bit] of dirs) {
        const n = world.cellAt(c.x + dx, c.y + dy);
        if (!n) continue;
        let open = false, level = false;
        for (const q of n.spans) {
          if (q.fl < f + 0.5 && Math.max(q.cl, q.door ? q.doorTop : 0) > f + 0.3) open = true;
          if (Math.abs(q.fl - f) <= 0.35 && q.cl > f + 0.3) level = true;
        }
        if (open && !level) bits |= bit;
      }
      s.edgeEp = ep; s.edgeBits = bits;
      return bits;
    }
    /** Which mid-plane a thin wall in span s lies on: 'x' (x = const) or 'y'. Across the corridor. */
    thinAxis(world, s) {
      if (s.thinAxis) return s.thinAxis;
      const c = s.cell, z0 = s.fl + 0.1, z1 = s.fl + 0.5;
      const open = (dx, dy) => { const n = world.cellAt(c.x + dx, c.y + dy); return !!n && n.spans.some(q => q.fl < z1 && Math.max(q.cl, q.door ? q.doorTop : 0) > z0); };
      s.thinAxis = !open(0, -1) && !open(0, 1) ? 'x' : !open(-1, 0) && !open(1, 0) ? 'y' : (open(-1, 0) || open(1, 0) ? 'x' : 'y');
      return s.thinAxis;
    }
    setSize(w, h, viewH) {
      this.w = w; this.h = h; this.viewH = viewH;
      this.proj = viewH * this.projK;
      this.zbuf = new Float32Array(w * viewH);
      this.colAngle = new Float32Array(w);
      for (let c = 0; c < w; c++) this.colAngle[c] = Math.atan((c + 0.5 - w / 2) / this.proj);
      this.skyScale = 200 / (viewH * 1.19);
    }

    /** buf: Uint32Array framebuffer. cam: {x, y, z (eye), ang, pitch, light:{radius,bonus}} */
    render(buf, world, cam, time) {
      const W = this.w, VH = this.viewH, proj = this.proj, zb = this.zbuf;
      const bank = this.bank, tex = bank.tex, pal = this.pal;
      const S0 = pal.shades[0], S1 = pal.shades[1];
      const cells = world.cells, MW = world.W, MH = world.H;
      const hz = VH / 2 + cam.pitch;
      const eye = cam.z;
      const dirX = Math.cos(cam.ang), dirY = Math.sin(cam.ang), rX = -dirY, rY = dirX;
      const px = cam.x, py = cam.y;
      const fall = this.falloff, contrast = this.contrast;
      const lr = cam.light ? cam.light.radius : 0, lb = cam.light ? cam.light.bonus : 0;
      const sky = tex[world.sky] || bank.texture(world.sky);
      const skyW = sky.w, skyH = sky.h, skyData = sky.data, skyHor = skyH * 0.8, skyScale = this.skyScale;
      const fogPacked = pal.fogPacked;
      const lightAt = (L, d) => {
        let v = L - d * fall * (1.6 - L / 31);
        if (lr > 0 && d < lr) v += lb * (1 - d / lr);
        return v < 0 ? 0 : v > 31 ? 31 : v | 0;
      };
      const pieces = this.pieces;
      let wt = this.wt, wb = this.wb, ws = this.ws, nt = this.nt, nb = this.nb, ns = this.ns;

      const cx0 = Math.floor(px), cy0 = Math.floor(py);
      const camCell = world.cellAt(cx0, cy0);
      const camSpan = camCell && (R.spanAt(camCell, eye) || R.spanBelow(camCell, eye) || camCell.spans[0]);
      if (!camSpan) { buf.fill(0xff000000, 0, W * VH); zb.fill(1e9); return; }
      camCell.seen = true; camSpan.seen = true;
      this.frameNo = (this.frameNo || 0) + 1;
      const stamp = this.frameNo;
      if (!world.vis) world.vis = new Uint32Array(MW * MH);
      const vis = world.vis;
      vis[cy0 * MW + cx0] = stamp;

      for (let col = 0; col < W; col++) {
        const off = (col + 0.5 - W / 2) / proj;
        const rdx = dirX + rX * off, rdy = dirY + rY * off;
        let mapX = cx0, mapY = cy0;
        const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
        let stepX, stepY, sdx, sdy;
        if (rdx < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
        if (rdy < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
        let n = 1;
        wt[0] = 0; wb[0] = VH; ws[0] = camSpan;
        let skyU = -1;
        this.nm = 0;
        if (camSpan.blade || (camSpan.door && camSpan.door.see && camSpan.cl < camSpan.doorTop - 1e-3)) this.addThin(world, camSpan, cx0, cy0, 0, VH, rdx, rdy, px, py, hz, eye, lightAt);
        const skyCol = () => { let a = (cam.ang + this.colAngle[col]) / (Math.PI * 2); a -= Math.floor(a); return ((a * skyW * 2) | 0) % skyW; };

        for (let steps = 0; steps < MAXSTEPS && n > 0; steps++) {
          let dist, side;
          if (sdx < sdy) { dist = sdx; sdx += ddx; mapX += stepX; side = 0; }
          else { dist = sdy; sdy += ddy; mapY += stepY; side = 1; }
          if (dist < 1e-4) dist = 1e-4;
          const k = proj / dist;

          // ---- ceilings and floors of every window up to this boundary
          let m = 0;
          for (let i = 0; i < n; i++) {
            const S = ws[i];
            let t = wt[i], b = wb[i];
            const set = S.fog ? S1 : S0, Ls = S.light;
            const Scl = S.door && S.door.see ? S.doorTop : S.cl;
            if (!S.sky && Scl > eye) {
              let ye = Math.ceil(hz + (eye - Scl) * k - 0.5);
              if (ye > b) ye = b;
              if (ye > t) {
                const tx0 = tex[S.ctex], data = tx0.data, em = tx0.emissive, hgt = Scl - eye;
                for (let r = t; r < ye; r++) {
                  const rd = hgt * proj / (hz - r - 0.5);
                  const tx = ((px + rdx * rd) * 64) & 63, ty = ((py + rdy * rd) * 64) & 63;
                  buf[r * W + col] = set[(em ? 31 : lightAt(Ls, rd)) * 256 + data[(tx << 6) | ty]];
                  zb[r * W + col] = rd;
                }
                t = ye;
              }
            }
            if (S.fl < eye) {
              let ys = Math.ceil(hz + (eye - S.fl) * k - 0.5);
              if (ys < t) ys = t;
              if (ys < b) {
                const tx0 = tex[S.ftex], data = tx0.data, em = tx0.emissive, hgt = eye - S.fl;
                const edge = S.hazard ? 0 : this.edgeMask(world, S);
                for (let r = ys; r < b; r++) {
                  const rd = hgt * proj / (r + 0.5 - hz);
                  const tx = ((px + rdx * rd) * 64) & 63, ty = ((py + rdy * rd) * 64) & 63;
                  let L = em ? 31 : lightAt(Ls, rd);
                  if (edge && (((edge & 1) && tx >= 60) || ((edge & 2) && tx < 4) || ((edge & 4) && ty >= 60) || ((edge & 8) && ty < 4))) L = L + 9 > 31 ? 31 : L + 9;
                  buf[r * W + col] = set[L * 256 + data[(tx << 6) | ty]];
                  zb[r * W + col] = rd;
                }
                b = ys;
              }
            }
            if (t < b) { wt[m] = t; wb[m] = b; ws[m] = S; m++; }
          }
          n = m;
          if (n === 0) break;
          if (mapX < 0 || mapY < 0 || mapX >= MW || mapY >= MH) break;

          // ---- the boundary into the next cell
          const N = cells[mapY * MW + mapX];
          N.seen = true; vis[mapY * MW + mapX] = stamp;
          let wx = side === 0 ? py + dist * rdy : px + dist * rdx;
          wx -= Math.floor(wx);
          let u = (wx * 64) | 0;
          if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 63 - u;
          const sp = N.spans;
          let q = 0;
          for (let i = 0; i < n; i++) {
            const S = ws[i], t = wt[i], b = wb[i];
            const set = S.fog ? S1 : S0;
            const Lw = lightAt(S.light + (side === 0 ? contrast : -contrast), dist);
            let zc = S.door && S.door.see ? S.doorTop : S.cl;
            for (let j = sp.length - 1; j >= 0 && zc > S.fl; j--) {
              const Nj = sp[j];
              if (Nj.fl >= zc) continue;
              const see = Nj.door && Nj.door.see, Ncl = see ? Nj.doorTop : Nj.cl;
              const sLo = Ncl > S.fl ? Ncl : S.fl;
              if (zc > sLo) this.solid(buf, col, t, b, world, N, sLo, zc, u, dist, hz, eye, Lw, set);
              const oHi = zc < Ncl ? zc : Ncl, oLo = Nj.fl > S.fl ? Nj.fl : S.fl;
              if (oHi > oLo) {
                let r0 = Math.ceil(hz + (eye - oHi) * k - 0.5), r1 = Math.ceil(hz + (eye - oLo) * k - 0.5);
                if (r0 < t) r0 = t; if (r1 > b) r1 = b;
                if (r1 > r0 && q < MAXWIN) {
                  nt[q] = r0; nb[q] = r1; ns[q] = Nj; q++; Nj.seen = true;
                  if ((see && Nj.cl < Nj.doorTop - 1e-3) || Nj.blade) this.addThin(world, Nj, mapX, mapY, r0, r1, rdx, rdy, px, py, hz, eye, lightAt);
                }
              }
              zc = Nj.fl < zc ? Nj.fl : zc;
            }
            if (zc > S.fl) this.solid(buf, col, t, b, world, N, S.fl, zc, u, dist, hz, eye, Lw, set);
          }
          // swap window lists
          let tmpA = wt; wt = nt; nt = tmpA; tmpA = wb; wb = nb; nb = tmpA;
          const tmpS = ws; ws = ns; ns = tmpS;
          n = q;
        }
        // whatever is still open: sky outdoors, else darkness / fog
        for (let i = 0; i < n; i++) {
          const S = ws[i];
          if (S.sky) {
            if (skyU < 0) skyU = skyCol();
            const so = skyU * skyH;
            for (let r = wt[i]; r < wb[i]; r++) {
              let v = ((r + 0.5 - hz) * skyScale + skyHor) | 0; if (v < 0) v = 0; else if (v >= skyH) v = skyH - 1;
              buf[r * W + col] = S0[7936 + skyData[so + v]]; zb[r * W + col] = 1e9;
            }
          } else {
            const c = S.fog ? fogPacked : 0xff000000;
            for (let r = wt[i]; r < wb[i]; r++) { buf[r * W + col] = c; zb[r * W + col] = 1e9; }
          }
        }
        if (this.nm) this.drawThin(buf, col, hz, eye);
      }
      this.wt = wt; this.wb = wb; this.ws = ws; this.nt = nt; this.nb = nb; this.ns = ns;
    }

    /** Queue the thin wall of span s (cell cx, cy) if this column's ray crosses its mid-plane. */
    addThin(world, s, cx, cy, t, b, rdx, rdy, px, py, hz, eye, lightAt) {
      if (this.nm >= MAXTHIN) return;
      const ax = this.thinAxis(world, s);
      let d, w;
      if (ax === 'x') { if (Math.abs(rdx) < 1e-6) return; d = (cx + 0.5 - px) / rdx; w = py + d * rdy; if (Math.floor(w) !== cy) return; }
      else { if (Math.abs(rdy) < 1e-6) return; d = (cy + 0.5 - py) / rdy; w = px + d * rdx; if (Math.floor(w) !== cx) return; }
      if (d < 0.05) return;
      let lo, hi, tx, data, stretch;
      if (s.blade) { lo = s.fl; hi = s.cl; tx = this.bank.tex[s.blade.tex]; data = tx.frames[Math.min(tx.frames.length - 1, s.blade.frame | 0)]; stretch = 1; }
      else { lo = s.cl; hi = s.doorTop; tx = this.bank.tex[s.door.tex]; data = tx.data; stretch = 0; }
      if (hi - lo < 1e-3) return;
      const k = this.proj / d;
      let r0 = Math.ceil(hz + (eye - hi) * k - 0.5), r1 = Math.ceil(hz + (eye - lo) * k - 0.5);
      if (r0 < t) r0 = t; if (r1 > b) r1 = b;
      if (r1 <= r0) return;
      const m = this.nm++;
      this.mkD[m] = d; this.mkT[m] = r0; this.mkB[m] = r1; this.mkU[m] = ((w - Math.floor(w)) * 64) | 0;
      this.mkL[m] = lightAt(s.light, d); this.mkLo[m] = lo; this.mkHi[m] = hi;
      this.mkTex[m] = tx; this.mkData[m] = data; this.mkSet[m] = this.pal.shades[s.fog ? 1 : 0]; this.mkStretch[m] = stretch;
    }
    /** Draw this column's queued thin walls, far to near; texel 255 is see-through. */
    drawThin(buf, col, hz, eye) {
      const W = this.w, zb = this.zbuf;
      for (let m = this.nm - 1; m >= 0; m--) {
        const d = this.mkD[m], k = d / this.proj, tx = this.mkTex[m], data = this.mkData[m], th = tx.h, hm = tx.hmask;
        const colOff = (this.mkU[m] & tx.wmask) * th, set = this.mkSet[m], base = (tx.emissive ? 31 : this.mkL[m]) * 256;
        const y0 = this.mkT[m], lo = this.mkLo[m], hi = this.mkHi[m], stretch = this.mkStretch[m];
        let v, dv;
        if (stretch) { v = (hi - (eye - (y0 + 0.5 - hz) * k)) / (hi - lo) * th; dv = k * th / (hi - lo); }
        else { v = (lo - (eye - (y0 + 0.5 - hz) * k)) * 64 + th + OFF; dv = k * 64; }
        for (let r = y0; r < this.mkB[m]; r++) {
          let vi = v | 0;
          if (stretch) vi = vi < 0 ? 0 : vi >= th ? th - 1 : vi; else vi &= hm;
          const texel = data[colOff + vi];
          if (texel !== 255) { buf[r * W + col] = set[base + texel]; zb[r * W + col] = d; }
          v += dv;
        }
      }
    }

    /** Draw the solid part of cell N between heights lo..hi, clipped to rows [t, b). */
    solid(buf, col, t, b, world, N, lo, hi, u, dist, hz, eye, L, set) {
      const k = this.proj / dist, pieces = R.solidPieces(world, N, lo, hi, this.pieces), tex = this.bank.tex;
      for (let p = 0; p < pieces.length; p += 5) {
        let r0 = Math.ceil(hz + (eye - pieces[p + 1]) * k - 0.5), r1 = Math.ceil(hz + (eye - pieces[p]) * k - 0.5);
        if (r0 < t) r0 = t; if (r1 > b) r1 = b;
        if (r1 <= r0) continue;
        const mode = pieces[p + 3];
        const tx = tex[pieces[p + 2]];
        if (mode === 0) this.wall(buf, col, r0, r1, tx, u, 0, true, dist, hz, eye, L, set);
        else this.wall(buf, col, r0, r1, tx, u, pieces[p + 4], mode === 2, dist, hz, eye, L, set, mode === 1 && pieces[p + 1] >= pieces[p + 4] - 1e-4);
      }
    }

    /** Draw a vertical wall slice. peg: world z where the texture is anchored. */
    wall(buf, col, y0, y1, t, u, peg, bottomPeg, dist, hz, eye, L, set, lip = false) {
      const W = this.w, zb = this.zbuf, data = t.data, th = t.h, hm = t.hmask;
      const colOff = (u & t.wmask) * th;
      const k = dist / this.proj;
      let v = (peg - (eye - (y0 + 0.5 - hz) * k)) * 64 + (bottomPeg ? th : 0) + OFF;
      const dv = k * 64;
      const base = (t.emissive ? 31 : L) * 256;
      // the lip: the top 3 texels under a floor edge, lit brighter
      const lipEnd = lip ? OFF + 3 : -1, lipBase = Math.min(31, L + 9) * 256;
      for (let r = y0; r < y1; r++) {
        const i = r * W + col;
        buf[i] = set[(v < lipEnd ? lipBase : base) + data[colOff + ((v | 0) & hm)]];
        zb[i] = dist;
        v += dv;
      }
    }

    /**
     * Draw billboards. list: [{x, y, z, spr, frame, light, fog, flip, bright, scale?}]
     * z = world z of the sprite bottom.
     */
    sprites(buf, list, cam) {
      const W = this.w, VH = this.viewH, proj = this.proj, zb = this.zbuf;
      const dirX = Math.cos(cam.ang), dirY = Math.sin(cam.ang), rX = -dirY, rY = dirX;
      const hz = VH / 2 + cam.pitch, eye = cam.z;
      const pal = this.pal, fall = this.falloff;
      const lr = cam.light ? cam.light.radius : 0, lb = cam.light ? cam.light.bonus : 0;
      for (const s of list) {
        const dx = s.x - cam.x, dy = s.y - cam.y;
        s._d = dx * dirX + dy * dirY;
        s._l = dx * rX + dy * rY;
      }
      list.sort((a, b) => b._d - a._d);
      for (const s of list) {
        const depth = s._d;
        if (depth < 0.08) continue;
        const spr = s.spr, fr = spr.frames[s.frame % spr.frames.length];
        const sc = spr.scale * (s.scale || 1);
        const ww = spr.w / 64 * sc, hh = spr.h / 64 * sc;
        const sx = W / 2 + s._l * proj / depth;
        const sw = ww * proj / depth;
        const x0 = sx - sw / 2;
        const top = hz + (eye - (s.z + hh)) * proj / depth;
        const bot = hz + (eye - s.z) * proj / depth;
        const shgt = bot - top;
        if (sw < 0.5 || shgt < 0.5) continue;
        const c0 = Math.max(0, Math.ceil(x0 - 0.5)), c1 = Math.min(W, Math.ceil(x0 + sw - 0.5));
        const r0 = Math.max(0, Math.ceil(top - 0.5)), r1 = Math.min(VH, Math.ceil(bot - 0.5));
        if (c0 >= c1 || r0 >= r1) continue;
        let L;
        if (spr.emissive || s.bright) L = 31;
        else {
          L = s.light - depth * fall * (1.6 - s.light / 31);
          if (lr > 0 && depth < lr) L += lb * (1 - depth / lr);
          L = L < 0 ? 0 : L > 31 ? 31 : L | 0;
        }
        const set = pal.shades[s.fog ? 1 : 0], base = L * 256;
        const sh = spr.h, swp = spr.w;
        for (let c = c0; c < c1; c++) {
          let u = (((c + 0.5 - x0) / sw) * swp) | 0;
          if (u >= swp) u = swp - 1;
          if (s.flip) u = swp - 1 - u;
          const co = u * sh;
          for (let r = r0; r < r1; r++) {
            const i = r * W + c;
            if (zb[i] <= depth) continue;
            let v = (((r + 0.5 - top) / shgt) * sh) | 0;
            if (v >= sh) v = sh - 1;
            const texel = fr[co + v];
            if (texel === 255) continue;
            buf[i] = set[base + texel];
            s.seen = true;
          }
        }
      }
    }

    /** A sprite drawn flat across the view, centred, its top at row y (hands on a ledge). */
    overlay(buf, spr, y, light) {
      if (!spr) return;
      const W = this.w, VH = this.viewH, scale = Math.max(1, Math.round(VH / 150));
      const fr = spr.frames[0], sw = spr.w * scale, sh = spr.h * scale;
      const x0 = Math.round((W - sw) / 2), set = this.pal.shades[0], base = (spr.emissive ? 31 : light) * 256;
      for (let c = Math.max(0, x0); c < Math.min(W, x0 + sw); c++) {
        const u = ((c - x0) / scale) | 0;
        for (let r = Math.max(0, y); r < Math.min(VH, y + sh); r++) {
          const texel = fr[u * spr.h + (((r - y) / scale) | 0)];
          if (texel !== 255) buf[r * W + c] = set[base + texel];
        }
      }
    }
    /** First-person held item, anchored bottom-right of the 3D view. */
    held(buf, spr, bobX, bobY, light) {
      if (!spr) return;
      const W = this.w, VH = this.viewH, scale = VH / 190;
      const fr = spr.frames[0];
      const sw = spr.w * scale, shh = spr.h * scale;
      const x0 = Math.round(W / 2 + VH * 0.34 + bobX * scale), y0 = Math.round(VH - shh * 0.86 + bobY * scale);
      const set = this.pal.shades[0], base = (spr.emissive ? 31 : light) * 256;
      for (let c = Math.max(0, x0); c < Math.min(W, x0 + sw); c++) {
        const u = ((c - x0) / scale) | 0;
        for (let r = Math.max(0, y0); r < Math.min(VH, y0 + shh); r++) {
          const v = ((r - y0) / scale) | 0;
          const texel = fr[u * spr.h + v];
          if (texel !== 255) buf[r * W + c] = set[base + texel];
        }
      }
    }

    /** Blend a colour over the 3D view (pain / pickup flashes). */
    tint(buf, rgb, a) {
      if (a <= 0) return;
      const n = this.w * this.viewH, ia = 1 - a;
      const tr = rgb[0] * a, tg = rgb[1] * a, tb = rgb[2] * a;
      for (let i = 0; i < n; i++) {
        const p = buf[i];
        const r = (p & 255) * ia + tr, g = ((p >> 8) & 255) * ia + tg, b = ((p >> 16) & 255) * ia + tb;
        buf[i] = 0xff000000 | (b << 16) | (g << 8) | r;
      }
    }
  }
  R.Renderer = Renderer;
})(globalThis.RetroEngine = globalThis.RetroEngine || {});
