import type { Ref } from '#lib/data/quran.js';
import { START, next, nextAyah, nextItem, playAt, playIndex, prevAyah, prevItem, totalPlays, type Position } from '#lib/repeat/queue.js';
import type { RepeatConfig } from '#lib/repeat/types.js';
import type { Loader } from './loader.js';

export type EngineState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
/** What the <audio> element is playing right now. */
export type Phase = 'basmalah' | 'ayah' | 'gap';

export type Snapshot = {
	state: EngineState;
	phase: Phase;
	config: RepeatConfig | null;
	pos: Position | null;
	ref: Ref | null;
	/** 0-based ordinal of the current play, and the total (null when looping forever). */
	index: number;
	total: number | null;
};

/** The parts of HTMLAudioElement the engine uses (a fake implements it in tests). */
export type AudioLike = Pick<HTMLAudioElement, 'src' | 'currentTime' | 'duration' | 'playbackRate' | 'defaultPlaybackRate' | 'paused' | 'play' | 'pause' | 'addEventListener' | 'removeAttribute' | 'load'>;

export type EngineDeps = {
	audio: AudioLike;
	loader: Loader;
	urlFor: (reciterId: string, ref: Ref) => string;
	silence: (ms: number) => string;
};

const BASMALAH_REF: Ref = { s: 1, a: 1 };
const MAX_RETRIES = 2;

/**
 * Plays a RepeatConfig through one <audio> element: Basmalah clip → ayah → silent gap → next play.
 * Framework-free; the UI subscribes to snapshots.
 */
export class AudioEngine {
	private cfg: RepeatConfig | null = null;
	private pos: Position | null = null;
	private phase: Phase = 'ayah';
	private state: EngineState = 'idle';
	private retries = 0;
	private listeners = new Set<(s: Snapshot) => void>();

	constructor(private deps: EngineDeps) {
		const a = deps.audio;
		a.addEventListener('ended', () => this.onEnded());
		a.addEventListener('playing', () => this.set('playing'));
		a.addEventListener('waiting', () => this.state === 'playing' && this.set('loading'));
		a.addEventListener('pause', () => this.state === 'playing' && this.set('paused'));
		a.addEventListener('error', () => this.onError());
	}

	// ── public API ──────────────────────────────────────────────────────────────

	subscribe(fn: (s: Snapshot) => void): () => void {
		this.listeners.add(fn);
		fn(this.snapshot());
		return () => this.listeners.delete(fn);
	}

	snapshot(): Snapshot {
		const { cfg, pos } = this;
		return {
			state: this.state,
			phase: this.phase,
			config: cfg,
			pos,
			ref: cfg && pos ? playAt(cfg, pos).ref : null,
			index: cfg && pos ? playIndex(cfg, pos) : 0,
			total: cfg ? totalPlays(cfg) : null
		};
	}

	/** Load a config at a position. `autoplay` false restores a session paused (e.g. after reload). */
	start(cfg: RepeatConfig, pos: Position = START, autoplay = true) {
		this.deps.loader.clear();
		this.cfg = cfg;
		this.load(pos, autoplay);
	}

	play() {
		if (!this.cfg || !this.pos) return;
		if (this.state === 'ended') return this.load(START, true);
		if (this.state === 'error') return this.load(this.pos, true);
		this.applyRate();
		this.set('loading'); // show Pause right away; 'playing' follows once sound starts
		this.attemptPlay();
	}

	pause() {
		this.deps.audio.pause();
		if (this.cfg) this.set('paused');
	}

	toggle() {
		if (this.state === 'playing' || this.state === 'loading') this.pause();
		else this.play();
	}

	next = () => this.jump(nextAyah);
	prev = () => this.jump(prevAyah);
	nextItem = () => this.jump(nextItem);
	prevItem = () => this.jump(prevItem);

	/** Jump to an ayah of the current item (index within the item), first repeat. */
	jumpToAyah(ayah: number) {
		if (!this.pos) return;
		this.load({ ...this.pos, ayah, rep: 0 }, this.isActive());
	}

	setSpeed(speed: number) {
		if (!this.cfg) return;
		this.cfg = { ...this.cfg, speed };
		this.applyRate();
		this.emit();
	}

