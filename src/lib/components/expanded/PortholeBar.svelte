<script lang="ts">
	// Experience expanded (desktop) — the right porthole bar (DC 11a L170–194).
	// Pure DOM/CSS shell: light cones, dust motes, warm halo, and the nested porthole
	// ring stack around a full calm scene (no variant flags → wing visible, zoom 1).
	// The nested div chain (outer ring → mid ring → inner ring → window) IS the design —
	// each layer carries its own border-radius percent pair and shadow stack. Do not
	// flatten it. Stage 3 places this inside the expanded card's flex row.
	import ThreeCanvas from '../ThreeCanvas.svelte';
</script>

<div
	style="position:relative;width:230px;flex:none;padding:8px 10px;box-sizing:border-box;display:flex"
>
	<!-- light cones (conic-masked, blurred) — DC L171–172 -->
	<span
		style="position:absolute;left:-400px;top:50%;transform:translateY(-50%);width:540px;height:230%;pointer-events:none;filter:blur(14px);-webkit-mask:conic-gradient(from 212deg at 95% 50%,transparent 0deg,#000 40deg,#000 76deg,transparent 116deg);mask:conic-gradient(from 212deg at 95% 50%,transparent 0deg,#000 40deg,#000 76deg,transparent 116deg);background:radial-gradient(115% 62% at 95% 50%,rgba(236,148,68,.20),rgba(232,152,80,.09) 42%,rgba(230,148,76,.035) 66%,transparent 86%)"
	></span>
	<span
		style="position:absolute;left:-400px;top:50%;transform:translateY(-50%);width:550px;height:290%;pointer-events:none;filter:blur(26px);-webkit-mask:conic-gradient(from 202deg at 95% 50%,transparent 0deg,#000 48deg,#000 88deg,transparent 136deg);mask:conic-gradient(from 202deg at 95% 50%,transparent 0deg,#000 48deg,#000 88deg,transparent 136deg);background:radial-gradient(115% 66% at 95% 50%,rgba(236,148,68,.07),rgba(230,148,76,.03) 50%,transparent 84%)"
	></span>

	<!-- dust motes drifting through the cone — DC L173–180 -->
	<span
		style="position:absolute;left:-330px;top:50%;transform:translateY(-50%);width:340px;height:170%;pointer-events:none;clip-path:polygon(100% 38%,100% 62%,0% 108%,0% -8%)"
	>
		<span
			style="position:absolute;left:64%;top:38%;width:2px;height:2px;border-radius:50%;background:rgba(255,214,170,.5);animation:dcdust 13s linear infinite"
		></span>
		<span
			style="position:absolute;left:78%;top:56%;width:1.5px;height:1.5px;border-radius:50%;background:rgba(255,214,170,.4);animation:dcdust 17s linear infinite 3s"
		></span>
		<span
			style="position:absolute;left:52%;top:47%;width:2px;height:2px;border-radius:50%;background:rgba(255,214,170,.32);animation:dcdust 21s linear infinite 7s"
		></span>
		<span
			style="position:absolute;left:86%;top:44%;width:1.5px;height:1.5px;border-radius:50%;background:rgba(255,214,170,.45);animation:dcdust 15s linear infinite 5s"
		></span>
		<span
			style="position:absolute;left:70%;top:63%;width:1.5px;height:1.5px;border-radius:50%;background:rgba(255,214,170,.3);animation:dcdust 19s linear infinite 10s"
		></span>
		<span
			style="position:absolute;left:40%;top:52%;width:1.5px;height:1.5px;border-radius:50%;background:rgba(255,214,170,.22);animation:dcdust 23s linear infinite 2s"
		></span>
	</span>

	<!-- warm halo behind the porthole — DC L181 -->
	<span
		style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:230%;height:200%;pointer-events:none;background:radial-gradient(50% 50% at 50% 50%,rgba(232,148,72,.26),rgba(232,148,72,.12) 42%,rgba(232,148,72,.045) 62%,transparent 78%)"
	></span>

	<!-- outer ring + 6 screws — DC L182–188 -->
	<div
		style="position:relative;flex:1;border-radius:48% / 35%;padding:13px 18px;background:#2b2523;border:1px solid rgba(255,240,220,.07);box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex"
	>
		<div
			style="position:absolute;top:3.5%;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6b625c,#3a332f 65%,#241f1c);box-shadow:0 1px 1px rgba(0,0,0,.5)"
		>
			<span
				style="position:absolute;left:1px;right:1px;top:2px;height:1px;background:rgba(0,0,0,.55)"
			></span>
		</div>
		<div
			style="position:absolute;bottom:3.5%;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6b625c,#3a332f 65%,#241f1c);box-shadow:0 1px 1px rgba(0,0,0,.5)"
		>
			<span
				style="position:absolute;left:1px;right:1px;top:2px;height:1px;background:rgba(0,0,0,.55);transform:rotate(60deg)"
			></span>
		</div>
		<div
			style="position:absolute;top:22%;left:2.5%;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6b625c,#3a332f 65%,#241f1c);box-shadow:0 1px 1px rgba(0,0,0,.5)"
		>
			<span
				style="position:absolute;left:1px;right:1px;top:2px;height:1px;background:rgba(0,0,0,.55);transform:rotate(-35deg)"
			></span>
		</div>
		<div
			style="position:absolute;top:22%;right:2.5%;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6b625c,#3a332f 65%,#241f1c);box-shadow:0 1px 1px rgba(0,0,0,.5)"
		>
			<span
				style="position:absolute;left:1px;right:1px;top:2px;height:1px;background:rgba(0,0,0,.55);transform:rotate(25deg)"
			></span>
		</div>
		<div
			style="position:absolute;bottom:22%;left:2.5%;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6b625c,#3a332f 65%,#241f1c);box-shadow:0 1px 1px rgba(0,0,0,.5)"
		>
			<span
				style="position:absolute;left:1px;right:1px;top:2px;height:1px;background:rgba(0,0,0,.55);transform:rotate(80deg)"
			></span>
		</div>
		<div
			style="position:absolute;bottom:22%;right:2.5%;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6b625c,#3a332f 65%,#241f1c);box-shadow:0 1px 1px rgba(0,0,0,.5)"
		>
			<span
				style="position:absolute;left:1px;right:1px;top:2px;height:1px;background:rgba(0,0,0,.55);transform:rotate(-70deg)"
			></span>
		</div>

		<!-- mid ring — DC L189 -->
		<div
			style="position:relative;flex:1;border-radius:46% / 32%;padding:14px 12px 16px;background:radial-gradient(130% 170% at 50% -25%,#4a423e 0%,#332c29 50%,#241f1d 80%,#1e1a18 100%);box-shadow:0 12px 26px rgba(0,0,0,.5),inset 0 1px 1px rgba(255,240,220,.22),inset 0 6px 10px rgba(255,230,200,.06),inset 0 -8px 14px rgba(0,0,0,.55),inset 0 -2px 4px rgba(0,0,0,.4);display:flex"
		>
			<!-- inner ring — DC L190 -->
			<div
				style="position:relative;flex:1;border-radius:44% / 27%;padding:12px 11px;background:#1a1616;box-shadow:inset 0 3px 10px rgba(0,0,0,.85),inset 0 -1px 3px rgba(255,255,255,.05),0 1px 0 rgba(255,255,255,.04)"
			>
				<!-- window: dusk gradient + full calm scene + vignette — DC L191–194 -->
				<div
					style="position:relative;width:100%;height:100%;border-radius:42% / 25%;overflow:hidden;background:linear-gradient(180deg,#140e12,#241428 40%,#43223a 62%,#7a3b3a 78%,#c8703f 90%,#e2954f);box-shadow:inset 0 0 26px rgba(0,0,0,.62),inset 0 3px 8px rgba(0,0,0,.5)"
				>
					<ThreeCanvas kind="calm" style="width:100%;height:100%;display:block" />
					<div
						style="position:absolute;inset:0;pointer-events:none;border-radius:42% / 25%;background:radial-gradient(150% 150% at 50% 50%,transparent 60%,rgba(0,0,0,.42)),linear-gradient(180deg,rgba(0,0,0,.42),rgba(0,0,0,.12) 22%,transparent 42%,transparent 78%,rgba(255,235,210,.05))"
					></div>
				</div>
			</div>
		</div>
	</div>
</div>
