<script lang="ts">
	// DEV-ONLY route: full wing+porthole calm variant (no flags), full viewport — the board
	// only shows the nowing+sunzoom tile, so this is the only place to eyeball the wing.
	// TODO(Stage 4): remove this route before ship.
	import ThreeCanvas from '$lib/components/ThreeCanvas.svelte';
</script>

<div class="full">
	<ThreeCanvas kind="calm" style="width:100%;height:100%;display:block;" />
</div>

<style>
	.full {
		position: fixed;
		inset: 0;
		background: #121010;
	}
</style>
