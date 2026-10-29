# Apex Arcade Game Menu System: Product Requirements Document

Version 1.0 · 23 Oct 2026 · Builder: ChatGPT Codex (Luna 6.0, high effort) · Designer and reviewer: Claude

This document is the menu half of the Game Frame described in `docs/APEX_NEXT_PRD.md` (section P2). Where the two differ on menus, this one wins. It reuses the existing kits (`ui-kit` K4, `fx-kit` K3, `music-kit` K5, `save-kit` K1, `perf-kit` K6, `score-bridge` K2). Game names and the per-game proposals in section 6 come from the card titles and the inspiration labels shown on the site; the owner and each game's bible override them.

## 1. Goal

Every one of the 50 games opens on its own **themed main menu** instead of dropping the player into gameplay. The menu looks like it belongs to that game (colour, type, frame, button shape, background scene, music and sound) but all 50 share one engine, so a new menu is mostly configuration plus a little original art.

## 2. What the reference image teaches

The reference is a fantasy-game title screen. Take its structure and craft, not its art:

- **A framed, translucent panel** with fine corner ornaments sits over a full-bleed scene. The scene stays visible and the panel stays readable.
- **A short vertical stack of large banner buttons** with pointed end caps. Only four choices: Play, Options, About, Exit. The most important one is first and every one has a big hit area.
- **High-contrast labels:** dark teal on cream, heavy bold caps, a faint drop shadow.
- **Even vertical rhythm,** centred layout, and a small version string at the bottom.
- **The mood is carried by the scene,** the palette and the button silhouette, not by extra widgets.

**Legal note:** the background looks like commercial key art from an existing game franchise. Do not copy, trace or embed it. All scene art in Apex Arcade must be original (procedural canvas, inline SVG, or baked sprites).

## 3. Principles

1. **One engine, fifty identities.** No per-game copy of menu logic.
2. **Menu identity is data.** A game supplies a theme object, a scene function and a short item list.
3. **DOM for menus, canvas for scenes.** Buttons are real DOM (focus, keyboard, screen readers); the animated background is canvas.
4. **Fast and light.** Menu appears within about one second; Lite tier gets a static baked scene.
5. **Original assets only,** no network requests, fonts self-hosted with their licences kept in the repo.
6. **Never trap the player.** Every screen has a visible Back, and Esc or the gamepad B button always works.

## 3.1 Constraints

- Frontend only. Each game stays a single page loaded in the iframe from `public/assets/aistudio/`.
- Existing kit APIs stay backward compatible. New code adds, it does not rename.
- Per-game menu cost: theme object and scene code at most about 15 KB. Shared `menu-kit.js` at most about 45 KB before gzip; its shared archetype styles live in adjacent `menu-kit.css` and are precached for offline play.
- Both site themes work; the menu is always its own game-themed look and ignores the site's light or dark theme.

## 4. Scope

**In scope:** main menu, mode select, customize, options, about and how to play, stats and achievements view, pause menu, results screen, exit confirmation, version line, menu music and UI sounds, transitions, keyboard, mouse, touch and gamepad navigation.

**Out of scope for this PRD:** gameplay changes, the website shell redesign, online features, and the meta layer (XP, quests). Menus read from those when they exist.

## 5. Menu system design

### 5.1 Screens

| Screen | Purpose | Notes |
|---|---|---|
| Main | Entry point | Items chosen per game, 4 to 7 buttons. Default order: Play or Continue, Modes, Customize, Options, About, Exit. |
| Modes | Pick mode, level or difficulty | Skipped when the game has one mode. Reuses the K8 difficulty contract. |
| Customize | Skins, palettes, trails | Appears once the game has cosmetics. Locked items show how to unlock. |
| Options | Settings | Tabs: Audio, Video, Controls, Accessibility, Gameplay. Same widgets in every game. |
| About | How to play, controls, credits, version | Controls shown here and again in-game, as the owner already requires. |
| Stats | Best scores, achievements | Reads `save-kit`. |
| Pause | In-game overlay | Resume, Restart, Options, Exit to menu. In the site theater, all games share the host-owned pause screen below; standalone game pages keep this themed menu pause. |
| Results | After a run | Score, best, rewards, Play again, Menu. |
| Exit | Confirm and leave | Sends the close message to the host site; Exit always asks only if progress would be lost. |

