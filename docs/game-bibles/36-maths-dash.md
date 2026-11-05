# Game 36 — Maths Dash

## Pitch

Short sums at arcade pace. Every correct answer builds a combo and the combo builds a multiplier; every ten correct answers in a row buys two more seconds on the clock. Five presets change the clock, the target and the question pool: Classic mixes four operations in sixty seconds, Sprint halves the clock, Marathon stretches to two minutes with two-step problems, Accuracy asks for twenty-four sums at your own pace, and Master fires forty-five seconds of elite prompts. Target-clears, per-mode bests and a 2,500-point milestone give every preset a chase.

## Art direction

A dark study panel with a large equation card at the top and a nine-key pad below. Keys carry the selected `md:keys-*` skin; the panel and accent come from the `md:panel-*` and `md:accent-*` families. Correct answers flash the accent and pop the score; wrong answers flash red and shake the equation. Master removes decorative motion in Lite and reduced-motion modes while keeping the equation, keypad and HUD.

## Modes and match structure

| Mode | Length | Target | Multiplier | Clear bonus | Question pool |
| --- | --- | --- | --- | --- | --- |
| Classic | 60 s | 600 | 1× | 1,000 | `+`, `−`, `×`, missing operand |
| Sprint | 30 s | 350 | 1.15× | 800 | `+`, `−`, `×` |
| Marathon | 120 s | 1,200 | 1.3× | 1,500 | all six, including division and two-step |
| Accuracy | 24 sums | 500 | 1.2× | 1,200 | all six, no clock |
| Master | 45 s | 900 | 1.5× | 2,000 | elite prompts |

1. **Classic:** the standard sixty-second board and unlock gate.
2. **Sprint:** half the clock and a lower target, but faster scoring.
3. **Marathon:** two full minutes and the widest question pool.
4. **Accuracy:** twenty-four sums with no timer; misses still break the combo.
5. **Master:** locked until Classic clears (`bestClassicScore ≥ 600`).

A mode change starts a fresh run. Pause freezes the clock and the current question; resume restores both.

## Core rules

- A sum locks in as soon as the typed answer is complete; Enter submits a partial answer and counts it wrong if incomplete.
- Correct: +1 combo, score award, next question. Every five combo steps raise the multiplier, capped at ×5.
- Every tenth consecutive correct answer in a timed mode adds two seconds.
- Wrong: combo resets to zero. Timed modes lose three seconds; Accuracy loses nothing but the combo.
- A run ends when the clock reaches zero (timed) or the twenty-four-sum quota is filled (Accuracy).
- Hint reveals the answer for 1.2 seconds and costs 50 points; it is unavailable below 50 points.

## Scoring

Each correct answer is `10 × multiplier + 5` when answered in under two seconds. The multiplier is `min(5, 1 + floor((combo − 1) / 5))`, so combo 1–5 is ×1, 6–10 is ×2, and so on.

The final score is `round((base + clear bonus) × mode multiplier)` when the mode target is reached, otherwise `round(base × mode multiplier)`. A clear also requires the full quota in Accuracy. Records keep the final score and the best combo, plus a best Accuracy time when that quota run clears.

## Records and persistence

Saved under `maths-dash` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestSprintScore`, `bestMarathonScore`, `bestAccuracyScore`, `bestMasterScore`
- `bestScore`, `bestCombo`, `bestAccuracy`, `bestAccuracyTime`
- `sumsAnswered`, `correctAnswers`, `wrongAnswers`, `wins`, `plays`, `secondsPlayed`
- `classicWins`, `sprintWins`, `marathonWins`, `accuracyWins`, `masterWins`
- `lastResult`, `lastMode`

Time records use the minimum merge, so an instant test clear cannot erase a real best.

## Cosmetics

Sixteen registered cosmetics using the `md:` prefix:

| Slot | Items |
| --- | --- |
| Skin (keypad) | Ember Keys, Cyan Keys, Ruby Keys, Violet Keys, Mono Keys |
| Palette (panel) | Night Panel, Slate Panel, Forest Panel, Plum Panel |
| Effect (accent glow) | Ember Glow, Cyan Glow, Rose Glow, Lime Glow |
| Theme (background) | Night Study, Dusk Study, Sea Study |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Sum | answer one sum correctly | Common |
| On A Roll | reach a combo of 10 | Rare |
| Unstoppable | reach a combo of 20 | Epic |
| Flawless Figure | clear a run at 100% accuracy with at least ten answers | Epic |
| Quick Thinker | clear a run averaging under three seconds per correct answer | Rare |
| Minute Mind | clear Classic | Common |
| Dash And Done | clear Sprint | Common |
| Long Haul | clear Marathon | Rare |
| Steady Hand | clear Accuracy | Rare |
| Number Master | clear Master | Legendary |
| High Roller | finish a run with 2,500+ points | Rare |
| Personal Best | set a new best score | Rare |

Unlock each once under `maths-dash`; a single toast accompanies the first unlock.

## Tutorial and controls

The menu tutorial teaches the complete-the-answer input, the combo multiplier, the hint cost and the per-mode targets. Controls: type digits on the keyboard, Backspace to correct, Enter to submit; or tap the on-screen keypad, including the backspace and submit keys. The HUD shows time or sums remaining, score and combo with the live multiplier.

## Menu Identity Card

- **Archetype:** paper.
- **Mood:** Solve the prompt before the clock reaches zero.
- **Palette:** `#080d15` background, `color-mix(in srgb, #60a5fa 8%, rgba(15,22,35,.94))` panel, `#60a5fa` accent, `color-mix(in srgb, #60a5fa 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `equation-frame` frame and `equation-banner` button identity.
- **Scene recipe:** Original procedural equation mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, step and error cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Type digits and Enter, or tap the keypad.
- **Lite fallback:** Static equation composition with the title accent and scene silhouette.
