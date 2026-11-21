import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js';

export { locales, type Locale };

const initial = getLocale();
let current = $state<Locale>(initial);

if (typeof document !== 'undefined') document.documentElement.lang = initial;

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
