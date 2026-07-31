import { describe, it, expect, beforeEach } from 'vitest';
import { freeze, isInsideFrozen } from './freeze.svelte';

describe('freeze store', () => {
	beforeEach(() => {
		freeze.container = null;
	});

	it('defaults to nothing frozen', () => {
		expect(freeze.container).toBeNull();
	});

	it('holds the frozen container element', () => {
		const el = document.createElement('div');
		freeze.container = el;
		expect(freeze.container).toBe(el);
	});
});

describe('isInsideFrozen (loop containment check)', () => {
	it('lets every canvas update when nothing is frozen', () => {
		const node = document.createElement('canvas');
		expect(isInsideFrozen(null, node)).toBe(true);
	});

	it('updates only nodes inside the frozen container', () => {
		const outer = document.createElement('div');
		const inside = document.createElement('canvas');
		outer.appendChild(inside);
		const outsideParent = document.createElement('div');
		const outside = document.createElement('canvas');
		outsideParent.appendChild(outside);

		expect(isInsideFrozen(outer, inside)).toBe(true);
		expect(isInsideFrozen(outer, outside)).toBe(false);
	});
});
