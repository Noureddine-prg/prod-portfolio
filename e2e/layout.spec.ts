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
	// design width derives from the measured container (excludes any scrollbar)
	const mainW = await page.evaluate(() => document.querySelector('main')!.clientWidth);
	expect(design.w).toBe(Math.round((620 * mainW) / 800));
	await expect
		.poll(async () => (await b.boundingBox())!.width, { timeout: 15_000 })
		.toBeGreaterThan(1200);
	const box = (await b.boundingBox())!;
	expect(box.width).toBeGreaterThanOrEqual(mainW - 4);
	expect(box.width).toBeLessThanOrEqual(mainW + 1);
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
	// Let the intro finish so board geometry is stable before measuring stack order.
	await settleIntro(page);

	const b = board(page, 'mobile');
	await expect(b).toBeVisible();
	await expect(page.locator('.stage--desktop [data-board]')).toBeHidden();

	const box = (await b.boundingBox())!;
	const mainWm = await page.evaluate(() => document.querySelector('main')!.clientWidth);
	expect(box.width).toBeGreaterThanOrEqual(mainWm - 2);
	expect(box.width).toBeLessThanOrEqual(mainWm + 2);

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

// Born-red guard — kills the "mobScale clamp 1.25 → 5" survivor. At 390w the clamp never
// bites (390/390 = 1 < 1.25), so the mobile layout test can't see it; the cap only matters
// at tablet widths, where it keeps the phone column from blowing up to fill the screen.
// At 720w (mobile stage still active, < 900) the raw scale would be 720/390 ≈ 1.85, so the
// clamp must hold the stage at MOB_W × 1.25 = 487.5px, NOT stretch it toward the viewport.
test('tablet 720w: mobile column is clamped (mobScale cap 1.25), not blown up', async ({ page }) => {
	await page.setViewportSize({ width: 720, height: 900 });
	await page.goto('/');

	// Below 900w the mobile stage takes over and the desktop stage is hidden. Stages stay
	// `visibility:hidden` until hydration flips `main.ready`, which can lag several seconds
	// on a cold/parallel dev server — poll generously rather than assume first paint.
	const stage = page.locator('.stage--mobile');
	await expect(stage).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('.stage--desktop [data-board]')).toBeHidden();

	// Clamped width ≈ 390 × 1.25 = 487.5px. Uncapped (min(5, …)) it would balloon to ~720px.
	await expect
		.poll(async () => (await stage.boundingBox())!.width, { timeout: 15_000 })
		.toBeLessThan(540);
	const width = (await stage.boundingBox())!.width;
	expect(width).toBeGreaterThan(455); // still the 1.25 cap, not the 0.75 floor
	expect(width).toBeLessThan(540); // NOT stretched to the 720px viewport
});
