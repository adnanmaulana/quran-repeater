import { persisted } from '#lib/stores/persisted.svelte.js';
import * as ops from './history.js';
import type { HistoryEntry } from './history.js';

/** Every listening session, saved on this device (localStorage, capped at MAX_ENTRIES). */
export const history = persisted<HistoryEntry[]>('history', []);

export const historyActions = {
	record: (entry: HistoryEntry) => history.update((list) => ops.record(list, entry)),
	remove: (id: string) => history.update((list) => ops.remove(list, id)),
	clear: () => history.set([]),
	get: (id: string) => history.value.find((e) => e.id === id) ?? null
};

export function newHistoryId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
