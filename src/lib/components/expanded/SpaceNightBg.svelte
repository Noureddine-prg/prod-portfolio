<script lang="ts">
	// Experience expanded (desktop) space-night background: one absolute overlay (radial
	// gradient + the board's shared star field) so relative-positioned content paints above
	// it. The open card sits 16px (the board padding) inside the board on every side, so the
	// field is drawn at inset -16px — the board's own box — and the stars that showed through
	// the middle column stay put as the card grows around them.
	import NightSky from '../NightSky.svelte';
</script>

<div
	style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 160% at 78% 30%,#101322 0%,#0a0c16 45%,#06070d 100%)"
>
	<NightSky style="inset:-16px" />
</div>
