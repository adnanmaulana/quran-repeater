<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource/amiri/arabic-400.css';
	import '#lib/design/tokens.css';
	import '#lib/design/global.css';
	import favicon from '#lib/assets/favicon.svg';
	import { i18n } from '#lib/i18n.svelte.js';
	import { restoreSession } from '#lib/player/player.svelte.js';
	import { applyDocumentSettings, settings } from '#lib/stores/settings.svelte.js';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	$effect(() => applyDocumentSettings(settings.value));
	onMount(restoreSession);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0A6B57" />
	<title>Quran Repeater</title>
</svelte:head>

<!-- Paraglide messages read the locale when called, so re-render the tree when it changes. -->
{#key i18n.locale}
	{@render children()}
{/key}
