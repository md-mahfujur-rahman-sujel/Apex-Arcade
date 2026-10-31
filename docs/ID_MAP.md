# Game ID map (S0-0)

Verified from `src/data/gamesData.ts` and the 50 canonical game pages in `public/assets/games/` on 2026-10-22.

`GameInfo.id` is the host-facing id. `Page config` is the id supplied to the page's `Arcade.game`, `P.game`, `K.game`, or `Board.shell` configuration. `Save id` is the literal id passed to the `Save` API; `—` means the page does not call that API. `Family` follows the task's kit-family grouping. S0-7 removed the unreferenced hashed copies; this table lists only canonical game pages.

| # | GameInfo.id | `htmlPath` | Page config | Save id | Family | Host/config differ? |
|---:|---|---|---|---|---|---|---|
| 01 | `flappy-bird` | `/assets/games/01-flappy-bird/index.html` | `Arcade.game`: `glowmoth` | `glowmoth` | `arcade-core` | Yes |
| 02 | `pong` | `/assets/games/02-pong/index.html` | `Arcade.game`: `ion-rally` | — | `arcade-core` | Yes |
| 03 | `snake` | `/assets/games/03-snake/index.html` | `Arcade.game`: `ember-serpent` | — | `arcade-core` | Yes |
| 04 | `space-invaders` | `/assets/games/04-space-invaders/index.html` | `Arcade.game`: `hivefall` | — | `arcade-core` | Yes |
| 05 | `tetris` | `/assets/games/05-tetris/index.html` | `Arcade.game`: `prism-stack` | — | `arcade-core` | Yes |
| 06 | `pac-man` | `/assets/games/06-pac-man/index.html` | `Arcade.game`: `glow-beetle` | — | `arcade-core` | Yes |
| 07 | `asteroids` | `/assets/games/07-asteroids/index.html` | `Arcade.game`: `starfall-rift` | — | `arcade-core` | Yes |
| 08 | `super-mario-bros` | `/assets/games/08-mario/index.html` | `P.game`: `fox-courier` | — | `platform` | Yes |
| 09 | `super-mario-world` | `/assets/games/09-mario-world/index.html` | `P.game`: `cloudhop-pip` | — | `platform` | Yes |
| 10 | `sonic-the-hedgehog` | `/assets/games/10-sonic/index.html` | `P.game`: `rollo-rush` | — | `platform` | Yes |
| 11 | `street-fighter-ii` | `/assets/games/11-street-fighter/index.html` | `Arcade.game`: `iron-circuit` | — | `arcade-core` | Yes |
| 12 | `chrono-trigger` | `/assets/games/12-chrono-adventure/index.html` | `Arcade.game`: `clockwork-dawn` | — | `arcade-core` | Yes |
| 13 | `castlevania-sotn` | `/assets/games/13-castlevania/index.html` | `K.game`: `lanternbound` | — | `act` | Yes |
| 14 | `super-metroid` | `/assets/games/14-metroid/index.html` | `K.game`: `deepcore-drifter` | — | `act` | Yes |
| 15 | `hollow-knight` | `/assets/games/15-hollow-knight/index.html` | `K.game`: `hollowbell` | — | `act` | Yes |
| 16 | `celeste` | `/assets/games/16-celeste/index.html` | `Arcade.game`: `skyfall-ridge` | — | `arcade-core` | Yes |
| 17 | `cuphead` | `/assets/games/17-cuphead/index.html` | `Arcade.game`: `stormcap-showdown` | — | `arcade-core` | Yes |
| 18 | `dead-cells` | `/assets/games/18-dead-cells/index.html` | `K.game`: `ashen-descent` | — | `act` | Yes |
| 19 | `ori-and-the-blind-forest` | `/assets/games/19-ori/index.html` | `K.game`: `lumen-sprite` | — | `act` | Yes |
| 20 | `rayman-legends` | `/assets/games/20-rayman/index.html` | `K.game`: `glimmer-gadabout` | — | `act` | Yes |
| 21 | `chess` | `/assets/games/21-chess/index.html` | `Board.shell`: `chess` | — | `board` | No |
| 22 | `snakes-ladders` | `/assets/games/22-snakes-ladders/index.html` | `Board.shell`: `snakes-ladders` | — | `board` | No |
| 23 | `ludo` | `/assets/games/23-ludo/index.html` | `Board.shell`: `ludo` | — | `board` | No |
| 24 | `carrom` | `/assets/games/24-carrom/index.html` | `Board.shell`: `carrom` | — | `board` | No |
| 25 | `tycoon-town` | `/assets/games/25-tycoon-town/index.html` | `Board.shell`: `tycoon-town` | — | `board` | No |
| 26 | `checkers` | `/assets/games/26-checkers/index.html` | `Board.shell`: `checkers` | — | `board` | No |
| 27 | `connect-four` | `/assets/games/27-connect-four/index.html` | `Board.shell`: `connect-four` | — | `board` | No |
| 28 | `mancala` | `/assets/games/28-mancala/index.html` | `Board.shell`: `mancala` | — | `board` | No |
| 29 | `reversi` | `/assets/games/29-reversi/index.html` | `Board.shell`: `reversi` | — | `board` | No |
| 30 | `tic-tac-toe` | `/assets/games/30-tic-tac-toe/index.html` | `Board.shell`: `tic-tac-toe` | `tic-tac-toe` | `board` | No |
| 31 | `backgammon` | `/assets/games/31-backgammon/index.html` | `Board.shell`: `backgammon` | — | `board` | No |
| 32 | `dots-boxes` | `/assets/games/32-dots-boxes/index.html` | `Board.shell`: `dots-boxes` | — | `board` | No |
| 33 | `go` | `/assets/games/33-go/index.html` | `Board.shell`: `go` | — | `board` | No |
| 34 | `solitaire` | `/assets/games/34-solitaire/index.html` | `Board.shell`: `solitaire` | — | `board` | No |
| 35 | `memory-match` | `/assets/games/35-memory-match/index.html` | `Board.shell`: `memory-match` | — | `board` | No |
| 36 | `maths-dash` | `/assets/games/36-maths-dash/index.html` | `Board.shell`: `maths-dash` | — | `board` | No |
| 37 | `pool` | `/assets/games/37-pool/index.html` | `Arcade.game`: `pool` | — | `arcade-core` | No |
| 38 | `bowling` | `/assets/games/38-bowling/index.html` | `Arcade.game`: `bowling` | — | `arcade-core` | No |
| 39 | `basketball` | `/assets/games/39-basketball/index.html` | `Arcade.game`: `basketball` | — | `arcade-core` | No |
| 40 | `mini-golf` | `/assets/games/40-mini-golf/index.html` | `Arcade.game`: `minigolf` | — | `arcade-core` | Yes |
| 41 | `soccer-pool` | `/assets/games/41-soccer-pool/index.html` | `Arcade.game`: `soccer-pool` | — | `arcade-core` | No |
| 42 | `2048` | `/assets/games/42-2048/index.html` | `Board.shell`: `2048` | `2048` | `board` | No |
| 43 | `sudoku` | `/assets/games/43-sudoku/index.html` | `Board.shell`: `sudoku` | — | `board` | No |
| 44 | `minesweeper` | `/assets/games/44-minesweeper/index.html` | `Board.shell`: `minesweeper` | — | `board` | No |
| 45 | `sliding-puzzle` | `/assets/games/45-sliding-puzzle/index.html` | `Board.shell`: `sliding-puzzle` | — | `board` | No |
| 46 | `nuts-bolts` | `/assets/games/46-nuts-bolts/index.html` | `Board.shell`: `nuts-bolts` | — | `board` | No |
| 47 | `colour-sort` | `/assets/games/47-colour-sort/index.html` | `Board.shell`: `bubble-sort` | — | `board` | Yes |
| 48 | `fruit-merge` | `/assets/games/48-fruit-merge/index.html` | `Board.shell`: `fruit-merge` | — | `board` | No |
| 49 | `table-tennis` | `/assets/games/49-table-tennis/index.html` | `Board.shell`: `table-tennis` | — | `board` | No |
| 50 | `mahjong` | `/assets/games/50-mahjong/index.html` | No shared game config | — | `standalone` | N/A |

## Config ID mismatches remaining after S0-1

The host `GameInfo.id` differs from the page's config id for games **01–20**, **40**, and **47**. Keep host event/storage ids and page `cfgId` distinct until S0-8 reconciles them. S0-0 records the current ids; S0-1 verified that stats defaults use valid host ids.

The Save API is currently used by games **01**, **30**, and **42** only. In each case the Save id matches the page config id; game 01's Save id is `glowmoth`, while the host id is `flappy-bird`. The other pages may have legacy `arcade-core` or `Board.ls` persistence, but they do not call the `Save` API.

## Verification

- Catalog entries: 50; canonical HTML pages: 50; hashed twins: 50; every canonical page number has one hashed twin.
- Spot-checked ids and paths for games 01, 08, 21, 42, and 50 against the catalog and page source.
- No game page or source code was changed during S0-0.
- S0-1 confirmed every default high-score and favorite id exists in `GAMES_DATA`.
