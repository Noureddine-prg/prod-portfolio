import { defineConfig, devices } from '@playwright/test';

// E2E against the dev server on 5185 (5173 is left free for humans / other agents),
// Chromium only (installed on this machine). Expand/settle specs wait through the
// ~1.95s settle plus the ~3.6s intro veil, so the per-test timeout is generous.
export default defineConfig({
	testDir: 'e2e',
	timeout: 45_000,
	fullyParallel: true,
	// Cap parallelism: each spec drives multiple WebGL canvases against one dev server;
	// higher worker counts made cold-compile loads miss the ~3.6s intro-veil window.
	workers: 4,
	use: {
		baseURL: 'http://localhost:5185'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run dev -- --port 5185 --strictPort',
		port: 5185,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
