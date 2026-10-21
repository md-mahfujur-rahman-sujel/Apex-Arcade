# Apex Arcade: Product Requirements Document (for Gemini)

Version 1.0 | 21 Oct 2026 | Tools: Google AI Studio (Build mode), fallback Google Antigravity (free)

This PRD is based on a direct read of the project files. Statements marked VERIFIED were read in the files. Statements marked CHECK must be confirmed by opening the file before you act on them.

## 0. Rules of engagement (read before every session)

1. Do ONE numbered task per turn (for example Task P0.2 or Game 12). Never upgrade many games in one turn.
2. View a file's current content before editing it. Never edit from memory.
3. For files over about 15 KB use targeted replacements. Do not regenerate whole large files; long regenerations get truncated and silently drop features.
4. Never claim something works unless you ran it. End every reply with three labelled lists: Verified (and how), Not verified, Known issues.
5. Touch only files named in the current task, and list every file you changed.
6. Add to shared kits instead of copy-pasting. Never change an existing kit function signature; add new functions.
7. Keep existing game ids, file names, titles and gameNumber values unless a task says otherwise.
8. If blocked, ask at most 3 short questions. Otherwise state one assumption and continue.
9. For every Game task and every Phase 1 kit, show the plan and wait for the owner's approval before coding (reply format in section 10).

## 1. Project snapshot (VERIFIED)

Stack: Vite 8, React 19, TypeScript, Tailwind CSS 4, lucide-react, motion. Scripts: `npm run dev` (port 3000) and `npm run lint` (tsc --noEmit). AI Studio controls hot reload through DISABLE\_HMR; do not edit the server block of vite.config.ts.

The project has two layers.

