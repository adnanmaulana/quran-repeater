import { surah } from '#lib/data/quran.js';
import { audioUrl, reciter } from '#lib/data/reciters.js';
import { title } from '#lib/format.js';
import { historyActions, newHistoryId } from '#lib/history/history.svelte.js';
import { START, type Position } from '#lib/repeat/queue.js';
import type { RepeatConfig } from '#lib/repeat/types.js';
import { persisted } from '#lib/stores/persisted.svelte.js';
import { settings } from '#lib/stores/settings.svelte.js';
import { AudioEngine, type Snapshot } from './engine.js';
import { BlobLoader } from './loader.js';
import { bindMediaActions, updateMediaSession, updatePositionState } from './mediaSession.js';
import { silenceUrl } from './silence.js';

const EMPTY: Snapshot = { state: 'idle', phase: 'ayah', config: null, pos: null, ref: null, index: 0, total: null };

/** Reactive view of the engine for components. `sleepMin`: active sleep timer length, 0 = off. */
export const player = $state<{ snap: Snapshot; sleepMin: number }>({ snap: EMPTY, sleepMin: 0 });

const SLEEP_STEPS = [0, 15, 30, 60];
let sleepTimer: ReturnType<typeof setTimeout> | undefined;

type Session = { config: RepeatConfig; pos: Position; historyId: string; playlistId: string | null; startedAt: number };

/** The current repeat and where it is, so a reload (or reopening the app) resumes there. */
const session = persisted<Session | null>('session', null, {
	version: 2,
	// v1 had no history link: give the restored session a fresh history entry.
	migrate: (old) => {
		const o = old as { config?: RepeatConfig; pos?: Position } | null;
		return o?.config && o.pos ? { config: o.config, pos: o.pos, historyId: newHistoryId(), playlistId: null, startedAt: Date.now() } : null;
	}
});

/** Which history entry (and playlist) the engine's current config belongs to. */
let current: { historyId: string; playlistId: string | null; startedAt: number } | null = null;

let engine: AudioEngine | null = null;
let audio: HTMLAudioElement | null = null;

function ensure(): AudioEngine {
	if (engine) return engine;
	audio = new Audio();
	audio.preload = 'auto';
	const e = new AudioEngine({ audio, loader: new BlobLoader(), urlFor: audioUrl, silence: silenceUrl });
	let lastSaved = -1;
	e.subscribe((s) => {
		player.snap = s;
		if (s.config && s.pos && current && (s.index !== lastSaved || s.state === 'ended')) {
			lastSaved = s.index;
			const ended = s.state === 'ended';
			session.set({ config: s.config, pos: ended ? START : s.pos, ...current });
			historyActions.record({
				id: current.historyId,
				config: s.config,
				pos: s.pos,
				index: s.index,
				total: s.total,
				finished: ended,
				startedAt: current.startedAt,
				updatedAt: Date.now(),
				playlistId: current.playlistId
			});
		}
		updateMediaSession(describe(s), s.state === 'playing' || s.state === 'loading');
	});
	const syncPosition = () => audio && updatePositionState(audio.duration, audio.currentTime, audio.playbackRate);
	audio.addEventListener('loadedmetadata', syncPosition);
	audio.addEventListener('ratechange', syncPosition);
	audio.addEventListener('seeked', syncPosition);
	bindMediaActions({ play: () => e.play(), pause: () => e.pause(), next: e.next, prev: e.prev, stop: () => actions.stop() });
	return (engine = e);
}

function describe(s: Snapshot) {
	if (!s.config || !s.pos || !s.ref) return null;
	const item = s.config.items[s.pos.item];
	return {
		title: `${surah(s.ref.s).name} · ${s.ref.s}:${s.ref.a}`,
		artist: reciter(s.config.reciterId).name,
		album: title(item),
		artwork: new URL('/icons/icon-512.png', location.href).href
	};
}

export const actions = {
	/** Start a new session (a new history entry). */
	start(config: RepeatConfig, playlistId: string | null = null) {
		current = { historyId: newHistoryId(), playlistId, startedAt: Date.now() };
		ensure().start(config);
	},
	/** Continue a history entry where it stopped (from the start if it had finished). */
	resume(id: string) {
		const e = historyActions.get(id);
		if (!e) return;
		current = { historyId: e.id, playlistId: e.playlistId, startedAt: e.startedAt };
		ensure().start(e.config, e.finished ? START : e.pos);
	},
	toggle: () => ensure().toggle(),
	next: () => ensure().next(),
	prev: () => ensure().prev(),
	nextItem: () => ensure().nextItem(),
	prevItem: () => ensure().prevItem(),
	jumpToAyah: (i: number) => ensure().jumpToAyah(i),
	setSpeed(speed: number) {
		ensure().setSpeed(speed);
		settings.update((s) => ({ ...s, speed }));
	},
	stop() {
		engine?.stop();
		session.set(null);
		current = null;
		actions.setSleep(0);
	},
	/** Off → 15 → 30 → 60 min → off. Pauses playback when it runs out. */
	cycleSleep() {
		const i = SLEEP_STEPS.indexOf(player.sleepMin);
		actions.setSleep(SLEEP_STEPS[(i + 1) % SLEEP_STEPS.length]);
	},
	setSleep(min: number) {
		clearTimeout(sleepTimer);
		player.sleepMin = min;
		if (min > 0)
			sleepTimer = setTimeout(() => {
				engine?.pause();
				player.sleepMin = 0;
			}, min * 60_000);
	},
	time: () => engine?.time() ?? { current: 0, duration: 0 }
};

/** On app start: put the last session back, paused, so the mini player can resume it. */
export function restoreSession() {
	const saved = session.value;
	if (!saved || engine) return;
	try {
		current = { historyId: saved.historyId, playlistId: saved.playlistId, startedAt: saved.startedAt };
		ensure().start(saved.config, saved.pos, false);
	} catch {
		session.set(null); // e.g. a config from an older, incompatible version
	}
}
