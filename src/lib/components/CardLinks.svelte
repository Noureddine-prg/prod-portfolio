<script lang="ts">
	// The resume / LinkedIn / GitHub footer triad shared by every expanded card. Labels/hrefs
	// are constant; each card themes it via size + resume/link colors and keeps its own wrapper.
	import { links } from '$lib/content';
	let {
		size = 9,
		resumeColor,
		linkColor,
		resumeLabel = 'Open resume PDF →'
	}: { size?: number; resumeColor: string; linkColor: string; resumeLabel?: string } = $props();
</script>

<a
	href={links.resume}
	target="_blank"
	style="font:500 {size}px 'JetBrains Mono',monospace;color:{resumeColor};text-decoration:none"
	>{resumeLabel}</a
>
<a
	href={links.linkedin}
	target="_blank"
	style="font:500 {size}px 'JetBrains Mono',monospace;color:{linkColor};text-decoration:none"
	>LinkedIn &#8599;</a
>
<a
	href={links.github}
	target="_blank"
	style="font:500 {size}px 'JetBrains Mono',monospace;color:{linkColor};text-decoration:none"
	>GitHub &#8599;</a
>
