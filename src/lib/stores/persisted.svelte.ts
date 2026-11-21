/** Minimal slice of the Web Storage API, so tests can pass an in-memory store. */
export type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type Envelope<T> = { v: number; data: T };

export type PersistedOptions<T> = {
	/** Bump when the stored shape changes; `migrate` receives the old data and version. */
	version?: number;
	migrate?: (old: unknown, fromVersion: number) => T;
	storage?: KV;
};

function defaultStorage(): KV | undefined {
	try {
		return typeof localStorage === 'undefined' ? undefined : localStorage;
	} catch {
		return undefined; // e.g. blocked storage in a private window
	}
}

/**
 * Reactive state backed by localStorage, under `qr.<key>`. Reads once at creation, writes on
 * every `set`/`update`. If storage is missing, full or blocked, it keeps working in memory.
 */
export function persisted<T>(key: string, initial: T, opts: PersistedOptions<T> = {}) {
	const storage = opts.storage ?? defaultStorage();
	const version = opts.version ?? 1;
	const fullKey = `qr.${key}`;

	let value = $state<T>(load());

	function load(): T {
		try {
			const raw = storage?.getItem(fullKey);
			if (!raw) return initial;
			const env = JSON.parse(raw) as Envelope<unknown>;
			if (env.v === version) return env.data as T;
			return opts.migrate ? opts.migrate(env.data, env.v) : initial;
		} catch {
			return initial;
		}
	}

	function save() {
		try {
			storage?.setItem(fullKey, JSON.stringify({ v: version, data: $state.snapshot(value) }));
		} catch {
			// Quota exceeded or storage blocked: keep the in-memory value.
		}
	}

	return {
		get value(): T {
			return value;
		},
		set(next: T) {
			value = next;
			save();
		},
		update(fn: (prev: T) => T) {
			value = fn($state.snapshot(value) as T);
			save();
		},
		reset() {
			value = initial;
			try {
				storage?.removeItem(fullKey);
			} catch {
				/* ignore */
			}
		}
	};
}
