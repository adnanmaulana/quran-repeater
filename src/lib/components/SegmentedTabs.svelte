<script lang="ts" generics="T extends string">
	type Option = { id: T; label: string };
	let {
		options,
		value = $bindable(),
		label,
		onchange
	}: { options: Option[]; value: T; label: string; onchange?: (v: T) => void } = $props();

	let buttons: HTMLButtonElement[] = $state([]);

	function pick(v: T) {
		if (v === value) return;
		value = v;
		onchange?.(v);
	}

	// Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
	function onkeydown(e: KeyboardEvent, i: number) {
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const next = (i + step + options.length) % options.length;
		pick(options[next].id);
		buttons[next]?.focus();
	}
</script>

<div role="tablist" aria-label={label} style="--n: {options.length}">
	{#each options as opt, i (opt.id)}
		<button
			bind:this={buttons[i]}
			role="tab"
			type="button"
			aria-selected={opt.id === value}
			tabindex={opt.id === value ? 0 : -1}
			onclick={() => pick(opt.id)}
			onkeydown={(e) => onkeydown(e, i)}>{opt.label}</button
		>
	{/each}
</div>

<style>
	div {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 4px;
		padding: 4px;
		border-radius: var(--r-md);
		background: var(--track);
	}
	button {
		height: 40px;
		border: 0;
		border-radius: var(--r-sm);
		background: transparent;
		color: var(--muted);
		font-size: 14px;
		font-weight: 500;
	}
	button[aria-selected='true'] {
		background: var(--surface);
		color: var(--ink);
		font-weight: 700;
		box-shadow: 0 1px 2px rgb(16 32 27 / 0.12);
	}
</style>
