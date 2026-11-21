<script lang="ts">
	import Stepper from '#lib/components/Stepper.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { detail, title } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { LIMITS } from '#lib/repeat/draft.js';
	import type { Item } from '#lib/repeat/types.js';
	import { editDraft } from '#lib/stores/draft.svelte.js';

	let { items, addHref }: { items: Item[]; addHref: string } = $props();
</script>

<div class="list">
	<ol>
		{#each items as item, i (item.id)}
			{@const name = title(item)}
			<li>
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
		border: 1px solid var(--line);
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
		padding: 0 6px 0 14px;
		border-bottom: 1px solid var(--line-soft);
		background: var(--surface);
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
