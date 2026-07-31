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
			period: 'Oct 2025 — Jun 2026',
			blurb:
				'Architected an agentic image-evaluation pipeline with Gemini — automated scoring across 1,000+ outputs with human-in-the-loop verification, saving 40 min per cycle. Centralized 5 vendor sources into one reporting dashboard, cutting reporting time 70%.',
			// mobile expanded role-card bullets (DC 11b L491–493)
			bullets: [
				'Agentic image-eval pipeline on Gemini — 1,000+ outputs auto-scored per cycle',
				'Vendor reporting time cut 70% across five sources',
				'Delivery tracking automated across three concurrent projects — 40 min saved per cycle'
			],
			tech: ['Python', 'Gemini API', 'agentic workflows']
		},
		{
			company: 'Meta',
			title: 'Data Solutions Lead',
			start: 'Oct 2024',
			end: 'Sep 2025',
			period: 'Oct 2024 — Sep 2025',
			blurb:
				"Led 30+ analysts across two teams validating training data for Llama's coding and agentic capabilities. Shipped React tooling for structured QA across 10,000+ data points; Python failure-trajectory analysis that directly informed training improvements.",
			bullets: [
				'Led 30+ analysts validating Llama coding & agentic training data',
				'React QA tooling across 10,000+ data points',
				'Failure-trajectory analysis and model comparisons that informed Llama training'
			],
			tech: ['React', 'Python', 'model eval', 'RLHF']
		},
		{
			company: "NYC Mayor's Office",
			title: 'Software Engineer',
			start: 'Jan 2024',
			end: 'Jul 2024',
			period: 'Jan — Jul 2024',
			blurb:
				'Delivered an org-chart application in C#/ASP.NET and Java across Windows and Android; migrated thousands of employee records with zero data loss. Information Technology Division.',
			bullets: [
				'Org-chart platform in C#/ASP.NET + Java',
				'Migrated thousands of legacy records with zero data loss'
			],
			tech: ['C#', 'ASP.NET', 'SQL']
		}
	],
	education: 'B.S. CIS — NYC College of Technology, 2024'
} as const;

// ── About ─────────────────────────────────────────────────────────────────────
export interface SkillGroup {
	label: string;
	text: string; // desktop plain-text form (DC 11a L330–344)
	chips?: readonly string[]; // mobile chip form (DC 11b L630–649) — desktop-only groups omit it
}

export const about = {
	header: 'About',
	availability: 'Available · New York, NY',
	availabilityShort: 'Available · NYC',
	location: 'New York, NY',
	// expanded view copy (DC 11a L322–326 / 11b L622–628)
	intro:
		'Software engineer focused on agentic pipelines, model evaluation, and the data tooling that keeps AI systems honest.',
	body: "Exploring new opportunities while solving everyday problems with code and agents. Previously: agentic evals on Gemini at Google, Llama training data at Meta, platform migration for the NYC Mayor's Office.",
	availabilityLine: 'Available for full-time roles · New York or remote',
	lockup: ['Software', 'Engineer'],
	portrait: { src: '/portrait-placeholder.svg', alt: 'Portrait of Noureddine Sidi Abed' },
	skillGroups: [
		{ label: 'Languages', text: 'Python · SQL · JavaScript · C#', chips: ['Python', 'SQL', 'JavaScript', 'C#'] },
		{
			label: 'AI / Data',
			text: 'Agentic pipelines · model evals · failure analysis · Gemini API',
			chips: ['Agentic pipelines', 'Model evals', 'Failure analysis', 'Gemini API']
		},
		{ label: 'Web', text: 'React · three.js · ASP.NET', chips: ['React', 'three.js', 'ASP.NET'] },
		{ label: 'Practices', text: 'Human-in-the-loop QA · data migration · cross-team tooling' }
	] satisfies readonly SkillGroup[]
} as const;

// ── Health (display-only) ─────────────────────────────────────────────────────
export const health = {
	header: 'Health',
	updated: '2h ago',
	ringPct: 84,
	steps: '8,412',
	moveMin: 42,
	bpm: 62,
	weight: '172.4 lb',
	weightShort: '172 lb'
} as const;

