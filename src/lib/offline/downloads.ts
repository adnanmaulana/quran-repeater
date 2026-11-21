import { ayatBetween, type Ref } from '#lib/data/quran.js';
import type { Item } from '#lib/repeat/types.js';

export type DownloadFile = { url: string; item: number };
export type JobState = 'downloading' | 'paused' | 'complete' | 'error';
export type JobItem = { done: number; total: number; failed: boolean };
export type Job = {
	reciterId: string;
	state: JobState;
	items: JobItem[];
	done: number;
	total: number;
	/** Bytes saved so far in this job, and the estimated total. */
	bytes: number;
	estimate: number;
};

/** The parts of the Cache API the manager uses. */
export type CacheLike = Pick<Cache, 'match' | 'put' | 'keys'>;

export type DownloadDeps = {
	openCache: () => Promise<CacheLike>;
	fetcher: typeof fetch;
	urlFor: (reciterId: string, ref: Ref) => string;
	/** Save the surah texts (and word timings) for offline use; failures don't stop the audio download. */
	saveText?: (surahs: number[], reciterId: string) => Promise<unknown>;
	concurrency?: number;
	/** Rough size per ayah for the estimate before any file has arrived. */
	bytesPerAyah?: (reciterId: string) => number;
};

const BASMALAH: Ref = { s: 1, a: 1 };
const RETRIES = 2;

/**
 * Every audio file a playlist needs, each once, attributed to the first item that uses it.
 * Includes the Basmalah clip when an item contains ayah 1 of a surah other than 1 and 9.
 */
export function filesFor(items: Item[], reciterId: string, urlFor: DownloadDeps['urlFor']): DownloadFile[] {
	const seen = new Set<string>();
	const out: DownloadFile[] = [];
	const add = (url: string, item: number) => {
		if (seen.has(url)) return;
		seen.add(url);
		out.push({ url, item });
	};
	items.forEach((it, i) => {
		for (const ref of ayatBetween(it.start, it.end)) {
			if (ref.a === 1 && ref.s !== 1 && ref.s !== 9) add(urlFor(reciterId, BASMALAH), i);
			add(urlFor(reciterId, ref), i);
		}
	});
	return out;
}

export function surahsOf(items: Item[]): number[] {
	const set = new Set<number>();
	for (const it of items) for (let s = it.start.s; s <= it.end.s; s++) set.add(s);
	return [...set];
}

/**
 * Downloads a playlist's audio into Cache Storage. One job at a time; `onChange` receives a fresh
 * copy of the job after every change.
 */
export class DownloadManager {
	private job: Job | null = null;
	private files: DownloadFile[] = [];
	private cached = new Set<string>();
	private cachedLoaded: Promise<void> | null = null;
	private ctrl: AbortController | null = null;

	constructor(
		private deps: DownloadDeps,
		private onChange: (job: Job | null) => void = () => {}
	) {}

	/** URLs already in the cache (loaded once, then kept in sync). */
	private loadCached(): Promise<void> {
		this.cachedLoaded ??= this.deps
			.openCache()
			.then((c) => c.keys())
			.then((reqs) => reqs.forEach((r) => this.cached.add(r.url)))
			.catch(() => {});
		return this.cachedLoaded;
	}

	/** How much of a playlist is already saved. */
	async status(items: Item[], reciterId: string): Promise<{ saved: number; total: number }> {
		await this.loadCached();
		const files = filesFor(items, reciterId, this.deps.urlFor);
		return { saved: files.filter((f) => this.cached.has(f.url)).length, total: files.length };
	}

	current(): Job | null {
		return this.job && structuredClone(this.job);
	}

	async start(items: Item[], reciterId: string): Promise<void> {
		this.stopWorkers();
		await this.loadCached();
		this.files = filesFor(items, reciterId, this.deps.urlFor);
		const perItem = items.map(() => ({ done: 0, total: 0, failed: false }));
		for (const f of this.files) {
			perItem[f.item].total++;
			if (this.cached.has(f.url)) perItem[f.item].done++;
		}
		const done = perItem.reduce((a, i) => a + i.done, 0);
		this.job = {
			reciterId,
			state: 'downloading',
			items: perItem,
			done,
			total: this.files.length,
			bytes: 0,
			estimate: (this.files.length - done) * (this.deps.bytesPerAyah?.(reciterId) ?? 200_000)
		};
		this.deps.saveText?.(surahsOf(items), reciterId).catch(() => {});
		await this.run();
	}

	pause() {
		if (this.job?.state !== 'downloading') return;
		this.stopWorkers();
		this.update({ state: 'paused' });
	}

	/** Resume after a pause, or retry after an error: only missing files are fetched. */
	async resume(): Promise<void> {
		if (!this.job || this.job.state === 'downloading' || this.job.state === 'complete') return;
		this.job.items.forEach((i) => (i.failed = false));
		this.update({ state: 'downloading' });
		await this.run();
	}

	/** Stop and forget the job. Files already saved stay saved. */
	cancel() {
		this.stopWorkers();
		this.job = null;
		this.onChange(null);
	}

	private stopWorkers() {
		this.ctrl?.abort();
		this.ctrl = null;
	}

	private async run(): Promise<void> {
		const job = this.job!;
		const ctrl = (this.ctrl = new AbortController());
		const queue = this.files.filter((f) => !this.cached.has(f.url));
		if (!queue.length) return this.update({ state: 'complete' });
		const cache = await this.deps.openCache();
		let failed = false;

		const worker = async () => {
			while (queue.length && !ctrl.signal.aborted && !failed) {
				const file = queue.shift()!;
				try {
					const size = await this.fetchOne(cache, file.url, ctrl.signal);
					if (ctrl.signal.aborted) return;
					this.cached.add(file.url);
					job.items[file.item].done++;
					job.done++;
					job.bytes += size;
					// Re-estimate from what has actually arrived.
					const avg = job.bytes / Math.max(1, job.done - (job.total - this.files.length));
					job.estimate = job.bytes + (job.total - job.done) * avg;
					this.emit();
				} catch {
					if (ctrl.signal.aborted) return;
					failed = true;
					job.items[file.item].failed = true;
				}
			}
		};

		await Promise.all(Array.from({ length: this.deps.concurrency ?? 4 }, worker));
		if (ctrl.signal.aborted || this.job !== job) return;
		this.ctrl = null;
		this.update({ state: failed ? 'error' : 'complete' });
	}

	private async fetchOne(cache: CacheLike, url: string, signal: AbortSignal): Promise<number> {
		for (let attempt = 0; ; attempt++) {
			try {
				const res = await this.deps.fetcher(url, { signal });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const blob = await res.blob();
				const type = res.headers.get('Content-Type') ?? 'audio/mpeg';
				await cache.put(url, new Response(blob, { headers: { 'Content-Type': type, 'Content-Length': String(blob.size) } }));
				return blob.size;
			} catch (e) {
				if (signal.aborted || attempt >= RETRIES) throw e;
			}
		}
	}

	private update(patch: Partial<Job>) {
		if (!this.job) return;
		Object.assign(this.job, patch);
		this.emit();
	}

	private emit() {
		this.onChange(this.current());
	}
}
