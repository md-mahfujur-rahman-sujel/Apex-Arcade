# Implementation Plan: Table Tennis Engine Refactor, Performance Engine Auto-Tiering & Responsive Cross-Platform Stabilization

Stabilize and elevate Apex Arcade across all devices—from entry-level smartphones to high-refresh desktop gaming rigs. This plan refactors the Table Tennis simulation engine with zero-allocation object pooling, eliminates telemetry rendering thrash with adaptive hardware tiering, and delivers a cohesive Responsive Web Design (RWD) system.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural choices have been confirmed through user clarification:
> - **Performance Engine Adaptation**: **Auto-tiering based on device hardware performance**. The telemetry hub and graphics pipelines will dynamically classify hardware into `Ultra` (120+ Hz), `Standard` (60 Hz), and `Lite` (low-power/mobile), auto-scaling particle densities, visual effects, and canvas resolutions.
> - **Responsive Web Design & Mobile Touch**: **Adaptive viewport scaling with virtual touch controls**. Mobile users receive full-bleed touch-friendly game containers, touch reach sliders, responsive navigation, and horizontal scroll filter strips with 44px minimum touch targets.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Table Tennis Pro Refactor (`49-table-tennis.html`)**: Implements strict object pooling for particles, sound buffers, trajectory predictors, and bat motion histories, combined with a deterministic fixed-timestep game loop (`120Hz` physics with interpolation).
  2. **Performance Engine & Telemetry Stabilization (`TelemetryDashboard.tsx`)**: Eliminates the 300ms React state thrashing that caused chart jitter and micro-stutters. Implements a hardware auto-tiering system, an exponential-moving-average (EMA) smoothed oscilloscope, and viewport-aware observation so telemetry only samples when visible.
  3. **Universal Responsive Web Design (RWD)**: Overhauls navigation, catalog grids, theater modals, and typography for seamless cross-browser (Chrome, Safari, Firefox, Edge, iOS WebKit) and cross-platform (desktop, tablet, mobile) operation.
- **Target Audience**: Gamers and retro enthusiasts playing across iPhones, Android devices, iPads, laptops, and high-DPI desktop setups.
- **Key Value**: Rock-solid 60/120 FPS consistency, zero memory leaks, no UI jitter, and intuitive touch/mouse controls everywhere.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Catalog Browsing (Any Screen Size)**:
   - On Desktop: Multi-column 3D isometric cards with live hover action previews.
   - On Mobile/Tablet: Single-to-double column layout with horizontal scroll category selector, smooth thumb-accessible tabs, and hardware-scaled canvas previews.
2. **Playing Table Tennis**:
   - Launches in the theater modal with responsive aspect-ratio fitting.
   - Smooth pointer follow on desktop (mouse) and touch-drag paddle control on mobile.
   - Instant visual and tactile feedback on ball contact, smash powershots, and table bounces.
3. **Inspecting Telemetry & Progression**:
   - The user scrolls to the Telemetry Hub and sees a calm, high-precision oscilloscope displaying steady frame intervals (target 16.6ms / 8.3ms).
   - An active Hardware Profile badge indicates `Ultra (120Hz)`, `Standard (60Hz)`, or `Lite (Battery Saver)`, confirming auto-tiering.
   - High scores and local session histories display clearly with zero layout shifts.

### Visual Identity & Theme
- **Theme**: Dark Luxury Arcade (`#08090E` base canvas, `#0E1220` surface panels, `#1E293B` hairline structural borders).
- **Accents**: Cyan (`#06B6D4`), Emerald (`#10B981`), Amber (`#F59E0B`), and Rose (`#F43F5E`) used strictly within the 60-30-10 color budget.
- **Typography**: Display headlines in `Plus Jakarta Sans`, body prose in `Plus Jakarta Sans`, and metrics/tabular data in `JetBrains Mono` (`tabular-nums`).
- **Touch Targets**: All mobile buttons, filter tabs, and modal triggers respect $\ge 44\text{px}$ touch target standards.

---

## 3. Key Technical Decisions & Trade-Offs

- **Decision 1: Zero-Allocation Object Pooling in Table Tennis**:
  - *Chosen Approach*: Pre-allocate fixed pools for particles (`FX_POOL_SIZE = 64`), ball trajectories, trail positions, and paddle trail rings. When spawning particles or predicting trajectories, mutate existing slot values rather than creating new objects or arrays.
  - *Why*: Eliminates garbage collection (GC) pauses entirely, preventing memory growth and micro-stutters.
- **Decision 2: Direct Canvas Oscilloscope Rendering in Telemetry**:
  - *Chosen Approach*: Replace the SVG polygon waveform that triggered full React re-renders every 300ms with a dedicated, lightweight `<canvas>` oscilloscope or damped 1,000ms throttled state updates.
  - *Why*: Prevents React component thrashing; keeps the UI silky smooth even on dual-core mobile processors.
