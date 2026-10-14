<script lang="ts">
	// Work case-study detail — Svelte port of the DC's wireProjects, driven by the ui.workDetail store.
	// Absolute .proj-detail overlay — excluded from the expand reveal stagger AND the clone's click-to-close.
	import { onMount } from 'svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { work } from '$lib/content';
	import Icon from '../Icon.svelte';

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
	// focus moves into the detail (the row that opened it is hidden underneath)
	let backBtn: HTMLButtonElement | undefined = $state();
	onMount(() => {
		backBtn?.focus({ preventScroll: true });
		requestAnimationFrame(() => (shown = true));
	});

	// Every project opens at its top: the overlay is pinned to the panel's scroll origin, so a
	// panel scrolled down to reach a row would otherwise hide the detail's header.
	let root: HTMLDivElement | undefined = $state();
	$effect(() => {
		void p;
		root?.scrollTo({ top: 0 });
		root?.closest<HTMLElement>('[data-expand]')?.scrollTo({ top: 0 });
	});

	const ink = '#ece5da',
		mid = '#a8acb8',
		dim = '#7c8294';
	// type roles at the two widths (label / meta / body; floors 10 desktop, 12 narrow)
	const labelStyle = $derived(
		`font:500 ${narrow ? 12 : 10}px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase`
	);
	const meta = $derived(narrow ? 12 : 11);
</script>

{#snippet ph(text: string, h: number)}
	<div
		style="border:1px dashed rgba(220,226,240,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;min-height:{h}px;background:rgba(255,255,255,.025)"
	>
		<span
			style="{labelStyle};color:{dim}">{text}</span
		>
	</div>
{/snippet}

{#snippet cs(h: string, b: string)}
	<div style="display:flex;flex-direction:column;gap:5px">
		<span
			style="{labelStyle};color:{dim}">{h}</span
		>
		<!-- desktop reserves 3 lines so the media grid keeps one size across projects -->
		<span
			style="font:400 {narrow ? 13 : 12}px/1.65 'Archivo',sans-serif;color:{mid};min-height:{narrow
				? 0
				: 'calc(1.65em * 3)'}">{b}</span
		>
	</div>
{/snippet}

<div
	bind:this={root}
	class="proj-detail"
	style="position:absolute;inset:0;z-index:3;background:#0b0d15;padding:{narrow
		? '20px'
		: '26px 30px'};display:flex;flex-direction:column;gap:{narrow
		? '10px'
		: '14px'};overflow:auto;opacity:{shown ? 1 : 0};transition:opacity .35s ease .1s"
>
	<!-- back / counter / prev-next; on narrow the row moves to the bottom of the card,
	     so the ✕-clearance padding only applies in the desktop top position (DC L3314); there it
	     sticks to the bottom edge so back / prev / next stay reachable on short screens -->
	<div
		style="display:flex;justify-content:space-between;align-items:center;padding-right:{narrow
			? 0
			: 48}px;order:{narrow ? 99 : 0};{narrow
			? 'margin-top:auto;padding:14px 0 20px;margin-bottom:-20px;border-top:1px solid rgba(220,226,240,0.1);position:sticky;bottom:-20px;background:#0b0d15;z-index:1'
			: ''}"
	>
		<button
			type="button"
			bind:this={backBtn}
			data-pd-back
			class="pd-btn"
			onclick={() => (ui.workDetail = null)}
			style="gap:.45em;min-height:{narrow ? 44 : 28}px;font:500 {narrow
				? 12
				: 11}px 'JetBrains Mono',monospace;color:{ink}"><Icon name="arrow-left" />all builds</button
		>
		<span style="display:flex;gap:16px;align-items:center;white-space:nowrap">
			<span
				style="font:400 {meta}px 'JetBrains Mono',monospace;color:{dim};font-variant-numeric:tabular-nums"
				>0{idx + 1} / 0{n}</span
			>
			<button
				type="button"
				data-pd-prev
				class="pd-btn"
				onclick={() => nav(-1)}
				aria-label="Previous project"
				style="justify-content:center;font-size:{narrow ? 15 : 13}px;color:{ink};min-width:{narrow
					? 44
					: 28}px;min-height:{narrow ? 44 : 28}px"><Icon name="arrow-left" /></button
			>
			<button
				type="button"
				data-pd-next
				class="pd-btn"
				onclick={() => nav(1)}
				aria-label="Next project"
				style="justify-content:center;font-size:{narrow ? 15 : 13}px;color:{ink};min-width:{narrow
					? 44
					: 28}px;min-height:{narrow ? 44 : 28}px"><Icon name="arrow-right" /></button
			>
		</span>
	</div>
	<h3 style="margin:0;font:500 {narrow ? 19 : 26}px 'Cormorant Garamond',serif;color:{ink}">{p.name}</h3>
	<span style="font:400 {meta}px/1.45 'JetBrains Mono',monospace;color:{mid};margin-top:-6px"
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
			: '16px'};border-top:1px solid rgba(220,226,240,0.14);padding-top:12px"
	>
		{@render cs('Problem', p.problem)}
		{@render cs('Approach', p.approach)}
		{@render cs('Outcome', p.outcome)}
	</div>
</div>

<style>
	.pd-btn {
		display: inline-flex;
		align-items: center;
		padding: 0 6px;
		margin: 0 -6px;
		background: none;
		border: 0;
		border-radius: 6px;
		cursor: pointer;
	}
</style>
