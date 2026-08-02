// App-level UI state (runes). No sound state — sound is out of scope.

export type CardId = 'experience' | 'about' | 'contact' | 'work';

let _openCard = $state<CardId | null>(null);
let _workDetail = $state<string | null>(null);
let _introPlayed = $state(false); // per session (module lives for the tab's lifetime)

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
	}
};
