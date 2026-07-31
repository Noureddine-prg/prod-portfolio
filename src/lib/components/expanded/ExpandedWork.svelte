<script lang="ts">
	// Work expanded panel — parchment ledger, mounted into the clone's [data-expand] by
	// expand.ts. Desktop (DC 11a L361–417): header, column header + 6 rows on the
	// `34px 1fr 160px 118px 44px` grid (gap 16) with a real :hover rule (the DC used a
	// style-hover attribute), spacer, footer links. Mobile (DC 11b L663–698): flex-column
	// rows. Row click opens the ProjDetail overlay via the ui.workDetail store; rows only
	// exist while expanded (the panel is only ever mounted inside the clone), and
	// body-click close stays disabled for Work in expand.ts.
	// List fade under the detail ports the DC's show()/back handlers (L3302/L3333):
	// inline opacity → visibility:hidden after 300ms, restored on back.
	import { onDestroy } from 'svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { work, links } from '$lib/content';
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
	$effect(() => {
		if (detailOpen) {
			wasOpen = true;
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
		style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"
	>
		<span
			style="font:400 12px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#241d18;text-transform:uppercase"
			>Work &middot; 06 builds</span
		>
		<span style="font:400 8.5px 'JetBrains Mono',monospace;color:#8a7d6e">2024 &mdash; now</span>
	</div>
	{#each work.projects as p, i (p.id)}
		<div
			class="prowm"
			data-proj-row
			role="button"
			tabindex="0"
			use:listEl
			onclick={() => (ui.workDetail = p.id)}
			onkeydown={(e) => e.key === 'Enter' && (ui.workDetail = p.id)}
			style={i === work.projects.length - 1 ? 'border-bottom:none' : ''}
		>
			<span style="font:500 13px 'Cormorant Garamond',serif;color:#241d18"
				>{p.number} &middot; {p.name}</span
			>
			<span style="font:400 9.5px/1.5 'Archivo',sans-serif;color:#5e544a">{p.descShort}</span>
			<span style="font:400 7.5px 'JetBrains Mono',monospace;color:#8a7d6e"
				>{p.tech} &middot; {p.org} &middot; {p.year}</span
			>
		</div>
	{/each}
{:else}
	<div
		use:listEl
		style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px"
	>
		<span
			style="font:400 14px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#241d18;text-transform:uppercase"
			>Work &middot; 06 builds</span
		>
		<span style="font:400 9px 'JetBrains Mono',monospace;color:#8a7d6e">2024 &mdash; now</span>
	</div>
	<div
		use:listEl
		style="display:grid;grid-template-columns:34px 1fr 160px 118px 44px;gap:16px;padding:0 6px 10px;border-bottom:1px solid rgba(36,29,24,.28);font:400 8.5px 'Archivo Black',sans-serif;letter-spacing:.14em;color:#8a7d6e;text-transform:uppercase"
	>
		<span>#</span><span>Project</span><span>Tech</span><span>Company</span><span
			style="text-align:right">Year</span
		>
	</div>
	{#each work.projects as p (p.id)}
		<div
			class="prow"
			data-proj-row
			role="button"
			tabindex="0"
			use:listEl
			onclick={() => (ui.workDetail = p.id)}
			onkeydown={(e) => e.key === 'Enter' && (ui.workDetail = p.id)}
		>
			<span style="font:400 12px 'Cormorant Garamond',serif;color:#8a7d6e">{p.number}</span>
			<span
				><span style="font:500 16px 'Cormorant Garamond',serif;color:#241d18">{p.name}</span><span
					style="display:block;font:400 10px/1.5 'Archivo',sans-serif;color:#5e544a;margin-top:3px"
					>{p.desc}</span
				></span
			>
			<span style="font:400 8.5px 'JetBrains Mono',monospace;color:#4b423a">{p.tech}</span>
			<span style="font:400 9px 'JetBrains Mono',monospace;color:#5e544a">{p.org}</span>
			<span style="font:400 8.5px 'JetBrains Mono',monospace;color:#5e544a;text-align:right"
				>{p.year}</span
			>
		</div>
	{/each}
	<div use:listEl style="flex:1"></div>
	<div
		use:listEl
		style="display:flex;gap:18px;align-items:baseline;border-top:1px solid rgba(36,29,24,.28);padding-top:12px;margin-top:12px"
	>
		<a
			href={links.resume}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#241d18;text-decoration:none"
			>Open resume PDF &rarr;</a
		>
		<a
			href={links.linkedin}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#5e544a;text-decoration:none"
			>LinkedIn &#8599;</a
		>
		<a
			href={links.github}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#5e544a;text-decoration:none"
			>GitHub &#8599;</a
		>
	</div>
{/if}

{#if detailOpen}
	<ProjDetail narrow={mobile} />
{/if}

<style>
	/* desktop ledger row — grid + hover ported from the DC's inline style + style-hover
	   attribute (L369); hover props live here so the rule can actually win */
	.prow {
		display: grid;
		grid-template-columns: 34px 1fr 160px 118px 44px;
		gap: 16px;
		align-items: baseline;
		padding: 12px 6px;
		border-bottom: 1px solid rgba(36, 29, 24, 0.16);
		border-radius: 4px;
		cursor: pointer;
		transition:
			background 0.3s,
			padding 0.35s cubic-bezier(0.2, 0.7, 0.2, 1),
			box-shadow 0.35s;
	}
	.prow:hover {
		background: rgba(42, 13, 6, 0.12);
		padding-left: 14px;
		box-shadow: inset 2px 0 0 #2a0d06;
	}
	/* mobile row — DC 11b L668 */
	.prowm {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 9px 2px;
		border-bottom: 1px solid rgba(36, 29, 24, 0.16);
		cursor: pointer;
	}
</style>
