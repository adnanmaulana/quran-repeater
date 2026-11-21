import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';
import { AUDIO_CACHE, AUDIO_ORIGIN, SHELL_PREFIX } from '#lib/offline/caches.js';
import { partialResponse } from '#lib/offline/range.js';

declare const self: ServiceWorkerGlobalScope;

const SHELL = `${SHELL_PREFIX}${version}`;
/** The SPA entry: every route renders from this one page. */
const ENTRY = '/';
// Manifest paths are relative to the base path ("_app/immutable/…"); make them absolute so they
// match request URLs.
const ASSETS = new Set([...immutable, ...assets].map((f) => new URL(f.path, self.location.href).pathname));

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(SHELL);
			await cache.addAll([ENTRY, ...ASSETS]);
			// A new version takes over straight away: hashed assets never clash, and the entry is
			// network-first, so an open tab keeps working.
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith(SHELL_PREFIX) && key !== SHELL) await caches.delete(key);
			}
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);

	if (url.origin === self.location.origin) {
		if (ASSETS.has(url.pathname)) return event.respondWith(cacheFirst(SHELL, req));
		if (req.mode === 'navigate') return event.respondWith(entryNetworkFirst(req));
		return;
	}

	if (url.origin === AUDIO_ORIGIN) return event.respondWith(audio(req));
	// Everything else (the text API) goes to the network; the app caches surah text in IndexedDB.
});

async function cacheFirst(cacheName: string, req: Request): Promise<Response> {
	const hit = await caches.match(req, { cacheName });
	return hit ?? fetch(req);
}

/** How long a page request may wait on the network before the cached app is shown instead. */
const NETWORK_TIMEOUT_MS = 3000;

/**
 * Pages: try the network (fresh deploys), but fall back to the cached entry when offline or when
 * the network hangs ("lie-fi"), so the app always opens quickly.
 */
async function entryNetworkFirst(req: Request): Promise<Response> {
	const cached = await caches.match(ENTRY, { cacheName: SHELL });
	const network = fetch(req).then(async (res) => {
		if (res.ok && new URL(req.url).pathname === ENTRY) await (await caches.open(SHELL)).put(ENTRY, res.clone());
		return res;
	});
	if (!cached) return network;
	const timeout = new Promise<Response>((resolve) => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
	return Promise.race([network.catch(() => cached), timeout]);
}

/** Downloaded recitations come from the cache, with byte ranges for the <audio> element. */
async function audio(req: Request): Promise<Response> {
	const hit = await caches.match(req.url, { cacheName: AUDIO_CACHE });
	if (!hit) return fetch(req);
	const range = req.headers.get('Range');
	return range ? partialResponse(hit, range) : hit;
}
