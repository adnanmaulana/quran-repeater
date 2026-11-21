import { track } from '#lib/analytics/analytics.js';
import { audioUrl, reciter } from '#lib/data/reciters.js';
import { surah } from '#lib/data/quran.js';
import { loadSurahText } from '#lib/data/text.js';
import { loadSurahTimings } from '#lib/data/timings.js';
import { i18n } from '#lib/i18n.svelte.js';
import { itemAyat, type Item } from '#lib/repeat/types.js';
import { settings, translationFor } from '#lib/stores/settings.svelte.js';
import { AUDIO_CACHE } from './caches.js';
import { DownloadManager, type Job } from './downloads.js';

/** Average recited ayah ≈ 12 s; bytes = bitrate × time. Only used until real sizes arrive. */
const bytesPerAyah = (reciterId: string) => (reciter(reciterId).kbps * 1000 * 12) / 8;

export const downloads = $state<{ job: Job | null }>({ job: null });

let manager: DownloadManager | null = null;
const dm = () =>
	(manager ??= new DownloadManager(
		{
			openCache: () => caches.open(AUDIO_CACHE),
			fetcher: (...a) => fetch(...a),
			urlFor: audioUrl,
			bytesPerAyah,
			saveText: (surahs, reciterId) => {
				const tr = translationFor(i18n.locale, settings.value);
				// The Basmalah clip's timings live with Al-Fatihah.
				const timed = [...new Set([1, ...surahs])];
				return Promise.all([
					...surahs.map((s) => loadSurahText(s, tr)),
					...timed.map((s) => loadSurahTimings(s, surah(s).ayat, reciterId).catch(() => null))
				]);
			}
		},
		(job) => {
			// One event per job outcome: complete, or stopped with files that failed.
			if (job && job.state !== downloads.job?.state && (job.state === 'complete' || job.state === 'error'))
				track('download_finish', { state: job.state, reciter: job.reciterId, files: job.total, mb: Math.round(job.bytes / 1e5) / 10 });
			downloads.job = job;
		}
	));

export const downloadActions = {
	async start(items: Item[], reciterId: string) {
		// Ask the browser not to evict downloads under storage pressure (granted silently on most
		// installed PWAs; a refusal still allows downloading).
		const persisted = await navigator.storage?.persist?.().catch(() => false);
		track('download_start', { items: items.length, ayat: items.reduce((n, i) => n + itemAyat(i), 0), reciter: reciterId, persisted: !!persisted });
		return dm().start(items, reciterId);
	},
	pause: () => dm().pause(),
	resume: () => dm().resume(),
	cancel: () => {
		track('download_cancel');
		dm().cancel();
	},
	status: (items: Item[], reciterId: string) => dm().status(items, reciterId),
	estimateBytes: (count: number, reciterId: string) => count * bytesPerAyah(reciterId)
};

/** Files and bytes in the download cache. */
export async function downloadedSummary(): Promise<{ files: number; bytes: number }> {
	try {
		const cache = await caches.open(AUDIO_CACHE);
		const reqs = await cache.keys();
		let bytes = 0;
		for (const r of reqs) bytes += Number((await cache.match(r))?.headers.get('Content-Length') ?? 0);
		return { files: reqs.length, bytes };
	} catch {
		return { files: 0, bytes: 0 };
	}
}

/** Delete every downloaded recitation (the app shell cache is untouched). */
export async function removeAllDownloads() {
	downloadActions.cancel();
	await caches.delete(AUDIO_CACHE);
	manager = null; // its in-memory index of saved files is now stale
}

/** Space used by this app on the device (all caches and IndexedDB), when the browser reports it. */
export async function storageUsage(): Promise<number | null> {
	try {
		return (await navigator.storage?.estimate?.())?.usage ?? null;
	} catch {
		return null;
	}
}

export function formatBytes(n: number): string {
	if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
	const mb = n / (1024 * 1024);
	return mb < 1024 ? `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB` : `${(mb / 1024).toFixed(1)} GB`;
}

/** EveryAyah folders that have at least one downloaded file. */
export async function downloadedFolders(): Promise<Set<string>> {
	try {
		const reqs = await (await caches.open(AUDIO_CACHE)).keys();
		return new Set(reqs.map((r) => new URL(r.url).pathname.split('/')[2]).filter(Boolean));
	} catch {
		return new Set();
	}
}
