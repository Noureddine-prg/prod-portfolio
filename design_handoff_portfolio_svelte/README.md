# Handoff: Campfire Bento Portfolio → Svelte implementation

## Overview
A single-page personal portfolio for **Noureddine Sidi Abed — Software Engineer (New York, NY)**, built as a "bento board" of cards around a live three.js campfire scene. Cards expand in place with a fire-themed transition. Two fully designed layouts: **desktop (900×620 board)** and **mobile (390w board)**.

Target stack: **Svelte (SvelteKit recommended) + three.js**. The design references here are HTML/JS prototypes — recreate them in Svelte components; do not ship the HTML directly.

## About the design files
- `Bento Portfolio.dc.html` — THE source of truth. Contains the complete desktop board (`id="11a"`) and mobile board (`id="11b"`), all inline styles (exact px values, colors, fonts), every three.js scene builder, and all interaction logic in the `<script type="text/x-dc">` class at the bottom. Ignore other `<section>` blocks (`8a`, `4a`, `4b`, etc.) — those are retired explorations. Ignore the `dv-*` wireframe chrome (labels/badges); only board content ships.
- `Bento Portfolio (standalone).html` — self-contained snapshot (may be slightly stale; prefer the .dc.html).
- `image-slot.js` — drag-drop image placeholder used for the About portrait; replace with a real `<img>` in production.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and animation timings are final. Recreate pixel-perfect. Copy/content (bullet points, links) is still placeholder-level and will be revised — structure it for easy editing (a `content.ts`/JSON module).

## Design tokens

### Colors
| Token | Value | Use |
|---|---|---|
| board bg | `#121010` | page/board background |
| board border | `#262020` | 1px border, radius 24px (desktop) / 28px (mobile) |
| tile base | `#1a1616` border `#2a2424` | default cards, radius 12px |
| About tile | `#1d1824` border `#2f2939` + `radial-gradient(120% 90% at 50% 115%, rgba(200,112,63,.10), transparent 60%)` | violet dusk tint |
| Contact tile | `#1c1512` border `#322619` + `radial-gradient(90% 70% at 62% 118%, rgba(255,140,58,.16), transparent 62%)` | warm char tint |
| Health tile | `#161a17` border `#263028` + `radial-gradient(110% 85% at 30% -15%, rgba(94,138,105,.12), transparent 58%)` | forest green tint |
| Experience tile/card | scene `#0a0c12` + glass overlay `rgba(22,38,46,.34)` + `backdrop-filter: blur(7px)` | sea-glass |
| Work card | tile + expanded bg `#cbbfa8` (warm parchment), text `#241d18`, muted `#5e544a`, faint `#8a7d6e`, accent `#2a0d06`, row hover tint `rgba(42,13,6,.12)` | paper/ledger |
| Experience expanded bg (desktop) | `radial-gradient(120% 160% at 78% 30%, #101322 0%, #0a0c16 45%, #06070d 100%)` | space night |
| Contact expanded bg | `#1a1616` | |
| About expanded bg | `#1d1824` | + ember-glass backdrop (blurred `rgba(29,24,36,.38)` over large blurred ember orbs) |
| Contact expanded bg | dark char; headline accent `#c85a44` | |
| cream text | `#efe9e6` / `#f2ede2` | headers, hero name |
| body text (dark cards) | `#94867f`, About violet-tinted `#b3a8c2` / `#cfc4de` | |
| ember orange | `#ff8c3a`, amber `#e2954f`, warm light `#ffb066`, glow `#ffd28a` | fire accents |
| terracotta accent | `#c85a44` / `#d4654c` | links, "say hi →", icon fills |
| ash grey | `#6b5f57`, `#5d534c` | ash particles |
| mono label muted | `#6e6058` | timestamps |

### Typography (Google Fonts)
- **Archivo Black** — all card headers/titles (uppercase, letter-spacing .01–.02em) and hero name. Sizes: hero name 34px desktop / 21px mobile; card headers 15px desktop / 12px mobile; Contact headline 52px/40px ("Available" cream + "for work" in `#c85a44`, second line indented 26px).
- **Archivo** 400–700 — all body text (10–13.5px).
- **JetBrains Mono** — small technical labels, timestamps, badges (7–13px, letter-spacing .08–.12em uppercase).
- **Cormorant Garamond** 500 serif — Work card project names (16px/13px) and serif accents.

