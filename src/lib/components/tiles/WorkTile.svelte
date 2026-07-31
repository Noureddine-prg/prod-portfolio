<script lang="ts">
	// Work — cream parchment band + axe-in-log scene (DC 11a L355-360 / 11b L657-662).
	// Interactive: `onopen` is a Stage-1 stub.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { work } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const axeW = $derived(mobile ? 150 : 180);
	const axeRight = $derived(mobile ? 0 : 8);
	const labelLeft = $derived(mobile ? 16 : 18);
	const labelY = $derived(mobile ? 14 : 16);
	const headFont = $derived(mobile ? 15 : 18);
	const countFont = $derived(mobile ? 9 : 9.5);

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
	data-card="work"
	role="button"
	tabindex="0"
	onclick={activate}
	onkeydown={onKey}
	style="{placement};background:#cbbfa8;border-radius:9px"
>
	<div
		style="position:absolute;left:{labelLeft}px;top:{labelY}px;bottom:{labelY}px;display:flex;flex-direction:column;justify-content:space-between;z-index:1"
	>
		<span
			style="font:400 {headFont}px 'Archivo Black',sans-serif;color:#241d18;text-transform:uppercase;letter-spacing:.01em">{work.header}</span
		>
		<span style="font:700 {countFont}px 'JetBrains Mono',monospace;color:#5e544a">{work.count}</span>
	</div>
	<ThreeCanvas
		kind="axelog"
		style="position:absolute;right:{axeRight}px;top:0;height:100%;width:{axeW}px;display:block"
	/>
</div>
