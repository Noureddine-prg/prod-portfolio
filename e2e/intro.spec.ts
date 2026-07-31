import { test, expect } from '@playwright/test';
import { DESKTOP, veilCount, reducedMotionPage } from './helpers';

// Intro veil lifecycle. The veil has no class in the DC port — it is identified as a
// board child with computed z-index 90 (see helpers.veilCount).
//
// NOTE on gate semantics: introPlayed is module state only ("once per load", CLAUDE.md).
// There is NO sessionStorage persistence, so a full reload REPLAYS the intro — asserted
// below as the current contract. The within-load once-only gate is unit-tested in
// src/lib/interactions/intro.test.ts.

test('intro plays on a fresh context: veil present early, gone by ~4s', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');

	// Veil mounts within ~0.5s (font preload race caps at 450ms).
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
	// Veil removes itself ~3.6s after mount.
	await expect.poll(() => veilCount(page), { timeout: 10_000 }).toBe(0);
});

test('intro replays on a full reload (per-load gate, no sessionStorage)', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
	await expect.poll(() => veilCount(page), { timeout: 10_000 }).toBe(0);

	await page.reload();
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
});

test.describe('reduced motion', () => {
	// Manual context — test.use({ reducedMotion }) is broken on PW 1.62.1 (helpers.ts).
	test('intro is skipped entirely — the veil never mounts', async ({ browser }, testInfo) => {
		const { ctx, page } = await reducedMotionPage(browser, testInfo.project.use.baseURL);
		try {
			await page.goto('/');

			// Sample across the window in which the veil would normally exist (0.5s–4s).
			await page.waitForTimeout(700);
			expect(await veilCount(page)).toBe(0);
			await page.waitForTimeout(1_300);
			expect(await veilCount(page)).toBe(0);
		} finally {
			await ctx.close();
		}
	});
});
