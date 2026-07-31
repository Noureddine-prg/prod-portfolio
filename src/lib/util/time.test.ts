import { describe, it, expect } from 'vitest';
import { currentHour, timeOfDay } from './time';

describe('timeOfDay bucketing', () => {
	it('classifies dawn (05:00–07:59)', () => {
		expect(timeOfDay(5)).toBe('dawn');
		expect(timeOfDay(6.5)).toBe('dawn');
		expect(timeOfDay(7.99)).toBe('dawn');
	});

	it('classifies dusk (17:00–19:59)', () => {
		expect(timeOfDay(17)).toBe('dusk');
		expect(timeOfDay(19.5)).toBe('dusk');
	});

	it('classifies everything else as night', () => {
		expect(timeOfDay(0)).toBe('night');
		expect(timeOfDay(8)).toBe('night'); // boundary just past dawn
		expect(timeOfDay(12)).toBe('night'); // midday reads as night (fireside look)
		expect(timeOfDay(20)).toBe('night'); // boundary just past dusk
		expect(timeOfDay(23.9)).toBe('night');
	});

	it('wraps out-of-range hours', () => {
		expect(timeOfDay(29)).toBe('dawn'); // 29 % 24 = 5
		expect(timeOfDay(-1)).toBe('night'); // -1 → 23
	});
});

describe('currentHour ?hour= override', () => {
	it('reads a valid ?hour= value', () => {
		expect(currentHour('?hour=7')).toBe(7);
		expect(currentHour('?hour=0')).toBe(0);
	});

	it('normalizes into [0,24)', () => {
		expect(currentHour('?hour=26')).toBe(2);
		expect(currentHour('?hour=-2')).toBe(22);
	});

	it('falls back to the clock for missing/invalid override', () => {
		const noOverride = currentHour('?foo=bar');
		expect(noOverride).toBeGreaterThanOrEqual(0);
		expect(noOverride).toBeLessThan(24);
		const invalid = currentHour('?hour=notanumber');
		expect(invalid).toBeGreaterThanOrEqual(0);
		expect(invalid).toBeLessThan(24);
	});
});
