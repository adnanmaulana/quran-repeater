import { track } from '#lib/analytics/analytics.js';
import type { Draft } from '#lib/repeat/draft.js';
import { persisted } from '#lib/stores/persisted.svelte.js';
import * as ops from './playlists.js';
import type { Playlist } from './playlists.js';

/** Saved playlists, on this device. */
export const playlists = persisted<Playlist[]>('playlists', []);

export const playlistActions = {
	/** Save a draft as a new playlist (id null) or over an existing one; returns its id. */
	save(name: string, draft: Draft, id: string | null): string {
		const r = ops.save(playlists.value, name, draft, id);
		playlists.set(r.list);
		track('playlist_save', { items: draft.items.length, edit: id !== null });
		return r.id;
	},
	remove: (id: string) => playlists.update((list) => ops.remove(list, id)),
	get: (id: string) => playlists.value.find((p) => p.id === id) ?? null
};
