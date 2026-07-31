// The builder map. Scene teammates add their scene here in a one-line change:
//
//     import { buildCampfire } from './campfire';
//     export const SCENE_BUILDERS = { campfire: buildCampfire, ... };
//
// Any kind absent from the map renders as an empty scene (a one-time dev note is logged),
// so the whole board mounts and runs TODAY while scenes land incrementally.

import { dev } from '$app/environment';
import type { Builder, SceneKind } from '../types';
import { buildAxelog } from './axelog';

// Scene builders plug in here as they land (Stage 2).
export const SCENE_BUILDERS: Partial<Record<SceneKind, Builder>> = { axelog: buildAxelog };

const noted = new Set<string>();

/** Resolve a builder for a kind, or a no-op that logs once in dev. */
export function resolveBuilder(kind: SceneKind): Builder {
	const b = SCENE_BUILDERS[kind];
	if (b) return b;
	return () => {
		if (dev && !noted.has(kind)) {
			noted.add(kind);
			// eslint-disable-next-line no-console
			console.info(`[three] no builder for scene "${kind}" yet — rendering empty scene`);
		}
		return null;
	};
}
