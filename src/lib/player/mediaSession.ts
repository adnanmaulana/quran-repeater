export type MediaMeta = { title: string; artist: string; album: string; artwork: string };
export type MediaActions = { play(): void; pause(): void; next(): void; prev(): void; stop(): void };

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

/** Lock-screen / notification controls: previous and next move by ayah. */
export function bindMediaActions(actions: MediaActions) {
	if (!supported()) return;
	const ms = navigator.mediaSession;
	const handlers: [MediaSessionAction, () => void][] = [
		['play', actions.play],
		['pause', actions.pause],
		['previoustrack', actions.prev],
		['nexttrack', actions.next],
		['stop', actions.stop]
	];
	for (const [action, fn] of handlers) {
		try {
			ms.setActionHandler(action, fn);
		} catch {
			// Action not supported by this browser.
		}
	}
}

let lastKey = '';

export function updateMediaSession(meta: MediaMeta | null, playing: boolean) {
	if (!supported()) return;
	const ms = navigator.mediaSession;
	ms.playbackState = meta ? (playing ? 'playing' : 'paused') : 'none';
	if (!meta) {
		ms.metadata = null;
		lastKey = '';
		return;
	}
	const key = `${meta.title}|${meta.artist}|${meta.album}`;
	if (key === lastKey) return; // avoid re-rendering the lock screen on every state change
	lastKey = key;
	ms.metadata = new MediaMetadata({
		title: meta.title,
		artist: meta.artist,
		album: meta.album,
		artwork: [{ src: meta.artwork, sizes: '512x512' }]
	});
}

export function updatePositionState(duration: number, position: number, playbackRate: number) {
	if (!supported() || !navigator.mediaSession.setPositionState) return;
	if (!Number.isFinite(duration) || duration <= 0) return;
	try {
		navigator.mediaSession.setPositionState({ duration, position: Math.min(position, duration), playbackRate });
	} catch {
		/* invalid state during source changes */
	}
}
