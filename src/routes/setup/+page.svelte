<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChipGroup from '#lib/components/ChipGroup.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { initials, reciter } from '#lib/data/reciters.js';
	import { count } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { LIMITS } from '#lib/repeat/draft.js';
	import { playsPerListLoop, totalPlays } from '#lib/repeat/queue.js';
	import { itemAyat } from '#lib/repeat/types.js';
	import { actions as playerActions } from '#lib/player/player.svelte.js';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { playlistTitle } from '#lib/format.js';
	import { playlistActions } from '#lib/playlists/playlists.svelte.js';
	import { draft, draftConfig, draftPlaylist, editDraft } from '#lib/stores/draft.svelte.js';
	import { settings } from '#lib/stores/settings.svelte.js';
	import { downloadActions, downloads } from '#lib/offline/downloads.svelte.js';
	import DownloadSheet from './DownloadSheet.svelte';
	import ItemList from './ItemList.svelte';
	import SaveDialog from './SaveDialog.svelte';

	const d = $derived(draft.value);
	const s = $derived(settings.value);
	const cfg = $derived(draftConfig());
	const ayat = $derived(d.items.reduce((a, it) => a + itemAyat(it), 0));

	const summary = $derived.by(() => {
		const items = count.items(d.items.length);
		const total = totalPlays(cfg);
		return total === null
			? m.summary_forever({ items, ayat: count.ayat(ayat), plays: count.plays(playsPerListLoop(cfg)) })
			: m.summary_total({ items, ayat: count.ayat(ayat), plays: count.plays(total) });
	});

	const gaps = [0, 1000, 2000, 3000].map((ms) => ({ value: ms, label: `${ms / 1000}s` }));
	const speeds = [0.75, 1, 1.25, 1.5].map((v) => ({ value: v, label: `${v}×` }));
	const homeHref = resolve('/(tabs)');

	function start() {
		// Called from the tap itself, so the browser allows audio to start.
		playerActions.start(draftConfig(), draftPlaylist.value);
		goto(resolve('/player'));
	}

	let saveOpen = $state(false);
	let savedFlash = $state(false);
	const editing = $derived(draftPlaylist.value ? playlistActions.get(draftPlaylist.value) : null);

	function save(name: string) {
		const id = playlistActions.save(name, $state.snapshot(draft.value), editing?.id ?? null);
		draftPlaylist.set(id);
		savedFlash = true;
		setTimeout(() => (savedFlash = false), 2000);
	}

	/** "Save changes" saves straight over the playlist; a new one asks for a name first. */
	function onSaveClick() {
		if (editing) save(editing.name);
		else saveOpen = true;
	}

	// Arriving from a playlist's Download chip opens the download sheet.
	onMount(() => {
		if (page.url.searchParams.has('download') && draft.value.items.length) openDownload();
	});
	const addHref = resolve('/(tabs)?add=1');

	let sheetOpen = $state(false);
	/** null = not checked yet; true when every file of this playlist is saved for this reciter. */
	let offlineReady = $state<boolean | null>(null);

	// Re-check what is saved when the playlist, the reciter or a download changes.
	$effect(() => {
		const items = d.items;
		const reciterId = s.reciterId;
		void downloads.job?.state;
		let stale = false;
		if (!items.length) return;
		downloadActions
			.status($state.snapshot(items), reciterId)
			.then((st) => !stale && (offlineReady = st.total > 0 && st.saved === st.total))
			.catch(() => !stale && (offlineReady = false));
		return () => (stale = true);
	});

	const dlPct = $derived(
		downloads.job && downloads.job.state !== 'complete' ? Math.floor((downloads.job.done / downloads.job.total) * 100) : null
	);

	function openDownload() {
		sheetOpen = true;
		const job = downloads.job;
		// Keep a running or paused job; otherwise download this playlist (already saved files are skipped).
		if (!job || job.state === 'complete' || job.reciterId !== s.reciterId) downloadActions.start($state.snapshot(d.items), s.reciterId);
	}
</script>

<svelte:head><title>{m.setup_title()} · {m.app_name()}</title></svelte:head>

