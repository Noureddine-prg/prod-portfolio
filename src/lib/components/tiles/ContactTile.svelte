<script lang="ts">
	// Contact tile — clean envelope scene + header + open hint; opens via `onopen`.
	import { activateOnKey } from '$lib/util/a11y';
	import { sceneHover } from '$lib/interactions/hover';
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import TileHint from './TileHint.svelte';
	import { contact, profile } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const envelopeStyle = $derived(
		mobile
			? 'left:50%;top:60%;transform:translate(-50%,-50%);width:74px;height:84px'
			: 'left:50%;top:55%;transform:translate(-50%,-50%);width:96px;height:108px'
	);
</script>

<div
	class="tile"
	data-tile
	data-card="contact"
	role="button"
	tabindex="0"
	aria-label={contact.header}
	aria-haspopup="dialog"
	onclick={onopen}
	onkeydown={(e) => activateOnKey(e, onopen)}
	use:sceneHover
	style="{placement};background:radial-gradient(90% 70% at 62% 118%,rgba(255,140,58,.16),transparent 62%),rgba(24,19,15,.72);border:1px solid #2e2520;border-radius:9px;padding:var(--tile-pad);display:flex;flex-direction:column"
>
	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span
			style="font:400 var(--t-tile-head) 'Archivo Black',sans-serif;color:#efe9e6;text-transform:uppercase;letter-spacing:.03em"
			>{contact.header}</span
		>
		<TileHint {mobile} color="#e9b49a" />
	</div>
	<ThreeCanvas
		kind="envelope"
		lite
		clean
		style="position:absolute;{envelopeStyle};pointer-events:none"
	/>
	{#if !mobile}
		<span
			style="position:relative;margin-top:auto;font:500 11px 'Archivo',sans-serif;color:#d9c3b4"
			>{profile.email}</span
		>
	{/if}
</div>
