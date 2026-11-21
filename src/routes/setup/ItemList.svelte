<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action';
	import Stepper from '#lib/components/Stepper.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { detail, title } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { LIMITS } from '#lib/repeat/draft.js';
	import type { Item } from '#lib/repeat/types.js';
	import { editDraft } from '#lib/stores/draft.svelte.js';

	let { items, addHref }: { items: Item[]; addHref: string } = $props();

	const FLIP_MS = 150;

	// The drag library reorders a local copy while dragging; the draft is updated on drop.
	let list = $state.raw<Item[]>([]);
	$effect.pre(() => {
		list = items;
	});

	const consider = (e: CustomEvent<DndEvent<Item>>) => (list = e.detail.items);
	const finalize = (e: CustomEvent<DndEvent<Item>>) => {
		list = e.detail.items;
		editDraft.setItems(e.detail.items);
	};
</script>

<div class="list">
	<ol
		use:dragHandleZone={{ items: list, flipDurationMs: FLIP_MS, dropTargetStyle: {}, type: 'playlist' }}
		onconsider={consider}
		onfinalize={finalize}
	>
		{#each list as item, i (item.id)}
			{@const name = title(item)}
			<li animate:flip={{ duration: FLIP_MS }}>
				<span class="grip" use:dragHandle aria-label={m.reorder_item({ name })}>
					<Icon name="grip" size={18} />
				</span>
				<span class="text">
					<span class="name">{i + 1}. {name}</span>
					<span class="detail">{detail(item)}</span>
				</span>
				<Stepper
					compact
					value={item.loops}
					display="{item.loops}×"
					max={LIMITS.itemLoops}
					label={m.item_loops({ name })}
					decLabel={m.fewer_loops({ name })}
					incLabel={m.more_loops({ name })}
					onchange={(v) => editDraft.setItemLoops(item.id, v)}
				/>
				<button type="button" class="remove" aria-label={m.remove_item({ name })} onclick={() => editDraft.removeItem(item.id)}>
					<Icon name="close" size={18} />
				</button>
			</li>
		{/each}
	</ol>
	<a class="add" href={addHref}><Icon name="plus" size={16} stroke={2.4} />{m.add_item()}</a>
</div>
<p class="hint">{m.item_hint()}</p>

<style>
	.list {
		margin: 14px var(--gutter) 0;
		overflow: hidden;
		border: 1px solid transparent;
		box-shadow: var(--shadow-card);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		align-items: center;
		gap: 6px;
		min-height: 68px;
		padding: 0 6px 0 2px;
		border-bottom: 1px solid var(--line-soft);
		background: var(--surface);
	}
	.grip {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 36px;
		height: var(--tap);
		border-radius: var(--r-sm);
		color: var(--border-strong);
		cursor: grab;
		touch-action: none; /* let the drag library own touch moves on the handle */
	}
	.grip:focus-visible {
		color: var(--accent);
	}
	.text {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 2px;
	}
	.name {
		overflow: hidden;
		font-size: 15px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.detail {
		overflow: hidden;
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.remove {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--tap);
		height: var(--tap);
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--muted);
	}
	.add {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 52px;
		font-size: 14px;
		font-weight: 600;
	}
	.hint {
		margin: 8px calc(var(--gutter) + 4px) 0;
		font-size: 12px;
		color: var(--muted);
	}
</style>
