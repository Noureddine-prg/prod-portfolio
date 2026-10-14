// Builds one canvas's renderer/scene/cam/pivot/spin and dispatches to its builder.

import type * as THREE from 'three';
import { getMeta, setEntry, type SceneEntry } from './registry';
import { resolveBuilder } from './scenes';
import { parseVariants } from './variants';
import { currentHour } from '$lib/util/time';
import { mulberry32, hashSeed } from '$lib/util/rand';
import { quality } from './quality';
import type { SceneCtx, SceneKind } from './types';

/**
 * Build (or rebuild) the scene for a canvas. Returns the entry, or null if we're waiting
 * on a context restore / the build failed. `T` is the three module, injected so this file
 * never statically imports three (keeps it out of the SSR bundle path).
 */
export function buildCanvas(
	T: typeof THREE,
	cv: HTMLCanvasElement,
	pixelRatio: number
): SceneEntry | null {
	const m = getMeta(cv);

	// Awaiting a context restore from a prior offscreen dispose — kick it and bail; the
	// loop will retry once the browser fires webglcontextrestored.
	if (m.pending) return null;
	if (m.ext) {
		m.pending = true;
		const done = () => {
			cv.removeEventListener('webglcontextrestored', done);
			m.pending = false;
			m.ext = null;
		};
		cv.addEventListener('webglcontextrestored', done);
		try {
			m.ext.restoreContext();
		} catch {
			done();
		}
		return null;
	}

	const w = cv.clientWidth || 400;
	const h = cv.clientHeight || 300;

	const q = quality();
	const renderer = new T.WebGLRenderer({
		canvas: cv,
		antialias: q === 'full',
		alpha: true,
		preserveDrawingBuffer: true
	});
	renderer.setPixelRatio(pixelRatio); // the loop's ratio, so its first resize check is a no-op
	renderer.setSize(w, h, false);

	const scene = new T.Scene();
	const cam = new T.PerspectiveCamera(50, w / h, 0.1, 100);
	cam.position.z = 3.4;

	const pivot = new T.Group();
	scene.add(pivot);
	const spin = new T.Group();
	pivot.add(spin);

	const kind = (cv.dataset.scene || '') as SceneKind;
	const variants = parseVariants(cv.dataset, currentHour());
	const rand = mulberry32(hashSeed(kind || 'scene'));

	const ctx: SceneCtx = {
		T,
		scene,
		cam,
		pivot,
		spin,
		renderer,
		canvas: cv,
		variants,
		w,
		h,
		rand,
		quality: q
	};

	let update = null;
	try {
		update = resolveBuilder(kind)(ctx);
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error(`three build failed [${kind}]:`, e instanceof Error ? e.message : e);
		m.failed = true;
		try {
			renderer.dispose();
		} catch {
			/* noop */
		}
		return null;
	}

	const entry: SceneEntry = {
		renderer,
		scene,
		cam,
		pivot,
		spin,
		update,
		clk: null,
		kind,
		variants,
		mx: 0,
		my: 0,
		tx: 0,
		ty: 0
	};
	setEntry(cv, entry);
	return entry;
}
