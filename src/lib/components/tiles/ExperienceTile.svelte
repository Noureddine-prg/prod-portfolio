<script lang="ts">
	import { activateOnKey } from '$lib/util/a11y';
	// Experience tile — header + one entry per role; opens via `onopen`. Desktop (tall): the
	// roles sit on the board's shared warm dark over a thin, dimmed dusk strip of the sea (the
	// porthole in the panel keeps the bright sunset). Mobile (short): the sea under sea-glass.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import CompanyIcon from '../CompanyIcon.svelte';
	import TileHint from './TileHint.svelte';
	import { experience } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const pad = 14;
	const headFont = $derived(mobile ? 12 : 13);
	const nameFont = 12;
	const roleFont = 11;
	// logo chips run a little wider than tall so the NYC wordmark clears the type floor
	const logoW = $derived(mobile ? 30 : 28);
	const logoH = $derived(mobile ? 22 : 24);
	const logoBox = $derived(
		`border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;${
			mobile
				? 'background:rgba(16,27,33,.5);border:1px solid rgba(180,220,230,.16)'
				: 'background:rgba(255,255,255,.04);border:1px solid #3a302a'
		}`
	);
</script>

<div
	class="tile"
	data-tile
	data-card="experience"
	role="button"
	tabindex="0"
	onclick={onopen}
	onkeydown={(e) => activateOnKey(e, onopen)}
	style="{placement};background:{mobile ? '#0a0c12' : 'rgba(24,19,15,.72)'};border:1px solid {mobile
		? '#2a2424'
		: '#2e2520'};border-radius:9px;padding:{pad}px;display:flex;flex-direction:column;justify-content:{mobile ? 'space-between' : 'flex-start'};gap:{mobile ? 6 : 18}px"
>
	{#if mobile}
		<ThreeCanvas
			kind="calm"
			nowing
			sunzoom
			lite
			style="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none"
		/>
		<div
			style="position:absolute;inset:0;background:rgba(22,38,46,.34);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px rgba(180,220,230,.1);pointer-events:none"
		></div>
	{:else}
		<ThreeCanvas
			kind="calm"
			nowing
			sunzoom
			lite
			style="position:absolute;left:0;bottom:0;width:100%;height:24%;display:block;pointer-events:none;filter:brightness(var(--sea-b,.55)) saturate(var(--sea-s,.7));transition:filter .6s ease;-webkit-mask-image:linear-gradient(180deg,transparent,#000 55%);mask-image:linear-gradient(180deg,transparent,#000 55%)"
		/>
	{/if}

	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span
			style="font:400 {headFont}px 'Archivo Black',sans-serif;letter-spacing:.03em;color:#efe9e6;text-transform:uppercase{mobile
				? ';text-shadow:0 1px 6px rgba(0,0,0,.45)'
				: ''}"
			>{experience.header}</span
		>
		<TileHint {mobile} color={mobile ? '#d9e2e2' : '#d8cbc0'} />
	</div>

	<div style="position:relative;display:flex;flex-direction:column;gap:{mobile ? 7 : 16}px">
		{#each experience.roles as r (r.company)}
			<span
				style="display:flex;align-items:{mobile ? 'center' : 'flex-start'};gap:{mobile
					? 9
					: 10}px;min-width:0"
			>
				<span style="width:{logoW}px;height:{logoH}px;{logoBox}">
					{#if r.company === 'Google'}
						<CompanyIcon company="Google" w={11} h={11} />
					{:else if r.company === 'Meta'}
						<CompanyIcon company="Meta" w={13} h={9} />
					{:else}
						<span style="font:700 {mobile ? 12 : 10}px 'Archivo',sans-serif;letter-spacing:-.02em;color:#efe9e6">NYC</span>
					{/if}
				</span>
				{#if mobile}
					<span
						style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 {nameFont}px 'Archivo',sans-serif;color:#efe9e6"
						>{r.company}<span style="font-weight:400;color:#b9c4c4">{' · '}{r.title}</span></span
					>
				{:else}
					<span style="display:flex;flex-direction:column;gap:3px;min-width:0;line-height:1.2">
						<span
							style="font:600 {nameFont}px 'Archivo',sans-serif;color:#efe9e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
							>{r.company}</span
						>
						<span
							style="font:400 {roleFont}px 'Archivo',sans-serif;color:#b8aca3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
							>{r.title}</span
						>
					</span>
				{/if}
			</span>
		{/each}
	</div>
</div>

<style>
	/* hover (rework): the dimmed dusk strip warms back toward its sunset */
	@media (hover: hover) and (pointer: fine) {
		.tile:hover {
			--sea-b: 0.85;
			--sea-s: 1.05;
		}
	}
	.tile:focus-visible {
		--sea-b: 0.85;
		--sea-s: 1.05;
	}
</style>
