<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/design/Icon.svelte';
	import { title } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions, player } from '#lib/player/player.svelte.js';
	import { repsOf } from '#lib/repeat/queue.js';

	const snap = $derived(player.snap);
	const busy = $derived(snap.state === 'playing' || snap.state === 'loading');
	const item = $derived(snap.config && snap.pos ? snap.config.items[snap.pos.item] : null);
	// Whole-session progress: changes once per play, so no animation loop is needed here.
	const pct = $derived(snap.total ? (snap.index / snap.total) * 100 : 0);
</script>

{#if item && snap.ref && snap.config && snap.pos}
	{@const name = title(item)}
	<div class="mini">
		<a href={resolve('/player')}>
			<span class="sr-only">{m.player_title()}:</span>
			<span class="name">{name}</span>
			<span class="meta">
				{snap.ref.s}:{snap.ref.a} · {m.repeat_of({ n: snap.pos.rep + 1, total: repsOf(snap.config, snap.ref) })}
			</span>
		</a>
		<button type="button" aria-label={busy ? m.pause() : m.play()} onclick={actions.toggle}>
			<Icon name={busy ? 'pause' : 'play'} size={20} />
		</button>
		{#if snap.total}<span class="bar" style="transform: scaleX({pct / 100})"></span>{/if}
	</div>
{/if}

<style>
	.mini {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 0 8px 8px;
		padding: 8px 8px 8px 16px;
		overflow: hidden;
		border-radius: 16px;
		background: var(--night);
		color: var(--night-ink);
		box-shadow: var(--shadow-float);
	}
	a {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 2px;
		color: inherit;
	}
	.name {
		overflow: hidden;
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 12px;
		color: var(--night-muted);
	}
	button {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--tap);
		height: var(--tap);
		border: 0;
		border-radius: 50%;
		background: var(--night-accent);
		color: var(--night);
	}
	.bar {
		position: absolute;
		inset: auto 0 0 0;
		height: 2px;
		background: var(--night-accent);
		transform-origin: left;
	}
</style>