### 5.1.1 Theater pause ownership

The site theater owns one pause screen for both game families. The in-game themed menu remains the launch menu; it is not a pause screen.

- **One control.** Escape toggles exactly one host overlay mounted above the stage. There is no floating pause button over gameplay.
- **One gate.** Pause is unavailable until the run starts: immediately after the theater launch for React engines, and only after the in-game menu sends `MENU_PLAY` for iframe tributes. This prevents paused-menu conflicts and stops gamepad Start from pausing the launch menu.
- **All inputs.** Touch devices get one Pause action in the theater bottom bar. Gamepad Start toggles the same overlay. The iframe's own gamepad Start handling is disabled in embedded mode so a resume cannot immediately re-pause through the guest.
- **Actions.** Resume, Restart, Settings and Exit to Arcade. Escape resumes from the overlay and from its Settings panel. Restart keeps the existing semantics: a React engine remounts and an iframe reloads to its own themed menu.
- **True suspension.** The host makes the stage inert, suspends shared audio, and posts `SET_PAUSED` to the iframe. React engines skip simulation, input and timers while paused. Iframe games pause through `menu-kit`: Arcade/`UI.mountGame` state, board-kit's logical clock and scheduled timers, canvas scenes and game music all stop. Embedded `menu-kit` ignores a resume while its main menu is visible.
- **Standalone pages.** Opening a game page outside the theater keeps the themed menu-kit pause menu on P/Escape, because there is no host overlay to own it.

### 5.2 Theme object (identity as data)

Each game declares one object. Codex implements the schema in `menu-kit.js` and validates it.

```js
Menu.mount({
  gameId: '<id from gamesData.ts>',
  title: 'Game Title',
  tagline: 'One short line',
  archetype: 'banner',          // see 5.3
  theme: {
    palette: { bg, panel, accent, button, buttonText, text, danger },
    type: { title: 'Cinzel', body: 'system' },
    frame: 'corner-ornament',   // frame style
    button: 'banner-diamond',   // button skin and end caps
    motion: { enter: 'rise', hover: 'glow', press: 'sink' },
    scene: sceneFn,             // draws (ctx, frame); frame has size, time, tier, quality, motion and state
    sceneFallback: staticFn,    // optional still frame for Lite and reduced motion
    music: 'menuThemeA',        // from music-kit
    sfx: { hover, select, back }
  },
  items: ['play', 'modes', 'customize', 'options', 'about', 'exit'],
  onPlay: startGame
});
```

### 5.3 Archetypes (layout and visual language)

An archetype is a ready-made combination of layout, frame styles, button skins and motion. Games pick one and then override palette, type, scene and details.

| Archetype | Look | Best for |
|---|---|---|
| Banner Frame | Ornate banner buttons in a framed translucent panel (the reference) | Fantasy, adventure, action platformers |
| Neon Marquee | Glowing tube lettering, cabinet marquee, light strips | Racing, shooters, space |
| Pixel CRT | Chunky pixel buttons, scanlines, phosphor glow | Retro maze, runners, minefield |
| Machine Panel | Riveted plates, gauges, toggle switches, readouts | Tower defense, circuits, workshop |
| Minimal Glass | Frosted tiles, soft gradients, large type | Light puzzles, ambient games |
| Storybook | Paper-cut layers, stitched labels, hand-drawn feel | Cute platformers, family games |
| Table and Felt | Game laid on a tabletop, wood, felt or lacquer plates | Board games |
| Paper and Ink | Notebook, chalk or ink wash, pencil underlines | Logic and word-like games |
| Scoreboard | Broadcast bars, ticker, arena lights | Sports |
| Card Deck | Menu items as fanned cards | Card games |

Adding a new archetype later is allowed. It needs a prototype approved by the owner first.

### 5.4 Behaviour