- **Decision 3: Device Hardware Auto-Tiering**:
  - *Chosen Approach*: Detect `navigator.hardwareConcurrency`, `deviceMemory`, touch capabilities, and screen refresh rate.
  - *Tier Ultra*: Full visual effects, 1.25x canvas DPR, all particles active.
  - *Tier Standard*: Standard effects, 1.0x DPR, 60fps target.
  - *Tier Lite*: Simplified background, 1.0x DPR, reduced particle counts, disabled heavy shadows.
- **Decision 4: Mobile Responsive Navigation & Viewport Scaling**:
  - *Chosen Approach*: Mobile slide-out drawer in `Navbar`, horizontal scrollable filter strip with gradient masks in `GameCatalog`, and full-bleed viewport modal in `PlayableTheaterModal`.
  - *Why*: Eliminates content clipping, horizontal scroll leaks, and cramped modal viewports on phones.

---

## 4. Technical Architecture & System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             APEX ARCADE CLIENT                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│       DEVICE PROFILER         │             │      RESPONSIVE VIEWPORT      │
│  • Hardware concurrency       │             │  • Touch detection & scaling  │
│  • Screen refresh & DPR       │             │  • Adaptive grid (1-5 cols)   │
│  • Tier: Ultra / Std / Lite   │             │  • Fullscreen mobile modal    │
└───────────────────────────────┘             └───────────────────────────────┘
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERFORMANCE & UI RUNTIME                           │
├───────────────────────────────┬─────────────────────────────────────────────┤
│   Telemetry Dashboard         │   Playable Theater Modal                    │
│   • Smoothed EMA frame timing │   • Full-bleed RWD iframe / 2.5D engines    │
│   • Auto-tiering status card  │   • Touch drag paddle & reach sliders       │
│   • Viewport-only sampling    │   • Synchronized difficulty messages        │
├───────────────────────────────┼─────────────────────────────────────────────┤
│   Table Tennis Engine (49)    │   Card Scene Previews (51)                  │
│   • Zero-alloc object pool    │   • IntersectionObserver viewport culling   │
│   • Fixed 120Hz physics loop  │   • Theater modal auto-pause                │
│   • Responsive hit detection  │   • 30fps power-saving throttle             │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

### Proposed Changes

#### Step 1: Table Tennis Engine Refactor (`public/assets/aistudio/49-table-tennis.html` & hashed copy)
- Implement `FXPool`: Pre-allocate array of 64 particle structs (`active`, `t`, `life`, `x`, `y`, `z`, etc.).
- Implement `TrailRing`: Pre-allocate 16-slot circular array for ball motion blur.
- Implement `BatHistoryRing`: In-place mutation of paddle velocity stamps.
- Implement `SimBall`: Reuse single scratchpad object for trajectory prediction.
- Implement fixed-step physics (`dt` accumulator, 120Hz physics sub-step).
- Add responsive touch controls with touch-drag reach slider and instant tap serve.

#### Step 2: Performance Engine & Progression Stabilization (`src/components/TelemetryDashboard.tsx`)
- Add device profiling hook: automatically classify `Ultra`, `Standard`, or `Lite` tier.
- Decouple frame-time sampling from React state updates: sample via ref, update display values once per second with exponential moving average (EMA) smoothing to eliminate erratic jumps.
- Add responsive grid layout so metric cards and graphs stack cleanly on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
- Pause telemetry tick loop when not visible in viewport (`IntersectionObserver`).

#### Step 3: Responsive Web Design (RWD) & Cross-Platform Polish
- `src/components/Navbar.tsx`: Add mobile drawer toggle with clean accessible touch targets.
- `src/components/GameCatalog.tsx`: Add horizontal scroll container for category filter buttons with scroll indicators for mobile.
- `src/components/PlayableTheaterModal.tsx`: Add mobile viewport auto-fit, landscape orientation prompt, and safe-area insets.
- `src/components/HeroAnthology.tsx`: Ensure clean responsive typography (`text-wrap: balance`) without overflowing.

---

## 5. Verification Plan

1. **Compilation & Linting**:
   - Run `npm run lint` and `compile_applet` to confirm zero TypeScript and ESLint regressions.
2. **Table Tennis Memory & Performance Verification**:
   - Play 5 full matches of Table Tennis (Easy, Medium, Hard).
   - Verify heap memory remains flat with zero leaks or runaway allocations.
   - Verify power swings, paddle reach, and aim guide respond instantly.
3. **Telemetry Stability Verification**:
   - Verify FPS and frame-interval metrics remain smooth and stable without jitter or erratic bouncing.
   - Verify hardware tier correctly displays and adapts.
4. **Cross-Platform & Responsive Testing**:
   - Test layout at 375px (mobile phone), 768px (tablet), 1024px (small desktop), and 1440px (wide desktop).
   - Test touch drag, wheel reach, keyboard shortcuts, and full screen toggles.
