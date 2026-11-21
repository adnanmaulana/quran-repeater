import surahsJson from './surahs.json';
import juzJson from './juz.json';

export type Place = 'meccan' | 'medinan';
export type Surah = {
	n: number;
	name: string;
	ar: string;
	meaning: { en: string; id: string };
	place: Place;
	ayat: number;
};
/** A position in the mushaf: surah number + ayah number within it. */
export type Ref = { s: number; a: number };
export type Juz = { n: number; start: Ref; end: Ref };

export const SURAHS = surahsJson as Surah[];
export const JUZ = juzJson as Juz[];
export const TOTAL_AYAT = 6236;

/** Global ayah number (1–6236) of the first ayah of each surah, indexed by surah number. */
const FIRST: number[] = [0];
{
	let acc = 1;
	for (const s of SURAHS) {
		FIRST[s.n] = acc;
		acc += s.ayat;
	}
}

export function surah(n: number): Surah {
	const s = SURAHS[n - 1];
	if (!s) throw new RangeError(`No surah ${n}`);
	return s;
}

export function isValidRef(r: Ref): boolean {
	return Number.isInteger(r.s) && r.s >= 1 && r.s <= 114 && Number.isInteger(r.a) && r.a >= 1 && r.a <= SURAHS[r.s - 1].ayat;
}

/** 1-based global ayah number, as used by most Quran APIs. */
export function globalIndex(r: Ref): number {
	if (!isValidRef(r)) throw new RangeError(`Invalid ayah ${r.s}:${r.a}`);
	return FIRST[r.s] + r.a - 1;
}

export function fromGlobal(g: number): Ref {
	if (g < 1 || g > TOTAL_AYAT) throw new RangeError(`Invalid global ayah ${g}`);
	let lo = 1;
	let hi = 114;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (FIRST[mid] <= g) lo = mid;
		else hi = mid - 1;
	}
	return { s: lo, a: g - FIRST[lo] + 1 };
}

/** Number of ayat from `start` to `end`, inclusive. 0 if the range is reversed. */
export function countAyat(start: Ref, end: Ref): number {
	return Math.max(0, globalIndex(end) - globalIndex(start) + 1);
}

/** Every ayah from `start` to `end`, inclusive, in mushaf order. */
export function* ayatBetween(start: Ref, end: Ref): Generator<Ref> {
	const last = globalIndex(end);
	for (let g = globalIndex(start); g <= last; g++) yield fromGlobal(g);
}

/** Surah numbers touched by a range, e.g. 78:1–80:42 → [78, 79, 80]. */
export function surahsIn(start: Ref, end: Ref): number[] {
	const out: number[] = [];
	for (let s = start.s; s <= end.s; s++) out.push(s);
	return out;
}

export function juz(n: number): Juz {
	const j = JUZ[n - 1];
	if (!j) throw new RangeError(`No juz ${n}`);
	return j;
}

export function wholeSurah(n: number): { start: Ref; end: Ref } {
	return { start: { s: n, a: 1 }, end: { s: n, a: surah(n).ayat } };
}

/** Case- and punctuation-insensitive search by number, transliterated name or meaning. */
export function searchSurahs(query: string, lang: 'en' | 'id'): Surah[] {
	const q = normalize(query);
	if (!q) return SURAHS;
	if (/^\d+$/.test(q)) return SURAHS.filter((s) => String(s.n).startsWith(q));
	return SURAHS.filter((s) => normalize(s.name).includes(q) || normalize(s.meaning[lang]).includes(q) || s.ar.includes(query.trim()));
}

function normalize(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');
}
