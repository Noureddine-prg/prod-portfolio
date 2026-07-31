<script lang="ts">
	// DEV-ONLY preview of the burnt envelope variant (no flags → char + embers + fireP),
	// which the board only shows inside the expanded Contact card.
	// STAGE-4 REMOVAL: delete this route once the expand flow renders the burnt variant.
	import ThreeCanvas from '$lib/components/ThreeCanvas.svelte';
</script>

<div class="wrap">
	<ThreeCanvas kind="envelope" style="width:400px;height:340px;display:block" />
</div>

<style>
	.wrap {
		min-height: 100vh;
		display: grid;
		place-items: center;
		background: #121010;
	}
</style>
