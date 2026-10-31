# Apex Arcade — Game Inventory & Architecture Audit

Generated: 2026-10-22 | Original inventory task: P0.3; rollout audit refreshed through S1-4

Technical inventory of all 50 canonical HTML games in `public/assets/games/`. The per-row size figures are the original P0.3 snapshot; the current aggregate and kit coverage below were re-measured on 2026-10-22.

| # | Title | File | Size | Kits Loaded | Canvas / Layout | ?diff Support | Category / Engine Family |
|---|-------|------|------|-------------|-----------------|---------------|--------------------------|
| 01 | Glowmoth Gauntlet | `01-flappy-bird/index.html` | 7.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js, music-kit.js | Canvas 420×640 | Yes | Arcade Core |
| 02 | Ion Rally | `02-pong/index.html` | 8.5 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js | Canvas 800×480 | Yes | Arcade Core |
| 03 | Ember Serpent | `03-snake/index.html` | 9.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js | Responsive Canvas | Yes | Arcade Core |
| 04 | Hivefall Defense | `04-space-invaders/index.html` | 12.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Canvas 640×520 | Yes | Arcade Core |
| 05 | Prism Stack | `05-tetris/index.html` | 12.0 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Canvas 560×620 | Yes | Arcade Core |
| 06 | Glow Beetle | `06-pac-man/index.html` | 17.7 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Canvas 520×640 (Arcade) | Yes | Arcade Core |
| 07 | Starfall Rift | `07-asteroids/index.html` | 14.0 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Responsive Canvas | Yes | Arcade Core |
| 08 | Fox Courier | `08-mario/index.html` | 7.2 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, platform-kit.js, score-bridge.js, ui-kit.js | Responsive Canvas | Yes | Platform Kit (Arcade) |
| 09 | Cloudhop Pip | `09-mario-world/index.html` | 6.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, platform-kit.js, score-bridge.js, ui-kit.js | Canvas 800×480 | Yes | Platform Kit (Arcade) |
| 10 | Rollo Rush | `10-sonic/index.html` | 7.9 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, platform-kit.js, score-bridge.js, ui-kit.js | Canvas 800×480 | Yes | Platform Kit (Arcade) |
| 11 | Iron Circuit | `11-street-fighter/index.html` | 24.7 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Responsive Canvas | Yes | Arcade Core |
| 12 | Clockwork Dawn | `12-chrono-adventure/index.html` | 30.5 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js | Responsive Canvas | Yes | Arcade Core |
| 13 | Lanternbound | `13-castlevania/index.html` | 11.0 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, act-kit.js, score-bridge.js, ui-kit.js | Canvas 24×32 (Arcade) | Yes | Action Kit (Arcade) |
| 14 | Deepcore Drifter | `14-metroid/index.html` | 9.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, act-kit.js, score-bridge.js, ui-kit.js | Canvas 28×18 (Arcade) | Yes | Action Kit (Arcade) |
| 15 | Hollowbell | `15-hollow-knight/index.html` | 8.7 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, act-kit.js, score-bridge.js, ui-kit.js | Canvas 28×22 (Arcade) | Yes | Action Kit (Arcade) |
| 16 | Skyfall Ridge | `16-celeste/index.html` | 21.7 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Canvas 20×28 (Arcade) | Yes | Arcade Core |
| 17 | Stormcap Showdown | `17-cuphead/index.html` | 15.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Canvas 24×44 (Arcade) | Yes | Arcade Core |
| 18 | Ashen Descent | `18-dead-cells/index.html` | 12.2 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, act-kit.js, score-bridge.js, ui-kit.js | Canvas 24×32 (Arcade) | Yes | Action Kit (Arcade) |
| 19 | Lumen Sprite | `19-ori/index.html` | 6.8 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, act-kit.js, score-bridge.js, ui-kit.js | Canvas 28×22 (Arcade) | Yes | Action Kit (Arcade) |
| 20 | Glimmer Gadabout | `20-rayman/index.html` | 6.9 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, act-kit.js, score-bridge.js, ui-kit.js | Canvas 28×26 (Arcade) | Yes | Action Kit (Arcade) |
| 21 | Chess | `21-chess/index.html` | 17.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 22 | Snakes & Ladders | `22-snakes-ladders/index.html` | 10.4 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Canvas 600×650 | No | Board Kit |
| 23 | Ludo | `23-ludo/index.html` | 10.8 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Canvas 600×600 | No | Board Kit |
| 24 | Carrom | `24-carrom/index.html` | 17.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Canvas 640×640 | No | Board Kit |
| 25 | Tycoon Town | `25-tycoon-town/index.html` | 20.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 26 | Checkers | `26-checkers/index.html` | 10.1 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 27 | Connect Four | `27-connect-four/index.html` | 9.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 28 | Mancala | `28-mancala/index.html` | 10.8 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 29 | Reversi | `29-reversi/index.html` | 11.2 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 30 | Tic-Tac-Toe | `30-tic-tac-toe/index.html` | 8.7 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js, board-art.js, music-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 31 | Backgammon | `31-backgammon/index.html` | 19.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 32 | Dots & Boxes | `32-dots-boxes/index.html` | 10.2 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 33 | Go 9×9 | `33-go/index.html` | 16.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 34 | Solitaire | `34-solitaire/index.html` | 12.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 35 | Memory Match | `35-memory-match/index.html` | 8.4 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 36 | Maths Dash | `36-maths-dash/index.html` | 9.6 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 37 | 8-Ball Pool | `37-pool/index.html` | 15.1 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js | Responsive Canvas | Yes | Arcade Core |
| 38 | Bowling | `38-bowling/index.html` | 12.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js | Responsive Canvas | Yes | Arcade Core |
| 39 | Basketball Hoops | `39-basketball/index.html` | 9.5 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Responsive Canvas | Yes | Arcade Core |
| 40 | Mini Golf | `40-mini-golf/index.html` | 13.3 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js | Responsive Canvas | Yes | Arcade Core |
| 41 | Soccer Pool | `41-soccer-pool/index.html` | 11.0 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, arcade-core.js, score-bridge.js, ui-kit.js, fx-kit.js | Responsive Canvas | Yes | Arcade Core |
| 42 | Merge 2048 | `42-2048/index.html` | 8.2 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js, music-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 43 | Sudoku | `43-sudoku/index.html` | 9.7 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 44 | Minefield | `44-minesweeper/index.html` | 7.8 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 45 | Slide Tiles | `45-sliding-puzzle/index.html` | 5.9 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 46 | Nuts & Bolts | `46-nuts-bolts/index.html` | 11.9 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Canvas 480×640 | No | Board Kit |
| 47 | Bubble Sort | `47-colour-sort/index.html` | 8.5 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 48 | Orchard Drop | `48-fruit-merge/index.html` | 9.5 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js, fx-kit.js | Canvas 400×600 | No | Board Kit |
| 49 | Table Tennis | `49-table-tennis/index.html` | 48.4 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, board-kit.js, score-bridge.js, ui-kit.js | Canvas 1280×720 (Arena 3D) | Yes | Board Kit |
| 50 | Mahjong Solitaire — Jade Table | `50-mahjong/index.html` | 15.0 KB | perf-kit.js, save-kit.js, meta-config.js, meta-kit.js, score-bridge.js, ui-kit.js | Canvas 12×8 (Arcade) | No | Standalone HTML/JS |

