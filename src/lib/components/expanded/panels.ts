import type { Component } from 'svelte';
import type { CardId } from '$lib/stores/ui.svelte';
import ExpandedExperience from './ExpandedExperience.svelte';
import ExpandedAbout from './ExpandedAbout.svelte';
import ExpandedContact from './ExpandedContact.svelte';
import ExpandedWork from './ExpandedWork.svelte';

export interface PanelSpec {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	label: string;
	props: (mobile: boolean) => Record<string, unknown>;
	/** Inline style of the [data-expand] container — the DC per-card data-expand styles. */
	style: (mobile: boolean) => string;
}

const EX_BASE =
	'display:flex;position:absolute;inset:0;z-index:2;flex-direction:column;box-sizing:border-box;outline:none;';

const mobileProp = (mobile: boolean) => ({ mobile });

// Per-card expanded containers, carrying the DC [data-expand] container styles:
// Experience 11a L127 / 11b L462, About 11a L297 / 11b L609, Contact 11a L236
// (overflow:hidden crops the flame bleed) / 11b L547, Work 11a L361 / 11b L663.
export const PANELS: Record<CardId, PanelSpec> = {
	experience: {
		component: ExpandedExperience,
		label: 'Experience',
		props: mobileProp,
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#101b21;overflow:auto'
				: EX_BASE +
					'background:radial-gradient(120% 160% at 78% 30%,#101322 0%,#0a0c16 45%,#06070d 100%);padding:28px 34px;gap:20px;overflow:hidden'
	},
	about: {
		component: ExpandedAbout,
		label: 'About',
		props: mobileProp,
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:radial-gradient(120% 90% at 50% 115%,rgba(200,112,63,.10),transparent 60%),#18130f;padding:20px;gap:20px;overflow:auto'
				: EX_BASE + 'background:radial-gradient(120% 90% at 50% 115%,rgba(200,112,63,.10),transparent 60%),#18130f;padding:26px 30px;gap:0;overflow:auto'
	},
	contact: {
		component: ExpandedContact,
		label: 'Contact',
		props: mobileProp,
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:#1a1616;padding:20px;gap:16px;overflow:auto'
				: EX_BASE +
					'background:#1a1616;padding:28px 32px;justify-content:space-between;overflow:hidden'
	},
	work: {
		component: ExpandedWork,
		label: 'Work',
		props: mobileProp,
		style: (mobile) =>
			mobile
				? EX_BASE + 'background:radial-gradient(90% 55% at 50% 118%,rgba(255,125,46,.07),transparent 62%),#0b0d15;padding:20px;gap:0;overflow:auto'
				: EX_BASE + 'background:radial-gradient(90% 55% at 50% 118%,rgba(255,125,46,.07),transparent 62%),#0b0d15;padding:26px 30px;gap:0;overflow:auto'
	}
};
