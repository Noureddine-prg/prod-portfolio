// All site copy in one editable module. Content is placeholder-grade per the handoff
// (structure for easy editing); wording is lifted from the DC file except the identity
// fields below, which follow the scaffold brief. Expanded-card bodies (experience
// bullets, work rows) live here now so Stage 3 only wires layout, not text.

export const profile = {
	name: 'Noureddine Sidi Abed',
	title: 'SOFTWARE ENGINEER',
	location: 'New York, NY',
	email: 'noureddinesidiabed6k@gmail.com',
	timezone: 'New York · GMT-5'
} as const;

export const links = {
	resume: 'uploads/NoureddineSidiAbed_Res_.pdf',
	linkedin: 'https://linkedin.com',
	github: 'https://github.com'
} as const;

// ── Hero ──────────────────────────────────────────────────────────────────────
export const hero = {
	// name renders across two lines in the DC
	nameLines: ['Noureddine', 'Sidi Abed'],
	badge: 'Software engineer'
} as const;

// ── Experience ────────────────────────────────────────────────────────────────
export const experience = {
	header: 'Experience',
	period: '2024 — 26',
	companies: [
		{ name: 'Google', short: 'G' },
		{ name: 'Meta', short: 'M' },
		{ name: "NYC Mayor's Office", short: 'NYC' }
	],
	roles: [
		{
			company: 'Google',
			title: 'Software Engineer',
			start: 'Oct 2025',
			end: 'Jun 2026',
			blurb:
				'Architected an agentic image-evaluation pipeline with Gemini — automated scoring across 1,000+ outputs with human-in-the-loop verification, saving 40 min per cycle. Centralized 5 vendor sources into one reporting dashboard, cutting reporting time 70%.',
			tech: ['Python', 'Gemini API', 'agentic workflows']
		},
		{
			company: 'Meta',
			title: 'Data Solutions Lead',
			start: 'Oct 2024',
			end: 'Sep 2025',
			blurb:
				"Led 30+ analysts across two teams validating training data for Llama's coding and agentic capabilities. Shipped React tooling for structured QA across 10,000+ data points; Python failure-trajectory analysis that directly informed training improvements.",
			tech: ['React', 'Python', 'model eval', 'RLHF']
		},
		{
			company: "NYC Mayor's Office",
			title: 'Software Engineer',
			start: 'Jan 2024',
			end: 'Jul 2024',
			blurb:
				'Delivered an org-chart application in C#/ASP.NET and Java across Windows and Android; migrated thousands of employee records with zero data loss. Information Technology Division.',
			tech: ['C#', 'ASP.NET', 'SQL']
		}
	]
} as const;

// ── About ─────────────────────────────────────────────────────────────────────
export const about = {
	header: 'About',
	availability: 'Available · New York, NY'
} as const;

// ── Health (display-only) ─────────────────────────────────────────────────────
export const health = {
	header: 'Health',
	updated: '2h ago',
	ringPct: 84,
	steps: '8,412',
	moveMin: 42,
	bpm: 62,
	weight: '172.4 lb'
} as const;

// ── Contact ───────────────────────────────────────────────────────────────────
export const contact = {
	header: 'Contact',
	teaser: 'say hi →',
	headline: ['Available', 'for work']
} as const;

// ── Wildcard (display-only, desktop) ──────────────────────────────────────────
export const wildcard = {
	header: 'Wildcard',
	body: 'Whatever this week wants — a book, a playlist, a hot take.',
	note: 'rotates · desktop only'
} as const;

// ── Work ──────────────────────────────────────────────────────────────────────
export interface Project {
	id: string;
	number: string;
	name: string;
	desc: string;
	tech: string;
	org: string;
	year: string;
}

export const work = {
	header: 'Work',
	count: '06 builds →',
	projects: [
		{
			id: 'agentic-image-eval',
			number: '01',
			name: 'Agentic Image-Eval Pipeline',
			desc: 'Automated scoring across 1,000+ image outputs per cycle, human-in-the-loop',
			tech: 'Python · Gemini API',
			org: 'Google',
			year: '2026'
		},
		{
			id: 'vendor-reporting',
			number: '02',
			name: 'Vendor Reporting Pipeline',
			desc: 'Five vendor sources into one dashboard — reporting time down 70%',
			tech: 'Python · SQL · PLX',
			org: 'Google',
			year: '2026'
		},
		{
			id: 'delivery-tracking',
			number: '03',
			name: 'Delivery Tracking System',
			desc: 'Automated delivery tracking across three concurrent projects',
			tech: 'Python · Automation',
			org: 'Google',
			year: '2025'
		},
		{
			id: 'qa-tooling',
			number: '04',
			name: 'QA Tooling Suite',
			desc: 'Vendor JSON parsed and formatted for QA across 10,000+ data points',
			tech: 'React · JSON',
			org: 'Meta',
			year: '2025'
		},
		{
			id: 'model-failure-analysis',
			number: '05',
			name: 'Model Failure Analysis',
			desc: 'Failure trajectories and model comparisons that informed Llama training',
			tech: 'Python · Data Viz',
			org: 'Meta',
			year: '2025'
		},
		{
			id: 'org-chart',
			number: '06',
			name: 'Org Chart Application',
			desc: 'Cross-platform org management with zero-loss legacy data migration',
			tech: 'C# · ASP.NET · Java',
			org: "NYC Mayor's Office",
			year: '2024'
		}
	] satisfies Project[]
} as const;
