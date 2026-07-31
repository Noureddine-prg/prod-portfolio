<script lang="ts">
	// The board shell. Both boards (11a desktop / 11b mobile) live in the DOM — a media
	// query at 900px shows one; the loop only builds canvases that are actually on-screen,
	// so the hidden board costs nothing. The boards own the expand flow; the intro runs
	// once per session on the visible board (skipped under prefers-reduced-motion).
	//
	// Viewport scaling: each board keeps its native design coordinate system and is
	// transform-scaled to fill the viewport. The wrapper is sized to the scaled box, and
	// `boardScale` feeds the loop's render-resolution compensation.
	import { onMount } from 'svelte';
	import BoardDesktop from '$lib/components/BoardDesktop.svelte';
	import BoardMobile from '$lib/components/BoardMobile.svelte';
	import { maybeRunIntro, teardownIntro } from '$lib/interactions/intro';
	import { boardScale } from '$lib/stores/scale.svelte';

	const DESK_W = 900;
	const DESK_H = 620;
	const MOB_W = 390;

	let vw = $state(0);
	let vh = $state(0);
	let mobH = $state(0); // mobile board's natural (unscaled) content height

	// Fill the viewport edge-to-edge; the page bg matches the board bg so any
	// aspect-ratio gutter reads as part of the board.
	const deskScale = $derived(vw ? Math.max(0.5, Math.min(vw / DESK_W, vh / DESK_H)) : 1);
	// Mobile scales by width; the page scrolls vertically as usual.
	const mobScale = $derived(vw ? Math.max(0.75, vw / MOB_W) : 1);

	$effect(() => {
		boardScale.value = vw >= 900 ? deskScale : mobScale;
	});

	onMount(() => {
		maybeRunIntro();
		return teardownIntro; // cancels a mid-intro unmount (rAF + veil)
	});
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} />

<main>
	<div
		class="stage stage--desktop"
		style="width:{DESK_W * deskScale}px;height:{DESK_H * deskScale}px"
	>
		<div class="fit" style="transform:scale({deskScale})">
			<BoardDesktop />
		</div>
	</div>
	<div class="stage stage--mobile" style="width:{MOB_W * mobScale}px;height:{mobH * mobScale}px">
		<div class="fit" style="transform:scale({mobScale})" bind:clientHeight={mobH}>
			<BoardMobile />
		</div>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: #121010; /* board bg — gutters blend, cards read edge-to-edge */
	}

	.fit {
		transform-origin: top left;
	}

	/* Show one board per viewport. Desktop board is 900px wide; below that, the mobile
	 * board takes over. */
	.stage--desktop {
		display: block;
	}
	.stage--mobile {
		display: none;
	}

	@media (max-width: 899px) {
		main {
			align-items: flex-start;
		}
		.stage--desktop {
			display: none;
		}
		.stage--mobile {
			display: block;
		}
	}
</style>
