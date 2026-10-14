// One night sky in desktop-board coordinates (x/y as % of the board box). The board draws
// it behind the tiles (it shows through the middle column and the gutters) and the
// Experience panel draws the same list in the same box, so opening that card grows it
// around stars that stay where they were.

export interface Star {
	x: number;
	y: number;
	size: number;
	color: string;
	dur: number;
	delay: number;
}

const COLORS = ['#dfe6f5', '#aeb8cf', '#f5efe2', '#c9d2e6', '#fff4dd'];

// small seeded LCG — the sky must be identical on every load and in both places
function lcg(seed: number) {
	let s = seed >>> 0;
	return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

export const STARS: Star[] = (() => {
	const r = lcg(0x5ca1ab1e);
	return Array.from({ length: 46 }, () => ({
		x: +(r() * 100).toFixed(2),
		y: +(r() * 100).toFixed(2),
		size: r() < 0.18 ? 2 : r() < 0.55 ? 1.5 : 1,
		color: COLORS[Math.floor(r() * COLORS.length)],
		dur: +(4.4 + r() * 3).toFixed(1),
		delay: +(r() * 4.5).toFixed(1)
	}));
})();
