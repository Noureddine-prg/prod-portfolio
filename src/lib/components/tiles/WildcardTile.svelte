<script lang="ts">
	// Wildcard — display-only, desktop only (DC 11a L281-285). Dashed border, serif body.
	import { wildcard } from '$lib/content';

	interface Props {
		placement?: string;
	}
	let { placement = '' }: Props = $props();
</script>

<div
	style="{placement};position:relative;overflow:hidden;background:#1a1616;border:1px dashed #453a36;border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between"
>
	<span
		style="font:400 13px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#efe9e6;text-transform:uppercase">{wildcard.header}</span
	>
	<span style="font:400 13px/1.4 'Cormorant Garamond',serif;font-style:italic;color:#efe9e6"
		>{wildcard.body}</span
	>
	<span
		style="font:400 8.5px 'JetBrains Mono',monospace;color:#6e6058;text-transform:uppercase;letter-spacing:.08em">{wildcard.note}</span
	>
</div>
