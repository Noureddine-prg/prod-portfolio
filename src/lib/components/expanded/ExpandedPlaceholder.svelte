<script lang="ts">
	// Minimal expanded-panel placeholder — header row only. The full expanded content
	// (About / Contact / Work views, sheets 4a/4b/4c) is the NEXT task; this keeps the
	// expand/close choreography exercisable per card until it lands. Header typography
	// follows the DC expanded headers.
	interface Props {
		title: string;
		meta?: string;
		fg?: string;
		metaFg?: string;
	}
	let { title, meta = '', fg = '#efe9e6', metaFg = '#6e6058' }: Props = $props();
</script>

<div style="position:relative;display:flex;justify-content:space-between;align-items:baseline">
	<span
		style="font:400 24px 'Archivo Black',sans-serif;letter-spacing:.01em;color:{fg};text-transform:uppercase"
		>{title}</span
	>
	<span style="font:400 9.5px 'JetBrains Mono',monospace;color:{metaFg}">{meta}</span>
</div>
