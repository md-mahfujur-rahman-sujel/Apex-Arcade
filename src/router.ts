export type AppRoute =
  | { type: 'home' }
  | { type: 'browse'; query: URLSearchParams }
  | { type: 'game'; id: string }
  | { type: 'play'; id: string; query: URLSearchParams }
  | { type: 'profile' }
  | { type: 'quests' }
  | { type: 'collections'; slug?: string }
  | { type: 'settings' }
  | { type: 'not-found'; path: string };

const NAV_EVENT = 'apex:route-change';

function decode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}

function canonicalizeLegacyGameHash(): void {
  const match = window.location.hash.match(/^#game=([^&]+)/);
  if (!match) return;
  const id = decode(match[1]);
  const query = new URLSearchParams(window.location.hash.split('&').slice(1).join('&'));
  const suffix = query.toString();
  const hash = `#/play/${encodeURIComponent(id)}${suffix ? `?${suffix}` : ''}`;
  window.history.replaceState({ ...(window.history.state || {}), apexRoute: hash, apexDeepLinkedPlay: true }, '', hash);
}

export function readRoute(hash = window.location.hash): AppRoute {
  if (hash.startsWith('#game=')) {
    canonicalizeLegacyGameHash();
    hash = window.location.hash;
  }
  const normalized = hash.startsWith('#/') ? hash.slice(2) : hash.replace(/^#/, '');
  const [pathname = '', queryString = ''] = normalized.split('?');
  const query = new URLSearchParams(queryString);
  if (!pathname || pathname === '/') return { type: 'home' };
  if (pathname === 'browse') return { type: 'browse', query };
  if (pathname === 'profile') return { type: 'profile' };
  if (pathname === 'quests') return { type: 'quests' };
  if (pathname === 'settings') return { type: 'settings' };
  const collection = pathname.match(/^collections(?:\/(.*))?$/);
  if (collection) return { type: 'collections', slug: collection[1] ? decode(collection[1]) : undefined };
  const game = pathname.match(/^game\/(.+)$/);
  if (game) return { type: 'game', id: decode(game[1]) };
  const play = pathname.match(/^play\/(.+)$/);
  if (play) return { type: 'play', id: decode(play[1]), query };
  return { type: 'not-found', path: `/${pathname}` };
}

function routeHash(route: Exclude<AppRoute, { type: 'not-found' }>): string {
  switch (route.type) {
    case 'home': return '#/';
    case 'browse': return `#/browse${route.query.size ? `?${route.query.toString()}` : ''}`;
    case 'game': return `#/game/${encodeURIComponent(route.id)}`;
    case 'play': return `#/play/${encodeURIComponent(route.id)}${route.query.size ? `?${route.query.toString()}` : ''}`;
    case 'profile': return '#/profile';
    case 'quests': return '#/quests';
    case 'collections': return route.slug ? `#/collections/${encodeURIComponent(route.slug)}` : '#/collections';
    case 'settings': return '#/settings';
  }
}

export function navigate(route: Exclude<AppRoute, { type: 'not-found' }>, options: { replace?: boolean } = {}): void {
  const nextHash = routeHash(route);
  const previousHash = window.location.hash || '#/';
  const state = {
    ...(window.history.state || {}),
    apexRoute: nextHash,
    ...(route.type === 'play' ? { apexPreviousHash: previousHash, apexDeepLinkedPlay: false } : {}),
  };
  window.history[options.replace ? 'replaceState' : 'pushState'](state, '', nextHash);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function closePlayRoute(): void {
  if (window.history.state?.apexPreviousHash) {
    window.history.back();
    return;
  }
  window.history.replaceState({ apexRoute: '#/' }, '', '#/');
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function subscribeToRoute(listener: (route: AppRoute) => void): () => void {
  const sync = () => listener(readRoute());
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  window.addEventListener(NAV_EVENT, sync);
  return () => {
    window.removeEventListener('hashchange', sync);
    window.removeEventListener('popstate', sync);
    window.removeEventListener(NAV_EVENT, sync);
  };
}
