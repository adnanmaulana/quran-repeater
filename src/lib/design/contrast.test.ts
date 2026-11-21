import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * WCAG contrast checks for the colour pairs the screens actually use, read straight from
 * tokens.css, in light and dark. Text needs 4.5:1; borders that identify a control need 3:1.
 */
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
	const start = css.indexOf(selector);
	if (start < 0) throw new Error(`No ${selector} block`);
	const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
	return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

const light = block(':root {');
const dark = { ...light, ...block(":root[data-theme='dark'] {") };

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
	const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
}

/** [foreground, background, minimum] — where each pair appears is noted alongside. */
const TEXT = 4.5;
const UI = 3;
const pairs: [string, string, number][] = [
	['ink', 'bg', TEXT], // page text
	['ink', 'surface', TEXT], // card text
	['muted', 'bg', TEXT], // hints under sections
	['muted', 'surface', TEXT], // meta lines in cards
	['muted', 'surface-2', TEXT], // field labels on inputs
	['muted', 'track', TEXT], // inactive segmented tab
	['accent', 'surface', TEXT], // links, eyebrow labels, "Done"
	['accent', 'bg', TEXT], // eyebrow on the page background
	['on-accent', 'accent', TEXT], // primary buttons, selected chips
	['accent-ink', 'accent-soft', TEXT], // Resume, Offline ready badge
	['accent-ink', 'accent-tint', TEXT], // surah number badges
	['accent-ink', 'surface', TEXT], // Arabic surah names
	['danger', 'surface', TEXT], // Remove downloads, failed item
	['danger', 'danger-soft', TEXT], // download error note
	['border-strong', 'surface', UI], // unchecked checkbox and radio borders
	['night-ink', 'night', TEXT], // player text
	['night-muted', 'night', TEXT], // translation, reciter name
	['night-accent', 'night', TEXT], // "Ayah 67:3", Continue label
	['night', 'night-accent', TEXT], // play button icon, current ayah chip
	['night-muted', 'night-2', TEXT], // player notice
	['night-ink', 'night-3', TEXT], // ayah chips at the top of the glow
	['night-danger', 'night-danger-soft', TEXT] // player error notice
];

for (const [name, theme] of [
	['light', light],
	['dark', dark]
] as const) {
	describe(`${name} theme contrast`, () => {
		for (const [fg, bg, min] of pairs) {
			it(`${fg} on ${bg} ≥ ${min}:1`, () => {
				expect(theme[fg], `--${fg} missing`).toBeDefined();
				expect(theme[bg], `--${bg} missing`).toBeDefined();
				expect(ratio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
			});
		}
	});
}

it('the dark block in prefers-color-scheme matches the explicit dark block', () => {
	const media = block(":root:not([data-theme='light']) {");
	expect(media).toEqual(block(":root[data-theme='dark'] {"));
});
