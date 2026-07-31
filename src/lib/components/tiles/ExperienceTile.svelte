<script lang="ts">
	// Experience — ocean (calm) scene under a sea-glass overlay + header + company chips
	// (DC 11a L115-126 / 11b L450-461). Interactive: `onopen` is a Stage-1 stub.
	import ThreeCanvas from '../ThreeCanvas.svelte';
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

	function activate() {
		onopen();
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activate();
		}
	}
</script>

<div
	class="tile"
	data-tile
	data-card="experience"
	role="button"
	tabindex="0"
	onclick={activate}
	onkeydown={onKey}
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
				><svg width="12" height="12" viewBox="0 0 48 48"
					><path
						fill="#EA4335"
						d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
					></path><path
						fill="#4285F4"
						d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
					></path><path
						fill="#FBBC05"
						d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
					></path><path
						fill="#34A853"
						d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
					></path></svg
				></span
			><span style="font:600 {chipFont}px 'Archivo',sans-serif;color:#efe9e6">Google</span></span
		>
		<span style="display:flex;align-items:center;gap:{rowGap}px"
			><span
				style="width:24px;height:24px;border-radius:7px;background:rgba(16,27,33,.5);border:1px solid rgba(180,220,230,.16);flex:none;display:flex;align-items:center;justify-content:center"
				><svg width="14" height="10" viewBox="0 0 48 32"
					><path
						d="M24 16 C19 8 9 6.5 9 16 C9 25.5 19 24 24 16 C29 8 39 6.5 39 16 C39 25.5 29 24 24 16"
						fill="none"
						stroke="#0082FB"
						stroke-width="5"
						stroke-linecap="round"
					></path></svg
				></span
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
