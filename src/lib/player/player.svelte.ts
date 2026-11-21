import { surah } from '#lib/data/quran.js';
import { audioUrl, reciter } from '#lib/data/reciters.js';
import { title } from '#lib/format.js';
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

/** The current repeat and where it is, so a reload (or reopening the app) resumes there. */
const session = persisted<{ config: RepeatConfig; pos: Position } | null>('session', null);

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
		if (s.config && s.pos && (s.index !== lastSaved || s.state === 'ended')) {
			lastSaved = s.index;
			session.set({ config: s.config, pos: s.state === 'ended' ? START : s.pos });
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
	start(config: RepeatConfig) {
		ensure().start(config);
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
		ensure().start(saved.config, saved.pos, false);
	} catch {
		session.set(null); // e.g. a config from an older, incompatible version
	}
}
