<script lang="ts">
	import BottomNav from '#lib/components/BottomNav.svelte';
	import { ui } from '#lib/stores/ui.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<main>
	{@render children()}
</main>

{#if !ui.hideNav}
	<BottomNav />
{/if}

<style>
	main {
		max-width: 560px;
		margin: 0 auto;
		/* Room for the fixed bottom nav or selection bar. */
		padding-bottom: calc(var(--nav-h) + 40px + env(safe-area-inset-bottom));
	}
</style>
