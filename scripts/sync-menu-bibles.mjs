import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const bootstrap = await readFile(path.join(root, 'public/assets/aistudio/menu-bootstrap.js'), 'utf8');
const bibleDir = path.join(root, 'docs/game-bibles');
const bibleFiles = await readdir(bibleDir);
const rowPattern = /^\s*\['([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']+)','([^']*)','([^']*)'\],$/gm;
for (const match of bootstrap.matchAll(rowPattern)) {
  const [, page, id, title, archetype, accent, motif, mood, controls] = match;
  const number = page.slice(0, 2);
  const bibleName = bibleFiles.find((name) => name.startsWith(`${number}-`) && name.endsWith('.md'));
  if (!bibleName) continue;
  const biblePath = path.join(bibleDir, bibleName);
  const source = await readFile(biblePath, 'utf8');
  if (source.includes('## Menu Identity Card')) continue;
  const card = `

## Menu Identity Card

- **Archetype:** ${archetype}.
- **Mood:** ${mood}
- **Palette:** \`#080d15\` background, \`color-mix(in srgb, ${accent} 8%, rgba(15,22,35,.94))\` panel, \`${accent}\` accent, \`color-mix(in srgb, ${accent} 76%, white)\` button, \`#10151e\` button text, \`#f6f7fb\` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title \`${motif}-frame\` frame and \`${motif}-banner\` button identity, using the shared ${archetype} treatment.
- **Scene recipe:** Original procedural ${motif} mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** ${controls}
- **Lite fallback:** Static ${motif} composition with the title accent and scene silhouette.
`;
  await writeFile(biblePath, source.trimEnd() + card, 'utf8');
}
