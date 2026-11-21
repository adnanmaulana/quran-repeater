import type { Draft } from '#lib/repeat/draft.js';

/** A saved repeat: the Setup screen's items and counts under a name. */
export type Playlist = {
	id: string;
	name: string;
	draft: Draft;
	createdAt: number;
	updatedAt: number;
};

export const NAME_MAX = 60;

export function cleanName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
}

/** Create (no id) or update a playlist; most recently changed first. */
export function save(list: Playlist[], name: string, draft: Draft, id: string | null, now = Date.now(), newId = () => `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`): { list: Playlist[]; id: string } {
	const existing = id ? list.find((p) => p.id === id) : undefined;
	const p: Playlist = existing
		? { ...existing, name: cleanName(name) || existing.name, draft, updatedAt: now }
		: { id: newId(), name: cleanName(name), draft, createdAt: now, updatedAt: now };
	return { list: [p, ...list.filter((x) => x.id !== p.id)], id: p.id };
}

export function remove(list: Playlist[], id: string): Playlist[] {
	return list.filter((p) => p.id !== id);
}
