<script lang="ts">
	import Icon from '#lib/design/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { install, promptInstall } from '#lib/pwa/install.svelte.js';
	import { persisted } from '#lib/stores/persisted.svelte.js';

	/** After "Not now" the banner stays away for a while, then asks once more. */
	const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
	const banner = persisted('installBanner', { dismissedAt: 0 });

	const snoozed = $derived(Date.now() - banner.value.dismissedAt < SNOOZE_MS);
	// Only offer it where the user can act on it: a browser install prompt, or Safari's Add to Home Screen.
	const show = $derived(!install.installed && !snoozed && (install.canPrompt || install.ios));

	const dismiss = () => banner.set({ dismissedAt: Date.now() });
</script>

{#if show}
	<aside class="banner" aria-label={m.install_title()}>
		<span class="icon"><Icon name="phone" size={22} /></span>
		<div class="text">
			<b>{m.install_banner_title()}</b>
			<small>{install.canPrompt ? m.install_banner_text() : m.install_ios()}</small>
		</div>
		{#if install.canPrompt}
			<button type="button" class="action" onclick={promptInstall}>{m.install_button()}</button>
		{/if}
		<button type="button" class="close" onclick={dismiss} aria-label={m.install_dismiss()}>
			<Icon name="close" size={18} />
		</button>
	</aside>
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 12px var(--gutter) 0;
		padding: 12px 8px 12px 14px;
		background: var(--accent-tint);
		border-radius: var(--r-lg);
	}
	.icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent-ink);
	}
	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.text b {
		font-size: 15px;
		font-weight: 600;
	}
	.text small {
		font-size: 13px;
		color: var(--muted);
	}
	.action {
		flex-shrink: 0;
		min-height: 36px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: var(--accent);
		color: var(--on-accent);
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.close {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: var(--tap);
		height: var(--tap);
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}
</style>
