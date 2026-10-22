# Apex Arcade

A browser arcade with 50 games across arcade, board, sports, cards, and puzzle categories. The React launcher includes game previews, local play history, favorites, a playable theater, score-card sharing, and game deep links.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. No API key is required for the core experience. To verify a production build:

```sh
npm run lint
npm run build
npm run preview
```

## Install and offline play

The production site is installable from browsers that support web apps. Service workers require HTTPS in production (localhost is allowed for development); the first visit needs a connection so the app shell and 50 canonical game pages can be cached. Later visits can open those games offline. Other same-origin `/assets/` responses are cached as they are used. Offline behavior should be checked in the target browser after the first online load.

## Play, saves, and sharing

- Choose a game from the home page or catalog. The theater starts with a launch screen so game audio can be enabled by a user gesture.
- Controls differ by game; use the in-game controls panel or the “How to play” section in `public/assets/aistudio/Instructions.txt`.
- Favorites, profile details, and play history are stored locally in this browser. Clearing browser storage removes them.
- Use the theater’s share button to share a PNG score card where supported, or download it. Game links use `#game=<game-id>`, for example `#game=flappy-bird`.

## Project map

- `src/` — React launcher, theater, telemetry, profile, and canvas engines.
- `src/data/gamesData.ts` — catalog metadata for the 50 games.
- `public/assets/aistudio/` — canonical standalone game pages and shared game kits. The suffixed hash twins are retained project assets; app code uses the canonical filenames.
- `docs/GAME_INVENTORY.md` — inventory and integration audit.
- `PRD.md` — product requirements and delivery order.

The production host must serve the built `dist/` directory from the site root and support HTTPS for install/offline features. Keep `service-worker.js` at the root so its scope covers the launcher and game pages.
