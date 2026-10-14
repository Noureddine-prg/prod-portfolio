import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro, openCard } from './helpers';

// The tile's live canvas moves into a layer over the panel during an open and must come home
// untouched: same parent, `data-pop` cleared, and the same look (opacity / filter / mask /
// transform) it had before the card opened.

const CARDS = ['experience', 'about', 'contact', 'work'] as const;

for (const card of CARDS) {
	test(`${card}: tile canvas returns to its parent with its original look`, async ({ page }) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await settleIntro(page);

		const b = board(page, 'desktop');
		const tile = b.locator(`[data-card="${card}"]`);
		const cv = tile.locator('canvas[data-three]').first();
		await expect(cv).toBeAttached();
		// a handle: the locator would lose the canvas while it rides in the clone
		const cvH = (await cv.elementHandle())!;

		const look = () =>
			cvH.evaluate((c) => {
				const s = getComputedStyle(c);
				return {
					opacity: s.opacity,
					filter: s.filter,
					maskImage: s.maskImage,
					transform: s.transform
				};
			});
		const parentHandle = await cvH.evaluateHandle((c) => c.parentElement);
		const before = await look();

		const clone = await openCard(page, 'desktop', card);
		// while open the canvas rides in the clone, outside its original parent
		expect(await cvH.evaluate((c) => !!c.closest('.is-clone'))).toBe(true);

		await clone.locator('.clone-close').click();
		await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 8_000 });
		await page.mouse.move(2, 2); // off every tile: no hover-warmed filter on the way back

		await expect
			.poll(() => cvH.evaluate((c, p) => c.parentElement === p, parentHandle), { timeout: 5_000 })
			.toBe(true);
		expect(await cvH.evaluate((c) => c.hasAttribute('data-pop'))).toBe(false);
		await expect.poll(look, { timeout: 5_000 }).toEqual(before);
	});
}