## Summary Statistics

- **Total Games**: 50
- **Current canonical HTML total**: 773935 bytes (~0.74 MiB; 15.1 KB average; remeasured after S1-6 on 2026-10-22)

### Script Kits Usage

- **`arcade-core.js`**: 25 games
- **`platform-kit.js`**: 3 games
- **`act-kit.js`**: 6 games
- **`board-kit.js`**: 24 games
- **`Inline only`**: 1 game
- **`perf-kit.js`**: 50 games
- **`save-kit.js`**: 50 games
- **`meta-config.js`**: 50 games
- **`meta-kit.js`**: 50 games
- **`score-bridge.js`**: 50 games
- **`ui-kit.js`**: 50 games

### ?diff & SET_DIFFICULTY Support

- Arcade-core games (01–20, 37–41) map Easy/Normal/Hard to 0.8×/1.0×/1.35× simulation speed; Hard also applies a 1.25× score multiplier.
- Table Tennis (49) maps the three settings to its three CPU modes.
- Board Kit exposes `Board.level()` as 1 (Easy), 2 (Normal), 3 (Hard), reads `?diff`, handles `SET_DIFFICULTY`, and syncs compatible `#lvl`, `#difficulty`, `#size`, `#draw`, and unlocked-level selectors. Tic-Tac-Toe (30), Merge 2048 (42), and Mahjong (50) also have game-specific difficulty effects.
- K8 is rolled out to all 50 entries: each has a documented gameplay effect, and the source audit distinguishes shared mappings from game-specific behavior.

### Cross-game rollout audit (2026-10-22)

- All 50 canonical pages contain a viewport declaration and load `perf-kit.js`; this checks presence, not full per-game behavior.
- Verified current external kit order is `perf-kit.js`, `save-kit.js`, `meta-config.js`, `meta-kit.js`, family core, optional family kit, `score-bridge.js`, `ui-kit.js`, optional art/effects/music, then inline game logic. For standalone Mahjong, meta scripts precede its score bridge and inline logic.
- All 50 canonical pages load `save-kit.js` and `score-bridge.js`, verified from each page external script tags. Board-kit pages start reporting on trusted gameplay input; terminal results and page exit send score/session-end events. This static audit confirms wiring presence; runtime behavior is checked separately by the smoke report.
- Arcade-core pages call `Perf.tick` in the shared game loop. Standalone and board-kit Lite-tier behavior still needs individual runtime verification.
- W12 Gemini features remain approval-gated and were not included in this audit.

### S0-8 kit coverage recheck (2026-10-22)

