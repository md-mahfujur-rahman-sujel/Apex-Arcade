/* arcade-core.js — shared engine for the Apex Arcade game tributes.
   Provides: fixed-timestep loop, DOM shell, keyboard/touch/gamepad input, Web Audio SFX,
   particles, screen shake, hit-stop, pause, saved high scores and drawing helpers.
   Keep this file in the same folder as the game .html files. */
(function () {
  'use strict';
  const A = (window.Arcade = {});
  /* on-screen error report: open any game in a browser and any JS error shows up here */
  window.addEventListener('error', (e) => {
    try {
      let b = document.getElementById('arc-err');
      if (!b) { b = document.createElement('pre'); b.id = 'arc-err'; b.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;max-height:30vh;overflow:auto;margin:0;padding:10px 12px;background:#450a0a;color:#fecaca;border:1px solid #f87171;border-radius:8px;font:12px/1.4 ui-monospace,Consolas,monospace;z-index:99999;white-space:pre-wrap'; document.documentElement.appendChild(b); }
      b.textContent += (e.message || 'Error') + (e.filename ? '\n  at ' + e.filename.split('/').pop() + ':' + e.lineno : '') + '\n';
    } catch (x) {}
  });
  /* split a help string into short lines for the in-game controls panel */
  A.wrap = (s, max) => {
    const out = [];
    String(s).split(/\s*[·•]\s*|\s+-\s+|\s+—\s+|\.\s+/).forEach((part) => {
      part = part.trim(); if (!part) return;
      let line = '';
      part.split(' ').forEach((w) => { if ((line + ' ' + w).trim().length > max) { if (line) out.push(line); line = w; } else line = (line + ' ' + w).trim(); });
      if (line) out.push(line);
    });
    return out;
  };
  const TAU = Math.PI * 2;
  const STEP = 1000 / 60;
  A.TAU = TAU;
  A.FONT = '"Segoe UI",system-ui,-apple-system,Roboto,sans-serif';
  A.MONO = 'ui-monospace,Consolas,Menlo,monospace';

  /* ---------- math helpers ---------- */
  A.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  A.lerp = (a, b, t) => a + (b - a) * t;
  A.rand = (a, b) => a + Math.random() * (b - a);
  A.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  A.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  A.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
  A.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  A.hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
  A.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  A.approach = (v, target, amt) => (v < target ? Math.min(v + amt, target) : Math.max(v - amt, target));

  /* ---------- colour helpers ---------- */
  A.rgb = (c) => {
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.replace(/./g, '$&$&');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const m = c.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [255, 255, 255];
  };
  A.shade = (c, amt) => {
    const [r, g, b] = A.rgb(c);
    const f = (v) => Math.round(A.clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  };
  A.alpha = (c, a) => { const [r, g, b] = A.rgb(c); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
  A.mix = (c1, c2, t) => {
    const a = A.rgb(c1), b = A.rgb(c2);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };

  /* ---------- audio ---------- */
  let actx = null, noiseBuf = null;
  A.muted = false;
  try { A.muted = localStorage.getItem('arcade-muted') === '1'; } catch (e) {}
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return actx;
  }
  function tone(f, d, type, vol, slide, delay) {
    if (A.muted) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, vol, freq, delay, type) {
    if (A.muted) return;
    const a = ac(); if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (delay || 0);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = type || 'lowpass'; f.frequency.value = freq || 1200;
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(a.destination);
    s.start(t); s.stop(t + d + 0.03);
  }
  const SFX = {
    jump: () => tone(300, 0.16, 'square', 0.05, 420),
    jump2: () => tone(420, 0.14, 'square', 0.05, 520),
    land: () => noise(0.06, 0.05, 500),
    coin: () => { tone(988, 0.07, 'square', 0.045); tone(1319, 0.16, 'square', 0.045, 0, 0.07); },
    gem: () => { tone(1200, 0.06, 'triangle', 0.06); tone(1800, 0.12, 'triangle', 0.05, 0, 0.05); },
    hit: () => { noise(0.12, 0.09, 900); tone(140, 0.12, 'square', 0.06, -60); },
    hurt: () => { tone(300, 0.3, 'sawtooth', 0.07, -240); noise(0.15, 0.06, 700); },
    shoot: () => tone(900, 0.1, 'square', 0.04, -600),
    laser: () => tone(1400, 0.14, 'sawtooth', 0.035, -1100),
    explode: () => { noise(0.45, 0.14, 700); tone(110, 0.4, 'sawtooth', 0.07, -80); },
    boom: () => { noise(0.8, 0.18, 400); tone(70, 0.7, 'sawtooth', 0.09, -40); },
    power: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, 'square', 0.05, 0, i * 0.06)),
    blip: () => tone(660, 0.05, 'square', 0.04),
    select: () => tone(880, 0.07, 'square', 0.04),
    tick: () => tone(1200, 0.025, 'square', 0.03),
    dash: () => noise(0.18, 0.07, 3000, 0, 'bandpass'),
    slash: () => { noise(0.1, 0.07, 2500, 0, 'highpass'); tone(500, 0.08, 'sawtooth', 0.03, -300); },
    flap: () => tone(420, 0.09, 'triangle', 0.07, 260),
    bounce: () => tone(260, 0.2, 'sine', 0.09, 700),
    pop: () => tone(520, 0.06, 'sine', 0.08, 300),
    eat: () => { tone(500, 0.05, 'square', 0.04); tone(750, 0.08, 'square', 0.04, 0, 0.05); },
    thud: () => { noise(0.1, 0.08, 300); tone(90, 0.12, 'sine', 0.1, -30); },
    rotate: () => tone(700, 0.04, 'square', 0.03),
    drop: () => { noise(0.08, 0.07, 400); tone(160, 0.08, 'square', 0.05, -80); },
    clear: () => [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0, i * 0.05)),
    parry: () => { tone(1500, 0.1, 'triangle', 0.07); tone(2200, 0.18, 'triangle', 0.05, 0, 0.04); },
    charge: () => tone(200, 0.4, 'sawtooth', 0.04, 600),
    door: () => { tone(120, 0.25, 'sawtooth', 0.05, 80); noise(0.2, 0.05, 600); },
    heal: () => [392, 523, 659].forEach((f, i) => tone(f, 0.14, 'sine', 0.07, 0, i * 0.08)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, 0, i * 0.17)),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.05, 0, i * 0.1)),
    ko: () => { noise(0.6, 0.16, 500); tone(180, 0.6, 'sawtooth', 0.08, -140); },
    step: () => noise(0.03, 0.025, 800),
    wave: () => [200, 180, 160].forEach((f, i) => tone(f, 0.08, 'square', 0.04, 0, i * 0.07)),
  };
  A.sfx = (n) => { const f = SFX[n]; if (f) { try { f(); } catch (e) {} } };
  A.tone = tone;
  A.noise = noise;

  /* ---------- input ---------- */
  const kb = {}, pressed = {}, padHeld = {}, padPrev = {};
  A.held = (...codes) => codes.some((c) => kb[c] || padHeld[c]);
  A.hit = (...codes) => codes.some((c) => pressed[c]);
  A.axisX = () => (A.held('ArrowRight', 'KeyD') ? 1 : 0) - (A.held('ArrowLeft', 'KeyA') ? 1 : 0);
  A.axisY = () => (A.held('ArrowDown', 'KeyS') ? 1 : 0) - (A.held('ArrowUp', 'KeyW') ? 1 : 0);
  const clearPressed = () => { for (const k in pressed) delete pressed[k]; };
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const PAD_BTN = { 0: 'Space', 1: 'KeyX', 2: 'KeyF', 3: 'KeyG', 4: 'ShiftLeft', 5: 'ShiftLeft', 6: 'ShiftLeft', 7: 'ShiftLeft', 9: 'Enter', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
  function pollPad() {
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) {}
    const now = {};
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b.pressed && PAD_BTN[i]) now[PAD_BTN[i]] = true; });
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (ax < -0.45) now.ArrowLeft = true;
      if (ax > 0.45) now.ArrowRight = true;
      if (ay < -0.45) now.ArrowUp = true;
      if (ay > 0.45) now.ArrowDown = true;
    }
    for (const c in padHeld) delete padHeld[c];
    for (const c in now) { padHeld[c] = true; if (!padPrev[c]) pressed[c] = true; }
    for (const c in padPrev) delete padPrev[c];
    for (const c in now) padPrev[c] = true;
  }

  /* ---------- drawing helpers ---------- */
  A.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  A.text = (ctx, str, x, y, size, color, align, weight, font) => {
    ctx.font = (weight || '700') + ' ' + size + 'px ' + (font || A.FONT);
    ctx.fillStyle = color || '#fff';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  };
  A.glowText = (ctx, str, x, y, size, color, align, glow) => {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = glow == null ? 16 : glow;
    A.text(ctx, str, x, y, size, color, align, '800');
    ctx.restore();
  };
  A.vgrad = (ctx, y0, y1, stops) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  };
  A.sky = (ctx, w, h, stops) => { ctx.fillStyle = A.vgrad(ctx, 0, h, stops); ctx.fillRect(0, 0, w, h); };
  let vigCache = {};
  A.vignette = (ctx, w, h, strength) => {
    const k = w + 'x' + h;
    if (!vigCache[k]) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      vigCache[k] = g;
    }
    ctx.save(); ctx.globalAlpha = strength == null ? 0.45 : strength;
    ctx.fillStyle = vigCache[k]; ctx.fillRect(0, 0, w, h); ctx.restore();
  };
  /* 2.5D block: front face + lit top + shaded side, depth in px offset up-right. */
  A.block3d = (ctx, x, y, w, h, depth, color) => {
    const d = depth || 6;
    ctx.fillStyle = A.shade(color, -0.35);
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w + d, y + h - d); ctx.lineTo(x + w, y + h); ctx.fill();
    ctx.fillStyle = A.shade(color, 0.3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + w + d, y - d); ctx.lineTo(x + w, y); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, y, w, 2);
  };
  /* soft ground shadow under a character (gives 2.5D depth) */
  A.shadow = (ctx, x, y, rx, ry, a) => {
    ctx.save(); ctx.globalAlpha = a == null ? 0.3 : a; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry == null ? rx * 0.3 : ry, 0, 0, TAU); ctx.fill(); ctx.restore();
  };
  A.makeStars = (n, w, h) => Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.9 + 0.1, p: Math.random() * TAU }));
  A.drawStars = (ctx, stars, t, w, h, speed, color) => {
    ctx.fillStyle = color || '#fff';
    for (const s of stars) {
      const x = ((s.x - (speed || 0) * s.z * t) % w + w) % w;
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.02 * s.z + s.p));
      ctx.fillRect(x, s.y, s.z * 2, s.z * 2);
    }
    ctx.globalAlpha = 1;
  };
  A.grid3d = (ctx, w, h, horizon, t, color) => {
    /* perspective floor grid, retro-synthwave style */
    ctx.save(); ctx.strokeStyle = color || 'rgba(6,182,212,.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -12; i <= 12; i++) { ctx.moveTo(w / 2 + i * 12, horizon); ctx.lineTo(w / 2 + i * 90, h); }
    for (let i = 0; i < 10; i++) {
      const p = ((i + (t * 0.02) % 1) / 10), y = horizon + (h - horizon) * p * p;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke(); ctx.restore();
  };

  /* ---------- the game shell ---------- */
  A.game = function (cfg) {
    const W = cfg.w || 800, H = cfg.h || 480;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* DOM */
    const style = document.createElement('style');
    style.textContent =
      '*{box-sizing:border-box}html,body{margin:0;min-height:100%}' +
      'body{background:radial-gradient(1200px 700px at 50% -10%,#151b33,#090A10 60%);color:#e6e9f5;font-family:' + A.FONT + ';-webkit-user-select:none;user-select:none;touch-action:manipulation}' +
      '.arc{max-width:' + (W + 40) + 'px;margin:0 auto;padding:14px 16px 28px;text-align:center}' +
      '.arc h1{margin:6px 0 2px;font-size:26px;letter-spacing:-.02em;font-weight:800}' +
      '.arc .sub{margin:0 0 12px;color:#8b93b3;font-size:14px}' +
      '.wrap{position:relative;display:flex;justify-content:center;background:#000;border-radius:12px;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 12px 50px rgba(6,182,212,.14)}' +
      'canvas{display:block;width:100%;height:auto;max-width:' + W + 'px;aspect-ratio:' + W + '/' + H + ';border-radius:12px;background:#000;touch-action:none}' +
      '.wrap:fullscreen{align-items:center;background:#000;border-radius:0}.wrap:fullscreen canvas{height:100vh;width:auto;max-width:100vw;border-radius:0}' +
      '.bar{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 4px}' +
      '.bar button{background:#151926;color:#e6e9f5;border:1px solid rgba(255,255,255,.12);padding:8px 16px;border-radius:9px;font:600 13px ' + A.FONT + ';cursor:pointer}' +
      '.bar button:hover{border-color:#06B6D4;color:#67e8f9}' +
      '.help{color:#c8cde4;font-size:14px;margin:10px 0 0;padding:10px 14px;line-height:1.55;background:#151926;border:1px solid rgba(255,255,255,.1);border-radius:10px}' +
      '.touch{position:absolute;left:0;right:0;bottom:8px;display:none;justify-content:space-between;padding:0 10px;pointer-events:none}' +
      '.touch .g{display:flex;gap:10px;pointer-events:auto}' +
      '.touch button{width:62px;height:62px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(20,26,45,.55);color:#fff;font:700 18px ' + A.FONT + ';touch-action:none;backdrop-filter:blur(4px)}' +
      '.touch button:active,.touch button.on{background:rgba(6,182,212,.55)}' +
      '@media (pointer:coarse){.touch{display:flex}}';
    document.head.appendChild(style);
    document.title = cfg.title;
    document.body.innerHTML =
      '<main class="arc"><h1></h1><p class="sub"></p><div class="wrap"><canvas></canvas><div class="touch"><div class="g L"></div><div class="g R"></div></div></div>' +
      '<div class="bar"><button data-a="restart">Restart</button><button data-a="pause">Pause</button><button data-a="mute"></button><button data-a="full">Fullscreen</button></div>' +
      '<p class="help"></p></main>';
    document.querySelector('h1').textContent = cfg.title;
    document.querySelector('.sub').textContent = cfg.subtitle || '';
    document.querySelector('.help').textContent = cfg.controls ? 'Controls — ' + cfg.controls.map((r) => r.join(': ')).join('  ·  ') + '  ·  P pause  ·  M mute' : (cfg.help ? 'Controls — ' + cfg.help : 'P pause  ·  M mute');
    const canvas = document.querySelector('canvas'), wrap = document.querySelector('.wrap');
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    const muteBtn = document.querySelector('[data-a=mute]');
    const syncMute = () => { muteBtn.textContent = A.muted ? 'Sound: off' : 'Sound: on'; };
    syncMute();
    const mkTouch = (sel, list) => {
      const host = document.querySelector(sel);
      (list || []).forEach(([label, code]) => {
        const b = document.createElement('button'); b.textContent = label;
        const down = (e) => { e.preventDefault(); kb[code] = true; pressed[code] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (x) {} onAnyInput(code); };
        const up = (e) => { e.preventDefault(); kb[code] = false; b.classList.remove('on'); };
        b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
        b.addEventListener('contextmenu', (e) => e.preventDefault());
        host.appendChild(b);
      });
    };
    mkTouch('.touch .L', cfg.touchL);
    mkTouch('.touch .R', cfg.touchR);

    /* state */
    let hi = 0;
    const hiKey = 'arcade-hi-' + (cfg.id || cfg.title);
    try { hi = +localStorage.getItem(hiKey) || 0; } catch (e) {}
    const G = {
      cfg, w: W, h: H, ctx, canvas, state: 'ready', score: 0, hi, t: 0, clock: 0, stateT: 0,
      particles: [], popups: [], shakeAmt: 0, freezeN: 0, fxDrawn: false,
      title: '', sub: '', hudL: undefined, hudR: undefined,
    };
    A.G = G;
    const saveHi = () => { try { localStorage.setItem(hiKey, String(G.hi)); } catch (e) {} };

    /* difficulty scaling (easy = 0.8x, normal = 1.0x, hard = 1.35x + 1.25x score) */
    A.difficulty = 'normal';
    A.speedMult = 1.0;
    function applyDifficulty(diff) {
      if (!diff) return;
      A.difficulty = diff.toLowerCase();
      A.speedMult = A.difficulty === 'easy' ? 0.8 : A.difficulty === 'hard' ? 1.35 : 1.0;
    }
    try {
      const q = new URLSearchParams(window.location.search).get('diff');
      if (q) applyDifficulty(q);
    } catch (e) {}

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'SET_DIFFICULTY') {
        applyDifficulty(e.data.difficulty);
        if (G && G.popup && G.state === 'playing') {
          const col = A.difficulty === 'easy' ? '#34d399' : A.difficulty === 'hard' ? '#f43f5e' : '#38bdf8';
          G.popup(W / 2, 70, 'DIFFICULTY: ' + A.difficulty.toUpperCase() + ' (' + A.speedMult + 'x)', col, 18);
        }
      }
    });

    G.addScore = (n) => {
      const mult = A.difficulty === 'hard' ? 1.25 : 1.0;
      const pts = Math.round(n * mult);
      G.score += pts;
      if (G.score > G.hi) G.hi = G.score;
    };
    G.shake = (a) => { G.shakeAmt = Math.max(G.shakeAmt, a); };
    G.freeze = (n) => { G.freezeN = Math.max(G.freezeN, n); };
    G.over = (title, sub) => { if (G.state !== 'playing') return; G.state = 'over'; G.stateT = 0; G.title = title || 'Game Over'; G.sub = sub || ''; saveHi(); A.sfx('lose'); };
    G.win = (title, sub) => { if (G.state !== 'playing') return; G.state = 'won'; G.stateT = 0; G.title = title || 'You Win!'; G.sub = sub || ''; saveHi(); A.sfx('win'); };
    G.burst = (x, y, n, o) => {
      o = o || {};
      for (let i = 0; i < n && G.particles.length < 1200; i++) {
        const a = (o.angle != null ? o.angle : A.rand(0, TAU)) + A.rand(-1, 1) * (o.spread != null ? o.spread : Math.PI);
        const s = A.rand(o.min || 0.4, o.speed || 3), life = A.rand(0.6, 1) * (o.life || 30);
        G.particles.push({ x: x + A.rand(-1, 1) * (o.jitter || 0), y: y + A.rand(-1, 1) * (o.jitter || 0), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: o.size || 3, color: Array.isArray(o.color) ? A.pick(o.color) : (o.color || '#fff'), grav: o.grav || 0, drag: o.drag == null ? 0.97 : o.drag, glow: !!o.glow, shape: o.shape || 'c', shrink: o.shrink !== false });
      }
    };
    G.ring = (x, y, color, size, life) => { G.particles.push({ x, y, vx: 0, vy: 0, life: life || 22, max: life || 22, size: size || 40, color: color || '#fff', grav: 0, drag: 1, glow: true, shape: 'ring' }); };
    G.popup = (x, y, text, color, size) => { G.popups.push({ x, y, text: String(text), color: color || '#fff', life: 48, max: 48, size: size || 16 }); };
    G.drawFX = (c) => {
      G.fxDrawn = true;
      c = c || ctx;
      for (let pass = 0; pass < 2; pass++) {
        c.save();
        if (pass === 1) c.globalCompositeOperation = 'lighter';
        for (const p of G.particles) {
          if (p.glow !== (pass === 1)) continue;
          const k = p.life / p.max;
          c.globalAlpha = Math.max(0, Math.min(1, k * 1.4));
          if (p.shape === 'ring') {
            c.strokeStyle = p.color; c.lineWidth = 3 * k + 0.5;
            c.beginPath(); c.arc(p.x, p.y, p.size * (1 - k), 0, TAU); c.stroke();
            continue;
          }
          const s = p.shrink ? p.size * (0.3 + 0.7 * k) : p.size;
          c.fillStyle = p.color; c.strokeStyle = p.color;
          if (p.shape === 's') c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          else if (p.shape === 'l') { c.lineWidth = Math.max(1, s * 0.6); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5); c.stroke(); }
          else { c.beginPath(); c.arc(p.x, p.y, Math.max(0.3, s), 0, TAU); c.fill(); }
        }
        c.restore();
      }
      for (const p of G.popups) {
        const k = p.life / p.max;
        c.save(); c.globalAlpha = Math.min(1, k * 2);
        c.shadowColor = '#000'; c.shadowBlur = 4;
        A.text(c, p.text, p.x, p.y, p.size, p.color, 'center', '800');
        c.restore();
      }
    };
    function updateFX() {
      for (let i = G.particles.length - 1; i >= 0; i--) {
        const p = G.particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag;
        if (--p.life <= 0) G.particles.splice(i, 1);
      }
      for (let i = G.popups.length - 1; i >= 0; i--) {
        const p = G.popups[i]; p.y -= 0.6;
        if (--p.life <= 0) G.popups.splice(i, 1);
      }
      G.shakeAmt *= 0.88; if (G.shakeAmt < 0.15) G.shakeAmt = 0;
    }

    G.restart = (autostart) => {
      G.score = 0; G.t = 0; G.stateT = 0; G.particles.length = 0; G.popups.length = 0;
      G.shakeAmt = 0; G.freezeN = 0; G.hudL = undefined; G.hudR = undefined; G.title = ''; G.sub = '';
      G.state = autostart ? 'playing' : 'ready';
      clearPressed();
      cfg.init(G);
    };
    G.begin = () => { if (G.state === 'ready') { G.state = 'playing'; G.stateT = 0; ac(); if (cfg.onStart) cfg.onStart(G); } };
    G.pauseToggle = () => {
      if (G.state === 'playing') G.state = 'paused';
      else if (G.state === 'paused') { G.state = 'playing'; last = performance.now(); acc = 0; }
    };

    function onAnyInput(code) {
      if (G.state === 'ready' && code !== 'KeyM' && code !== 'KeyP' && code !== 'Escape' && !/^(Shift|Control|Alt|Meta)/.test(code)) G.begin();
    }
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (PREVENT.has(e.code)) e.preventDefault();
      if (e.code === 'KeyM') { A.muted = !A.muted; try { localStorage.setItem('arcade-muted', A.muted ? '1' : '0'); } catch (x) {} syncMute(); return; }
      if (e.code === 'KeyP' || e.code === 'Escape') { if (!e.repeat) G.pauseToggle(); return; }
      if ((G.state === 'over' || G.state === 'won') && !e.repeat && (e.code === 'Enter' || e.code === 'KeyR' || (e.code === 'Space' && G.stateT > 40))) { G.restart(true); return; }
      if (!e.repeat) { pressed[e.code] = true; }
      kb[e.code] = true;
      if (!e.repeat) onAnyInput(e.code);
    });
    window.addEventListener('keyup', (e) => { kb[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in kb) kb[k] = false; if (G.state === 'playing') G.pauseToggle(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'playing') G.pauseToggle(); });
    canvas.addEventListener('pointerdown', () => {
      if (G.state === 'ready') G.begin();
      else if (G.state === 'over' || G.state === 'won') { if (G.stateT > 25) G.restart(true); }
      else if (G.state === 'paused') G.pauseToggle();
    });
    document.querySelector('.bar').addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'restart') G.restart(true);
      else if (a === 'pause') G.pauseToggle();
      else if (a === 'mute') { A.muted = !A.muted; try { localStorage.setItem('arcade-muted', A.muted ? '1' : '0'); } catch (x) {} syncMute(); }
      else if (a === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {}); }
      e.target.blur && e.target.blur();
    });

    /* loop */
    let last = performance.now(), acc = 0;
    function stepOnce() {
      if (G.freezeN > 0) { G.freezeN--; return; }
      G.t++;
      cfg.update(G, 1);
      updateFX();
    }
    function overlay() {
      const c = ctx;
      const panel = (title, lines, color) => {
        c.save();
        c.fillStyle = 'rgba(5,7,15,.62)'; c.fillRect(0, 0, W, H);
        const pw = Math.min(W - 40, 440), ph = 40 + 38 + lines.length * 26 + 30, px = (W - pw) / 2, py = (H - ph) / 2;
        c.fillStyle = 'rgba(21,25,38,.94)'; A.roundRect(c, px, py, pw, ph, 16); c.fill();
        c.strokeStyle = A.alpha(color, 0.6); c.lineWidth = 2; A.roundRect(c, px, py, pw, ph, 16); c.stroke();
        A.glowText(c, title, W / 2, py + 62, 34, color, 'center', 18);
        lines.forEach((l, i) => A.text(c, l[0], W / 2, py + 100 + i * 26, l[1] || 15, l[2] || '#c8cde4', 'center', l[3] || '600'));
        c.restore();
      };
      if (G.state === 'ready') {
        const blink = 0.55 + 0.45 * Math.sin(G.clock * 0.08);
        const ctl = (cfg.controls ? cfg.controls.map((r) => r.join('  —  ')) : A.wrap(cfg.help || '', 46)).slice(0, 6);
        const L = [[cfg.subtitle || '', 14, '#8b93b3']];
        if (ctl.length) { L.push(['CONTROLS', 12, '#67e8f9', '800']); ctl.forEach((s) => L.push([s, 14, '#e6e9f5', '600'])); }
        L.push(['P pause  ·  M mute', 12, '#8b93b3', '600'], ['Press any key or tap to start', 16, A.alpha('#67e8f9', blink), '700'], ['BEST ' + G.hi, 13, '#8b93b3', '700']);
        panel(cfg.title, L, cfg.color || '#22d3ee');
      } else if (G.state === 'paused') {
        panel('Paused', [['Press P or Esc to resume', 16, '#c8cde4']], '#fbbf24');
      } else if (G.state === 'over' || G.state === 'won') {
        const win = G.state === 'won';
        const lines = [];
        if (G.sub) lines.push([G.sub, 15, '#c8cde4']);
        lines.push(['SCORE ' + G.score + '   ·   BEST ' + G.hi, 15, '#fbbf24', '800']);
        if (G.stateT > 20) lines.push(['Press Enter or R · or tap to play again', 14, '#8b93b3']);
        panel(G.title || (win ? 'You Win!' : 'Game Over'), lines, win ? '#34d399' : '#fb7185');
      }
    }
    function render() {
      G.clock++; if (G.state !== 'playing') G.stateT++; else G.stateT++;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (G.shakeAmt > 0.1) ctx.translate(A.rand(-1, 1) * G.shakeAmt, A.rand(-1, 1) * G.shakeAmt);
      G.fxDrawn = false;
      cfg.draw(G, ctx);
      if (!G.fxDrawn) G.drawFX(ctx);
      ctx.restore();
      if (cfg.hud !== false && (G.state === 'playing' || G.state === 'paused' || G.state === 'over' || G.state === 'won')) {
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 5;
        A.text(ctx, G.hudL !== undefined ? G.hudL : 'SCORE ' + G.score, 14, 26, 16, '#fff', 'left', '800', A.MONO);
        A.text(ctx, G.hudR !== undefined ? G.hudR : 'BEST ' + G.hi, W - 14, 26, 16, '#fbbf24', 'right', '800', A.MONO);
        ctx.restore();
      }
      overlay();
    }
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(100, now - last); last = now;
      pollPad();
      if (G.state === 'playing') {
        acc += dt * (A.speedMult || 1.0); let n = 0;
        while (acc >= STEP && n < 6) { stepOnce(); acc -= STEP; n++; if (G.state !== 'playing') break; }
        if (n >= 6) acc = 0;
        if (n > 0) clearPressed();
      } else {
        acc = 0;
        if (G.state === 'over' || G.state === 'won') { if (A.hit('Enter') && G.stateT > 20) G.restart(true); }
        clearPressed();
      }
      render();
    }
    window.addEventListener('beforeunload', saveHi);

    /* deterministic test hooks (used by automated checks) */
    A.test = {
      G,
      press: (c) => { kb[c] = true; pressed[c] = true; onAnyInput(c); },
      release: (c) => { kb[c] = false; },
      tap: (c, n) => { kb[c] = true; pressed[c] = true; onAnyInput(c); stepOnce(); clearPressed(); for (let i = 1; i < (n || 2); i++) stepOnce(); kb[c] = false; },
      step: (n) => { for (let i = 0; i < n; i++) { if (G.state !== 'playing') break; stepOnce(); clearPressed(); } },
    };

    G.restart(false);
    requestAnimationFrame(frame);
    return G;
  };
})();
