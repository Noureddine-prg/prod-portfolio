import { test, expect, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, board, settleIntro, openCard } from './helpers';

// Quick re-open while a close is still tidying up. expand.ts keeps one module-level `active`
// handle: a new open must finish the previous close's pending cleanup, so no late timer can
// strip the fresh clone's migrated tile canvas or the tile's inline styles.

const CARDS = ['experience', 'about', 'contact', 'work'] as const;
type Card = (typeof CARDS)[number];
type Which = 'desktop' | 'mobile';

// Mid-close: the clone shrink runs 500ms and the tile fade-back finishes past ~700ms.
const REOPEN_DELAY_MS = 150;
// Negative-assertion window: longer than any stale cleanup timer (close tidy-up ends <~1s).
const STALE_CLEANUP_WINDOW_MS = 1300;

/** Computed opacity of every clone canvas that lives outside the panel (the migrated tile scene). */
function layerCanvasOpacities(page: Page, which: Which): Promise<string[]> {
	return page.evaluate((w) => {
		const clone = document.querySelector(`.stage--${w} [data-board] .is-clone`);
		if (!clone) return [];
		return [...clone.querySelectorAll<HTMLCanvasElement>('canvas[data-three]')]
			.filter((c) => !c.closest('[data-expand]'))
			.map((c) => getComputedStyle(c).opacity);
	}, which);
}

async function reopenMidClose(page: Page, which: Which, card: Card): Promise<void> {
	const b = board(page, which);
	const clone = await openCard(page, which, card);
	await clone.locator('.clone-close').click();
	await page.waitForTimeout(REOPEN_DELAY_MS);
	// a click event straight onto the tile: the tile may still be hidden / covered mid-close
	await b.locator(`[data-card="${card}"]`).dispatchEvent('click');
	await expect(b).toHaveAttribute('data-open', '1');
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });
}

async function expectOneSettledClone(page: Page, which: Which): Promise<void> {
	const b = board(page, which);
	await expect(page.locator('.is-clone')).toHaveCount(1);
	await expect(page.locator('[data-open="1"]')).toHaveCount(1);
	const ops = await layerCanvasOpacities(page, which);
	expect(ops.length, 'the tile scene rides in a layer over the panel').toBeGreaterThan(0);
	expect(ops.every((o) => o === '0'), `layer canvas opacities: ${ops}`).toBe(true);
	await expect(b.locator('.is-clone')).toHaveCount(1);
}

test.describe('re-open mid-close (desktop)', () => {
	for (const card of CARDS) {
		test(`${card}: same tile re-opened mid-close settles with one clone and a faded tile scene`, async ({
			page
		}) => {
			await page.setViewportSize(DESKTOP);
			await page.goto('/');
			await settleIntro(page);

			await reopenMidClose(page, 'desktop', card);
			await expectOneSettledClone(page, 'desktop');

			// past the old close's cleanup: nothing late may resurrect the scene or add a clone
			await page.waitForTimeout(STALE_CLEANUP_WINDOW_MS);
			await expectOneSettledClone(page, 'desktop');
			await expect(board(page, 'desktop')).toHaveAttribute('data-open', '1');
		});
	}

	test('close A then open a different card B mid-close: B settles, A tile is clean', async ({
		page
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await settleIntro(page);

		const b = board(page, 'desktop');
		const tileA = b.locator('[data-card="about"]');
		const clone = await openCard(page, 'desktop', 'about');
		await clone.locator('.clone-close').click();
		await page.waitForTimeout(REOPEN_DELAY_MS);
		await b.locator('[data-card="contact"]').dispatchEvent('click');
		await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });

		await expect(page.locator('.is-clone')).toHaveCount(1);
		await expect(b.locator('.is-clone [data-expand]')).toHaveAttribute('aria-label', /contact/i);

		const state = await tileA.evaluate((t) => ({
			visibility: (t as HTMLElement).style.visibility,
			kids: [...t.children].map((k) => ({
				opacity: (k as HTMLElement).style.opacity,
				transition: (k as HTMLElement).style.transition
			})),
			canvasHome: !!t.querySelector('canvas[data-three]'),
			pop: t.querySelectorAll('canvas[data-pop]').length
		}));
		expect(state.visibility).toBe('');
		expect(state.kids.length).toBeGreaterThan(0);
		for (const k of state.kids) expect(k).toEqual({ opacity: '', transition: '' });
		expect(state.canvasHome, 'About scene canvas is back in its tile').toBe(true);
		expect(state.pop).toBe(0);

		// and it survives the stale-cleanup window
		await page.waitForTimeout(STALE_CLEANUP_WINDOW_MS);
		await expect(page.locator('.is-clone')).toHaveCount(1);
	});
});

test('experience: same tile re-opened mid-close (mobile 390x844)', async ({ page }) => {
	await page.setViewportSize(MOBILE);
	await page.goto('/');
	await settleIntro(page);

	await reopenMidClose(page, 'mobile', 'experience');
	await expectOneSettledClone(page, 'mobile');
	await page.waitForTimeout(STALE_CLEANUP_WINDOW_MS);
	await expectOneSettledClone(page, 'mobile');
});