- Audited 50 numeric canonical HTML pages: `perf-kit.js`, `save-kit.js`, `meta-config.js`, `meta-kit.js`, `score-bridge.js`, and `ui-kit.js` each appear exactly once on all 50.
- Verified script order on all 50; meta config precedes meta kit, and both precede the game core or standalone game logic.
- Family counts remain 25 `arcade-core.js`, 24 `board-kit.js`, and one standalone inline game (Mahjong). Other kit counts remain 3 `platform-kit.js`, 6 `act-kit.js`, 8 `fx-kit.js`, 3 `music-kit.js`, and 1 `board-art.js`.
- `UI.mountGame` is implemented in `ui-kit.js`; game 01 is the verified config pilot. `ui-kit.js` is 22,726 bytes and all 50 canonical games load it once.
- `meta-kit.js` is a shared progression writer; the production Profile integration and date-mocked rules are recorded in `docs/APEX_NEXT_PRD.md` under S1-4.
- The Meta cosmetic registry contains 16 game 01 items across all four slots; Save v3 stores owned/equipped ids and the Customize flow is browser-verified in the S1-6 PRD record.
- Static source checks verify kit tags and hook wiring only. See `docs/SMOKE_REPORT.md` for browser results; overall smoke status remains subject to per-game input, pause, and mobile activation checks.

### K8 per-game difficulty meaning (verified source audit, 2026-10-22)

Each line states the gameplay effect selected by Easy, Normal and Hard.

- 01 Glowmoth Gauntlet — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 02 Ion Rally — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 03 Ember Serpent — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 04 Hivefall Defense — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 05 Prism Stack — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 06 Glow Beetle — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 07 Starfall Rift — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 08 Fox Courier — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 09 Cloudhop Pip — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 10 Rollo Rush — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 11 Iron Circuit — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 12 Clockwork Dawn — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 13 Lanternbound — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 14 Deepcore Drifter — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 15 Hollowbell — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 16 Skyfall Ridge — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 17 Stormcap Showdown — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 18 Ashen Descent — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 19 Lumen Sprite — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 20 Glimmer Gadabout — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 21 Chess — Easy, Normal and Hard select the matching CPU search preset.
- 22 Snakes & Ladders — Easy shortens each snake drop to the midpoint, Normal uses the printed board, and Hard extends each drop by five squares for every player.
- 23 Ludo — Easy chooses a random legal token move, Normal uses the standard priorities, and Hard weighs winning, safe squares and captures more strongly.
- 24 Carrom — Easy, Normal and Hard select the matching CPU preset.
- 25 Tycoon Town — Easy limits CPU building to one house per turn, Normal to three and Hard to five when funds permit.
- 26 Checkers — Easy, Normal and Hard select the matching CPU preset.
- 27 Connect Four — Easy, Normal and Hard select the matching CPU preset.
- 28 Mancala — Easy, Normal and Hard select the matching CPU preset.
- 29 Reversi — Easy, Normal and Hard select the matching CPU preset.
- 30 Tic-Tac-Toe — Easy maps to AI strength 1 and enables hints; Normal maps to strength 2; Hard maps to strength 3. Manual AI strength remains available.
- 31 Backgammon — Easy, Normal and Hard select the matching CPU preset.
- 32 Dots & Boxes — Easy, Normal and Hard select the matching CPU preset.
- 33 Go 9×9 — Easy, Normal and Hard select the matching CPU preset.
- 34 Solitaire — Easy deals one card at a time; Normal and Hard deal three cards at a time.
- 35 Memory Match — Easy selects 12 cards, Normal 16 and Hard 24, changing the number of pairs; Expert 36-card play remains an in-game option.
- 36 Maths Dash — Easy, Normal and Hard select the matching question preset.
- 37 8-Ball Pool — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 38 Bowling — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 39 Basketball Hoops — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 40 Mini Golf — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 41 Soccer Pool — Easy 0.8× simulation; Normal 1.0×; Hard 1.35× simulation and 1.25× score.
- 42 Merge 2048 — Easy allows 8 undos and favors spawning 2 tiles; Normal allows 4 undos; Hard allows 1 undo and favors spawning 4 tiles.
- 43 Sudoku — Easy, Normal and Hard select the matching clue-count preset and regenerate the puzzle.
- 44 Minefield — Easy, Normal and Hard select the matching board-size/mine-count preset.
- 45 Slide Tiles — Easy selects the smallest board, Normal a middle board and Hard the largest available board.
- 46 Nuts & Bolts — Easy starts at the first unlocked level, Normal at a middle unlocked level and Hard at the highest unlocked level.
- 47 Bubble Sort — Easy starts at the first unlocked level, Normal at a middle unlocked level and Hard at the highest unlocked level.
- 48 Orchard Drop — Easy allows 0.75 seconds between drops, Normal 0.55 seconds and Hard 0.35 seconds.
- 49 Table Tennis — Easy, Normal and Hard select CPU modes 0, 1 and 2.
- 50 Mahjong Solitaire — Easy grants 5 hints, Normal 3 and Hard 1 per deal.
