import { describe, expect, it } from 'vitest';
import { estimateSegments, karaoke, parseTimings, type Segment } from './timings';

describe('parseTimings', () => {
	it('reads Quran.com segments per ayah, word positions as 0-based', () => {
		const t = parseTimings(
			{
				audio_files: [
					{ verse_key: '67:1', segments: [[0, 1, 60, 1070], [1, 2, 1080, 1940]] },
					{ verse_key: '67:2', segments: null }
				]
			},
			3
		);
		expect(t[0]).toEqual([{ w: 0, start: 60, end: 1070 }, { w: 1, start: 1080, end: 1940 }]);
		expect(t[1]).toEqual([]);
		expect(t[2]).toEqual([]);
	});

	it('drops malformed segments and keeps time order', () => {
		const t = parseTimings({ audio_files: [{ verse_key: '1:1', segments: [[1, 2, 500, 900], [0, 1, 0, 400], [2, 3, 900, 100], ['x'], [3, 4, 'a', 1]] }] }, 1);
		expect(t[0].map((s) => s.w)).toEqual([0, 1]);
	});
});

describe('karaoke', () => {
	const segs: Segment[] = [
		{ w: 0, start: 0, end: 1000 },
		{ w: 1, start: 1000, end: 2000 },
		{ w: 2, start: 3000, end: 4000 }
	];

	it('is before the first word at the start', () => {
		expect(karaoke([{ w: 0, start: 200, end: 900 }], 0, 0)).toEqual({ word: -1, sounding: false, show: 0 });
	});

	it('follows the word being recited', () => {
		expect(karaoke(segs, 1500, 0)).toEqual({ word: 1, sounding: true, show: 1 });
	});

	it('keeps the last word, silent, in a pause', () => {
		expect(karaoke(segs, 2500, 0)).toEqual({ word: 1, sounding: false, show: 1 });
	});

	it('shows the next word a little before it is recited', () => {
		expect(karaoke(segs, 2800, 300).show).toBe(2);
		expect(karaoke(segs, 2600, 300).show).toBe(1);
	});

	it('goes back when the reciter repeats a phrase', () => {
		const rep = [...segs, { w: 1, start: 4100, end: 5000 }];
		expect(karaoke(rep, 4500, 0)).toEqual({ word: 1, sounding: true, show: 1 });
	});
});

it('estimates timings in proportion to letters, ignoring diacritics', () => {
	const s = estimateSegments(['بِسْمِ', 'ٱللَّهِ'], 900);
	expect(s.map((x) => x.w)).toEqual([0, 1]);
	// 3 and 4 letters, weighted +1 each: 4/9 and 5/9 of the time.
	expect(s[0].end).toBeCloseTo(400);
	expect(s[1].end).toBeCloseTo(900);
});
