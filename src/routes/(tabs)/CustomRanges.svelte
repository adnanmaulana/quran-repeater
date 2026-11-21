<script lang="ts">
	import Icon from '#lib/design/Icon.svelte';
	import SurahPicker from '#lib/components/SurahPicker.svelte';
	import { countAyat, surah, surahsIn } from '#lib/data/quran.js';
	import { m } from '#lib/paraglide/messages.js';
	import { itemFromRange, type Item } from '#lib/repeat/types.js';

	let { onsubmit }: { onsubmit: (items: Item[]) => void } = $props();

	type Range = { key: number; fromS: number; fromA: number; toS: number; toA: number };
	let nextKey = 1;
	const blank = (): Range => ({ key: nextKey++, fromS: 67, fromA: 1, toS: 67, toA: 10 });

	let ranges = $state<Range[]>([blank()]);

	const clamp = (v: number, max: number) => Math.min(max, Math.max(1, Math.round(v) || 1));

	/** Keep ayah numbers inside their surah, and move the end along when the start passes it. */
	function normalize(r: Range) {
		r.fromA = clamp(r.fromA, surah(r.fromS).ayat);
		r.toA = clamp(r.toA, surah(r.toS).ayat);
		if (r.toS < r.fromS) r.toS = r.fromS;
	}

	const valid = (r: Range) => r.toS > r.fromS || (r.toS === r.fromS && r.toA >= r.fromA);

	function summary(r: Range) {
		if (!valid(r)) return m.range_invalid();
		const ayat = countAyat({ s: r.fromS, a: r.fromA }, { s: r.toS, a: r.toA });
		const n = surahsIn({ s: r.fromS, a: r.fromA }, { s: r.toS, a: r.toA }).length;
		return n > 1 ? m.range_span({ surahs: n, ayat }) : m.range_single({ ayat });
	}

	const allValid = $derived(ranges.every(valid));

	function submit() {
		if (!allValid) return;
		onsubmit(ranges.map((r) => itemFromRange({ s: r.fromS, a: r.fromA }, { s: r.toS, a: r.toA })));
	}
</script>

<div class="wrap">
	{#each ranges as r, i (r.key)}
		<fieldset class="card">
			<legend class="sr-only">{m.range_n({ n: i + 1 })}</legend>
			{#if ranges.length > 1}
				<div class="head">
					<span class="eyebrow">{m.range_n({ n: i + 1 })}</span>
					<button type="button" class="icon" aria-label={m.remove_range({ n: i + 1 })} onclick={() => (ranges = ranges.filter((x) => x.key !== r.key))}>
						<Icon name="close" size={18} />
					</button>
				</div>
			{/if}
			<div class="fields">
				<SurahPicker label={m.from_surah()} bind:value={r.fromS} onchange={() => normalize(r)} />
				<label>
					{m.from_ayah()}
					<input type="number" inputmode="numeric" min="1" max={surah(r.fromS).ayat} bind:value={r.fromA} onchange={() => normalize(r)} />
				</label>
				<SurahPicker label={m.to_surah()} min={r.fromS} bind:value={r.toS} onchange={() => normalize(r)} />
				<label>
					{m.to_ayah()}
					<input type="number" inputmode="numeric" min="1" max={surah(r.toS).ayat} bind:value={r.toA} onchange={() => normalize(r)} />
				</label>
			</div>
			<p class="summary" class:bad={!valid(r)} aria-live="polite">{summary(r)}</p>
		</fieldset>
	{/each}

	<button type="button" class="add" onclick={() => (ranges = [...ranges, blank()])}>{m.add_range()}</button>
	<button type="button" class="primary" disabled={!allValid} onclick={submit}>{m.set_up_repeat()}</button>
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin: 14px var(--gutter) 0;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin: 0;
		padding: 18px;
		border: 1px solid transparent;
		box-shadow: var(--shadow-card);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: -8px -8px -6px 0;
		color: var(--muted);
	}
	.icon {
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
	.fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}

	input {
		width: 100%;
		height: 48px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface-2);
		font-size: 16px;
		font-weight: 600;
		color: var(--ink);
	}
	.summary {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.summary.bad {
		color: var(--danger);
	}
	.add {
		height: var(--tap);
		border: 1px dashed var(--border-strong);
		border-radius: 12px;
		background: transparent;
		color: var(--accent);
		font-size: 14px;
		font-weight: 600;
	}
	.primary {
		height: 52px;
		border: 0;
		border-radius: var(--r-md);
		background: var(--accent);
		color: var(--on-accent);
		font-size: 16px;
		font-weight: 600;
	}
	.primary:disabled {
		background: var(--border-strong);
	}
</style>
