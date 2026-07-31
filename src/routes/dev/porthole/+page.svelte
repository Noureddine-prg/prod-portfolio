<script lang="ts">
	// DEV-ONLY preview of the Experience expanded shells at realistic sizes.
	// STAGE-4: REMOVE this whole /dev/porthole route before ship.
	import PortholeBar from '$lib/components/expanded/PortholeBar.svelte';
	import SpaceNightBg from '$lib/components/expanded/SpaceNightBg.svelte';
	import MobileOceanStrip from '$lib/components/expanded/MobileOceanStrip.svelte';
</script>

<main>
	<!-- desktop expanded card mock: board inner area 868×588, DC data-expand padding 28/34 -->
	<div class="mock mock--desktop">
		<SpaceNightBg />
		<div
			style="position:relative;height:100%;box-sizing:border-box;padding:28px 34px;display:flex;flex-direction:column;gap:20px"
		>
			<div style="display:flex;justify-content:space-between;align-items:baseline">
				<span
					style="font:400 24px 'Archivo Black',sans-serif;letter-spacing:.01em;color:#efe9e6;text-transform:uppercase"
					>Experience</span
				>
			</div>
			<div style="display:flex;gap:22px;flex:1;min-height:0">
				<!-- timeline placeholder (Stage 3 content) -->
				<div
					style="flex:1;border:1px dashed rgba(255,255,255,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;font:400 9px 'JetBrains Mono',monospace;color:#6e6058"
				>
					timeline placeholder
				</div>
				<PortholeBar />
			</div>
		</div>
	</div>

	<!-- mobile expanded card mock: 390w column on the DC #101b21 card bg -->
	<div class="mock mock--mobile">
		<MobileOceanStrip>
			<div
				style="position:relative;min-height:180px;border:1px dashed rgba(255,255,255,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;font:400 9px 'JetBrains Mono',monospace;color:#8fa5ad"
			>
				exp-cards placeholder
			</div>
		</MobileOceanStrip>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 32px;
		padding: 24px;
		background: #0a0908;
	}
	.mock--desktop {
		position: relative;
		width: 868px;
		height: 588px;
		border-radius: 12px;
		overflow: hidden;
	}
	.mock--mobile {
		position: relative;
		width: 390px;
		height: 700px;
		border-radius: 28px;
		overflow: auto;
		background: #101b21;
		display: flex;
		flex-direction: column;
	}
	/* one mock per viewport, mirroring the board split at 900px */
	@media (max-width: 899px) {
		.mock--desktop {
			display: none;
		}
	}
	@media (min-width: 900px) {
		.mock--mobile {
			display: none;
		}
	}
</style>
