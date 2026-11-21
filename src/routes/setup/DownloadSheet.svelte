<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/design/Icon.svelte';
	import { reciter } from '#lib/data/reciters.js';
	import { title } from '#lib/format.js';
	import { downloadActions, downloads, formatBytes, storageUsage } from '#lib/offline/downloads.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { Item } from '#lib/repeat/types.js';

	let { items, reciterId, onclose, onstart }: { items: Item[]; reciterId: string; onclose: () => void; onstart: () => void } = $props();

	let dialog: HTMLDialogElement;
	let usage = $state<number | null>(null);

	$effect(() => {
		dialog.showModal();
		storageUsage().then((u) => (usage = u));
	});

	const job = $derived(downloads.job);
	const jobState = $derived(job?.state ?? 'downloading');
	const pct = $derived(job && job.total ? Math.floor((job.done / job.total) * 100) : 0);
	const done = $derived(jobState === 'complete');
	const R = 48;
	const C = 2 * Math.PI * R;

	// Refresh the storage figure when the job finishes.
	$effect(() => {
		if (done) storageUsage().then((u) => (usage = u));
	});

	const heading = $derived(
		{ downloading: m.dl_live(), paused: m.dl_paused(), complete: m.dl_complete(), error: m.dl_error() }[jobState]
	);
	const note = $derived(
		{ downloading: m.dl_note_live(), paused: m.dl_note_paused(), complete: m.dl_note_done(), error: m.dl_note_error() }[jobState]
	);

	function itemStatus(i: number) {
		const it = job?.items[i];
		if (!it) return { text: m.dl_item_waiting(), tone: 'muted', pct: 0 };
		if (it.done >= it.total) return { text: m.dl_item_done(), tone: 'ok', pct: 100 };
		if (it.failed) return { text: m.dl_item_failed(), tone: 'bad', pct: (it.done / it.total) * 100 };
		if (it.done > 0) return { text: m.dl_item_progress({ done: it.done, total: it.total }), tone: 'ink', pct: (it.done / it.total) * 100 };
		return { text: m.dl_item_waiting(), tone: 'muted', pct: 0 };
	}

	function primary() {
		if (jobState === 'downloading') downloadActions.pause();
		else downloadActions.resume();
	}

	function cancel() {
		downloadActions.cancel();
		dialog.close();
	}

	function startRepeating() {
		dialog.close();
		onstart();
	}
</script>

