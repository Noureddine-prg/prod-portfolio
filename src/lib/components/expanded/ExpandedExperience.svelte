<script lang="ts">
	// Experience expanded panel — the Stage-2 composite, mounted into the clone's
	// [data-expand] container by expand.ts.
	// Desktop (DC 11a L127–194): SpaceNightBg (absolute — excluded from the reveal
	// stagger) + header row + body row holding the timeline slot and the PortholeBar.
	// The timeline itself is the next task; its flex slot keeps the porthole in place.
	// Mobile (DC 11b L462–540): MobileOceanStrip (calm strip + sea-glass panel); the
	// three [data-exp-card] company cards land with the content task.
	import PortholeBar from './PortholeBar.svelte';
	import SpaceNightBg from './SpaceNightBg.svelte';
	import MobileOceanStrip from './MobileOceanStrip.svelte';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();
</script>

{#if mobile}
	<MobileOceanStrip>
		<!-- [data-exp-card] company cards — content task -->
	</MobileOceanStrip>
{:else}
	<SpaceNightBg />
	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span style="display:flex;align-items:baseline;gap:12px"
			><span
				style="font:400 24px 'Archivo Black',sans-serif;letter-spacing:.01em;color:#efe9e6;text-transform:uppercase"
				>Experience</span
			><span style="font:400 9.5px 'JetBrains Mono',monospace;color:#6e6058"
				>&mdash; The journey so far</span
			></span
		>
		<span style="font:400 9px 'JetBrains Mono',monospace;color:#6e6058"></span>
	</div>
	<div style="position:relative;display:flex;gap:22px;flex:1;min-height:0">
		<!-- timeline slot — content task fills the 96px/20px/1fr grid (DC L149-168) -->
		<div style="flex:1;min-width:0"></div>
		<PortholeBar />
	</div>
{/if}
