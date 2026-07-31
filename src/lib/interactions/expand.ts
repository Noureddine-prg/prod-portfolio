// Card expand/close — port of the DC interaction layer, active paths only:
// fireRing L3349, burnSibs L3359, burnEmbers L3402, expand()/shut() L3437–3562.
// (expandEmber L3198 and wireDepth L3264 are dead paths — boards carry data-board only.)
//
// Svelte adaptations, kept minimal:
// • The tile is cloned (DC architecture — grid siblings never reflow, and the original
//   keeps its canvas contexts), but the expanded panel is a Svelte component mount()ed
//   into the clone's [data-expand] div: the DC loop re-queried `canvas[data-three]` from
//   the DOM every frame so cloned canvases just worked, while our loop iterates the
//   registry's mounted Set — a mounted component registers its canvases naturally and
//   keeps every scene canvas singular.
// • dataset.open is mirrored to `ui.openCard`; `.is-clone.is-settled` (the DC freeze
//   selector, L3058) becomes `freeze.container = clone` — the loop consumes the store.

import { mount, unmount, type Component } from 'svelte';
import { ui, type CardId } from '$lib/stores/ui.svelte';
import { freeze } from '$lib/stores/freeze.svelte';
import ExpandedExperience from '$lib/components/expanded/ExpandedExperience.svelte';
import ExpandedAbout from '$lib/components/expanded/ExpandedAbout.svelte';
import ExpandedContact from '$lib/components/expanded/ExpandedContact.svelte';
import ExpandedWork from '$lib/components/expanded/ExpandedWork.svelte';

interface PanelSpec {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	props: (mobile: boolean) => Record<string, unknown>;
	/** Inline style of the [data-expand] container — the DC per-card data-expand styles. */
	style: (mobile: boolean) => string;
}

const EX_BASE =
	'display:none;position:absolute;inset:0;z-index:1;flex-direction:column;box-sizing:border-box;';

// Per-card expanded containers, carrying the DC [data-expand] container styles:
// Experience 11a L127 / 11b L462, About 11a L297 / 11b L609, Contact 11a L236
// (overflow:hidden crops the flame bleed) / 11b L547, Work 11a L361 / 11b L663.
const PANELS: Record<CardId, PanelSpec> = {
	experience: {
		component: ExpandedExperience,
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#101b21;overflow:auto'
				: EX_BASE +
					'background:radial-gradient(120% 160% at 78% 30%,#101322 0%,#0a0c16 45%,#06070d 100%);padding:28px 34px;gap:20px;overflow:hidden'
	},
	about: {
		component: ExpandedAbout,
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#1d1824;padding:20px;gap:20px;overflow:auto'
				: EX_BASE + 'background:#1d1824;padding:26px 30px;gap:0;overflow:auto'
	},
	contact: {
		component: ExpandedContact,
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#1a1616;padding:20px;gap:16px;overflow:auto'
				: EX_BASE +
					'background:#1a1616;padding:28px 32px;justify-content:space-between;overflow:hidden'
	},
	work: {
		component: ExpandedWork,
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#cbbfa8;padding:20px;gap:0;overflow:auto'
				: EX_BASE + 'background:#cbbfa8;padding:26px 30px;gap:0;overflow:auto'
	}
};

// ── fireRing (DC L3349–3357) ──────────────────────────────────────────────────
function fireRing(clone: HTMLElement): void {
	const ring = document.createElement('div');
	ring.style.cssText =
		'position:absolute;inset:-1px;z-index:70;pointer-events:none;border-radius:inherit;padding:1.5px;overflow:hidden;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:opacity .5s';
	const inner = document.createElement('div');
	inner.style.cssText =
		'position:absolute;left:50%;top:50%;width:320%;height:320%;background:conic-gradient(transparent 0 72%,rgba(255,125,46,.25) 80%,rgba(255,125,46,.85) 88%,#ffd28a 91%,rgba(255,190,110,.3) 94%,transparent 97%);animation:firering 1.05s linear infinite';
	ring.appendChild(inner);
	clone.appendChild(ring);
	setTimeout(() => {
		ring.style.opacity = '0';
		setTimeout(() => ring.remove(), 550);
	}, 1350);
}

