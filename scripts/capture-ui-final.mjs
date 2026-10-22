import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const outputDir = path.resolve('docs/baseline');
const chromePath = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const viewports = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 900 },
  { name: '1440', width: 1440, height: 1000 },
];
const pageSections = [
  ['header', 'header'],
  ['launcher', '[aria-label="Arcade home"]'],
  ['catalog', '#catalog'],
  ['telemetry', '#telemetry'],
  ['about', '#about'],
  ['profile', '#profile'],
  ['footer', 'footer'],
];

if (!existsSync(chromePath)) {
  throw new Error(`Chrome was not found at ${chromePath}. Set CHROME_BIN to the installed Chrome executable.`);
}

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: chromePath });

async function newThemePage(theme, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((preference) => {
    localStorage.setItem('apex-arcade-theme', preference);
  }, theme);
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-catalog-card]').first().waitFor({ timeout: 30000 });
  const cardCount = await page.locator('[data-catalog-card]').count();
  if (cardCount !== 50) throw new Error(`Expected 50 catalog cards, found ${cardCount}.`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-hero-stage] canvas');
    if (!window.Scenes?.S?.[1] || !canvas) return false;
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) return false;
    let paintedPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 22 || pixels[i + 1] > 22 || pixels[i + 2] > 22) paintedPixels++;
    }
    return paintedPixels > 500;
  }, null, { timeout: 20000 });
  return { context, page };
}

async function waitForVisibleCardCanvases(page) {
  try {
    await page.waitForFunction(() => {
    const visibleCanvases = [...document.querySelectorAll('[data-card-scene-canvas]')].filter((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    });
    return visibleCanvases.every((canvas) => {
      if (canvas.width < 300 || canvas.height < 128) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let paintedPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) paintedPixels++;
        if (paintedPixels >= 150) return true;
      }
      return false;
    });
    }, null, { timeout: 15000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => [...document.querySelectorAll('[data-card-scene-canvas]')]
      .filter((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      })
      .map((canvas) => {
        const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
        let paintedPixels = 0;
        if (pixels) for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) paintedPixels++;
        return { width: canvas.width, height: canvas.height, paintedPixels };
      }));
    throw new Error(`Visible card canvas paint check timed out: ${JSON.stringify(diagnostics)}`, { cause: error });
  }
  await page.waitForTimeout(60);
  return page.evaluate(() => [...document.querySelectorAll('[data-card-scene-canvas]')].filter((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }).length);
}

async function revealPage(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const step = Math.max(180, Math.floor(viewportHeight * 0.7));
  let verifiedCardCanvasSamples = 0;

  // Scroll through the document so section entrance observers and lazy card-scene
  // observers run before Playwright takes a full-page screenshot.
  for (let top = 0; top < await page.evaluate(() => document.documentElement.scrollHeight); top += step) {
    await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), top);
    await page.waitForTimeout(80);
    verifiedCardCanvasSamples += await waitForVisibleCardCanvases(page);
  }

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  verifiedCardCanvasSamples += await waitForVisibleCardCanvases(page);
  if (verifiedCardCanvasSamples === 0) throw new Error('No card preview canvases were sampled during page capture.');

  const sections = await page.evaluate((selectors) => selectors.map(([name, selector]) => {
    const element = document.querySelector(selector);
    if (!element) return { name, visible: false };
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { name, visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && Number(style.opacity) > 0 };
  }), pageSections);
  const missingSections = sections.filter((section) => !section.visible).map((section) => section.name);
  if (missingSections.length) throw new Error(`Sections missing or hidden after scroll: ${missingSections.join(', ')}`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForVisibleCardCanvases(page);
}

async function savePage(page, filename) {
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (theme !== filename.split('-')[0]) {
    throw new Error(`${filename}: expected theme ${filename.split('-')[0]}, got ${theme}`);
  }
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    content: [...document.body.querySelectorAll('*')]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position === 'fixed' || style.position === 'absolute') return false;
        if (element.closest('.no-scrollbar, .overflow-x-auto, .overflow-x-scroll')) return false;
        if (element.closest('.truncate')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
      })
      .slice(0, 5)
      .map((element) => ({ tag: element.tagName, className: String(element.className).slice(0, 70), right: Math.round(element.getBoundingClientRect().right) })),
  }));
  const horizontalOverflow = overflow.document > overflow.viewport + 1 || overflow.body > overflow.viewport + 1 || overflow.content.length > 0;
  console.log(`${filename}: ${horizontalOverflow ? 'CHECK OVERFLOW' : 'width ok'} (${JSON.stringify(overflow)})`);
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: true, animations: 'disabled' });
}

try {
  for (const theme of ['dark', 'light']) {
    for (const viewport of viewports) {
      const { context, page } = await newThemePage(theme, viewport);
      await revealPage(page);
      await savePage(page, `${theme}-${viewport.name}-full.png`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`Baseline screenshots saved in ${outputDir}`);
