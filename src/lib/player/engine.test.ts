import { describe, expect, it } from 'vitest';
import type { Ref } from '#lib/data/quran.js';
import { itemFromRange, type Item, type RepeatConfig } from '#lib/repeat/types.js';
import { AudioEngine, type AudioLike, type Snapshot } from './engine';
import type { Loader } from './loader';

/** Minimal stand-in for <audio>: records sources, lets the test fire media events. */
class FakeAudio extends EventTarget {
	src = '';
	currentTime = 0;
	duration = 5;
	playbackRate = 1;
	defaultPlaybackRate = 1;
	paused = true;
	sources: string[] = [];
	rates: number[] = [];
	failPlay: string | null = null;

	play() {
		this.sources.push(this.src);
		this.rates.push(this.playbackRate);
		if (this.failPlay) return Promise.reject(new DOMException('blocked', this.failPlay));
		this.paused = false;
		this.dispatchEvent(new Event('playing'));
		return Promise.resolve();
	}
	pause() {
		this.paused = true;
		this.dispatchEvent(new Event('pause'));
	}
	removeAttribute() {
		this.src = '';
	}
	load() {}
	end() {
		this.dispatchEvent(new Event('ended'));
	}
	fail() {
		this.dispatchEvent(new Event('error'));
	}
}

class FakeLoader implements Loader {
	prefetched: string[] = [];
	resolve = (url: string) => url;
	prefetch = (urls: string[]) => void this.prefetched.push(...urls);
	clear() {}
}

const url = (_: string, r: Ref) => `${r.s}:${r.a}`;
const range = (s: number, a: number, s2: number, a2: number, loops = 1): Item => ({ ...itemFromRange({ s, a }, { s: s2, a: a2 }), loops });
const config = (over: Partial<RepeatConfig>): RepeatConfig => ({ items: [], perAyah: 1, listLoops: 1, gapMs: 0, speed: 1, reciterId: 'alafasy', ...over });

function setup(cfg: RepeatConfig) {
	const audio = new FakeAudio();
	const loader = new FakeLoader();
	const engine = new AudioEngine({ audio: audio as unknown as AudioLike, loader, urlFor: url, silence: (ms) => `silence:${ms}` });
	let last!: Snapshot;
	engine.subscribe((s) => (last = s));
	engine.start(cfg);
	/** Let every source finish until playback ends (or `max` steps). */
	const runAll = (max = 100) => {
		for (let i = 0; i < max && last.state !== 'ended'; i++) audio.end();
	};
	return { audio, loader, engine, snap: () => last, runAll };
}

describe('AudioEngine playback order', () => {
	it('plays the Basmalah before ayah 1, repeats, and inserts silent gaps', () => {
		const { audio, runAll, snap } = setup(config({ items: [range(112, 1, 112, 2)], perAyah: 2, gapMs: 1000 }));
		runAll();
		expect(audio.sources).toEqual(['1:1', '112:1', 'silence:1000', '112:1', 'silence:1000', '112:2', 'silence:1000', '112:2']);
		expect(snap().state).toBe('ended');
	});

	it('plays straight through without gaps when the gap is 0', () => {
		const { audio, runAll } = setup(config({ items: [range(1, 6, 1, 7)], perAyah: 1, listLoops: 2 }));
		runAll();
		expect(audio.sources).toEqual(['1:6', '1:7', '1:6', '1:7']);
	});

	it('applies the speed to recitation but not to silence', () => {
		const { audio, runAll } = setup(config({ items: [range(1, 6, 1, 7)], gapMs: 500, speed: 1.25 }));
		runAll();
		expect(audio.rates).toEqual([1.25, 1, 1.25]);
	});

	it('reports position and progress', () => {
		const { audio, snap } = setup(config({ items: [range(1, 1, 1, 7)], perAyah: 3 }));
		expect(snap()).toMatchObject({ state: 'playing', phase: 'ayah', ref: { s: 1, a: 1 }, index: 0, total: 21 });
		audio.end();
		audio.end();
		audio.end();
		expect(snap()).toMatchObject({ ref: { s: 1, a: 2 }, index: 3 });
	});

	it('prefetches the next plays, including the Basmalah clip', () => {
		const { loader } = setup(config({ items: [range(113, 5, 114, 1)] }));
		expect(loader.prefetched).toEqual(['1:1', '114:1']);
	});
});

describe('AudioEngine controls', () => {
	const cfg = config({ items: [range(1, 1, 1, 7)], perAyah: 3 });

	it('next and prev move by ayah', () => {
		const { engine, snap, audio } = setup(cfg);
		engine.next();
		expect(snap().ref).toEqual({ s: 1, a: 2 });
		audio.end(); // repeat 2 of ayah 2
		engine.prev(); // restarts ayah 2
		expect(snap()).toMatchObject({ ref: { s: 1, a: 2 }, pos: { rep: 0 } });
		engine.prev();
		expect(snap().ref).toEqual({ s: 1, a: 1 });
	});

	it('pause and play keep the position; jumping while paused stays paused', () => {
		const { engine, snap, audio } = setup(cfg);
		engine.pause();
		expect(snap().state).toBe('paused');
		engine.jumpToAyah(4);
		expect(snap()).toMatchObject({ state: 'paused', ref: { s: 1, a: 5 } });
		const states: string[] = [];
		const unsub = engine.subscribe((s) => states.push(s.state));
		const before = audio.sources.length;
		engine.toggle();
		expect(snap().state).toBe('playing');
		expect(audio.sources.slice(before)).toEqual(['1:5']);
		expect(states).toEqual(['paused', 'loading', 'playing']); // Pause shows before sound starts
		unsub();
	});

	it('restores a session paused without autoplay', () => {
		const audio = new FakeAudio();
		const engine = new AudioEngine({ audio: audio as unknown as AudioLike, loader: new FakeLoader(), urlFor: url, silence: () => '' });
		engine.start(cfg, { listLoop: 0, item: 0, itemLoop: 0, ayah: 2, rep: 1 }, false);
		expect(engine.snapshot()).toMatchObject({ state: 'paused', ref: { s: 1, a: 3 }, index: 7 });
		expect(audio.sources).toEqual([]);
	});

	it('changes speed live', () => {
		const { engine, audio, snap } = setup(cfg);
		engine.setSpeed(1.5);
		expect(audio.playbackRate).toBe(1.5);
		expect(snap().config!.speed).toBe(1.5);
	});

	it('play after the end starts over', () => {
		const { engine, runAll, snap } = setup(config({ items: [range(1, 7, 1, 7)] }));
		runAll();
		engine.play();
		expect(snap()).toMatchObject({ state: 'playing', index: 0 });
	});

	it('waits for the user when autoplay is blocked', () => {
		const audio = new FakeAudio();
		audio.failPlay = 'NotAllowedError';
		const engine = new AudioEngine({ audio: audio as unknown as AudioLike, loader: new FakeLoader(), urlFor: url, silence: () => '' });
		engine.start(cfg);
		return Promise.resolve().then(() => expect(engine.snapshot().state).toBe('paused'));
	});

	it('retries a failed file, then reports an error', () => {
		const { audio, snap } = setup(cfg);
		audio.fail();
		audio.fail();
		expect(snap().state).toBe('playing');
		audio.fail();
		expect(snap().state).toBe('error');
	});

	it('stop clears everything', () => {
		const { engine, snap } = setup(cfg);
		engine.stop();
		expect(snap()).toMatchObject({ state: 'idle', config: null, ref: null });
	});
});
