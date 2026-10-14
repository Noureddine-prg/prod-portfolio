// Intro "ignition": an ember line draws, the name rises out of it, the title drops below, then
// the veil splits along the line. WAAPI transform/opacity only, so it stays smooth while scenes
// build behind it; the split waits (capped) for the hero scene. Any click/key skips; once per session.

import { ui } from '$lib/stores/ui.svelte';
import { getEntry } from '$lib/three/registry';

const SESSION_KEY = 'cozy:intro';
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
const HOLD_MIN = 1250; // ms after start before the split may begin
const HOLD_MAX = 2600; // never wait longer than this for the hero scene
const FONT_WAIT = 350;

const teardowns = new Set<() => void>();
let cancels = 0; // bumped by teardownIntro, so a run still awaiting fonts never adds its veil

/** Cancel any in-flight intro and drop its veil. Idempotent. */
export function teardownIntro(): void {
	cancels++;
	teardowns.forEach((fn) => fn());
	teardowns.clear();
}

function seenThisSession(): boolean {
	try {
		return sessionStorage.getItem(SESSION_KEY) === '1';
	} catch {
		return false;
	}
}

function markSeen(): void {
	try {
		sessionStorage.setItem(SESSION_KEY, '1');
	} catch {
		/* storage blocked — the in-memory gate still holds for this load */
	}
}

export async function maybeRunIntro(): Promise<void> {
	if (ui.introPlayed) return;
	ui.introPlayed = true;
	if (seenThisSession()) return;
	markSeen();
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const run = cancels;
	// brief chance for Archivo Black so the name doesn't swap mid-reveal; never hold on it
	try {
		await Promise.race([
			document.fonts.load('400 64px "Archivo Black"'),
			new Promise((r) => setTimeout(r, FONT_WAIT))
		]);
	} catch {
		/* no FontFaceSet — fall through with the fallback face */
	}
	if (run !== cancels) return; // page unmounted during the font wait
	const board = [...document.querySelectorAll<HTMLElement>('[data-board]')].find(
		(b) => b.getBoundingClientRect().width > 0
	);
	if (board) runIntro(board, reduced);
}

function el(tag: string, css: string, text?: string): HTMLElement {
	const e = document.createElement(tag);
	e.style.cssText = css;
	if (text) e.textContent = text;
	return e;
}

function heroReady(board: HTMLElement): boolean {
	const cv = board.querySelector<HTMLCanvasElement>('canvas[data-scene="campfire"]');
	return !cv || !!getEntry(cv);
}

