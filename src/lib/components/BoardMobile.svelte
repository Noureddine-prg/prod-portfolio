<script lang="ts">
	// Mobile board — DC id="11b" frame (390w flex column, gap 10, pad 12), rework order:
	// hero → Experience → Work → (About + Contact) → footer.
	// Height form-fits the device (designH from the page scaler); the hero flexes to
	// absorb the difference between phone aspect ratios.
	import HeroTile from './tiles/HeroTile.svelte';
	import ExperienceTile from './tiles/ExperienceTile.svelte';
	import AboutTile from './tiles/AboutTile.svelte';
	import ContactTile from './tiles/ContactTile.svelte';
	import WorkTile from './tiles/WorkTile.svelte';
	import AshLayer from './AshLayer.svelte';
	import { expandCard } from '$lib/interactions/expand';
	import { profile } from '$lib/content';
	import { ui, type CardId } from '$lib/stores/ui.svelte';

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
	// a Work tile project row: the card opens straight onto that project
	function openProject(id: string) {
		if (boardEl?.dataset.open) return;
		ui.workDetail = id;
		onopen('work');
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
	<ExperienceTile
		mobile
		placement="flex:0 1 132px;min-height:118px"
		onopen={() => onopen('experience')}
	/>
	<WorkTile
		mobile
		placement="flex:0 1 176px;min-height:150px"
		onopen={() => onopen('work')}
		onproject={(id) => openProject(id)}
	/>

	<div style="display:flex;gap:10px;flex:0 1 150px;min-height:124px">
		<AboutTile mobile placement="flex:1;height:100%" onopen={() => onopen('about')} />
		<ContactTile mobile placement="flex:1;height:100%" onopen={() => onopen('contact')} />
	</div>

	<!-- Footer strip — small addition beyond the DC board (see report). -->
	<div
		style="flex:none;display:flex;justify-content:space-between;align-items:center;padding:2px 6px 2px;font:400 8px 'JetBrains Mono',monospace;letter-spacing:.08em;color:#6e6058;text-transform:uppercase"
	>
		<span>{profile.name}</span>
		<span>{profile.location}</span>
	</div>
</div>
