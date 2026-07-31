// Parse a canvas's `data-*` attributes into the SceneVariants the builders consume.
// Split out from build.ts so it's unit-testable without importing three.js.

import type { SceneVariants } from './types';

// A minimal shape matching DOMStringMap for the fields we read — lets tests pass a plain
// object without a real DOM node.
interface VariantDataset {
	lite?: string;
	nowing?: string;
	sunzoom?: string;
	clean?: string;
}

export function parseVariants(dataset: VariantDataset, hour: number): SceneVariants {
	return {
		lite: dataset.lite === '1',
		nowing: dataset.nowing === '1',
		sunzoom: dataset.sunzoom === '1',
		clean: dataset.clean === '1',
		hour
	};
}
