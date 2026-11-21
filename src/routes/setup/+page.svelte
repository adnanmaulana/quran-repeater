<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChipGroup from '#lib/components/ChipGroup.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import Switch from '#lib/components/Switch.svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { RECITERS, initials, reciter } from '#lib/data/reciters.js';
	import { count } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { LIMITS } from '#lib/repeat/draft.js';
	import { playsPerListLoop, totalPlays } from '#lib/repeat/queue.js';
	import { itemAyat } from '#lib/repeat/types.js';
	import { draft, draftConfig, editDraft } from '#lib/stores/draft.svelte.js';
	import { settings } from '#lib/stores/settings.svelte.js';
	import ItemList from './ItemList.svelte';

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
	const addHref = resolve('/(tabs)?add=1');
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

		<label class="card reciter">
			<span class="avatar" aria-hidden="true">{initials(reciter(s.reciterId).name)}</span>
			<span class="label"><small>{m.reciter()}</small><b>{reciter(s.reciterId).name}</b></span>
			<Icon name="down" size={20} />
			<!-- Native select for now; Phase 5 replaces it with the reciter screen with previews. -->
			<select value={s.reciterId} onchange={(e) => settings.update((x) => ({ ...x, reciterId: e.currentTarget.value }))}>
				{#each RECITERS as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
			</select>
		</label>

		<div class="bar">
			<p aria-live="polite">{summary}</p>
			<button type="button" class="primary" onclick={() => goto(resolve('/player'))}>
				<Icon name="play" size={18} />{m.start_repeating()}
			</button>
		</div>
	{/if}
</main>

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
	.reciter:has(select:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.reciter select {
		position: absolute;
		inset: 0;
		width: 100%;
		opacity: 0;
		cursor: pointer;
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
		color: #fff;
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
