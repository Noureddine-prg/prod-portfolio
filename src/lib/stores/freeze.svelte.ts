// Frozen-container store: the loop updates only canvases inside `container` (the DC
// `.is-clone.is-settled` rule). null = nothing frozen.

let container = $state<HTMLElement | null>(null);

export const freeze = {
	get container(): HTMLElement | null {
		return container;
	},
	set container(el: HTMLElement | null) {
		container = el;
	}
};

/** Pure form of the loop's freeze rule (the loop inlines this); exported for testing. */
export function isInsideFrozen(frozen: HTMLElement | null, node: Node): boolean {
	return !frozen || frozen.contains(node);
}
