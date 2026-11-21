import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import id from '../../messages/id.json';

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('messages', () => {
	it('English and Indonesian have the same keys', () => {
		expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
	});

	it('every message uses the same placeholders in both languages', () => {
		for (const [key, value] of Object.entries(en)) {
			if (key === '$schema') continue;
			expect(params((id as Record<string, string>)[key]), key).toEqual(params(value));
		}
	});
});
