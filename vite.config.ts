import { paraglideVitePlugin } from '@inlang/paraglide-js';
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

			// Static SPA: every route is rendered on the client, `index.html` is the fallback
			// so deep links work on any static host and inside the installed PWA.
			adapter: adapter({ fallback: 'index.html' }),

			// Inline small stylesheets into the page: a handful of 1–2 KB CSS files otherwise each
			// cost a render-blocking round trip on slow networks.
			inlineStyleThreshold: 8 * 1024
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Client-only app, no locale in the URL: the user's choice, otherwise Indonesian (the
			// base locale), whatever the device language.
			strategy: ['localStorage', 'baseLocale'],
			localStorageKey: 'qr.lang'
		})
	],
	test: {
		// Unit tests only; browser tests in e2e/ run with Playwright.
		include: ['src/**/*.test.ts']
	}
});
