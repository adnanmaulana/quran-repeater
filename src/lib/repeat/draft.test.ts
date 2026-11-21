import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, appendItems, moveItem, removeItem, setForever, setItemLoops, setListLoops, setPerAyah, sortMushaf, toConfig, type Draft } from './draft';
import { itemFromJuz, itemFromSurah } from './types';

const names = (d: Draft) => d.items.map((it) => it.start.s);
const base = (): Draft => ({ ...EMPTY_DRAFT, items: [itemFromSurah(67), itemFromSurah(18), itemFromSurah(32)] });

describe('draft edits', () => {
	it('moves items', () => {
		expect(names(moveItem(base(), 2, 0))).toEqual([32, 67, 18]);
		expect(names(moveItem(base(), 0, 2))).toEqual([18, 32, 67]);
		expect(names(moveItem(base(), 0, 5))).toEqual([67, 18, 32]);
	});

	it('sorts by mushaf order, juz by its first ayah', () => {
		const d = appendItems(base(), [itemFromJuz(1)]);
		expect(names(sortMushaf(d))).toEqual([1, 18, 32, 67]);
	});

	it('clamps counts', () => {
		const d = base();
		expect(setPerAyah(d, 0).perAyah).toBe(1);
		expect(setPerAyah(d, 500).perAyah).toBe(99);
		expect(setListLoops(d, -3).listLoops).toBe(1);
		const id = d.items[0].id;
		expect(setItemLoops(d, id, 50).items[0].loops).toBe(20);
		expect(setItemLoops(d, id, 3).items[1].loops).toBe(1);
	});

	it('removes items and appends new ones', () => {
		const d = base();
		expect(names(removeItem(d, d.items[1].id))).toEqual([67, 32]);
		expect(names(appendItems(d, [itemFromSurah(56)]))).toEqual([67, 18, 32, 56]);
	});

	it('keeps the loop count while looping forever', () => {
		const d = setForever(setListLoops(base(), 4), true);
		expect(toConfig(d, { gapMs: 0, speed: 1, reciterId: 'alafasy' }).listLoops).toBe('infinite');
		expect(toConfig(setForever(d, false), { gapMs: 0, speed: 1, reciterId: 'alafasy' }).listLoops).toBe(4);
	});
});
