// Vitest stub for $app/environment (SvelteKit's virtual module) so unit tests can import
// modules that reference `browser`/`dev` without a running Kit dev server.
export const browser = false;
export const dev = true;
export const building = false;
export const version = 'test';
