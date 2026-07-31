import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { currentHour, timeOfDay } from './time';

// Deterministic wall-clock behavior — the existing time.test.ts covers the pure
// bucketing; here the system clock itself is stubbed so the no-override fallback is
// asserted exactly, not just range-checked.

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('currentHour with a stubbed clock', () => {
	it('returns fractional local hours (06:30 → 6.5 → dawn)', () => {
		vi.setSystemTime(new Date(2026, 0, 15, 6, 30, 0));
		expect(currentHour('')).toBe(6.5);
		expect(timeOfDay(currentHour(''))).toBe('dawn');
	});

	it('18:45 → 18.75 → dusk', () => {
		vi.setSystemTime(new Date(2026, 6, 31, 18, 45, 0));
		expect(currentHour('')).toBe(18.75);
		expect(timeOfDay(currentHour(''))).toBe('dusk');
	});

	it('midday reads as night (fireside look) and midnight as night', () => {
		vi.setSystemTime(new Date(2026, 3, 1, 12, 0, 0));
		expect(timeOfDay(currentHour(''))).toBe('night');
		vi.setSystemTime(new Date(2026, 3, 1, 0, 0, 0));
		expect(timeOfDay(currentHour(''))).toBe('night');
	});

	it('?hour= override beats the clock', () => {
		vi.setSystemTime(new Date(2026, 3, 1, 18, 0, 0)); // dusk on the wall clock
		expect(currentHour('?hour=7')).toBe(7); // …but the override wins
		expect(timeOfDay(currentHour('?hour=7'))).toBe('dawn');
	});
});
