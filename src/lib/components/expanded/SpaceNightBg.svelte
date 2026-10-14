<script lang="ts">
	// Experience expanded (desktop) space-night overlay: radial gradient + the board's shared
	// star field. Drawn at inset -16px (the board padding) — the board's own box — so the stars
	// that showed through the middle column stay put as the card grows around them.
	import NightSky from '../NightSky.svelte';
</script>

<div
	style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 160% at 78% 30%,#101322 0%,#0a0c16 45%,#06070d 100%)"
>
	<NightSky style="inset:-16px" />
</div>
