import type { Position } from '#lib/repeat/queue.js';
import type { RepeatConfig } from '#lib/repeat/types.js';

/** One listening session: a repeat config and how far it got. */
export type HistoryEntry = {
	id: string;
	config: RepeatConfig;
	pos: Position;
	/** 0-based ordinal of the current play, and the total (null when looping forever). */
	index: number;
	total: number | null;
	finished: boolean;
	startedAt: number;
	updatedAt: number;
	/** Set when the session was started from a saved playlist. */
	playlistId: string | null;
};

export const MAX_ENTRIES = 200;

/** Insert or update an entry; most recently updated first; oldest dropped past the cap. */
export function record(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
	return [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, MAX_ENTRIES);
}

export function remove(list: HistoryEntry[], id: string): HistoryEntry[] {
	return list.filter((e) => e.id !== id);
}

/** Local calendar day, e.g. "2026-11-21", so grouping follows the user's clock. */
export function dayKey(ts: number): string {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY = 86_400_000;

export type DayGroup = { key: string; when: 'today' | 'yesterday' | 'earlier'; date: number; entries: HistoryEntry[] };

/** Entries grouped by the day they were last played, newest first. */
export function groupByDay(list: HistoryEntry[], now = Date.now()): DayGroup[] {
	const today = dayKey(now);
	const yesterday = dayKey(now - DAY);
	const groups = new Map<string, DayGroup>();
	for (const e of [...list].sort((a, b) => b.updatedAt - a.updatedAt)) {
		const key = dayKey(e.updatedAt);
		let g = groups.get(key);
		if (!g) {
			g = { key, when: key === today ? 'today' : key === yesterday ? 'yesterday' : 'earlier', date: e.updatedAt, entries: [] };
			groups.set(key, g);
		}
		g.entries.push(e);
	}
	return [...groups.values()];
}

/** Completed passes over the whole list. */
export function loopsDone(e: HistoryEntry): number {
	if (e.finished && e.config.listLoops !== 'infinite') return e.config.listLoops;
	return e.pos.listLoop;
}

/** 0–1 progress for bars; loop-forever sessions count as full once a loop is done. */
export function progress(e: HistoryEntry): number {
	if (e.finished) return 1;
	if (e.total) return Math.min(1, e.index / e.total);
	return e.pos.listLoop > 0 ? 1 : 0;
}

/** Days in a row, ending today or yesterday, with at least one session. */
export function streak(list: HistoryEntry[], now = Date.now()): number {
	const days = new Set(list.map((e) => dayKey(e.updatedAt)));
	let t = days.has(dayKey(now)) ? now : now - DAY;
	let n = 0;
	while (days.has(dayKey(t))) {
		n++;
		t -= DAY;
	}
	return n;
}

export function stats(list: HistoryEntry[], now = Date.now()) {
	return { sessions: list.length, loops: list.reduce((a, e) => a + loopsDone(e), 0), streak: streak(list, now) };
}
