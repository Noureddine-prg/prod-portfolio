<script lang="ts">
	// The board shell. Both boards (11a desktop / 11b mobile) live in the DOM — a media
	// query at 900px shows one; the loop only builds canvases that are actually on-screen,
	// so the hidden board costs nothing. Stage 3 wires `openCard` to the expand flow.
	import BoardDesktop from '$lib/components/BoardDesktop.svelte';
	import BoardMobile from '$lib/components/BoardMobile.svelte';
	import { ui, type CardId } from '$lib/stores/ui.svelte';

	function open(card: CardId) {
		// Stage-1 stub — expand mechanics land in Stage 3.
		ui.openCard = card;
	}
</script>

<main>
	<div class="stage stage--desktop">
		<BoardDesktop onopen={open} />
	</div>
	<div class="stage stage--mobile">
		<BoardMobile onopen={open} />
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: #0a0908;
	}

	/* Show one board per viewport. Desktop board is 900px wide; below that, the mobile
	 * board takes over. */
	.stage--desktop {
		display: block;
	}
	.stage--mobile {
		display: none;
	}

	@media (max-width: 899px) {
		main {
			padding: 12px;
			align-items: flex-start;
		}
		.stage--desktop {
			display: none;
		}
		.stage--mobile {
			display: block;
		}
	}
</style>
