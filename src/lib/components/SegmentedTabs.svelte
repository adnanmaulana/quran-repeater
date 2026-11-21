<script lang="ts" generics="T extends string">
	type Option = { id: T; label: string };
	let {
		options,
		value = $bindable(),
		label,
		onchange
	}: { options: Option[]; value: T; label: string; onchange?: (v: T) => void } = $props();

	let buttons: HTMLButtonElement[] = $state([]);
	const index = $derived(Math.max(0, options.findIndex((o) => o.id === value)));

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

<div role="tablist" aria-label={label} style="--n: {options.length}; --i: {index}">
	<!-- One shared pill slides between tabs (transform only), instead of each tab repainting. -->
	<span class="indicator" aria-hidden="true"></span>
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
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 4px;
		padding: 4px;
		border-radius: var(--r-md);
		background: var(--track);
	}
	.indicator {
		position: absolute;
		top: 4px;
		left: 4px;
		/* One column: the track minus its padding and the gaps between tabs. */
		width: calc((100% - 8px - (var(--n) - 1) * 4px) / var(--n));
		height: 40px;
		border-radius: var(--r-sm);
		background: var(--surface);
		box-shadow: var(--shadow-card);
		transform: translateX(calc(var(--i) * (100% + 4px)));
		transition: transform var(--spring-snappy-ms, 0.25s) var(--spring-snappy, ease-out);
		will-change: transform;
	}
	button {
		position: relative;
		height: 40px;
		border: 0;
		border-radius: var(--r-sm);
		background: transparent;
		color: var(--muted);
		font-size: 14px;
		font-weight: 500;
		transition:
			color 0.15s,
			transform var(--spring-snappy-ms, 0.2s) var(--spring-snappy, ease-out);
	}
	button[aria-selected='true'] {
		color: var(--ink);
		font-weight: 700;
	}
</style>
