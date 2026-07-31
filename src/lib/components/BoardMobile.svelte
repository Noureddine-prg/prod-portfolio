<script lang="ts">
	// Mobile board — DC id="11b", 390w flex column, gap 10, pad 12, radius 28. No Wildcard.
	// Order: hero → Experience → (Contact + Health) → About → Work → footer.
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
	style="width:390px;background:#121010;border:1px solid #262020;padding:12px;border-radius:28px;display:flex;flex-direction:column;gap:10px;position:relative"
>
	<AshLayer variant="mobile" />

	<HeroTile mobile placement="height:258px;flex:none" />
	<ExperienceTile mobile placement="flex:none;height:120px" onopen={() => onopen('experience')} />

	<div style="display:flex;gap:10px;flex:none">
		<ContactTile mobile placement="flex:1;height:110px" onopen={() => onopen('contact')} />
		<HealthTile mobile placement="flex:1;height:110px" />
	</div>

	<AboutTile mobile placement="flex:none;height:110px" onopen={() => onopen('about')} />
	<WorkTile mobile placement="flex:none;height:120px" onopen={() => onopen('work')} />

	<!-- Footer strip — small addition beyond the DC board (see report). -->
	<div
		style="flex:none;display:flex;justify-content:space-between;align-items:center;padding:2px 6px 2px;font:400 8px 'JetBrains Mono',monospace;letter-spacing:.08em;color:#6e6058;text-transform:uppercase"
	>
		<span>{profile.name}</span>
		<span>{profile.location}</span>
	</div>
</div>
