<script lang="ts">
	// Mobile board — DC id="11b", 390w flex column, gap 10, pad 12. No Wildcard.
	// Order: hero → About → (Contact + Health) → Experience → Work → footer.
	// Height form-fits the device (designH from the page scaler); the hero flexes to
	// absorb the difference between phone aspect ratios.
	import HeroTile from './tiles/HeroTile.svelte';
	import ExperienceTile from './tiles/ExperienceTile.svelte';
	import AboutTile from './tiles/AboutTile.svelte';
	import HealthTile from './tiles/HealthTile.svelte';
	import ContactTile from './tiles/ContactTile.svelte';
	import WorkTile from './tiles/WorkTile.svelte';
	import AshLayer from './AshLayer.svelte';
	import { expandCard } from '$lib/interactions/expand';
	import { profile } from '$lib/content';
	import type { CardId } from '$lib/stores/ui.svelte';

	interface Props {
		/** Design-space height; tracks the device viewport so the column fits exactly. */
		designH?: number;
	}
	let { designH = 812 }: Props = $props();

	let boardEl: HTMLDivElement;
	function onopen(card: CardId) {
		const tile = boardEl?.querySelector<HTMLElement>(`[data-card="${card}"]`);
		if (tile) expandCard(boardEl, tile, card);
	}
</script>

<div
	bind:this={boardEl}
	class="board"
	data-board
	style="width:390px;height:{designH}px;background:transparent;padding:12px;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden"
>
	<AshLayer variant="mobile" />

	<HeroTile mobile placement="flex:1 1 auto;min-height:170px" />
	<AboutTile mobile placement="flex:0 1 110px;min-height:88px" onopen={() => onopen('about')} />

	<div style="display:flex;gap:10px;flex:0 1 110px;min-height:90px">
		<ContactTile mobile placement="flex:1;height:100%" onopen={() => onopen('contact')} />
		<HealthTile mobile placement="flex:1;height:100%" />
	</div>

	<ExperienceTile
		mobile
		placement="flex:0 1 120px;min-height:96px"
		onopen={() => onopen('experience')}
	/>
	<WorkTile mobile placement="flex:0 1 120px;min-height:96px" onopen={() => onopen('work')} />

	<!-- Footer strip — small addition beyond the DC board (see report). -->
	<div
		style="flex:none;display:flex;justify-content:space-between;align-items:center;padding:2px 6px 2px;font:400 8px 'JetBrains Mono',monospace;letter-spacing:.08em;color:#6e6058;text-transform:uppercase"
	>
		<span>{profile.name}</span>
		<span>{profile.location}</span>
	</div>
</div>
