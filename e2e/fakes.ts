import type { Page } from '@playwright/test';
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
 * Serve audio and text locally so tests are fast, offline and deterministic.
 * Returns the list of audio files requested, in order (e.g. "001001").
 */
export async function fakeServices(page: Page, clipMs = 300): Promise<string[]> {
	const requested: string[] = [];
	const clip = wav(clipMs);
	await page.route('https://everyayah.com/data/**', (route) => {
		requested.push(route.request().url().split('/').pop()!.replace('.mp3', ''));
		return route.fulfill({ body: clip, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } });
	});
	await page.route('https://api.alquran.cloud/v1/surah/**', (route) => {
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
