import { describe, expect, it } from 'vitest';
import { itemFromJuz, itemFromRange, itemFromSurah, type Item } from './types';
import {
	START,
	isPlayable,
	iterate,
	next,
	nextAyah,
	nextItem,
	playAt,
	playIndex,
	playsPerListLoop,
	prevAyah,
	prevItem,
	totalPlays,
	type Position,
	type QueueConfig
} from './queue';

const range = (s: number, a: number, s2: number, a2: number, loops = 1): Item => ({ ...itemFromRange({ s, a }, { s: s2, a: a2 }), loops });
const fmt = (cfg: QueueConfig, limit?: number) => [...iterate(cfg, limit)].map((p) => `${p.ref.s}:${p.ref.a}${p.basmalah ? 'b' : ''}`);

describe('queue order', () => {
	it('repeats each ayah, then each item, then the list', () => {
		const cfg: QueueConfig = { items: [range(1, 1, 1, 2, 2), range(112, 1, 112, 1)], perAyah: 2, listLoops: 2 };
		const one = ['1:1', '1:2', '1:2', '1:1', '1:2', '1:2', '112:1b', '112:1'];
		expect(fmt(cfg)).toEqual([...one, ...one]);
	});

	it('walks ranges across surahs and flags the Basmalah once per surah start', () => {
		const cfg: QueueConfig = { items: [range(113, 5, 114, 2)], perAyah: 1, listLoops: 1 };
		expect(fmt(cfg)).toEqual(['113:5', '114:1b', '114:2']);
	});

	it('recites Al-Fatihah 1 (the Basmalah) once each time the surah starts, never repeated', () => {
		const cfg: QueueConfig = { items: [range(1, 1, 1, 2), range(1, 2, 1, 2)], perAyah: 3, listLoops: 1 };
		expect(fmt(cfg)).toEqual(['1:1', '1:2', '1:2', '1:2', '1:2', '1:2', '1:2']);
		expect(totalPlays(cfg)).toBe(7);
		expect(totalPlays({ items: [itemFromSurah(1)], perAyah: 3, listLoops: 2 })).toBe(2 * (1 + 6 * 3));
	});

	it('never flags the Basmalah for Al-Fatihah or At-Tawbah', () => {
		const cfg: QueueConfig = { items: [range(1, 1, 1, 1), range(9, 1, 9, 1), range(8, 75, 8, 75)], perAyah: 1, listLoops: 1 };
		expect(fmt(cfg)).toEqual(['1:1', '9:1', '8:75']);
	});

	it('produces a juz in mushaf order', () => {
		const plays = [...iterate({ items: [itemFromJuz(30)], perAyah: 1, listLoops: 1 })];
		expect(plays).toHaveLength(564);
		expect(plays[0].ref).toEqual({ s: 78, a: 1 });
		expect(plays.at(-1)!.ref).toEqual({ s: 114, a: 6 });
	});

	it('loops forever when asked, and stops at the limit', () => {
		const cfg: QueueConfig = { items: [range(112, 1, 112, 2)], perAyah: 1, listLoops: 'infinite' };
		expect(fmt(cfg, 5)).toEqual(['112:1b', '112:2', '112:1b', '112:2', '112:1b']);
		expect(totalPlays(cfg)).toBeNull();
		expect(playsPerListLoop(cfg)).toBe(2);
	});

	it('yields nothing for an unplayable config', () => {
		expect(isPlayable({ items: [], perAyah: 1, listLoops: 1 })).toBe(false);
		expect(fmt({ items: [], perAyah: 1, listLoops: 1 })).toEqual([]);
		expect(isPlayable({ items: [itemFromSurah(1)], perAyah: 0, listLoops: 1 })).toBe(false);
	});
});