	stop() {
		this.deps.audio.pause();
		this.deps.audio.removeAttribute('src');
		this.deps.audio.load();
		this.deps.loader.clear();
		this.cfg = null;
		this.pos = null;
		this.set('idle');
	}

	time(): { current: number; duration: number } {
		const a = this.deps.audio;
		return { current: a.currentTime || 0, duration: Number.isFinite(a.duration) ? a.duration : 0 };
	}

	// ── internals ───────────────────────────────────────────────────────────────

	private isActive() {
		return this.state === 'playing' || this.state === 'loading';
	}

	private jump(step: (cfg: RepeatConfig, pos: Position) => Position | null) {
		if (!this.cfg || !this.pos) return;
		const to = step(this.cfg, this.pos);
		if (to) this.load(to, this.isActive() || this.state === 'ended');
	}

	private load(pos: Position, autoplay: boolean, phase?: Phase) {
		const cfg = this.cfg!;
		this.pos = pos;
		this.retries = 0;
		this.phase = phase ?? (playAt(cfg, pos).basmalah ? 'basmalah' : 'ayah');
		this.setSource();
		this.prefetch();
		if (autoplay) {
			this.set('loading');
			this.attemptPlay();
		} else {
			this.set('paused');
		}
	}

	private setSource() {
		const { cfg, pos, phase, deps } = this;
		const url =
			phase === 'gap'
				? deps.silence(cfg!.gapMs)
				: deps.loader.resolve(deps.urlFor(cfg!.reciterId, phase === 'basmalah' ? BASMALAH_REF : playAt(cfg!, pos!).ref));
		deps.audio.src = url;
		this.applyRate();
	}

	/** Recitation plays at the chosen speed; silent gaps always last their real length. */
	private applyRate() {
		const rate = this.phase === 'gap' ? 1 : (this.cfg?.speed ?? 1);
		this.deps.audio.defaultPlaybackRate = rate; // Safari resets playbackRate to this on load
		this.deps.audio.playbackRate = rate;
	}

	private attemptPlay() {
		this.deps.audio.play().catch((e: DOMException) => {
			if (e?.name === 'AbortError') return; // superseded by a newer source
			this.set('paused'); // e.g. autoplay blocked: wait for the user to press play
		});
	}

	/** Download the next two plays' files while this one plays. */
	private prefetch() {
		const { cfg, deps } = this;
		const urls: string[] = [];
		let p: Position | null = this.pos;
		for (let i = 0; i < 2 && p; i++) {
			p = next(cfg!, p);
			if (!p) break;
			const play = playAt(cfg!, p);
			if (play.basmalah) urls.push(deps.urlFor(cfg!.reciterId, BASMALAH_REF));
			urls.push(deps.urlFor(cfg!.reciterId, play.ref));
		}
		deps.loader.prefetch([...new Set(urls)]);
	}

	private onEnded() {
		const cfg = this.cfg;
		if (!cfg || !this.pos) return;
		if (this.phase === 'basmalah') return this.load(this.pos, true, 'ayah');
		const to = next(cfg, this.pos);
		if (this.phase === 'ayah' && to && cfg.gapMs > 0) {
			this.phase = 'gap';
			this.setSource();
			this.attemptPlay();
			return this.emit();
		}
		if (!to) return this.set('ended');
		this.load(to, true);
	}

	private onError() {
		if (!this.cfg || !this.pos || this.state === 'idle') return;
		if (this.retries++ < MAX_RETRIES) {
			// A prefetched blob may have been evicted, or the network blipped: retry from the network URL.
			const { cfg, pos, phase, deps } = this;
			if (phase !== 'gap') deps.audio.src = deps.urlFor(cfg.reciterId, phase === 'basmalah' ? BASMALAH_REF : playAt(cfg, pos).ref);
			this.applyRate();
			return this.attemptPlay();
		}
		this.set('error');
	}

	private set(state: EngineState) {
		this.state = state;
		this.emit();
	}

	private emit() {
		const s = this.snapshot();
		this.listeners.forEach((fn) => fn(s));
	}
}
