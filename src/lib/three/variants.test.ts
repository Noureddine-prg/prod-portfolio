import { describe, it, expect } from 'vitest';
import { parseVariants } from './variants';

describe('parseVariants', () => {
	it('parses all flags from data-* = "1"', () => {
		const v = parseVariants(
			{ lite: '1', nowing: '1', sunzoom: '1', clean: '1' },
			18.5
		);
		expect(v).toEqual({ lite: true, nowing: true, sunzoom: true, clean: true, hour: 18.5 });
	});

	it('treats missing / non-"1" values as false', () => {
		const v = parseVariants({ lite: '0', clean: 'true' }, 3);
		expect(v.lite).toBe(false);
		expect(v.nowing).toBe(false);
		expect(v.sunzoom).toBe(false);
		expect(v.clean).toBe(false);
		expect(v.hour).toBe(3);
	});

	it('carries the hour through unchanged', () => {
		expect(parseVariants({}, 0).hour).toBe(0);
		expect(parseVariants({}, 23.9).hour).toBe(23.9);
	});

	it('matches the Experience tile variant combo (nowing + sunzoom + lite)', () => {
		const v = parseVariants({ nowing: '1', sunzoom: '1', lite: '1' }, 12);
		expect(v.nowing && v.sunzoom && v.lite).toBe(true);
		expect(v.clean).toBe(false);
	});
});
