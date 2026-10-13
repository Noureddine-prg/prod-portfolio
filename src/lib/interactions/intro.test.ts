import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { maybeRunIntro } from './intro';
import { ui } from '$lib/stores/ui.svelte';

// Gate semantics of maybeRunIntro (the DOM veil itself is covered by e2e/intro.spec.ts;
// jsdom boards have zero width, so runIntro never fires here — exactly what we want to
// isolate the gate). Two gates: the in-memory `ui.introPlayed` (per load) and a
// sessionStorage flag (per browser session, so a reload does not replay the intro).

let matchMediaSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
	ui.introPlayed = false;
	sessionStorage.clear();
	matchMediaSpy = vi.fn().mockReturnValue({ matches: true });
	vi.stubGlobal('matchMedia', matchMediaSpy);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('maybeRunIntro gate', () => {
	it('latches introPlayed and the session flag on first call', async () => {
		await maybeRunIntro();
		expect(ui.introPlayed).toBe(true);
		expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
		expect(sessionStorage.getItem('cozy:intro')).toBe('1');
		// no visible board in jsdom — no veil appended anywhere
		expect(document.querySelector('[data-intro-veil]')).toBeNull();
	});

	it('returns immediately when introPlayed is already set (never re-checks media)', async () => {
		ui.introPlayed = true;
		await maybeRunIntro();
		expect(matchMediaSpy).not.toHaveBeenCalled();
		expect(ui.introPlayed).toBe(true);
	});

	it('second call after a completed first run is a no-op', async () => {
		await maybeRunIntro();
		matchMediaSpy.mockClear();
		await maybeRunIntro();
		expect(matchMediaSpy).not.toHaveBeenCalled();
	});

	it('non-reduced path completes without throwing when document.fonts is unavailable', async () => {
		matchMediaSpy.mockReturnValue({ matches: false });
		// jsdom has no FontFaceSet — the font preload must degrade gracefully (try/catch)
		await expect(maybeRunIntro()).resolves.toBeUndefined();
		expect(ui.introPlayed).toBe(true);
	});

	it('skips when the session flag is already set (reload in the same session)', async () => {
		sessionStorage.setItem('cozy:intro', '1');
		await maybeRunIntro();
		expect(matchMediaSpy).not.toHaveBeenCalled();
		expect(ui.introPlayed).toBe(true);
	});
});
