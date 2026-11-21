<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '#lib/design/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	const items = [
		{ href: resolve('/(tabs)'), icon: 'book', label: m.nav_read() },
		{ href: resolve('/(tabs)/playlists'), icon: 'playlist', label: m.nav_playlists() },
		{ href: resolve('/(tabs)/history'), icon: 'history', label: m.nav_history() },
		{ href: resolve('/(tabs)/settings'), icon: 'settings', label: m.nav_settings() }
	] as const;
</script>

<nav aria-label={m.nav_main()}>
	{#each items as item (item.href)}
		{@const current = page.url.pathname === item.href}
		<a href={item.href} aria-current={current ? 'page' : undefined} class:current>
			<Icon name={item.icon} />
			<span>{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	nav {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		height: calc(var(--nav-h) + env(safe-area-inset-bottom));
		padding-bottom: calc(8px + env(safe-area-inset-bottom));
		background: var(--surface);
		border-top: 1px solid var(--line);
	}
	a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: var(--tap);
		font-size: 12px;
		font-weight: 500;
		color: var(--muted);
	}
	a.current {
		font-weight: 600;
		color: var(--accent);
	}

	/* Tablets and desktops: a vertical rail on the left. */
	@media (min-width: 768px) {
		nav {
			inset: 0 auto 0 0;
			display: flex;
			flex-direction: column;
			gap: 8px;
			width: var(--rail-w);
			height: auto;
			padding: 24px 0;
			border-top: 0;
			border-right: 1px solid var(--line);
		}
		a {
			height: 72px;
			margin: 0 10px;
			border-radius: 16px;
		}
		a.current {
			background: var(--accent-tint);
		}
	}
</style>
