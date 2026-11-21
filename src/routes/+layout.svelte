<script lang="ts">
	import '#lib/design/tokens.css';
	import '#lib/design/global.css';
	import { i18n } from '#lib/i18n.svelte.js';
	import { restoreSession } from '#lib/player/player.svelte.js';
	import { initInstall } from '#lib/pwa/install.svelte.js';
	import { applyDocumentSettings, settings } from '#lib/stores/settings.svelte.js';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	$effect(() => applyDocumentSettings(settings.value));
	onMount(() => {
		document.getElementById('splash')?.remove(); // the app is on screen now
		restoreSession();
		initInstall();
	});
</script>

<svelte:head>
	<meta name="theme-color" content="#0A6B57" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#0B1512" media="(prefers-color-scheme: dark)" />
	<title>Quran Repeater</title>
</svelte:head>

<!-- Paraglide messages read the locale when called, so re-render the tree when it changes. -->
{#key i18n.locale}
	{@render children()}
{/key}
