/* act-kit.js — side-scrolling action-platformer engine on top of arcade-core.js
   Act.make(name, cols, rows, fn) builds a level from code; Act.game({...}) runs the whole game.
   Tiles: # solid  = one-way  ^ spikes  o coin  C bench/checkpoint  F goal  P start  i candle (breakable, drops)
          d beam door  e missile door  x breakable wall  g token  r/R beat spikes (on / off-beat)  other letters = config */
(function () {
  'use strict';
  const A = Arcade, T = 32, W = 800, H = 480, TAU = Math.PI * 2;
  const Act = (window.Act = { T, W, H });
  const SOL = '#dex';

  Act.ridge = (c, base, amp, seed, off, color) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) { const X = x + off; c.lineTo(x, base + Math.sin(X * 0.01 + seed) * amp + Math.sin(X * 0.027 + seed * 2.1) * amp * 0.5); }
    c.lineTo(W, H); c.closePath(); c.fill();
  };
  Act.make = (name, cols, R, fn) => {
    const g = Array.from({ length: R }, () => Array(cols).fill(' '));
    const api = {
      cols, R,
      set: (x, y, ch) => { if (x >= 0 && x < cols && y >= 0 && y < R) g[y][x] = ch; },
      get: (x, y) => (g[y] && g[y][x]) || ' ',
      fill: (x, y, w, h, ch) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) api.set(x + i, y + j, ch || '#'); },
      ground: (x0, x1, top) => { const t = top == null ? R - 3 : top; api.fill(x0, t, x1 - x0, R - t, '#'); },
      plat: (x, y, n) => api.fill(x, y, n, 1, '='),
      coins: (x, y, n, dx) => { for (let i = 0; i < n; i++) api.set(x + i * (dx || 1), y, 'o'); },
      line: (x, y, n, ch) => api.fill(x, y, n, 1, ch),
    };
    fn(api);
    return { name, rows: g.map((r) => r.join('')) };
  };

  Act.game = function (cfg) {
    const hc = Object.assign({ hp: 5, run: 3.4, acc: 0.5, air: 0.35, fric: 0.6, jump: 10.6, grav: 0.52, fall: 12, jumps: 1, coyote: 6, buf: 7, cut: 0.45, dashSpd: 9, dashT: 12, dashCd: 34, dashInv: false, ammo: 0, stomp: false }, cfg.hero);
    const wp = Object.assign({ type: 'melee', dmg: 1, range: 46, h: 34, cd: 20, dur: 9, pogo: false, color: '#fff', speed: 9, life: 60, size: 5 }, hc.weapon);
    const wp0 = Object.assign({}, wp), sub = hc.sub, defs = cfg.enemies || {}, levels = cfg.levels, soul = !!cfg.soul;
    let grid, rows, cols, p, en, shots, items, cam, lvl, lv, th, banner, doneT, check, hazY, hazT, msg, msgT, shade, boss, coins, lives, tokens, bnc, G0;
    const base = Object.assign({ solid: '#475569', top: '#94a3b8', plat: '#64748b', accent: '#fbbf24' }, cfg.theme);

    const tile = (x, y) => (x < 0 || x >= cols ? '#' : y < 0 ? ' ' : y >= rows ? ' ' : grid[y][x]);
    const solid = (x, y) => SOL.includes(tile(x, y));
    const say = (t) => { msg = t; msgT = 150; };

    function load(G, i) {
      lvl = i; lv = typeof levels[i] === 'function' ? levels[i]() : levels[i];
      rows = lv.rows.length; cols = lv.rows[0].length; th = Object.assign({}, base, lv.theme || {});
      grid = lv.rows.map((r) => r.split('')); en = []; shots = []; items = []; bnc = {}; boss = null; check = null; doneT = 0; banner = 170; tokens = 0; hazT = 0;
      hazY = lv.rise ? (lv.rise.y0 != null ? lv.rise.y0 : rows * T + 40) : 0;
      let st = { c: 1, r: rows - 4 };
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const ch = grid[r][c];
        if (ch === 'P') { st = { c, r }; grid[r][c] = ' '; }
        else if (defs[ch]) { addEnemy(ch, c, r); grid[r][c] = ' '; }
      }
      lv.start = st; spawn(G, true);
    }
    function addEnemy(ch, c, r) {
      const d = defs[ch], x = c * T + (T - d.w) / 2, y = r * T + T - d.h;
      const e = { k: ch, d, x, y, w: d.w, h: d.h, x0: x, y0: y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, hp: d.hp, hmax: d.hp, t: A.randi(0, 90), ground: false, hurt: 0, phase: 0, awake: false, dead: false, face: -1 };
      en.push(e); if (d.ai === 'boss') boss = e;
    }
    function spawn(G, fresh) {
      const s = check || { x: lv.start.c * T + 6, y: lv.start.r * T + T - 28 };
      const keep = p;
      p = { x: s.x, y: s.y, w: 20, h: 28, vx: 0, vy: 0, face: 1, ground: false, coy: 0, jb: 0, jl: 0, inv: fresh ? 0 : 80, hp: hc.hp, dead: 0, walk: 0, sq: 0, atk: 0, cd: 0, chg: 0, dashT: 0, dashCd: 0, airDash: false, heal: 0, wj: 0, drop: 0, safe: { x: s.x, y: s.y }, bump: null, atkDir: 0, hit: null };
      p.ab = keep ? keep.ab : Object.assign({}, hc.ab); p.ammo = keep ? keep.ammo : hc.ammo; p.focus = 0; p.maxhp = keep ? keep.maxhp : hc.hp; p.hp = p.maxhp;
      if (boss && !boss.dead) { boss.hp = boss.hmax; boss.awake = false; boss.x = boss.x0; boss.y = boss.y0; boss.phase = 0; boss.vx = boss.vy = 0; boss.t = 0; shots = shots.filter((s2) => s2.friendly); }
      if (lv.rise) hazY = lv.rise.y0 != null ? lv.rise.y0 : rows * T + 40;
      camFollow(true);
    }
    function camFollow(snap) {
      const tx = A.clamp(p.x + p.w / 2 - W / 2 + p.face * 40, 0, Math.max(0, cols * T - W));
      const ty = A.clamp(p.y + p.h / 2 - H * 0.55, 0, Math.max(0, rows * T - H));
      if (snap) { cam.x = tx; cam.y = ty; } else { cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; }
    }

    /* ---- physics ---- */
    function moveBody(b, dx, dy) {
      let hx = 0;
      if (dx) {
        b.x += dx;
        const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 0.01) / T), c = Math.floor((dx > 0 ? b.x + b.w : b.x) / T);
        for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = dx > 0 ? c * T - b.w : (c + 1) * T; hx = dx > 0 ? 1 : -1; b.vx = 0; break; }
      }
      b.ground = false; b.bump = null; b.y += dy;
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 0.01) / T);
      if (dy > 0) {
        const r = Math.floor((b.y + b.h) / T), pb = b.y + b.h - dy;
        for (let c = c0; c <= c1; c++) if (solid(c, r) || (tile(c, r) === '=' && !(b.drop > 0) && pb <= r * T + 1)) { b.y = r * T - b.h; b.vy = 0; b.ground = true; break; }
      } else if (dy < 0) {
        const r = Math.floor(b.y / T);
        for (let c = c0; c <= c1; c++) if (solid(c, r)) { b.y = (r + 1) * T; b.vy = 0; b.bump = { c, r }; break; }
      }
      return hx;
    }
    const wallSide = () => (solid(Math.floor((p.x - 1) / T), Math.floor((p.y + p.h / 2) / T)) ? -1 : solid(Math.floor((p.x + p.w + 1) / T), Math.floor((p.y + p.h / 2) / T)) ? 1 : 0);

    /* ---- helpers ---- */
    function hurt(G, dir, n) {
      if (p.inv > 0 || p.dead) return;
      p.hp -= n || 1; p.inv = 90; p.vy = -5.5; p.vx = -dir * 4; p.dashT = 0; p.atk = 0; p.chg = 0; G.shake(7); G.freeze(4); A.sfx('hurt');
      G.burst(p.x + p.w / 2, p.y + p.h / 2, 12, { color: ['#fff', '#fca5a5'], speed: 4, life: 24 });
      if (p.hp <= 0) die(G);
    }
    function die(G) {
      if (p.dead) return;
      p.dead = 80; A.sfx('ko'); G.shake(12);
      G.burst(p.x + p.w / 2, p.y + p.h / 2, 30, { color: ['#fff', '#fbbf24', '#fb7185'], speed: 5, glow: true, life: 40 });
      if (soul) { shade = coins > 0 ? { lvl, x: p.x, y: p.y, n: coins } : null; coins = 0; } else lives--;
    }
    function enemyShot(e, vx, vy, o) {
      const d = e.d.shoot || {};
      shots.push(Object.assign({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx, vy, grav: 0, r: d.size || 6, dmg: 1, life: 160, friendly: false, color: d.color || '#fb7185' }, o));
    }
    function drop(e) {
      const x = e.x + e.w / 2, y = e.y + e.h / 2, r = Math.random();
      const kind = r < 0.07 ? 'hp' : sub && r < 0.22 ? 'ammo' : r < 0.7 ? 'coin' : null;
      if (kind) items.push({ kind, x, y, vy: -4, vx: A.rand(-1, 1), t: 0 });
    }
    function killEnemy(G, e) {
      e.dead = true; G.addScore(e.d.score || 100); A.sfx(e.d.ai === 'boss' ? 'boom' : 'explode');
      G.burst(e.x + e.w / 2, e.y + e.h / 2, e.d.ai === 'boss' ? 60 : 14, { color: [e.d.color || '#fff', '#fff'], speed: e.d.ai === 'boss' ? 7 : 4, life: 34, glow: true });
      if (e.d.ai === 'boss') { G.shake(20); G.freeze(10); boss = null; for (let i = 0; i < 10; i++) items.push({ kind: 'coin', x: e.x + e.w / 2, y: e.y + e.h / 2, vy: A.rand(-8, -3), vx: A.rand(-3, 3), t: 0 }); say(cfg.bossDead || 'Guardian defeated'); shots = shots.filter((s) => s.friendly); }
      else if (!e.d.noDrop) drop(e);
      if (cfg.onKill) cfg.onKill(e, G, ctx(G));
    }
    function damageEnemy(G, e, dmg, dir) {
      if (e.dead || (e.d.ai === 'boss' && !e.awake)) return false;
      if (e.d.armor && dmg < e.d.armor) { A.sfx('parry'); G.burst(e.x + e.w / 2, e.y + e.h / 2, 4, { color: '#fff', life: 10, speed: 3 }); return true; }
      e.hp -= dmg; e.hurt = 6; A.sfx('hit');
      if (e.d.ai !== 'boss' && !e.d.fixed) { e.vx = dir * 3; e.vy = Math.min(e.vy, -2.5); }
      G.burst(e.x + e.w / 2, e.y + e.h / 2, 5, { color: ['#fff', e.d.color || '#fbbf24'], speed: 3, life: 16 });
      if (hc.heal) p.focus = Math.min(99, p.focus + 11);
      if (e.hp <= 0) killEnemy(G, e);
      return true;
    }
    function breakTile(G, c, r, byMissile) {
      const ch = tile(c, r);
      if (ch === 'x') { grid[r][c] = ' '; A.sfx('boom'); G.burst(c * T + 16, r * T + 16, 12, { color: [th.solid, '#fff'], speed: 4, life: 24 }); G.shake(4); }
      else if (ch === 'd') { grid[r][c] = ' '; A.sfx('door'); G.ring(c * T + 16, r * T + 16, '#67e8f9', 40, 16); }
      else if (ch === 'e' && byMissile) { grid[r][c] = ' '; A.sfx('door'); G.ring(c * T + 16, r * T + 16, '#fb7185', 40, 16); }
      else if (ch === 'i') {
        grid[r][c] = ' '; A.sfx('hit'); G.burst(c * T + 16, r * T + 12, 8, { color: ['#fbbf24', '#fff'], speed: 3, life: 20, glow: true });
        const rr = Math.random(); items.push({ kind: sub && rr < 0.55 ? 'ammo' : rr < 0.7 ? 'hp' : 'coin', x: c * T + 16, y: r * T + 12, vy: -3, vx: 0, t: 0 });
      }
    }
    const ctx = (G) => ({ p, G, e: null, shoot: (e, vx, vy, o) => enemyShot(e, vx, vy, o), cols, rows, tile, T, say, hit: (e) => hurt(G, e.x < p.x ? -1 : 1), setWeapon: (o) => Object.assign(wp, o), weapon: wp, heal: (n) => { p.hp = Math.min(p.maxhp, p.hp + n); }, enemies: en, spawnEnemy: (ch, x, y) => addEnemy(ch, Math.floor(x / T), Math.floor(y / T)), move: (e, dx, dy) => moveBody(e, dx, dy), A });

    /* ---- enemies ---- */
    function updEnemy(G, e) {
      const d = e.d; e.t++; if (e.hurt > 0) e.hurt--;
      const dx = p.x - e.x, ad = Math.abs(dx);
      if (d.ai === 'boss') {
        if (!e.awake) { if (ad < (d.wake || 330) && Math.abs(p.y - e.y) < 260) { e.awake = true; e.t = 0; say(d.name || 'Guardian'); G.shake(6); A.sfx('charge'); } return; }
        e.face = dx < 0 ? -1 : 1;
        if (d.grav !== false) e.vy = Math.min(e.vy + 0.5, 11);
        cfg.boss(e, ctx(G));
        if (e.dead) return;
        const ox = e.x; moveBody(e, e.vx, e.vy); if (d.grav === false) e.ground = false; if (e.x === ox && e.vx) e.vx = 0;
        return;
      }
      if (d.ai === 'fly') {
        if (d.sight && ad < d.sight && Math.abs(p.y - e.y) < d.sight) { const a = Math.atan2(p.y - e.y, dx); e.x += Math.cos(a) * d.sp; e.y += Math.sin(a) * d.sp; e.vx = Math.cos(a); }
        else { const ox = e.x; e.x = e.x0 + Math.sin(e.t * 0.02) * (d.range || 70); e.y = e.y0 + Math.sin(e.t * 0.05) * (d.bob || 20); e.vx = e.x - ox; }
      } else if (d.ai === 'turret') { e.face = dx < 0 ? -1 : 1; }
      else {
        e.vy = Math.min(e.vy + 0.5, 10);
        if (d.ai === 'hop') { if (e.ground) { e.vx = 0; if (e.t % (d.every || 80) === 0) { e.vy = -(d.jump || 9); e.vx = (dx < 0 ? -1 : 1) * d.sp; } } }
        else {
          if (d.sight && ad < d.sight && Math.abs(p.y - e.y) < 70) e.dir = dx < 0 ? -1 : 1;
          if (e.ground) e.vx = e.dir * d.sp * (d.sight && ad < d.sight ? 1.5 : 1);
          if (e.ground && !d.fixed) { const fx = Math.floor((e.dir > 0 ? e.x + e.w + 2 : e.x - 2) / T), fr = Math.floor((e.y + e.h + 4) / T); if (!solid(fx, fr) && tile(fx, fr) !== '=') e.dir = -e.dir; }
        }
        if (d.fixed) e.vx = 0;
        const hx = moveBody(e, e.vx, e.vy); if (hx) e.dir = -e.dir; if (e.vx) e.face = e.vx < 0 ? -1 : 1;
        if (e.y > rows * T + 100) e.dead = true;
      }
      if (d.shoot && ad < (d.sight || 360) && Math.abs(p.y - e.y) < 200 && e.t % d.every === 0) {
        const a = d.aim ? Math.atan2(p.y + 12 - e.y - e.h / 2, dx) : (dx < 0 ? Math.PI : 0);
        enemyShot(e, Math.cos(a) * d.shoot.speed, Math.sin(a) * d.shoot.speed); A.sfx('blip');
      }
    }

    /* ---- init / update ---- */
    function init(G) {
      G0 = G; Object.assign(wp, wp0); coins = 0; lives = cfg.lives == null ? 3 : cfg.lives; cam = { x: 0, y: 0 }; shade = null; msgT = 0; p = null;
      load(G, 0);
    }
    function update(G) {
      if (banner > 0) banner--; if (msgT > 0) msgT--;
      for (const k in bnc) if (--bnc[k] <= 0) delete bnc[k];
      G.hudL = soul ? 'SHARDS ' + coins : 'SCORE ' + G.score + (hc.ammo || sub ? '   AMMO ' + p.ammo : '');
      G.hudR = soul ? 'SCORE ' + G.score : 'LIVES ' + Math.max(0, lives) + '  ' + (lvl + 1) + '/' + levels.length;
      if (doneT > 0) { camFollow(); if (--doneT === 0) nextLevel(G); return; }
      if (p.dead > 0) {
        camFollow();
        if (--p.dead === 0) { if (!soul && lives <= 0) G.over(cfg.overTitle || 'Out of lives', cfg.overSub ? cfg.overSub(G, coins, lvl) : 'Score ' + G.score); else spawn(G, false); }
        return;
      }
      const ax = A.axisX(), jh = A.held('Space', 'ArrowUp', 'KeyW', 'KeyZ'), jp = A.hit('Space', 'ArrowUp', 'KeyW', 'KeyZ'), down = A.held('ArrowDown', 'KeyS');
      const ab = p.ab, was = p.ground;
      p.cd--; p.dashCd--; if (p.inv > 0) p.inv--; if (p.wj > 0) p.wj--; p.sq *= 0.8;
      /* healing (hold) */
      if (hc.heal && p.ground && !ax && p.hp < p.maxhp && p.focus >= 33 && A.held('KeyV', 'KeyH', 'KeyQ')) {
        if (++p.heal >= 42) { p.hp++; p.focus -= 33; p.heal = 0; A.sfx('heal'); G.ring(p.x + 10, p.y + 14, '#a5f3fc', 50, 22); }
        else if (p.heal % 10 === 1) A.sfx('charge');
        p.vx *= 0.5;
      } else p.heal = 0;
      /* dash */
      if (ab.dash && p.dashT <= 0 && p.dashCd <= 0 && !p.heal && A.hit('ShiftLeft', 'ShiftRight', 'KeyL') && (p.ground || !p.airDash)) {
        p.dashT = hc.dashT; p.dashCd = hc.dashCd; if (!p.ground) p.airDash = true; if (hc.dashInv) p.inv = Math.max(p.inv, hc.dashT + 6); A.sfx('dash'); if (ax) p.face = ax;
        G.burst(p.x + 10, p.y + 14, 6, { color: '#fff', speed: 2, life: 14, size: 2 });
      }
      if (p.dashT > 0) { p.dashT--; p.vx = p.face * hc.dashSpd; p.vy = 0; }
      else if (!p.heal) {
        if (ax && p.atk < 3) p.face = ax;
        const ws = ab.wall && !p.ground && p.vy > 0 ? wallSide() : 0;
        if (p.wj <= 0) p.vx = A.approach(p.vx, ax * hc.run, ax ? (p.ground ? hc.acc : hc.air) : (p.ground ? hc.fric : 0.1));
        p.coy = p.ground ? hc.coyote : p.coy - 1; p.jb = jp ? hc.buf : p.jb - 1;
        if (p.ground) { p.jl = hc.jumps - 1 + (ab.dj ? 1 : 0); p.airDash = false; p.safe = { x: p.x, y: p.y }; }
        if (jp && down && p.ground && tile(Math.floor((p.x + 10) / T), Math.floor((p.y + p.h + 2) / T)) === '=') { p.drop = 8; p.jb = 0; }
        if (ws && ax === ws) p.vy = Math.min(p.vy, 2);
        if (p.jb > 0 && (p.coy > 0 || p.jl > 0 || (ws && ax === ws))) {
          if (p.coy <= 0 && ws && ax === ws) { p.vy = -hc.jump * 0.95; p.vx = -ws * 5; p.face = -ws; p.wj = 10; p.jl = Math.max(p.jl, hc.jumps - 1 + (ab.dj ? 1 : 0)); A.sfx('jump'); }
          else { if (p.coy <= 0) p.jl--; p.vy = -hc.jump * (p.coy <= 0 ? 0.92 : 1); A.sfx(p.coy > 0 ? 'jump' : 'jump2'); }
          p.jb = 0; p.coy = 0; p.sq = -0.3;
          G.burst(p.x + 10, p.y + p.h, 5, { color: '#fff', speed: 1.6, life: 14, size: 2, angle: -Math.PI / 2, spread: 1.3 });
        }
        if (!jh && p.vy < -3) p.vy *= hc.cut;
        p.vy = Math.min(p.vy + hc.grav, hc.fall);
        if (ab.glide && jh && p.vy > 1.5 && !p.ground && !ws) p.vy = 1.5;
      }
      /* weapons */
      const atk = A.hit('KeyX', 'KeyJ'), atkH = A.held('KeyX', 'KeyJ');
      if (wp.type === 'melee') {
        if (atk && p.cd <= 0 && p.dashT <= 0) { p.atk = wp.dur; p.cd = wp.cd; p.hit = new Set(); p.atkDir = wp.pogo && down && !p.ground ? 1 : 0; A.sfx('slash'); }
      } else {
        if (ab.charge) { if (atkH) p.chg = Math.min(70, p.chg + 1); }
        const fire = ab.charge ? (!atkH && p.chg > 0) : (atkH && p.cd <= 0);
        if (fire && p.dashT <= 0) {
          const big = ab.charge && p.chg >= 45;
          shots.push({ x: p.x + p.w / 2 + p.face * 14, y: p.y + 13, vx: p.face * wp.speed * (big ? 1.2 : 1), vy: 0, grav: 0, r: wp.size * (big ? 2 : 1), dmg: wp.dmg * (big ? 3 : 1), life: wp.life, friendly: true, color: big ? '#fff' : wp.color, glow: true });
          A.sfx(big ? 'laser' : 'shoot'); p.cd = wp.cd; p.chg = 0; p.atk = 4; p.sq = 0;
        }
      }
      if (sub && ab.sub !== false && A.hit('KeyC', 'KeyK') && p.ammo >= sub.cost && p.dashT <= 0) {
        p.ammo -= sub.cost; p.atk = Math.max(p.atk, 6);
        shots.push({ x: p.x + p.w / 2 + p.face * 10, y: p.y + 10, vx: p.face * sub.vx, vy: sub.vy || 0, grav: sub.grav || 0, r: sub.size || 7, dmg: sub.dmg, life: sub.life || 90, friendly: true, color: sub.color || '#fff', pierce: sub.pierce, sub: true, spin: !!sub.spin, glow: !!sub.glow });
        A.sfx(sub.sfx || 'shoot');
      } else if (sub && A.hit('KeyC', 'KeyK') && p.ammo < sub.cost) A.sfx('blip');
      if (p.atk > 0) {
        p.atk--;
        if (wp.type === 'melee' && p.hit && p.atk < wp.dur - 2) {
          const r = p.atkDir ? { x: p.x - 6, y: p.y + p.h - 4, w: p.w + 12, h: wp.range * 0.8 } : { x: p.face > 0 ? p.x + p.w - 2 : p.x - wp.range + 2, y: p.y + (p.h - wp.h) / 2, w: wp.range, h: wp.h };
          p.hitR = r;
          for (const e of en) if (!e.dead && !p.hit.has(e) && A.overlap(r, e)) { p.hit.add(e); if (damageEnemy(G, e, wp.dmg, p.face)) { G.freeze(2); if (p.atkDir) { p.vy = -8.5; p.jl = Math.max(p.jl, 1); p.airDash = false; } } }
          for (let c = Math.floor(r.x / T); c <= Math.floor((r.x + r.w) / T); c++) for (let rr = Math.floor(r.y / T); rr <= Math.floor((r.y + r.h) / T); rr++) { const ch = tile(c, rr); if (ch === 'x' || ch === 'i' || ch === 'd') breakTile(G, c, rr, false); }
          for (const s of shots) if (!s.friendly && A.overlap(r, { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 }) && wp.deflect) { s.dead = true; A.sfx('parry'); }
        } else p.hitR = null;
      } else p.hitR = null;
      /* move */
      if (p.riding) moveBody(p, p.riding.dx, 0);
      moveBody(p, p.vx, p.vy);
      if (p.drop > 0) p.drop--;
      if (p.ground && !was) { A.sfx('land'); p.sq = 0.35; G.burst(p.x + 10, p.y + p.h, 4, { color: '#e2e8f0', speed: 1.4, life: 12, size: 2, angle: -Math.PI / 2, spread: 1.4 }); }
      if (p.ground) p.walk += Math.abs(p.vx) * 0.13;
      if (p.y > rows * T + 60) { p.hp--; if (p.hp <= 0) { die(G); return; } p.x = p.safe.x; p.y = p.safe.y; p.vx = p.vy = 0; p.inv = 90; A.sfx('hurt'); }
      /* tiles */
      const x0 = Math.floor((p.x + 3) / T), x1 = Math.floor((p.x + p.w - 3) / T), y0 = Math.floor((p.y + 3) / T), y1 = Math.floor((p.y + p.h - 1) / T);
      const beat = cfg.bpm ? Math.floor(G.clock / (3600 / cfg.bpm)) % 2 : 0;
      for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) {
        const ch = tile(c, r);
        if (ch === 'o') { grid[r][c] = ' '; coins++; G.addScore(50); A.sfx('coin'); G.burst(c * T + 16, r * T + 16, 5, { color: ['#fde047', '#fff'], speed: 2.5, life: 16, size: 2, glow: true }); }
        else if (ch === 'g') { grid[r][c] = ' '; tokens++; G.addScore(200); A.sfx('gem'); G.ring(c * T + 16, r * T + 16, '#f0abfc', 40, 18); G.popup(c * T + 16, r * T, tokens + '/' + (lv.need || '?'), '#f0abfc'); }
        else if (ch === '^') { if (p.y + p.h > r * T + 14 && p.inv <= 0) { hurt(G, 0, 1); if (p.hp > 0) { p.x = p.safe.x; p.y = p.safe.y; p.vx = p.vy = 0; } } }
        else if ((ch === 'r' && beat === 0) || (ch === 'R' && beat === 1)) { if (p.inv <= 0) hurt(G, p.face, 1); }
        else if (ch === 'C' || ch === 'c') {
          if (ch === 'C' || (soul && p.hp < p.maxhp)) { check = { x: c * T + 6, y: r * T + T - p.h }; grid[r][c] = 'c'; A.sfx('power'); G.ring(c * T + 16, r * T, '#86efac', 60, 24); if (ch === 'C') G.popup(c * T + 16, r * T - 20, soul ? 'BENCH' : 'CHECKPOINT', '#86efac', 14); if (soul) { p.hp = p.maxhp; p.focus = 0; } }
        } else if (ch === 'F') {
          if (lv.need && tokens < lv.need) { if (G.t % 90 === 0) say('Collect ' + lv.need + ' tokens to open the gate (' + tokens + ')'); }
          else if (boss && !boss.dead) { if (G.t % 90 === 0) say('Defeat the guardian first'); }
          else { doneT = 90; G.addScore(500); A.sfx('win'); G.popup(c * T + 16, r * T - 40, cfg.clear || 'AREA CLEAR!', '#fde047', 22); G.burst(c * T + 16, r * T, 40, { color: ['#fde047', '#f472b6', '#67e8f9', '#fff'], speed: 6, life: 50, glow: true }); }
        } else if (cfg.pickups && cfg.pickups[ch]) {
          const u = cfg.pickups[ch]; grid[r][c] = ' '; if (u.ab) p.ab[u.ab] = true; if (u.hp) { p.maxhp += u.hp; p.hp = p.maxhp; } if (u.ammo) p.ammo += u.ammo;
          A.sfx('power'); G.shake(5); G.ring(c * T + 16, r * T + 16, th.accent, 90, 30); say(u.msg); G.popup(c * T + 16, r * T - 10, u.msg, '#fff', 16);
        } else if (cfg.onTile && cfg.onTile(ch, c, r, ctx(G))) grid[r][c] = ' ';
      }
      /* hazard rising */
      if (lv.rise) {
        if (G.t > (lv.rise.delay || 120)) hazY -= lv.rise.sp;
        if (p.y + p.h > hazY + 8) { if (++hazT % 40 === 1) hurt(G, 0, 1); p.vy = Math.min(p.vy, 3); } else hazT = 0;
      }
      /* shade retrieval */
      if (shade && shade.lvl === lvl && A.overlap(p, { x: shade.x - 8, y: shade.y - 8, w: 36, h: 44 })) { coins += shade.n; G.popup(p.x, p.y - 20, '+' + shade.n + ' shards', '#a5f3fc', 16); A.sfx('heal'); shade = null; }
      /* items */
      for (const it of items) {
        it.t++; it.vy = Math.min(it.vy + 0.35, 8); it.x += it.vx; it.vx *= 0.97;
        const nc = Math.floor(it.x / T), nr = Math.floor((it.y + it.vy + 8) / T);
        if (solid(nc, nr) || tile(nc, nr) === '=') { it.vy = 0; } else it.y += it.vy;
        if (it.t > 12 && A.overlap(p, { x: it.x - 9, y: it.y - 9, w: 18, h: 18 })) {
          it.dead = true;
          if (it.kind === 'coin') { coins++; G.addScore(25); A.sfx('coin'); } else if (it.kind === 'hp') { p.hp = Math.min(p.maxhp, p.hp + 1); A.sfx('heal'); G.popup(it.x, it.y - 10, '+1 HP', '#86efac'); } else { p.ammo += 3; A.sfx('gem'); G.popup(it.x, it.y - 10, '+3 AMMO', '#fcd34d'); }
        }
        if (it.t > 900) it.dead = true;
      }
      items = items.filter((i) => !i.dead);
      /* projectiles */
      for (const s of shots) {
        s.life--; s.vy += s.grav || 0; s.x += s.vx; s.y += s.vy;
        const c = Math.floor(s.x / T), r = Math.floor(s.y / T), ch = tile(c, r);
        if (s.life <= 0 || s.y > rows * T + 60) { s.dead = true; continue; }
        if (SOL.includes(ch) || ch === 'i') { if (s.friendly) { breakTile(G, c, r, !!s.sub || s.dmg >= 3); } s.dead = true; G.burst(s.x, s.y, 3, { color: s.color, life: 10, speed: 2 }); continue; }
        const box = { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
        if (s.friendly) {
          s.hitSet = s.hitSet || new Set();
          for (const e of en) if (!e.dead && !s.hitSet.has(e) && A.overlap(box, e)) { s.hitSet.add(e); damageEnemy(G, e, s.dmg, s.vx < 0 ? -1 : 1); if (!s.pierce) { s.dead = true; break; } }
        } else if (!p.dead && p.inv <= 0 && A.overlap(box, { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 2 })) { hurt(G, s.vx < 0 ? -1 : 1, s.dmg); s.dead = true; }
      }
      shots = shots.filter((s) => !s.dead);
      /* enemies */
      for (const e of en) {
        if (e.dead) continue;
        updEnemy(G, e);
        if (e.dead || p.dead) continue;
        if (A.overlap({ x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 2 }, e) && !(e.d.ai === 'boss' && !e.awake)) {
          if (hc.stomp && p.vy > 0.5 && p.y + p.h - e.y < 18 && e.d.ai !== 'boss' && !e.d.spiky) { damageEnemy(G, e, 2, p.face); p.vy = jh ? -11 : -8; G.freeze(3); }
          else if (p.inv <= 0) hurt(G, e.x + e.w / 2 > p.x + p.w / 2 ? 1 : -1, e.d.dmg || 1);
        }
      }
      en = en.filter((e) => !e.dead);
      camFollow();
    }
    function nextLevel(G) {
      if (lvl + 1 >= levels.length) return G.win(cfg.winTitle || 'Victory!', cfg.winSub ? cfg.winSub(G, coins) : coins + ' shards');
      load(G, lvl + 1);
    }

    /* ---- drawing ---- */
    function drawTiles(c, G) {
      const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(cols - 1, Math.floor((cam.x + W) / T)), r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(rows - 1, Math.floor((cam.y + H) / T)), t = G.clock;
      const beat = cfg.bpm ? Math.floor(t / (3600 / cfg.bpm)) % 2 : 0, ph = cfg.bpm ? (t % (3600 / cfg.bpm)) / (3600 / cfg.bpm) : 0;
      for (let r = r0; r <= r1; r++) for (let q = c0; q <= c1; q++) {
        const ch = grid[r][q]; if (ch === ' ') continue;
        const x = q * T, y = r * T;
        if (cfg.drawTile && cfg.drawTile(c, ch, x, y, q, r, G, th)) continue;
        if (ch === '#') {
          const h = A.hash(q, r);
          c.fillStyle = A.shade(th.solid, (h - 0.5) * 0.12); c.fillRect(x, y, T, T);
          c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(x, y + T - 4, T, 4); c.fillRect(x + T - 3, y, 3, T);
          c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x, y, T, 2);
          if (h > 0.72) { c.fillStyle = 'rgba(0,0,0,.16)'; c.fillRect(x + 6, y + 12, 14, 3); }
          if (!solid(q, r - 1)) { c.fillStyle = th.top; c.fillRect(x, y, T, 6); c.fillStyle = A.shade(th.top, 0.3); c.fillRect(x, y, T, 2); }
        } else if (ch === '=') { c.fillStyle = A.shade(th.plat, -0.35); c.fillRect(x, y + 4, T, 7); c.fillStyle = th.plat; c.fillRect(x, y, T, 7); c.fillStyle = A.shade(th.plat, 0.3); c.fillRect(x, y, T, 2); }
        else if (ch === 'x') { c.fillStyle = A.shade(th.solid, 0.15); c.fillRect(x, y, T, T); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, T - 4, T - 4); c.beginPath(); c.moveTo(x + 6, y + 8); c.lineTo(x + 16, y + 18); c.lineTo(x + 12, y + 28); c.stroke(); }
        else if (ch === 'd' || ch === 'e') { const col = ch === 'd' ? '#22d3ee' : '#fb7185'; c.fillStyle = '#1e293b'; c.fillRect(x, y, T, T); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10; c.fillRect(x + 8, y + 2, T - 16, T - 4); c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x + 10, y + 4, 3, T - 8); }
        else if (ch === '^') { c.fillStyle = th.spike || '#e2e8f0'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + i * 11, y + T); c.lineTo(x + i * 11 + 5.5, y + 12); c.lineTo(x + i * 11 + 11, y + T); c.fill(); } }
        else if (ch === 'r' || ch === 'R') {
          const on = (ch === 'r') === (beat === 0), warn = ph > 0.8; c.save();
          if (on) { c.fillStyle = '#f43f5e'; c.shadowColor = '#f43f5e'; c.shadowBlur = 12; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + i * 11, y + T); c.lineTo(x + i * 11 + 5.5, y + 6); c.lineTo(x + i * 11 + 11, y + T); c.fill(); } }
          else { c.globalAlpha = warn ? 0.7 : 0.25; c.fillStyle = '#fda4af'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + i * 11, y + T); c.lineTo(x + i * 11 + 5.5, y + (warn ? 18 : 26)); c.lineTo(x + i * 11 + 11, y + T); c.fill(); } }
          c.restore();
        }
        else if (ch === 'o') { const sx = Math.abs(Math.cos(t * 0.06 + q)); c.save(); c.shadowColor = '#fde047'; c.shadowBlur = 8; c.fillStyle = '#facc15'; c.beginPath(); c.ellipse(x + 16, y + 16 + Math.sin(t * 0.05 + q) * 2, 7 * sx + 1.5, 8, 0, 0, TAU); c.fill(); c.restore(); }
        else if (ch === 'g') { c.save(); c.shadowColor = '#e879f9'; c.shadowBlur = 14; c.fillStyle = '#f0abfc'; const yy = y + 16 + Math.sin(t * 0.06 + q) * 3; c.beginPath(); c.moveTo(x + 16, yy - 11); c.lineTo(x + 24, yy); c.lineTo(x + 16, yy + 11); c.lineTo(x + 8, yy); c.fill(); c.restore(); }
        else if (ch === 'i') { c.fillStyle = '#78350f'; c.fillRect(x + 11, y + 14, 10, 18); c.fillStyle = '#fef3c7'; c.fillRect(x + 13, y + 8, 6, 8); const fl = Math.sin(t * 0.3 + q) * 1.5; c.save(); c.shadowColor = '#fb923c'; c.shadowBlur = 12; c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(x + 16, y - 2 + fl); c.lineTo(x + 20, y + 8); c.lineTo(x + 12, y + 8); c.fill(); c.restore(); }
        else if (ch === 'C' || ch === 'c') { c.fillStyle = '#cbd5e1'; c.fillRect(x + 14, y - 28, 3, 60); c.fillStyle = ch === 'c' ? '#4ade80' : '#64748b'; const w = Math.sin(t * 0.1) * 2; c.beginPath(); c.moveTo(x + 17, y - 26); c.lineTo(x + 34 + w, y - 18); c.lineTo(x + 17, y - 10); c.fill(); }
        else if (ch === 'F') { c.save(); const open = !(lv.need && tokens < lv.need) && !(boss && !boss.dead); c.shadowColor = open ? '#fde047' : '#64748b'; c.shadowBlur = 18; c.fillStyle = open ? '#fde047' : '#475569'; c.fillRect(x + 4, y - T, 24, T * 2); c.fillStyle = open ? '#fff7ae' : '#1e293b'; c.fillRect(x + 9, y - T + 5, 14, T * 2 - 10); c.restore(); }
        else if (cfg.pickups && cfg.pickups[ch]) { c.save(); c.shadowColor = th.accent; c.shadowBlur = 16; c.fillStyle = th.accent; const yy = y + 16 + Math.sin(t * 0.07) * 4; A.roundRect(c, x + 6, yy - 10, 20, 20, 5); c.fill(); c.restore(); A.text(c, cfg.pickups[ch].icon || '+', x + 16, yy + 6, 16, '#111', 'center', '800'); }
      }
    }
    function drawEnemy(c, e, G) {
      if (cfg.drawEnemy && cfg.drawEnemy(c, e, G)) return;
      const d = e.d, cx = e.x + e.w / 2, cy = e.y + e.h / 2; let col = d.color || '#ef4444'; if (e.hurt > 0) col = '#fff';
      A.shadow(c, cx, e.y + e.h + 1, e.w * 0.45, 3, 0.25);
      c.fillStyle = col; A.roundRect(c, e.x, e.y, e.w, e.h, Math.min(10, e.w / 3)); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - 5 * e.face, cy - 3, 4, 0, TAU); c.arc(cx + 3 * e.face, cy - 3, 4, 0, TAU); c.fill();
      c.fillStyle = '#111'; c.beginPath(); c.arc(cx - 4 * e.face + e.face * 1.5, cy - 3, 2, 0, TAU); c.arc(cx + 4 * e.face + e.face * 1.5, cy - 3, 2, 0, TAU); c.fill();
    }
    function drawHeroDefault(c, p) { const cx = p.x + p.w / 2; c.fillStyle = '#38bdf8'; A.roundRect(c, cx - 10, p.y, 20, 28, 6); c.fill(); c.fillStyle = '#fff'; c.fillRect(cx + p.face * 3 - 3, p.y + 7, 6, 6); }
    function draw(G, c) {
      if (cfg.bg) cfg.bg(c, cam, G.clock, lvl, G); else A.sky(c, W, H, ['#0f172a', '#1e293b']);
      c.save(); c.translate(-Math.round(cam.x), -Math.round(cam.y));
      drawTiles(c, G);
      if (shade && shade.lvl === lvl) { c.save(); c.globalAlpha = 0.6 + Math.sin(G.clock * 0.1) * 0.2; c.shadowColor = '#a5f3fc'; c.shadowBlur = 18; c.fillStyle = '#a5f3fc'; A.roundRect(c, shade.x, shade.y, 20, 28, 8); c.fill(); c.restore(); }
      for (const it of items) { c.save(); c.shadowBlur = 8; const col = it.kind === 'hp' ? '#fb7185' : it.kind === 'ammo' ? '#fcd34d' : '#facc15'; c.shadowColor = col; c.fillStyle = col; if (it.kind === 'hp') K_heart(c, it.x, it.y - 6, 7); else { c.beginPath(); c.arc(it.x, it.y, it.kind === 'ammo' ? 6 : 5, 0, TAU); c.fill(); } c.restore(); }
      for (const e of en) drawEnemy(c, e, G);
      for (const s of shots) {
        c.save(); c.fillStyle = s.color; if (s.glow || !s.friendly) { c.shadowColor = s.color; c.shadowBlur = 10; }
        if (cfg.drawShot && cfg.drawShot(c, s, G)) { c.restore(); continue; }
        if (s.spin) { c.translate(s.x, s.y); c.rotate(G.clock * 0.4); c.fillRect(-s.r, -2, s.r * 2, 4); c.fillRect(-2, -s.r, 4, s.r * 2); } else { c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); }
        c.restore();
      }
      if (!p.dead && !(p.inv > 0 && Math.floor(p.inv / 4) % 2 && p.dashT <= 0)) (cfg.drawHero || drawHeroDefault)(c, p, G, wp);
      if (p.hitR && wp.type === 'melee' && !cfg.drawHero) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(p.hitR.x, p.hitR.y, p.hitR.w, p.hitR.h); }
      G.drawFX(c);
      if (lv.rise) { const g = c.createLinearGradient(0, hazY, 0, hazY + 60); g.addColorStop(0, cfg.hazColor || 'rgba(251,113,133,.85)'); g.addColorStop(1, cfg.hazColor2 || 'rgba(127,29,29,.95)'); c.fillStyle = g; c.fillRect(cam.x - 10, hazY, W + 20, rows * T + 200 - hazY); c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W + 20; x += 20) c.fillRect(cam.x + x, hazY + Math.sin(G.clock * 0.1 + x) * 3, 12, 3); }
      c.restore();
      if (cfg.post) cfg.post(c, cam, G, p);
      A.vignette(c, W, H, 0.3);
      /* HUD */
      for (let i = 0; i < p.maxhp; i++) K_heart(c, 22 + i * 22, 40, 8, i < p.hp ? '#fb7185' : 'rgba(255,255,255,.2)');
      if (hc.heal) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(14, 62, 84, 8); c.fillStyle = '#67e8f9'; c.fillRect(15, 63, 82 * p.focus / 99, 6); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(48, 63, 1, 6); c.fillRect(81, 63, 1, 6); if (p.heal) { c.fillStyle = '#a5f3fc'; c.fillRect(14, 74, 84 * p.heal / 42, 3); } }
      if (cfg.hud) cfg.hud(c, G, p, { tokens, lv });
      if (lv.need) A.text(c, '◆ ' + tokens + '/' + lv.need, W - 14, 52, 15, '#f0abfc', 'right', '800');
      if (p.chg > 8) { c.fillStyle = p.chg >= 45 ? '#fff' : '#67e8f9'; c.fillRect(p.x - cam.x - 4, p.y - cam.y - 10, 28 * p.chg / 70, 3); }
      if (boss && boss.awake) { const k = boss.hp / boss.hmax; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(W / 2 - 152, H - 36, 304, 16); c.fillStyle = '#ef4444'; c.fillRect(W / 2 - 150, H - 34, 300 * k, 12); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(W / 2 - 150, H - 34, 300 * k, 4); A.text(c, boss.d.name || 'GUARDIAN', W / 2, H - 42, 13, '#fecaca', 'center', '800'); }
      if (banner > 0 && G.state === 'playing') { c.save(); c.globalAlpha = Math.min(1, banner / 40); A.glowText(c, lv.name, W / 2, 110, 30, cfg.color || '#fde68a', 'center', 14); if (lv.hint) A.text(c, lv.hint, W / 2, 138, 15, '#e6e9f5', 'center', '600'); c.restore(); }
      if (msgT > 0 && msg) { c.save(); c.globalAlpha = Math.min(1, msgT / 30); A.text(c, msg, W / 2, H - 70, 18, '#fff', 'center', '800'); c.restore(); }
      if (doneT > 0) A.glowText(c, cfg.clear || 'AREA CLEAR!', W / 2, 200, 40, '#fde047', 'center', 20);
      if (p.dead > 0 && soul) { c.fillStyle = 'rgba(0,0,0,' + Math.min(0.6, (80 - p.dead) / 60) + ')'; c.fillRect(0, 0, W, H); }
    }
    function K_heart(c, x, y, s, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y + s * 0.35); c.bezierCurveTo(x - s * 0.7, y - s * 0.3, x - s * 0.9, y + s * 0.5, x, y + s); c.bezierCurveTo(x + s * 0.9, y + s * 0.5, x + s * 0.7, y - s * 0.3, x, y + s * 0.35); c.fill(); }

    return Arcade.game({
      id: cfg.id, title: cfg.title, subtitle: cfg.subtitle, color: cfg.color, help: cfg.help, controls: cfg.controls,
      w: W, h: H, touchL: [['◀', 'ArrowLeft'], ['▶', 'ArrowRight']], touchR: cfg.touchR || [['⚔', 'KeyX'], ['▲', 'Space']],
      init, update, draw,
    });
  };
})();
