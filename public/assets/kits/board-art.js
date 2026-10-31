/* board-art.js — K7 procedural board presentation for Apex Arcade.
   Additive window.BoardArt: cached materials, frames, piece sprites and celebrations. */
(function () {
  'use strict';

  var Art = (window.BoardArt = window.BoardArt || {});
  var materials = Object.create(null), sprites = Object.create(null), injected = false;
  function hash(s) { var n = 2166136261, i; for (i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n, 16777619); } return n >>> 0; }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function reduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function canvas(size) { var c = document.createElement('canvas'); c.width = c.height = size || 192; return c; }
  function styleOnce() {
    if (injected) return; injected = true;
    var s = document.createElement('style');
    s.textContent =
      '.ba-board{isolation:isolate;overflow:hidden;border-width:2px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 -10px 22px rgba(0,0,0,.25),0 22px 45px -22px #000!important}' +
      '.ba-board:before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.11),transparent 32%,rgba(0,0,0,.17));z-index:0}' +
      '.ba-board .cl{z-index:1;background:linear-gradient(145deg,rgba(29,36,61,.98),rgba(12,16,30,.98))!important;border-color:rgba(189,203,255,.15)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 7px 12px -10px #000;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}' +
      '.ba-board .cl.free:hover{transform:translateY(-2px);background:linear-gradient(145deg,rgba(46,59,96,.98),rgba(17,23,43,.98))!important;box-shadow:0 12px 22px -14px #000,inset 0 1px 0 rgba(255,255,255,.15)}' +
      '.ba-piece{width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 8px 5px rgba(0,0,0,.36));transform:translateY(-1px);animation:ba-place .34s cubic-bezier(.2,1.45,.45,1) both}' +
      '.ba-board .cl.win{background:linear-gradient(145deg,rgba(21,104,90,.8),rgba(10,52,52,.95))!important;box-shadow:0 0 0 1px rgba(110,255,212,.55),0 0 22px rgba(59,238,185,.28)!important}' +
      '.ba-board .cl.win .ba-piece{animation:ba-pulse .75s ease-in-out infinite alternate}' +
      '.ba-spark{position:absolute;width:7px;height:7px;border-radius:50%;background:var(--ba-c,#8bffdf);left:50%;top:50%;z-index:2;pointer-events:none;box-shadow:0 0 10px currentColor;animation:ba-spark .8s cubic-bezier(.12,.8,.3,1) forwards}' +
      '@keyframes ba-place{from{opacity:0;transform:scale(.48) rotate(-8deg)}to{opacity:1;transform:translateY(-1px) scale(1) rotate(0)}}' +
      '@keyframes ba-pulse{to{transform:translateY(-2px) scale(1.08);filter:drop-shadow(0 0 9px rgba(119,255,210,.8))}}' +
      '@keyframes ba-spark{to{transform:translate(var(--ba-x),var(--ba-y)) scale(.1);opacity:0}}' +
      '@media (prefers-reduced-motion:reduce){.ba-piece,.ba-board .cl.win .ba-piece,.ba-spark{animation:none!important}.ba-board .cl.free:hover{transform:none}}';
    document.head.appendChild(s);
  }
  function material(kind, size) {
    size = size || 192; var key = kind + ':' + size, old = materials[key]; if (old) return old;
    var c = canvas(size), x = c.getContext('2d'), r = rng(hash(key)), i, g;
    if (kind === 'slate') {
      g = x.createLinearGradient(0, 0, size, size); g.addColorStop(0, '#172343'); g.addColorStop(1, '#080d1c'); x.fillStyle = g; x.fillRect(0, 0, size, size);
      for (i = 0; i < size * 2; i++) { x.fillStyle = 'rgba(160,190,255,' + (r() * .045) + ')'; x.fillRect(r() * size, r() * size, 1, 1); }
    } else if (kind === 'wood') {
      g = x.createLinearGradient(0, 0, size, 0); g.addColorStop(0, '#4a2718'); g.addColorStop(.5, '#8c4d28'); g.addColorStop(1, '#3a1e16'); x.fillStyle = g; x.fillRect(0, 0, size, size);
      for (i = 0; i < 44; i++) { x.strokeStyle = 'rgba(34,14,8,' + (.08 + r() * .14) + ')'; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(0, r() * size); x.bezierCurveTo(size * .28, r() * size, size * .7, r() * size, size, r() * size); x.stroke(); }
    } else if (kind === 'felt') {
      x.fillStyle = '#113e36'; x.fillRect(0, 0, size, size); for (i = 0; i < size * 3; i++) { x.fillStyle = 'rgba(190,255,224,' + r() * .05 + ')'; x.fillRect(r() * size, r() * size, 1, 1); }
    } else if (kind === 'marble') {
      x.fillStyle = '#d8dde8'; x.fillRect(0, 0, size, size); for (i = 0; i < 13; i++) { x.strokeStyle = 'rgba(68,95,140,' + (.07 + r() * .12) + ')'; x.lineWidth = .5 + r() * 1.3; x.beginPath(); x.moveTo(r() * size, 0); x.bezierCurveTo(r() * size, size * .3, r() * size, size * .7, r() * size, size); x.stroke(); }
    } else {
      x.fillStyle = '#e7d9b8'; x.fillRect(0, 0, size, size); for (i = 0; i < size * 2; i++) { x.fillStyle = 'rgba(84,52,28,' + r() * .045 + ')'; x.fillRect(r() * size, r() * size, 1, 1); }
    }
    materials[key] = c; return c;
  }
  Art.material = material;
  Art.pattern = function (ctx, kind, size) { return ctx.createPattern(material(kind || 'slate', size), 'repeat'); };
  Art.textureURL = function (kind, size) { return material(kind || 'slate', size).toDataURL('image/png'); };
  Art.frame = function (el, opts) {
    if (!el) return; opts = opts || {}; styleOnce();
    var accent = opts.accent || '#8b5cf6'; el.classList.add('ba-board');
    el.style.backgroundImage = 'url("' + Art.textureURL(opts.material || 'slate') + '")';
    el.style.borderColor = accent; el.style.setProperty('--ba-c', accent);
  };
  function sprite(symbol, color) {
    var key = symbol + ':' + color, old = sprites[key]; if (old) return old;
    var c = canvas(180), x = c.getContext('2d'), g = x.createLinearGradient(26, 18, 150, 164);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.16, color); g.addColorStop(1, '#241743');
    x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 21; x.strokeStyle = 'rgba(0,0,0,.26)';
    if (symbol === 'x') { x.beginPath(); x.moveTo(47, 43); x.lineTo(137, 137); x.moveTo(133, 43); x.lineTo(43, 137); x.stroke(); x.strokeStyle = g; x.lineWidth = 15; x.beginPath(); x.moveTo(47, 40); x.lineTo(137, 134); x.moveTo(133, 40); x.lineTo(43, 134); x.stroke(); }
    else { x.beginPath(); x.arc(90, 90, 51, 0, Math.PI * 2); x.stroke(); x.strokeStyle = g; x.lineWidth = 15; x.beginPath(); x.arc(90, 87, 51, 0, Math.PI * 2); x.stroke(); }
    sprites[key] = c.toDataURL('image/png'); return sprites[key];
  }
  Art.markHTML = function (symbol, opts) { opts = opts || {}; var color = opts.color || (symbol === 'x' ? '#32d5ef' : '#ffbd4a'); return '<img class="ba-piece" alt="' + symbol.toUpperCase() + '" src="' + sprite(symbol, color) + '">'; };
  Art.celebrate = function (el, opts) {
    if (!el || reduced()) return; opts = opts || {}; var count = opts.count || 16, i, p, a, d;
    for (i = 0; i < count; i++) { p = document.createElement('i'); p.className = 'ba-spark'; a = Math.random() * Math.PI * 2; d = 60 + Math.random() * 150; p.style.setProperty('--ba-x', Math.cos(a) * d + 'px'); p.style.setProperty('--ba-y', Math.sin(a) * d + 'px'); p.style.background = opts.color || '#8bffdf'; el.appendChild(p); setTimeout((function (node) { return function () { node.remove(); }; })(p), 860); }
  };
})();
