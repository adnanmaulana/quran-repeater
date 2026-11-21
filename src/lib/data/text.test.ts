import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/surah-67-editions.json';
import { BASMALAH_TEXT, arabicNumber, ayahWords, parseEditions, stripBasmalah } from './text';

describe('stripBasmalah', () => {
	it('removes the prefixed Basmalah from ayah 1', () => {
		expect(stripBasmalah(67, `${BASMALAH_TEXT} تَبَٰرَكَ ٱلَّذِى`)).toBe('تَبَٰرَكَ ٱلَّذِى');
	});

	it('handles the variant diacritics some surahs use', () => {
		expect(stripBasmalah(97, 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ إِنَّآ أَنزَلْنَٰهُ')).toBe('إِنَّآ أَنزَلْنَٰهُ');
	});

	it('keeps Al-Fatihah 1 (the Basmalah is the ayah) and drops its BOM', () => {
		expect(stripBasmalah(1, `﻿${BASMALAH_TEXT}`)).toBe(BASMALAH_TEXT);
	});

	it('leaves text without a Basmalah alone', () => {
		expect(stripBasmalah(9, 'بَرَآءَةٌۭ مِّنَ ٱللَّهِ')).toBe('بَرَآءَةٌۭ مِّنَ ٱللَّهِ');
	});
});

describe('parseEditions', () => {
	it('pairs Arabic and translation from a real API response', () => {
		const t = parseEditions(67, 'en.sahih', fixture);
		expect(t.ayat).toHaveLength(3);
		expect(t.ayat[0].ar.startsWith('تَبَٰرَكَ')).toBe(true);
		expect(t.ayat[0].tr.startsWith('Blessed is He')).toBe(true);
		expect(parseEditions(67, 'id.indonesian', fixture).ayat[0].tr.startsWith('Maha Suci Allah')).toBe(true);
	});

	it('rejects a response without the asked translation', () => {
		expect(() => parseEditions(67, 'fr.hamidullah', fixture)).toThrow();
	});
});

it('formats Arabic-Indic numbers', () => {
	expect(arabicNumber(255)).toBe('٢٥٥');
});

describe('ayahWords', () => {
	it('joins pause marks to the word before', () => {
		expect(ayahWords('ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى')).toEqual(['ذَٰلِكَ', 'ٱلْكِتَٰبُ', 'لَا', 'رَيْبَ ۛ', 'فِيهِ ۛ', 'هُدًۭى']);
	});

	it('joins the hizb mark to the word after', () => {
		expect(ayahWords('۞ إِنَّ ٱللَّهَ')).toEqual(['۞ إِنَّ', 'ٱللَّهَ']);
	});

	it('counts إِلْ يَاسِينَ (37:130) as one word', () => {
		expect(ayahWords('سَلَٰمٌ عَلَىٰٓ إِلْ يَاسِينَ')).toEqual(['سَلَٰمٌ', 'عَلَىٰٓ', 'إِلْ يَاسِينَ']);
	});

	it('splits the Basmalah into its four words', () => {
		expect(ayahWords(BASMALAH_TEXT)).toHaveLength(4);
	});
});
