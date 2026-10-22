/* music-kit.js — K5 procedural music for Apex Arcade. Additive window.Music.
   Web Audio only: generated bass, pad, lead and drum patterns; no assets or network. */
(function () {
  'use strict';

  var Music = (window.Music = window.Music || {});
  var ctx = null, master = null, dry = null, wet = null, convolver = null, noise = null;
  var timer = 0, nextTime = 0, step = 0, current = null, pending = null;
  var active = false, paused = false, muted = false, intensity = 0.25, lastIntensity = -1, lastVolume = -1;
  var layerGains = {}, bound = [];
  var SCALE = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10], pentatonic: [0, 3, 5, 7, 10]
  };
  var BASS = [0, null, null, 0, 3, null, 4, null, 0, null, 5, null, 3, null, 4, null];
  var LEAD = [null, 4, null, 3, 5, null, 4, null, null, 6, 5, null, 4, null, 3, null];

  function num(v, fallback) { return typeof v === 'number' && isFinite(v) ? v : fallback; }
  function now() { return ctx ? ctx.currentTime : 0; }
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function enabled(name) { return !current || !current.layers || current.layers.indexOf(name) !== -1; }
  function settings() {
    try { if (current && window.Save && Save.load) return Save.load(current.gameId || 'default').settings || {}; } catch (e) {}
    return {};
  }
  function volume() {
    var s = settings();
    if (muted || (window.Arcade && Arcade.muted)) return 0;
    return num(s.musicVol, 0.8);
  }
  function fade(param, value, seconds) {
    if (!ctx || !param) return;
    var t = now();
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + (seconds || 0.04));
  }
  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0;
    dry = ctx.createGain(); dry.gain.value = 1;
    wet = ctx.createGain(); wet.gain.value = 0.2;
    convolver = ctx.createConvolver();
    var rate = ctx.sampleRate, length = Math.max(1, (rate * 0.55) | 0), impulse = ctx.createBuffer(2, length, rate), ch, i;
    for (ch = 0; ch < 2; ch++) {
      var data = impulse.getChannelData(ch);
      for (i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.7);
    }
    convolver.buffer = impulse;
    dry.connect(master); wet.connect(convolver); convolver.connect(master); master.connect(ctx.destination);
    noise = ctx.createBuffer(1, Math.max(1, (rate * 0.12) | 0), rate);
    var nd = noise.getChannelData(0);
    for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    ['bass', 'pad', 'lead', 'drums'].forEach(function (name) {
      var g = ctx.createGain(); g.gain.value = 0; g.connect(dry); layerGains[name] = g;
    });
    return ctx;
  }
  function oscillator(freq, time, duration, type, gain, target, detune) {
    if (!ctx || gain <= 0) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, time); if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(Math.max(.0001, gain), time + .012);
    g.gain.exponentialRampToValueAtTime(.0001, time + duration);
    o.connect(g); g.connect(target || dry); o.start(time); o.stop(time + duration + .03);
  }
  function drum(time, level, open) {
    if (!ctx || !noise || level <= 0) return;
    var src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; filter.type = 'highpass'; filter.frequency.value = open ? 3500 : 1400;
    g.gain.setValueAtTime(level, time); g.gain.exponentialRampToValueAtTime(.0001, time + (open ? .12 : .055));
    src.connect(filter); filter.connect(g); g.connect(layerGains.drums); src.start(time); src.stop(time + .15);
  }
  function note(degree, octave) {
    var scale = SCALE[(current && current.scale) || 'minor'] || SCALE.minor;
    return ((current && current.root) || 45) + scale[((degree % scale.length) + scale.length) % scale.length] + (octave || 0) * 12;
  }
  function scheduleStep(time) {
    var bpm = num(current && current.tempo, 96), dur = 60 / bpm / 4, pos = step % 16, energy = intensity;
    if (enabled('bass') && BASS[pos] !== null) oscillator(midi(note(BASS[pos], -1)), time, dur * .9, 'triangle', .085, layerGains.bass);
    if (enabled('pad') && pos % 8 === 0) {
      var chord = pos === 0 ? [0, 2, 4] : [3, 5, 0], j;
      for (j = 0; j < chord.length; j++) oscillator(midi(note(chord[j], 0)), time, dur * 7.6, 'sine', .018, layerGains.pad, j === 1 ? -5 : j === 2 ? 5 : 0);
    }
    if (enabled('lead') && energy > .32 && LEAD[pos] !== null) oscillator(midi(note(LEAD[pos], 1)), time, dur * .55, 'square', .026 * energy, layerGains.lead);
    if (enabled('drums')) {
      if (pos % 4 === 0) oscillator(70, time, .09, 'sine', .13, layerGains.drums);
      if (energy > .48 && pos % 4 === 2) oscillator(92, time, .07, 'sine', .08, layerGains.drums);
      if (pos % 2 === 0) drum(time, .035 + energy * .025, pos % 4 === 2);
    }
    step++;
  }
  function tick() {
    if (!active || paused || !ctx || ctx.state !== 'running') return;
    refreshMix(false);
    var horizon = now() + .13, dur = 60 / num(current && current.tempo, 96) / 4;
    while (nextTime < horizon) { scheduleStep(nextTime); nextTime += dur; }
  }
  function refreshMix(force) {
    if (!ctx || !master) return;
    var v = volume(), i = intensity;
    if (!force && Math.abs(i - lastIntensity) < .015 && Math.abs(v - lastVolume) < .005) return;
    lastIntensity = i;
    lastVolume = v;
    fade(master.gain, active && !paused ? v * .46 : 0, .12);
    fade(layerGains.bass.gain, enabled('bass') ? .9 : 0, .1);
    fade(layerGains.pad.gain, enabled('pad') ? .85 : 0, .1);
    fade(layerGains.lead.gain, enabled('lead') ? Math.max(0, (i - .22) * 1.5) : 0, .1);
    fade(layerGains.drums.gain, enabled('drums') ? .6 + i * .35 : 0, .1);
  }
  function startTimer() { if (!timer) timer = window.setInterval(tick, 45); }
  function stopTimer() { if (timer) { window.clearInterval(timer); timer = 0; } }
  function unlock() {
    var a = ensure();
    if (!a) return false;
    if (a.state === 'suspended') a.resume().catch(function () {});
    return true;
  }
  function activate() {
    if (!pending) return;
    var cfg = pending; pending = null; Music.play(cfg);
  }
  window.addEventListener('pointerdown', activate, { passive: true });
  window.addEventListener('keydown', activate);
  window.addEventListener('blur', function () { Music.pause(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) Music.pause(); else if (active && paused) Music.resume(); });
  window.addEventListener('pagehide', function () { Music.stop(0); });

  Music.play = function (config) {
    current = config || current || {};
    current.layers = current.layers || ['bass', 'pad', 'lead', 'drums'];
    if (!unlock()) { pending = current; return false; }
    active = true; paused = false; step = 0; nextTime = now() + .05; lastIntensity = -1; lastVolume = -1;
    refreshMix(true); startTimer(); return true;
  };
  Music.stop = function (seconds) {
    active = false; paused = false; pending = null; stopTimer();
    if (master) fade(master.gain, 0, seconds == null ? .22 : seconds);
  };
  Music.pause = function () { if (!active || paused) return; paused = true; if (master) fade(master.gain, 0, .08); };
  Music.resume = function () {
    if (!active) return false;
    if (!unlock()) return false;
    paused = false; nextTime = now() + .04; refreshMix(true); startTimer(); return true;
  };
  Music.setIntensity = function (value) {
    intensity = Math.max(0, Math.min(1, num(value, .25)));
    refreshMix(false);
  };
  Music.setMuted = function (value) {
    muted = !!value;
    lastVolume = -1;
    refreshMix(true);
  };
  Music.bindArcade = function (G, config) {
    if (!G || !config) return null;
    var item = { G: G, config: config, state: G.state, id: 0 };
    item.id = window.setInterval(function () {
      if (item.G.state === item.state) return;
      item.state = item.G.state;
      if (item.state === 'playing') {
        if (active && current === item.config) { if (paused) Music.resume(); }
        else if (item.wasPaused) Music.resume(); else Music.play(item.config);
        item.wasPaused = false;
      } else if (item.state === 'paused') { item.wasPaused = true; Music.pause(); }
      else if (item.state === 'over' || item.state === 'won') { item.wasPaused = false; Music.stop(.25); }
    }, 120);
    bound.push(item); return item;
  };
  Music.unbindArcade = function (item) { if (item && item.id) window.clearInterval(item.id); };
})();
