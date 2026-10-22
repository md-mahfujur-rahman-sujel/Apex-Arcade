# Game Frame Definition of Done

Use this checklist for each game before it joins a rollout sprint. A pilot-specific browser pass covers only the checks it names; it does not complete the game’s full GF checklist.

## Every game

- [ ] The correct game config and title load; the visible game surface reaches its ready state within 2 seconds.
- [ ] Menu, mode, settings, pause, results, replay, and return actions are reachable by keyboard and touch. Gamepad navigation is verified where supported.
- [ ] Pause and resume preserve the current game state, including in-flight AI or animation work.
- [ ] Settings persist through Save and change the behavior they describe. Difficulty changes gameplay, not only presentation.
- [ ] Start, score, level, achievement, and session-end events use the theater’s game id; invalid or sibling-window messages do not update player data.
- [ ] Save schema and Meta rewards survive reload; purchase and achievement awards cannot be collected twice.
- [ ] Focus is visible, controls have accessible names, touch targets do not overlap, and gameplay shortcuts do not fire from form fields.
- [ ] Reduced motion removes nonessential movement, particles, and shake. Lite mode keeps the game playable.
- [ ] Production browser capture or Playwright evidence covers desktop and touch mobile. Errors and known failures are recorded.
- [ ] `npm run lint` and `npm run build` pass. Relevant unit, browser, theme, and full smoke checks are listed with their actual results.
- [x] Owner played each pilot for five minutes and signed off on 2026-10-22; rollout gate cleared.

## Pilot 01 — Glowmoth Gauntlet

- [x] Shared `UI.mountGame` pilot with keyboard, touch, and gamepad menu paths; persisted Screen shake setting.
- [x] Central cosmetics registry and game 01 Customize flow; buy, equip, reload, and verify restored equip state.
- [x] Desktop production smoke: load, start, input, pause/resume, difficulty, Lite, score/session-end, and browser errors.
- [x] Portrait mobile launch works without an overlapping theater control intercepting Play; production smoke verified Play activation for all 50 games at 390 × 844.
- [x] Owner five-minute play and sign-off confirmed on 2026-10-22.
- [ ] Campaign, checkpoints, seeded Daily run, ghost, and the full achievement list from the bible are implemented and verified. These are bible roadmap features, not established by the Game Frame pilot.

## Pilot 30 — Tic-Tac-Toe

- [x] Classic, 4×4, and Ultimate mode controls remain available with the documented controls and AI strength.
- [x] Pause/resume preserves marks and turn; pending AI work can be canceled and restarted without an extra move.
- [x] Desktop production smoke: load, start, input, pause/resume, difficulty, Lite, score/session-end, and browser errors.
- [x] Touch launch works without an overlapping theater control intercepting Play; production smoke verified Play activation for all 50 games at 390 × 844.
- [x] Owner five-minute play and sign-off confirmed on 2026-10-22.
- [ ] Full accessibility and AI-quality playtest for Ultimate routing and all five strengths.

## Pilot 42 — Merge 2048

- [x] Classic, Compact/Spacious board sizes, Foundry Trials, Daily Core, undo limits, and saved-run resume remain available.
- [x] Pause/resume preserves tile values and positions; no tile is spawned by resume.
- [x] Direct swipe input uses the board surface without theater virtual controls covering the in-game actions; production smoke passes pause, Lite, and result delivery on mobile.
- [x] Desktop production smoke: load, start, input, pause/resume, difficulty, Lite, score/session-end, and browser errors.
- [x] Touch launch works without an overlapping theater control intercepting Play; production smoke verified Play activation for all 50 games at 390 × 844.
- [x] Owner five-minute play and sign-off confirmed on 2026-10-22.
- [x] Production Playwright sends a native mobile touch swipe and confirms the board changes without theater virtual controls; zero browser errors.
- [x] Production browser test verifies the date-based Daily Core goal and same-day retry restores the same seed and opening board.
- [x] Production browser test verifies Trial 1's target, move limit, completion record, and three-star award using a controlled winning board state.
- [ ] Playtesting verifies balance across all 30 escalating Foundry Trials.
