#!/usr/bin/env node
/*
 * One-shot migration: flat game pages -> public/assets/games/<NN-slug>/index.html,
 * shared kits -> public/assets/kits/, and every reference rewritten.
 *
 *   node scripts/migrate-games-to-folders.mjs                  # dry run
 *   node scripts/migrate-games-to-folders.mjs --verbose         # list every edit
 *   node scripts/migrate-games-to-folders.mjs --apply --allow-dirty
 *
 * Dry run is the default. --apply refuses a dirty working tree unless
 * --allow-dirty is also passed. --no-docs skips Markdown/Instructions edits.
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AISTUDIO = path.join(ROOT, 'public', 'assets', 'aistudio');
const GAMES_DIR = path.join(ROOT, 'public', 'assets', 'games');
const KITS_DIR = path.join(ROOT, 'public', 'assets', 'kits');
const SW_FILE = path.join(ROOT, 'public', 'sw.js');
const GAMES_DATA = path.join(ROOT, 'src', 'data', 'gamesData.ts');
const ID_MAP = path.join(ROOT, 'docs', 'ID_MAP.md');
const LAUNCHER = path.join(AISTUDIO, 'index.html');
const ROOT_INDEX = path.join(ROOT, 'index.html');
const INSTRUCTIONS = path.join(AISTUDIO, 'Instructions.txt');
const SELF = path.basename(fileURLToPath(import.meta.url));

const APPLY = process.argv.includes('--apply');
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');
const SKIP_DOCS = process.argv.includes('--no-docs');

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const exists = (file) => stat(file).then(() => true, () => false);
const fail = (message) => {
  console.error(`\nFAIL ${message}`);
  process.exit(1);
};
const note = (message) => console.log(message);

function encode(original, text) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const normalized = text.replace(/\r\n/g, '\n');
  return eol === '\r\n' ? normalized.replace(/\n/g, '\r\n') : normalized;
}

function replacePairs(text, pairs) {
  let out = text;
  let hits = 0;
  for (const [from, to] of pairs) {
    if (!from || !out.includes(from)) continue;
    const parts = out.split(from);
    hits += parts.length - 1;
    out = parts.join(to);
  }
  return { text: out, hits };
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      found.push(...await walk(full));
    } else {
      found.push(full);
    }
  }
  return found;
}

const ops = [];
const warnings = [];
const planned = new Set();

function planWrite(file, original, next, label) {
  if (original === next) return false;
  if (planned.has(file)) fail(`Duplicate write plan for ${rel(file)}`);
  planned.add(file);
  ops.push({ kind: 'write', file, original, next, label });
  return true;
}

function planMove(from, to, original, next, label) {
  if (planned.has(from) || planned.has(to)) fail(`Duplicate move plan for ${rel(from)}`);
  planned.add(from);
  planned.add(to);
  ops.push({ kind: 'move', from, to, original, next, label });
  return true;
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

const entries = (await readdir(AISTUDIO)).sort();
const gameFiles = entries.filter((name) => /^\d{2}-[a-z0-9-]+\.html$/.test(name));
const kitFiles = entries.filter((name) => /\.(?:js|css)$/.test(name));

if (gameFiles.length !== 50) {
  fail(`Found ${gameFiles.length} flat game pages in ${rel(AISTUDIO)}; expected 50. If the migration already ran, restore the original layout before rerunning.`);
}

const games = gameFiles.map((file) => {
  const stem = file.replace(/\.html$/, '');
  return {
    file,
    stem,
    from: path.join(AISTUDIO, file),
    dir: path.join(GAMES_DIR, stem),
    to: path.join(GAMES_DIR, stem, 'index.html'),
  };
});

const numbers = games.map((game) => game.stem.slice(0, 2));
if (new Set(numbers).size !== 50) fail('Game numbers are not unique; refusing to migrate.');

for (const game of games) {
  if (await exists(game.to)) fail(`Destination already exists: ${rel(game.to)}`);
}
for (const kit of kitFiles) {
  if (await exists(path.join(KITS_DIR, kit))) fail(`Kit destination already exists: public/assets/kits/${kit}`);
}

if (APPLY && !ALLOW_DIRTY) {
  let status = '';
  try {
    status = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  } catch {
    status = '';
  }
  const dirty = status
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.includes(SELF));
  if (dirty.length) {
    fail(`Working tree has ${dirty.length} uncommitted change(s). Commit or stash first, or rerun with --allow-dirty.`);
  }
}

const gamePathPairs = [];
for (const game of games) {
  gamePathPairs.push([`/assets/aistudio/${game.file}`, `/assets/games/${game.stem}/index.html`]);
  gamePathPairs.push([`assets/aistudio/${game.file}`, `assets/games/${game.stem}/index.html`]);
}
const kitPathPairs = [];
for (const kit of kitFiles) {
  kitPathPairs.push([`/assets/aistudio/${kit}`, `/assets/kits/${kit}`]);
  kitPathPairs.push([`assets/aistudio/${kit}`, `assets/kits/${kit}`]);
}
const allPathPairs = [...gamePathPairs, ...kitPathPairs];

// Game pages: rewrite kit <script>/<link> refs, then move to the new folder.
const kitSet = new Set(kitFiles);
for (const game of games) {
  const original = await readFile(game.from, 'utf8');
  let html = original;
  let kitHits = 0;
  html = html.replace(/\b(src|href)=(["'])([^"']+)\2/g, (match, attr, quote, value) => {
    const base = value.split('/').pop();
    if (!kitSet.has(base) || value === `../../kits/${base}`) return match;
    kitHits += 1;
    return `${attr}=${quote}../../kits/${base}${quote}`;
  });
  const absolute = replacePairs(html, allPathPairs);
  if (absolute.hits) kitHits += absolute.hits;
  html = absolute.text.replace(/(<link\b[^>]*\bhref=["'])\/apex-icon\.svg(["'])/gi, '$1../../../apex-icon.svg$2');
  planMove(game.from, game.to, original, html, `${rel(game.from)} -> ${rel(game.to)} (${kitHits} kit refs)`);
}

// menu-bootstrap: key rows by folder, look the folder up from the URL.
const BOOTSTRAP = path.join(AISTUDIO, 'menu-bootstrap.js');
const bootstrapOriginal = await readFile(BOOTSTRAP, 'utf8');
let bootstrap = bootstrapOriginal;
let rowHits = 0;
for (const game of games) {
  const pattern = new RegExp(`(['"])${game.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
  bootstrap = bootstrap.replace(pattern, (match, quote) => {
    rowHits += 1;
    return `${quote}${game.stem}${quote}`;
  });
}
const oldLookup = "var file = decodeURIComponent(global.location.pathname.split('/').pop() || ''), item = byFile[file];";
if (!bootstrap.includes(oldLookup)) {
  fail('menu-bootstrap.js lookup line changed; update the migration script before running it.');
}
bootstrap = bootstrap.replace(oldLookup, [
  "var parts = global.location.pathname.split('/').filter(Boolean);",
  "    var last = decodeURIComponent(parts[parts.length - 1] || '');",
  "    var folder = decodeURIComponent(parts[parts.length - (last === 'index.html' ? 2 : 1)] || '');",
  "    var item = byFile[folder] || byFile[last];",
].join('\n    '));
planMove(BOOTSTRAP, path.join(KITS_DIR, 'menu-bootstrap.js'), bootstrapOriginal, bootstrap, `menu-bootstrap.js (${rowHits} rows)`);

// All other kits move unchanged; menu-kit.css resolves from menu-kit.js's own URL.
for (const kit of kitFiles) {
  if (kit === 'menu-bootstrap.js') continue;
  const from = path.join(AISTUDIO, kit);
  const original = await readFile(from);
  planMove(from, path.join(KITS_DIR, kit), original, original, `kits/${kit}`);
}

// Catalog paths.
const gamesDataOriginal = await readFile(GAMES_DATA, 'utf8');
const gamesData = replacePairs(gamesDataOriginal, gamePathPairs);
planWrite(GAMES_DATA, gamesDataOriginal, gamesData.text, `gamesData.ts (${gamesData.hits} paths)`);

// Legacy standalone launcher.
const launcherOriginal = await readFile(LAUNCHER, 'utf8');
let launcher = launcherOriginal;
let launcherHits = 0;
for (const game of games) {
  const from = `file:'${game.file}'`;
  const to = `file:'../games/${game.stem}/index.html'`;
  if (launcher.includes(from)) {
    launcher = launcher.split(from).join(to);
    launcherHits += 1;
  }
}
if (launcher.includes('src="card-scenes.js"')) {
  launcher = launcher.replace('src="card-scenes.js"', 'src="../kits/card-scenes.js"');
  launcherHits += 1;
}
const footerPattern = /Keep <code>[\s\S]*?<\/code> in the same folder as the game files\./;
if (footerPattern.test(launcher)) {
  launcher = launcher.replace(footerPattern, 'Shared kits live in <code>assets/kits/</code>; game pages load them with <code>../../kits/</code>.');
  launcherHits += 1;
}
const launcherPaths = replacePairs(launcher, allPathPairs);
launcher = launcherPaths.text;
launcherHits += launcherPaths.hits;
if (launcherHits !== 50 + 2) {
  warnings.push(`Launcher rewrite touched ${launcherHits} sites; expected 52 (50 cards, card-scenes, footer). Review it manually.`);
}
planWrite(LAUNCHER, launcherOriginal, launcher, `legacy launcher (${launcherHits} refs)`);

// Service worker: regenerate the game list, move the kit base, bump the cache.
const swOriginal = await readFile(SW_FILE, 'utf8');
let sw = swOriginal;
const gameBlockStart = sw.indexOf('const GAME_FILES = [');
const gameBlockMap = '].map((file) => `${BASE_PATH}assets/aistudio/${file}`);';
const gameBlockEnd = sw.indexOf(gameBlockMap, gameBlockStart);
if (gameBlockStart < 0 || gameBlockEnd < 0) {
  fail('Could not find the GAME_FILES block in public/sw.js.');
}
const gameEntries = games.map((game) => `'${game.stem}/index.html'`);
const rows = [];
for (let index = 0; index < gameEntries.length; index += 4) {
  rows.push(`  ${gameEntries.slice(index, index + 4).join(', ')},`);
}
const newGameBlock = [
  'const GAME_FILES = [',
  ...rows,
  '].map((file) => `${BASE_PATH}assets/games/${file}`);',
].join('\n');
sw = sw.slice(0, gameBlockStart) + newGameBlock + sw.slice(gameBlockEnd + gameBlockMap.length);
const kitBaseHits = sw.split('assets/aistudio/').length - 1;
sw = sw.split('assets/aistudio/').join('assets/kits/');
if (kitBaseHits !== 1) {
  warnings.push(`sw.js had ${kitBaseHits} remaining aistudio base paths; expected 1 for GAME_KITS.`);
}
sw = sw.replace(/const CACHE_NAME = 'apex-arcade-v(\d+)';/, (match, version) => `const CACHE_NAME = 'apex-arcade-v${Number(version) + 1}';`);
planWrite(SW_FILE, swOriginal, sw, 'sw.js (game list, kit base, cache version)');

// Source and test references.
const codeFiles = [
  ...await walk(path.join(ROOT, 'src')),
  ...await walk(path.join(ROOT, 'scripts')),
  ROOT_INDEX,
].filter((file) => (path.resolve(file) === ROOT_INDEX || /\.(?:ts|tsx|mjs|js)$/.test(file))
  && path.basename(file) !== SELF && path.resolve(file) !== path.resolve(GAMES_DATA));

const bareGamePairs = games.map((game) => [game.file, `${game.stem}/index.html`]);
for (const file of codeFiles) {
  const original = await readFile(file, 'utf8');
  const pathHits = replacePairs(original, allPathPairs);
  const bare = replacePairs(pathHits.text, bareGamePairs);
  const genericHits = bare.text.split('/assets/aistudio/').length - 1;
  const next = bare.text.replace(/\/assets\/aistudio\//g, '/assets/games/').replace(/"?assets\/aistudio\/"?/g, (match) => match.replace('aistudio', 'games'));
  if (next !== original) planWrite(file, original, next, `${rel(file)} (${pathHits.hits + bare.hits + genericHits} refs)`);
}

// Documentation.
if (!SKIP_DOCS) {
  const docs = [path.join(ROOT, 'README.md'), INSTRUCTIONS];
  for (const file of await walk(path.join(ROOT, 'docs'))) {
    if (file.endsWith('.md') && !file.includes(`${path.sep}archive${path.sep}`)) docs.push(file);
  }
  const docExact = [
    ['50 single-file HTML pages in `public/assets/aistudio/`, numbered `01-...html` to `50-...html`', '50 single-page games in `public/assets/games/<NN-slug>/index.html`'],
    ['Shared kits (`public/assets/aistudio/*.js`)', 'Shared kits (`public/assets/kits/*.js`)'],
    ['- `public/assets/aistudio/` — canonical standalone game pages and shared game kits. The suffixed hash twins are retained project assets; app code uses the canonical filenames.', '- `public/assets/games/<NN-slug>/index.html` — canonical standalone game pages.\n- `public/assets/kits/` — shared kits loaded by every game page.'],
    ['Game links use `#game=<game-id>`, for example `#game=flappy-bird`.', 'Game links use `#/game/<game-id>`, for example `#/game/flappy-bird`.'],
    ['Keep `service-worker.js` at the root', 'Keep `sw.js` at the root'],
    ['You can also open a numbered .html file below directly. Keep its referenced kit scripts (for example perf-kit.js, arcade-core.js, board-kit.js, save-kit.js, and score-bridge.js) alongside the page in assets/aistudio/.', "You can also open each game's index.html directly from its folder under assets/games/. Shared kit scripts (for example perf-kit.js, arcade-core.js, board-kit.js, save-kit.js, and score-bridge.js) live in assets/kits/."],
  ];
  const bareBacktick = /\`(\d{2}-[a-z0-9-]+)\.html\`/g;
  for (const file of docs) {
    if (!await exists(file)) continue;
    const original = await readFile(file, 'utf8');
    let next = replacePairs(original, allPathPairs).text;
    next = replacePairs(next, docExact).text;
    next = next.replace(/public\/assets\/aistudio\/(?!Instructions\.txt)/g, 'public/assets/games/');
    next = next.replace(/assets\/aistudio\/(?!Instructions\.txt)/g, 'assets/games/');
    next = next.replace(bareBacktick, '`$1/index.html`');
    if (file === INSTRUCTIONS) next = next.replace(/(\d{2}-[a-z0-9-]+)\.html/g, '$1/index.html');
    if (next !== original) planWrite(file, original, next, `${rel(file)} (docs)`);
  }
}

// ---------------------------------------------------------------------------
// Validate the planned output before touching disk
// ---------------------------------------------------------------------------

const plannedText = (file) => {
  const op = ops.find((entry) => entry.kind === 'write' ? entry.file === file : entry.to === file);
  return op ? op.next.toString('utf8') : '';
};

const catalog = plannedText(GAMES_DATA);
const catalogCount = (catalog.match(/htmlPath:\s*'\/assets\/games\/\d{2}-[a-z0-9-]+\/index\.html'/g) || []).length;
if (catalogCount !== 50) fail(`gamesData.ts plans ${catalogCount} new htmlPath values; expected 50.`);
if (catalog.includes('/assets/aistudio/')) fail('gamesData.ts still references /assets/aistudio/.');

const idMap = plannedText(ID_MAP);
const idMapCount = (idMap.match(/\| `\/assets\/games\/\d{2}-[a-z0-9-]+\/index\.html` \|/g) || []).length;
if (idMapCount !== 50) fail(`docs/ID_MAP.md plans ${idMapCount} new htmlPath rows; expected 50.`);
if (idMap.includes('/assets/aistudio/')) fail('docs/ID_MAP.md still references /assets/aistudio/.');

const plannedSw = plannedText(SW_FILE);
if (!plannedSw.includes('assets/games/') || !plannedSw.includes('assets/kits/')) fail('sw.js plan is missing the new bases.');
if (plannedSw.includes('assets/aistudio/')) fail('sw.js plan still references assets/aistudio/.');
if ((plannedSw.match(/\d{2}-[a-z0-9-]+\/index\.html/g) || []).length !== 50) fail('sw.js plan does not list 50 game entries.');

const plannedBootstrap = plannedText(path.join(KITS_DIR, 'menu-bootstrap.js'));
if (/^\s*\['\d{2}-[a-z0-9-]+\.html',/m.test(plannedBootstrap)) fail('menu-bootstrap.js still keys rows by .html filenames.');
if ((plannedBootstrap.match(/^\s*\['\d{2}-[a-z0-9-]+',/gm) || []).length !== rowHits) fail('menu-bootstrap.js row rewrite is incomplete.');
if (!plannedBootstrap.includes('byFile[folder]')) fail('menu-bootstrap.js folder lookup was not applied.');

const plannedLauncher = plannedText(LAUNCHER);
const launcherCards = (plannedLauncher.match(/file:'\.\.\/games\/\d{2}-[a-z0-9-]+\/index\.html'/g) || []).length;
if (launcherCards !== 50) fail(`Legacy launcher plans ${launcherCards} game cards; expected 50.`);

for (const game of games) {
  const html = plannedText(game.to);
  if (!html) fail(`No planned content for ${rel(game.to)}.`);
  if (/<script[^>]+src="(?!\.\.\/\.\.\/kits\/)[^"]+\.js"/.test(html)) {
    const bare = html.match(/<script[^>]+src="([^"]+\.js)"/g)?.filter((tag) => !tag.includes('src="../../kits/'));
    if (bare?.length) fail(`${rel(game.to)} still loads a script outside ../../kits/: ${bare[0]}`);
  }
  if (html.includes('assets/aistudio/')) fail(`${rel(game.to)} still references assets/aistudio/.`);
}

// Leftover scan for code and docs that the script intentionally did not edit.
const scanFiles = [
  ...await walk(path.join(ROOT, 'src')),
  ...await walk(path.join(ROOT, 'scripts')),
  ROOT_INDEX,
  path.join(ROOT, 'public', 'sw.js'),
  LAUNCHER,
];
const ignored = new Set([SELF]);
const plannedByFile = new Map();
for (const op of ops) {
  const target = op.kind === 'write' ? op.file : op.to;
  plannedByFile.set(path.resolve(target), op.next);
}
const leftovers = [];
for (const file of scanFiles) {
  if (ignored.has(path.basename(file))) continue;
  if (!/\.(?:ts|tsx|mjs|js|html|css)$/.test(file)) continue;
  const plannedFile = plannedByFile.get(path.resolve(file));
  const text = plannedFile !== undefined ? plannedFile.toString('utf8') : await readFile(file, 'utf8');
  if (text.includes('assets/aistudio/')) leftovers.push(rel(file));
}
if (leftovers.length) fail(`Unrewritten code references remain in:\n  ${leftovers.join('\n  ')}`);

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

note(`\nApex Arcade folder migration (${APPLY ? 'APPLY' : 'DRY RUN'})`);
note(`  games:  ${games.length} -> public/assets/games/<NN-slug>/index.html`);
note(`  kits:   ${kitFiles.length} -> public/assets/kits/`);
note(`  edits:  ${ops.filter((op) => op.kind === 'write').length} in-place files`);
note(`  moves:  ${ops.filter((op) => op.kind === 'move').length} files`);
note('\nGame folders:');
for (const game of games) note(`  ${game.file.padEnd(28)} -> games/${game.stem}/index.html`);
if (process.argv.includes('--verbose')) {
  note('\nIn-place edits:');
  for (const op of ops) if (op.kind === 'write') note(`  ${op.label}`);
  note('\nKit moves:');
  for (const op of ops) if (op.kind === 'move' && op.to.includes(`${path.sep}kits${path.sep}`)) note(`  ${rel(op.from)} -> ${rel(op.to)}`);
}
if (warnings.length) {
  note('\nWarnings:');
  for (const warning of warnings) note(`  ! ${warning}`);
}

if (!APPLY) {
  note('\nDry run only. Re-run with --apply --allow-dirty to write these changes.');
  note('Recommended: commit or stash current work first so the move is reviewable.');
  process.exit(0);
}

for (const op of ops) {
  if (op.kind === 'move') {
    await mkdir(path.dirname(op.to), { recursive: true });
    await writeFile(op.to, encode(op.original.toString('utf8'), op.next.toString('utf8')), 'utf8');
    await unlink(op.from);
  } else {
    await writeFile(op.file, encode(op.original, op.next), 'utf8');
  }
}

note(`\nApplied ${ops.length} operations.`);
note('Next:');
note('  1. npm run lint');
note('  2. npm run build');
note('  3. npm run test:smoke');
note('  4. npm run test:pwa && npm run test:theater && npm run test:theater-engines && npm run test:menu-pilots');
note('  5. Review docs/APEX_NEXT_PRD.md for historical path prose; the script only rewrites exact current references.');
