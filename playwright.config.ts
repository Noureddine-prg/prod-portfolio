import { defineConfig, devices } from '@playwright/test';

// E2E against the dev server on 5173, Chromium only (installed on this machine).
export default defineConfig({
	testDir: 'e2e',
	timeout: 30_000,
	fullyParallel: true,
	use: {
		baseURL: 'http://localhost:5173'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run dev -- --port 5173',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
