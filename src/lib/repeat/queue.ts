import { fromGlobal, globalIndex, type Ref } from '#lib/data/quran.js';
import { itemAyat, type RepeatConfig } from './types.js';

/**
 * Where playback is inside a repeat config. Nesting, outermost first:
 * list loop → item → item loop → ayah (index within the item) → ayah repeat.
 * All fields are 0-based.
 */
export type Position = { listLoop: number; item: number; itemLoop: number; ayah: number; rep: number };

export type Play = {
	ref: Ref;
	pos: Position;
	/** Play the Basmalah clip first: the first time ayah 1 of a surah (not 1 or 9) is reached. */
	basmalah: boolean;
};

/** The shape the queue needs; gap, speed and reciter do not affect the order. */
export type QueueConfig = Pick<RepeatConfig, 'items' | 'perAyah' | 'listLoops'>;

export const START: Position = Object.freeze({ listLoop: 0, item: 0, itemLoop: 0, ayah: 0, rep: 0 });

export function isPlayable(cfg: QueueConfig): boolean {
	return cfg.items.length > 0 && cfg.perAyah >= 1 && cfg.items.every((it) => it.loops >= 1 && itemAyat(it) > 0) && (cfg.listLoops === 'infinite' || cfg.listLoops >= 1);
}

/** Plays in one pass over the whole list. */
export function playsPerListLoop(cfg: QueueConfig): number {
	return cfg.items.reduce((a, it) => a + itemAyat(it) * it.loops, 0) * cfg.perAyah;
}

/** Total plays, or null when the list loops forever. */
export function totalPlays(cfg: QueueConfig): number | null {
	return cfg.listLoops === 'infinite' ? null : playsPerListLoop(cfg) * cfg.listLoops;
}

const listLoopsDone = (cfg: QueueConfig, listLoop: number) => cfg.listLoops !== 'infinite' && listLoop >= cfg.listLoops;

export function playAt(cfg: QueueConfig, pos: Position): Play {
	const item = cfg.items[pos.item];
	const ref = fromGlobal(globalIndex(item.start) + pos.ayah);
	return { ref, pos, basmalah: pos.rep === 0 && ref.a === 1 && ref.s !== 1 && ref.s !== 9 };
}

/** 0-based ordinal of a position in the whole run (for progress bars and resume checks). */
export function playIndex(cfg: QueueConfig, pos: Position): number {
	let n = pos.listLoop * playsPerListLoop(cfg);
	for (let i = 0; i < pos.item; i++) n += itemAyat(cfg.items[i]) * cfg.items[i].loops * cfg.perAyah;
	n += pos.itemLoop * itemAyat(cfg.items[pos.item]) * cfg.perAyah;
	return n + pos.ayah * cfg.perAyah + pos.rep;
}

/** The play after `pos`, or null at the end of the run. */
export function next(cfg: QueueConfig, pos: Position): Position | null {
	const p = { ...pos };
	if (++p.rep < cfg.perAyah) return p;
	p.rep = 0;
	return nextAyah(cfg, p);
}

/** First repeat of the next ayah, crossing item loops, items and list loops. Null at the end. */
export function nextAyah(cfg: QueueConfig, pos: Position): Position | null {
	const p = { ...pos, rep: 0 };
	if (++p.ayah < itemAyat(cfg.items[p.item])) return p;
	p.ayah = 0;
	if (++p.itemLoop < cfg.items[p.item].loops) return p;
	return nextItem(cfg, p);
}

/** Start of the next item (skipping its remaining loops). Null at the end. */
export function nextItem(cfg: QueueConfig, pos: Position): Position | null {
	const p = { ...pos, itemLoop: 0, ayah: 0, rep: 0 };
	if (++p.item < cfg.items.length) return p;
	p.item = 0;
	p.listLoop++;
	return listLoopsDone(cfg, p.listLoop) ? null : p;
}

/**
 * First repeat of the previous ayah. Mirrors a music player's "previous": from the middle of an
 * ayah (rep > 0) it restarts that ayah. Null at the very start.
 */
export function prevAyah(cfg: QueueConfig, pos: Position): Position | null {
	if (pos.rep > 0) return { ...pos, rep: 0 };
	const p = { ...pos };
	if (--p.ayah >= 0) return p;
	if (--p.itemLoop >= 0) return { ...p, ayah: itemAyat(cfg.items[p.item]) - 1 };
	if (--p.item < 0) {
		if (p.listLoop === 0) return null;
		p.listLoop--;
		p.item = cfg.items.length - 1;
	}
	const it = cfg.items[p.item];
	return { ...p, itemLoop: it.loops - 1, ayah: itemAyat(it) - 1 };
}

/** Start of the current item, or of the previous item when already at its start. */
export function prevItem(cfg: QueueConfig, pos: Position): Position | null {
	const atStart = pos.itemLoop === 0 && pos.ayah === 0 && pos.rep === 0;
	if (!atStart) return { ...pos, itemLoop: 0, ayah: 0, rep: 0 };
	if (pos.item > 0) return { ...pos, item: pos.item - 1 };
	if (pos.listLoop === 0) return null;
	return { ...pos, listLoop: pos.listLoop - 1, item: cfg.items.length - 1 };
}

/** Every play in order. With an infinite list, pass `limit`. */
export function* iterate(cfg: QueueConfig, limit = Infinity): Generator<Play> {
	if (!isPlayable(cfg)) return;
	let pos: Position | null = { ...START };
	for (let i = 0; pos && i < limit; i++) {
		yield playAt(cfg, pos);
		pos = next(cfg, pos);
	}
}
