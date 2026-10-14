// Tile hover → scene: flags the tile's canvases with data-hover (fine-pointer hover or keyboard
// focus-visible) — the same dataset channel as expand.ts's data-pop. Scenes ease toward the flag
// with dt; data-pop always wins. Canvases are remembered so a canvas the open card carried off
// still gets cleared on leave.
import type { Action } from 'svelte/action';

export const sceneHover: Action<HTMLElement> = (node) => {
	const fine = matchMedia('(hover: hover) and (pointer: fine)');
	const flagged = new Set<HTMLCanvasElement>();
	let pointer = false;
	let focus = false;

	const sync = () => {
		if (pointer || focus) {
			node.querySelectorAll<HTMLCanvasElement>('canvas[data-three]').forEach((cv) => {
				cv.dataset.hover = '1';
				flagged.add(cv);
			});
		} else {
			flagged.forEach((cv) => delete cv.dataset.hover);
			flagged.clear();
		}
	};
	const enter = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse' || !fine.matches) return;
		pointer = true;
		sync();
	};
	const leave = () => {
		pointer = false;
		sync();
	};
	const focusIn = () => {
		focus = node.matches(':focus-visible');
		sync();
	};
	const focusOut = () => {
		focus = false;
		sync();
	};

	node.addEventListener('pointerenter', enter);
	node.addEventListener('pointerleave', leave);
	node.addEventListener('focus', focusIn);
	node.addEventListener('blur', focusOut);
	return {
		destroy() {
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', leave);
			node.removeEventListener('focus', focusIn);
			node.removeEventListener('blur', focusOut);
			pointer = focus = false;
			sync();
		}
	};
};
