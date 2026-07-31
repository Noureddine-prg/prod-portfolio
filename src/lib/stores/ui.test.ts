import { describe, it, expect, beforeEach } from 'vitest';
import { ui, type CardId } from './ui.svelte';

// The ui store is a module-level singleton (lives for the tab's lifetime), so tests
// reset every field they touch rather than re-importing.
beforeEach(() => {
	ui.openCard = null;
	ui.workDetail = null;
	ui.introPlayed = false;
});

describe('ui.openCard', () => {
	it('defaults to null (board view)', () => {
		expect(ui.openCard).toBeNull();
	});

	it('accepts each of the four card ids and returns to null on close', () => {
		const cards: CardId[] = ['experience', 'about', 'contact', 'work'];
		for (const c of cards) {
			ui.openCard = c;
			expect(ui.openCard).toBe(c);
			ui.openCard = null;
			expect(ui.openCard).toBeNull();
		}
	});
});

describe('ui.workDetail interplay with openCard', () => {
	it('defaults to null (ledger view)', () => {
		expect(ui.workDetail).toBeNull();
	});

	it('holds a project id while the work card is open', () => {
		ui.openCard = 'work';
		ui.workDetail = 'delivery-tracking';
		expect(ui.openCard).toBe('work');
		expect(ui.workDetail).toBe('delivery-tracking');
	});

	it('navigating projects replaces the detail id without touching openCard', () => {
		ui.openCard = 'work';
		ui.workDetail = 'agentic-image-eval';
		ui.workDetail = 'org-chart'; // prev-wrap from 01 lands on 06
		expect(ui.workDetail).toBe('org-chart');
		expect(ui.openCard).toBe('work');
	});

	it('back-to-ledger clears only workDetail; card close clears openCard', () => {
		ui.openCard = 'work';
		ui.workDetail = 'qa-tooling';
		ui.workDetail = null; // ← all builds
		expect(ui.workDetail).toBeNull();
		expect(ui.openCard).toBe('work');
		ui.openCard = null; // ✕
		expect(ui.openCard).toBeNull();
	});
});

describe('ui.introPlayed session gate', () => {
	it('defaults to false and latches true', () => {
		expect(ui.introPlayed).toBe(false);
		ui.introPlayed = true;
		expect(ui.introPlayed).toBe(true);
	});
});

describe('ui.timeOfDay', () => {
	it('initializes to a valid bucket and accepts the three DC states', () => {
		expect(['night', 'dawn', 'dusk']).toContain(ui.timeOfDay);
		for (const t of ['dawn', 'dusk', 'night'] as const) {
			ui.timeOfDay = t;
			expect(ui.timeOfDay).toBe(t);
		}
	});
});