- **Navigation:** arrow keys, W/S, Tab, mouse, touch and gamepad d-pad all move focus. Enter, Space, click, tap and gamepad A select. Esc and gamepad B go back.
- **Layout:** 16:9 desktop down to 360 px portrait, safe areas respected, hit targets at least 44 px, no horizontal scrolling.
- **Accessibility:** real buttons, visible focus ring in every archetype, text contrast at least WCAG AA against the button fill, `prefers-reduced-motion` turns off parallax and shimmer, all menu text scales with a text-size option.
- **Performance:** scene respects `Perf` tiers. Ultra gets layered parallax and particles, Standard gets reduced layers, Lite gets one baked frame. The menu pauses its animation loop while a game runs.
- **Audio:** menu music and UI sounds start only after the first user gesture, follow the volume settings, and fade out when play starts.
- **Persistence:** last selected mode, options and cosmetics are stored through `save-kit` (schema v3 once it ships; until then, a namespaced key).
- **Version line:** the footer shows `Version x.y.z (build id)`, read from a same-origin `build-info.json` generated at build time. No network request leaves the site.
- **Fonts:** self-hosted, licence-compatible fonts only (for example OFL fonts such as Cinzel, Orbitron, Fredoka, Rajdhani or Press Start 2P), subset to Latin, at most 5 families across the whole site, each with its licence file in the repo. The owner approves the list first (decision M3).

### 5.5 Host contract

The menu talks to the site through the existing `postMessage` bridge. Menu messages are `MENU_OPEN`, `MENU_PLAY`, `MENU_EXIT`, `MENU_PAUSE` and `MENU_RESUME`; the host replies to the active iframe with `SET_PAUSED`. Exit triggers the existing close-theater behaviour. The host accepts messages only from its own iframe and same origin, as already required.

## 6. Proposed identity for each game

These are starting points, inferred from titles and the inspiration labels on the cards. Each game's bible (`docs/game-bibles/<game>.md`) confirms or replaces them in Sprint M0.

| Game | Archetype | Mood and palette direction |
|---|---|---|
| Glowmoth Gauntlet | Banner Frame | Bioluminescent cavern, indigo and cyan |
| Ion Rally | Neon Marquee | Racing night, electric blue and magenta |
| Ember Serpent | Banner Frame | Carved stone, ember orange |
| Hivefall Defense | Machine Panel | Hex plates, honey amber |
| Prism Stack | Minimal Glass | Prismatic gradients on frosted tiles |
| Glow Beetle | Pixel CRT | Maze chase, phosphor green and yellow |
| Starfall Rift | Neon Marquee | Night sky, violet and gold |
| Fox Courier | Storybook | Warm autumn, delivery-map motifs |
| Cloudhop Pip | Storybook | Sky pastels, paper clouds |
| Rollo Rush | Pixel CRT | Bright primaries, speed lines |
| Iron Circuit | Machine Panel | Circuit board, copper and teal |
| Clockwork Dawn | Banner Frame | Brass gears, dawn gold |
| Lanternbound | Banner Frame | Gothic, candle amber on deep violet |
| Deepcore Drifter | Machine Panel | Scanner HUD, cyan on dark rock |
| Hollowbell | Banner Frame | Bell tower, bronze and mist |
| Skyfall Ridge | Minimal Glass | Alpine dusk gradients |
| Stormcap Showdown | Neon Marquee | Storm, electric yellow |
| Ashen Descent | Banner Frame | Charred stone, red embers |
| Lumen Sprite | Minimal Glass | Soft forest light, pale gold |
| Glimmer Gadabout | Storybook | Paper-cut colour, musical motifs |
| Chess | Table and Felt | Walnut and ivory |
| Snakes & Ladders | Storybook | Bright printed game-board paper |
| Ludo | Table and Felt | Painted wood, four-colour pieces |
| Carrom | Table and Felt | Polished plywood, striker |
| Tycoon Town | Table and Felt | Deed cards, green and gold |
| Checkers | Table and Felt | Diner red and black |
| Connect Four | Table and Felt | Toy-store plastic frame, red and yellow |
| Mancala | Table and Felt | Carved wood, seed bowls |
| Reversi | Minimal Glass | Monochrome discs, green accent |
| Tic-Tac-Toe | Paper and Ink | Chalkboard or pencil on paper |
| Backgammon | Table and Felt | Leather and brass |
| Dots & Boxes | Paper and Ink | Graph paper, coloured pens |
| Go 9x9 | Paper and Ink | Ink wash, light timber |
| Solitaire | Card Deck | Green felt |
| Memory Match | Card Deck | Playful pastel cards |
| Maths Dash | Paper and Ink | Chalk, countdown timer |
| 8-Ball Pool | Table and Felt | Lounge, green baize |
| Bowling | Scoreboard | Lane lights, retro alley |
| Basketball Hoops | Scoreboard | Arena court, orange |
| Mini Golf | Storybook | Sunny course, pastels |
| Soccer Pool | Scoreboard | Pitch lines, floodlights |
| Table Tennis | Scoreboard | Clean arena, blue table |
| Merge 2048 | Minimal Glass | Soft pastel tiles |
| Sudoku | Paper and Ink | Newsprint, pencil |
| Minefield | Pixel CRT | Terminal, alert amber |
| Slide Tiles | Minimal Glass | Light timber tiles |
| Nuts & Bolts | Machine Panel | Workshop steel |
| Bubble Sort | Minimal Glass | Bright liquids in glass tubes |
| Orchard Drop | Storybook | Fruit crates, warm greens |
| Jade Table | Table and Felt | Jade and red lacquer |

