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
<div style="position:relative;flex:0 1 200px;min-height:140px;overflow:hidden;background:#0a0c12">
	<ThreeCanvas kind="calm" nowing lite style="width:100%;height:100%;display:block" />
	<div
		style="position:absolute;left:0;right:0;bottom:-1px;height:110px;background:linear-gradient(180deg,transparent,rgba(16,27,33,.55) 55%,#101b21);pointer-events:none"
	></div>
	<div
		style="position:absolute;left:20px;right:20px;top:16px;display:flex;justify-content:space-between;align-items:baseline"
	>
		<span
			style="font:400 13px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#f0e6dd;text-transform:uppercase;text-shadow:0 1px 8px rgba(0,0,0,.6)"
			>{title}</span
		>
		<span
			style="font:400 8px 'JetBrains Mono',monospace;color:#d8c9bd;text-shadow:0 1px 8px rgba(0,0,0,.6);padding-right:34px"
			>{meta}</span
		>
	</div>
</div>

<!-- sea-glass panel + 5 dcfall water particles — DC L471–477 -->
<div
	style="position:relative;display:flex;flex-direction:column;flex:1;margin:14px 12px 0;padding:20px 16px 6px;background:linear-gradient(180deg,rgba(126,178,196,.10),rgba(96,140,160,.04));border:1px solid rgba(160,205,220,.16);border-radius:16px;backdrop-filter:blur(12px);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)"
>
	<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
		<span
			style="--ao:.35;--fh:420px;position:absolute;left:12%;top:-8px;width:2px;height:7px;border-radius:2px;background:linear-gradient(180deg,rgba(150,190,215,.0),rgba(150,190,215,.75));animation:dcfall 7s linear infinite"
		></span>
		<span
			style="--ao:.28;--fh:420px;position:absolute;left:34%;top:-8px;width:1.5px;height:6px;border-radius:2px;background:linear-gradient(180deg,rgba(150,190,215,.0),rgba(150,190,215,.7));animation:dcfall 9s linear infinite 2.4s"
		></span>
		<span
			style="--ao:.32;--fh:420px;position:absolute;left:55%;top:-8px;width:2px;height:8px;border-radius:2px;background:linear-gradient(180deg,rgba(150,190,215,.0),rgba(150,190,215,.7));animation:dcfall 8s linear infinite 4.8s"
		></span>
		<span
			style="--ao:.26;--fh:420px;position:absolute;left:71%;top:-8px;width:1.5px;height:6px;border-radius:2px;background:linear-gradient(180deg,rgba(150,190,215,.0),rgba(150,190,215,.65));animation:dcfall 10s linear infinite 1.2s"
		></span>
		<span
			style="--ao:.3;--fh:420px;position:absolute;left:88%;top:-8px;width:2px;height:7px;border-radius:2px;background:linear-gradient(180deg,rgba(150,190,215,.0),rgba(150,190,215,.7));animation:dcfall 8.5s linear infinite 6s"
		></span>
	</div>
	{@render children?.()}
</div>
