import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT } from '#lib/repeat/draft.js';
import { itemFromSurah } from '#lib/repeat/types.js';
import { NAME_MAX, cleanName, remove, save } from './playlists';

const draft = (s: number) => ({ ...EMPTY_DRAFT, items: [itemFromSurah(s)] });
let n = 0;
const id = () => `p${++n}`;

describe('playlists', () => {
	it('creates new playlists first and updates in place', () => {
		let r = save([], 'Before sleep', draft(67), null, 1, id);
		r = save(r.list, 'Friday', draft(18), null, 2, id);
		expect(r.list.map((p) => p.name)).toEqual(['Friday', 'Before sleep']);
		const sleepId = r.list[1].id;
		r = save(r.list, 'Night', draft(32), sleepId, 3, id);
		expect(r.id).toBe(sleepId);
		expect(r.list[0]).toMatchObject({ id: sleepId, name: 'Night', createdAt: 1, updatedAt: 3 });
		expect(r.list[0].draft.items[0].start.s).toBe(32);
		expect(r.list).toHaveLength(2);
	});

	it('keeps the old name when an update is given a blank one', () => {
		const r = save([], 'Morning', draft(36), null, 1, id);
		expect(save(r.list, '   ', draft(36), r.id, 2, id).list[0].name).toBe('Morning');
	});

	it('cleans names', () => {
		expect(cleanName('  Juz   30\n week 1 ')).toBe('Juz 30 week 1');
		expect(cleanName('x'.repeat(100))).toHaveLength(NAME_MAX);
	});

	it('removes playlists', () => {
		const r = save([], 'A', draft(1), null, 1, id);
		expect(remove(r.list, r.id)).toEqual([]);
	});
});
