import { test, expect } from '@playwright/test';
import { DESKTOP, settleIntro, openCard, pauseCssAnimations } from './helpers';

// The freeze rule: while a card is settled open (freeze.container = clone), the loop
// updates ONLY canvases inside the clone.
//
// Why not screenshot the outside canvas? The settled clone covers the ENTIRE board
// interior, so every outside canvas is hidden behind it — a screenshot of its box
// captures the clone's surface, not the canvas. The loop's actual contract is "no
// renders for outside canvases", so we count WebGL draw calls per canvas instead
// (deterministic, no pixel tolerance needed). The visible half of the contract — the
// inside canvas keeps animating — IS screenshot-observable and asserted via
// Buffer.compare.

declare global {
	interface Window {
		__drawCount: (selector: string) => number;
	}
}

test('settled card: outside canvas gets zero draw calls while inside keeps rendering', async ({
	page
}) => {
	await page.setViewportSize(DESKTOP);
	// Wrap WebGL draw entry points before any app code runs.
	await page.addInitScript(() => {
		const counts = new WeakMap<HTMLCanvasElement, number>();
		(window as Window).__drawCount = (selector: string) => {
			const cv = document.querySelector<HTMLCanvasElement>(selector);
			return cv ? (counts.get(cv) ?? 0) : -1;
		};
		const orig = HTMLCanvasElement.prototype.getContext;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(HTMLCanvasElement.prototype as any).getContext = function (type: string, ...args: unknown[]) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ctx = (orig as any).call(this, type, ...args);
			if (ctx && /^(webgl|webgl2|experimental-webgl)$/.test(type) && !ctx.__qaWrapped) {
				ctx.__qaWrapped = true;
				const cv = this as HTMLCanvasElement;
				for (const fn of ['drawArrays', 'drawElements'] as const) {
					const o = ctx[fn].bind(ctx);
					ctx[fn] = (...a: unknown[]) => {
						counts.set(cv, (counts.get(cv) ?? 0) + 1);
						return o(...a);
					};
				}
			}
			return ctx;
		};
	});

	await page.goto('/');
	await settleIntro(page);
	await page.waitForTimeout(600); // let on-screen scenes build + warm up

	const OUT = '.stage--desktop canvas[data-scene="campfire"]';
	const IN = '.stage--desktop .is-clone canvas[data-scene="flame"]';
	const count = (sel: string) => page.evaluate((s) => window.__drawCount(s), sel);

	// Sanity: campfire is live and rendering before any card opens.
	const pre = await count(OUT);
	expect(pre).toBeGreaterThan(0);

	// Contact's expanded panel carries its own envelope + flame canvases → real
	// "inside" scenes to contrast with the frozen outside campfire.
	const clone = await openCard(page, 'desktop', 'contact');
	await page.waitForTimeout(800); // reveal transitions done; freeze active since settle

	const out1 = await count(OUT);
	const in1 = await count(IN);
	expect(in1).toBeGreaterThan(0);

	// Visible contract: the inside flame advances on screen.
	await pauseCssAnimations(page);
	const inside = clone.locator('canvas[data-scene="flame"]');
	const shotA = await inside.screenshot();

	await page.waitForTimeout(1_000);

	const out2 = await count(OUT);
	const in2 = await count(IN);
	const shotB = await inside.screenshot();

	expect(out2, 'outside canvas must receive ZERO draw calls while frozen').toBe(out1);
	expect(in2, 'inside canvas must keep rendering').toBeGreaterThan(in1);
	expect(Buffer.compare(shotA, shotB), 'inside flame must visibly advance').not.toBe(0);

	// Close → outside canvas thaws (draw calls resume).
	await clone.locator('.clone-close').click();
	await expect(page.locator('.stage--desktop .is-clone')).toHaveCount(0, { timeout: 5_000 });
	const thaw1 = await count(OUT);
	await page.waitForTimeout(800);
	const thaw2 = await count(OUT);
	expect(thaw2, 'outside canvas must resume rendering after close').toBeGreaterThan(thaw1);
});
