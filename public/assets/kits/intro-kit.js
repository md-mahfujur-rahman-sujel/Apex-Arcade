/* intro-kit.js — per-title game beginning animations for Apex Arcade.
   Loaded on demand by menu-kit.js. Exports window.ApexIntro only.
   Each game id owns one hand-authored scene: its own subject, motion,
   title treatment and handoff into live gameplay. */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc || !doc.createElement) return;

  var OUTRO_MS = 430;
  var STYLE_ID = 'apex-intro-styles';
  var scenes = {};

  var ease = {
    linear: function (x) { return x; },
    inQuad: function (x) { return x * x; },
    outQuad: function (x) { return x * (2 - x); },
    inOutQuad: function (x) { return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x; },
    outCubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    inCubic: function (x) { return x * x * x; },
    inOutCubic: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    outQuart: function (x) { return 1 - Math.pow(1 - x, 4); },
    outBack: function (x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: function (x) {
      if (x <= 0 || x >= 1) return x;
      var c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
  };

  function seedOf(key) {
    var seed = 2166136261;
    for (var i = 0; i < key.length; i++) seed = ((seed ^ key.charCodeAt(i)) * 16777619) >>> 0;
    return seed % 100000;
  }

  function rnd(seed, i) {
    var x = Math.sin(seed * 0.00017 + i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function clamp(value, low, high) { return value < low ? low : value > high ? high : value; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Local progress of element i inside a staggered window over [start, start+span]. */
  function stagger(p, i, count, start, span) {
    start = start == null ? 0 : start;
    span = span == null ? 0.55 : span;
    var slot = count <= 1 ? 0 : i / (count - 1);
    return clamp((p - start - slot * span) / Math.max(0.0001, 1 - span * 0.35), 0, 1);
  }

  function alphaOn(p, inStart, inEnd, outStart) {
    if (p <= inStart) return 0;
    if (p >= (outStart == null ? 1.1 : outStart)) return Math.max(0, 1 - (p - outStart) * 4);
    return clamp((p - inStart) / Math.max(0.0001, inEnd - inStart), 0, 1);
  }

  var H = {
    ease: ease, rnd: rnd, seedOf: seedOf, clamp: clamp, lerp: lerp,
    stagger: stagger, alphaOn: alphaOn,

    /* ---- surfaces ---- */
    ink: function (ctx, w, h, color) {
      ctx.fillStyle = color || '#05060d';
      ctx.fillRect(0, 0, w, h);
    },
    wash: function (ctx, f, color, alpha, cx, cy, radius) {
      var grad = ctx.createRadialGradient(cx == null ? f.w * 0.5 : cx, cy == null ? f.h * 0.5 : cy, 0,
        cx == null ? f.w * 0.5 : cx, cy == null ? f.h * 0.5 : cy, radius || Math.max(f.w, f.h) * 0.72);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(5,6,13,0)');
      ctx.save();
      ctx.globalAlpha = alpha == null ? 0.3 : alpha;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, f.w, f.h);
      ctx.restore();
    },
    vignette: function (ctx, w, h, strength) {
      var grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,' + (strength == null ? 0.72 : strength) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    flash: function (ctx, f, alpha, color) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = color || '#ffffff';
      ctx.fillRect(0, 0, f.w, f.h);
      ctx.restore();
    },
    scanlines: function (ctx, w, h, alpha, gap) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 0.1 : alpha;
      ctx.fillStyle = '#000000';
      for (var y = 0; y < h; y += (gap || 3)) ctx.fillRect(0, y, w, 1);
      ctx.restore();
    },
    sweep: function (ctx, w, y, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 0.5 : alpha;
      ctx.fillStyle = color;
      ctx.fillRect(0, y, w, 2);
      ctx.globalAlpha = (alpha == null ? 0.5 : alpha) * 0.25;
      ctx.fillRect(0, y - 14, w, 14);
      ctx.restore();
    },

    /* ---- primitives ---- */
    seg: function (ctx, x0, y0, x1, y1, progress, style) {
      if (progress <= 0) return;
      style = style || {};
      ctx.save();
      ctx.globalAlpha = style.alpha == null ? 1 : style.alpha;
      ctx.strokeStyle = style.color || '#ffffff';
      ctx.lineWidth = style.width || 2;
      ctx.lineCap = style.cap || 'round';
      if (style.glow && ctx.canvas) { ctx.shadowColor = style.color || '#ffffff'; ctx.shadowBlur = style.blur || 14; }
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(lerp(x0, x1, clamp(progress, 0, 1)), lerp(y0, y1, clamp(progress, 0, 1)));
      ctx.stroke();
      ctx.restore();
    },
    rect: function (ctx, x, y, w, h, style) {
      style = style || {};
      ctx.save();
      ctx.globalAlpha = style.alpha == null ? 1 : style.alpha;
      if (style.fill) { ctx.fillStyle = style.fill; ctx.fillRect(x, y, w, h); }
      if (style.stroke) {
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.width || 2;
        if (style.glow) { ctx.shadowColor = style.stroke; ctx.shadowBlur = style.blur || 12; }
        ctx.strokeRect(x, y, w, h);
      }
      ctx.restore();
    },
    disc: function (ctx, x, y, r, style) {
      style = style || {};
      if (r <= 0) return;
      ctx.save();
      ctx.globalAlpha = style.alpha == null ? 1 : style.alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
      if (style.stroke) {
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.width || 2;
        if (style.glow) { ctx.shadowColor = style.stroke; ctx.shadowBlur = style.blur || 12; }
        ctx.stroke();
      }
      ctx.restore();
    },
    ring: function (ctx, x, y, r, progress, style) {
      if (r <= 0 || progress <= 0) return;
      style = style || {};
      ctx.save();
      ctx.globalAlpha = style.alpha == null ? 1 : style.alpha;
      ctx.strokeStyle = style.color || '#ffffff';
      ctx.lineWidth = style.width || 2;
      ctx.lineCap = 'round';
      if (style.glow) { ctx.shadowColor = style.color || '#ffffff'; ctx.shadowBlur = style.blur || 14; }
      ctx.beginPath();
      ctx.arc(x, y, r, (style.from || -0.5) * Math.PI, ((style.from || -0.5) + 2 * clamp(progress, 0, 1)) * Math.PI);
      ctx.stroke();
      ctx.restore();
    },
    poly: function (ctx, x, y, r, sides, style) {
      style = style || {};
      if (r <= 0) return;
      var rot = style.rot || 0;
      ctx.save();
      ctx.globalAlpha = style.alpha == null ? 1 : style.alpha;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var a = (i / sides) * Math.PI * 2 - Math.PI / 2;
        var px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (style.fill) { ctx.fillStyle = style.fill; ctx.fill(); }
      if (style.stroke) {
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.width || 2;
        if (style.glow) { ctx.shadowColor = style.stroke; ctx.shadowBlur = style.blur || 12; }
        ctx.stroke();
      }
      ctx.restore();
    },
    path: function (ctx, points, progress, style) {
      if (!points || points.length < 2 || progress <= 0) return;
      style = style || {};
      var total = 0, i, segs = [];
      for (i = 1; i < points.length; i++) {
        var d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        segs.push(d); total += d;
      }
      var target = total * clamp(progress, 0, 1);
      ctx.save();
      ctx.globalAlpha = style.alpha == null ? 1 : style.alpha;
      ctx.strokeStyle = style.color || '#ffffff';
      ctx.lineWidth = style.width || 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (style.glow) { ctx.shadowColor = style.color || '#ffffff'; ctx.shadowBlur = style.blur || 14; }
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (i = 1; i < points.length; i++) {
        if (target <= 0) break;
        var use = Math.min(target, segs[i - 1]);
        var ratio = segs[i - 1] ? use / segs[i - 1] : 0;
        ctx.lineTo(lerp(points[i - 1][0], points[i][0], ratio), lerp(points[i - 1][1], points[i][1], ratio));
        target -= use;
      }
      ctx.stroke();
      ctx.restore();
    },
    lattice: function (ctx, x, y, w, h, cols, rows, progress, style) {
      style = style || {};
      var i;
      for (i = 0; i <= cols; i++) {
        var px = x + (w / cols) * i;
        H.seg(ctx, px, y, px, y + h, clamp(progress * 1.4 - (i % 2) * 0.18, 0, 1), style);
      }
      for (i = 0; i <= rows; i++) {
        var py = y + (h / rows) * i;
        H.seg(ctx, x, py, x + w, py, clamp(progress * 1.4 - ((i + 1) % 2) * 0.18, 0, 1), style);
      }
    },
    motes: function (ctx, f, count, style) {
      style = style || {};
      var spread = style.spread == null ? 1 : style.spread;
      for (var i = 0; i < count; i++) {
        var rx = rnd(f.seed, i * 3), ry = rnd(f.seed, i * 3 + 1), rs = rnd(f.seed, i * 3 + 2);
        var drift = style.motion === false ? 0 : (f.time * 0.00006 * (0.4 + rs));
        var x = ((rx + drift * (style.reverse ? -1 : 1)) % 1) * f.w;
        var y = style.vertical ? ((ry - drift) % 1 + 1) % 1 * f.h : ry * f.h;
        ctx.save();
        ctx.globalAlpha = (style.alpha == null ? 0.5 : style.alpha) * (0.35 + rs * 0.65) * (style.gate == null ? 1 : clamp(style.gate, 0, 1));
        ctx.fillStyle = style.color || f.accent;
        var size = (style.size || 2.4) * (0.5 + rs);
        ctx.fillRect(x, y, size, size);
        ctx.restore();
      }
    },

    /* ---- titles ---- */
    fontStack: function (weight, size, family) {
      return weight + ' ' + size + 'px ' + (family || 'system-ui, -apple-system, Segoe UI, sans-serif');
    },
    wordPop: function (ctx, f, word, opts) {
      opts = opts || {};
      var size = opts.size || Math.min(f.w * 0.11, f.h * 0.16, 92);
      var letters = word.split('');
      var gap = size * (opts.tracking == null ? 0.06 : opts.tracking);
      ctx.save();
      ctx.font = H.fontStack(opts.weight || 900, size, opts.family);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var widths = letters.map(function (ch) { return ctx.measureText(ch).width; });
      var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (letters.length - 1);
      var x = (opts.x == null ? f.w / 2 : opts.x) - total / 2;
      var y = opts.y == null ? f.h * 0.62 : opts.y;
      for (var i = 0; i < letters.length; i++) {
        var lp = ease.outBack(stagger(f.p, i, letters.length, opts.start || 0.18, opts.span || 0.5));
        if (lp > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, lp * 1.4) * (opts.alpha == null ? 1 : opts.alpha);
          ctx.translate(x + widths[i] / 2, y + (1 - lp) * size * 0.35);
          ctx.scale(Math.max(0.001, lp), Math.max(0.001, lp));
          ctx.fillStyle = opts.color || '#ffffff';
          if (opts.glow) { ctx.shadowColor = opts.glowColor || f.accent; ctx.shadowBlur = opts.blur || 22; }
          ctx.fillText(letters[i], -widths[i] / 2, 0);
          ctx.restore();
        }
        x += widths[i] + gap;
      }
      ctx.restore();
      return total;
    },
    stamp: function (ctx, f, word, opts) {
      opts = opts || {};
      var p = clamp((f.p - (opts.start || 0.3)) / 0.22, 0, 1);
      if (p <= 0) return;
      var size = opts.size || Math.min(f.w * 0.13, f.h * 0.2, 110);
      var scale = p < 1 ? lerp(2.4, 1, ease.outQuart(p)) : 1 + Math.sin((f.p - (opts.start || 0.3)) * 26) * 0.006 * Math.max(0, 1 - (f.p - (opts.start || 0.3)) * 3);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 2.2) * (opts.alpha == null ? 1 : opts.alpha);
      ctx.translate(opts.x == null ? f.w / 2 : opts.x, opts.y == null ? f.h * 0.62 : opts.y);
      ctx.rotate((opts.tilt || 0) * (1 - p));
      ctx.scale(scale, scale);
      ctx.font = H.fontStack(opts.weight || 900, size, opts.family);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = opts.color || '#ffffff';
      if (opts.glow) { ctx.shadowColor = opts.glowColor || f.accent; ctx.shadowBlur = opts.blur || 26; }
      ctx.fillText(word, 0, 0);
      ctx.restore();
      if (p < 1) H.flash(ctx, f, (1 - p) * 0.25, opts.color || '#ffffff');
    },
    typeOn: function (ctx, f, word, opts) {
      opts = opts || {};
      var p = clamp((f.p - (opts.start || 0.35)) / 0.45, 0, 1);
      var size = opts.size || Math.min(f.w * 0.055, f.h * 0.08, 34);
      var shown = word.slice(0, Math.round(word.length * p));
      ctx.save();
      ctx.font = H.fontStack(opts.weight || 700, size, opts.family || 'ui-monospace, Consolas, monospace');
      ctx.textAlign = opts.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = opts.color || f.accent;
      ctx.globalAlpha = opts.alpha == null ? 0.95 : opts.alpha;
      var x = opts.x == null ? f.w / 2 : opts.x;
      var y = opts.y == null ? f.h * 0.74 : opts.y;
      if (opts.align === 'left') ctx.textAlign = 'left';
      ctx.fillText(shown, x, y);
      if (p < 1 && Math.floor(f.time / 260) % 2 === 0) {
        var wdt = ctx.measureText(shown).width;
        ctx.fillRect(opts.align === 'left' ? x + wdt + 4 : x + wdt / 2 + 4, y - size * 0.5, 3, size);
      }
      ctx.restore();
    },
    drawOn: function (ctx, f, word, opts) {
      opts = opts || {};
      var p = ease.outCubic(clamp((f.p - (opts.start || 0.25)) / 0.5, 0, 1));
      if (p <= 0) return;
      var size = opts.size || Math.min(f.w * 0.11, f.h * 0.16, 88);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, f.w * p, f.h);
      ctx.clip();
      ctx.font = H.fontStack(opts.weight || 900, size, opts.family);
      ctx.textAlign = opts.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = opts.fill || 'rgba(255,255,255,0.06)';
      var x = opts.x == null ? f.w / 2 : opts.x, y = opts.y == null ? f.h * 0.6 : opts.y;
      ctx.fillText(word, x, y);
      ctx.strokeStyle = opts.color || f.accent;
      ctx.lineWidth = opts.width || 2.2;
      ctx.lineJoin = 'round';
      if (opts.glow) { ctx.shadowColor = opts.color || f.accent; ctx.shadowBlur = 16; }
      ctx.strokeText(word, x, y);
      ctx.restore();
    },
    sketch: function (ctx, f, word, opts) {
      opts = opts || {};
      var size = opts.size || Math.min(f.w * 0.09, f.h * 0.14, 76);
      var p = clamp((f.p - (opts.start || 0.3)) / 0.5, 0, 1);
      ctx.save();
      ctx.font = H.fontStack(opts.weight || 800, size, opts.family || 'ui-rounded, system-ui, sans-serif');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = opts.color || 'rgba(226,232,240,.9)';
      ctx.lineWidth = 1.6;
      var x = opts.x == null ? f.w / 2 : opts.x, y = opts.y == null ? f.h * 0.6 : opts.y;
      var passes = Math.round(p * 3);
      for (var i = 0; i < passes; i++) {
        ctx.save();
        ctx.globalAlpha = 0.55 - i * 0.12;
        ctx.translate((rnd(f.seed, i) - 0.5) * 3.2, (rnd(f.seed, i + 9) - 0.5) * 3.2);
        ctx.strokeText(word, x, y);
        ctx.restore();
      }
      if (p > 0.75) { ctx.globalAlpha = clamp((p - 0.75) / 0.25, 0, 1); ctx.fillStyle = opts.fill || '#ffffff'; ctx.fillText(word, x, y); }
      ctx.restore();
    },
    kicker: function (ctx, f, text, opts) {
      opts = opts || {};
      var p = clamp((f.p - (opts.start || 0.1)) / 0.3, 0, 1);
      if (p <= 0 || !text) return;
      var size = opts.size || Math.min(f.w * 0.022, 15);
      ctx.save();
      ctx.globalAlpha = p * (opts.alpha == null ? 0.85 : opts.alpha);
      ctx.font = H.fontStack(800, size, 'ui-monospace, Consolas, monospace');
      ctx.textAlign = opts.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = opts.color || f.accent;
      var label = String(text).toUpperCase();
      var track = size * 0.22;
      var widths = label.split('').map(function (ch) { return ctx.measureText(ch).width; });
      var total = widths.reduce(function (a, b) { return a + b; }, 0) + track * (label.length - 1);
      var x = (opts.x == null ? f.w / 2 : opts.x) - total / 2;
      for (var i = 0; i < label.length; i++) { ctx.fillText(label[i], x, opts.y == null ? f.h * 0.36 : opts.y); x += widths[i] + track; }
      ctx.restore();
    }
  };

  /* ---- handoffs: erase the opaque canvas to reveal live gameplay ---- */
  function outroMask(ctx, kind, f, p) {
    var e = ease.inOutQuad(p), w = f.w, h = f.h, i;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    if (kind === 'iris') {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.hypot(w, h) * 0.52 * e, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'wipeL') {
      ctx.fillRect(0, 0, w * e, h);
    } else if (kind === 'wipeR') {
      ctx.fillRect(w * (1 - e), 0, w * e, h);
    } else if (kind === 'wipeU') {
      ctx.fillRect(0, h * (1 - e), w, h * e);
    } else if (kind === 'curtain') {
      ctx.fillRect(0, 0, w * e / 2, h);
      ctx.fillRect(w - w * e / 2, 0, w * e / 2, h);
    } else if (kind === 'zoom') {
      ctx.fillRect(w * (1 - e) / 2, h * (1 - e) / 2, w * e, h * e);
    } else if (kind === 'slats') {
      var cols = 9, sw = w / cols;
      for (i = 0; i < cols; i++) {
        var lp = clamp(e * 1.7 - i * 0.07, 0, 1);
        ctx.fillRect(i * sw, h * (1 - lp) / 2, sw, h * lp);
      }
    } else if (kind === 'shutter') {
      var bands = 10, sh = h / bands;
      for (i = 0; i < bands; i++) {
        var hp = clamp(e * 1.8 - i * 0.075, 0, 1);
        ctx.fillRect(0, i * sh + sh * (1 - hp) / 2, w, sh * hp);
      }
    } else if (kind === 'glitch') {
      var strips = 16, hh = h / strips;
      for (i = 0; i < strips; i++) {
        var off = (rnd(f.seed, i) * 2 - 1) * (1 - e) * w * 0.55;
        ctx.globalAlpha = clamp(e * 1.3, 0, 1);
        ctx.fillRect(off, i * hh, w, hh + 1);
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'dissolve') {
      var cx = 18, cy = 10, cw = w / cx, ch = h / cy;
      for (i = 0; i < cx; i++) {
        for (var j = 0; j < cy; j++) {
          if (rnd(f.seed, i * 41 + j * 7) < e * 1.18) ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
        }
      }
    } else {
      ctx.globalAlpha = e;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function injectStyles() {
    if (doc.getElementById(STYLE_ID)) return;
    var style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent =
      '.apex-intro-root{position:fixed;inset:0;z-index:2147483000;background:transparent;overflow:hidden}' +
      '.apex-intro-canvas{display:block;width:100%;height:100%}';
    (doc.head || doc.documentElement).appendChild(style);
  }

  function register(key, definition) {
    if (key && definition && typeof definition.draw === 'function') scenes[key] = definition;
    return scenes;
  }

  function play(options) {
    options = options || {};
    var finish = typeof options.onDone === 'function' ? options.onDone : function () {};
    var reveal = typeof options.onReveal === 'function' ? options.onReveal : function () {};
    var settled = false, revealed = false;
    function onceReveal() {
      if (settled || revealed) return;
      revealed = true;
      // The run is live from the first frame of the outro wipe, so taps have to
      // reach the game underneath while the mask is still erasing.
      root.style.pointerEvents = 'none';
      reveal();
    }
    function done() {
      if (settled) return;
      settled = true;
      onceReveal();
      finish();
    }
    var scene = scenes[options.key];
    if (!scene || options.reducedMotion || !doc.body || !doc.body.appendChild) {
      done();
      return { active: false, skip: function () {} };
    }

    injectStyles();
    var root = doc.createElement('div');
    root.className = 'apex-intro-root';
    root.setAttribute('data-intro-key', String(options.key));
    root.setAttribute('aria-hidden', 'true');
    var canvas = doc.createElement('canvas');
    canvas.className = 'apex-intro-canvas';
    root.appendChild(canvas);
    doc.body.appendChild(root);

    var ctx = canvas.getContext('2d');
    if (!ctx) { root.remove(); done(); return { active: false, skip: function () {} }; }

    var tier = options.tier || 'standard';
    var quality = tier === 'lite'
      ? { glow: false, particles: 8, detail: 0 }
      : tier === 'ultra' ? { glow: true, particles: 64, detail: 2 } : { glow: true, particles: 26, detail: 1 };

    var duration = Math.max(700, Number(scene.duration) || 1900);
    var mainMs = Math.max(320, duration - OUTRO_MS);
    var elapsed = 0, last = 0, closed = false, raf = 0;
    var w = 0, h = 0;
    var f = {
      w: 0, h: 0, t: 0, p: 0, time: 0, op: 0,
      accent: options.accent || '#38bdf8',
      title: options.title || '', tagline: options.tagline || '',
      key: String(options.key), q: quality, seed: seedOf(String(options.key))
    };

    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      w = root.clientWidth || global.innerWidth || 640;
      h = root.clientHeight || global.innerHeight || 360;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      f.w = w; f.h = h;
    }
    resize();
    global.addEventListener('resize', resize);

    function close() {
      if (closed) return;
      closed = true;
      if (raf) cancelAnimationFrame(raf);
      global.removeEventListener('resize', resize);
      global.removeEventListener('pointerdown', skip, true);
      global.removeEventListener('keydown', skip, true);
      root.remove();
      done();
    }

    function skip(event) {
      if (event && event.type === 'keydown' && event.repeat) return;
      if (closed) return;
      if (elapsed >= mainMs) { close(); return; }
      elapsed = mainMs;
    }

    function frame(now) {
      if (!last) last = now;
      elapsed += Math.min(64, now - last);
      last = now;
      var mainP = clamp(elapsed / mainMs, 0, 1);
      f.p = mainP;
      f.time = elapsed;
      f.t = elapsed;
      f.op = elapsed >= mainMs ? clamp((elapsed - mainMs) / OUTRO_MS, 0, 1) : 0;
      ctx.clearRect(0, 0, w, h);
      try {
        scene.draw(ctx, f, H);
      } catch (error) {
        if (typeof options.onError === 'function') options.onError(error);
        close();
        return;
      }
      if (f.op > 0) {
        onceReveal();
        outroMask(ctx, scene.transition, f, f.op);
      }
      if (elapsed >= duration) { close(); return; }
      raf = requestAnimationFrame(frame);
    }

    global.addEventListener('pointerdown', skip, true);
    global.addEventListener('keydown', skip, true);
    raf = requestAnimationFrame(frame);
    return { active: true, skip: skip, root: root };
  }

  global.ApexIntro = {
    version: '1.0.0',
    play: play,
    register: register,
    has: function (key) { return Boolean(scenes[key]); },
    keys: function () { return Object.keys(scenes); },
    sceneFor: function (key) { return scenes[key] || null; },
    helpers: H
  };

  /* ---------- ARCADE & CLASSICS 01-20 ---------- */

  register('glowmoth', {
    duration: 2100, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#08060f');
      H.wash(ctx, f, 'rgba(167,139,250,.55)', 0.36, f.w * 0.5, f.h * 0.42);
      var part = H.ease.outCubic(H.clamp(f.p / 0.6, 0, 1)) * f.w * 0.3;
      var slab = f.w * 0.17;
      [-1, 1].forEach(function (side) {
        var x = side < 0 ? f.w * 0.5 - slab - part : f.w * 0.5 + part;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.moveTo(x, f.h * 0.06);
        ctx.lineTo(x + slab * 0.72, f.h * 0.2);
        ctx.lineTo(x + slab, f.h * 0.86);
        ctx.lineTo(x + slab * 0.2, f.h);
        ctx.lineTo(x - slab * 0.1, f.h * 0.55);
        ctx.closePath();
        ctx.fillStyle = 'rgba(28,20,54,.95)';
        ctx.fill();
        ctx.strokeStyle = f.accent;
        ctx.lineWidth = 2;
        if (f.q.glow) { ctx.shadowColor = f.accent; ctx.shadowBlur = 18; }
        ctx.stroke();
        ctx.restore();
      });
      var fly = H.ease.outQuad(H.clamp((f.p - 0.12) / 0.62, 0, 1));
      var mx = f.w * 0.5, my = lerp(f.h * 0.88, f.h * 0.34, fly);
      var flap = Math.abs(Math.sin(f.time * 0.013));
      ctx.save();
      ctx.translate(mx, my);
      ctx.globalAlpha = 0.92;
      if (f.q.glow) { ctx.shadowColor = '#d8b4fe'; ctx.shadowBlur = 24; }
      [-1, 1].forEach(function (side) {
        ctx.save();
        ctx.scale(side * (0.45 + flap * 0.75), 1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(f.w * 0.035, -f.h * 0.05, f.w * 0.052, f.h * 0.012);
        ctx.quadraticCurveTo(f.w * 0.03, f.h * 0.045, 0, 0);
        ctx.fillStyle = 'rgba(216,180,254,.75)';
        ctx.fill();
        ctx.restore();
      });
      H.disc(ctx, 0, 0, f.h * 0.012, { fill: '#f5f3ff' });
      ctx.restore();
      H.motes(ctx, f, f.q.particles, { size: 2.2, alpha: 0.5 * H.clamp(f.p * 3, 0, 1), vertical: true, reverse: true });
      H.kicker(ctx, f, 'crystal caverns', { y: f.h * 0.24 });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.62, glow: true, start: 0.34, span: 0.42 });
      H.vignette(ctx, f.w, f.h, 0.6);
    }
  });

  register('ion-rally', {
    duration: 1900, transition: 'wipeL',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04070f');
      H.wash(ctx, f, 'rgba(56,189,248,.5)', 0.3, f.w * 0.5, f.h * 0.5);
      var mid = f.w * 0.5;
      for (var i = 0; i < 12; i++) {
        var dp = H.stagger(f.p, i, 12, 0.05, 0.4);
        H.rect(ctx, mid - 2, f.h * 0.08 + i * (f.h * 0.84 / 12), 4, f.h * 0.045, { fill: 'rgba(125,211,252,' + dp * 0.7 + ')' });
      }
      var ph = f.h * 0.22, pw = Math.max(6, f.w * 0.012);
      var slide = H.ease.outBack(H.clamp(f.p / 0.42, 0, 1));
      H.rect(ctx, lerp(-pw * 4, f.w * 0.08, slide), f.h * 0.5 - ph / 2, pw, ph, { fill: '#e0f2fe', glow: f.q.glow, stroke: f.accent, width: 2, blur: 20 });
      H.rect(ctx, lerp(f.w + pw * 4, f.w * 0.92 - pw, slide), f.h * 0.5 - ph / 2, pw, ph, { fill: '#e0f2fe', glow: f.q.glow, stroke: f.accent, width: 2, blur: 20 });
      var rally = H.clamp((f.p - 0.3) / 0.5, 0, 1);
      if (rally > 0) {
        var bounce = rally < 0.5 ? rally * 2 : 2 - rally * 2;
        var bx = lerp(f.w * 0.1, f.w * 0.9, bounce);
        var by = f.h * 0.5 + Math.sin(rally * Math.PI * 3) * f.h * 0.11;
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = f.accent; ctx.shadowBlur = 26; }
        H.disc(ctx, bx, by, Math.max(4, f.w * 0.008), { fill: '#ffffff' });
        for (var tail = 1; tail <= 6; tail++) {
          H.disc(ctx, bx - tail * f.w * 0.014, by + Math.sin(rally * Math.PI * 3 - tail * 0.3) * f.h * 0.02, Math.max(2, f.w * 0.006) * (1 - tail / 8), { fill: 'rgba(56,189,248,' + (0.5 - tail * 0.07) + ')' });
        }
        ctx.restore();
        if (rally > 0.46 && rally < 0.54) H.flash(ctx, f, 0.22, '#bae6fd');
      }
      H.kicker(ctx, f, 'ion city arena', { y: f.h * 0.28 });
      H.stamp(ctx, f, f.title, { y: f.h * 0.64, glow: true, start: 0.42 });
    }
  });

  register('ember-serpent', {
    duration: 2200, transition: 'dissolve',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0705');
      H.wash(ctx, f, 'rgba(251,146,60,.45)', 0.28, f.w * 0.35, f.h * 0.6);
      var cx = f.w * 0.5, cy = f.h * 0.48, reach = Math.min(f.w, f.h) * 0.3;
      var grow = H.ease.outCubic(H.clamp(f.p / 0.68, 0, 1));
      var pts = [], turns = 90;
      for (var i = 0; i <= turns; i++) {
        var a = (i / turns) * Math.PI * 4.2 - Math.PI / 2;
        var r = reach * (i / turns) * (1 + Math.sin(i * 0.35 + f.time * 0.002) * 0.035);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.78]);
      }
      H.path(ctx, pts, grow, { color: '#fb923c', width: Math.max(3, f.w * 0.008), glow: f.q.glow, blur: 22 });
      if (grow > 0.05) {
        var head = pts[Math.max(0, Math.floor(grow * turns))];
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 30; }
        H.disc(ctx, head[0], head[1], Math.max(4, f.w * 0.01), { fill: '#fff7ed' });
        ctx.restore();
      }
      for (var e = 0; e < Math.max(4, f.q.particles / 2); e++) {
        var ep = H.stagger(f.p, e, 10, 0.2, 0.6);
        if (ep <= 0) continue;
        var ex = cx + (H.rnd(f.seed, e) - 0.5) * f.w * 0.6;
        var ey = cy + (H.rnd(f.seed, e + 40) - 0.5) * f.h * 0.45;
        H.ring(ctx, ex, ey, f.w * 0.012 * ep, ep, { color: '#fbbf24', width: 2, alpha: 1 - ep });
      }
      H.motes(ctx, f, f.q.particles, { color: '#f59e0b', size: 2, alpha: 0.42, vertical: true });
      H.kicker(ctx, f, 'follow the fire', { y: f.h * 0.26 });
      H.drawOn(ctx, f, f.title, { y: f.h * 0.66, start: 0.4, glow: true });
      H.vignette(ctx, f.w, f.h, 0.66);
    }
  });

  register('hivefall-defense', {
    duration: 2000, transition: 'shutter',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#050807');
      H.wash(ctx, f, 'rgba(251,191,36,.4)', 0.26, f.w * 0.5, f.h * 0.3);
      var cols = 6, rows = 3, cell = Math.min(f.w / (cols + 2), f.h / 9);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = r * cols + c;
          var drop = H.ease.outBack(H.stagger(f.p, r, rows, 0.04, 0.42) * 0.9 + H.stagger(f.p, c, cols, 0.1, 0.3) * 0.1);
          if (drop <= 0) continue;
          var x = f.w * 0.5 + (c - (cols - 1) / 2) * cell * 1.25;
          var y = lerp(-cell, f.h * 0.2 + r * cell * 1.15, H.clamp(drop, 0, 1));
          ctx.save();
          ctx.globalAlpha = H.clamp(drop, 0, 1);
          ctx.fillStyle = r === 0 ? '#fde68a' : f.accent;
          if (f.q.glow) { ctx.shadowColor = f.accent; ctx.shadowBlur = 12; }
          ctx.fillRect(x - cell * 0.34, y - cell * 0.2, cell * 0.68, cell * 0.4);
          ctx.fillRect(x - cell * 0.46, y - cell * 0.05, cell * 0.12, cell * 0.22);
          ctx.fillRect(x + cell * 0.34, y - cell * 0.05, cell * 0.12, cell * 0.22);
          ctx.fillRect(x - cell * 0.16, y + cell * 0.2, cell * 0.1, cell * 0.14);
          ctx.fillRect(x + cell * 0.06, y + cell * 0.2, cell * 0.1, cell * 0.14);
          ctx.restore();
        }
      }
      var aim = H.ease.outCubic(H.clamp((f.p - 0.35) / 0.35, 0, 1));
      var tx = lerp(f.w * 0.18, f.w * 0.5, aim), ty = f.h * 0.8;
      H.rect(ctx, tx - cell * 0.42, ty, cell * 0.84, cell * 0.26, { fill: '#a3e635' });
      H.rect(ctx, tx - cell * 0.07, ty - cell * 0.24, cell * 0.14, cell * 0.24, { fill: '#bef264' });
      var shot = H.clamp((f.p - 0.72) / 0.22, 0, 1);
      if (shot > 0 && shot < 1) H.seg(ctx, tx, ty - cell * 0.24, tx, lerp(ty, f.h * 0.3, shot), 1, { color: '#fef08a', width: 3, glow: f.q.glow });
      if (shot > 0.02 && shot < 0.2) H.flash(ctx, f, 0.16, '#fef9c3');
      H.kicker(ctx, f, 'hold the line', { y: f.h * 0.93, color: '#fde68a' });
      H.stamp(ctx, f, f.title, { y: f.h * 0.6, start: 0.5, glow: true, color: '#fefce8' });
    }
  });

  register('prism-stack', {
    duration: 2100, transition: 'slats',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#07050f');
      H.wash(ctx, f, 'rgba(196,181,253,.45)', 0.3, f.w * 0.62, f.h * 0.4);
      var cell = Math.min(f.w / 13, f.h / 12);
      var ox = f.w * 0.5 - cell * 5, oy = f.h * 0.9;
      var hues = ['#c4b5fd', '#67e8f9', '#fca5a5', '#fde68a', '#86efac', '#f0abfc'];
      var blocks = [
        [0, 0, 1, 0, 2, 0], [0, 1, 1, 1, 2, 1, 3, 1], [1, 2, 2, 2, 1, 3, 2, 3],
        [0, 4, 1, 4, 2, 4, 3, 4], [4, 0, 5, 0, 5, 1, 6, 1], [4, 2, 4, 3, 5, 3, 6, 3],
        [6, 0, 7, 0, 7, 1, 7, 2], [0, 5, 1, 5, 2, 5, 3, 5]
      ];
      for (var b = 0; b < blocks.length; b++) {
        var land = H.ease.outCubic(H.stagger(f.p, b, blocks.length, 0.02, 0.62));
        if (land <= 0) continue;
        for (var c = 0; c < blocks[b].length; c += 2) {
          var gx = blocks[b][c], gy = blocks[b][c + 1];
          var y = lerp(-f.h * 0.6 - gy * cell, oy - (gy + 1) * cell, land);
          ctx.save();
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = hues[(b + gx) % hues.length];
          if (f.q.glow) { ctx.shadowColor = hues[(b + gx) % hues.length]; ctx.shadowBlur = land > 0.94 ? 4 : 16; }
          ctx.fillRect(ox + gx * cell + 1.5, y + 1.5, cell - 3, cell - 3);
          ctx.restore();
        }
      }
      var clear = H.clamp((f.p - 0.8) / 0.16, 0, 1);
      if (clear > 0) {
        ctx.save();
        ctx.globalAlpha = 1 - clear;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox, oy - cell, cell * 8, cell);
        ctx.restore();
        for (var s = 0; s < 14; s++) {
          H.disc(ctx, ox + (s % 8) * cell + cell / 2, oy - cell / 2 - clear * f.h * 0.2, cell * 0.1 * (1 - clear), { fill: 'rgba(255,255,255,' + (0.8 - clear * 0.8) + ')' });
        }
      }
      H.kicker(ctx, f, 'fit the shape', { y: f.h * 0.16 });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.3, glow: true, start: 0.3, span: 0.44, size: Math.min(f.w * 0.075, 58) });
    }
  });

  register('glow-beetle', {
    duration: 2200, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04080a');
      var mx = f.w * 0.16, my = f.h * 0.2, mw = f.w * 0.68, mh = f.h * 0.6;
      var trace = H.ease.inOutCubic(H.clamp(f.p / 0.62, 0, 1));
      ctx.save();
      ctx.strokeStyle = 'rgba(163,230,53,.85)';
      ctx.lineWidth = 2;
      if (f.q.glow) { ctx.shadowColor = '#a3e635'; ctx.shadowBlur = 14; }
      ctx.beginPath();
      ctx.rect(mx, my, mw, mh);
      ctx.stroke();
      ctx.restore();
      var corridors = 5;
      for (var i = 0; i < corridors; i++) {
        var cp = H.stagger(trace, i, corridors, 0, 0.5);
        if (cp <= 0) continue;
        var y = my + (mh / (corridors + 1)) * (i + 1);
        var dir = i % 2 ? -1 : 1;
        H.seg(ctx, dir > 0 ? mx : mx + mw, y, dir > 0 ? mx + mw * cp : mx + mw * (1 - cp), y, 1, { color: 'rgba(163,230,53,.5)', width: 2 });
        var dots = 11;
        for (var d = 0; d < dots; d++) {
          var dx = mx + mw * ((d + 0.5) / dots);
          var lit = H.clamp((cp - Math.abs((d + 0.5) / dots - (dir > 0 ? cp : 1 - cp))) * 6, 0, 1);
          if (lit > 0) H.disc(ctx, dx, y, Math.max(1.6, f.w * 0.0035) * lit, { fill: 'rgba(236,252,203,' + lit + ')' });
        }
      }
      var run = H.clamp((f.p - 0.15) / 0.6, 0, 1);
      if (run > 0) {
        var bx = mx + mw * (Math.sin(run * Math.PI * 1.5) * 0.42 + 0.5);
        var by = my + mh * 0.12;
        var jaw = Math.abs(Math.sin(f.time * 0.014));
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = '#a3e635';
        if (f.q.glow) { ctx.shadowColor = '#a3e635'; ctx.shadowBlur = 20; }
        ctx.beginPath();
        ctx.arc(0, 0, f.w * 0.016, (0.2 + jaw * 0.28) * Math.PI, (1.8 - jaw * 0.28) * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();
      }
      H.scanlines(ctx, f.w, f.h, 0.12, 3);
      H.kicker(ctx, f, 'light every corridor', { y: f.h * 0.88, color: '#a3e635' });
      H.stamp(ctx, f, f.title, { y: f.h * 0.5, start: 0.55, glow: true, color: '#ecfccb' });
    }
  });

  register('starfall-rift', {
    duration: 2100, transition: 'glitch',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#03040c');
      H.wash(ctx, f, 'rgba(167,139,250,.4)', 0.3, f.w * 0.4, f.h * 0.55);
      H.motes(ctx, f, f.q.particles, { color: '#c7d2fe', size: 1.8, alpha: 0.7, motion: false });
      var rockCount = Math.max(5, Math.min(11, f.q.particles));
      for (var r = 0; r < rockCount; r++) {
        var rp = H.ease.outCubic(H.stagger(f.p, r, rockCount, 0.05, 0.6));
        if (rp <= 0) continue;
        var fromLeft = H.rnd(f.seed, r) > 0.5;
        var rx = lerp(fromLeft ? -f.w * 0.15 : f.w * 1.15, f.w * (0.12 + H.rnd(f.seed, r + 30) * 0.76), rp);
        var ry = f.h * (0.1 + H.rnd(f.seed, r + 60) * 0.8);
        H.poly(ctx, rx, ry, Math.max(6, f.w * 0.012 + H.rnd(f.seed, r + 90) * f.w * 0.02), 7, {
          rot: f.time * 0.0004 + r, stroke: 'rgba(196,181,253,.75)', width: 1.6, alpha: rp
        });
      }
      var ship = f.w * 0.5, sy = f.h * 0.55, s = Math.min(f.w, f.h) * 0.075;
      var draw = H.ease.outCubic(H.clamp(f.p / 0.5, 0, 1));
      var hull = [[ship, sy - s], [ship + s * 0.72, sy + s * 0.8], [ship, sy + s * 0.42], [ship - s * 0.72, sy + s * 0.8]];
      ctx.save();
      ctx.globalAlpha = draw;
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      if (f.q.glow) { ctx.shadowColor = f.accent; ctx.shadowBlur = 16; }
      ctx.beginPath();
      ctx.moveTo(hull[0][0], hull[0][1]);
      for (var v = 1; v <= 4; v++) {
        var pt = hull[v % 4];
        ctx.lineTo(pt[0], pt[1]);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      var streak = H.clamp((f.p - 0.62) / 0.3, 0, 1);
      if (streak > 0 && streak < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - streak;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        for (var l = 0; l < 22; l++) {
          var a = (l / 22) * Math.PI * 2;
          var r0 = f.w * 0.05 + streak * f.w * 0.7;
          ctx.beginPath();
          ctx.moveTo(ship + Math.cos(a) * r0 * 0.5, sy + Math.sin(a) * r0 * 0.4);
          ctx.lineTo(ship + Math.cos(a) * r0, sy + Math.sin(a) * r0 * 0.8);
          ctx.stroke();
        }
        ctx.restore();
      }
      H.kicker(ctx, f, 'thread the debris', { y: f.h * 0.2 });
      H.drawOn(ctx, f, f.title, { y: f.h * 0.82, start: 0.42 });
    }
  });

  register('fox-courier', {
    duration: 2300, transition: 'curtain',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0b0f1c');
      H.wash(ctx, f, 'rgba(251,146,60,.5)', 0.34, f.w * 0.7, f.h * 0.3);
      var scroll = H.ease.inOutCubic(H.clamp(f.p / 0.78, 0, 1)) * f.w * 0.55;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#1e293b';
      for (var h = 0; h < 4; h++) {
        var hx = ((h * f.w * 0.34 - scroll * (0.25 + h * 0.12)) % (f.w * 1.4) + f.w * 1.4) % (f.w * 1.4) - f.w * 0.2;
        ctx.beginPath();
        ctx.moveTo(hx, f.h * 0.72);
        ctx.quadraticCurveTo(hx + f.w * 0.12, f.h * 0.42 - h * f.h * 0.02, hx + f.w * 0.26, f.h * 0.72);
        ctx.fill();
      }
      ctx.restore();
      var groundY = f.h * 0.74;
      H.rect(ctx, 0, groundY, f.w, f.h * 0.06, { fill: '#166534' });
      H.rect(ctx, 0, groundY + f.h * 0.06, f.w, f.h * 0.2, { fill: '#78350f' });
      for (var b = 0; b < 3; b++) {
        var bx = ((b * f.w * 0.42 + f.w * 0.18 - scroll) % (f.w * 1.3) + f.w * 1.3) % (f.w * 1.3) - f.w * 0.1;
        H.rect(ctx, bx, groundY - f.h * 0.16, f.w * 0.035, f.h * 0.16, { fill: '#15803d' });
        H.rect(ctx, bx - f.w * 0.012, groundY - f.h * 0.16, f.w * 0.059, f.h * 0.022, { fill: '#22c55e' });
      }
      var run = H.ease.outCubic(H.clamp((f.p - 0.1) / 0.6, 0, 1));
      var fx = lerp(f.w * 0.12, f.w * 0.58, run);
      var hop = Math.abs(Math.sin(run * Math.PI * 2.2)) * f.h * 0.12;
      ctx.save();
      ctx.translate(fx, groundY - f.h * 0.045 - hop);
      ctx.fillStyle = '#fb923c';
      if (f.q.glow) { ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 18; }
      ctx.beginPath();
      ctx.ellipse(0, 0, f.w * 0.022, f.h * 0.03, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-f.w * 0.02, -f.h * 0.02);
      ctx.lineTo(-f.w * 0.032, -f.h * 0.05);
      ctx.lineTo(-f.w * 0.008, -f.h * 0.032);
      ctx.moveTo(f.w * 0.02, -f.h * 0.02);
      ctx.lineTo(f.w * 0.032, -f.h * 0.05);
      ctx.lineTo(f.w * 0.008, -f.h * 0.032);
      ctx.fill();
      ctx.restore();
      var flag = H.ease.outBack(H.clamp((f.p - 0.55) / 0.3, 0, 1));
      if (flag > 0) {
        var px = f.w * 0.82;
        H.seg(ctx, px, groundY, px, groundY - f.h * 0.24 * flag, 1, { color: '#e2e8f0', width: 3 });
        ctx.save();
        ctx.globalAlpha = flag;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(px, groundY - f.h * 0.24 * flag);
        ctx.lineTo(px + f.w * 0.05, groundY - f.h * 0.21 * flag);
        ctx.lineTo(px, groundY - f.h * 0.18 * flag);
        ctx.fill();
        ctx.restore();
      }
      H.kicker(ctx, f, 'three lively routes', { y: f.h * 0.2 });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.36, glow: true, start: 0.36, span: 0.4, color: '#ffedd5', glowColor: '#fb923c' });
    }
  });

  register('cloudhop-pip', {
    duration: 1950, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#071322');
      H.wash(ctx, f, 'rgba(103,232,249,.45)', 0.36, f.w * 0.5, f.h * 0.35);
      for (var i = 0; i < 5; i++) {
        var cp = H.ease.outBack(H.stagger(f.p, i, 5, 0.02, 0.5));
        if (cp <= 0) continue;
        var cxp = lerp(i % 2 ? f.w * 1.2 : -f.w * 0.2, f.w * (0.16 + i * 0.17), cp);
        var cyp = f.h * (0.42 + (i % 3) * 0.13) + Math.sin(f.time * 0.0016 + i) * f.h * 0.012;
        ctx.save();
        ctx.globalAlpha = 0.85 * cp;
        ctx.fillStyle = i % 2 ? 'rgba(224,242,254,.9)' : 'rgba(165,243,252,.8)';
        ctx.beginPath();
        ctx.arc(cxp, cyp, f.w * 0.045, 0, Math.PI * 2);
        ctx.arc(cxp + f.w * 0.05, cyp + f.h * 0.01, f.w * 0.035, 0, Math.PI * 2);
        ctx.arc(cxp - f.w * 0.045, cyp + f.h * 0.012, f.w * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      var hop = H.clamp((f.p - 0.3) / 0.5, 0, 1);
      if (hop > 0) {
        var arc = hop < 0.5 ? hop * 2 : 2 - hop * 2;
        var bx = lerp(f.w * 0.18, f.w * 0.82, hop);
        var by = f.h * 0.4 - Math.sin(arc * Math.PI) * f.h * 0.16;
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 22; }
        H.disc(ctx, bx, by, Math.max(4, f.w * 0.012), { fill: '#ecfeff' });
        ctx.restore();
        for (var sp = 0; sp < 6; sp++) {
          H.disc(ctx, bx - sp * f.w * 0.012, by + sp * f.h * 0.006, Math.max(1.5, f.w * 0.004) * (1 - sp / 7), { fill: 'rgba(103,232,249,' + (0.6 - sp * 0.09) + ')' });
        }
      }
      H.motes(ctx, f, f.q.particles / 2, { color: '#a5f3fc', size: 2, alpha: 0.4 });
      H.kicker(ctx, f, 'find the safe route', { y: f.h * 0.72, color: '#a5f3fc' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.26, glow: true, start: 0.28, span: 0.4, color: '#ecfeff', glowColor: '#67e8f9' });
    }
  });

  register('rollo-rush', {
    duration: 2000, transition: 'shutter',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0a06');
      H.wash(ctx, f, 'rgba(250,204,21,.42)', 0.3, f.w * 0.5, f.h * 0.55);
      var horizon = f.h * 0.58;
      var rush = H.ease.inOutCubic(H.clamp(f.p / 0.7, 0, 1));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizon, f.w, f.h - horizon);
      ctx.clip();
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, horizon, f.w, f.h);
      var tile = f.w * 0.09;
      for (var row = 0; row < 6; row++) {
        var depth = 0.25 + row * 0.16;
        var offset = ((f.time * 0.0009 * (1 + row * 0.5) * (0.2 + rush)) % 1) * tile * 2;
        for (var col = -2; col < f.w / (tile * depth) + 2; col++) {
          if ((col + row) % 2) continue;
          ctx.fillStyle = 'rgba(250,204,21,' + (0.1 + row * 0.03) + ')';
          ctx.fillRect(col * tile * depth * 2 - offset * depth, horizon + row * f.h * 0.07, tile * depth, f.h * 0.06);
        }
      }
      ctx.restore();
      var spin = f.time * 0.02 * (0.15 + rush * 1.6);
      var wx = f.w * 0.5, wy = horizon - f.h * 0.12, wr = Math.min(f.w, f.h) * 0.13;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(spin);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = Math.max(3, wr * 0.14);
      if (f.q.glow) { ctx.shadowColor = '#facc15'; ctx.shadowBlur = 20; }
      ctx.beginPath();
      ctx.arc(0, 0, wr, 0, Math.PI * 2);
      ctx.stroke();
      for (var spoke = 0; spoke < 4; spoke++) {
        var sa = (spoke / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * wr * 0.2, Math.sin(sa) * wr * 0.2);
        ctx.lineTo(Math.cos(sa) * wr * 0.9, Math.sin(sa) * wr * 0.9);
        ctx.stroke();
      }
      ctx.restore();
      if (rush > 0.35) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        for (var sl = 0; sl < 9; sl++) {
          var sly = f.h * (0.1 + sl * 0.09);
          var slx = ((f.time * 0.004 * (1 + sl * 0.2)) % (f.w * 1.4));
          ctx.beginPath();
          ctx.moveTo(f.w * 1.4 - slx, sly);
          ctx.lineTo(f.w * 1.4 - slx - f.w * 0.16 * rush, sly);
          ctx.stroke();
        }
        ctx.restore();
      }
      H.scanlines(ctx, f.w, f.h, 0.14, 4);
      H.stamp(ctx, f, f.title, { y: f.h * 0.24, start: 0.42, glow: true, color: '#fefce8' });
      H.kicker(ctx, f, 'keep your momentum', { y: f.h * 0.9, color: '#fde68a' });
    }
  });

  register('iron-circuit', {
    duration: 2100, transition: 'glitch',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#05070d');
      H.wash(ctx, f, 'rgba(34,211,238,.42)', 0.3, f.w * 0.5, f.h * 0.6);
      var floor = f.h * 0.78;
      H.seg(ctx, 0, floor, f.w, floor, H.clamp(f.p / 0.3, 0, 1), { color: 'rgba(34,211,238,.7)', width: 2 });
      for (var g = 0; g < 10; g++) {
        H.seg(ctx, f.w * 0.5, floor, (g - 4.5) * f.w * 0.16 + f.w * 0.5, f.h, H.clamp((f.p - 0.05) / 0.3, 0, 1), { color: 'rgba(34,211,238,.16)', width: 1.5 });
      }
      var clash = H.ease.inOutCubic(H.clamp((f.p - 0.08) / 0.42, 0, 1));
      var bus = H.ease.outCubic(H.clamp(f.p / 0.36, 0, 1));
      for (var t = 0; t < 6; t++) {
        var ty = f.h * (0.08 + t * 0.026);
        var knee = f.w * (t % 2 ? 0.86 - t * 0.03 : 0.14 + t * 0.03);
        var edge = t % 2 ? f.w : 0;
        var run = H.clamp((bus - t * 0.06) / 0.6, 0, 1);
        H.seg(ctx, edge, ty, edge + (knee - edge) * run, ty, run, { color: 'rgba(34,211,238,.3)', width: 1.5 });
        var drop = H.clamp((bus - 0.35 - t * 0.05) / 0.5, 0, 1);
        if (drop > 0) H.seg(ctx, knee, ty, knee, ty + (f.h * 0.24 - ty) * drop, drop, { color: 'rgba(34,211,238,.22)', width: 1.5 });
        if (run > 0.9) H.disc(ctx, knee, ty, Math.min(f.w, f.h) * 0.006, { fill: '#a5f3fc', alpha: 0.5 });
      }
      var size = Math.min(f.w, f.h) * 0.2;
      [-1, 1].forEach(function (side) {
        var x = lerp(side < 0 ? -size : f.w + size, f.w * 0.5 + side * size * 1.15, clash);
        ctx.save();
        ctx.translate(x, floor - size * 0.5);
        ctx.scale(side, 1);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = side < 0 ? '#22d3ee' : '#f472b6';
        ctx.lineWidth = 3;
        if (f.q.glow) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18; }
        ctx.beginPath();
        ctx.arc(0, -size * 0.3, size * 0.13, 0, Math.PI * 2);
        ctx.moveTo(-size * 0.12, -size * 0.16);
        ctx.lineTo(size * 0.1, -size * 0.1);
        ctx.lineTo(size * 0.02, size * 0.12);
        ctx.lineTo(-size * 0.16, size * 0.24);
        ctx.moveTo(size * 0.1, -size * 0.1);
        ctx.lineTo(size * 0.34, size * 0.02);
        ctx.stroke();
        ctx.restore();
      });
      var spark = H.clamp((f.p - 0.5) / 0.18, 0, 1);
      if (spark > 0 && spark < 1) {
        H.flash(ctx, f, (1 - spark) * 0.4, '#ffffff');
        for (var s = 0; s < 16; s++) {
          var sa = (s / 16) * Math.PI * 2 + f.time * 0.004;
          var sr = f.w * 0.02 + spark * f.w * 0.1;
          H.seg(ctx, f.w * 0.5 + Math.cos(sa) * sr * 0.3, floor - size * 0.5 + Math.sin(sa) * sr * 0.3,
            f.w * 0.5 + Math.cos(sa) * sr, floor - size * 0.5 + Math.sin(sa) * sr, 1,
            { color: 'rgba(255,255,255,' + (1 - spark) + ')', width: 2 });
        }
      }
      var rift = H.clamp((f.p - 0.62) / 0.2, 0, 1);
      if (rift > 0 && rift < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - rift;
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (var z = 0; z < 8; z++) {
          var zx = f.w * 0.2 + z * f.w * 0.075;
          var zy = f.h * 0.28 + (z % 2 ? -1 : 1) * f.h * 0.05 * (1 - rift);
          if (!z) ctx.moveTo(zx, zy); else ctx.lineTo(zx, zy);
        }
        ctx.stroke();
        ctx.restore();
      }
      H.stamp(ctx, f, 'FIGHT', { y: f.h * 0.42, start: 0.6, glow: true, color: '#ffffff', size: Math.min(f.w * 0.2, f.h * 0.22) });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.88, glow: true, start: 0.4, span: 0.4, size: Math.min(f.w * 0.07, 54), color: '#cffafe' });
    }
  });

  register('clockwork-dawn', {
    duration: 2300, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0b0904');
      var dawn = H.ease.outCubic(H.clamp(f.p / 0.7, 0, 1));
      H.wash(ctx, f, 'rgba(251,191,36,.6)', 0.2 + dawn * 0.3, f.w * 0.5, f.h * (0.72 - dawn * 0.22), Math.max(f.w, f.h) * 0.8);
      var cx = f.w * 0.5, cy = f.h * 0.46;
      var gears = [
        [cx - f.w * 0.14, cy - f.h * 0.04, f.w * 0.11, 12, 1],
        [cx + f.w * 0.13, cy + f.h * 0.02, f.w * 0.09, 9, -1],
        [cx, cy + f.h * 0.17, f.w * 0.07, 8, 1]
      ];
      gears.forEach(function (g, i) {
        var gp = H.ease.outBack(H.stagger(f.p, i, gears.length, 0.02, 0.5));
        if (gp <= 0) return;
        ctx.save();
        ctx.translate(g[0], g[1]);
        ctx.rotate(f.time * 0.0006 * g[4] + i);
        ctx.globalAlpha = gp;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = Math.max(2, g[2] * 0.09);
        if (f.q.glow) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14; }
        ctx.beginPath();
        for (var t = 0; t < g[3] * 2; t++) {
          var a = (t / (g[3] * 2)) * Math.PI * 2;
          var rr = g[2] * (t % 2 ? 0.78 : 1) * gp;
          var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          if (!t) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, g[2] * 0.24 * gp, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      var banner = H.ease.outCubic(H.clamp((f.p - 0.35) / 0.4, 0, 1));
      if (banner > 0) {
        var bw = f.w * 0.44 * banner, bh = f.h * 0.16;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(30,20,4,.85)';
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.w * 0.5 - bw / 2, f.h * 0.16);
        ctx.lineTo(f.w * 0.5 + bw / 2, f.h * 0.16);
        ctx.lineTo(f.w * 0.5 + bw / 2, f.h * 0.16 + bh);
        ctx.lineTo(f.w * 0.5, f.h * 0.16 + bh * 1.22);
        ctx.lineTo(f.w * 0.5 - bw / 2, f.h * 0.16 + bh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      H.motes(ctx, f, f.q.particles / 2, { color: '#fde68a', size: 2, alpha: 0.45, vertical: true });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.24, glow: true, start: 0.5, span: 0.4, color: '#fef3c7', size: Math.min(f.w * 0.07, 52) });
      H.kicker(ctx, f, 'beyond the last dark hour', { y: f.h * 0.86, color: '#fcd34d' });
    }
  });

  register('lanternbound', {
    duration: 2300, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#060505');
      var swing = Math.sin(H.clamp(f.p / 0.6, 0, 1) * Math.PI * 2.4) * 0.22 * (1 - f.p * 0.6);
      var lx = f.w * 0.5 + Math.sin(swing) * f.h * 0.2;
      var ly = f.h * 0.34 + Math.cos(swing) * f.h * 0.02;
      var open = H.ease.outCubic(H.clamp((f.p - 0.1) / 0.55, 0, 1));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var cone = ctx.createRadialGradient(lx, ly, 0, lx, ly, f.w * 0.55 * open);
      cone.addColorStop(0, 'rgba(245,158,11,.55)');
      cone.addColorStop(0.4, 'rgba(245,158,11,.16)');
      cone.addColorStop(1, 'rgba(245,158,11,0)');
      ctx.fillStyle = cone;
      ctx.fillRect(0, 0, f.w, f.h);
      ctx.restore();
      H.seg(ctx, f.w * 0.5, 0, lx, ly - f.h * 0.05, H.clamp(f.p / 0.2, 0, 1), { color: '#78716c', width: 2 });
      ctx.save();
      ctx.translate(lx, ly);
      ctx.globalAlpha = H.clamp(f.p / 0.25, 0, 1);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.4;
      if (f.q.glow) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 22; }
      ctx.beginPath();
      ctx.moveTo(-f.w * 0.022, -f.h * 0.045);
      ctx.lineTo(f.w * 0.022, -f.h * 0.045);
      ctx.lineTo(f.w * 0.03, f.h * 0.045);
      ctx.lineTo(-f.w * 0.03, f.h * 0.045);
      ctx.closePath();
      ctx.stroke();
      H.disc(ctx, 0, 0, f.w * 0.012, { fill: '#fde68a' });
      ctx.restore();
      var arches = 5;
      for (var a = 0; a < arches; a++) {
        var ap = H.stagger(open, a, arches, 0.1, 0.6);
        if (ap <= 0) continue;
        var ax = f.w * (0.1 + a * 0.2), aw = f.w * 0.12, ah = f.h * 0.42;
        ctx.save();
        ctx.globalAlpha = ap * 0.55;
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax - aw / 2, f.h * 0.9);
        ctx.lineTo(ax - aw / 2, f.h * 0.9 - ah);
        ctx.quadraticCurveTo(ax, f.h * 0.9 - ah - aw * 0.55, ax + aw / 2, f.h * 0.9 - ah);
        ctx.lineTo(ax + aw / 2, f.h * 0.9);
        ctx.stroke();
        ctx.restore();
      }
      H.motes(ctx, f, f.q.particles, { color: '#fbbf24', size: 1.8, alpha: 0.4, vertical: true });
      H.vignette(ctx, f.w, f.h, 0.9);
      H.kicker(ctx, f, 'a small light', { y: f.h * 0.72, color: '#fbbf24' });
      H.drawOn(ctx, f, f.title, { y: f.h * 0.82, start: 0.5, color: '#f59e0b' });
    }
  });

  register('deepcore-drifter', {
    duration: 2150, transition: 'wipeU',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#03080c');
      var cx = f.w * 0.5, cy = f.h * 0.5, R = Math.min(f.w, f.h) * 0.34;
      H.wash(ctx, f, 'rgba(34,211,238,.35)', 0.24, cx, cy, R * 1.8);
      for (var ring = 1; ring <= 4; ring++) {
        H.ring(ctx, cx, cy, R * ring / 4, H.ease.outCubic(H.clamp(f.p / 0.45, 0, 1)), { color: 'rgba(34,211,238,.4)', width: 1.4 });
      }
      H.seg(ctx, cx - R, cy, cx + R, cy, H.clamp(f.p / 0.4, 0, 1), { color: 'rgba(34,211,238,.25)', width: 1 });
      H.seg(ctx, cx, cy - R, cx, cy + R, H.clamp(f.p / 0.4, 0, 1), { color: 'rgba(34,211,238,.25)', width: 1 });
      var sweep = H.clamp(f.p / 0.85, 0, 1) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      var beam = ctx.createLinearGradient(0, 0, R, 0);
      beam.addColorStop(0, 'rgba(34,211,238,.5)');
      beam.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      var cave = [];
      for (var p = 0; p <= 24; p++) {
        var ca = (p / 24) * Math.PI * 2;
        var cr = R * (0.62 + Math.sin(ca * 3.2 + 1.1) * 0.16 + Math.cos(ca * 5) * 0.08);
        cave.push([cx + Math.cos(ca) * cr, cy + Math.sin(ca) * cr * 0.86]);
      }
      H.path(ctx, cave, H.ease.outCubic(H.clamp((f.p - 0.15) / 0.55, 0, 1)), { color: 'rgba(148,233,255,.55)', width: 2 });
      for (var b = 0; b < 5; b++) {
        var blipAngle = (b * 1.31 + 0.4) % (Math.PI * 2);
        var diff = Math.abs(((sweep + Math.PI * 2) % (Math.PI * 2)) - ((blipAngle - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)));
        var lit = H.clamp(1 - diff * 3.2, 0, 1);
        if (lit > 0 && f.p > 0.2) {
          var br = R * (0.3 + H.rnd(f.seed, b) * 0.55);
          H.disc(ctx, cx + Math.cos(blipAngle - Math.PI / 2) * br, cy + Math.sin(blipAngle - Math.PI / 2) * br * 0.86, Math.max(3, f.w * 0.006), { fill: 'rgba(103,232,249,' + lit + ')', glow: f.q.glow });
        }
      }
      H.kicker(ctx, f, 'read the cave', { y: f.h * 0.88, color: '#67e8f9' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.14, glow: true, start: 0.45, span: 0.4, color: '#cffafe', size: Math.min(f.w * 0.065, 48) });
    }
  });

  register('hollowbell', {
    duration: 2250, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#080a0c');
      H.wash(ctx, f, 'rgba(214,165,111,.35)', 0.26, f.w * 0.5, f.h * 0.45);
      for (var band = 0; band < 4; band++) {
        var bp = H.stagger(f.p, band, 4, 0, 0.5);
        ctx.save();
        ctx.globalAlpha = 0.14 * bp;
        ctx.fillStyle = '#cbd5e1';
        var by = f.h * (0.3 + band * 0.17) + Math.sin(f.time * 0.0007 + band) * f.h * 0.02;
        ctx.beginPath();
        ctx.ellipse(f.w * 0.5, by, f.w * 0.6, f.h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      var bx = f.w * 0.5, byy = f.h * 0.42, s = Math.min(f.w, f.h) * 0.13;
      var rise = H.ease.outCubic(H.clamp(f.p / 0.5, 0, 1));
      ctx.save();
      ctx.translate(bx, byy + (1 - rise) * f.h * 0.1);
      ctx.globalAlpha = rise;
      ctx.strokeStyle = '#d6a56f';
      ctx.lineWidth = 2.6;
      if (f.q.glow) { ctx.shadowColor = '#d6a56f'; ctx.shadowBlur = 16; }
      ctx.beginPath();
      ctx.moveTo(-s * 0.72, s * 0.5);
      ctx.quadraticCurveTo(-s * 0.55, -s * 0.05, -s * 0.38, -s * 0.44);
      ctx.quadraticCurveTo(0, -s * 1.05, s * 0.38, -s * 0.44);
      ctx.quadraticCurveTo(s * 0.55, -s * 0.05, s * 0.72, s * 0.5);
      ctx.closePath();
      ctx.stroke();
      H.seg(ctx, -s * 0.86, s * 0.54, s * 0.86, s * 0.54, 1, { color: '#d6a56f', width: 2.4 });
      ctx.restore();
      var toll = H.clamp((f.p - 0.5) / 0.42, 0, 1);
      if (toll > 0) {
        for (var w = 0; w < 3; w++) {
          var wp = H.clamp(toll * 1.6 - w * 0.28, 0, 1);
          if (wp > 0 && wp < 1) H.ring(ctx, bx, byy, s * (0.9 + wp * 3.2), 1, { color: 'rgba(214,165,111,' + (0.45 - wp * 0.45) + ')', width: 1.6 });
        }
      }
      H.motes(ctx, f, f.q.particles / 2, { color: '#e2e8f0', size: 1.6, alpha: 0.3, vertical: true });
      H.kicker(ctx, f, 'a quiet, misted world', { y: f.h * 0.78, color: '#d6a56f' });
      H.drawOn(ctx, f, f.title, { y: f.h * 0.86, start: 0.55, color: '#d6a56f' });
      H.vignette(ctx, f.w, f.h, 0.78);
    }
  });

  register('skyfall-ridge', {
    duration: 2100, transition: 'slats',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#040a12');
      H.wash(ctx, f, 'rgba(125,211,252,.4)', 0.3, f.w * 0.35, f.h * 0.3);
      var ridge = [];
      for (var i = 0; i <= 22; i++) {
        var t2 = i / 22;
        ridge.push([f.w * (0.06 + t2 * 0.88), f.h * (0.82 - t2 * 0.5 - Math.sin(t2 * Math.PI * 2.1) * f.h * 0.09)]);
      }
      H.path(ctx, ridge, H.ease.outCubic(H.clamp(f.p / 0.55, 0, 1)), { color: '#7dd3fc', width: 2.6, glow: f.q.glow });
      ctx.save();
      ctx.globalAlpha = 0.25 * H.clamp((f.p - 0.1) / 0.4, 0, 1);
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(ridge[0][0], f.h);
      ridge.forEach(function (pt) { ctx.lineTo(pt[0], pt[1]); });
      ctx.lineTo(ridge[ridge.length - 1][0], f.h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      var dash = H.clamp((f.p - 0.4) / 0.45, 0, 1);
      if (dash > 0) {
        var dpts = [];
        for (var d = 0; d <= 16; d++) {
          var dt = d / 16;
          var idx = Math.min(ridge.length - 1, Math.floor(dt * (ridge.length - 1)));
          var base = ridge[idx];
          dpts.push([base[0], base[1] - Math.abs(Math.sin(dt * Math.PI * 3)) * f.h * 0.09 * (1 - dt * 0.4)]);
        }
        H.path(ctx, dpts, dash, { color: '#e0f2fe', width: 2, alpha: 0.85 });
        var head = dpts[Math.floor(dash * (dpts.length - 1))];
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#bae6fd'; ctx.shadowBlur = 22; }
        H.disc(ctx, head[0], head[1], Math.max(3.5, f.w * 0.007), { fill: '#ffffff' });
        ctx.restore();
      }
      H.motes(ctx, f, f.q.particles, { color: '#e0f2fe', size: 2, alpha: 0.5, vertical: true });
      H.kicker(ctx, f, 'one bright ridge', { y: f.h * 0.18 });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.3, glow: true, start: 0.42, span: 0.4, color: '#f0f9ff', glowColor: '#38bdf8', size: Math.min(f.w * 0.07, 52) });
    }
  });

  register('stormcap-showdown', {
    duration: 2200, transition: 'glitch',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0a0f');
      var strike = 0;
      [0.18, 0.42, 0.66].forEach(function (at, i) {
        var d = f.p - at;
        if (d > 0 && d < 0.12) strike = Math.max(strike, 1 - d / 0.12);
      });
      H.wash(ctx, f, 'rgba(253,224,71,.4)', 0.18 + strike * 0.3, f.w * 0.5, f.h * 0.3);
      var cloud = H.ease.outCubic(H.clamp(f.p / 0.4, 0, 1));
      ctx.save();
      ctx.globalAlpha = 0.9 * cloud;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(f.w * 0.4, f.h * 0.3, f.w * 0.1 * cloud, 0, Math.PI * 2);
      ctx.arc(f.w * 0.56, f.h * 0.26, f.w * 0.12 * cloud, 0, Math.PI * 2);
      ctx.arc(f.w * 0.72, f.h * 0.32, f.w * 0.09 * cloud, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (strike > 0) {
        ctx.save();
        ctx.globalAlpha = strike;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = f.q.glow ? 24 : 0;
        ctx.beginPath();
        var lz = f.w * 0.56, ly = f.h * 0.34;
        ctx.moveTo(lz, ly);
        for (var z = 0; z < 5; z++) {
          lz += (H.rnd(f.seed, z) - 0.5) * f.w * 0.08;
          ly += f.h * 0.09;
          ctx.lineTo(lz, ly);
        }
        ctx.stroke();
        ctx.restore();
        H.flash(ctx, f, strike * 0.3, '#fefce8');
      }
      var rain = H.clamp((f.p - 0.2) / 0.5, 0, 1);
      if (rain > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 * rain;
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.4;
        for (var r = 0; r < Math.max(10, f.q.particles); r++) {
          var rx = H.rnd(f.seed, r * 5) * f.w;
          var ry = ((H.rnd(f.seed, r * 5 + 1) + f.time * 0.0016) % 1) * f.h;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - f.w * 0.008, ry + f.h * 0.035);
          ctx.stroke();
        }
        ctx.restore();
      }
      var eye = H.clamp((f.p - 0.6) / 0.3, 0, 1);
      if (eye > 0) {
        H.ring(ctx, f.w * 0.56, f.h * 0.62, f.w * 0.06, eye, { color: '#fde047', width: 3, glow: f.q.glow });
        H.disc(ctx, f.w * 0.56, f.h * 0.62, f.w * 0.02 * eye, { fill: '#fef08a', glow: f.q.glow });
      }
      H.stamp(ctx, f, f.title, { y: f.h * 0.82, start: 0.55, glow: true, color: '#fefce8', size: Math.min(f.w * 0.075, 54) });
    }
  });

  register('ashen-descent', {
    duration: 2150, transition: 'wipeU',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0c0608');
      var drop = H.ease.inOutCubic(H.clamp(f.p / 0.72, 0, 1));
      H.wash(ctx, f, 'rgba(251,113,133,.4)', 0.22, f.w * 0.5, f.h * (0.2 + drop * 0.5));
      var cell = Math.min(f.w / 8, f.h / 7);
      ctx.save();
      ctx.translate(0, -drop * cell * 4 + cell * 2);
      for (var r = -1; r < 9; r++) {
        for (var c = 0; c < 8; c++) {
          if (H.rnd(f.seed, r * 8 + c) > 0.42) continue;
          var x = f.w * 0.5 + (c - 3.5) * cell;
          var y = f.h * 0.5 + (r - 4) * cell;
          ctx.globalAlpha = 0.5 - Math.abs(r - 4) * 0.05;
          ctx.strokeStyle = 'rgba(251,113,133,.5)';
          ctx.lineWidth = 1.4;
          ctx.strokeRect(x, y, cell * 0.94, cell * 0.94);
        }
      }
      ctx.restore();
      var door = H.clamp((f.p - 0.3) / 0.4, 0, 1);
      if (door > 0) {
        var dw = cell * 1.5, dh = cell * 2.4, dx = f.w * 0.5 - dw / 2, dy = f.h * 0.52;
        ctx.save();
        ctx.globalAlpha = door;
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 3;
        if (f.q.glow) { ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 20 * door; }
        ctx.strokeRect(dx, dy - dh * door, dw, dh * door);
        ctx.restore();
      }
      for (var e = 0; e < Math.max(8, f.q.particles); e++) {
        var ep = ((H.rnd(f.seed, e) + f.time * 0.00035) % 1);
        ctx.save();
        ctx.globalAlpha = (1 - ep) * 0.6 * H.clamp(f.p * 3, 0, 1);
        ctx.fillStyle = e % 3 ? '#fb923c' : '#fb7185';
        ctx.fillRect(H.rnd(f.seed, e + 50) * f.w, f.h * (1 - ep), 2.4, 2.4);
        ctx.restore();
      }
      H.kicker(ctx, f, 'survive the next room', { y: f.h * 0.86, color: '#fda4af' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.2, glow: true, start: 0.45, span: 0.4, color: '#ffe4e6', glowColor: '#fb7185', size: Math.min(f.w * 0.07, 50) });
      H.vignette(ctx, f.w, f.h, 0.7);
    }
  });

  register('lumen-sprite', {
    duration: 2250, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#070510');
      var cx = f.w * 0.5, cy = f.h * 0.48;
      var bloom = H.ease.outCubic(H.clamp(f.p / 0.62, 0, 1));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, f.w * 0.4 * bloom);
      glow.addColorStop(0, 'rgba(240,171,252,.85)');
      glow.addColorStop(0.35, 'rgba(192,132,252,.3)');
      glow.addColorStop(1, 'rgba(112,26,117,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, f.w, f.h);
      ctx.restore();
      for (var t = 0; t < 6; t++) {
        var tp = H.stagger(bloom, t, 6, 0.2, 0.6);
        if (tp <= 0) continue;
        var tx = f.w * (0.12 + t * 0.15);
        ctx.save();
        ctx.globalAlpha = tp * 0.6;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, f.h);
        ctx.quadraticCurveTo(tx + f.w * 0.02, f.h * (1 - tp * 0.5), tx - f.w * 0.01, f.h * (1 - tp * 0.72));
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(tx - f.w * 0.01, f.h * (1 - tp * 0.74), f.w * 0.02 * tp, f.h * 0.03 * tp, -0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240,171,252,.35)';
        ctx.fill();
        ctx.restore();
      }
      var pulse = 1 + Math.sin(f.time * 0.006) * 0.12;
      ctx.save();
      if (f.q.glow) { ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 34; }
      H.disc(ctx, cx, cy, Math.max(5, f.w * 0.018) * bloom * pulse, { fill: '#fdf4ff' });
      ctx.restore();
      var rays = H.clamp((f.p - 0.5) / 0.35, 0, 1);
      if (rays > 0) {
        for (var ry = 0; ry < 8; ry++) {
          var ra = (ry / 8) * Math.PI * 2 + f.time * 0.0008;
          H.seg(ctx, cx + Math.cos(ra) * f.w * 0.03, cy + Math.sin(ra) * f.w * 0.03,
            cx + Math.cos(ra) * f.w * (0.05 + rays * 0.16), cy + Math.sin(ra) * f.w * (0.05 + rays * 0.16), 1,
            { color: 'rgba(240,171,252,' + (0.5 - rays * 0.3) + ')', width: 1.6 });
        }
      }
      H.motes(ctx, f, f.q.particles, { color: '#f0abfc', size: 2, alpha: 0.45, vertical: true });
      H.kicker(ctx, f, 'the soft light', { y: f.h * 0.78, color: '#f0abfc' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.86, glow: true, start: 0.5, span: 0.4, color: '#fdf4ff', glowColor: '#f0abfc', size: Math.min(f.w * 0.065, 48) });
    }
  });

  register('glimmer-gadabout', {
    duration: 2150, transition: 'curtain',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0d0710');
      H.wash(ctx, f, 'rgba(244,114,182,.4)', 0.3, f.w * 0.5, f.h * 0.45);
      var layers = [
        { y: 0.72, h: 0.3, c: '#831843', at: 0.0 },
        { y: 0.62, h: 0.4, c: '#be185d', at: 0.1 },
        { y: 0.52, h: 0.5, c: '#f472b6', at: 0.2 }
      ];
      layers.forEach(function (layer, i) {
        var slide = H.ease.outCubic(H.stagger(f.p, i, layers.length, 0, 0.5));
        if (slide <= 0) return;
        var from = i % 2 ? f.w : -f.w;
        ctx.save();
        ctx.globalAlpha = 0.85 * slide;
        ctx.fillStyle = layer.c;
        ctx.beginPath();
        ctx.moveTo(lerp(from, 0, slide), f.h * layer.y);
        for (var s = 0; s <= 8; s++) {
          var sx = (s / 8) * f.w;
          ctx.lineTo(sx + lerp(from, 0, slide) * 0.06, f.h * (layer.y - Math.sin(s * 0.9 + i) * 0.05));
        }
        ctx.lineTo(f.w, f.h);
        ctx.lineTo(0, f.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      var strum = H.clamp((f.p - 0.4) / 0.3, 0, 1);
      if (strum > 0) {
        var ux = f.w * 0.5, uy = f.h * 0.34;
        ctx.save();
        ctx.globalAlpha = 1 - strum * 0.4;
        ctx.strokeStyle = '#fbcfe8';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(ux, uy + f.h * 0.06, f.w * 0.035, f.h * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
        H.seg(ctx, ux, uy - f.h * 0.02, ux, uy - f.h * 0.14, 1, { color: '#fbcfe8', width: 2.4 });
        for (var w = 0; w < 4; w++) {
          H.ring(ctx, ux, uy + f.h * 0.06, f.w * (0.05 + w * 0.035) * strum, 1, { color: 'rgba(251,207,232,' + (0.5 - w * 0.12) * (1 - strum) + ')', width: 1.6 });
        }
        ctx.restore();
      }
      for (var cf = 0; cf < Math.max(10, f.q.particles); cf++) {
        var cp = H.stagger(f.p, cf, Math.max(10, f.q.particles), 0.45, 0.5);
        if (cp <= 0) continue;
        ctx.save();
        ctx.translate(H.rnd(f.seed, cf) * f.w, f.h * 0.3 + cp * f.h * 0.5);
        ctx.rotate(cp * 4 + cf);
        ctx.globalAlpha = 1 - cp;
        ctx.fillStyle = ['#fbcfe8', '#fde047', '#a5f3fc', '#f9a8d4'][cf % 4];
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }
      H.kicker(ctx, f, 'a paper-bright adventure', { y: f.h * 0.16, color: '#fbcfe8' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.26, glow: true, start: 0.28, span: 0.42, color: '#fdf2f8', glowColor: '#f472b6', size: Math.min(f.w * 0.062, 46) });
    }
  });

  /* ---------- TABLETOP, BOARD, CARDS, SPORTS, PUZZLES ---------- */

  register('chess', {
    duration: 2200, transition: 'dissolve',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0806');
      H.wash(ctx, f, 'rgba(214,185,140,.35)', 0.26, f.w * 0.5, f.h * 0.5);
      var size = Math.min(f.w * 0.62, f.h * 0.72), cell = size / 8;
      var ox = f.w * 0.5 - size / 2, oy = f.h * 0.5 - size / 2;
      for (var r = 0; r < 8; r++) {
        var rp = H.ease.outCubic(H.stagger(f.p, r, 8, 0, 0.5));
        if (rp <= 0) continue;
        for (var c = 0; c < 8; c++) {
          var cp = H.clamp((rp - c / 8 * 0.5) * 3, 0, 1);
          ctx.save();
          ctx.globalAlpha = cp;
          ctx.fillStyle = (r + c) % 2 ? 'rgba(120,86,50,.9)' : 'rgba(226,205,170,.92)';
          ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
          ctx.restore();
        }
      }
      H.rect(ctx, ox, oy, size, size, { stroke: 'rgba(214,185,140,.8)', width: 2, alpha: H.clamp(f.p / 0.3, 0, 1) });
      var glyphs = ['♙', '♖', '♘', '♗', '♕', '♔'];
      for (var g = 0; g < 8; g++) {
        var gp = H.ease.outBack(H.stagger(f.p, g, 8, 0.45, 0.4));
        if (gp <= 0) continue;
        ctx.save();
        ctx.globalAlpha = gp;
        ctx.font = (cell * 0.72 * gp) + 'px system-ui, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = g % 2 ? '#2b2118' : '#f5ede0';
        ctx.fillText(glyphs[g % 6], ox + (g + 0.5) * cell, oy + 7.5 * cell - (1 - gp) * cell);
        ctx.restore();
      }
      var step = H.clamp((f.p - 0.72) / 0.2, 0, 1);
      if (step > 0) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.font = (cell * 0.8) + 'px system-ui, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = f.q.glow ? 20 : 0;
        ctx.fillText('♔', ox + (4.5 - step * 0.5) * cell, oy + (4.5 - step * 1.5) * cell);
        ctx.restore();
      }
      H.kicker(ctx, f, 'the next move', { y: f.h * 0.1, color: '#d6b98c' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.92, start: 0.5, span: 0.35, color: '#f5ede0', size: Math.min(f.w * 0.055, 40) });
    }
  });

  register('snakes-ladders', {
    duration: 2100, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0d0805');
      H.wash(ctx, f, 'rgba(251,146,60,.4)', 0.28, f.w * 0.5, f.h * 0.5);
      var cols = 5, rows = 5, cw = f.w * 0.56 / cols, ch = f.h * 0.62 / rows;
      var ox = f.w * 0.22, oy = f.h * 0.2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = r * cols + c;
          var sp = H.stagger(f.p, i, rows * cols, 0, 0.55);
          if (sp <= 0) continue;
          ctx.save();
          ctx.globalAlpha = sp * 0.9;
          ctx.fillStyle = (r + c) % 2 ? 'rgba(120,53,15,.75)' : 'rgba(253,230,138,.14)';
          ctx.fillRect(ox + c * cw, oy + r * ch, cw - 2, ch - 2);
          ctx.strokeStyle = 'rgba(251,146,60,.5)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(ox + c * cw, oy + r * ch, cw - 2, ch - 2);
          ctx.font = '700 ' + (ch * 0.3) + 'px system-ui';
          ctx.fillStyle = 'rgba(254,243,199,' + sp * 0.8 + ')';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(r * cols + c + 1), ox + c * cw + cw / 2, oy + r * ch + ch / 2);
          ctx.restore();
        }
      }
      var ladder = H.clamp((f.p - 0.3) / 0.35, 0, 1);
      if (ladder > 0) {
        H.seg(ctx, ox + cw * 1.1, oy + ch * 4.6, ox + cw * 2.4, oy + ch * 1.2, ladder, { color: '#fbbf24', width: 3, glow: f.q.glow });
        H.seg(ctx, ox + cw * 1.6, oy + ch * 4.6, ox + cw * 2.9, oy + ch * 1.2, ladder, { color: '#fbbf24', width: 3, glow: f.q.glow });
        for (var rung = 0; rung < 6; rung++) {
          var rp2 = H.clamp(ladder * 1.4 - rung * 0.16, 0, 1);
          if (rp2 <= 0) continue;
          var ty = 1 - rung / 6;
          H.seg(ctx, lerp(ox + cw * 1.1, ox + cw * 2.4, 1 - ty), lerp(oy + ch * 4.6, oy + ch * 1.2, 1 - ty),
            lerp(ox + cw * 1.6, ox + cw * 2.9, 1 - ty), lerp(oy + ch * 4.6, oy + ch * 1.2, 1 - ty), rp2, { color: '#fde68a', width: 2 });
        }
      }
      var roll = H.clamp((f.p - 0.15) / 0.35, 0, 1);
      if (roll > 0) {
        var dx = ox + cw * 4.2, dy = oy - ch * 0.9 + (1 - roll) * f.h * 0.12;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate((1 - roll) * 7);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-cw * 0.3, -cw * 0.3, cw * 0.6, cw * 0.6);
        ctx.fillStyle = '#7c2d12';
        [[-0.14, -0.14], [0.14, 0.14], [0.14, -0.14], [-0.14, 0.14], [0, 0]].forEach(function (pip) {
          ctx.beginPath();
          ctx.arc(pip[0] * cw, pip[1] * cw, cw * 0.05, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
      var hop = H.clamp((f.p - 0.55) / 0.35, 0, 1);
      if (hop > 0) {
        var hx = ox + cw * (0.5 + hop * 3.2), hy = oy + ch * (4.5 - hop * 2.4) - Math.abs(Math.sin(hop * Math.PI * 3)) * ch * 0.4;
        H.disc(ctx, hx, hy, cw * 0.18, { fill: '#fb923c', glow: f.q.glow });
      }
      H.kicker(ctx, f, 'roll forward', { y: f.h * 0.92, color: '#fdba74' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.12, start: 0.4, span: 0.4, color: '#ffedd5', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('ludo', {
    duration: 2050, transition: 'slats',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0710');
      var size = Math.min(f.w * 0.66, f.h * 0.78), half = size / 2;
      var ox = f.w * 0.5 - half, oy = f.h * 0.5 - half;
      var colours = [['#f472b6', 0, 0], ['#4ade80', 1, 0], ['#38bdf8', 0, 1], ['#facc15', 1, 1]];
      H.rect(ctx, ox, oy, size, size, { fill: 'rgba(255,255,255,.03)', stroke: 'rgba(226,232,240,.34)', width: 2, alpha: H.clamp(f.p / 0.25, 0, 1) });
      colours.forEach(function (corner, i) {
        var cp = H.ease.outCubic(H.stagger(f.p, i, 4, 0.02, 0.45));
        if (cp <= 0) return;
        var qx = ox + corner[1] * half, qy = oy + corner[2] * half;
        ctx.save();
        ctx.globalAlpha = cp;
        H.rect(ctx, qx + half * 0.08, qy + half * 0.08, half * 0.84, half * 0.84, { fill: corner[0] + '30', stroke: corner[0], width: 2.5 });
        for (var d = 0; d < 4; d++) {
          var da = (d / 4) * Math.PI * 2 + Math.PI / 4;
          var tx = qx + half / 2 + Math.cos(da) * half * 0.22, ty = qy + half / 2 + Math.sin(da) * half * 0.22;
          H.disc(ctx, tx, ty, half * 0.085, { fill: '#0a0710', stroke: corner[0], width: 2.5 });
          H.disc(ctx, tx, ty, half * 0.038, { fill: corner[0] });
        }
        ctx.restore();
      });
      var cross = H.ease.outCubic(H.clamp((f.p - 0.3) / 0.4, 0, 1));
      if (cross > 0) {
        var lane = half * 0.3, reach = (half - lane / 2) * cross;
        var arms = [
          [ox + half - lane / 2, oy, lane, reach, f.w * 0.5, oy + reach],
          [ox + size - reach, oy + half - lane / 2, reach, lane, ox + size - reach, f.h * 0.5],
          [ox + half - lane / 2, oy + size - reach, lane, reach, f.w * 0.5, oy + size - reach],
          [ox, oy + half - lane / 2, reach, lane, ox + reach, f.h * 0.5]
        ];
        colours.forEach(function (corner, i) {
          var arm = arms[i];
          H.rect(ctx, arm[0], arm[1], arm[2], arm[3], { fill: corner[0] + '26', stroke: corner[0] + '88', width: 1.5, alpha: cross });
          for (var s = 1; s < 5; s++) {
            var t = s / 5;
            H.disc(ctx, lerp(arm[4], f.w * 0.5, t * 0.35), lerp(arm[5], f.h * 0.5, t * 0.35), half * 0.022, { fill: corner[0], alpha: cross * (1 - t * 0.35) });
          }
        });
      }
      var home = H.clamp((f.p - 0.62) / 0.3, 0, 1);
      if (home > 0) {
        colours.forEach(function (corner, i) {
          var from = [ox + half / 2 + (corner[1] ? half * 0.7 : -half * 0.7), oy + half / 2 + (corner[2] ? half * 0.7 : -half * 0.7)];
          H.disc(ctx, lerp(from[0], f.w * 0.5, home), lerp(from[1], f.h * 0.5, home), half * 0.07, { fill: corner[0], glow: f.q.glow });
        });
        H.ring(ctx, f.w * 0.5, f.h * 0.5, half * 0.2 * home, 1, { color: '#f472b6', width: 2 });
      }
      H.kicker(ctx, f, 'bring every piece home', { y: f.h * 0.94, color: '#f9a8d4' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.07, start: 0.45, span: 0.4, color: '#fdf2f8', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('carrom', {
    duration: 2150, transition: 'wipeL',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0b0906');
      var board = Math.min(f.w * 0.78, f.h * 0.86);
      var ox = f.w * 0.5 - board / 2, oy = f.h * 0.5 - board / 2;
      H.rect(ctx, ox, oy, board, board, { fill: 'rgba(214,185,140,.16)', stroke: 'rgba(214,185,140,.75)', width: 3, alpha: H.ease.outCubic(H.clamp(f.p / 0.3, 0, 1)) });
      var sheen = H.clamp((f.p - 0.1) / 0.35, 0, 1);
      if (sheen > 0 && sheen < 1) {
        ctx.save();
        ctx.globalAlpha = 0.2 * (1 - sheen);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(ox, oy, board * sheen, board);
        ctx.restore();
      }
      for (var d = 0; d < 4; d++) {
        var da = (d / 4) * Math.PI * 2 + Math.PI / 4;
        H.disc(ctx, ox + board / 2 + Math.cos(da) * board * 0.44, oy + board / 2 + Math.sin(da) * board * 0.44, board * 0.045, { stroke: 'rgba(214,185,140,.7)', width: 2, alpha: H.stagger(f.p, d, 4, 0.2, 0.4) });
      }
      var burst = H.ease.outCubic(H.clamp((f.p - 0.25) / 0.4, 0, 1));
      if (burst > 0) {
        for (var coin = 0; coin < 9; coin++) {
          var ca = (coin / 9) * Math.PI * 2 + H.rnd(f.seed, coin) * 0.6;
          var cr = board * (0.03 + burst * (0.1 + H.rnd(f.seed, coin + 20) * 0.22));
          H.disc(ctx, ox + board / 2 + Math.cos(ca) * cr, oy + board / 2 + Math.sin(ca) * cr, board * 0.028, {
            fill: coin % 2 ? '#fde68a' : '#e2e8f0', alpha: burst, glow: f.q.glow
          });
        }
        H.ring(ctx, ox + board / 2, oy + board / 2, board * 0.09, 1, { color: 'rgba(214,185,140,.7)', width: 2, alpha: burst });
      }
      var flick = H.clamp((f.p - 0.6) / 0.3, 0, 1);
      if (flick > 0) {
        var sx = ox + board * 0.5 - Math.sin(flick * Math.PI) * board * 0.3;
        var sy = oy + board * 0.86;
        H.disc(ctx, sx, sy, board * 0.035, { fill: '#f8fafc', stroke: '#d6b98c', width: 2, glow: f.q.glow });
        if (flick > 0.2) H.seg(ctx, sx, sy, sx + board * 0.12, sy - board * 0.2, (flick - 0.2) / 0.8, { color: 'rgba(251,191,36,.7)', width: 2.4 });
      }
      H.kicker(ctx, f, 'line up the striker', { y: f.h * 0.08, color: '#d6b98c' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.95, start: 0.5, span: 0.4, color: '#f5ede0', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('tycoon-town', {
    duration: 2200, transition: 'zoom',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#050b07');
      H.wash(ctx, f, 'rgba(74,222,128,.35)', 0.26, f.w * 0.5, f.h * 0.55);
      var tile = Math.min(f.w * 0.13, f.h * 0.15);
      var cx = f.w * 0.5, cy = f.h * 0.62;
      H.seg(ctx, cx - tile * 3.2, cy, cx, cy + tile * 1.6, H.clamp(f.p / 0.3, 0, 1), { color: 'rgba(74,222,128,.4)', width: 2 });
      H.seg(ctx, cx + tile * 3.2, cy, cx, cy + tile * 1.6, H.clamp(f.p / 0.3, 0, 1), { color: 'rgba(74,222,128,.4)', width: 2 });
      var plots = [];
      for (var row = 0; row < 3; row++) for (var col = 0; col < 5; col++) plots.push([col - 2, row]);
      plots.forEach(function (plot, i) {
        var pp = H.ease.outBack(H.stagger(f.p, i, plots.length, 0.05, 0.6));
        if (pp <= 0) return;
        var px = cx + (plot[0] + plot[1] * 0.6) * tile * 0.95;
        var py = cy - (plot[1] * 0.9 - plot[0] * 0.28) * tile * 0.6;
        var height = tile * (0.2 + H.rnd(f.seed, i) * 0.5) * pp;
        ctx.save();
        ctx.globalAlpha = 0.92 * pp;
        ctx.fillStyle = i % 3 ? 'rgba(22,101,52,.9)' : 'rgba(21,128,61,.9)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + tile * 0.45, py + tile * 0.24);
        ctx.lineTo(px + tile * 0.45, py + tile * 0.24 - height);
        ctx.lineTo(px, py - height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, py - height);
        ctx.lineTo(px + tile * 0.45, py + tile * 0.24 - height);
        ctx.lineTo(px + tile * 0.9, py - height * 0.6);
        ctx.lineTo(px + tile * 0.45, py - tile * 0.24 - height * 0.2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(134,239,172,.85)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      var coin = H.clamp((f.p - 0.6) / 0.3, 0, 1);
      if (coin > 0 && coin < 1) {
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 20; }
        H.disc(ctx, lerp(f.w * 0.18, f.w * 0.78, coin), f.h * 0.5 - Math.sin(coin * Math.PI) * f.h * 0.2, f.w * 0.014, { fill: '#facc15', stroke: '#fef08a', width: 2 });
        ctx.restore();
      }
      H.kicker(ctx, f, 'the market route', { y: f.h * 0.14, color: '#86efac' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.24, glow: true, start: 0.4, span: 0.4, color: '#f0fdf4', glowColor: '#4ade80', size: Math.min(f.w * 0.055, 42) });
    }
  });

  register('checkers', {
    duration: 2000, transition: 'shutter',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0c0505');
      var size = Math.min(f.w * 0.6, f.h * 0.74), cell = size / 8;
      var ox = f.w * 0.5 - size / 2, oy = f.h * 0.5 - size / 2;
      H.rect(ctx, ox, oy, size, size, { fill: 'rgba(68,30,20,.6)', stroke: 'rgba(239,68,68,.55)', width: 2, alpha: H.clamp(f.p / 0.25, 0, 1) });
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 8; c++) {
          if ((r + c) % 2 === 0) continue;
          var i = r * 8 + c;
          var dp = H.ease.outBack(H.stagger(f.p, i, 64, 0.15, 0.55));
          if (dp <= 0) continue;
          var isRed = r < 4;
          ctx.save();
          ctx.globalAlpha = dp;
          H.disc(ctx, ox + (c + 0.5) * cell, oy + (r + 0.5) * cell, cell * 0.4 * dp, { fill: isRed ? '#dc2626' : '#e2e8f0' });
          ctx.strokeStyle = isRed ? '#fca5a5' : '#f8fafc';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.restore();
        }
      }
      var crown = H.clamp((f.p - 0.68) / 0.26, 0, 1);
      if (crown > 0) {
        var kx = ox + 6.5 * cell, ky = oy + 1.5 * cell;
        ctx.save();
        ctx.translate(kx, ky);
        ctx.scale(1, Math.cos(crown * Math.PI));
        H.disc(ctx, 0, 0, cell * 0.4, { fill: '#facc15', stroke: '#fef08a', width: 2, glow: f.q.glow });
        ctx.restore();
        if (crown > 0.5) {
          for (var s = 0; s < 8; s++) {
            var sa = (s / 8) * Math.PI * 2;
            H.seg(ctx, kx + Math.cos(sa) * cell * 0.5, ky + Math.sin(sa) * cell * 0.5,
              kx + Math.cos(sa) * cell * (0.7 + crown * 0.4), ky + Math.sin(sa) * cell * (0.7 + crown * 0.4), 1,
              { color: 'rgba(250,204,21,' + (1 - crown) + ')', width: 2 });
          }
        }
      }
      H.kicker(ctx, f, 'crown your last piece', { y: f.h * 0.94, color: '#fca5a5' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.07, start: 0.45, span: 0.4, color: '#fee2e2', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('connect-four', {
    duration: 2050, transition: 'wipeU',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#070a12');
      var cols = 7, rows = 6;
      var cell = Math.min(f.w * 0.62 / cols, f.h * 0.62 / rows);
      var ox = f.w * 0.5 - cell * cols / 2, oy = f.h * 0.3;
      H.rect(ctx, ox - cell * 0.3, oy - cell * 0.3, cell * (cols + 0.6), cell * (rows + 0.6), {
        fill: 'rgba(30,58,138,.55)', stroke: 'rgba(250,204,21,.6)', width: 3, alpha: H.clamp(f.p / 0.22, 0, 1)
      });
      var order = [[3, 0], [2, 0], [4, 0], [3, 1], [2, 1], [4, 1], [3, 2], [2, 2], [1, 0], [4, 2], [1, 1], [5, 0]];
      for (var d = 0; d < order.length; d++) {
        var col = order[d][0], row = order[d][1];
        var dp = H.ease.outBack(H.stagger(f.p, d, order.length, 0.05, 0.6));
        if (dp <= 0) continue;
        var x = ox + (col + 0.5) * cell;
        var y = lerp(-f.h * 0.3, oy + (rows - 1 - row + 0.5) * cell, H.clamp(dp, 0, 1));
        ctx.save();
        ctx.globalAlpha = H.clamp(dp, 0, 1);
        H.disc(ctx, x, y, cell * 0.4, { fill: d % 2 ? '#facc15' : '#ef4444', glow: f.q.glow });
        ctx.restore();
        if (dp > 0.9 && dp < 1) H.ring(ctx, x, oy + (rows - 1 - row + 0.5) * cell, cell * 0.45, (dp - 0.9) * 10, { color: 'rgba(255,255,255,.5)', width: 2 });
      }
      var win = H.clamp((f.p - 0.75) / 0.2, 0, 1);
      if (win > 0) {
        H.seg(ctx, ox + 1.5 * cell, oy + (rows - 1 - 2 + 0.5) * cell, ox + 4.5 * cell, oy + (rows - 1 - 2 + 0.5) * cell, win,
          { color: '#ffffff', width: 4, glow: f.q.glow, blur: 22 });
        H.flash(ctx, f, (1 - win) * 0.18, '#fef08a');
      }
      H.kicker(ctx, f, 'four in a row', { y: f.h * 0.16, color: '#fde68a' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.9, start: 0.5, span: 0.4, color: '#fefce8', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('mancala', {
    duration: 2100, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0906');
      H.wash(ctx, f, 'rgba(163,230,53,.3)', 0.24, f.w * 0.5, f.h * 0.5);
      var bw = f.w * 0.66, bh = f.h * 0.2;
      var ox = f.w * 0.5 - bw / 2, oy = f.h * 0.44;
      var open = H.ease.outCubic(H.clamp(f.p / 0.32, 0, 1));
      ctx.save();
      ctx.globalAlpha = open;
      ctx.fillStyle = 'rgba(69,26,3,.85)';
      ctx.strokeStyle = 'rgba(163,230,53,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(ox, oy, bw, bh, bh * 0.4) : ctx.rect(ox, oy, bw, bh);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      var bowls = 7, seedR = bh * 0.26;
      for (var b = 0; b < bowls; b++) {
        var bx = ox + bw * ((b + 0.5) / bowls);
        var by = oy + bh / 2;
        var bp = H.stagger(f.p, b, bowls, 0.2, 0.5);
        H.disc(ctx, bx, by, seedR * 1.25, { fill: 'rgba(20,12,6,.9)', stroke: 'rgba(163,230,53,.4)', width: 1.6, alpha: H.clamp(bp * 2, 0, 1) });
        var count = Math.round(H.clamp((bp - 0.2) / 0.8, 0, 1) * (4 + (b % 3)));
        for (var s = 0; s < count; s++) {
          var sa = (s / 6) * Math.PI * 2 + b;
          var drop = H.clamp((bp - 0.2 - s * 0.08) * 6, 0, 1);
          if (drop <= 0) continue;
          H.disc(ctx, bx + Math.cos(sa) * seedR * 0.5, by + Math.sin(sa) * seedR * 0.35 - (1 - drop) * f.h * 0.25, seedR * 0.3, {
            fill: s % 2 ? '#a3e635' : '#bef264', alpha: drop
          });
        }
      }
      var store = H.clamp((f.p - 0.6) / 0.3, 0, 1);
      if (store > 0) {
        H.disc(ctx, ox - bw * 0.09, oy + bh / 2, seedR * 1.6 * store, { stroke: '#a3e635', width: 2.4, glow: f.q.glow });
        for (var t = 0; t < Math.round(store * 6); t++) {
          H.disc(ctx, ox - bw * 0.09 + (H.rnd(f.seed, t) - 0.5) * seedR, oy + bh / 2 + (H.rnd(f.seed, t + 9) - 0.5) * seedR, seedR * 0.28, { fill: '#d9f99d' });
        }
      }
      H.kicker(ctx, f, 'count the seeds', { y: f.h * 0.78, color: '#bef264' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.22, start: 0.45, span: 0.4, color: '#f7fee7', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('reversi', {
    duration: 2100, transition: 'dissolve',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04080a');
      var size = Math.min(f.w * 0.6, f.h * 0.72), cell = size / 8;
      var ox = f.w * 0.5 - size / 2, oy = f.h * 0.5 - size / 2;
      var grid = H.ease.outCubic(H.clamp(f.p / 0.3, 0, 1));
      H.lattice(ctx, ox, oy, size, size, 8, 8, grid, { color: 'rgba(134,239,172,.4)', width: 1.2 });
      var flipOrder = [[3, 3], [4, 4], [3, 4], [4, 3], [2, 3], [4, 2], [5, 4], [3, 5], [2, 2], [5, 5], [1, 3], [3, 1], [6, 4], [4, 6]];
      flipOrder.forEach(function (pos, i) {
        var fp = H.stagger(f.p, i, flipOrder.length, 0.2, 0.6);
        if (fp <= 0) return;
        var x = ox + (pos[0] + 0.5) * cell, y = oy + (pos[1] + 0.5) * cell;
        var squeeze = Math.cos(H.clamp(fp * 1.6, 0, 1) * Math.PI);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, Math.max(0.02, Math.abs(squeeze)));
        H.disc(ctx, 0, 0, cell * 0.38, { fill: squeeze > 0 ? '#0f172a' : '#86efac', stroke: squeeze > 0 ? '#334155' : '#bbf7d0', width: 1.6 });
        ctx.restore();
        if (fp > 0.85 && fp < 1) H.ring(ctx, x, y, cell * (0.4 + (fp - 0.85) * 3), 1, { color: 'rgba(134,239,172,' + (1 - fp) * 5 + ')', width: 1.6 });
      });
      var claim = H.clamp((f.p - 0.78) / 0.2, 0, 1);
      if (claim > 0) {
        [[0, 0], [7, 0], [0, 7], [7, 7]].forEach(function (corner, i) {
          H.disc(ctx, ox + (corner[0] + 0.5) * cell, oy + (corner[1] + 0.5) * cell, cell * 0.38 * claim, { fill: '#86efac', glow: f.q.glow, alpha: claim });
        });
      }
      H.kicker(ctx, f, 'claim the corners', { y: f.h * 0.93, color: '#86efac' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.08, start: 0.45, span: 0.4, color: '#f0fdf4', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('tic-tac-toe', {
    duration: 2000, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#f7f3ea');
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      for (var p = 0; p < 12; p++) {
        ctx.beginPath();
        ctx.moveTo(0, p * f.h / 12 + 6);
        ctx.lineTo(f.w, p * f.h / 12 + 2);
        ctx.stroke();
      }
      ctx.restore();
      var size = Math.min(f.w * 0.44, f.h * 0.6), cell = size / 3;
      var ox = f.w * 0.5 - size / 2, oy = f.h * 0.5 - size / 2;
      var ink = '#1f2937';
      var draw = H.ease.outCubic(H.clamp(f.p / 0.42, 0, 1));
      H.seg(ctx, ox + cell, oy, ox + cell, oy + size, H.clamp(draw * 2, 0, 1), { color: ink, width: 3.4, cap: 'round' });
      H.seg(ctx, ox + cell * 2, oy, ox + cell * 2, oy + size, H.clamp(draw * 2 - 0.4, 0, 1), { color: ink, width: 3.4, cap: 'round' });
      H.seg(ctx, ox, oy + cell, ox + size, oy + cell, H.clamp(draw * 2 - 0.7, 0, 1), { color: ink, width: 3.4, cap: 'round' });
      H.seg(ctx, ox, oy + cell * 2, ox + size, oy + cell * 2, H.clamp(draw * 2 - 1, 0, 1), { color: ink, width: 3.4, cap: 'round' });
      var mark = H.clamp((f.p - 0.35) / 0.5, 0, 1);
      if (mark > 0) {
        var cx1 = ox + cell * 1.5, cy1 = oy + cell * 0.5, r1 = cell * 0.3;
        H.seg(ctx, cx1 - r1, cy1 - r1, cx1 + r1, cy1 + r1, H.clamp(mark * 2.4, 0, 1), { color: '#dc2626', width: 4 });
        H.seg(ctx, cx1 + r1, cy1 - r1, cx1 - r1, cy1 + r1, H.clamp(mark * 2.4 - 0.5, 0, 1), { color: '#dc2626', width: 4 });
        var cx2 = ox + cell * 0.5, cy2 = oy + cell * 1.5;
        H.ring(ctx, cx2, cy2, r1, H.clamp(mark * 2 - 0.6, 0, 1), { color: '#2563eb', width: 4, from: -0.5 });
        var cx3 = ox + cell * 2.5, cy3 = oy + cell * 2.5;
        H.ring(ctx, cx3, cy3, r1, H.clamp(mark * 2 - 1.2, 0, 1), { color: '#2563eb', width: 4, from: -0.5 });
      }
      var tick = H.clamp((f.p - 0.72) / 0.2, 0, 1);
      if (tick > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(f.time * 0.02) * 0.3;
        ctx.font = '800 ' + (cell * 0.24) + 'px system-ui';
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.fillText('tick', ox + size + cell * 0.42, oy + cell * 0.6);
        ctx.fillText('tock', ox + size + cell * 0.42, oy + cell * 1.1);
        ctx.restore();
      }
      H.kicker(ctx, f, 'a cafe table challenge', { y: f.h * 0.12, color: '#475569' });
      H.sketch(ctx, f, f.title, { y: f.h * 0.9, start: 0.5, color: 'rgba(31,41,55,.6)', fill: '#1f2937', size: Math.min(f.w * 0.055, 40) });
    }
  });

  register('backgammon', {
    duration: 2200, transition: 'curtain',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0b0705');
      var bw = f.w * 0.72, bh = f.h * 0.62;
      var ox = f.w * 0.5 - bw / 2, oy = f.h * 0.5 - bh / 2;
      H.rect(ctx, ox, oy, bw, bh, { fill: 'rgba(120,53,15,.8)', stroke: 'rgba(214,185,140,.7)', width: 3, alpha: H.clamp(f.p / 0.25, 0, 1) });
      var points = 12, pw = bw / points;
      for (var i = 0; i < points; i++) {
        var pp = H.ease.outCubic(H.stagger(f.p, i, points, 0.05, 0.55));
        if (pp <= 0) continue;
        var top = i % 2 === 0;
        var x = ox + i * pw;
        ctx.save();
        ctx.globalAlpha = 0.9 * pp;
        ctx.fillStyle = i % 4 < 2 ? '#7c2d12' : '#d6b98c';
        ctx.beginPath();
        if (top) {
          ctx.moveTo(x, oy);
          ctx.lineTo(x + pw, oy);
          ctx.lineTo(x + pw / 2, oy + bh * 0.42 * pp);
        } else {
          ctx.moveTo(x, oy + bh);
          ctx.lineTo(x + pw, oy + bh);
          ctx.lineTo(x + pw / 2, oy + bh - bh * 0.42 * pp);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      H.seg(ctx, ox + bw / 2, oy, ox + bw / 2, oy + bh, H.clamp((f.p - 0.2) / 0.3, 0, 1), { color: 'rgba(254,243,199,.6)', width: 2 });
      var stack = H.clamp((f.p - 0.45) / 0.35, 0, 1);
      for (var s = 0; s < 5; s++) {
        var sp = H.stagger(stack, s, 5, 0, 0.6);
        if (sp <= 0) continue;
        H.disc(ctx, ox + pw * 1.5, oy + bh - bh * 0.06 - s * bh * 0.055 * sp, pw * 0.36, { fill: s % 2 ? '#f8fafc' : '#1f2937', stroke: '#d6b98c', width: 1.2, alpha: sp });
      }
      var dice = H.clamp((f.p - 0.68) / 0.26, 0, 1);
      if (dice > 0) {
        [0, 1].forEach(function (d) {
          var dx = ox + bw * (0.42 + d * 0.14), dy = oy + bh * 0.5 - Math.sin(dice * Math.PI) * bh * 0.2;
          ctx.save();
          ctx.translate(dx, dy);
          ctx.rotate((1 - dice) * (d ? 5 : -4));
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(-pw * 0.3, -pw * 0.3, pw * 0.6, pw * 0.6);
          ctx.fillStyle = '#7c2d12';
          var pips = d ? [[0, 0], [-0.15, -0.15], [0.15, 0.15]] : [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]];
          pips.forEach(function (pip) {
            ctx.beginPath();
            ctx.arc(pip[0] * pw, pip[1] * pw, pw * 0.055, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        });
      }
      H.kicker(ctx, f, 'move every checker home', { y: f.h * 0.9, color: '#d6b98c' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.1, start: 0.5, span: 0.4, color: '#fef3c7', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('dots-boxes', {
    duration: 2050, transition: 'slats',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#f5f7fb');
      var n = 6, cell = Math.min(f.w * 0.5, f.h * 0.66) / (n - 1);
      var ox = f.w * 0.5 - cell * (n - 1) / 2, oy = f.h * 0.5 - cell * (n - 1) / 2;
      var ink = '#1e3a8a', accent = f.accent;
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          var dp = H.stagger(f.p, r * n + c, n * n, 0, 0.35);
          H.disc(ctx, ox + c * cell, oy + r * cell, Math.max(2, cell * 0.05) * dp, { fill: ink, alpha: dp });
        }
      }
      var lines = [
        [0, 0, 1, 0], [1, 0, 2, 0], [0, 0, 0, 1], [2, 0, 2, 1], [1, 0, 1, 1],
        [0, 1, 1, 1], [1, 1, 2, 1], [2, 1, 2, 2], [0, 1, 0, 2], [1, 1, 1, 2],
        [3, 0, 4, 0], [3, 0, 3, 1], [4, 0, 4, 1], [3, 1, 4, 1]
      ];
      for (var l = 0; l < lines.length; l++) {
        var lp = H.ease.outCubic(H.stagger(f.p, l, lines.length, 0.2, 0.5));
        if (lp <= 0) continue;
        var a = lines[l];
        H.seg(ctx, ox + a[0] * cell, oy + a[1] * cell, ox + a[2] * cell, oy + a[3] * cell, lp, { color: ink, width: 2.6 });
      }
      var claim = H.clamp((f.p - 0.68) / 0.24, 0, 1);
      if (claim > 0) {
        ctx.save();
        ctx.globalAlpha = claim * 0.35;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ox + cell, oy + cell * 0, cell, cell);
        ctx.globalAlpha = claim * 0.35;
        ctx.fillStyle = accent;
        ctx.fillRect(ox + cell * 3, oy, cell, cell);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = claim;
        ctx.font = '800 ' + (cell * 0.4) + 'px system-ui';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', ox + cell * 1.5, oy + cell * 0.5);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillText('B', ox + cell * 3.5, oy + cell * 0.5);
        ctx.restore();
      }
      H.kicker(ctx, f, 'draw the last side', { y: f.h * 0.1, color: '#334155' });
      H.sketch(ctx, f, f.title, { y: f.h * 0.92, start: 0.5, color: 'rgba(30,58,138,.5)', fill: ink, size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('go', {
    duration: 2300, transition: 'dissolve',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0a0806');
      H.wash(ctx, f, 'rgba(229,231,235,.25)', 0.2, f.w * 0.5, f.h * 0.5);
      var n = 9, board = Math.min(f.w * 0.62, f.h * 0.72), cell = board / (n - 1);
      var ox = f.w * 0.5 - board / 2, oy = f.h * 0.5 - board / 2;
      var grid = H.ease.outCubic(H.clamp(f.p / 0.34, 0, 1));
      ctx.save();
      ctx.globalAlpha = grid;
      ctx.strokeStyle = 'rgba(214,185,140,.75)';
      ctx.lineWidth = 1.2;
      for (var i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + i * cell);
        ctx.lineTo(ox + board * grid, oy + i * cell);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox + i * cell, oy);
        ctx.lineTo(ox + i * cell, oy + board * grid);
        ctx.stroke();
      }
      ctx.restore();
      [3, 6].forEach(function (sx) {
        [3, 6].forEach(function (sy) {
          H.disc(ctx, ox + sx * cell, oy + sy * cell, cell * 0.08, { fill: 'rgba(214,185,140,.9)', alpha: grid });
        });
      });
      var stones = [[2, 2, 0], [6, 2, 1], [2, 6, 1], [6, 6, 0], [3, 3, 0], [5, 3, 1], [4, 4, 0], [4, 5, 1], [3, 5, 0], [5, 5, 1]];
      for (var s = 0; s < stones.length; s++) {
        var sp = H.ease.outBack(H.stagger(f.p, s, stones.length, 0.3, 0.55));
        if (sp <= 0) continue;
        var x = ox + stones[s][0] * cell, y = oy + stones[s][1] * cell;
        var black = stones[s][2] === 0;
        ctx.save();
        ctx.globalAlpha = sp;
        ctx.beginPath();
        ctx.ellipse(x, y + cell * 0.06, cell * 0.42 * sp, cell * 0.16 * sp, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fill();
        ctx.restore();
        H.disc(ctx, x, y - (1 - sp) * cell * 1.4, cell * 0.42 * sp, { fill: black ? '#111318' : '#f3f4f6', stroke: black ? '#3f3f46' : '#d4d4d8', width: 1.2 });
        if (sp > 0.85 && sp < 1) H.ring(ctx, x, y, cell * (0.45 + (sp - 0.85) * 4), 1, { color: 'rgba(229,231,235,' + (1 - sp) * 6 + ')', width: 1.4 });
      }
      var territory = H.clamp((f.p - 0.8) / 0.18, 0, 1);
      if (territory > 0) {
        ctx.save();
        ctx.globalAlpha = territory * 0.22;
        ctx.fillStyle = '#86efac';
        ctx.fillRect(ox, oy, cell * 2, cell * 2);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(ox + cell * 6, oy + cell * 6, cell * 2, cell * 2);
        ctx.restore();
      }
      H.kicker(ctx, f, 'read the whole board', { y: f.h * 0.92, color: '#d6b98c' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.08, start: 0.5, span: 0.35, color: '#f5f5f4', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('solitaire', {
    duration: 2250, transition: 'wipeL',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04120b');
      H.wash(ctx, f, 'rgba(52,211,153,.35)', 0.3, f.w * 0.5, f.h * 0.5);
      var cw = Math.min(f.w * 0.075, f.h * 0.13), ch = cw * 1.45;
      var gap = cw * 0.24;
      var totalW = 7 * cw + 6 * gap;
      var ox = f.w * 0.5 - totalW / 2, oy = f.h * 0.34;
      var suits = ['#f8fafc', '#f1f5f9', '#e2e8f0', '#fde68a'];
      function card(x, y, i, alpha, faceUp) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = faceUp ? '#f8fafc' : '#0f766e';
        ctx.strokeStyle = faceUp ? 'rgba(15,23,42,.35)' : '#34d399';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, cw, ch, cw * 0.12) : ctx.rect(x, y, cw, ch);
        ctx.fill();
        ctx.stroke();
        if (faceUp) {
          ctx.fillStyle = i % 2 ? '#dc2626' : '#1e293b';
          ctx.font = '800 ' + (cw * 0.34) + 'px system-ui';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(['A', 'K', 'Q', 'J', '10', '9', '7'][i % 7], x + cw * 0.1, y + ch * 0.06);
          ctx.font = (cw * 0.4) + 'px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(i % 2 ? '♥' : '♠', x + cw * 0.5, y + ch * 0.42);
        }
        ctx.restore();
      }
      var deck = H.clamp((f.p - 0.05) / 0.2, 0, 1);
      if (deck > 0) {
        for (var d = 0; d < Math.round(4 * deck); d++) card(f.w * 0.1, f.h * 0.16 - d * 2, d, deck, false);
      }
      var columns = [1, 2, 3, 4, 5, 6, 7];
      var dealt = 0;
      for (var c = 0; c < 7; c++) {
        for (var r = 0; r < columns[c]; r++) {
          var i = dealt++;
          var dp = H.ease.outCubic(H.stagger(f.p, i, 28, 0.15, 0.6));
          if (dp <= 0) continue;
          var tx = ox + c * (cw + gap), ty = oy + r * ch * 0.3;
          card(lerp(f.w * 0.12, tx, dp), lerp(f.h * 0.18, ty, dp), i, dp, r === columns[c] - 1);
        }
      }
      var foundation = H.clamp((f.p - 0.78) / 0.2, 0, 1);
      if (foundation > 0) {
        for (var s2 = 0; s2 < 4; s2++) {
          card(f.w * 0.78 + (s2 % 2) * (cw + gap * 0.6), f.h * 0.12 + Math.floor(s2 / 2) * ch * 0.4, s2, foundation, true);
        }
        H.flash(ctx, f, (1 - foundation) * 0.12, '#a7f3d0');
      }
      H.kicker(ctx, f, 'build each suit in order', { y: f.h * 0.9, color: '#6ee7b7' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.06, start: 0.45, span: 0.4, color: '#ecfdf5', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('memory-match', {
    duration: 2150, transition: 'shutter',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0b0612');
      H.wash(ctx, f, 'rgba(240,171,252,.35)', 0.28, f.w * 0.5, f.h * 0.5);
      var cols = 4, rows = 3;
      var cw = Math.min(f.w * 0.14, f.h * 0.2), ch = cw * 1.3;
      var gap = cw * 0.22;
      var ox = f.w * 0.5 - (cols * cw + (cols - 1) * gap) / 2, oy = f.h * 0.5 - (rows * ch + (rows - 1) * gap) / 2;
      var symbols = ['★', '◆', '▲', '●', '★', '◆', '▲', '●', '■', '●', '■', '▲'];
      for (var i = 0; i < cols * rows; i++) {
        var c = i % cols, r = Math.floor(i / cols);
        var x = ox + c * (cw + gap), y = oy + r * (ch + gap);
        var flip = H.stagger(f.p, i, cols * rows, 0.15, 0.6);
        var face = H.clamp(flip * 1.5 - 0.3, 0, 1);
        ctx.save();
        ctx.translate(x + cw / 2, y + ch / 2);
        ctx.scale(1, Math.max(0.02, Math.abs(Math.cos(face * Math.PI))));
        ctx.globalAlpha = H.clamp(flip * 3, 0, 1);
        ctx.fillStyle = face > 0.5 ? '#fdf4ff' : '#701a75';
        ctx.strokeStyle = '#f0abfc';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.14) : ctx.rect(-cw / 2, -ch / 2, cw, ch);
        ctx.fill();
        ctx.stroke();
        if (face > 0.5) {
          ctx.fillStyle = ['#c026d3', '#f472b6', '#38bdf8', '#4ade80'][i % 4];
          ctx.font = '800 ' + (cw * 0.5) + 'px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symbols[i], 0, 0);
        }
        ctx.restore();
      }
      var match = H.clamp((f.p - 0.75) / 0.2, 0, 1);
      if (match > 0) {
        [[1, 0], [0, 1]].forEach(function (pos) {
          var x = ox + pos[0] * (cw + gap) + cw / 2, y = oy + pos[1] * (ch + gap) + ch / 2;
          H.ring(ctx, x, y, cw * (0.6 + match * 0.5), 1, { color: '#f0abfc', width: 3, alpha: 1 - match, glow: f.q.glow });
        });
        H.flash(ctx, f, (1 - match) * 0.16, '#fae8ff');
      }
      H.kicker(ctx, f, 'remember each symbol', { y: f.h * 0.08, color: '#f0abfc' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.94, start: 0.5, span: 0.4, color: '#fdf4ff', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('maths-dash', {
    duration: 2000, transition: 'glitch',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#fbf7f2');
      var ink = '#7c2d12';
      var cx = f.w * 0.5, cy = f.h * 0.42, R = Math.min(f.w, f.h) * 0.26;
      var sweep = H.ease.inOutCubic(H.clamp(f.p / 0.72, 0, 1));
      H.ring(ctx, cx, cy, R, 1, { color: 'rgba(124,45,18,.18)', width: 6, from: -0.5 });
      H.ring(ctx, cx, cy, R, sweep, { color: '#f97316', width: 6, from: -0.5, glow: f.q.glow });
      for (var tick = 0; tick < 12; tick++) {
        var ta = (tick / 12) * Math.PI * 2 - Math.PI / 2;
        H.seg(ctx, cx + Math.cos(ta) * R * 1.1, cy + Math.sin(ta) * R * 1.1,
          cx + Math.cos(ta) * R * 1.18, cy + Math.sin(ta) * R * 1.18, H.clamp(sweep * 4 - tick * 0.2, 0, 1), { color: ink, width: 2 });
      }
      ctx.save();
      ctx.font = '900 ' + (R * 0.5) + 'px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ink;
      ctx.globalAlpha = H.clamp(f.p / 0.2, 0, 1);
      ctx.fillText(String(Math.max(1, Math.round(9 - sweep * 9))), cx, cy);
      ctx.restore();
      var parts = ['1', '7', '+', '2', '5'];
      var assemble = H.ease.outCubic(H.clamp((f.p - 0.25) / 0.45, 0, 1));
      ctx.save();
      ctx.font = '900 ' + Math.min(f.w * 0.07, f.h * 0.1) + 'px ui-monospace, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var total = parts.length;
      for (var p = 0; p < total; p++) {
        var targetX = f.w * 0.5 + (p - (total - 1) / 2) * Math.min(f.w * 0.06, f.h * 0.085);
        var fromX = f.w * 0.5 + (H.rnd(f.seed, p) - 0.5) * f.w * 1.1;
        var fromY = f.h * 0.2 + H.rnd(f.seed, p + 11) * f.h * 0.6;
        ctx.globalAlpha = assemble;
        ctx.fillStyle = parts[p] === '+' ? '#f97316' : ink;
        ctx.fillText(parts[p], lerp(fromX, targetX, assemble), lerp(fromY, f.h * 0.72, assemble));
      }
      ctx.restore();
      var answer = H.clamp((f.p - 0.78) / 0.2, 0, 1);
      if (answer > 0) {
        ctx.save();
        ctx.globalAlpha = answer;
        ctx.fillStyle = '#16a34a';
        ctx.font = '900 ' + Math.min(f.w * 0.09, f.h * 0.13) + 'px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('= 42', f.w * 0.5, f.h * 0.86);
        ctx.restore();
        H.flash(ctx, f, (1 - answer) * 0.2, '#dcfce7');
      }
      H.kicker(ctx, f, 'beat the clock', { y: f.h * 0.12, color: ink });
    }
  });

  register('pool', {
    duration: 2300, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#03130d');
      var table = Math.min(f.w * 0.84, f.h * 0.7);
      var th = table * 0.5;
      var ox = f.w * 0.5 - table / 2, oy = f.h * 0.5 - th / 2;
      var felt = H.ease.outCubic(H.clamp(f.p / 0.28, 0, 1));
      ctx.save();
      ctx.globalAlpha = felt;
      ctx.fillStyle = '#0f5132';
      ctx.fillRect(ox, oy, table * felt, th);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = table * 0.028;
      ctx.strokeRect(ox, oy, table, th);
      ctx.restore();
      [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1]].forEach(function (pocket) {
        H.disc(ctx, ox + pocket[0] * table, oy + pocket[1] * th, table * 0.028, { fill: '#0b0b0b', alpha: felt });
      });
      var rack = H.ease.outCubic(H.stagger(f.p, 0, 3, 0.1, 0.4));
      if (rack > 0) {
        var balls = [];
        for (var row = 0; row < 4; row++) for (var col = 0; col <= row; col++) balls.push([row, col]);
        balls.forEach(function (b, i) {
          var bp = H.stagger(rack, i, balls.length, 0, 0.6);
          if (bp <= 0) return;
          var bx = ox + table * 0.68 + b[0] * table * 0.035;
          var by = oy + th / 2 + (b[1] - b[0] / 2) * table * 0.042;
          H.disc(ctx, bx, by, table * 0.019 * bp, { fill: i === 4 ? '#111827' : ['#facc15', '#ef4444', '#3b82f6', '#f97316', '#a855f7'][i % 5], alpha: bp, stroke: 'rgba(255,255,255,.5)', width: 1 });
        });
      }
      var cue = H.clamp((f.p - 0.5) / 0.22, 0, 1);
      if (cue > 0) {
        var cueX = ox + table * 0.2, cueY = oy + th * 0.5;
        var pull = Math.sin(cue * Math.PI) * table * 0.06;
        H.seg(ctx, cueX - table * 0.16 + pull, cueY + th * 0.06, cueX - table * 0.02 + pull, cueY, 1, { color: '#d6b98c', width: 4 });
        H.disc(ctx, cueX + pull, cueY, table * 0.019, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.4 });
      }
      var scatter = H.clamp((f.p - 0.68) / 0.26, 0, 1);
      if (scatter > 0) {
        for (var s = 0; s < 7; s++) {
          var a = (s / 7) * Math.PI * 0.9 - Math.PI * 0.45;
          H.disc(ctx, ox + table * 0.2 + Math.cos(a) * table * 0.45 * scatter, oy + th * 0.5 + Math.sin(a) * th * 0.7 * scatter,
            table * 0.018, { fill: ['#facc15', '#ef4444', '#3b82f6', '#f97316', '#a855f7', '#22c55e', '#e2e8f0'][s % 7], alpha: 1 - scatter * 0.3 });
        }
        var eight = H.ease.inCubic(scatter);
        H.disc(ctx, lerp(ox + table * 0.68, ox + table, eight), lerp(oy + th / 2, oy, eight), table * 0.019 * (1 - eight * 0.6), { fill: '#111827', stroke: '#f8fafc', width: 1.2, alpha: 1 - eight * 0.4 });
      }
      H.kicker(ctx, f, 'then sink the eight', { y: f.h * 0.92, color: '#6ee7b7' });
      H.stamp(ctx, f, f.title, { y: f.h * 0.1, start: 0.45, glow: true, color: '#ecfdf5', size: Math.min(f.w * 0.06, 44) });
    }
  });

  register('bowling', {
    duration: 2200, transition: 'wipeU',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0b0409');
      H.wash(ctx, f, 'rgba(251,113,133,.35)', 0.28, f.w * 0.5, f.h * 0.3);
      var top = f.h * 0.2, bottom = f.h * 0.92;
      var laneTop = f.w * 0.22, laneBottom = f.w * 0.78;
      var lane = H.ease.outCubic(H.clamp(f.p / 0.32, 0, 1));
      ctx.save();
      ctx.globalAlpha = lane;
      ctx.fillStyle = '#3f2d20';
      ctx.beginPath();
      ctx.moveTo(f.w * 0.5 - laneTop / 2, top);
      ctx.lineTo(f.w * 0.5 + laneTop / 2, top);
      ctx.lineTo(f.w * 0.5 + laneBottom / 2, bottom);
      ctx.lineTo(f.w * 0.5 - laneBottom / 2, bottom);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,113,133,.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      for (var b = 0; b < 8; b++) {
        var bt = b / 8;
        ctx.globalAlpha = lane * 0.3;
        ctx.strokeStyle = '#8d6e63';
        ctx.beginPath();
        ctx.moveTo(f.w * 0.5 - lerp(laneTop, laneBottom, bt) / 2, lerp(top, bottom, bt));
        ctx.lineTo(f.w * 0.5 + lerp(laneTop, laneBottom, bt) / 2, lerp(top, bottom, bt));
        ctx.stroke();
      }
      ctx.restore();
      var stand = H.ease.outBack(H.clamp((f.p - 0.2) / 0.35, 0, 1));
      if (stand > 0) {
        var rows = [[1], [2], [3], [4]];
        rows.forEach(function (row, ri) {
          row.forEach(function (count, ci) {
            var px = f.w * 0.5 + (ci - (count - 1) / 2) * f.w * 0.035;
            var py = top + f.h * 0.02 + ri * f.h * 0.032;
            ctx.save();
            ctx.globalAlpha = stand;
            ctx.fillStyle = '#f8fafc';
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(px - f.w * 0.008, py + f.h * 0.03 * stand);
            ctx.lineTo(px + f.w * 0.008, py + f.h * 0.03 * stand);
            ctx.lineTo(px + f.w * 0.006, py - f.h * 0.012 * stand);
            ctx.lineTo(px - f.w * 0.006, py - f.h * 0.012 * stand);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          });
        });
      }
      var roll = H.ease.inCubic(H.clamp((f.p - 0.5) / 0.32, 0, 1));
      if (roll > 0 && roll < 1) {
        var rx = f.w * 0.5 + Math.sin(roll * 5) * f.w * 0.02 * (1 - roll);
        var ry = lerp(bottom - f.h * 0.04, top + f.h * 0.05, roll);
        var scale = lerp(1, 0.45, roll);
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 18; }
        H.disc(ctx, rx, ry, f.w * 0.03 * scale, { fill: '#be123c', stroke: '#fb7185', width: 2 });
        ctx.restore();
      }
      var strike = H.clamp((f.p - 0.82) / 0.16, 0, 1);
      if (strike > 0) {
        for (var pin = 0; pin < 10; pin++) {
          var pa = (pin / 10) * Math.PI * 2;
          H.seg(ctx, f.w * 0.5 + Math.cos(pa) * f.w * 0.02, top + f.h * 0.04 + Math.sin(pa) * f.h * 0.02,
            f.w * 0.5 + Math.cos(pa) * f.w * (0.03 + strike * 0.12), top + f.h * 0.04 + Math.sin(pa) * f.h * (0.03 + strike * 0.1), 1,
            { color: 'rgba(251,113,133,' + (1 - strike) + ')', width: 2 });
        }
        H.stamp(ctx, f, 'STRIKE', { y: f.h * 0.55, start: 0.0, glow: true, color: '#fff1f2', size: Math.min(f.w * 0.14, f.h * 0.16) });
      }
      H.kicker(ctx, f, 'find your line', { y: f.h * 0.1, color: '#fda4af' });
    }
  });

  register('basketball', {
    duration: 2150, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0d0703');
      H.wash(ctx, f, 'rgba(251,146,60,.4)', 0.3, f.w * 0.62, f.h * 0.35);
      var court = H.clamp(f.p / 0.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.5 * court;
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(f.w * 0.5, f.h * 0.98, f.w * 0.34 * court, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(f.w * 0.5, f.h * 0.72, f.w * 0.12 * court, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      var rimX = f.w * 0.68, rimY = f.h * 0.34, rimR = f.w * 0.055;
      var back = H.ease.outBack(H.clamp(f.p / 0.28, 0, 1));
      ctx.save();
      ctx.globalAlpha = back;
      H.rect(ctx, rimX + rimR * 0.7, rimY - f.h * 0.16, f.w * 0.09, f.h * 0.14, { fill: 'rgba(226,232,240,.16)', stroke: '#e2e8f0', width: 2.4 });
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.ellipse(rimX, rimY, rimR, rimR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(226,232,240,.7)';
      ctx.lineWidth = 1.2;
      for (var net = 0; net < 8; net++) {
        var na = (net / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(rimX + Math.cos(na) * rimR, rimY + Math.sin(na) * rimR * 0.3);
        ctx.lineTo(rimX + Math.cos(na) * rimR * 0.4, rimY + f.h * 0.08);
        ctx.stroke();
      }
      ctx.restore();
      var shot = H.clamp((f.p - 0.3) / 0.42, 0, 1);
      if (shot > 0) {
        var sx = lerp(f.w * 0.2, rimX, shot);
        var sy = lerp(f.h * 0.78, rimY, shot) - Math.sin(shot * Math.PI) * f.h * 0.3;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(shot * 8);
        if (f.q.glow) { ctx.shadowColor = '#fb923c'; ctx.shadowBlur = 16; }
        H.disc(ctx, 0, 0, f.w * 0.024, { fill: '#f97316', stroke: '#7c2d12', width: 1.6 });
        H.seg(ctx, -f.w * 0.024, 0, f.w * 0.024, 0, 1, { color: '#7c2d12', width: 1.4 });
        H.seg(ctx, 0, -f.w * 0.024, 0, f.w * 0.024, 1, { color: '#7c2d12', width: 1.4 });
        ctx.restore();
        H.path(ctx, [[f.w * 0.2, f.h * 0.78], [f.w * 0.32, f.h * 0.56], [f.w * 0.46, f.h * 0.42], [rimX, rimY]], shot, { color: 'rgba(253,186,116,.4)', width: 2 });
      }
      var swish = H.clamp((f.p - 0.72) / 0.2, 0, 1);
      if (swish > 0) {
        H.ring(ctx, rimX, rimY + f.h * 0.04, rimR * (1 + swish * 1.6), 1, { color: '#fdba74', width: 3, alpha: 1 - swish, glow: f.q.glow });
        H.disc(ctx, rimX, rimY + f.h * 0.06 + swish * f.h * 0.16, f.w * 0.022 * (1 - swish * 0.4), { fill: '#f97316', alpha: 1 - swish * 0.5 });
        H.flash(ctx, f, (1 - swish) * 0.14, '#fed7aa');
      }
      H.kicker(ctx, f, 'time the release', { y: f.h * 0.12, color: '#fdba74' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.92, start: 0.5, span: 0.4, color: '#ffedd5', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('mini-golf', {
    duration: 2200, transition: 'curtain',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04120a');
      var green = H.ease.outCubic(H.clamp(f.p / 0.3, 0, 1));
      ctx.save();
      ctx.globalAlpha = green;
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(f.w * 0.5, f.h * 0.55, f.w * 0.4 * green, f.h * 0.32 * green, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.35 * green;
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.4;
      for (var c = 1; c <= 4; c++) {
        ctx.beginPath();
        ctx.ellipse(f.w * 0.5, f.h * 0.55, f.w * 0.4 * (c / 5), f.h * 0.32 * (c / 5), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      var line = [[f.w * 0.24, f.h * 0.66], [f.w * 0.4, f.h * 0.5], [f.w * 0.56, f.h * 0.58], [f.w * 0.7, f.h * 0.46]];
      H.path(ctx, line, H.ease.inOutCubic(H.clamp((f.p - 0.35) / 0.45, 0, 1)), { color: 'rgba(190,242,100,.6)', width: 2 });
      var putt = H.clamp((f.p - 0.35) / 0.45, 0, 1);
      if (putt > 0) {
        var seg = Math.min(line.length - 2, Math.floor(putt * (line.length - 1)));
        var local = putt * (line.length - 1) - seg;
        var bx = lerp(line[seg][0], line[seg + 1][0], local);
        var by = lerp(line[seg][1], line[seg + 1][1], local);
        H.disc(ctx, bx, by, f.w * 0.012, { fill: '#f8fafc', stroke: '#cbd5e1', width: 1.4, glow: f.q.glow });
        var club = H.clamp((f.p - 0.2) / 0.15, 0, 1);
        if (club < 1) H.seg(ctx, bx - f.w * 0.06, by + f.h * 0.06, bx - f.w * 0.02, by + f.h * 0.01, 1, { color: '#94a3b8', width: 3 });
      }
      var cup = H.clamp((f.p - 0.72) / 0.2, 0, 1);
      if (cup > 0) {
        var cx = line[line.length - 1][0], cy = line[line.length - 1][1];
        H.disc(ctx, cx, cy, f.w * 0.018, { fill: '#052e16', stroke: '#4ade80', width: 2, alpha: cup });
        H.seg(ctx, cx, cy, cx, cy - f.h * 0.16 * cup, 1, { color: '#e2e8f0', width: 2 });
        ctx.save();
        ctx.globalAlpha = cup;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(cx, cy - f.h * 0.16 * cup);
        ctx.lineTo(cx + f.w * 0.045, cy - f.h * 0.14 * cup);
        ctx.lineTo(cx, cy - f.h * 0.11 * cup);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      H.kicker(ctx, f, 'read the slope', { y: f.h * 0.12, color: '#86efac' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.9, start: 0.45, span: 0.4, color: '#f0fdf4', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('soccer-pool', {
    duration: 2100, transition: 'glitch',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#020a10');
      var pitch = Math.min(f.w * 0.82, f.h * 0.74);
      var ph = pitch * 0.52;
      var ox = f.w * 0.5 - pitch / 2, oy = f.h * 0.5 - ph / 2;
      var lines = H.ease.outCubic(H.clamp(f.p / 0.35, 0, 1));
      ctx.save();
      ctx.globalAlpha = 0.8 * lines;
      ctx.strokeStyle = 'rgba(56,189,248,.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, pitch * lines, ph);
      ctx.beginPath();
      ctx.moveTo(ox + pitch / 2, oy);
      ctx.lineTo(ox + pitch / 2, oy + ph);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox + pitch / 2, oy + ph / 2, pitch * 0.1 * lines, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(ox, oy + ph * 0.3, pitch * 0.14 * lines, ph * 0.4);
      ctx.strokeRect(ox + pitch * (1 - 0.14 * lines), oy + ph * 0.3, pitch * 0.14 * lines, ph * 0.4);
      ctx.restore();
      var balls = [[0.3, 0.4], [0.36, 0.55], [0.42, 0.42], [0.44, 0.6], [0.5, 0.5]];
      balls.forEach(function (b, i) {
        var bp = H.stagger(f.p, i, balls.length, 0.2, 0.4);
        if (bp <= 0) return;
        H.disc(ctx, ox + pitch * b[0], oy + ph * b[1], pitch * 0.022 * bp, {
          fill: i === 4 ? '#facc15' : ['#ef4444', '#3b82f6', '#22c55e', '#a855f7'][i % 4], alpha: bp, stroke: 'rgba(255,255,255,.4)', width: 1
        });
      });
      var curl = H.clamp((f.p - 0.45) / 0.35, 0, 1);
      if (curl > 0) {
        var arc = [];
        for (var s = 0; s <= 14; s++) {
          var t3 = s / 14;
          arc.push([ox + pitch * (0.12 + t3 * 0.82), oy + ph * (0.5 + Math.sin(t3 * Math.PI * 1.1) * -0.28)]);
        }
        H.path(ctx, arc, curl, { color: '#e0f2fe', width: 2.4, glow: f.q.glow });
        var head = arc[Math.floor(curl * (arc.length - 1))];
        H.disc(ctx, head[0], head[1], pitch * 0.02, { fill: '#f8fafc', stroke: '#0f172a', width: 1.4 });
      }
      var net = H.clamp((f.p - 0.78) / 0.2, 0, 1);
      if (net > 0) {
        ctx.save();
        ctx.globalAlpha = 0.6 * (1 - net * 0.4);
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 1.2;
        for (var g = 0; g < 7; g++) {
          var gx = ox + pitch * 0.9 + g * pitch * 0.014;
          ctx.beginPath();
          ctx.moveTo(gx, oy + ph * 0.28 + Math.sin(f.time * 0.01 + g) * net * 4);
          ctx.lineTo(gx, oy + ph * 0.72);
          ctx.stroke();
        }
        ctx.restore();
        var score = Math.floor(net * 8);
        ctx.save();
        ctx.globalAlpha = net;
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(f.w * 0.38, f.h * 0.06, f.w * 0.24, f.h * 0.09);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(f.w * 0.38, f.h * 0.06, f.w * 0.24, f.h * 0.09);
        ctx.fillStyle = '#e0f2fe';
        ctx.font = '900 ' + (f.h * 0.06) + 'px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('0' + score + ' : 1', f.w * 0.5, f.h * 0.105);
        ctx.restore();
      }
      H.kicker(ctx, f, 'finish with the eight', { y: f.h * 0.92, color: '#7dd3fc' });
    }
  });

  register('2048', {
    duration: 2200, transition: 'zoom',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#100c08');
      H.wash(ctx, f, 'rgba(250,204,21,.3)', 0.26, f.w * 0.5, f.h * 0.5);
      var n = 4, cell = Math.min(f.w * 0.56, f.h * 0.66) / n, pad = cell * 0.1;
      var ox = f.w * 0.5 - cell * n / 2, oy = f.h * 0.5 - cell * n / 2;
      H.rect(ctx, ox - pad, oy - pad, cell * n + pad * 2, cell * n + pad * 2, {
        fill: 'rgba(120,113,108,.35)', stroke: 'rgba(250,204,21,.4)', width: 2, alpha: H.clamp(f.p / 0.22, 0, 1)
      });
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        H.rect(ctx, ox + c * cell + pad, oy + r * cell + pad, cell - pad * 2, cell - pad * 2, { fill: 'rgba(255,255,255,.05)' });
      }
      var tiles = [
        [0, 0, 2, 0.05], [1, 0, 4, 0.12], [2, 0, 8, 0.2], [3, 0, 16, 0.28],
        [0, 1, 32, 0.36], [1, 1, 64, 0.44], [2, 1, 4, 0.52],
        [0, 2, 128, 0.58], [1, 2, 2, 0.64], [2, 2, 256, 0.7],
        [0, 3, 512, 0.76], [1, 3, 8, 0.8], [2, 3, 1024, 0.85], [3, 3, 2048, 0.9]
      ];
      var shades = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
      tiles.forEach(function (tile) {
        var tp = H.ease.outBack(H.clamp((f.p - tile[3]) / 0.16, 0, 1));
        if (tp <= 0) return;
        var x = ox + tile[1] * cell + pad, y = oy + tile[0] * cell + pad;
        var size = (cell - pad * 2) * tp;
        ctx.save();
        ctx.globalAlpha = tp;
        ctx.fillStyle = shades[tile[2]] || '#edc22e';
        if (tile[2] >= 512 && f.q.glow) { ctx.shadowColor = '#facc15'; ctx.shadowBlur = 22 * tp; }
        ctx.fillRect(x + (cell - pad * 2 - size) / 2, y + (cell - pad * 2 - size) / 2, size, size);
        ctx.fillStyle = tile[2] > 4 ? '#f9f6ec' : '#776e65';
        ctx.font = '900 ' + (cell * (String(tile[2]).length > 3 ? 0.3 : 0.38)) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile[2]), x + (cell - pad * 2) / 2, y + (cell - pad * 2) / 2);
        ctx.restore();
      });
      var merge = H.clamp((f.p - 0.86) / 0.14, 0, 1);
      if (merge > 0) {
        var mx = ox + 3.5 * cell, my = oy + 3.5 * cell;
        H.ring(ctx, mx - cell, my, cell * (0.5 + merge), 1, { color: '#fef08a', width: 3, alpha: 1 - merge, glow: f.q.glow });
        H.flash(ctx, f, (1 - merge) * 0.3, '#fef9c3');
      }
      H.kicker(ctx, f, 'reach the tile', { y: f.h * 0.1, color: '#fde68a' });
    }
  });

  register('sudoku', {
    duration: 2250, transition: 'dissolve',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#f8fafc');
      var size = Math.min(f.w * 0.56, f.h * 0.74), cell = size / 9;
      var ox = f.w * 0.5 - size / 2, oy = f.h * 0.5 - size / 2;
      var ink = '#0f172a';
      var grid = H.ease.outCubic(H.clamp(f.p / 0.34, 0, 1));
      ctx.save();
      ctx.globalAlpha = grid;
      for (var i = 0; i <= 9; i++) {
        var heavy = i % 3 === 0;
        ctx.strokeStyle = heavy ? 'rgba(15,23,42,.85)' : 'rgba(15,23,42,.28)';
        ctx.lineWidth = heavy ? 2.4 : 1;
        ctx.beginPath();
        ctx.moveTo(ox + i * cell * grid, oy);
        ctx.lineTo(ox + i * cell * grid, oy + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ox, oy + i * cell * grid);
        ctx.lineTo(ox + size, oy + i * cell * grid);
        ctx.stroke();
      }
      ctx.restore();
      var given = [[0, 0, 5], [0, 3, 7], [1, 1, 3], [2, 5, 9], [3, 0, 8], [3, 7, 2], [4, 4, 6], [5, 2, 4], [6, 8, 1], [7, 5, 7], [8, 1, 9], [8, 6, 3], [2, 8, 5], [6, 0, 2]];
      for (var g = 0; g < given.length; g++) {
        var gp = H.stagger(f.p, g, given.length, 0.25, 0.5);
        if (gp <= 0) continue;
        var item = given[g];
        ctx.save();
        ctx.globalAlpha = gp;
        ctx.font = '800 ' + (cell * 0.62 * Math.min(1, gp * 1.4)) + 'px ui-rounded, system-ui';
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(item[2]), ox + (item[1] + 0.5) * cell, oy + (item[0] + 0.5) * cell);
        ctx.restore();
      }
      var pencil = H.clamp((f.p - 0.7) / 0.24, 0, 1);
      if (pencil > 0) {
        var cx = ox + 4 * cell, cy = oy + 4 * cell;
        ctx.save();
        ctx.globalAlpha = 0.18 * pencil;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx, cy, cell, cell);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = pencil;
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + cell * 0.2, cy + cell * 0.8);
        ctx.lineTo(cx + cell * 0.75, cy + cell * 0.25);
        ctx.stroke();
        ctx.font = '700 ' + (cell * 0.34) + 'px ui-monospace, monospace';
        ctx.fillStyle = '#0369a1';
        ctx.textAlign = 'center';
        ctx.fillText('1', cx + cell * 0.28, cy + cell * 0.3);
        ctx.fillText('9', cx + cell * 0.72, cy + cell * 0.3);
        ctx.restore();
      }
      H.kicker(ctx, f, 'one of every digit', { y: f.h * 0.1, color: '#475569' });
      H.sketch(ctx, f, f.title, { y: f.h * 0.92, start: 0.55, color: 'rgba(15,23,42,.45)', fill: ink, size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('minesweeper', {
    duration: 2200, transition: 'shutter',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#05070a');
      H.wash(ctx, f, 'rgba(251,191,36,.3)', 0.22, f.w * 0.5, f.h * 0.5);
      var cols = 9, rows = 6;
      var cell = Math.min(f.w * 0.66 / cols, f.h * 0.6 / rows);
      var ox = f.w * 0.5 - cell * cols / 2, oy = f.h * 0.5 - cell * rows / 2;
      var board = H.clamp(f.p / 0.22, 0, 1);
      H.rect(ctx, ox - cell * 0.2, oy - cell * 0.2, cell * (cols + 0.4), cell * (rows + 0.4), { fill: 'rgba(30,41,59,.9)', stroke: 'rgba(148,163,184,.5)', width: 2, alpha: board });
      var numbers = [[0, 0, 1], [0, 1, 2], [1, 0, 1], [2, 4, 3], [3, 4, 1], [4, 2, 2], [5, 5, 1], [2, 6, 3], [4, 7, 1]];
      var mines = [[3, 2], [1, 5], [5, 1], [2, 8]];
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var i = r * cols + c;
          var open = H.stagger(f.p, i, rows * cols, 0.2, 0.55);
          if (open <= 0) continue;
          var x = ox + c * cell, y = oy + r * cell;
          var revealed = H.clamp((open - 0.45) / 0.55, 0, 1);
          ctx.save();
          ctx.globalAlpha = open;
          if (revealed > 0.2) {
            ctx.fillStyle = 'rgba(15,23,42,.9)';
            ctx.fillRect(x, y, cell, cell);
            ctx.strokeStyle = 'rgba(71,85,105,.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cell, cell);
            var num = numbers.filter(function (n) { return n[0] === r && n[1] === c; })[0];
            if (num) {
              ctx.fillStyle = ['#', '#60a5fa', '#4ade80', '#f87171', '#fbbf24'][num[2]] || '#fbbf24';
              ctx.font = '900 ' + (cell * 0.55 * revealed) + 'px ui-monospace, monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(num[2]), x + cell / 2, y + cell / 2);
            }
          } else {
            ctx.fillStyle = 'rgba(100,116,139,.85)';
            ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
            ctx.fillStyle = 'rgba(203,213,225,.35)';
            ctx.fillRect(x + 1, y + 1, cell - 2, 2);
            ctx.fillRect(x + 1, y + 1, 2, cell - 2);
          }
          ctx.restore();
        }
      }
      mines.forEach(function (mine, i) {
        var mp = H.stagger(f.p, i, mines.length, 0.5, 0.4);
        if (mp <= 0) return;
        var x = ox + mine[1] * cell + cell / 2, y = oy + mine[0] * cell + cell / 2;
        ctx.save();
        ctx.globalAlpha = mp;
        if (f.q.glow) { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14; }
        H.disc(ctx, x, y, cell * 0.24 * mp, { fill: '#0f172a', stroke: '#fbbf24', width: 2 });
        for (var spike = 0; spike < 8; spike++) {
          var sa = (spike / 8) * Math.PI * 2;
          H.seg(ctx, x + Math.cos(sa) * cell * 0.24, y + Math.sin(sa) * cell * 0.24,
            x + Math.cos(sa) * cell * 0.36, y + Math.sin(sa) * cell * 0.36, 1, { color: '#fbbf24', width: 1.6 });
        }
        ctx.restore();
      });
      var flag = H.clamp((f.p - 0.78) / 0.18, 0, 1);
      if (flag > 0) {
        var fx = ox + 6 * cell + cell / 2, fy = oy + 3 * cell + cell / 2;
        H.seg(ctx, fx, fy + cell * 0.3, fx, fy - cell * 0.3 * flag, 1, { color: '#e2e8f0', width: 2 });
        ctx.save();
        ctx.globalAlpha = flag;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(fx, fy - cell * 0.3 * flag);
        ctx.lineTo(fx + cell * 0.3 * flag, fy - cell * 0.2 * flag);
        ctx.lineTo(fx, fy - cell * 0.06 * flag);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      H.scanlines(ctx, f.w, f.h, 0.16, 3);
      H.kicker(ctx, f, 'mark every hidden mine', { y: f.h * 0.92, color: '#fbbf24' });
      H.stamp(ctx, f, f.title, { y: f.h * 0.09, start: 0.5, glow: true, color: '#fef3c7', size: Math.min(f.w * 0.055, 40) });
    }
  });

  register('sliding-puzzle', {
    duration: 2250, transition: 'slats',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#060a14');
      H.wash(ctx, f, 'rgba(147,197,253,.35)', 0.28, f.w * 0.5, f.h * 0.5);
      var n = 4, size = Math.min(f.w * 0.56, f.h * 0.72), cell = size / n;
      var ox = f.w * 0.5 - size / 2, oy = f.h * 0.5 - size / 2;
      var order = [[1, 0], [2, 0], [0, 0], [3, 1], [0, 1], [1, 1], [2, 1], [3, 2], [0, 2], [1, 2], [2, 2], [3, 0], [0, 3], [1, 3], [2, 3]];
      for (var i = 0; i < order.length; i++) {
        var sp = H.ease.inOutCubic(H.stagger(f.p, i, order.length, 0.05, 0.7));
        if (sp <= 0) continue;
        var target = [ox + order[i][0] * cell, oy + order[i][1] * cell];
        var from = [ox + (H.rnd(f.seed, i) * 1.6 - 0.3) * size, oy + (H.rnd(f.seed, i + 30) * 1.6 - 0.3) * size];
        var x = lerp(from[0], target[0], sp), y = lerp(from[1], target[1], sp);
        ctx.save();
        ctx.globalAlpha = Math.min(1, sp * 2);
        var grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
        grad.addColorStop(0, 'rgba(147,197,253,.85)');
        grad.addColorStop(1, 'rgba(59,130,246,.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        ctx.strokeStyle = 'rgba(219,234,254,.7)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
        ctx.fillStyle = 'rgba(15,23,42,.85)';
        ctx.font = '900 ' + (cell * 0.32) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), x + cell / 2, y + cell / 2);
        ctx.restore();
      }
      var click = H.clamp((f.p - 0.82) / 0.14, 0, 1);
      if (click > 0) {
        var gap = [ox + 3 * cell, oy + 3 * cell];
        ctx.save();
        ctx.globalAlpha = 1 - click;
        ctx.strokeStyle = '#bfdbfe';
        ctx.lineWidth = 3;
        ctx.strokeRect(gap[0] + click * 6, gap[1] + click * 6, cell - click * 12, cell - click * 12);
        ctx.restore();
        H.flash(ctx, f, (1 - click) * 0.18, '#dbeafe');
      }
      H.kicker(ctx, f, 'one open space', { y: f.h * 0.1, color: '#bfdbfe' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.92, start: 0.5, span: 0.4, color: '#eff6ff', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('nuts-bolts', {
    duration: 2200, transition: 'wipeL',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#080a0d');
      H.wash(ctx, f, 'rgba(203,213,225,.3)', 0.24, f.w * 0.5, f.h * 0.45);
      var pegs = 3, cell = Math.min(f.w * 0.11, f.h * 0.1);
      var ox = f.w * 0.5 - (pegs - 1) * cell * 2.2, oy = f.h * 0.4;
      var colours = ['#ef4444', '#38bdf8', '#4ade80', '#fbbf24'];
      for (var p = 0; p < pegs; p++) {
        var px = ox + p * cell * 2.2;
        var pp = H.ease.outCubic(H.clamp(f.p / 0.25, 0, 1));
        H.seg(ctx, px, oy + cell * 3.4, px, oy + cell * 3.4 - cell * 3.4 * pp, 1, { color: 'rgba(148,163,184,.8)', width: 4 });
        H.disc(ctx, px, oy + cell * 0.05, cell * 0.2, { fill: '#94a3b8', alpha: pp });
        var stack = p === 0 ? 3 : p === 1 ? 2 : 4;
        for (var b = 0; b < stack; b++) {
          var bp = H.stagger(f.p, p * 4 + b, pegs * 4, 0.15, 0.5);
          if (bp <= 0) continue;
          var by = oy + cell * (3.1 - b * 0.55);
          ctx.save();
          ctx.translate(px, by);
          ctx.rotate((1 - bp) * 4 + b);
          ctx.globalAlpha = bp;
          ctx.fillStyle = colours[(p + b) % 4];
          ctx.strokeStyle = 'rgba(15,23,42,.6)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (var h = 0; h < 6; h++) {
            var ha = (h / 6) * Math.PI * 2;
            var hx = Math.cos(ha) * cell * 0.42, hy = Math.sin(ha) * cell * 0.42;
            if (!h) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, cell * 0.16, 0, Math.PI * 2);
          ctx.fillStyle = '#0b0f14';
          ctx.fill();
          ctx.restore();
        }
      }
      var tray = H.clamp((f.p - 0.55) / 0.3, 0, 1);
      if (tray > 0) {
        var ty = f.h * 0.82;
        H.rect(ctx, f.w * 0.2, ty, f.w * 0.6 * tray, cell * 0.9, { fill: 'rgba(30,41,59,.8)', stroke: 'rgba(203,213,225,.5)', width: 2 });
        for (var t = 0; t < Math.round(tray * 6); t++) {
          H.poly(ctx, f.w * 0.24 + t * cell * 0.85, ty + cell * 0.45, cell * 0.32, 6, { fill: colours[t % 4], rot: t, alpha: tray });
        }
      }
      var pop = H.clamp((f.p - 0.82) / 0.16, 0, 1);
      if (pop > 0) {
        for (var s = 0; s < 3; s++) {
          H.disc(ctx, f.w * 0.24 + s * cell * 0.85, ty - pop * f.h * 0.1, cell * 0.3 * (1 - pop), { fill: colours[s % 4], alpha: 1 - pop });
        }
        H.flash(ctx, f, (1 - pop) * 0.16, '#e2e8f0');
      }
      H.kicker(ctx, f, 'three of a colour pop', { y: f.h * 0.1, color: '#cbd5e1' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.18, start: 0.45, span: 0.4, color: '#f1f5f9', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('colour-sort', {
    duration: 2250, transition: 'fade',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04101a');
      H.wash(ctx, f, 'rgba(34,211,238,.35)', 0.28, f.w * 0.5, f.h * 0.5);
      var tubes = 5, tw = Math.min(f.w * 0.075, f.h * 0.1), th = tw * 3.6;
      var ox = f.w * 0.5 - (tubes * tw + (tubes - 1) * tw * 0.7) / 2, oy = f.h * 0.34;
      var colours = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#c084fc'];
      for (var t = 0; t < tubes; t++) {
        var tp = H.ease.outCubic(H.stagger(f.p, t, tubes, 0, 0.4));
        if (tp <= 0) continue;
        var x = ox + t * (tw * 1.7), y = oy;
        ctx.save();
        ctx.globalAlpha = tp * 0.9;
        ctx.strokeStyle = 'rgba(226,232,240,.75)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + th * tp - tw * 0.4);
        ctx.quadraticCurveTo(x, y + th * tp, x + tw * 0.4, y + th * tp);
        ctx.lineTo(x + tw - tw * 0.4, y + th * tp);
        ctx.quadraticCurveTo(x + tw, y + th * tp, x + tw, y + th * tp - tw * 0.4);
        ctx.lineTo(x + tw, y);
        ctx.stroke();
        ctx.restore();
        var fillCount = Math.round(H.stagger(f.p, t, tubes, 0.3, 0.5) * 4);
        for (var s = 0; s < fillCount; s++) {
          var sh = (th - tw * 0.5) / 4;
          ctx.save();
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = colours[(t + s) % 5];
          if (f.q.glow) { ctx.shadowColor = colours[(t + s) % 5]; ctx.shadowBlur = 10; }
          ctx.fillRect(x + 3, y + th - (s + 1) * sh, tw - 6, sh - 2);
          ctx.restore();
        }
      }
      var pour = H.clamp((f.p - 0.55) / 0.3, 0, 1);
      if (pour > 0 && pour < 1) {
        var sx = ox + 1 * tw * 1.7 + tw / 2, dx = ox + 3 * tw * 1.7 + tw / 2;
        var lift = Math.sin(pour * Math.PI) * f.h * 0.14;
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - pour * 0.3);
        ctx.strokeStyle = colours[3];
        ctx.lineWidth = tw * 0.22;
        ctx.lineCap = 'round';
        ctx.shadowColor = colours[3];
        ctx.shadowBlur = f.q.glow ? 16 : 0;
        ctx.beginPath();
        ctx.moveTo(sx, oy - lift + th * 0.2);
        ctx.quadraticCurveTo((sx + dx) / 2, oy - lift - f.h * 0.08, dx, lerp(oy - f.h * 0.05, oy + th * 0.6, pour));
        ctx.stroke();
        ctx.restore();
      }
      var done = H.clamp((f.p - 0.85) / 0.14, 0, 1);
      if (done > 0) {
        for (var d = 0; d < tubes; d++) {
          H.ring(ctx, ox + d * tw * 1.7 + tw / 2, oy + th / 2, tw * (0.8 + done * 0.6), 1, { color: colours[d], width: 2, alpha: 1 - done });
        }
      }
      H.kicker(ctx, f, 'pour until one shade', { y: f.h * 0.92, color: '#a5f3fc' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.14, start: 0.45, span: 0.4, color: '#ecfeff', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('fruit-merge', {
    duration: 2150, transition: 'curtain',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#0c0508');
      H.wash(ctx, f, 'rgba(251,113,133,.35)', 0.3, f.w * 0.5, f.h * 0.6);
      var ground = f.h * 0.86;
      H.rect(ctx, 0, ground, f.w, f.h - ground, { fill: 'rgba(120,53,15,.6)', alpha: H.clamp(f.p / 0.2, 0, 1) });
      var stack = [[0.5, 0.05, '#ef4444'], [0.42, 0.045, '#f97316'], [0.58, 0.045, '#facc15'], [0.5, 0.04, '#84cc16'], [0.36, 0.038, '#22c55e'], [0.64, 0.038, '#06b6d4'], [0.42, 0.035, '#8b5cf6']];
      for (var i = 0; i < stack.length; i++) {
        var sp = H.ease.outBack(H.stagger(f.p, i, stack.length, 0.05, 0.5));
        if (sp <= 0) continue;
        var r = f.w * stack[i][1] * sp;
        var y = ground - r - i * f.h * 0.055 * sp;
        ctx.save();
        ctx.globalAlpha = sp;
        if (f.q.glow) { ctx.shadowColor = stack[i][2]; ctx.shadowBlur = 12; }
        H.disc(ctx, f.w * stack[i][0], y, r, { fill: stack[i][2] });
        H.disc(ctx, f.w * stack[i][0] - r * 0.3, y - r * 0.3, r * 0.22, { fill: 'rgba(255,255,255,.35)' });
        ctx.restore();
      }
      var drop = H.clamp((f.p - 0.5) / 0.32, 0, 1);
      if (drop > 0) {
        var dr = f.w * 0.045;
        var dy = lerp(-dr, ground - dr * 3.4, H.ease.inCubic(drop));
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 16; }
        H.disc(ctx, f.w * 0.5, dy, dr, { fill: '#fb7185' });
        H.seg(ctx, f.w * 0.5, dy - dr, f.w * 0.5 + dr * 0.2, dy - dr * 1.6, 1, { color: '#65a30d', width: 2.4 });
        ctx.restore();
      }
      var merge = H.clamp((f.p - 0.8) / 0.18, 0, 1);
      if (merge > 0) {
        var mx = f.w * 0.5, my = ground - f.h * 0.055 * 7;
        H.ring(ctx, mx, my, f.w * 0.05 * (1 + merge * 1.8), 1, { color: '#fecdd3', width: 3, alpha: 1 - merge, glow: f.q.glow });
        for (var leaf = 0; leaf < 6; leaf++) {
          var la = (leaf / 6) * Math.PI * 2 + merge * 2;
          ctx.save();
          ctx.globalAlpha = 1 - merge;
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.ellipse(mx + Math.cos(la) * f.w * 0.08 * merge, my + Math.sin(la) * f.w * 0.08 * merge, f.w * 0.012, f.w * 0.006, la, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        H.flash(ctx, f, (1 - merge) * 0.2, '#fee2e2');
      }
      H.kicker(ctx, f, 'let the orchard grow', { y: f.h * 0.12, color: '#fda4af' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.22, glow: true, start: 0.45, span: 0.4, color: '#fff1f2', glowColor: '#fb7185', size: Math.min(f.w * 0.055, 42) });
    }
  });

  register('table-tennis', {
    duration: 2050, transition: 'wipeR',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#040a12');
      H.wash(ctx, f, 'rgba(56,189,248,.35)', 0.28, f.w * 0.5, f.h * 0.55);
      var tableW = f.w * 0.76, tableH = f.h * 0.3;
      var ox = f.w * 0.5 - tableW / 2, oy = f.h * 0.52;
      var surf = H.ease.outCubic(H.clamp(f.p / 0.28, 0, 1));
      ctx.save();
      ctx.globalAlpha = surf;
      ctx.fillStyle = '#0f4c81';
      ctx.beginPath();
      ctx.moveTo(ox + tableW * (1 - surf) / 2, oy);
      ctx.lineTo(ox + tableW - tableW * (1 - surf) / 2, oy);
      ctx.lineTo(ox + tableW * 1.06, oy + tableH);
      ctx.lineTo(ox - tableW * 0.06, oy + tableH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,240,.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      var net = H.ease.outCubic(H.clamp((f.p - 0.15) / 0.3, 0, 1));
      if (net > 0) {
        ctx.save();
        ctx.globalAlpha = net;
        ctx.strokeStyle = 'rgba(248,250,252,.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(f.w * 0.5, oy);
        ctx.lineTo(f.w * 0.5, oy - tableH * 0.42 * net);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(248,250,252,.35)';
        ctx.lineWidth = 1;
        for (var mesh = 0; mesh < 6; mesh++) {
          ctx.beginPath();
          ctx.moveTo(f.w * 0.5 - tableW * 0.02, oy - tableH * 0.42 * net * (mesh / 6));
          ctx.lineTo(f.w * 0.5 + tableW * 0.02, oy - tableH * 0.42 * net * (mesh / 6));
          ctx.stroke();
        }
        ctx.restore();
      }
      var rally = H.ease.inOutCubic(H.clamp((f.p - 0.3) / 0.55, 0, 1));
      if (rally > 0) {
        var shots = 3;
        var phase = rally * shots;
        var leg = phase % 1;
        var dir = Math.floor(phase) % 2 === 0 ? 1 : -1;
        var bx = f.w * 0.5 + dir * (0.5 - leg) * tableW * 0.8 * (Math.floor(phase) % 2 === 0 ? 1 : -1) * dir;
        bx = f.w * 0.5 + (dir > 0 ? -1 + leg * 2 : 1 - leg * 2) * tableW * 0.42;
        var by = oy + tableH * 0.4 - Math.sin(leg * Math.PI) * f.h * 0.16;
        ctx.save();
        if (f.q.glow) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14; }
        H.disc(ctx, bx, by, Math.max(3, f.w * 0.008), { fill: '#f8fafc' });
        ctx.restore();
        for (var trail = 1; trail <= 5; trail++) {
          H.disc(ctx, bx - dir * trail * f.w * 0.014, by + trail * f.h * 0.012, Math.max(2, f.w * 0.006) * (1 - trail / 6), { fill: 'rgba(226,232,240,' + (0.4 - trail * 0.07) + ')' });
        }
        [-1, 1].forEach(function (side) {
          var px = f.w * 0.5 + side * tableW * 0.46;
          var swing = Math.sin((phase + (side > 0 ? 0 : 0.5)) * Math.PI * 2) * f.h * 0.05;
          ctx.save();
          ctx.translate(px, oy + tableH * 0.3 + swing);
          ctx.rotate(side * 0.5 + swing * 0.01);
          ctx.fillStyle = side > 0 ? '#dc2626' : '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, 0, f.w * 0.022, f.h * 0.032, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d6b98c';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, f.h * 0.03);
          ctx.lineTo(0, f.h * 0.075);
          ctx.stroke();
          ctx.restore();
        });
      }
      H.kicker(ctx, f, 'meet the ball early', { y: f.h * 0.12, color: '#7dd3fc' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.9, start: 0.45, span: 0.4, color: '#f0f9ff', size: Math.min(f.w * 0.05, 38) });
    }
  });

  register('mahjong', {
    duration: 2300, transition: 'iris',
    draw: function (ctx, f, H) {
      H.ink(ctx, f.w, f.h, '#04100c');
      H.wash(ctx, f, 'rgba(52,211,153,.35)', 0.3, f.w * 0.5, f.h * 0.5);
      var tw = Math.min(f.w * 0.075, f.h * 0.11), th = tw * 1.35;
      var layers = [[6, 0], [5, 1], [4, 2], [3, 3], [2, 4]];
      var laid = 0;
      layers.forEach(function (layer, li) {
        for (var i = 0; i < layer[0]; i++) {
          var index = laid++;
          var sp = H.ease.outBack(H.stagger(f.p, index, 20, 0.05, 0.6));
          if (sp <= 0) continue;
          var x = f.w * 0.5 + (i - (layer[0] - 1) / 2) * tw * 1.08 - li * tw * 0.12;
          var y = f.h * 0.52 + li * th * 0.16 - layer[1] * th * 0.42;
          ctx.save();
          ctx.globalAlpha = sp;
          H.rect(ctx, x - tw / 2, y - th / 2 + (1 - sp) * f.h * 0.2, tw, th, { fill: '#f5f1e6', stroke: 'rgba(120,113,108,.6)', width: 1.4 });
          H.rect(ctx, x - tw / 2, y + th * 0.16, tw, th * 0.2, { fill: '#0f766e', alpha: sp });
          ctx.fillStyle = ['#0f766e', '#be123c', '#1d4ed8', '#a16207'][index % 4];
          ctx.font = '800 ' + (tw * 0.5 * sp) + 'px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(['東', '南', '西', '北', '中', '發', '白', '一'][index % 8], x, y - th * 0.06);
          ctx.restore();
        }
      });
      var clear = H.clamp((f.p - 0.72) / 0.22, 0, 1);
      if (clear > 0) {
        [[-1, 0], [1, 0]].forEach(function (pick, i) {
          var x = f.w * 0.5 + pick.x * tw * 2.4, y = f.h * 0.52 - th * 0.42;
          ctx.save();
          ctx.globalAlpha = 1 - clear;
          ctx.translate(x, y - clear * f.h * 0.16);
          ctx.rotate(pick.x * clear * 0.5);
          H.rect(ctx, -tw / 2, -th / 2, tw, th, { fill: '#f5f1e6', stroke: '#34d399', width: 2 });
          ctx.fillStyle = '#0f766e';
          ctx.font = '800 ' + (tw * 0.5) + 'px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('中', 0, -th * 0.05);
          ctx.restore();
        });
        H.ring(ctx, f.w * 0.5, f.h * 0.4, tw * (1 + clear * 3), 1, { color: '#34d399', width: 2.4, alpha: 1 - clear, glow: f.q.glow });
        H.flash(ctx, f, (1 - clear) * 0.16, '#d1fae5');
      }
      H.kicker(ctx, f, 'clear the jade table', { y: f.h * 0.92, color: '#6ee7b7' });
      H.wordPop(ctx, f, f.title, { y: f.h * 0.12, start: 0.5, span: 0.4, color: '#ecfdf5', size: Math.min(f.w * 0.05, 38) });
    }
  });

  /* ==SCENES== */
}(typeof window !== 'undefined' ? window : this));
