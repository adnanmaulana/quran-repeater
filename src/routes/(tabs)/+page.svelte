<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { count } from '#lib/format.js';
	import Icon from '#lib/design/Icon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import SegmentedTabs from '#lib/components/SegmentedTabs.svelte';
	import SelectionBar from '#lib/components/SelectionBar.svelte';
	import SurahRow from '#lib/components/SurahRow.svelte';
	import ContinueCard from './ContinueCard.svelte';
	import CustomRanges from './CustomRanges.svelte';
	import { JUZ, countAyat, searchSurahs, surah, type Surah } from '#lib/data/quran.js';
	import { i18n } from '#lib/i18n.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { itemAyat, itemFromJuz, itemFromSurah, type Item } from '#lib/repeat/types.js';
	import { addToDraft, startDraft } from '#lib/stores/draft.svelte.js';
	import { ui } from '#lib/stores/ui.svelte.js';

	type Mode = 'surah' | 'juz' | 'custom';

	let mode = $state<Mode>('surah');
	let query = $state('');
	let selecting = $state(false);
	/** Selected surah or juz numbers, in the order they were tapped (that becomes the playlist order). */
	let picked = $state<number[]>([]);

	/** Opened from Setup's "Add surah or range": picks are appended to the playlist. */
	const adding = $derived(page.url.searchParams.has('add'));
	const lang = $derived(i18n.locale === 'id' ? 'id' : 'en');
	const surahs = $derived(searchSurahs(query, lang));

	/** The surah list renders a page at a time; the next page loads as its end scrolls into view. */
	const PAGE = 20;
	let limit = $state(PAGE);
	const shown = $derived(surahs.slice(0, limit));
	$effect(() => {
		void query; // a new search starts from the first page again
		limit = PAGE;
	});

	function loadMore(node: HTMLElement) {
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) limit += PAGE;
			},
			{ rootMargin: '600px 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}
	const setupHref = resolve('/setup');

	$effect(() => {
		ui.hideNav = selecting;
		return () => (ui.hideNav = false);
	});

	const place = (s: Surah) => (s.place === 'meccan' ? m.place_meccan() : m.place_medinan());
	const juzStart = (n: number) => {
		const { start } = JUZ[n - 1];
		return `${surah(start.s).name} ${start.a}`;
	};
	const juzAyat = (n: number) => countAyat(JUZ[n - 1].start, JUZ[n - 1].end);

	function changeMode() {
		picked = [];
	}

	function toggleSelecting() {
		selecting = !selecting;
		picked = [];
	}

	function toggle(n: number) {
		picked = picked.includes(n) ? picked.filter((x) => x !== n) : [...picked, n];
	}

	/** True when we got here from Setup, so returning is a history step back, not a new entry. */
	let cameFromSetup = false;
	afterNavigate(({ from }) => {
		cameFromSetup = from?.route.id === '/setup';
	});

	function open(items: Item[]) {
		if (adding) addToDraft(items);
		else startDraft(items);
		if (adding && cameFromSetup) history.back();
		else goto(setupHref, { replaceState: adding });
	}

	/** In normal mode a row is a link; set the draft before the navigation happens. */
	function openOne(e: MouseEvent, item: Item) {
		e.preventDefault();
		open([item]);
	}

	const pickedItems = $derived(picked.map((n) => (mode === 'juz' ? itemFromJuz(n) : itemFromSurah(n))));
	const pickedAyat = $derived(pickedItems.reduce((a, it) => a + itemAyat(it), 0));
	const pickedNames = $derived.by(() => {
		const names = picked.map((n) => (mode === 'juz' ? m.juz_label({ n }) : surah(n).name));
		return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
	});
</script>

<svelte:head><title>{m.app_name()}</title></svelte:head>

<ScreenHeader eyebrow={adding ? m.adding_to_playlist() : m.tagline()} title={m.app_name()}>
	{#snippet actions()}
		<a class="pill" href={resolve('/(tabs)/playlists')}>
			<Icon name="playlist" size={18} />{m.nav_playlists()}
		</a>
	{/snippet}
</ScreenHeader>

{#if !selecting && !adding}<ContinueCard />{/if}

<div class="tabs">
	<SegmentedTabs
		label={m.repeat_by()}
		bind:value={mode}
		onchange={changeMode}
		options={[
			{ id: 'surah', label: m.tab_surah() },
			{ id: 'juz', label: m.tab_juz() },
			{ id: 'custom', label: m.tab_custom() }
		]}
	/>
</div>

{#if mode !== 'custom'}
	<div class="toolbar">
		{#if mode === 'surah'}
			<label class="search">
				<Icon name="search" size={18} />
				<span class="sr-only">{m.search_label()}</span>
				<input type="search" bind:value={query} placeholder={m.search_placeholder()} autocomplete="off" />
			</label>
		{/if}
		<button type="button" class="select" class:on={selecting} aria-pressed={selecting} onclick={toggleSelecting}>
			{selecting ? m.cancel() : m.select()}
		</button>
	</div>
{/if}

{#if mode === 'surah'}
	<div class="list">
		{#each shown as s (s.n)}
			{@const meta = `${place(s)} · ${count.ayat(s.ayat)}`}
			{#if selecting}
				<SurahRow mode="check" badge={s.n} title={s.name} {meta} ar={s.ar} checked={picked.includes(s.n)} ontoggle={() => toggle(s.n)} />
			{:else}
				<SurahRow mode="link" href={setupHref} badge={s.n} title={s.name} {meta} ar={s.ar} onclick={(e) => openOne(e, itemFromSurah(s.n))} />
			{/if}
		{:else}
			<p class="empty">{m.no_results({ query })}</p>
		{/each}
		{#if shown.length < surahs.length}
			<!-- Key on the length so the observer re-arms (and fires again if still in view) after each page. -->
			{#key shown.length}<div class="more" use:loadMore aria-hidden="true"></div>{/key}
		{/if}
	</div>
{:else if mode === 'juz'}
	<div class="grid">
		{#each JUZ as j (j.n)}
			{@const on = picked.includes(j.n)}
			{#if selecting}
				<button type="button" class="juz" class:on role="checkbox" aria-checked={on} onclick={() => toggle(j.n)}>
					{@render juzCard(j.n)}
				</button>
			{:else}
				<a class="juz" href={setupHref} onclick={(e) => openOne(e, itemFromJuz(j.n))}>
					{@render juzCard(j.n)}
				</a>
			{/if}
		{/each}
	</div>
{:else}
	<CustomRanges onsubmit={open} />
{/if}

{#snippet juzCard(n: number)}
	<span class="juz-top">
		<span class="eyebrow">{m.juz_label({ n })}</span>
		{#if picked.includes(n)}<span class="tick"><Icon name="check" size={14} stroke={3} /></span>{/if}
	</span>
	<span class="ar juz-ar" lang="ar">{surah(JUZ[n - 1].start.s).ar}</span>
	<span class="juz-meta">{m.juz_starts({ ref: juzStart(n) })}</span>
	<span class="juz-meta">{count.ayat(juzAyat(n))}</span>
{/snippet}

{#if selecting}
	<SelectionBar
		title={m.selected_count({ count: picked.length })}
		meta={picked.length ? `${pickedNames} · ${count.ayat(pickedAyat)}` : m.pick_at_least_one()}
		action={adding ? m.add_to_playlist() : m.set_up_repeat()}
		disabled={!picked.length}
		onaction={() => open(pickedItems)}
	/>
{/if}

<style>
	.pill {
		display: flex;
		align-items: center;
		gap: 8px;
		height: var(--tap);
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 22px;
		background: var(--surface);
		color: var(--ink);
		font-size: 14px;
		font-weight: 600;
	}
	.tabs {
		margin: 20px var(--gutter) 0;
	}
	.toolbar {
		display: flex;
		gap: 8px;
		margin: 14px var(--gutter) 0;
	}
	.search {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 10px;
		height: 46px;
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--surface);
		color: var(--muted);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		font-size: 16px; /* ≥16px stops iOS zooming on focus */
		color: var(--ink);
	}
	.select {
		height: 46px;
		margin-left: auto;
		padding: 0 16px;
		border: 1px solid var(--line);
		border-radius: var(--r-md);
		background: var(--surface);
		font-size: 14px;
		font-weight: 600;
	}
	.select.on {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--surface);
	}
	.list {
		display: flex;
		flex-direction: column;
		margin: 12px var(--gutter) 0;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.empty {
		margin: 0;
		padding: 20px 16px;
		color: var(--muted);
		font-size: 14px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin: 14px var(--gutter) 0;
	}
	.more {
		height: 1px;
	}
	.juz {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--surface);
		color: var(--ink);
		text-align: left;
	}
	.juz.on {
		border-color: var(--accent);
		background: var(--accent-tint);
	}
	.juz-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 22px;
		color: var(--accent);
	}
	.tick {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--on-accent);
	}
	.juz-ar {
		font-size: 20px;
		text-align: right;
	}
	.juz-meta {
		font-size: 12px;
		color: var(--muted);
	}
	@media (min-width: 480px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
