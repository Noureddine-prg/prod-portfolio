<script lang="ts">
	// Work tile — axe-in-log scene + featured projects. The card opens the ledger; a desktop row
	// is a pointer shortcut straight to its project (keyboard users reach it through the ledger,
	// so the tile stays one control). Mobile rows are names only; the whole card is the target.
	import { activateOnKey } from '$lib/util/a11y';
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import TileHint from './TileHint.svelte';
	import Icon from '../Icon.svelte';
	import { work } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
		onproject?: (id: string) => void;
	}
	let { mobile = false, placement = '', onopen = () => {}, onproject = () => {} }: Props = $props();

	const featured = work.featured.map((f) => ({
		...f,
		name: work.projects.find((p) => p.id === f.id)!.name
	}));

	function pick(e: MouseEvent, id: string) {
		e.stopPropagation();
		onproject(id);
	}

	// desktop: the lower part of the column is the campfire's night (data-hill); its sky fades
	// to transparent at the top into the tile's own night ground (the night zenith color), so
	// there is no seam; mobile: the plain axe right of the list
	const axeStyle = $derived(
		mobile
			? 'right:6px;top:50%;transform:translateY(-50%);height:82%;width:98px'
			: 'left:-1px;bottom:-1px;width:calc(100% + 2px);height:58%'
	);
</script>

<div
	class="tile work-tile"
	data-tile
	data-card="work"
	role="button"
	tabindex="0"
	aria-label={work.header}
	aria-haspopup="dialog"
	onclick={onopen}
	onkeydown={(e) => activateOnKey(e, onopen)}
	style="{placement};background:linear-gradient(180deg,#0b0d15,#05070d 70%);border:1px solid #1d2230;border-radius:9px;padding:var(--tile-pad);display:flex;flex-direction:column;gap:{mobile
		? 6
		: 14}px"
>
	<ThreeCanvas kind="axelog" hill={!mobile} style="position:absolute;{axeStyle};display:block" />

	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span
			style="font:400 var(--t-tile-head) 'Archivo Black',sans-serif;color:#efe9e6;text-transform:uppercase;letter-spacing:.03em"
			>{work.header}</span
		>
		<span class="head-hint"
			>{#if !mobile}<span class="head-label" aria-hidden="true">all builds</span>{/if}<TileHint
				{mobile}
				color="#c9cdd8"
			/></span
		>
	</div>

	<div
		style="position:relative;display:flex;flex-direction:column;{mobile
			? 'padding-right:112px'
			: ''}"
	>
		<span class="feat-label">Featured</span>
		{#each featured as f (f.id)}
			{#if mobile}
				<div class="wrow" style="padding:7px 4px;margin:0 -4px">
					<span style="display:flex;flex-direction:column;gap:1px;min-width:0">
						<span
							style="font:500 15px/1.15 'Cormorant Garamond',serif;color:#ece5da;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
							>{f.name}</span
						>
					</span>
				</div>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div class="wrow wrow--pick" style="padding:12px 6px;margin:0 -6px" onclick={(e) => pick(e, f.id)}>
					<span style="display:flex;flex-direction:column;gap:3px;min-width:0">
						<span style="font:500 19px/1.15 'Cormorant Garamond',serif;color:#ece5da">{f.name}</span>
						<span style="font:400 11px/1.3 'Archivo',sans-serif;color:#a8acb8">{f.metric}</span>
					</span>
					<span class="row-hint" aria-hidden="true"><Icon name="arrow-right" /></span>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	/* project rows: hairline separators; desktop rows (.wrow--pick) add the ledger's hover
	   (ember sweep + edge bar) and the card's arrow hands off to the hovered row */
	.wrow {
		position: relative;
		display: flex;
		border-top: 1px solid rgba(236, 229, 218, 0.22);
		border-radius: 4px;
		isolation: isolate;
	}
	.feat-label + .wrow {
		border-top-color: transparent;
	}
	.feat-label {
		font: 500 10px/1 'JetBrains Mono', monospace;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #e2954f;
		margin-bottom: 2px;
	}
	.wrow--pick::before,
	.wrow--pick::after {
		content: '';
		position: absolute;
		pointer-events: none;
		z-index: -1;
	}
	.wrow--pick::before {
		inset: 0;
		border-radius: 4px;
		background: rgba(226, 149, 79, 0.08);
		transform: scaleX(0);
		transform-origin: right;
		transition: transform 0.32s cubic-bezier(0.23, 1, 0.32, 1);
	}
	.wrow--pick::after {
		left: 0;
		top: 10px;
		bottom: 10px;
		width: 2px;
		border-radius: 1px;
		background: #e2954f;
		transform: scaleY(0);
		transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
	}
	.row-hint {
		position: absolute;
		right: 6px;
		top: 50%;
		margin-top: -8px;
		display: flex;
		font-size: 16px;
		color: #e2954f;
		opacity: 0;
		transform: translate(-6px, -4px);
		transition:
			opacity 0.18s ease,
			transform 0.26s cubic-bezier(0.23, 1, 0.32, 1);
	}
	.head-hint {
		position: relative;
		display: inline-flex;
		align-self: center; /* like TileHint on the other tiles — keeps WORK on their baseline */
		transition: opacity 0.15s ease;
	}
	/* card hover (desktop): names where the arrow goes; out of flow so nothing shifts */
	.head-label {
		position: absolute;
		right: calc(100% + 8px);
		top: 50%;
		white-space: nowrap;
		font: 500 11px/1 'JetBrains Mono', monospace;
		letter-spacing: 0.04em;
		color: #c9cdd8;
		opacity: 0;
		transform: translate(6px, -50%);
		transition:
			opacity 0.18s ease,
			transform 0.26s cubic-bezier(0.23, 1, 0.32, 1);
		pointer-events: none;
	}

	@media (hover: hover) and (pointer: fine) {
		.wrow--pick:hover::before {
			transform: scaleX(1);
			transform-origin: left;
		}
		.wrow--pick:hover::after {
			transform: scaleY(1);
			transition-delay: 0.06s;
		}
		.wrow--pick:hover .row-hint {
			opacity: 1;
			transform: none;
		}
		.work-tile:hover .head-label {
			opacity: 1;
			transform: translate(0, -50%);
		}
		.work-tile:has(.wrow--pick:hover) .head-hint {
			opacity: 0;
		}
	}
</style>
