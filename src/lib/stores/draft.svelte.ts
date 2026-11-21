import type { Item } from '#lib/repeat/types.js';
import { persisted } from './persisted.svelte.js';

/**
 * The playlist being set up: Home fills it, Setup edits it, Player starts from it.
 * Persisted so a refresh on /setup does not lose the selection.
 */
export const draft = persisted<{ items: Item[] }>('draft', { items: [] });

export function startDraft(items: Item[]) {
	draft.set({ items });
}
