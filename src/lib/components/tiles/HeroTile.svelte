<script lang="ts">
	// Hero — campfire scene backing + name block + glass icon buttons (DC 11a L101-113 /
	// 11b L437-449). Display-only (not an expandable card).
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { hero, links } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
	}
	let { mobile = false, placement = '' }: Props = $props();

	const iconSize = $derived(mobile ? 28 : 33);
	const iconR = $derived(mobile ? 7 : 8);
	const topPad = $derived(mobile ? 11 : 16);
	const sidePad = $derived(mobile ? 12 : 16);
	const badgePad = $derived(mobile ? '6px 10px' : '8px 14px');
	const badgeR = $derived(mobile ? 7 : 8);
	const badgeFont = $derived(mobile ? 11 : 13);
	const nameFont = $derived(mobile ? 21 : 34);
	const nameBottom = $derived(mobile ? 16 : 22);
	const glow = $derived(mobile ? '0 0 12px rgba(255,150,70,.14)' : '0 0 14px rgba(255,150,70,.14)');
</script>

<div
	style="{placement};position:relative;border-radius:14px;overflow:hidden;background:#0a0c12;border:1px solid #2a2424"
>
	<ThreeCanvas kind="campfire" lite={mobile} style="width:100%;height:100%;display:block" />

	<div
		style="position:absolute;top:{topPad}px;left:{sidePad}px;right:{sidePad}px;display:flex;gap:{mobile
			? 6
			: 8}px;align-items:center"
	>
		<span
			style="margin-right:auto;padding:{badgePad};border-radius:{badgeR}px;background:rgba(20,16,10,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);font:500 {badgeFont}px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#d4654c;text-transform:uppercase;box-shadow:{glow};text-shadow:0 0 8px rgba(255,150,70,.35)"
			>{hero.badge}</span
		>
		<a
			href={links.resume}
			target="_blank"
			rel="noreferrer"
			title="Resume PDF"
			style="display:flex;align-items:center;justify-content:center;width:{iconSize}px;height:{iconSize}px;border-radius:{iconR}px;background:rgba(20,16,10,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);text-decoration:none;box-shadow:{glow}"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="#d4654c"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline
					points="14 2 14 8 20 8"
				></polyline><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"
				></line></svg
			>
		</a>
		<a
			href={links.linkedin}
			target="_blank"
			rel="noreferrer"
			title="LinkedIn"
			style="display:flex;align-items:center;justify-content:center;width:{iconSize}px;height:{iconSize}px;border-radius:{iconR}px;background:rgba(20,16,10,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);text-decoration:none;box-shadow:{glow}"
		>
			<svg width="13" height="13" viewBox="0 0 24 24" fill="#d4654c"
				><path
					d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57z"
				></path></svg
			>
		</a>
		<a
			href={links.github}
			target="_blank"
			rel="noreferrer"
			title="GitHub"
			style="display:flex;align-items:center;justify-content:center;width:{iconSize}px;height:{iconSize}px;border-radius:{iconR}px;background:rgba(20,16,10,.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.16);text-decoration:none;box-shadow:{glow}"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="#d4654c"
				><path
					d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
				></path></svg
			>
		</a>
	</div>

	<div
		style="position:absolute;bottom:{nameBottom}px;left:{nameBottom}px;right:{nameBottom}px;display:flex;justify-content:space-between;align-items:flex-end"
	>
		<div
			style="font:400 {nameFont}px/1.02 'Archivo Black',sans-serif;letter-spacing:-.01em;color:#f2ede2;text-shadow:0 2px 20px rgba(0,0,0,.6),0 0 22px rgba(255,170,90,.22);text-transform:uppercase"
		>
			{hero.nameLines[0]}<br />{hero.nameLines[1]}
		</div>
	</div>
</div>