<dialog bind:this={dialog} onclose={onclose} aria-labelledby="dl-title" onclick={(e) => e.target === dialog && dialog.close()}>
	<div class="sheet" class:error={jobState === 'error'} class:paused={jobState === 'paused'}>
		<div class="top">
			<span class="handle" aria-hidden="true"></span>
			<button type="button" class="close" aria-label={m.dl_close()} onclick={() => dialog.close()}><Icon name="close" size={20} /></button>
		</div>

		<div class="head">
			<div class="ring">
				<svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={m.dl_percent({ pct })}>
					<circle cx="56" cy="56" r={R} fill="none" stroke="var(--track)" stroke-width="10" />
					<circle
						class="arc"
						opacity={pct > 0 ? 1 : 0}
						cx="56"
						cy="56"
						r={R}
						fill="none"
						stroke-width="10"
						stroke-linecap="round"
						stroke-dasharray="{(C * pct) / 100} {C}"
						transform="rotate(-90 56 56)"
					/>
				</svg>
				<span class="ring-label">
					{#if done}<Icon name="check" size={40} stroke={2.6} />{:else}<b>{pct}%</b>{#if job}<small>{job.done}/{job.total}</small>{/if}{/if}
				</span>
			</div>
			<div class="titles">
				<h2 id="dl-title">{heading}</h2>
				<p>
					{#if job}
						{m.dl_meta({
							reciter: reciter(reciterId).name,
							files: m.dl_files({ done: job.done, total: job.total }),
							size: `≈ ${formatBytes(job.bytes)} / ${formatBytes(job.estimate)}`
						})}
					{/if}
				</p>
			</div>
		</div>

		<ul class="items">
			{#each items as item, i (item.id)}
				{@const st = itemStatus(i)}
				<li>
					<div class="row">
						<span class="name">{title(item)}</span>
						<span class="status {st.tone}">{st.text}</span>
					</div>
					<div class="bar"><span class="fill {st.tone}" style="transform: scaleX({st.pct / 100})"></span></div>
				</li>
			{/each}
		</ul>

		<p class="note" role={jobState === 'error' ? 'alert' : undefined}><Icon name="info" size={18} /><span>{note}</span></p>
		{#if usage !== null}<p class="storage">{m.dl_storage({ size: formatBytes(usage) })}</p>{/if}

		<div class="actions">
			{#if done}
				<button type="button" class="primary" onclick={startRepeating}><Icon name="play" size={18} />{m.start_repeating()}</button>
			{:else}
				<button type="button" class="secondary" onclick={cancel}>{m.cancel()}</button>
				<button type="button" class="dark" onclick={primary}>
					{jobState === 'downloading' ? m.dl_pause() : jobState === 'paused' ? m.dl_resume() : m.retry()}
				</button>
			{/if}
		</div>
	</div>
</dialog>

<style>
	dialog {
		width: 100%;
		max-width: 560px;
		max-height: 92dvh;
		margin: auto auto 0;
		padding: 0;
		border: 0;
		border-radius: 28px 28px 0 0;
		background: var(--surface);
		color: var(--ink);
	}
	dialog::backdrop {
		background: var(--scrim);
	}
	@media (min-width: 768px) {
		dialog {
			margin: auto;
			border-radius: 28px;
		}
		.handle {
			visibility: hidden;
		}
	}
	.sheet {
		display: flex;
		flex-direction: column;
		padding: 10px 20px calc(24px + env(safe-area-inset-bottom));
	}
	.top {
		position: relative;
		display: flex;
		justify-content: center;
		min-height: 20px;
	}
	.handle {
		width: 40px;
		height: 5px;
		border-radius: 3px;
		background: var(--line);
	}
	.close {
		position: absolute;
		top: -2px;
		right: -8px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--tap);
		height: var(--tap);
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--muted);
	}
	.head {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-top: 10px;
	}
	.ring {
		position: relative;
		flex-shrink: 0;
		width: 112px;
		height: 112px;
	}
	.arc {
		stroke: var(--accent);
		transition: stroke-dasharray 0.3s;
	}
	.paused .arc {
		stroke: var(--muted);
	}
	.error .arc {
		stroke: var(--danger);
	}
	.ring-label {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--accent);
	}
	.ring-label b {
		font-size: 26px;
		color: var(--ink);
		font-variant-numeric: tabular-nums;
	}
	.ring-label small {
		font-size: 12px;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.titles {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 6px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.titles p {
		/* Two lines reserved so the sheet height (and the buttons under a thumb) never jumps as
		   the size text changes. */
		min-height: calc(13px * 1.45 * 2);
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.items {
		margin: 22px 0 0;
		padding: 0;
		overflow: hidden;
		list-style: none;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
	}
	.items li {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		border-bottom: 1px solid var(--line-soft);
	}
	.items li:last-child {
		border-bottom: 0;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-size: 15px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.status {
		font-size: 13px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.status.ok {
		color: var(--accent);
	}
	.status.bad {
		color: var(--danger);
	}
	.status.muted {
		color: var(--muted);
	}
	.bar {
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
		transition: transform 0.3s;
	}
	.fill.bad {
		background: var(--danger);
	}
	.paused .fill.ink {
		background: var(--muted);
	}
	.note {
		display: flex;
		gap: 10px;
		margin: 14px 0 0;
		padding: 12px 14px;
		border-radius: var(--r-md);
		background: var(--bg);
		font-size: 13px;
		line-height: 1.45;
		color: var(--muted);
	}
	.error .note {
		background: var(--danger-soft);
		color: var(--danger);
	}
	.storage {
		margin: 12px 0 0;
		font-size: 12px;
		color: var(--muted);
	}
	.actions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin-top: 20px;
	}
	.actions button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 52px;
		border-radius: var(--r-md);
		font-size: 15px;
		font-weight: 600;
	}
	.secondary {
		border: 1px solid var(--line);
		background: var(--surface);
	}
	.dark {
		border: 0;
		background: var(--ink);
		color: var(--surface);
	}
	.primary {
		grid-column: 1 / -1;
		border: 0;
		background: var(--accent);
		color: var(--on-accent);
	}
</style>
