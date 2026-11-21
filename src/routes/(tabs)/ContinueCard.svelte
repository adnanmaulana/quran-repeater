<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/design/Icon.svelte';
	import { reciter } from '#lib/data/reciters.js';
	import { playlistTitle } from '#lib/format.js';
	import { progress } from '#lib/history/history.js';
	import { history } from '#lib/history/history.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions, player } from '#lib/player/player.svelte.js';
	import { playlists } from '#lib/playlists/playlists.svelte.js';

	/** Latest unfinished session, shown only when nothing is loaded (the mini player covers that). */
	const entry = $derived(player.snap.config ? null : (history.value.find((e) => !e.finished) ?? null));

	function resume() {
		if (!entry) return;
		actions.resume(entry.id);
		goto(resolve('/player'));
	}
</script>

{#if entry}
	{@const cfg = entry.config}
	<button type="button" class="card" onclick={resume}>
		<span class="text">
			<span class="eyebrow">{m.continue()}</span>
			<span class="title">{(entry.playlistId && playlists.value.find((p) => p.id === entry.playlistId)?.name) || playlistTitle(cfg.items)}</span>
			<span class="meta">
				{cfg.listLoops === 'infinite' ? m.loop_n({ n: entry.pos.listLoop + 1 }) : m.loop_of({ n: entry.pos.listLoop + 1, total: cfg.listLoops })}
				· {reciter(cfg.reciterId).name}
			</span>
			<span class="bar"><span class="fill" style="transform: scaleX({progress(entry)})"></span></span>
		</span>
		<span class="play" aria-hidden="true"><Icon name="play" size={22} /></span>
	</button>
{/if}

<style>
	.card {
		display: flex;
		align-items: center;
		gap: 14px;
		width: calc(100% - 2 * var(--gutter));
		margin: 18px var(--gutter) 0;
		padding: 16px;
		border: 0;
		border-radius: var(--r-xl);
		background: var(--night);
		color: var(--night-ink);
		text-align: left;
	}
	.text {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 4px;
	}
	.eyebrow {
		color: var(--night-accent);
	}
	.title {
		overflow: hidden;
		font-size: 17px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 13px;
		color: var(--night-muted);
	}
	.bar {
		height: 4px;
		margin-top: 6px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--night-line);
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--night-accent);
		transform-origin: left;
	}
	.play {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--night-accent);
		color: var(--night);
	}
</style>
