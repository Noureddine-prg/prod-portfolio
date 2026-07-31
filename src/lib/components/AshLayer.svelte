<script lang="ts">
	// Rising ember/ash overlay (DC L85-100 desktop, L426-436 mobile). Spans are ported
	// verbatim as data; each drives the `ashrise` keyframe via --ao (opacity) and --sw (sway).
	interface Ash {
		ao: number;
		sw: string;
		left: string;
		size: string;
		bg: string;
		shadow: string;
		dur: string;
		delay: string;
	}

	interface Props {
		variant?: 'desktop' | 'mobile';
	}
	let { variant = 'desktop' }: Props = $props();

	const desktop: Ash[] = [
		{ ao: 0.4, sw: '18px', left: '8%', size: '2.5px', bg: '#6b5f57', shadow: '', dur: '17s', delay: '-3s' },
		{ ao: 0.34, sw: '-14px', left: '16%', size: '2px', bg: '#5d534c', shadow: '', dur: '21s', delay: '-11s' },
		{ ao: 0.7, sw: '12px', left: '24%', size: '2.5px', bg: '#ff8c3a', shadow: '0 0 6px rgba(255,140,58,.8)', dur: '14s', delay: '-6s' },
		{ ao: 0.38, sw: '22px', left: '33%', size: '2px', bg: '#6b5f57', shadow: '', dur: '19s', delay: '-14s' },
		{ ao: 0.32, sw: '-18px', left: '41%', size: '2.5px', bg: '#5d534c', shadow: '', dur: '23s', delay: '-8s' },
		{ ao: 0.65, sw: '-10px', left: '49%', size: '2px', bg: '#ffb066', shadow: '0 0 5px rgba(255,150,70,.7)', dur: '16s', delay: '-2s' },
		{ ao: 0.4, sw: '16px', left: '57%', size: '2px', bg: '#6b5f57', shadow: '', dur: '18s', delay: '-12s' },
		{ ao: 0.34, sw: '-20px', left: '66%', size: '2.5px', bg: '#5d534c', shadow: '', dur: '22s', delay: '-5s' },
		{ ao: 0.6, sw: '14px', left: '74%', size: '2px', bg: '#ff8c3a', shadow: '0 0 6px rgba(255,140,58,.75)', dur: '20s', delay: '-16s' },
		{ ao: 0.3, sw: '10px', left: '82%', size: '2px', bg: '#5d534c', shadow: '', dur: '25s', delay: '-19s' },
		{ ao: 0.36, sw: '-12px', left: '90%', size: '2px', bg: '#6b5f57', shadow: '', dur: '15s', delay: '-9s' },
		{ ao: 0.65, sw: '20px', left: '96%', size: '2.5px', bg: '#ffb066', shadow: '0 0 6px rgba(255,150,70,.75)', dur: '18.5s', delay: '-4s' },
		{ ao: 0.32, sw: '-16px', left: '3%', size: '2px', bg: '#5d534c', shadow: '', dur: '24s', delay: '-17s' },
		{ ao: 0.55, sw: '8px', left: '62%', size: '2px', bg: '#ff8c3a', shadow: '0 0 5px rgba(255,140,58,.7)', dur: '26s', delay: '-21s' }
	];

	const mobile: Ash[] = [
		{ ao: 0.4, sw: '14px', left: '6%', size: '2px', bg: '#6b5f57', shadow: '', dur: '18s', delay: '-3s' },
		{ ao: 0.32, sw: '-12px', left: '17%', size: '2px', bg: '#5d534c', shadow: '', dur: '22s', delay: '-11s' },
		{ ao: 0.65, sw: '10px', left: '28%', size: '2.5px', bg: '#ff8c3a', shadow: '0 0 6px rgba(255,140,58,.8)', dur: '15s', delay: '-6s' },
		{ ao: 0.36, sw: '16px', left: '39%', size: '2px', bg: '#6b5f57', shadow: '', dur: '20s', delay: '-14s' },
		{ ao: 0.6, sw: '-10px', left: '50%', size: '2px', bg: '#ffb066', shadow: '0 0 5px rgba(255,150,70,.7)', dur: '17s', delay: '-2s' },
		{ ao: 0.34, sw: '12px', left: '61%', size: '2px', bg: '#5d534c', shadow: '', dur: '23s', delay: '-8s' },
		{ ao: 0.38, sw: '-16px', left: '72%', size: '2px', bg: '#6b5f57', shadow: '', dur: '19s', delay: '-12s' },
		{ ao: 0.62, sw: '12px', left: '83%', size: '2.5px', bg: '#ff8c3a', shadow: '0 0 6px rgba(255,140,58,.75)', dur: '21s', delay: '-16s' },
		{ ao: 0.3, sw: '-14px', left: '93%', size: '2px', bg: '#5d534c', shadow: '', dur: '24s', delay: '-19s' }
	];

	const spans = $derived(variant === 'mobile' ? mobile : desktop);
	const containerStyle = $derived(
		variant === 'mobile'
			? 'top:294px;bottom:0;left:0;right:0;border-radius:0 0 28px 28px'
			: 'top:0;bottom:0;left:37%;right:0;border-radius:0 24px 24px 0'
	);
</script>

<div
	style="position:absolute;{containerStyle};overflow:hidden;pointer-events:none;z-index:5"
	aria-hidden="true"
>
	{#each spans as s (s.left + s.dur)}
		<span
			style="--ao:{s.ao};--sw:{s.sw};position:absolute;left:{s.left};bottom:-6px;width:{s.size};height:{s.size};border-radius:50%;background:{s.bg};{s.shadow
				? `box-shadow:${s.shadow};`
				: ''}animation:ashrise {s.dur} linear infinite {s.delay}"
		></span>
	{/each}
</div>
