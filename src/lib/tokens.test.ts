import { describe, it, expect } from 'vitest';
import { color, radius, space, board, breakpoint, font } from './tokens';

// Token sanity — these values are extracted verbatim from the DC source of truth and
// mirrored into app.css; drift here silently un-themes the board.

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\d+,\d+,\d+,(0|1|\.\d+|0?\.\d+)\)$/;

describe('color tokens', () => {
	it('every token is a valid hex or rgba color', () => {
		for (const [name, v] of Object.entries(color)) {
			expect(HEX.test(v) || RGBA.test(v), `${name} = ${v}`).toBe(true);
		}
	});

	it('anchors match the DC palette', () => {
		expect(color.board).toBe('#121010');
		expect(color.cream).toBe('#cbbfa8');
		expect(color.ember).toBe('#ff8c3a');
		expect(color.terracotta).toBe('#c85a44');
	});
});

describe('board geometry', () => {
	it('desktop board is 900×620, mobile 390w', () => {
		expect(board.desktopW).toBe(900);
		expect(board.desktopH).toBe(620);
		expect(board.mobileW).toBe(390);
	});

	it('desktop grid template matches the DC (1.72fr 1fr 1fr × 4 rows)', () => {
		expect(board.gridCols).toBe('1.72fr 1fr 1fr');
		expect(board.gridRows).toBe('repeat(4,minmax(0,1fr))');
	});

	it('breakpoints are the two designed widths', () => {
		expect(breakpoint.mobile).toBe(390);
		expect(breakpoint.desktop).toBe(900);
	});
});

describe('radii & spacing', () => {
	it('all values are positive finite pixel numbers', () => {
		for (const [name, v] of Object.entries({ ...radius, ...space })) {
			expect(Number.isFinite(v), `${name}`).toBe(true);
			expect(v, name).toBeGreaterThan(0);
		}
	});

	it('board radii/padding match the DC (24/16 desktop, 28/12 mobile)', () => {
		expect(radius.boardDesktop).toBe(24);
		expect(radius.boardMobile).toBe(28);
		expect(space.boardPadDesktop).toBe(16);
		expect(space.boardPadMobile).toBe(12);
	});
});

describe('font stacks', () => {
	it('each stack names its face plus a generic fallback', () => {
		for (const [name, v] of Object.entries(font)) {
			expect(v, name).toMatch(/,\s*(sans-serif|serif|monospace)$/);
		}
	});
});
