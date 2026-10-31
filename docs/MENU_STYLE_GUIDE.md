# Apex Arcade Menu Style Guide

**Status:** v1 schema frozen for the three menu pilots. M3 coding is underway at the owner's direction while the pilot visual review and physical-controller gaps remain open; those checks are not marked as passed.  
**Applies to:** `Menu.mount` in `public/assets/kits/menu-kit.js`, with scenes rendered by `Fx.menuScene`.

This guide is the implementation contract for new game menus. Keep a game's menu identity in its game bible; keep menu behavior in the shared kit. Do not fork menu routing, options, focus handling, or canvas lifecycle into a game page.

## Shared menu contract

```js
Menu.mount({
  gameId: 'unique-game-id',
  title: 'Game title',
  tagline: 'One short sentence.',
  archetype: 'glass',
  theme: {
    palette: {
      bg: '#101421', panel: 'rgba(24,30,48,.84)', accent: '#a78bfa',
      button: '#b8f4ef', buttonText: '#17222b', text: '#f7f4ed'
    },
    type: { title: 'system-ui, sans-serif', body: 'system-ui, sans-serif' },
    frame: 'minimal-glass',
    button: 'raised-glass',
    scene: drawScene,
    sceneFallback: drawStaticScene,
    music: { tempo: 76, root: 45, scale: 'minor', layers: ['pad', 'bass'] },
    sfx: { hover: 'tick', select: 'select', back: 'blip' }
  },
  items: ['play', 'modes', 'options', 'about', 'stats', 'exit'],
  options: { difficulty: 'normal' },
  screens: { modes: renderModes, about: renderAbout, stats: renderStats },
  onSettingChange: onSettingChange,
  onPlay: function (action) { /* start the existing game */ }
});
```

Required fields are `gameId`, `title`, `archetype`, `theme.palette`, `theme.type`, `theme.frame`, `theme.button`, `items`, and `onPlay`. Palette requires `bg`, `panel`, `accent`, `button`, `buttonText`, and `text`; `danger` is optional. `theme.scene`, `sceneFallback`, `motion`, `sfx`, and `music` are optional. The validator checks their container types, not every nested value. `theme.motion` is reserved metadata in v1; current transitions come from shared CSS and reduced-motion handling.

`archetype` is one of `banner`, `neon`, `crt`, `machine`, `glass`, `storybook`, `table`, `paper`, `scoreboard`, or `cards`. `frame` and `button` are stable identity labels and CSS hooks. They do not select an archetype. Keep the existing API names and add new schema fields only with an explicit versioned change.

Items contain 1–7 unique actions from `play`, `continue`, `modes`, `customize`, `options`, `about`, `stats`, and `exit`. An item may be a string or `{ id, label, action }`. `continue` calls `onPlay({ action: 'continue', config })`; `play` calls it with `action: 'play'`. Exit sends `MENU_EXIT` to the host. Custom item callbacks replace the default routing.

The `screens` object maps screen names to render functions. Each receives `{ root, panel, screen, data, go, back, config }`. A custom screen owns its headings, copy, controls, and visible Back action. Use real DOM controls and keep focus inside the menu. `Menu.mount` returns `root`, `go`, `back`, `currentScreen`, `history`, `getSettings`, `focus`, `resumeScene`, and `destroy`.

## Shared options and widgets

The built-in Options screen has Audio, Video, Controls, Accessibility, and Gameplay tabs. It stores settings through `Save` under the game's ID and calls `onSettingChange(key, value)`.

| Setting | Default | Shared behavior |
|---|---:|---|
| `musicVol` | 0.8 | Read by Music kit |
| `sfxVol` | 0.8 | Applied to Arcade or Board sound effects |
| `reduceMotion` | false | Updates the menu scene and notifies the host |
| `colorblind` | `none` | Sets the menu assistance attribute |
| `textScale` | 1 | Scales menu text from 0.85 to 1.4 |
| `difficulty` | `normal` | Passed to the game through `onSettingChange` |
| `bindings` | `{}` | Stores custom menu navigation bindings |
| `performanceTier` | `auto` | Applies `auto`, `lite`, `standard`, or `ultra` through Perf kit |

Games may add values to `options` and handle them in `onSettingChange`; game-specific modes and last selections must be saved by the game. The shared `Menu.widgets` API provides `slider`, `toggle`, `keybind`, `tabs`, and `modal`. Use these widgets for matching controls in custom screens.

## Scene and performance contract

`theme.scene(ctx, frame)` draws original game-specific art on a canvas behind the DOM panel. `frame` provides `gameId`, CSS-pixel `width` and `height`, `time`, `delta`, `tier`, `reducedMotion`, `static`, a stable `random()` source, mutable scene-local `state`, and `quality` (`dpr`, `layers`, `particles`, `glow`). Use `Fx.menuScene`; do not create an independent animation loop.