<main>
	<ScreenHeader title={m.setup_title()} backHref={homeHref}>
		{#snippet actions()}
			{#if d.items.length > 1}
				<button type="button" class="ghost" onclick={editDraft.sortMushaf}>{m.sort_mushaf()}</button>
			{/if}
		{/snippet}
	</ScreenHeader>

	{#if d.items.length === 0}
		<div class="empty">
			<Icon name="playlist" size={40} stroke={1.6} />
			<p class="empty-title">{m.empty_setup()}</p>
			<p>{m.empty_setup_hint()}</p>
			<a class="primary small" href={homeHref}>{m.pick_surahs()}</a>
		</div>
	{:else}
		<div class="intro">
			<span class="eyebrow">{count.items(d.items.length)} · {count.ayat(ayat)}</span>
		</div>

		<ItemList items={d.items} {addHref} />

		<section class="card settings" aria-label={m.setup_title()}>
			<div class="row">
				<span class="label"><b>{m.repeat_each()}</b><small>{m.repeat_each_hint()}</small></span>
				<Stepper
					value={d.perAyah}
					display="{d.perAyah}×"
					max={LIMITS.perAyah}
					label={m.repeat_each()}
					decLabel={m.decrease({ what: m.repeat_each() })}
					incLabel={m.increase({ what: m.repeat_each() })}
					onchange={editDraft.setPerAyah}
				/>
			</div>
			<div class="row">
				<span class="label"><b>{m.repeat_list()}</b><small>{d.forever ? m.looping_forever() : m.repeat_list_hint()}</small></span>
				<Stepper
					value={d.listLoops}
					display={d.forever ? '∞' : `${d.listLoops}×`}
					max={d.forever ? d.listLoops : LIMITS.listLoops}
					min={d.forever ? d.listLoops : 1}
					label={m.repeat_list()}
					decLabel={m.decrease({ what: m.repeat_list() })}
					incLabel={m.increase({ what: m.repeat_list() })}
					onchange={editDraft.setListLoops}
				/>
			</div>
			<div class="row last">
				<span class="label"><b>{m.loop_forever()}</b></span>
				<Switch checked={d.forever} label={m.loop_forever()} onchange={editDraft.setForever} />
			</div>
		</section>

		<section class="field">
			<h2 id="gap">{m.gap_label()}</h2>
			<ChipGroup label={m.gap_label()} options={gaps} value={s.gapMs} onchange={(gapMs) => settings.update((x) => ({ ...x, gapMs }))} />
		</section>

		<section class="field">
			<h2>{m.speed_label()}</h2>
			<ChipGroup label={m.speed_label()} options={speeds} value={s.speed} onchange={(speed) => settings.update((x) => ({ ...x, speed }))} />
		</section>

		<a class="card reciter" href={resolve('/reciters')}>
			<span class="avatar" aria-hidden="true">{initials(reciter(s.reciterId).name)}</span>
			<span class="label"><small>{m.reciter()}</small><b>{reciter(s.reciterId).name}</b></span>
			<Icon name="chevron" size={20} />
		</a>

		<button type="button" class="save" onclick={onSaveClick} aria-live="polite">
			<Icon name={savedFlash ? 'check' : 'bookmark'} size={18} />
			{savedFlash ? m.saved() : editing ? m.save_changes() : m.save_playlist()}
		</button>

		<div class="bar">
			<p aria-live="polite">
				{#if offlineReady}<span class="ready"><Icon name="check" size={14} stroke={2.6} />{m.offline_ready()}</span>{' · '}{/if}{summary}
			</p>
			<div class="buttons">
				<button
					type="button"
					class="download"
					class:done={offlineReady}
					aria-label={dlPct !== null ? m.dl_button_progress({ pct: dlPct }) : m.dl_button()}
					onclick={openDownload}
				>
					{#if dlPct !== null}<span class="pct">{dlPct}%</span>{:else}<Icon name={offlineReady ? 'check' : 'download'} size={20} />{/if}
				</button>
				<button type="button" class="primary" onclick={start}>
					<Icon name="play" size={18} />{m.start_repeating()}
				</button>
			</div>
		</div>
	{/if}
</main>

{#if saveOpen}
	<SaveDialog initial={playlistTitle(d.items)} onsave={save} onclose={() => (saveOpen = false)} />
{/if}

{#if sheetOpen}
	<DownloadSheet items={d.items} reciterId={s.reciterId} onclose={() => (sheetOpen = false)} onstart={start} />
{/if}

<style>
	main {
		max-width: 560px;
		margin: 0 auto;
		padding-bottom: calc(150px + env(safe-area-inset-bottom));
	}
	.ghost {
		height: 40px;
		margin-right: 8px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: var(--surface);
		font-size: 13px;
		font-weight: 600;
	}
	.intro {
		margin: 12px var(--gutter) 0;
		color: var(--accent);
	}
	.card {
		margin: 18px var(--gutter) 0;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.settings {
		padding: 4px 16px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 64px;
		border-bottom: 1px solid var(--line-soft);
	}
	.row.last {
		min-height: 56px;
		border-bottom: 0;
	}
	.label {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 2px;
	}
	.label b {
		font-size: 15px;
		font-weight: 600;
	}
	.label small {
		font-size: 12px;
		color: var(--muted);
	}
	.field {
		margin: 18px var(--gutter) 0;
	}
	.field h2 {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}
	.reciter {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 64px;
		padding: 0 14px;
		color: var(--muted);
	}
	.reciter b {
		color: var(--ink);
	}
	.avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 14px;
		font-weight: 700;
	}
	.save {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: calc(100% - 2 * var(--gutter));
		height: 48px;
		margin: 12px var(--gutter) 0;
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--surface);
		font-size: 14px;
		font-weight: 600;
	}
	.bar {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px var(--gutter) calc(24px + env(safe-area-inset-bottom));
		background: var(--surface);
		border-top: 1px solid var(--line);
	}
	.bar p {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
		text-align: center;
	}
	.ready {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--accent);
		font-weight: 600;
		vertical-align: bottom;
	}
	.buttons {
		display: flex;
		gap: 10px;
		width: 100%;
		max-width: 520px;
		margin: 0 auto;
	}
	.download {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 52px;
		height: 52px;
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--surface);
		color: var(--ink);
	}
	.download.done {
		border-color: var(--accent);
		color: var(--accent);
	}
	.pct {
		font-size: 12px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.primary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		max-width: 520px;
		height: 52px;
		margin: 0 auto;
		border: 0;
		border-radius: var(--r-md);
		background: var(--accent);
		color: var(--on-accent);
		font-size: 16px;
		font-weight: 600;
	}
	.primary.small {
		width: auto;
		height: var(--tap);
		margin-top: 6px;
		padding: 0 18px;
		font-size: 14px;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
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
		margin-top: 8px;
		color: var(--ink);
		font-size: 15px;
		font-weight: 600;
	}
</style>
