// The singleton global rAF loop — the ONE driver for every canvas[data-three]. Ports the
// DC plumbing (L3040-3110): ~15ms throttle, dpr ≤ 2, a live-WebGL-context CAP of 9 with
// offscreen dispose + WEBGL_lose_context restore, per-canvas accumulated clock, the freeze
// rule, and the central per-kind spin + pointer-tilt/parallax table. Onscreen tracking is
// IntersectionObserver-based (250px margin) rather than per-frame getBoundingClientRect.
//
// Never add a second loop. HMR-safe: a module singleton on window, cancelled on dispose.

import { browser } from '$app/environment';
import type * as THREE from 'three';
import { buildCanvas } from './build';
import {
	clearEntry,
	getEntry,
	getMeta,
	liveCanvases,
	onCanvasRemoved,
	type SceneEntry
} from './registry';
import { freeze } from '$lib/stores/freeze.svelte';
import { boardScale } from '$lib/stores/scale.svelte';
import type { SceneKind } from './types';
import { initQuality, lowerQuality, quality, type Quality } from './quality';

const FRAME_MS = 15; // ~60fps ceiling; skip frames on high-refresh displays
const FRAME_MS_REDUCED = 30; // ~30fps (a 60Hz rAF passes every other frame)
const DT_CAP = 0.06; // clamp huge deltas (tab-return) so scenes never jump
const CTX_CAP = 9; // max simultaneously live WebGL contexts
const MARGIN = '250px'; // IntersectionObserver root margin (matches DC onScreen slack)
// Frame-pacing monitor: after a warm-up, judge rAF gaps over ~2s windows. Two slow windows in a
// row step down one tier; one very slow window goes straight to still.
const PACE_WARMUP_MS = 1500;
const PACE_WINDOW_MS = 2000;
const PACE_SLOW_MS: Record<Quality, number> = {
	full: 40,
	reduced: 55,
	still: Infinity
};
const PACE_DIRE_MS = 120;

// Per-kind auto-spin applied to the inner `spin` group (DC L3092). Our six kinds all sit
// still (0); the default covers any future kind. axelog sways inside its builder instead:
// an unbounded spin turned its chop arc edge-on to the camera depending on click time.
const SPINS: Record<string, number> = {
	campfire: 0,
	axelog: 0,
	calm: 0,
	envelope: 0,
	flame: 0,
	jar: 0.0026
};
const DEFAULT_SPIN = 0.0032;
// Kinds that do NOT also spin on x (DC L3093).
const NO_X_SPIN = new Set<SceneKind>(['campfire', 'axelog', 'calm', 'flame', 'jar']);

interface LoopState {
	raf: number;
	watchdog: ReturnType<typeof setInterval>;
	io: IntersectionObserver;
	last: number;
	stop(): void;
}

declare global {
	// eslint-disable-next-line no-var
	var __cozyLoop: LoopState | undefined;
}

function dpr(): number {
	return Math.min(window.devicePixelRatio || 1, 2);
}

// Render-resolution compensation for the viewport scaler: a canvas whose CSS box lives in
// the board's design coordinates is displayed at boardScale× that size, so the backing
// store multiplies in the scale (capped at 3 to bound GPU cost on large monitors).
function renderPx(): number {
	// lighter tiers cap the backing store at 1.5x, but still count dpr (1x on a 3x phone was mush)
	if (quality() !== 'full') return Math.min(1.5, dpr() * boardScale.value);
	return Math.min(3, dpr() * boardScale.value);
}

// Free a scene's GPU objects and its renderer but keep the canvas's context (and, with
// preserveDrawingBuffer, its last frame on screen) so a rebuild at a new tier doesn't flash.
function releaseScene(cv: HTMLCanvasElement, entry: SceneEntry): void {
	try {
		entry.scene.traverse((o) => {
			const m = o as THREE.Mesh;
			m.geometry?.dispose();
			for (const mat of ([] as THREE.Material[]).concat(m.material ?? [])) {
				for (const v of Object.values(mat))
					if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
				mat.dispose();
			}
		});
		entry.renderer.dispose();
	} catch {
		/* noop */
	}
	clearEntry(cv);
}

// Tear down one canvas's live context but keep it eligible for rebuild when it returns
// on-screen (context-loss cap management, DC dispose()).
function disposeCanvas(cv: HTMLCanvasElement, entry: SceneEntry): void {
	try {
		entry.renderer.dispose();
		const gl = entry.renderer.getContext();
		const ext = gl && gl.getExtension('WEBGL_lose_context');
		if (ext) {
			getMeta(cv).ext = ext;
			ext.loseContext();
		}
	} catch {
		/* noop */
	}
	clearEntry(cv);
}

