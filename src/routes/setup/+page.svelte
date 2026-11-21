<script lang="ts">
	import { resolve } from '$app/paths';
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { itemAyat, itemTitle } from '#lib/repeat/types.js';
	import { draft } from '#lib/stores/draft.svelte.js';

	const juzLabel = (n: number) => m.juz_label({ n });
</script>

<svelte:head><title>{m.set_up_repeat()} · {m.app_name()}</title></svelte:head>

<ScreenHeader title={m.set_up_repeat()} backHref={resolve('/(tabs)')} />

<!-- Phase 2 replaces this with the playlist editor from the design. -->
<ol class="items">
	{#each draft.value.items as item, i (item.id)}
		<li>
			<span class="title">{i + 1}. {itemTitle(item, juzLabel)}</span>
			<span class="meta">{m.ayat_count({ count: itemAyat(item) })}</span>
		</li>
	{/each}
</ol>
<ComingSoon />

<style>
	.items {
		margin: 16px var(--gutter) 0;
		padding: 4px 16px;
		list-style: none;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	li {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 0;
		border-bottom: 1px solid var(--line-soft);
	}
	li:last-child {
		border-bottom: 0;
	}
	.title {
		font-weight: 600;
	}
	.meta {
		font-size: 12px;
		color: var(--muted);
	}
</style>
