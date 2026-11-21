<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { reciter } from '#lib/data/reciters.js';
	import { playlistTitle, repeatRule } from '#lib/format.js';
	import { groupByDay, loopsDone, progress, stats, type HistoryEntry } from '#lib/history/history.js';
	import { history, historyActions } from '#lib/history/history.svelte.js';
	import { i18n } from '#lib/i18n.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions } from '#lib/player/player.svelte.js';
	import { playlists } from '#lib/playlists/playlists.svelte.js';

	const list = $derived(history.value);
	const groups = $derived(groupByDay(list));
	const s = $derived(stats(list));
	const locale = $derived(i18n.locale === 'id' ? 'id-ID' : 'en-GB');

	const time = (ts: number) => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(ts);
	const day = (ts: number) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(ts);

	/** A session started from a saved playlist shows the playlist's name. */
	const name = (e: HistoryEntry) => (e.playlistId && playlists.value.find((p) => p.id === e.playlistId)?.name) || playlistTitle(e.config.items);

	function progressLabel(e: HistoryEntry) {
		if (e.config.listLoops === 'infinite') return m.progress_loops({ n: loopsDone(e) });
		if (e.config.listLoops > 1) return `${loopsDone(e)}/${e.config.listLoops}`;
		return `${Math.round(progress(e) * 100)}%`;
	}

	function resume(e: HistoryEntry) {
		actions.resume(e.id);
		goto(resolve('/player'));
	}

	function clear() {
		if (confirm(m.clear_history_confirm())) historyActions.clear();
	}
</script>

<svelte:head><title>{m.nav_history()} · {m.app_name()}</title></svelte:head>

<ScreenHeader eyebrow={m.saved_on_device()} title={m.nav_history()}>
	{#snippet actions()}
		{#if list.length}<button type="button" class="ghost" onclick={clear}>{m.clear_all()}</button>{/if}
	{/snippet}
</ScreenHeader>

{#if !list.length}
	<div class="empty">
		<Icon name="history" size={40} stroke={1.6} />
		<p class="empty-title">{m.history_empty()}</p>
		<p>{m.history_empty_hint()}</p>
		<a class="pill" href={resolve('/(tabs)')}>{m.pick_surahs()}</a>
	</div>
{:else}
	<dl class="stats">
		<div><dt>{m.stat_sessions()}</dt><dd>{s.sessions}</dd></div>
		<div><dt>{m.stat_loops()}</dt><dd>{s.loops}</dd></div>
		<div><dt>{m.stat_streak()}</dt><dd>{s.streak}</dd></div>
	</dl>

	{#each groups as g (g.key)}
		<section>
			<h2 class="eyebrow">{g.when === 'today' ? m.today() : g.when === 'yesterday' ? m.yesterday() : day(g.date)}</h2>
			<ul>
				{#each g.entries as e (e.id)}
					{@const title = name(e)}
					<li class="card">
						<div class="top">
							<span class="text">
								<span class="title">{title}</span>
								<span class="meta">{reciter(e.config.reciterId).name} · {repeatRule(e.config.perAyah, e.config.listLoops)} · {time(e.updatedAt)}</span>
							</span>
							<button type="button" class="remove" aria-label={m.remove_entry({ name: title })} onclick={() => historyActions.remove(e.id)}>
								<Icon name="close" size={18} />
							</button>
						</div>
						<div class="bottom">
							<div class="bar"><span class="fill" class:finished={e.finished} style="transform: scaleX({progress(e)})"></span></div>
							<span class="pct">{progressLabel(e)}</span>
							<button type="button" class="resume" onclick={() => resume(e)}>{e.finished ? m.replay() : m.resume()}</button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<style>
	.ghost {
		height: var(--tap);
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 22px;
		background: var(--surface);
		font-size: 14px;
		font-weight: 600;
	}
	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin: 18px var(--gutter) 0;
	}
	.stats div {
		display: flex;
		flex-direction: column-reverse;
		gap: 2px;
		padding: 12px;
		border: 1px solid transparent;
		box-shadow: var(--shadow-card);
		border-radius: 16px;
		background: var(--surface);
	}
	dt {
		font-size: 12px;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-size: 22px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	section {
		margin: 18px var(--gutter) 0;
	}
	h2 {
		margin: 0 0 8px;
		color: var(--muted);
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border: 1px solid transparent;
		box-shadow: var(--shadow-card);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.top {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.text {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 3px;
	}
	.title {
		font-size: 15px;
		font-weight: 600;
	}
	.meta {
		font-size: 12px;
		color: var(--muted);
	}
	.remove {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--tap);
		height: var(--tap);
		margin: -10px -10px 0 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--muted);
	}
	.bottom {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.bar {
		flex: 1;
		height: 6px;
		overflow: hidden;
		border-radius: 3px;
		background: var(--track);
	}
	.fill {
		display: block;
		height: 100%;
		background: var(--accent);
		transform-origin: left;
	}
	.fill.finished {
		background: var(--muted);
	}
	.pct {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.resume {
		min-height: 36px;
		padding: 0 14px;
		border: 0;
		border-radius: var(--r-sm);
		background: var(--accent-soft);
		color: var(--accent-ink);
		font-size: 13px;
		font-weight: 700;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		margin: 80px var(--gutter) 0;
		color: var(--muted);
		text-align: center;
	}
	.empty p {
		max-width: 260px;
		margin: 0;
		font-size: 13px;
	}
	.empty .empty-title {
		margin-top: 6px;
		color: var(--ink);
		font-size: 15px;
		font-weight: 600;
	}
	.pill {
		margin-top: 8px;
		padding: 12px 18px;
		border-radius: 12px;
		background: var(--accent);
		color: var(--on-accent);
		font-size: 14px;
		font-weight: 600;
	}
</style>
