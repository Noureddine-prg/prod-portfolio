<script lang="ts">
	// The resume / LinkedIn / GitHub footer triad shared by every expanded card. Labels/hrefs
	// are constant; each card themes it via size + resume/link colors and keeps its own wrapper.
	import { links } from '$lib/content';
	import Icon from './Icon.svelte';
	let {
		size = 11,
		resumeColor,
		linkColor,
		resumeLabel = 'Open resume PDF',
		resume = true
	}: {
		size?: number;
		resumeColor: string;
		linkColor: string;
		resumeLabel?: string;
		/** false where the card already carries its own resume button (Experience) */
		resume?: boolean;
	} = $props();

	const link = $derived(
		`display:inline-flex;align-items:center;gap:.35em;font:500 ${size}px 'JetBrains Mono',monospace;text-decoration:none`
	);
</script>

{#if resume}
	<a href={links.resume} target="_blank" style="{link};color:{resumeColor}"
		>{resumeLabel}<Icon name="arrow-right" /></a
	>
{/if}
<a href={links.linkedin} target="_blank" style="{link};color:{linkColor}"
	>LinkedIn<Icon name="arrow-up-right" /></a
>
<a href={links.github} target="_blank" style="{link};color:{linkColor}"
	>GitHub<Icon name="arrow-up-right" /></a
>
