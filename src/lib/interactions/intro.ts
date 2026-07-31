// Intro sequence — port of DC runIntro (L1241–1358), active paths only.
// NOT ported: the lemniscate fire-orb tracer (DC L1252–1295) — its container is removed
// before it is ever appended (`inf.remove()`, L1270), so the whole block is dead code in
// the source design; and runIntroV4 (L1195), which is never called (only `runIntro(0)`,
// L1360). The DC retry loop (waiting for boards to exist) is also dropped — we run from
// the page's onMount with the boards already in the DOM.
//
// NEW vs DC (README mandate): prefers-reduced-motion skips the intro entirely — the veil
// is never shown and `introPlayed` is set immediately. Also new: a short wait for the
// 'Archivo Black' webfont so the particle text samples the display font, not the
// fallback (the DC sampled synchronously at t=0 — flagged in the report).

import { ui } from '$lib/stores/ui.svelte';

export async function maybeRunIntro(): Promise<void> {
	if (ui.introPlayed) return;
	ui.introPlayed = true; // session gate — the DC's window.__fireIntro (L1244/L1360)
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	try {
		await Promise.race([
			document.fonts.load('400 76px "Archivo Black"'),
			new Promise((r) => setTimeout(r, 450))
		]);
	} catch {
		/* fallback font — same as the DC */
	}
	// The DC runs the intro on every [data-board]; only one board is visible per
	// viewport here, and a 0-width hidden board cannot host the particle canvas.
	document.querySelectorAll<HTMLElement>('[data-board]').forEach((board) => {
		if (board.getBoundingClientRect().width > 0) runIntro(board);
	});
}

