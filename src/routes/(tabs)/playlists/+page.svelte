<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { layout, zoomOut } from '#lib/motion/transitions.js';
	import { count, repeatRule, title } from '#lib/format.js';
	import { history } from '#lib/history/history.svelte.js';
	import { dayKey } from '#lib/history/history.js';
	import { i18n } from '#lib/i18n.svelte.js';
	import { downloadActions, formatBytes } from '#lib/offline/downloads.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions } from '#lib/player/player.svelte.js';
	import type { Playlist } from '#lib/playlists/playlists.js';
	import { playlistActions, playlists } from '#lib/playlists/playlists.svelte.js';
	import { toConfig } from '#lib/repeat/draft.js';
	import { itemAyat } from '#lib/repeat/types.js';
	import { loadDraft } from '#lib/stores/draft.svelte.js';
	import { settings } from '#lib/stores/settings.svelte.js';

	const list = $derived(playlists.value);
	const reciterId = $derived(settings.value.reciterId);
	const locale = $derived(i18n.locale === 'id' ? 'id-ID' : 'en-GB');

	/** Saved/total files per playlist for the current reciter. */
	let offline = $state<Record<string, { saved: number; total: number }>>({});
	$effect(() => {
		const r = reciterId;
		const ps = $state.snapshot(list) as Playlist[];
		let stale = false;
		Promise.all(ps.map(async (p) => [p.id, await downloadActions.status(p.draft.items, r)] as const)).then((entries) => {
			if (!stale) offline = Object.fromEntries(entries);
		});
		return () => (stale = true);
	});

	function lastPlayed(id: string): string {
		const e = history.value.find((h) => h.playlistId === id);
		if (!e) return m.not_played();
		const k = dayKey(e.updatedAt);
		const when =
			k === dayKey(Date.now())
				? m.today().toLowerCase()
				: k === dayKey(Date.now() - 86_400_000)
					? m.yesterday().toLowerCase()
					: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(e.updatedAt);
		return m.played_when({ when });
	}

	function play(p: Playlist) {
		const s = settings.value;
		actions.start(toConfig(p.draft, { gapMs: s.gapMs, speed: s.speed, reciterId: s.reciterId }), p.id);
		goto(resolve('/player'));
	}

	function edit(p: Playlist) {
		loadDraft(p.draft, p.id);
		goto(resolve('/setup'));
	}

	function download(p: Playlist) {
		loadDraft(p.draft, p.id);
		goto(resolve('/setup?download=1'));
	}

	function del(p: Playlist) {
		if (confirm(m.delete_playlist_confirm({ name: p.name }))) playlistActions.remove(p.id);
	}
</script>

<svelte:head><title>{m.nav_playlists()} · {m.app_name()}</title></svelte:head>

<ScreenHeader eyebrow={m.saved_on_device()} title={m.nav_playlists()}>
	{#snippet actions()}
		<a class="new" href={resolve('/(tabs)')}><Icon name="plus" size={16} stroke={2.4} />{m.new_playlist()}</a>
	{/snippet}
</ScreenHeader>

{#if !list.length}
	<div class="empty">
		<Icon name="playlist" size={40} stroke={1.6} />
		<p class="empty-title">{m.playlists_empty()}</p>
		<p>{m.playlists_empty_hint()}</p>
	</div>
{:else}
	<ul>
		{#each list as p (p.id)}
			{@const st = offline[p.id]}
			{@const ayat = p.draft.items.reduce((a, it) => a + itemAyat(it), 0)}
			<li class="card" animate:layout out:zoomOut>
				<div class="top">
					<span class="text">
						<span class="name">{p.name}</span>
						<span class="items">{p.draft.items.map(title).join(' · ')}</span>
						<span class="rule">{count.ayat(ayat)} · {repeatRule(p.draft.perAyah, p.draft.forever ? 'infinite' : p.draft.listLoops)}</span>
					</span>
					<button type="button" class="play" aria-label={m.play_playlist({ name: p.name })} onclick={() => play(p)}>
						<Icon name="play" size={20} />
					</button>
				</div>
				<div class="bottom">
					{#if st && st.total > 0 && st.saved === st.total}
						<span class="badge"><Icon name="check" size={14} stroke={2.6} />{m.offline_ready()}</span>
					{:else if st}
						<button type="button" class="chip" onclick={() => download(p)}>
							<Icon name="download" size={14} stroke={2.2} />{m.download_size({
								size: formatBytes(downloadActions.estimateBytes(st.total - st.saved, reciterId))
							})}
						</button>
					{/if}
					<span class="when">{lastPlayed(p.id)}</span>
					<button type="button" class="icon" aria-label={m.edit_playlist({ name: p.name })} onclick={() => edit(p)}>
						<Icon name="edit" size={18} />
					</button>
					<button type="button" class="icon" aria-label={m.delete_playlist({ name: p.name })} onclick={() => del(p)}>
						<Icon name="close" size={18} />
					</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.new {
		display: flex;
		align-items: center;
		gap: 6px;
		height: var(--tap);
		padding: 0 16px;
		border-radius: 22px;
		background: var(--accent);
		color: var(--on-accent);
		font-size: 14px;
		font-weight: 600;
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 18px var(--gutter) 0;
		padding: 0;
		list-style: none;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		border: 1px solid transparent;
		box-shadow: var(--shadow-card);
		border-radius: var(--r-xl);
		background: var(--surface);
	}
	.top {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}
	.text {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 4px;
	}
	.name {
		font-size: 16px;
		font-weight: 700;
	}
	.items {
		overflow: hidden;
		font-size: 13px;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.rule {
		font-size: 12px;
		color: var(--muted);
	}
	.play {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border: 0;
		border-radius: 50%;
		background: var(--accent);
		color: var(--on-accent);
	}
	.bottom {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.badge,
	.chip {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 10px;
		border-radius: 14px;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}
	.badge {
		background: var(--accent-soft);
		color: var(--accent-ink);
	}
	.chip {
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--ink);
	}
	.when {
		flex: 1;
		overflow: hidden;
		font-size: 12px;
		color: var(--muted);
		text-align: right;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--muted);
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
		max-width: 280px;
		margin: 0;
		font-size: 13px;
	}
	.empty .empty-title {
		margin-top: 6px;
		color: var(--ink);
		font-size: 15px;
		font-weight: 600;
	}
</style>