### Radii & spacing
- Board: radius 24px (desktop, padding 16px) / 28px (mobile, padding 12px); desktop grid `grid-template-columns: 1.72fr 1fr 1fr`, 4 equal rows, gap per file; mobile = flex column, gap 10px.
- Tiles: radius 12px; desktop padding 16–18px; mobile 14px, small mobile tiles fixed height 110px; mobile hero scene 258px; mobile Experience/Work 120px.
- Buttons/chips: radius 7–10px; glass buttons `rgba(20,16,10,.55)` + `backdrop-filter: blur(8px)` + border `rgba(255,255,255,.16)`; min hit target 44px on mobile.

## Board layout (desktop 900×620, grid 1.72fr 1fr 1fr × 4 rows)
- **Hero (col 1, rows 1–4)**: campfire scene canvas, radius 18px. Overlaid: name block (bottom-left), "SOFTWARE ENGINEER" mono badge, 3 glass icon buttons top-right (resume PDF, LinkedIn, GitHub — SVG icons, fill `#d4654c`). All hero UI has faint warm radiance (`box-shadow: 0 0 14px rgba(255,150,70,.14)`, text-shadow glow).
- **Experience (cols 2–3, row 1)**: ocean scene (`calm`, no wing, sun-zoomed) under sea-glass; header row EXPERIENCE + `2024 — 26`; glass company chips Google / Meta / NYC Mayor's Office.
- **About (col 2, row 2)**: ABOUT header, fireflies-jar canvas right side (104×118 @ right:6px), 3 twinkle stars + 1 rising ember, availability dot line.
- **Health (col 3, row 2)**: HEALTH + "2h ago", activity ring (conic-gradient `#e0654c` 84%), steps 8,412 / 42 move min, bpm sparkline 62, weight 172.4 lb.
- **Contact (col 2, row 3)**: CONTACT header, clean 3D envelope canvas right (104×118), "say hi →".
- **Wildcard (col 3, row 3)** non-interactive; **Work (cols 2–3, row 4)**: white/cream band, "06 builds →", axe-in-log scene on the right.
- **Ash particle layer**: absolutely positioned overlay (left:37%, z-index 5) with ~10 ember/ash `span`s rising (`ashrise` keyframe, 15–24s, staggered negative delays). Mobile: same but full-width below y=294px.

## Mobile (390w, flex column, gap 10px)
Order: hero scene (258px) → Experience (120px, sea-glass) → Work (120px, cream) → About (110px) → Contact + Health side-by-side (110px, flex:1 each) → footer strip. Mobile scene is `data-lite`: half the trees, ~550 grass blades, 24 embers, slow drift instead of pointer tilt, +1 extra pine at left (`mkTree(-2.6,-2.3,1.25,0.03)`).

