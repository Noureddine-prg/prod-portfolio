<script lang="ts">
	// Experience expanded panel, mounted into the clone by expand.ts. Mobile role cards start
	// hidden (opacity:0/translateY); expand.ts clears their transforms at settle for the staggered rise.
	import PortholeBar from './PortholeBar.svelte';
	import SpaceNightBg from './SpaceNightBg.svelte';
	import MobileOceanStrip from './MobileOceanStrip.svelte';
	import CompanyIcon from '../CompanyIcon.svelte';
	import CardLinks from '../CardLinks.svelte';
	import ResumeButton from './ResumeButton.svelte';
	import { experience } from '$lib/content';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	const cardDelays = ['120ms', '280ms', '440ms'];
	// timeline dot colors — current role ember-red, past roles ashen bronze (DC L149/156/163)
	const dots = [
		{ bg: '#c85a44', ring: 'rgba(200,90,68,.18)' },
		{ bg: '#8a6a4a', ring: 'rgba(138,106,74,.15)' },
		{ bg: '#8a6a4a', ring: 'rgba(138,106,74,.15)' }
	];
</script>

{#if mobile}
	<MobileOceanStrip>
		{#each experience.roles as role, i (role.company)}
			<div
				data-exp-card
				style="position:relative;display:flex;gap:13px;opacity:0;transform:translateY(-12px);transition:opacity .5s ease {cardDelays[
					i
				]},transform .55s cubic-bezier(.2,.7,.3,1) {cardDelays[i]}"
			>
				<div style="display:flex;flex-direction:column;align-items:center;flex:none">
					<span
						style="width:32px;height:32px;border-radius:9px;background:#262020;border:1px solid #362e2e;display:flex;align-items:center;justify-content:center;position:relative;z-index:1"
					>
						{#if role.company === 'Google'}
							<CompanyIcon company="Google" w={15} h={15} />
						{:else if role.company === 'Meta'}
							<CompanyIcon company="Meta" w={17} h={12} />
						{:else}
							<span style="font:700 12px 'Archivo',sans-serif;letter-spacing:-.02em;color:#efe9e6">NYC</span>
						{/if}
					</span>
					{#if i < experience.roles.length - 1}
						<span style="flex:1;width:0;border-left:1px dashed #3d332f;margin-top:6px"></span>
					{/if}
				</div>
				<div
					style="display:flex;flex-direction:column;gap:7px;flex:1;min-width:0;padding-bottom:{i <
					experience.roles.length - 1
						? 22
						: 0}px"
				>
					<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
						<span style="font:600 var(--t-item) 'Archivo',sans-serif;color:#efe9e6">{role.company}</span>
						<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta);flex:none"
							>{role.period}</span
						>
					</div>
					<span style="font:500 12px 'JetBrains Mono',monospace;color:var(--c-accent-text)">{role.title}</span>
					<div style="display:flex;flex-direction:column;gap:5px">
						{#each role.bullets as b (b)}
							<span style="display:flex;gap:8px;align-items:flex-start"
								><span
									style="width:3.5px;height:3.5px;border-radius:50%;background:#5e4f48;flex:none;margin-top:8px"
								></span><span style="font:400 13px/1.55 'Archivo',sans-serif;color:#a89b93">{b}</span
								></span
							>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</MobileOceanStrip>
	<!-- education + links footer — DC L532–539 -->
	<div style="display:flex;flex-direction:column;gap:10px;padding:0 22px 20px;margin-top:18px">
		<ResumeButton full />
		<span
			style="font:400 var(--t-meta)/1.5 'JetBrains Mono',monospace;color:var(--c-meta);border-top:1px solid #2a2424;padding-top:12px"
			>{experience.education}</span
		>
		<div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap">
			<CardLinks size={12} resume={false} resumeColor="#d86a52" linkColor="#94867f" />
		</div>
	</div>
{:else}
	<SpaceNightBg />
	<div style="position:relative;display:flex;justify-content:space-between;align-items:center">
		<span style="display:inline-flex;align-items:center;gap:12px"
			><span
				style="font:400 var(--t-title) 'Archivo Black',sans-serif;letter-spacing:.02em;color:#efe9e6;text-transform:uppercase"
				>Experience</span
			><span
				style="font:400 var(--t-meta) 'JetBrains Mono',monospace;line-height:1;color:var(--c-meta);align-self:center;margin-top:2px"
				>&mdash; The journey so far</span
			></span
		>
		<ResumeButton />
	</div>
	<div style="position:relative;display:flex;gap:22px;flex:1;min-height:0">
		<!-- role timeline — DC L147–168 -->
		<div style="display:grid;grid-template-columns:96px 20px 1fr;flex:1;align-content:start">
			{#each experience.roles as role, i (role.company)}
				{@const last = i === experience.roles.length - 1}
				<div
					style="grid-column:1;grid-row:{i +
						1};padding:2px 12px {last ? 0 : 16}px 0;text-align:right;display:flex;flex-direction:column;gap:3px"
				>
					<span style="font:500 var(--t-meta) 'JetBrains Mono',monospace;color:#efe9e6">{role.start}</span>
					<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta)">{role.end}</span>
				</div>
				<div style="grid-column:2;grid-row:{i + 1};position:relative">
					{#if !last}
						<span
							style="position:absolute;left:50%;top:8px;bottom:-8px;width:1px;background:#362e2e"
						></span>
					{/if}
					<span
						style="position:absolute;left:50%;top:4px;transform:translateX(-50%);width:9px;height:9px;border-radius:50%;background:{dots[
							i
						].bg};box-shadow:0 0 0 3px {dots[i].ring}"
					></span>
				</div>
				<div
					style="grid-column:3;grid-row:{i + 1};padding:0 0 {last
						? 0
						: 16}px 16px;display:flex;flex-direction:column;gap:5px"
				>
					<div style="display:flex;align-items:center;gap:10px">
						{#if role.company === 'Google'}
							<span
								style="width:26px;height:26px;border-radius:8px;background:#262020;border:1px solid #362e2e;flex:none;display:flex;align-items:center;justify-content:center;"
								><CompanyIcon company="Google" w={14} h={14} /></span
							>
						{:else if role.company === 'Meta'}
							<span
								style="width:26px;height:26px;border-radius:8px;background:#262020;border:1px solid #362e2e;flex:none;display:flex;align-items:center;justify-content:center;"
								><CompanyIcon company="Meta" w={16} h={11} /></span
							>
						{:else}
							<span
								style="width:26px;height:26px;border-radius:8px;background:#262020;border:1px solid #362e2e;flex:none;display:flex;align-items:center;justify-content:center;font:700 10px 'Archivo',sans-serif;letter-spacing:-.02em;color:#efe9e6"
								>NYC</span
							>
						{/if}
						<span style="font:600 var(--t-item) 'Archivo',sans-serif;color:#efe9e6">{role.company}</span>
						<span style="font:500 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-accent-text)">{role.title}</span>
					</div>
					<ul
						style="margin:1px 0 3px;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;max-width:68ch"
					>
						{#each role.bullets as b (b)}
							<li
								style="position:relative;padding-left:14px;font:400 var(--t-body-sm)/1.5 'Archivo',sans-serif;color:#cdc1b8"
							>
								<span
									style="position:absolute;left:0;top:.62em;width:5px;height:5px;border-radius:1px;background:#5e5048"
								></span>{b}
							</li>
						{/each}
					</ul>
					<div style="display:flex;gap:6px;flex-wrap:wrap">
						{#each role.tech as t (t)}
							<span
								style="padding:3px 9px;border-radius:10px;background:#262020;border:1px solid #362e2e;font:500 10px 'JetBrains Mono',monospace;color:#94867f"
								>{t}</span
							>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<PortholeBar />
	</div>
	<!-- quick-link row — DC L202–206 -->
	<div
		style="position:relative;display:flex;justify-content:flex-start;gap:18px;align-items:baseline;border-top:1px solid #2a2424;padding-top:14px"
	>
		<CardLinks resume={false} resumeColor="#d86a52" linkColor="#94867f" />
		<span style="margin-left:auto;font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta)"
			>{experience.education}</span
		>
	</div>
{/if}
