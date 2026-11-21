// Copies the two web fonts from their Fontsource packages to static/fonts/ under fixed names, so
// app.html can preload them (hashed Vite asset names cannot be referenced from app.html).
// Run after upgrading either package: `npm run gen:fonts`.
import { copyFile, mkdir } from 'node:fs/promises';

const out = new URL('../static/fonts/', import.meta.url);
const fonts = [
	['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-latin-wght.woff2'],
	['@fontsource/amiri/files/amiri-arabic-400-normal.woff2', 'amiri-arabic-400.woff2']
];

await mkdir(out, { recursive: true });
for (const [from, to] of fonts) {
	await copyFile(new URL(`../node_modules/${from}`, import.meta.url), new URL(to, out));
	console.log('copied', to);
}
