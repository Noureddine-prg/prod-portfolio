import { test, expect } from '@playwright/test';
import { DESKTOP, MOBILE, board, settleIntro } from './helpers';
import { profile } from '../src/lib/content';

// Both-breakpoint layout guards: the fixed 900×620 desktop grid at 1280w, and the
// mobile stacking order (hero → about → [contact+health] → experience → work → footer)
// at 390w. Exactly one board is visible per viewport.

test('desktop 1280w: 900×620 grid board, mobile stage hidden', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');

	const b = board(page, 'desktop');
	await expect(b).toBeVisible();
	await expect(page.locator('.stage--mobile [data-board]')).toBeHidden();

	// Design height stays 620; design width tracks the viewport aspect (620 * vw/vh,
	// clamped 760-1400) so the grid spans the full screen after the uniform scale.
	// The scale applies at hydration, which can lag first paint on cold compiles —
	// poll until the scaled rect appears before asserting exact geometry.
	const design = await b.evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
	expect(design.h).toBe(620);
	expect(design.w).toBe(Math.round((620 * 1280) / 800)); // = 992
	await expect
		.poll(async () => (await b.boundingBox())!.width, { timeout: 15_000 })
		.toBeGreaterThan(1200);
	const box = (await b.boundingBox())!;
	expect(box.width).toBeGreaterThanOrEqual(1280 - 4);
	expect(box.width).toBeLessThanOrEqual(1280 + 1);
	expect(box.height).toBeGreaterThanOrEqual(800 - 4);
	expect(box.height).toBeLessThanOrEqual(800 + 1);

	// It's a real 3-column grid (1.72fr 1fr 1fr resolves to 3 pixel tracks).
	const grid = await b.evaluate((el) => {
		const cs = getComputedStyle(el);
		return { display: cs.display, cols: cs.gridTemplateColumns.split(' ').length };
	});
	expect(grid.display).toBe('grid');
	expect(grid.cols).toBe(3);

	// All four interactive tiles plus the display-only ones are present.
	await expect(b.locator('[data-tile]')).toHaveCount(4);
	for (const card of ['experience', 'about', 'contact', 'work'] as const) {
		await expect(b.locator(`[data-card="${card}"]`)).toBeVisible();
	}
	await expect(b.getByText('Health', { exact: true })).toBeVisible();
	await expect(b.getByText('Wildcard', { exact: true })).toBeVisible();
});

test('mobile 390w: order hero → about → [contact+health] → experience → work → footer', async ({
	page
}) => {
	await page.setViewportSize(MOBILE);
	await page.goto('/');
	// The intro veil renders the full name inside the board — wait it out so the
	// footer locator below can't accidentally match the veil's name span.
	await settleIntro(page);

	const b = board(page, 'mobile');
	await expect(b).toBeVisible();
	await expect(page.locator('.stage--desktop [data-board]')).toBeHidden();

	const box = (await b.boundingBox())!;
	expect(box.width).toBeGreaterThanOrEqual(388);
	expect(box.width).toBeLessThanOrEqual(394);

	const y = async (sel: ReturnType<typeof b.locator>) => (await sel.boundingBox())!.y;

	const hero = await y(b.locator('canvas[data-scene="campfire"]'));
	const exp = await y(b.locator('[data-card="experience"]'));
	const contact = await y(b.locator('[data-card="contact"]'));
	const health = await y(b.getByText('Health', { exact: true }).first());
	const about = await y(b.locator('[data-card="about"]'));
	const work = await y(b.locator('[data-card="work"]'));
	// Footer strip: the only element whose full text is the complete name.
	const footer = await y(b.getByText(profile.name, { exact: true }).last());

	expect(hero).toBeLessThan(about);
	expect(about).toBeLessThan(contact);
	// contact and health share one row — their tops are within the tile's header inset
	expect(Math.abs(contact - health)).toBeLessThan(40);
	expect(contact).toBeLessThan(exp);
	expect(exp).toBeLessThan(work);
	expect(work).toBeLessThan(footer);
});
