<script lang="ts">
	import { activateOnKey } from '$lib/util/a11y';
	import { sceneHover } from '$lib/interactions/hover';
	// Contact tile — clean envelope scene + header + open hint; opens via `onopen`.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import TileHint from './TileHint.svelte';
	import { contact, profile } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const pad = $derived(mobile ? 12 : 16);
	const headFont = $derived(mobile ? 12 : 13);
	const envW = $derived(mobile ? 84 : 90);
	const envH = $derived(mobile ? 96 : 102);
	const envRight = $derived(mobile ? 4 : 6);
</script>

<div
	class="tile"
	data-tile
	data-card="contact"
	role="button"
	tabindex="0"
	onclick={onopen}
	onkeydown={(e) => activateOnKey(e, onopen)}
	use:sceneHover
	style="{placement};background:radial-gradient(90% 70% at 62% 118%,rgba(255,140,58,.16),transparent 62%),rgba(24,19,15,.72);border:1px solid #2e2520;border-radius:9px;padding:{pad}px;display:flex;flex-direction:column"
>
	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span
			style="font:400 {headFont}px 'Archivo Black',sans-serif;color:#efe9e6;text-transform:uppercase;letter-spacing:.03em"
			>{contact.header}</span
		>
		<TileHint {mobile} color="#e9b49a" />
	</div>
	<ThreeCanvas
		kind="envelope"
		lite
		clean
		style="position:absolute;right:{envRight}px;top:58%;transform:translateY(-50%);width:{envW}px;height:{envH}px;pointer-events:none"
	/>
	{#if !mobile}
		<span
			style="position:relative;margin-top:auto;font:500 11px 'Archivo',sans-serif;color:#d9c3b4"
			>{profile.email}</span
		>
	{/if}
</div>
