// Fire a button-style activation from a keydown: Enter or Space, matching native <button>.
export function activateOnKey(e: KeyboardEvent, fn: () => void): void {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		fn();
	}
}
