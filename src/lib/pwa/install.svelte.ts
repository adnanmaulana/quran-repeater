import { track } from '#lib/analytics/analytics.js';

/** Chrome/Edge/Samsung fire this with a prompt we can show later. */
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

let deferred: BeforeInstallPromptEvent | null = null;

export const install = $state({
	/** Running as an installed app (home-screen icon). */
	installed: false,
	/** The browser offered an install prompt we can trigger from a button. */
	canPrompt: false,
	/** iOS/iPadOS Safari: install only through Share → Add to Home Screen. */
	ios: false
});

export function initInstall() {
	if (typeof window === 'undefined') return;
	const standalone = () =>
		window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
	install.installed = standalone();
	const ua = navigator.userAgent;
	install.ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault(); // show our own button instead of the mini-infobar
		deferred = e as BeforeInstallPromptEvent;
		install.canPrompt = true;
	});
	window.addEventListener('appinstalled', () => {
		track('app_installed');
		install.installed = true;
		install.canPrompt = false;
		deferred = null;
	});
}

/** `from`: which button asked (the home banner or Settings). */
export async function promptInstall(from: 'banner' | 'settings'): Promise<boolean> {
	if (!deferred) return false;
	await deferred.prompt();
	const { outcome } = await deferred.userChoice;
	track('install_prompt', { from, outcome });
	deferred = null;
	install.canPrompt = false;
	return outcome === 'accepted';
}
