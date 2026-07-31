import { describe, it, expect } from 'vitest';
import { profile, hero, experience, about, health, contact, work, links, wildcard } from './content';

// Shape guards for the content module — the E2E suite and the expanded views both key
// off these invariants (6 projects, 3 roles, the copy-email labels, the mailto target).

describe('profile', () => {
	it('has a plausible email address (mailto/copy-email target)', () => {
		expect(profile.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i);
	});

	it('has non-empty identity fields', () => {
		expect(profile.name.length).toBeGreaterThan(0);
		expect(profile.title.length).toBeGreaterThan(0);
		expect(profile.location.length).toBeGreaterThan(0);
		expect(profile.timezone.length).toBeGreaterThan(0);
	});

	it('hero name lockup is the two-line split of the profile name', () => {
		expect(hero.nameLines).toHaveLength(2);
		expect(hero.nameLines.join(' ')).toBe(profile.name);
	});
});

describe('experience', () => {
	it('has exactly 3 roles', () => {
		expect(experience.roles).toHaveLength(3);
	});

	it('every role is fully populated (title, period, blurb, bullets, tech)', () => {
		for (const r of experience.roles) {
			expect(r.company.length).toBeGreaterThan(0);
			expect(r.title.length).toBeGreaterThan(0);
			expect(r.period.length).toBeGreaterThan(0);
			expect(r.blurb.length).toBeGreaterThan(0);
			expect(r.bullets.length).toBeGreaterThanOrEqual(2);
			r.bullets.forEach((b) => expect(b.length).toBeGreaterThan(0));
			expect(r.tech.length).toBeGreaterThanOrEqual(1);
		}
	});

	it('company strip matches the roles (same 3 companies, same order)', () => {
		expect(experience.companies).toHaveLength(3);
		expect(experience.companies.map((c) => c.name)).toEqual(experience.roles.map((r) => r.company));
	});
});

describe('work', () => {
	it('has exactly 6 projects', () => {
		expect(work.projects).toHaveLength(6);
	});

	it('numbers run 01..06 in order (detail counter + wrap depend on this)', () => {
		expect(work.projects.map((p) => p.number)).toEqual(['01', '02', '03', '04', '05', '06']);
	});

	it('ids are unique non-empty slugs', () => {
		const ids = work.projects.map((p) => p.id);
		expect(new Set(ids).size).toBe(6);
		ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
	});

	it('every project has full ledger + case-study copy', () => {
		for (const p of work.projects) {
			for (const field of [
				p.name,
				p.desc,
				p.descShort,
				p.tech,
				p.org,
				p.problem,
				p.approach,
				p.outcome
			]) {
				expect(field.length).toBeGreaterThan(0);
			}
			expect(p.year).toMatch(/^20\d{2}$/);
		}
	});
});

describe('contact', () => {
	it('carries the exact copy-email labels the flip animation asserts on', () => {
		expect(contact.copyLabel).toBe('tap to copy');
		expect(contact.copiedLabel).toBe('✦ signal sent');
	});

	it('has headline, teaser and mobile socials', () => {
		expect(contact.headline).toHaveLength(2);
		expect(contact.socialsMobile.length).toBeGreaterThanOrEqual(3);
	});
});

describe('about / health / wildcard / links', () => {
	it('about has intro, body, and ≥4 populated skill groups', () => {
		expect(about.intro.length).toBeGreaterThan(0);
		expect(about.body.length).toBeGreaterThan(0);
		expect(about.skillGroups.length).toBeGreaterThanOrEqual(4);
		for (const g of about.skillGroups) {
			expect(g.label.length).toBeGreaterThan(0);
			expect(g.text.length).toBeGreaterThan(0);
			if (g.chips) g.chips.forEach((c) => expect(c.length).toBeGreaterThan(0));
		}
	});

	it('health ring percentage is a sane 0–100 number', () => {
		expect(health.ringPct).toBeGreaterThanOrEqual(0);
		expect(health.ringPct).toBeLessThanOrEqual(100);
	});

	it('wildcard (desktop-only tile) has copy', () => {
		expect(wildcard.body.length).toBeGreaterThan(0);
	});

	it('external links are defined (resume path + http socials)', () => {
		expect(links.resume.length).toBeGreaterThan(0);
		expect(links.linkedin).toMatch(/^https?:\/\//);
		expect(links.github).toMatch(/^https?:\/\//);
	});
});