// ── burnEmbers (DC L3402–3418) ────────────────────────────────────────────────
function burnEmbers(board: HTMLElement, t: HTMLElement): void {
	// ember specks + gray ash flecks rising off a card as it burns
	const br = board.getBoundingClientRect(),
		tr = t.getBoundingClientRect();
	for (let i = 0; i < 11; i++) {
		const ash = i > 6;
		const e = document.createElement('span');
		const sz = ash ? 1.6 + Math.random() * 2 : 1.8 + Math.random() * 2.6;
		const x = tr.left - br.left + Math.random() * tr.width;
		const y = tr.top - br.top + Math.random() * tr.height * 0.7;
		const col = ash
			? Math.random() < 0.5
				? '#6b5f57'
				: '#8a7d74'
			: Math.random() < 0.7
				? '#ff7d2e'
				: '#ffca57';
		const dur = ash ? 1.3 : 0.8;
		e.style.cssText =
			'position:absolute;left:' +
			x +
			'px;top:' +
			y +
			'px;width:' +
			sz +
			'px;height:' +
			sz +
			'px;border-radius:50%;background:' +
			col +
			';z-index:60;pointer-events:none;opacity:' +
			(ash ? '.6' : '.9') +
			';transition:transform ' +
			dur +
			's cubic-bezier(.2,.6,.3,1),opacity ' +
			dur +
			's ease';
		board.appendChild(e);
		requestAnimationFrame(() => {
			e.style.transform =
				'translate(' +
				(Math.random() - 0.5) * (ash ? 40 : 60) +
				'px,' +
				(-(ash ? 70 : 40) - Math.random() * 80) +
				'px)';
			e.style.opacity = '0';
		});
		setTimeout(() => e.remove(), dur * 1000 + 80);
	}
}

// ── burnSibs (DC L3359–3400) ──────────────────────────────────────────────────
function burnSibs(board: HTMLElement, tile: HTMLElement): void {
	// delayed burn so it reads, then cards return once the clone has fully opened
	// includes non-interactive cards — direct children AND cards inside wrapper rows
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
		} else if (!el.querySelector('canvas[data-three]')) {
			sibs.push(el);
		}
	});
	// stagger: cards catch fire radiating outward from the clicked card
	const trc = tile.getBoundingClientRect();
	const tcx = trc.left + trc.width / 2,
		tcy = trc.top + trc.height / 2;
	sibs
		.map((t) => {
			const r = t.getBoundingClientRect();
			return { t, d: Math.hypot(r.left + r.width / 2 - tcx, r.top + r.height / 2 - tcy) };
		})
		.sort((a, b) => a.d - b.d)
		.forEach((o, i) => {
			const dl = 0.25 + i * 0.09;
			o.t.classList.add('burn-sib');
			if (getComputedStyle(o.t).position === 'static') o.t.style.position = 'relative';
			o.t.style.animation = 'cardburn 1.05s ease ' + dl.toFixed(2) + 's forwards';
			// traveling burn front: glowing orange edge sweeps across, leaving char behind
			const fx = document.createElement('div');
			fx.className = 'burn-fx';
			fx.style.cssText =
				'position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden;border-radius:inherit';
			const inner = document.createElement('div');
			inner.style.cssText =
				'position:absolute;top:0;bottom:0;left:0;width:300%;background:linear-gradient(100deg,#0f0b08 0%,#0f0b08 38%,#2e1608 43%,#7a2f0d 46%,#ff7d2e 48%,#ffd28a 49.2%,rgba(255,190,110,.3) 51%,transparent 55%);transform:translateX(-66.7%);animation:burnwipe 1.05s cubic-bezier(.4,.1,.3,1) ' +
				dl.toFixed(2) +
				's forwards';
			fx.appendChild(inner);
			o.t.appendChild(fx);
			setTimeout(() => burnEmbers(board, o.t), dl * 1000 + 250);
		});
	setTimeout(() => {
		sibs.forEach((t) => {
			if (!board.dataset.open) return;
			// stay invisible while the card is open — restored by the close handlers
			t.style.animation = '';
			t.style.opacity = '0';
			t.style.filter = '';
			const f = t.querySelector(':scope > .burn-fx');
			if (f) f.remove();
		});
	}, 2300);
}

