<script lang="ts">
	import Icon from '#lib/design/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { settings } from '#lib/stores/settings.svelte.js';
	import { MediaQuery } from 'svelte/reactivity';

	// With "System" chosen in Settings, the device decides which theme is showing.
	const deviceDark = new MediaQuery('(prefers-color-scheme: dark)', false);
	const dark = $derived(settings.value.theme === 'dark' || (settings.value.theme === 'system' && deviceDark.current));

	function toggle() {
		const theme = dark ? 'light' : 'dark';
		settings.update((s) => ({ ...s, theme }));
	}
</script>

<button type="button" class="toggle" onclick={toggle} aria-label={dark ? m.theme_to_light() : m.theme_to_dark()}>
	<Icon name={dark ? 'sun' : 'moon'} size={20} />
</button>

<style>
	.toggle {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		width: var(--tap);
		height: var(--tap);
		border: 1px solid var(--line);
		border-radius: 50%;
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow-card);
	}
</style>
