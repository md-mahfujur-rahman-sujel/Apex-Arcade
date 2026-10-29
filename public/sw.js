const CACHE_NAME = 'apex-arcade-v15';
const BASE_PATH = new URL('.', self.location.href).pathname;
const GAME_FILES = [
  '01-flappy-bird.html', '02-pong.html', '03-snake.html', '04-space-invaders.html', '05-tetris.html',
  '06-pac-man.html', '07-asteroids.html', '08-mario.html', '09-mario-world.html', '10-sonic.html',
  '11-street-fighter.html', '12-chrono-adventure.html', '13-castlevania.html', '14-metroid.html',
  '15-hollow-knight.html', '16-celeste.html', '17-cuphead.html', '18-dead-cells.html', '19-ori.html',
  '20-rayman.html', '21-chess.html', '22-snakes-ladders.html', '23-ludo.html', '24-carrom.html',
  '25-tycoon-town.html', '26-checkers.html', '27-connect-four.html', '28-mancala.html', '29-reversi.html',
  '30-tic-tac-toe.html', '31-backgammon.html', '32-dots-boxes.html', '33-go.html', '34-solitaire.html',
  '35-memory-match.html', '36-maths-dash.html', '37-pool.html', '38-bowling.html', '39-basketball.html',
  '40-mini-golf.html', '41-soccer-pool.html', '42-2048.html', '43-sudoku.html', '44-minesweeper.html',
  '45-sliding-puzzle.html', '46-nuts-bolts.html', '47-colour-sort.html', '48-fruit-merge.html',
  '49-table-tennis.html', '50-mahjong.html',
].map((file) => `${BASE_PATH}assets/aistudio/${file}`);
const GAME_KITS = [
  'meta-config.js', 'meta-kit.js', 'perf-kit.js', 'arcade-core.js', 'platform-kit.js', 'act-kit.js', 'board-kit.js', 'board-art.js', 'save-kit.js', 'score-bridge.js',
  'fx-kit.js', 'ui-kit.js', 'music-kit.js', 'card-scenes.js', 'menu-kit.js', 'menu-kit.css', 'menu-bootstrap.js',
].map((file) => `${BASE_PATH}assets/aistudio/${file}`);
const APP_SHELL = [BASE_PATH, `${BASE_PATH}manifest.webmanifest`, `${BASE_PATH}apex-icon.svg`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const shellResponse = await fetch(BASE_PATH);
      if (!shellResponse.ok) throw new Error('Apex Arcade shell could not be cached.');
      await cache.put(BASE_PATH, shellResponse.clone());
      const html = await shellResponse.text();
      const builtAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
        .map((match) => new URL(match[1], self.location.origin))
        .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(`${BASE_PATH}assets/`))
        .map((url) => `${url.pathname}${url.search}`);
      const precacheUrls = [...new Set([...APP_SHELL.slice(1), ...builtAssets, ...GAME_FILES, ...GAME_KITS])];
      await cache.addAll(precacheUrls);
      // Wait for the client to approve activation so the app can show an update prompt.
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('apex-arcade-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'APEX_SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(`${url.origin}${url.pathname}`)) || (await caches.match(BASE_PATH))),
    );
    return;
  }

  if (url.pathname.startsWith(`${BASE_PATH}assets/`) || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      }),
    );
  }
});
