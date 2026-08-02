<script lang="ts">
	import { activateOnKey } from '$lib/util/a11y';
	// Experience tile — calm ocean under a sea-glass overlay + header + company chips; opens via `onopen`.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import CompanyIcon from '../CompanyIcon.svelte';
	import { experience } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const pad = $derived(mobile ? 14 : 16);
	const headFont = $derived(mobile ? 11 : 13);
	const chipGap = $derived(mobile ? 14 : 20);
	const chipFont = $derived(mobile ? 11 : 11.5);
	const rowGap = $derived(mobile ? 7 : 8);
</script>

<div
	class="tile"
	data-tile
	data-card="experience"
	role="button"
	tabindex="0"
	onclick={onopen}
	onkeydown={(e) => activateOnKey(e, onopen)}
	style="{placement};background:#0a0c12;border:1px solid #2a2424;border-radius:9px;padding:{pad}px;display:flex;flex-direction:column;justify-content:space-between"
>
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

	<div
		style="position:relative;display:flex;justify-content:space-between;align-items:baseline;padding:{mobile
			? '6px 8px 0'
			: '2px 4px 0'}"
	>
		<span
			style="font:400 {headFont}px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#efe9e6;text-transform:uppercase;text-shadow:0 1px 6px rgba(0,0,0,.45)"
			>{experience.header}</span
		>
		<span style="font:400 8px 'JetBrains Mono',monospace;color:#b9c4c4">{experience.period}</span>
	</div>

	<div
		style="position:relative;display:flex;align-items:center;gap:{chipGap}px;padding:{mobile
			? '0 8px 6px'
			: '0 4px 2px'}"
	>
		<span style="display:flex;align-items:center;gap:{rowGap}px"
			><span
				style="width:24px;height:24px;border-radius:7px;background:rgba(16,27,33,.5);border:1px solid rgba(180,220,230,.16);flex:none;display:flex;align-items:center;justify-content:center"
				><CompanyIcon company="Google" w={12} h={12} /></span
			><span style="font:600 {chipFont}px 'Archivo',sans-serif;color:#efe9e6">Google</span></span
		>
		<span style="display:flex;align-items:center;gap:{rowGap}px"
			><span
				style="width:24px;height:24px;border-radius:7px;background:rgba(16,27,33,.5);border:1px solid rgba(180,220,230,.16);flex:none;display:flex;align-items:center;justify-content:center"
				><CompanyIcon company="Meta" w={14} h={10} /></span
			><span style="font:600 {chipFont}px 'Archivo',sans-serif;color:#efe9e6">Meta</span></span
		>
		<span style="display:flex;align-items:center;gap:{rowGap}px"
			><span
				style="width:24px;height:24px;border-radius:7px;background:rgba(16,27,33,.5);border:1px solid rgba(180,220,230,.16);flex:none;display:flex;align-items:center;justify-content:center;font:700 7.5px 'Archivo',sans-serif;color:#efe9e6"
				>NYC</span
			><span style="font:600 {chipFont}px 'Archivo',sans-serif;color:#efe9e6">NYC Mayor's Office</span
			></span
		>
	</div>
</div>
