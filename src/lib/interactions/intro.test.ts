import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { maybeRunIntro } from './intro';
import { ui } from '$lib/stores/ui.svelte';

// Gate semantics of maybeRunIntro (the DOM veil itself is covered by e2e/intro.spec.ts;
// jsdom boards have zero width, so runIntro never fires here — exactly what we want to
// isolate the gate). NOTE: introPlayed is module state only — there is NO sessionStorage
// persistence, so the gate resets on every full page load ("once per load", CLAUDE.md).

let matchMediaSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
	ui.introPlayed = false;
	matchMediaSpy = vi.fn().mockReturnValue({ matches: true });
	vi.stubGlobal('matchMedia', matchMediaSpy);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('maybeRunIntro gate', () => {
	it('latches introPlayed on first call (reduced-motion path: veil skipped entirely)', async () => {
		await maybeRunIntro();
		expect(ui.introPlayed).toBe(true);
		expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
		// reduced-motion returns before any DOM work — no veil appended anywhere
		expect(document.querySelector('[data-board] div')).toBeNull();
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
});
