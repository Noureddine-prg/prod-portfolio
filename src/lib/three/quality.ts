// Device quality tier: full (every effect, ~60fps), reduced (campfire extras off, ≤1.5x render scale,
// 30fps, no backdrop blur), still (one frame per scene). A probe picks the start tier; the loop steps
// down on slow frame pacing. `?quality=full|reduced|still` pins a tier (no step-down) for testing.

import { browser } from '$app/environment';

export type Quality = 'full' | 'reduced' | 'still';

const KEY = 'cozy:quality';
const RANK: Record<Quality, number> = { full: 0, reduced: 1, still: 2 };
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software|basic render/i;

const isQuality = (v: unknown): v is Quality => v === 'full' || v === 'reduced' || v === 'still';

function probe(): Quality {
	const cv = document.createElement('canvas');
	// failIfMajorPerformanceCaveat refuses a context the browser would back with software GL
	const fast = cv.getContext('webgl', { failIfMajorPerformanceCaveat: true });
	if (!fast) return 'still';
	let tier: Quality = 'full';
	try {
		const ext = fast.getExtension('WEBGL_debug_renderer_info');
		const name = String(fast.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : fast.RENDERER));
		if (SOFTWARE_GL.test(name)) tier = 'still';
	} catch {
		/* renderer string unavailable — trust the caveat check */
	}
	fast.getExtension('WEBGL_lose_context')?.loseContext();
	if (tier !== 'full') return tier;

	const nav = navigator as Navigator & {
		deviceMemory?: number;
		connection?: { saveData?: boolean };
	};
	if (
		nav.connection?.saveData ||
		(nav.deviceMemory !== undefined && nav.deviceMemory < 4) ||
		(navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency < 4)
	)
		return 'reduced';
	return 'full';
}

function readSaved(): Quality | null {
	try {
		const v = sessionStorage.getItem(KEY);
		return isQuality(v) ? v : null;
	} catch {
		return null;
	}
}

let current: Quality = 'full';
let pinned = false;

function apply(q: Quality): void {
	current = q;
	document.documentElement.dataset.quality = q;
}

/** Resolve the starting tier once (browser only). Idempotent. */
export function initQuality(): Quality {
	if (!browser || document.documentElement.dataset.quality) return current;
	const forced = new URLSearchParams(location.search).get('quality');
	if (isQuality(forced)) {
		pinned = true;
		apply(forced);
		return current;
	}
	const probed = probe();
	const saved = readSaved();
	// a step-down earlier this session sticks; never step back up from it
	apply(saved && RANK[saved] > RANK[probed] ? saved : probed);
	return current;
}

export function quality(): Quality {
	return current;
}

/** Step down to `q` (never up). Returns false when pinned or already at/below it. */
export function lowerQuality(q: Quality): boolean {
	if (pinned || RANK[q] <= RANK[current]) return false;
	apply(q);
	try {
		sessionStorage.setItem(KEY, q);
	} catch {
		/* private mode — the tier just won't carry across reloads */
	}
	return true;
}
