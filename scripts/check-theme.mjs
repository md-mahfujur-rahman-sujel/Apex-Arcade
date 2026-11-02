#!/usr/bin/env node

// Guard against reintroducing light-theme selectors and hard-coded page-surface
// colors. Dark game engines and the isolated theater are intentionally excluded.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const stylesheetPath = join(root, 'src/index.css');
const stylesheet = readFileSync(stylesheetPath, 'utf8');
const failures = [];

if (/data-theme=['"]light['"]/.test(stylesheet)) {
  failures.push('src/index.css still contains a light-theme selector.');
}

const allowedThemeIndependentFiles = new Set(['PlayableTheaterModal.tsx', 'TheaterPauseOverlay.tsx']);
const rawColorUtility = /\b(?:bg|text|border)-\[#/;
const walk = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const info = statSync(path);
    if (info.isDirectory()) {
      if (entry !== 'engines') walk(path);
      continue;
    }
    if (!entry.endsWith('.tsx') || allowedThemeIndependentFiles.has(entry)) continue;
    const source = readFileSync(path, 'utf8');
    if (rawColorUtility.test(source)) {
      failures.push(`${relative(root, path)} contains a hard-coded Tailwind color utility.`);
    }
  }
};

walk(join(root, 'src/components'));

if (failures.length) {
  console.error('Theme checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Theme checks passed: light selectors are absent and component surfaces use tokens.');
}