**Uniqueness rule:** two games may share an archetype but must differ from every other game in that archetype on at least three of these five: palette, frame style, button skin, scene motif, music motif. A reviewer checks this in each PR.

## 7. Menu Identity Card (one per game, added to its bible)

```
Game: <title>                 Archetype: <name>
Mood in one line:
Palette: bg / panel / accent / button / buttonText / text (hex)
Title font and body font:
Frame style and button skin:
Scene recipe: layers (back to front), animated elements, 2 to 3 bespoke sprites
Music motif and UI sounds:
Menu items and order:
Settings specific to this game:
Unlockable cosmetics shown on Customize:
Lite-tier fallback:
```

**Example, Glowmoth Gauntlet:** archetype Banner Frame; mood: a dark crystal cavern with drifting spores; palette: bg `#0b1026`, panel `rgba(12,18,40,0.72)`, accent `#7ee7ff`, button `#e8dcb0`, buttonText `#10303a`; scene: three parallax cave layers, glowing moth sprite hovering behind the panel, spore particles; music: slow pad with a soft bell; items: Play, Modes, Customize, Options, About, Exit.

## 8. Delivery plan

The plan puts a menu on all 50 games first, then deepens each game later. That gets the visible change to the owner quickly.

| Sprint | Goal | Output |
|---|---|---|
| M0 Design | Choose the look | Claude produces a single-file prototype gallery of the 10 archetypes with the real button stacks. Owner keeps, edits or drops archetypes and approves fonts (M3). Per-game identity cards written for the three pilots. |
| M1 Engine | Build `menu-kit.js` | Theme schema and validation, screens, navigation, focus, accessibility, audio hooks, Banner Frame archetype, Game 01 migrated. |
| M2 Pilots and gate | Prove range | Game 30 (Paper and Ink) and Game 42 (Minimal Glass). Owner reviews all three. Freeze the schema and write `docs/MENU_STYLE_GUIDE.md`. M3 waits for this gate unless the owner explicitly directs rollout while review gaps remain open. |
| M3 to M7 Rollout | Menus on all 50 | About 10 games per sprint, grouped by archetype so each archetype's code is written once. Order: Banner Frame, Machine Panel and Neon Marquee, Table and Felt, Storybook and Minimal Glass, then the rest. |
| M8 Polish | Quality pass | Performance, accessibility, cross-browser, uniqueness review across all 50, sound mix. |