**A. Website shell, src/**

- App.tsx composes Navbar, HeroAnthology, GameCatalog, TelemetryDashboard, AboutAnthology, Footer, GameDossierModal and PlayableTheaterModal.
- Data: src/data/gamesData.ts exports GAMES\_DATA (type GameInfo in src/types/game.ts). Fields: id, gameNumber, title, of (inspiration), year, era, genre, category (arcade, board, sports, puzzle, cards), accentColor, icon, difficulty, htmlPath, optional playableEngineId, variant, previewType.
- GameCard3D is a tilt card. CardScenePreview draws a 300x128 animated preview by calling window.Scenes.S\[gameNumber\](ctx, time, accentColor), supplied by public/assets/aistudio/card-scenes.js (loaded by a plain script tag in index.html).
- PlayableTheaterModal hosts each game in an iframe at game.htmlPath with ?diff=easy|normal|hard and sends postMessage {type:'SET\_DIFFICULTY', difficulty}. It also has a '3D Canvas' mode that renders one of 12 React engines from src/components/engines (only for games with playableEngineId). The default view is the iframe ('classic').
- storageService.ts keeps one localStorage object, apex\_arcade\_stats\_v1 (totalPlayCount, totalTimeSeconds, highScores, favorites, recentSessions capped at 20).
- audioSynthesizer.ts makes UI click sounds only.
- Fonts: Plus Jakarta Sans and JetBrains Mono from Google Fonts. Theme: dark (#08090E base) with cyan, emerald, amber and rose accents.

**B. Games, public/assets/aistudio/**

- 51 single-file HTML games named NN-slug.html (6 to 42 KB each, JavaScript inline), plus shared kits, index.html (a standalone launcher) and Instructions.txt.
- arcade-core.js (VERIFIED) is a canvas engine: fixed 60 Hz step, DOM shell, keyboard/touch/gamepad input, Web Audio synthesized SFX, particles, screen shake, hit-stop, pause, high scores, a red on-screen error box (#arc-err) and test hooks (Arcade.test). Games call `Arcade.game({id,title,subtitle,color,help|controls,w,h,touchL,touchR,init,update,draw,onStart,hud})`. The state object G has state (ready, playing, paused, over, won), score, hi, addScore, burst, ring, popup, shake, freeze, over, win, hudL, hudR. The ?diff value scales simulation speed (easy 0.8, normal 1.0, hard 1.35) and hard gives 1.25x score. Storage keys: arcade-hi-\<id>, arcade-muted.
- platform-kit.js (VERIFIED, first 45 lines) is a tile-platformer toolkit on top of arcade-core (Plat.make builds levels from code, Plat.game runs them).
- act-kit.js (33 KB) is an action-game toolkit. CHECK: read it fully before touching any game that loads it.
- board-kit.js (VERIFIED) builds the board-game page (Board.shell), sound, computer pacing (Board.think, Board.pace), piece gliding (Board.glide) and dialogs (Board.modal). Keys: apex:mute, apex:cpu, apex:help:\<id>. Its back link posts {type:'CLOSE\_THEATER'} to the parent.
- Today's look: canvas primitives, gradients, glow and fake-3D blocks (A.block3d). Chess pieces are Unicode glyphs. There are no external image or audio files; everything is procedural. Keep this offline-first principle unless the owner approves otherwise (section 11).
- CHECK for every game: which kit scripts it loads (open its script tags). Only 01 (arcade-core) and 21 (board-kit) were confirmed.

Not read yet (read before editing): src/components/engines/\*.tsx, GameDossierModal.tsx, index.css, act-kit.js in full, and most game files.

## 2. Verified defects and gaps (fix in Phase 0 and 1)

- **D1. Scores never reach the website.** Only the 12 React engines call saveSessionScore. The iframe games (the default view) send nothing back, so Telemetry, high scores and recent sessions ignore them. The modal only listens for CLOSE\_THEATER.
- **D2. Session time is wrong.** PlayableTheaterModal does `const [startTime] = useState(Date.now())` once, when the app loads, so durations count from page load, not from game start.
- **D3. The 'Playable Engines' nav tab does nothing.** It sets activeFilter to 'playable', but GameCatalog only handles 'favorites' and '3d-engines'.
- **D4. A previous plan was not fully applied.** .aistudio/.../implementation\_plan.md promises a mobile nav drawer, a horizontally scrolling category strip, hardware auto-tiering and a smoothed telemetry chart. Navbar.tsx has no drawer (nav is hidden md:flex), GameCatalog tabs wrap instead of scrolling, and TelemetryDashboard still calls setFps and setFrameTimes every 300 ms with no tiering. CHECK whether the plan was only partly applied, then complete it (tasks W2 and W7).
- **D5. Difficulty means different things.** Arcade games change speed and score; board games only change how long the computer 'thinks' (slow, normal, fast), not how well it plays. Chess also has its own Level select.
- **D6. Hard-coded counts disagree.** 51 appears in index.html, Hero and Navbar; 20 appears in Footer ('20 Curated Legends'), metadata.json and an App.tsx comment. Derive counts from GAMES\_DATA.length.
- **D7. Duplicate hashed files.** Every game and kit has a twin such as 01-flappy-bird\_2bf9c576.html. gamesData.ts and index.html reference only the un-hashed names. Treat un-hashed files as canonical. Do not edit the twins.
- **D8. board-kit.js has no on-screen error overlay** (arcade-core.js has one), so board-game runtime errors are invisible.
- **D9. Instructions.txt numbering does not match the files** (for example '42. Table Tennis' is 49-table-tennis.html).
- **D10. Telemetry radar is partly invented.** It uses 6 hard-coded game ids and clamps values to a floor, so the chart shows made-up baselines; the FPS card measures the website, not the games.
- **D11. Two implementations exist for 12 games** (React engines and HTML games). Enhancing both doubles the work. Recommendation in section 11.
- **D12. Gemini API is declared but unused as far as read.** package.json includes @google/genai, express and dotenv, and metadata.json declares a server-side Gemini capability, but no Gemini call was found in the files read. CHECK before using.

## 3. Product vision and quality bar

Apex Arcade becomes a polished, offline-capable browser collection of 50 original games that feels like a first-party console title: consistent art direction, joyful animation, responsive controls, a story or progression in every game, and a website that feels like a game launcher.

**Switch-like polish (the target)** means these measurable traits, not copying any Nintendo asset:

1. Art direction: each game has a written palette (5 to 7 colours), 3 shading tones, one light direction (top-left) and one outline rule.
2. Characters and objects have at least 3 detail layers, idle animation (breathing, blinking, sway), squash and stretch on jump, land and hit, plus anticipation and follow-through.
3. At least 3 parallax background layers plus a foreground layer, ambient particles, soft ground shadows and glow lighting.
4. Juice on every action: hit-stop, camera shake tuned per event, particles, sound, number pop-ups, screen flashes (respecting reduced motion).
5. Consistent UI: rounded panels, animated number roll-ups, transitions (iris, fade, slide), a title screen with attract-mode animation, and a polished pause and results screen with star ratings.
6. Procedural music: a looping, layered track per game that reacts to intensity, plus richer SFX (envelopes, filters, reverb).
7. Controls: keyboard, gamepad and touch all work; input buffering; forgiving timing (coyote time) in platformers.
8. Performance: stable 60 FPS on the Standard tier, with automatic Lite and Ultra tiers (kit K6).
9. Progress: levels, stars, unlocks, achievements and saves in every game.
10. Story: intro, chapter text, boss or opponent introductions and an ending, all editable from one STORY object at the top of each game.

Realism note for Gemini: the engine is 2D canvas. Aim for hand-crafted, layered 2D and 2.5D art. Do not promise or attempt true 3D rendering unless the owner approves a library (section 11).

**IP guardrail:** every game keeps original characters, names, art and music. Real games are inspirations only. Never reproduce Nintendo or any publisher's characters, logos, sprites, level layouts or melodies. Do not put trademarked names in game titles.

## 4. Hard constraints

- Offline-first: no network requests from games, no CDN scripts, no remote images or audio. Data URIs under 20 KB are allowed. Vendored libraries only with owner approval.
- Games stay plain HTML plus JS in public/assets/aistudio/, referenced as /assets/aistudio/NN-slug.html. The React app must keep passing `npm run lint`.
- Keep these in every game: the ?diff query, SET\_DIFFICULTY message handling, the CLOSE\_THEATER back link (board games), P pause, M mute, fullscreen, the Controls panel, and Arcade.test hooks in arcade-core games.
- Never edit .aistudio/, .env.example, tsconfig.json, or the server block of vite.config.ts. Never put secrets in the repo.
- No new npm dependency without owner approval. Do not downgrade packages.
- Size budget: a game may grow to 150 KB and a kit to 80 KB. Split files instead of exceeding it.
- Accessibility: Reduced motion option, colour-blind safe palette option, 44 px minimum touch targets, pause on tab blur, no flashing above 3 flashes per second.
- Mobile: portrait and landscape both usable; touch buttons never cover the action.

## 5. Phase 0: housekeeping and Jenga removal (exact checklist)

**Task P0.1 Remove game 51 (Timber and Balance, id 'jenga').** Do all steps, then report.

1. Search src/ and public/ for: jenga, Jenga, 51-jenga, Timber, 'gameNumber: 51', 'S\[51\]'. List every hit before changing anything.
2. src/data/gamesData.ts: delete the whole object with id 'jenga'. Change the section comment 'PUZZLES & PHYSICS (42 - 48, 50, 51)' to '(42 - 48, 50)'.
3. Delete public/assets/aistudio/51-jenga.html and its hashed twin 51-jenga\_832bd9b9.html.
4. public/assets/aistudio/card-scenes.js: remove scene 51 if it exists (the S table is keyed by gameNumber). Do not change other scenes. Leave the hashed twin card-scenes\_86002fde.js alone.
5. public/assets/aistudio/index.html (standalone launcher): remove the Jenga card, link and any count. Leave its hashed twin.
6. Replace every hard-coded game count. Inside React, derive it from GAMES\_DATA.length: HeroAnthology (paragraph, button 'Browse All 50 Games', stat strip), Navbar ('All 50 Games'), Footer ('20 Curated Legends'). Outside React write 50 as static text: index.html title, meta description and og tags, metadata.json, README.md, plus the comments in App.tsx, GameCatalog.tsx, types/game.ts and PlayableTheaterModal.tsx.
7. The Hero stat strip must compute: total 50, arcade 20, board 13, and 'Sports, cards and puzzles' 17 (cards 3, sports 6, puzzle 8). Compute from data; do not hard-code.
8. Fix Instructions.txt numbering so each heading equals the file's number, and make entries 42 to 50 match their files.
9. Run `npm run lint`. Open the catalog and confirm 50 cards with chips: All 50, Arcade 20, Board 13, Sports 6, Puzzles 8, Cards 3. Confirm no console errors and no 404 for card-scenes.js.
10. Report all files changed and anything you could not verify.

**Task P0.2** Fix D2 (session timer starts when a game opens), D3 (implement the 'playable' filter as games that have playableEngineId, or remove the nav tab) and D8 (add the arcade-core error overlay to board-kit.js, wrapped so it cannot break the page).

**Task P0.3 (report only, no edits)** For every game list: which kit scripts it loads, file size, canvas size or layout type, and whether it handles ?diff. Output a table and save it as docs/GAME\_INVENTORY.md.

**Task P0.4 (report only)** Search all code for references to the hashed twin files (names ending in an underscore plus 8 hex characters). Report. Delete nothing; the owner decides.

## 6. Phase 1: shared foundation (build once, reuse in every game)

Create these as new files in public/assets/aistudio/. Each kit is additive and loads after arcade-core.js or board-kit.js. Do them in order, one per task, and wire a small demo into game 01 (arcade) or game 30 (board) only.

- **K1 save-kit.js (P1.1).** Save.load(gameId) and Save.update(gameId, patch). Versioned schema `{v:2, level, stars:{}, unlocks:[], achievements:[], settings:{musicVol,sfxVol,reduceMotion,colorblind}, stats:{plays,bestScore,secondsPlayed}}` at localStorage key apex:save:\<gameId>. Never throw if storage is blocked. Migrate the old keys arcade-hi-\<id> and apex:mute.
- **K2 score bridge (P1.2).** `Apex.report({gameId,type,score,level,durationSec,achievementId})` posts {type:'APEX\_EVENT', ...} to window.parent. In PlayableTheaterModal listen for it, accept only event.source equal to the iframe's contentWindow and the same origin, then update storageService (migrate apex\_arcade\_stats\_v1 to v2 without losing data). Report session\_start, score, level\_complete, achievement, session\_end. This fixes D1.
- **K3 fx-kit.js.** Fx.bake(w,h,drawFn) renders a sprite once to an offscreen canvas; pooled particles with caps; Fx.tween with easings (outBack, outElastic, inOutCubic); squash and stretch helper; camera (follow, look-ahead, deadzone, shake, zoom); parallax layer helper; light and glow helpers; cheap bloom (downscaled blurred copy drawn with a lighter blend, off in Lite); screen transitions (iris, fade, slide); colour grade and vignette.
- **K4 ui-kit.js.** Title screen with attract mode; level-select map with stars and locks; pause menu; settings panel (music volume, sfx volume, reduced motion, colour-blind palette, touch controls); results screen with 1 to 3 stars; achievement toast; dialogue box (typewriter text, procedurally drawn portrait, skip with any key); tutorial hint bubbles.
- **K5 music-kit.js.** A small Web Audio sequencer. `Music.play({tempo,scale,root,layers:[bass,pad,lead,drums]})` and `Music.setIntensity(0..1)` to fade layers. Pattern generators so each game gets its own theme by changing data, not code. Generated reverb impulse, master and music volumes tied to the save settings, stops on pause or blur. CPU budget under 5 percent on the Standard tier.
- **K6 perf-kit.js.** Perf.tier is 'ultra', 'standard' or 'lite', chosen from navigator.hardwareConcurrency, navigator.deviceMemory, coarse pointer and a 60-frame frame-time probe; the website may override it with ?tier=. The tier sets the DPR cap (ultra 2, standard 1.5, lite 1), particle caps, bloom and shadow blur. Share the detection with the React TelemetryDashboard.
- **K7 board-art.js (board games).** Procedural materials (wood grain, felt, marble, paper) as cached canvas patterns; lit piece sprites with highlights and contact shadows; a consistent board frame; win and draw celebrations; animated dice; `Board.level(1..5)` mapping to real AI strength (search depth, mistake rate, time).
- **K8 difficulty contract (P1.3).** Arcade games: Easy = 0.8 speed, an extra life or extra checkpoints, assist hints; Normal = baseline; Hard = 1.35 speed, 1.25x score, fewer checkpoints (keep arcade-core speedMult). Board and puzzle games: Easy = AI level 1 to 2 with deliberate mistakes and hints on; Normal = level 3; Hard = level 4 to 5. The computer 'thinking pace' selector stays separate from strength. Each game's bible must list what Easy, Normal and Hard change.

**Regression rule for every kit task:** list the games that load that kit, open each one, press start, and confirm there is no red error box. Only add functions; never change an existing signature.

## 7. Per-game workflow and Definition of Done

**Workflow (one game per task, named like 'Game 05'):**

1. Read the game file and every kit it loads.
2. Write docs/game-bibles/NN-slug.md, 400 words maximum: pitch, art direction (palette, light direction, outline rule), characters, story beats, level list with the new mechanic introduced at each level, difficulty table, controls, 5 to 8 achievements, new features, risks. Start from the matching row in Appendix A and improve it; the owner may override.
3. STOP and wait for the owner's approval of the bible.
4. Implement in three passes, each ending with a working game: Pass A visuals and audio; Pass B gameplay and levels; Pass C story, progress, achievements and polish. Report after each pass.
5. Update gamesData.ts (description, tagline, keys, controlsSummary, difficulty if changed), the card-scenes.js scene for this gameNumber so the card preview matches the new look, and Instructions.txt.
6. Run the checklist below.

**Definition of Done (all must be true):**

- Visual: art direction applied; sprites baked; 3+ parallax layers; idle and action animation; lighting and shadows; UI from ui-kit; no placeholder rectangles left.
- Audio: a unique music loop with intensity layers; 10+ distinct SFX; music and SFX volume controls; M mutes everything.
- Gameplay: at least 12 levels or stages (arcade, platform, action), or 30 puzzles or 5 AI levels (board and puzzle), or 4 modes (sports); a clear difficulty curve where each new mechanic is introduced safely before being combined; restart in under 2 seconds.
- Story: intro, interstitials and ending, all from one STORY object. Board, sports and puzzle games use a circuit or campaign with named opponents or themed worlds.
- Features: save and resume, stars, 5 to 8 achievements, a statistics screen, and at least one replay hook (daily challenge, ghost, time attack or unlock).
- Integration: Apex.report events sent; ?diff and SET\_DIFFICULTY work; keyboard, gamepad and touch all work; pause on blur; reduced motion respected.
- Quality: no console errors and no red error box; no memory growth after 10 minutes (pool objects, no per-frame allocation in hot loops); 60 FPS on the Standard tier; the file still opens standalone.
- Docs: the bible matches what was built; the report lists Verified, Not verified and Known issues.

If a game would exceed the size budget, split it: NN-slug.html stays the entry file and loads sibling files such as NN-slug-levels.js and NN-slug-art.js.

## 8. Website requirements

Keep the dark theme (#08090E base, #0E1220 panels, cyan, emerald, amber and rose accents in a 60-30-10 budget, Plus Jakarta Sans and JetBrains Mono). The goal is a site that feels like a game launcher. One task per turn.

- **W1 Data and counts.** Derive every count from data. Add optional GameInfo fields, backward compatible: players ('1P', '1-2P', '1-4P'), sessionMinutes, tags\[\], modes\[\], storyBlurb, levelCount, status ('classic' or 'enhanced').
- **W2 Responsive completion (finishes D4).** Slide-out nav drawer with 44 px targets; horizontally scrolling category strip with edge fades; full-bleed theater on phones with safe-area insets and a landscape hint; balanced hero text.
- **W3 Launcher home.** 'Continue playing' row (last 4 sessions from the bridge); 'Recommended' row based on categories played; 'New and enhanced' badge row; 'Daily challenge' card seeded by date; a hero carousel whose cards run a live attract-mode canvas.
- **W4 Catalog upgrade.** Sort (A to Z, newest enhanced, most played, difficulty); filters (players, session length, mode, era); search highlighting; a progress ring per game (levels done and stars); an Enhanced badge; skeleton loading; full keyboard navigation and visible focus rings.
- **W5 Theater upgrade.** A pre-launch screen (art, story blurb, controls, difficulty, Play button) so audio unlocks on a user gesture; an in-theater settings drawer (volumes, reduced motion, colour-blind palette, performance tier); a gamepad-connected indicator; hide or remove the '3D Canvas' toggle per decision 1 in section 11.
- **W6 Profile and achievements.** Local profile (name, procedurally drawn avatar), a cross-game achievements wall built from APEX\_EVENT, total stars, play streak, rank and XP, per-game stats pages, export and import of the save file as JSON, reset with confirmation.
- **W7 Telemetry rebuilt (finishes D4 and D10).** Draw the frame-time chart on a canvas with smoothing and 1 second state updates; pause it off-screen; show the device tier from perf-kit; remove invented radar floors; show real data only (plays, time, best scores, stars, achievements by category).
- **W8 Dossier upgrade.** Lore plus story synopsis, 3 auto-captured stills from the card scene (canvas toDataURL), a controls diagram, a difficulty explanation, and 'Play from level N' for unlocked levels.
- **W9 Motion and UI sound.** Page and modal transitions with the motion library, micro-interactions, UI sounds (hover, click, open, close) tied to the volume settings, one set of design tokens.
- **W10 PWA and performance.** Web manifest and icons, a service worker that caches the game files for offline play, lazy-loaded card scenes, prefetch of the likely next game. CHECK: target a mobile Lighthouse performance score of 90 or more.
- **W11 Sharing.** A share-score card (canvas to PNG) and deep links like #game=\<id> that open the theater.
- **W12 Optional Gemini features (only with owner approval).** In-game coach tips or opponent commentary. Never put the API key in client code; use a small express proxy reading GEMINI\_API\_KEY from the environment. The core experience must stay fully offline.

## 9. Delivery order

1. P0.1 to P0.4 (housekeeping and Jenga).
2. Phase 1 kits, score bridge (K2) first, then K1, K6, K3, K4, K5, K7, K8.
3. Website W1, W2 and W7 (finish unfinished work), then W3 to W6.
4. Pilot games to lock the art direction, owner reviews each: Game 01 Glowmoth Gauntlet (arcade-core), Game 30 Tic-Tac-Toe (board-kit), Game 42 Merge 2048 (puzzle). After approval write docs/STYLE\_GUIDE.md and treat it as frozen.
5. Roll out in batches, one kit family at a time, so kit improvements land first. Batch A: 02 to 07. Batch B: 08, 09, 10, 16, 19, 20 (platformers; CHECK kit). Batch C: 11 to 15, 17, 18 (action and RPG; CHECK kit). Batch D: 21 to 33 (board). Batch E: 34 to 36 (cards and brain). Batch F: 37 to 41 and 49 (sports). Batch G: 43 to 48 and 50 (puzzles). Website W8 to W11 interleave between batches.
6. Final pass: cross-game consistency, Lite-tier performance audit, accessibility audit, and refresh Instructions.txt, README and docs.

## 10. How to run each session

**Reply format Gemini must use:** (1) task id and one-line goal; (2) plan in at most 8 bullets with files to change and a size estimate, then STOP if the task needs approval; (3) after approval, the changes made; (4) Verified (how), Not verified, Known issues; (5) next suggested task.

Save this PRD in the project root as PRD.md so every session can re-read it.

**Master prompt (paste at the start of each session):**

```
You are the lead developer of Apex Arcade. Read PRD.md in the project root in full, then docs/GAME_INVENTORY.md and any docs/game-bibles files I mention. Follow section 0 exactly. Today's task: <TASK ID>. Do not start other tasks. Show your plan first and wait for my word 'approved' where the PRD requires it. End with Verified / Not verified / Known issues.
```

**Per-game prompt:**

```
Task: Game <NN> <name>. Follow PRD section 7. Step 1 only: read the game file and every kit it loads, then write docs/game-bibles/<NN>-<slug>.md starting from Appendix A row <NN>. Stop and wait for my approval. Do not change any code yet.
```

**Pass prompt:**

```
Approved. Implement Pass A (visuals and audio) only for Game <NN>. The game must stay playable at the end. Use the required report format.
```

## 11. Decisions the owner must confirm (default in brackets)

1. The 12 React '3D Canvas' engines: freeze them and hide the toggle once the HTML version is enhanced \[default\], enhance both, or delete them.
2. Offline-first with no external assets \[default\], or allow vendored libraries in public/assets/aistudio/vendor/ (for example a physics library for Pool, Carrom, Mini Golf and Orchard Drop, or Three.js for real 3D).
3. Hashed twin files: leave alone \[default\], or delete after P0.4 proves they are unused.
4. Source of truth: Apex Arcade/public/assets/aistudio \[default\]. The separate All Game Codes folder is an older copy and is ignored.
5. Story for board, sports and puzzle games: campaign circuits with named opponents and worlds \[default\], or none.
6. Online features (leaderboards, accounts): out of scope \[default\]; local-only profile and saves.
7. Music: procedural synth only \[default\], or small embedded samples.

## Appendix A. Per-game starting briefs (proposed defaults)

These rows are starting points for each game's bible (section 7). Improve them, keep each game's identity and its original characters, and let the owner override anything. Every game also receives the universal Definition of Done in section 7.

| # | Game | Story seed | Visual signature | Gameplay and levels | Signature features |
| --- | --- | --- | --- | --- | --- |
| 1 | Glowmoth Gauntlet | The last glowmoth carries the Dawn Spark through collapsing caverns to relight the Lumen Tree. | Bioluminescent crystal caves, wing-dust trails, depth blur on the foreground, biome colour shifts. | 5 caverns (Crystal, Mushroom, Ice, Magma, Void) x 3 stages; wind gusts, swinging crystals, narrowing gaps; a boss gate per cavern. | Moth skins unlocked by medals; ghost of best run; daily seed. |
| 2 | Ion Rally | A rookie paddle-bot climbs the Neon League to face Champion Core. | Holographic arena, comet ball trail, paddle ripples, reactive crowd lights. | 8 opponents with distinct quirks, 4 arenas with bumpers; power-ups (curve, split ball, shield); first to 7 or timed. | Tournament bracket; serve spin; 2P versus. |
| 3 | Ember Serpent | A fire serpent relights the beacon shrines of a cooled volcano. | Lava-forged tiles, glowing scales, heat shimmer, ember trail. | 20 levels in 4 volcano zones: portals, moving rocks, fire gates, Stone Warden boss; timed gems. | Serpent skins; Zen mode; daily maze; speed-run timer. |
| 4 | Hivefall Defense | The Hive Queen descends on Harbor Station and one defender holds the line. | Parallax planet backdrop, pixel-erosion bunkers with debris, 4-frame alien animation, shield flashes. | 30 waves in 3 sectors; diver and shielded aliens; a Hive Queen boss per sector; spread, pierce and drone power-ups. | Between-wave upgrade shop; bonus challenge stages; 2P co-op. |
| 5 | Prism Stack | Stacked prisms power the Lighthouse that keeps the dark away. | Glass blocks with refraction highlights, light beams on clears, ghost piece, lighting that reacts to combos. | Marathon (levels 1 to 20), Sprint 40 lines, Ultra 2 min, 30 hand-made clear puzzles, Zen. | 7-bag randomiser, rotation with kicks, T-spin detection, hold, 5-piece preview, daily challenge. |
| 6 | Glow Beetle | A beetle reclaims seeds from the drone-infested Hive Gardens. | Bioluminescent garden mazes with dynamic lighting, animated drones, fruit gems. | 20 mazes in 4 gardens: warp tunnels, one-way doors, moving walls; four distinct drone behaviours (chase, ambush, patrol, wander). | Short story intermissions; chain bonuses; 2P alternating. |
| 7 | Starfall Rift | A courier hauls a falling star core through unstable rift sectors. | Glowing vector-style ships over layered nebulae, engine trails, rock lighting from nearby stars. | 12 sectors with gravity wells, saucer packs, a Rift Leviathan boss; shield, rapid-fire and triple-shot pick-ups. | Hangar with 4 ships and an upgrade tree; endless mode. |
| 8 | Fox Courier | A courier fox delivers the Sun Parcel across four kingdoms. | Layered parallax biomes, swaying grass, soft shadows, squash and stretch, clean outlines. | 12 courses in 4 worlds with a world map, secret exits, 3 stars per course, a boss per world; Spark Boots and Float Leaf power-ups. | Level-select map; time ranks; ghost replay. |
| 9 | Cloudhop Pip | A frog hops sky isles to bring the rain back to a parched land. | Dreamy sky world, volumetric clouds, wind particles, rainbow light. | 10 sky isles with moving platforms, wind zones, double jump plus tongue-grapple; Storm Dragon boss. | Firefly collectibles; challenge rooms; cosmetic hats. |
| 10 | Rollo Rush | Rollo races the Clockwork Tide to save the Gear Isles. | Speed lines, motion blur, loops, checkerboard zones, fast parallax. | 3 zones x 2 acts plus a boss; loops, ramps and slopes with real momentum; ring scatter on hit. | Time attack with ghost; bonus pseudo-3D special stage. |
| 11 | Iron Circuit | Eight fighters enter the Iron Circuit tournament, each with a rivalry. | Fully animated procedural fighters, animated stages with crowds, hit sparks, super-move flash. | Roster grows from 3 to 8; quarter-circle special inputs, combos, blocks and throws; 2P versus; training mode. | Character select; per-fighter intro and ending; move list. |
| 12 | Clockwork Dawn | Three eras of one city; mend the broken clock to save time. | Tile towns with lighting, era-specific palettes, animated battle scenes. | Party of 3, time-travel puzzles, side quests, ATB battles with combo techs; 3 chapters and a final boss. | Save slots; equipment; bestiary; two endings. |
| 13 | Lanternbound | A lantern-bearer climbs a haunted keep to end the Hollow Duke. | Gothic backdrops lit by the lantern's light radius, fog, stained-glass rays. | 6 areas with a map, sub-weapons, relic upgrades, ability gating, 3 bosses. | Relic collection; boss rush; castle map. |
| 14 | Deepcore Drifter | A stranded driller explores Deepcore to find the way home. | Tinted atmospheric lighting, alien flora, steam and drips, parallax caves. | Interconnected map with minimap, ability gates (charge, missile, climb), 5 upgrades, 2 bosses. | Save rooms; item percentage; speed-run timer. |
| 15 | Hollowbell | Beneath a silent bell tower lies a kingdom that forgot its name. | Inky layers with soft glows, drifting dust, animated grass, hushed ambience. | 3 areas, charm slots, bench saves, currency, 3 bosses, hidden lore tablets, pogo and dash puzzles. | Charm system; lore log; map. |
| 16 | Skyfall Ridge | A climber ascends the ridge and faces the shadow of her own doubt. | Mountain parallax, wind particles, scarf physics, dash trail, per-chapter palettes. | 8 chapters x 8 to 10 screens, strawberry collectibles, a harder remix per chapter; assist options. | Death counter; chapter select; berry tracker. |
| 17 | Stormcap Showdown | A storm spirit gathers four bosses and one bold cup settles it. | Hand-inked look: line boil, film grain, flicker, painted backgrounds. | 4 multi-phase bosses plus 3 run-and-gun stages; parry, dash, super. | Two-weapon loadout; ranks D to S; coin shop. |
| 18 | Ashen Descent | An ash-born warrior descends through shifting biomes to the Warden. | Dynamic lighting, shadows, fire and ash particles, biome palettes. | 3 biomes with procedural rooms, 12 weapons, 6 skills, mutations, a boss per biome. | Meta upgrades between runs; daily seeded run; run history. |
| 19 | Lumen Sprite | A sprite restores light to the dying Great Tree. | Watercolour-style soft shading, light rays, glowing spores, parallax canopy. | 8 areas with glide, light dash and wall-cling; 3 escape sequences; a hub. | Spirit-orb upgrade tree; map. |
| 20 | Glimmer Gadabout | A musical hero reclaims sparks to open the Echo Gate. | Bright hand-painted worlds whose backgrounds pulse to the beat. | 8 music stages with beat-locked hazards, a rhythm chase and a boss; combos by rhythm. | Rank per stage; collectible costumes; 2P co-op. |
| 21 | Chess | A travelling circuit of eight masters, from a village club to the Grand Hall. | Lit 3D-look pieces (baked sprites), wood and marble themes, smooth move animation. | 5 AI levels with real depth and an opening book; 50 mate-in puzzles; clocks; evaluation bar. | PGN export; campaign vs 8 named opponents. |
| 22 | Snakes and Ladders | A pilgrimage up the Garden Path to the Moon Temple. | Illustrated board, animated snakes and ladders, tumbling 3D-look dice. | 5 themed boards, 2 to 4 players, power tiles, house-rule toggles. | Stats; campaign of 5 boards. |
| 23 | Ludo | Four houses race for the Kingdom Cup. | Rich board, token animations, capture effects. | 2 to 4 players, AI personalities, house rules (safe squares, double six), 5-round cup. | Trophy cabinet; stats. |
| 24 | Carrom | A village carrom club hosts a monsoon tournament. | Procedural wood board, polished coins, soft shadows. | Realistic friction and rebound physics; freestyle and black-and-white modes; 30 trick-shot challenges; 4 AI levels. | Aim guide limited by level; replay of last shot. |
| 25 | Tycoon Town | Rebuild a forgotten town into a thriving city. | Isometric town that visibly grows (houses, shops, lights, traffic). | Event cards, auctions, trades, 2 to 4 players, scenario goals; 8-scenario campaign. | City snapshot share; stats. |
| 26 | Checkers | The Parlour Ladder: beat a regular at each club. | Stacked wooden pieces, board shadows, jump animations. | American and international rules, 5 AI levels, 30 puzzles. | Hints; replay; stats. |
| 27 | Connect Four | A neon arcade tournament. | Glossy discs with physics drop, bounce and sound; glowing win line. | 5 AI levels up to perfect play, 5-in-a-row variant, power-disc mode, tournament. | Daily puzzle; stats. |
| 28 | Mancala | The seed merchants of the old market trade by sowing. | Carved wood board, tactile seed-sowing animation. | Kalah and Oware rules, 5 AI levels, tutorial, 8-opponent campaign. | Capture replay; stats. |
| 29 | Reversi | The Black and White Guild trains challengers. | Glossy discs with 3D flip, last-move glow. | 6x6 and 8x8, 5 AI levels (corners, mobility), endgame puzzles, hints. | Move-quality feedback; stats. |
| 30 | Tic-Tac-Toe | A quick-play cafe where every table has a champion. | Chalk-on-slate and neon themes, marks animate in. | Classic, 4x4 and Ultimate (9 boards) modes; 5 AI levels, Easy deliberately beatable. | Win streaks; 2P; stats. |
| 31 | Backgammon | A caravan route game across a desert trade road. | Inlaid board, animated dice cup, checker slides. | Doubling cube, matches to 3, 5 or 7, 5 AI levels, pip count, hints, undo. | Match history; stats. |
| 32 | Dots and Boxes | Ink-and-paper duels in a scholar's study. | Hand-drawn ink lines, boxes fill with a flourish. | Sizes 3x3 to 7x7; AI uses chain control at higher levels; 20 puzzles. | Hints; stats. |
| 33 | Go 9x9 | A mountain teahouse teaches the way of stones. | Wood board, lit stones, capture ripples. | Add 13x13 and 19x19, handicap, 5 AI levels, tutorial and 40 life-and-death problems. | SGF export; territory view. |
| 34 | Solitaire | A deck, a quiet table, a rainy afternoon. | Procedural card faces and backs (4 themes); deal, flip and win-cascade animations. | Klondike draw 1 or 3 with Vegas scoring, plus FreeCell and Spider modes; daily deal; auto-complete. | Stats; undo to start. |
| 35 | Memory Match | The Curio Shop: match relics to restore a museum. | Flip animation, glowing matches, themed sets (animals, planets, gems). | 30 levels (grids 2x2 to 6x6), timer ranks, 2P and daily modes. | Star ratings; stats. |
| 36 | Maths Dash | A number train races against the clock. | Animated train and stations, reactive mascot, streak flames. | Worlds by operation and grade; Sprint, Survival and Boss modes; selectable operations. | Progress report; daily set. |
| 37 | 8-Ball Pool | Rise through the Back Room Circuit. | Felt table, ball shading and reflections, cue stick, spin UI. | Real spin (top, back, side), 9-ball mode, 8 AI opponents, 25 trick shots. | Last-shot replay; stats. |
| 38 | Bowling | A neon alley league season. | Lane reflections, pin physics, ball skins. | Oil patterns, 4 ball types, tournament vs CPU, 2 to 4 players. | Slow-motion strike replay; stats. |
| 39 | Basketball Hoops | From the street court to the Finals buzzer. | Court themes, ball trail, net physics, crowd. | 30 levels with moving hoops, wind and distance; Shootout vs CPU; 3 balls. | Combo meter; trophies. |
| 40 | Mini Golf | Four courses of a seaside fun park. | Painted courses, animated windmills, waves, sand. | 36 holes (4 x 9) with new hazards (ramps, portals, moving walls); par ranking; 1 to 4 players. | Ball skins; hole-in-one replay. |
| 41 | Soccer Pool | Flick League, from park pitch to stadium. | Pitch with lines, shadows, disc glows, goal effects. | Teams with special discs, goalkeepers, tournament bracket, 5 AI levels, 2P local. | Goal replays; stats. |
| 42 | Merge 2048 | Merge elemental cores to forge the Prime Core. | Glossy tiles with elemental themes, merge pops, smooth slides. | 4x4, 5x5 and 6x6 boards; limited undo and swap boosters; 30 challenge goals; daily puzzle. | Themes; stats. |
| 43 | Sudoku | The Sudoku Society grades each solver. | Paper and slate themes, smooth notes, error highlighting. | 5 difficulties from a technique-graded generator; Diagonal and Killer variants; hints that name the technique. | Daily puzzle; stats. |
| 44 | Minefield | A deep-sea crew clears a mined harbour. | Sonar theme, animated reveals, flag waves. | Beginner, Intermediate, Expert and custom; no-guess generator; 30 campaign boards; chord assist. | Daily board; stats. |
| 45 | Slide Tiles | A workshop of sliding puzzles. | Wooden tiles with painted art; image-puzzle mode from procedural art. | 3x3 to 6x6; number and image modes; move and time ranks; daily. | Solver hint; stats. |
| 46 | Nuts and Bolts | A workshop robot unscrews contraptions for parts. | 3D-look bolts and planks, shadows, falling planks with physics. | 100 levels; boosters (extra tray slot, undo, hammer); 3 stars per level. | World themes; level map. |
| 47 | Bubble Sort | A lab pours colours for a rainbow machine. | Liquid pour animation, glassy tubes, bubbles. | 100 levels with growing tube counts, mystery colours, boosters; colour-blind patterns. | Level map; stars. |
| 48 | Orchard Drop | Grow the grandest fruit for the harvest fair. | Painted fruit chain with faces, juicy merges, orchard background. | Refined physics; Classic, Time Attack and 30 Challenge levels; power-ups. | Daily seed; fruit encyclopedia. |
| 49 | Table Tennis | The Open, from club to world final. | Perspective table, ball spin trails, venue crowds. | 8 opponents with styles, 4 venues, spin and smash mechanics, serve rules, 3 AI levels. | Replays; stats. CHECK: confirm the object-pooling refactor from implementation\_plan.md was applied. |
| 50 | Jade Table | A tea-house master sets 30 tile trials. | Glossy jade tiles with carved faces, soft lamplight. | 10 layouts (Turtle, Pyramid, Dragon and others); shuffle and hint limits; 30 levels; Zen. | Star ratings; daily layout. |
