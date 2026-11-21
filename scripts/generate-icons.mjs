// Renders the app icons (PNG) from SVG with Playwright's Chromium: `npm run gen:icons`.
// Outputs to static/icons/. Maskable icons keep the glyph inside the 80% safe zone.
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const OUT = new URL('../static/icons/', import.meta.url);
const GREEN = '#0A6B57';

// The repeat glyph from the favicon, on a 64-unit grid.
const glyph = `<g fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M41 14l7 7-7 7"/><path d="M16 31v-3a7 7 0 0 1 7-7h25"/><path d="M23 50l-7-7 7-7"/><path d="M48 33v3a7 7 0 0 1-7 7H16"/></g>`;

const svg = ({ maskable }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
<rect width="64" height="64" rx="${maskable ? 0 : 14}" fill="${GREEN}"/>
${maskable ? `<g transform="translate(9.6 9.6) scale(0.7)">${glyph}</g>` : glyph}</svg>`;

const icons = [
	{ name: 'icon-192.png', size: 192, maskable: false },
	{ name: 'icon-512.png', size: 512, maskable: false },
	{ name: 'maskable-512.png', size: 512, maskable: true },
	// iOS draws its own rounded mask, so give it a full square.
	{ name: 'apple-touch-icon.png', size: 180, maskable: true }
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const icon of icons) {
	await page.setViewportSize({ width: icon.size, height: icon.size });
	await page.setContent(`<html><body style="margin:0;background:transparent">${svg(icon)}</body></html>`);
	await page.screenshot({ path: new URL(icon.name, OUT).pathname, omitBackground: true });
	console.log('wrote', icon.name);
}
await browser.close();
