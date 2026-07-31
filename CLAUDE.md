# Campfire Bento Portfolio — build guide

A single-page "bento board" portfolio for **Noureddine Sidi Abed — Software Engineer**,
built around live three.js scenes. Two fully-designed layouts: desktop (900×620 board) and
mobile (390w board). Cards expand in place with a fire-themed transition (Stage 3).

## Stack

- **SvelteKit + Svelte 5 (runes only)**, TypeScript, `adapter-static` (prerendered shell).
- **three.js pinned to `0.151.3`** (`@types/three@0.151.0`). Do NOT bump — 0.151 keeps
  `outputEncoding`/`sRGBEncoding` so DC scene builders port verbatim. Never translate to
  `outputColorSpace`.
- Vitest (unit) + Playwright/Chromium (E2E).

## The 3D architecture (decided — do not revisit)

Vanilla three.js in a thin Svelte wrapper. Scenes are **imperative builders copied
near-verbatim** from the design source of truth, driven by **ONE global rAF loop**. NOT
Threlte, NOT R3F, NOT per-canvas loops, NOT declarative scene graphs.

### The contract scene teammates implement

Each of the six kinds is one file `src/lib/three/scenes/<kind>.ts` exporting:

```ts
export function build<Kind>(ctx: SceneCtx): UpdateFn | null
```

then registered with a one-line add to `src/lib/three/scenes/index.ts`:

```ts
import { buildJar } from './jar';
export const SCENE_BUILDERS = { jar: buildJar /* … */ };
```

`SceneCtx` (see `src/lib/three/types.ts`) gives you everything: `T` (the three module —
use `ctx.T.*`, never import three), `scene`, `cam`, `pivot`, `spin` (add content here),
`renderer`, `canvas`, `variants {lite,nowing,sunzoom,clean,hour}`, `w`, `h`, and a seeded
`rand`. Return an `UpdateFn = (t, dt) => void` (most DC builders only use `t`, the
accumulated clock) or `null` for a static scene. Use `ctx.variants.hour` and `ctx.rand` —
never `new Date()` / raw `Math.random()`.

The six kinds: `campfire | calm | flame | jar | envelope | axelog`. Porthole-wing is NOT a
kind — it lives inside the `calm` builder (gated by the `nowing`/`sunzoom` variants).

Kinds absent from the builder map render as an empty scene (one dev note logged), so the
board runs today and each scene PR is additive.

### The plumbing (built; don't duplicate)

- `src/lib/three/loop.ts` — the singleton global rAF. ~15ms throttle, `dpr ≤ 2`, a
  live-WebGL-context CAP of 9 with offscreen dispose + `WEBGL_lose_context` restore,
  per-canvas accumulated `clk` (freezes never jump time), the freeze rule, the central
  per-kind spin + pointer-tilt/parallax table (campfire pf 0.16, others 0.8; lite →
  auto-drift), IntersectionObserver onscreen tracking. HMR-safe singleton. **Never add a
  second loop.**
- `src/lib/three/registry.ts` — `WeakMap<canvas, SceneEntry>` + a Set of mounted canvases.
  No expando props on DOM nodes.
- `src/lib/three/build.ts` — creates renderer/scene/cam/pivot/spin, parses variants,
  dispatches to the builder.
- `src/lib/components/ThreeCanvas.svelte` — the only Svelte↔three bridge; registers on
  mount, disposes on destroy, wires pointer-tilt.
- `src/lib/stores/freeze.svelte.ts` — `$state` frozen-container; the loop updates only
  canvases inside it (DC `.is-clone.is-settled` semantics).

## Tokens & content

- `src/lib/tokens.ts` — all colors/radii/spacing/breakpoints (also mirrored as CSS custom
  properties in `src/app.css`, which also holds every board `@keyframes`, ported verbatim).
- `src/lib/content.ts` — all copy (profile, experience roles, 6 work projects, health,
  contact). Placeholder-grade; edit here, not in components.

## Source of truth (gitignored, on disk)

`design_handoff_portfolio_svelte/Bento Portfolio.dc.html` — desktop board `id="11a"`
(~L82-420), mobile board `id="11b"` (~L423-701), shared three plumbing (~L1380-1410,
L3040-3110). Builder anchors: `kind === 'campfire'` L1409, `axelog` L2243, `calm` L2270,
`flame` L2822, `jar` L2846, `envelope` L2921. Ignore retired sections (8a/4a/4b) and all
`dv-*` wireframe chrome. `design_handoff_portfolio_svelte/README.md` is the handoff digest.

## Rules

- **Svelte 5 runes only** (`$state`/`$props`/`$derived`). No stores API, no `export let`.
- **No sound.** No Web Audio, no toggle, nowhere. Cut from scope entirely.
- **Fidelity first.** Match the DC file exactly (grid, tints, radii, fonts, timings).
  Deviations are either regressions (fix them) or improvements (flag them in your report) —
  never silently drift.
- Comments: keep ported code's own shape; comment only non-obvious math you changed.

## Commands

```bash
npm run dev        # dev server on :5173
npm run check      # svelte-check (must be clean)
npm run test       # vitest unit tests
npm run test:e2e   # Playwright smoke (starts dev server)
npm run build      # static build (must succeed)
```
