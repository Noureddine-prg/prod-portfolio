// App-level UI state (runes). Stage 3 wires the expand/close flow to `openCard`; the
// scaffold only needs the state to exist with the right shape. NOTE: there is no soundOn
// — sound is cut from scope entirely.

import { currentHour, timeOfDay, type TimeOfDay } from '$lib/util/time';

export type CardId = 'experience' | 'about' | 'contact' | 'work';

let _openCard = $state<CardId | null>(null);
let _workDetail = $state<string | null>(null);
let _introPlayed = $state(false); // per session (module lives for the tab's lifetime)
let _timeOfDay = $state<TimeOfDay>(timeOfDay(currentHour()));

export const ui = {
	get openCard(): CardId | null {
		return _openCard;
	},
	set openCard(v: CardId | null) {
		_openCard = v;
	},

	get workDetail(): string | null {
		return _workDetail;
	},
	set workDetail(v: string | null) {
		_workDetail = v;
	},

	get introPlayed(): boolean {
		return _introPlayed;
	},
	set introPlayed(v: boolean) {
		_introPlayed = v;
	},

	get timeOfDay(): TimeOfDay {
		return _timeOfDay;
	},
	set timeOfDay(v: TimeOfDay) {
		_timeOfDay = v;
	}
};
