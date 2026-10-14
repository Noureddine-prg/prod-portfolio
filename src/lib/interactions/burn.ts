// Sibling burn + fire ring for the card open — DC fireRing L3349, burnSibs L3359, burnEmbers L3402.
// Every delayed step goes through the open's `later`, so an early close cancels it.

export type Later = (fn: () => void, ms: number) => void;

const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';

// Burn timeline (ms): the burn reads first, then the card grows (see OPEN in expand.ts).
export const BURN = {
	start: 250, // first sibling catches
	step: 90, // each further sibling, by distance from the clicked card
	dur: 1050,
	ringLap: 1050,
	ringFade: 1350
} as const;

// ── fireRing (DC L3349–3357): one lap around the opening card ────────────────
export function fireRing(clone: HTMLElement, later: Later): void {
	const ring = document.createElement('div');
	ring.style.cssText =
		'position:absolute;inset:-1px;z-index:70;pointer-events:none;border-radius:inherit;padding:1.5px;overflow:hidden;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:opacity .5s ease';
	const inner = document.createElement('div');
	inner.style.cssText =
		'position:absolute;left:50%;top:50%;width:320%;height:320%;background:conic-gradient(transparent 0 72%,rgba(255,125,46,.25) 80%,rgba(255,125,46,.85) 88%,#ffd28a 91%,rgba(255,190,110,.3) 94%,transparent 97%);animation:firering ' + BURN.ringLap + 'ms linear infinite';
	ring.appendChild(inner);
	clone.appendChild(ring);
	later(() => {
		ring.style.opacity = '0';
		later(() => ring.remove(), 220);
	}, BURN.ringFade);
}

// ── burnEmbers (DC L3402–3418) ────────────────────────────────────────────────
// ember specks + gray ash flecks rising off a card as it burns (decorative, never blocks)
function burnEmbers(board: HTMLElement, t: HTMLElement): void {
	const br = board.getBoundingClientRect(),
		tr = t.getBoundingClientRect();
	const sc = br.width / board.offsetWidth || 1; // board is transform-scaled; work in its space
	for (let i = 0; i < 11; i++) {
		const ash = i > 6;
		const e = document.createElement('span');
		const sz = ash ? 1.6 + Math.random() * 2 : 1.8 + Math.random() * 2.6;
		const x = (tr.left - br.left) / sc + (Math.random() * tr.width) / sc;
		const y = (tr.top - br.top) / sc + (Math.random() * tr.height * 0.7) / sc;
		const col = ash
			? Math.random() < 0.5
				? '#6b5f57'
				: '#8a7d74'
			: Math.random() < 0.7
				? '#ff7d2e'
				: '#ffca57';
		const dur = ash ? 1.3 : 0.8;
		e.style.cssText =
			`position:absolute;left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;border-radius:50%;background:${col};` +
			`z-index:60;pointer-events:none;opacity:${ash ? '.6' : '.9'};` +
			`transition:transform ${dur}s ${EASE_OUT},opacity ${dur}s ease`;
		board.appendChild(e);
		requestAnimationFrame(() => {
			e.style.transform = `translate(${(Math.random() - 0.5) * (ash ? 40 : 60)}px,${-(ash ? 70 : 40) - Math.random() * 80}px)`;
			e.style.opacity = '0';
		});
		// not via `later`: a spawned speck must always clean itself up
		setTimeout(() => e.remove(), dur * 1000 + 80);
	}
}

// Everything on the board except the clicked tile — direct tiles, wrapper rows' children,
// and non-scene strips (mobile name strip) — ordered by distance from the clicked tile.
// On mobile the hero burns too.
export function siblings(board: HTMLElement, tile: HTMLElement, mobile: boolean): HTMLElement[] {
	const sibs = [...board.querySelectorAll<HTMLElement>('[data-tile]')].filter(
		(t) => t !== tile && !t.classList.contains('is-clone')
	);
	[...board.children].forEach((elNode) => {
		const el = elNode as HTMLElement;
		if (el.tagName !== 'DIV' || el.classList.contains('is-clone') || el.hasAttribute('data-tile'))
			return;
		if (getComputedStyle(el).position === 'absolute') return;
		if (el.querySelector('[data-tile]')) {
			[...el.children].forEach((cNode) => {
				const c = cNode as HTMLElement;
				if (
					c !== tile &&
					c.tagName === 'DIV' &&
					!c.hasAttribute('data-tile') &&
					!c.querySelector('canvas[data-three]')
				)
					sibs.push(c);
			});
		} else if (mobile || !el.querySelector('canvas[data-three]')) {
			sibs.push(el);
		}
	});
	const trc = tile.getBoundingClientRect();
	const tcx = trc.left + trc.width / 2,
		tcy = trc.top + trc.height / 2;
	return sibs
		.map((t) => {
			const r = t.getBoundingClientRect();
			return { t, d: Math.hypot(r.left + r.width / 2 - tcx, r.top + r.height / 2 - tcy) };
		})
		.sort((a, b) => a.d - b.d)
		.map((o) => o.t);
}

// ── burnSibs (DC L3359–3400): cards catch fire radiating out from the clicked one ──
/** Returns a restore for the inline `position` it set on static siblings. */
export function burnSibs(board: HTMLElement, sibs: HTMLElement[], later: Later): () => void {
	const positioned: HTMLElement[] = [];
	sibs.forEach((t, i) => {
		const dl = (BURN.start + i * BURN.step) / 1000;
		t.classList.add('burn-sib');
		if (getComputedStyle(t).position === 'static') {
			t.style.position = 'relative';
			positioned.push(t);
		}
		t.style.animation = `cardburn ${BURN.dur}ms ease ${dl.toFixed(2)}s forwards`;
		// traveling burn front: glowing orange edge sweeps across, leaving char behind
		const fx = document.createElement('div');
		fx.className = 'burn-fx';
		fx.style.cssText =
			'position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden;border-radius:inherit';
		const inner = document.createElement('div');
		inner.style.cssText =
			'position:absolute;top:0;bottom:0;left:0;width:300%;background:linear-gradient(100deg,#0f0b08 0%,#0f0b08 38%,#2e1608 43%,#7a2f0d 46%,#ff7d2e 48%,#ffd28a 49.2%,rgba(255,190,110,.3) 51%,transparent 55%);transform:translateX(-66.7%);animation:burnwipe ' + BURN.dur + 'ms cubic-bezier(.4,.1,.3,1) ' +
			dl.toFixed(2) +
			's forwards';
		fx.appendChild(inner);
		t.appendChild(fx);
		later(() => burnEmbers(board, t), dl * 1000 + 250);
	});
	return () => positioned.forEach((t) => (t.style.position = ''));
}
