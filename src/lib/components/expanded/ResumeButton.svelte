<script lang="ts">
	// The prominent resume action in the Experience panel (the board has no Resume tile;
	// the hero button and this one are the two front doors to the PDF).
	import { links } from '$lib/content';
	import Icon from '../Icon.svelte';

	interface Props {
		full?: boolean;
	}
	let { full = false }: Props = $props();
</script>

<a
	href={links.resume}
	target="_blank"
	rel="noreferrer"
	style="display:inline-flex;align-items:center;justify-content:center;gap:8px;{full
		? 'width:100%;'
		: ''}min-height:{full
		? 44
		: 34}px;padding:0 16px;border-radius:9px;background:rgba(200,90,68,.14);border:1px solid rgba(200,90,68,.5);color:#f3ddd2;text-decoration:none;font:600 12.5px 'Archivo',sans-serif;box-sizing:border-box"
	>Resume (PDF)<Icon name="arrow-up-right" /></a
>