Provide `sceneFallback` for a composed still image. Lite and reduced-motion modes bake a single frame and reuse it; avoid requiring motion to understand the scene. Respect `quality.layers`, `quality.particles`, and `quality.glow`, keep the menu copy legible over the scene, and avoid expensive blur or shadows in Lite. Use only original canvas, CSS, inline SVG, or repository-owned art. No remote assets.

Music may be `false`, an object accepted by `Music.play`, or a string. Objects are assigned the menu's `gameId`; strings currently produce a deterministic per-game motif rather than looking up a named track. UI sounds use the `hover`, `select`, and `back` keys. Music starts through the existing gesture-gated Music kit and fades when Play is chosen.

## Visual identity and archetypes

Use the archetype to define composition and shape language, then differentiate games with palette, frame, button skin, scene motif, and music motif. Games sharing an archetype must differ from each other in at least three of those five traits. Use each game's Menu Identity Card as the visual source of truth.

| Archetype | Visual rule |
|---|---|
| Banner Frame | Framed translucent panel; broad faceted banner buttons with clear end caps. |
| Neon Marquee | Dark stage, luminous tube accents, controlled glow; keep labels solid and readable. |
| Pixel CRT | Crisp pixel edges, restrained scanlines, phosphor focus state; no blur. |
| Machine Panel | Instrument-like panels and readouts; reserve bright color for state and action. |
| Minimal Glass | Frosted, rounded panel; quiet light planes; short raised glass controls. |
| Storybook | Layered paper-cut shapes and warm, tactile contours; preserve clean text zones. |
| Table and Felt | Tabletop material and inset controls; use game pieces as restrained scene elements. |
| Paper and Ink | Paper or slate surface, drawn rules, pencil/ink accents, compact paper controls. |
| Scoreboard | Broadcast hierarchy and arena lighting; strong alignment and clear status contrast. |
| Card Deck | Card-shaped choices with a deliberate fan or stack; keep hit targets unobscured. |

The shared CSS provides bespoke base treatments for all ten archetypes. Theme each game with its identity-card palette, frame and button labels, scene motif, and music motif; archetype CSS is the shared foundation, not a substitute for the per-game scene. Do not label a game as visually complete merely because its archetype value validates.

## Interaction and accessibility requirements

- Keep text and actions in DOM, with semantic headings, buttons, labels, and live regions where needed. Canvas art is decorative and `aria-hidden`.
- Keep the main action first. Use 4–7 useful actions; do not add empty Customize or Stats screens.
- Provide a visible Back action on secondary screens. Escape returns from a secondary screen; native Tab order remains available. W/S and arrow keys move through the menu when focus is not in a form control.
- Standard gamepad d-pad or left stick moves focus; A activates the focused control, B returns from a secondary screen, and horizontal d-pad/stick adjusts a focused slider or select. Keep a visible Exit action on the main screen.
- Maintain visible focus, AA text contrast, 44 px minimum hit areas, safe-area padding, and a layout that works at 360 px portrait without horizontal scrolling.
- Honor reduced motion and text scale. Never encode selected, enabled, or error state by color alone.
- List game controls in About and keep the in-game help available after Play.
- Preserve the existing game flow and save format. Gate game input while the menu is open, and start or resume only after the player's explicit choice.

## Pilot gate and known implementation gaps

The first three pilots are Glowmoth Gauntlet (Banner Frame), Tic-Tac-Toe (Paper and Ink), and Merge 2048 (Minimal Glass). Their identity cards are in the game bibles. The owner approved the prototype gallery. Browser runtime checks passed for the menu pilots, while final visual review and physical-controller verification remain open; the owner directed coding to continue without additional verification. The remaining identities are supplied by `menu-bootstrap.js` and recorded in their game bibles; treat those cards as implementation proposals until a visual review is completed.

W/S and standard gamepad navigation are implemented in `menu-kit.js`; simulated gamepad navigation passed, but physical-controller verification remains pending. All ten archetypes now have shared CSS treatments. Reduced-motion/scene fallback, host Exit, keyboard/gamepad focus, audio, and saved-run browser checks passed. Do not claim owner visual review or physical-controller review has passed until recorded.

## Review checklist

1. Check the game's bible identity card and the three-of-five uniqueness rule.
2. Check main action order, optional actions, and the Play/Continue state.
3. Visit Modes, Options, About, Stats, Customize (if implemented), and Exit.
4. Navigate with keyboard, mouse, touch, and gamepad; inspect visible focus and Back behavior.
5. Check 360 px portrait, safe areas, text scaling, reduced motion, and Lite static fallback.
6. Verify save/resume, audio gesture behavior, same-origin host messages, and no console errors or external requests.
7. Report Verified (method), Not verified, and Known issues. Keep items that need real-device/browser review open until checked.
