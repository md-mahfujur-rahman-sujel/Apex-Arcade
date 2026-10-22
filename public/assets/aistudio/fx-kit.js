/* fx-kit.js — K3 visual FX for Apex Arcade. Additive. window.Fx
   Bake sprites, pooled particles, tweens, squash springs, camera, parallax,
   light/glow, cheap bloom, transitions, colour grade, cached vignette.
   Reads Perf / Save when present; never throws if they are missing.
   Does not replace Arcade G.burst / G.shake / A.vignette. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var Fx = (window.Fx = window.Fx || {});

  function clamp(n, a, b) { return n < a ? a : n > b ? b : n; }
  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function tier() { return (window.Perf && Perf.tier) || 'standard'; }
  function lite() { return tier() === 'lite'; }

  /* ── reduced motion ─────────────────────────────────────────── */
  Fx.reducedMotion = function (gameId) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch (e) {}
    try {
      var id = gameId || (window.Arcade && Arcade.G && Arcade.G.cfg && Arcade.G.cfg.id);
      if (id && window.Save && typeof Save.load === 'function') {
        var s = Save.load(id);
        if (s && s.settings && s.settings.reduceMotion) return true;
      }
    } catch (e) {}
    return false;
  };

  /* ── sprite bake cache ──────────────────────────────────────── */
  var sprites = Object.create(null);

  Fx.bake = function (key, w, h, drawFn) {
    if (sprites[key]) return sprites[key];
    var cnv = document.createElement('canvas');
    cnv.width = Math.max(1, w | 0);
    cnv.height = Math.max(1, h | 0);
    var c = cnv.getContext('2d');
    drawFn(c, cnv.width, cnv.height, cnv);
    sprites[key] = cnv;
    return cnv;
  };

  Fx.has = function (key) { return !!sprites[key]; };

  Fx.drawSprite = function (ctx, key, x, y, opts) {
    var img = sprites[key];
    if (!img) return;
    opts = opts || {};
    var dw = opts.w != null ? opts.w : img.width;
    var dh = opts.h != null ? opts.h : img.height;
    var ox = opts.ox != null ? opts.ox : dw / 2;
    var oy = opts.oy != null ? opts.oy : dh / 2;
    var sx = opts.sx != null ? opts.sx : (opts.scale != null ? opts.scale : 1);
    var sy = opts.sy != null ? opts.sy : sx;
    ctx.save();
    ctx.translate(x, y);
    if (opts.rot) ctx.rotate(opts.rot);
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    ctx.scale(sx, sy);
    ctx.drawImage(img, -ox, -oy, dw, dh);
    ctx.restore();
  };

  /* ── light / glow (baked radial) ────────────────────────────── */
  Fx.light = function (key, r, color) {
    r = Math.max(2, r | 0);
    var id = 'light:' + key + ':' + r + ':' + color;
    return Fx.bake(id, r * 2, r * 2, function (c, w, h) {
      var g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, color);
      g.addColorStop(0.55, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    });
  };

  Fx.glow = function (ctx, x, y, r, color) {
    var img = Fx.light('glow', r, color);
    if (lite()) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r * 0.25), 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(img, x - r, y - r);
    ctx.restore();
  };

  /* ── pooled particles (not G.particles) ─────────────────────── */
  var POOL = 800;
  var pool = new Array(POOL);
  var i;
  for (i = 0; i < POOL; i++) {
    pool[i] = { alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#fff', grav: 0, drag: 0.97, glow: false, shrink: true };
  }

  Fx.emit = function (x, y, n, opts) {
    opts = opts || {};
    var cap = n | 0;
    if (window.Perf && typeof Perf.budget === 'function') cap = Perf.budget(cap);
    cap = Math.max(0, cap);
    var spawned = 0;
    var angle = opts.angle != null ? opts.angle : 0;
    var spread = opts.spread != null ? opts.spread : TAU;
    var j;
    for (j = 0; j < POOL && spawned < cap; j++) {
      var p = pool[j];
      if (p.alive) continue;
      var a = angle + (Math.random() - 0.5) * spread;
      var spd = (opts.speed || 2) * (0.4 + Math.random() * 0.8);
      p.alive = true;
      p.x = x + rand(-1, 1) * (opts.jitter || 0);
      p.y = y + rand(-1, 1) * (opts.jitter || 0);
      p.vx = Math.cos(a) * spd;
      p.vy = Math.sin(a) * spd;
      p.life = p.max = opts.life || 30;
      p.size = opts.size || 3;
      p.color = Array.isArray(opts.color) ? pick(opts.color) : (opts.color || '#fff');
      p.grav = opts.grav || 0;
      p.drag = opts.drag == null ? 0.97 : opts.drag;
      p.glow = !!opts.glow;
      p.shrink = opts.shrink !== false;
      spawned++;
    }
  };

  function updateParticles() {
    var j, p;
    for (j = 0; j < POOL; j++) {
      p = pool[j];
      if (!p.alive) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life--;
      if (p.life <= 0) p.alive = false;
    }
  }

  Fx.draw = function (ctx) {
    var skipGlow = lite();
    var j, p, k, s;
    ctx.save();
    for (j = 0; j < POOL; j++) {
      p = pool[j];
      if (!p.alive) continue;
      k = p.life / p.max;
      s = p.shrink ? p.size * (0.3 + 0.7 * k) : p.size;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.globalCompositeOperation = (p.glow && !skipGlow) ? 'lighter' : 'source-over';
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, s), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ── tweens ─────────────────────────────────────────────────── */
  var easings = {
    linear: function (t) { return t; },
    quadIn: function (t) { return t * t; },
    quadOut: function (t) { return t * (2 - t); },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outBack: function (t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
    },
  };
  Fx.ease = easings;

  var TWEEN_MAX = 64;
  var tweens = new Array(TWEEN_MAX);
  for (i = 0; i < TWEEN_MAX; i++) {
    tweens[i] = { alive: false, obj: null, from: {}, to: null, keys: null, t: 0, dur: 1, ease: easings.linear, onDone: null };
  }

  Fx.tween = function (obj, to, ms, ease, onDone) {
    var slot = tweens[0], j, k, keys;
    for (j = 0; j < TWEEN_MAX; j++) if (!tweens[j].alive) { slot = tweens[j]; break; }
    keys = Object.keys(to);
    slot.alive = true;
    slot.obj = obj;
    slot.to = to;
    slot.keys = keys;
    slot.t = 0;
    slot.dur = Math.max(1, ms || 300);
    slot.ease = typeof ease === 'function' ? ease : (easings[ease] || easings.inOutCubic);
    slot.onDone = onDone || null;
    for (k = 0; k < keys.length; k++) slot.from[keys[k]] = +obj[keys[k]] || 0;
    return slot;
  };

  function updateTweens(ms) {
    var j, tw, k, key, u, e, done;
    for (j = 0; j < TWEEN_MAX; j++) {
      tw = tweens[j];
      if (!tw.alive) continue;
      tw.t += ms;
      u = clamp01(tw.t / tw.dur);
      e = tw.ease(u);
      for (k = 0; k < tw.keys.length; k++) {
        key = tw.keys[k];
        tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      }
      if (u >= 1) {
        tw.alive = false;
        done = tw.onDone;
        tw.onDone = null;
        if (done) try { done(tw.obj); } catch (err) {}
      }
    }
  }

  /* ── squash / stretch springs ───────────────────────────────── */
  var squashes = Object.create(null);

  Fx.squash = {
    punch: function (id, opts) {
      opts = opts || {};
      var s = squashes[id];
      if (!s) s = squashes[id] = { sx: 1, sy: 1, vx: 0, vy: 0 };
      s.sx = opts.sx != null ? opts.sx : 1.18;
      s.sy = opts.sy != null ? opts.sy : 0.82;
      s.vx = 0;
      s.vy = 0;
      return s;
    },
    get: function (id) {
      return squashes[id] || { sx: 1, sy: 1 };
    },
  };

  function updateSquash() {
    var id, s, k = 0.22, d = 0.72;
    for (id in squashes) {
      s = squashes[id];
      s.vx += (1 - s.sx) * k;
      s.vy += (1 - s.sy) * k;
      s.vx *= d;
      s.vy *= d;
      s.sx += s.vx;
      s.sy += s.vy;
    }
  }

  /* ── camera ─────────────────────────────────────────────────── */
  var cameras = [];

  function Camera(opts) {
    opts = opts || {};
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.tx = this.x;
    this.ty = this.y;
    this.zoom = opts.zoom || 1;
    this.tzoom = this.zoom;
    this.deadzone = opts.deadzone || { x: 48, y: 32 };
    this.lookAhead = opts.lookAhead || 0;
    this.smooth = opts.smooth != null ? opts.smooth : 0.12;
    this.shakeAmt = 0;
    this.shakeDecay = 0.88;
    cameras.push(this);
  }

  Camera.prototype.follow = function (x, y, vx) {
    var la = (vx || 0) * this.lookAhead;
    var dx = (x + la) - this.tx;
    var dy = y - this.ty;
    var zx = this.deadzone.x, zy = this.deadzone.y;
    if (dx > zx) this.tx += dx - zx;
    else if (dx < -zx) this.tx += dx + zx;
    if (dy > zy) this.ty += dy - zy;
    else if (dy < -zy) this.ty += dy + zy;
  };

  Camera.prototype.shake = function (amt) {
    if (Fx.reducedMotion()) return;
    this.shakeAmt = Math.max(this.shakeAmt, amt || 0);
  };

  Camera.prototype.setZoom = function (z) {
    this.tzoom = z || 1;
    if (Fx.reducedMotion()) this.zoom = this.tzoom;
  };

  Camera.prototype.update = function () {
    this.x += (this.tx - this.x) * this.smooth;
    this.y += (this.ty - this.y) * this.smooth;
    this.zoom += (this.tzoom - this.zoom) * this.smooth;
    this.shakeAmt *= this.shakeDecay;
    if (this.shakeAmt < 0.15) this.shakeAmt = 0;
  };

  Camera.prototype.apply = function (ctx, w, h) {
    var sx = 0, sy = 0;
    if (this.shakeAmt > 0.1 && !Fx.reducedMotion()) {
      sx = rand(-1, 1) * this.shakeAmt;
      sy = rand(-1, 1) * this.shakeAmt;
    }
    ctx.save();
    ctx.translate((w || 0) / 2 + sx, (h || 0) / 2 + sy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  };

  Camera.prototype.clear = function (ctx) {
    ctx.restore();
  };

  Fx.Camera = Camera;

  /* ── parallax ───────────────────────────────────────────────── */
  Fx.parallax = function (ctx, layers, scrollX, scrollY) {
    scrollX = scrollX || 0;
    scrollY = scrollY || 0;
    var n = layers.length, li, L, w, bottom, base, amp, x, wx, spd;
    for (li = 0; li < n; li++) {
      L = layers[li];
      spd = L.speed || 0;
      w = L.w || 0;
      if (!w) {
        try { w = ctx.canvas.width / ((ctx.getTransform && ctx.getTransform().a) || 1); } catch (e) { w = 800; }
      }
      bottom = L.y != null ? L.y : (L.h || 600);
      if (L.draw) {
        ctx.save();
        ctx.translate(-(scrollX * spd), -(scrollY * (L.speedY != null ? L.speedY : spd)));
        L.draw(ctx, scrollX, L);
        ctx.restore();
        continue;
      }
      ctx.fillStyle = L.color || '#111';
      ctx.beginPath();
      ctx.moveTo(0, bottom);
      base = L.base != null ? L.base : bottom * 0.7;
      amp = L.amp || 40;
      for (x = 0; x <= w + 24; x += 20) {
        wx = x + scrollX * spd;
        ctx.lineTo(x, base - (Math.sin(wx * 0.011) + Math.sin(wx * 0.027 + 2) * 0.6) * amp * 0.5 - amp * 0.4);
      }
      ctx.lineTo(w, bottom);
      ctx.closePath();
      ctx.fill();
    }
  };

  /* ── bloom ──────────────────────────────────────────────────── */
  var bloomA = null, bloomB = null, bloomBw = 0, bloomBh = 0, bloomTick = 0;

  Fx.bloom = function (ctx, w, h, amt) {
    var k = amt == null ? 1 : amt; /* optional strength multiplier (default 1) */
    if (Fx.reducedMotion()) return;
    if (lite()) return;
    var half = tier() !== 'ultra';
    bloomTick++;
    if (half && (bloomTick & 1) === 0 && bloomA) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.32 * k;
      ctx.drawImage(bloomA, 0, 0, w, h);
      ctx.restore();
      return;
    }
    var scale = half ? 0.5 : 0.62;
    var bw = Math.max(1, (w * scale) | 0);
    var bh = Math.max(1, (h * scale) | 0);
    if (!bloomA || bloomBw !== bw || bloomBh !== bh) {
      bloomA = document.createElement('canvas');
      bloomB = document.createElement('canvas');
      bloomA.width = bloomB.width = bw;
      bloomA.height = bloomB.height = bh;
      bloomBw = bw;
      bloomBh = bh;
    }
    var src = ctx.canvas;
    var a = bloomA.getContext('2d');
    var b = bloomB.getContext('2d');
    a.globalCompositeOperation = 'source-over';
    a.globalAlpha = 1;
    a.clearRect(0, 0, bw, bh);
    a.drawImage(src, 0, 0, src.width, src.height, 0, 0, bw, bh);
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, 0, bw, bh);
    b.globalAlpha = 0.28;
    var o = 1.6;
    b.drawImage(bloomA, o, 0);
    b.drawImage(bloomA, -o, 0);
    b.drawImage(bloomA, 0, o);
    b.drawImage(bloomA, 0, -o);
    b.globalAlpha = 1;
    a.clearRect(0, 0, bw, bh);
    a.drawImage(bloomB, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.38 * k;
    ctx.drawImage(bloomA, 0, 0, w, h);
    ctx.restore();
  };

  /* ── transitions ────────────────────────────────────────────── */
  function snapT(t) {
    if (Fx.reducedMotion()) return t >= 1 ? 1 : 0;
    return clamp01(t);
  }

  Fx.transition = {
    iris: function (ctx, w, h, t, opts) {
      opts = opts || {};
      t = snapT(t);
      var cx = opts.x != null ? opts.x : w / 2;
      var cy = opts.y != null ? opts.y : h / 2;
      var maxR = Math.sqrt(w * w + h * h) * 0.62;
      var r = Math.max(0.5, t * maxR);
      ctx.save();
      ctx.fillStyle = opts.color || '#05070f';
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.arc(cx, cy, r, 0, TAU, true);
      ctx.fill('evenodd');
      ctx.restore();
    },
    fade: function (ctx, w, h, t, opts) {
      opts = opts || {};
      t = snapT(t);
      ctx.save();
      ctx.fillStyle = opts.color || '#05070f';
      ctx.globalAlpha = 1 - t;
      if (ctx.globalAlpha > 0.01) ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },
    slide: function (ctx, w, h, t, opts) {
      opts = opts || {};
      t = snapT(t);
      var dir = opts.dir || 'left';
      ctx.save();
      ctx.fillStyle = opts.color || '#05070f';
      if (dir === 'left') ctx.fillRect(-w + t * w, 0, w, h);
      else if (dir === 'right') ctx.fillRect(w - t * w, 0, w, h);
      else if (dir === 'up') ctx.fillRect(0, -h + t * h, w, h);
      else ctx.fillRect(0, h - t * h, w, h);
      ctx.restore();
    },
  };

  /* ── colour grade + vignette ────────────────────────────────── */
  var vigCache = Object.create(null);

  Fx.vignette = function (ctx, w, h, amt) {
    var k = w + 'x' + h;
    var img = vigCache[k];
    if (!img) {
      img = document.createElement('canvas');
      img.width = Math.max(1, w | 0);
      img.height = Math.max(1, h | 0);
      var c = img.getContext('2d');
      var g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      vigCache[k] = img;
    }
    ctx.save();
    ctx.globalAlpha = amt == null ? 0.45 : amt;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  };

  Fx.grade = function (ctx, w, h, opts) {
    opts = opts || {};
    ctx.save();
    if (opts.tint) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = opts.tintAmt != null ? opts.tintAmt : 0.12;
      ctx.fillStyle = opts.tint;
      ctx.fillRect(0, 0, w, h);
    }
    var b = opts.brightness || 0;
    if (b > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = b * 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    } else if (b < 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (-b) * 0.4;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
    }
    if (opts.contrast) {
      ctx.globalCompositeOperation = opts.contrast > 0 ? 'overlay' : 'source-over';
      ctx.globalAlpha = Math.abs(opts.contrast) * 0.18;
      ctx.fillStyle = opts.contrast > 0 ? '#808080' : '#000';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  };

  /* ── tick ───────────────────────────────────────────────────── */
  Fx.update = function (dt) {
    var ms = (dt == null || dt === 1) ? 16.67 : (dt < 8 ? dt * 16.67 : dt);
    updateParticles();
    updateTweens(ms);
    updateSquash();
    var c;
    for (c = 0; c < cameras.length; c++) cameras[c].update();
  };
})();
