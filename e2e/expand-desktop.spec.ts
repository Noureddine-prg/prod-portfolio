import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro, collectErrors } from './helpers';

// Desktop expand flow on the Experience card: click → mid-burn → settled → close →
// board restored. Every phase is asserted on its observable (classes, data-open,
// element visibility) rather than sleeps.

test('experience: click → burn → settle (✕ + is-settled) → close → board restored', async ({
	page
}) => {
	await page.setViewportSize(DESKTOP);
	const errors = collectErrors(page);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	await b.locator('[data-card="experience"]').click();

	// Immediately: open flag set (ui.openCard mirror), clone mounted, NOT yet settled.
	await expect(b).toHaveAttribute('data-open', '1');
	const clone = b.locator('.is-clone');
	await expect(clone).toBeVisible();
	expect(await b.locator('.is-clone.is-settled').count()).toBe(0);

	// Mid-burn: ✕ exists but is hidden; siblings carry the burn class + traveling front.
	const close = clone.locator('.clone-close');
	await expect(close).toHaveCSS('opacity', '0');
	await expect(b.locator('.burn-sib').first()).toBeVisible({ timeout: 2_500 });
	expect(await b.locator('.burn-fx').count()).toBeGreaterThan(0);

	// Settled (~1.95s): settle class on, ✕ faded in, expanded panel mounted + revealed.
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 8_000 });
	await expect(close).toHaveCSS('opacity', '1');
	await expect(clone.locator('[data-expand]')).toBeVisible();
	await expect(b).toHaveAttribute('data-open', '1'); // still open across the settle

	// Close via ✕: clone removed, open flag cleared, every tile restored.
	await close.click();
	await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 5_000 });
	await expect(b).not.toHaveAttribute('data-open', '1');
	for (const card of ['experience', 'about', 'contact', 'work'] as const) {
		const t = b.locator(`[data-card="${card}"]`);
		await expect(t).toBeVisible();
		await expect(t).toHaveCSS('visibility', 'visible');
		await expect(t).toHaveCSS('opacity', '1'); // restoration fade completes ≤ ~1.4s
	}
	expect(await b.locator('.burn-sib').count()).toBe(0);
	expect(await b.locator('.burn-fx').count()).toBe(0);

	expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
});

test('rapid double-click never yields two clones (open guard)', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	await b.locator('[data-card="experience"]').dblclick();

	// The dataset.open guard in expandCard() must prevent a second clone. (Exactly-one
	// can't be pinned here: the double-click close bug below tears the clone down after
	// ~470ms, so under load the single clone may already be gone by the first sample.)
	for (let i = 0; i < 6; i++) {
		expect(await b.locator('.is-clone').count()).toBeLessThanOrEqual(1);
		await page.waitForTimeout(150);
	}
});

// BUG (app, UX — do not fix here): the clone's click-to-exit listener is armed
// immediately in expandCard() (src/lib/interactions/expand.ts, the
// `clone.addEventListener('click', …)` block at the end of expandCard), while the ✕
// only activates at settle. The second click of a double-click therefore lands on the
// freshly-mounted clone and runs shut() mid-burn: the card opens and instantly cancels,
// never reaching .is-settled. Repro: desktop, dblclick [data-card="experience"] →
// data-open clears ~470ms later, settle never happens. Expected: a double-clicked card
// still settles open (body-click close should arm at settle, like the ✕).
test('double-clicked card still settles open', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	await b.locator('[data-card="experience"]').dblclick();

	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 8_000 });
	await expect(b).toHaveAttribute('data-open', '1');
});
