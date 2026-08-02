// Test-suite lint guarantees. This config deliberately scopes ONLY to the unit and E2E
// test files — it is not a whole-app linter. Its job is to keep the regression suite
// honest: every test must actually assert, and assertions must not hide behind a branch
// (a conditional expect can silently no-op and mask a real failure).
//
// ESLint 8.57 in flat-config mode (see the `lint` script's ESLINT_USE_FLAT_CONFIG flag).
import vitest from 'eslint-plugin-vitest';
import playwright from 'eslint-plugin-playwright';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

// `@typescript-eslint/no-explicit-any` is enabled for both scopes so the deliberate `any`
// casts in the tests must carry an explicit disable directive (they do) — and any future
// stray `any` in a test is caught.
export default [
	// Vitest unit/integration tests.
	{
		files: ['src/**/*.{test,spec}.{js,ts}'],
		plugins: { vitest, '@typescript-eslint': tsPlugin },
		languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
		rules: {
			'vitest/expect-expect': 'error',
			'vitest/no-conditional-expect': 'error',
			'@typescript-eslint/no-explicit-any': 'error'
		}
	},
	// Playwright E2E tests.
	{
		files: ['e2e/**/*.{js,ts}'],
		plugins: { playwright, '@typescript-eslint': tsPlugin },
		languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
		rules: {
			'playwright/expect-expect': 'error',
			'playwright/no-conditional-in-test': 'error',
			'@typescript-eslint/no-explicit-any': 'error'
		}
	}
];
