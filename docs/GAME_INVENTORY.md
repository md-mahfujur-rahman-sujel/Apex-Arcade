# Apex Arcade — Game Inventory & Architecture Audit

Generated: 2026-10-21 | Task: P0.3

Complete technical breakdown of all 50 canonical HTML games in `public/assets/aistudio/`.

| # | Title | File | Size | Kits Loaded | Canvas / Layout | ?diff Support | Category / Engine Family |
|---|-------|------|------|-------------|-----------------|---------------|--------------------------|
| 01 | Glowmoth Gauntlet | `01-flappy-bird.html` | 7.6 KB | arcade-core.js | Canvas 420×640 | Yes | Arcade Core |
| 02 | Ion Rally | `02-pong.html` | 8.5 KB | arcade-core.js | Canvas 800×480 | Yes | Arcade Core |
| 03 | Ember Serpent | `03-snake.html` | 9.3 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 04 | Hivefall Defense | `04-space-invaders.html` | 12.6 KB | arcade-core.js | Canvas 640×520 | Yes | Arcade Core |
| 05 | Prism Stack | `05-tetris.html` | 12.0 KB | arcade-core.js | Canvas 560×620 | Yes | Arcade Core |
| 06 | Glow Beetle | `06-pac-man.html` | 17.7 KB | arcade-core.js | Canvas 520×640 (Arcade) | Yes | Arcade Core |
| 07 | Starfall Rift | `07-asteroids.html` | 14.0 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 08 | Fox Courier | `08-mario.html` | 7.2 KB | arcade-core.js, platform-kit.js | Responsive Canvas | Yes | Platform Kit (Arcade) |
| 09 | Cloudhop Pip | `09-mario-world.html` | 6.3 KB | arcade-core.js, platform-kit.js | Canvas 800×480 | Yes | Platform Kit (Arcade) |
| 10 | Rollo Rush | `10-sonic.html` | 7.9 KB | arcade-core.js, platform-kit.js | Canvas 800×480 | Yes | Platform Kit (Arcade) |
| 11 | Iron Circuit | `11-street-fighter.html` | 24.7 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 12 | Clockwork Dawn | `12-chrono-adventure.html` | 30.5 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 13 | Lanternbound | `13-castlevania.html` | 11.0 KB | arcade-core.js, act-kit.js | Canvas 24×32 (Arcade) | Yes | Action Kit (Arcade) |
| 14 | Deepcore Drifter | `14-metroid.html` | 9.3 KB | arcade-core.js, act-kit.js | Canvas 28×18 (Arcade) | Yes | Action Kit (Arcade) |
| 15 | Hollowbell | `15-hollow-knight.html` | 8.7 KB | arcade-core.js, act-kit.js | Canvas 28×22 (Arcade) | Yes | Action Kit (Arcade) |
| 16 | Skyfall Ridge | `16-celeste.html` | 21.7 KB | arcade-core.js | Canvas 20×28 (Arcade) | Yes | Arcade Core |
| 17 | Stormcap Showdown | `17-cuphead.html` | 15.6 KB | arcade-core.js | Canvas 24×44 (Arcade) | Yes | Arcade Core |
| 18 | Ashen Descent | `18-dead-cells.html` | 12.2 KB | arcade-core.js, act-kit.js | Canvas 24×32 (Arcade) | Yes | Action Kit (Arcade) |
| 19 | Lumen Sprite | `19-ori.html` | 6.8 KB | arcade-core.js, act-kit.js | Canvas 28×22 (Arcade) | Yes | Action Kit (Arcade) |
| 20 | Glimmer Gadabout | `20-rayman.html` | 6.9 KB | arcade-core.js, act-kit.js | Canvas 28×26 (Arcade) | Yes | Action Kit (Arcade) |
| 21 | Chess | `21-chess.html` | 17.3 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 22 | Snakes & Ladders | `22-snakes-ladders.html` | 10.4 KB | board-kit.js | Canvas 600×650 | No | Board Kit |
| 23 | Ludo | `23-ludo.html` | 10.8 KB | board-kit.js | Canvas 600×600 | No | Board Kit |
| 24 | Carrom | `24-carrom.html` | 17.6 KB | board-kit.js | Canvas 640×640 | No | Board Kit |
| 25 | Tycoon Town | `25-tycoon-town.html` | 20.6 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 26 | Checkers | `26-checkers.html` | 10.1 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 27 | Connect Four | `27-connect-four.html` | 9.6 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 28 | Mancala | `28-mancala.html` | 10.8 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 29 | Reversi | `29-reversi.html` | 11.2 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 30 | Tic-Tac-Toe | `30-tic-tac-toe.html` | 8.7 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 31 | Backgammon | `31-backgammon.html` | 19.6 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 32 | Dots & Boxes | `32-dots-boxes.html` | 10.2 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 33 | Go 9×9 | `33-go.html` | 16.3 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 34 | Solitaire | `34-solitaire.html` | 12.6 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 35 | Memory Match | `35-memory-match.html` | 8.4 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 36 | Maths Dash | `36-maths-dash.html` | 9.6 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 37 | 8-Ball Pool | `37-pool.html` | 15.1 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 38 | Bowling | `38-bowling.html` | 12.3 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 39 | Basketball Hoops | `39-basketball.html` | 9.5 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 40 | Mini Golf | `40-mini-golf.html` | 13.3 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 41 | Soccer Pool | `41-soccer-pool.html` | 11.0 KB | arcade-core.js | Responsive Canvas | Yes | Arcade Core |
| 42 | Merge 2048 | `42-2048.html` | 8.2 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 43 | Sudoku | `43-sudoku.html` | 9.7 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 44 | Minefield | `44-minesweeper.html` | 7.8 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 45 | Slide Tiles | `45-sliding-puzzle.html` | 5.9 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 46 | Nuts & Bolts | `46-nuts-bolts.html` | 11.9 KB | board-kit.js | Canvas 480×640 | No | Board Kit |
| 47 | Bubble Sort | `47-colour-sort.html` | 8.5 KB | board-kit.js | Board DOM / SVG Grid | No | Board Kit |
| 48 | Orchard Drop | `48-fruit-merge.html` | 9.5 KB | board-kit.js | Canvas 400×600 | No | Board Kit |
| 49 | Table Tennis | `49-table-tennis.html` | 48.4 KB | board-kit.js | Canvas 1280×720 (Arena 3D) | Yes | Board Kit |
| 50 | Mahjong Solitaire — Jade Table | `50-mahjong.html` | 15.0 KB | Inline only | Canvas 12×8 (Arcade) | No | Standalone HTML/JS |

## Summary Statistics

- **Total Games**: 50
- **Total Size**: 640.8 KB (~0.63 MB)
- **Average Game Size**: 12.8 KB

### Script Kits Usage

- **`arcade-core.js`**: 25 games
- **`platform-kit.js`**: 3 games
- **`act-kit.js`**: 6 games
- **`board-kit.js`**: 24 games
- **`Inline only`**: 1 games

### ?diff & SET_DIFFICULTY Support

- **Supported**: Games using `arcade-core.js` (01–20, 37–41) and `49-table-tennis.html` natively handle `?diff=easy|normal|hard` and `SET_DIFFICULTY` postMessages.
- **Needs K8 Standardization**: Board games (21–36, 42–48, 50) using `board-kit.js` or inline logic currently lack unified difficulty scaling hooks (addressed in Phase 1 Task K8 / P1.3).
