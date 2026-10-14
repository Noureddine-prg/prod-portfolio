<script lang="ts">
	// Board shell: both boards (11a/11b) stay in the DOM and a 900px media query shows one (the
	// loop only builds on-screen canvases). Each board keeps its design coordinates and is
	// transform-scaled to fill the viewport; `boardScale` feeds the loop's render compensation.
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import BoardDesktop from '$lib/components/BoardDesktop.svelte';
	import BoardMobile from '$lib/components/BoardMobile.svelte';
	import { maybeRunIntro, teardownIntro } from '$lib/interactions/intro';
	import { boardScale } from '$lib/stores/scale.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	const DESK_BREAKPOINT = 900; // mirrors the max-width: 899px media query below
	const DESK_H = 620;
	const DESK_W_MIN = 900; // the DC board width — narrower and the card panels overflow
	const DESK_H_MAX = 800;
	const DESK_W_FLOOR = 760; // only reached once deskH hits DESK_H_MAX
	const DESK_W_MAX = 1400;
	const DESK_SCALE_MIN = 0.5;
	const MOB_W = 390;
	const MOB_H = 812; // design height before the viewport is measured
	const MOB_H_MIN = 640;
	const MOB_H_MAX = 1000;
	const MOB_SCALE_MIN = 0.75;
	const MOB_SCALE_MAX = 1.25;

	// Layout truth for scaling: clientWidth of <main>, bound on mount. innerWidth can
	// disagree with the real container width and skew the centered stage.
	let mw = $state(0);
	let vh = $state(browser ? window.innerHeight : 0);
	// Small-viewport height (100svh): the minimum area guaranteed visible on mobile
	// regardless of the browser's dynamic URL bar. innerHeight can report the large
	// viewport while the bar is shown, which would size the board past the fold.
	let svh = $state(0);
	let svhProbe: HTMLDivElement | undefined;
	let ready = $state(false);
	const vhEff = $derived(svh && svh < vh ? svh : vh);

	// The board's design box tracks the viewport aspect so the fr-based grid spans edge-to-edge
	// and a uniform scale fills the window with no distortion. Wide windows keep the 620 design
	// height and widen; squarer ones (4:3, 5:4, small 16:10) grow TALLER rather than narrower
	// than 900 — a narrow box squeezed the expanded cards' text until it overflowed.
	const deskH = $derived(
		mw && vhEff
			? Math.round(Math.min(DESK_H_MAX, Math.max(DESK_H, (DESK_W_MIN * vhEff) / mw)))
			: DESK_H
	);
	const deskW = $derived(
		mw && vhEff
			? Math.round(Math.min(DESK_W_MAX, Math.max(DESK_W_FLOOR, (deskH * mw) / vhEff)))
			: DESK_W_MIN
	);
	const deskScale = $derived(
		mw ? Math.max(DESK_SCALE_MIN, Math.min(vhEff / deskH, mw / deskW)) : 1
	);
	// Mobile scales by width, capped so tablet widths get a centered column instead of a
	// blown-up phone layout. Design height tracks the device (clamped so tiles never
	// compress below usable) and the column form-fits the screen with no scrolling.
	const mobScale = $derived(mw ? Math.min(MOB_SCALE_MAX, Math.max(MOB_SCALE_MIN, mw / MOB_W)) : 1);
	const mobH = $derived(
		mw && vhEff ? Math.round(Math.min(MOB_H_MAX, Math.max(MOB_H_MIN, vhEff / mobScale))) : MOB_H
	);

	$effect(() => {
		boardScale.value = mw >= DESK_BREAKPOINT ? deskScale : mobScale;
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

<svelte:window bind:innerHeight={vh} onresize={readSvh} />

<div bind:this={svhProbe} style="position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none" aria-hidden="true"></div>
<main class:ready bind:clientWidth={mw}>
	<div class="field"></div>
	<div class="shade" class:on={ui.openCard !== null}></div>
	<div
		class="stage stage--desktop"
		style="width:{deskW * deskScale}px;height:{deskH * deskScale}px"
	>
		<div class="fit" style="transform:scale({deskScale})">
			<BoardDesktop designW={deskW} designH={deskH} />
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
		/* firelight spilling from the hero side, a faint cool night tint opposite */
		background:
			radial-gradient(55% 75% at 22% 62%, rgba(214, 110, 52, 0.13), transparent 72%),
			radial-gradient(80% 60% at 80% 0%, rgba(40, 52, 70, 0.18), transparent 70%),
			var(--c-field);
		z-index: 0;
		pointer-events: none;
	}

	/* black field behind an expanded card (the transparent board lets it show through) */
	/* root/body/theme-color stay charcoal so iOS's interaction-time bar-tint sample never catches black */
	.shade {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: calc(100lvh + 140px);
		background: #060505;
		opacity: 0;
		/* CLOSE hides instantly so the first paint after the close click is charcoal edge-to-edge */
		transition: opacity 0s;
		z-index: 1;
		pointer-events: none;
	}
	.shade.on {
		opacity: 1;
		transition: opacity 0.6s ease; /* OPEN still fades in */
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
		/* one warm glow high in the mobile column */
		.field {
			background:
				radial-gradient(90% 45% at 50% 18%, rgba(214, 110, 52, 0.13), transparent 72%),
				var(--c-field);
		}
		.stage--desktop {
			display: none;
		}
		.stage--mobile {
			display: block;
		}
	}
</style>
