import { test, expect } from '@playwright/test';
import { DESKTOP, board, settleIntro } from './helpers';
import { work } from '../src/lib/content';

// Two pointer-driven tile behaviours.
//
// 1. sceneHover (src/lib/interactions/hover.ts): a fine-pointer mouse entering a tile that
//    uses `use:sceneHover` (About, Contact) sets data-hover="1" on every canvas[data-three]
//    inside it; leaving deletes the attribute. Keyboard focus-visible on the tile does the
//    same; blur clears it. The tile itself is NOT flagged, only its canvases. Desktop only:
//    hover is gated on (hover:hover) and (pointer:fine).
//
// 2. Work-row shortcut: a click on a project row of the Work TILE (.wrow) opens the Work card
//    straight onto that project's detail (.proj-detail, '0N / 06'); a click elsewhere on the
//    tile (header) opens the ledger (rows, no detail).

const HOVER_TILES = ['about', 'contact'] as const;

test.describe('sceneHover', () => {
	for (const card of HOVER_TILES) {
		test(`${card}: pointer enter flags its canvas, leave clears it`, async ({ page }) => {
			await page.setViewportSize(DESKTOP);
			await page.goto('/');
			await settleIntro(page);

			const tile = board(page, 'desktop').locator(`[data-card="${card}"]`);
			const canvases = tile.locator('canvas[data-three]');
			const n = await canvases.count();
			expect(n).toBeGreaterThan(0);
			await expect(tile.locator('canvas[data-three][data-hover]')).toHaveCount(0);

			await tile.hover();
			await expect(tile.locator('canvas[data-three][data-hover="1"]')).toHaveCount(n);
			// the flag lives on the canvases, not on the tile
			await expect(tile).not.toHaveAttribute('data-hover', /.*/);

			// move to the empty page corner, outside every tile
			await page.mouse.move(2, 2);
			await expect(tile.locator('canvas[data-three][data-hover]')).toHaveCount(0);
		});

		test(`${card}: keyboard focus flags its canvas, blur clears it`, async ({ page }) => {
			await page.setViewportSize(DESKTOP);
			await page.goto('/');
			await settleIntro(page);

			const tile = board(page, 'desktop').locator(`[data-card="${card}"]`);
			const n = await tile.locator('canvas[data-three]').count();
			expect(n).toBeGreaterThan(0);

			// a key press first so the programmatic focus() counts as :focus-visible
			await page.keyboard.press('Shift');
			await tile.focus();
			await expect(tile).toBeFocused();
			await expect(tile.locator('canvas[data-three][data-hover="1"]')).toHaveCount(n);

			await tile.evaluate((el) => (el as HTMLElement).blur());
			await expect(tile.locator('canvas[data-three][data-hover]')).toHaveCount(0);
		});
	}

	test('hover only flags the hovered tile; moving tile to tile hands the flag over', async ({
		page
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await settleIntro(page);

		const b = board(page, 'desktop');
		const about = b.locator('[data-card="about"]');
		const contact = b.locator('[data-card="contact"]');

		await about.hover();
		await expect(about.locator('canvas[data-three][data-hover="1"]').first()).toBeAttached();
		await expect(contact.locator('canvas[data-three][data-hover]')).toHaveCount(0);

		await contact.hover();
		await expect(contact.locator('canvas[data-three][data-hover="1"]').first()).toBeAttached();
		await expect(about.locator('canvas[data-three][data-hover]')).toHaveCount(0);
	});
});

test.describe('Work tile row shortcut', () => {
	test('clicking a project row opens the card straight to that project detail', async ({
		page
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await settleIntro(page);

		const b = board(page, 'desktop');
		const tileRows = b.locator('[data-card="work"] .wrow');
		await expect(tileRows).toHaveCount(work.featured.length);

		// second featured row (not the first, so a "default to project 1" bug would show)
		const target = work.projects.findIndex((p) => p.id === work.featured[1].id);
		expect(target).toBeGreaterThan(0);
		await tileRows.nth(1).click();

		await expect(b).toHaveAttribute('data-open', '1');
		const clone = b.locator('.is-clone');
		await expect(clone).toBeVisible();
		await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });

		const detail = clone.locator('.proj-detail');
		await expect(detail).toBeVisible();
		await expect(detail).toContainText(`0${target + 1} / 0${work.projects.length}`);
		await expect(detail).toContainText(work.projects[target].name);
		await expect(detail).toContainText(work.projects[target].problem);

		// back goes to the ledger of all projects
		await detail.locator('[data-pd-back]').click();
		await expect(clone.locator('.proj-detail')).toHaveCount(0);
		await expect(clone.locator('[data-proj-row]')).toHaveCount(work.projects.length);
	});

	test('header click (outside the rows) opens the ledger with no detail', async ({ page }) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await settleIntro(page);

		const b = board(page, 'desktop');
		const tile = b.locator('[data-card="work"]');
		// the header title sits above the first .wrow; it is not a row shortcut
		await tile.getByText(work.header, { exact: true }).click();

		await expect(b).toHaveAttribute('data-open', '1');
		const clone = b.locator('.is-clone');
		await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });
		await expect(clone.locator('[data-proj-row]')).toHaveCount(work.projects.length);
		await expect(clone.locator('.proj-detail')).toHaveCount(0);
	});

	test('a row shortcut does not leak: after closing, a plain open shows the list again', async ({
		page
	}) => {
		await page.setViewportSize(DESKTOP);
		await page.goto('/');
		await settleIntro(page);

		const b = board(page, 'desktop');
		await b.locator('[data-card="work"] .wrow').nth(2).click();
		await expect(b.locator('.is-clone.is-settled .proj-detail')).toBeVisible({ timeout: 12_000 });

		await b.locator('.is-clone .clone-close').click();
		await expect(b.locator('.is-clone')).toHaveCount(0, { timeout: 8_000 });
		await expect(b).not.toHaveAttribute('data-open', '1');

		await b.locator('[data-card="work"]').getByText(work.header, { exact: true }).click();
		await expect(b.locator('.is-clone.is-settled')).toBeVisible({ timeout: 12_000 });
		await expect(b.locator('.is-clone .proj-detail')).toHaveCount(0);
		await expect(b.locator('.is-clone [data-proj-row]')).toHaveCount(work.projects.length);
	});
});
