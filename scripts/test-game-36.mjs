import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}${(server.config.base || '/').replace(/\/$/, '')}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch {} }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1200, height: 950 } });
await context.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.includes('favicon')) errors.push(m.text() + ' @ ' + m.location().url); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(r.status() + ' ' + r.url()); });
await page.goto(`${origin}/assets/games/36-maths-dash/index.html?test=1`);
await page.waitForFunction(() => typeof MathsTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  // Play gates the run behind the beginning animation: read the live run only
  // once that gate has released.
  await page.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the board');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  const data = await page.evaluate(async () => {
    const T = MathsTest;
    const save = () => Save.load('maths-dash');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Classic: one answer, a hint, then a wrong answer. */
    T.setMode('classic');
    out.start = T.start();
    T.setQuestion(12, { fast: false });
    out.typed = T.type('1');
    out.solved = T.type('2');
    out.afterSolveAch = ach().slice();
    T.setScore(200);
    out.hint = T.hint();
    T.setQuestion(300, { fast: false });
    out.wrong = T.type('999');

    /* A twenty-answer streak unlocks the combo badges. */
    T.start();
    for (let i = 0; i < 20; i += 1) { T.setQuestion(5, { fast: false }); T.type('5'); }
    out.streak = T.state();
    out.streakAch = ach().slice();

    /* Finish Classic at the target. */
    T.start();
    T.setScore(600);
    out.classic = T.finish();
    out.classicModal = T.modalOpen();
    T.closeModal();

    /* Sprint at 1.15x. */
    out.sprintUnlock = T.setMode('sprint');
    T.start();
    T.setScore(400);
    out.sprint = T.finish();
    T.closeModal();

    /* Marathon at 1.3x. */
    T.setMode('marathon');
    T.start();
    T.setScore(1000);
    out.marathon = T.finish();
    T.closeModal();

    /* Accuracy: twenty-four answers at your own pace. */
    T.setMode('accuracy');
    out.accuracyStart = T.start();
    for (let i = 0; i < 24; i += 1) { T.setQuestion(5, { fast: false }); T.type('5'); }
    out.accuracy = T.state();
    out.accuracyModal = T.modalOpen();
    T.closeModal();

    /* Master unlock and clear. */
    out.masterUnlock = T.setMode('master');
    T.start();
    T.setScore(600);
    out.master = T.finish();
    T.closeModal();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'md:keys-cyan');
    out.palette = T.cosmetic('palette', 'md:panel-slate');
    out.accent = T.cosmetic('effect', 'md:accent-lime');
    out.theme = T.cosmetic('theme', 'md:theme-dusk');
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'sprint', 'marathon', 'accuracy', 'master']);
  assert.equal(data.locked, false, 'Master stays locked before a Classic clear');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.running, true);
  assert.equal(data.start.target, 600);
  assert.equal(data.start.remaining, 60000, 'Classic starts with a full minute');
  assert.equal(data.start.menuPaused, false, 'Play released the shared pause');
  assert.equal(data.typed.typed, '1', 'a partial answer waits for more digits');
  assert.equal(data.solved.right, 1, 'a complete answer scores');
  assert.equal(data.solved.score, 10, 'a first slow answer scores ten');
  assert.equal(data.solved.combo, 1);
  for (const id of ['first-sum']) assert.ok(data.afterSolveAch.includes(id), id + ' unlocked');
  assert.equal(data.hint.score, 150, 'the hint costs 50 points');
  assert.match(data.hint.note, /Hint revealed/);
  assert.equal(data.hint.reveal.length > 0, true, 'the hint shows an answer');
  assert.equal(data.wrong.wrong, 1, 'the wrong answer is counted');
  assert.equal(data.wrong.combo, 0, 'a miss resets the combo');
  assert.ok(data.wrong.remaining <= 57000, 'a miss costs three seconds');
  assert.equal(data.streak.combo, 20, 'twenty answers in a row');
  for (const id of ['combo-10', 'combo-20']) assert.ok(data.streakAch.includes(id), id + ' unlocked');

  assert.equal(data.classic.won, true);
  assert.equal(data.classic.overText, 'Cleared Classic with 1600 points');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classic.over, true);

  assert.equal(data.sprintUnlock, true);
  assert.equal(data.sprint.won, true);
  assert.equal(data.sprint.overText, 'Cleared Sprint with 1380 points');

  assert.equal(data.marathon.won, true);
  assert.equal(data.marathon.overText, 'Cleared Marathon with 3250 points');

  assert.equal(data.accuracyStart.quota, 24);
  assert.equal(data.accuracyStart.remaining, 0, 'Accuracy has no countdown');
  assert.equal(data.accuracy.right, 24);
  assert.equal(data.accuracy.won, true);
  assert.equal(data.accuracy.overText, 'Cleared Accuracy with 2280 points');
  assert.equal(data.accuracyModal, true);

  assert.equal(data.masterUnlock, true, 'a Classic clear unlocks Master');
  assert.equal(data.master.won, true);
  assert.equal(data.master.overText, 'Cleared Master with 3900 points');

  assert.equal(data.defaults.key, '#f97316', 'ember keys by default');
  assert.equal(data.defaults.panel, '#0c1226');
  assert.equal(data.defaults.accent, '#f97316');
  assert.equal(data.skin.key, '#22d3ee', 'Cyan Keys recolour the pad');
  assert.equal(data.palette.panel, '#111827', 'Slate Panel recolours the card');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(11, 7, 5\)/);
  assert.equal(data.cosmetics.length, 16, 'Maths Dash ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['md:keys-cyan', 'md:panel-slate', 'md:accent-lime', 'md:theme-dusk']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.wins, 5);
  assert.equal(data.stats.bestScore, 3900);
  assert.equal(data.stats.bestClassicScore, 1600);
  assert.equal(data.stats.bestSprintScore, 1380);
  assert.equal(data.stats.bestMarathonScore, 3250);
  assert.equal(data.stats.bestAccuracyScore, 2280);
  assert.equal(data.stats.bestMasterScore, 3900);
  assert.equal(data.stats.bestCombo, 24);
  assert.equal(data.stats.bestAccuracy, 100);
  assert.equal(data.stats.bestAccuracyTime, 1);
  assert.equal(data.stats.sumsAnswered, 24);
  assert.equal(data.stats.correctAnswers, 24);
  assert.equal(data.stats.wrongAnswers, 0);
  assert.equal(data.stats.classicWins, 1);
  for (const id of ['first-sum', 'combo-10', 'combo-20', 'perfect', 'quick-thinker', 'classic-clear', 'sprint-clear', 'marathon-clear', 'accuracy-clear', 'master-clear', 'high-score', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
