<script lang="ts">
	// About expanded panel, mounted into the clone by expand.ts. Portrait-led: the photo is the
	// large stage, and the tile's firefly jar rides along as a small live accent beside the
	// name; statement, body, availability and skill groups sit beside (desktop) or below (mobile).
	import EmberGlass from './EmberGlass.svelte';
	import CardLinks from '../CardLinks.svelte';
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { about, profile } from '$lib/content';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	const chipGroups = about.skillGroups.filter((g) => g.chips);
	const ruleDelays = ['.5s', '.7s', '.9s'];
	const role = about.lockup.join(' ');
</script>

{#snippet identity(size: number)}
	<div style="display:flex;align-items:center;gap:10px">
		<ThreeCanvas
			kind="jar"
			lite
			style="width:{size}px;height:{Math.round(size * 1.15)}px;flex:none;display:block;pointer-events:none"
		/>
		<div style="display:flex;flex-direction:column;gap:3px">
			<span style="font:600 var(--t-item) 'Archivo',sans-serif;color:#f1ebe4"
				>{profile.name}</span
			>
			<span style="font:400 {mobile ? 12 : 11.5}px 'JetBrains Mono',monospace;color:#b8aca3"
				>{role} · {profile.location}</span
			>
		</div>
	</div>
{/snippet}

{#snippet availability()}
	<span style="display:flex;align-items:center;gap:9px"
		><span
			style="width:7px;height:7px;border-radius:50%;background:#e2954f;flex:none;box-shadow:0 0 8px rgba(226,149,79,.7);animation:dcpulse 2.4s ease-in-out infinite"
		></span><span style="font:400 {mobile ? 13 : 12.5}px/1.4 'Archivo',sans-serif;color:#e9d9c6;text-wrap:balance"
			>{about.availabilityLine}</span
		></span
	>
{/snippet}

{#if mobile}
	<EmberGlass mobile />
	<!-- portrait stage — the header rides on it, the ✕ sits in its top-right corner -->
	<div style="position:relative;flex:none;height:300px;margin:-20px -20px 0;overflow:hidden">
		<img
			src={about.portrait.src}
			alt={about.portrait.alt}
			style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 40%;display:block"
		/>
		<div
			style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,12,10,.55),transparent 28%,transparent 62%,#18130f);pointer-events:none"
		></div>
		<h2
			style="margin:0;position:absolute;left:20px;top:20px;font:400 var(--t-title) 'Archivo Black',sans-serif;letter-spacing:.02em;color:#f1ebe4;text-transform:uppercase"
			>{about.header}</h2
		>
	</div>
	<div style="position:relative;display:flex;flex-direction:column;gap:16px">
		{@render identity(40)}
		<span style="font:400 22px/1.3 'Cormorant Garamond',serif;color:#f1ebe4">{about.thesis}</span>
		<span style="font:400 14px/1.7 'Archivo',sans-serif;color:#d2c7bd">{about.body}</span>
		{@render availability()}
	</div>
	<!-- chip groups with dcrule draw-ins — DC L629–650 -->
	<div style="position:relative;flex:none;display:flex;flex-direction:column;gap:16px">
		{#each chipGroups as g, i (g.label)}
			<div style="display:flex;flex-direction:column;gap:9px">
				<span style="display:flex;align-items:center;gap:10px"
					><span
						style="font:500 var(--t-label) 'JetBrains Mono',monospace;color:#e2954f;text-transform:uppercase;letter-spacing:.12em;flex:none"
						>{g.label}</span
					><span
						style="flex:1;border-bottom:1px solid #3a302a;transform-origin:left;animation:dcrule .9s cubic-bezier(.2,.7,.3,1) {ruleDelays[
							i
						]} both"
					></span></span
				>
				<div style="display:flex;flex-wrap:wrap;gap:7px">
					{#each g.chips ?? [] as chip (chip)}
						<span
							style="padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid #43372f;font:400 12px 'Archivo',sans-serif;color:#d9cec4"
							>{chip}</span
						>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<div
		style="position:relative;flex:none;display:flex;gap:14px;align-items:baseline;border-top:1px solid #2e2520;padding-top:12px"
	>
		<CardLinks size={12} resumeColor="#e2954f" linkColor="#b8aca3" />
	</div>
{:else}
	<EmberGlass />
	<div
		style="position:relative;display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"
	>
		<h2
			style="margin:0;font:400 var(--t-title) 'Archivo Black',sans-serif;letter-spacing:.02em;color:#efe9e6;text-transform:uppercase"
			>{about.header}</h2
		>
	</div>
	<div style="position:relative;flex:1;min-height:0;display:flex;gap:44px">
		<!-- portrait stage -->
		<div
			style="position:relative;flex:0 0 36%;border-radius:16px;overflow:hidden;border:1px solid #3a302a"
		>
			<img
				src={about.portrait.src}
				alt={about.portrait.alt}
				style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%;display:block"
			/>
			<div
				style="position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 120%,rgba(226,149,79,.22),transparent 60%);pointer-events:none"
			></div>
		</div>
		<div
			style="flex:1;min-width:0;max-width:600px;display:flex;flex-direction:column;justify-content:center;gap:18px"
		>
			{@render identity(44)}
			<span style="font:400 28px/1.25 'Cormorant Garamond',serif;color:#f1ebe4"
				>{about.thesis}</span
			>
			<span style="font:400 14px/1.6 'Archivo',sans-serif;color:#d2c7bd;max-width:62ch"
				>{about.body}</span
			>
			{@render availability()}
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 32px">
				{#each about.skillGroups as g (g.label)}
					<div style="display:flex;flex-direction:column;gap:5px">
						<span
							style="font:500 var(--t-label) 'JetBrains Mono',monospace;color:#e2954f;text-transform:uppercase;letter-spacing:.12em"
							>{g.label}</span
						>
						<span style="font:400 12.5px/1.55 'Archivo',sans-serif;color:#d9cec4">{g.text}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<div
		style="position:relative;display:flex;gap:18px;align-items:baseline;border-top:1px solid #3a302a;padding-top:12px;margin-top:14px"
	>
		<CardLinks resumeColor="#e2954f" linkColor="#a39689" />
	</div>
{/if}
