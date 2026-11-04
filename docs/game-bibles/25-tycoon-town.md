# Game 25 — Tycoon Town

## Pitch

A compact Monopoly-style property game on a single-screen 11×11 board. Roll two dice, buy streets, stations and utilities, complete colour sets, stack houses into hotels, and drive every rival bankrupt. Each mode changes the economy rather than the board, so the town stays readable while the pressure curve changes.

## Art direction

A dark tabletop with a bright town board: deep green board background, cream squares, colour-coded street bands, and circular tokens with player icons. The centre panel carries the dice and the mode/round readout. Owned squares show a player-colour underline, houses and hotels sit in each street's colour band, and houses are drawn as green blocks with a red hotel bar.

Keep gameplay objects distinct from the background and never rely on colour alone: ownership also uses position and the player list, dice use pip glyphs, and the current square gets a gold outline. The five board skins repaint the board surface, square fill, ink, lines and centre panel together, so text contrast is preserved. Lite and reduced-motion settings remove decorative motion without removing dice, movement or ownership feedback.

## Modes and match structure

| Mode | Start cash | START payout | Rent | Tax | Round limit | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Classic | $1,500 | $200 | 1× | 1× | none | 1× | 2,500 |
| Quick Round | $2,000 | $200 | 1× | 1× | 10 | 1.2× | 1,800 |
| Boom Town | $3,000 | $300 | 2× | 2× | none | 1.4× | 2,200 |
| Market Crash | $900 | $100 | 1× | 1.5× | none | 1.6× | 2,000 |
| Property Empire | $2,500 | $250 | 1.5× | 1× | none | 2× | 4,000 |

1. **Classic:** standard economy. Last player standing wins.
2. **Quick Round:** ten rounds, then the highest net worth among surviving players wins.
3. **Boom Town:** richer start and a larger START payout, but rent and tax are doubled.
4. **Market Crash:** a thin $900 start and a $100 START payout; tax is 1.5×, so landing on tax early is a real threat.
5. **Property Empire:** locked behind one Classic win. It is a forced two-seat 1v1 against the computer: the game sets the seat selector to `2c` and disables it for the match, and the computer builds up to five houses per turn. Score is doubled.

A mode change starts a fresh game with that mode's starting state only. Pause/resume preserves the complete in-progress turn, deck order and modal state. Restarting keeps the selected mode and seat layout.

## Core rules

- Two dice, movement clockwise from START. Passing START pays the mode's payout and scores 100.
- Doubles grant another roll; three doubles in a row sends the player to jail.
- Jail: roll doubles, pay $50, or spend a get-out card. After three failed turns the player pays $50 and leaves.
- Stations charge $25 doubled for each station owned by the same landlord; utilities charge 4× the dice sum, or 10× when both are owned.
- A street's rent doubles when one player owns its whole colour set. Houses multiply base rent by 5 / 15 / 45 / 80, and a hotel (five levels) by 125.
- Houses must be built evenly across a colour set and cost the set's build price. Four houses plus one more becomes a hotel.
- If a payment cannot be met, houses are sold back at half price, then the cheapest deeds are sold to the bank at half price. If still short, all remaining deeds transfer to the creditor (or the bank), cash goes to zero, and that player is bankrupt.
- Chance and Community each hold ten cards, shuffled per game and cycled. Cards include START and property advances, dividends, fines, jail, jail cards, repairs and per-player birthday payments.

## Scoring

| Event | Points |
| --- | --- |
| Buy a street, station or utility | 80 |
| Complete a colour set | +250 |
| Build one house or hotel level | 60 |
| Pass START | 100 |
| Collect rent | The rent amount is added to the landlord's score |
| Win | Mode bonus from the table above |

The final score is `(human score + win bonus if that human won) × mode multiplier`, rounded. In one-seat games the human always receives the bonus. In local multiplayer the human seat is Player 1 and only a Player 1 win receives it.

## Records and persistence

