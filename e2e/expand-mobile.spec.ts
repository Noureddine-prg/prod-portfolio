import { test, expect } from '@playwright/test';
import { MOBILE, board, settleIntro, openCard } from './helpers';

// Mobile expand flow (About at 390×844): non-Work cards close on a body click anywhere
// in the clone that isn't a link / copy-email / project row.

test('about (mobile): expands, settles, and body click closes it', async ({ page }) => {
	await page.setViewportSize(MOBILE);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'mobile');
	const clone = await openCard(page, 'mobile', 'about');
	await expect(clone.locator('[data-expand]')).toBeVisible();

	// Body click: a plain spot near the top of the panel (links live at the bottom).
	await clone.click({ position: { x: 12, y: 120 } });

	await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 5_000 });
	await expect(b).not.toHaveAttribute('data-open', '1');
	const tile = b.locator('[data-card="about"]');
	await expect(tile).toBeVisible();
	await expect(tile).toHaveCSS('visibility', 'visible');
	await expect(tile).toHaveCSS('opacity', '1');
});
