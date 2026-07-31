// The scene contract. Scene teammates implement ONE function per kind:
//
//     export function build<Kind>(ctx: SceneCtx): UpdateFn | null
//
// and register it in scenes/index.ts. Everything a builder needs is on `ctx`; builders
// never touch the DOM, the rAF loop, `new Date()`, or raw `Math.random()`.

import type * as THREE from 'three';
import type { Rand } from '$lib/util/rand';

// The six procedural scene kinds. porthole-wing is not its own kind — it lives inside
// the `calm` builder (gated by the `nowing`/`sunzoom` variants).
export type SceneKind = 'campfire' | 'calm' | 'flame' | 'jar' | 'envelope' | 'axelog';

export const SCENE_KINDS: readonly SceneKind[] = [
	'campfire',
	'calm',
	'flame',
	'jar',
	'envelope',
	'axelog'
] as const;

// Parsed `data-*` attributes + the resolved hour, handed to every builder.
export interface SceneVariants {
	lite: boolean; // data-lite  — mobile / reduced geometry + auto-drift instead of tilt
	nowing: boolean; // data-nowing — calm: hide the airplane wing group
	sunzoom: boolean; // data-sunzoom — calm: zoom onto the sun reflection column
	clean: boolean; // data-clean — envelope: pristine (no char/embers)
	hour: number; // resolved local hour (or ?hour= override), 0..23.999
}

export interface SceneCtx {
	/** The three.js module (pinned 0.151.x). Use `ctx.T.*` instead of importing three. */
	T: typeof THREE;
	scene: THREE.Scene;
	cam: THREE.PerspectiveCamera;
	/** Outer group the loop applies pointer-tilt / auto-drift to. */
	pivot: THREE.Group;
	/** Inner group the loop applies per-kind auto-spin to. Add scene content here. */
	spin: THREE.Group;
	renderer: THREE.WebGLRenderer;
	canvas: HTMLCanvasElement;
	variants: SceneVariants;
	/** Canvas backing-store size in CSS px at build time. */
	w: number;
	h: number;
	/** Seeded PRNG — deterministic per scene kind. */
	rand: Rand;
}

// The loop calls this every frame with the canvas's accumulated clock (seconds) and the
// frame delta (seconds). Most DC builders only use `t`.
export type UpdateFn = (t: number, dt: number) => void;

export type Builder = (ctx: SceneCtx) => UpdateFn | null;
