<script lang="ts">
	// About expanded "firefly-glass" backdrop — golden firefly orbs rising UNDER a
	// frosted glass veil. Desktop: 10 orbs + blur(9px) (DC 11a L298–309); mobile: 5 orbs
	// + blur(8px) (DC 11b L610–616). Wrapper is absolute → excluded from the expand
	// reveal stagger; sibling content sits above via position:relative.
	interface Props {
		mobile?: boolean;
	}
	let { mobile = false }: Props = $props();
</script>

<div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
	{#if mobile}
		<span
			style="--ao:.45;--sw:22px;position:absolute;left:10%;bottom:-30px;width:20px;height:20px;border-radius:50%;background:#ffd668;filter:blur(6px);animation:ashrise 22s linear infinite -3s"
		></span>
		<span
			style="--ao:.3;--sw:-30px;position:absolute;left:30%;bottom:-30px;width:30px;height:30px;border-radius:50%;background:#e8c25a;filter:blur(9px);animation:ashrise 30s linear infinite -14s"
		></span>
		<span
			style="--ao:.5;--sw:18px;position:absolute;left:52%;bottom:-30px;width:14px;height:14px;border-radius:50%;background:#ffcf7a;filter:blur(4px);animation:ashrise 18s linear infinite -8s"
		></span>
		<span
			style="--ao:.3;--sw:-24px;position:absolute;left:70%;bottom:-30px;width:34px;height:34px;border-radius:50%;background:#b89a4a;filter:blur(11px);animation:ashrise 32s linear infinite -20s"
		></span>
		<span
			style="--ao:.46;--sw:26px;position:absolute;left:86%;bottom:-30px;width:16px;height:16px;border-radius:50%;background:#ffd97e;filter:blur(5px);animation:ashrise 20s linear infinite -5s"
		></span>
		<div
			style="position:absolute;inset:0;background:rgba(18,24,19,.4);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),inset 0 0 0 1px rgba(226,149,79,.08)"
		></div>
	{:else}
		<span
			style="--ao:.5;--sw:30px;position:absolute;left:8%;bottom:-40px;width:26px;height:26px;border-radius:50%;background:#ffd668;filter:blur(7px);animation:ashrise 22s linear infinite -3s"
		></span>
		<span
			style="--ao:.34;--sw:-44px;position:absolute;left:21%;bottom:-40px;width:38px;height:38px;border-radius:50%;background:#e8c25a;filter:blur(11px);animation:ashrise 30s linear infinite -14s"
		></span>
		<span
			style="--ao:.55;--sw:22px;position:absolute;left:33%;bottom:-40px;width:18px;height:18px;border-radius:50%;background:#ffcf7a;filter:blur(5px);animation:ashrise 18s linear infinite -8s"
		></span>
		<span
			style="--ao:.3;--sw:-30px;position:absolute;left:46%;bottom:-40px;width:46px;height:46px;border-radius:50%;background:#b89a4a;filter:blur(14px);animation:ashrise 34s linear infinite -22s"
		></span>
		<span
			style="--ao:.5;--sw:36px;position:absolute;left:58%;bottom:-40px;width:22px;height:22px;border-radius:50%;background:#ffd97e;filter:blur(6px);animation:ashrise 20s linear infinite -1s"
		></span>
		<span
			style="--ao:.36;--sw:-24px;position:absolute;left:69%;bottom:-40px;width:32px;height:32px;border-radius:50%;background:#e8c25a;filter:blur(9px);animation:ashrise 26s linear infinite -17s"
		></span>
		<span
			style="--ao:.52;--sw:28px;position:absolute;left:80%;bottom:-40px;width:16px;height:16px;border-radius:50%;background:#ffe49a;filter:blur(4px);animation:ashrise 17s linear infinite -6s"
		></span>
		<span
			style="--ao:.32;--sw:-38px;position:absolute;left:90%;bottom:-40px;width:40px;height:40px;border-radius:50%;background:#b89a4a;filter:blur(12px);animation:ashrise 31s linear infinite -11s"
		></span>
		<span
			style="--ao:.44;--sw:18px;position:absolute;left:15%;bottom:-40px;width:20px;height:20px;border-radius:50%;background:#ffd668;filter:blur(6px);animation:ashrise 24s linear infinite -19s"
		></span>
		<span
			style="--ao:.4;--sw:-20px;position:absolute;left:63%;bottom:-40px;width:28px;height:28px;border-radius:50%;background:#ffcf7a;filter:blur(8px);animation:ashrise 28s linear infinite -9s"
		></span>
		<div
			style="position:absolute;inset:0;background:rgba(18,24,19,.4);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),inset 0 0 0 1px rgba(226,149,79,.08)"
		></div>
	{/if}
</div>
