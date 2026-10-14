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

/** The loop's freeze rule: while a container is frozen, only canvases inside it update. */
export function isInsideFrozen(frozen: HTMLElement | null, node: Node): boolean {
	return !frozen || frozen.contains(node);
}