describe('counts match the queue', () => {
	// The Setup screen shows totalPlays(); it must equal what the player will actually play.
	const configs: QueueConfig[] = [
		{ items: [itemFromSurah(18), itemFromSurah(32), { ...itemFromSurah(67), loops: 2 }], perAyah: 3, listLoops: 2 },
		{ items: [range(78, 1, 80, 42, 3)], perAyah: 5, listLoops: 1 },
		{ items: [itemFromSurah(1), range(2, 255, 2, 257, 4), itemFromSurah(112)], perAyah: 1, listLoops: 3 }
	];
	for (const [i, cfg] of configs.entries()) {
		it(`config ${i + 1}`, () => {
			const plays = [...iterate(cfg)];
			expect(plays).toHaveLength(totalPlays(cfg)!);
			plays.forEach((p, n) => expect(playIndex(cfg, p.pos)).toBe(n));
		});
	}

	it('matches for random configs', () => {
		let seed = 7;
		const rnd = (n: number) => ((seed = (seed * 16807) % 2147483647) % n) + 1;
		for (let t = 0; t < 40; t++) {
			const items = Array.from({ length: rnd(4) }, () => {
				const s = rnd(114);
				return { ...itemFromSurah(s), loops: rnd(3) };
			});
			const cfg: QueueConfig = { items, perAyah: rnd(3), listLoops: rnd(2) };
			if (totalPlays(cfg)! > 20000) continue;
			expect([...iterate(cfg)].length).toBe(totalPlays(cfg));
		}
	});
});

describe('navigation', () => {
	const cfg: QueueConfig = { items: [range(1, 1, 1, 3, 2), range(112, 1, 112, 2)], perAyah: 2, listLoops: 2 };
	const at = (pos: Position | null) => (pos ? `${pos.listLoop}/${pos.item}/${pos.itemLoop}/${playAt(cfg, pos).ref.s}:${playAt(cfg, pos).ref.a}#${pos.rep}` : 'end');

	it('next walks reps, then ayat', () => {
		expect(at(next(cfg, { ...START, ayah: 1 }))).toBe('0/0/0/1:2#1');
		expect(at(next(cfg, { ...START, ayah: 1, rep: 1 }))).toBe('0/0/0/1:3#0');
	});

	it('next does not repeat Al-Fatihah 1', () => {
		expect(at(next(cfg, START))).toBe('0/0/0/1:2#0');
	});

	it('nextAyah crosses item loops, items and list loops, then ends', () => {
		expect(at(nextAyah(cfg, { ...START, ayah: 2 }))).toBe('0/0/1/1:1#0');
		expect(at(nextAyah(cfg, { ...START, itemLoop: 1, ayah: 2 }))).toBe('0/1/0/112:1#0');
		expect(at(nextAyah(cfg, { listLoop: 0, item: 1, itemLoop: 0, ayah: 1, rep: 0 }))).toBe('1/0/0/1:1#0');
		expect(at(nextAyah(cfg, { listLoop: 1, item: 1, itemLoop: 0, ayah: 1, rep: 1 }))).toBe('end');
	});

	it('nextItem skips remaining loops of the item', () => {
		expect(at(nextItem(cfg, { ...START, ayah: 1 }))).toBe('0/1/0/112:1#0');
	});

	it('prevAyah restarts the current ayah first, then steps back across boundaries', () => {
		expect(at(prevAyah(cfg, { ...START, ayah: 1, rep: 1 }))).toBe('0/0/0/1:2#0');
		expect(at(prevAyah(cfg, { ...START, ayah: 1 }))).toBe('0/0/0/1:1#0');
		expect(at(prevAyah(cfg, { ...START, itemLoop: 1 }))).toBe('0/0/0/1:3#0');
		expect(at(prevAyah(cfg, { listLoop: 0, item: 1, itemLoop: 0, ayah: 0, rep: 0 }))).toBe('0/0/1/1:3#0');
		expect(at(prevAyah(cfg, { ...START, listLoop: 1 }))).toBe('0/1/0/112:2#0');
		expect(prevAyah(cfg, START)).toBeNull();
	});

	it('prevItem goes to the item start, then to the previous item', () => {
		expect(at(prevItem(cfg, { listLoop: 0, item: 1, itemLoop: 0, ayah: 1, rep: 0 }))).toBe('0/1/0/112:1#0');
		expect(at(prevItem(cfg, { listLoop: 0, item: 1, itemLoop: 0, ayah: 0, rep: 0 }))).toBe('0/0/0/1:1#0');
		expect(at(prevItem(cfg, { ...START, listLoop: 1 }))).toBe('0/1/0/112:1#0');
		expect(prevItem(cfg, START)).toBeNull();
	});

	it('next and prevAyah are consistent over a whole run', () => {
		const starts: Position[] = [];
		for (const p of iterate(cfg)) if (p.pos.rep === 0) starts.push(p.pos);
		for (let i = starts.length - 1; i > 0; i--) expect(prevAyah(cfg, starts[i])).toEqual(starts[i - 1]);
	});
});
