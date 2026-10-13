// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Open expanded card — a shallow history entry so Back closes it. */
			card?: string;
		}
		// interface Platform {}
	}
}

export {};