## Three.js scenes (all built procedurally in the DC file — port each builder verbatim)
Shared plumbing: one `requestAnimationFrame` loop drives every `canvas[data-three]` (~60fps throttle, `dpr ≤ 2`); each canvas registers `{scene, cam, renderer, update(t)}`. **Freeze rule:** while a card clone with `.is-clone.is-settled` exists, only canvases inside it update. Scene time uses accumulated `clk += dt` so freezes don't jump.
1. **campfire** — voxel campground: log seats, stone fire ring (no gaps), flame (layered cones + point light flicker), smoke wisps, ~1100 grass blades in a radius around fire/trees/bushes (grass never intersects logs), pines (+dark variants), fireflies (2–3), stars, shooting star, drifting clouds, ground mist, time-of-day reactive (night/dusk/dawn by local hour). Pointer tilt on desktop.
2. **calm (ocean)** — Gerstner-ish sea shader with sun reflection column, dusk-gradient sky plane, drifting voxel islands (9 sprites, seeded positions, drift right), used 3 ways: tile (`data-nowing data-sunzoom data-lite`, cam zoom 2.1), mobile expanded top strip, and desktop expanded porthole.
3. **Porthole/wing (desktop Experience expanded)** — bg = space-night radial gradient above + star field (`dctwinkle`) + occasional shooting star above the purple band; porthole = layered ovals: outer flat ring `border-radius:44%/27%` bg `#1a1616` with deep inset shadows + screws, inner `42%/25%` window whose backdrop is a dusk gradient (`#140e12 → #241428 40% → #43223a 62% → #7a3b3a 78% → #c8703f 90%`) behind the ocean canvas, plus vignette overlay `radial-gradient(150% 150% at 50% 50%, transparent 60%, rgba(0,0,0,.42))`, double-pane rim, cabin-light falloff (darker top), warm halo `radial-gradient(50% 50%, rgba(232,148,72,.26)…)` at 230%×200%, dust motes in light cone (`dcdust` keyframes), voxel airplane wing (tapered, black LE strip, red flap band `#8f352c`, winglet, 2 horizontal fairings + faint windstream wisp off the far fairing, contrail sprite off winglet tip anchored in camera space, panel seams, flap separation groove, blinking nav light, ~10s specular streak sweeping the leading edge, cloud shadows dimming the wing light), big puffy clouds in clusters below the wing + in the upper sky (drift right = plane motion, never overlapping the wing), curved horizon for altitude, islands spread across the water incl. between sun and winglet, light-cone spill onto the left text (conic-masked blurred radial gradients).
4. **envelope** — voxel envelope; expanded version has charred corner + small live flame + embers; tile version `data-clean` (pristine, same float/sway: `pos.y = sin(t*.5)*.09`, `rot.y = sin(t*.23)*.3`, `rot.z = sin(t*.31)*.05`).
5. **jar (fireflies)** — octagonal glass jar (opacity .22), zinc lid, soil, voxel grass tufts + twigs, 14 emissive fireflies with per-fly flicker curves, warm point light; rocks on x-axis only: `grp.rotation.x = sin(t*.35)*.14`.
6. **axelog** — axe in log stump for the Work tile (desktop 180px wide right-aligned; mobile 150px).
7. **flame** — standalone campfire-flame scene (same voxel flame as the hero fire) used on the Contact expanded card: desktop canvas 330×425 at `right:56px; bottom:-138px; z-index:2` so only the flame tip shows, rising past the divider line, behind/overlapped-by the buttons; mobile 250×320 centered at `bottom:-92px`. The expanded envelope canvas sits behind it (desktop 400×340 at `right:22px`, mobile 330×275 centered at 46% top, opacity .6).

