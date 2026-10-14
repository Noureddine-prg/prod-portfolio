// Card expand/close — DC fireRing L3349, burnSibs L3359, burnEmbers L3402, expand/shut L3437-3562.
// A board-sized clone reveals via clip-path; the panel mounts into [data-expand] and its canvases
// build at settle. ✕/Esc/Back/outside-click close at any point.

import { mount, unmount } from 'svelte';
import { pushState } from '$app/navigation';
import { ui, type CardId } from '$lib/stores/ui.svelte';
import { freeze } from '$lib/stores/freeze.svelte';
import { iconSvg } from '$lib/icons';
import { PANELS } from '$lib/components/expanded/panels';
import { BURN, burnSibs, fireRing, siblings } from './burn';

const EASE_OUT = 'cubic-bezier(0.23,1,0.32,1)';
// Open timeline (ms), after the sibling burn (BURN in burn.ts).
const OPEN = {
	growAt: 1400,
	growDur: 460,
	growEase: 'cubic-bezier(.5,.02,.2,1)',
	revealAt: 1850, // panel content rises as the grow lands
	revealStep: 70,
	// tile scene pops in place, gone as the grow starts; panel ground fades in during the grow
	popFade: 1250 // the tile's own scene (jar / envelope / axe)
} as const;
const CLOSE_MS = 460; // slower than DC (280) so the tile visibly settles back
const FOCUSABLE =
	'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

// Strip a copied tile of everything that made it interactive.
function inert(el: HTMLElement): void {
	el.removeAttribute('role');
	el.removeAttribute('tabindex');
	el.removeAttribute('data-card');
	el.removeAttribute('data-tile');
	el.classList.remove('tile');
	el.setAttribute('aria-hidden', 'true');
}

// The one open (or closing) card across both boards. `finish` runs a close's pending tidy-up
// at once, so a quick re-open never meets a late cleanup.
interface ActiveCard {
	readonly closing: boolean;
	shut(): void;
	finish(): void;
}
let active: ActiveCard | null = null;

/** True while a card is open (not merely finishing its close). */
export function cardOpen(): boolean {
	return !!active && !active.closing;
}

