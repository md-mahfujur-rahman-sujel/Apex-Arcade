# Apex Arcade menu font shortlist

Prepared for PRD task M0-2 · 23 Oct 2026

## Proposed five-family set

The existing site already references Plus Jakarta Sans and JetBrains Mono from Google Fonts. Keep those roles, then add three display families for game-menu identity. That stays within the PRD limit of five families across the site.

| Family | Use | Proposed styles | Estimated Latin WOFF2 budget* | License/source |
|---|---|---|---:|---|
| Plus Jakarta Sans | Shared body copy, labels, readable menus | Variable 400–800; upright only | 70–100 KB | [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/plusjakartasans) · [OFL 1.1](https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt) |
| JetBrains Mono | Scores, small status labels, technical readouts | Variable 400–700; upright only | 50–80 KB | [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/jetbrainsmono) · [OFL 1.1](https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt) |
| Cinzel | Banner Frame and story-driven title treatments | Variable 500–700; title use only | 30–50 KB | [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/cinzel) · [OFL 1.1](https://github.com/google/fonts/blob/main/ofl/cinzel/OFL.txt) |
| Orbitron | Neon Marquee and Machine Panel display accents | Variable 500–700; title and short labels only | 40–65 KB | [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/orbitron) · [OFL 1.1](https://github.com/google/fonts/blob/main/ofl/orbitron/OFL.txt) |
| Fredoka | Storybook and playful menu titles | Variable 500–700; title use only | 30–50 KB | [Google Fonts family](https://github.com/google/fonts/tree/main/ofl/fredoka) · [OFL 1.1](https://github.com/google/fonts/blob/main/ofl/fredoka/OFL.txt) |

**Estimated total:** 220–345 KB of Latin-only WOFF2 font data, before small license text files. Keep JetBrains Mono and the three display families out of long paragraphs; use the shared sans for menu descriptions and controls. Use the system monospace stack for Pixel CRT if its look can be achieved without adding another family. This avoids the small-size legibility cost of Press Start 2P and keeps the set at five.

## Subsetting and delivery proposal

- Build static Latin subsets for the glyphs used by the English game names, punctuation, and menu labels; include the Latin Extended characters already used in game titles only if a title needs them.
- Self-host WOFF2 under `public/assets/fonts/`, declare only the approved weights, and add each exact upstream OFL file beside the font.
- Use `font-display: swap`; keep the existing system fallback stacks so menus render immediately offline.
- Remove the Google Fonts stylesheet and preconnect from `index.html` when the self-hosted files replace it. Do not leave a runtime font request to Google.
- Retain the original, unmodified font binaries and license notices. Do not subset or rename internal family names unless the tooling preserves the license requirements.

## Size estimate notes

The ranges are planning budgets for Latin WOFF2 output, not measured artifacts. No font binaries were downloaded for this proposal. Actual size depends on the selected axis ranges and glyph subset; record exact byte counts after the owner approves the families and the project builds the local subsets. The Google Fonts family directories provide upstream font metadata and the per-family license text. The SIL Open Font License permits redistribution when its notice accompanies the font; the exact license should ship with each approved family.

## Decision requested

Approve all five proposed families, or name any replacements. Font files and license assets remain unadded until this approval, as required by M0-2 and decision M3 in `docs/MENU_SYSTEM_PRD.md`.