## Interactions & behavior
- **Card expand**: clicking a tile spawns a fixed-position clone that scales from tile rect to full board; siblings play a "burn" wipe (orange gradient sweep + darken, ~1.05s); clicked card gets a **fire ring** — conic-gradient ember tracing its border (3px, `firering` 1.05s linear infinite, drop-shadow glow), fading at 1.35s; expand completes ~1.95s (`.is-settled` added → scenes outside freeze); ✕ appears only after settle; click anywhere in card (Experience/Contact/About) closes; on close, siblings fade back staggered (randomized 120–380ms delays), tile content fades in sequentially (90ms/element).
- **Intro (once per load)**: dark veil `#0c0908` over board; name (54px/22px nowrap Archivo Black, cream, warm text-shadow glow) blurs in; "SOFTWARE ENGINEER" (38px/22px) assembles from ~particles (80% ember-glow, shadowBlur 9, cream 20%) sampled from canvas text; ember ring orbits board border (1.6s/lap); at 2.35s particles disperse radially (random angle, uniform speed, ease-out over 1.4s) across full board as veil fades (opacity .7s at 2.5s); total ~3.9s.
- **Expanded text reveal**: content fades in sequentially from top (translateY(-8px)→0, staggered).
- **Sound toggle**: bottom-right glass button, fire-crackle loop (Web Audio noise-based).
- **Ash layer**: `ashrise` keyframes — rise with sway via `--sw`, opacity via `--ao`.
- **CSS keyframes inventory** (all in the file's `<style>`; port verbatim): `sway` (envelope/element sway), `blink` (nav light / cursor), `wingflex` (subtle wing flex), `mar` (marquee translate), `dcdust` (porthole dust motes), `ashrise` (rising embers), `cardburn` (sibling darken during burn), `burnwipe` (orange wipe sweep), `dctwinkle` (star twinkle), `dcflame` (CSS flame flicker), `dcemberup` (embers off the burnt envelope), `ashburst` (intro/close particle burst), `firering` (border ember orbit), `dcpulse` (availability dot), `dcrule` (rule-line draw-in), `dcfall` (mobile Experience water particles falling).
- **Close button**: `.clone-close` — 30px circle, top:16px right:18px, JetBrains Mono ×, hidden until settle.
- **Copy email**: `data-copy-email` row (`#211b1b` bg, border `#362e2e`, mono email 13px/10.5px + "tap to copy" label) copies address, label flips to "copied"; beside it a `mailto:` button (bg `#c85a44`, text `#2a0d06`).
- **Links**: resume PDF opens new tab; GitHub/LinkedIn placeholders to be filled.

## Expanded card contents
- **Experience (desktop)**: left = header, role timeline (Google SWE Oct 2025–Jun 2026 · Meta · NYC Mayor's Office, dotted constellation connectors), quick-link row (Open resume PDF ↗ / LinkedIn / GitHub); right = vertical porthole bar. **Mobile**: ocean strip on top (200px, gradient-blend into `#1a1616` panel, no wing), sea-glass timeline below with water particles drifting downward through the text area, roles evenly distributed.
- **About**: portrait image slot (left 190px-high hero on mobile with SOFTWARE / ENGINEER lockup — cream solid over amber outline stroke `-webkit-text-stroke: 1.2px #e2954f` offset 22px, "New York, NY" bottom-right), short summary (13.5px/1.8), skills as glass chip pills grouped under amber rule-lines (Languages / AI·Data / Web) that draw in (`dcrule` .9s staggered), availability pill with pulsing dot (`dcpulse` 2.4s).
- **Contact**: "Available / for work" stacked headline (52px desktop / 40px mobile with `margin-top:56px` on mobile pushing it toward the envelope), email copy row, resume/socials buttons over a burning envelope (charred jagged corner + burnt spots + burnt patch under the flame, separate `flame` scene canvas — same voxel flame as the campfire — rising from below and intersecting the divider line, flame behind buttons with buttons overlapping it), ash embers rising.
- **Work**: parchment ledger (`#cbbfa8`) — WORK header 18px Archivo Black + "06 builds →"; 6 rows (grid `34px 1fr 160px 118px 44px`, gap 16px: number / serif name 16px + 10px desc / tech / org / year), hover: bg tint `rgba(42,13,6,.12)` + padding-left 6→14px slide + `inset 2px 0 0 #2a0d06` accent bar; each opens an in-card detail view (no nested cards).

## State (Svelte stores)
`openCard: null | 'experience' | 'about' | 'contact' | 'work'`, `workDetail: null | projectId`, `soundOn: boolean`, `introPlayed` (session), `timeOfDay` derived from clock, `sceneFrozen` derived from openCard settle.

## Meta / head
Title "Noureddine Sidi Abed — Software Engineer"; description, OG tags, `theme-color #121010`; inline SVG flame favicon (in file `<helmet>`).

## Performance requirements
Single rAF loop; `data-lite` scene variants on mobile; pause all scenes when a card is settled-open (and ideally when offscreen via IntersectionObserver); `prefers-reduced-motion`: skip intro + still scenes.

## Files in this bundle
- `Bento Portfolio.dc.html` — full design + logic (search anchors: `11a`, `11b`, `initThree`, `kind === 'campfire'`, `'calm'`, `'envelope'`, `'jar'`, `'axelog'`, `fireRing`, `burnSibs`, `runIntro`)
- `Bento Portfolio (standalone).html`, `image-slot.js`
