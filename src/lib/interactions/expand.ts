// Card expand/close — port of the DC interaction layer (fireRing L3349, burnSibs L3359,
// burnEmbers L3402, expand()/shut() L3437–3562). The open keeps the DC's deliberate ~2s
// choreography (siblings burn, fire ring, jar pop / axe chop, then the card grows); the
// difference is that the card's close controls work from the first frame, and close is fast.
//
// Shape of an open card:
// • A clone sits over the whole board (grid siblings never reflow) and is revealed with a
//   clip-path that grows from the tile's rect — the panel is laid out at its final size from
//   the first frame, so nothing reflows while it opens.
// • Inside it, a `face` copy of the tile sits exactly over the tile and fades out while the
//   panel fades in. The tile's live canvas moves into its own layer over the panel so the
//   jar pop / axe chop still play, then fades.
// • The panel is a Svelte component mount()ed into [data-expand] (role=dialog). Its canvases
//   build only once the card has settled (data-hold-build), so shader compiles never stall
//   the open.
// • dataset.open mirrors `ui.openCard`; `freeze.container = clone` from the click (the loop
//   updates only canvases inside the clone).
// • ✕, Escape, Back (shallow history entry), and clicks outside the panel's controls all
//   close immediately, at any point in the open.

import { mount, unmount, type Component } from 'svelte';
import { pushState } from '$app/navigation';
import { ui, type CardId } from '$lib/stores/ui.svelte';
import { freeze } from '$lib/stores/freeze.svelte';
import { iconSvg } from '$lib/icons';
import ExpandedExperience from '$lib/components/expanded/ExpandedExperience.svelte';
import ExpandedAbout from '$lib/components/expanded/ExpandedAbout.svelte';
import ExpandedContact from '$lib/components/expanded/ExpandedContact.svelte';
import ExpandedWork from '$lib/components/expanded/ExpandedWork.svelte';

interface PanelSpec {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	label: string;
	props: (mobile: boolean) => Record<string, unknown>;
	/** Inline style of the [data-expand] container — the DC per-card data-expand styles. */
	style: (mobile: boolean) => string;
}

const EX_BASE =
	'display:flex;position:absolute;inset:0;z-index:2;flex-direction:column;box-sizing:border-box;outline:none;';

// Per-card expanded containers, carrying the DC [data-expand] container styles:
// Experience 11a L127 / 11b L462, About 11a L297 / 11b L609, Contact 11a L236
// (overflow:hidden crops the flame bleed) / 11b L547, Work 11a L361 / 11b L663.
const PANELS: Record<CardId, PanelSpec> = {
	experience: {
		component: ExpandedExperience,
		label: 'Experience',
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#101b21;overflow:auto'
				: EX_BASE +
					'background:radial-gradient(120% 160% at 78% 30%,#101322 0%,#0a0c16 45%,#06070d 100%);padding:28px 34px;gap:20px;overflow:hidden'
	},
	about: {
		component: ExpandedAbout,
		label: 'About',
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:radial-gradient(120% 90% at 50% 115%,rgba(200,112,63,.10),transparent 60%),#18130f;padding:20px;gap:20px;overflow:auto'
				: EX_BASE + 'background:radial-gradient(120% 90% at 50% 115%,rgba(200,112,63,.10),transparent 60%),#18130f;padding:26px 30px;gap:0;overflow:auto'
	},
	contact: {
		component: ExpandedContact,
		label: 'Contact',
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#1a1616;padding:20px;gap:16px;overflow:auto'
				: EX_BASE +
					'background:#1a1616;padding:28px 32px;justify-content:space-between;overflow:hidden'
	},
	work: {
		component: ExpandedWork,
		label: 'Work',
		props: (mobile) => ({ mobile }),
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:radial-gradient(90% 55% at 50% 118%,rgba(255,125,46,.07),transparent 62%),#0b0d15;padding:20px;gap:0;overflow:auto'
				: EX_BASE + 'background:radial-gradient(90% 55% at 50% 118%,rgba(255,125,46,.07),transparent 62%),#0b0d15;padding:26px 30px;gap:0;overflow:auto'
	}
};

