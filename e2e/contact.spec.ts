import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro, openCard } from './helpers';
import { profile, contact } from '../src/lib/content';

// Contact card (desktop): copy-email writes the real address to the clipboard, the
// label flips to '✦ signal sent' and reverts after 2200ms; mailto href is correct.

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('copy email → clipboard + label flip + 2200ms revert; mailto correct', async ({ page }) => {
	await page.setViewportSize(DESKTOP);
	await page.goto('/');
	await settleIntro(page);

	const b = board(page, 'desktop');
	const clone = await openCard(page, 'desktop', 'contact');

	const label = clone.locator('[data-copy-label]');
	await expect(label).toHaveText(contact.copyLabel); // 'tap to copy'

	await clone.locator('[data-copy-email]').click();

	// Label flips immediately…
	await expect(label).toHaveText(contact.copiedLabel); // '✦ signal sent'
	// …the clipboard holds exactly the content-module email. Poll: the app fires
	// clipboard.writeText without awaiting it, so the write can land a beat after the
	// label flip — the flip is synchronous state, the write is a promise.
	await expect
		.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 3_000 })
		.toBe(profile.email);
	// …and the copy row click did NOT close the card (it's on the ignore list).
	await expect(b).toHaveAttribute('data-open', '1');

	// Reverts after 2200ms.
	await expect(label).toHaveText(contact.copyLabel, { timeout: 4_000 });

	// mailto: the write-me link targets the same address.
	await expect(clone.locator('a[href^="mailto:"]')).toHaveAttribute(
		'href',
		`mailto:${profile.email}`
	);
});
