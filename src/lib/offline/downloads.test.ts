import { describe, expect, it } from 'vitest';
import type { Ref } from '#lib/data/quran.js';
import { itemFromRange, itemFromSurah, type Item } from '#lib/repeat/types.js';
import { DownloadManager, filesFor, surahsOf, type CacheLike, type Job } from './downloads';

const url = (r: string, ref: Ref) => `https://audio.test/${r}/${ref.s}:${ref.a}`;
const range = (s: number, a: number, s2: number, a2: number): Item => itemFromRange({ s, a }, { s: s2, a: a2 });

class FakeCache implements CacheLike {
	store = new Map<string, Response>();
	async match(req: RequestInfo | URL) {
		return this.store.get(String(req instanceof Request ? req.url : req));
	}
	async put(req: RequestInfo | URL, res: Response) {
		this.store.set(String(req), res);
	}
	async keys() {
		return [...this.store.keys()].map((u) => new Request(u));
	}
}

function setup({ failing = new Set<string>(), seed = [] as string[] } = {}) {
	const cache = new FakeCache();
	seed.forEach((u) => cache.store.set(u, new Response('x')));
	const fetched: string[] = [];
	const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const u = String(input);
		fetched.push(u);
		if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
		if (failing.has(u)) throw new TypeError('Failed to fetch');
		return new Response(new Uint8Array(1000), { headers: { 'Content-Type': 'audio/mpeg' } });
	}) as typeof fetch;
	const changes: (Job | null)[] = [];
	const texts: number[][] = [];
	const dm = new DownloadManager(
		{ openCache: async () => cache, fetcher, urlFor: url, concurrency: 2, saveText: async (s) => texts.push(s) },
		(j) => changes.push(j)
	);
	return { dm, cache, fetched, changes, texts, last: () => changes.at(-1) };
}

describe('filesFor', () => {
	it('lists each file once, with the Basmalah when a surah starts', () => {
		const files = filesFor([range(112, 1, 112, 2), range(112, 2, 113, 1)], 'r', url);
		// 112 has 4 ayat, so the second range adds 112:3, 112:4 and 113:1 (its Basmalah is already listed).
		expect(files.map((f) => `${f.url.split('/').pop()}@${f.item}`)).toEqual(['1:1@0', '112:1@0', '112:2@0', '112:3@1', '112:4@1', '113:1@1']);
	});

	it('skips the Basmalah for Al-Fatihah and At-Tawbah', () => {
		expect(filesFor([range(1, 1, 1, 2), range(9, 1, 9, 1)], 'r', url).map((f) => f.url.split('/').pop())).toEqual(['1:1', '1:2', '9:1']);
	});

	it('names the surahs to save text for', () => {
		expect(surahsOf([range(78, 1, 80, 2), itemFromSurah(1)])).toEqual([78, 79, 80, 1]);
	});
});

describe('DownloadManager', () => {
	// The Basmalah clip is Al-Fatihah 1:1 itself, so it is stored once: 1 + 4 + 2 = 7 files.
	const items = [itemFromSurah(112), range(1, 1, 1, 3)];

	it('downloads every file into the cache and completes', async () => {
		const { dm, cache, last, texts } = setup();
		await dm.start(items, 'r');
		expect(last()).toMatchObject({ state: 'complete', done: 7, total: 7, bytes: 7000 });
		expect(last()!.items).toEqual([
			{ done: 5, total: 5, failed: false },
			{ done: 2, total: 2, failed: false }
		]);
		expect(cache.store.size).toBe(7);
		expect(texts).toEqual([[112, 1]]);
		expect(await dm.status(items, 'r')).toEqual({ saved: 7, total: 7 });
	});

	it('skips files that are already saved', async () => {
		const { dm, fetched } = setup({ seed: [url('r', { s: 112, a: 1 }), url('r', { s: 1, a: 1 })] });
		await dm.start(items, 'r');
		expect(fetched).toHaveLength(5);
		expect(fetched).not.toContain(url('r', { s: 112, a: 1 }));
	});

	it('reports progress as files arrive', async () => {
		const { dm, changes } = setup();
		await dm.start(items, 'r');
		const dones = changes.map((c) => c?.done);
		expect(dones).toEqual([...dones].sort((a, b) => a! - b!)); // never goes backwards
		expect(changes.some((c) => c!.state === 'downloading' && c!.done > 0 && c!.done < 7)).toBe(true);
	});

	it('retries a failing file, then stops with an error; Retry fetches only what is missing', async () => {
		const bad = url('r', { s: 1, a: 2 });
		const failing = new Set([bad]);
		const { dm, fetched, last } = setup({ failing });
		await dm.start(items, 'r');
		expect(last()!.state).toBe('error');
		expect(last()!.items[1].failed).toBe(true);
		expect(fetched.filter((u) => u === bad)).toHaveLength(3); // first try + 2 retries

		failing.clear();
		const before = fetched.length;
		await dm.resume();
		expect(last()).toMatchObject({ state: 'complete', done: 7 });
		expect(new Set(fetched.slice(before))).not.toContain(url('r', { s: 112, a: 1 }));
	});

	it('pauses mid-download, keeps what was saved, and resumes', async () => {
		const cache = new FakeCache();
		const fetcher = (async () => new Response(new Uint8Array(10))) as unknown as typeof fetch;
		let dm!: DownloadManager;
		const seen: (Job | null)[] = [];
		dm = new DownloadManager({ openCache: async () => cache, fetcher, urlFor: url, concurrency: 1 }, (j) => {
			seen.push(j);
			if (j?.state === 'downloading' && j.done === 3) dm.pause();
		});
		await dm.start(items, 'r');
		expect(seen.at(-1)).toMatchObject({ state: 'paused', done: 3 });
		expect(cache.store.size).toBe(3);
		await dm.resume();
		expect(seen.at(-1)).toMatchObject({ state: 'complete', done: 7 });
		expect(cache.store.size).toBe(7);
	});

	it('cancel forgets the job but keeps saved files', async () => {
		const { dm, cache, last } = setup();
		await dm.start([itemFromSurah(112)], 'r');
		dm.cancel();
		expect(last()).toBeNull();
		expect(cache.store.size).toBe(5);
	});
});
