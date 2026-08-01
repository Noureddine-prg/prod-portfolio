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
	import { browser } from '$app/environment';
	import BoardDesktop from '$lib/components/BoardDesktop.svelte';
	import BoardMobile from '$lib/components/BoardMobile.svelte';
	import { maybeRunIntro, teardownIntro } from '$lib/interactions/intro';
	import { boardScale } from '$lib/stores/scale.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	const DESK_H = 620;
	const MOB_W = 390;

	// Initialized from the real window so the first hydrated render is already scaled;
	// the prerendered HTML (vw 0) keeps the stage hidden via `ready` below, so the
	// unscaled board never paints.
	let vw = $state(browser ? window.innerWidth : 0);
	let vh = $state(browser ? window.innerHeight : 0);
	// Small-viewport height (100svh): the minimum area guaranteed visible on mobile
	// regardless of the browser's dynamic URL bar. innerHeight can report the large
	// viewport while the bar is shown, which would size the board past the fold.
	let svh = $state(0);
	let svhProbe: HTMLDivElement | undefined;
	let ready = $state(false);
	const vhEff = $derived(svh && svh < vh ? svh : vh);

	// The board's design width tracks the viewport aspect (clamped to keep the grid sane
	// on extreme aspect ratios), so the fr-based grid itself spans edge-to-edge; a uniform
	// scale then fills the height with no distortion.
	const deskW = $derived(
		vw && vhEff ? Math.round(Math.min(1400, Math.max(760, (DESK_H * vw) / vhEff))) : 900
	);
	const deskScale = $derived(vw ? Math.max(0.5, Math.min(vhEff / DESK_H, vw / deskW)) : 1);
	// Mobile scales by width, capped so tablet widths get a centered column instead of a
	// blown-up phone layout. Design height tracks the device (clamped so tiles never
	// compress below usable) and the column form-fits the screen with no scrolling.
	const mobScale = $derived(vw ? Math.min(1.25, Math.max(0.75, vw / MOB_W)) : 1);
	const mobH = $derived(
		vw && vhEff ? Math.round(Math.min(1000, Math.max(640, vhEff / mobScale))) : 812
	);

	$effect(() => {
		boardScale.value = vw >= 900 ? deskScale : mobScale;
	});

	function readSvh() {
		if (svhProbe) svh = svhProbe.clientHeight;
	}

	onMount(() => {
		readSvh();
		ready = true;
		maybeRunIntro();
		return teardownIntro; // cancels a mid-intro unmount (rAF + veil)
	});
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} onresize={readSvh} />

<div bind:this={svhProbe} style="position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none" aria-hidden="true"></div>
<main class:ready>
	<div class="shade" class:on={ui.openCard !== null}></div>
	<div
		class="stage stage--desktop"
		style="width:{deskW * deskScale}px;height:{DESK_H * deskScale}px"
	>
		<div class="fit" style="transform:scale({deskScale})">
			<BoardDesktop designW={deskW} />
		</div>
	</div>
	<div class="stage stage--mobile" style="width:{MOB_W * mobScale}px;height:{mobH * mobScale}px">
		<div class="fit" style="transform:scale({mobScale})">
			<BoardMobile designH={mobH} />
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
		background: linear-gradient(168deg, #121f36 0%, #0e1728 42%, #080d16 100%);
		overflow-x: hidden; /* ash sway must never create horizontal scroll */
	}

	/* black field behind an expanded card; the transparent board lets it show through */
	.shade {
		position: fixed;
		inset: 0;
		background: #060505;
		opacity: 0;
		transition: opacity 0.6s ease;
		pointer-events: none;
	}
	.shade.on {
		opacity: 1;
	}

	/* Stages stay invisible in the prerendered (unscaled) HTML; the first hydrated
	 * render is already scaled, so revealing at mount never shows the mini board. */
	main:not(.ready) .stage {
		visibility: hidden;
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
