// Time-of-day derivation. Scenes read `ctx.variants.hour` (a number) rather than calling
// `new Date()` divergently; the `?hour=` query override lets the campfire scene preview
// dawn/dusk (DC: "add ?hour=7 to the URL to preview dawn").

import { browser } from '$app/environment';

export type TimeOfDay = 'night' | 'dawn' | 'dusk';

/** Local hour 0..23.999, or the `?hour=` override when present and valid. */
export function currentHour(search?: string): number {
	const qs = search ?? (browser ? window.location.search : '');
	const raw = new URLSearchParams(qs).get('hour');
	if (raw != null && raw !== '') {
		const n = Number(raw);
		if (Number.isFinite(n)) return ((n % 24) + 24) % 24;
	}
	const d = new Date();
	return d.getHours() + d.getMinutes() / 60;
}

/**
 * Bucket an hour into the three DC time-of-day states. The campfire is a night scene;
 * dawn and dusk are the narrow warm-sky windows around sunrise/sunset, everything else
 * (including midday) reads as `night` for the fireside look.
 *  - dawn:  05:00–07:59
 *  - dusk:  17:00–19:59
 *  - night: otherwise
 */
export function timeOfDay(hour: number): TimeOfDay {
	const h = ((hour % 24) + 24) % 24;
	if (h >= 5 && h < 8) return 'dawn';
	if (h >= 17 && h < 20) return 'dusk';
	return 'night';
}
