import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets several checkouts (e.g. git worktrees) run the suite side by side without one
// reusing another's preview server.
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://localhost:${port}`,
		...devices['Pixel 7'],
		locale: 'en-US',
		// Audio starts from taps anyway; this keeps headless runs from blocking restored sessions.
		launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] }
	},
	webServer: {
		command: `npm run build && npx vite preview --port ${port} --strictPort`,
		port,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
