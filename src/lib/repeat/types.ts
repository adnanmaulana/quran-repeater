import { countAyat, juz, surah, wholeSurah, type Ref } from '#lib/data/quran.js';

export type ItemSource = { kind: 'surah'; n: number } | { kind: 'juz'; n: number } | { kind: 'range' };

/** One entry in a repeat playlist: a whole surah, a juz, or any range (may span surahs). */
export type Item = {
	id: string;
	start: Ref;
	end: Ref;
	/** How many times this item plays before moving to the next. */
	loops: number;
	source: ItemSource;
};

export type RepeatConfig = {
	items: Item[];
	perAyah: number;
	listLoops: number | 'infinite';
	gapMs: number;
	speed: number;
	reciterId: string;
};

let seq = 0;
const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function itemFromSurah(n: number): Item {
	return { id: newId(), ...wholeSurah(n), loops: 1, source: { kind: 'surah', n } };
}

export function itemFromJuz(n: number): Item {
	const j = juz(n);
	return { id: newId(), start: j.start, end: j.end, loops: 1, source: { kind: 'juz', n } };
}

export function itemFromRange(start: Ref, end: Ref): Item {
	return { id: newId(), start, end, loops: 1, source: { kind: 'range' } };
}

export function itemAyat(item: Item): number {
	return countAyat(item.start, item.end);
}

/** Short title for lists, e.g. "Al-Mulk", "Juz 30", "An-Naba' 1 – 'Abasa 42", "Al-Kahf 1–10". */
export function itemTitle(item: Item, juzLabel: (n: number) => string): string {
	if (item.source.kind === 'surah') return surah(item.source.n).name;
	if (item.source.kind === 'juz') return juzLabel(item.source.n);
	const a = surah(item.start.s).name;
	if (item.start.s === item.end.s) return `${a} ${item.start.a}–${item.end.a}`;
	return `${a} ${item.start.a} – ${surah(item.end.s).name} ${item.end.a}`;
}
