# Game 12 — Clockwork Dawn

## Pitch

Explore a 40×24 village, wilds, and Gear Gate as Kai and Mira; grow the party through randomized encounters; use Attack, Skill, Item, and Flee turns; buy supplies, rest, and defeat the 210 HP Clockwork Warden to open the dawn portal.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #FBBF24 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Story Journey:** preserve the authored village-to-Gear-Gate route, party growth, shops, inn, and Warden finale.
2. **Daily Dawn:** fixed local-day world obstacles and encounter sequence; keep battle outcomes reproducible for a seed and save the best score/time.
3. **Warden Rematch:** begin at the Gear Gate with a fixed level-4 party and standard supplies; score the boss fight only.
4. **New Dawn+:** after the story ending, restart the route with the saved party level and a stronger Warden; retain a separate completion count.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed or a wider timing/mistake allowance; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed or a stricter opponent/puzzle target; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve essential playfield feedback. |
| Reduced motion | Remove decorative movement, shake, and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep objects legible in colour-blind palettes. |

## Cosmetics

Plan 15 cosmetics across palette, board/craft/object skin, effects, and scene/theme slots as applicable to this game. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Run | complete one session | Common |
| Steady Hand | reach the first score milestone | Common |
| Quick Clear | finish within the target time | Common |
| Personal Best | set a new personal best | Rare |
| Daily Player | complete a seeded daily run | Rare |
| No Mistakes | finish without a mistake or lost life | Rare |
| Long Run | reach the long-run milestone | Rare |
| Perfect Round | complete a perfect round | Epic |
| Mastery | clear the highest standard challenge | Epic |
| Season Ace | meet the local season target | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: Arrows/WASD walk, Space confirm, X/Esc cancel or party status.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `12-chrono-adventure/index.html`; `Arcade.game` save id is `clockwork-dawn`. It builds a tile world with a village, bridge, wilds, and Gear Gate; the party starts with three potions, one ether, and 30 gold. Kai and Mira gain XP, stats, HP, and MP from wins; a shop sells potions/ethers and an inn fully restores the party for 10 gold. Encounters and combat damage use random values. The boss has 210 HP and must be defeated before entering the portal ends the run. Controls: arrows/WASD move, Space/Enter/Z confirm or talk, X/Escape/Backspace cancel/status, and number keys use items from status. This page currently lacks seeded randomness and a `UI.mountGame` config; proposed modes above need those additions.

## Menu Identity Card

- **Archetype:** Banner Frame.
- **Mood:** A small village waits beneath a turning brass sunwheel as the dawn portal begins to glow.
- **Palette:** `#14172a` background, `rgba(34,30,44,.86)` panel, `#fbbf24` accent, `#f2c66d` banner, `#33200f` banner text, `#fff8e7` body text.
- **Type:** System UI title and body fonts; keep the adventure copy crisp against the sunset scene.
- **Frame and buttons:** `sunrise-brasswork` frame with `gear-cut-banner` controls; warm, mechanical shapes distinguish this from Ember Serpent's dark basalt frame.
- **Scene recipe:** Dawn gradient, layered Hearthwick roofline silhouettes, sparse gold dust, and a large original brass sunwheel on the right side.
- **Music and UI sounds:** Slow Dorian bass, pad and lead; shared tick, select and back cues.
- **Menu items:** Play, Options, About, Exit. Story Journey is the existing game; proposed Daily Dawn, Warden Rematch and New Dawn+ are not advertised as available yet.
- **Settings:** Shared audio, display, controls and accessibility options; shared difficulty setting.
- **Cosmetics:** No cosmetics page until the proposed set is implemented.
- **Lite fallback:** Static village silhouette, brass sunwheel and dawn light.