const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';
// Open choreography (ms) — the DC timeline: the burn reads first, then the card grows.
const OPEN = {
	burnStart: 250, // first sibling catches
	burnStep: 90, // each further sibling, by distance from the clicked card
	burnDur: 1050,
	ringLap: 1050,
	ringFade: 1350,
	growAt: 1400,
	growDur: 460,
	growEase: 'cubic-bezier(.5,.02,.2,1)',
	revealAt: 1850, // panel content rises as the grow lands
	revealStep: 70,
	// rework: the tile's scene plays its pop in place, then is gone just as the grow gets
	// going (a fixed-size scene box inside a growing card read as stuck), while the panel
	// ground (stars / glass / ember layers) fades in during the grow so the card is never an
	// empty slab (DC faded the ground in only at revealAt)
	popFade: 1250, // the tile's own scene (jar / envelope / axe)
	oceanWarm: 1250, // Experience: the strip brightens toward the porthole's sunset…
	oceanFade: 1800 // …and fades out across the porthole's rise (revealAt), so the two overlap
} as const;
const CLOSE_MS = 460; // rework: slower close so the tile's contents can be seen settling back (DC 280)
const FOCUSABLE =
	'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

// ── fireRing (DC L3349–3357): one lap around the opening card ────────────────
function fireRing(clone: HTMLElement): void {
	const ring = document.createElement('div');
	ring.style.cssText =
		'position:absolute;inset:-1px;z-index:70;pointer-events:none;border-radius:inherit;padding:1.5px;overflow:hidden;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;transition:opacity .5s ease';
	const inner = document.createElement('div');
	inner.style.cssText =
		'position:absolute;left:50%;top:50%;width:320%;height:320%;background:conic-gradient(transparent 0 72%,rgba(255,125,46,.25) 80%,rgba(255,125,46,.85) 88%,#ffd28a 91%,rgba(255,190,110,.3) 94%,transparent 97%);animation:firering ' + OPEN.ringLap + 'ms linear infinite';
	ring.appendChild(inner);
	clone.appendChild(ring);
	setTimeout(() => {
		ring.style.opacity = '0';
		setTimeout(() => ring.remove(), 220);
	}, OPEN.ringFade);
}

// ── burnEmbers (DC L3402–3418) ────────────────────────────────────────────────
function burnEmbers(board: HTMLElement, t: HTMLElement): void {
	// ember specks + gray ash flecks rising off a card as it burns (decorative, never blocks)
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
		setTimeout(() => e.remove(), dur * 1000 + 80);
	}
}

