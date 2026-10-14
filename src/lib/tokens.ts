// Design tokens extracted from the DC source of truth (boards 11a/11b) — a reference table
// exercised by the token unit tests. Components carry their DC-ported values inline; app.css
// keeps only the base-rule tokens (--c-text-cream, --f-body).

export const color = {
	// surfaces
	board: '#121010',
	boardBorder: '#262020',
	tile: '#1a1616',
	tileBorder: '#2a2424',
	sceneBg: '#0a0c12', // hero + experience scene backing

	// per-tile tints (README §Colors)
	aboutBg: '#1d1824',
	aboutBorder: '#2f2939',
	contactBg: '#1c1512',
	contactBorder: '#322619',

	// experience sea-glass overlay
	glassSea: 'rgba(22,38,46,.34)',

	// work / parchment
	cream: '#cbbfa8',
	creamText: '#241d18',
	creamMuted: '#5e544a',
	creamFaint: '#8a7d6e',
	creamAccent: '#2a0d06',

	// text
	textCream: '#efe9e6',
	textCream2: '#f2ede2',
	textBody: '#94867f',
	textAboutBody: '#b3a8c2',
	textAboutBody2: '#cfc4de',
	monoMuted: '#958479', // typography pass: was #6e6058 (under 4.5:1 as text)

	// fire accents
	ember: '#ff8c3a',
	amber: '#e2954f',
	warmLight: '#ffb066',
	glow: '#ffd28a',
	terracotta: '#c85a44', // fills, dots, bars
	terracottaText: '#d86a52', // terracotta as small text
	terracotta2: '#d4654c',

	// ash
	ash1: '#6b5f57',
	ash2: '#5d534c',

	// misc
	flapBand: '#8f352c'
} as const;

export const radius = {
	boardDesktop: 24,
	boardMobile: 28,
	tile: 9,
	hero: 11,
	scene: 14,
	chip: 7,
	button: 10
} as const;

export const space = {
	boardPadDesktop: 16,
	boardPadMobile: 12,
	tilePad: 16,
	tilePadMobile: 14,
	gapDesktop: 14,
	gapMobile: 10
} as const;

export const board = {
	desktopW: 900,
	desktopH: 620,
	mobileW: 390,
	gridCols: '1.72fr 1fr 1fr',
	gridRows: 'repeat(4,minmax(0,1fr))'
} as const;

// breakpoints (px) — README §Radii & spacing
export const breakpoint = {
	mobile: 390,
	desktop: 900
} as const;

export const font = {
	display: "'Archivo Black', sans-serif",
	body: "'Archivo', sans-serif",
	mono: "'JetBrains Mono', monospace",
	serif: "'Cormorant Garamond', serif"
} as const;
