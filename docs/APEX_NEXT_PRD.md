# Apex Arcade Next: PRD v1.2 (Codex-ready)

22 Oct 2026 · Owner: Mahfujur Rahman · Builder: ChatGPT Codex (Luna 6.0, high effort) · Reviewer and designer: Claude

This is the build-ready PRD for Apex Arcade Next. It merges PRD v1.0, the first-session brief, a first-hand check of crazygames.com and a fresh read of the repository on 22 Oct 2026. Section 3 lists only what was read from files; anything not read is marked Not verified. Where this document conflicts with v1.0, `PRD.md` or `docs/GAME_INVENTORY.md`, this one wins. Codex must still read every file before editing it.

## 1. How to use this document

Read section 3 (what exists), section 5 (contracts), then only the task you were given in section 8.

1. Do ONE task ID per session (for example `S0-3`) and stop. Do not start the next task.
2. If documents disagree, the order of authority is: this PRD, then `PRD.md` (per-game briefs and kit specs), then `docs/GAME_INVENTORY.md`, then the game bibles in `docs/game-bibles/`, then `docs/LIGHT_UI_PRD.md`, `docs/UI_STYLE_GUIDE.md` and `docs/UI_QA.md`.
3. **Verified** means the file was read or the command was run. **Not verified** means neither. Never build on a Not verified item without checking it first.
4. MUST means required for acceptance. SHOULD means the default unless a written reason says otherwise. MAY means optional.
5. Requirement IDs (`SH-`, `GF-`, `UV-`, `QA-`), contract names and task IDs are stable. Quote them in commit messages and in the final report.
6. If a task needs more than about 15 files, split it and say so before editing.

## 2. Goal, scope and non-goals

**Goal.** Apex Arcade becomes a frontend-only arcade in which every one of the 50 games plays like a finished product (menu, modes, settings, customization, achievements, tutorial, results) and all of them feed one shared profile. The aim is the deepest and most cohesive no-server arcade, not the biggest catalog.

**In scope**

- The website shell: routing, Home, Browse, game pages, theater, profile, quests, collections, settings, PWA.
- The Game Frame: one shared contract for menu, settings, pause and results across all 50 games.
- The Arcade Universe: XP, Sparks, cosmetics, achievements, quests, streaks, local seasons, daily runs, mutators, ghosts, clips.
- The quality engine: smoke test, baselines, budgets, accessibility, save safety.

**Non-goals (do not build, do not propose)**

- Real-time online multiplayer, accounts, cloud saves, or server-verified leaderboards.
- Ads, analytics or tracking of any kind.
- New runtime dependencies. Dev dependencies need written owner approval.
- Languages other than English.
- Converting the games from iframe pages to ES modules (decision D3).
- Shipping AI features. The Gemini work (`W12` in `PRD.md`) stays approval-gated and is excluded from every task here.
- Ripped or copied third-party art, audio, names or characters. Many games are tributes; keep everything original.

## 3. Verified ground truth (read from the repository, 22 Oct 2026)

Project root: `C:\Users\Mahfujur Rahman\Apex-Arcade` (Windows). Write shell commands and scripts so they also work on Windows (no `rm -rf`; note that the existing `clean` script uses it).

### 3.1 Stack and scripts

- **Verified from `package.json`:** Vite `^8.3.0`, React `^19.0.1`, TypeScript `^7.0.2`, Tailwind `^4.3.3` (via `@tailwindcss/vite`), `motion` `^12`, `lucide-react`. The dependencies also list `express`, `dotenv` and `@google/genai`. The static site must not import them. Never read, print or edit `.env` or `.env.example`.
- **Playwright `^1.64.1` is already a devDependency.** The v1.0 decision D2 is therefore mostly settled; what remains is installing the browser binaries (`npx playwright install chromium`), which needs network access and the owner's go-ahead.
- **npm scripts that exist:** `dev` (`vite --port=3000 --host=0.0.0.0`), `build` (`vite build`), `preview`, `capture:ui-final`, `clean`, `lint` (this is `tsc --noEmit`, not ESLint), `check:theme`.
- **Scripts that exist but have no npm entry:** `scripts/contrast-check.mjs`. Run it with `node scripts/contrast-check.mjs`.
- **Does not exist yet:** any test script, any smoke test, any router, any service worker or web manifest (the last two are Not verified; check `public/` and `index.html` first).
- **Do not touch:** `.env*`, `tsconfig.json`, and the `server` block of `vite.config.ts` (it carries an AI Studio note about HMR and file watching). The config has an `@` alias to the project root.

### 3.2 The website shell (`src/`)

| Area | Verified facts |
| --- | --- |
| Page | `App.tsx` renders one scrolling page: `Navbar`, `LauncherHome`, `GameCatalog`, `TelemetryDashboard`, `AboutAnthology`, `ProfileHub`, `Footer`. There is no router. |
| Modals | `GameDossierModal` (z-60) and `PlayableTheaterModal` (z-70), both animated with `motion`. |
| Deep link | `#game=<id>` opens the theater (read on load and on `hashchange`). Closing the theater clears the hash. This MUST keep working after routing is added. |
| Theme | Key `apex-arcade-theme` holds `system`, `light` or `dark`. `<html data-theme>` and `color-scheme` are set; the `theme-color` meta is `#f2f1ed` (light) or `#08090e` (dark). |
| UI sounds | `src/services/audioSynthesizer.ts` (`audio`) plays hover, click, open and close sounds, and handles mute. |
| Game data | `src/data/gamesData.ts` exports `GAMES_DATA: GameInfo[]`. |
| Types | `src/types/game.ts` defines `GameInfo`, `PlayerStats`, `GameSessionScore`, `ApexEventType`, `ApexEventMessage`, `DifficultySetting`, `PlayableEngineId`. |
| Other services | `performanceHints.ts`, `scoreCard.ts` (share card). |
| UI primitives | `src/components/ui/`: `Button`, `Card`, `Chip`, `Input`, `ScreenBezel`. |

**`GameInfo` already has** `id`, `gameNumber` (1 to 50), `title`, `of`, `year`, `era`, `genre`, `category`, `developer`, `originalPlatform`, `tagline`, `description`, `keys`, `controlsSummary`, `accentColor`, `icon`, `difficulty`, `htmlPath`, and the optional `legacy`, `keyMechanics`, `playableEngineId`, `variant`, `previewType`, `players` (`1P`, `1-2P`, `1-4P`), `sessionMinutes`, `tags`, `modes`, `storyBlurb`, `levelCount`, `status` (`classic`, `enhanced`). The browse facets planned in v1.0 are therefore partly in the type already; they are not yet required or filled for all 50 games (Not verified: how many records fill them).

