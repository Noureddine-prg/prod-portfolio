<script lang="ts">
	// The shared "this card opens" hint — the same arrow on every clickable tile; each tile
	// only picks a color that reads on its own ground. Decorative: the tile names itself.
	import Icon from '../Icon.svelte';

	interface Props {
		mobile?: boolean;
		color: string;
	}
	let { mobile = false, color }: Props = $props();
</script>

<span
	class="tile-hint"
	aria-hidden="true"
	style="position:relative;display:inline-flex;align-self:center;font-size:{mobile
		? 17
		: 16}px;line-height:1;color:{color}"><Icon name="arrow-right" style="vertical-align:0" /></span
>
