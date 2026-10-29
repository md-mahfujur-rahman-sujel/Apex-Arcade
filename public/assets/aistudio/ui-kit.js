/* ui-kit.js — K4 presentation kit for Apex Arcade. Additive window.UI.
   Canvas overlays, settings, level maps, results, toasts, dialogue and hints.
   Loads after arcade-core.js and Save when available. */
(function () {
  'use strict';

  var UI = (window.UI = window.UI || {});
  var TAU = Math.PI * 2;
  var toasts = [];
  var dialogue = null;
  var hint = null;

  function clamp(n, a, b) { return n < a ? a : n > b ? b : n; }
  function alpha(hex, a) {
    if (window.Arcade && Arcade.alpha) return Arcade.alpha(hex, a);
    return hex;
  }
  function reduced(gameId) {
    try { if (window.Fx && Fx.reducedMotion) return Fx.reducedMotion(gameId); } catch (e) {}
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    return false;
  }
  function text(c, str, x, y, size, color, align, weight) {
    c.fillStyle = color || '#fff';
    c.font = (weight || '700') + ' ' + size + 'px ' + ((window.Arcade && Arcade.FONT) || 'system-ui,sans-serif');
    c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(str, x, y);
  }
  function round(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function panel(c, w, h, accent, title, subtitle) {
    var pw = Math.min(w - 32, 372), ph = subtitle ? 238 : 200;
    var x = (w - pw) / 2, y = (h - ph) / 2;
    c.save();
    c.fillStyle = 'rgba(4,7,17,.78)'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(17,22,43,.96)'; round(c, x, y, pw, ph, 18); c.fill();
    c.strokeStyle = alpha(accent, .8); c.lineWidth = 2; round(c, x, y, pw, ph, 18); c.stroke();
    c.fillStyle = alpha(accent, .22); round(c, x + 1, y + 1, pw - 2, 58, 17); c.fill();
    text(c, title, w / 2, y + 43, 29, accent, 'center', '800');
    if (subtitle) text(c, subtitle, w / 2, y + 84, 15, '#d7ddf5', 'center', '600');
    c.restore();
    return { x: x, y: y, w: pw, h: ph };
  }
  function save(gameId, patch) {
    try { if (window.Save && Save.update) return Save.update(gameId, patch); } catch (e) {}
    return null;
  }
  function getSave(gameId) {
    try { if (window.Save && Save.load) return Save.load(gameId); } catch (e) {}
    return { level: 1, stars: {}, settings: { musicVol: .8, sfxVol: .8, reduceMotion: false, colorblind: 'none' } };
  }
  function applyReducedMotion(enabled, gameId, persist, notifyParent) {
    enabled = enabled === true;
    if (document.documentElement) {
      if (enabled) document.documentElement.setAttribute('data-apex-reduced-motion', 'true');
      else document.documentElement.removeAttribute('data-apex-reduced-motion');
    }
    if (persist && gameId) save(gameId, { settings: { reduceMotion: enabled } });
    if (notifyParent && window.parent !== window) {
      try { window.parent.postMessage({ type: 'APEX_REDUCED_MOTION_CHANGED', reducedMotion: enabled }, window.location.origin); } catch (e) {}
    }
  }
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (event.source !== window.parent || event.origin !== window.location.origin || !data || data.type !== 'SET_ACCESSIBILITY' || typeof data.reducedMotion !== 'boolean') return;
    var gameId = window.Arcade && Arcade.G && Arcade.G.cfg && Arcade.G.cfg.id || data.gameId;
    applyReducedMotion(data.reducedMotion, gameId, true, false);
  });

  UI.toast = function (message, opts) {
    opts = opts || {};
    if (toasts.length >= 4) toasts.shift();
    toasts.push({ message: String(message), color: opts.color || '#67e8f9', life: opts.life || 150, max: opts.life || 150 });
  };
  UI.drawToasts = function (c, w) {
    var i, t, k, y;
    for (i = toasts.length - 1; i >= 0; i--) {
      t = toasts[i]; t.life--;
      if (t.life <= 0) { toasts.splice(i, 1); continue; }
      k = clamp(t.life / t.max * 3, 0, 1); y = 52 + i * 38;
      c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(8,12,27,.9)'; round(c, w - 194, y - 15, 178, 30, 9); c.fill();
      c.strokeStyle = alpha(t.color, .7); round(c, w - 194, y - 15, 178, 30, 9); c.stroke();
      text(c, t.message, w - 105, y, 13, t.color, 'center', '800'); c.restore();
    }
  };

  UI.hint = function (message, opts) { hint = { message: String(message), life: (opts && opts.life) || 240, max: (opts && opts.life) || 240 }; };
  UI.drawHint = function (c, w, h) {
    if (!hint) return;
    hint.life--; if (hint.life <= 0) { hint = null; return; }
    c.save(); c.globalAlpha = clamp(hint.life / hint.max * 3, 0, 1); c.fillStyle = 'rgba(4,7,17,.82)'; round(c, 26, h - 66, w - 52, 38, 12); c.fill();
    text(c, hint.message, w / 2, h - 47, 13, '#d7ddf5', 'center'); c.restore();
  };

  UI.dialogue = {
    show: function (data) { dialogue = { data: data || {}, chars: 0, done: false }; },
    dismiss: function () { dialogue = null; },
    draw: function (c, w, h) {
      if (!dialogue) return false;
      var d = dialogue.data, full = String(d.text || ''), speed = d.speed || 1.3;
      dialogue.chars = Math.min(full.length, dialogue.chars + speed);
      var shown = full.slice(0, dialogue.chars | 0), y = h - 152;
      c.save(); c.fillStyle = 'rgba(8,12,27,.94)'; round(c, 18, y, w - 36, 122, 16); c.fill();
      c.strokeStyle = d.color || '#67e8f9'; c.lineWidth = 2; round(c, 18, y, w - 36, 122, 16); c.stroke();
      c.fillStyle = alpha(d.color || '#67e8f9', .25); c.beginPath(); c.arc(58, y + 46, 27, 0, TAU); c.fill();
      text(c, d.portrait || '✦', 58, y + 46, 27, d.color || '#67e8f9', 'center');
      text(c, d.name || 'Guide', 96, y + 27, 13, d.color || '#67e8f9', 'left', '800');
      text(c, shown, 96, y + 58, 14, '#e7ebfb', 'left', '600');
      text(c, dialogue.chars < full.length ? 'tap or any key to skip' : 'tap or any key to continue', w - 30, y + 102, 11, '#9ca8ca', 'right'); c.restore();
      return true;
    }
  };

  UI.levelMap = function (c, w, y, levels, current, accent) {
    levels = levels || []; current = current || 1; accent = accent || '#67e8f9';
    var count = Math.max(1, levels.length), gap = Math.min(58, (w - 62) / Math.max(1, count - 1)), start = (w - gap * (count - 1)) / 2, i, x, level, unlocked;
    c.save(); c.strokeStyle = alpha(accent, .35); c.lineWidth = 3; c.beginPath(); c.moveTo(start, y); c.lineTo(start + gap * (count - 1), y); c.stroke();
    for (i = 0; i < count; i++) {
      x = start + gap * i; level = levels[i] || {}; unlocked = level.unlocked !== false && i < current;
      c.fillStyle = unlocked ? (i + 1 === current ? accent : '#263252') : '#141a2c'; c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fill();
      c.strokeStyle = i + 1 === current ? '#fff' : alpha(accent, .55); c.lineWidth = i + 1 === current ? 2 : 1; c.stroke();
      text(c, unlocked ? String(i + 1) : '·', x, y + 1, 13, unlocked ? '#fff' : '#697494', 'center', '800');
    }
    c.restore();
  };

  UI.title = function (c, w, h, opts) {
    opts = opts || {}; var p = panel(c, w, h, opts.color || '#67e8f9', opts.title || 'Apex Arcade', opts.subtitle || '');
    UI.levelMap(c, w, p.y + 126, opts.levels || [{}, {}, {}, {}, {}], opts.level || 1, opts.color);
    text(c, opts.chapter || 'CHAPTER 1', w / 2, p.y + 162, 12, '#aab5d5', 'center', '800');
    text(c, reduced(opts.gameId) ? 'Tap or press any key to start' : 'Tap or press any key to begin', w / 2, p.y + p.h - 30, 14, opts.color || '#67e8f9', 'center', '800');
  };
  UI.pause = function (c, w, h, opts) {
    opts = opts || {}; var p = panel(c, w, h, '#fbbf24', 'Paused', opts.settingsOpen ? 'Settings' : 'Take a breath. Your run is safe.');
    if (!opts.settingsOpen) {
      text(c, 'P / Esc  Resume', w / 2, p.y + 130, 15, '#e6eaff', 'center');
      text(c, 'S  Settings', w / 2, p.y + 160, 14, '#9ca8ca', 'center');
      text(c, 'M  Sound', w / 2, p.y + 187, 14, '#9ca8ca', 'center');
      return;
    }
    var s = opts.settings || {}, rows = [
      ['Music', Math.round((s.musicVol == null ? .8 : s.musicVol) * 100) + '%'],
      ['SFX', Math.round((s.sfxVol == null ? .8 : s.sfxVol) * 100) + '%'],
      ['Reduced motion', s.reduceMotion ? 'On' : 'Off'],
      ['Colour mode', s.colorblind && s.colorblind !== 'none' ? s.colorblind : 'Default']
    ], i;
    for (i = 0; i < rows.length; i++) {
      text(c, (i === opts.selected ? '›  ' : '') + rows[i][0], p.x + 28, p.y + 120 + i * 25, 14, i === opts.selected ? '#fbbf24' : '#e6eaff', 'left', '800');
      text(c, rows[i][1], p.x + p.w - 28, p.y + 120 + i * 25, 13, '#b7c1df', 'right');
    }
    text(c, '↑↓ select  ·  ←→ change  ·  S close', w / 2, p.y + p.h - 25, 11, '#9ca8ca', 'center');
  };
  UI.results = function (c, w, h, opts) {
    opts = opts || {}; var win = !!opts.win, accent = win ? '#34d399' : '#fb7185';
    var p = panel(c, w, h, accent, opts.title || (win ? 'Run Complete' : 'Lost in the Dark'), opts.subtitle || '');
    text(c, 'SCORE  ' + (opts.score || 0), w / 2, p.y + 126, 22, '#fbbf24', 'center', '800');
    text(c, 'BEST  ' + (opts.best || 0), w / 2, p.y + 155, 14, '#d7ddf5', 'center', '700');
    text(c, 'Press Enter, R, or tap to play again', w / 2, p.y + p.h - 30, 13, '#9ca8ca', 'center');
  };

  UI.mountArcade = function (G, opts) {
    if (!G || !G.canvas || !G.canvas.parentNode || G.uiMounted) return null;
    opts = opts || {}; G.uiMounted = true;
    var wrap = G.canvas.parentNode, layer = document.createElement('canvas'), c = layer.getContext('2d');
    layer.className = 'apex-ui-layer'; layer.setAttribute('aria-hidden', 'true');
    // arcade-core styles every canvas with a black background; this overlay must stay transparent.
    layer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:12px;background:transparent;';
    wrap.appendChild(layer);
    var settingsOpen = false, selected = 0, dirty = true, settings = getSave(opts.gameId);
    function fit() {
      var box = G.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      layer.width = Math.max(1, Math.round(box.width * dpr)); layer.height = Math.max(1, Math.round(box.height * dpr));
      c.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = true;
    }
    function updateSetting(delta) {
      var s = settings.settings || (settings.settings = {}), key = ['musicVol', 'sfxVol', 'reduceMotion', 'colorblind'][selected];
      if (key === 'musicVol' || key === 'sfxVol') s[key] = clamp((s[key] == null ? .8 : s[key]) + delta * .1, 0, 1);
      else if (key === 'reduceMotion') s[key] = !s[key];
      else { var modes = ['none', 'protan', 'deutan', 'tritan']; s[key] = modes[(modes.indexOf(s[key] || 'none') + (delta < 0 ? modes.length - 1 : 1)) % modes.length]; }
      settings = save(opts.gameId, { settings: s }) || settings;
      if (key === 'reduceMotion') applyReducedMotion(s.reduceMotion, opts.gameId, false, true);
      UI.toast('Settings saved', { color: '#34d399' });
    }
    if (settings.settings && settings.settings.reduceMotion) applyReducedMotion(true, opts.gameId, false, true);
    window.addEventListener('resize', fit); fit();
    window.addEventListener('keydown', function (e) {
      if (G.state !== 'paused') { settingsOpen = false; return; }
      if (e.code === 'KeyS') { settingsOpen = !settingsOpen; dirty = true; return; }
      if (!settingsOpen) return;
      if (e.code === 'ArrowUp') { selected = (selected + 3) % 4; dirty = true; }
      else if (e.code === 'ArrowDown') { selected = (selected + 1) % 4; dirty = true; }
      else if (e.code === 'ArrowLeft') { updateSetting(-1); dirty = true; }
      else if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') { updateSetting(1); dirty = true; }
    });
    function draw() {
      var w = layer.width / (window.devicePixelRatio || 1), h = layer.height / (window.devicePixelRatio || 1);
      c.clearRect(0, 0, w, h);
      if (G.state === 'ready') UI.title(c, w, h, { gameId: opts.gameId, title: opts.title, subtitle: opts.subtitle, color: opts.color, level: (getSave(opts.gameId).level || 1), levels: opts.levels, chapter: opts.chapter });
      else if (G.state === 'paused') UI.pause(c, w, h, { settingsOpen: settingsOpen, settings: settings.settings, selected: selected });
      else if (G.state === 'over' || G.state === 'won') UI.results(c, w, h, { win: G.state === 'won', title: G.title, subtitle: G.sub, score: G.score, best: G.hi });
      else { UI.drawToasts(c, w); UI.drawHint(c, w, h); }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    return layer;
  };

  // Config-driven shell for new and migrated games. The legacy mountArcade API
  // remains the renderer and keeps its original call shape and behavior.
  UI.mountGame = function (G, config) {
    if (!G || !G.canvas || !G.canvas.parentNode || !config || !config.id || !config.title) return null;
    var modes = Array.isArray(config.modes) && config.modes.length ? config.modes : [{ id: 'classic', name: 'Classic' }];
    var hooks = config.hooks || {}, host = G.canvas.parentNode;
    var layer = UI.mountArcade(G, {
      gameId: config.id, title: config.title, subtitle: config.subtitle,
      color: config.accent || '#67e8f9', chapter: config.chapter,
      levels: config.levels, settings: config.settings, hooks: hooks
    });
    if (!layer) return null;

    var root = document.createElement('div');
    root.className = 'apex-game-menu'; root.setAttribute('aria-label', config.title + ' game controls');
    root.style.cssText = 'position:absolute;inset:0;z-index:8;display:flex;align-items:flex-end;justify-content:center;padding:12px;pointer-events:none;font:600 13px system-ui,sans-serif;color:#f8fafc;';
    var panelEl = document.createElement('div');
    panelEl.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;max-width:100%;padding:9px 12px;border:1px solid rgba(148,163,184,.35);border-radius:14px;background:rgba(7,12,25,.94);box-shadow:0 8px 32px rgba(0,0,0,.35);pointer-events:auto;';
    root.appendChild(panelEl); host.appendChild(root);
    var saved = getSave(config.id), currentSettings = Object.assign({}, saved.settings || {});
    var selectedMode = modes.some(function (mode) { return mode.id === currentSettings.mode; }) ? currentSettings.mode : modes[0].id;
    function modeUnlocked(mode) {
      if (!mode || !mode.requires) return true;
      var record = window.Save && typeof Save.load === 'function' ? Save.load(config.id) || {} : saved;
      var stat = mode.requires.stat, required = Math.max(1, Number(mode.requires.gte) || 1);
      return Number(record.stats && record.stats[stat]) >= required;
    }
    if (!modeUnlocked(modes.find(function (mode) { return mode.id === selectedMode; }))) {
      var firstAvailableMode = modes.find(modeUnlocked);
      selectedMode = firstAvailableMode ? firstAvailableMode.id : modes[0].id;
    }
    var mutators = Array.isArray(config.mutators) ? config.mutators : [], selectedMutator = mutators.some(function (item) { return item.id === currentSettings.mutator; }) ? currentSettings.mutator : 'none';
    var settingsOpen = false, customizeOpen = false, tutorialOpen = false, tutorialInputLocked = null, achievementsOpen = false, tutorialIndex = 0, lastState = G.state, padPrev = {}, focusIndex = 0;
    var gameSettings = (config.settings || []).slice();
    if (!gameSettings.some(function (item) { return item.key === 'reduceMotion'; })) gameSettings.push({ key: 'reduceMotion', label: 'Reduced motion', type: 'toggle', default: false });
    gameSettings.forEach(function (item) {
      if (currentSettings[item.key] == null && item.default != null) currentSettings[item.key] = item.default;
    });
    if (typeof hooks.applySetting === 'function') gameSettings.forEach(function (item) {
      if (currentSettings[item.key] != null) {
        hooks.applySetting(item.key, currentSettings[item.key]);
        if (item.key === 'difficulty') window.postMessage({ type: 'SET_DIFFICULTY', difficulty: currentSettings[item.key] }, window.location.origin);
      }
    });
    if (currentSettings.reduceMotion === true) applyReducedMotion(true, config.id, false, true);
    function applyMutator() {
      var entry = mutators.find(function (item) { return item.id === selectedMutator; });
      G.scoreMultiplier = entry ? Math.max(0.1, Number(entry.multiplier) || 1) : 1;
      if (typeof hooks.applyMutator === 'function') hooks.applyMutator(entry || null);
    }
    applyMutator();
    if (window.Meta && typeof Meta.getCosmetics === 'function' && typeof hooks.applyCosmetic === 'function') {
      Meta.getCosmetics(config.id).forEach(function (item) { if (item.equipped) hooks.applyCosmetic(item.slot, item.id); });
    }

    function button(label, action, extra) {
      var el = document.createElement('button'); el.type = 'button'; el.textContent = label;
      el.style.cssText = 'min-height:40px;padding:8px 13px;border:1px solid rgba(148,163,184,.45);border-radius:10px;background:#172033;color:#f8fafc;font:700 13px system-ui,sans-serif;cursor:pointer;';
      el.addEventListener('focus', function () { focusIndex = Math.max(0, controls().indexOf(el)); });
      el.addEventListener('click', action); if (extra) el.setAttribute('aria-label', extra);
      panelEl.appendChild(el); return el;
    }
    function controls() { return Array.prototype.slice.call(panelEl.querySelectorAll('button,select,input')); }
    function setFocus(next) {
      var all = controls(); if (!all.length) return;
      focusIndex = (next + all.length) % all.length; all[focusIndex].focus();
    }
    function saveSetting(item, value) {
      currentSettings[item.key] = value;
      var patch = { settings: {} }; patch.settings[item.key] = value;
      save(config.id, patch);
      if (typeof hooks.applySetting === 'function') hooks.applySetting(item.key, value);
      if (item.key === 'difficulty') window.postMessage({ type: 'SET_DIFFICULTY', difficulty: value }, window.location.origin);
      if (item.key === 'reduceMotion') applyReducedMotion(value, config.id, false, true);
    }
    function changeSetting(item, delta) {
      var value = currentSettings[item.key];
      if (item.type === 'toggle') value = !value;
      else if (item.type === 'select') {
        var options = item.options || [], index = options.indexOf(value);
        value = options[(index + (delta < 0 ? options.length - 1 : 1)) % options.length];
      } else value = clamp((Number(value == null ? item.default || 0 : value) || 0) + delta * (Number(item.step) || .1), Number(item.min) || 0, item.max == null ? 1 : Number(item.max));
      saveSetting(item, value); render();
    }
    function applyMode(modeId) { return typeof hooks.applyMode !== 'function' || hooks.applyMode(modeId || selectedMode) !== false; }
    function selectMode(modeId, shouldRender) {
      var entry = modes.find(function (mode) { return mode.id === modeId; });
      if (!entry || !modeUnlocked(entry) || !applyMode(modeId)) return false;
      selectedMode = modeId;
      save(config.id, { settings: { mode: selectedMode } });
      if (shouldRender !== false) render();
      return true;
    }
    function play() {
      settingsOpen = false; customizeOpen = false;
      if (!applyMode()) { UI.toast('This mode is still locked.', { color: '#fbbf24' }); return; }
      if (window.Apex && typeof Apex.report === 'function') Apex.report({ gameId: config.id, type: 'mode_start', mode: selectedMode });
      if (G.state === 'ready') G.begin(); else if (G.state === 'over' || G.state === 'won') G.restart(true);
    }
    function pause() { customizeOpen = false; if (G.state === 'playing') G.pauseToggle(); }
    function resume() { if (G.state === 'paused') { settingsOpen = false; customizeOpen = false; G.pauseToggle(); } }
    function backToMenu() { settingsOpen = false; customizeOpen = false; G.restart(false); }
    function setTutorialOpen(open) {
      if (open) {
        if (tutorialInputLocked === null) tutorialInputLocked = !!G.inputLocked;
        G.inputLocked = true;
        tutorialOpen = true;
      } else {
        tutorialOpen = false;
        if (tutorialInputLocked !== null) G.inputLocked = tutorialInputLocked;
        tutorialInputLocked = null;
      }
    }
    function downloadResultMedia(blob, name) {
      var url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.style.display = 'none'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function saveClip(buttonEl) {
      var canvas = G.canvas, stamp = config.id.replace(/[^a-z0-9-]/gi, '-') + '-result';
      function saveScreenshot() {
        if (!canvas || typeof canvas.toBlob !== 'function') { buttonEl.disabled = false; buttonEl.textContent = 'Clip unavailable'; return; }
        try {
          canvas.toBlob(function (blob) {
            if (blob) { downloadResultMedia(blob, stamp + '.png'); buttonEl.textContent = 'Saved screenshot card'; }
            else buttonEl.textContent = 'Could not save result';
            buttonEl.disabled = false;
            setTimeout(function () { if (buttonEl.isConnected) buttonEl.textContent = 'Save result clip/card'; }, 2200);
          }, 'image/png');
        } catch (error) { buttonEl.disabled = false; buttonEl.textContent = 'Could not save result'; }
      }
      if (canvas && typeof canvas.captureStream === 'function' && typeof window.MediaRecorder === 'function') {
        var stream = null;
        try {
          stream = canvas.captureStream(30);
          var chunks = [], recorder = new MediaRecorder(stream), settled = false;
          function finishClip(useScreenshot) {
            if (settled) return;
            settled = true;
            stream.getTracks().forEach(function (track) { track.stop(); });
            if (!useScreenshot && chunks.length) downloadResultMedia(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }), stamp + '.webm');
            if (useScreenshot || !chunks.length) { saveScreenshot(); return; }
            buttonEl.disabled = false; buttonEl.textContent = 'Save 10s clip';
          }
          recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
          recorder.onerror = function () { finishClip(true); };
          recorder.onstop = function () { finishClip(false); };
          buttonEl.disabled = true; buttonEl.textContent = 'Recording 10 seconds…'; recorder.start(); setTimeout(function () { if (recorder.state === 'recording') recorder.stop(); }, 10000); return;
        } catch (e) { if (stream) stream.getTracks().forEach(function (track) { track.stop(); }); /* Fall through to the screenshot card on unsupported recorders. */ }
      }
      saveScreenshot();
    }
    function renderTutorial() {
      var steps = config.tutorial && Array.isArray(config.tutorial.steps) ? config.tutorial.steps : [];
      var step = steps[tutorialIndex] || {};
      var textEl = document.createElement('span'); textEl.style.cssText = 'max-width:460px;padding:7px;color:#e2e8f0;';
      textEl.textContent = (tutorialIndex + 1) + '/' + steps.length + ' · ' + (step.text || 'Follow the controls shown on the game screen.') + (step.hold ? '  Press ' + step.hold + ' to continue.' : ''); panelEl.appendChild(textEl);
      if (tutorialIndex > 0) button('Back', function () { tutorialIndex--; render(); });
      button(tutorialIndex + 1 < steps.length ? 'Next' : 'Finish', function () {
        if (tutorialIndex + 1 < steps.length) { tutorialIndex++; render(); return; }
        setTutorialOpen(false); save(config.id, { settings: { tutorialComplete: true } }); render();
      });
      button('Skip tutorial', function () { setTutorialOpen(false); save(config.id, { settings: { tutorialComplete: true } }); render(); });
      setFocus(0);
    }
    window.addEventListener('keydown', function (event) {
      if (!tutorialOpen) return;
      event.preventDefault(); event.stopPropagation();
      var steps = config.tutorial && config.tutorial.steps || [], step = steps[tutorialIndex] || {};
      if (!step.hold || step.hold === event.code || step.hold === event.key) {
        if (tutorialIndex + 1 < steps.length) tutorialIndex++;
        else { setTutorialOpen(false); save(config.id, { settings: { tutorialComplete: true } }); }
        render();
      }
    }, true);
    function renderAchievements() {
      var savedGame = getSave(config.id), unlocked = Array.isArray(savedGame.achievements) ? savedGame.achievements : [];
      (config.achievements || []).forEach(function (item) {
        var row = document.createElement('span'); row.style.cssText = 'min-width:160px;padding:6px 8px;border:1px solid rgba(148,163,184,.22);border-radius:8px;color:' + (unlocked.indexOf(item.id) >= 0 ? '#fbbf24' : '#94a3b8') + ';';
        row.textContent = (unlocked.indexOf(item.id) >= 0 ? '✓ ' : '◇ ') + item.name; row.title = item.desc || ''; panelEl.appendChild(row);
      });
      button('Back', function () { achievementsOpen = false; render(); });
    }
    function renderCustomize() {
      var catalog = window.Meta && typeof Meta.getCosmetics === 'function' ? Meta.getCosmetics(config.id) : [];
      var wallet = window.Meta && typeof Meta.read === 'function' ? Meta.read().sparks : 0;
      var balance = document.createElement('span'); balance.textContent = 'Sparks: ' + wallet; balance.style.cssText = 'padding:6px 9px;color:#fbbf24;font-weight:800;'; panelEl.appendChild(balance);
      catalog.forEach(function (item) {
        var wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;align-items:center;gap:5px;padding:3px;border:1px solid rgba(148,163,184,.2);border-radius:10px;';
        var name = document.createElement('span'); name.textContent = item.name; name.style.cssText = 'padding:0 5px;color:#e2e8f0;'; wrap.appendChild(name);
        if (item.owned) {
          var equip = button(item.equipped ? 'Equipped' : 'Equip', function () {
            var result = Meta.equipCosmetic(config.id, item.id);
            if (result && result.ok) {
              if (typeof hooks.applyCosmetic === 'function') hooks.applyCosmetic(item.slot, item.id);
              if (window.Apex && typeof Apex.report === 'function') Apex.report({ gameId: config.id, type: 'cosmetic_equip', cosmetic: { slot: item.slot, id: item.id } });
              UI.toast(item.name + ' equipped', { color: '#34d399' });
            }
            render();
          });
          equip.disabled = item.equipped;
          equip.setAttribute('aria-label', (item.equipped ? 'Equipped ' : 'Equip ') + item.name);
        } else {
          var cost = Number(item.cost) || 0;
          var canBuy = !item.unlock || item.unlock.achievementUnlocked;
          var purchase = button(canBuy ? 'Buy · ' + cost + ' Sparks' : 'Achievement required', function () {
            var result = Meta.purchaseCosmetic(config.id, item.id);
            if (result && result.ok) UI.toast(item.name + ' purchased', { color: '#34d399' });
            else UI.toast(result && result.reason === 'insufficient-sparks' ? 'Not enough Sparks' : 'Unlock the required achievement first', { color: '#fbbf24' });
            render();
          });
          purchase.disabled = !canBuy || wallet < cost;
          purchase.setAttribute('aria-label', (canBuy ? 'Buy ' + item.name + ' for ' + cost + ' Sparks' : 'Achievement required for ' + item.name));
        }
        panelEl.appendChild(wrap);
      });
      button('Back', function () { customizeOpen = false; render(); });
    }
    function render() {
      panelEl.textContent = ''; panelEl.setAttribute('role', settingsOpen ? 'group' : 'toolbar');
      panelEl.setAttribute('aria-label', settingsOpen ? 'Game settings' : 'Game menu');
      var expanded = customizeOpen || tutorialOpen || achievementsOpen;
      panelEl.style.maxHeight = expanded ? '72%' : '';
      panelEl.style.overflowY = expanded ? 'auto' : '';
      if (G.state === 'ready') {
        if (tutorialOpen) {
          renderTutorial();
        } else if (achievementsOpen) {
          renderAchievements();
        } else if (customizeOpen) {
          renderCustomize();
        } else if (modes.length > 1) {
          var select = document.createElement('select'); select.setAttribute('aria-label', 'Game mode');
          select.style.cssText = 'min-height:40px;padding:7px 10px;border-radius:9px;background:#172033;color:#fff;border:1px solid rgba(148,163,184,.45);';
          modes.forEach(function (mode) { var option = document.createElement('option'); option.value = mode.id; option.textContent = mode.name + (modeUnlocked(mode) ? '' : ' · Locked'); option.disabled = !modeUnlocked(mode); select.appendChild(option); });
          select.value = selectedMode; select.addEventListener('change', function () {
            if (!selectMode(select.value, false)) select.value = selectedMode;
          }); panelEl.appendChild(select);
        }
        if (!customizeOpen && !tutorialOpen && !achievementsOpen) {
          button('Play', play);
          if (config.tutorial && config.tutorial.steps && config.tutorial.steps.length) button('Tutorial', function () { setTutorialOpen(true); tutorialIndex = 0; render(); });
          if (config.achievements && config.achievements.length) button('Achievements', function () { achievementsOpen = true; render(); });
          if (window.Meta && typeof Meta.getCosmetics === 'function' && Meta.getCosmetics(config.id).length) button('Customize', function () { customizeOpen = true; render(); });
        }
      } else if (G.state === 'playing') {
        button('Pause', pause);
      } else if (G.state === 'paused') {
        if (settingsOpen) {
          gameSettings.forEach(function (item) {
            var wrap = document.createElement('label'); wrap.style.cssText = 'display:flex;align-items:center;gap:6px;min-height:40px;padding:0 4px;color:#e2e8f0;';
            var label = document.createElement('span'); label.textContent = item.label || item.key; wrap.appendChild(label);
            if (item.type === 'toggle') {
              var toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = currentSettings[item.key] ? 'On' : 'Off';
              toggle.setAttribute('aria-label', item.label || item.key); toggle.setAttribute('aria-pressed', String(!!currentSettings[item.key]));
              toggle.style.cssText = 'min-height:36px;padding:5px 10px;border-radius:8px;background:#24314a;color:#fff;border:1px solid #64748b;';
              toggle.addEventListener('click', function () { changeSetting(item, 1); }); wrap.appendChild(toggle);
            } else if (item.type === 'select') {
              var choice = document.createElement('select'); choice.setAttribute('aria-label', item.label || item.key);
              choice.style.cssText = 'min-height:36px;padding:4px 8px;border-radius:8px;background:#172033;color:#fff;border:1px solid #64748b;';
              (item.options || []).forEach(function (optionValue) { var option = document.createElement('option'); option.value = optionValue; option.textContent = optionValue; choice.appendChild(option); });
              choice.value = currentSettings[item.key]; choice.addEventListener('change', function () { saveSetting(item, choice.value); }); wrap.appendChild(choice);
            } else {
              var range = document.createElement('input'); range.type = 'range'; range.min = item.min == null ? 0 : item.min; range.max = item.max == null ? 1 : item.max; range.step = item.step == null ? .1 : item.step; range.value = currentSettings[item.key]; range.setAttribute('aria-label', item.label || item.key);
              range.addEventListener('input', function () { saveSetting(item, Number(range.value)); }); wrap.appendChild(range);
            }
            panelEl.appendChild(wrap);
          });
          button('Done', function () { settingsOpen = false; render(); });
        } else {
          button('Resume', resume); button('Settings', function () { settingsOpen = true; render(); });
          button('Restart', function () { G.restart(true); }); button('Back to menu', backToMenu);
        }
      } else {
        var result = typeof hooks.getResult === 'function' ? hooks.getResult() : { score: G.score || 0, win: G.state === 'won' };
        var score = document.createElement('span'); score.setAttribute('aria-live', 'polite'); var activeMutator = mutators.find(function (item) { return item.id === selectedMutator; }); score.textContent = 'Score ' + (result.score == null ? G.score || 0 : result.score) + (activeMutator ? ' · Mutator: ' + activeMutator.name + ' (×' + activeMutator.multiplier + ')' : ''); panelEl.appendChild(score);
        button('Play again', play); var clipButton = button('Save result clip/card', function () { saveClip(clipButton); }); button('Back to menu', backToMenu);
      }
      controls().forEach(function (control, index) {
        control.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
          if (control.tagName === 'SELECT' || control.tagName === 'INPUT') {
            if (/^Arrow/.test(event.key)) event.stopPropagation();
            return;
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); setFocus(index + 1); }
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setFocus(index - 1); }
        });
      });
    }
    function stateFrame() {
      if (G.state !== lastState) {
        if ((G.state === 'won' || G.state === 'over') && window.Meta && typeof Meta.recordSeasonScore === 'function') {
          var result = typeof hooks.getResult === 'function' ? hooks.getResult() : { score: G.score || 0 };
          var modeEntry = modes.find(function (entry) { return entry.id === (result.mode || selectedMode); });
          if (modeEntry && Array.isArray(modeEntry.seasonTargets)) Meta.recordSeasonScore(config.id, result.mode || selectedMode, result.score == null ? G.score || 0 : result.score, modeEntry.seasonTargets);
        }
        if (G.state === 'paused' && typeof hooks.onPause === 'function') hooks.onPause();
        if (lastState === 'paused' && G.state === 'playing' && typeof hooks.onResume === 'function') hooks.onResume();
        lastState = G.state; settingsOpen = false; render();
      }
      if (window.ApexMenuActive || (window.__apexTheaterEmbedded && window.ApexGamePaused) || document.querySelector('.apex-menu-root:not([hidden])')) { padPrev = {}; requestAnimationFrame(stateFrame); return; }
      var pads = [];
      try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) {}
      var now = {};
      for (var p = 0; p < pads.length; p++) {
        if (!pads[p]) continue;
        var buttons = pads[p].buttons || [];
        if (buttons[12] && buttons[12].pressed) now.up = true;
        if (buttons[13] && buttons[13].pressed) now.down = true;
        if (buttons[14] && buttons[14].pressed) now.left = true;
        if (buttons[15] && buttons[15].pressed) now.right = true;
        var axisX = pads[p].axes && pads[p].axes[0] || 0, axisY = pads[p].axes && pads[p].axes[1] || 0;
        if (axisX < -0.55) now.left = true; if (axisX > 0.55) now.right = true;
        if (axisY < -0.55) now.up = true; if (axisY > 0.55) now.down = true;
        if (buttons[0] && buttons[0].pressed) now.accept = true;
        if (buttons[9] && buttons[9].pressed) now.start = true;
      }
      if (now.up && !padPrev.up) setFocus(focusIndex - 1);
      if (now.down && !padPrev.down) setFocus(focusIndex + 1);
      function adjustFocused(direction) {
        var active = controls()[focusIndex]; if (!active) return;
        if (active.tagName === 'SELECT') {
          active.selectedIndex = Math.max(0, Math.min(active.options.length - 1, active.selectedIndex + direction));
          active.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (active.type === 'range') {
          var step = Number(active.step) || .1, min = Number(active.min) || 0, max = Number(active.max) || 1;
          active.value = String(clamp(Number(active.value) + step * direction, min, max));
          active.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (active.tagName === 'BUTTON' && active.hasAttribute('aria-pressed')) active.click();
      }
      if (now.left && !padPrev.left) adjustFocused(-1);
      if (now.right && !padPrev.right) adjustFocused(1);
      if ((now.accept && !padPrev.accept) || (!window.__apexTheaterEmbedded && now.start && !padPrev.start)) {
        if (tutorialOpen) { var tutorialControl = controls()[focusIndex]; if (tutorialControl) tutorialControl.click(); }
        else if (G.state === 'ready' || G.state === 'over' || G.state === 'won') play();
        else if (G.state === 'playing') pause();
        else if (G.state === 'paused') { var focused = controls()[focusIndex]; if (focused) focused.click(); }
      }
      padPrev = now; requestAnimationFrame(stateFrame);
    }
    render(); requestAnimationFrame(stateFrame);
    applyMode();
    return { game: G, config: config, overlay: layer, controls: root, start: play, pause: pause, resume: resume, restart: function () { G.restart(true); }, getMode: function () { return selectedMode; }, getMutator: function () { return selectedMutator; }, setMutator: function (mutatorId) {
      if (mutatorId !== 'none' && !mutators.some(function (item) { return item.id === mutatorId; })) return false;
      selectedMutator = mutatorId; save(config.id, { settings: { mutator: selectedMutator } }); applyMutator(); render(); return true;
    }, setMode: function (modeId) { return selectMode(modeId, true); } };
  };
})();
