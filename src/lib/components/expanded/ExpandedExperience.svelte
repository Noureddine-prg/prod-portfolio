<script lang="ts">
	// Experience expanded panel — the Stage-2 composite, mounted into the clone's
	// [data-expand] container by expand.ts.
	// Desktop (DC 11a L127–194): SpaceNightBg (absolute — excluded from the reveal
	// stagger) + header row + body row holding the timeline slot and the PortholeBar.
	// The timeline slot stays empty for now; its flex slot keeps the porthole in place.
	// Mobile (DC 11b L462–540): MobileOceanStrip (calm strip + sea-glass panel) holding
	// the three [data-exp-card] role cards — icon 32px + dashed connector, natural
	// stacking (pb:22). Cards start opacity:0/translateY(-12px) with their own inline
	// 120/280/440ms transitions; expand.ts clears both at settle (t=1950ms) for the
	// staggered rise. Education + links footer follows the panel (DC L532–539).
	import PortholeBar from './PortholeBar.svelte';
	import SpaceNightBg from './SpaceNightBg.svelte';
	import MobileOceanStrip from './MobileOceanStrip.svelte';
	import { experience, links } from '$lib/content';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	const cardDelays = ['120ms', '280ms', '440ms'];
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
							<svg width="15" height="15" viewBox="0 0 48 48"
								><path
									fill="#EA4335"
									d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
								/><path
									fill="#4285F4"
									d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
								/><path
									fill="#FBBC05"
									d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
								/><path
									fill="#34A853"
									d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
								/></svg
							>
						{:else if role.company === 'Meta'}
							<svg width="17" height="12" viewBox="0 0 48 32"
								><path
									d="M24 16 C19 8 9 6.5 9 16 C9 25.5 19 24 24 16 C29 8 39 6.5 39 16 C39 25.5 29 24 24 16"
									fill="none"
									stroke="#0082FB"
									stroke-width="5"
									stroke-linecap="round"
								/></svg
							>
						{:else}
							<span style="font:700 8.5px 'Archivo',sans-serif;color:#efe9e6">NYC</span>
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
						<span style="font:600 14px 'Archivo',sans-serif;color:#efe9e6">{role.company}</span>
						<span style="font:400 7.5px 'JetBrains Mono',monospace;color:#6e6058;flex:none"
							>{role.period}</span
						>
					</div>
					<span style="font:500 8.5px 'JetBrains Mono',monospace;color:#c85a44">{role.title}</span>
					<div style="display:flex;flex-direction:column;gap:5px">
						{#each role.bullets as b (b)}
							<span style="display:flex;gap:8px;align-items:flex-start"
								><span
									style="width:3.5px;height:3.5px;border-radius:50%;background:#5e4f48;flex:none;margin-top:6px"
								></span><span style="font:400 10px/1.55 'Archivo',sans-serif;color:#a89b93">{b}</span
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
		<span
			style="font:400 8px 'JetBrains Mono',monospace;color:#6e6058;border-top:1px solid #2a2424;padding-top:12px"
			>{experience.education}</span
		>
		<div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap">
			<a
				href={links.resume}
				target="_blank"
				style="font:500 8.5px 'JetBrains Mono',monospace;color:#c85a44;text-decoration:none"
				>Open resume PDF &rarr;</a
			>
			<a
				href={links.linkedin}
				target="_blank"
				style="font:500 8.5px 'JetBrains Mono',monospace;color:#94867f;text-decoration:none"
				>LinkedIn &#8599;</a
			>
			<a
				href={links.github}
				target="_blank"
				style="font:500 8.5px 'JetBrains Mono',monospace;color:#94867f;text-decoration:none"
				>GitHub &#8599;</a
			>
		</div>
	</div>
{:else}
	<SpaceNightBg />
	<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
		<span style="display:flex;align-items:baseline;gap:12px"
			><span
				style="font:400 24px 'Archivo Black',sans-serif;letter-spacing:.01em;color:#efe9e6;text-transform:uppercase"
				>Experience</span
			><span style="font:400 9.5px 'JetBrains Mono',monospace;color:#6e6058"
				>&mdash; The journey so far</span
			></span
		>
		<span style="font:400 9px 'JetBrains Mono',monospace;color:#6e6058"></span>
	</div>
	<div style="position:relative;display:flex;gap:22px;flex:1;min-height:0">
		<!-- timeline slot — content task fills the 96px/20px/1fr grid (DC L149-168) -->
		<div style="flex:1;min-width:0"></div>
		<PortholeBar />
	</div>
{/if}
