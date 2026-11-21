<script lang="ts">
	import BottomNav from '#lib/components/BottomNav.svelte';
	import MiniPlayer from '#lib/components/MiniPlayer.svelte';
	import { player } from '#lib/player/player.svelte.js';
	import { ui } from '#lib/stores/ui.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const hasSession = $derived(player.snap.config !== null);
</script>

<main class:with-mini={hasSession && !ui.hideNav}>
	{@render children()}
</main>

{#if !ui.hideNav}
	<div class="dock">
		<MiniPlayer />
		<BottomNav />
	</div>
{/if}

<style>
	main {
		max-width: 560px;
		margin: 0 auto;
		/* Room for the fixed bottom nav or selection bar. */
		padding-bottom: calc(var(--nav-h) + 40px + env(safe-area-inset-bottom));
	}
	main.with-mini {
		padding-bottom: calc(var(--nav-h) + 110px + env(safe-area-inset-bottom));
	}
	.dock {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
	}
	.dock :global(nav) {
		position: static;
	}
</style>
