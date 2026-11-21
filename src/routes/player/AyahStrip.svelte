<script lang="ts">
	import { fromGlobal, globalIndex } from '#lib/data/quran.js';
	import { m } from '#lib/paraglide/messages.js';
	import { itemAyat, type Item } from '#lib/repeat/types.js';

	let { item, current, onjump }: { item: Item; current: number; onjump: (i: number) => void } = $props();

	/** Only render a window around the current ayah: a juz has 500+ ayat. */
	const WINDOW = 40;
	const count = $derived(itemAyat(item));
	const from = $derived(Math.max(0, Math.min(current - WINDOW / 2, count - WINDOW)));
	const indexes = $derived(Array.from({ length: Math.min(WINDOW, count) }, (_, i) => from + i));
	const first = $derived(globalIndex(item.start));

	let strip: HTMLDivElement;
	$effect(() => {
		void current;
		strip?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
	});
</script>

<div class="strip" bind:this={strip} role="group" aria-label={m.ayat_in_item()}>
	{#each indexes as i (i)}
		{@const ref = fromGlobal(first + i)}
		<button
			type="button"
			aria-current={i === current}
			class:done={i < current}
			aria-label={m.jump_to_ayah({ ref: `${ref.s}:${ref.a}` })}
			onclick={() => onjump(i)}>{ref.a}</button
		>
	{/each}
</div>

<style>
	.strip {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		padding: 2px 0;
		scrollbar-width: none;
		scroll-snap-type: x proximity;
	}
	.strip::-webkit-scrollbar {
		display: none;
	}
	button {
		flex: 0 0 auto;
		min-width: 44px;
		height: 44px;
		padding: 0 8px;
		border: 1px solid var(--night-line);
		border-radius: var(--r-sm);
		background: transparent;
		color: var(--night-muted);
		font-size: 13px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		scroll-snap-align: center;
	}
	button.done {
		background: var(--night-3);
		color: var(--night-ink);
	}
	button[aria-current='true'] {
		border-color: var(--night-accent);
		background: var(--night-accent);
		color: var(--night);
	}
</style>
