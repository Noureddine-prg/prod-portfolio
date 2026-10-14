import { defineConfig, devices } from '@playwright/test';
import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// When the Chromium revision this Playwright expects isn't installed (browsers cache from an
// older/newer Playwright), fall back to the newest full chromium-* build in the cache.
// Cache root: PLAYWRIGHT_BROWSERS_PATH, else the per-OS default (Windows / macOS / Linux).
function installedChromium(): string | undefined {
	try {
		if (existsSync(chromium.executablePath())) return undefined; // the expected build is there
	} catch {
		/* no expected path — look around */
	}
	const root =
		process.env.PLAYWRIGHT_BROWSERS_PATH ||
		(process.platform === 'win32'
			? join(process.env.LOCALAPPDATA ?? homedir(), 'ms-playwright')
			: process.platform === 'darwin'
				? join(homedir(), 'Library', 'Caches', 'ms-playwright')
				: join(homedir(), '.cache', 'ms-playwright'));
	if (!existsSync(root)) return undefined;
	const rel: Record<string, string[]> = {
		win32: ['chrome-win64', 'chrome.exe'],
		darwin: ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'],
		linux: ['chrome-linux', 'chrome']
	};
	const tail = rel[process.platform];
	if (!tail) return undefined;
	const dirs = readdirSync(root)
		.filter((d) => /^chromium-\d+$/.test(d))
		.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
	for (const d of dirs) {
		const exe = join(root, d, ...tail);
		if (existsSync(exe)) return exe;
	}
	return undefined;
}


// E2E against the dev server on 5185 (5173 is left free for humans / other agents),
// Chromium only. Expand/settle specs wait through the ~1.95s settle plus the ~3.6s intro veil,
// so the per-test timeout is generous.
//
// Machine overrides (all optional; defaults use Playwright's own managed Chromium):
//   PW_CHROMIUM_PATH  absolute path to a Chromium/Chrome executable (else auto-detected, above)
//   PW_CHANNEL        a branded channel, e.g. "chrome" or "msedge"
//   PW_WORKERS        parallel workers (default 4)
//   PW_PORT           dev-server port (default 5185)
const channel = process.env.PW_CHANNEL || undefined;
const port = Number(process.env.PW_PORT ?? 5185);
const executablePath = process.env.PW_CHROMIUM_PATH || (channel ? undefined : installedChromium());

export default defineConfig({
	testDir: 'e2e',
	timeout: 45_000,
	fullyParallel: true,
	// Cap parallelism: each spec drives multiple WebGL canvases against one dev server;
	// higher worker counts made cold-compile loads miss the ~3.6s intro-veil window.
	workers: Number(process.env.PW_WORKERS ?? 4),
	use: {
		baseURL: `http://localhost:${port}`
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				...(channel ? { channel } : {}),
				launchOptions: executablePath ? { executablePath } : {}
			}
		}
	],
	webServer: {
		command: `npm run dev -- --port ${port} --strictPort`,
		port,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
