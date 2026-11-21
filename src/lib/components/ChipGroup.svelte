<script lang="ts" generics="T extends string | number">
	type Option = { value: T; label: string };
	let { options, value, label, onchange }: { options: Option[]; value: T; label: string; onchange: (v: T) => void } = $props();

	let buttons: HTMLButtonElement[] = $state([]);

	// Radio-group keyboard pattern: arrows move and select, only the checked chip is tabbable.
	function onkeydown(e: KeyboardEvent, i: number) {
		const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const n = (i + step + options.length) % options.length;
		onchange(options[n].value);
		buttons[n]?.focus();
	}
</script>

<div class="chips" role="radiogroup" aria-label={label} style="--n: {options.length}">
	{#each options as opt, i (opt.value)}
		{@const on = opt.value === value}
		<button
			bind:this={buttons[i]}
			type="button"
			role="radio"
			aria-checked={on}
			tabindex={on ? 0 : -1}
			class:on
			onclick={() => onchange(opt.value)}
			onkeydown={(e) => onkeydown(e, i)}>{opt.label}</button
		>
	{/each}
</div>

<style>
	.chips {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 8px;
	}
	button {
		height: var(--tap);
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		color: var(--ink);
		font-size: 14px;
		font-weight: 500;
	}
	button.on {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
		font-weight: 700;
	}
</style>
