import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tier rules: the probe picks the start tier, step-downs only ever go down and stick for the
// session, and ?quality= pins a tier (no step-down). quality.ts holds module state, so each
// test imports a fresh copy.

type Mod = typeof import('./quality');

async function fresh(search = ''): Promise<Mod> {
	vi.resetModules();
	vi.doMock('$app/environment', () => ({ browser: true }));
	history.replaceState(null, '', '/' + search);
	delete document.documentElement.dataset.quality;
	return import('./quality');
}

function stubGL(renderer: string | null) {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() =>
		renderer === null
			? null
			: {
					RENDERER: 1,
					getExtension: () => null,
					getParameter: () => renderer
				}) as unknown as HTMLCanvasElement['getContext']);
}

beforeEach(() => {
	vi.restoreAllMocks();
	sessionStorage.clear();
});

describe('quality tiers', () => {
	it('a hardware renderer starts on full', async () => {
		stubGL('ANGLE (NVIDIA GeForce RTX 3060 Direct3D11)');
		const q = await fresh();
		expect(q.initQuality()).toBe('full');
		expect(document.documentElement.dataset.quality).toBe('full');
	});

	it('software GL (or a refused performance context) starts on still', async () => {
		stubGL('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))');
		expect((await fresh()).initQuality()).toBe('still');
		stubGL(null);
		expect((await fresh()).initQuality()).toBe('still');
	});

	it('steps down only, and the step-down sticks for the session', async () => {
		stubGL('ANGLE (Intel UHD Graphics Direct3D11)');
		let q = await fresh();
		q.initQuality();
		expect(q.lowerQuality('reduced')).toBe(true);
		expect(q.lowerQuality('full')).toBe(false);
		expect(q.quality()).toBe('reduced');
		q = await fresh();
		expect(q.initQuality()).toBe('reduced');
	});

	it('?quality= pins the tier and disables step-down', async () => {
		stubGL('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))');
		const q = await fresh('?quality=full');
		expect(q.initQuality()).toBe('full');
		expect(q.lowerQuality('still')).toBe(false);
		expect(q.quality()).toBe('full');
	});
});
