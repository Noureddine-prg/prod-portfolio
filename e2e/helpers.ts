import { expect, type Locator, type Page } from '@playwright/test';

// Shared plumbing for the regression suite. Observable-state contract:
// - board open flag:   [data-board][data-open="1"]      (mirrors ui.openCard)
// - expanding clone:   .is-clone                        (appended synchronously on click)
// - settled state:     .is-clone.is-settled             (~1.95s after click; freeze active)
// - close button:      .clone-close                     (opacity 0 → 1 on settle)
// - intro veil:        [data-intro-veil] on document.body

export const DESKTOP = { width: 1280, height: 800 };
export const MOBILE = { width: 390, height: 844 };

type Which = 'desktop' | 'mobile';

export function board(page: Page, which: Which): Locator {
	return page.locator(`.stage--${which} [data-board]`);
}

export function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});
	page.on('pageerror', (err) => errors.push(err.message));
	return errors;
}

/** Count intro veils currently in the DOM (viewport-level overlay on body). */
export function veilCount(page: Page): Promise<number> {
	return page.evaluate(() => document.querySelectorAll('[data-intro-veil]').length);
}

/** Wait out the intro (veil mounts ~0.4s, self-removes within ~3.3s). */
export async function settleIntro(page: Page): Promise<void> {
	// Generous first poll: cold-dev-server hydration can lag the intro several seconds.
	await expect.poll(() => veilCount(page), { timeout: 15_000 }).toBeGreaterThan(0);
	await expect.poll(() => veilCount(page), { timeout: 10_000 }).toBe(0);
}

// WORKAROUND (Playwright 1.62.1): test.use({ reducedMotion }) is ignored for the fixture
// context but browser.newContext({ reducedMotion }) works, so build it manually. Callers close it.
export async function reducedMotionPage(
	browser: import('@playwright/test').Browser,
	baseURL: string | undefined,
	viewport = DESKTOP
): Promise<{ ctx: import('@playwright/test').BrowserContext; page: Page }> {
	const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport, baseURL });
	const page = await ctx.newPage();
	return { ctx, page };
}

/** Click a tile and wait through the burn to the settled clone. Returns the clone. */
export async function openCard(
	page: Page,
	which: Which,
	card: 'experience' | 'about' | 'contact' | 'work'
): Promise<Locator> {
	const b = board(page, which);
	await b.locator(`[data-card="${card}"]`).click();
	await expect(b).toHaveAttribute('data-open', '1');
	const clone = b.locator('.is-clone');
	await expect(clone).toBeVisible();
	// settle lands at ~1.95s — the settle class is the observable, not a sleep
	// (generous timeout: parallel WebGL-heavy workers can stretch wall-clock timers)
	await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });
	return clone;
}

/** Pause CSS animations/transitions so pixel comparisons see only canvas repaints (rAF unaffected). */
export async function pauseCssAnimations(page: Page): Promise<void> {
	await page.addStyleTag({
		content:
			'*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }'
	});
}