function runIntro(board: HTMLElement): void {
	board.style.position = board.style.position || 'relative';
	const veil = document.createElement('div');
	veil.style.cssText =
		'position:absolute;inset:-1px;z-index:90;border-radius:inherit;overflow:hidden;pointer-events:none;display:flex;align-items:center;justify-content:center;background:#0c0908;transition:opacity .7s ease 2.5s';
	const r = board.getBoundingClientRect();
	const isMobile = r.width < 500;

	// ember ring tracing the board border, same language as the card-open ring
	const ring = document.createElement('div');
	ring.style.cssText =
		'position:absolute;inset:0;pointer-events:none;border-radius:inherit;padding:3px;overflow:hidden;filter:drop-shadow(0 0 6px rgba(255,140,58,.8));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:opacity .5s';
	const ringInner = document.createElement('div');
	ringInner.style.cssText =
		'position:absolute;left:50%;top:50%;width:320%;height:320%;transform:translate(-50%,-50%);background:conic-gradient(transparent 0 58%,rgba(255,125,46,.35) 70%,rgba(255,125,46,1) 84%,#ffd28a 90%,rgba(255,190,110,.45) 95%,transparent 99%);animation:firering 1.6s linear infinite';
	ring.appendChild(ringInner);
	veil.appendChild(ring);
	setTimeout(() => {
		ring.style.opacity = '0';
	}, 2500);

	const nm = document.createElement('span');
	nm.style.cssText =
		'position:relative;white-space:nowrap;font:400 ' +
		(isMobile ? 22 : 54) +
		'px "Archivo Black",sans-serif;letter-spacing:.01em;color:#f2ede2;text-transform:uppercase;text-align:center;opacity:0;filter:blur(4px);text-shadow:0 0 26px rgba(255,150,70,.5),0 0 60px rgba(255,130,50,.25);transition:opacity .9s ease .3s,filter .9s ease .3s';
	nm.textContent = 'Noureddine Sidi Abed';
	const wrap = document.createElement('div');
	wrap.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center';
	wrap.appendChild(nm);
	// "Software Engineer" formed from particles, dispersing in every direction at the end
	const spacer = document.createElement('div');
	spacer.style.cssText = 'height:' + (isMobile ? 40 : 64) + 'px';
	wrap.appendChild(spacer);
	veil.appendChild(wrap);

	// full-board particle canvas so the burst travels across the whole screen
	const pcv = document.createElement('canvas');
	const bw = Math.ceil(r.width),
		bh = Math.ceil(r.height);
	pcv.width = bw * 2;
	pcv.height = bh * 2;
	pcv.style.cssText =
		'position:absolute;inset:0;width:' + bw + 'px;height:' + bh + 'px;pointer-events:none;z-index:2';
	veil.appendChild(pcv);
	const pctx = pcv.getContext('2d');
	if (!pctx) return;
	pctx.font = '400 ' + (isMobile ? 22 : 38) * 2 + 'px "Archivo Black",sans-serif';
	pctx.textAlign = 'center';
	pctx.textBaseline = 'middle';
	const tcx = bw,
		tcy = bh + (isMobile ? 56 : 96); // centered, just under the name
	pctx.fillText('SOFTWARE ENGINEER', tcx, tcy);
	const img = pctx.getImageData(0, 0, bw * 2, bh * 2).data;
	interface Pt {
		x: number;
		y: number;
		jx: number;
		jy: number;
		d: number;
		vx: number;
		vy: number;
		warm: boolean;
	}
	const pts: Pt[] = [];
	for (let y = 0; y < bh * 2; y += 4)
		for (let x = 0; x < bw * 2; x += 4) {
			if (img[(y * bw * 2 + x) * 4 + 3] > 128) {
				const ang = Math.random() * Math.PI * 2,
					spd = 0.5 + Math.random() * 0.7;
				pts.push({
					x: x,
					y: y,
					jx: (Math.random() - 0.5) * 60,
					jy: (Math.random() - 0.5) * 40,
					d: Math.random() * 0.35,
					vx: Math.cos(ang) * spd,
					vy: Math.sin(ang) * spd,
					warm: Math.random() < 0.8
				});
			}
		}
	pctx.clearRect(0, 0, bw * 2, bh * 2);
	const pT0 = performance.now();
	let pOn = true;
	const pTick = () => {
		if (!pOn) return;
		const el = (performance.now() - pT0) / 1000;
		pctx.clearRect(0, 0, bw * 2, bh * 2);
		pts.forEach((p) => {
			let px: number, py: number, al: number;
			if (el < 2.35) {
				const k = Math.min(1, Math.max(0, (el - 0.45 - p.d) / 0.8));
				const e = 1 - Math.pow(1 - k, 3);
				px = p.x + p.jx * (1 - e);
				py = p.y + p.jy * (1 - e);
				al = e;
			} else {
				const k = Math.min(1, (el - 2.35) / 1.4);
				const e = 1 - Math.pow(1 - k, 2);
				px = p.x + p.vx * e * bw;
				py = p.y + p.vy * e * bw;
				al = 1 - k * 0.95;
			}
			if (al <= 0) return;
			pctx.shadowBlur = p.warm ? 9 : 4;
			pctx.shadowColor = p.warm
				? 'rgba(255,140,58,' + al + ')'
				: 'rgba(226,220,210,' + al * 0.6 + ')';
			pctx.fillStyle = p.warm
				? 'rgba(255,160,80,' + al * 0.98 + ')'
				: 'rgba(232,226,216,' + al * 0.85 + ')';
			pctx.fillRect(px, py, 3, 3);
		});
		if (el > 3.9) {
			pOn = false;
			return;
		}
		requestAnimationFrame(pTick);
	};
	requestAnimationFrame(pTick);

	board.appendChild(veil);
	requestAnimationFrame(() => {
		nm.style.opacity = '1';
		nm.style.filter = 'blur(0)';
		setTimeout(() => {
			nm.style.transition = 'opacity .5s ease,filter .5s ease';
			nm.style.opacity = '0';
			nm.style.filter = 'blur(3px)';
		}, 2350);
		veil.style.opacity = '0';
		setTimeout(() => veil.remove(), 3600);
	});
}
