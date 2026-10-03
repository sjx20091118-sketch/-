# Android Mobile WebView Rendering & Performance Optimization Plan

A comprehensive technical upgrade for "拾年" (Shinian) on Android WebView/Capacitor to eliminate screen tearing, frame flickering, and image/layer dislocation during modal jumps and button taps, while 100% preserving the oriental aesthetic design and theme palette.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following technical strategies were confirmed through interactive clarification and will govern the performance refactoring:

- **Confirmed Decision 1 (Layer Isolation)**: Enable GPU layer isolation and adaptive mobile glass rendering (`transform: translateZ(0)`, `will-change: transform`, `contain: paint layout`) for background glow filters and fixed overlays.
- **Confirmed Decision 2 (Motion Optimization)**: Replace live CPU/GPU-intensive CSS `filter: blur(...)` keyframe animations in modals (`AuthPortalModal`, `MyProfileModal`, `CheckoutLicenseModal`, `OrientalScrollNoticeModal`, `VintageVideoPlayer`) with GPU-accelerated `opacity` and `transform: scale()` transitions.
- **Confirmed Decision 3 (Touch Isolation)**: Isolate button click event handlers, active touch scale transforms, and sound engine triggers to prevent full component layout invalidation on mobile touch.

---

## 1. Overview & Core Concept

- **Problem Addressed**: On Android mobile devices (WebView / Chromium renderer via Capacitor), switching tabs or tapping buttons inside modals like `AuthPortalModal` triggers severe graphic tearing, missing frames, and flickering. This occurs because live CSS `filter: blur()` effects, stacked `backdrop-blur-*` overlays, un-isolated fixed gradient layers, and un-throttled React re-renders force WebView GPU compositor buffer re-allocations on every frame.
- **Target Experience**: Silky-smooth 60 FPS transitions, crisp instant button feedback, zero screen tearing, and flawless oriental paper-texture visual rendering on mobile devices ranging from entry-level Android smartphones to flagship devices.
- **Key Value**: Retains 100% of the rich aesthetic visual identity (warm beige rice paper texture, ambient ink radial glows, dynamic glass capsules) while rendering with hardware-accelerated efficiency on mobile platforms.

---

## 2. User Experience & Visual Design

- **Visual Identity & Theme Preservation**:
  - *Aesthetic Direction*: Oriental digital meditation journal ("东方生命画卷 · 数字静修"), warm beige (#FAF8F5) light mode, deep forest charcoal (#111613) dark mode, cinnabar (#E88765) and bamboo green (#5B7B6D) accents.
  - *Glassmorphism Adaptation*: Preserves frosted glass appearance (`apple-liquid-glass`) while isolating backdrop filters into hardware-accelerated CSS layers with fallback solid alpha colors for lower-power WebViews.
- **Interactive Feedback & Touch Ergonomics**:
  - Minimum touch target hitbox $\ge 44 \times 44\text{px}$ across all login/registration controls and tab switches.
  - Sub-50ms touch micro-feedback (`transform: scale(0.97)`, `backface-visibility: hidden`) with non-blocking audio engine triggers.
  - Seamless page reveals and tab transitions without layout jitter or scrollbar flashing.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: GPU Layer Isolation for Ambient Radial Glows**:
  - *Chosen Approach*: Wrap fixed radial ink glows and dither overlays in hardware-isolated compositing layers (`transform: translate3d(0,0,0)`, `backface-visibility: hidden`, `contain: strict`).
  - *Why*: Prevents Chromium WebView from rasterizing large background blurs on every button tap or input keystroke.
- **Decision 2: Elimination of Live Filter Animations in Motion Components**:
  - *Chosen Approach*: Modify `motion.div` animation targets in `AuthPortalModal`, `VintageVideoPlayer`, `AdminPortal`, etc., to animate pure `opacity`, `scale`, and `y` properties instead of `filter: 'blur(10px)' -> 'blur(0px)'`.
  - *Why*: Live CSS blur filtering in JavaScript animation frame loops causes catastrophic offscreen GPU allocation overhead on Android WebViews.
- **Decision 3: Non-Blocking Sound Engine & Event Batching**:
  - *Chosen Approach*: Ensure `soundEngine.play('click')` is non-blocking and wrapped in `requestAnimationFrame` / silent try-catch blocks to prevent touch response latency.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ANDROID WEBVIEW / CAPACITOR FRAME                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. GPU Compositor Layer Isolation                                       │
│    ├── .ambient-glow-dither  ──► translateZ(0) + contain: paint       │
│    ├── .smooth-radial-glow   ──► translate3d(0,0,0) + isolate layer    │
│    └── .apple-liquid-glass   ──► webkit-backdrop-filter hardware acceleration
│                                                                        │
│ 2. Optimized Motion Components                                         │
│    ├── AuthPortalModal      ──► Animate { opacity, scale, y } (No blur)│
│    ├── MyProfileModal       ──► Hardware-accelerated modal backdrop    │
│    └── VintageVideoPlayer   ──► Clean GPU transform transitions        │
│                                                                        │
│ 3. Isolated Touch & Sound Layer                                        │
│    ├── Button Handlers      ──► Isolated state + non-blocking audio  │
│    └── Input Controls       ──► Touch targets >= 44px + GPU scale    │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Refactoring Areas:
1. `src/index.css`: Add GPU compositor isolation utility rules (`transform-gpu`, `backface-visibility: hidden`, `-webkit-font-smoothing`, hardware-isolated backdrop blur utilities).
2. `src/components/AuthPortalModal.tsx`:
   - Replace live `filter: blur(...)` motion animation states with clean GPU `opacity` and `scale` transitions.
   - Optimize background radial glow layers with `will-change: transform` and layer containment.
3. `src/components/MyProfileModal.tsx`, `VintageVideoPlayer.tsx`, `CheckoutLicenseModal.tsx`, `OrientalScrollNoticeModal.tsx`:
   - Purge live `filter: blur(...)` animation properties from motion variants.
   - Ensure hardware isolation on fixed backdrop overlays.
4. `src/utils/soundEngine.ts`: Ensure sound effects execute asynchronously without locking the UI main thread on touch events.

---
