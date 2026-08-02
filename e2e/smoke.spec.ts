import { test, expect } from '@playwright/test';
import { collectErrors } from './helpers';

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

	// Give the loop a moment to build on-screen canvases.
	await page.waitForTimeout(800);
	expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('mobile board renders at 390w with no console errors', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const errors = collectErrors(page);

	await page.goto('/');
	await expect(page.locator('[data-board]:visible')).toHaveCount(1);

	const canvases = page.locator('canvas[data-three]');
	expect(await canvases.count()).toBeGreaterThanOrEqual(7);

	await page.waitForTimeout(800);
	expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});
