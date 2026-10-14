<script lang="ts">
	// The shared "this card opens" hint — the same arrow on every clickable tile; each tile
	// only picks a color that reads on its own ground. Decorative: the tile names itself.
	import { tileHint } from '$lib/content';

	interface Props {
		mobile?: boolean;
		color: string;
	}
	let { mobile = false, color }: Props = $props();
</script>

<span
	class="tile-hint"
	aria-hidden="true"
	style="position:relative;display:inline-block;font:400 {mobile ? 17 : 16}px/1 'Archivo',sans-serif;color:{color};white-space:nowrap"
	>{tileHint}</span
>