// ── Contact ───────────────────────────────────────────────────────────────────
export const contact = {
	header: 'Contact',
	teaser: 'say hi →',
	headline: ['Available', 'for work'],
	// copy-email row (DC L266–268 / wireExtras L3123–3136); label normalized to
	// 'tap to copy' on both breakpoints
	copyLabel: 'tap to copy',
	copiedLabel: '✦ signal sent',
	writeMe: 'write me →',
	resumeLabel: 'Open resume PDF →',
	socialsMobile: ['GitHub', 'LinkedIn', 'X']
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
	descShort: string; // mobile ledger row wording (DC 11b L668–697)
	tech: string;
	org: string;
	year: string;
	// case-study detail view (DC wireProjects P array L3289–3296: pr/ap/oc; the DC's
	// per-project meta line `m` is derived as `tech · org · year`)
	problem: string;
	approach: string;
	outcome: string;
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
			descShort: '1,000+ image outputs scored per cycle, human-in-the-loop',
			tech: 'Python · Gemini API',
			org: 'Google',
			year: '2026',
			problem: 'Research teams needed image evals at a scale manual annotation could not reach.',
			approach:
				'Agentic pipeline on the Gemini API — plans scoring runs and routes low-confidence outputs to human checkpoints.',
			outcome: '1,000+ outputs scored per cycle; the fully manual workflow was retired.'
		},
		{
			id: 'vendor-reporting',
			number: '02',
			name: 'Vendor Reporting Pipeline',
			desc: 'Five vendor sources into one dashboard — reporting time down 70%',
			descShort: 'Five vendor sources, one dashboard — reporting down 70%',
			tech: 'Python · SQL · PLX',
			org: 'Google',
			year: '2026',
			problem: 'Reporting lived across 10+ tracking surfaces, each reviewed by hand.',
			approach:
				'One ingestion pipeline normalizing five vendor sources; PLX dashboards for 20+ stakeholders.',
			outcome: 'Reporting time down 70%; manual review eliminated.'
		},
		{
			id: 'delivery-tracking',
			number: '03',
			name: 'Delivery Tracking System',
			desc: 'Automated delivery tracking across three concurrent projects',
			descShort: 'Automated tracking across three concurrent projects',
			tech: 'Python · Automation',
			org: 'Google',
			year: '2025',
			problem: 'Delivery tracking took 2–3 hours per cycle across three concurrent projects.',
			approach: 'A single automated tracker spanning all three projects, updating continuously.',
			outcome: 'Hours per cycle reduced to minutes.'
		},
		{
			id: 'qa-tooling',
			number: '04',
			name: 'QA Tooling Suite',
			desc: 'Vendor JSON parsed and formatted for QA across 10,000+ data points',
			descShort: 'Vendor JSON parsed for QA across 10,000+ data points',
			tech: 'React · JSON',
			org: 'Meta',
			year: '2025',
			problem: 'Analysts reviewed 10,000+ raw vendor JSON data points by hand.',
			approach: 'React tooling that parses and formats vendor data into reviewable structures.',
			outcome: 'Direct improvement in analyst review speed.'
		},
		{
			id: 'model-failure-analysis',
			number: '05',
			name: 'Model Failure Analysis',
			desc: 'Failure trajectories and model comparisons that informed Llama training',
			descShort: 'Failure trajectories that informed Llama training',
			tech: 'Python · Data Viz',
			org: 'Meta',
			year: '2025',
			problem: 'Failure modes in Llama training data were anecdotal, not concrete.',
			approach: 'Python analyses of failure trajectories plus systematic model comparisons.',
			outcome: 'Concrete failure modes that directly informed Llama training improvements.'
		},
		{
			id: 'org-chart',
			number: '06',
			name: 'Org Chart Application',
			desc: 'Cross-platform org management with zero-loss legacy data migration',
			descShort: 'Cross-platform org management, zero-loss migration',
			tech: 'C# · ASP.NET · Java',
			org: "NYC Mayor's Office",
			year: '2024',
			problem: 'Legacy organizational data with no modern interface, on two platforms.',
			approach: 'C#/ASP.NET + Java app for Windows and Android; migrated and validated every record.',
			outcome: 'Zero data loss across thousands of employee records.'
		}
	] satisfies Project[]
} as const;
