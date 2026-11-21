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

<!-- The nav stays mounted: on phones multi-select hides it (the selection bar takes its place);
     on wider screens it is a side rail and stays visible. -->
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
	}
	.dock :global(nav) {
		position: static;
	}
	.dock.selecting :global(nav) {
		display: none;
	}

	@media (min-width: 768px) {
		main {
			max-width: calc(var(--column) + var(--rail-w));
			padding-left: var(--rail-w);
			padding-bottom: 48px;
		}
		main.with-mini {
			padding-bottom: 120px;
		}
		.dock {
			left: var(--rail-w);
			display: flex;
			justify-content: center;
			pointer-events: none; /* only the mini player itself takes taps */
		}
		.dock :global(.mini) {
			width: 100%;
			max-width: var(--column);
			margin-bottom: 16px;
			pointer-events: auto;
		}
		.dock :global(nav),
		.dock.selecting :global(nav) {
			position: fixed;
			display: flex;
			pointer-events: auto;
		}
	}
</style>
