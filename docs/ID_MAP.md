# Game ID map (S0-0)

Verified from `src/data/gamesData.ts` and the 50 canonical game pages in `public/assets/aistudio/` on 2026-10-22.

`GameInfo.id` is the host-facing id. `Page config` is the id supplied to the page's `Arcade.game`, `P.game`, `K.game`, or `Board.shell` configuration. `Save id` is the literal id passed to the `Save` API; `—` means the page does not call that API. `Family` follows the task's kit-family grouping. S0-7 removed the unreferenced hashed copies; this table lists only canonical game pages.

| # | GameInfo.id | `htmlPath` | Page config | Save id | Family | Host/config differ? |
|---:|---|---|---|---|---|---|---|
| 01 | `flappy-bird` | `/assets/aistudio/01-flappy-bird.html` | `Arcade.game`: `glowmoth` | `glowmoth` | `arcade-core` | Yes |
| 02 | `pong` | `/assets/aistudio/02-pong.html` | `Arcade.game`: `ion-rally` | — | `arcade-core` | Yes |
| 03 | `snake` | `/assets/aistudio/03-snake.html` | `Arcade.game`: `ember-serpent` | — | `arcade-core` | Yes |
| 04 | `space-invaders` | `/assets/aistudio/04-space-invaders.html` | `Arcade.game`: `hivefall` | — | `arcade-core` | Yes |
| 05 | `tetris` | `/assets/aistudio/05-tetris.html` | `Arcade.game`: `prism-stack` | — | `arcade-core` | Yes |
| 06 | `pac-man` | `/assets/aistudio/06-pac-man.html` | `Arcade.game`: `glow-beetle` | — | `arcade-core` | Yes |
| 07 | `asteroids` | `/assets/aistudio/07-asteroids.html` | `Arcade.game`: `starfall-rift` | — | `arcade-core` | Yes |
| 08 | `super-mario-bros` | `/assets/aistudio/08-mario.html` | `P.game`: `fox-courier` | — | `platform` | Yes |
| 09 | `super-mario-world` | `/assets/aistudio/09-mario-world.html` | `P.game`: `cloudhop-pip` | — | `platform` | Yes |
| 10 | `sonic-the-hedgehog` | `/assets/aistudio/10-sonic.html` | `P.game`: `rollo-rush` | — | `platform` | Yes |
| 11 | `street-fighter-ii` | `/assets/aistudio/11-street-fighter.html` | `Arcade.game`: `iron-circuit` | — | `arcade-core` | Yes |
| 12 | `chrono-trigger` | `/assets/aistudio/12-chrono-adventure.html` | `Arcade.game`: `clockwork-dawn` | — | `arcade-core` | Yes |
| 13 | `castlevania-sotn` | `/assets/aistudio/13-castlevania.html` | `K.game`: `lanternbound` | — | `act` | Yes |
| 14 | `super-metroid` | `/assets/aistudio/14-metroid.html` | `K.game`: `deepcore-drifter` | — | `act` | Yes |
| 15 | `hollow-knight` | `/assets/aistudio/15-hollow-knight.html` | `K.game`: `hollowbell` | — | `act` | Yes |
| 16 | `celeste` | `/assets/aistudio/16-celeste.html` | `Arcade.game`: `skyfall-ridge` | — | `arcade-core` | Yes |
| 17 | `cuphead` | `/assets/aistudio/17-cuphead.html` | `Arcade.game`: `stormcap-showdown` | — | `arcade-core` | Yes |
| 18 | `dead-cells` | `/assets/aistudio/18-dead-cells.html` | `K.game`: `ashen-descent` | — | `act` | Yes |
| 19 | `ori-and-the-blind-forest` | `/assets/aistudio/19-ori.html` | `K.game`: `lumen-sprite` | — | `act` | Yes |
| 20 | `rayman-legends` | `/assets/aistudio/20-rayman.html` | `K.game`: `glimmer-gadabout` | — | `act` | Yes |
| 21 | `chess` | `/assets/aistudio/21-chess.html` | `Board.shell`: `chess` | — | `board` | No |
| 22 | `snakes-ladders` | `/assets/aistudio/22-snakes-ladders.html` | `Board.shell`: `snakes-ladders` | — | `board` | No |
| 23 | `ludo` | `/assets/aistudio/23-ludo.html` | `Board.shell`: `ludo` | — | `board` | No |
| 24 | `carrom` | `/assets/aistudio/24-carrom.html` | `Board.shell`: `carrom` | — | `board` | No |
| 25 | `tycoon-town` | `/assets/aistudio/25-tycoon-town.html` | `Board.shell`: `tycoon-town` | — | `board` | No |
| 26 | `checkers` | `/assets/aistudio/26-checkers.html` | `Board.shell`: `checkers` | — | `board` | No |
| 27 | `connect-four` | `/assets/aistudio/27-connect-four.html` | `Board.shell`: `connect-four` | — | `board` | No |
| 28 | `mancala` | `/assets/aistudio/28-mancala.html` | `Board.shell`: `mancala` | — | `board` | No |
| 29 | `reversi` | `/assets/aistudio/29-reversi.html` | `Board.shell`: `reversi` | — | `board` | No |
| 30 | `tic-tac-toe` | `/assets/aistudio/30-tic-tac-toe.html` | `Board.shell`: `tic-tac-toe` | `tic-tac-toe` | `board` | No |
| 31 | `backgammon` | `/assets/aistudio/31-backgammon.html` | `Board.shell`: `backgammon` | — | `board` | No |
| 32 | `dots-boxes` | `/assets/aistudio/32-dots-boxes.html` | `Board.shell`: `dots-boxes` | — | `board` | No |
| 33 | `go` | `/assets/aistudio/33-go.html` | `Board.shell`: `go` | — | `board` | No |
| 34 | `solitaire` | `/assets/aistudio/34-solitaire.html` | `Board.shell`: `solitaire` | — | `board` | No |
| 35 | `memory-match` | `/assets/aistudio/35-memory-match.html` | `Board.shell`: `memory-match` | — | `board` | No |
| 36 | `maths-dash` | `/assets/aistudio/36-maths-dash.html` | `Board.shell`: `maths-dash` | — | `board` | No |
| 37 | `pool` | `/assets/aistudio/37-pool.html` | `Arcade.game`: `pool` | — | `arcade-core` | No |
| 38 | `bowling` | `/assets/aistudio/38-bowling.html` | `Arcade.game`: `bowling` | — | `arcade-core` | No |
| 39 | `basketball` | `/assets/aistudio/39-basketball.html` | `Arcade.game`: `basketball` | — | `arcade-core` | No |
| 40 | `mini-golf` | `/assets/aistudio/40-mini-golf.html` | `Arcade.game`: `minigolf` | — | `arcade-core` | Yes |
| 41 | `soccer-pool` | `/assets/aistudio/41-soccer-pool.html` | `Arcade.game`: `soccer-pool` | — | `arcade-core` | No |
| 42 | `2048` | `/assets/aistudio/42-2048.html` | `Board.shell`: `2048` | `2048` | `board` | No |
| 43 | `sudoku` | `/assets/aistudio/43-sudoku.html` | `Board.shell`: `sudoku` | — | `board` | No |
| 44 | `minesweeper` | `/assets/aistudio/44-minesweeper.html` | `Board.shell`: `minesweeper` | — | `board` | No |
| 45 | `sliding-puzzle` | `/assets/aistudio/45-sliding-puzzle.html` | `Board.shell`: `sliding-puzzle` | — | `board` | No |
| 46 | `nuts-bolts` | `/assets/aistudio/46-nuts-bolts.html` | `Board.shell`: `nuts-bolts` | — | `board` | No |
| 47 | `colour-sort` | `/assets/aistudio/47-colour-sort.html` | `Board.shell`: `bubble-sort` | — | `board` | Yes |
| 48 | `fruit-merge` | `/assets/aistudio/48-fruit-merge.html` | `Board.shell`: `fruit-merge` | — | `board` | No |
| 49 | `table-tennis` | `/assets/aistudio/49-table-tennis.html` | `Board.shell`: `table-tennis` | — | `board` | No |
| 50 | `mahjong` | `/assets/aistudio/50-mahjong.html` | No shared game config | — | `standalone` | N/A |

## Config ID mismatches remaining after S0-1

The host `GameInfo.id` differs from the page's config id for games **01–20**, **40**, and **47**. Keep host event/storage ids and page `cfgId` distinct until S0-8 reconciles them. S0-0 records the current ids; S0-1 verified that stats defaults use valid host ids.

The Save API is currently used by games **01**, **30**, and **42** only. In each case the Save id matches the page config id; game 01's Save id is `glowmoth`, while the host id is `flappy-bird`. The other pages may have legacy `arcade-core` or `Board.ls` persistence, but they do not call the `Save` API.

## Verification

- Catalog entries: 50; canonical HTML pages: 50; hashed twins: 50; every canonical page number has one hashed twin.
- Spot-checked ids and paths for games 01, 08, 21, 42, and 50 against the catalog and page source.
- No game page or source code was changed during S0-0.
- S0-1 confirmed every default high-score and favorite id exists in `GAMES_DATA`.
