/* score-bridge.js — universal event and score bridge for Apex Arcade (Phase 1 Kit K2)
   Provides: Apex.report({gameId, type, mode, difficulty, seed, score, level, durationSec, achievementId})
   Dispatches { type: 'APEX_EVENT', ... } to window.parent for real-time telemetry and persistence.
*/
(function () {
  'use strict';

  const Apex = (window.Apex = window.Apex || {});

  // Post only to our own origin; fall back to '*' for opaque origins (e.g. file://)
  function targetOrigin() {
    const o = window.location.origin;
    return o && o !== 'null' ? o : '*';
  }

  let activeSession = {
    gameId: null,
    startTime: 0,
    bestScore: 0,
    ended: true,
    currentScore: 0,
  };

  /**
   * Reports an event to the host application theater modal.
   * @param {Object} evt
   * @param {string} evt.gameId - The unique game identifier (e.g. 'flappy-bird', 'pong')
   * @param {'session_start'|'score'|'level_complete'|'achievement'|'session_end'|'mode_start'|'result'|'cosmetic_equip'} evt.type - The event category
   * @param {number} [evt.score] - Current score or final score
   * @param {number} [evt.level] - Current level or wave reached
   * @param {number} [evt.durationSec] - Session duration in seconds
   * @param {string} [evt.achievementId] - Achievement unlock identifier
   */
  Apex.report = function (evt) {
    if (!evt || !evt.type) return;

    const gameId = evt.gameId || activeSession.gameId || 'unknown';
    const now = Date.now();

    if (evt.type === 'session_start') {
      // Shared kits and a few legacy pages may observe the same first move.
      // Keep one open session per iframe rather than sending duplicate starts.
      if (!activeSession.ended && activeSession.gameId === gameId && activeSession.startTime) return;
      activeSession.gameId = gameId;
      activeSession.startTime = now;
      activeSession.currentScore = 0;
      activeSession.ended = false;
    } else if (evt.type === 'score' && typeof evt.score === 'number') {
      activeSession.currentScore = evt.score;
      if (evt.score > activeSession.bestScore) {
        activeSession.bestScore = evt.score;
      }
    } else if (evt.type === 'session_end') {
      if (activeSession.ended) return;
      activeSession.ended = true;
      if (!evt.durationSec && activeSession.startTime) {
        evt.durationSec = Math.max(1, Math.round((now - activeSession.startTime) / 1000));
      }
      if (typeof evt.score !== 'number') {
        evt.score = activeSession.currentScore;
      }
    }

    const payload = {
      type: 'APEX_EVENT',
      v: 2,
      gameId: gameId,
      eventType: evt.type,
      mode: typeof evt.mode === 'string' ? evt.mode : undefined,
      difficulty: typeof evt.difficulty === 'string' ? evt.difficulty : undefined,
      seed: typeof evt.seed === 'number' ? evt.seed : undefined,
      score: typeof evt.score === 'number' ? Math.floor(evt.score) : activeSession.currentScore,
      level: typeof evt.level === 'number' ? evt.level : undefined,
      durationSec: typeof evt.durationSec === 'number' ? Math.floor(evt.durationSec) : undefined,
      achievementId: evt.achievementId || undefined,
      cosmetic: evt.cosmetic || undefined,
      result: evt.result || undefined,
      timestamp: now,
    };

    // Post to host application window
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, targetOrigin());
      }
    } catch (e) {
      // Ignore cross-origin sandboxing errors
    }
  };

  // If the page unloads mid-run (theater closed, restart, navigation), still report the session
  window.addEventListener('pagehide', function () {
    if (activeSession.ended || !activeSession.startTime) return;
    const secs = Math.round((Date.now() - activeSession.startTime) / 1000);
    if (activeSession.currentScore > 0 || secs >= 5) {
      Apex.report({ type: 'session_end' });
    }
  });

  // Convenience helpers
  Apex.startSession = function (gameId) {
    Apex.report({ gameId, type: 'session_start' });
  };

  Apex.sendScore = function (score, gameId) {
    Apex.report({ gameId, type: 'score', score });
  };

  Apex.unlockAchievement = function (achievementId, gameId) {
    Apex.report({ gameId, type: 'achievement', achievementId });
  };

  Apex.endSession = function (finalScore, durationSec, gameId) {
    Apex.report({ gameId, type: 'session_end', score: finalScore, durationSec });
  };
})();
