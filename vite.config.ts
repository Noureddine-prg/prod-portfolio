import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Static adapter — this is a single-page, client-rendered board. Prerender the
			// shell (see +layout.ts); all three.js is browser-guarded, so SSR/prerender is safe.
			adapter: adapter({ fallback: 'index.html' }),

			// Placeholder links (e.g. the resume PDF) don't exist yet — warn, don't fail.
			prerender: { handleHttpError: 'warn' }
		})
	],

	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		alias: {
			'$app/environment': new URL('./src/test/stubs/app-environment.ts', import.meta.url).pathname
		}
	}
});
