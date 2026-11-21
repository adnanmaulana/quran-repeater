<script lang="ts">
	import '@fontsource-variable/inter';
	import '@fontsource/amiri/arabic-400.css';
	import '#lib/design/tokens.css';
	import '#lib/design/global.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0A6B57" />
	<title>Quran Repeater</title>
</svelte:head>

{@render children()}