function startLoop(T: typeof THREE): LoopState {
	const onscreen = new Set<HTMLCanvasElement>();
	const observed = new WeakSet<HTMLCanvasElement>();

	const io = new IntersectionObserver(
		(records) => {
			for (const r of records) {
				const cv = r.target as HTMLCanvasElement;
				if (r.isIntersecting) onscreen.add(cv);
				else onscreen.delete(cv);
			}
		},
		{ rootMargin: `${MARGIN} ${MARGIN} ${MARGIN} ${MARGIN}`, threshold: 0 }
	);

	// Unmounted canvases leave IO tracking (and the strong onscreen ref) immediately.
	onCanvasRemoved((cv) => {
		io.unobserve(cv);
		onscreen.delete(cv);
		observed.delete(cv);
	});

	const isOn = (cv: HTMLCanvasElement) => onscreen.has(cv) && cv.clientWidth > 0;

	// prefers-reduced-motion: scenes render one still frame instead of animating
	// (README mandate; not present in the DC prototype). Read once at loop start.
	// The `still` quality tier takes the same path.
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const stilled = new WeakSet<HTMLCanvasElement>();
	const posed = new WeakSet<SceneEntry>();

	// pacing monitor state (see PACE_*); `builtAt` marks frames that compiled a scene
	let paceFrom = 0;
	let paceGaps: number[] = [];
	let paceSlow = 0;
	let builtAt = -1;
	let prevRaf = 0;

	const stepDown = (to: Quality) => {
		if (!lowerQuality(to)) return;
		paceGaps = [];
		paceSlow = 0;
		paceFrom = performance.now() + PACE_WARMUP_MS;
		for (const cv of liveCanvases()) {
			const e = getEntry(cv);
			if (!e) continue;
			// still: whatever is on screen now becomes the still frame; reduced: rebuild lighter
			if (to === 'still') {
				stilled.add(cv);
				posed.add(e); // keep the live pose it was showing
			}
			else releaseScene(cv, e);
		}
	};

	const pace = (nowMs: number) => {
		const gap = nowMs - prevRaf;
		prevRaf = nowMs;
		const q = quality();
		if (q === 'still' || reducedMotion || document.hidden) return;
		if (!paceFrom || nowMs < paceFrom) return;
		// skip the frames around a scene build (shader compiles) and background-tab gaps
		if (builtAt >= 0 && nowMs - builtAt < 200) return;
		if (gap > 1000) return;
		paceGaps.push(gap);
		if (nowMs - paceFrom < PACE_WINDOW_MS || paceGaps.length < 4) return;
		const sorted = paceGaps.sort((a, b) => a - b);
		const median = sorted[sorted.length >> 1];
		paceGaps = [];
		paceFrom = nowMs;
		if (median > PACE_DIRE_MS) return stepDown('still');
		paceSlow = median > PACE_SLOW_MS[q] ? paceSlow + 1 : 0;
		if (paceSlow >= 2) stepDown(q === 'full' ? 'reduced' : 'still');
	};

	const tick = () => {
		const nowMs = performance.now();
		const tier = quality();
		if (nowMs - state.last < (tier === 'full' ? FRAME_MS : FRAME_MS_REDUCED)) return;
		const stillMode = reducedMotion || tier === 'still';
		const dt = Math.min(DT_CAP, (nowMs - (state.last || nowMs)) * 0.001);
		state.last = nowMs;
		const now = nowMs * 0.001;

		const frozen = freeze.container;
		const cvs = [...liveCanvases()];

		// Make sure every mounted canvas is being observed.
		for (const cv of cvs) {
			if (!observed.has(cv)) {
				observed.add(cv);
				io.observe(cv);
			}
		}

		// Dispose any live-but-offscreen context, then count what's left live.
		for (const cv of cvs) {
			const e = getEntry(cv);
			if (e && !isOn(cv)) disposeCanvas(cv, e);
		}
		let live = cvs.filter((cv) => getEntry(cv)).length;

		// Build offscreen→onscreen canvases up to the context cap — ONE per tick, hero first.
		// Each build compiles shaders on the main thread; building them all in one frame
		// stalled the page for ~1.5s at load. Spread out, each costs a single frame.
		const pending = cvs.filter((cv) => {
			const m = getMeta(cv);
			// [data-hold-build]: an opening card defers its panel's scenes until it settles
			return (
				!getEntry(cv) && !m.failed && !m.pending && isOn(cv) && !cv.closest('[data-hold-build]')
			);
		});
		pending.sort((a, b) => +(b.dataset.scene === 'campfire') - +(a.dataset.scene === 'campfire'));
		for (const cv of pending) {
			if (live >= CTX_CAP) break;
			if (getComputedStyle(cv).visibility === 'hidden') continue;
			builtAt = nowMs;
			const e = buildCanvas(T, cv);
			if (e) {
				live++;
				// the hero is up: start judging frame pacing once it has warmed up
				if (!paceFrom && e.kind === 'campfire') paceFrom = nowMs + PACE_WARMUP_MS;
			}
			break;
		}

		// (DC's `data-hover-only` warm/hover gating, L3068, is unused by boards 11a/11b — skipped.)
		const px = renderPx();
		for (const cv of cvs) {
			const o = getEntry(cv);
			if (!o || !document.body.contains(cv)) continue;
			// Freeze rule: when a card is settled-open, only canvases inside it update.
			if (frozen && !frozen.contains(cv)) continue;

			// Keep the drawing buffer matched to the CSS box.
			const w = cv.clientWidth;
			const h = cv.clientHeight;
			let resized = false;
			if (w && h && cv.width !== Math.floor(w * px)) {
				o.renderer.setPixelRatio(px); // scaler compensation — build-time ratio may be stale
				o.renderer.setSize(w, h, false);
				o.cam.aspect = w / h;
				o.cam.updateProjectionMatrix();
				resized = true;
			}

			// Still mode: one frame at t=0 per canvas (re-render only on resize).
			if (stillMode) {
				if (stilled.has(cv) && !resized) continue;
				// pose once per build: a resize only re-draws the same pose (updates aren't
				// idempotent — the campfire's embers step on every call, even at dt 0)
				if (o.update && !posed.has(o)) {
					posed.add(o);
					try {
						o.update(0, 0);
					} catch {
						o.update = null;
					}
				}
				try {
					o.renderer.render(o.scene, o.cam);
					stilled.add(cv);
					if (!cv.dataset.live) cv.dataset.live = '1';
				} catch {
					disposeCanvas(cv, o);
					getMeta(cv).failed = true;
				}
				continue;
			}

			// Accumulated clock — freezes never jump time.
			if (o.update) {
				o.clk = o.clk == null ? now : o.clk + dt;
				try {
					o.update(o.clk, dt);
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(`three update failed [${o.kind}]:`, e instanceof Error ? e.message : e);
					o.update = null;
				}
			}

			// Per-kind auto-spin (rates are per 60fps frame; scaled by dt so a 30fps cap keeps speed).
			const f60 = dt * 60;
			const sp = (SPINS[o.kind] ?? DEFAULT_SPIN) * f60;
			o.spin.rotation.y += sp;
			if (!NO_X_SPIN.has(o.kind)) o.spin.rotation.x += sp * 0.6;

			// Pointer-tilt / parallax (eased, frame-rate independent). Lite scenes auto-drift instead.
			const ease = 1 - Math.pow(0.94, f60);
			o.mx += (o.tx - o.mx) * ease;
			o.my += (o.ty - o.my) * ease;
			if (o.variants.lite) {
				// campfire gets a wider, slower left-right pan; other lite scenes a subtle sway
				const amp = o.kind === 'campfire' ? 0.11 : 0.04;
				const freq = o.kind === 'campfire' ? 0.09 : 0.12;
				o.pivot.rotation.y = Math.sin(now * freq) * amp;
				o.pivot.rotation.x = 0;
			} else {
				// axelog is near-locked (rework): a hint of tilt, not the full 0.8
				const pf = o.kind === 'campfire' ? 0.16 : o.kind === 'axelog' ? 0.06 : 0.8;
				o.pivot.rotation.y = o.mx * pf;
				o.pivot.rotation.x = o.my * pf * 0.6;
			}

			try {
				o.renderer.render(o.scene, o.cam);
				if (!cv.dataset.live) cv.dataset.live = '1'; // first frame is up (CSS can fade it in)
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(`three render failed [${o.kind}]:`, e instanceof Error ? e.message : e);
				disposeCanvas(cv, o);
				getMeta(cv).failed = true;
			}
		}
	};

	const frame = () => {
		pace(performance.now());
		tick();
		state.raf = requestAnimationFrame(frame);
	};

	// Watchdog: rAF is throttled/paused in background tabs; nudge the loop if it stalls.
	const watchdog = setInterval(() => {
		if (performance.now() - state.last > 250) tick();
	}, 125);

	const state: LoopState = {
		raf: requestAnimationFrame(frame),
		watchdog,
		io,
		last: 0,
		stop() {
			cancelAnimationFrame(this.raf);
			clearInterval(this.watchdog);
			this.io.disconnect();
		}
	};
	return state;
}

/** Start the global loop once. Idempotent; safe to call from every ThreeCanvas mount. */
export function ensureLoop(): void {
	if (!browser || globalThis.__cozyLoop) return;
	// Placeholder to prevent re-entrant starts while three loads.
	globalThis.__cozyLoop = {
		raf: 0,
		watchdog: 0 as unknown as ReturnType<typeof setInterval>,
		io: null as unknown as IntersectionObserver,
		last: 0,
		stop() {}
	};
	initQuality();
	import('three').then((mod) => {
		const T = mod as unknown as typeof THREE;
		globalThis.__cozyLoop = startLoop(T);
	});
}

if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		globalThis.__cozyLoop?.stop();
		globalThis.__cozyLoop = undefined;
	});
}