**Also exists and was missing from v1.0:** twelve React canvas "2.5D engines" in `src/components/engines/` (`CyberFlapEngine`, `HoloPongEngine`, `QuantumSnakeEngine`, `SpaceInvadersEngine`, `AsteroidsCoreEngine`, `IsoTetrisEngine`, `PrecisionPlatformerEngine`, `PacMazeEngine`, `SonicSpeedwayEngine`, `StreetBrawlerEngine`, `ChronoBattleEngine`, `ActionCombatEngine`), selected by `playableEngineId`. Decision: keep them as the optional 2.5D view of those games and add nothing to them (decision D7).

### 3.3 Player stats and storage keys

| Key | Owner | Contents |
| --- | --- | --- |
| `apex_arcade_stats_v1` and `apex_arcade_stats_v2` | `storageService.ts` | `PlayerStats`. Every save writes BOTH keys. v2 is read first; v1 is migrated if v2 is missing. |
| `apex-arcade-theme` | `App.tsx` | Theme preference. |
| `apex:save:<gameId>` | `save-kit.js` | Per-game schema v2 (see 5.4). |
| `arcade-hi-<cfg.id>` | `arcade-core.js` | Legacy high score. `save-kit` migrates it and deletes it, but `arcade-core` writes it again on every save. |
| `arcade-muted`, `apex:mute` | `arcade-core.js`, `save-kit.js` | Legacy mute flags. |

`storageService.ts` still seeds default stats with ids `flappy-bird`, `pong`, `snake`, `space-invaders`, `asteroids`, `tetris`, `super-mario-bros`, `celeste` and default favorites `celeste`, `tetris`, `flappy-bird`. Not verified: whether these match `GAMES_DATA` ids. Task `S0-1` settles it.

### 3.4 The theater and the event bridge

- `PlayableTheaterModal.tsx` loads `game.htmlPath` in an iframe (same origin) or an optional React 2.5D engine.
- **Host listener (fixed in this session, owner-reported, not re-run):** it accepts `APEX_EVENT` only when the iframe is mounted, `e.source` is the iframe's window and `e.origin` equals `window.location.origin`. It uses `game.id`, not the id in the message. It handles `session_start`, `score` (stores the best), `level_complete` (updates the displayed score only), `achievement` and `session_end`.
- Games can receive `SET_DIFFICULTY` (`{ difficulty }`) from the host and `?diff=easy|normal|hard` in the URL (`arcade-core.js`). `perf-kit.js` listens for `SET_PERF_TIER`, but the host never sends it.

### 3.5 The 50 games

