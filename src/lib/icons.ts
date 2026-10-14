// The site's one icon set — 24-unit stroke paths drawn in currentColor, so an icon takes the
// color of the text it sits in. Icon.svelte renders them in components; iconSvg() builds the
// same markup for imperative DOM (the clone's close button in expand.ts).

export const ICONS = {
	'arrow-right': 'M5 12h14M13 6l6 6-6 6',
	'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
	'arrow-up-right': 'M7 17 17 7M8 7h9v9',
	close: 'M6 6l12 12M18 6 6 18'
} as const;

export type IconName = keyof typeof ICONS;

const NS = 'http://www.w3.org/2000/svg';

export function iconSvg(name: IconName, size = '1em', stroke = 2): SVGSVGElement {
	const svg = document.createElementNS(NS, 'svg');
	for (const [k, v] of Object.entries({
		width: size,
		height: size,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		'stroke-width': String(stroke),
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'aria-hidden': 'true',
		focusable: 'false'
	}))
		svg.setAttribute(k, v);
	const path = document.createElementNS(NS, 'path');
	path.setAttribute('d', ICONS[name]);
	svg.appendChild(path);
	return svg;
}
