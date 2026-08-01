<script lang="ts">
	// Experience expanded (mobile) — top ocean strip + sea-glass panel (DC 11b L462–477).
	// 200px calm strip (nowing+lite → no wing, zoom 2.7) blending down into the #101b21
	// card body, header row over it (meta keeps padding-right:34px to clear the close ✕,
	// DC L468), then the sea-glass panel with 5 dcfall water particles. Stage 3 renders
	// the staggered exp-cards into the panel via the children snippet.
	import type { Snippet } from 'svelte';
	import ThreeCanvas from '../ThreeCanvas.svelte';
	import { experience } from '$lib/content';

	interface Props {
		title?: string;
		meta?: string;
		children?: Snippet;
	}
	// meta default is the DC string (L469) — fuller than the tile's short period.
	let { title = experience.header, meta = '2024 — 2026 · NYC', children }: Props = $props();
</script>

<!-- calm strip + blend-out + header — DC L463–470 -->
<!-- full-bleed ocean sunset behind the content (no wing, no glass) -->
<div style="position:absolute;inset:0;overflow:hidden">
	<ThreeCanvas kind="calm" nowing lite style="position:absolute;inset:0;width:100%;height:100%;display:block" />
	<div
		style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,12,18,.14),rgba(10,12,18,.5) 55%,rgba(10,12,18,.72));pointer-events:none"
	></div>
</div>
<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline;padding:18px 22px 6px">
	<span
		style="font:400 15px 'Archivo Black',sans-serif;letter-spacing:.01em;color:#efe9e6;text-transform:uppercase;text-shadow:0 1px 12px rgba(0,0,0,.6)"
		>Experience</span
	>
	<span style="font:400 8px 'JetBrains Mono',monospace;color:#cdd8dd;padding-right:34px">{meta}</span>
</div>
<div style="position:relative;display:flex;flex-direction:column;gap:0;padding:14px 22px 0">
	{@render children?.()}
</div>
