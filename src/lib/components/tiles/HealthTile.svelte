<script lang="ts">
	// Health — display-only stats. Desktop DC L210-230; mobile has a DISTINCT compact
	// layout (DC L578-597): 32px ring, 4 bars, single "62 · 172 lb" line. No canvas.
	import { health } from '$lib/content';

	interface Props {
		mobile?: boolean;
		placement?: string;
	}
	let { mobile = false, placement = '' }: Props = $props();

	const pad = $derived(mobile ? '12px' : '14px 16px');
</script>

<div
	style="{placement};background:radial-gradient(110% 85% at 30% -15%,rgba(94,138,105,.12),transparent 58%),#161a17;border:1px solid #263028;border-radius:9px;padding:{pad};display:flex;flex-direction:column;justify-content:space-between;overflow:hidden"
>
	{#if mobile}
		<div style="display:flex;justify-content:space-between;align-items:baseline">
			<span
				style="font:400 11px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#efe9e6;text-transform:uppercase">{health.header}</span
			>
			<span style="font:400 7px 'JetBrains Mono',monospace;color:#6e6058">{health.updated}</span>
		</div>

		<div style="display:flex;align-items:center;gap:9px">
			<span
				style="width:32px;height:32px;border-radius:50%;background:conic-gradient(#e0654c 0 {health.ringPct}%,#3a2a26 {health.ringPct}% 100%);flex:none;display:flex;align-items:center;justify-content:center"
				><span
					style="width:23px;height:23px;border-radius:50%;background:conic-gradient(#7fc383 0 70%,#26302a 70% 100%);display:flex;align-items:center;justify-content:center"
					><span style="width:14px;height:14px;border-radius:50%;background:#1a1616"></span></span
				></span
			>
			<span style="font:400 8px/1.55 'Archivo',sans-serif;color:#94867f"
				><span style="font:700 11.5px 'Archivo',sans-serif;color:#efe9e6">{health.steps}</span> steps<br
				/>{health.moveMin} move min</span
			>
		</div>

		<div style="display:flex;gap:8px;align-items:center">
			<span style="display:flex;align-items:flex-end;gap:2px;height:13px;flex:none">
				<span style="width:3.5px;height:7px;border-radius:2px;background:#6ea8fe"></span>
				<span style="width:3.5px;height:11px;border-radius:2px;background:#7fc383"></span>
				<span style="width:3.5px;height:8px;border-radius:2px;background:#e8c268"></span>
				<span style="width:3.5px;height:13px;border-radius:2px;background:#e0654c"></span>
			</span>
			<svg width="24" height="10" viewBox="0 0 24 10" style="flex:none"
				><polyline
					points="0,7 3,5 6,8 9,2 12,6 15,2 18,7 21,4 24,6"
					fill="none"
					stroke="#e0654c"
					stroke-width="1.3"
				></polyline></svg
			>
			<span style="font:400 7.5px 'JetBrains Mono',monospace;color:#94867f"
				>{health.bpm} · {health.weightShort}</span
			>
		</div>
	{:else}
		<div style="display:flex;justify-content:space-between;align-items:baseline">
			<span
				style="font:400 13px 'Archivo Black',sans-serif;letter-spacing:.02em;color:#efe9e6;text-transform:uppercase">{health.header}</span
			>
			<span style="font:400 7.5px 'JetBrains Mono',monospace;color:#6e6058">{health.updated}</span>
		</div>

		<div style="display:flex;align-items:center;gap:16px">
			<span
				style="width:42px;height:42px;border-radius:50%;background:conic-gradient(#e0654c 0 {health.ringPct}%,#3a2a26 {health.ringPct}% 100%);flex:none;display:flex;align-items:center;justify-content:center"
				><span
					style="width:31px;height:31px;border-radius:50%;background:conic-gradient(#7fc383 0 70%,#26302a 70% 100%);display:flex;align-items:center;justify-content:center"
					><span style="width:20px;height:20px;border-radius:50%;background:#1a1616"></span></span
				></span
			>
			<span style="display:flex;align-items:flex-end;gap:3px;height:26px;flex:none">
				<span style="width:5px;height:12px;border-radius:3px;background:#6ea8fe"></span>
				<span style="width:5px;height:19px;border-radius:3px;background:#7fc383"></span>
				<span style="width:5px;height:15px;border-radius:3px;background:#e8c268"></span>
				<span style="width:5px;height:24px;border-radius:3px;background:#e0654c"></span>
				<span style="width:5px;height:17px;border-radius:3px;background:#6ea8fe"></span>
			</span>
			<span style="font:400 9.5px/1.6 'Archivo',sans-serif;color:#94867f"
				><span style="font:700 13px 'Archivo',sans-serif;color:#efe9e6">{health.steps}</span> steps<br
				/>{health.moveMin} move min</span
			>
		</div>

		<div style="display:flex;gap:18px;align-items:center">
			<span style="display:flex;align-items:center;gap:6px"
				><svg width="30" height="12" viewBox="0 0 30 12" style="flex:none"
					><polyline
						points="0,8 4,6 8,9 12,3 16,7 20,2 24,8 27,5 30,7"
						fill="none"
						stroke="#e0654c"
						stroke-width="1.4"
					></polyline></svg
				><span style="font:400 9.5px 'Archivo',sans-serif;color:#94867f">{health.bpm} bpm</span></span
			>
			<span style="font:400 9.5px 'Archivo',sans-serif;color:#94867f">{health.weight}</span>
		</div>
	{/if}
</div>
