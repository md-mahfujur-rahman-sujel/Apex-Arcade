/* card-scenes.js — one hand-built animated scene per game card on index.html.
   Scenes are keyed by game number: S[n](ctx, seconds, accentColour). Drawn on a 300x128 canvas. Keep next to index.html. */
(function () {
  'use strict';
  const W = 300, H = 128, T = Math.PI * 2, dpr = Math.min(2, window.devicePixelRatio || 1);
  const tri = (x) => 1 - Math.abs(2 * (((x % 1) + 1) % 1) - 1), ease = (x) => 1 - Math.pow(1 - x, 3);
  const R = (c, k, x, y, w, h) => { c.fillStyle = k; c.fillRect(x, y, w, h); };
  const O = (c, k, x, y, r) => { c.fillStyle = k; c.beginPath(); c.arc(x, y, Math.max(r, 0), 0, T); c.fill(); };
  const E = (c, e, x, y, s, a) => { c.save(); c.translate(x, y); if (a) c.rotate(a); c.font = s + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 0, 0); c.restore(); };
  const L = (c, k, w, ...p) => { c.strokeStyle = k; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  const A = (c, k, w, x, y, r, a, b) => { c.strokeStyle = k; c.lineWidth = w; c.beginPath(); c.arc(x, y, r, a, b); c.stroke(); };
  const poly = (c, k, a, pts) => { c.globalAlpha = a; c.fillStyle = k; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.fill(); c.globalAlpha = 1; };
  const gl = (c, ch, x, y, col, s) => { c.font = s + 'px "Segoe UI Symbol",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 2; c.strokeStyle = col === '#fff' ? '#000' : '#fff'; c.fillStyle = col; c.strokeText(ch + '\uFE0E', x, y); c.fillText(ch + '\uFE0E', x, y); };
  const S = {};

  /* 01 Glowmoth Gauntlet — a moth threads scrolling crystal columns */
  const g1 = (n) => 60 + 26 * Math.sin(n * 1.7);
  S[1] = (c, t, k) => {
    const p = t * 60, n0 = Math.floor(p / 110) - 1;
    for (let n = n0; n < n0 + 5; n++) { const x = n * 110 - p + 10, y = g1(n); c.globalAlpha = .5; R(c, k, x, 0, 22, y - 24); R(c, k, x, y + 24, 22, H); c.globalAlpha = .9; R(c, '#fff', x, y - 27, 22, 3); R(c, '#fff', x, y + 24, 22, 3); c.globalAlpha = 1; }
    for (let i = 1; i < 9; i++) { c.globalAlpha = .5 - i * .05; O(c, k, 70 - i * 8, g1((60 + p - i * 8) / 110) + 4, 3 - i * .25); }
    c.globalAlpha = 1; E(c, '🦋', 70, g1((60 + p) / 110) + Math.sin(t * 16) * 2, 24, Math.cos((60 + p) / 110 * 1.7) * .35);
  };

  /* 02 Ion Rally — a real mini rally: paddles chase the ball */
  S[2] = (c, t, k) => {
    const f = (u) => [20 + 260 * tri(u * .45), 12 + 104 * tri(u * .77)], py = (u) => Math.max(0, Math.min(94, f(u)[1] - 17));
    for (let y = 6; y < H; y += 14) R(c, 'rgba(255,255,255,.18)', 148, y, 4, 8);
    c.shadowColor = k; c.shadowBlur = 10; R(c, k, 12, py(t - .12), 6, 34); R(c, k, 282, py(t - .2), 6, 34); c.shadowBlur = 0;
    for (let i = 6; i > 0; i--) { const [a, b] = f(t - i * .03); c.globalAlpha = .07 * i; O(c, '#fff', a, b, 5); }
    c.globalAlpha = 1; const [bx, by] = f(t); O(c, '#fff', bx, by, 5);
  };

  /* 03 Ember Serpent — a snake circles the arena, eats the fruit and grows */
  S[3] = (c, t, k) => {
    const P = (d) => { d = (d % 600 + 600) % 600; if (d < 220) return [40 + d, 24]; d -= 220; if (d < 80) return [260, 24 + d]; d -= 80; if (d < 220) return [260 - d, 104]; d -= 220; return [40, 104 - d]; };
    const h = t * 70, hd = h % 600, len = 10 + (hd > 330 ? 3 : 0);
    for (let x = 40; x <= 260; x += 20) R(c, 'rgba(255,255,255,.05)', x, 20, 1, 88);
    if (hd < 330) E(c, '🍎', 230, 104, 14 + Math.sin(t * 6) * 2);
    E(c, '⭐', 150, 64, 12 + Math.sin(t * 4) * 2);
    for (let i = len; i >= 0; i--) { const [x, y] = P(h - i * 8); c.globalAlpha = 1 - i * .04; R(c, i ? k : '#fff', x - 4, y - 4, 8, 8); }
    c.globalAlpha = 1; const [hx, hy] = P(h); O(c, '#000', hx + 1, hy - 1, 1.6);
  };

  /* 04 Hivefall Defense — marching invaders, eroded bunkers, a saucer, a ship firing */
  S[4] = (c, t, k) => {
    const ox = 34 * tri(t * .22) - 17, oy = (Math.floor(t * .55) % 5) * 3, sx = (u) => 150 + 95 * Math.sin(u * .8);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) E(c, '👾', 44 + i * 35 + ox + (r % 2) * 6, 26 + r * 20 + oy, Math.floor(t * 2 + i) % 2 ? 17 : 15);
    E(c, '🛸', ((t * 45) % 360) - 30, 9, 14);
    for (let i = 0; i < 3; i++) { const x = 60 + i * 90; R(c, k, x - 14, 92, 28, 8); R(c, k, x - 10, 87, 20, 6); R(c, '#0b0d16', x - 4 + i * 3, 96, 6, 4); }
    R(c, k, sx(t) - 10, 112, 20, 6); R(c, k, sx(t) - 3, 106, 6, 6);
    for (let i = 0; i < 2; i++) { const y = 108 - ((t * 140 + i * 65) % 130), tf = t - (108 - y) / 140; R(c, '#fff', sx(tf) - 1, y, 2, 8); }
  };

  /* 05 Prism Stack — an O-piece drops into the gap, two rows clear, the stack falls */
  const TP = ['#22d3ee', '#facc15', '#c084fc', '#4ade80', '#f87171', '#60a5fa'];
  S[5] = (c, t) => {
    const cs = 9, fx = 100, fy = 5, p = t % 4.2;
    R(c, 'rgba(0,0,0,.35)', fx - 2, fy - 2, cs * 10 + 4, cs * 13 + 4);
    const cell = (x, y, col) => R(c, col, fx + x * cs, fy + y * cs, cs - 1, cs - 1), flash = p > 2.4 && p < 3.2 && Math.floor(p * 14) % 2;
    if (p < 3.2) for (let y = 11; y < 13; y++) for (let x = 0; x < 10; x++) { if (p < 2.2 && (x === 4 || x === 5)) continue; cell(x, y, flash ? '#fff' : TP[(x + y) % 6]); }
    const sy = 10 + (p > 3.2 ? 2 * Math.min(1, (p - 3.2) / .5) : 0);
    for (let x = 0; x < 10; x++) if (x < 4 || x > 6) cell(x, Math.round(sy), TP[(x + 3) % 6]);
    if (p < 2.2) { const px = Math.round(7 - 3 * ease(Math.min(1, p / 1.4))), py = Math.round(-2 + 13 * (p / 2.2)); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) cell(px + a, py + b, '#facc15'); }
    c.fillStyle = flash ? '#fff' : 'rgba(255,255,255,.55)'; c.font = '700 11px ui-monospace,Consolas,monospace'; c.textAlign = 'left'; c.fillText(flash ? 'PRISM!' : 'LINES ' + (Math.floor(t / 4.2) * 2) % 100, 202, 20);
  };

  /* 06 Glow Beetle — eat seeds, grab the power seed, turn and chase the scared drone */
  S[6] = (c, t, k) => {
    const u = t % 11, A1 = u < 5.5, x = A1 ? -20 + u * 55 : 282 - (u - 5.5) * 55;
    c.globalAlpha = .6; for (const y of [36, 92]) L(c, k, 3, 0, y, W, y); c.globalAlpha = 1;
    for (let sx = 18; sx < 290; sx += 18) if (A1 && sx > x) O(c, '#fde68a', sx, 64, 2.2);
    if (A1) O(c, '#fff', 282, 64, 5 + Math.sin(t * 10) * 1.5);
    c.save(); c.translate(x, 64 + Math.sin(t * 12) * 2); if (!A1) c.scale(-1, 1); E(c, '🪲', 0, 0, 24); c.restore();
    if (A1) E(c, '🛸', x - 70, 64, 22); else { const dx = x - 62; O(c, '#3b82f6', dx, 64, 9); O(c, '#fff', dx - 3, 62, 2); O(c, '#fff', dx + 3, 62, 2); }
  };

  /* 07 Starfall Rift — vector rocks, a spinning ship, thrust flame and shots */
  S[7] = (c, t, k) => {
    const ax = 150, ay = 64, a = t * .9, rocks = [[20, 30, 18, 7, 16, .7], [200, 100, -14, -9, 12, -1.1], [90, 110, 9, -12, 20, .5], [260, 20, -20, 10, 9, 1.6]];
    c.strokeStyle = '#fff'; c.lineWidth = 1.3;
    for (const [x0, y0, vx, vy, r, s] of rocks) { const x = ((x0 + vx * t) % 330 + 330) % 330 - 15, y = ((y0 + vy * t) % 160 + 160) % 160 - 16; c.beginPath(); for (let i = 0; i < 9; i++) { const q = i / 9 * T + t * s, rr = r * (.8 + .25 * ((i * 7) % 3) / 2); c.lineTo(x + Math.cos(q) * rr, y + Math.sin(q) * rr); } c.closePath(); c.stroke(); }
    c.save(); c.translate(ax, ay); c.rotate(a); c.strokeStyle = k; c.lineWidth = 1.8; c.beginPath(); c.moveTo(14, 0); c.lineTo(-9, -8); c.lineTo(-5, 0); c.lineTo(-9, 8); c.closePath(); c.stroke();
    if (Math.sin(t * 6) > 0) { c.strokeStyle = '#f59e0b'; c.beginPath(); c.moveTo(-6, -3); c.lineTo(-15 - Math.random() * 4, 0); c.lineTo(-6, 3); c.stroke(); }
    c.restore();
    for (let i = 0; i < 3; i++) { const d = (t * 110 + i * 45) % 135; R(c, '#fff', ax + Math.cos(a) * (16 + d) - 1, ay + Math.sin(a) * (16 + d) - 1, 2.5, 2.5); }
  };

  /* 08 Fox Courier — the fox hops crates and grabs coins on a scrolling course */
  S[8] = (c, t, k) => {
    const p = t * 70; let h = 0;
    c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 4; i++) { const x = ((i * 130 - p * .3) % 520 + 520) % 520 - 80; c.beginPath(); c.arc(x, 112, 52, Math.PI, 0); c.fill(); }
    R(c, k, 0, 104, W, 24); c.fillStyle = 'rgba(0,0,0,.3)'; for (let x = -(p % 24); x < W; x += 24) c.fillRect(x, 104, 2, 24); c.fillRect(0, 116, W, 2);
    const n0 = Math.floor(p / 130);
    for (let n = n0; n < n0 + 3; n++) {
      const cx = n * 130 - p + 30, d = cx - 70; h = Math.max(h, Math.abs(d) < 34 ? 36 * Math.cos(d / 34 * 1.5708) : 0);
      R(c, '#b45309', cx - 11, 82, 22, 22); R(c, '#fbbf24', cx - 9, 84, 18, 4); c.fillStyle = '#fde68a'; c.font = '700 14px monospace'; c.textAlign = 'center'; c.fillText('?', cx, 100); O(c, '#fbbf24', cx, 56 + Math.sin(t * 5 + n) * 3, 5);
    }
    E(c, '🦊', 70, 91 - h, 26, -h * .012);
  };

  /* 09 Cloudhop Pip — a frog double-flips across bobbing clouds */
  S[9] = (c, t) => {
    const p = t * 40, Y = (n) => 76 + 18 * Math.sin(n * 2.3 + t * .8), n0 = Math.floor(p / 90) - 1;
    for (let i = 0; i < 16; i++) { c.globalAlpha = .4 + .4 * Math.sin(t * 3 + i); O(c, '#fff', (i * 47) % 300, (i * 31) % 70, 1); } c.globalAlpha = 1;
    for (let n = n0; n < n0 + 5; n++) { const x = n * 90 - p, y = Y(n); O(c, '#e0f2fe', x - 14, y + 2, 9); O(c, '#e0f2fe', x, y - 3, 12); O(c, '#e0f2fe', x + 14, y + 2, 9); R(c, '#e0f2fe', x - 14, y + 2, 28, 9); }
    const nf = (90 + p) / 90, f = nf % 1; E(c, '🐸', 90, Y(nf) - 24 - 26 * Math.sin(Math.PI * f), 24, f * T);
  };

  /* 10 Rollo Rush — speed lines, a checkered ground and rings at full tilt */
  S[10] = (c, t, k) => {
    const p = t * 240;
    for (let i = 0; i < 9; i++) R(c, 'rgba(255,255,255,.3)', ((i * 83 - p * 1.5) % 360 + 360) % 360 - 30, 8 + i * 11, 34, 1.5);
    for (let x = -(p % 40) - 40; x < W; x += 20) R(c, Math.floor((x + p) / 20) % 2 ? k : 'rgba(0,0,0,.3)', x, 102, 20, 26);
    R(c, 'rgba(255,255,255,.2)', 0, 102, W, 3);
    for (let n = 0; n < 5; n++) { const x = ((n * 70 - p * .9) % 350 + 350) % 350 - 25; c.strokeStyle = '#fbbf24'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, 74 + Math.sin(t * 4 + n) * 5, 6 * Math.abs(Math.cos(t * 6 + n)), 6, 0, 0, T); c.stroke(); }
    for (let i = 4; i > 0; i--) O(c, 'rgba(45,212,191,' + .12 * (4 - i + 1) + ')', 90 - i * 9, 88, 12);
    O(c, k, 90, 88, 13); for (let i = 0; i < 4; i++) { const a = t * 22 + i * 1.5708; L(c, '#fff', 2, 90 + Math.cos(a) * 12, 88 + Math.sin(a) * 12, 90 - Math.cos(a) * 12, 88 - Math.sin(a) * 12); }
  };

  /* 11 Iron Circuit — two fighters trade punches, sparks fly, health bars drain */
  S[11] = (c, t, k) => {
    const u = t % 2.4, pl = u < .5 ? Math.sin(u / .5 * Math.PI) : 0, pr = u > 1.2 && u < 1.7 ? Math.sin((u - 1.2) / .5 * Math.PI) : 0, dm = (t / 2.4) % 6, sk = '#f2c9a0';
    R(c, 'rgba(255,255,255,.1)', 0, 106, W, 22);
    const F = (x, d, col, pu) => { x += d * 10 * pu; R(c, col, x - 8, 60, 16, 30); L(c, col, 6, x - 4, 90, x - 8 - d * 3, 106); L(c, col, 6, x + 4, 90, x + 9 + d * 3, 106); O(c, sk, x, 52, 8); R(c, '#ef4444', x - 8, 47, 16, 3); L(c, sk, 6, x - d * 4, 70, x + d * 5, 62); L(c, sk, 6, x + d * 6, 68, x + d * (10 + 26 * pu), 66); };
    F(105, 1, k, pl); F(195, -1, '#e2e8f0', pr);
    const hit = Math.max(pl, pr);
    if (hit > .7) { c.strokeStyle = '#fde047'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i * T / 8; c.beginPath(); c.moveTo(150 + Math.cos(a) * 5, 64 + Math.sin(a) * 5); c.lineTo(150 + Math.cos(a) * (11 + hit * 8), 64 + Math.sin(a) * (11 + hit * 8)); c.stroke(); } }
    R(c, 'rgba(0,0,0,.45)', 10, 8, 110, 8); R(c, '#facc15', 10, 8, 110 - dm * 6, 8); R(c, 'rgba(0,0,0,.45)', 180, 8, 110, 8); R(c, '#facc15', 290 - (110 - dm * 8), 8, 110 - dm * 8, 8);
    c.fillStyle = '#fff'; c.font = '700 9px monospace'; c.textAlign = 'center'; c.fillText('VS', 150, 15);
  };

  /* 12 Clockwork Dawn — a clock face inside a time portal, the sun restarting behind it */
  S[12] = (c, t, k) => {
    const cx = 150, cy = 64;
    c.globalAlpha = .5; O(c, '#fbbf24', cx, cy + 30 - 24 * Math.sin(t * .6), 34); c.globalAlpha = 1;
    O(c, 'rgba(9,10,16,.55)', cx, cy, 36); A(c, k, 3, cx, cy, 36, 0, T);
    for (let i = 0; i < 12; i++) { const a = i * T / 12; L(c, k, i % 3 ? 1.5 : 3, cx + Math.cos(a) * 29, cy + Math.sin(a) * 29, cx + Math.cos(a) * 33, cy + Math.sin(a) * 33); L(c, k, 5, cx + Math.cos(a + t * .5) * 42, cy + Math.sin(a + t * .5) * 42, cx + Math.cos(a + t * .5) * 49, cy + Math.sin(a + t * .5) * 49); }
    let h = t * .6 - 1.5708, m = t * 4 - 1.5708; L(c, '#fff', 3, cx, cy, cx + Math.cos(h) * 18, cy + Math.sin(h) * 18); L(c, '#fff', 2, cx, cy, cx + Math.cos(m) * 28, cy + Math.sin(m) * 28);
    c.setLineDash([5, 9]); c.lineDashOffset = -t * 30; A(c, '#fff', 1.5, cx, cy, 58, 0, T); c.setLineDash([]);
    for (let i = 0; i < 6; i++) { const a = t * .9 + i * 1.047; O(c, '#fde68a', cx + Math.cos(a) * (58 + Math.sin(t * 3 + i) * 3), cy + Math.sin(a) * 58, 2); }
  };

  /* 13 Lanternbound — a whip cracks a candle under the moon, a bat flits by */
  S[13] = (c, t) => {
    const u = t % 3;
    O(c, '#fef3c7', 240, 26, 13); O(c, '#0b0d16', 246, 23, 11);
    c.fillStyle = 'rgba(0,0,0,.55)'; [[170, 56, 26, 48], [198, 40, 22, 64], [222, 62, 30, 42], [252, 48, 24, 56]].forEach(([x, y, w, h]) => { c.fillRect(x, y, w, h); for (let i = 0; i < w; i += 8) c.fillRect(x + i, y - 4, 5, 4); });
    R(c, 'rgba(251,191,36,' + (.5 + .3 * Math.sin(t * 5)) + ')', 206, 56, 4, 7); R(c, 'rgba(251,191,36,' + (.5 + .3 * Math.sin(t * 5 + 2)) + ')', 262, 66, 4, 7);
    R(c, 'rgba(0,0,0,.6)', 0, 104, W, 24);
    for (const x of [110, 150]) {
      const br = x === 110 && u > 1.05 && u < 2.4; R(c, '#a8a29e', x - 2, 90, 4, 14); R(c, '#e7e5e4', x - 4, 86, 8, 6);
      if (!br) { O(c, 'rgba(251,191,36,.18)', x, 80, 16); c.fillStyle = '#fbbf24'; c.beginPath(); c.ellipse(x, 80, 3 + Math.sin(t * 14 + x) * .6, 6 + Math.sin(t * 11 + x) * 1.2, 0, 0, T); c.fill(); }
      else if (u < 1.9) E(c, '❤️', x, Math.min(98, 84 + (u - 1.05) * 50), 9);
    }
    R(c, '#7f1d1d', 42, 74, 12, 28); O(c, '#fcd9b6', 48, 68, 6); R(c, '#451a03', 42, 62, 12, 4);
    if (u > .8 && u < 1.3) { const a = -1.1 + 1.35 * (u - .8) / .5, pts = []; for (let j = 0; j < 7; j++) pts.push(54 + Math.cos(a - j * .05) * j * 13, 80 + Math.sin(a - j * .05) * j * 13); L(c, '#d6a56b', 2.5, ...pts); } else L(c, '#d6a56b', 2.5, 54, 82, 50, 96);
    E(c, '🦇', ((t * 40) % 360) - 30, 30 + Math.sin(t * 4) * 14, 16);
  };

  /* 14 Deepcore Drifter — charge the beam, blast the cyan door open */
  S[14] = (c, t, k) => {
    const u = t % 2.6, p = t * 18;
    R(c, 'rgba(0,0,0,.45)', 0, 0, W, 14); R(c, 'rgba(0,0,0,.45)', 0, 104, W, 24);
    c.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 8; i++) { const x = ((i * 44 - p) % 352 + 352) % 352 - 26; c.beginPath(); c.moveTo(x - 8, 14); c.lineTo(x + 8, 14); c.lineTo(x, 28 + ((i * 7) % 3) * 8); c.fill(); }
    const open = u > 1.7 ? Math.min(1, (u - 1.7) / .5) : 0; R(c, u > 1.45 && u < 1.7 ? '#fff' : k, 262, 40, 10, 64 * (1 - open));
    E(c, '🤖', 70, 90, 26);
    if (u < 1.2) { O(c, 'rgba(34,211,238,.35)', 92, 88, 4 + 10 * u / 1.2); O(c, '#e0f2fe', 92, 88, 2 + 5 * u / 1.2); }
    else if (u < 1.7) { const x2 = Math.min(262, 92 + (u - 1.2) / .3 * 170); c.globalAlpha = .4; L(c, k, 11, 92, 88, x2, 88); c.globalAlpha = 1; L(c, '#e0f2fe', 4, 92, 88, x2, 88); }
  };

  /* 15 Hollowbell — a swinging bell, a pogoing knight, drifting spores */
  S[15] = (c, t, k) => {
    R(c, 'rgba(0,0,0,.5)', 0, 110, W, 18);
    c.fillStyle = k; for (let x = 130; x < 250; x += 12) { c.beginPath(); c.moveTo(x, 112); c.lineTo(x + 6, 100); c.lineTo(x + 12, 112); c.fill(); }
    const ph = t * 3, y = 84 - 30 * Math.abs(Math.sin(ph)), x = 190, q = (ph / Math.PI) % 1;
    L(c, '#e7e5e4', 2, x - 4, y - 7, x - 8, y - 16); L(c, '#e7e5e4', 2, x + 4, y - 7, x + 8, y - 16);
    O(c, '#0b1020', x, y, 9); O(c, '#e7e5e4', x, y - 1, 7); R(c, '#0b1020', x - 4, y - 3, 3, 5); R(c, '#0b1020', x + 1, y - 3, 3, 5);
    if (q > .5) L(c, '#fff', 2, x, y + 10, x, y + 22); if (q > .96 || q < .06) O(c, 'rgba(255,255,255,.7)', x, 99, 12);
    const ang = .6 * Math.sin(t * 2), bx = 60 + Math.sin(ang) * 70, by = Math.cos(ang) * 70; L(c, '#a8a29e', 2, 60, 0, bx, by); E(c, '🔔', bx, by + 8, 26, ang);
    c.globalAlpha = .6; for (let i = 0; i < 16; i++) O(c, k, (i * 43 + Math.sin(t * .8 + i) * 14) % 300, ((t * 14 + i * 37) % 140) - 6, 1.6); c.globalAlpha = 1;
  };

  /* 16 Skyfall Ridge — a climber dashes up the ridge through snowfall */
  S[16] = (c, t, k) => {
    poly(c, k, .22, [[0, 128], [50, 50], [100, 100], [160, 30], [230, 92], [300, 40], [300, 128]]);
    poly(c, k, .45, [[0, 128], [0, 118], [30, 112], [260, 44], [300, 60], [300, 128]]);
    const x = 30 + ((t * 36) % 230), y = 112 - (x - 30) * .3, dash = (t % 1.5) < .3;
    const fig = (px, py, a) => { c.globalAlpha = a; R(c, '#38bdf8', px - 4, py - 8, 8, 10); O(c, '#fdba74', px, py - 12, 4); R(c, '#ef4444', px - 5, py - 17, 9, 3); c.globalAlpha = 1; };
    if (dash) for (let i = 4; i > 0; i--) fig(x - i * 7, y + i * 2, .38 - i * .07);
    fig(x, y, 1);
    E(c, '🍓', 262, 34 + Math.sin(t * 3) * 3, 14);
    c.globalAlpha = .85; for (let i = 0; i < 30; i++) O(c, '#fff', ((i * 47 - t * 28) % 330 + 330) % 330 - 15, ((i * 29 + t * 45) % 150) - 10, 1.4); c.globalAlpha = 1;
  };

  /* 17 Stormcap Showdown — a thundercloud boss, pink parry bullets and a hopping cup, in old-film grain */
  S[17] = (c, t, k) => {
    R(c, 'rgba(255,236,190,.07)', 0, 0, W, H); R(c, 'rgba(0,0,0,.35)', 0, 104, W, 24);
    const bx = 236, by = 56, sc = 1 + .05 * Math.sin(t * 5);
    for (const [dx, dy, r] of [[0, -14, 20], [-20, 2, 17], [20, 2, 17], [0, 8, 20]]) O(c, k, bx + dx * sc, by + dy * sc, r * sc);
    O(c, '#fff', bx - 8, by - 2, 5); O(c, '#fff', bx + 8, by - 2, 5); O(c, '#111', bx - 9, by - 1, 2.4); O(c, '#111', bx + 7, by - 1, 2.4);
    L(c, '#111', 2.4, bx - 14, by - 11, bx - 3, by - 6); L(c, '#111', 2.4, bx + 14, by - 11, bx + 3, by - 6); L(c, '#111', 2, bx - 7, by + 11, bx - 2, by + 8, bx + 3, by + 11, bx + 8, by + 8);
    const jy = Math.abs(Math.sin(t * 2.2)) * 34;
    for (let i = 0; i < 3; i++) { const x = 216 - ((t * 80 + i * 70) % 240), y = 58 + Math.sin(i * 2.1 + 1) * 22; O(c, '#f9a8d4', x, y, 6); A(c, '#fff', 1.5, x, y, 8, 0, T); if (x < 80 && x > 46) A(c, '#fff', 2.5, x, y, 12 + (80 - x) * .1, 0, T); }
    for (let i = 0; i < 3; i++) O(c, '#fde047', 84 + ((t * 140 + i * 55) % 150), 84, 2.6);
    E(c, '☕', 60, 90 - jy, 24);
    const seed = Math.floor(t * 14); for (let i = 0; i < 3; i++) R(c, 'rgba(255,255,255,.12)', (seed * 97 + i * 131) % 300, 0, 1, H);
    const g = c.createRadialGradient(150, 64, 40, 150, 64, 170); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  };

  /* 18 Ashen Descent — a flame-headed hero rolls, slashes a skeleton, embers rise from lava */
  S[18] = (c, t, k) => {
    const u = t % 2.4, g = c.createLinearGradient(0, 80, 0, 128); g.addColorStop(0, 'rgba(249,115,22,0)'); g.addColorStop(1, 'rgba(249,115,22,.55)'); c.fillStyle = g; c.fillRect(0, 80, W, 48);
    R(c, 'rgba(0,0,0,.5)', 0, 106, W, 22);
    for (let i = 0; i < 22; i++) O(c, i % 3 ? '#fb923c' : '#fde047', (i * 37) % 300 + Math.sin(t + i) * 6, 128 - ((t * 22 + i * 17) % 128), 1.4);
    const rr = u > .6 && u < 1 ? (u - .6) / .4 : -1, hx = 90 + (rr >= 0 ? rr * 34 - 17 : 0);
    if (rr >= 0) { c.save(); c.translate(hx, 96); c.rotate(rr * T * 1.5); O(c, '#292524', 0, 0, 9); R(c, '#f97316', -1, -9, 2, 6); c.restore(); } else R(c, '#292524', hx - 6, 84, 12, 20);
    const fy = rr >= 0 ? 84 : 76; [['#f97316', 9], ['#fb923c', 6.5], ['#fde047', 4]].forEach(([col, r], j) => O(c, col, hx + Math.sin(t * 9 + j) * 1.5, fy + 3 - j * 2.5, r + Math.sin(t * 12 + j * 2)));
    if (u > 1.4 && u < 1.8) { const s = (u - 1.4) / .4; c.globalAlpha = 1 - s * .5; A(c, '#fff', 3.5, hx + 4, 86, 30, -1.4, -1.4 + 2.4 * s); c.globalAlpha = 1; }
    E(c, '💀', 150 + (u > 1.55 ? Math.min(18, (u - 1.55) * 90) : 0), 92, 20); if (u > 1.5 && u < 1.62) O(c, 'rgba(255,255,255,.7)', 150, 92, 13);
  };

  /* 19 Lumen Sprite — a light spirit trails sparks while the darkness creeps in */
  S[19] = (c, t, k) => {
    for (let i = 0; i < 6; i++) { const x = 20 + i * 52, h = 60 + (i * 17) % 30; R(c, 'rgba(0,0,0,.45)', x, 128 - h, 8, h); O(c, 'rgba(0,0,0,.4)', x + 4, 128 - h, 16); }
    for (let i = 0; i < 14; i++) O(c, 'rgba(253,230,138,' + (.3 + .4 * Math.sin(t * 2 + i)) + ')', (i * 61 + Math.sin(t * .6 + i) * 10) % 300, (i * 29) % 110 + Math.sin(t + i) * 5, 1.8);
    const w = (u) => [150 + 70 * Math.sin(u * .7), 58 + 26 * Math.sin(u * 1.3)];
    for (let i = 14; i > 0; i--) { const [x, y] = w(t - i * .06); c.globalAlpha = .4 * (1 - i / 14); O(c, k, x, y, 5 * (1 - i / 16)); } c.globalAlpha = 1;
    const [x, y] = w(t), g = c.createRadialGradient(x, y, 0, x, y, 28); g.addColorStop(0, 'rgba(255,250,200,.9)'); g.addColorStop(1, 'rgba(253,230,138,0)'); c.fillStyle = g; c.fillRect(x - 30, y - 30, 60, 60);
    O(c, '#fff', x, y, 4.5); L(c, '#fff', 2, x - 2, y - 3, x - 6, y - 9); L(c, '#fff', 2, x + 2, y - 3, x + 6, y - 9);
    const dk = 60 + 70 * tri(t * .15), g2 = c.createLinearGradient(0, 0, dk, 0); g2.addColorStop(0, 'rgba(0,0,0,.7)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g2; c.fillRect(0, 0, dk, H);
  };

  /* 20 Glimmer Gadabout — everything moves on the beat: spikes fade, hero bounces, notes rise */
  S[20] = (c, t, k) => {
    const b = t * 2, ph = b % 1, fb = Math.floor(b);
    for (let i = 0; i < 4; i++) R(c, i === fb % 4 ? k : 'rgba(255,255,255,.2)', 100 + i * 28, 8, 22, 5);
    R(c, 'rgba(0,0,0,.35)', 0, 106, W, 22);
    for (let i = 0; i < 9; i++) { const x = 14 + i * 32, a = .15 + .85 * (i % 2 === fb % 2 ? 1 - ph : ph); c.globalAlpha = a; c.fillStyle = k; c.beginPath(); c.moveTo(x - 10, 106); c.lineTo(x, 106 - 18 * a); c.lineTo(x + 10, 106); c.fill(); } c.globalAlpha = 1;
    const hy = 62 - 18 * Math.abs(Math.sin(b * Math.PI)), sw = Math.sin(b * Math.PI) * 4;
    O(c, '#fcd9b6', 150, hy, 11); L(c, '#facc15', 3, 146, hy - 10, 150, hy - 18, 156, hy - 10); O(c, '#f97316', 150, hy + 17, 8);
    O(c, '#fcd9b6', 128 + sw, hy + 14, 5); O(c, '#fcd9b6', 172 - sw, hy + 14, 5); O(c, '#7c3aed', 142, hy + 30, 5); O(c, '#7c3aed', 158, hy + 30, 5);
    c.fillStyle = k; c.font = '16px serif'; c.textAlign = 'center'; for (let i = 0; i < 4; i++) { c.globalAlpha = .8; c.fillText('♪', 40 + i * 65 + Math.sin(t * 2 + i) * 8, 110 - ((t * 26 + i * 33) % 100)); } c.globalAlpha = 1;
  };

  /* 21 Chess — a knight hops across, captures a pawn, then gives check */
  S[21] = (c, t) => {
    const X = 30, Y = 4, s = 30, P = [[1, 3], [2, 1], [4, 2], [5, 0]], u = t % 8, i = Math.min(2, Math.floor(u / 2)), f = u >= 6 ? 1 : Math.min(1, (u % 2) / 1.2), e = ease(f);
    c.globalAlpha = u > 7.4 ? 1 - (u - 7.4) / .6 : 1;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) R(c, (r + q) % 2 ? '#a9805a' : '#e9dcc3', X + q * s, Y + r * s, s, s);
    const a = P[i], b = P[i + 1], cx = (q) => X + (q + .5) * s, cy = (q) => Y + (q + .5) * s;
    for (const q of [a, b]) R(c, 'rgba(245,158,11,.45)', X + q[0] * s, Y + q[1] * s, s, s);
    if (u > 5.2) O(c, 'rgba(239,68,68,' + (.35 + .3 * Math.sin(t * 8)) + ')', cx(6), cy(2), 15);
    gl(c, '♚', cx(6), cy(2), '#111', 26); gl(c, '♟', cx(6), cy(3), '#111', 24); gl(c, '♟', cx(0), cy(1), '#111', 24);
    if (u < 3.2) gl(c, '♟', cx(4), cy(2), '#111', 24);
    gl(c, '♞', cx(a[0] + (b[0] - a[0]) * e), cy(a[1] + (b[1] - a[1]) * e) - 14 * Math.sin(Math.PI * f), '#fff', 26);
  };

  /* 22 Snakes & Ladders — climb the ladder, walk to the snake, slide to the tail */
  S[22] = (c, t, k) => {
    const x1 = 58, y1 = 112, x2 = 112, y2 = 18, L0 = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L0, uy = (y2 - y1) / L0, nx = -uy * 7, ny = ux * 7;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 10; q++) R(c, (r + q) % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.08)', q * 30, r * 32, 30, 32);
    L(c, '#d6a56b', 4, x1 + nx, y1 + ny, x2 + nx, y2 + ny); L(c, '#d6a56b', 4, x1 - nx, y1 - ny, x2 - nx, y2 - ny);
    for (let d = 12; d < L0 - 4; d += 16) L(c, '#b9824a', 3, x1 + ux * d + nx, y1 + uy * d + ny, x1 + ux * d - nx, y1 + uy * d - ny);
    const SN = (u) => [214 + 40 * u + 12 * Math.sin(u * 10), 22 + 90 * u];
    for (const [w, col] of [[14, 'rgba(0,0,0,.4)'], [10, k]]) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 30; i++) { const [x, y] = SN(i / 30); if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    const [hx, hy] = SN(0); O(c, k, hx, hy, 9); O(c, '#fff', hx - 3, hy - 3, 2.5); O(c, '#fff', hx + 3, hy - 3, 2.5); L(c, '#ef4444', 1.5, hx, hy + 8, hx, hy + 14);
    const s = t % 8; let x, y, hop = 0;
    if (s < 2.6) { const q = s / 2.6; x = x1 + 54 * q; y = y1 - 94 * q; hop = Math.abs(Math.sin(q * 20)) * 4; }
    else if (s < 3.6) { const q = ease(s - 2.6); x = x2 + (214 - x2) * q; y = y2 + 4 * q; }
    else if (s < 5.6) { [x, y] = SN(ease((s - 3.6) / 2)); }
    else { [x, y] = SN(1); }
    c.globalAlpha = s > 7.4 ? 1 - (s - 7.4) / .6 : 1; O(c, '#f43f5e', x, y - hop - 8, 8); A(c, '#fff', 2, x, y - hop - 8, 8, 0, T); c.globalAlpha = 1;
    E(c, '🎲', 28, 28, 20, s < 2.6 && s % 1 < .3 ? Math.sin(t * 40) * .4 : 0);
  };

  /* 23 Ludo — a miniature board, tokens hopping round the track, a tumbling die */
  const Qd = [[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0]];
  const rt = (x, y, k) => { for (let i = 0; i < k; i++) [x, y] = [14 - y, x]; return [x, y]; }, rtc = (x, y, k) => { for (let i = 0; i < k; i++) [x, y] = [15 - y, x]; return [x, y]; };
  const TRK = [0, 1, 2, 3].flatMap((k) => Qd.map(([x, y]) => rt(x, y, k)));
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  S[23] = (c, t) => {
    const cs = 8, bx = 60, by = 4, col = ['#ef4444', '#22c55e', '#eab308', '#3b82f6'];
    [[0, 0], [9, 0], [9, 9], [0, 9]].forEach(([x, y], i) => { R(c, col[i], bx + x * cs, by + y * cs, 6 * cs, 6 * cs); R(c, 'rgba(255,255,255,.85)', bx + (x + 1) * cs, by + (y + 1) * cs, 4 * cs, 4 * cs); });
    for (let x = 0; x < 15; x++) for (let y = 0; y < 15; y++) if (((x >= 6 && x <= 8) || (y >= 6 && y <= 8)) && !(x >= 6 && x <= 8 && y >= 6 && y <= 8)) R(c, '#e8ebf6', bx + x * cs + .5, by + y * cs + .5, cs - 1, cs - 1);
    for (let k = 0; k < 4; k++) {
      for (let j = 1; j <= 5; j++) { const [x, y] = rt(j, 7, k); R(c, col[k], bx + x * cs + .5, by + y * cs + .5, cs - 1, cs - 1); }
      const [sx, sy] = TRK[13 * k]; R(c, col[k], bx + sx * cs + .5, by + sy * cs + .5, cs - 1, cs - 1);
      c.fillStyle = col[k]; c.beginPath(); [[6, 6], [6, 9], [7.5, 7.5]].forEach(([x, y], i) => { const [a, b] = rtc(x, y, k); if (i) c.lineTo(bx + a * cs, by + b * cs); else c.moveTo(bx + a * cs, by + b * cs); }); c.fill();
    }
    for (let s = 0; s < 4; s++) {
      const idx = 13 * s + t * 2.4 + s * 3.2, i0 = Math.floor(idx), f = idx % 1, [x0, y0] = TRK[i0 % 52], [x1, y1] = TRK[(i0 + 1) % 52];
      const px = bx + (x0 + (x1 - x0) * f + .5) * cs, py = by + (y0 + (y1 - y0) * f + .5) * cs - Math.sin(f * Math.PI) * 3;
      O(c, 'rgba(0,0,0,.35)', px + 1, py + 3, 3); O(c, col[s], px, py, 3.4); A(c, '#fff', 1.2, px, py, 3.4, 0, T);
    }
    const u = t % 1.8, roll = u < .7, v = roll ? 1 + Math.floor(t * 14) % 6 : 1 + (Math.floor(t / 1.8) * 5) % 6;
    c.save(); c.translate(245, 64); c.rotate(roll ? t * 12 : 0); R(c, '#fff', -14, -14, 28, 28); for (const [a, b] of PIPS[v]) O(c, '#111', a * 7, b * 7, 2.6); c.restore();
  };

  /* 24 Carrom — the striker smashes the cluster, one coin drops in a pocket */
  S[24] = (c, t) => {
    const bx = 94, by = 8, sz = 112, u = t % 4.4, th = .9, dt = u - th;
    c.globalAlpha = u > 3.9 ? 1 - (u - 3.9) / .5 : 1;
    R(c, '#92400e', bx - 6, by - 6, sz + 12, sz + 12); R(c, '#fde68a', bx, by, sz, sz); A(c, '#b45309', 1.5, 150, 64, 18, 0, T); A(c, '#b45309', 1, 150, 64, 36, 0, T);
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) O(c, '#1c1917', bx + x * sz, by + y * sz, 7);
    for (let i = 0; i < 7; i++) {
      const a = (i - 1) * T / 6, r0 = i ? 9 : 0; let x = 150 + Math.cos(a) * r0, y = 64 + Math.sin(a) * r0;
      if (dt > 0) { const d = 36 * (1 - Math.exp(-3.2 * dt)); x += Math.cos(a) * d * (i ? 1 : .3); y += Math.sin(a) * d * (i ? 1 : .3); }
      if (i === 2 && dt > 0) { const e = ease(Math.min(1, dt / 1.3)); x = 150 + Math.cos(a) * 9 + (206 - 150 - Math.cos(a) * 9) * e; y = 64 + Math.sin(a) * 9 + (8 - 64 - Math.sin(a) * 9) * e; if (dt > 1.3) continue; }
      O(c, i === 0 ? '#ef4444' : i % 2 ? '#f5f5f4' : '#1c1917', x, y, 5.5); A(c, 'rgba(0,0,0,.4)', 1, x, y, 5.5, 0, T);
    }
    const sy = u < th ? 114 - 36 * ease(u / th) : 78 - 8 * (1 - Math.exp(-4 * dt)); O(c, '#facc15', 150, sy, 6.5); A(c, '#b45309', 1.5, 150, sy, 6.5, 0, T);
  };

  /* 25 Tycoon Town — a skyline builds itself, coins pop, the top hat arrives */
  S[25] = (c, t, k) => {
    const u = t % 7, HT = [30, 52, 40, 70, 48, 60, 36, 44], pal = [k, '#34d399', '#6ee7b7'];
    R(c, 'rgba(0,0,0,.4)', 0, 106, W, 22);
    for (let i = 0; i < 8; i++) {
      const x = 26 + i * 31, e = ease(Math.min(1, Math.max(0, (u - i * .4) / .9))), h = HT[i] * e; c.globalAlpha = u > 6.4 ? 1 - (u - 6.4) / .6 : 1;
      R(c, pal[i % 3], x, 106 - h, 22, h); R(c, 'rgba(0,0,0,.35)', x - 2, 106 - h - 3, 26, 3);
      for (let wy = 0; wy < h - 12; wy += 10) for (let wx = 0; wx < 2; wx++) R(c, 'rgba(253,230,138,.85)', x + 4 + wx * 9, 106 - h + 6 + wy, 5, 5);
      const pu = u - i * .4 - .9; if (pu > 0 && pu < 1) { c.globalAlpha = 1 - pu; O(c, '#fbbf24', x + 11, 106 - h - 8 - pu * 24, 5); c.fillStyle = '#7c2d12'; c.font = '700 8px monospace'; c.textAlign = 'center'; c.fillText('$', x + 11, 106 - h - 5 - pu * 24); }
      c.globalAlpha = 1;
      if (i === 3 && e >= 1 && u < 6.4) E(c, '🎩', x + 11, 106 - 70 - 12 + Math.sin(t * 3) * 2, 18);
    }
  };

  /* 26 Checkers — a double jump across the board ends in a crown */
  S[26] = (c, t) => {
    const X = 30, Y = 4, s = 30, u = t % 7, cx = (q) => X + (q + .5) * s, cy = (q) => Y + (q + .5) * s;
    c.globalAlpha = u > 6.4 ? 1 - (u - 6.4) / .6 : 1;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) R(c, (r + q) % 2 ? '#3f2a1d' : '#d9b38c', X + q * s, Y + r * s, s, s);
    const disc = (x, y, col) => { O(c, 'rgba(0,0,0,.35)', x + 1, y + 3, 11); O(c, col, x, y, 11); A(c, 'rgba(255,255,255,.35)', 1.5, x, y, 7.5, 0, T); };
    for (const [a, b] of [[0, 0], [2, 0], [6, 1], [7, 3], [5, 2]]) disc(cx(a), cy(b), '#111');
    if (u < 1.1) disc(cx(2), cy(2), '#111'); if (u < 3.1) disc(cx(4), cy(2), '#111');
    let a = [1, 3], b = [1, 3], f = 0;
    if (u >= .6 && u < 2.6) { a = [1, 3]; b = [3, 1]; f = Math.min(1, (u - .6) / 1); } else if (u >= 2.6) { a = [3, 1]; b = [5, 3]; f = Math.min(1, (u - 2.6) / 1); } else { b = a; }
    if (u >= 1.6 && u < 2.6) { a = b = [3, 1]; f = 0; }
    const e = ease(f), x = cx(a[0] + (b[0] - a[0]) * e), y = cy(a[1] + (b[1] - a[1]) * e) - 12 * Math.sin(Math.PI * f);
    disc(x, y, '#ef4444'); if (u > 3.8) gl(c, '♛', x, y - 1, '#fde047', 16);
  };

  /* 27 Connect Four — alternating discs drop, red lines up four on the bottom row */
  S[27] = (c, t) => {
    const cs = 26, X = 59, Y = 12, u = t % 7, mv = [[3, '#ef4444'], [3, '#facc15'], [4, '#ef4444'], [4, '#facc15'], [2, '#ef4444'], [2, '#facc15'], [5, '#ef4444']], cnt = [0, 0, 0, 0, 0, 0, 0];
    c.globalAlpha = u > 6.4 ? 1 - (u - 6.4) / .6 : 1;
    for (let i = 0; i < 7; i++) {
      const st = i * .7, [col, cl] = mv[i], row = cnt[col]++; if (u < st) continue;
      const f = Math.min(1, (u - st) / .5), ty = Y + (3 - row) * cs + cs / 2, y = Y - 14 + (ty - Y + 14) * f * f; O(c, cl, X + col * cs + cs / 2, y, 10);
    }
    c.fillStyle = '#1d4ed8'; c.beginPath(); c.rect(X - 4, Y - 4, 7 * cs + 8, 4 * cs + 8);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 7; q++) { const x = X + q * cs + cs / 2, y = Y + r * cs + cs / 2; c.moveTo(x + 10, y); c.arc(x, y, 10, 0, T); }
    c.fill('evenodd');
    if (u > 4.9 && u < 6.6 && Math.floor(u * 6) % 2) for (let q = 2; q <= 5; q++) A(c, '#fff', 2.5, X + q * cs + cs / 2, Y + 3 * cs + cs / 2, 11, 0, T);
  };

  /* 28 Mancala — stones sown pit by pit around the board */
  S[28] = (c, t) => {
    const sq = [2, 9, 4, 11, 0, 12, 3, 8], n = Math.floor(t / .9) % (sq.length + 2), b = Array(14).fill(4); b[6] = b[13] = 0;
    for (let s = 0; s < n && s < sq.length; s++) { let i = sq[s], h = b[i]; if (!h) continue; b[i] = 0; while (h--) { i = (i + 1) % 14; b[i]++; } }
    R(c, '#7c4a1c', 24, 22, 252, 84); R(c, '#9a6330', 28, 26, 244, 76);
    const pos = (i) => (i === 13 ? [46, 64] : i === 6 ? [254, 64] : i < 6 ? [87 + i * 26, 82] : [87 + (12 - i) * 26, 46]), stone = ['#f87171', '#60a5fa', '#facc15', '#4ade80'];
    for (let i = 0; i < 14; i++) {
      const [x, y] = pos(i), store = i === 6 || i === 13; c.fillStyle = '#5b3a1e'; c.beginPath(); c.ellipse(x, y, store ? 15 : 11, store ? 32 : 11, 0, 0, T); c.fill();
      for (let q = 0; q < Math.min(b[i], store ? 10 : 6); q++) { const a = q * 2.4, r = store ? 3 + q * 2.4 : q ? 5 : 0; O(c, stone[q % 4], x + Math.cos(a) * r * (store ? .6 : 1), y + Math.sin(a) * r * (store ? 1.3 : 1), 2.6); }
      c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 8px monospace'; c.textAlign = 'center'; c.fillText(b[i], x, i > 6 && i < 13 ? y - 15 : y + 18 + (store ? 14 : 0));
    }
    if (n < sq.length && t % .9 < .5) { const [x, y] = pos(sq[n]); A(c, '#fff', 2, x, y, 13 + Math.sin(t * 14), 0, T); }
  };

  /* ---------- scenes 29-41 ---------- */
  {
    const hh = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

    /* 29 Reversi — discs flip across the board */
    S[29] = (c, t) => {
      const cs = 20, x0 = 70, y0 = 14; R(c, '#0b4a30', x0 - 5, y0 - 5, cs * 8 + 10, cs * 5 + 10);
      for (let r = 0; r < 5; r++) for (let q = 0; q < 8; q++) {
        const x = x0 + q * cs, y = y0 + r * cs; R(c, (r + q) % 2 ? '#117a4d' : '#0f6f46', x, y, cs - 1, cs - 1);
        const h = (r * 7 + q * 13) % 5; if (h > 2) continue;
        const ph = (t * 0.55 + h * 0.43 + r * 0.17 + q * 0.05) % 2, f = Math.max(0.1, Math.abs(Math.cos(ph * Math.PI)));
        c.save(); c.translate(x + cs / 2 - 0.5, y + cs / 2 - 0.5); c.scale(f, 1); c.fillStyle = ph > 0.5 && ph < 1.5 ? '#f1f5f9' : '#15171f'; c.beginPath(); c.arc(0, 0, 8, 0, T); c.fill(); c.restore();
      }
    };

    /* 30 Tic-Tac-Toe — marks appear, the top row wins */
    S[30] = (c, t, k) => {
      const cs = 36, x0 = 96, y0 = 10, u = t % 7.5; c.globalAlpha = 0.5;
      L(c, '#fff', 3, x0 + cs, y0 + 4, x0 + cs, y0 + cs * 3 - 4); L(c, '#fff', 3, x0 + cs * 2, y0 + 4, x0 + cs * 2, y0 + cs * 3 - 4); L(c, '#fff', 3, x0 + 4, y0 + cs, x0 + cs * 3 - 4, y0 + cs); L(c, '#fff', 3, x0 + 4, y0 + cs * 2, x0 + cs * 3 - 4, y0 + cs * 2); c.globalAlpha = 1;
      [[0, 0, 'x'], [1, 1, 'o'], [0, 1, 'x'], [2, 2, 'o'], [0, 2, 'x']].forEach(([r, q, m], i) => {
        const p = clampN((u - i * 1.0) / 0.35, 0, 1); if (p <= 0) return; const cx = x0 + q * cs + cs / 2, cy = y0 + r * cs + cs / 2, s = 11 * ease(p);
        if (m === 'x') { L(c, k, 5, cx - s, cy - s, cx + s, cy + s); L(c, k, 5, cx + s, cy - s, cx - s, cy + s); } else A(c, '#f87171', 5, cx, cy, s, 0, T);
      });
      if (u > 5.4) { const p = clampN((u - 5.4) / 0.4, 0, 1); L(c, '#fbbf24', 6, x0 + 8, y0 + cs / 2, x0 + 8 + (cs * 3 - 16) * p, y0 + cs / 2); }
    };

    /* 31 Backgammon — a checker hops to a new point, dice tumble on the bar */
    S[31] = (c, t, k) => {
      R(c, '#10182e', 28, 6, 244, 116); R(c, '#1b2340', 142, 6, 16, 116);
      const px = (i) => 34 + i * 19 + (i >= 6 ? 16 : 0);
      for (let i = 0; i < 12; i++) { const x = px(i), col = i % 2 ? '#6b4a2e' : '#26407a'; poly(c, col, 1, [[x, 10], [x + 19, 10], [x + 9.5, 56]]); poly(c, col, 1, [[x, 118], [x + 19, 118], [x + 9.5, 72]]); }
      const stack = (i, n, col, top) => { for (let j = 0; j < n; j++) O(c, col, px(i) + 9.5, top ? 17 + j * 14 : 111 - j * 14, 7); };
      stack(0, 3, '#06b6d4', false); stack(5, 4, '#f59e0b', true); stack(11, 2, '#06b6d4', false); stack(6, 3, '#f59e0b', false); stack(8, 2, '#f59e0b', true);
      const u = (t % 3.2) / 3.2, e = ease(clampN((u - 0.35) / 0.4, 0, 1)), x1 = px(11) + 9.5, y1 = 111 - 2 * 14, x2 = px(7) + 9.5, y2 = 111 - 14;
      O(c, '#06b6d4', x1 + (x2 - x1) * e, y1 + (y2 - y1) * e - Math.sin(e * Math.PI) * 26, 7);
      E(c, '🎲', 150, 64 + Math.sin(t * 3) * 3, 22, Math.sin(t * 2.2) * 0.5);
    };

    /* 32 Dots & Boxes — lines are drawn and boxes fill in */
    const dbOrder = (() => { const e = []; for (let i = 0; i < 31; i++) e.push([i, hh(i, 3)]); return e.sort((a, b) => a[1] - b[1]).map((x) => x[0]); })();
    S[32] = (c, t, k) => {
      const x0 = 70, y0 = 20, dx = 40, dy = 30, n = Math.min(31, Math.floor(t / 0.32) % 44), on = new Set(dbOrder.slice(0, n));
      for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) if (on.has(r * 4 + q) && on.has((r + 1) * 4 + q) && on.has(16 + r * 5 + q) && on.has(16 + r * 5 + q + 1)) { c.globalAlpha = 0.55; R(c, (r + q) % 2 ? '#f59e0b' : k, x0 + q * dx + 4, y0 + r * dy + 4, dx - 8, dy - 8); c.globalAlpha = 1; }
      for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { const o = on.has(r * 4 + q); L(c, o ? k : 'rgba(255,255,255,.14)', o ? 5 : 3, x0 + q * dx, y0 + r * dy, x0 + (q + 1) * dx, y0 + r * dy); }
      for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) { const o = on.has(16 + r * 5 + q); L(c, o ? k : 'rgba(255,255,255,.14)', o ? 5 : 3, x0 + q * dx, y0 + r * dy, x0 + q * dx, y0 + (r + 1) * dy); }
      for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) O(c, '#e6e9f5', x0 + q * dx, y0 + r * dy, 4);
    };

    /* 33 Go — stones go down and a white stone is captured */
    S[33] = (c, t) => {
      R(c, '#c8913f', 98, 14, 104, 100); const g = 16, ox = 110, oy = 26;
      for (let i = 0; i < 6; i++) { L(c, '#3b2a14', 1.4, ox, oy + i * g, ox + 5 * g, oy + i * g); L(c, '#3b2a14', 1.4, ox + i * g, oy, ox + i * g, oy + 5 * g); }
      const seq = [[1, 3, 0], [2, 3, 1], [3, 3, 0], [4, 0, 1], [2, 2, 0], [0, 4, 1], [2, 4, 0]], n = Math.floor(t / 0.7) % (seq.length + 4);
      seq.forEach(([q, r, w], i) => {
        if (i >= n) return; if (i === 1 && n >= seq.length) return; const p = ease(clampN((t / 0.7 - i) % 20, 0, 1)) || 1, x = ox + q * g, y = oy + r * g;
        O(c, 'rgba(0,0,0,.3)', x + 1.5, y + 2.5, 7); O(c, w ? '#f1f5f9' : '#15171f', x, y, 7);
      });
      if (n === seq.length) A(c, '#fbbf24', 2.5, ox + 2 * g, oy + 3 * g, 6 + (t * 10) % 12, 0, T);
    };

    /* 34 Solitaire — a fan of cards */
    S[34] = (c, t) => {
      const suit = ['♠', '♥', '♦', '♣'], rk = ['A', '7', 'K', 'Q', '5'];
      for (let i = 0; i < 5; i++) {
        c.save(); c.translate(150 + (i - 2) * 22, 122); c.rotate((i - 2) * 0.21 + Math.sin(t * 1.4 + i) * 0.025);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-20, -70, 46, 66); c.fillStyle = '#f8fafc'; c.fillRect(-22, -74, 44, 66); c.strokeStyle = '#cbd5e1'; c.lineWidth = 1; c.strokeRect(-22, -74, 44, 66);
        const red = i % 2 === 1; c.fillStyle = red ? '#dc2626' : '#111827'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 13px "Segoe UI",sans-serif'; c.fillText(rk[i], -14, -63); c.font = '30px "Segoe UI Symbol",serif'; c.fillText(suit[i % 4], 0, -38);
        c.restore();
      }
    };

    /* 35 Memory Match — flip, miss, flip, match */
    S[35] = (c, t, k) => {
      const em = ['🍎', '🌙', '⭐', '🍎', '🐱', '⭐', '🌙', '🐱', '🍒', '🍒', '🎈', '🎈'], u = t % 8.5;
      const ev = [[[0, 1], 0.5, 2.0], [[0, 3], 2.6, 99], [[8, 9], 3.8, 99], [[5, 2], 5.0, 99], [[4, 7], 6.2, 7.6]];
      for (let i = 0; i < 12; i++) {
        const col = i % 6, row = Math.floor(i / 6), x = 36 + col * 41 + 18, y = 28 + row * 54 + 22; let p = 0;
        for (const [cards, a, b] of ev) if (cards.includes(i)) { let q = 0; if (u >= a && u < b) q = clampN((u - a) / 0.3, 0, 1); else if (u >= b && u < b + 0.3) q = 1 - (u - b) / 0.3; p = Math.max(p, q); }
        const w = Math.max(0.06, Math.abs(1 - 2 * p)) * 17;
        c.fillStyle = p > 0.5 ? '#f8fafc' : k; c.beginPath(); c.rect(x - w, y - 22, w * 2, 44); c.fill();
        if (p > 0.5 && w > 8) E(c, em[i], x, y, 20 * (w / 17)); else if (p <= 0.5) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - w + 4, y - 18, Math.max(0, w * 2 - 8), 36); }
      }
    };

    /* 36 Maths Dash — a sum, a typed answer, a combo bar */
    S[36] = (c, t, k) => {
      const Q = [['7 × 8', '56'], ['6 + 9', '15'], ['12 − 5', '7'], ['9 × 4', '36']], per = 2.6, i = Math.floor(t / per) % 4, u = t % per, qa = Q[i], a = qa[1];
      A(c, 'rgba(255,255,255,.12)', 6, 40, 40, 20, 0, T); A(c, k, 6, 40, 40, 20, -Math.PI / 2, -Math.PI / 2 + T * (1 - u / per));
      c.textBaseline = 'alphabetic'; c.textAlign = 'right'; c.fillStyle = '#e6e9f5'; c.font = '800 36px ui-monospace,Consolas,monospace'; c.fillText(qa[0] + ' =', 190, 72);
      const typed = a.slice(0, clampN(Math.floor((u - 0.7) / 0.35) + 1, 0, a.length)); c.textAlign = 'left'; c.fillStyle = k; c.fillText(typed + (Math.floor(t * 3) % 2 && u < 1.9 ? '_' : ''), 200, 72);
      if (u > 1.9) { c.fillStyle = '#4ade80'; c.font = '800 30px sans-serif'; c.textAlign = 'center'; c.fillText('✓', 262, 70 - (u - 1.9) * 10); }
      R(c, 'rgba(255,255,255,.1)', 50, 104, 200, 9); R(c, k, 50, 104, 200 * clampN((i + u / per) / 4, 0, 1), 9);
      c.fillStyle = '#8b93b3'; c.font = '700 11px ui-monospace,Consolas,monospace'; c.textAlign = 'left'; c.fillText('COMBO x' + (i + 1), 50, 98);
    };

    /* 37 8-Ball Pool — the break */
    const BC = ['#facc15', '#2563eb', '#dc2626', '#7e22ce', '#ea580c', '#16a34a', '#7f1d1d', '#111827'];
    S[37] = (c, t) => {
      R(c, '#5b3a1e', 14, 10, 272, 108); R(c, '#117a4d', 24, 20, 252, 88); [[24, 20], [150, 20], [276, 20], [24, 108], [150, 108], [276, 108]].forEach(([x, y]) => O(c, '#05070b', x, y, 7));
      const u = t % 5, hit = u > 1.2, sp = hit ? ease(clampN((u - 1.2) / 1.5, 0, 1)) : 0; let n = 0;
      for (let c0 = 0; c0 < 5; c0++) for (let r0 = 0; r0 <= c0; r0++, n++) {
        const bx = 196 + c0 * 9, by = 64 + (r0 - c0 / 2) * 10, ang = hh(n, 1) * T, d = (10 + hh(n, 5) * 60) * sp;
        const x = clampN(bx + Math.cos(ang) * d * (c0 > 1 ? 1 : 0.4), 32, 268), y = clampN(by + Math.sin(ang) * d * 0.8, 28, 100);
        O(c, BC[n % 8], x, y, 5); if (n === 4) O(c, '#111827', x, y, 5);
      }
      const cx = hit ? 186 - (u - 1.2) * 14 : 40 + ease(u / 1.2) * 146;
      if (!hit) L(c, '#e8c9a0', 3, cx - 12 - (1 - u / 1.2) * 14, 64, cx - 78 - (1 - u / 1.2) * 14, 64); O(c, '#f8fafc', Math.max(32, cx), 64, 5.5);
    };

    /* 38 Bowling — a strike down a perspective lane */
    S[38] = (c, t, k) => {
      poly(c, '#3b2a16', 1, [[96, 0], [104, 0], [32, 128], [10, 128]]); poly(c, '#3b2a16', 1, [[196, 0], [204, 0], [290, 128], [268, 128]]); poly(c, '#c8924f', 1, [[104, 0], [196, 0], [268, 128], [32, 128]]);
      c.globalAlpha = 0.25; for (let i = 1; i < 8; i++) L(c, '#5a3714', 1, 104 + i * 11.5, 0, 32 + i * 29.5, 128); c.globalAlpha = 1;
      const u = t % 4.2, p = clampN(u / 1.5, 0, 1), sp = u > 1.5 ? ease(clampN((u - 1.5) / 1.4, 0, 1)) : 0; let n = 0;
      for (let r0 = 0; r0 < 4; r0++) for (let i = 0; i <= r0; i++, n++) {
        const x = 150 + (i - r0 / 2) * 13, y = 50 - r0 * 9, a = hh(n, 7) * T; c.globalAlpha = 1 - clampN(sp * 1.2 - 0.3, 0, 0.85);
        O(c, '#f8fafc', x + Math.cos(a) * 36 * sp, y + Math.sin(a) * 20 * sp - sp * 12, 4.6 - sp * 1.2); O(c, '#dc2626', x + Math.cos(a) * 36 * sp, y + Math.sin(a) * 20 * sp - sp * 12, 1.8); c.globalAlpha = 1;
      }
      if (u < 2.6) { const bx = 150 + Math.sin(p * 2) * 6, by = 122 - 76 * ease(p), r = 12 - 6 * p; O(c, 'rgba(0,0,0,.3)', bx + 2, by + 3, r); O(c, k, bx, by, r); O(c, '#04121a', bx - r * 0.25, by - r * 0.3, r * 0.14); }
      if (u > 1.7 && u < 3.4) A(c, '#fbbf24', 3, 150, 40, 8 + (u - 1.7) * 26, 0, T);
    };

    /* 39 Basketball — a shot arcs into the hoop */
    S[39] = (c, t, k) => {
      R(c, '#c8924f', 0, 106, 300, 22); R(c, '#334155', 276, 30, 5, 76); R(c, '#f8fafc', 266, 14, 8, 50); c.strokeStyle = '#ef4444'; c.lineWidth = 2; c.strokeRect(267, 36, 6, 18);
      const u = t % 2.8, p = clampN(u / 1.5, 0, 1), sw = u > 1.5 ? Math.sin((u - 1.5) * 18) * 3 * Math.max(0, 1 - (u - 1.5)) : 0;
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(226 + i * 8, 54); c.lineTo(231 + i * 6.5 + sw, 82); c.stroke(); } L(c, 'rgba(255,255,255,.7)', 1.2, 229 + sw * 0.5, 66, 255 + sw * 0.5, 66);
      L(c, '#f97316', 4, 222, 54, 262, 54);
      let bx, by; if (u < 1.5) { bx = 44 + 198 * p; by = 96 - 46 * p - Math.sin(p * Math.PI) * 62; } else { bx = 242; by = Math.min(98, 54 + (u - 1.5) * (u - 1.5) * 90 + (u - 1.5) * 20); }
      A(c, 'rgba(255,255,255,.22)', 2, 44, 96, 0, 0, 0); for (let q = 0.05; q < Math.min(p, 1); q += 0.09) { const x = 44 + 198 * q, y = 96 - 46 * q - Math.sin(q * Math.PI) * 62; O(c, 'rgba(255,255,255,.35)', x, y, 1.6); }
      O(c, 'rgba(0,0,0,.25)', bx, 111, 8 * clampN(1 - (106 - by) / 220, 0.3, 1)); O(c, '#ea580c', bx, by, 9); A(c, '#431407', 1.2, bx, by, 9, 0, T); L(c, '#431407', 1.2, bx - 9, by, bx + 9, by);
      if (u > 1.5 && u < 2.1) E(c, '✨', 244, 40, 14 + (u - 1.5) * 12);
    };

    /* 40 Mini Golf — a putt past the windmill */
    S[40] = (c, t, k) => {
      R(c, '#8b5a2b', 20, 14, 260, 100); R(c, '#1fa05f', 24, 18, 252, 92); O(c, '#05070b', 250, 64, 8);
      const mx = 150, my = 64, a = t * 1.8; for (let q = 0; q < 2; q++) { const aa = a + q * Math.PI / 2; L(c, '#fbbf24', 4, mx - Math.cos(aa) * 28, my - Math.sin(aa) * 28, mx + Math.cos(aa) * 28, my + Math.sin(aa) * 28); } O(c, '#7c2d12', mx, my, 5);
      const u = t % 4, p = clampN(u / 2.6, 0, 1), e = ease(p); const bx = 50 + 200 * e, by = 64 + 42 * Math.sin(p * Math.PI) * -0.0 + (p < 0.5 ? 30 - 60 * p : 0); const y2 = 94 - 30 * e;
      c.setLineDash([4, 5]); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(50, 94); c.lineTo(250, 64); c.stroke(); c.setLineDash([]);
      const r = u > 2.6 ? Math.max(0, 5 - (u - 2.6) * 10) : 5; O(c, 'rgba(0,0,0,.3)', bx + 1.5, y2 + 2.5, r); O(c, '#f8fafc', bx, y2, r);
      L(c, '#e5e7eb', 2, 250, 64, 250, 28); poly(c, '#ef4444', 1, [[250, 28], [266, 34 + Math.sin(t * 5)], [250, 40]]);
    };

    /* 41 Soccer Pool — flick, strike, goal */
    S[41] = (c, t, k) => {
      for (let i = 0; i < 8; i++) R(c, i % 2 ? '#1a8c52' : '#1fa05f', 30 + i * 30, 14, 30, 100); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.strokeRect(30, 14, 240, 100); L(c, 'rgba(255,255,255,.7)', 2, 150, 14, 150, 114); A(c, 'rgba(255,255,255,.7)', 2, 150, 64, 20, 0, T);
      R(c, 'rgba(255,255,255,.18)', 270, 44, 18, 40); R(c, 'rgba(255,255,255,.18)', 12, 44, 18, 40); c.strokeStyle = '#f8fafc'; c.lineWidth = 3; c.strokeRect(270, 44, 18, 40); c.strokeRect(12, 44, 18, 40);
      const u = t % 4.4, d = ease(clampN(u / 0.9, 0, 1)), bp = u > 0.9 ? ease(clampN((u - 0.9) / 1.3, 0, 1)) : 0, dx = 80 + 62 * d, bx = 170 + 96 * bp;
      for (const [x, y] of [[60, 64], [110, 34], [110, 94]]) { O(c, 'rgba(0,0,0,.3)', x + 2, y + 4, 12); O(c, k, x, y, 12); A(c, 'rgba(255,255,255,.6)', 2, x, y, 8, 0, T); }
      for (const [x, y] of [[240, 64], [200, 34], [200, 94]]) { O(c, 'rgba(0,0,0,.3)', x + 2, y + 4, 12); O(c, '#f59e0b', x, y, 12); A(c, 'rgba(255,255,255,.6)', 2, x, y, 8, 0, T); }
      if (u < 0.9) { c.setLineDash([5, 5]); L(c, 'rgba(255,255,255,.7)', 2, dx, 64, 200, 64); c.setLineDash([]); }
      O(c, 'rgba(0,0,0,.3)', dx + 2, 68, 12); O(c, '#38bdf8', dx, 64, 12); A(c, 'rgba(255,255,255,.7)', 2, dx, 64, 8, 0, T);
      O(c, '#f8fafc', bx, 64, 6); O(c, '#111827', bx, 64, 2.4);
      if (u > 2.1 && u < 3.4) { c.globalAlpha = 1 - (u - 2.1) / 1.3; A(c, '#fbbf24', 3, 279, 64, 8 + (u - 2.1) * 26, 0, T); c.globalAlpha = 1; E(c, '🥅', 279, 64, 14); }
    };
  }

  /* ---------- 42-47: puzzle scenes ---------- */
  {
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const tx = (c, s, x, y, z, col) => { c.font = '800 ' + z + 'px "Segoe UI",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y); };
    const hs = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

    /* 42 Merge 2048 — two twins slide together and merge */
    const TC = { 2: '#fde68a', 4: '#fcd34d', 8: '#fb923c', 16: '#f87171' };
    const tile = (c, v, x, y, s) => { const w = 28 * s; c.fillStyle = TC[v] || '#a78bfa'; c.fillRect(x + 14 - w / 2, y + 14 - w / 2, w, w); tx(c, v, x + 14, y + 15, 13 * s, '#1b1320'); };
    S[42] = (c, t, k) => {
      const X = 88, Y = 2, g = (i) => X + i * 32, h = (j) => Y + j * 32, u = t % 4.2;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) R(c, 'rgba(255,255,255,.07)', g(i), h(j), 28, 28);
      tile(c, 8, g(0), h(3), 1); tile(c, 16, g(2), h(3), 1); tile(c, 4, g(3), h(2), 1); tile(c, 2, g(0), h(0), 1);
      if (u < 0.9) { const e = ease(u / 0.9); tile(c, 2, g(e), h(1), 1); tile(c, 2, g(3 - 2 * e), h(1), 1); }
      else tile(c, 4, g(1), h(1), 1 + 0.22 * Math.sin(cl((u - 0.9) / 0.35, 0, 1) * Math.PI));
      if (u > 2.2) tile(c, 2, g(2), h(0), ease(cl((u - 2.2) / 0.3, 0, 1)));
      tx(c, '2048', 44, 58, 26, k); tx(c, 'merge!', 44, 82, 11, 'rgba(255,255,255,.6)');
    };

    /* 43 Sudoku — the empty cells fill in one by one */
    S[43] = (c, t, k) => {
      const X = 96, Y = 10, z = 12, p = (t % 9) / 0.45, filled = Math.floor(p);
      R(c, 'rgba(255,255,255,.06)', X, Y, 108, 108);
      let n = 0;
      for (let r = 0; r < 9; r++) for (let q = 0; q < 9; q++) {
        const d = ((r * 3 + Math.floor(r / 3) + q) % 9) + 1, cx = X + q * z + z / 2, cy = Y + r * z + z / 2 + 1;
        if (hs(r, q) < 0.38) tx(c, d, cx, cy, 9, '#e6e9f5');
        else { if (n < filled) { const age = p - n; tx(c, d, cx, cy, 9 + (age < 1 ? 5 * (1 - age) : 0), k); } n++; }
      }
      for (let i = 0; i <= 9; i++) { c.strokeStyle = i % 3 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.55)'; c.lineWidth = i % 3 ? 0.8 : 1.6; c.beginPath(); c.moveTo(X + i * z, Y); c.lineTo(X + i * z, Y + 108); c.moveTo(X, Y + i * z); c.lineTo(X + 108, Y + i * z); c.stroke(); }
    };

    /* 44 Minefield — one click opens a ripple of numbers, flags mark the rest */
    S[44] = (c, t, k) => {
      const X = 73, Y = 9, z = 22, u = t % 6.5, NUM = ['', '#38bdf8', '#4ade80', '#f87171', '#a78bfa'], reach = Math.min(u * 1.6, 3.2);
      for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) {
        const d = Math.hypot(q - 3, r - 2), rev = d < reach;
        R(c, rev ? '#cbd5e1' : '#475569', X + q * z + 1, Y + r * z + 1, z - 2, z - 2);
        if (!rev) R(c, 'rgba(255,255,255,.2)', X + q * z + 1, Y + r * z + 1, z - 2, 3);
        else { const m = Math.floor(hs(q, r) * 4.5); if (m > 0 && d > 0.5) tx(c, m, X + q * z + 11, Y + r * z + 12, 12, NUM[m]); }
      }
      if (u > 3.4) for (const [q, r] of [[6, 0], [0, 4], [6, 4], [0, 0]]) E(c, '🚩', X + q * z + 11, Y + r * z + 12, 13);
      if (u < 0.7) { c.globalAlpha = 1 - u / 0.7; A(c, k, 2, X + 3 * z + 11, Y + 2 * z + 11, 6 + u * 24, 0, T); c.globalAlpha = 1; }
    };

    /* 45 Slide Tiles — the gap wanders round the board, then slides back */
    S[45] = (c, t, k) => {
      const G = [8, 7, 4, 5, 2, 1, 0, 3, 6], X = 95, Y = 9, z = 34, p = (t / 0.55) % 16, s = Math.floor(p), f = ease(p - s);
      const kk = s < 8 ? s : 16 - s, tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      for (let j = 0; j < kk; j++) { tiles[G[j]] = tiles[G[j + 1]]; tiles[G[j + 1]] = 0; }
      const j = s < 8 ? s : 15 - s, from = s < 8 ? G[j + 1] : G[j], to = s < 8 ? G[j] : G[j + 1];
      const pos = (i) => [X + (i % 3) * (z + 4), Y + Math.floor(i / 3) * (z + 4)];
      const draw = (v, x, y) => { R(c, 'hsl(' + (190 + v * 18) + ',70%,58%)', x, y, z, z); R(c, 'rgba(255,255,255,.25)', x, y, z, 4); tx(c, v, x + z / 2, y + z / 2 + 1, 18, '#0b1020'); };
      for (let i = 0; i < 9; i++) R(c, 'rgba(255,255,255,.06)', ...pos(i), z, z);
      for (let i = 0; i < 9; i++) if (tiles[i] && i !== from) draw(tiles[i], ...pos(i));
      const [fx, fy] = pos(from), [ex, ey] = pos(to); draw(tiles[from], fx + (ex - fx) * f, fy + (ey - fy) * f);
    };

    /* 46 Nuts & Bolts — three red bolts fill the tray and pop, the plank falls */
    S[46] = (c, t, k) => {
      const u = t % 6.4, RD = '#ef4444', BL = '#3b82f6', GR = '#22c55e';
      const bolts = [[80, 30, RD, 0.5, 0], [220, 34, RD, 1.5, 1], [100, 64, BL], [150, 62, GR], [205, 70, RD, 2.5, 2]];
      const plank = (x, y, w, a, al) => { c.save(); c.globalAlpha = al; c.translate(x, y); c.rotate(a); R(c, '#b9824a', -w / 2, -9, w, 18); R(c, '#d6a56b', -w / 2, -9, w, 4); c.restore(); };
      const fall = Math.max(0, u - 2.4);
      plank(150, 32 + fall * fall * 40, 190, -0.08, Math.max(0, 1 - fall * 0.7)); plank(150, 66, 170, 0.1, 1);
      R(c, 'rgba(255,255,255,.1)', 70, 100, 160, 22);
      for (let i = 0; i < 3; i++) O(c, 'rgba(0,0,0,.3)', 100 + i * 50, 111, 9);
      for (const [x, y, col, ts, slot] of bolts) {
        let bx = x, by = y, a = 0, sc = 1, al = 1;
        if (ts !== undefined) {
          const p = cl((u - ts) / 0.8, 0, 1), e = ease(p); bx = x + (100 + slot * 50 - x) * e; by = y + (111 - y) * e - Math.sin(p * Math.PI) * 16; a = p * 12;
          if (u > 3.6) { const q = cl((u - 3.6) / 0.6, 0, 1); sc = 1 + q * 0.8; al = 1 - q; }
        } else if (u > 4.2) al = Math.max(0, 1 - (u - 4.2) * 0.7);
        c.globalAlpha = al; O(c, 'rgba(0,0,0,.35)', bx + 1, by + 2, 8 * sc); O(c, col, bx, by, 7 * sc); O(c, 'rgba(255,255,255,.4)', bx - 2, by - 2, 2.5 * sc);
        L(c, 'rgba(0,0,0,.45)', 1.5, bx - 4 * Math.cos(a), by - 4 * Math.sin(a), bx + 4 * Math.cos(a), by + 4 * Math.sin(a)); c.globalAlpha = 1;
      }
      if (u > 3.6 && u < 4.4) E(c, '✨', 150, 108, 20);
    };

    /* 47 Bubble Sort — bubbles pour between tubes */
    S[47] = (c, t, k) => {
      const COL = { p: '#f472b6', c: '#22d3ee', y: '#facc15', g: '#4ade80' }, pours = [[0, 1], [0, 2], [1, 3]], D = 1.25;
      const u = t % (D * 4 + 0.4), n = Math.min(3, Math.floor(u / D)), f = ease(cl((u - n * D) / (D * 0.8), 0, 1));
      const tubes = [['p', 'c', 'g'], ['y', 'g'], ['c', 'c'], ['g']], cx = (i) => 60 + i * 60, sy = (i) => 106 - i * 23;
      for (let j = 0; j < Math.min(n, 3); j++) tubes[pours[j][1]].push(tubes[pours[j][0]].pop());
      let mv = null;
      if (n < 3) { const [a, b] = pours[n]; mv = { col: tubes[a].pop(), x0: cx(a), y0: sy(tubes[a].length), x1: cx(b), y1: sy(tubes[b].length) }; }
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2.5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx(i) - 18, 14); c.lineTo(cx(i) - 18, 108); c.arc(cx(i), 108, 18, Math.PI, 0, true); c.lineTo(cx(i) + 18, 14); c.stroke();
        tubes[i].forEach((b, j) => { O(c, COL[b], cx(i), sy(j), 10); O(c, 'rgba(255,255,255,.35)', cx(i) - 3, sy(j) - 3, 3); });
      }
      if (mv) { const x = mv.x0 + (mv.x1 - mv.x0) * f, y = mv.y0 + (mv.y1 - mv.y0) * f - Math.sin(f * Math.PI) * 30 - (f < 1 ? 14 * Math.sin(f * Math.PI) : 0); O(c, COL[mv.col], x, y, 10); O(c, 'rgba(255,255,255,.35)', x - 3, y - 3, 3); }
    };

    /* 48 Orchard Drop — two fruits meet and merge into a bigger one */
    S[48] = (c, t, k) => {
      const u = t % 4.2, basket = () => { R(c, '#7c4a21', 70, 20, 6, 100); R(c, '#7c4a21', 224, 20, 6, 100); R(c, '#7c4a21', 70, 114, 160, 8); };
      basket();
      const rest = (x, y, col, r, em) => { O(c, 'rgba(0,0,0,.3)', x + 1, y + 3, r); O(c, col, x, y, r); O(c, 'rgba(255,255,255,.25)', x - r * .3, y - r * .3, r * .45); E(c, em, x, y + 1, r * 1.2); };
      if (u < 1.4) rest(110, 98, '#a855f7', 16, '🍇'); rest(190, 100, '#fb923c', 14, '🍊');
      if (u < 1.4) { const y = -10 + ease(u / 1.4) * 0; const fy = 20 + (u / 1.4) * (u / 1.4) * 60; rest(110, Math.min(fy, 64), '#a855f7', 16, '🍇'); }
      else if (u < 2.9) { const q = (u - 1.4) / 1.5, s = 1 + Math.sin(Math.min(1, q * 4) * Math.PI) * 0.15; rest(110, 82, '#4ade80', 22 * s, '🍏'); if (q < 0.3) for (let i = 0; i < 6; i++) { const a = i * 1.05, d = q * 90; O(c, '#c084fc', 110 + Math.cos(a) * d, 82 + Math.sin(a) * d, 2.5); } }
      else { const q = (u - 2.9) / 1.3; c.globalAlpha = Math.max(0, 1 - q); rest(110, 82, '#4ade80', 22, '🍏'); }
      c.globalAlpha = 1; E(c, '🍉', 262, 26, 20);
    };

    /* 49 Table Tennis — a perspective rally: red bat at the far end, dark bat at the near end */
    S[49] = (c, t, k) => {
      /* P(u, v, h): u = across the table (-1..1), v = depth (0 near .. 1 far), h = height above the table -> [x, y, scale] */
      const P = (u, v, h) => { const s = 1 / (1 + v * 1.1), q = (1 - s) / (1 - 1 / 2.1); return [150 + u * 112 * s, 112 - q * 66 - (h || 0) * s * 60, s]; };
      const ln = (col, w, a, b) => L(c, col, w, a[0], a[1], b[0], b[1]);
      R(c, 'rgba(8,16,64,.55)', 0, 0, W, H);
      poly(c, '#bfdbfe', .12, [[36, 0], [74, 0], [128, 76], [8, 76]]); poly(c, '#bfdbfe', .12, [[226, 0], [264, 0], [292, 76], [172, 76]]);
      poly(c, '#000', .3, [[44, 116], [256, 116], [236, 125], [64, 125]]);
      poly(c, '#1d4ed8', 1, [P(-1, 0, 0), P(1, 0, 0), P(1, 1, 0), P(-1, 1, 0)]);
      const edge = 'rgba(255,255,255,.85)';
      ln(edge, 1.6, P(-1, 0, 0), P(1, 0, 0)); ln(edge, 1.6, P(1, 0, 0), P(1, 1, 0)); ln(edge, 1.6, P(1, 1, 0), P(-1, 1, 0)); ln(edge, 1.6, P(-1, 1, 0), P(-1, 0, 0));
      ln('rgba(255,255,255,.4)', 1, P(0, 0, 0), P(0, 1, 0));
      const T = 1.6, n = Math.floor(t / T), f = t / T - n, far = n % 2 === 0, fb = .6, q2 = (f - fb) / (1 - fb);
      const vv = far ? .02 + .96 * f : .98 - .96 * f, bu = .55 * Math.sin(t * 1.7), au = .55 * Math.sin(t * 1.7 - .1);
      const bh = f < fb ? .18 * (1 - (f / fb) * (f / fb)) : 1.52 * q2 * (1 - q2) + .15 * q2;
      const bat = (u, v, col, rad) => {
        const [x, y, s] = P(u, v, .2);
        R(c, '#d6b88a', x - 2 * s, y + rad * s * .7, 4 * s, 13 * s); O(c, 'rgba(255,255,255,.5)', x, y, rad * s + 1.2); O(c, col, x, y, rad * s); O(c, 'rgba(255,255,255,.25)', x - rad * s * .3, y - rad * s * .3, rad * s * .35);
      };
      bat(au, 1.1, '#f87171', 15);
      poly(c, '#e5e7eb', .3, [P(-1.04, .5, 0), P(1.04, .5, 0), P(1.04, .5, .2), P(-1.04, .5, .2)]);
      ln('#fff', 2.2, P(-1.04, .5, .2), P(1.04, .5, .2)); ln('rgba(255,255,255,.7)', 1.4, P(-1.04, .5, 0), P(-1.04, .5, .2)); ln('rgba(255,255,255,.7)', 1.4, P(1.04, .5, 0), P(1.04, .5, .2));
      const [x, y, s] = P(bu, vv, bh), sh = P(bu, vv, 0);
      c.globalAlpha = .35; O(c, '#000', sh[0], sh[1] + 1, 4 * s); c.globalAlpha = 1; O(c, '#fff', x, y, 4.5 * s + 1.5);
      bat(au, -.12, '#111827', 15);
    };

    /* 50 Jade Table — a free pair of mahjong tiles lifts, glows and clears */
    S[50] = (c, t, k) => {
      const FC = { a: ['發', '#15803d'], b: ['中', '#b91c1c'], c: ['万', '#1d4ed8'], d: ['東', '#245046'] };
      const faces = [['a', 'b', 'c', 'd', 'b', 'a'], ['d', 'c', 'a', 'b', 'c']], rx = [50, 67], ry = [64, 12];
      const u = t % 5, pr = [[0, 1, 4], [0, 0, 5], [1, 1, 4]][Math.floor(t / 5) % 3];
      const vis = u > 4.3 ? (u - 4.3) / .7 : u < 3.4 ? 1 - Math.max(0, (u - 2.7) / .7) : 0;
      R(c, 'rgba(6,40,36,.6)', 0, 0, W, H);
      const tile = (x, y, ch, col, a, lift, glow) => {
        if (a <= .01) return;
        c.globalAlpha = a; y -= lift;
        R(c, '#a18b66', x, y + 5, 30, 40); R(c, glow ? '#fde68a' : '#f8efd8', x, y, 30, 40);
        c.strokeStyle = '#d1bd94'; c.lineWidth = 1; c.strokeRect(x + 3.5, y + 3.5, 23, 33);
        c.font = 'bold 21px "Segoe UI","Microsoft YaHei","Noto Sans CJK SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(ch, x + 15, y + 21);
        if (glow) { c.strokeStyle = '#f4cb65'; c.lineWidth = 2; c.strokeRect(x - 1, y - 1, 32, 42); }
        c.globalAlpha = 1;
      };
      faces.forEach((row, r) => row.forEach((fk, i) => {
        const x = rx[r] + i * 34, y = ry[r], pair = r === pr[0] && (i === pr[1] || i === pr[2]);
        let a = 1, lift = 0, glow = 0;
        if (pair) { const st = i === pr[1] ? 1 : 1.8; a = vis; if (u > st && u < 3.4) { glow = 1; lift = 6 * ease(Math.min(1, (u - st) / .4)); } }
        tile(x, y, FC[fk][0], FC[fk][1], a, lift, glow);
        if (pair && u > 2.7 && u < 3.4) E(c, '✨', x + 15, y + 12, 18);
      }));
    };

    /* 51 Timber & Balance — a block is pulled out of the tower and stacked on top */
    S[51] = (c, t, k) => {
      const u = t % 6, BH = 8, X0 = 117;
      c.globalAlpha = u < .4 ? u / .4 : u > 5.4 ? (6 - u) / .6 : 1;
      const pl = (col, pts) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.fill(); };
      const bx = (li, i) => X0 + i * 22 + Math.sin(li * 7.3 + i * 3.1) * .8, by = (li) => 116 - (li + 1) * BH;
      const sw = (li) => (li > 4 && u > 1.2 && u < 2.8 ? Math.sin(u * 22) * (1 - (u - 1.2) / 1.6) * (li - 4) * .22 : 0);
      const blk = (x, y, li, glow) => {
        const ev = li % 2 === 0;
        pl(ev ? '#efc98f' : '#dcae72', [[x, y], [x + 9, y - 5], [x + 30, y - 5], [x + 21, y]]);
        pl(ev ? '#8a5a2b' : '#7a4d24', [[x + 21, y], [x + 30, y - 5], [x + 30, y + BH - 5], [x + 21, y + BH]]);
        R(c, ev ? '#d9a35f' : '#bf8442', x, y, 21, BH);
        L(c, 'rgba(90,50,15,.3)', 1, x + 2, y + 3, x + 19, y + 3);
        if (glow) { c.strokeStyle = '#fde68a'; c.lineWidth = 1.5; c.strokeRect(x, y, 21, BH); }
      };
      R(c, 'rgba(15,17,22,.45)', 0, 0, W, H); R(c, '#3a3d42', 70, 116, 160, 6);
      for (let li = 0; li < 10; li++) for (let i = 0; i < 3; i++) if (!(li === 4 && i === 1)) blk(bx(li, i) + sw(li), by(li), li, 0);
      const hx = bx(4, 1), hy = by(4), tx = bx(10, 1), ty = by(10);
      let mx = hx, my = hy, glow = 0;
      if (u > .8 && u < 2.1) { mx = hx + 62 * ease((u - .8) / 1.3); glow = 1; }
      else if (u >= 2.1) { const e = ease(Math.min(1, (u - 2.1) / 1.5)); mx = hx + 62 + (tx - hx - 62) * e; my = hy + (ty - hy) * e - Math.sin(e * Math.PI) * 10; glow = u < 3.7 ? 1 : 0; }
      blk(mx, my, 4, glow);
    };
  }

  /* ---------- engine: draws only visible cards, pauses while a game is open ---------- */
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let items = [], last = 0;
  const io = new IntersectionObserver((es) => es.forEach((e) => { e.target._v = e.isIntersecting; }), { rootMargin: '80px' });
  function draw(cv, now) {
    const c = cv._c; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); c.save();
    try { if (cv._s) cv._s(c, now + cv._o, cv._k); } catch (e) { /* a broken scene must never break the page */ }
    c.restore();
  }
  function mount() {
    io.disconnect();
    items = [...document.querySelectorAll('canvas.cvs')].map((cv) => { cv.width = W * dpr; cv.height = H * dpr; cv._c = cv.getContext('2d'); cv._s = S[cv.dataset.s]; cv._k = cv.dataset.c; cv._o = +cv.dataset.s * 1.7; cv._v = true; io.observe(cv); return cv; });
    if (still) items.forEach((cv) => draw(cv, 2.5));
  }
  (function loop(ts) {
    requestAnimationFrame(loop);
    const d = document.getElementById('dlg') || document.getElementById('playable-theater-modal');
    if (still || document.hidden || (d && (d.open || d.id === 'playable-theater-modal')) || ts - last < 24) return;
    last = ts; for (const cv of items) if (cv._v) draw(cv, ts / 1000);
  })(0);
  window.Scenes = { mount, S };
})();
