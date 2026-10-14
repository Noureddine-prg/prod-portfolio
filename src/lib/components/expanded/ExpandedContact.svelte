<script lang="ts">
	// Contact expanded panel, mounted into the clone by expand.ts. Z-order is load-bearing:
	// envelope + ash sit under the content (z0/z1), the flame bleeds ABOVE it (z2,
	// pointer-events:none) and is cropped by the container's overflow:hidden.
	import { onDestroy } from 'svelte';
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import CardLinks from './CardLinks.svelte';
	import Icon from '../Icon.svelte';
	import { contact, links, profile } from '$lib/content';

	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();

	// idle → done | failed → idle. The label flips only once the clipboard write has
	// actually landed, and the same text goes to a polite live region for screen readers.
	let copyState = $state<'idle' | 'done' | 'failed'>('idle');
	let revert: ReturnType<typeof setTimeout> | undefined;
	let destroyed = false;
	onDestroy(() => {
		destroyed = true; // closing mid-write or mid-"Copied" must not touch an unmounted component
		clearTimeout(revert);
	});

	const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
	const idleLabel = touch ? contact.copyLabelTouch : contact.copyLabel;
	const copied = $derived(copyState === 'done');
	const label = $derived(
		copyState === 'done'
			? contact.copiedLabel
			: copyState === 'failed'
				? contact.copyFailedLabel
				: idleLabel
	);

	async function copyEmail() {
		let ok = true;
		try {
			await navigator.clipboard.writeText(profile.email);
		} catch {
			ok = false; // no clipboard access (insecure context, denied permission)
		}
		if (destroyed) return;
		copyState = ok ? 'done' : 'failed';
		clearTimeout(revert);
		revert = setTimeout(() => (copyState = 'idle'), 2200);
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
			style="font:500 var(--t-label) 'JetBrains Mono',monospace;letter-spacing:.12em;color:#94867f;text-transform:uppercase"
			>{contact.header}</span
		>
		<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta)">{profile.timezone}</span>
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
		<button
			type="button"
			data-copy-email
			onclick={copyEmail}
			style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:0 15px;border-radius:10px;background:#211b1b;border:1px solid #362e2e;cursor:pointer;margin:0;font:inherit;text-align:inherit"
		>
			<span style="font:500 12px 'JetBrains Mono',monospace;color:#efe9e6">{profile.email}</span>
			<span
				data-copy-label
				style="display:inline-flex;align-items:center;gap:.35em;font:400 12px 'JetBrains Mono',monospace;color:{copied
					? '#d86a52'
					: '#958479'};text-transform:uppercase;letter-spacing:.06em;flex:none"
				>{#if copied}<Icon name="check" />{/if}{label}</span
			>
		</button>
		<a
			href="mailto:{profile.email}"
			style="display:flex;align-items:center;justify-content:center;gap:.4em;min-height:44px;border-radius:10px;background:#d86a52;font:500 12px 'JetBrains Mono',monospace;color:#2a0d06;text-decoration:none"
			>{contact.writeMe}<Icon name="arrow-right" /></a
		>
		<div style="display:flex;gap:8px">
			{#each contact.socialsMobile as s (s)}
				<a
					href={s === 'GitHub' ? links.github : links.linkedin}
					target="_blank"
					rel="noreferrer"
					style="flex:1;display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:10px;background:#211b1b;border:1px solid #2a2424;font:500 12px 'JetBrains Mono',monospace;color:#efe9e6;text-decoration:none"
					>{s}&nbsp;<span style="display:inline-flex;color:#d86a52"><Icon name="arrow-up-right" /></span></a
				>
			{/each}
		</div>
		<a
			href={links.resume}
			target="_blank"
			rel="noreferrer"
			style="display:flex;align-items:center;justify-content:center;min-height:40px;border-radius:10px;gap:.4em;background:#211b1b;border:1px solid #2a2424;font:500 12px 'JetBrains Mono',monospace;color:#d86a52;text-decoration:none"
			>{contact.resumeLabel}<Icon name="arrow-right" /></a
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
			style="font:500 var(--t-label) 'JetBrains Mono',monospace;letter-spacing:.12em;color:#94867f;text-transform:uppercase"
			>{contact.header}</span
		>
		<span style="font:400 var(--t-meta) 'JetBrains Mono',monospace;color:var(--c-meta)">{profile.timezone}</span>
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
			<button
				type="button"
				data-copy-email
				onclick={copyEmail}
				style="display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;background:#211b1b;border:1px solid #362e2e;cursor:pointer;margin:0;font:inherit;text-align:inherit"
			>
				<span style="font:500 13px 'JetBrains Mono',monospace;color:#efe9e6">{profile.email}</span>
				<span
					style="display:inline-grid;font:400 10px 'JetBrains Mono',monospace;color:{copied
						? '#d86a52'
						: '#958479'};text-transform:uppercase;letter-spacing:.08em"
					><!-- the idle label reserves the width, so the row never resizes as it flips --><span
						aria-hidden="true"
						style="grid-area:1/1;visibility:hidden">{idleLabel}</span
					><span
						data-copy-label
						style="grid-area:1/1;display:inline-flex;align-items:center;gap:.35em"
						>{#if copied}<Icon name="check" />{/if}{label}</span
					></span
				>
			</button>
			<a
				href="mailto:{profile.email}"
				style="display:inline-flex;align-items:center;gap:.4em;padding:12px 18px;border-radius:10px;background:#d86a52;font:500 11px 'JetBrains Mono',monospace;color:#2a0d06;text-decoration:none"
				>{contact.writeMe}<Icon name="arrow-right" /></a
			>
		</div>
	</div>
	<div
		style="position:relative;z-index:1;display:flex;gap:18px;align-items:baseline;border-top:1px solid #2a2424;padding-top:12px"
	>
		<CardLinks resumeColor="#d86a52" linkColor="#94867f" />
	</div>
{/if}

<!-- announces the copy result; visually hidden, outside both layouts -->
<span
	aria-live="polite"
	style="position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"
	>{copyState === 'idle' ? '' : label}</span
>
