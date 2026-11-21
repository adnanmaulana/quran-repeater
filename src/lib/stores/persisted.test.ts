import { describe, expect, it } from 'vitest';
import { persisted, type KV } from './persisted.svelte.js';

function memory(): KV & { dump: Map<string, string> } {
	const dump = new Map<string, string>();
	return {
		dump,
		getItem: (k) => dump.get(k) ?? null,
		setItem: (k, v) => void dump.set(k, v),
		removeItem: (k) => void dump.delete(k)
	};
}

describe('persisted', () => {
	it('starts from the initial value and writes a versioned envelope', () => {
		const storage = memory();
		const p = persisted('x', { a: 1 }, { storage });
		expect(p.value).toEqual({ a: 1 });
		p.set({ a: 2 });
		expect(JSON.parse(storage.dump.get('qr.x')!)).toEqual({ v: 1, data: { a: 2 } });
	});

	it('reads back what was saved', () => {
		const storage = memory();
		persisted('x', { a: 1 }, { storage }).update((o) => ({ a: o.a + 5 }));
		expect(persisted('x', { a: 1 }, { storage }).value).toEqual({ a: 6 });
	});

	it('migrates older versions and falls back on bad data', () => {
		const storage = memory();
		storage.setItem('qr.x', JSON.stringify({ v: 1, data: { a: 3 } }));
		const migrated = persisted('x', { a: 0, b: 0 }, { storage, version: 2, migrate: (o) => ({ ...(o as { a: number }), b: 9 }) });
		expect(migrated.value).toEqual({ a: 3, b: 9 });

		storage.setItem('qr.y', '{not json');
		expect(persisted('y', 'fallback', { storage }).value).toBe('fallback');
	});

	it('keeps working in memory when storage throws', () => {
		const broken: KV = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('quota');
			},
			removeItem: () => {}
		};
		const p = persisted('z', 1, { storage: broken });
		p.set(2);
		expect(p.value).toBe(2);
	});
});
