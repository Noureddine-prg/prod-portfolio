<script lang="ts">
	// Contact — clean envelope scene + header + teaser (DC 11a L232-235 / 11b L543-546).
	// Interactive: `onopen` is a Stage-1 stub.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { contact } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const pad = $derived(mobile ? 12 : 16);
	const headFont = $derived(mobile ? 12 : 15);
	const envW = $derived(mobile ? 84 : 104);
	const envH = $derived(mobile ? 96 : 118);
	const envRight = $derived(mobile ? 4 : 6);
	const teaserFont = $derived(mobile ? 8.5 : 9.5);

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
	data-card="contact"
	role="button"
	tabindex="0"
	onclick={activate}
	onkeydown={onKey}
	style="{placement};background:radial-gradient(90% 70% at 62% 118%,rgba(255,140,58,.16),transparent 62%),#1c1512;border:1px solid #322619;border-radius:9px;padding:{pad}px;display:flex;flex-direction:column;justify-content:space-between"
>
	<span
		style="position:relative;font:400 {headFont}px 'Archivo Black',sans-serif;color:#efe9e6;text-transform:uppercase;letter-spacing:.01em">{contact.header}</span
	>
	<ThreeCanvas
		kind="envelope"
		lite
		clean
		style="position:absolute;right:{envRight}px;top:50%;transform:translateY(-50%);width:{envW}px;height:{envH}px;pointer-events:none"
	/>
	<span style="position:relative;font:400 {teaserFont}px 'JetBrains Mono',monospace;color:#c85a44"
		>{contact.teaser}</span
	>
</div>
