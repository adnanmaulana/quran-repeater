import { describe, expect, it } from 'vitest';
import { itemAyat, itemFromJuz, itemFromRange, itemFromSurah, itemTitle } from './types';

const juzLabel = (n: number) => `Juz ${n}`;

describe('repeat items', () => {
	it('builds whole-surah, juz and range items', () => {
		const mulk = itemFromSurah(67);
		expect(mulk.start).toEqual({ s: 67, a: 1 });
		expect(mulk.end).toEqual({ s: 67, a: 30 });
		expect(itemAyat(mulk)).toBe(30);
		expect(itemAyat(itemFromJuz(30))).toBe(564);
		expect(itemAyat(itemFromRange({ s: 78, a: 1 }, { s: 80, a: 42 }))).toBe(128);
	});

	it('gives each item a unique id', () => {
		expect(itemFromSurah(1).id).not.toBe(itemFromSurah(1).id);
	});

	it('titles items', () => {
		expect(itemTitle(itemFromSurah(67), juzLabel)).toBe('Al-Mulk');
		expect(itemTitle(itemFromJuz(30), juzLabel)).toBe('Juz 30');
		expect(itemTitle(itemFromRange({ s: 18, a: 1 }, { s: 18, a: 10 }), juzLabel)).toBe('Al-Kahf 1–10');
		expect(itemTitle(itemFromRange({ s: 78, a: 1 }, { s: 80, a: 42 }), juzLabel)).toBe("An-Naba 1 – 'Abasa 42");
	});
});
