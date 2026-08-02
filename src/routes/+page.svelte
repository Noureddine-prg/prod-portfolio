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
	// layout truth for scaling — innerWidth can disagree with the real container width,
	// which skews the centered stage; clientWidth cannot
	let mw = $state(0);
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
		mw && vhEff ? Math.round(Math.min(1400, Math.max(760, (DESK_H * mw) / vhEff))) : 900
	);
	const deskScale = $derived(mw ? Math.max(0.5, Math.min(vhEff / DESK_H, mw / deskW)) : 1);
	// Mobile scales by width, capped so tablet widths get a centered column instead of a
	// blown-up phone layout. Design height tracks the device (clamped so tiles never
	// compress below usable) and the column form-fits the screen with no scrolling.
	const mobScale = $derived(mw ? Math.min(1.25, Math.max(0.75, mw / MOB_W)) : 1);
	const mobH = $derived(
		mw && vhEff ? Math.round(Math.min(1000, Math.max(640, vhEff / mobScale))) : 812
	);

	$effect(() => {
		boardScale.value = (mw || vw) >= 900 ? deskScale : mobScale;
	});


	// Browser bar tints re-derive on load and on scroll — not on meta/style changes.
	// Colors flip with the card state, and after the close fade an invisible 1px
	// scroll-and-back (document is otherwise scroll-locked) forces the resample.
	$effect(() => {
		if (!browser) return;
		const open = ui.openCard !== null;
		const c = open ? '#060505' : '#101a2c';
		document.documentElement.style.backgroundColor = c;
		document.body.style.backgroundColor = c;
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c);
		if (open) return;
		const jiggle = setTimeout(() => {
			const de = document.documentElement;
			de.style.overflow = 'auto';
			document.body.style.minHeight = 'calc(100lvh + 2px)';
			window.scrollTo(0, 1);
			window.scrollTo(0, 0);
			document.body.style.minHeight = '';
			de.style.overflow = '';
		}, 750);
		return () => clearTimeout(jiggle);
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
<main class:ready bind:clientWidth={mw}>
	<div class="field"></div>
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
		background: transparent;
		overflow-x: hidden; /* ash sway must never create horizontal scroll */
	}

	/* THE background painter — a normal fixed element (like the intro veil) so the
	 * browser composites it into the bar strips; sized to the large viewport so it
	 * never restretches when the URL bar collapses */
	.field {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: calc(100lvh + 140px); /* overshoot under the bottom toolbar */
		background: #101a2c;
		z-index: 0;
		pointer-events: none;
	}

	/* black field behind an expanded card; the transparent board lets it show through */
	/* full-screen black while a card is open */
	.shade {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: calc(100lvh + 140px);
		background: #060505;
		opacity: 0;
		transition: opacity 0.6s ease;
		z-index: 1;
		pointer-events: none;
	}
	.shade.on {
		opacity: 1;
	}

	.stage {
		position: relative;
		z-index: 2;
	}

	/* Stages stay invisible in the prerendered (unscaled) HTML; the first hydrated
	 * render is already scaled, so revealing at mount never shows the mini board. */
	main:not(.ready) .stage {
		visibility: hidden;
	}

	.fit {
		position: relative;
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
