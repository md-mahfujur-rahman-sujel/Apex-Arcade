# Apex Arcade UI style guide

This guide covers the launcher and site chrome. The app is dark-only; game scenes and the theater share the same dark stage.

## Theme tokens

Use semantic Tailwind utilities backed by the CSS variables in `src/index.css`. The values below are the single dark palette defined on `:root`.

| Token | Use | Value |
|---|---|---|
| `bg` | Page background | `#08090E` |
| `surface` | Section panels, footer | `#0D111D` |
| `surface-2` | Raised controls, stat tiles | `#131826` |
| `card` | Cards and popovers | `#0F1322` |
| `sunken` | Inputs and recessed wells | `#080B14` |
| `stage` | Game and preview screens | `#070912` |
| `line` | Default border | `rgb(255 255 255 / 10%)` |
| `line-strong` | Emphasized border | `rgb(255 255 255 / 18%)` |
| `fg` | Primary text | `#F1F5F9` |
| `fg-muted` | Secondary text | `#94A3B8` |
| `fg-subtle` | Decorative, nonessential text | `#64748B` |
| `accent` | Links, selected controls, highlights | `#22D3EE` |
| `accent-hover` | Accent hover state | `#67E8F9` |
| `accent-fg` | Text on accent buttons | `#06222B` |
| `accent-soft` | Soft accent background | `rgb(34 211 238 / 12%)` |
| `success` | Success state | `#34D399` |
| `warning` | Warning state | `#FBBF24` |
| `danger` | Destructive/error state | `#FB7185` |

Use the matching utility names, such as `bg-card`, `text-fg-muted`, `border-line`, `text-accent`, and `bg-accent-soft`. Do not choose arbitrary token combinations for text: run `node scripts/contrast-check.mjs` when adding a new semantic pairing.

Cards use the `shadow-card` token; overlays use `shadow-pop`. The base card radius is `rounded-2xl`; controls use `rounded-xl`. Shared motion values are defined alongside the theme tokens. Honor reduced motion and avoid adding essential information that depends on animation.

## Shared components

Import from `src/components/ui/`:

| Component | Use |
|---|---|
| `Button` | Actions. Use `primary` for the main action, `secondary` for alternatives, and `ghost` for low-emphasis actions. |
| `Chip` | A selectable filter or toggle. Pass `selected`; it sets `aria-pressed`. |
| `Card` | A themed content surface. Set `interactive` only when the card itself has a keyboard interaction and accessible semantics. |
| `ScreenBezel` | A dark preview or chart stage that stays dark in both page themes. |
| `Input` / `Select` | Text entry and native selection controls with shared token, focus, and disabled styles. |

Examples:

```tsx
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { Select } from './ui/Input';

<Card className="p-5">
  <h2 className="text-fg">Filter games</h2>
  <Select aria-label="Sort games" value={sort} onChange={handleSort}>
    <option value="az">A to Z</option>
  </Select>
  <Chip selected={favoritesOnly} onClick={toggleFavorites}>Favorites</Chip>
  <Button variant="secondary" onClick={reset}>Reset</Button>
</Card>
```

## Adding a component

1. Build page surfaces with semantic tokens; keep literal colors only for documented preview/game-stage exceptions in `docs/LIGHT_UI_PRD.md` §7.
2. Reuse the shared primitives where their semantics fit. Use native buttons, links, inputs, and selects rather than clickable generic containers.
3. Give each control an accessible name, visible `focus-visible` treatment, hover and active feedback, disabled styling, and at least a 44 × 44 px target where it is an action.
4. Keep layout fluid: constrain content with `max-w-7xl`, use responsive grid/flex breakpoints, and place intentionally wide tables or filter strips in their own horizontal scrollers.
5. Check keyboard focus, reduced motion, and forced-colors behavior. The theater shares the dark palette.
6. Run `npm run lint`, `npm run build`, `npm run check:theme`, and `node scripts/contrast-check.mjs`.

## Theme and accessibility behavior

`<html>` is statically `data-theme="dark"`; there is no theme preference or toggle. Components consume tokens instead of reading or setting a page theme. The theater keeps its own dark scope. Global CSS disables animation and transitions for `prefers-reduced-motion`, and supplies system-color focus indicators in forced-colors mode.

For screenshot and browser QA instructions, see [UI_QA.md](./UI_QA.md).
