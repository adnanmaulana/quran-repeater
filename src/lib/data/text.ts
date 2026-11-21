import { createStore, get, set, type UseStore } from 'idb-keyval';

/** One ayah's text in the editions the app shows. */
export type AyahText = { ar: string; tr: string };
/** Ayah texts of a surah, index 0 = ayah 1. */
export type SurahText = { s: number; translation: string; ayat: AyahText[] };

const API = 'https://api.alquran.cloud/v1';
const ARABIC = 'quran-uthmani';
const CACHE_VERSION = 1;

/** The Basmalah, compared without diacritics, and with alif wasla as plain alif. */
const BASMALAH = 'بسم الله الرحمن الرحيم';
const plain = (s: string) => s.replace(/[ً-ٰٟۖ-ۭ﻿]/g, '').replace(/ٱ/g, 'ا');

/**
 * `quran-uthmani` prefixes ayah 1 of every surah except 1 and 9 with the Basmalah (checked for all
 * 114 surahs on 2026-11-21). The player shows and plays it separately, so strip it here.
 */
export function stripBasmalah(s: number, text: string): string {
	const clean = text.replace(/^﻿/, '');
	if (s === 1 || s === 9) return clean;
	const words = clean.split(' ');
	return plain(words.slice(0, 4).join(' ')) === BASMALAH ? words.slice(4).join(' ') : clean;
}

type ApiEdition = { edition: { identifier: string }; ayahs: { numberInSurah: number; text: string }[] };

export function parseEditions(s: number, translation: string, json: { data: ApiEdition[] }): SurahText {
	const ar = json.data.find((e) => e.edition.identifier === ARABIC);
	const tr = json.data.find((e) => e.edition.identifier === translation);
	if (!ar || !tr || ar.ayahs.length !== tr.ayahs.length) throw new Error(`Unexpected response for surah ${s}`);
	return {
		s,
		translation,
		ayat: ar.ayahs.map((a, i) => ({ ar: a.numberInSurah === 1 ? stripBasmalah(s, a.text) : a.text, tr: tr.ayahs[i].text }))
	};
}

let store: UseStore | undefined;
const idb = () => (store ??= createStore('quran-repeater', 'text'));
const key = (s: number, translation: string) => `v${CACHE_VERSION}:${s}:${translation}`;
const inflight = new Map<string, Promise<SurahText>>();

/**
 * Surah text from IndexedDB, else the API (then cached). Concurrent calls share one request.
 * Text never changes, so a cached copy is used forever.
 */
export function loadSurahText(s: number, translation: string, fetcher: typeof fetch = fetch): Promise<SurahText> {
	const k = key(s, translation);
	let p = inflight.get(k);
	if (!p) {
		p = (async () => {
			const cached = await get<SurahText>(k, idb()).catch(() => undefined);
			if (cached) return cached;
			const res = await fetcher(`${API}/surah/${s}/editions/${ARABIC},${translation}`);
			if (!res.ok) throw new Error(`Text request failed: ${res.status}`);
			const text = parseEditions(s, translation, await res.json());
			await set(k, text, idb()).catch(() => {}); // storage full or blocked: still return the text
			return text;
		})().finally(() => inflight.delete(k));
		inflight.set(k, p);
	}
	return p;
}

/** The Basmalah line shown above ayah 1 (Uthmani script, as in Al-Fatihah 1). */
export const BASMALAH_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** Pause (waqf) and sajdah marks: printed as their own token, recited with the word before. */
const TRAILING_MARK = /^[ۖ-ۜ۩]+$/;
/** ۞ starts a hizb quarter: it belongs with the word after it. */
const LEADING_MARK = '۞';

/** "إِلْ يَاسِينَ" (37:130) is printed as two tokens but counted as one word. */
const JOINS_NEXT = 'إِلْ';

/**
 * An ayah's words as Quran.com numbers them for word timings: marks are joined to their word, so
 * index i is word i + 1. (Checked against the word counts of all 6236 ayat on 2026-11-21.)
 */
export function ayahWords(ar: string): string[] {
	const out: string[] = [];
	let lead = '';
	for (const tok of ar.replace(/﻿/g, '').split(/\s+/)) {
		if (!tok) continue;
		if (tok === LEADING_MARK || tok === JOINS_NEXT) lead += `${tok} `;
		else if (out.length && !lead && TRAILING_MARK.test(tok)) out[out.length - 1] += ` ${tok}`;
		else {
			out.push(lead + tok);
			lead = '';
		}
	}
	if (lead) out.push(lead.trim());
	return out;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** 255 → ٢٥٥ (Arabic-Indic digits for the end-of-ayah marker). */
export function arabicNumber(n: number): string {
	return String(n).replace(/\d/g, (d) => AR_DIGITS[+d]);
}
