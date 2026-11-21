<script lang="ts">
	/**
	 * Ayah number picker (ARIA combobox): type a number or pick from the list of `min`…`max`.
	 * Typing filters the list by prefix; Enter or leaving the field takes the typed number when it
	 * is in range, else the highlighted match, else puts the current choice back.
	 */
	let {
		value = $bindable(),
		label,
		min = 1,
		max,
		onchange
	}: { value: number; label: string; min?: number; max: number; onchange?: () => void } = $props();

	const id = $props.id();

	let open = $state(false);
	let text = $state(String(value));
	let query = $state('');
	let active = $state(0);
	let listEl = $state<HTMLUListElement>();

	const all = $derived(Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i));
	const results = $derived(open ? (query ? all.filter((a) => String(a).startsWith(query)) : all) : []);

	// Show the chosen ayah whenever the picker isn't being typed in (e.g. the parent moves it).
	$effect(() => {
		const v = value;
		if (!open) text = String(v);
	});

	function show() {
		open = true;
		query = '';
		active = Math.max(0, all.indexOf(value));
		scrollActive();
	}

	function pick(a: number) {
		open = false;
		if (a !== value) {
			value = a;
			onchange?.();
		}
		text = String(a);
	}

	/** Take the typed number if it exists, else the highlighted match, else keep the current one. */
	function commit() {
		const n = Number(text.trim());
		if (Number.isInteger(n) && n >= min && n <= max) return pick(n);
		if (query && results[active] !== undefined) return pick(results[active]);
		pick(value);
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
			if (query) commit();
			else if (results[active] !== undefined) pick(results[active]);
		} else if (e.key === 'Escape' && open) {
			e.preventDefault();
			pick(value);
		}
	}

	function oninput() {
		text = text.replace(/\D/g, '');
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
		inputmode="numeric"
		role="combobox"
		autocomplete="off"
		aria-autocomplete="list"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-activedescendant={open && results.length ? `${id}-o${active}` : undefined}
		bind:value={text}
		onfocus={(e) => {
			show();
			e.currentTarget.select();
		}}
		onblur={() => open && commit()}
		{oninput}
		{onkeydown}
	/>
	{#if open && results.length}
		<ul id="{id}-list" role="listbox" aria-label={label} bind:this={listEl}>
			{#each results as a, i (a)}
				<li
					id="{id}-o{i}"
					role="option"
					aria-selected={a === value}
					class:active={i === active}
					onmousedown={(e) => {
						e.preventDefault(); // keep focus in the input so blur doesn't close first
						pick(a);
					}}
				>
					{a}
				</li>
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
	}
	ul {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		z-index: 20;
		width: 100%;
		max-height: 240px;
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
		padding: 10px;
		border-radius: 8px;
		cursor: pointer;
		font-size: 15px;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
	}
	li.active {
		background: var(--accent-tint);
	}
	li[aria-selected='true'] {
		color: var(--accent);
		font-weight: 600;
	}
</style>
