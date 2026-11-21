// Event tracking via the self-hosted, cookie-free tracker (monitoring-tools, t.js).
//
// Location (country, region, city) and device (type, browser, OS) are added by the tracker's
// server to every event, from the IP (GeoIP, IP then dropped) and the user agent. The app adds
// only what the server cannot see: whether it runs as the installed app, the screen class and
// the UI language. No browser geolocation: Permissions-Policy turns it off, and city level is
// enough.

import { itemAyat, type RepeatConfig } from '#lib/repeat/types.js';

export type Props = Record<string, string | number | boolean>;
type TrackFn = ((name: string, props?: Props) => void) & { q?: unknown[][] };

declare global {
	interface Window {
		track?: TrackFn;
	}
}

/** Site id registered with the tracker (its `sites` table). */
export const SITE = 'quran-repeater';
const DEFAULT_URL = 'https://tracker.adnanradjam.com';

/**
 * Tracker origin, or null when tracking is off. Production builds track by default;
 * `VITE_ANALYTICS_URL` overrides it, and `off` (or any build that is not production) disables it.
 */
export function trackerUrl(env: { PROD: boolean; VITE_ANALYTICS_URL?: string } = import.meta.env): string | null {
	const v = env.VITE_ANALYTICS_URL?.trim();
	if (v === 'off' || v === '') return null;
	if (v) return v.replace(/\/+$/, '');
	return env.PROD ? DEFAULT_URL : null;
}

let loaded = false;

/** Add t.js to the page once. Events tracked before it loads wait in its queue. */
export function loadTracker(url = trackerUrl()) {
	if (loaded || !url || typeof document === 'undefined') return;
	loaded = true;
	const w = window;
	w.track ??= Object.assign((...args: unknown[]) => (w.track!.q ??= []).push(args), {}) as TrackFn;
	const s = document.createElement('script');
	s.defer = true;
	s.src = `${url}/t.js`;
	s.dataset.site = SITE;
	document.head.appendChild(s);
}

/** Track an event. A no-op when tracking is off. Never throws: analytics must not break the app. */
export function track(name: string, props: Props = {}) {
	try {
		if (!loaded) return;
		window.track?.(name, { ...deviceProps(), ...props });
	} catch {
		/* ignore */
	}
}

/** Device context the server cannot infer from the user agent. */
export function deviceProps(w: Pick<Window, 'matchMedia' | 'navigator' | 'innerWidth' | 'document'> = window): Props {
	const standalone = w.matchMedia('(display-mode: standalone)').matches || (w.navigator as Navigator & { standalone?: boolean }).standalone === true;
	return {
		display: standalone ? 'app' : 'browser',
		screen: w.innerWidth < 600 ? 'phone' : w.innerWidth < 1024 ? 'tablet' : 'desktop',
		lang: w.document.documentElement.lang || 'id'
	};
}

/** What is being repeated: the shape of a repeat, not which ayat (kept coarse on purpose). */
export function configProps(c: RepeatConfig): Props {
	const kinds = new Set(c.items.map((i) => i.source.kind));
	return {
		items: c.items.length,
		ayat: c.items.reduce((n, i) => n + itemAyat(i), 0),
		kind: kinds.size === 1 ? [...kinds][0] : 'mixed',
		reciter: c.reciterId,
		per_ayah: c.perAyah,
		loops: c.listLoops === 'infinite' ? 'infinite' : c.listLoops,
		speed: c.speed,
		gap: c.gapMs / 1000
	};
}