A sprint ends with a demo build and the owner's checklist. Dates depend on how many Codex sessions you run; read this as ordering, not a calendar.

## 9. Starting backlog

| ID | Task | Done when |
|---|---|---|
| M0-1 | [Prototype gallery](menu-prototype-gallery.html): 10 archetypes, real menu stacks, hover, focus and press states | Complete — owner approved the archetypes and enhanced gallery on 2026-10-23 |
| M0-2 | [Font shortlist](FONT_SHORTLIST.md) with licenses and Latin WOFF2 size budgets | Shortlist prepared; owner approval pending before font files are added |
| M0-3 | Identity cards for the three pilot games in their game bibles | Complete — Glowmoth Gauntlet, Tic-Tac-Toe, and Merge 2048 cards added; font use remains provisional pending M0-2 approval |
| M1-1 | [`menu-kit.js`](../public/assets/aistudio/menu-kit.js) skeleton: schema, validation, screen router, focus manager | Implemented as a standalone script with exported validation/router/focus APIs; browser verification pending |
| M1-2 | Shared widgets: sliders, toggles, key rebinding, tab bar, modal | Implemented in the shared Options screen via `Menu.widgets`; game-menu rollout must use this same screen, while legacy `UI.mountGame` migration remains pending |
| M1-3 | Banner Frame archetype with end-cap button skins | Implemented in `menu-kit.js` with a translucent ornamented frame and faceted banner controls; browser visual verification pending |
| M1-4 | Scene helper on `fx-kit` with perf tiers and static Lite fallback | Implemented as `Fx.menuScene`; Lite/reduced motion uses one cached canvas frame, with tier-aware quality budgets and pause/resume; runtime verification pending |
| M1-5 | Menu audio hooks (music and UI sounds, gesture-unlocked) | Implemented in `menu-kit.js`: optional `theme.music` starts through the gesture-gated Music kit; a theme name gets a stable per-game procedural variation; UI hover/select/back sounds use Arcade SFX and saved SFX volume; Play and destroy fade out menu music. Browser audio verification pending |
| M1-6 | Host messages and exit flow | Implemented: menu emits `MENU_OPEN`, `MENU_PLAY`, and `MENU_EXIT`; the theater host accepts messages only from its active same-origin iframe, ties play/exit to the opened game id, and closes the theater on exit. Browser verification pending |
| M1-7 | `build-info.json` generation and version line | Implemented: the Vite production build emits root `build-info.json` with the package version, Git revision plus build timestamp (timestamp fallback without Git), and build time; the shared menu reads it same-origin and shows a development fallback if it is unavailable. Browser/build verification pending |
| M1-8 | Migrate Game 01 | Implemented Glowmoth Gauntlet with its Banner Frame menu, procedural cave scene and per-game music; Options, About, Stats, and Exit are connected. Gameplay inputs are locked only while the menu is open, then the existing game starts unchanged on Play. Browser verification pending |
| M2-1 | Paper and Ink archetype and Game 30 | Implemented: `menu-kit.js` now has notebook-rule framing and paper banner controls; Tic-Tac-Toe opens with a slate tabletop and score-sheet scene, working format/player mode selection, saved difficulty/audio Options, About, match records, and Exit. Board input is gated until Play; existing gameplay flow remains in place. Browser verification pending |
| M2-2 | Minimal Glass archetype and Game 42 | Implemented: `menu-kit.js` now has the translucent Minimal Glass panel and raised glass controls; Merge 2048 opens to its foundry chamber menu with static Lite artwork, optional Continue Run, Classic/Trials/Daily and board-size choices, Options, About, Stats, and Exit. Gameplay starts only after Play, and browsing modes preserves a saved run. Browser/runtime verification pending |
| M2-3 | Freeze shared schema and write [`MENU_STYLE_GUIDE.md`](MENU_STYLE_GUIDE.md) | Implemented: documented the v1 `Menu.mount` schema, options, widgets, scene contract, archetype rules, and review checklist. M2 gate remains open pending browser review; M3 stays gated |
| M2-4 | Shared keyboard and gamepad navigation | Implemented: `menu-kit.js` supports W/S and arrow-key focus movement, gamepad d-pad/left-stick navigation, A activation, B back, and horizontal adjustment of focused sliders/selects. Browser and physical-controller verification pending |
| M2-5 | Shared visual treatments for all ten archetypes | Implemented: shared `menu-kit.css` includes responsive, theme-token-based treatments for Neon Marquee, Pixel CRT, Machine Panel, Storybook, Table and Felt, Scoreboard, and Card Deck alongside the three pilot archetypes. Browser visual verification pending |
| M2-6 | Keep the shared menu engine within its source budget | Complete: extracted shared archetype styles to `menu-kit.css`, loaded it adjacent to `menu-kit.js`, and added it to the service worker precache. `menu-kit.js` is 39,779 bytes. Playwright verified all three pilots load the 145-rule stylesheet, show the right archetype, navigate Options/Back, and fit a 390 px viewport without horizontal overflow or browser errors. `npm run test:pwa` verified the pilot menu and stylesheet work offline, alongside the 50-game precache and prompted worker update |
| M2-7 | Verify the three menu pilots and close the runtime gate | `npm run test:menu-pilots` passed in Playwright: Glowmoth keyboard and simulated gamepad navigation/activation/Back; reduced-motion preference persistence and static scene fallback; gesture-unlocked Web Audio; Tic-Tac-Toe Paper pilot; Merge 2048 Continue Run restoring the exact saved board; same-origin theater Exit; zero browser errors. Fixed legacy gamepad focus stealing while the menu is active and wired validated `MENU_EXIT` messages to close the React theater. At the owner's direction, M3 coding continues without further verification; pilot visual review and physical-controller checks remain open and are not claimed as passed. |
| M3-1 | Banner Frame rollout: Game 03 Ember Serpent | Added its per-game Banner Frame menu and basalt-cavern scene from the game bible. Existing gameplay is locked behind explicit Play; About documents the current controls and mechanics. No verification run per owner direction. |
| M3-2 | Banner Frame rollout: Game 12 Clockwork Dawn | Added its per-game Banner Frame menu and original sunrise-village scene from the game bible. Existing gameplay is locked behind explicit Play; About documents the current controls and route. No verification run per owner direction. |
| M3-3 to M7 | Roll out unique menus to the other 45 pages | Added a data-driven identity bootstrap with per-game archetype, accent, motif, procedural ambience, controls/About, and main actions; applied it to all remaining game pages. Added identity cards to the corresponding game bibles and precached the new menu assets. The shared engine blocks legacy keyboard/gamepad input until Play. No verification run per owner direction. |
| M8 | One host pause screen on all 50 games | The theater owns a single Escape/Start/touch pause overlay with Resume, Restart, Settings and Exit to Arcade, available only after gameplay starts. Embedded tribute menus bridge host pause to Arcade/`UI.mountGame` state, board-kit timers, scenes and music through `SET_PAUSED`; React engines stop their own loops and input. Standalone pages outside the theater keep the themed menu-kit pause menu. Verified 2026-10-24 by `test:theater`, `test:theater-engines`, `test:game-frame-pilots` and a 50/50 two-viewport smoke run. |

