<script lang="ts">
	import { activateOnKey } from '$lib/util/a11y';
	import { sceneHover } from '$lib/interactions/hover';
	// About tile — jar fireflies scene + twinkles; opens via `onopen`.
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import TileHint from './TileHint.svelte';
	import { about } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
		onopen?: () => void;
	}
	let { mobile = false, placement = '', onopen = () => {} }: Props = $props();

	// jar sits centred, matching Contact's envelope (DC had it hard right); explicit width/height — a canvas
	// sized only by left/right falls back to its backing-store width and jumps once built
	const jarStyle = $derived(
		mobile
			? 'left:50%;top:60%;transform:translate(-50%,-50%);width:74px;height:84px'
			: 'left:50%;top:55%;transform:translate(-50%,-50%);width:96px;height:108px'
	);
</script>

<div
	class="tile"
	data-tile
	data-card="about"
	role="button"
	tabindex="0"
	aria-label={about.header}
	aria-haspopup="dialog"
	onclick={onopen}
	onkeydown={(e) => activateOnKey(e, onopen)}
	use:sceneHover
	style="{placement};background:radial-gradient(120% 90% at 50% 115%,rgba(200,112,63,.10),transparent 60%),rgba(24,19,15,.72);border:1px solid #2e2520;border-radius:9px;padding:var(--tile-pad);display:flex;flex-direction:column;justify-content:space-between"
>
	<div style="position:absolute;inset:0;pointer-events:none">
		<span
			style="position:absolute;left:22%;top:26%;width:1.5px;height:1.5px;border-radius:50%;background:#d9cec4;animation:dctwinkle 5.2s ease-in-out infinite"
		></span>
		<span
			style="position:absolute;left:58%;top:38%;width:1px;height:1px;border-radius:50%;background:#a39689;animation:dctwinkle 6.4s ease-in-out infinite 1.6s"
		></span>
		<span
			style="position:absolute;left:80%;top:22%;width:2px;height:2px;border-radius:50%;background:#f1ebe4;box-shadow:0 0 5px rgba(226,149,79,.4);animation:dctwinkle 4.6s ease-in-out infinite 3s"
		></span>
		<span
			style="--ao:.4;--sw:10px;position:absolute;left:68%;bottom:-8px;width:7px;height:7px;border-radius:50%;background:#e2954f;filter:blur(2.5px);animation:ashrise 14s linear infinite -4s"
		></span>
	</div>

	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span
			style="font:400 var(--t-tile-head) 'Archivo Black',sans-serif;color:#efe9e6;text-transform:uppercase;letter-spacing:.03em"
			>{about.header}</span
		>
		<TileHint {mobile} color="#d9cec4" />
	</div>

	<ThreeCanvas
		kind="jar"
		lite
		style="position:absolute;{jarStyle};pointer-events:none"
	/>
</div>
