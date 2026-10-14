import { test, expect } from '@playwright/test';
import { MOBILE, board, settleIntro, openCard, reducedMotionPage } from './helpers';
import { work } from '../src/lib/content';

// Mobile (390x844) card behaviour: Work is a single control opening the ledger, every open
// burns the hero too, and reduced motion still reveals the Experience role cards.

test('work tile rows are names only; tapping a row opens the ledger, not a detail', async ({
	page
}) => {
	await page.setViewportSize(MOBILE);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'mobile');
	const tile = b.locator('[data-card="work"]');
	await expect(tile.locator('.head-label')).toHaveCount(0);

	const rows = tile.locator('.wrow');
	await expect(rows).toHaveCount(work.featured.length);
	for (let i = 0; i < work.featured.length; i++) {
		const name = work.projects.find((p) => p.id === work.featured[i].id)!.name;
		await expect(rows.nth(i)).toHaveText(name);
		await expect(rows.nth(i)).not.toContainText(work.featured[i].metric);
	}

	await rows.nth(1).click();
	await expect(b).toHaveAttribute('data-open', '1');
	const clone = b.locator('.is-clone');
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });
	await expect(clone.locator('[data-proj-row]')).toHaveCount(6);
	await expect(clone.locator('.proj-detail')).toHaveCount(0);
});

test('hero burns with its siblings on every open and is clean after close', async ({ page }) => {
	await page.setViewportSize(MOBILE);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'mobile');
	const hero = b.locator('xpath=./div[.//h1]');
	await expect(hero).toHaveCount(1);

	// the hero's own markup sets position:relative inline; compare against that baseline
	const inline = () => hero.evaluate((h) => [h.style.opacity, h.style.position, h.style.animation]);
	const baseline = await inline();
	expect(baseline[0]).toBe('');

	for (const card of ['experience', 'work'] as const) {
		const clone = await openCard(page, 'mobile', card);
		// the class is added on the open and stays through the settle
		await expect(hero).toHaveClass(/burn-sib/);
		await clone.locator('.clone-close').click();
		await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 8_000 });
		await expect(b.locator('.burn-sib')).toHaveCount(0);
		await expect.poll(inline, { timeout: 5_000 }).toEqual(baseline);
	}
});

test('reduced motion: mobile Experience role cards are fully visible', async ({
	browser,
	baseURL
}) => {
	const { ctx, page } = await reducedMotionPage(browser, baseURL, MOBILE);
	try {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/');
		// no intro under reduced motion: the board is interactive straight away
		const clone = await openCard(page, 'mobile', 'experience');
		const cards = clone.locator('[data-exp-card]');
		expect(await cards.count()).toBeGreaterThan(0);
		for (let i = 0; i < (await cards.count()); i++) {
			await expect(cards.nth(i)).toHaveCSS('opacity', '1');
		}
	} finally {
		await ctx.close();
	}
});
