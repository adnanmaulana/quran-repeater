<script lang="ts">
	let {
		title,
		meta,
		action,
		disabled = false,
		onaction
	}: { title: string; meta: string; action: string; disabled?: boolean; onaction: () => void } = $props();
</script>

<div class="bar" role="region" aria-label={title} aria-live="polite">
	<span class="text">
		<span class="title">{title}</span>
		<span class="meta">{meta}</span>
	</span>
	<button type="button" {disabled} onclick={onaction}>{action}</button>
</div>

<style>
	.bar {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px var(--gutter) calc(24px + env(safe-area-inset-bottom));
		background: var(--surface);
		border-top: 1px solid var(--line);
	}
	.text {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;
		gap: 2px;
	}
	.title {
		font-size: 15px;
		font-weight: 700;
	}
	.meta {
		overflow: hidden;
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	button {
		height: 52px;
		padding: 0 20px;
		border: 0;
		border-radius: var(--r-md);
		background: var(--accent);
		color: var(--on-accent);
		font-size: 15px;
		font-weight: 600;
	}
	button:disabled {
		background: var(--border-strong);
		cursor: not-allowed;
	}
	@media (min-width: 768px) {
		.bar {
			padding-left: max(var(--gutter), calc((100% - var(--column)) / 2 + var(--gutter)));
			padding-right: max(var(--gutter), calc((100% - var(--column)) / 2 + var(--gutter)));
			padding-bottom: 16px;
		}
	}
</style>
