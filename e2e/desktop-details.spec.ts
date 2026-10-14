import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro, openCard } from './helpers';

// Small desktop details: Work header hover label, quality pinning, resize-closes-card.

test('work tile: "all builds" label hidden at rest, shown on hover; Featured label', async ({
	page
}) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const tile = board(page, 'desktop').locator('[data-card="work"]');
	const label = tile.locator('.head-label');
	await expect(label).toHaveText('all builds');
	await expect(label).toHaveCSS('opacity', '0');
	await expect(tile.locator('.feat-label')).toHaveText('Featured');

	await tile.hover();
	await expect.poll(() => label.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');

	await page.mouse.move(2, 2);
	await expect.poll(() => label.evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
});

for (const q of ['full', 'reduced', 'still'] as const) {
	test(`?quality=${q} pins the tier on <html>`, async ({ page }) => {
		await page.goto(`/?quality=${q}`);
		await expect(page.locator('html')).toHaveAttribute('data-quality', q);
	});
}

test('resizing below 900px closes an open card', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);
	await openCard(page, 'desktop', 'experience');

	await page.setViewportSize({ width: 800, height: 900 });
	await expect(page.locator('.is-clone')).toHaveCount(0, { timeout: 8_000 });
	await expect(page.locator('[data-open]')).toHaveCount(0);
});
