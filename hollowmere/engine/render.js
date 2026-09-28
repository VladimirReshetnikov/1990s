/*
 * Renderer: a column raycaster over a grid of sectors with independent floor
 * and ceiling heights (Doom-style steps, ledges, windows, lifts and doors),
 * textured floors/ceilings, a panoramic sky, portal-linked floors, palette
 * colormap lighting with distance diminishing, and depth-buffered sprites.
 */
(function (R) {
  'use strict';
  const MAXSTEPS = 110;
  const OFF = 64 * 4096; // keeps texel accumulators positive so |0 == floor

  class Renderer {
    constructor(pal, bank, opts = {}) {
      this.pal = pal;
      this.bank = bank;
      this.falloff = opts.falloff ?? 1.15;
      this.projK = opts.projK ?? 0.85;
      this.contrast = opts.contrast ?? 1;
    }
    setSize(w, h, viewH) {
      this.w = w; this.h = h; this.viewH = viewH;
      this.proj = viewH * this.projK;
      this.zbuf = new Float32Array(w * viewH);
      this.colAngle = new Float32Array(w);
      for (let c = 0; c < w; c++) this.colAngle[c] = Math.atan((c + 0.5 - w / 2) / this.proj);
      this.skyScale = 200 / (viewH * 1.19);
    }

    /**
     * buf: Uint32Array framebuffer (w*h). cam: {x,y,z,ang,pitch,floor,light}
     * cam.light: {radius, bonus} player-carried light (or null).
     */
    render(buf, world, cam, time) {
      const W = this.w, VH = this.viewH, proj = this.proj, zb = this.zbuf;
      const bank = this.bank, tex = bank.tex, pal = this.pal;
      const S0 = pal.shades[0], S1 = pal.shades[1];
      const floors = world.floors, MW = world.W, MH = world.H;
      const hz = VH / 2 + cam.pitch;
      const eye = cam.z;
      const dirX = Math.cos(cam.ang), dirY = Math.sin(cam.ang), rX = -dirY, rY = dirX;
      const px = cam.x, py = cam.y;
      const fall = this.falloff;
      const lr = cam.light ? cam.light.radius : 0, lb = cam.light ? cam.light.bonus : 0;
      const sky = tex[floors[cam.floor].sky] || bank.texture(floors[cam.floor].sky);
      const skyW = sky.w, skyH = sky.h, skyData = sky.data, skyHor = skyH * 0.8;
      const skyScale = this.skyScale;
      const fogPacked = pal.fogPacked;
      const stamp = this.frameNo = (this.frameNo || 0) + 1;
      for (const fl of floors) if (!fl.vis) fl.vis = new Uint32Array(MW * MH);
      const lightAt = (L, d) => {
        let v = L - d * fall * (1.6 - L / 31);
        if (lr > 0 && d < lr) v += lb * (1 - d / lr);
        return v < 0 ? 0 : v > 31 ? 31 : v | 0;
      };

      for (let col = 0; col < W; col++) {
        const off = (col + 0.5 - W / 2) / proj;
        const rdx = dirX + rX * off, rdy = dirY + rY * off;
        let mapX = Math.floor(px), mapY = Math.floor(py);
        const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
        let stepX, stepY, sdx, sdy;
        if (rdx < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
        if (rdy < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
        let fi = cam.floor, dz = 0;
        let cells = floors[fi].cells, seen = floors[fi].seen, vis = floors[fi].vis;
        let cur = cells[mapY * MW + mapX];
        seen[mapY * MW + mapX] = 1; vis[mapY * MW + mapX] = stamp;
        let g = 0;
        while (cur.portal >= 0 && g++ < 4) { dz += cur.pdz; fi = cur.portal; cells = floors[fi].cells; seen = floors[fi].seen; vis = floors[fi].vis; cur = cells[mapY * MW + mapX]; }
        let yTop = 0, yBot = VH;
        let skyU = -1;

        for (let steps = 0; steps < MAXSTEPS; steps++) {
          let dist, side;
          if (sdx < sdy) { dist = sdx; sdx += ddx; mapX += stepX; side = 0; }
          else { dist = sdy; sdy += ddy; mapY += stepY; side = 1; }
          if (dist < 1e-4) dist = 1e-4;
          const fz = cur.fl + dz, cz = cur.cl + dz;
          const set = cur.fog ? S1 : S0;
          const Lc = cur.light;

          // ---- ceiling span of current cell
          if (cur.sky) {
            let ye = Math.ceil(hz + (eye - cz) * proj / dist - 0.5);
            if (ye > yBot) ye = yBot;
            if (ye > yTop) {
              if (skyU < 0) { let a = (cam.ang + this.colAngle[col]) / (Math.PI * 2); a -= Math.floor(a); skyU = ((a * skyW * 2) | 0) % skyW; }
              const so = skyU * skyH;
              for (let r = yTop; r < ye; r++) {
                let v = ((r + 0.5 - hz) * skyScale + skyHor) | 0; if (v < 0) v = 0; else if (v >= skyH) v = skyH - 1;
                buf[r * W + col] = S0[7936 + skyData[so + v]];
                zb[r * W + col] = 1e9;
              }
              yTop = ye;
            }
          } else if (cz > eye) {
            let ye = Math.ceil(hz + (eye - cz) * proj / dist - 0.5);
            if (ye > yBot) ye = yBot;
            if (ye > yTop) {
              const t = tex[cur.ctex], data = t.data, em = t.emissive;
              const hgt = cz - eye;
              for (let r = yTop; r < ye; r++) {
                const rd = hgt * proj / (hz - r - 0.5);
                const tx = ((px + rdx * rd) * 64) & 63, ty = ((py + rdy * rd) * 64) & 63;
                const L = em ? 31 : lightAt(Lc, rd);
                buf[r * W + col] = set[L * 256 + data[(tx << 6) | ty]];
                zb[r * W + col] = rd;
              }
              yTop = ye;
            }
          }
          // ---- floor span of current cell
          if (fz < eye) {
            let ys = Math.ceil(hz + (eye - fz) * proj / dist - 0.5);
            if (ys < yTop) ys = yTop;
            if (ys < yBot) {
              const t = tex[cur.ftex], data = t.data, em = t.emissive;
              const hgt = eye - fz;
              for (let r = ys; r < yBot; r++) {
                const rd = hgt * proj / (r + 0.5 - hz);
                const tx = ((px + rdx * rd) * 64) & 63, ty = ((py + rdy * rd) * 64) & 63;
                const L = em ? 31 : lightAt(Lc, rd);
                buf[r * W + col] = set[L * 256 + data[(tx << 6) | ty]];
                zb[r * W + col] = rd;
              }
              yBot = ys;
            }
          }
          if (yTop >= yBot) break;
          if (mapX < 0 || mapY < 0 || mapX >= MW || mapY >= MH) break;

          // ---- next cell (following portals to other floors)
          let nk = mapY * MW + mapX;
          let nxt = cells[nk];
          g = 0;
          while (nxt.portal >= 0 && g++ < 4) { dz += nxt.pdz; fi = nxt.portal; cells = floors[fi].cells; seen = floors[fi].seen; vis = floors[fi].vis; nxt = cells[nk]; }
          seen[nk] = 1; vis[nk] = stamp;

          let wx = side === 0 ? py + dist * rdy : px + dist * rdx;
          wx -= Math.floor(wx);
          let u = (wx * 64) | 0;
          if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = 63 - u;
          const Lw = lightAt(Lc + (side === 0 ? 1 : -1) * this.contrast, dist);

          const inside = !cur.sky || cur.indoor;
          if (nxt.solid) {
            this.wall(buf, col, yTop, yBot, tex[inside && nxt.wallIn >= 0 ? nxt.wallIn : nxt.wall], u, fz, true, dist, hz, eye, Lw, set);
            yTop = yBot;
            break;
          }
          const nf = nxt.fl + dz, nc = nxt.cl + dz;
          // upper wall
          if (nc < cz) {
            let yn = Math.ceil(hz + (eye - nc) * proj / dist - 0.5);
            if (yn > yBot) yn = yBot;
            if (yn > yTop) {
              if (cur.sky && nxt.sky) {
                if (skyU < 0) { let a = (cam.ang + this.colAngle[col]) / (Math.PI * 2); a -= Math.floor(a); skyU = ((a * skyW * 2) | 0) % skyW; }
                const so = skyU * skyH;
                for (let r = yTop; r < yn; r++) {
                  let v = ((r + 0.5 - hz) * skyScale + skyHor) | 0; if (v < 0) v = 0; else if (v >= skyH) v = skyH - 1;
                  buf[r * W + col] = S0[7936 + skyData[so + v]]; zb[r * W + col] = 1e9;
                }
              } else if (nxt.door) {
                const dt = nxt.doorTop + dz;
                let yd = Math.ceil(hz + (eye - dt) * proj / dist - 0.5);
                if (yd < yTop) yd = yTop; if (yd > yn) yd = yn;
                if (yd > yTop) this.wall(buf, col, yTop, yd, tex[inside && nxt.lintelIn >= 0 ? nxt.lintelIn : nxt.lintel], u, cz, false, dist, hz, eye, Lw, set);
                if (yn > yd) this.wall(buf, col, yd, yn, tex[nxt.up], u, nc, true, dist, hz, eye, Lw, set);
              } else {
                this.wall(buf, col, yTop, yn, tex[inside && nxt.upIn >= 0 ? nxt.upIn : nxt.up], u, cz, false, dist, hz, eye, Lw, set);
              }
              yTop = yn;
            }
          }
          // lower wall (riser)
          if (nf > fz) {
            let yn = Math.ceil(hz + (eye - nf) * proj / dist - 0.5);
            if (yn < yTop) yn = yTop;
            if (yn < yBot) {
              // the riser up from a staircase onto its landing belongs to the stairs
              const lt = cur.stair && !nxt.stair ? cur.low : (inside && nxt.lowIn >= 0 ? nxt.lowIn : nxt.low);
              this.wall(buf, col, yn, yBot, tex[lt], u, nf, false, dist, hz, eye, Lw, set);
              yBot = yn;
            }
          }
          if (yTop >= yBot) break;
          cur = nxt;
        }
        // anything left open: sky if we ran off the map outdoors, else darkness (or fog)
        if (yTop < yBot) {
          if (cur.sky) {
            if (skyU < 0) { let a = (cam.ang + this.colAngle[col]) / (Math.PI * 2); a -= Math.floor(a); skyU = ((a * skyW * 2) | 0) % skyW; }
            const so = skyU * skyH;
            for (let r = yTop; r < yBot; r++) {
              let v = ((r + 0.5 - hz) * skyScale + skyHor) | 0; if (v < 0) v = 0; else if (v >= skyH) v = skyH - 1;
              buf[r * W + col] = S0[7936 + skyData[so + v]]; zb[r * W + col] = 1e9;
            }
          } else {
            const c = cur.fog ? fogPacked : 0xff000000;
            for (let r = yTop; r < yBot; r++) { buf[r * W + col] = c; zb[r * W + col] = 1e9; }
          }
        }
      }
    }

    /** Draw a vertical wall slice. peg: world z where texture is anchored. */
    wall(buf, col, y0, y1, t, u, peg, bottomPeg, dist, hz, eye, L, set) {
      const W = this.w, zb = this.zbuf, data = t.data, th = t.h, hm = t.hmask;
      const colOff = (u & t.wmask) * th;
      const k = dist / this.proj;
      let v = (peg - (eye - (y0 + 0.5 - hz) * k)) * 64 + (bottomPeg ? th : 0) + OFF;
      const dv = k * 64;
      const base = (t.emissive ? 31 : L) * 256;
      for (let r = y0; r < y1; r++) {
        const i = r * W + col;
        buf[i] = set[base + data[colOff + ((v | 0) & hm)]];
        zb[i] = dist;
        v += dv;
      }
    }

    /**
     * Draw billboards. list: [{x, y, z, spr, frame, light, fog, flip}]
     * z = world z of sprite bottom (in camera floor frame).
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
        const ww = spr.w / 64 * spr.scale, hh = spr.h / 64 * spr.scale;
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
