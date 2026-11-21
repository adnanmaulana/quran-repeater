<script lang="ts">
	import { searchSurahs, surah, type Surah } from '#lib/data/quran.js';
	import { i18n } from '#lib/i18n.svelte.js';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Searchable surah picker (ARIA combobox). Type a name, meaning or number to filter;
	 * arrow keys move, Enter picks, Escape puts the current choice back.
	 */
	let {
		value = $bindable(),
		label,
		min = 1,
		onchange
	}: { value: number; label: string; min?: number; onchange?: () => void } = $props();

	const id = $props.id();
	const lang = $derived(i18n.locale === 'id' ? 'id' : 'en');
	const display = (n: number) => `${n} · ${surah(n).name}`;

	let open = $state(false);
	let query = $state('');
	let text = $state(display(value));
	let active = $state(0);
	let listEl = $state<HTMLUListElement>();

	const matches = (q: string) => searchSurahs(q, lang).filter((s) => s.n >= min);
	const results = $derived(open ? matches(query) : []);

	// Show the chosen surah whenever the picker isn't being typed in (e.g. the parent moves it).
	$effect(() => {
		const v = value;
		if (!open) text = display(v);
	});

	function show() {
		open = true;
		query = '';
		const i = matches('').findIndex((s) => s.n === value);
		active = Math.max(0, i);
		scrollActive();
	}

	function close() {
		open = false;
		text = display(value);
	}

	function pick(s: Surah) {
		open = false;
		if (s.n !== value) {
			value = s.n;
			onchange?.();
		}
		text = display(s.n);
	}

	function move(step: number) {
		if (!results.length) return;
		active = (active + step + results.length) % results.length;
		scrollActive();
	}

	function scrollActive() {
		queueMicrotask(() => listEl?.querySelector(`#${CSS.escape(`${id}-o${active}`)}`)?.scrollIntoView({ block: 'nearest' }));
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!open) return show();
			move(e.key === 'ArrowDown' ? 1 : -1);
		} else if (e.key === 'Enter') {
			if (!open) return;
			e.preventDefault();
			const s = results[active];
			if (s) pick(s);
		} else if (e.key === 'Escape' && open) {
			e.preventDefault();
			close();
		}
	}

	function oninput() {
		if (!open) open = true;
		query = text;
		active = 0;
		scrollActive();
	}
</script>

<div class="picker">
	<label for="{id}-input">{label}</label>
	<input
		id="{id}-input"
		type="text"
		role="combobox"
		autocomplete="off"
		spellcheck="false"
		aria-autocomplete="list"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-activedescendant={open && results.length ? `${id}-o${active}` : undefined}
		bind:value={text}
		onfocus={(e) => {
			show();
			e.currentTarget.select();
		}}
		onblur={close}
		{oninput}
		{onkeydown}
	/>
	{#if open}
		<ul id="{id}-list" role="listbox" aria-label={label} bind:this={listEl}>
			{#each results as s, i (s.n)}
				<li
					id="{id}-o{i}"
					role="option"
					aria-selected={s.n === value}
					class:active={i === active}
					onmousedown={(e) => {
						e.preventDefault(); // keep focus in the input so blur doesn't close first
						pick(s);
					}}
				>
					<span class="num">{s.n}</span>
					<span class="name">{s.name}</span>
					<span class="meaning">{s.meaning[lang]}</span>
				</li>
			{:else}
				<li class="empty" role="presentation">{m.no_results({ query })}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.picker {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	label {
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
		text-overflow: ellipsis;
	}
	ul {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 20;
		width: max(100%, 240px);
		max-height: 280px;
		overflow-y: auto;
		margin: 0;
		padding: 6px;
		list-style: none;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		box-shadow: var(--shadow-float);
	}
	li {
		display: grid;
		grid-template-columns: 2.2em minmax(0, 1fr);
		column-gap: 6px;
		padding: 8px 10px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 15px;
		color: var(--ink);
	}
	li.active {
		background: var(--accent-tint);
	}
	li[aria-selected='true'] .name {
		color: var(--accent);
	}
	.num {
		grid-row: span 2;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.name {
		font-weight: 600;
	}
	.meaning {
		font-size: 12px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	li.empty {
		display: block;
		cursor: default;
		color: var(--muted);
	}
</style>
