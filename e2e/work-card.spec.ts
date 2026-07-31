import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro, openCard } from './helpers';
import { work } from '../src/lib/content';

// Work card (desktop): ✕-only close, ledger rows → case-study detail with the
// '0N / 06' counter, prev/next modulo wrap 01↔06, back restores the rows.

test('work is ✕-only: body click does not close, ✕ does', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	const clone = await openCard(page, 'desktop', 'work');

	// Body click on a plain spot (padding strip above the header row) — must NOT close.
	await clone.click({ position: { x: 300, y: 14 } });
	await page.waitForTimeout(800); // give a wrongful shut() time to tear down
	await expect(b).toHaveAttribute('data-open', '1');
	await expect(b.locator('.is-clone.is-settled')).toBeVisible();

	// ✕ closes.
	await clone.locator('.clone-close').click();
	await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 5_000 });
	await expect(b).not.toHaveAttribute('data-open', '1');
});

test('ledger row → detail 03/06, prev/next wrap 01↔06, back restores rows', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const clone = await openCard(page, 'desktop', 'work');
	const rows = clone.locator('[data-proj-row]');
	await expect(rows).toHaveCount(6);

	// Row 3 → detail with the '03 / 06' counter and the right project copy.
	await rows.nth(2).click();
	const detail = clone.locator('.proj-detail');
	await expect(detail).toBeVisible();
	await expect(detail).toContainText('03 / 06');
	await expect(detail).toContainText(work.projects[2].name);
	await expect(detail).toContainText(work.projects[2].problem);

	// Back → detail gone, rows faded back in.
	await detail.locator('[data-pd-back]').click();
	await expect(clone.locator('.proj-detail')).toHaveCount(0);
	await expect(rows.first()).toBeVisible();
	await expect(rows.first()).toHaveCSS('opacity', '1');

	// Wrap: 01 → prev → 06 → next → 01.
	await rows.nth(0).click();
	await expect(detail).toContainText('01 / 06');
	await detail.locator('[data-pd-prev]').click();
	await expect(detail).toContainText('06 / 06');
	await expect(detail).toContainText(work.projects[5].name);
	await detail.locator('[data-pd-next]').click();
	await expect(detail).toContainText('01 / 06');
	await expect(detail).toContainText(work.projects[0].name);

	// Detail clicks must never close the card (✕-only even inside the overlay).
	await expect(page.locator('.stage--desktop [data-board]')).toHaveAttribute('data-open', '1');
});