Saved under `tycoon-town` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestQuickScore`, `bestBoomScore`, `bestCrashScore`, `bestEmpireScore`
- `bestScore`, `wins`, `classicWins`, `quickWins`, `boomWins`, `crashWins`, `empireWins`
- `propertiesBought`, `rentCollected`, `housesBuilt`
- `fewestRounds` on a win
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`personal-best` unlocks whenever a final score beats the previous overall best. The result line records the winner and mode, for example `You won Classic` or `Computer 1 won Property Empire`.

## Cosmetics

Sixteen registered cosmetics, all priced through the shared Sparks registry and persisted by `meta-kit.js`:

| Slot | Items |
| --- | --- |
| Skin (board) | Classic Board, Ivory Board, Neon Board, Slate Board, Sunset Board |
| Palette (tokens) | Classic Tokens, Neon Tokens, Pastel Tokens, Mono Tokens |
| Effect (accent) | Gold Accent, Cyan Accent, Rose Accent, Lime Accent |
| Theme (scene) | Night Office, Harbor Lights, Dusk Skyline |

Keyboard focus rings are fixed to `#fde047`, so the gold accent remains visible even when the selected accent is lime. Token recolours are applied to live players immediately. Theme items only replace the page background; the board retains its own skin.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Roll | Roll the dice. | Common |
| Landlord | Buy your first property. | Common |
| Rent Day | Collect rent from a rival. | Common |
| Builder | Build your first house. | Common |
| Full Colour | Complete a colour set. | Rare |
| Hotel Tycoon | Build a hotel. | Epic |
| Town Owner | Win a Classic game. | Common |
| Quick Fortune | Win a Quick Round. | Rare |
| Boom Winner | Win a Boom Town game. | Rare |
| Crash Survivor | Win a Market Crash game. | Epic |
| Empire Builder | Win a Property Empire game. | Legendary |
| Personal Best | Set a new best score. | Rare |

Only human seats trigger achievements. `first-roll` also fires through the scripted `rollNow` path so tests and tutorials can award it deterministically.

## Tutorial and controls

The interactive tutorial teaches, in order: rolling and the START payout, buying versus paying rent, completing a set and building evenly, and doubles/jail. Four steps, replayable from the menu.

| Input | Action |
| --- | --- |
| Space / Enter / R | Press the first enabled action (roll, buy, skip, end turn) |
| Click / tap | Use action buttons, build menu options, and dialogs |
| B | Open the build menu when available |
| N | New game |
| H / M | Shared help / mute |

Board squares are display cells, not clickable property actions; all decisions happen through the action row under the board so touch targets stay large. Modals trap focus and Escape is blocked while a decision is pending.

## Current baseline and scope

Canonical page: `public/assets/games/25-tycoon-town/index.html` (34.9 KB). Shared kits: perf-kit, save-kit, meta-config, meta-kit, board-kit, score-bridge, ui-kit, plus music-kit/menu-kit and menu-bootstrap. Layout: Board DOM grid; five cosmetics slots registered. No daily seed, campaign or online play is shipped. The board is fixed at 40 squares; modes alter the economy, not the map.

`window.TycoonTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setPlayers`, `setLevel`, `setDifficulty`, `level`, `setCash`, `setPos`, `setJail`, `setOwner`, `setHouses`, `grantCard`, `rollNow`, `rentOf`, `worth`, `buyNow`, `rentNow`, `buildNow`, `charge`, `bankrupt`, `finish`, `advance`, `award`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-25.mjs` (`npm run test:game-25`). It covers mode listing and the Empire lock, menu actions, Classic purchase/set/house/hotel/rent scoring, all five mode outputs (Quick 2,160, Boom 3,080, Crash 3,200, Empire 8,000), forced 1v1 seating, bankruptcy liquidation, all 16 cosmetics, the full achievement set, cumulative stats and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Build a careful route through the town market.
- **Palette:** `#080d15` background, `color-mix(in srgb, #4ade80 8%, rgba(15,22,35,.94))` panel, `#4ade80` accent, `color-mix(in srgb, #4ade80 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `town-frame` frame and `town-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural town motif (three overlapping blocks) with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Table-family major motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Click or tap actions under the board; Space/Enter/R confirms.
- **Lite fallback:** Static town composition with the title accent and scene silhouette.
