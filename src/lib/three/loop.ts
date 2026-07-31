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

const FRAME_MS = 15; // ~60fps ceiling; skip frames on high-refresh displays
const DT_CAP = 0.06; // clamp huge deltas (tab-return) so scenes never jump
const CTX_CAP = 9; // max simultaneously live WebGL contexts
const MARGIN = '250px'; // IntersectionObserver root margin (matches DC onScreen slack)

// Per-kind auto-spin applied to the inner `spin` group (DC L3092). Our six kinds all sit
// still (0); the default covers any future kind.
const SPINS: Record<string, number> = {
	campfire: 0,
	axelog: 0.004,
	calm: 0,
	envelope: 0,
	flame: 0,
	jar: 0
};
const DEFAULT_SPIN = 0.0032;
// Kinds that do NOT also spin on x (DC L3093).
const NO_X_SPIN = new Set<SceneKind>(['campfire', 'axelog', 'calm', 'flame']);

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
	return Math.min(3, dpr() * boardScale.value);
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
	const stillMode = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const stilled = new WeakSet<HTMLCanvasElement>();

	const tick = () => {
		const nowMs = performance.now();
		if (nowMs - state.last < FRAME_MS) return;
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

		// Build offscreen→onscreen canvases up to the context cap.
		for (const cv of cvs) {
			if (live >= CTX_CAP) break;
			const m = getMeta(cv);
			if (
				!getEntry(cv) &&
				!m.failed &&
				!m.pending &&
				isOn(cv) &&
				getComputedStyle(cv).visibility !== 'hidden'
			) {
				if (buildCanvas(T, cv)) live++;
			}
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
				if (o.update) {
					try {
						o.update(0, 0);
					} catch {
						o.update = null;
					}
				}
				try {
					o.renderer.render(o.scene, o.cam);
					stilled.add(cv);
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

			// Per-kind auto-spin.
			const sp = SPINS[o.kind] ?? DEFAULT_SPIN;
			o.spin.rotation.y += sp;
			if (!NO_X_SPIN.has(o.kind)) o.spin.rotation.x += sp * 0.6;

			// Pointer-tilt / parallax (eased). Lite scenes auto-drift instead.
			o.mx += (o.tx - o.mx) * 0.06;
			o.my += (o.ty - o.my) * 0.06;
			if (o.variants.lite) {
				// campfire gets a wider, slower left-right pan; other lite scenes a subtle sway
				const amp = o.kind === 'campfire' ? 0.11 : 0.04;
				const freq = o.kind === 'campfire' ? 0.09 : 0.12;
				o.pivot.rotation.y = Math.sin(now * freq) * amp;
				o.pivot.rotation.x = 0;
			} else {
				const pf = o.kind === 'campfire' ? 0.16 : 0.8;
				o.pivot.rotation.y = o.mx * pf;
				o.pivot.rotation.x = o.my * pf * 0.6;
			}

			try {
				o.renderer.render(o.scene, o.cam);
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(`three render failed [${o.kind}]:`, e instanceof Error ? e.message : e);
				disposeCanvas(cv, o);
				getMeta(cv).failed = true;
			}
		}
	};

	const frame = () => {
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
