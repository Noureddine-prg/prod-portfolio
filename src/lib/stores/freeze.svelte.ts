// The frozen-container store. When a card clone is settled-open, the interaction layer
// (Stage 3) sets `freeze.container` to that element. The loop then updates ONLY canvases
// inside it — same semantics as the DC `.is-clone.is-settled` rule. null = nothing frozen.

let container = $state<HTMLElement | null>(null);

export const freeze = {
	get container(): HTMLElement | null {
		return container;
	},
	set container(el: HTMLElement | null) {
		container = el;
	}
};

/** Pure containment check the loop uses each frame; exported for testing. */
export function isInsideFrozen(frozen: HTMLElement | null, node: Node): boolean {
	return !frozen || frozen.contains(node);
}