function runIntro(board: HTMLElement, reduced: boolean): void {
	const half =
		'position:absolute;left:0;right:0;height:50%;overflow:hidden;background:var(--c-field);will-change:transform';
	const veil = el(
		'div',
		'position:fixed;top:0;left:0;width:100vw;height:100lvh;z-index:90;cursor:default'
	);
	veil.dataset.introVeil = '1';
	veil.setAttribute('aria-hidden', 'true');

	// Each half carries its text, so the split pulls the name and title apart with it.
	const top = el(
		'div',
		half +
			';top:0;display:flex;align-items:flex-end;justify-content:center;background-image:linear-gradient(to top,rgba(255,128,48,.07),transparent 38%)'
	);
	const bottom = el(
		'div',
		half +
			';top:50%;display:flex;align-items:flex-start;justify-content:center;background-image:linear-gradient(to bottom,rgba(255,128,48,.07),transparent 38%)'
	);
	const nameClip = el('div', 'overflow:hidden;padding:0 4vw 0.14em');
	const name = el(
		'div',
		"font:400 clamp(24px,5.4vw,78px)/1 'Archivo Black',sans-serif;letter-spacing:.01em;color:#f2ede2;text-transform:uppercase;text-align:center;max-width:92vw;text-wrap:balance;text-shadow:0 0 28px rgba(255,150,70,.35)",
		'Noureddine Sidi Abed'
	);
	const titleClip = el('div', 'overflow:hidden;padding:0.9em 4vw 0');
	const title = el(
		'div',
		"font:500 clamp(10px,1.05vw,15px)/1 'JetBrains Mono',monospace;letter-spacing:.34em;color:#e9a066;text-transform:uppercase;white-space:nowrap;padding-left:.34em",
		'Software Developer'
	);
	nameClip.appendChild(name);
	titleClip.appendChild(title);
	top.appendChild(nameClip);
	bottom.appendChild(titleClip);

	// ember line: bright core + soft glow, scaled out from the centre together
	const line = el(
		'div',
		'position:absolute;left:50%;top:50%;width:min(620px,74vw);height:24px;margin:-12px 0 0 calc(min(620px,74vw) / -2);pointer-events:none;will-change:transform,opacity'
	);
	line.append(
		el(
			'div',
			'position:absolute;inset:0;background:radial-gradient(50% 50% at 50% 50%,rgba(255,140,58,.38),transparent 70%)'
		),
		el(
			'div',
			'position:absolute;left:0;right:0;top:11px;height:2px;border-radius:1px;background:linear-gradient(90deg,transparent,#ff7d2e 18%,#ffd28a 50%,#ff7d2e 82%,transparent)'
		)
	);

	veil.append(top, bottom, line);
	document.body.appendChild(veil);

	const anims: Animation[] = [];
	const play = (target: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
		const a = target.animate(frames, { fill: 'both', ...opts });
		anims.push(a);
		return a;
	};

	let done = false;
	let exiting = false;
	const t0 = performance.now();
	let poll = 0;

	const remove = () => {
		if (done) return;
		done = true;
		clearTimeout(poll);
		window.removeEventListener('pointerdown', skip, true);
		window.removeEventListener('keydown', skip, true);
		anims.forEach((a) => a.cancel());
		veil.remove();
		teardowns.delete(remove);
	};
	teardowns.add(remove);

	const exit = (fast: boolean) => {
		if (exiting || done) return;
		exiting = true;
		clearTimeout(poll);
		veil.style.pointerEvents = 'none'; // the board is usable the moment the split starts
		// `finished` never settles without frames (background tab), so a timer guarantees removal
		const dur = reduced ? 300 : fast ? 420 : 680;
		window.setTimeout(remove, dur + 200);
		if (reduced) {
			play(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease' }).finished.then(
				remove,
				remove
			);
			return;
		}
		play(line, [{ opacity: 1 }, { opacity: 0, transform: 'scaleX(1.15)' }], {
			duration: 200,
			easing: EASE_OUT
		});
		play(top, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], {
			duration: dur,
			easing: EASE_IN_OUT
		});
		play(bottom, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], {
			duration: dur,
			easing: EASE_IN_OUT
		}).finished.then(remove, remove);
	};

	function skip() {
		exit(true);
	}
	window.addEventListener('pointerdown', skip, true);
	window.addEventListener('keydown', skip, true);

	if (reduced) {
		// no movement: the name and title are simply there, then the veil fades
		poll = window.setTimeout(() => exit(false), 900);
		return;
	}

	play(line, [{ transform: 'scaleX(0.001)' }, { transform: 'scaleX(1)' }], {
		duration: 520,
		easing: EASE_OUT
	});
	play(name, [{ transform: 'translateY(108%)' }, { transform: 'translateY(0)' }], {
		duration: 640,
		delay: 200,
		easing: EASE_OUT
	});
	play(title, [{ transform: 'translateY(-130%)' }, { transform: 'translateY(0)' }], {
		duration: 560,
		delay: 340,
		easing: EASE_OUT
	});

	// split once the hold has elapsed and the hero scene is built (or the cap is reached)
	const check = () => {
		const elapsed = performance.now() - t0;
		if (elapsed >= HOLD_MAX || (elapsed >= HOLD_MIN && heroReady(board))) exit(false);
		else poll = window.setTimeout(check, 80);
	};
	poll = window.setTimeout(check, HOLD_MIN);
}
