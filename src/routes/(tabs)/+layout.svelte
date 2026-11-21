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

<!-- The nav stays mounted; multi-select hides it while the selection bar takes its place. -->
<div class="dock" class:selecting={ui.hideNav}>
	{#if !ui.hideNav}<MiniPlayer />{/if}
	<BottomNav />
</div>

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
		/* Its own view-transition layer: it holds still while the screen above it changes. */
		view-transition-name: dock;
	}
	.dock :global(nav) {
		position: static;
	}
	.dock.selecting :global(nav) {
		display: none;
	}

	/* Tablets and desktops: content and mini player in a centred column; the nav stays at the bottom. */
	@media (min-width: 768px) {
		main {
			max-width: var(--column);
		}
		.dock :global(.mini) {
			max-width: var(--column);
			margin: 0 auto 8px;
		}
	}
</style>