## 10. Definition of done for any game menu

- Opens on its own themed menu; Play, Options and About all work; Exit returns to the site.
- Matches its Identity Card and passes the uniqueness rule.
- Keyboard-only, mouse, touch and gamepad can reach every control; focus is always visible.
- Text contrast at least AA; reduced motion respected; text-size option works.
- Lite tier shows a static scene and holds 30 fps on a mid-range phone (checked on a real device).
- No console errors; no network requests; theme and scene code within budget.
- Controls are listed on About and visible in-game.
- The PR reports Verified (how), Not verified, and Known issues.

## 11. Working rules for Codex

1. One task ID per session, then stop. Read every file before editing it.
2. Read `ui-kit.js`, `fx-kit.js`, `music-kit.js` and `perf-kit.js` first and extend them. Do not duplicate what they already do.
3. Keep existing public APIs working. Add new ones beside them.
4. No new runtime dependency. Font files and licences are the only new assets, and only after owner approval.
5. Do not touch `.env*`, `tsconfig.json` or the `server` block of `vite.config.ts`.
6. Do not use or imitate any commercial game's art, logos, names or fonts.
7. Finish with Verified, Not verified and Known issues. Never claim a check you did not run.

**Master prompt:**

```
You are working on Apex Arcade (Vite, React 19, TypeScript, Tailwind 4).
Read docs/MENU_SYSTEM_PRD.md and docs/APEX_NEXT_PRD.md section 6, then do ONLY task <ID>.
Read each file before editing, keep existing kit APIs working, add no runtime
dependency, use original art only. Finish with npm run lint and npm run build,
then report Verified (how) / Not verified / Known issues and suggest the next task.
```

