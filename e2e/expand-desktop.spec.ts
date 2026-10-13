import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro, collectErrors } from './helpers';

// Desktop expand flow on the Experience card: click → open (controls live at once) →
// settled (~1.9s) → close → board restored. Every phase is asserted on its observable
// (classes, data-open, element visibility) rather than sleeps.

test('experience: click → open → settle → close → board restored', async ({
	page
}) => {
	await page.setViewportSize(DESKTOP);
	const errors = collectErrors(page);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	await b.locator('[data-card="experience"]').click();

	// Immediately: open flag set (ui.openCard mirror), clone mounted, the panel is a
	// focused dialog, the ✕ is a real button, and siblings carry the burn class.
	await expect(b).toHaveAttribute('data-open', '1');
	const clone = b.locator('.is-clone');
	await expect(clone).toBeVisible();
	const dialog = clone.locator('[data-expand][role="dialog"]');
	await expect(dialog).toHaveAttribute('aria-modal', 'true');
	await expect(dialog).toBeFocused();
	const close = clone.getByRole('button', { name: /close experience/i });
	await expect(close).toBeVisible();
	expect(await b.locator('.burn-sib').count()).toBeGreaterThan(0);

	// Settled: settle class on, ✕ fully shown, expanded panel revealed.
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 8_000 });
	await expect(close).toHaveCSS('opacity', '1');
	await expect(dialog).toBeVisible();
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

	// The dataset.open guard in expandCard() must prevent a second clone.
	for (let i = 0; i < 6; i++) {
		expect(await b.locator('.is-clone').count()).toBeLessThanOrEqual(1);
		await page.waitForTimeout(150);
	}
});

// The second click of a double-click lands on the freshly mounted clone; body-click close
// is armed only at settle, so the card must still settle open.
test('double-clicked card still settles open', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	await b.locator('[data-card="experience"]').dblclick();

	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 8_000 });
	await expect(b).toHaveAttribute('data-open', '1');
});

// Close is usable from the first frame: Escape mid-open closes the card and focus
// returns to the tile that opened it.
test('Escape closes mid-open and returns focus to the tile', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	const tile = b.locator('[data-card="about"]');
	await tile.click();
	await expect(b).toHaveAttribute('data-open', '1');
	await page.keyboard.press('Escape');

	await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 5_000 });
	await expect(b).not.toHaveAttribute('data-open', '1');
	await expect(tile).toBeFocused();
});

// Back closes an open card (shallow history entry) without leaving the page.
test('browser Back closes the open card and stays on the page', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);
	const url = page.url();

	const b = board(page, 'desktop');
	await b.locator('[data-card="contact"]').click();
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 8_000 });
	await page.goBack();

	await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 5_000 });
	await expect(b).not.toHaveAttribute('data-open', '1');
	expect(page.url()).toBe(url);
});

// Tab stays inside the open dialog.
test('focus is trapped inside the open card', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	await b.locator('[data-card="contact"]').click();
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 8_000 });
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press('Tab');
		expect(
			await page.evaluate(() => !!document.activeElement?.closest('.is-clone')),
			`focus escaped the dialog after ${i + 1} Tab presses`
		).toBe(true);
	}
});
