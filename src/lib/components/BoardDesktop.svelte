<script lang="ts">
	// Desktop board — DC id="11a", 900×620 grid (1.72fr 1fr 1fr × 4 rows), gap 14, pad 16.
	import HeroTile from './tiles/HeroTile.svelte';
	import ExperienceTile from './tiles/ExperienceTile.svelte';
	import AboutTile from './tiles/AboutTile.svelte';
	import HealthTile from './tiles/HealthTile.svelte';
	import ContactTile from './tiles/ContactTile.svelte';
	import WildcardTile from './tiles/WildcardTile.svelte';
	import WorkTile from './tiles/WorkTile.svelte';
	import AshLayer from './AshLayer.svelte';
	import type { CardId } from '$lib/stores/ui.svelte';

	interface Props {
		onopen?: (card: CardId) => void;
	}
	let { onopen = () => {} }: Props = $props();
</script>

<div
	class="board"
	data-board
	style="position:relative;width:900px;height:620px;background:#121010;border:1px solid #262020;padding:16px;border-radius:24px;grid-template-columns:1.72fr 1fr 1fr;grid-template-rows:repeat(4,minmax(0,1fr));grid-auto-rows:0"
>
	<AshLayer variant="desktop" />

	<HeroTile placement="grid-column:1/2;grid-row:1/5" />
	<ExperienceTile placement="grid-column:2/4;grid-row:1/2" onopen={() => onopen('experience')} />
	<AboutTile placement="grid-column:2/3;grid-row:2/3" onopen={() => onopen('about')} />
	<HealthTile placement="grid-column:3/4;grid-row:2/3" />
	<ContactTile placement="grid-column:2/3;grid-row:3/4" onopen={() => onopen('contact')} />
	<WildcardTile placement="grid-column:3/4;grid-row:3/4" />
	<WorkTile placement="grid-column:2/4;grid-row:4/5" onopen={() => onopen('work')} />
</div>
