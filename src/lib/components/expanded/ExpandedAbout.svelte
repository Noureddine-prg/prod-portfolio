<script lang="ts">
	// About expanded panel — mounted into the clone's [data-expand] by expand.ts.
	// Desktop (DC 11a L297–352): ember-glass backdrop, header, 3 columns (172px portrait
	// col with a 206px bordered box → real <img> instead of the DC's image-slot element;
	// serif intro + Archivo body + availability; 230px right rail with 4 PLAIN-TEXT skill
	// groups), footer links. Chips/dcrule are mobile-only.
	// Mobile (DC 11b L609–655): 190px portrait hero with bottom gradient + the
	// SOFTWARE/ENGINEER lockup (line 2 stroked), summary, 3 chip groups with dcrule
	// draw-ins (.5/.7/.9s), availability pill with dcpulse dot.
	import EmberGlass from './EmberGlass.svelte';
	import { about, links, profile } from '$lib/content';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	const chipGroups = about.skillGroups.filter((g) => g.chips);
	const ruleDelays = ['.5s', '.7s', '.9s'];
</script>

{#if mobile}
	<EmberGlass mobile />
	<!-- portrait hero + lockup — DC L618–626; img is absolute so the ✕-clearance padding
	     expand.ts adds to the first non-absolute child can't shrink it -->
	<div
		style="position:relative;height:190px;flex:none;border-radius:16px;overflow:hidden;border:1px solid #2f2939"
	>
		<img
			src={about.portrait.src}
			alt={about.portrait.alt}
			style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block"
		/>
		<div
			style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,transparent,rgba(20,16,28,.94));pointer-events:none"
		></div>
		<div style="position:absolute;left:14px;bottom:12px;display:flex;flex-direction:column">
			<span
				style="font:400 20px/1.04 'Archivo Black',sans-serif;letter-spacing:.01em;color:#efe9f2;text-transform:uppercase;text-shadow:0 1px 10px rgba(0,0,0,.55)"
				>{about.lockup[0]}</span
			>
			<span
				style="font:400 20px/1.04 'Archivo Black',sans-serif;letter-spacing:.02em;color:transparent;text-transform:uppercase;-webkit-text-stroke:1.2px #e2954f;padding-left:22px"
				>{about.lockup[1]}</span
			>
		</div>
		<span
			style="position:absolute;right:14px;bottom:14px;font:400 8px 'JetBrains Mono',monospace;color:#cfc4de;text-shadow:0 1px 6px rgba(0,0,0,.6)"
			>{profile.location}</span
		>
	</div>
	<span style="position:relative;font:400 13.5px/1.8 'Archivo',sans-serif;color:#b3a8c2"
		>{about.body}</span
	>
	<!-- 3 chip groups with dcrule draw-ins — DC L629–650 -->
	<div
		style="position:relative;flex:1;display:flex;flex-direction:column;justify-content:space-evenly;gap:16px"
	>
		{#each chipGroups as g, i (g.label)}
			<div style="display:flex;flex-direction:column;gap:9px">
				<span style="display:flex;align-items:center;gap:10px"
					><span
						style="font:400 8px 'JetBrains Mono',monospace;color:#e2954f;text-transform:uppercase;letter-spacing:.12em;flex:none"
						>{g.label}</span
					><span
						style="flex:1;border-bottom:1px solid #2f2939;transform-origin:left;animation:dcrule .9s cubic-bezier(.2,.7,.3,1) {ruleDelays[
							i
						]} both"
					></span></span
				>
				<div style="display:flex;flex-wrap:wrap;gap:7px">
					{#each g.chips ?? [] as chip (chip)}
						<span
							style="padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid #3b3149;font:400 10.5px 'Archivo',sans-serif;color:#cfc4de"
							>{chip}</span
						>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<!-- availability pill — DC L651–654 -->
	<div
		style="position:relative;flex:none;display:flex;align-items:center;gap:9px;padding:11px 14px;border-radius:12px;background:rgba(226,149,79,.08);border:1px solid rgba(226,149,79,.22)"
	>
		<span
			style="width:7px;height:7px;border-radius:50%;background:#e2954f;flex:none;animation:dcpulse 2.4s ease-in-out infinite"
		></span>
		<span style="font:400 9.5px 'JetBrains Mono',monospace;color:#e9d9c6"
			>{about.availabilityLine}</span
		>
	</div>
	<!-- links footer, matching the other cards' pattern -->
	<div
		style="position:relative;flex:none;display:flex;gap:14px;align-items:baseline;border-top:1px solid #2f2939;padding-top:12px"
	>
		<a
			href={links.resume}
			target="_blank"
			style="font:500 8.5px 'JetBrains Mono',monospace;color:#e2954f;text-decoration:none"
			>Open resume PDF &rarr;</a
		>
		<a
			href={links.linkedin}
			target="_blank"
			style="font:500 8.5px 'JetBrains Mono',monospace;color:#b3a8c2;text-decoration:none"
			>LinkedIn &#8599;</a
		>
		<a
			href={links.github}
			target="_blank"
			style="font:500 8.5px 'JetBrains Mono',monospace;color:#b3a8c2;text-decoration:none"
			>GitHub &#8599;</a
		>
	</div>
{:else}
	<EmberGlass />
	<div
		style="position:relative;display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"
	>
		<span
			style="font:500 11px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#9d92ab;text-transform:uppercase"
			>{about.header}</span
		>
		<span style="font:400 9px 'JetBrains Mono',monospace;color:#6f6580">{about.location}</span>
	</div>
	<div style="position:relative;flex:1;display:flex;gap:36px;padding:10px 12px 0">
		<!-- portrait column — 206px bordered box, real <img> in the DC's image-slot place -->
		<div style="width:172px;flex:none;display:flex;flex-direction:column;justify-content:center">
			<div
				style="height:206px;position:relative;border:1px solid #2f2939;border-radius:16px;padding:5px;box-sizing:border-box;background:rgba(255,255,255,.02)"
			>
				<img
					src={about.portrait.src}
					alt={about.portrait.alt}
					style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block"
				/>
			</div>
		</div>
		<div
			style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;max-width:520px"
		>
			<span style="font:400 22px/1.5 'Cormorant Garamond',serif;color:#efe9f2">{about.intro}</span>
			<span style="font:400 12px/1.75 'Archivo',sans-serif;color:#b3a8c2">{about.body}</span>
			<span style="display:flex;align-items:center;gap:8px"
				><span
					style="width:7px;height:7px;border-radius:50%;background:#e2954f;box-shadow:0 0 8px rgba(226,149,79,.7)"
				></span><span style="font:400 9.5px 'JetBrains Mono',monospace;color:#9d92ab"
					>{about.availabilityLine}</span
				></span
			>
		</div>
		<!-- right rail — 4 plain-text skill groups (no chips/dcrule on desktop) -->
		<div
			style="width:230px;flex:none;display:flex;flex-direction:column;justify-content:center;gap:14px;border-left:1px solid #2f2939;padding-left:26px"
		>
			{#each about.skillGroups as g (g.label)}
				<div style="display:flex;flex-direction:column;gap:5px">
					<span
						style="font:400 8.5px 'JetBrains Mono',monospace;color:#e2954f;text-transform:uppercase;letter-spacing:.1em"
						>{g.label}</span
					>
					<span style="font:400 11.5px/1.6 'Archivo',sans-serif;color:#cfc4de">{g.text}</span>
				</div>
			{/each}
		</div>
	</div>
	<div
		style="position:relative;display:flex;gap:18px;align-items:baseline;border-top:1px solid #2f2939;padding-top:12px"
	>
		<a
			href={links.resume}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#e2954f;text-decoration:none"
			>Open resume PDF &rarr;</a
		>
		<a
			href={links.linkedin}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#9d92ab;text-decoration:none"
			>LinkedIn &#8599;</a
		>
		<a
			href={links.github}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#9d92ab;text-decoration:none"
			>GitHub &#8599;</a
		>
	</div>
{/if}
