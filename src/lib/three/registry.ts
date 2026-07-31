// Canvas ↔ scene registry. No expando properties on DOM nodes — everything hangs off
// WeakMaps keyed by the canvas element, plus an iterable Set of the canvases currently
// mounted in the board. The loop iterates the Set; per-canvas state lives in the maps.

import type * as THREE from 'three';
import type { SceneKind, SceneVariants, UpdateFn } from './types';

// A built, live scene for one canvas.
export interface SceneEntry {
	renderer: THREE.WebGLRenderer;
	scene: THREE.Scene;
	cam: THREE.PerspectiveCamera;
	pivot: THREE.Group;
	spin: THREE.Group;
	update: UpdateFn | null;
	/** Accumulated clock (seconds). Freezes never jump it — it only advances by `dt`. */
	clk: number | null;
	kind: SceneKind;
	variants: SceneVariants;
	// eased pointer values (current) and targets, in [-0.5, 0.5]
	mx: number;
	my: number;
	tx: number;
	ty: number;
}

// Lifecycle bits that must persist across a context-loss dispose (when the entry itself
// is torn down but the canvas stays in the DOM).
export interface CanvasMeta {
	failed?: boolean; // builder threw fatally — never retry
	pending?: boolean; // awaiting webglcontextrestored before rebuild
	ext?: WEBGL_lose_context | null; // stashed lose-context extension for restore
}

const entries = new WeakMap<HTMLCanvasElement, SceneEntry>();
const meta = new WeakMap<HTMLCanvasElement, CanvasMeta>();
const mounted = new Set<HTMLCanvasElement>();

// Set by the loop so its IntersectionObserver (and onscreen set) release a canvas the
// moment it unmounts — the registry can't import the loop (the loop imports us).
let removeHook: ((cv: HTMLCanvasElement) => void) | null = null;
export function onCanvasRemoved(fn: (cv: HTMLCanvasElement) => void): void {
	removeHook = fn;
}

// ── mounted set (driven by ThreeCanvas mount/destroy) ─────────────────────────
export function addCanvas(cv: HTMLCanvasElement): void {
	mounted.add(cv);
}
export function removeCanvas(cv: HTMLCanvasElement): void {
	mounted.delete(cv);
	entries.delete(cv);
	meta.delete(cv);
	removeHook?.(cv);
}
export function liveCanvases(): Set<HTMLCanvasElement> {
	return mounted;
}

// ── per-canvas scene entry ────────────────────────────────────────────────────
export function getEntry(cv: HTMLCanvasElement): SceneEntry | undefined {
	return entries.get(cv);
}
export function setEntry(cv: HTMLCanvasElement, e: SceneEntry): void {
	entries.set(cv, e);
}
export function clearEntry(cv: HTMLCanvasElement): void {
	entries.delete(cv);
}

// Dev-only debug hook: lets E2E assert freeze semantics on live entries (a frozen
// canvas's `clk` stops advancing). Not part of the app contract; absent in prod builds.
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
	(globalThis as unknown as Record<string, unknown>).__cozyRegistry = { getEntry, liveCanvases };
}

// ── per-canvas lifecycle meta ─────────────────────────────────────────────────
export function getMeta(cv: HTMLCanvasElement): CanvasMeta {
	let m = meta.get(cv);
	if (!m) {
		m = {};
		meta.set(cv, m);
	}
	return m;
}
