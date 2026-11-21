import { globalIndex } from '#lib/data/quran.js';
import type { Item, RepeatConfig } from './types.js';

/** The editable part of a repeat. Gap, speed and reciter live in settings and are shared. */
export type Draft = {
	items: Item[];
	perAyah: number;
	listLoops: number;
	/** Kept separate from listLoops so turning "loop forever" off restores the old count. */
	forever: boolean;
};

export const LIMITS = { perAyah: 99, listLoops: 99, itemLoops: 20 } as const;

export const EMPTY_DRAFT: Draft = { items: [], perAyah: 3, listLoops: 1, forever: false };

const clamp = (v: number, max: number) => Math.min(max, Math.max(1, Math.round(v)));

export function setPerAyah(d: Draft, v: number): Draft {
	return { ...d, perAyah: clamp(v, LIMITS.perAyah) };
}

export function setListLoops(d: Draft, v: number): Draft {
	return { ...d, listLoops: clamp(v, LIMITS.listLoops) };
}

export function setForever(d: Draft, forever: boolean): Draft {
	return { ...d, forever };
}

export function setItemLoops(d: Draft, id: string, v: number): Draft {
	return { ...d, items: d.items.map((it) => (it.id === id ? { ...it, loops: clamp(v, LIMITS.itemLoops) } : it)) };
}

export function removeItem(d: Draft, id: string): Draft {
	return { ...d, items: d.items.filter((it) => it.id !== id) };
}

export function moveItem(d: Draft, from: number, to: number): Draft {
	if (from === to || from < 0 || to < 0 || from >= d.items.length || to >= d.items.length) return d;
	const items = [...d.items];
	const [moved] = items.splice(from, 1);
	items.splice(to, 0, moved);
	return { ...d, items };
}

/** Sort by where each item starts in the mushaf (stable for equal starts). */
export function sortMushaf(d: Draft): Draft {
	return { ...d, items: [...d.items].sort((a, b) => globalIndex(a.start) - globalIndex(b.start)) };
}

export function appendItems(d: Draft, items: Item[]): Draft {
	return { ...d, items: [...d.items, ...items] };
}

export function toConfig(d: Draft, shared: Pick<RepeatConfig, 'gapMs' | 'speed' | 'reciterId'>): RepeatConfig {
	return {
		items: d.items,
		perAyah: d.perAyah,
		listLoops: d.forever ? 'infinite' : d.listLoops,
		...shared
	};
}
