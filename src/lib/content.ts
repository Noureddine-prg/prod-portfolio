// All site copy. Wording from the DC file; identity fields per the brief.

export const profile = {
	name: 'Noureddine Sidi Abed',
	location: 'New York, NY',
	email: 'nour.sidiabed@gmail.com',
	timezone: 'New York · ET'
} as const;

export const links = {
	resume: '/resume.pdf',
	linkedin: 'https://www.linkedin.com/in/noureddine-sidi/',
	github: 'https://github.com/Noureddine-prg'
} as const;

// ── Hero ──────────────────────────────────────────────────────────────────────
export const hero = {
	// name renders across two lines in the DC
	nameLines: ['Noureddine', 'Sidi Abed'],
	badge: 'Software developer'
} as const;

// ── Experience ────────────────────────────────────────────────────────────────
export const experience = {
	header: 'Experience',
	roles: [
		{
			company: 'Google',
			title: 'Software Engineer',
			start: 'Oct 2025',
			end: 'Jun 2026',
			period: 'Oct 2025 — Jun 2026',
			// mobile expanded role-card bullets (DC 11b L491–493)
			bullets: [
				'Owned eval tooling from ambiguous problem statements to production workflows',
				'Agentic evaluation pipeline on Gemini — 1,000+ image outputs scored per cycle',
				'5 vendor sources, one reporting pipeline — reporting time down 70%',
				'PLX/SQL dashboards for 20+ stakeholders, iterated directly with end users'
			],
			tech: ['Python', 'Gemini API', 'SQL', 'agentic workflows']
		},
		{
			company: 'Meta',
			title: 'Data Solutions Lead',
			start: 'Sep 2024',
			end: 'Sep 2025',
			period: 'Sep 2024 — Sep 2025',
			bullets: [
				'Technical bridge across engineering, research, and vendor teams — 30+ analysts led',
				'React QA tooling across 10,000+ data points',
				'Failure-trajectory analysis and model comparisons that informed Llama training',
				'Defined evaluation rubrics with researchers, adopted across annotation teams'
			],
			tech: ['React', 'Python', 'model eval', 'RLHF']
		},
		{
			company: "NYC Mayor's Office",
			title: 'Software Engineer',
			start: 'Jan 2024',
			end: 'Jul 2024',
			period: 'Jan — Jul 2024',
			bullets: [
				'Embedded as technical point of contact — requirements to working software',
				'Org-chart platform in C#/ASP.NET + Java, Windows and Android',
				'Migrated thousands of legacy records with zero data loss'
			],
			tech: ['C#', 'ASP.NET', 'Java', 'SQL']
		}
	],
	education: 'B.S. CIS — NYC College of Technology, 2024'
} as const;

// ── About ─────────────────────────────────────────────────────────────────────
interface SkillGroup {
	label: string;
	text: string; // desktop plain-text form (DC 11a L330–344)
	chips?: readonly string[]; // mobile chip form (DC 11b L630–649) — desktop-only groups omit it
}

export const about = {
	header: 'About',
	// expanded view copy (DC 11a L322–326 / 11b L622–628)
	body: "I work where engineering meets the people who need it — scoping ambiguous problems alongside research and operations teams, then owning the solution from first spec to production. Lately that means agentic evaluation pipelines on Gemini at Google, Llama training-data systems at Meta, and embedded delivery for the NYC Mayor's Office.",
	availabilityLine: 'Available for full-time roles · New York or remote',
	// board-tile summary line
	thesis: 'Embedded with the teams who have the problem, shipping the tooling that solves it.',
	lockup: ['Software', 'Developer'],
	portrait: { src: '/portrait.jpg', alt: 'Portrait of Noureddine Sidi Abed' },
	skillGroups: [
		{
			label: 'Languages',
			text: 'Python · SQL · JavaScript · Go · C# · Java',
			chips: ['Python', 'SQL', 'JavaScript', 'Go', 'C#']
		},
		{
			label: 'AI / ML',
			text: 'LLM API integration · agentic workflows · model evaluation · prompt engineering · RLHF · annotation pipelines',
			chips: ['LLM APIs', 'Agentic workflows', 'Model evals', 'RLHF']
		},
		{
			label: 'Web',
			text: 'React · Svelte · three.js · ASP.NET',
			chips: ['React', 'Svelte', 'three.js']
		},
		{
			label: 'Tooling',
			text: 'Docker · PostgreSQL · MongoDB · Git'
		}
	] satisfies readonly SkillGroup[]
} as const;

// ── Contact ───────────────────────────────────────────────────────────────────
export const contact = {
	header: 'Contact',
	headline: ['Available', 'for work'],
	// copy-email row (DC L266–268 / wireExtras L3123–3136); the verb follows the input
	// (pointer vs touch), not the breakpoint
	copyLabel: 'click to copy',
	copyLabelTouch: 'tap to copy',
	copiedLabel: 'Copied',
	copyFailedLabel: "Couldn't copy",
	writeMe: 'write me',
	resumeLabel: 'Open resume PDF',
	socialsMobile: ['GitHub', 'LinkedIn']
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
	// the projects the board tile shows, with the one metric each leads with
	featured: [
		{ id: 'agentic-image-eval', metric: '1,000+ outputs scored per cycle' },
		{ id: 'vendor-reporting', metric: 'Reporting time down 70%' },
		{ id: 'qa-tooling', metric: '10,000+ data points reviewed' }
	],
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
			problem: 'Research teams had an ambiguous ask: image evals at a scale manual annotation could not reach.',
			approach:
				'Agentic pipeline on the Gemini API — plans scoring runs and routes low-confidence outputs to human checkpoints.',
			outcome: '1,000+ outputs scored per cycle; the fully manual workflow was retired. Owned end to end, from scoping with researchers to production.'
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
			// vendor APIs were also wired into the internal review UI as part of this work
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
			approach: 'Embedded with the IT division as technical point of contact; C#/ASP.NET + Java app for Windows and Android, every record migrated and validated.',
			outcome: 'Zero data loss across thousands of employee records.'
		}
	] satisfies Project[]
} as const;
