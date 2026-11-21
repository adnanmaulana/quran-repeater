import { describe, expect, it } from 'vitest';
import { itemFromJuz, itemFromRange, itemFromSurah, type RepeatConfig } from '#lib/repeat/types.js';
import { configProps, deviceProps, trackerUrl } from './analytics.js';

describe('trackerUrl', () => {
	it('tracks production builds by default', () => {
		expect(trackerUrl({ PROD: true })).toBe('https://tracker.adnanradjam.com');
	});
	it('is off in dev unless a URL is given', () => {
		expect(trackerUrl({ PROD: false })).toBeNull();
		expect(trackerUrl({ PROD: false, VITE_ANALYTICS_URL: 'http://localhost:8080/' })).toBe('http://localhost:8080');
	});
	it('can be turned off for a production build', () => {
		expect(trackerUrl({ PROD: true, VITE_ANALYTICS_URL: 'off' })).toBeNull();
	});
});

describe('configProps', () => {
	const base: Omit<RepeatConfig, 'items'> = { perAyah: 3, listLoops: 'infinite', gapMs: 1000, speed: 1, reciterId: 'alafasy' };

	it('describes a single-kind repeat', () => {
		expect(configProps({ ...base, items: [itemFromSurah(1), itemFromSurah(112)] })).toEqual({
			items: 2,
			ayat: 7 + 4,
			kind: 'surah',
			reciter: 'alafasy',
			per_ayah: 3,
			loops: 'infinite',
			speed: 1,
			gap: 1
		});
	});

	it('calls a mix of sources mixed', () => {
		const items = [itemFromJuz(30), itemFromRange({ s: 2, a: 255 }, { s: 2, a: 257 })];
		expect(configProps({ ...base, listLoops: 2, items })).toMatchObject({ kind: 'mixed', loops: 2, items: 2 });
	});
});

describe('deviceProps', () => {
	const win = (width: number, standalone: boolean) =>
		({
			innerWidth: width,
			matchMedia: () => ({ matches: standalone }),
			navigator: {},
			document: { documentElement: { lang: 'en' } }
		}) as unknown as Window;

	it('reports the installed app on a phone', () => {
		expect(deviceProps(win(390, true))).toEqual({ display: 'app', screen: 'phone', lang: 'en' });
	});
	it('reports a desktop browser', () => {
		expect(deviceProps(win(1440, false))).toMatchObject({ display: 'browser', screen: 'desktop' });
	});
});
