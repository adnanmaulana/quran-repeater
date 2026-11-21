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

	// Browser chrome (status bar) matches the page background of the theme in use.
	const LIGHT_BG = '#f6f7f4';
	const DARK_BG = '#0c1110';
	const theme = $derived(settings.value.theme);
	onMount(() => {
		document.getElementById('splash')?.remove(); // the app is on screen now
		restoreSession();
		initInstall();
	});
</script>

<svelte:head>
	{#if theme === 'system'}
		<meta name="theme-color" content={LIGHT_BG} media="(prefers-color-scheme: light)" />
		<meta name="theme-color" content={DARK_BG} media="(prefers-color-scheme: dark)" />
	{:else}
		<meta name="theme-color" content={theme === 'dark' ? DARK_BG : LIGHT_BG} />
	{/if}
	<title>Quran Repeater</title>
</svelte:head>

<!-- Paraglide messages read the locale when called, so re-render the tree when it changes. -->
{#key i18n.locale}
	{@render children()}
{/key}
