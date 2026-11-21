/** Resolves audio URLs to something the <audio> element can play, prefetching upcoming files. */
export interface Loader {
	/** A ready blob URL if this file was prefetched, otherwise the network URL (streams). */
	resolve(url: string): string;
	/** Start downloading these files in the background. */
	prefetch(urls: string[]): void;
	clear(): void;
}

/**
 * Keeps the next few ayat in memory as blob URLs, so the next play starts instantly and does not
 * depend on the network at that moment. Phase 4 adds a Cache Storage layer for offline use.
 */
export class BlobLoader implements Loader {
	private ready = new Map<string, string>(); // network URL → blob URL, in insertion (LRU) order
	private pending = new Map<string, AbortController>();

	constructor(
		private fetcher: typeof fetch = (...a) => fetch(...a),
		private max = 6
	) {}

	resolve(url: string): string {
		const blob = this.ready.get(url);
		if (!blob) return url;
		// Mark as most recently used.
		this.ready.delete(url);
		this.ready.set(url, blob);
		return blob;
	}

	prefetch(urls: string[]): void {
		for (const url of urls) {
			if (this.ready.has(url) || this.pending.has(url) || url.startsWith('blob:')) continue;
			const ctrl = new AbortController();
			this.pending.set(url, ctrl);
			this.fetcher(url, { signal: ctrl.signal })
				.then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
				.then((b) => {
					this.ready.set(url, URL.createObjectURL(b));
					this.evict();
				})
				.catch(() => {}) // fall back to streaming from the network URL
				.finally(() => this.pending.delete(url));
		}
	}

	private evict() {
		while (this.ready.size > this.max) {
			const [oldest, blob] = this.ready.entries().next().value!;
			this.ready.delete(oldest);
			// Revoke later, in case the <audio> element is still reading the file.
			setTimeout(() => URL.revokeObjectURL(blob), 60_000);
		}
	}

	clear(): void {
		this.pending.forEach((c) => c.abort());
		this.pending.clear();
		this.ready.forEach((b) => URL.revokeObjectURL(b));
		this.ready.clear();
	}
}
