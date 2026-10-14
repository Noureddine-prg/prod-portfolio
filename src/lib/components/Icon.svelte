<script lang="ts">
	// Inline stroke icon, sized in em so it tracks the text beside it; decorative (the control
	// or the adjacent label carries the name).
	import { ICONS, type IconName } from '$lib/icons';

	interface Props {
		name: IconName;
		style?: string;
	}
	let { name, style = '' }: Props = $props();
</script>

<svg
	width="1em"
	height="1em"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
	style="flex:none;display:inline-block;vertical-align:-.125em;{style}"><path d={ICONS[name]} /></svg
>
