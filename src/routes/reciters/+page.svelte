<script lang="ts">
	import { resolve } from '$app/paths';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { RECITERS, audioUrl, initials, type Reciter } from '#lib/data/reciters.js';
	import { downloadedFolders } from '#lib/offline/downloads.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions, player } from '#lib/player/player.svelte.js';
	import { settings } from '#lib/stores/settings.svelte.js';

	type Filter = 'all' | 'downloaded' | 'mujawwad';
	let filter = $state<Filter>('all');
	let query = $state('');
	let downloaded = $state(new Set<string>());
	let previewing = $state<string | null>(null);

	$effect(() => {
		downloadedFolders().then((f) => (downloaded = f));
	});

	const shown = $derived(
		RECITERS.filter((r) => {
			if (filter === 'downloaded' && !downloaded.has(r.folder)) return false;
			if (filter === 'mujawwad' && r.style !== 'mujawwad') return false;
			return r.name.toLowerCase().includes(query.trim().toLowerCase());
		})
	);

	function choose(r: Reciter) {
		settings.update((s) => ({ ...s, reciterId: r.id }));
	}

	// A separate element for previews, so the main player's queue is untouched.
	let sample: HTMLAudioElement | null = null;

	function preview(r: Reciter) {
		if (previewing === r.id) return stopPreview();
		sample ??= new Audio();
		if (player.snap.state === 'playing' || player.snap.state === 'loading') actions.toggle(); // pause the repeat
		sample.src = audioUrl(r.id, { s: 1, a: 2 }); // Al-Fatihah 2: short and familiar
		sample.onended = () => (previewing = null);
		sample.play().catch(() => (previewing = null));
		previewing = r.id;
	}

	function stopPreview() {
		sample?.pause();
		previewing = null;
	}

	$effect(() => () => stopPreview()); // stop when leaving the screen

	const filters: { id: Filter; label: () => string }[] = [
		{ id: 'all', label: m.filter_all },
		{ id: 'downloaded', label: m.filter_downloaded },
		{ id: 'mujawwad', label: m.filter_mujawwad }
	];
</script>

<svelte:head><title>{m.reciters_title()} · {m.app_name()}</title></svelte:head>

<main>
	<ScreenHeader title={m.reciters_title()} backHref={resolve('/setup')} />

	<label class="search">
		<Icon name="search" size={18} />
		<span class="sr-only">{m.search_reciters()}</span>
		<input type="search" bind:value={query} placeholder={m.search_reciters()} autocomplete="off" />
	</label>

	<div class="filters" role="group" aria-label={m.reciter_filters()}>
		{#each filters as f (f.id)}
			<button type="button" aria-pressed={filter === f.id} class:on={filter === f.id} onclick={() => (filter = f.id)}>{f.label()}</button>
		{/each}
	</div>

	<div class="list" role="radiogroup" aria-label={m.reciter()}>
		{#each shown as r (r.id)}
			{@const on = settings.value.reciterId === r.id}
			<div class="row" class:on>
				<button type="button" class="pick" role="radio" aria-checked={on} onclick={() => choose(r)}>
					<span class="avatar" aria-hidden="true">{initials(r.name)}</span>
					<span class="text">
						<span class="name">{r.name}</span>
						<span class="meta">
							{r.style === 'mujawwad' ? m.style_mujawwad() : m.style_murattal()} · {downloaded.has(r.folder) ? m.tag_downloaded() : m.tag_streams()}
						</span>
					</span>
					{#if on}<Icon name="check" size={22} stroke={2.4} />{/if}
				</button>
				<button
					type="button"
					class="preview"
					aria-label={previewing === r.id ? m.stop_preview({ name: r.name }) : m.preview_reciter({ name: r.name })}
					aria-pressed={previewing === r.id}
					onclick={() => preview(r)}
				>
					<Icon name={previewing === r.id ? 'pause' : 'play'} size={16} />
				</button>
			</div>
		{:else}
			<p class="empty">{m.no_reciters()}</p>
		{/each}
	</div>
</main>

<style>
	main {
		max-width: 560px;
		margin: 0 auto;
		padding-bottom: calc(24px + env(safe-area-inset-bottom));
	}
	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 46px;
		margin: 12px var(--gutter) 0;
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
		font-size: 16px;
		color: var(--ink);
	}
	.filters {
		display: flex;
		gap: 8px;
		margin: 12px var(--gutter) 0;
	}
	.filters button {
		height: 36px;
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: var(--surface);
		font-size: 13px;
		font-weight: 500;
	}
	.filters button.on {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--surface);
		font-weight: 600;
	}
	.list {
		margin: 14px var(--gutter) 0;
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 10px 0 14px;
		border-bottom: 1px solid var(--line-soft);
	}
	.row:last-child {
		border-bottom: 0;
	}
	.row.on {
		background: var(--accent-tint);
	}
	.pick {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		gap: 12px;
		height: 66px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		text-align: left;
	}
	.pick :global(svg) {
		color: var(--accent);
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
		font-size: 13px;
		font-weight: 700;
	}
	.on .avatar {
		background: var(--accent);
		color: var(--on-accent);
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
	.meta {
		font-size: 12px;
		color: var(--muted);
	}
	.preview {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--tap);
		height: var(--tap);
		border: 1px solid var(--line);
		border-radius: 50%;
		background: var(--surface-2);
		color: var(--ink);
	}
	.preview[aria-pressed='true'] {
		border-color: var(--accent);
		color: var(--accent);
	}
	.empty {
		margin: 0;
		padding: 20px 16px;
		color: var(--muted);
		font-size: 14px;
	}
</style>