## 12. Risks

| Risk | Mitigation |
|---|---|
| 50 unique scenes is a lot of art work | Shared procedural layer library, bespoke detail limited to 2 or 3 sprites per game, Lite fallback is a single baked frame |
| Menus end up looking samey | Archetypes plus the three-of-five uniqueness rule, reviewed per PR |
| Copying the reference's art or a franchise look | Section 2 legal note; original assets only; owner reviews every scene |
| Font licences and download weight | Owner-approved shortlist, subsetting, licences stored in repo, system fallback stacks |
| Performance on low-end phones | Perf tiers, paused menu loop during play, real-device checks |
| Menu hides the game's own start flow | Play always starts immediately; Continue appears only if a save exists |

## 13. Decisions for the owner (defaults in brackets)

- **M1** Approve the 10 archetypes after seeing the prototype gallery [yes, after M0].
- **M2** Menu-first rollout, depth later [yes].
- **M3** Approve the font shortlist, at most 5 families [yes, after M0-2].
- **M4** Exit always returns to the site and never closes the browser tab [yes].
- **M5** Menu music on by default but muted until the first click [yes].
- **M6** Version line shows site version and build id [yes].

## 14. Unified pause verification (2026-10-24)

The theater now owns pause for every game. Escape toggles one host overlay; touch gets one Pause action in the theater bottom bar; gamepad Start toggles the same screen. The overlay is gated until a run starts — immediately for React engines, after `MENU_PLAY` for tribute iframes — and provides Resume, Restart, Settings and Exit to Arcade. Escape resumes from the overlay and its Settings panel.

While paused, the stage is inert, shared audio is suspended, and the iframe receives `SET_PAUSED`. Embedded `menu-kit` pauses Arcade/`UI.mountGame` state, board-kit's logical clock and scheduled timers, canvas scenes and game music. Gamepad Start is disabled inside the embedded guest so a host resume cannot immediately re-pause. Outside the theater, standalone pages keep the themed menu-kit pause menu on P/Escape.

**Verified:** `npm run test:theater` (touch pause, gamepad Start pause/resume, Escape pause on an iframe, overlay Settings/Restart/Exit including Exit immediately after Restart, display modes, fullscreen, 50 touch layouts, zero browser errors); `npm run test:theater-engines` (all 20 React-engine records show exactly one pause screen, freeze canvas output while paused and resume animation); `npm run test:game-frame-pilots` (Tic-Tac-Toe and Merge 2048 exact state preservation plus the native mobile 2048 swipe); `npm run test:smoke` (50/50 games in desktop and touch viewports); `npm run test:router` (play-route close and back/forward, including recovery when a game frame owns a joint-history entry); `npx tsc --noEmit`; and `npm run build`.

**Fixed during the work:** a score update resetting the open theater; menu Play leaving a board clock frozen; Exit to Arcade failing after a Restart because assigning the frame `src` added a joint-history entry that swallowed the host back step (restart now reloads via `location.replace`, and `closePlayRoute` verifies the hash and replaces the play route if the back step is consumed); and an unreachable 3D engine toggle caused by a missing `xs` breakpoint, now defined at 416px.

**Not verified:** physical gamepad hardware, real iOS/Android touch devices, and a visual review of the overlay in both site themes.