- 50 single-file HTML pages in `public/assets/aistudio/`, numbered `01-...html` to `50-...html`, about 753,539 bytes in total (the inventory's figure).
- Families: `arcade-core.js` 25 games (01 to 20 and 37 to 41); `act-kit.js` 6 of them (13, 14, 15, 18, 19, 20); `platform-kit.js` 3 of them (08, 09, 10); `board-kit.js` 24 games (21 to 36 and 42 to 49); 1 standalone inline page (50 Mahjong).
- Game 49 (Table Tennis) is a 48.4 KB `board-kit` page with its own 3D arena.
- Every game also has a hashed duplicate ("twin") file, and a copy of a PRD sits inside the assets folder. Not verified: which pages or configs reference the twins.
- **Three id spaces exist and are not aligned.** `GameInfo.id` (host), the id passed to `Arcade.game({ id })` (for example game 01 uses `glowmoth`), and the `Save` key. Task `S0-0` produces the map.

### 3.6 Shared kits (`public/assets/aistudio/*.js`)

| Kit | Global | Verified public API |
| --- | --- | --- |
| `arcade-core.js` | `Arcade` | `Arcade.game(cfg)` returns `G`. `cfg`: `id`, `title`, `subtitle`, `w`, `h`, `color`, `controls`, `help`, `touchL`, `touchR`, `init`, `update`, `draw`, `onStart`, `hud`. `G`: `state` (`ready`, `playing`, `paused`, `over`, `won`), `score`, `hi`, `addScore`, `over`, `win`, `burst`, `ring`, `popup`, `shake`, `freeze`, `restart`, `begin`, `pauseToggle`. Also `Arcade.sfx(name)`, `tone`, `noise`, `difficulty`, `speedMult`, and test hooks `Arcade.test.press/release/tap/step`. Difficulty: easy 0.8x speed; hard 1.35x speed and 1.25x score. Auto-reports to `Apex` when `score-bridge.js` is loaded: `session_start` on first start and on restart, `score` at most once per second from `addScore`, `session_end` on `over` or `win`. |
| `save-kit.js` | `Save` | `load`, `get`, `update` (deep merge; arrays of primitives are unioned), `reset`, `getAll`, `exportAll`, `importAll`. Emits the `apex:save` window event. Falls back to memory when storage is blocked. |
| `score-bridge.js` | `Apex` | `report`, `startSession`, `sendScore`, `unlockAchievement`, `endSession`. Posts to the parent window with the page's own origin; ends an open session on `pagehide` if the score is above 0 or 5 seconds passed. |
| `perf-kit.js` | `Perf` | `tier`, `dpr`, `budget(n)`, `blur(n)`, `tick(dt)`; tiers with an automatic downgrade from a moving average of frame time; listens for `SET_PERF_TIER`. |
| `ui-kit.js` | `UI` | `toast`, `hint`, `dialogue.show/dismiss/draw`, `levelMap`, `title`, `pause`, `results`, `mountArcade(G, opts)`. `mountArcade` adds a transparent overlay canvas and draws title, pause and results screens. Its settings screen has four rows (music, SFX, reduced motion, colour mode) saved through `Save`; `S` opens settings while paused. |
| `fx-kit.js`, `music-kit.js`, `board-kit.js`, `act-kit.js`, `platform-kit.js` | `Fx`, `Music` (name Not verified), `Board`, and so on | Files exist. Public APIs Not verified here: read the file before using it. `board-kit` shows an on-screen error overlay (from the earlier session). |

The v1.0 "K7 board-art" kit was not found by a `*-kit.js` search; it may use another file name. Not verified.

### 3.7 Rollout status (from `docs/GAME_INVENTORY.md`, refreshed 2026-10-22)

- `perf-kit.js`: all 50 pages. `save-kit.js`: 3 pages. `score-bridge.js`: 9 pages. These counts may be out of date after this session's edits; task `S0-8` re-measures them.
- `?diff` and `SET_DIFFICULTY` are handled by `arcade-core` games (01 to 20, 37 to 41) and by game 49. Board games and Mahjong do not handle them. K8 is partial.

### 3.8 Defects (carried from v1.0, with current status)

| ID | Defect | Status |
| --- | --- | --- |
| D-1 | Light theme: hero title, subtitle, Recommended heading and Daily Challenge card use hard-coded pale classes (`text-white`, `text-cyan-300`, `text-slate-400`, `text-amber-*`) in `LauncherHome.tsx`. | Fixed in S0-2; verified in both themes. |
| D-2 | Hero stage and card preview canvases appear blank in full-page captures when scenes have not rendered. | Fixed in S0-3/S0-5: hero scene loading is explicit, and capture scrolls through the page to trigger catalog preview observers. Verified via rendered-canvas checks and full-page captures in both themes at all five S0-5 widths. |
| D-3 | Dossier shows an empty Cultural Legacy box; only 20 of 50 games have `legacy` text. | Fixed in S0-4; verified all 50 dossiers (20 populated panels, 30 omitted). Missing legacy copy remains for S0-9. |
| D-4 | Light accents make difficulty badges and buttons pale or blank (Chess, Go, Lumen Sprite). | Fixed in S0-2; verified in both themes. |
| D-5 | Mobile full-page captures (360, 390 px) stop mid-catalog; mobile Telemetry, About, Profile and Footer unverified. | Fixed in S0-5: full-page captures at 360 and 390 px include all seven sections; the capture script asserts their presence after scrolling. |
| D-6 | Small layout issues: 360 px carousel dots wrap, Telemetry row alignment, 768 px footer wrap, orphan filter select. | Fixed in S0-5: carousel controls stay grouped at 360 px; Telemetry metric rows align at 768 px; footer labels fit on one row at 768 px; filters form 3+2 rows at 768 px. Verified in Playwright. |
| D-7 | Uneven reporting: few games save progress or send score events. | Partly fixed: `arcade-core` now auto-reports, but only pages that load `score-bridge.js` send anything |
| D-8 | No baseline screenshots and no automated per-game smoke test. | Partly fixed in S0-5/S0-6: ten full-page baselines exist under `docs/baseline/`, and `npm run test:smoke` now writes a 50-game report. The report lists current launch, reporting, board input, and pause gaps; see `docs/SMOKE_REPORT.md`. |
| D-9 | Hashed twin files duplicate every game and kit. | Fixed in S0-7: removed all 57 unreferenced hashed twins and moved the public PRD copy into `docs/archive/`; the canonical pages and kits remain. |
| D-10 | K8 difficulty applied unevenly; `board-kit` games have no save or score hooks. | Open |
| D-11 | Host listener accepted any sender when the iframe was absent, had no origin check and trusted the message's game id. | Re-verified in S0-6: a same-origin sibling window's score message left stored player stats unchanged. |
| D-12 | Game 01 reported under `flappy-bird` but saves under `glowmoth`, so legacy high scores never migrated. | Fixed for game 01 only; the other games need `S0-0` |

## 4. CrazyGames benchmark and what we take from it

**Checked:** the crazygames.com homepage text and the public developer docs for leaderboards, both read on 22 Oct 2026. **Not checked:** visual design, animations, the in-game player, the ad flow, account screens and the mobile app, because the fetch returned text only. Do not copy any visual or text from the site; take ideas only.

| Observed (source) | Our decision |
| --- | --- |
| Over 4,500 games, founded 2014, more than 60 million monthly users (homepage). | Do not compete on catalog size. Compete on depth per game and a shared profile. |
| Shelves named by mood: "Can't stop playing", "Train your brain", "Adrenaline rush", "With friends", "5-minute fun", "Timeless classics", "Just relax", "Deep progress" (homepage). | Build data-driven mood shelves (SH-2) with our own names, driven by `moods` and `tags`. |
| Top-level lists: Recently played, New, Hot, Updated, Originals, Multiplayer, Leaderboards (homepage). | Add Recently played, New and updated, and a local Originals shelf for our own game concepts. No Multiplayer shelf; use "Local two-player". |
| A Preferences page, installable Android and iOS apps, a kids site and four languages (homepage). | Add a Settings page (SH-9) and a PWA (SH-8). Skip the kids site and extra languages (non-goals). |
| Weekly leaderboard seasons that reset every Monday, ranks by world, country and friends, and trophies for places 1 to 3 and the top 1%, 5% and 10% (developer docs). One docs page gives the reset time as 7 AM UTC and another as 9 AM UTC. | Build local weekly seasons (UV-9): the week ends Monday 00:00 in the player's local time zone. Trophies are earned against fixed per-game score targets, not against other players. Scores are shareable as codes and are always labelled device-local. |
| Only invited games get leaderboards; scores sent from the client can be manipulated (developer docs). | We state the same limit honestly: local scores can be edited. Never use words such as "verified" or "global" for our boards. |

**What we cannot match without a backend:** real-time multiplayer, accounts and cloud saves, verified global boards, friends lists and traffic-driven discovery. Do not try to fake these.

**Where we aim to be ahead:** per-game depth (every game has a menu, modes, settings, customization, achievements and a tutorial), one shared progression universe, replay hooks that need no server (daily seeded runs, mutators, boss rush, ghost codes, clips), no ads and no tracking, offline play, and a stated accessibility and performance bar.

## 5. Contracts (the exact shapes Codex must implement)

Add new fields and functions beside the existing ones. Never rename or remove a public name listed in section 3 without owner approval.

### 5.1 Routes (hash routing, no new dependency)

| Route | Page | Notes |
| --- | --- | --- |
| `#/` | Home | Rails from SH-2. |
| `#/browse?mode=&len=&players=&input=&tag=&mood=&q=` | Browse | Query values are optional; unknown keys are ignored. |
| `#/game/:id` | Game page | `:id` is `GameInfo.id`. Unknown id shows a not-found state with a link home. |
| `#/play/:id?mode=&diff=` | Theater | Replaces `#game=<id>`. |
| `#/profile`, `#/quests`, `#/collections/:slug?`, `#/settings` | Pages | |
| `#game=<id>` (old) | Redirect | Keep working: rewrite with `replaceState` to `#/play/<id>`. |

Back and forward MUST work. Closing the theater returns to the previous route, or to `#/` if the player arrived by deep link. The theme preference MUST survive navigation. Keep the in-page `scrollIntoView` anchors working until the pages replace them.

### 5.2 `GameInfo` additions (`src/types/game.ts`)

All new fields are optional in S0, then required for all 50 records by the end of S1.

| Field | Type | Meaning |
| --- | --- | --- |
| `tier` | `'S' \| 'A' \| 'B'` | Depth tier (section 7). |
| `family` | `'arcade-core' \| 'act' \| 'platform' \| 'board' \| 'standalone'` | Which kit family the page uses. |
| `cfgId` | `string` | The id the page passes to `Arcade.game` or `Board` and to `Save`. Comes from `S0-0`. |
| `inputs` | `('keyboard' \| 'touch' \| 'gamepad' \| 'mouse')[]` | Input methods that are actually playable. |
| `twoPlayer` | `'none' \| 'hotseat' \| 'bot' \| 'both'` | Local two-player support. |
| `moods` | `string[]` | Mood shelf ids: `quick-5`, `adrenaline`, `brain`, `relax`, `classic`, `two-player`, `deep`. |
| `legacy` | `string` | MUST be non-empty for all 50 (D-3). Original text, at most two sentences. |

Existing fields `players`, `sessionMinutes`, `tags`, `modes`, `levelCount` and `status` MUST be filled for all 50 games before the Browse facets (SH-3) ship.

### 5.3 `APEX_EVENT` v2 (iframe to host)

v1 messages (no `v` field) MUST keep working. Send with `window.parent.postMessage(payload, window.location.origin)`; `score-bridge.js` already uses the page's own origin.

```json
{
  "type": "APEX_EVENT",
  "v": 2,
  "gameId": "glowmoth",
  "eventType": "session_start | score | level_complete | achievement | session_end | mode_start | result | cosmetic_equip",
  "mode": "classic",
  "difficulty": "easy | normal | hard",
  "seed": 20261022,
  "score": 37,
  "level": 3,
  "durationSec": 94,
  "achievementId": "gold-medal",
  "cosmetic": { "slot": "skin", "id": "ember" },
  "result": { "win": false, "score": 37, "best": 52, "stats": {} },
  "timestamp": 1761120000000
}
```

Host rules (all MUST):

- Accept only when the iframe is mounted, `e.source` is its `contentWindow` and `e.origin` equals the site origin.
- Use the theater's own `game.id`; treat the message's `gameId` as informational.
- Check types and clamp: `score` is a finite number from 0 to 1e9; `durationSec` from 0 to 86,400; `level` an integer from 0 to 100,000; ids are strings of at most 64 characters. Drop anything else without throwing.
- Ignore more than 20 events per second from one game.
- The host computes XP and Sparks (5.5). The game never sends them.

### 5.4 Per-game save, schema v3 (`save-kit.js`)

Key `apex:save:<cfgId>`. v2 fields stay as they are. v3 adds the fields marked new.

```json
{
  "v": 3,
  "level": 1,
  "stars": {},
  "unlocks": [],
  "achievements": [],
  "settings": {
    "musicVol": 0.8, "sfxVol": 0.8, "reduceMotion": false, "colorblind": "none",
    "difficulty": "normal", "particles": "standard", "shake": 1,
    "textScale": 1, "assist": {}, "bindings": {}
  },
  "stats": { "plays": 0, "bestScore": 0, "secondsPlayed": 0 },
  "modes": { "classic": { "best": 0, "plays": 0 } },
  "cosmetics": { "owned": [], "equipped": {} },
  "daily": { "day": "", "best": 0 },
  "history": []
}
```

New in v3: `settings.difficulty`, `settings.particles` (`lite`, `standard`, `ultra`), `settings.shake` (0 to 1), `settings.textScale` (1, 1.25 or 1.5), `settings.assist`, `settings.bindings`, `modes`, `cosmetics`, `daily`, `history` (board games: last 20 matches).

Migration rules (all MUST, each covered by a test in `S1-3`):

1. Before changing a v2 record, copy the raw string to `apex:save:<cfgId>:backup-v2` once.
2. A v2 record loads with every v3 default filled and `v` set to 3; no existing value changes.
3. A record that fails to parse falls back to defaults, and the raw text is kept under `apex:save:<cfgId>:corrupt` so it can be exported.
4. `Save.exportAll` and `Save.importAll` keep working with v2 and v3 files.
5. If storage is blocked or full, keep working in memory and never throw.

### 5.5 Shared meta store and economy (`meta-kit.js` and `src/services/metaService.ts`)

One key, `apex:meta`, written only through the `Meta` global (new kit `meta-kit.js`) and read by a TypeScript service that follows the same schema. The host re-reads on the `storage` event. All numbers below are starting values; keep them in ONE constants file and tune after the pilots.

```json
{
  "v": 1,
  "xp": 0, "level": 1, "sparks": 0,
  "streak": { "count": 0, "lastDay": "", "freezes": 0 },
  "daily": { "day": "", "seed": 0, "games": [], "done": [] },
  "quests": { "day": [], "week": [] },
  "seasons": { "2026-W43": { "glowmoth:classic": { "best": 0, "trophy": "" } } },
  "trophies": []
}
```

- **Session XP:** 10, plus 1 per 12 seconds played (maximum 50), plus 5 for a new personal best. Achievements: 25 (common), 50 (rare), 100 (epic), 250 (legendary). Daily Gauntlet complete: 150. Daily quest: 40. Weekly quest: 120.
- **Sparks:** one quarter of the session XP, rounded down. Achievements: 10, 25, 50, 100 by rarity. Daily Gauntlet complete: 60.
- **Level:** going from level n to n+1 costs 100 + 40 x (n - 1) XP.
- **Cosmetic prices:** common 100, rare 250, epic 600 Sparks. Some are unlocked by an achievement instead of Sparks.
- **Streak:** plays on consecutive local calendar days add 1; a missed day resets to 0 unless a freeze is available. One freeze is earned for every 7 days of streak (maximum 2 held).
- **Daily seed:** `hash(YYYY-MM-DD in local time + gameId)`. The Daily Gauntlet is three games picked deterministically from the Tier S and A games that support seeds.
- **Season:** the week id is the ISO week in local time and ends Monday 00:00 local. Each game config lists three `seasonTargets` (bronze, silver, gold scores per mode).
- **Score code:** base64url of `{gameId, mode, score, seed, day, check}`, where `check` is a short checksum for typo detection only. It is not a security feature and the UI MUST NOT call it verified.

### 5.6 `UI.mountGame` config (`ui-kit.js`)

`UI.mountGame(G, config)` is the single mount point. It wraps the current `UI.mountArcade`, which MUST keep working unchanged. Board-kit games use the same config.

```js
UI.mountGame(G, {
  id: 'glowmoth', title: 'Glowmoth Gauntlet', subtitle: '', accent: '#67e8f9',
  modes: [{ id: 'classic', name: 'Classic', blurb: '', seeded: true,
            unlock: null /* { level } | { achievement } | { sparks } */,
            seasonTargets: [10, 25, 50] }],
  settings: [{ key: 'shake', label: 'Screen shake', type: 'slider', min: 0, max: 1, step: 0.1, default: 1 }],
  cosmetics: [{ id: 'ember', slot: 'skin', name: 'Ember', rarity: 'common', cost: 100, unlock: null }],
  achievements: [{ id: 'bronze-medal', name: 'Bronze', desc: 'Score 10', rarity: 'common', hidden: false }],
  tutorial: { type: 'guided', steps: [{ text: '', hold: 'Space' }] },
  hooks: { onPause() {}, onResume() {}, applyCosmetic(slot, id) {},
           applySetting(key, value) {}, getResult() { return { win: false, score: 0, stats: {} }; } }
});
```

Flow: **Boot, Main Menu, Mode select, Play, Pause, Results, back to the menu.** A game supplies only `init`, `update`, `draw` and the hooks above.

### 5.7 Script load order for every game page

`perf-kit.js`, `save-kit.js`, `meta-kit.js`, the family core (`arcade-core.js` or `board-kit.js`), the family kit if any (`act-kit.js`, `platform-kit.js`), `score-bridge.js`, `ui-kit.js`, then optional `fx-kit.js` and `music-kit.js`, then the game's inline script. Game 50 (Mahjong) loads the same shared kits and keeps its inline logic.

## 6. Requirements

Each requirement has an ID, a statement and a test. A task is done only when every requirement it cites passes its test.

### 6.1 Shell (`SH-`)

| ID | Requirement | Test |
| --- | --- | --- |
| SH-1 | Hash router with the routes in 5.1, including the old `#game=<id>` redirect. | Deep link to each route loads it; back and forward work; theme survives; `#game=<id>` lands on `#/play/<id>`. |
| SH-2 | Home shows data-driven rails: Continue, Daily Gauntlet, Recently played, New and updated, Quick 5-minute games (`sessionMinutes` of 5 or less), Local two-player (`twoPlayer` not `none`), Because you played (shares tags with the last 5 sessions), Boss Rush playlists, mood shelves (`moods`), and editorial collections (Retro tributes, Brain games, Board night). | Each rail renders from data with no hard-coded game ids; an empty rail is hidden, never shown blank. |
| SH-3 | Browse has facets for mode, session length, players, input and tag, plus search with suggestions. | Every facet combination returns a count; query string round-trips on reload. |
| SH-4 | Game page shows a live preview, modes, a controls diagram, achievement preview, the player's stats, related games and a share action. | Works for all 50 ids with no empty box (D-3). |
| SH-5 | Theater: fullscreen, a pause overlay, display modes (CRT filter, pixel-perfect scaling, ambient glow), per-game touch controls instead of a generic pad, and gamepad menu navigation. The theater is always dark. | Each display mode toggles live and persists; touch layout comes from the game's config. |
| SH-6 | Hero and card previews render real content at 360, 768, 1280 and 1440 px (D-2). | Baseline captures show non-blank previews at all four widths. |
| SH-7 | One motion system: duration tokens (fast 120 ms, base 220 ms, slow 420 ms), shared easing, page transitions no longer than 240 ms, card tilt at most 6 degrees. | `prefers-reduced-motion` and the in-game setting remove all non-essential motion. |
| SH-8 | Installable PWA with offline play: a web manifest and a hand-written `public/sw.js` that precaches the shell and the 50 games and kits. No new dependency. | After one online visit, airplane-mode reload opens Home and plays any game; an update prompt appears when files change. |
| SH-9 | Settings page: theme, default volumes, reduced motion, colour-blind palette, default particle level, display modes, export, import and reset. | Values apply to games that have no stored per-game override. |
| SH-10 | Both themes pass contrast: 4.5:1 for body text, 3:1 for large text and UI parts (D-1, D-4, D-6). | `npm run check:theme` and `node scripts/contrast-check.mjs` pass. |

### 6.2 Game Frame (`GF-`)

| ID | Requirement | Test |
| --- | --- | --- |
| GF-1 | Flow: Boot, Main Menu, Mode select, Play, Pause, Results, back. Boot never takes longer than 2 seconds to reach the menu on a mid-range laptop. | Smoke test reaches Menu in 2 s. |
| GF-2 | Main menu items: Play or Continue, Modes, Customize, Settings, How to play, Achievements, Stats, Back to site. | All eight are reachable by keyboard, touch and gamepad. |
| GF-3 | Per-game settings with global defaults: music and SFX volume, reduced motion, colour-blind palette (`protan`, `deutan`, `tritan`), key and gamepad remap, difficulty (`easy`, `normal`, `hard`), screen shake (0 to 100%), particle level (`lite`, `standard`, `ultra`, mapped to `Perf` tiers), assist options, text size (100, 125, 150%). | Each setting saves to `Save` and applies live through `applySetting`. |
| GF-4 | Customization with cosmetics from one registry: at least 3 for Tier B, 8 for Tier A, 15 for Tier S. Slots: skin, palette, trail, theme. | Unlock by Sparks or achievement works; equipped item persists. |
| GF-5 | Pause screen: Resume, Restart, Settings, Quit to menu. Opening the pause never loses a run. | Pause and resume keep exact game state. |
| GF-6 | Results screen: score, best, XP and Sparks earned, new achievements, a share card or clip, and a next suggestion. | Appears on both win and loss; values equal the stored totals. |
| GF-7 | Tutorial by tier: text and visuals (B), guided (A), interactive (S), replayable from the menu. | Skippable; completion saved. |
| GF-8 | Achievements: 5 (B), 8 (A), 10 (S), each with a rarity (common, rare, epic, legendary). | Each unlock fires one `achievement` event and one toast, once. |
| GF-9 | Controls are visible in the game before and during play, for keyboard and touch. | Controls panel matches the real bindings, including remaps. |
| GF-10 | Keyboard and gamepad operate every menu with a visible focus ring. | No mouse-only control exists. |
| GF-11 | Difficulty must change gameplay, not only AI think time (defect D5 (not D-5 above) in `PRD.md`). Define in the game's config what easy, normal and hard change. | Documented per game in the inventory (K8). |
| GF-12 | Board and card games add: hotseat, a bot at three strengths, undo, hints, and match history (last 20). | Each is reachable from the menu; undo restores exact state. |

### 6.3 Arcade Universe (`UV-`)

| ID | Requirement | Test |
| --- | --- | --- |
| UV-1 | Profile level and XP, using the formulas in 5.5. | Playing one session raises XP by the computed amount. |
| UV-2 | Sparks currency and a cross-game cosmetics registry in `Meta`. | Buying a cosmetic reduces Sparks once and survives reload. |
| UV-3 | Achievement wall across all games, filterable by game and rarity. | Counts match stored achievements. |
| UV-4 | Quests: 3 daily and 2 weekly, generated from templates (for example "play 3 different games", "score 500 in any arcade game"). | Quests reset at local midnight (daily) and Monday 00:00 (weekly). |
| UV-5 | Streaks per 5.5, with freezes. | Date-mocked tests cover a missed day, a freeze, and a time-zone change. |
| UV-6 | Daily Gauntlet: three games with the same seed for the day; completing all three pays the bonus once. | Same seed gives the same layout or sequence for the same day. |
| UV-7 | Mutators (low gravity, double speed, tiny hitbox, mirror, and similar), only where the kit can apply them; each game lists the ones it supports. | A mutator is shown on the Results screen and multiplies score by a documented factor. |
| UV-8 | Boss Rush playlists: a fixed sequence of boss or finale segments from several games. | Progress is saved between games. |
| UV-9 | Local weekly seasons and trophies (5.5), with device-local top-10 boards per mode, labelled device-local. | Week rollover is tested with a mocked clock. |
| UV-10 | Ghost and replay codes: record inputs for seeded runs as `{ gameId, seed, mode, inputs: [[frame, code, down]], score }` under 200 KB; replay re-creates the run. Needs deterministic engines. | A recorded run replays to the same score in the smoke test. |
| UV-11 | Clip capture: `canvas.captureStream(30)` with `MediaRecorder`, 10 seconds at most. If Safari cannot record, fall back to a screenshot card. | Clip saves or downloads on Chrome and Firefox; the fallback is shown on Safari. |
| UV-12 | Profile export and import include every `apex:save:*` key and `apex:meta` as well as `PlayerStats`. | Export, reset and import restore identical data. |

### 6.4 Quality (`QA-`)

| ID | Requirement | Test |
| --- | --- | --- |
| QA-1 | A Playwright smoke test (`npm run test:smoke`) visits all 50 games at 1280x720 and at 390x844 with touch. For each game it checks: no console error or page error; the canvas or board root appears within 2 s; the menu is visible; Start works; `session_start` reaches the host within 3 s; scripted input produces a `score` event or a move; pause and resume work; the game still runs after a `SET_PERF_TIER` of `lite`. It writes a pass or fail table to `docs/SMOKE_REPORT.md`. | The table lists 50 rows; any failure names the game and the check. |
| QA-2 | Performance budgets are measured first, then written to `docs/PERF_BUDGET.md`: 60 fps target on Standard, 30 fps floor on Lite, interactive within about 2 s, site JavaScript size, and a size cap per kit. | Numbers exist before any budget is enforced. |
| QA-3 | Accessibility: menus fully keyboard and gamepad operable, visible focus, remapping, reduced motion, colour-blind palettes. Canvas gameplay has limits for screen readers; each game documents its limits. | Checklist per game in the inventory. |
| QA-4 | Save safety per 5.4: versioned schema, backup, corruption fallback, tests. | `S1-3` tests pass. |
| QA-5 | Browsers: Chrome, Firefox, Safari, Android Chrome, iOS Safari. | Manual pass on a real phone for Lite tier; record device and result. |

## 7. Depth tiers and the proposed assignment of all 50 games

The owner approves the assignment (decision D1). Until then, use the proposal below. The proposal puts the games with the most mechanical depth, the most content to unlock or the strongest replay value in Tier S, and keeps the three pilot games (01, 30, 42) on the S2 gate regardless of tier.

### 7.1 What each tier must have

| Capability | Tier S (8 games) | Tier A (20 games) | Tier B (22 games) |
| --- | --- | --- | --- |
| Game Frame (menu, settings, pause, results) | Yes | Yes | Yes |
| Modes | 4 or more, including a campaign | 3 | 2 |
| Cosmetics | 15 | 8 | 3 |
| Achievements | 10 | 8 | 5 |
| Tutorial | Interactive | Guided | Text and visuals |
| Daily seed and mutators | Yes | Yes | Daily seed only |
| Ghost or replay | Yes | Optional | No |
| Dynamic music and bespoke touch controls | Yes | Yes | Shared defaults |
| Local weekly season targets | Yes | Yes | Yes |

### 7.2 Proposed assignment (confirm or change under D1)

| Tier | Games (number and title) |
| --- | --- |
| S | 01 Glowmoth Gauntlet, 05 Prism Stack, 06 Glow Beetle, 07 Starfall Rift, 12 Clockwork Dawn, 16 Skyfall Ridge, 21 Chess, 49 Table Tennis |
| A | 02 Ion Rally, 03 Ember Serpent, 04 Hivefall Defense, 08 Fox Courier, 09 Cloudhop Pip, 10 Rollo Rush, 11 Iron Circuit, 13 Lanternbound, 14 Deepcore Drifter, 15 Hollowbell, 17 Stormcap Showdown, 18 Ashen Descent, 19 Lumen Sprite, 20 Glimmer Gadabout, 25 Tycoon Town, 37 8-Ball Pool, 40 Mini Golf, 43 Sudoku, 44 Minefield, 50 Mahjong Solitaire |
| B | 22 Snakes & Ladders, 23 Ludo, 24 Carrom, 26 Checkers, 27 Connect Four, 28 Mancala, 29 Reversi, 30 Tic-Tac-Toe, 31 Backgammon, 32 Dots & Boxes, 33 Go 9x9, 34 Solitaire, 35 Memory Match, 36 Maths Dash, 38 Bowling, 39 Basketball Hoops, 41 Soccer Pool, 42 Merge 2048, 45 Slide Tiles, 46 Nuts & Bolts, 47 Bubble Sort, 48 Orchard Drop |

Counts: 8 + 20 + 22 = 50. Every number from 01 to 50 appears exactly once. Titles are the ones in `docs/GAME_INVENTORY.md`.

### 7.3 Per-game rules

- The tier is stored in `GameInfo.tier` and in the game's `UI.mountGame` config.
- A game may be promoted one tier by the owner after its pilot play-through; never demote without the owner's say.
- Pilot games (01, 30, 42) get a design brief from their bible in `docs/game-bibles/` before any code. Every other game needs a short bible of the same shape (goal, modes, settings, cosmetics, achievements, tutorial, difficulty meaning) before its rollout task starts.
- Rollout order: `arcade-core`, act and platform games first (about 8 per sprint), then board-kit games and Mahjong. Do not start any rollout before the S2 gate is approved.

## 8. Plan and task backlog

### 8.1 Sprints (ordering, not a calendar)

| Sprint | Goal | Main outputs |
| --- | --- | --- |
| S0 | Stabilise | Clear D-1 to D-10, id map, smoke test, baseline captures, kit rollout 50 of 50, twins removed. |
| S1 | Foundations | Router, `UI.mountGame`, Save v3, `meta-kit`, `APEX_EVENT` v2. |
| S2 | Prototype gate | Game Frame on pilots 01, 30 and 42; owner review; freeze `docs/STYLE_GUIDE.md` and the per-game Definition of Done. |
| S3 | Shell v2 | Home, Browse, Game page, Profile, Quests, PWA, live hero previews. |
| S4 to S6 | Rollout A | `arcade-core`, act and platform games, about 8 per sprint. |
| S7 to S9 | Rollout B | `board-kit` games and Mahjong, about 8 per sprint. |
| S10 | Universe | Mutators, Boss Rush, Daily Gauntlet, ghost codes, clip capture, seasons. |
| S11 | Hardening | Performance, accessibility, cross-browser, release candidate. |

Two-week sprints, a demo build and an owner review checklist at the end of each. A sprint is complete only when its demo build passes section 9.

### 8.2 Sprint 0 tasks

**S0-0 Id map.** Read `src/data/gamesData.ts` and the head of every game page. Create `docs/ID_MAP.md` with 50 rows: number, `GameInfo.id`, `htmlPath`, the id passed to `Arcade.game` or `Board`, the id used with `Save`, family. Flag every row where the ids differ. Change no code. *Done when:* 50 rows, mismatches listed, the hashed twin of each page named. *Verify:* row count; spot-check five games.

**S0-1 Stats ids.** Read `storageService.ts` and `ID_MAP.md`. Make the default stats and favorites use real `GameInfo` ids, keep the v1 to v2 migration and keep writing both keys. *Done when:* defaults match `GAMES_DATA`; an existing saved profile loads unchanged. *Verify:* `npm run lint`, `npm run build`, load with a v1-only and a v2-only profile.

**S0-2 Light-theme text (D-1, D-4).** Read `LauncherHome.tsx`, `docs/UI_STYLE_GUIDE.md`, `docs/LIGHT_UI_PRD.md`. Replace the hard-coded `text-white`, `text-cyan-300`, `text-slate-400` and `text-amber-*` classes with theme tokens; search all of `src/components` for the same classes; fix pale difficulty badges and buttons (Chess, Go, Lumen Sprite). *Done when:* hero, Recommended and Daily Challenge are readable in light and dark. *Verify:* `npm run check:theme`, `node scripts/contrast-check.mjs`, captures in both themes.

**S0-3 Blank previews (D-2).** Read `InteractiveLivePreview.tsx`, `CardScenePreview.tsx`, `GameCard3D.tsx`, `LauncherHome.tsx`. Find out whether previews are blank because of timing in the capture script or a real bug (for example a canvas size of 0 before layout). Report the cause first, then fix. *Done when:* previews render at 360, 768, 1280 and 1440 px. *Verify:* captures at all four widths.

**S0-4 Empty legacy box (D-3).** Read `GameDossierModal.tsx`. Hide the Cultural Legacy block when `legacy` is empty. *Done when:* no empty box in any of the 50 dossiers. The 30 missing texts are written in `S0-9`.

**S0-5 Capture script (D-5, D-8, D-6).** Read `scripts/capture-ui-final.mjs`. Rebuild it to capture complete pages at 360, 390, 768, 1280 and 1440 px in light and dark, waiting for fonts and canvases. Save baselines under `docs/baseline/`. Fix the D-6 layout issues it exposes in the same task only if they take 3 files or fewer. *Done when:* every section appears at 360 and 390 px. *Verify:* run `npm run capture:ui-final`.

**S0-6 Smoke test (QA-1).** Add `scripts/smoke.mjs`, the npm script `test:smoke`, and the report `docs/SMOKE_REPORT.md`. Use Playwright against `vite preview`. The owner installs the browser first with `npx playwright install chromium`. Re-verify the host listener fix (D-11): a message from another window MUST be ignored. *Done when:* a 50-row table is produced; failures are listed, not hidden. *Verify:* run it twice; results match.

**S0-6 verification record (2026-10-22).** The smoke runner, npm command, and 50-row report are present. Two consecutive complete runs produced the same pass/fail check outcomes for all 100 game/viewport cases, and D-11 passed. The report correctly remains non-green: mobile Play activation is intercepted across all 50 games, while several games lack `session_start`, board input coverage, or pause/resume controls. The output-file checksums differed despite matching pass/fail outcomes, so only outcome repeatability is verified. See `docs/SMOKE_REPORT.md` and `docs/UI_QA.md`.

**S0-7 Twins and stray copies (D-9).** Identify the naming pattern of the hashed twins. Search `src/`, `index.html`, `vite.config.ts`, `docs/` and every game for references to them. Report the result before deleting. Also move PRD copies out of `public/assets/aistudio/`, because everything in `public/` is served to visitors. Delete in one commit. *Done when:* build passes and the smoke test is green.

**S0-7 verification record (2026-10-22).** Found 57 hashed twins named with an eight-character hexadecimal suffix and one hashed PRD copy. No runtime references to the twins were found in `src/`, `index.html`, `vite.config.ts`, or canonical game pages. `docs/ID_MAP.md` was the live filename inventory and is updated; the archived PRD retains historical filename examples only. Two paired kit files were byte-identical; the other twins contained older or divergent page/kit copies but were unreferenced. The PRD copy was byte-identical to root `PRD.md` and is preserved in `docs/archive/`. Canonical routes remain the game pages referenced by `src/data/gamesData.ts`. Build verification passes; `npm run test:smoke` still reports pre-existing failures listed in `docs/SMOKE_REPORT.md`, so the PRD's smoke-green completion criterion is unmet pending those fixes.

**S0-8 Kit rollout to 50 of 50 (D-7, D-10).** Use the load order in 5.7. For `arcade-core` pages add `score-bridge.js` (and `save-kit.js` where missing). For `board-kit`, add the hooks inside `board-kit.js` once, so all 24 games report `session_start` on the first move, `score` on a result, and `session_end` on game over or exit. Add inline reports to game 50. Re-measure and update the counts in `docs/GAME_INVENTORY.md`. *Done when:* the inventory shows 50 of 50 for `perf-kit`, `save-kit` and `score-bridge`. *Verify:* smoke test.

**S0-9 Finish K8 and the legacy texts.** Define `Board.level` (1 easy, 2 normal, 3 hard) and make board games read `?diff=` and `SET_DIFFICULTY`. For each game, write one line in the inventory saying what easy, normal and hard change (GF-11). Write the 30 missing `legacy` texts: original wording, at most two sentences, no copied text. *Done when:* every game has the line and a `legacy` text.

### 8.3 Sprint 1 tasks

**S1-1 Router and pages (SH-1).** Add `src/router.ts` (hash parsing, no dependency) and move the sections of `App.tsx` into pages. Keep both modals, the theme logic and the `#game=` redirect. *Verify:* deep link every route; back and forward.

**S1-2 `UI.mountGame` (GF-1 to GF-10).** Add the function in `ui-kit.js` with the config in 5.6, wrapping `mountArcade`. Pilot on game 01 with gameplay unchanged. *Verify:* menu, settings, pause and results work by keyboard, touch and gamepad.

**S1-3 Save v3 and tests (QA-4).** Implement 5.4 in `save-kit.js` and add `scripts/test-save.mjs`, a Node script with a fake `localStorage`, covering all five migration rules. *Verify:* the script exits 0.

**S1-4 Meta kit (UV-1, UV-2, UV-4, UV-5).** Create `meta-kit.js`, `src/services/metaService.ts` and one constants file for the numbers in 5.5. *Verify:* Profile shows live XP and Sparks after a played session; a date-mocked streak test passes.

**S1-5 `APEX_EVENT` v2.** Update `score-bridge.js`, `PlayableTheaterModal.tsx` and `src/types/game.ts` per 5.3, keeping v1 events valid. *Verify:* old and new messages are stored correctly; bad payloads are dropped.

**S1-6 Cosmetics registry (GF-4, UV-2).** Put the registry in `meta-kit.js` (this replaces the v1.0 plan to keep it in `save-kit`); `save-kit` only stores what a game owns and equips. *Verify:* buy, equip and reload on game 01.

### 8.4 Sprint 2 tasks (the gate)

**S2-1, S2-2, S2-3** Apply the Game Frame to game 01 (Tier S), 30 Tic-Tac-Toe and 42 Merge 2048, each from its bible in `docs/game-bibles/`. **S2-4** Write `docs/STYLE_GUIDE.md` and the per-game Definition of Done from what the pilots taught. **S2-5** Owner plays each pilot for five minutes and signs off. Rollout sprints do not start before this.

## 9. Verification, Definition of Done and rules for Codex

### 9.1 Commands

| Command | What it proves | Note |
| --- | --- | --- |
| `npm run lint` | TypeScript compiles (`tsc --noEmit`). | It does not lint JavaScript in the games. |
| `npm run build` | The site builds with Vite. | Run it after every task. |
| `npm run check:theme` | Theme checks in `scripts/check-theme.mjs`. | Run for any UI task. |
| `node scripts/contrast-check.mjs` | Contrast ratios. | No npm entry yet; add `check:contrast` in `S0-2` if the owner agrees. |
| `npm run capture:ui-final` | Screenshots of the site. | Becomes the baseline tool in `S0-5`. |
| `npm run test:smoke` | All 50 games load, start and report. | Added in `S0-6`. |
| `node scripts/test-save.mjs` | Save migration rules. | Added in `S1-3`. |
| `npm run dev` | Local server on port 3000. | Host `0.0.0.0`. |

Codex cannot see a browser. A claim that something "looks right" is Not verified unless a script or a capture proved it.

### 9.2 Definitions

**Ready:** goal, files, acceptance criteria and test steps are written, and no owner decision is open.

**Done (any task):** the acceptance criteria are met; `npm run lint` and `npm run build` pass; no new console errors; both themes checked for UI work; docs and the inventory updated; the report separates Verified from Not verified.

**Done (one game), all of these:**

1. The Game Frame checklist for its tier passes (GF-1 to GF-12 as they apply).
2. The kit load order in 5.7 is followed, with no kit copied into the page.
3. The ids match `docs/ID_MAP.md`.
4. `session_start`, `score`, `achievement` and `session_end` reach the host and are stored under the right `GameInfo.id`.
5. Settings, cosmetics and best scores persist after a reload.
6. Tier counts are met (modes, cosmetics, achievements, tutorial).
7. Easy, normal and hard change gameplay, and the inventory line says how.
8. Controls are visible in the game; keyboard and touch are both playable; menus work with a gamepad.
9. Lite tier runs at 30 fps or better on a real phone, recorded with device name.
10. Reduced motion and the colour-blind palettes work.
11. The smoke test is green for this game.
12. The owner played it for five minutes and found a menu, settings, an unlock and a reason to return.

### 9.3 Rules for Codex

1. One task ID per session, then stop. Ask at most three short questions; otherwise state one assumption and continue.
2. Read every file in full before editing it. Never edit from memory or from this document's summary of a file.
3. Keep every public API in section 3 working. Add new functions beside old ones.
4. No new runtime dependency. Dev dependencies need the owner's written approval. Hand-write the service worker and router.
5. Do not read, print or change `.env*`; do not change `tsconfig.json` or the `server` block of `vite.config.ts`.
6. Never claim something works unless you ran it. Say exactly what you ran.
7. Keep original art, names and audio. Never paste third-party assets, code or text.
8. Files in the games folder are plain browser JavaScript (no modules, no build step). Keep each kit within its size cap once `PERF_BUDGET.md` exists.
9. All text for players is in English. Write dates and times in local time and say so in code comments.
10. Windows: use cross-platform commands and path handling. Expect CRLF line endings in existing files and keep them.

**Known traps**

- Three id spaces exist (3.5). Use `GameInfo.id` for host storage and `cfgId` for `Save`; never mix them.
- `arcade-core.js` still writes `arcade-hi-<id>` on every save, so `save-kit` can re-import it. Do not "fix" it by deleting the key inside `arcade-core` without checking migrations.
- `storageService.ts` writes both v1 and v2 keys. Keep both until the owner approves removing v1.
- Game pages run in a same-origin iframe. Do not loosen the origin check to make a test pass.
- `perf-kit` listens for `SET_PERF_TIER`; the host does not send it yet. Do not assume Lite is active.
- `ui-kit.js` creates a transparent overlay canvas that sits over the game canvas; never give it a background.
- The 12 React 2.5D engines are separate from the iframe games. A change to one does not change the other.

### 9.4 Master prompt

```
You are working on Apex Arcade (Vite 8, React 19, TypeScript, Tailwind 4).
Read docs/APEX_NEXT_PRD.md in full, then do ONLY task <ID>.
Follow section 9.3: read each file before editing, keep existing APIs working,
add no runtime dependency, do not touch .env*, tsconfig.json or the vite server block.
Finish with npm run lint and npm run build, then report:
(1) task and goal, (2) files changed, (3) what changed,
(4) Verified (how) / Not verified / Known issues, (5) suggested next task.
```

## 10. Risks, decisions and open questions

### 10.1 Risks

| Risk | Mitigation |
| --- | --- |
| 50 deep games is a very large job. | Tiers, the S2 gate, shared kits, batched rollout. |
| Tribute games create trademark or copyright exposure. | Original names, art and audio; review each game against its source before release. |
| Codex breaks working games. | One task per session, backward-compatible APIs, the smoke test on every change. |
| Save migration corrupts progress. | Versioned schema, backup, corruption fallback, tests (5.4). |
| Local scores can be edited by anyone. | Label boards and codes as device-local; never write "verified". |
| Low-end device performance. | Perf tiers, particle budgets, a real-phone check per game. |
| Safari audio and storage limits. | Unlock audio on first gesture; keep clips and replays in IndexedDB; handle quota errors. |
| Files in `public/` are served to everyone (the PRD copy found there). | `S0-7` removes them; nothing private goes in `public/`. |
| Service worker serves stale games after an update. | Versioned cache name and an update prompt (SH-8). |

### 10.2 Decisions (defaults in brackets)

| ID | Decision | Default |
| --- | --- | --- |
| D1 | Tier assignment for all 50 games (7.2). | Use the proposal until the owner changes it. |
| D2 | Playwright dev dependency. | Already installed; the owner approves installing Chromium. |
| D3 | Keep games as iframe pages. | Yes. |
| D4 | Hash routing. | Yes. |
| D5 | Installable PWA with offline play. | Yes. |
| D6 | No ads, no analytics. | Yes. |
| D7 | Keep the 12 React 2.5D engines frozen as an optional view. | Yes, no new work on them. |
| D8 | Ghost codes and clip capture in Sprint 10. | Yes. |
| D9 | Weekly seasons end Monday 00:00 local time. | Yes. |
| D10 | Add mood shelves, Recently played and local seasons from section 4. | Yes. |

### 10.3 Open questions for the owner

1. Do you accept the tier proposal in 7.2, or which games should move?
2. May Codex install Playwright's Chromium (needs network)?
3. Do you want the hashed twin files deleted after `S0-7` proves nothing references them?
4. Should `contrast-check` get an npm script?

### 10.4 Success metrics

- 50 of 50 games pass their tier checklist and the smoke test.
- Every game reports sessions, scores and achievements into one profile.
- No text fails WCAG AA in either theme.
- No console errors on load or play in any game.
- Lite tier holds 30 fps on a real low-end phone.
- After five minutes in any game, a player has met a menu, settings, an unlock and a reason to return.

### 10.5 Next step

Save this document as `docs/APEX_NEXT_PRD.md` (export it as Markdown). Give Codex one task at a time, starting with `S0-0`.
