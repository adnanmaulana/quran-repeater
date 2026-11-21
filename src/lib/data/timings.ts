import { createStore, get, set, type UseStore } from 'idb-keyval';
import { reciter } from './reciters';

/** When one word is recited, in ms from the start of the ayah's audio file. `w`: 0-based word. */
export type Segment = { w: number; start: number; end: number };
/** Word timings of a surah, index 0 = ayah 1. */
export type SurahTimings = Segment[][];

const API = 'https://api.quran.com/api/v4';
const CACHE_VERSION = 1;

type ApiAudioFile = { verse_key: string; segments?: unknown[] | null };

/**
 * Quran.com segments are `[segment, word position (1-based), start ms, end ms]`. A reciter may
 * repeat a phrase, so positions can go back; segments are kept in time order.
 */
export function parseTimings(json: { audio_files: ApiAudioFile[] }, ayat: number): SurahTimings {
	const out: SurahTimings = Array.from({ length: ayat }, () => []);
	for (const f of json.audio_files) {
		const a = Number(f.verse_key.split(':')[1]);
		if (!(a >= 1 && a <= ayat)) continue;
		const segs: Segment[] = [];
		for (const raw of f.segments ?? []) {
			if (!Array.isArray(raw) || raw.length < 3) continue;
			const [pos, start, end] = raw.slice(-3).map(Number);
			if (![pos, start, end].every(Number.isFinite) || pos < 1 || end < start) continue;
			segs.push({ w: pos - 1, start, end });
		}
		out[a - 1] = segs.sort((x, y) => x.start - y.start);
	}
	return out;
}

let store: UseStore | undefined;
const idb = () => (store ??= createStore('quran-repeater-timings', 'timings'));
const inflight = new Map<string, Promise<SurahTimings | null>>();

/**
 * Word timings for a surah and reciter, from IndexedDB, else Quran.com (then cached). Resolves
 * null for reciters Quran.com has no timings for. The audio files are the same recordings.
 */
export function loadSurahTimings(s: number, ayat: number, reciterId: string, fetcher: typeof fetch = fetch): Promise<SurahTimings | null> {
	const id = reciter(reciterId).timingsId;
	if (!id) return Promise.resolve(null);
	const k = `v${CACHE_VERSION}:${id}:${s}`;
	let p = inflight.get(k);
	if (!p) {
		p = (async () => {
			const cached = await get<SurahTimings>(k, idb()).catch(() => undefined);
			if (cached) return cached;
			const res = await fetcher(`${API}/recitations/${id}/by_chapter/${s}?fields=segments&per_page=300`);
			if (!res.ok) throw new Error(`Timings request failed: ${res.status}`);
			const t = parseTimings(await res.json(), ayat);
			await set(k, t, idb()).catch(() => {});
			return t;
		})().finally(() => inflight.delete(k));
		inflight.set(k, p);
	}
	return p;
}

/** Strip diacritics and marks so only letters are counted. */
const letters = (w: string) => w.replace(/[ً-ٰٟۖ-ۭ\s]/g, '').length;

/** Rough timings when none are known: each word gets time in proportion to its letters. */
export function estimateSegments(words: string[], durationMs: number): Segment[] {
	const weights = words.map((w) => letters(w) + 1);
	const total = weights.reduce((a, b) => a + b, 0);
	let t = 0;
	return weights.map((wt, w) => {
		const start = t;
		t += (wt / total) * durationMs;
		return { w, start, end: t };
	});
}

/** Show the next word's line this long before it is recited. */
export const LINE_LEAD_MS = 300;

/**
 * Where recitation is at time `t` (ms): `word` being or last recited (-1 before the first),
 * whether it is still sounding, and `show`, the word whose line should be on screen.
 */
export function karaoke(segs: Segment[], t: number, lead = LINE_LEAD_MS): { word: number; sounding: boolean; show: number } {
	let i = -1;
	while (i + 1 < segs.length && segs[i + 1].start <= t) i++;
	const cur = segs[i];
	const next = segs[i + 1];
	const show = next && t >= next.start - lead ? next.w : (cur?.w ?? segs[0]?.w ?? 0);
	return { word: cur?.w ?? -1, sounding: !!cur && t < cur.end, show };
}
