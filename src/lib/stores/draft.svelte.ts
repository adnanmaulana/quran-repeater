import * as ops from '#lib/repeat/draft.js';
import type { Draft } from '#lib/repeat/draft.js';
import type { Item } from '#lib/repeat/types.js';
import { persisted } from './persisted.svelte.js';
import { settings } from './settings.svelte.js';

/**
 * The playlist being set up: Home fills it, Setup edits it, Player starts from it.
 * Persisted so a refresh on /setup does not lose it.
 */
export const draft = persisted<Draft>('draft', ops.EMPTY_DRAFT, {
	version: 2,
	// v1 only stored the items.
	migrate: (old) => ({ ...ops.EMPTY_DRAFT, items: (old as { items?: Item[] })?.items ?? [] })
});

/** Replace the items (Home's normal flow) and keep the user's last repeat counts. */
export function startDraft(items: Item[]) {
	draft.update((d) => ({ ...d, items }));
}

/** Add to the current playlist (Home opened from Setup's "Add surah or range"). */
export function addToDraft(items: Item[]) {
	draft.update((d) => ops.appendItems(d, items));
}

type Op<A extends unknown[]> = (d: Draft, ...args: A) => Draft;
const edit =
	<A extends unknown[]>(op: Op<A>) =>
	(...args: A) =>
		draft.update((d) => op(d, ...args));

export const editDraft = {
	setPerAyah: edit(ops.setPerAyah),
	setListLoops: edit(ops.setListLoops),
	setForever: edit(ops.setForever),
	setItemLoops: edit(ops.setItemLoops),
	removeItem: edit(ops.removeItem),
	moveItem: edit(ops.moveItem),
	sortMushaf: edit(ops.sortMushaf),
	/** Replace the order wholesale (after a drag and drop). */
	setItems: (items: Item[]) => draft.update((d) => ({ ...d, items }))
};

export function draftConfig() {
	const s = settings.value;
	return ops.toConfig(draft.value, { gapMs: s.gapMs, speed: s.speed, reciterId: s.reciterId });
}
