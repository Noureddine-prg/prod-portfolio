import { test, expect } from '@playwright/test';
import { DESKTOP, veilCount, reducedMotionPage } from './helpers';

// Intro veil lifecycle. The veil is [data-intro-veil] on document.body (see veilCount).
// It plays once per browser session (sessionStorage), so a reload does NOT replay it.

test('intro plays on a fresh context: veil present early, gone within ~3.5s', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');

	// Veil mounts within ~0.4s of hydration (font wait caps at 350ms).
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
	// Split starts at 1.25-2.6s and takes 0.68s.
	await expect.poll(() => veilCount(page), { timeout: 10_000 }).toBe(0);
});

test('a click skips the intro', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
	await page.mouse.click(10, 10);
	// generous: headless SwiftShader starves the main thread, delaying timers
	await expect.poll(() => veilCount(page), { timeout: 5_000 }).toBe(0);
});

test('intro does not replay on a reload in the same session', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
	await expect.poll(() => veilCount(page), { timeout: 10_000 }).toBe(0);

	await page.reload();
	await page.waitForTimeout(1_500);
	expect(await veilCount(page)).toBe(0);
});

test.describe('reduced motion', () => {
	// Manual context — test.use({ reducedMotion }) is broken on PW 1.62.1 (helpers.ts).
	test('intro is a short static fade, then the veil is removed', async ({ browser }, testInfo) => {
		const { ctx, page } = await reducedMotionPage(browser, testInfo.project.use.baseURL);
		try {
			await page.goto('/');
			await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
			// ~1.4s of wall clock, but parallel WebGL-heavy workers can stretch timers well past it
			await expect.poll(() => veilCount(page), { timeout: 12_000 }).toBe(0);
		} finally {
			await ctx.close();
		}
	});
});
