<script lang="ts">
	// The shared star field (see $lib/sky). `style` places the layer; it must cover the
	// desktop board's box so the stars line up wherever it is drawn.
	import { STARS } from '$lib/sky';

	let { style = 'inset:0' }: { style?: string } = $props();
</script>

<div data-sky aria-hidden="true" style="position:absolute;{style};pointer-events:none">
	{#each STARS as s, i (i)}
		<span
			style="position:absolute;left:{s.x}%;top:{s.y}%;width:{s.size}px;height:{s.size}px;border-radius:50%;background:{s.color};{s.size ===
			2
				? 'box-shadow:0 0 5px rgba(255,238,200,.5);'
				: ''}animation:dctwinkle {s.dur}s ease-in-out infinite {s.delay}s"
		></span>
	{/each}
</div>
