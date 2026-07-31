import { test, expect } from '@playwright/test';
import { veilCount, reducedMotionPage } from './helpers';

// prefers-reduced-motion: scenes render ONE still frame instead of animating (loop.ts
// stillMode), the intro never plays, and app.css collapses all CSS animations
// (duration 0.001ms, 1 iteration) so the ashrise drift cannot run.
//
// NOTE: contexts are built manually via reducedMotionPage() — on Playwright 1.62.1,
// test.use({ reducedMotion: 'reduce' }) is silently ignored (see helpers.ts).

test('scenes are still: campfire canvas pixel-identical across 1.2s', async ({
	browser
}, testInfo) => {
	const { ctx, page } = await reducedMotionPage(browser, testInfo.project.use.baseURL);
	try {
		await page.goto('/');

		// No intro under reduced motion; give the loop time to build + paint still frames.
		expect(await veilCount(page)).toBe(0);
		await page.waitForTimeout(1_800);
		// Belt & braces: freeze CSS-driven repaints so only canvas painting could differ.
		await page.addStyleTag({
			content:
				'*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }'
		});

		const campfire = page.locator('.stage--desktop canvas[data-scene="campfire"]');
		await expect(campfire).toBeVisible();

		const a = await campfire.screenshot();
		await page.waitForTimeout(1_200);
		const b = await campfire.screenshot();
		expect(Buffer.compare(a, b), 'campfire must be a single still frame').toBe(0);
	} finally {
		await ctx.close();
	}
});

test('no ashrise motion: zero running ashrise animations', async ({ browser }, testInfo) => {
	const { ctx, page } = await reducedMotionPage(browser, testInfo.project.use.baseURL);
	try {
		await page.goto('/');
		await page.waitForTimeout(800);

		// app.css reduced-motion override: 0.001ms × 1 iteration → every ashrise animation
		// is already finished; none may be running.
		const runningAsh = await page.evaluate(
			() =>
				document
					.getAnimations()
					.filter(
						(a) =>
							a.playState === 'running' &&
							a instanceof CSSAnimation &&
							a.animationName === 'ashrise'
					).length
		);
		expect(runningAsh).toBe(0);
	} finally {
		await ctx.close();
	}
});
