import { test, expect } from '@playwright/test';
import { veilCount, reducedMotionPage } from './helpers';

// prefers-reduced-motion: scenes render ONE still frame instead of animating (loop.ts
// stillMode), the intro is a short static fade, and app.css collapses all CSS animations
// (duration 0.001ms, 1 iteration) so the ashrise drift cannot run.
//
// NOTE: contexts are built manually via reducedMotionPage() — on Playwright 1.62.1,
// test.use({ reducedMotion: 'reduce' }) is silently ignored (see helpers.ts).

test('scenes are still: the campfire draws once, then never again', async ({
	browser
}, testInfo) => {
	const { ctx, page } = await reducedMotionPage(browser, testInfo.project.use.baseURL);
	// Count WebGL draw calls on the campfire canvas. The contract is "no further renders";
	// a pixel compare of the canvas box was flaky — compositing under parallel load could
	// shift a few overlay pixels between two shots of the same still frame.
	await ctx.addInitScript(() => {
		const w = window as unknown as { __draws: number };
		w.__draws = 0;
		const orig = HTMLCanvasElement.prototype.getContext;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: unknown[]) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const gl = (orig as any).call(this, type, ...args);
			const cv = this as HTMLCanvasElement;
			if (gl && /webgl/.test(type) && cv.dataset.scene === 'campfire' && !gl.__qaWrapped) {
				gl.__qaWrapped = true;
				for (const fn of ['drawArrays', 'drawElements'] as const) {
					const o = gl[fn].bind(gl);
					gl[fn] = (...a: unknown[]) => {
						if (cv.closest('.stage--desktop')) w.__draws++;
						return o(...a);
					};
				}
			}
			return gl;
		};
	});
	const draws = () => page.evaluate(() => (window as unknown as { __draws: number }).__draws);
	try {
		await page.goto('/');
		// Wait for the veil to appear first — on a slow load "no veil yet" passes instantly.
		await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
		await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBe(0);

		// the loop flags a canvas once its first frame is drawn (a software-GL build can be slow)
		const campfire = page.locator('.stage--desktop canvas[data-scene="campfire"]');
		await expect(campfire).toHaveAttribute('data-live', '1', { timeout: 20_000 });

		await page.waitForTimeout(800); // a late layout resize may legitimately re-draw once
		const first = await draws();
		expect(first, 'campfire drew its still frame').toBeGreaterThan(0);
		await page.waitForTimeout(1_500);
		expect(await draws(), 'campfire must not render again').toBe(first);
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
