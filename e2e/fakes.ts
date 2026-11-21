import type { Page } from '@playwright/test';

/**
 * Let context.route() see requests made by the service worker (Chromium, experimental in
 * Playwright 1.49). Read whenever a service worker starts, so set it per test file. Leave it off
 * for tests that check cache-served pages offline: with it on, Playwright fails those responses.
 */
export function routeServiceWorkerRequests(on: boolean) {
	if (on) process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
	else delete process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS;
}
import surahs from '../src/lib/data/surahs.json' with { type: 'json' };

/** A short silent WAV standing in for every recitation file. */
function wav(ms: number): Buffer {
	const rate = 8000;
	const n = Math.round((rate * ms) / 1000);
	const b = Buffer.alloc(44 + n, 128);
	b.write('RIFF', 0);
	b.writeUInt32LE(36 + n, 4);
	b.write('WAVEfmt ', 8);
	b.writeUInt32LE(16, 16);
	b.writeUInt16LE(1, 20);
	b.writeUInt16LE(1, 22);
	b.writeUInt32LE(rate, 24);
	b.writeUInt32LE(rate, 28);
	b.writeUInt16LE(1, 32);
	b.writeUInt16LE(8, 34);
	b.write('data', 36);
	b.writeUInt32LE(n, 40);
	return b;
}

/**
 * Serve audio and text locally so tests are fast, offline and deterministic. Routes are set on
 * the browser context so requests made by the service worker are faked too.
 * Returns the list of audio files requested, in order (e.g. "001001").
 */
export async function fakeServices(page: Page, clipMs = 300): Promise<string[]> {
	const requested: string[] = [];
	const clip = wav(clipMs);
	await page.context().route('https://everyayah.com/data/**', (route) => {
		requested.push(route.request().url().split('/').pop()!.replace('.mp3', ''));
		return route.fulfill({ body: clip, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } });
	});
	await page.context().route('https://api.alquran.cloud/v1/surah/**', (route) => {
		const m = route.request().url().match(/surah\/(\d+)\/editions\/([^/?]+)/)!;
		const s = Number(m[1]);
		const count = surahs[s - 1].ayat;
		const data = m[2].split(',').map((identifier) => ({
			edition: { identifier },
			ayahs: Array.from({ length: count }, (_, i) => ({
				numberInSurah: i + 1,
				text: identifier === 'quran-uthmani' ? `نص ${s}:${i + 1}` : `[${identifier}] ${s}:${i + 1}`
			}))
		}));
		return route.fulfill({ json: { code: 200, data }, headers: { 'access-control-allow-origin': '*' } });
	});
	return requested;
}

/** Load the app and wait until the service worker controls the page (so offline works). */
export async function controlled(page: Page) {
	await page.goto('/');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

/** Put fake recitation files straight into the download cache, as a finished download would. */
export async function seedDownloads(page: Page, files: string[], reciterFolder = 'Alafasy_128kbps', clipMs = 300) {
	const bytes = [...wav(clipMs)];
	await page.evaluate(
		async ({ files, folder, bytes }) => {
			const cache = await caches.open('qr-audio-v1');
			for (const f of files) {
				const body = new Uint8Array(bytes);
				await cache.put(`https://everyayah.com/data/${folder}/${f}.mp3`, new Response(body, { headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(body.length) } }));
			}
		},
		{ files, folder: reciterFolder, bytes }
	);
}