// Everything on the board except the clicked tile — direct tiles, wrapper rows' children,
// and non-scene strips (mobile footer) — ordered by distance from the clicked tile.
function siblings(board: HTMLElement, tile: HTMLElement): HTMLElement[] {
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
function burnSibs(board: HTMLElement, sibs: HTMLElement[]): void {
	sibs.forEach((t, i) => {
		const dl = (OPEN.burnStart + i * OPEN.burnStep) / 1000;
		t.classList.add('burn-sib');
		if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
		t.style.animation = `cardburn ${OPEN.burnDur}ms ease ${dl.toFixed(2)}s forwards`;
		// traveling burn front: glowing orange edge sweeps across, leaving char behind
		const fx = document.createElement('div');
		fx.className = 'burn-fx';
		fx.style.cssText =
			'position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden;border-radius:inherit';
		const inner = document.createElement('div');
		inner.style.cssText =
			'position:absolute;top:0;bottom:0;left:0;width:300%;background:linear-gradient(100deg,#0f0b08 0%,#0f0b08 38%,#2e1608 43%,#7a2f0d 46%,#ff7d2e 48%,#ffd28a 49.2%,rgba(255,190,110,.3) 51%,transparent 55%);transform:translateX(-66.7%);animation:burnwipe ' + OPEN.burnDur + 'ms cubic-bezier(.4,.1,.3,1) ' +
			dl.toFixed(2) +
			's forwards';
		fx.appendChild(inner);
		t.appendChild(fx);
		setTimeout(() => burnEmbers(board, t), dl * 1000 + 250);
	});
}

// Strip a copied tile of everything that made it interactive.
function inert(el: HTMLElement): void {
	el.removeAttribute('role');
	el.removeAttribute('tabindex');
	el.removeAttribute('data-card');
	el.removeAttribute('data-tile');
	el.classList.remove('tile');
	el.setAttribute('aria-hidden', 'true');
}

// ── expand ────────────────────────────────────────────────────────────────────
export function expandCard(board: HTMLElement, tile: HTMLElement, card: CardId): void {
	if (board.dataset.open) return;
	board.dataset.open = '1';
	ui.openCard = card;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const cs = getComputedStyle(board);
	const pad = parseFloat(cs.paddingTop) || 16; // DC wireBoards L3425
	const bw = board.clientWidth - pad * 2;
	const bh = Math.max(board.clientHeight, board.scrollHeight) - pad * 2;
	// The card covers the part of the board that is on screen: on short screens the mobile
	// column is taller than the viewport and the page scrolls (board coords = screen / scale).
	const scale = board.getBoundingClientRect().width / board.offsetWidth || 1;
	const visTop = Math.max(0, -board.getBoundingClientRect().top / scale);
	const ch = Math.min(bh, innerHeight / scale - pad * 2);
	const ct = Math.min(pad + bh - ch, Math.max(pad, visTop + pad));
	const rootEl = document.documentElement;
	const prevOverflow = rootEl.style.overflow;
	rootEl.style.overflow = 'hidden'; // no page scroll behind an open card
	const mobile = board.clientWidth < 500;
	const tileStyle = tile.getAttribute('style') || '';
	const radius = getComputedStyle(tile).borderTopLeftRadius || '9px';
	const tl = tile.offsetLeft,
		tt = tile.offsetTop,
		tw = tile.offsetWidth,
		th = tile.offsetHeight;
	// clip-path inset that shows only the tile's rect of the board-sized clone
	const tileClip = `inset(${tt - ct}px ${pad + bw - (tl + tw)}px ${ct + ch - (tt + th)}px ${tl - pad}px round ${radius})`;
	const fullClip = `inset(0px 0px 0px 0px round ${radius})`;

	// clone: board-sized from the first frame, carrying the tile's surface
	const clone = document.createElement('div');
	clone.className = 'is-clone';
	clone.style.cssText = tileStyle;
	Object.assign(clone.style, {
		position: 'absolute',
		margin: '0',
		left: pad + 'px',
		top: ct + 'px',
		width: bw + 'px',
		height: ch + 'px',
		gridColumn: 'auto',
		gridRow: 'auto',
		flex: 'none',
		zIndex: '40',
		overflow: 'hidden',
		padding: '0'
	});
	clone.dataset.holdBuild = '1'; // the loop defers panel canvas builds until settle

	// face: the tile's collapsed content, sitting exactly over the (now hidden) tile
	const face = tile.cloneNode(true) as HTMLElement;
	inert(face);
	face.querySelectorAll('canvas[data-three]').forEach((c) => c.remove());
	face.style.cssText = tileStyle;
	Object.assign(face.style, {
		position: 'absolute',
		margin: '0',
		left: tl - pad + 'px',
		top: tt - ct + 'px',
		width: tw + 'px',
		height: th + 'px',
		gridColumn: 'auto',
		gridRow: 'auto',
		flex: 'none',
		zIndex: '1'
	});
	clone.appendChild(face);

	// the expanded panel — a dialog
	const spec = PANELS[card];
	const ex = document.createElement('div');
	ex.setAttribute('data-expand', '');
	ex.setAttribute('role', 'dialog');
	ex.setAttribute('aria-modal', 'true');
	ex.setAttribute('aria-label', spec.label);
	ex.tabIndex = -1;
	ex.style.cssText = spec.style(mobile);
	ex.style.opacity = '0';
	const panel = mount(spec.component, { target: ex, props: spec.props(mobile) });
	clone.appendChild(ex);

	const close = document.createElement('button');
	close.type = 'button';
	close.className = 'clone-close';
	close.setAttribute('aria-label', `Close ${spec.label}`);
	close.appendChild(iconSvg('close', '15px'));
	Object.assign(close.style, {
		background: 'rgba(0,0,0,.45)',
		color: '#fff',
		border: '0',
		padding: '0',
		cursor: 'pointer',
		zIndex: '9',
		opacity: '0',
		transition: `opacity .15s ${EASE_OUT}`
	});
	clone.appendChild(close);

	// keep the header row clear of the ✕ in the top-right corner
	const hdr = [...ex.children].find((k) => (k as HTMLElement).style.position !== 'absolute') as
		| HTMLElement
		| undefined;
	if (hdr && !hdr.querySelector('canvas')) hdr.style.paddingRight = '44px';
	// panel content rises in, staggered (absolute overlays like .proj-detail are excluded)
	const kids = [...ex.children].filter(
		(k) =>
			!(k as HTMLElement).hasAttribute('data-three') &&
			(k as HTMLElement).style.position !== 'absolute'
	) as HTMLElement[];
	if (!reduced)
		kids.forEach((k) => {
			k.style.opacity = '0';
			k.style.transform = 'translateY(8px)';
		});

	// the tile's live scene rides above the panel so the jar pop / axe chop still play
	const liveCv = tile.querySelector<HTMLCanvasElement>('canvas[data-three]');
	let cvHome: { parent: HTMLElement; next: Node | null; css: string } | null = null;
	const cvLayer = document.createElement('div');
	cvLayer.setAttribute('aria-hidden', 'true');
	cvLayer.style.cssText = face.style.cssText + ';z-index:3;pointer-events:none;background:none;border-color:transparent;box-shadow:none';
	if (liveCv && !reduced) {
		cvHome = { parent: liveCv.parentElement as HTMLElement, next: liveCv.nextSibling, css: liveCv.style.cssText };
		// pin the hover-warmed filter (ExperienceTile's --sea-* vars stay behind on the tile)
		liveCv.style.filter = getComputedStyle(liveCv).filter;
		cvLayer.appendChild(liveCv);
		liveCv.style.pointerEvents = 'none';
		if (card === 'experience') {
			// hand-off: the dusk strip warms toward the porthole's sunset while the card grows,
			// then fades as the porthole rises in at reveal (the two overlap, so no gap)
			liveCv.style.transition = `filter ${OPEN.growDur}ms ${OPEN.growEase} ${OPEN.oceanWarm}ms, opacity .5s ease ${OPEN.oceanFade}ms`;
		} else {
			liveCv.dataset.pop = '1'; // jar cap / envelope / axe chop
			liveCv.style.transition = `opacity .3s ease ${OPEN.popFade}ms`;
		}
		clone.appendChild(cvLayer);
	}

	board.appendChild(clone);
	tile.style.visibility = 'hidden';
	// Freeze every board scene for the whole time the card is open — the loop updates
	// only canvases inside the clone (the migrated tile scene, then the panel's).
	freeze.container = clone;

	const sibs = siblings(board, tile);
	const timers: ReturnType<typeof setTimeout>[] = [];
	const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

	let shutDone = false;

	// ── open ──
	let settled = false;
	const settle = () => {
		if (settled || shutDone) return;
		settled = true;
		clone.classList.add('is-settled');
		delete clone.dataset.holdBuild;
		// hint that a scrolling panel has more below; cleared once scrolled to the end
		// (only for panels that actually scroll: the fade masks to transparent, so on an
		// overflow:hidden panel it just let the hero behind the clone show through the bottom)
		const scrolls = /(auto|scroll)/.test(getComputedStyle(ex).overflowY);
		const more = () =>
			ex.classList.toggle(
				'has-more',
				scrolls && ex.scrollTop + ex.clientHeight < ex.scrollHeight - 4
			);
		ex.addEventListener('scroll', more, { passive: true });
		more();
		sibs.forEach((t) => {
			t.style.animation = '';
			t.style.opacity = '0';
			t.style.filter = '';
			t.querySelector(':scope > .burn-fx')?.remove();
		});
	};

	if (reduced) {
		clone.style.opacity = '0';
		ex.style.opacity = '1';
		face.style.display = 'none';
		void clone.offsetWidth;
		clone.style.transition = 'opacity .15s ease';
		clone.style.opacity = '1';
		close.style.opacity = '1';
		sibs.forEach((t) => {
			t.style.transition = 'opacity .15s ease';
			t.style.opacity = '0';
		});
		later(settle, 160);
	} else {
		clone.style.clipPath = tileClip;
		void clone.offsetWidth; // the start clip must land before the transition is armed
		clone.style.transition = `clip-path ${OPEN.growDur}ms ${OPEN.growEase} ${OPEN.growAt}ms`;
		clone.style.clipPath = fullClip;
		close.style.opacity = '1';
		face.style.transition = 'opacity .25s ease'; // the label/text; the tile's scene stays
		face.style.opacity = '0';
		ex.style.transition = `opacity .4s ease ${OPEN.growAt}ms`;
		ex.style.opacity = '1';
		if (liveCv) {
			liveCv.style.opacity = '0';
			if (card === 'experience') liveCv.style.filter = 'brightness(1.05) saturate(1.2)';
		}
		kids.forEach((k, i) => {
			const d = OPEN.revealAt + i * OPEN.revealStep;
			k.style.transition = `opacity .4s ease ${d}ms, transform .45s ${EASE_OUT} ${d}ms`;
			k.style.opacity = '1';
			k.style.transform = 'translateY(0)';
		});
		ex.querySelectorAll<HTMLElement>('[data-exp-card]').forEach((c) => {
			c.style.opacity = '1';
			c.style.transform = 'translateY(0)';
		});
		if (liveCv && card === 'experience')
			// once the card grows past the tile, the strip's hard side edges would read as a box
			// floating mid-panel — feather all four sides into a glow
			later(() => {
				const m =
					'linear-gradient(180deg,transparent,#000 55%,#000 75%,transparent),linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)';
				liveCv.style.setProperty('-webkit-mask-image', m);
				liveCv.style.setProperty('-webkit-mask-composite', 'source-in');
				liveCv.style.maskImage = m;
				liveCv.style.maskComposite = 'intersect';
			}, OPEN.growAt);
		burnSibs(board, sibs);
		fireRing(clone);
		clone.addEventListener('transitionend', (ev) => {
			if (ev.target === clone && ev.propertyName === 'clip-path') settle();
		});
		// transitionend can be skipped (hidden tab, starved frames)
		later(settle, OPEN.growAt + OPEN.growDur + 120);
	}

	// Focus moves into the dialog; Tab stays inside it while open.
	ex.focus({ preventScroll: true });

	// Back closes the card: a shallow history entry for the open state.
	let pushed = false;
	try {
		pushState('', { card });
		pushed = true;
	} catch {
		/* router not ready — the other close paths still work */
	}

	// ── close ──
	const shut = (fromHistory = false) => {
		if (shutDone) return;
		shutDone = true;
		timers.forEach(clearTimeout);
		window.removeEventListener('keydown', onKey, true);
		window.removeEventListener('popstate', onPop);
		document.removeEventListener('pointerdown', onOutside, true);
		if (pushed && !fromHistory) history.back();
		// state flips at the close interaction — the browser samples bar tints at interaction
		// time, so a late flip leaves the strips stuck on the open-state black
		ui.openCard = null;
		clone.classList.remove('is-settled');
		close.style.transition = 'none';
		close.style.opacity = '0';
		ex.style.pointerEvents = 'none';
		board.querySelectorAll('.burn-fx').forEach((f) => f.remove());

		const done = reduced ? 160 : CLOSE_MS + 40;
		if (reduced) {
			clone.style.transition = 'opacity .15s ease';
			clone.style.opacity = '0';
		} else {
			ex.style.transition = `opacity .18s ${EASE_OUT}`;
			ex.style.opacity = '0';
			if (liveCv) liveCv.style.transition = 'none';
			const shrinkFrom = getComputedStyle(clone).clipPath; // retarget from wherever it is
			clone.style.transition = 'none';
			clone.style.clipPath = shrinkFrom === 'none' ? fullClip : shrinkFrom;
			void clone.offsetWidth;
			clone.style.transition = `clip-path ${CLOSE_MS}ms ${EASE_OUT}, opacity .16s ease ${CLOSE_MS - 140}ms`;
			clone.style.clipPath = tileClip;
			clone.style.opacity = '0';
		}

		// siblings return in the order they burned
		sibs.forEach((t, i) => {
			t.style.animation = '';
			t.style.filter = '';
			t.classList.remove('burn-sib');
			t.style.transition = 'none';
			t.style.opacity = getComputedStyle(t).opacity;
			requestAnimationFrame(() => {
				t.style.transition = `opacity .35s ${EASE_OUT} ${reduced ? 0 : 80 + i * 40}ms`;
				t.style.opacity = '1';
				setTimeout(() => {
					t.style.transition = '';
					t.style.opacity = '';
				}, 460 + i * 40);
			});
		});

		// the tile reappears under the fading clone
		setTimeout(() => {
			if (liveCv && cvHome) {
				delete liveCv.dataset.pop;
				liveCv.style.cssText = cvHome.css;
				cvHome.parent.insertBefore(liveCv, cvHome.next);
			}
			const tkids = [...tile.children] as HTMLElement[];
			tkids.forEach((k) => {
				k.style.transition = 'none';
				k.style.opacity = '0';
			});
			tile.style.visibility = '';
			// the tile's own contents (title, list, scene) fade back one after another
			requestAnimationFrame(() => {
				tkids.forEach((k, i) => {
					k.style.transition = `opacity .42s ${EASE_OUT} ${reduced ? 0 : i * 60}ms`;
					k.style.opacity = '1';
				});
				setTimeout(
					() => {
						tkids.forEach((k) => {
							k.style.transition = '';
							k.style.opacity = '';
						});
					},
					480 + tkids.length * 60
				);
			});
		}, reduced ? 0 : 220);

		setTimeout(() => {
			freeze.container = null; // unfreeze — every canvas updates again
			unmount(panel);
			clone.remove();
			delete board.dataset.open;
			rootEl.style.overflow = prevOverflow;
			tile.focus({ preventScroll: true });
		}, done);
	};

	const onKey = (ev: KeyboardEvent) => {
		if (ev.key === 'Escape') {
			ev.preventDefault();
			shut();
			return;
		}
		if (ev.key !== 'Tab') return;
		const items = [...clone.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
			(el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]')
		);
		if (!items.length) return;
		const first = items[0],
			last = items[items.length - 1];
		const active = document.activeElement as HTMLElement | null;
		if (ev.shiftKey && (active === first || active === ex || !clone.contains(active))) {
			ev.preventDefault();
			last.focus();
		} else if (!ev.shiftKey && (active === last || !clone.contains(active))) {
			ev.preventDefault();
			first.focus();
		}
	};
	const onPop = () => shut(true);
	// a press outside the board's open card (the page margin around the board) closes it
	const onOutside = (ev: PointerEvent) => {
		if (!clone.contains(ev.target as Node)) shut();
	};

	close.addEventListener('click', (ev) => {
		ev.stopPropagation();
		shut();
	});
	window.addEventListener('keydown', onKey, true);
	window.addEventListener('popstate', onPop);
	// armed after this click finishes dispatching, so the opening click can't close it
	requestAnimationFrame(() => {
		if (!shutDone) document.addEventListener('pointerdown', onOutside, true);
	});
	// click-to-exit on the panel itself, except interactive bits (Work keeps its rows;
	// links/copy stay usable). Work is ✕-only even while its rows sit under the detail overlay.
	// Armed at settle (~1.9s): the second click of a double-click lands on the clone and must
	// not close the card it just opened. ✕, Escape and Back work from the first frame.
	clone.addEventListener('click', (ev) => {
		if (!settled) return;
		if (
			(ev.target as HTMLElement).closest(
				'a,button,[data-copy-email],[data-proj-row],.proj-detail,.clone-close'
			)
		)
			return;
		if (card === 'work' || clone.querySelector('[data-proj-row]')) return;
		shut();
	});
}
