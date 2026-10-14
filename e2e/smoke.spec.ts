import { test, expect, type Page } from '@playwright/test';
import { collectErrors } from './helpers';

/** Wait until every canvas of the visible board that is in the viewport has drawn its first frame. */
async function expectOnScreenCanvasesLive(page: Page): Promise<void> {
	await expect
		.poll(
			() =>
				page.evaluate(() => {
					const on = [
						...document.querySelectorAll<HTMLCanvasElement>('[data-board] canvas[data-three]')
					].filter((c) => {
						if (!c.offsetParent) return false; // inside the hidden board
						const r = c.getBoundingClientRect();
						return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
					});
					return on.length > 0 && on.every((c) => c.dataset.live);
				}),
			{ timeout: 20_000, message: 'on-screen canvases never got data-live' }
		)
		.toBe(true);
}

test('desktop board mounts with scene canvases and no console errors', async ({ page }) => {
	await page.setViewportSize({ width: 900, height: 900 });
	const errors = collectErrors(page);

	await page.goto('/');
	// Exactly one board is visible for this viewport, and it's the grid.
	await expect(page.locator('[data-board]:visible')).toHaveCount(1);

	// 7+ scene canvases mount across both boards (5 desktop + 5 mobile in the DOM).
	const canvases = page.locator('canvas[data-three]');
	expect(await canvases.count()).toBeGreaterThanOrEqual(7);

	// Static content is faithful.
	await expect(page.getByText('Noureddine', { exact: false }).first()).toBeVisible();

	await expectOnScreenCanvasesLive(page);
	expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('mobile board renders at 390w with no console errors', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const errors = collectErrors(page);

	await page.goto('/');
	await expect(page.locator('[data-board]:visible')).toHaveCount(1);

	const canvases = page.locator('canvas[data-three]');
	expect(await canvases.count()).toBeGreaterThanOrEqual(7);

	await expectOnScreenCanvasesLive(page);
	expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
