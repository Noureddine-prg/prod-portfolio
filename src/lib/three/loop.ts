// The ONE rAF loop for every canvas[data-three] (DC plumbing L3040-3110): ~15ms throttle, a live
// context CAP with offscreen dispose + WEBGL_lose_context restore, accumulated per-canvas clocks,
// the freeze rule and the per-kind spin/tilt tables. HMR-safe singleton on globalThis.

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
import { freeze, isInsideFrozen } from '$lib/stores/freeze.svelte';
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

// Per-kind motion. Auto-spin of the `spin` group, per 60fps frame (DC L3092); axelog sways in
// its builder instead.
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
// Pointer-tilt factor; axelog is near-locked.
const TILT: Record<string, number> = { campfire: 0.16, axelog: 0.06 };
const DEFAULT_TILT = 0.8;
// Lite scenes auto-drift instead of tilting: [amplitude rad, frequency].
const DRIFT: Record<string, [number, number]> = { campfire: [0.11, 0.09] };
const DEFAULT_DRIFT: [number, number] = [0.04, 0.12];

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
	// lighter tiers cap the backing store at 1.5x, but still count dpr
	if (quality() !== 'full') return Math.min(1.5, dpr() * boardScale.value);
	return Math.min(3, dpr() * boardScale.value);
}

const isTexture = (v: unknown): v is THREE.Texture => !!v && (v as THREE.Texture).isTexture;

// Free every GPU object a scene holds: geometries, instance buffers, materials, and textures
// on material slots and in shader uniforms.
function freeScene(entry: SceneEntry): void {
	entry.scene.traverse((o) => {
		const m = o as THREE.Mesh;
		// every Sprite shares one module-level geometry; disposing it churns all live renderers
		if (!(o as THREE.Sprite).isSprite) m.geometry?.dispose();
		(o as THREE.InstancedMesh).dispose?.();
		for (const mat of ([] as THREE.Material[]).concat(m.material ?? [])) {
			for (const v of Object.values(mat)) if (isTexture(v)) v.dispose();
			const uniforms = (mat as THREE.ShaderMaterial).uniforms;
			if (uniforms)
				for (const u of Object.values(uniforms)) if (isTexture(u?.value)) u.value.dispose();
			mat.dispose();
		}
	});
}

// Free a scene and its renderer but keep the canvas's context (and, with preserveDrawingBuffer,
// its last frame on screen) so a rebuild at a new tier doesn't flash.
function releaseScene(cv: HTMLCanvasElement, entry: SceneEntry): void {
	try {
		freeScene(entry);
		entry.renderer.dispose();
	} catch {
		/* noop */
	}
	clearEntry(cv);
}

/** Unmount teardown: free the scene and drop its context now rather than at GC, so panels that
 *  mount fresh canvases on every open never push the page past the browser's context limit. */
export function destroyCanvas(cv: HTMLCanvasElement): void {
	const entry = getEntry(cv);
	if (!entry) return;
	try {
		freeScene(entry);
		entry.renderer.dispose();
		entry.renderer.forceContextLoss();
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

	const buildable = (cv: HTMLCanvasElement) => {
		const m = getMeta(cv);
		// [data-hold-build]: an opening card defers its panel's scenes until it settles
		return (
			!getEntry(cv) &&
			!m.failed &&
			!m.pending &&
			isOn(cv) &&
			!cv.closest('[data-hold-build]') &&
			getComputedStyle(cv).visibility !== 'hidden'
		);
	};

	// prefers-reduced-motion and the still tier render one frame per canvas
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
			// still keeps the frame on screen, unless it is a transient pose (a card's pop or a
			// hover): those rebuild and pose at rest. reduced rebuilds lighter.
			if (to === 'still' && !cv.dataset.pop && !cv.dataset.hover) {
				stilled.add(cv);
				posed.add(e);
			} else releaseScene(cv, e);
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
		const cvs = liveCanvases();

		// Observe every mounted canvas, dispose any live-but-offscreen context, count what's left.
		let live = 0;
		for (const cv of cvs) {
			if (!observed.has(cv)) {
				observed.add(cv);
				io.observe(cv);
			}
			const e = getEntry(cv);
			if (!e) continue;
			if (isOn(cv)) live++;
			else disposeCanvas(cv, e);
		}

		const px = renderPx();

		// Build offscreen→onscreen canvases up to the context cap — ONE per tick, hero first.
		// Each build compiles shaders on the main thread; building them all in one frame
		// stalled the page for ~1.5s at load. Spread out, each costs a single frame.
		if (live < CTX_CAP) {
			let next: HTMLCanvasElement | null = null;
			for (const cv of cvs)
				if (cv.dataset.scene === 'campfire' && buildable(cv)) {
					next = cv;
					break;
				}
			if (!next)
				for (const cv of cvs)
					if (cv.dataset.scene !== 'campfire' && buildable(cv)) {
						next = cv;
						break;
					}
			if (next) {
				builtAt = nowMs;
				const e = buildCanvas(T, next, px);
				if (e) {
					stilled.delete(next); // a rebuilt canvas has a fresh, undrawn buffer
					// the hero is up: start judging frame pacing once it has warmed up
					if (!paceFrom && e.kind === 'campfire') paceFrom = nowMs + PACE_WARMUP_MS;
				}
			}
		}

		for (const cv of cvs) {
			const o = getEntry(cv);
			if (!o || !document.body.contains(cv)) continue;
			// Freeze rule: while a card is open, only canvases inside it update.
			if (!isInsideFrozen(frozen, cv)) continue;

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
				// pose once per build: a resize only re-draws the same pose (updates aren't idempotent)
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
				// on the scene's own clock, so a frozen stretch doesn't jump the pan
				const [amp, freq] = DRIFT[o.kind] ?? DEFAULT_DRIFT;
				o.pivot.rotation.y = Math.sin((o.clk ?? now) * freq) * amp;
				o.pivot.rotation.x = 0;
			} else {
				const pf = TILT[o.kind] ?? DEFAULT_TILT;
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

	// Watchdog: nudge the loop if rAF stalls while visible; hidden tabs don't render.
	const watchdog = setInterval(() => {
		if (!document.hidden && performance.now() - state.last > 250) tick();
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
