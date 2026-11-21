import { describe, expect, it } from 'vitest';
import { JUZ, SURAHS, ayatBetween, countAyat, fromGlobal, globalIndex, juz, searchSurahs, surahsIn } from './quran';
import { audioUrl, initials } from './reciters';

describe('metadata', () => {
	it('has 114 surahs and 6236 ayat', () => {
		expect(SURAHS).toHaveLength(114);
		expect(SURAHS.reduce((a, s) => a + s.ayat, 0)).toBe(6236);
	});

	it('has 30 contiguous juz covering the whole Quran', () => {
		expect(JUZ).toHaveLength(30);
		expect(JUZ[0].start).toEqual({ s: 1, a: 1 });
		expect(JUZ[29].end).toEqual({ s: 114, a: 6 });
		for (let i = 1; i < 30; i++) {
			expect(globalIndex(JUZ[i].start)).toBe(globalIndex(JUZ[i - 1].end) + 1);
		}
	});

	it('matches known juz sizes', () => {
		const size = (n: number) => countAyat(juz(n).start, juz(n).end);
		expect(size(1)).toBe(148);
		expect(size(29)).toBe(431);
		expect(size(30)).toBe(564);
	});
});

describe('ayah numbering', () => {
	it('converts to and from global numbers', () => {
		expect(globalIndex({ s: 1, a: 1 })).toBe(1);
		expect(globalIndex({ s: 67, a: 1 })).toBe(5242);
		expect(globalIndex({ s: 114, a: 6 })).toBe(6236);
		for (const g of [1, 7, 8, 5242, 5673, 6236]) expect(globalIndex(fromGlobal(g))).toBe(g);
	});

	it('rejects invalid refs', () => {
		expect(() => globalIndex({ s: 1, a: 8 })).toThrow();
		expect(() => globalIndex({ s: 115, a: 1 })).toThrow();
	});

	it('counts and walks ranges across surahs', () => {
		expect(countAyat({ s: 78, a: 1 }, { s: 80, a: 42 })).toBe(128);
		expect(surahsIn({ s: 78, a: 1 }, { s: 80, a: 42 })).toEqual([78, 79, 80]);
		const walked = [...ayatBetween({ s: 1, a: 6 }, { s: 2, a: 2 })];
		expect(walked).toEqual([
			{ s: 1, a: 6 },
			{ s: 1, a: 7 },
			{ s: 2, a: 1 },
			{ s: 2, a: 2 }
		]);
		expect(countAyat({ s: 2, a: 1 }, { s: 1, a: 1 })).toBe(0);
	});
});

describe('search', () => {
	it('finds by number, name and meaning', () => {
		expect(searchSurahs('67', 'en')[0].name).toBe('Al-Mulk');
		expect(searchSurahs('mulk', 'en').map((s) => s.n)).toContain(67);
		expect(searchSurahs('al fatihah', 'en')[0].n).toBe(1);
		expect(searchSurahs('sapi', 'id')[0].n).toBe(2);
		expect(searchSurahs('', 'en')).toHaveLength(114);
	});
});

describe('reciters', () => {
	it('builds EveryAyah URLs', () => {
		expect(audioUrl('alafasy', { s: 67, a: 1 })).toBe('https://everyayah.com/data/Alafasy_128kbps/067001.mp3');
	});
	it('makes initials', () => {
		expect(initials('Mishary Rashid Alafasy')).toBe('MR');
		expect(initials('Mahmoud Khalil Al-Husary')).toBe('MK');
	});
});
