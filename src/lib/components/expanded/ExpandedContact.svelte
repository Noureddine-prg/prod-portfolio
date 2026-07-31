<script lang="ts">
	// Contact expanded panel — mounted into the clone's [data-expand] by expand.ts.
	// Desktop z-stack (DC 11a L236–277): burnt envelope scene 400×340 (z0) + 17 ash
	// spans (z0) under the content (z1), with the flame scene 330×425 bleeding past the
	// bottom edge ABOVE the content (z2, pointer-events:none; the container's
	// overflow:hidden crops it). Alpha does the work — copy the z indices exactly.
	// Mobile (DC 11b L547–575): centered envelope at .6 opacity + flame in a cropped z0
	// wrapper, 2 ash spans, then the button stack (copy 44 / write-me 44 / socials row /
	// resume 40) pushed down with margin-top:auto.
	// Copy-email (DC wireExtras L3123–3136): clipboard write + '✦ signal sent' feedback
	// reverting after 2200ms — component state instead of document-level delegation.
	// The email comes from content.ts, not the DC's hardcoded old address.
	import { onDestroy } from 'svelte';
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { contact, links, profile } from '$lib/content';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	let copied = $state(false);
	let revert: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(revert)); // closing mid-"✦ signal sent" must not fire on an unmounted component

	function copyEmail() {
		try {
			navigator.clipboard.writeText(profile.email);
		} catch {
			/* clipboard unavailable — feedback still plays, as in the DC */
		}
		copied = true;
		clearTimeout(revert);
		revert = setTimeout(() => (copied = false), 2200);
	}
</script>

