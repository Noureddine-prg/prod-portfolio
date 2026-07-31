<script lang="ts">
	// Work case-study detail — Svelte port of the DC's innerHTML machinery
	// (wireProjects show() L3298–3336), driven by the ui.workDetail store instead.
	// Absolute overlay (class .proj-detail — excluded from both the expand reveal
	// stagger and the clone's click-to-close). Back link, '0N / 06' counter, prev/next
	// with modulo wrap, dashed placeholder frames, Problem/Approach/Outcome columns
	// (3-col desktop, stacked narrow — DC keyed narrow off ex.clientWidth < 520, which
	// with the fixed board widths is exactly the mobile board).
	import { onMount } from 'svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { work } from '$lib/content';

	interface Props {
		narrow?: boolean;
	}
	let { narrow = false }: Props = $props();

	const idx = $derived(Math.max(0, work.projects.findIndex((p) => p.id === ui.workDetail)));
	const p = $derived(work.projects[idx]);
	const n = work.projects.length;

	function nav(d: number) {
		ui.workDetail = work.projects[(((idx + d) % n) + n) % n].id;
	}

	// fade-in .35s ease .1s, as the DC's freshly-appended detail did (L3307–3309)
	let shown = $state(false);
	onMount(() => requestAnimationFrame(() => (shown = true)));

	const ink = '#241d18',
		mid = '#5e544a',
		dim = '#8a7d6e';
</script>

{#snippet ph(label: string, h: number)}
	<div
		style="border:1px dashed rgba(36,29,24,.34);border-radius:10px;display:flex;align-items:center;justify-content:center;min-height:{h}px;background:rgba(36,29,24,.05)"
	>
		<span
			style="font:400 8.5px 'JetBrains Mono',monospace;color:{dim};letter-spacing:.08em;text-transform:uppercase"
			>{label}</span
		>
	</div>
{/snippet}

{#snippet cs(h: string, b: string)}
	<div style="display:flex;flex-direction:column;gap:5px">
		<span
			style="font:500 8px 'JetBrains Mono',monospace;letter-spacing:.14em;color:{dim};text-transform:uppercase"
			>{h}</span
		>
		<span style="font:400 10px/1.65 'Hanken Grotesk',sans-serif;color:{mid}">{b}</span>
	</div>
{/snippet}

<div
	class="proj-detail"
	style="position:absolute;inset:0;z-index:3;background:#cbbfa8;padding:{narrow
		? '20px'
		: '26px 30px'};display:flex;flex-direction:column;gap:{narrow
		? '10px'
		: '14px'};overflow:auto;opacity:{shown ? 1 : 0};transition:opacity .35s ease .1s"
>
	<!-- back / counter / prev-next — padding-right clears the ✕ (DC L3314) -->
	<div
		style="display:flex;justify-content:space-between;align-items:center;padding-right:{narrow
			? 34
			: 48}px"
	>
		<span
			data-pd-back
			role="button"
			tabindex="0"
			onclick={() => (ui.workDetail = null)}
			onkeydown={(e) => e.key === 'Enter' && (ui.workDetail = null)}
			style="cursor:pointer;font:500 9px 'JetBrains Mono',monospace;color:{ink}"
			>&larr; all builds</span
		>
		<span style="display:flex;gap:16px;align-items:center;white-space:nowrap">
			<span style="font:400 9px 'JetBrains Mono',monospace;color:{dim}"
				>0{idx + 1} / 0{n}</span
			>
			<span
				data-pd-prev
				role="button"
				tabindex="0"
				onclick={() => nav(-1)}
				onkeydown={(e) => e.key === 'Enter' && nav(-1)}
				style="cursor:pointer;font:500 13px 'JetBrains Mono',monospace;color:{ink};padding:4px 6px"
				>&larr;</span
			>
			<span
				data-pd-next
				role="button"
				tabindex="0"
				onclick={() => nav(1)}
				onkeydown={(e) => e.key === 'Enter' && nav(1)}
				style="cursor:pointer;font:500 13px 'JetBrains Mono',monospace;color:{ink};padding:4px 6px"
				>&rarr;</span
			>
		</span>
	</div>
	<span style="font:500 {narrow ? 19 : 26}px 'Cormorant Garamond',serif;color:{ink}">{p.name}</span>
	<span style="font:400 8.5px 'JetBrains Mono',monospace;color:{mid};margin-top:-6px"
		>{p.tech} &middot; {p.org} &middot; {p.year}</span
	>
	{#if narrow}
		{@render ph('screenshot', 110)}
		<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
			{@render ph('detail', 70)}
			{@render ph('diagram', 70)}
		</div>
	{:else}
		<div style="display:grid;grid-template-columns:1.5fr 1fr;gap:12px;flex:1;min-height:150px">
			{@render ph('screenshot', 0)}
			<div style="display:grid;grid-template-rows:1fr 1fr;gap:12px">
				{@render ph('detail', 0)}
				{@render ph('diagram', 0)}
			</div>
		</div>
	{/if}
	<div
		style="display:grid;grid-template-columns:{narrow ? '1fr' : 'repeat(3,1fr)'};gap:{narrow
			? '10px'
			: '16px'};border-top:1px solid rgba(36,29,24,.24);padding-top:12px"
	>
		{@render cs('Problem', p.problem)}
		{@render cs('Approach', p.approach)}
		{@render cs('Outcome', p.outcome)}
	</div>
</div>
