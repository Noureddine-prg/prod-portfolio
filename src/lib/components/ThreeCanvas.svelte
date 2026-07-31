<script lang="ts">
	// The only Svelte ↔ three bridge. Emits a <canvas data-three> with the right data-*
	// variant attributes, adds itself to the registry on mount (the loop builds it lazily
	// when it scrolls on-screen), and tears the context down on destroy. Runes only.
	import { onMount } from 'svelte';
	import { addCanvas, removeCanvas, getEntry } from '$lib/three/registry';
	import { ensureLoop } from '$lib/three/loop';
	import type { SceneKind } from '$lib/three/types';

	interface Props {
		kind: SceneKind;
		lite?: boolean;
		nowing?: boolean;
		sunzoom?: boolean;
		clean?: boolean;
		class?: string;
		style?: string;
	}

	let {
		kind,
		lite = false,
		nowing = false,
		sunzoom = false,
		clean = false,
		class: className = '',
		style = ''
	}: Props = $props();

	let canvas: HTMLCanvasElement;

	function onMove(e: PointerEvent) {
		const o = getEntry(canvas);
		if (!o) return;
		const r = canvas.getBoundingClientRect();
		o.tx = (e.clientX - r.left) / r.width - 0.5;
		o.ty = (e.clientY - r.top) / r.height - 0.5;
	}
	function onLeave() {
		const o = getEntry(canvas);
		if (o) {
			o.tx = 0;
			o.ty = 0;
		}
	}

	onMount(() => {
		addCanvas(canvas);
		ensureLoop();
		canvas.addEventListener('pointermove', onMove);
		canvas.addEventListener('pointerleave', onLeave);
		canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

		return () => {
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerleave', onLeave);
			const o = getEntry(canvas);
			if (o) {
				try {
					o.renderer.dispose();
				} catch {
					/* noop */
				}
			}
			removeCanvas(canvas);
		};
	});
</script>

<canvas
	bind:this={canvas}
	data-three
	data-scene={kind}
	data-lite={lite ? '1' : undefined}
	data-nowing={nowing ? '1' : undefined}
	data-sunzoom={sunzoom ? '1' : undefined}
	data-clean={clean ? '1' : undefined}
	class={className}
	{style}
></canvas>
