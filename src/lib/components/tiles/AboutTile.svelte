<script lang="ts">
	// About — fireflies jar scene + twinkles + availability line (DC 11a L287-296 / 11b).
	// Interactive: `onopen` is a Stage-1 stub.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { about } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	const pad = $derived(mobile ? '14px' : '16px 18px');
	const headFont = $derived(mobile ? 12 : 15);
	const jarW = $derived(mobile ? 78 : 96);
	const jarH = $derived(mobile ? 90 : 108);
	const jarRight = $derived(mobile ? 6 : 10);
	const jarTop = $derived(mobile ? 44 : 46);
	const avail = $derived(mobile ? about.availabilityShort : about.availability);
	const dotSize = $derived(mobile ? 7 : 8);
	const availFont = $derived(mobile ? 9 : 9.5);

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
	data-card="about"
	role="button"
	tabindex="0"
	onclick={activate}
	onkeydown={onKey}
	style="{placement};background:radial-gradient(120% 90% at 50% 115%,rgba(200,112,63,.10),transparent 60%),#1d1824;border:1px solid #2f2939;border-radius:9px;padding:{pad};display:flex;flex-direction:column;justify-content:space-between"
>
	<div style="position:absolute;inset:0;pointer-events:none">
		<span
			style="position:absolute;left:22%;top:26%;width:1.5px;height:1.5px;border-radius:50%;background:#cfc4de;animation:dctwinkle 5.2s ease-in-out infinite"
		></span>
		<span
			style="position:absolute;left:58%;top:38%;width:1px;height:1px;border-radius:50%;background:#9d92ab;animation:dctwinkle 6.4s ease-in-out infinite 1.6s"
		></span>
		<span
			style="position:absolute;left:80%;top:22%;width:2px;height:2px;border-radius:50%;background:#efe9f2;box-shadow:0 0 5px rgba(226,149,79,.4);animation:dctwinkle 4.6s ease-in-out infinite 3s"
		></span>
		<span
			style="--ao:.4;--sw:10px;position:absolute;left:68%;bottom:-8px;width:7px;height:7px;border-radius:50%;background:#e2954f;filter:blur(2.5px);animation:ashrise 14s linear infinite -4s"
		></span>
	</div>

	<span
		style="position:relative;font:400 {headFont}px 'Archivo Black',sans-serif;color:#efe9e6;text-transform:uppercase;letter-spacing:.01em">{about.header}</span
	>

	<ThreeCanvas
		kind="jar"
		lite
		style="position:absolute;right:{jarRight}px;top:{jarTop}%;transform:translateY(-50%);width:{jarW}px;height:{jarH}px;pointer-events:none"
	/>

	<span style="position:relative;display:flex;align-items:center;gap:8px"
		><span style="width:{dotSize}px;height:{dotSize}px;border-radius:50%;background:#c85a44"></span
		><span style="font:400 {availFont}px 'JetBrains Mono',monospace;color:#94867f">{avail}</span></span
	>
</div>
