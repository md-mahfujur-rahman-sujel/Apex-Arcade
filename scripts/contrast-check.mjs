#!/usr/bin/env node

// WCAG 2.2 relative luminance contrast checks for the dark palette declared in
// src/index.css. No dependencies are required.

const colors = {
  bg: '#08090E',
  surface: '#0D111D',
  surface2: '#131826',
  card: '#0F1322',
  sunken: '#080B14',
  stage: '#070912',
  fg: '#F1F5F9',
  fgMuted: '#94A3B8',
  fgSubtle: '#64748B',
  accent: '#22D3EE',
  accentHover: '#67E8F9',
  accentFg: '#06222B',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#FB7185',
};

const luminance = (hex) => {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255);
  const [r, g, b] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (foreground, background) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

// These are the intended text/background combinations. Subtle text is
// decorative only (§4.1); status and accent colors are labels/icons here.
const pairs = [
  ...['fg', 'fgMuted'].flatMap((foreground) =>
    ['bg', 'surface', 'surface2', 'card', 'sunken'].map((background) => ({
      foreground,
      background,
      minimum: 4.5,
    })),
  ),
  ...['fg', 'fgMuted', 'fgSubtle', 'accent', 'accentHover', 'success', 'warning', 'danger'].map(
    (foreground) => ({ foreground, background: 'stage', minimum: foreground === 'fgSubtle' ? 3 : 4.5 }),
  ),
  { foreground: 'accent', background: 'bg', minimum: 3 },
  { foreground: 'accent', background: 'surface', minimum: 3 },
  { foreground: 'accent', background: 'card', minimum: 3 },
  { foreground: 'accentFg', background: 'accent', minimum: 4.5 },
  { foreground: 'accentFg', background: 'accentHover', minimum: 4.5 },
  ...['success', 'warning', 'danger'].map((foreground) => ({
    foreground,
    background: 'bg',
    minimum: 3,
  })),
];

let failures = 0;
console.log('DARK THEME');
for (const { foreground, background, minimum } of pairs) {
  const value = ratio(colors[foreground], colors[background]);
  const passed = value >= minimum;
  if (!passed) failures += 1;
  console.log(
    `${passed ? 'PASS' : 'FAIL'} ${foreground} on ${background}: ${value.toFixed(2)}:1 (minimum ${minimum}:1)`,
  );
}

if (failures) {
  console.error(`\n${failures} contrast pair(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\nAll declared text and accent contrast pairs pass.');
}
