/* platform-kit.js — tile platformer toolkit on top of arcade-core.js
   Plat.make(name, cols, fn) builds a level from code; Plat.game({...}) runs a full platformer.
   Tile marks: # solid   = one-way   ^ spikes   o coin   ? crate   S spring   C checkpoint   F goal
               P start   w walker    h hopper   b bat    s spiker (cannot be stomped)   M moving platform
   Keep this file next to arcade-core.js. */
(function () {
  'use strict';
  const A = Arcade, T = 32, W = 800, H = 480, R = 15, TAU = Math.PI * 2;
  const Plat = (window.Plat = { T, W, H, R });
  const SOLID = '#?u';
  const ENEMY = { w: { w: 26, h: 24, vx: -0.8 }, h: { w: 26, h: 26, vx: 0 }, b: { w: 28, h: 20, vx: 0 }, s: { w: 28, h: 22, vx: -1 } };

  /* shared scenery helpers for backgrounds */
  Plat.ridge = (c, base, amp, seed, off, color) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) { const X = x + off; c.lineTo(x, base + Math.sin(X * 0.01 + seed) * amp + Math.sin(X * 0.027 + seed * 2.1) * amp * 0.5); }
    c.lineTo(W, H); c.closePath(); c.fill();
  };
  Plat.clouds = (c, cam, t, par, col) => {
    c.fillStyle = col || 'rgba(255,255,255,.75)';
    for (let i = 0; i < 6; i++) { const x = ((i * 220 - cam.x * par + t * 0.15) % 1400 + 1400) % 1400 - 150, y = 50 + (i % 3) * 40; c.beginPath(); c.ellipse(x, y, 46, 14, 0, 0, TAU); c.ellipse(x + 26, y - 8, 30, 12, 0, 0, TAU); c.fill(); }
  };

  /* ---------- level builder (coordinates are tiles; y counts rows from the top, 15 rows) ---------- */
  Plat.make = (name, cols, fn) => {
    const g = Array.from({ length: R }, () => Array(cols).fill(' '));
    const api = {
      cols, R,
      set: (x, y, ch) => { if (x >= 0 && x < cols && y >= 0 && y < R) g[y][x] = ch; },
      fill: (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) api.set(x + i, y + j, ch || '#'); },
      ground: (x0, x1, top) => { const t = top == null ? 12 : top; api.fill(x0, t, x1 - x0, R - t, '#'); },
      plat: (x, y, n) => api.fill(x, y, n, 1, '='),
      coins: (x, y, n, dx) => { for (let i = 0; i < n; i++) api.set(x + i * (dx || 1), y, 'o'); },
      stairs: (x, n, top) => { const t = top == null ? 12 : top; for (let i = 0; i < n; i++) api.fill(x + i, t - 1 - i, 1, i + 1, '#'); },
    };
    fn(api);
    return { name, rows: g.map((r) => r.join('')) };
  };

  Plat.game = function (cfg) {
    const ph = Object.assign({ run: 3.4, acc: 0.45, air: 0.3, fric: 0.55, jump: 10.6, grav: 0.52, fall: 12, coyote: 6, buf: 7, jumps: 1, cut: 0.45, hp: 3, lives: 3, spring: 16 }, cfg.phys);
    const baseTh = Object.assign({ solid: '#8b5a2b', top: '#4ade80', plat: '#c08457', crate: '#fbbf24' }, cfg.theme);
    const levels = cfg.levels;
    let th = baseTh, grid, rows, cols, p, en, plats, cam, lvl, coins, lives, check, banner, doneT, start, bnc;

    const tile = (x, y) => { if (x < 0 || x >= cols) return '#'; if (y < 0 || y >= rows) return ' '; return grid[y][x]; };
    const isSolid = (x, y) => SOLID.includes(tile(x, y));

    /* ---------- level loading ---------- */
    function addEnemy(ch, c, r) {
      const d = ENEMY[ch], x = c * T + (T - d.w) / 2, y = r * T + T - d.h;
      en.push({ kind: ch, x, y, w: d.w, h: d.h, vx: d.vx, vy: 0, x0: x, y0: y, t: A.randi(0, 60), ground: false, dead: false });
    }
    function load(G, i) {
      lvl = i; const src = levels[i].rows; rows = src.length; cols = src[0].length;
      th = Object.assign({}, baseTh, levels[i].theme || {});
      grid = src.map((r) => r.split(''));
      en = []; plats = []; bnc = {}; check = null; doneT = 0; banner = 170; start = { c: 1, r: rows - 4 };
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const ch = grid[r][c];
        if (ch === 'P') { start = { c, r }; grid[r][c] = ' '; }
        else if (ENEMY[ch]) { addEnemy(ch, c, r); grid[r][c] = ' '; }
        else if (ch === 'M') { plats.push({ x: c * T, ox: c * T, y: r * T, w: T * 3, h: 12, r: 90, sp: 0.02, t: c * 7, dx: 0 }); grid[r][c] = ' '; }
      }
      spawn(G, true);
    }
    function spawn(G, fresh) {
      const s = check || { x: start.c * T + 6, y: start.r * T + T - 28 };
      p = { x: s.x, y: s.y, w: 20, h: 28, vx: 0, vy: 0, face: 1, ground: false, coy: 0, jb: 0, jl: ph.jumps - 1, inv: fresh ? 0 : 70, hp: ph.hp, dead: 0, walk: 0, sq: 0, riding: null, drop: 0, bump: null };
      camFollow(true);
    }
    function camFollow(snap) {
      const tx = A.clamp(p.x + p.w / 2 - W / 2 + p.face * 40, 0, Math.max(0, cols * T - W));
      const ty = A.clamp(p.y + p.h / 2 - H * 0.55, 0, Math.max(0, rows * T - H));
      if (snap) { cam.x = tx; cam.y = ty; } else { cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; }
    }

    /* ---------- physics ---------- */
    function moveBody(b, dx, dy) {
      let hitX = 0;
      if (dx) {
        b.x += dx;
        const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 0.01) / T);
        const c = Math.floor((dx > 0 ? b.x + b.w : b.x) / T);
        for (let r = r0; r <= r1; r++) if (isSolid(c, r)) { b.x = dx > 0 ? c * T - b.w : (c + 1) * T; hitX = dx > 0 ? 1 : -1; b.vx = 0; break; }
      }
      b.ground = false; b.bump = null;
      b.y += dy;
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 0.01) / T);
      if (dy > 0) {
        const r = Math.floor((b.y + b.h) / T), pb = b.y + b.h - dy;
        for (let c = c0; c <= c1; c++) {
          if (isSolid(c, r) || (tile(c, r) === '=' && !(b.drop > 0) && pb <= r * T + 1)) { b.y = r * T - b.h; b.vy = 0; b.ground = true; break; }
        }
      } else if (dy < 0) {
        const r = Math.floor(b.y / T);
        for (let c = c0; c <= c1; c++) if (isSolid(c, r)) { b.y = (r + 1) * T; b.vy = 0; b.bump = { c, r }; break; }
      }
      return hitX;
    }

    function hurt(G, dir) {
      if (p.inv > 0 || p.dead) return;
      p.hp--; p.inv = 100; p.vy = -6; p.vx = -dir * 4; G.shake(6); G.freeze(4); A.sfx('hurt');
      G.burst(p.x + p.w / 2, p.y + p.h / 2, 12, { color: ['#fff', '#fca5a5'], speed: 4, life: 24 });
      if (p.hp <= 0) die(G);
    }
    function die(G) {
      if (p.dead) return;
      lives--; p.dead = 70; A.sfx('ko'); G.shake(10);
      G.burst(p.x + p.w / 2, p.y + p.h / 2, 28, { color: ['#fff', '#fbbf24', '#fb7185'], speed: 5, glow: true, life: 36 });
    }

    function updEnemy(e) {
      e.t++;
      if (e.kind === 'b') { e.x = e.x0 + Math.sin(e.t * 0.02) * 90; e.y = e.y0 + Math.sin(e.t * 0.05) * 24; e.vx = Math.cos(e.t * 0.02); return; }
      e.vy = Math.min(e.vy + 0.5, 10);
      if (e.kind === 'h') {
        if (e.ground) { e.vx = 0; if (e.t % 75 === 0) { e.vy = -8.5; e.vx = p.x < e.x ? -1.6 : 1.6; } }
      } else if (e.ground) {
        const fx = Math.floor((e.vx > 0 ? e.x + e.w + 2 : e.x - 2) / T), fr = Math.floor((e.y + e.h + 4) / T);
        if (!isSolid(fx, fr) && tile(fx, fr) !== '=') e.vx = -e.vx;
      }
      const sp = e.vx;
      moveBody(e, e.vx, e.vy);
      if (e.kind !== 'h' && e.vx === 0) e.vx = -sp;
      if (e.y > rows * T + 120) e.dead = true;
    }

    /* ---------- main loop ---------- */
    function init(G) { lives = ph.lives; coins = 0; cam = { x: 0, y: 0 }; load(G, 0); }

    function update(G) {
      if (banner > 0) banner--;
      for (const m of plats) { const ox = m.x; m.t++; m.x = m.ox + Math.sin(m.t * m.sp) * m.r; m.dx = m.x - ox; }
      for (const k in bnc) if (--bnc[k] <= 0) delete bnc[k];
      G.hudL = 'SCORE ' + G.score + '   COINS ' + coins;
      G.hudR = '\u2665'.repeat(Math.max(0, p.hp)) + '  LIVES ' + lives + '  ' + (lvl + 1) + '/' + levels.length;
      if (doneT > 0) { camFollow(); if (--doneT === 0) nextLevel(G); return; }
      if (p.dead > 0) {
        camFollow();
        if (--p.dead === 0) { if (lives <= 0) G.over('Out of lives', coins + ' coins collected'); else spawn(G, false); }
        return;
      }
      /* input */
      const ax = A.axisX(), jh = A.held('Space', 'ArrowUp', 'KeyW', 'KeyZ'), jp = A.hit('Space', 'ArrowUp', 'KeyW', 'KeyZ');
      if (ax) p.face = ax;
      p.vx = A.approach(p.vx, ax * ph.run, ax ? (p.ground ? ph.acc : ph.air) : (p.ground ? ph.fric : 0.12));
      p.coy = p.ground ? ph.coyote : p.coy - 1;
      p.jb = jp ? ph.buf : p.jb - 1;
      if (p.ground) p.jl = ph.jumps - 1;
      if (jp && A.held('ArrowDown', 'KeyS') && p.ground) { p.drop = 8; p.jb = 0; }
      if (p.jb > 0 && (p.coy > 0 || p.jl > 0)) {
        if (p.coy <= 0) p.jl--;
        p.vy = -ph.jump; p.jb = 0; p.coy = 0; p.sq = -0.3; A.sfx(p.ground ? 'jump' : 'jump2');
        G.burst(p.x + p.w / 2, p.y + p.h, 5, { color: '#fff', speed: 1.6, life: 14, size: 2, angle: -Math.PI / 2, spread: 1.3, grav: 0.05 });
      }
      if (!jh && p.vy < -3) p.vy *= ph.cut;
      p.vy = Math.min(p.vy + ph.grav, ph.fall);
      /* move */
      const wasG = p.ground;
      if (p.riding) moveBody(p, p.riding.dx, 0);
      moveBody(p, p.vx, p.vy);
      p.riding = null;
      if (p.vy >= 0) for (const m of plats) {
        if (p.x + p.w > m.x + 2 && p.x < m.x + m.w - 2) {
          const fb = p.y + p.h;
          if (fb >= m.y - 4 && fb <= m.y + 14 && !(p.drop > 0)) { p.y = m.y - p.h; p.vy = 0; p.ground = true; p.riding = m; break; }
        }
      }
      if (p.drop > 0) p.drop--;
      if (p.inv > 0) p.inv--;
      p.sq *= 0.8;
      if (p.ground && !wasG) { A.sfx('land'); p.sq = 0.35; G.burst(p.x + p.w / 2, p.y + p.h, 4, { color: '#e2e8f0', speed: 1.4, life: 12, size: 2, angle: -Math.PI / 2, spread: 1.4 }); }
      if (p.ground) p.walk += Math.abs(p.vx) * 0.13;
      if (p.bump) {
        const { c, r } = p.bump; p.bump = null;
        if (grid[r][c] === '?') {
          grid[r][c] = 'u'; bnc[r * cols + c] = 10; coins++; G.addScore(100); A.sfx('coin');
          G.popup(c * T + T / 2, r * T - 6, '+100', '#fde047'); G.burst(c * T + T / 2, r * T, 8, { color: ['#fde047', '#fff'], speed: 3, life: 22, glow: true });
          if (coins % 30 === 0) { lives++; A.sfx('power'); G.popup(p.x, p.y - 20, '1UP!', '#86efac', 20); }
        } else A.sfx('thud');
      }
      /* tile interactions */
      const x0 = Math.floor((p.x + 3) / T), x1 = Math.floor((p.x + p.w - 3) / T), y0 = Math.floor((p.y + 3) / T), y1 = Math.floor((p.y + p.h - 1) / T);
      for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) {
        const ch = tile(c, r);
        if (ch === 'o') {
          grid[r][c] = ' '; coins++; G.addScore(50); A.sfx('coin');
          G.burst(c * T + T / 2, r * T + T / 2, 6, { color: ['#fde047', '#fff'], speed: 2.5, life: 16, size: 2, glow: true });
          if (coins % 30 === 0) { lives++; A.sfx('power'); G.popup(p.x, p.y - 20, '1UP!', '#86efac', 20); }
        } else if (ch === '^') {
          if (p.y + p.h > r * T + 14) { hurt(G, p.vx >= 0 ? 1 : -1); p.vy = -7; }
        } else if (ch === 'S') {
          if (p.vy >= 0 && p.y + p.h > r * T + 14) { p.vy = -ph.spring; p.sq = -0.4; bnc[r * cols + c] = 12; A.sfx('bounce'); G.ring(c * T + T / 2, r * T + 20, '#f472b6', 40, 16); }
        } else if (ch === '>') {
          if (Math.abs(p.vx) < ph.run * 1.4) A.sfx('dash');
          p.vx = p.face * Math.max(Math.abs(p.vx), ph.run * 1.6);
        } else if (ch === 'C') {
          check = { x: c * T + 6, y: r * T + T - p.h }; grid[r][c] = 'c'; A.sfx('power'); G.popup(c * T + T / 2, r * T - 30, 'CHECKPOINT', '#86efac', 14); G.ring(c * T + T / 2, r * T, '#86efac', 60, 24);
        } else if (ch === 'F') {
          doneT = 90; G.addScore(500 + p.hp * 100); A.sfx('win'); G.popup(c * T + T / 2, r * T - 50, 'COURSE CLEAR!', '#fde047', 22);
          G.burst(c * T + T / 2, r * T, 40, { color: ['#fde047', '#f472b6', '#67e8f9', '#fff'], speed: 6, life: 50, glow: true, grav: 0.05 });
        }
      }
      if (p.y > rows * T + 60) die(G);
      /* enemies */
      for (const e of en) {
        if (e.dead) continue;
        updEnemy(e);
        if (p.dead || !A.overlap({ x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 2 }, e)) continue;
        if (p.vy > 0.5 && p.y + p.h - e.y < 18 && e.kind !== 's') {
          e.dead = true; p.vy = jh ? -11 : -8; G.addScore(100); A.sfx('hit'); G.freeze(3);
          G.popup(e.x + e.w / 2, e.y - 8, '+100', '#fff'); G.burst(e.x + e.w / 2, e.y + e.h / 2, 12, { color: ['#fff', '#fbbf24'], speed: 3.5, life: 22 });
        } else if (p.inv <= 0) hurt(G, e.x + e.w / 2 > p.x + p.w / 2 ? 1 : -1);
      }
      en = en.filter((e) => !e.dead);
      for (const m of plats) m.t += 0;
      camFollow();
    }

    function nextLevel(G) {
      if (lvl + 1 >= levels.length) return G.win(cfg.winTitle || 'All Courses Clear!', coins + ' coins \u00b7 ' + lives + ' lives left');
      load(G, lvl + 1);
    }

    /* ---------- drawing ---------- */
    function drawTiles(c, G) {
      const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(cols - 1, Math.floor((cam.x + W) / T));
      const r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(rows - 1, Math.floor((cam.y + H) / T)), t = G.clock;
      for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) {
        const ch = grid[r][q]; if (ch === ' ') continue;
        const x = q * T, y = r * T, k = bnc[r * cols + q] || 0, bo = k ? -Math.sin(k / 10 * Math.PI) * 8 : 0;
        if (ch === '#') {
          c.fillStyle = th.solid; c.fillRect(x, y, T, T);
          c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, y + T - 4, T, 4); c.fillRect(x + T - 3, y, 3, T);
          c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x, y, T, 2);
          if (!isSolid(q, r - 1)) {
            c.fillStyle = th.top; c.fillRect(x, y, T, 8);
            c.fillStyle = A.shade(th.top, 0.3); c.fillRect(x, y, T, 3);
            c.fillStyle = A.shade(th.top, -0.3); c.fillRect(x, y + 8, T, 2);
          }
        } else if (ch === '=') {
          c.fillStyle = A.shade(th.plat, -0.35); c.fillRect(x, y + 4, T, 8);
          c.fillStyle = th.plat; c.fillRect(x, y, T, 8); c.fillStyle = A.shade(th.plat, 0.3); c.fillRect(x, y, T, 2);
        } else if (ch === '?' || ch === 'u') {
          const col = ch === '?' ? th.crate : A.shade(th.solid, -0.2);
          c.fillStyle = A.shade(col, -0.35); A.roundRect(c, x + 1, y + 2 + bo, T - 2, T - 2, 5); c.fill();
          c.fillStyle = col; A.roundRect(c, x + 1, y + 1 + bo, T - 2, T - 4, 5); c.fill();
          if (ch === '?') A.text(c, '?', x + T / 2, y + T / 2 + 6 + bo, 19, '#7c4a03', 'center', '800');
        } else if (ch === '^') {
          for (let i = 0; i < 2; i++) {
            c.fillStyle = '#e2e8f0'; c.beginPath(); c.moveTo(x + i * 16, y + T); c.lineTo(x + i * 16 + 8, y + 10); c.lineTo(x + i * 16 + 16, y + T); c.fill();
            c.fillStyle = '#94a3b8'; c.beginPath(); c.moveTo(x + i * 16 + 8, y + 10); c.lineTo(x + i * 16 + 16, y + T); c.lineTo(x + i * 16 + 8, y + T); c.fill();
          }
        } else if (ch === 'o') {
          const sx = Math.abs(Math.cos(t * 0.06 + q)), cy = y + T / 2 + Math.sin(t * 0.05 + q) * 2;
          c.save(); c.shadowColor = '#fde047'; c.shadowBlur = 8;
          c.fillStyle = '#facc15'; c.beginPath(); c.ellipse(x + T / 2, cy, 8 * sx + 1.5, 9, 0, 0, TAU); c.fill(); c.restore();
          c.fillStyle = '#fef08a'; c.beginPath(); c.ellipse(x + T / 2, cy, 4 * sx + 0.8, 5, 0, 0, TAU); c.fill();
        } else if (ch === 'S') {
          const sq = k ? Math.sin(k / 12 * Math.PI) * 8 : 0;
          c.strokeStyle = '#cbd5e1'; c.lineWidth = 3;
          c.beginPath(); for (let i = 0; i < 4; i++) { const yy = y + T - 3 - i * (5 - sq * 0.12); c.moveTo(x + 8, yy); c.lineTo(x + T - 8, yy - 2); } c.stroke();
          c.fillStyle = th.spring || '#f472b6'; A.roundRect(c, x + 4, y + 10 + sq, T - 8, 6, 3); c.fill();
        } else if (ch === '>') {
          c.save(); c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.2 + q); c.fillStyle = '#22d3ee'; c.shadowColor = '#22d3ee'; c.shadowBlur = 8;
          for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(x + 4 + i * 12, y + T - 18); c.lineTo(x + 14 + i * 12, y + T - 10); c.lineTo(x + 4 + i * 12, y + T - 2); c.lineTo(x + 8 + i * 12, y + T - 10); c.fill(); }
          c.restore();
        } else if (ch === 'C' || ch === 'c') {
          c.fillStyle = '#e2e8f0'; c.fillRect(x + 14, y - T + 8, 3, T * 2 - 8);
          c.fillStyle = ch === 'c' ? '#4ade80' : '#94a3b8';
          const w = Math.sin(t * 0.1) * 2; c.beginPath(); c.moveTo(x + 17, y - T + 10); c.lineTo(x + 34 + w, y - T + 16); c.lineTo(x + 17, y - T + 22); c.fill();
        } else if (ch === 'F') {
          c.save(); c.shadowColor = '#fde047'; c.shadowBlur = 16;
          c.fillStyle = '#e2e8f0'; c.fillRect(x + 14, y - 2 * T, 4, T * 3);
          c.fillStyle = '#fde047'; const w = Math.sin(t * 0.12) * 3;
          c.beginPath(); c.moveTo(x + 18, y - 2 * T + 2); c.lineTo(x + 46 + w, y - 2 * T + 14); c.lineTo(x + 18, y - 2 * T + 26); c.fill(); c.restore();
        }
      }
    }
    function drawEnemy(c, e, G) {
      if (cfg.drawEnemy && cfg.drawEnemy(c, e, G)) return;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2, d = e.vx < 0 ? -1 : 1, t = G.clock;
      A.shadow(c, cx, e.y + e.h + 1, e.w * 0.45, 3, 0.25);
      if (e.kind === 'b') {
        const fl = Math.sin(t * 0.35) * 8;
        c.fillStyle = '#6d28d9'; c.beginPath(); c.moveTo(cx - 4, cy); c.lineTo(cx - 20, cy - fl - 4); c.lineTo(cx - 12, cy + 6); c.fill();
        c.beginPath(); c.moveTo(cx + 4, cy); c.lineTo(cx + 20, cy - fl - 4); c.lineTo(cx + 12, cy + 6); c.fill();
        c.fillStyle = '#7c3aed'; c.beginPath(); c.arc(cx, cy, 9, 0, TAU); c.fill();
      } else {
        const col = e.kind === 'h' ? '#22c55e' : e.kind === 's' ? '#94a3b8' : '#ef4444';
        c.fillStyle = A.shade(col, -0.3); c.beginPath(); c.ellipse(cx, e.y + e.h - 3, e.w / 2, 5, 0, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, e.w / 2, e.h / 2, 0, Math.PI, 0); c.lineTo(cx + e.w / 2, e.y + e.h - 3); c.lineTo(cx - e.w / 2, e.y + e.h - 3); c.fill();
        if (e.kind === 's') { c.fillStyle = '#e2e8f0'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx + i * 8 - 4, e.y + 4); c.lineTo(cx + i * 8, e.y - 5); c.lineTo(cx + i * 8 + 4, e.y + 4); c.fill(); } }
      }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - 5, cy - 2, 3.5, 0, TAU); c.arc(cx + 5, cy - 2, 3.5, 0, TAU); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(cx - 5 + d * 1.2, cy - 2, 1.6, 0, TAU); c.arc(cx + 5 + d * 1.2, cy - 2, 1.6, 0, TAU); c.fill();
    }
    function drawHeroDefault(c, p) {
      const cx = p.x + p.w / 2;
      c.fillStyle = '#fb923c'; A.roundRect(c, cx - 10, p.y, 20, 26, 6); c.fill();
      c.fillStyle = '#fff'; c.fillRect(cx + p.face * 3 - 3, p.y + 7, 6, 6);
    }
    function draw(G, c) {
      if (cfg.bg) cfg.bg(c, cam, G.clock, lvl, G); else A.sky(c, W, H, ['#38bdf8', '#bae6fd']);
      c.save(); c.translate(-Math.round(cam.x), -Math.round(cam.y));
      drawTiles(c, G);
      for (const m of plats) {
        c.fillStyle = A.shade(th.plat, -0.35); A.roundRect(c, m.x, m.y + 3, m.w, m.h, 5); c.fill();
        c.fillStyle = th.plat; A.roundRect(c, m.x, m.y, m.w, m.h - 3, 5); c.fill();
        c.fillStyle = A.shade(th.plat, 0.3); c.fillRect(m.x + 4, m.y + 1, m.w - 8, 2);
      }
      for (const e of en) drawEnemy(c, e, G);
      if (!p.dead && !(p.inv > 0 && Math.floor(p.inv / 4) % 2)) (cfg.drawHero || drawHeroDefault)(c, p, G);
      G.drawFX(c);
      c.restore();
      A.vignette(c, W, H, 0.3);
      if (banner > 0 && G.state === 'playing') {
        c.save(); c.globalAlpha = Math.min(1, banner / 40);
        A.glowText(c, levels[lvl].name, W / 2, 100, 32, cfg.color || '#fde68a', 'center', 14);
        if (levels[lvl].hint) A.text(c, levels[lvl].hint, W / 2, 128, 15, '#e6e9f5', 'center', '600');
        c.restore();
      }
      if (doneT > 0) A.glowText(c, 'COURSE CLEAR!', W / 2, 200, 40, '#fde047', 'center', 20);
    }

    return Arcade.game({
      id: cfg.id, title: cfg.title, subtitle: cfg.subtitle, color: cfg.color, help: cfg.help, controls: cfg.controls,
      w: W, h: H, touchL: cfg.touchL || [['\u25c0', 'ArrowLeft'], ['\u25b6', 'ArrowRight']], touchR: cfg.touchR || [['\u25b2', 'Space']],
      init, update, draw,
    });
  };
})();
