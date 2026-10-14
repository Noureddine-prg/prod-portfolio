<script lang="ts">
	// Desktop board — DC id="11a" frame (900×620, gap 14, pad 16), rework layout: the hero
	// column is unchanged, Work runs the full height on the right as a project list, and the
	// middle column stacks About, Experience (two rows, room for every role), Contact. The
	// outer rows run taller (1.15 : .85) so About and Contact have room for their scenes and
	// Experience is sized to its role list rather than holding a dead band.
	// The design box flexes with the window aspect (see +page.svelte); rows share the height.
	import HeroTile from './tiles/HeroTile.svelte';
	import ExperienceTile from './tiles/ExperienceTile.svelte';
	import AboutTile from './tiles/AboutTile.svelte';
	import ContactTile from './tiles/ContactTile.svelte';
	import WorkTile from './tiles/WorkTile.svelte';
	import AshLayer from './AshLayer.svelte';
	import NightSky from './NightSky.svelte';
	import { expandCard } from '$lib/interactions/expand';
	import { ui, type CardId } from '$lib/stores/ui.svelte';

	interface Props {
		/** Design-space width; tracks the viewport aspect so the grid spans edge-to-edge. */
		designW?: number;
		/** Design-space height; 620 on wide windows, taller on squarer ones. */
		designH?: number;
	}
	let { designW = 900, designH = 620 }: Props = $props();

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
	style="position:relative;width:{designW}px;height:{designH}px;background:transparent;padding:16px;grid-template-columns:1.72fr 1fr 1.1fr;grid-template-rows:1.15fr .85fr .85fr 1.15fr;grid-auto-rows:0"
>
	<!-- one sky behind every tile: it shows through the see-through middle column and the
	     gutters, and the Experience panel draws the same stars (SpaceNightBg) -->
	<NightSky />
	<AshLayer variant="desktop" />

	<HeroTile placement="grid-column:1/2;grid-row:1/5" />
	<AboutTile placement="grid-column:2/3;grid-row:1/2" onopen={() => onopen('about')} />
	<ExperienceTile placement="grid-column:2/3;grid-row:2/4" onopen={() => onopen('experience')} />
	<ContactTile placement="grid-column:2/3;grid-row:4/5" onopen={() => onopen('contact')} />
	<WorkTile
		placement="grid-column:3/4;grid-row:1/5"
		onopen={() => onopen('work')}
		onproject={(id) => openProject(id)}
	/>
</div>
