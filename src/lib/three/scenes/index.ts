// The builder map. A kind absent from it renders as an empty scene (noted once in dev).

import { dev } from '$app/environment';
import { buildCampfire } from './campfire';
import type { Builder, SceneKind } from '../types';
import { buildAxelog } from './axelog';
import { buildCalm } from './calm';
import { buildEnvelope } from './envelope';
import { buildFlame } from './flame';
import { buildJar } from './jar';

// Porthole-wing lives inside calm.
export const SCENE_BUILDERS: Partial<Record<SceneKind, Builder>> = {
	axelog: buildAxelog,
	calm: buildCalm,
	campfire: buildCampfire,
	envelope: buildEnvelope,
	flame: buildFlame,
	jar: buildJar
};

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
