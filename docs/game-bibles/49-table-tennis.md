# Game 49 — Table Tennis

## Pitch

Perspective 3D table tennis played from behind your end of the table. A serve must bounce on your side first, then on your opponent's; every return must clear the net and bounce once on the other side. Move the bat anywhere around your end, push it forward to take the ball early or pull it back to buy time, and click just before contact to smash. Classic is first to 11, Blitz is first to 7 against the hard-hitting pro, Marathon is first to 21, Pro Tour is the hard 11-point event, and Two Players shares the keyboard.

## Art direction

A full arena rendered in perspective: a regulation table on a raised mat under three depth bands of arena light, with a ball trail, paddle rubber and a projected aim guide. Table skins come from `table-tennis:table-*`, the arena palette from `table-tennis:arena-*`, the ball trail from `table-tennis:trail-*` and the paddle rubber from `table-tennis:rubber-*`. Rally counters, the scoreboard and the aim guide are always shown, so the state never depends on the ball trail alone.

## Modes and match structure

| Mode | Target | Win by | Opponent | Unlock |
| --- | --- | --- | --- | --- |
| Classic | 11 | 2 | standard CPU | open |
| Blitz | 7 | 2 | pro CPU | open |
| Marathon | 21 | 2 | standard CPU | open |
| Pro Tour | 11 | 2 | pro CPU | Classic win |
| Two Players | 11 | 2 | local player two | open |

1. **Classic:** the baseline 11-point match and the unlock gate.
2. **Blitz:** a short first-to-7 match against the fastest, least noisy CPU.
3. **Marathon:** first to 21 for long rallies and endurance.
4. **Pro Tour:** first to 11 against the pro; locked until a Classic win (`classicWins ≥ 1`).
5. **Two Players:** local versus on one keyboard; player one uses the pointer/WASD, player two uses the arrow keys and Enter.

A mode change starts a new match. Pause freezes the ball, the shot cooldown and the match clock. The shared difficulty setting selects one of the three CPU skill curves for non-versus modes without changing the scoring target.

## Core rules

- The server must bounce the ball on their own side first, then on the receiver's side.
- After the serve, every return must clear the net and bounce once on the opponent's side.
- A point is lost by letting the ball bounce twice on your side, hitting the net, or sending the ball off the table.
- The first player to the target with a two-point lead wins; at deuce the serve alternates every point.
- The bat follows the pointer or touch anywhere around the player's end; keyboard movement and a fine-control modifier are also supported.
- Reach pushes the bat forward (earlier contact) or pulls it back (more time).
- Click or Space swings; a well-timed swing near contact becomes a power smash with a short cooldown.
- The longest rally of the match is tracked as a shot count and pays a score bonus.

## Scoring

A match pays `your points × 120 + longest rally × 25 + (won ? 600 : 0) + target × 10`. Your points count even in a loss. There is no difficulty score multiplier; the mode's target and opponent are the challenge.

## Records and persistence

Saved under `table-tennis`:

- `bestScoreClassic`, `bestScoreBlitz`, `bestScoreMarathon`, `bestScorePro`, `bestScoreDuo`
- `bestRally` (longest rally across the career, maximum merge)
- `matches`, `wins`, `losses`, `points`, `smashes`
- `classicWins`, `blitzWins`, `marathonWins`, `proWins`, `duoWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

## Cosmetics

Sixteen registered cosmetics using the `table-tennis:` prefix:

| Slot | Items |
| --- | --- |
| Skin (table) | Azure, Emerald, Crimson, Carbon, Royal |
| Palette (arena) | Apex, Midnight, Sunset, Forest |
| Effect (ball trail) | White, Gold, Cyan, Rose |
| Theme (paddle rubber) | Slate, Crimson, Jade |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Point | win a match | Common |
| Perfect Game | win without conceding a point | Epic |
| Clean Sheet | win conceding five points or fewer | Rare |
| Long Rally | keep a rally alive for ten shots | Common |
| Rally Master | keep a rally alive for twenty shots | Rare |
| Blitz Winner | win a Blitz match | Rare |
| Marathon Winner | win a Marathon match | Rare |
| Pro Scalp | beat the pro | Epic |
| House Champion | win a two-player match | Common |
| Comeback | win after trailing by three or more | Rare |
| Tour Regular | win five career matches | Rare |
| Grand Slam | win in every mode | Legendary |

## Tutorial and controls

The interactive tutorial covers pointer movement, the reach control, the timed smash and the serve-bounce rule. Controls: mouse/touch moves the bat; wheel, Q/E or the reach slider adjusts depth; click or Space serves and swings; WASD or arrows move; Shift fine-controls; Enter is player two's serve/swing; G toggles the aim guide; P pauses; N starts a new match; H/M toggle help and mute. The HUD shows the mode, the aim-guide toggle, the scoreboard and the current rally.

## Menu Identity Card

- **Archetype:** scoreboard.
- **Mood:** Meet the ball early and return it across the table.
- **Palette:** `#080d15` background, `color-mix(in srgb, #38bdf8 8%, rgba(15,22,35,.94))` panel, `#38bdf8` accent, `color-mix(in srgb, #38bdf8 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `rally-frame` frame and `rally-banner` button identity, using the shared scoreboard treatment.
- **Scene recipe:** A procedural rally wave under arena lights, with restrained depth bands and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title minor procedural motif; shared tick, select and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options. Difficulty selects the CPU skill curve; the mode sets the target and the opponent.
- **Controls:** Move the paddle with the pointer or touch; WASD and arrows also work.
- **Lite fallback:** Static rally composition with the title accent and arena silhouette.