// ── expand (DC L3437–3562) ────────────────────────────────────────────────────
export function expandCard(board: HTMLElement, tile: HTMLElement, card: CardId): void {
	if (board.dataset.open) return;
	board.dataset.open = '1';
	ui.openCard = card;
	const cs = getComputedStyle(board);
	const pad = parseFloat(cs.paddingTop) || 16; // DC wireBoards L3425
	const bw = board.clientWidth - pad * 2;
	const bh = Math.max(board.clientHeight, board.scrollHeight) - pad * 2;
	const mobile = board.clientWidth < 500;

	// clone overlays the board so grid siblings never reflow
	const clone = tile.cloneNode(true) as HTMLElement;
	clone.classList.add('is-clone');
	clone.style.cssText = tile.getAttribute('style') || '';
	clone.style.position = 'absolute';
	clone.style.margin = '0';
	clone.style.left = tile.offsetLeft + 'px';
	clone.style.top = tile.offsetTop + 'px';
	clone.style.width = tile.offsetWidth + 'px';
	clone.style.height = tile.offsetHeight + 'px';
	clone.style.gridColumn = 'auto';
	clone.style.gridRow = 'auto';
	clone.style.zIndex = '40';
	clone.style.transition =
		'left .46s cubic-bezier(.5,.02,.2,1) 1.4s,top .46s cubic-bezier(.5,.02,.2,1) 1.4s,width .46s cubic-bezier(.5,.02,.2,1) 1.4s,height .46s cubic-bezier(.5,.02,.2,1) 1.4s,box-shadow .46s ease 1.4s';
	clone.style.boxShadow = '0 30px 70px rgba(0,0,0,.45)';

	// the expanded panel target — the DC [data-expand] div, created here because the
	// panel is a component mount rather than cloned markup (see header comment)
	const spec = PANELS[card];
	const ex = document.createElement('div');
	ex.setAttribute('data-expand', '');
	ex.style.cssText = spec.style(mobile);
	const panel = mount(spec.component, { target: ex, props: spec.props(mobile) });
	clone.appendChild(ex);

	const close = document.createElement('div');
	close.className = 'clone-close';
	close.textContent = '✕';
	// (the DC computes a `dark` flag from the tile background here but never uses it)
	close.style.background = 'rgba(0,0,0,.45)';
	close.style.color = '#fff';
	close.style.opacity = '0';
	close.style.transition = 'opacity .3s ease .15s';
	close.style.zIndex = '9';
	clone.appendChild(close);
	board.appendChild(clone);

	// hide the tile's collapsed face once clicked — icons/3D canvas sit oddly during the
	// burn + growth; canvases (or wrappers with one) are REMOVED from the clone so the
	// originals keep their contexts
	[...clone.children].forEach((kNode) => {
		const k = kNode as HTMLElement;
		if (k === ex || k.classList.contains('clone-close')) return;
		if (k.matches('canvas[data-three]')) {
			k.remove();
			return;
		}
		if (k.querySelector('canvas[data-three]')) {
			k.remove();
			return;
		}
		k.style.transition = 'opacity .25s ease';
		k.style.opacity = '0';
	});

	ex.style.opacity = '0';
	// keep the header row clear of the ✕ in the top-right corner
	const hdr = [...ex.children].find(
		(k) => (k as HTMLElement).style.position !== 'absolute'
	) as HTMLElement | undefined;
	if (hdr && !hdr.querySelector('canvas')) hdr.style.paddingRight = '44px';
	// reveal only after the burn plays and the box has grown — showing it early
	// overflows the small tile (scrollbar)
	const kids = [...ex.children].filter(
		(k) =>
			!(k as HTMLElement).hasAttribute('data-three') &&
			(k as HTMLElement).style.position !== 'absolute'
	) as HTMLElement[];
	kids.forEach((k) => {
		k.style.opacity = '0';
		k.style.transform = 'translateY(-10px)';
	});
	setTimeout(() => {
		if (!board.dataset.open) return;
		ex.style.display = 'flex';
		requestAnimationFrame(() => {
			ex.style.transition = 'opacity .3s ease';
			ex.style.opacity = '1';
			kids.forEach((k, i) => {
				k.style.transition =
					'opacity .4s ease ' + i * 70 + 'ms, transform .45s cubic-bezier(.2,.7,.3,1) ' + i * 70 + 'ms';
				k.style.opacity = '1';
				k.style.transform = 'translateY(0)';
			});
			// company cards carry their own staggered rise
			ex.querySelectorAll('[data-exp-card]').forEach((c) => {
				(c as HTMLElement).style.opacity = '1';
				(c as HTMLElement).style.transform = 'translateY(0)';
			});
		});
	}, 1950);

	// recede siblings — burn up like paper catching from the fire, then return once open
	burnSibs(board, tile);
	fireRing(clone);
	tile.style.visibility = 'hidden';

	requestAnimationFrame(() => {
		clone.style.left = pad + 'px';
		clone.style.top = pad + 'px';
		clone.style.width = bw + 'px';
		clone.style.height = bh + 'px';
	});
	// X only appears once the card has actually expanded. `clone.isConnected` guards a
	// close→reopen race the DC tolerated (its loop queried the DOM, so a settled class
	// on a detached clone was inert — our freeze store would not be).
	setTimeout(() => {
		if (board.dataset.open && clone.isConnected) {
			close.style.opacity = '1';
			clone.classList.add('is-settled');
			freeze.container = clone; // the loop now updates only canvases inside the clone
		}
	}, 1950);

	let shutDone = false; // double-shut guard (✕ then body click) — the panel unmounts once
	const shut = (ev: Event) => {
		ev.stopPropagation();
		if (shutDone) return;
		shutDone = true;
		close.style.transition = 'opacity .08s ease';
		close.style.opacity = '0';
		clone.style.overflow = 'hidden';
		clone.classList.remove('is-settled');
		freeze.container = null; // unfreeze — every canvas updates again
		ex.style.overflow = 'hidden';
		ex.style.transition = 'opacity .18s ease';
		ex.style.opacity = '0';
		setTimeout(() => {
			ex.style.display = 'none';
		}, 180);
		clone.style.left = tile.offsetLeft + 'px';
		clone.style.top = tile.offsetTop + 'px';
		clone.style.width = tile.offsetWidth + 'px';
		clone.style.height = tile.offsetHeight + 'px';
		clone.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
		board.querySelectorAll<HTMLElement>('[data-tile], .burn-sib').forEach((t) => {
			t.style.animation = '';
			t.style.filter = '';
			t.style.transform = '';
			t.classList.remove('burn-sib');
			// fade the burned siblings back in rather than snapping
			t.style.transition = 'none';
			t.style.opacity = '0';
			requestAnimationFrame(() => {
				t.style.transition = 'opacity .55s ease ' + (120 + Math.random() * 260) + 'ms';
				t.style.opacity = '1';
				setTimeout(() => {
					t.style.transition = '';
					t.style.opacity = '';
				}, 1050);
			});
		});
		board.querySelectorAll('.burn-fx').forEach((f) => f.remove());
		setTimeout(() => {
			unmount(panel);
			clone.remove();
			// fade the tile's own content back in instead of popping
			const tkids = [...tile.children].filter(
				(k) => !(k as HTMLElement).hasAttribute('data-expand')
			) as HTMLElement[];
			tkids.forEach((k) => {
				k.style.transition = 'none';
				k.style.opacity = '0';
			});
			tile.style.visibility = '';
			requestAnimationFrame(() => {
				tkids.forEach((k, i) => {
					k.style.transition = 'opacity .45s ease ' + i * 90 + 'ms';
					k.style.opacity = '1';
				});
				setTimeout(
					() =>
						tkids.forEach((k) => {
							k.style.transition = '';
							k.style.opacity = '';
						}),
					450 + tkids.length * 90 + 60
				);
			});
			delete board.dataset.open;
			ui.openCard = null;
		}, 470);
	};
	close.addEventListener('click', shut);
	// click-to-exit everywhere except interactive bits (Work keeps its rows; links/copy
	// stay usable). The DC keys Work off [data-proj-row] presence (L3559); the card check
	// keeps Work ✕-only even while its rows are hidden under the proj-detail overlay.
	clone.addEventListener('click', (ev) => {
		if (
			(ev.target as HTMLElement).closest(
				'a,[data-copy-email],[data-proj-row],.proj-detail,.clone-close'
			)
		)
			return;
		if (card === 'work' || clone.querySelector('[data-proj-row]')) return;
		shut(ev);
	});
}