{#if mobile}
	<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0">
		<ThreeCanvas
			kind="envelope"
			lite
			style="position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:330px;height:275px;pointer-events:none;opacity:.6"
		/>
		<ThreeCanvas
			kind="flame"
			lite
			style="position:absolute;left:50%;bottom:-92px;transform:translateX(-50%);width:250px;height:320px;pointer-events:none"
		/>
	</div>
	<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0">
		<span
			style="--ao:.3;--sw:14px;position:absolute;left:16%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#6b5f57;animation:ashrise 18s linear infinite -4s"
		></span>
		<span
			style="--ao:.26;--sw:-12px;position:absolute;left:66%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#7a6d64;animation:ashrise 24s linear infinite -12s"
		></span>
	</div>
	<div
		style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:baseline"
	>
		<span
			style="font:500 10px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#94867f;text-transform:uppercase"
			>{contact.header}</span
		>
		<span style="font:400 8px 'JetBrains Mono',monospace;color:#6e6058">{profile.timezone}</span>
	</div>
	<div
		style="position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;margin-top:56px"
	>
		<span style="display:flex;flex-direction:column"
			><span
				style="font:400 40px/.96 'Archivo Black',sans-serif;color:#efe9e6;letter-spacing:-.01em;text-transform:uppercase"
				>{contact.headline[0]}</span
			><span
				style="font:400 40px/.96 'Archivo Black',sans-serif;color:#c85a44;letter-spacing:-.01em;text-transform:uppercase;padding-left:26px"
				>{contact.headline[1]}</span
			></span
		>
	</div>
	<div
		style="position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;margin-top:auto"
	>
		<span
			data-copy-email
			role="button"
			tabindex="0"
			onclick={copyEmail}
			onkeydown={(e) => e.key === 'Enter' && copyEmail()}
			style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:0 15px;border-radius:10px;background:#211b1b;border:1px solid #362e2e;cursor:pointer"
		>
			<span style="font:500 10.5px 'JetBrains Mono',monospace;color:#efe9e6">{profile.email}</span>
			<span
				data-copy-label
				style="font:400 7.5px 'JetBrains Mono',monospace;color:{copied
					? '#c85a44'
					: '#6e6058'};text-transform:uppercase;letter-spacing:.08em;flex:none"
				>{copied ? contact.copiedLabel : contact.copyLabel}</span
			>
		</span>
		<a
			href="mailto:{profile.email}"
			style="display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:10px;background:#c85a44;font:500 10px 'JetBrains Mono',monospace;color:#2a0d06;text-decoration:none"
			>{contact.writeMe}</a
		>
		<div style="display:flex;gap:8px">
			{#each contact.socialsMobile as s (s)}
				<span
					style="flex:1;display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:10px;background:#211b1b;border:1px solid #2a2424;font:500 9px 'JetBrains Mono',monospace;color:#efe9e6"
					>{s}&nbsp;<span style="color:#c85a44">&#8599;</span></span
				>
			{/each}
		</div>
		<a
			href={links.resume}
			target="_blank"
			style="display:flex;align-items:center;justify-content:center;min-height:40px;border-radius:10px;border:1px solid #2a2424;font:500 9px 'JetBrains Mono',monospace;color:#c85a44;text-decoration:none"
			>{contact.resumeLabel}</a
		>
	</div>
{:else}
	<ThreeCanvas
		kind="envelope"
		style="position:absolute;right:22px;top:50%;transform:translateY(-50%);width:400px;height:340px;pointer-events:none;z-index:0"
	/>
	<ThreeCanvas
		kind="flame"
		style="position:absolute;right:56px;bottom:-138px;width:330px;height:425px;pointer-events:none;z-index:2"
	/>
	<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0">
		<span
			style="--ao:.34;--sw:18px;position:absolute;left:12%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#6b5f57;animation:ashrise 17s linear infinite -3s"
		></span>
		<span
			style="--ao:.28;--sw:-14px;position:absolute;left:26%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#5d534c;animation:ashrise 21s linear infinite -11s"
		></span>
		<span
			style="--ao:.6;--sw:12px;position:absolute;left:34%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#ff8c3a;box-shadow:0 0 6px rgba(255,140,58,.8);animation:ashrise 14s linear infinite -6s"
		></span>
		<span
			style="--ao:.3;--sw:22px;position:absolute;left:45%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#6b5f57;animation:ashrise 19s linear infinite -14s"
		></span>
		<span
			style="--ao:.26;--sw:-18px;position:absolute;left:55%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#5d534c;animation:ashrise 23s linear infinite -8s"
		></span>
		<span
			style="--ao:.55;--sw:-10px;position:absolute;left:63%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#ffb066;box-shadow:0 0 5px rgba(255,150,70,.7);animation:ashrise 16s linear infinite -2s"
		></span>
		<span
			style="--ao:.32;--sw:16px;position:absolute;left:72%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#6b5f57;animation:ashrise 18s linear infinite -12s"
		></span>
		<span
			style="--ao:.28;--sw:-20px;position:absolute;left:81%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#5d534c;animation:ashrise 22s linear infinite -5s"
		></span>
		<span
			style="--ao:.5;--sw:14px;position:absolute;left:89%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#ff8c3a;box-shadow:0 0 6px rgba(255,140,58,.75);animation:ashrise 20s linear infinite -16s"
		></span>
		<span
			style="--ao:.24;--sw:10px;position:absolute;left:6%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#5d534c;animation:ashrise 25s linear infinite -19s"
		></span>
		<span
			style="--ao:.36;--sw:14px;position:absolute;left:18%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#6b5f57;animation:ashrise 20s linear infinite -6s"
		></span>
		<span
			style="--ao:.3;--sw:-16px;position:absolute;left:31%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#5d534c;animation:ashrise 24s linear infinite -15s"
		></span>
		<span
			style="--ao:.6;--sw:10px;position:absolute;left:40%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#ffb066;box-shadow:0 0 5px rgba(255,150,70,.7);animation:ashrise 18s linear infinite -2s"
		></span>
		<span
			style="--ao:.34;--sw:20px;position:absolute;left:50%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#6b5f57;animation:ashrise 22s linear infinite -10s"
		></span>
		<span
			style="--ao:.28;--sw:-12px;position:absolute;left:59%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#5d534c;animation:ashrise 25s linear infinite -18s"
		></span>
		<span
			style="--ao:.58;--sw:16px;position:absolute;left:68%;bottom:-6px;width:2.5px;height:2.5px;border-radius:50%;background:#ff8c3a;box-shadow:0 0 6px rgba(255,140,58,.75);animation:ashrise 19s linear infinite -7s"
		></span>
		<span
			style="--ao:.32;--sw:-20px;position:absolute;left:85%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#6b5f57;animation:ashrise 21s linear infinite -13s"
		></span>
		<span
			style="--ao:.55;--sw:12px;position:absolute;left:95%;bottom:-6px;width:2px;height:2px;border-radius:50%;background:#ffb066;box-shadow:0 0 5px rgba(255,150,70,.65);animation:ashrise 23s linear infinite -4s"
		></span>
	</div>
	<div
		style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:baseline"
	>
		<span
			style="font:500 11px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#94867f;text-transform:uppercase"
			>{contact.header}</span
		>
		<span style="font:400 9px 'JetBrains Mono',monospace;color:#6e6058">{profile.timezone}</span>
	</div>
	<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:12px">
		<span style="display:flex;flex-direction:column"
			><span
				style="font:400 52px/.96 'Archivo Black',sans-serif;color:#efe9e6;letter-spacing:-.01em;text-transform:uppercase"
				>{contact.headline[0]}</span
			><span
				style="font:400 52px/.96 'Archivo Black',sans-serif;color:#c85a44;letter-spacing:-.01em;text-transform:uppercase;padding-left:34px"
				>{contact.headline[1]}</span
			></span
		>
		<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
			<span
				data-copy-email
				role="button"
				tabindex="0"
				onclick={copyEmail}
				onkeydown={(e) => e.key === 'Enter' && copyEmail()}
				style="display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;background:#211b1b;border:1px solid #362e2e;cursor:pointer"
			>
				<span style="font:500 13px 'JetBrains Mono',monospace;color:#efe9e6">{profile.email}</span>
				<span
					data-copy-label
					style="font:400 8.5px 'JetBrains Mono',monospace;color:{copied
						? '#c85a44'
						: '#6e6058'};text-transform:uppercase;letter-spacing:.08em"
					>{copied ? contact.copiedLabel : contact.copyLabel}</span
				>
			</span>
			<a
				href="mailto:{profile.email}"
				style="padding:12px 18px;border-radius:10px;background:#c85a44;font:500 10px 'JetBrains Mono',monospace;color:#2a0d06;text-decoration:none"
				>{contact.writeMe}</a
			>
		</div>
	</div>
	<div
		style="position:relative;z-index:1;display:flex;gap:18px;align-items:baseline;border-top:1px solid #2a2424;padding-top:12px"
	>
		<a
			href={links.resume}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#c85a44;text-decoration:none"
			>{contact.resumeLabel}</a
		>
		<a
			href={links.linkedin}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#94867f;text-decoration:none"
			>LinkedIn &#8599;</a
		>
		<a
			href={links.github}
			target="_blank"
			style="font:500 9px 'JetBrains Mono',monospace;color:#94867f;text-decoration:none"
			>GitHub &#8599;</a
		>
	</div>
{/if}
