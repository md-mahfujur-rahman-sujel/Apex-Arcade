const CACHE_NAME = 'apex-arcade-v16';
const BASE_PATH = new URL('.', self.location.href).pathname;
const GAME_FILES = [
  '01-flappy-bird/index.html', '02-pong/index.html', '03-snake/index.html', '04-space-invaders/index.html',
  '05-tetris/index.html', '06-pac-man/index.html', '07-asteroids/index.html', '08-mario/index.html',
  '09-mario-world/index.html', '10-sonic/index.html', '11-street-fighter/index.html', '12-chrono-adventure/index.html',
  '13-castlevania/index.html', '14-metroid/index.html', '15-hollow-knight/index.html', '16-celeste/index.html',
  '17-cuphead/index.html', '18-dead-cells/index.html', '19-ori/index.html', '20-rayman/index.html',
  '21-chess/index.html', '22-snakes-ladders/index.html', '23-ludo/index.html', '24-carrom/index.html',
  '25-tycoon-town/index.html', '26-checkers/index.html', '27-connect-four/index.html', '28-mancala/index.html',
  '29-reversi/index.html', '30-tic-tac-toe/index.html', '31-backgammon/index.html', '32-dots-boxes/index.html',
  '33-go/index.html', '34-solitaire/index.html', '35-memory-match/index.html', '36-maths-dash/index.html',
  '37-pool/index.html', '38-bowling/index.html', '39-basketball/index.html', '40-mini-golf/index.html',
  '41-soccer-pool/index.html', '42-2048/index.html', '43-sudoku/index.html', '44-minesweeper/index.html',
  '45-sliding-puzzle/index.html', '46-nuts-bolts/index.html', '47-colour-sort/index.html', '48-fruit-merge/index.html',
  '49-table-tennis/index.html', '50-mahjong/index.html',
].map((file) => `${BASE_PATH}assets/games/${file}`);
const GAME_KITS = [
  'meta-config.js', 'meta-kit.js', 'perf-kit.js', 'arcade-core.js', 'platform-kit.js', 'act-kit.js', 'board-kit.js', 'board-art.js', 'save-kit.js', 'score-bridge.js',
  'fx-kit.js', 'ui-kit.js', 'music-kit.js', 'card-scenes.js', 'menu-kit.js', 'menu-kit.css', 'menu-bootstrap.js',
].map((file) => `${BASE_PATH}assets/kits/${file}`);
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
