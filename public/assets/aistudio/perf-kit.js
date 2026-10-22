/* perf-kit.js — adaptive hardware performance engine for Apex Arcade (Phase 1 Kit K6)
   Provides: window.Perf singleton
     Perf.tier         → 'ultra' | 'standard' | 'lite'   (current active tier)
     Perf.dpr          → number   (capped device pixel ratio for canvas)
     Perf.particleCap  → number   (max simultaneous particles)
     Perf.shadowBlur   → number   (recommended ctx.shadowBlur ceiling)
     Perf.targetFps    → number   (60 | 30)
     Perf.tick(dtMs)   → void     (call every frame; drives EMA refinement + auto downgrade)
     Perf.budget(n)    → number   (clamps requested particle count to cap)
     Perf.profile()    → Object   (full current profile snapshot)
     Perf.setTier(t)   → void     (manual override; pass null to re-enable auto)
*/
(function () {
  'use strict';

  var Perf = (window.Perf = window.Perf || {});

  /* ─────────────────────────────────────────
     1. Static hardware detection (run once)
  ───────────────────────────────────────── */
  var coarse = false;
  try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) {}
  var cores = (navigator.hardwareConcurrency || 2);
  var memGb = (navigator.deviceMemory || 0); // 0 = unknown
  var isMobile = /Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent) ||
                 (navigator.maxTouchPoints > 1 && window.innerWidth < 900) || coarse;
  var rawDpr = (window.devicePixelRatio || 1);

  /* ─────────────────────────────────────────
     2. Tier profile table
  ───────────────────────────────────────── */
  var PROFILES = {
    ultra: {
      tier: 'ultra',
      dpr: Math.min(rawDpr, 2),
      particleCap: 1200,
      shadowBlur: 30,
      targetFps: 60,
      label: 'Ultra Performance',
    },
    standard: {
      tier: 'standard',
      dpr: Math.min(rawDpr, 1.5),
      particleCap: 600,
      shadowBlur: 18,
      targetFps: 60,
      label: 'Standard Balanced',
    },
    lite: {
      tier: 'lite',
      dpr: 1,
      particleCap: 200,
      shadowBlur: 0,
      targetFps: 30,
      label: 'Lite Eco-Profile',
    },
  };

  /* ─────────────────────────────────────────
     3. Initial auto-detect tier
  ───────────────────────────────────────── */
  function detectTier() {
    if (isMobile || cores <= 2 || (memGb > 0 && memGb <= 2)) return 'lite';
    if (cores >= 8 && (memGb === 0 || memGb >= 8) && !isMobile) return 'ultra';
    if (cores >= 4 && (memGb === 0 || memGb >= 4)) return 'standard';
    return 'lite';
  }

  var _autoTier = detectTier();
  var _qTier = null;   // optional ?tier=ultra|standard|lite override (website or tester)
  try {
    var _qm = /[?&]tier=(ultra|standard|lite)(?:&|#|$)/.exec(window.location.search || '');
    if (_qm) _qTier = _qm[1];
  } catch (e) {}
  var _manualTier = _qTier;   // set by Perf.setTier(); null = follow auto
  var _currentTier = _manualTier || _autoTier;

  /* ─────────────────────────────────────────
     4. EMA frame-time monitor
     Tracks a 120-sample EMA of dt (ms).
     If avg > 26ms (< ~38fps) for DOWNGRADE_HOLD_FRAMES → drop tier.
     If avg < 14ms (> ~71fps) for UPGRADE_HOLD_FRAMES  → promote tier.
  ───────────────────────────────────────── */
  var EMA_ALPHA = 0.05;          // smoothing factor
  var DOWNGRADE_THRESHOLD = 26;  // ms / frame  (~38fps)
  var UPGRADE_THRESHOLD   = 14;  // ms / frame  (~71fps)
  var DOWNGRADE_HOLD = 180;      // consecutive frames under threshold before demoting
  var UPGRADE_HOLD   = 600;      // frames before promoting (much slower to promote)

  var _emaMs = 16.67;            // initialise at 60fps
  var _downholdCount = 0;
  var _upholdCount   = 0;
  var _tickCount     = 0;
  var _reportCount   = 0;
  var _reportTotalMs = 0;
  var _rafLast       = 0;

  function _reportGameFrame(dtMs, source) {
    if (dtMs <= 0 || dtMs > 200) return;
    _reportCount++;
    _reportTotalMs += dtMs;
    if (_reportCount >= 30) {
      try {
        if (window.parent && window.parent !== window) {
          var avgMs = _reportTotalMs / _reportCount;
          window.parent.postMessage({ type: 'APEX_GAME_FRAME', detail: { avgMs: +avgMs.toFixed(2), fps: +(1000 / avgMs).toFixed(1), samples: _reportCount, source: source } }, window.location.origin);
        }
      } catch (e) {}
      _reportCount = 0;
      _reportTotalMs = 0;
    }
  }

  // Some legacy games load the performance kit but do not call Perf.tick.
  // Observe their own RAF callback cadence as a fallback until a game-loop
  // tick is detected; never mix the two sample sources.
  var _nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (callback) {
    return _nativeRequestAnimationFrame(function (timestamp) {
      if (!_tickCount) {
        if (_rafLast) _reportGameFrame(timestamp - _rafLast, 'raf');
        _rafLast = timestamp;
      }
      callback(timestamp);
    });
  };
  var _autoEnabled   = (_manualTier === null);

  var TIER_ORDER = ['lite', 'standard', 'ultra'];

  function tierIndex(t) { return TIER_ORDER.indexOf(t); }

  function applyTier(newTier, reason) {
    if (newTier === _currentTier) return;
    var prev = _currentTier;
    _currentTier = newTier;
    _syncPublicProps();
    _emit(prev, newTier, reason || 'auto');
  }

  function _syncPublicProps() {
    var p = PROFILES[_currentTier] || PROFILES['standard'];
    Perf.tier        = p.tier;
    Perf.dpr         = p.dpr;
    Perf.particleCap = p.particleCap;
    Perf.shadowBlur  = p.shadowBlur;
    Perf.targetFps   = p.targetFps;
  }

  function _emit(prevTier, nextTier, reason) {
    try {
      var detail = {
        prevTier: prevTier,
        tier: nextTier,
        reason: reason,
        emaMs: +_emaMs.toFixed(2),
        cores: cores,
        memGb: memGb,
        isMobile: isMobile,
        dpr: Perf.dpr,
        particleCap: Perf.particleCap,
      };
      window.dispatchEvent(new CustomEvent('apex:perf', {
        detail: detail,
      }));
      // The dashboard lives in the host document, while Perf runs inside a game iframe.
      // Use an explicit same-origin message instead of assuming CustomEvents cross frames.
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'APEX_PERF', detail: detail }, window.location.origin);
      }
    } catch (e) {}
  }

  /* ─────────────────────────────────────────
     5. Public API
  ───────────────────────────────────────── */

  /**
   * Call every animation frame with the raw delta-time in ms.
   * Drives the EMA monitor and auto tier adjustments.
   */
  Perf.tick = function (dtMs) {
    if (dtMs <= 0 || dtMs > 200) return;  // ignore pauses / tabs
    if (_tickCount === 0) {
      _reportCount = 0;
      _reportTotalMs = 0;
      _rafLast = 0;
    }
    _tickCount++;
    _reportGameFrame(dtMs, 'game-loop');

    // EMA update
    _emaMs = EMA_ALPHA * dtMs + (1 - EMA_ALPHA) * _emaMs;

    // Skip first 120 frames (warm-up)
    if (_tickCount < 120 || !_autoEnabled || _manualTier !== null) return;

    var idx = tierIndex(_currentTier);

    if (_emaMs > DOWNGRADE_THRESHOLD) {
      _upholdCount = 0;
      _downholdCount++;
      if (_downholdCount >= DOWNGRADE_HOLD && idx > 0) {
        _downholdCount = 0;
        applyTier(TIER_ORDER[idx - 1], 'ema-downgrade');
      }
    } else if (_emaMs < UPGRADE_THRESHOLD) {
      _downholdCount = 0;
      _upholdCount++;
      if (_upholdCount >= UPGRADE_HOLD && idx < TIER_ORDER.length - 1) {
        _upholdCount = 0;
        applyTier(TIER_ORDER[idx + 1], 'ema-upgrade');
      }
    } else {
      // Within normal range — decay counters
      _downholdCount = Math.max(0, _downholdCount - 1);
      _upholdCount   = Math.max(0, _upholdCount   - 1);
    }
  };

  /**
   * Clamp a requested particle count to the active tier budget.
   * @param {number} requested
   * @returns {number}
   */
  Perf.budget = function (requested) {
    return Math.min(Math.max(0, requested | 0), Perf.particleCap);
  };

  /**
   * Manual tier override. Pass null to restore auto.
   * @param {'ultra'|'standard'|'lite'|null} tier
   */
  Perf.setTier = function (tier) {
    if (tier === null || tier === undefined) {
      _manualTier = null;
      _autoEnabled = true;
      _tickCount = 0; // restart warmup
      applyTier(_autoTier, 'manual-reset');
    } else if (PROFILES[tier]) {
      _manualTier = tier;
      _autoEnabled = false;
      applyTier(tier, 'manual');
    }
  };

  /**
   * Returns a full snapshot of the current performance profile.
   * @returns {Object}
   */
  Perf.profile = function () {
    return {
      tier: _currentTier,
      dpr: Perf.dpr,
      particleCap: Perf.particleCap,
      shadowBlur: Perf.shadowBlur,
      targetFps: Perf.targetFps,
      emaMs: +_emaMs.toFixed(2),
      cores: cores,
      memGb: memGb,
      isMobile: isMobile,
      autoEnabled: _autoEnabled,
      manualTier: _manualTier,
      label: (PROFILES[_currentTier] || {}).label || _currentTier,
    };
  };

  /**
   * Returns whether ctx.shadowBlur should be used at the given amount.
   * Always returns 0 in 'lite' tier.
   * @param {number} requested
   * @returns {number}
   */
  Perf.blur = function (requested) {
    if (Perf.shadowBlur === 0) return 0;
    return Math.min(requested, Perf.shadowBlur);
  };

  /* ─────────────────────────────────────────
     6. postMessage receiver for host control
        (allows PlayableTheaterModal to push tier)
  ───────────────────────────────────────── */
  window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'SET_PERF_TIER') {
      // Only trust the embedding host page on the same origin
      if (e.source !== window.parent || e.origin !== window.location.origin) return;
      if (e.data.tier && !PROFILES[e.data.tier]) return;
      Perf.setTier(e.data.tier || null);
    }
  });

  /* ─────────────────────────────────────────
     7. Initialise public surface
  ───────────────────────────────────────── */
  _syncPublicProps();
  _emit(_currentTier, _currentTier, 'initial');

  // Expose hardware profile constants for TelemetryDashboard to read
  Perf._raw = { cores: cores, memGb: memGb, isMobile: isMobile, rawDpr: rawDpr };

})();