// ── expand ────────────────────────────────────────────────────────────────────
export function expandCard(board: HTMLElement, tile: HTMLElement, card: CardId): void {
	if (active) {
		if (!active.closing) return;
		active.finish();
	}
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

	// ── lifecycle state ──
	const timers: ReturnType<typeof setTimeout>[] = [];
	let shutDone = false; // close has started
	let settled = false; // open choreography landed
	let finished = false; // close tidy-up done; nothing late may run
	const later = (fn: () => void, ms: number) => {
		timers.push(setTimeout(() => !finished && fn(), ms));
	};

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
	if (liveCv && !reduced) {
		const cvLayer = document.createElement('div');
		cvLayer.setAttribute('aria-hidden', 'true');
		cvLayer.style.cssText = face.style.cssText + ';z-index:3;pointer-events:none;background:none;border-color:transparent;box-shadow:none';
		cvHome = { parent: liveCv.parentElement as HTMLElement, next: liveCv.nextSibling, css: liveCv.style.cssText };
		// pin the hover-warmed filter (ExperienceTile's --sea-* vars stay behind on the tile)
		liveCv.style.filter = getComputedStyle(liveCv).filter;
		cvLayer.appendChild(liveCv);
		liveCv.style.pointerEvents = 'none';
		if (card === 'experience') {
			// the sunset cross-fades into the panel's gradient as the grow starts
			liveCv.style.transition = `opacity .4s ease ${OPEN.growAt}ms`;
		} else {
			liveCv.dataset.pop = '1'; // jar cap / envelope / axe chop
			liveCv.style.transition = `opacity .3s ease ${OPEN.popFade}ms`;
		}
		clone.appendChild(cvLayer);
	}

	board.appendChild(clone);
	tile.style.visibility = 'hidden';
	// Freeze every board scene while the card is open — the loop updates only canvases
	// inside the clone (the migrated tile scene, then the panel's).
	freeze.container = clone;

	const sibs = siblings(board, tile, mobile);
	let restorePositions = () => {};

	// ── open ──
	const settle = () => {
		if (settled || shutDone) return;
		settled = true;
		clone.classList.add('is-settled');
		delete clone.dataset.holdBuild;
		// scroll-fade hint, only on panels that actually scroll
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

	// mobile Experience role cards start hidden in their own markup
	const expCards = ex.querySelectorAll<HTMLElement>('[data-exp-card]');
	if (reduced) {
		clone.style.opacity = '0';
		ex.style.opacity = '1';
		face.style.display = 'none';
		expCards.forEach((c) => {
			c.style.transition = 'none';
			c.style.opacity = '1';
			c.style.transform = 'translateY(0)';
		});
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
		if (liveCv) liveCv.style.opacity = '0';
		kids.forEach((k, i) => {
			const d = OPEN.revealAt + i * OPEN.revealStep;
			k.style.transition = `opacity .4s ease ${d}ms, transform .45s ${EASE_OUT} ${d}ms`;
			k.style.opacity = '1';
			k.style.transform = 'translateY(0)';
		});
		expCards.forEach((c) => {
			c.style.opacity = '1';
			c.style.transform = 'translateY(0)';
		});
		restorePositions = burnSibs(board, sibs, later);
		fireRing(clone, later);
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
	// The clone goes at `done`; the tile and sibling fades run on past it, so the card stays
	// `active` (closing) until `finish` clears their inline styles — on time, or at once when a
	// new open arrives first.
	let tornDown = false;
	const teardown = () => {
		if (tornDown) return;
		tornDown = true;
		freeze.container = null; // unfreeze — every canvas updates again
		unmount(panel);
		clone.remove();
		delete board.dataset.open;
		rootEl.style.overflow = prevOverflow;
		tile.focus({ preventScroll: true });
	};
	const canvasHome = () => {
		if (liveCv && cvHome) {
			delete liveCv.dataset.pop;
			liveCv.style.cssText = cvHome.css;
			cvHome.parent.insertBefore(liveCv, cvHome.next);
			cvHome = null;
		}
	};
	const finish = () => {
		if (finished) return;
		finished = true;
		timers.forEach(clearTimeout);
		canvasHome();
		tile.style.visibility = '';
		const reset = (k: HTMLElement) => {
			k.style.transition = '';
			k.style.opacity = '';
		};
		sibs.forEach(reset);
		([...tile.children] as HTMLElement[]).forEach(reset);
		restorePositions();
		teardown();
		if (active === handle) active = null;
	};

	const shut = (fromHistory = false) => {
		if (shutDone) return;
		shutDone = true;
		timers.forEach(clearTimeout);
		timers.length = 0;
		window.removeEventListener('keydown', onKey, true);
		window.removeEventListener('popstate', onPop);
		document.removeEventListener('pointerdown', onOutside, true);
		narrow.removeEventListener('change', onNarrow);
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
				if (finished) return;
				t.style.transition = `opacity .35s ${EASE_OUT} ${reduced ? 0 : 80 + i * 40}ms`;
				t.style.opacity = '1';
			});
		});

		// the tile reappears under the fading clone
		const tileAt = reduced ? 0 : 220;
		const tkids = [...tile.children] as HTMLElement[];
		later(() => {
			canvasHome();
			tkids.forEach((k) => {
				k.style.transition = 'none';
				k.style.opacity = '0';
			});
			tile.style.visibility = '';
			// the tile's own contents (title, list, scene) fade back one after another
			requestAnimationFrame(() => {
				if (finished) return;
				tkids.forEach((k, i) => {
					k.style.transition = `opacity .42s ${EASE_OUT} ${reduced ? 0 : i * 60}ms`;
					k.style.opacity = '1';
				});
			});
		}, tileAt);

		later(teardown, done);
		// past the last sibling / tile-content fade (+ a frame of slack)
		later(
			finish,
			Math.max(460 + sibs.length * 40, tileAt + 480 + tkids.length * 60) + 32
		);
	};

	const handle: ActiveCard = {
		get closing() {
			return shutDone;
		},
		shut: () => shut(),
		finish
	};
	active = handle;

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
		const focused = document.activeElement as HTMLElement | null;
		if (ev.shiftKey && (focused === first || focused === ex || !clone.contains(focused))) {
			ev.preventDefault();
			last.focus();
		} else if (!ev.shiftKey && (focused === last || !clone.contains(focused))) {
			ev.preventDefault();
			first.focus();
		}
	};
	const onPop = () => shut(true);
	// a press outside the board's open card (the page margin around the board) closes it
	const onOutside = (ev: PointerEvent) => {
		if (!clone.contains(ev.target as Node)) shut();
	};
	// crossing the desktop/mobile breakpoint swaps boards: close the card on the hidden one
	const narrow = matchMedia('(max-width: 899px)');
	const onNarrow = () => shut();

	close.addEventListener('click', (ev) => {
		ev.stopPropagation();
		shut();
	});
	window.addEventListener('keydown', onKey, true);
	window.addEventListener('popstate', onPop);
	narrow.addEventListener('change', onNarrow);
	// armed after this click finishes dispatching, so the opening click can't close it
	requestAnimationFrame(() => {
		if (!shutDone) document.addEventListener('pointerdown', onOutside, true);
	});
	// Body click closes (not Work, not controls); armed at settle so a double-click can't close.
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
