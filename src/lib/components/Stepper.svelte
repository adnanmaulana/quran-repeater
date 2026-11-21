<script lang="ts">
	import Icon from '#lib/design/Icon.svelte';

	let {
		value,
		display,
		min = 1,
		max = 99,
		label,
		decLabel,
		incLabel,
		compact = false,
		onchange
	}: {
		value: number;
		/** What to show instead of the number, e.g. "3×" or "∞". */
		display?: string;
		min?: number;
		max?: number;
		label: string;
		decLabel: string;
		incLabel: string;
		compact?: boolean;
		onchange: (v: number) => void;
	} = $props();
</script>

<div class="stepper" class:compact role="group" aria-label={label}>
	<button type="button" aria-label={decLabel} disabled={value <= min} onclick={() => onchange(value - 1)}>
		<Icon name="minus" size={compact ? 14 : 16} stroke={2.4} />
	</button>
	<output aria-live="polite">{display ?? value}</output>
	<button type="button" aria-label={incLabel} disabled={value >= max} onclick={() => onchange(value + 1)}>
		<Icon name="plus" size={compact ? 14 : 16} stroke={2.4} />
	</button>
</div>

<style>
	.stepper {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--tap);
		height: var(--tap);
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface-2);
		color: var(--ink);
	}
	button:disabled {
		color: var(--border-strong);
		cursor: not-allowed;
	}
	output {
		min-width: 40px;
		font-size: 18px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}
	.compact {
		gap: 0;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface-2);
	}
	.compact button {
		width: 36px;
		border: 0;
		background: transparent;
	}
	.compact output {
		min-width: 28px;
		font-size: 14px;
	}
</style>
