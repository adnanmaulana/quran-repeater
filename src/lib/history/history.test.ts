import { describe, expect, it } from 'vitest';
import { START } from '#lib/repeat/queue.js';
import { itemFromSurah, type RepeatConfig } from '#lib/repeat/types.js';
import { MAX_ENTRIES, groupByDay, loopsDone, progress, record, remove, stats, streak, type HistoryEntry } from './history';

const NOW = new Date(2026, 10, 21, 18, 0).getTime(); // 21 Nov 2026, 18:00 local
const H = 3_600_000;
const D = 24 * H;
const cfg = (listLoops: number | 'infinite' = 2): RepeatConfig => ({ items: [itemFromSurah(67)], perAyah: 3, listLoops, gapMs: 0, speed: 1, reciterId: 'alafasy' });
const entry = (id: string, updatedAt: number, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
	id,
	config: cfg(),
	pos: START,
	index: 0,
	total: 180,
	finished: false,
	startedAt: updatedAt,
	updatedAt,
	playlistId: null,
	...over
});

describe('record and remove', () => {
	it('puts the latest update first and replaces an existing entry', () => {
		let list = record([], entry('a', NOW - 2 * H));
		list = record(list, entry('b', NOW - H));
		list = record(list, entry('a', NOW, { index: 5 }));
		expect(list.map((e) => e.id)).toEqual(['a', 'b']);
		expect(list[0].index).toBe(5);
		expect(remove(list, 'a').map((e) => e.id)).toEqual(['b']);
	});

	it('keeps at most MAX_ENTRIES', () => {
		let list: HistoryEntry[] = [];
		for (let i = 0; i < MAX_ENTRIES + 5; i++) list = record(list, entry(String(i), NOW + i));
		expect(list).toHaveLength(MAX_ENTRIES);
		expect(list[0].id).toBe(String(MAX_ENTRIES + 4));
	});
});

describe('groupByDay', () => {
	it('groups into today, yesterday and earlier days', () => {
		const groups = groupByDay([entry('a', NOW - H), entry('b', NOW - D), entry('c', NOW - 3 * D), entry('d', NOW - 2 * H)], NOW);
		expect(groups.map((g) => [g.when, g.entries.map((e) => e.id)])).toEqual([
			['today', ['a', 'd']],
			['yesterday', ['b']],
			['earlier', ['c']]
		]);
	});
});

describe('progress and stats', () => {
	it('counts completed list loops', () => {
		expect(loopsDone(entry('a', NOW, { pos: { ...START, listLoop: 1 } }))).toBe(1);
		expect(loopsDone(entry('a', NOW, { finished: true }))).toBe(2);
		expect(loopsDone(entry('a', NOW, { config: cfg('infinite'), pos: { ...START, listLoop: 7 } }))).toBe(7);
	});

	it('reports progress for finite, finished and forever sessions', () => {
		expect(progress(entry('a', NOW, { index: 45 }))).toBe(0.25);
		expect(progress(entry('a', NOW, { finished: true }))).toBe(1);
		expect(progress(entry('a', NOW, { total: null, config: cfg('infinite') }))).toBe(0);
	});

	it('counts a streak of days ending today or yesterday', () => {
		const list = [entry('a', NOW - H), entry('b', NOW - D), entry('c', NOW - 2 * D), entry('d', NOW - 4 * D)];
		expect(streak(list, NOW)).toBe(3);
		expect(streak(list.slice(1), NOW)).toBe(2); // nothing today yet: the streak through yesterday still counts
		expect(streak([entry('x', NOW - 3 * D)], NOW)).toBe(0);
		expect(stats(list, NOW)).toEqual({ sessions: 4, loops: 0, streak: 3 });
	});
});
