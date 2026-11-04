# Game 26 — Checkers

## Pitch

Classic 8×8 draughts with mandatory captures, multi-hop chains, king promotions and a search-based computer rival. Five modes stretch the same rule set: a clock, a crown race, a reversed objective and a deepest-search match. The board is the whole game — no overlays, no captions, no button rows covering play.

## Art direction

A dark tabletop with a warm wooden 8×8 board and glossy pieces. Red pieces use a ruby gradient, Black pieces a graphite gradient, and kings carry a gold crown glyph. Legal destinations glow in the selected accent, the last move keeps a soft outline, and captured pieces fade out before the chain continues. The side panel stays compact: status line, seat and level selects, New game / Undo / Flip, capture tally and mode blurb.

Never rely on colour alone: the selected piece lifts, destinations pulse, and the status line names whose turn it is. Board palettes repaint light, dark and frame colours together so piece contrast holds. Lite and reduced-motion settings remove decorative transitions without removing move, capture or crown feedback.

## Modes and match structure

| Mode | Clock | Special rule | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- |
| Classic | none | Standard draughts; Red moves first | 1× | 1,000 |
| Speed Checkers | 3:00 per side | Flag falls, that side loses | 1.1× | 900 |
| King Hunt | none | First side to crown two kings wins immediately | 1.2× | 1,000 |
| Giveaway | none | Misère: lose every piece, or leave the rival stuck, to win | 1.3× | 1,200 |
| Grandmaster | none | Deepest search | 1.5× | 1,500 |

1. **Classic:** capture or block every enemy piece. A side with no legal move loses; forty plies without a capture or crown is a draw.
2. **Speed Checkers:** three minutes each. The clock only runs on the side to move and pauses with the menu.
3. **King Hunt:** the second crown for one side ends the game on the spot, regardless of material.
4. **Giveaway:** misère. Capturing the rival's last piece loses; a side that cannot move wins. Promotion still happens, but it is a handicap because kings must keep capturing.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`). Same rules, deeper search, higher stakes.

A mode change starts a fresh game in that mode. Pause/resume preserves the exact position, clocks and undo history. Restarting keeps the selected mode and seat.

## Core rules

- Pieces move one square diagonally forward onto a dark square, or jump an adjacent enemy piece to an empty square beyond it.
- Captures are mandatory. A multi-hop must continue while another jump is available from the landing square.
- Reaching the far row crowns a king (♛). Kings move and capture in both directions.
- If a side has no legal move it loses; if neither side has progress for forty plies the game is a draw.
- Undo restores the position before the last completed move, including a whole multi-hop chain.

## Scoring

| Event | Points |
| --- | --- |
| Capture a piece | 150 per piece |
| Crown a king | 120 |
| Win | Mode bonus from the table above |

The final score is `(human score + win bonus if the human won) × mode multiplier`, rounded. In two-player mode the human seat is Red and only a Red win earns the bonus.

## Records and persistence

Saved under `checkers` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestSpeedScore`, `bestKingsScore`, `bestGiveawayScore`, `bestGrandmasterScore`
- `bestScore`, `wins`, `classicWins`, `speedWins`, `kingsWins`, `giveawayWins`, `grandmasterWins`
- `captures`, `kingsCrowned`
- `fewestMoves` on a win (plies)
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`personal-best` unlocks whenever a final score beats the previous overall best. The result line records the winner and mode, for example `Red won Classic`.

## Cosmetics

Sixteen registered cosmetics, priced through the shared Sparks registry and persisted by `meta-kit.js`:

| Slot | Items |
| --- | --- |
| Skin (pieces) | Ruby Pieces, Ivory Pieces, Neon Pieces, Jade Pieces, Mono Pieces |
| Palette (board) | Wooden Board, Walnut Board, Slate Board, Midnight Board |
| Effect (accent) | Amber Highlight, Cyan Highlight, Rose Highlight, Lime Highlight |
| Theme (scene) | Night Saloon, Forest Camp, Sunset Deck |

Cosmetic IDs use the `checkers:` prefix while `gameId` stays `checkers`. Applying a piece skin rewrites both side gradients live; board skins rewrite light, dark and frame colours; accents drive selection and destination highlights. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Opening Move | Make a legal move. | Common |
| Jumped | Capture an enemy piece. | Common |
| Crowned | Crown a king. | Common |
| Double Jump | Capture two pieces in one move. | Rare |
| Triple Jump | Capture three pieces in one move. | Epic |
| Checker Champion | Win a Classic game. | Common |
| Beat The Clock | Win a Speed Checkers game. | Rare |
| King Hunt Winner | Win a King Hunt game. | Rare |
| Lost Everything | Win a Giveaway game. | Epic |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Flawless Sweep | Win without losing a piece. | Epic |
| Personal Best | Set a new best score. | Rare |

Only moves made by a human seat count toward move, capture and crown badges. Mode badges unlock only on a human win.

## Tutorial and controls

Four interactive steps teach diagonal movement, mandatory captures and chains, crowning, and the win condition.

| Input | Action |
| --- | --- |
| Click / tap | Select a piece, then a green destination |
| U | Undo the last move |
| F | Flip the board |
| N | New game |
| H / M | Shared help / mute |

Selected and legal states are shown on the board itself; the side panel carries only status and controls. Touch targets are full squares.

## Current baseline and scope

Canonical page: `public/assets/games/26-checkers/index.html` (24.9 KB). Shared kits: board-kit, menu-bootstrap, menu-kit, meta-kit, meta-config, save-kit, score-bridge, ui-kit, perf-kit, music-kit. Layout: Board DOM grid with a side rail; 16 cosmetics registered across four slots. No daily seed, campaign or online play is shipped.

`window.CheckersTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSeat`, `setLevel`, `setDifficulty`, `level`, `setBoard`, `setTurn`, `move`, `finish`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-26.mjs` (`npm run test:game-26`). It covers the mode list and Grandmaster lock, menu actions, Red's opening moves, a double jump with crown, Giveaway losing by capturing the last piece, the Speed clock, Classic/Grandmaster/King Hunt finishes, all 16 cosmetics, the achievement set, cumulative stats and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Take the diagonal route and crown your last piece.
- **Palette:** `#080d15` background, `color-mix(in srgb, #ef4444 8%, rgba(15,22,35,.94))` panel, `#ef4444` accent, `color-mix(in srgb, #ef4444 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `checkers-frame` frame and `checkers-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural checkers motif with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Table-family major motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Select a piece, then select a legal diagonal square.
- **Lite fallback:** Static checkers composition with the title accent and scene silhouette.
