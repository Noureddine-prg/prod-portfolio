<script lang="ts">
	// DEV-ONLY zoomed preview of the jar scene (the board tile is only 82×92 CSS px).
	// TODO(Stage 4): remove this route before ship.
	import ThreeCanvas from '$lib/components/ThreeCanvas.svelte';
</script>

<div class="wrap">
	<ThreeCanvas kind="jar" style="width:480px;height:540px;display:block;" />
</div>

<style>
	.wrap {
		min-height: 100vh;
		display: grid;
		place-items: center;
		background: #121010;
	}
</style>
