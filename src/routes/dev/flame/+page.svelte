<script lang="ts">
	// DEV-ONLY route: flame scene verification harness. The flame canvas has no board tile
	// (it lives on the Contact EXPANDED card, Stage 3) — this proves the scene + alpha
	// compositing over a card-colored background. FLAGGED FOR STAGE-4 REMOVAL.
	import ThreeCanvas from '$lib/components/ThreeCanvas.svelte';
</script>

<div class="stage">
	<div class="card">
		<ThreeCanvas kind="flame" style="width:330px;height:425px;display:block;" />
	</div>
</div>

<style>
	.stage {
		min-height: 100vh;
		display: grid;
		place-items: center;
		background: #121010;
	}
	.card {
		width: 330px;
		height: 425px;
		background: #1a1616;
		border: 1px solid #2a2424;
		border-radius: 18px;
	}
</style>
