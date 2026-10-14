<script lang="ts">
	import { activateOnKey } from '$lib/util/a11y';
	// Work expanded panel — parchment ledger, mounted into the clone by expand.ts. Rows open
	// the ProjDetail overlay via ui.workDetail; body-click close stays disabled for Work in expand.ts.
	import { onDestroy } from 'svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import CardLinks from '../CardLinks.svelte';
	import { work } from '$lib/content';
	import ProjDetail from './ProjDetail.svelte';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	const detailOpen = $derived(ui.workDetail !== null);

	// top-level list elements — faded out under the detail exactly like the DC faded
	// ex.children; inline styles so we never fight the reveal stagger's inline opacity
	let listEls: HTMLElement[] = [];
	function listEl(el: HTMLElement) {
		listEls.push(el);
		return {
			destroy() {
				listEls = listEls.filter((e) => e !== el);
			}
		};
	}

	let wasOpen = false; // skip the restore branch on first run (reveal owns opacity then)
	let lastId: string | null = null; // its row gets focus back on "all builds"
	$effect(() => {
		if (detailOpen) {
			wasOpen = true;
			lastId = ui.workDetail;
			listEls.forEach((k) => {
				k.style.transition = 'opacity .3s ease';
				k.style.opacity = '0';
			});
			const t = setTimeout(() => {
				if (ui.workDetail !== null) listEls.forEach((k) => (k.style.visibility = 'hidden'));
			}, 300);
			return () => clearTimeout(t);
		} else if (wasOpen) {
			wasOpen = false;
			listEls.forEach((k) => {
				k.style.visibility = '';
				requestAnimationFrame(() => (k.style.opacity = '1'));
			});
			listEls.find((k) => k.dataset.projRow === lastId)?.focus({ preventScroll: true });
		}
	});

	// closing the card resets the detail so Work reopens on the ledger
	onDestroy(() => {
		ui.workDetail = null;
	});
</script>

{#if mobile}
	<div
		use:listEl
		style="display:flex;justify-content:space-between;align-items:baseline;gap:4px 12px;flex-wrap:wrap;margin-bottom:10px"
	>
		<h2
			style="margin:0;font:400 var(--t-title) 'Archivo Black',sans-serif;letter-spacing:.02em;color:#ece5da;text-transform:uppercase"
			>Work &middot; 06 builds</h2
		>
		<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta)">2024 &mdash; now</span>
	</div>
	{#each work.projects as p, i (p.id)}
		<div
			class="prowm"
			data-proj-row={p.id}
			role="button"
			tabindex="0"
			use:listEl
			onclick={() => (ui.workDetail = p.id)}
			onkeydown={(e) => activateOnKey(e, () => (ui.workDetail = p.id))}
			style={i === work.projects.length - 1 ? 'border-bottom:none' : ''}
		>
			<span style="font:500 var(--t-item) 'Cormorant Garamond',serif;color:#ece5da;font-variant-numeric:lining-nums tabular-nums"
				>{p.number} &middot; {p.name}</span
			>
			<span style="font:400 13px/1.5 'Archivo',sans-serif;color:#a8acb8">{p.descShort}</span>
			<span style="font:400 var(--t-meta)/1.45 'JetBrains Mono',monospace;color:#7c8294"
				>{p.tech} &middot; {p.org} &middot; {p.year}</span
			>
		</div>
	{/each}
{:else}
	<div
		use:listEl
		style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px"
	>
		<h2
			style="margin:0;font:400 var(--t-title) 'Archivo Black',sans-serif;letter-spacing:.02em;color:#ece5da;text-transform:uppercase"
			>Work &middot; 06 builds</h2
		>
		<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta)">2024 &mdash; now</span>
	</div>
	<div
		use:listEl
		style="display:grid;grid-template-columns:34px 1fr 160px 118px 44px;gap:16px;padding:0 6px 10px;border-bottom:1px solid rgba(220,226,240,0.17);font:500 var(--t-label) 'JetBrains Mono',monospace;letter-spacing:.12em;color:#7c8294;text-transform:uppercase"
	>
		<span>#</span><span>Project</span><span>Tech</span><span>Company</span><span
			style="text-align:right">Year</span
		>
	</div>
	{#each work.projects as p (p.id)}
		<div
			class="prow"
			data-proj-row={p.id}
			role="button"
			tabindex="0"
			use:listEl
			onclick={() => (ui.workDetail = p.id)}
			onkeydown={(e) => activateOnKey(e, () => (ui.workDetail = p.id))}
		>
			<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:#7c8294;font-variant-numeric:lining-nums tabular-nums">{p.number}</span>
			<span
				><span style="font:500 var(--t-item) 'Cormorant Garamond',serif;color:#ece5da">{p.name}</span><span
					style="display:block;font:400 var(--t-body-sm)/1.5 'Archivo',sans-serif;color:#a8acb8;margin-top:3px"
					>{p.desc}</span
				></span
			>
			<span style="font:400 var(--t-meta)/1.45 'JetBrains Mono',monospace;color:#b7bbc6">{p.tech}</span>
			<span style="font:400 var(--t-meta)/1.45 'JetBrains Mono',monospace;color:#a8acb8">{p.org}</span>
			<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:#a8acb8;text-align:right;font-variant-numeric:tabular-nums"
				>{p.year}</span
			>
		</div>
	{/each}
	<div use:listEl style="flex:1"></div>
	<div
		use:listEl
		style="display:flex;gap:18px;align-items:baseline;border-top:1px solid rgba(220,226,240,0.17);padding-top:12px;margin-top:12px"
	>
		<CardLinks resumeColor="#e2954f" linkColor="#a8acb8" />
	</div>
{/if}

{#if detailOpen}
	<ProjDetail narrow={mobile} />
{/if}

<style>
	/* desktop ledger row — grid ported from the DC (L369). Hover is a wash that sweeps through
	   the row behind the text (in from the left, out to the right) plus a left accent bar —
	   transform-only, so nothing in the row moves or reflows. */
	.prow {
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: 34px 1fr 160px 118px 44px;
		gap: 16px;
		align-items: baseline;
		padding: 12px 6px;
		border-bottom: 1px solid rgba(220, 226, 240, 0.1);
		border-radius: 4px;
		cursor: pointer;
		outline: none;
	}
	.prow::before,
	.prow::after {
		content: '';
		position: absolute;
		pointer-events: none;
		z-index: -1;
	}
	.prow::before {
		inset: 0;
		border-radius: 4px;
		background: rgba(226, 149, 79, 0.07);
		transform: scaleX(0);
		transform-origin: right;
		transition: transform 0.32s cubic-bezier(0.23, 1, 0.32, 1);
	}
	.prow::after {
		left: 0;
		top: 9px;
		bottom: 9px;
		width: 2px;
		border-radius: 1px;
		background: #e2954f;
		transform: scaleY(0);
		transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
	}
	@media (hover: hover) and (pointer: fine) {
		.prow:hover::before {
			transform: scaleX(1);
			transform-origin: left;
		}
		.prow:hover::after {
			transform: scaleY(1);
			transition-delay: 0.06s;
		}
	}
	.prow:focus-visible::before {
		transform: scaleX(1);
		transform-origin: left;
	}
	.prow:focus-visible::after {
		transform: scaleY(1);
	}
	/* mobile row — DC 11b L668 */
	.prowm {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 9px 2px;
		border-bottom: 1px solid rgba(220, 226, 240, 0.1);
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.prowm:active {
		background: rgba(226, 149, 79, 0.08);
	}
</style>
