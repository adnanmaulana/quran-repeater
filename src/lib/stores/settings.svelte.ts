import { DEFAULT_RECITER } from '#lib/data/reciters.js';
import { persisted } from './persisted.svelte.js';

export type ArSize = 'S' | 'M' | 'L';
export type Theme = 'system' | 'light' | 'dark';

/** Language is owned by Paraglide (`qr.lang`), so it is not duplicated here. */
export type Settings = {
	reciterId: string;
	speed: number;
	gapMs: number;
	arSize: ArSize;
	theme: Theme;
	/** null = follow the UI language (Sahih International for EN, Kemenag for ID). */
	translation: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
	reciterId: DEFAULT_RECITER,
	speed: 1,
	gapMs: 1000,
	arSize: 'M',
	theme: 'light',
	translation: null
};

export const settings = persisted<Settings>('settings', DEFAULT_SETTINGS, {
	// Fill in fields added in later versions instead of dropping the user's choices.
	migrate: (old) => ({ ...DEFAULT_SETTINGS, ...(old as Partial<Settings>) })
});

export function translationFor(lang: string, s: Settings = settings.value): string {
	return s.translation ?? (lang === 'id' ? 'id.indonesian' : 'en.sahih');
}

/** Reflect theme and Arabic size on <html>, where tokens.css picks them up. */
export function applyDocumentSettings(s: Settings) {
	const el = document.documentElement;
	if (s.theme === 'system') delete el.dataset.theme;
	else el.dataset.theme = s.theme;
	el.dataset.arSize = s.arSize;
}
