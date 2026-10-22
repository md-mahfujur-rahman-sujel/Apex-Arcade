# Game 30 — Tic-Tac-Toe

## Pitch

A quick-play cafe challenge: choose a format and outthink a friendly rival. Classic stays approachable, with 4×4 and Ultimate boards for repeat play.

## Art direction

Use dark slate, cyan X marks, and warm amber O marks. Give the board subtle slate grain, thin cell borders, contact shadows, and an upper-left highlight. Keep marks crisp, not glassy. Use short placement motion, one gentle win-line pulse, and a small spark celebration. Respect reduced motion.

## Characters and story beats

The player faces the Cafe Champion, represented by the opposing mark and concise status copy. Loop: choose mode and side → play → see the result and record → rematch or change mode. Wins build a streak; perfect play is a friendly challenge.

## Modes and progression

- Classic 3×3: teach winning lines and draws; first to three in a row.
- 4×4: four in a row; introduce longer threats and forks.
- Ultimate: nine linked 3×3 boards; each move determines the opponent’s next board, with a free choice when that board is closed.
- Five AI strengths: Level 1 chooses freely; Level 2 blocks immediate wins; Level 3 wins or blocks with occasional mistakes; Level 4 searches strongly with rare mistakes; Level 5 plays perfectly where feasible. K8 maps Easy/Normal/Hard to levels 2/3/4. On Easy, the player can request a highlighted tactical hint; thinking pace stays separate.

## Controls

Mouse, touch, or keys 1–9 (displayed numpad layout); Easy-only Hint highlights a recommended move; U undo; N new match; H help; M mute. Keep visible keyboard focus.

## Achievements

First Line (win once); Clean Sweep (win without conceding a line); Comeback (win after the rival has a two-in-a-row threat); Draw Specialist (three draws); Four Across (win 4×4); Ultimate Strategist (win Ultimate); Perfect Defense (draw against Level 5); Win Streak (three wins in a row).

## Features and risks

Retain two-player play, undo, match records, and manual AI override. Classic 3×3, 4×4 four-in-a-row, and Ultimate routing are implemented with five selectable AI strengths and K8 contract mapping. Local save data tracks aggregate score, wins/losses/draws, streaks, rounds, last format, and unlocked achievements; the Statistics view reads those browser-local records, and score/session/achievement events are sent through score-bridge when present. The visible Reset score action clears the scoreboard totals without deleting lifetime match history. Browser playtesting—especially Ultimate routing, accessibility, and AI quality—remains outstanding.
