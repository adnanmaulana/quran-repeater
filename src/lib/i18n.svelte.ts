import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js';

export { locales, type Locale };

let current = $state<Locale>(getLocale());

if (typeof document !== 'undefined') document.documentElement.lang = current;

/**
 * Reactive wrapper around Paraglide's locale. Switching never reloads the page (that would stop
 * playback); the root layout re-renders under `{#key i18n.locale}` instead.
 */
export const i18n = {
	get locale(): Locale {
		return current;
	},
	set(locale: Locale) {
		if (locale === current) return;
		setLocale(locale, { reload: false });
		current = locale;
		document.documentElement.lang = locale;
	}
};
