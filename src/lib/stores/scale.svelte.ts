// How much the 900×620 (desktop) / 390w (mobile) design coordinate system is scaled to
// fill the viewport. The loop multiplies render resolution by this to stay crisp.

function createScale() {
	let value = $state(1);
	return {
		get value() {
			return value;
		},
		set value(v: number) {
			value = v;
		}
	};
}

export const boardScale = createScale();
