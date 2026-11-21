<script lang="ts">
	let { checked, label, onchange }: { checked: boolean; label: string; onchange: (v: boolean) => void } = $props();
</script>

<button type="button" role="switch" aria-checked={checked} aria-label={label} class:on={checked} onclick={() => onchange(!checked)}>
	<span class="knob"></span>
</button>

<style>
	button {
		display: flex;
		flex-shrink: 0;
		width: 52px;
		height: 32px;
		padding: 3px;
		border: 0;
		border-radius: 16px;
		background: var(--border-strong);
		transition:
			background 0.15s,
			transform var(--spring-snappy-ms, 0.2s) var(--spring-snappy, ease-out);
	}
	.knob {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
		/* Bouncy, so the knob lands with a little settle like a physical toggle. */
		transition: transform var(--spring-bouncy-ms, 0.2s) var(--spring-bouncy, ease-out);
	}
	button.on {
		background: var(--accent);
	}
	button.on .knob {
		transform: translateX(20px);
	}
</style>
