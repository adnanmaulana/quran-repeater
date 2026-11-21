<script lang="ts">
	import Icon from '#lib/design/Icon.svelte';
	import { zoomIn, zoomOut } from '#lib/motion/transitions.js';

	type Props = {
		badge: string | number;
		title: string;
		meta: string;
		ar: string;
	} & ({ mode: 'link'; href: string; onclick?: (e: MouseEvent) => void } | { mode: 'check'; checked: boolean; ontoggle: () => void });

	let props: Props = $props();
</script>

{#if props.mode === 'link'}
	<a class="row" href={props.href} onclick={props.onclick}>
		<span class="badge">{props.badge}</span>
		<span class="text">
			<span class="title">{props.title}</span>
			<span class="meta">{props.meta}</span>
		</span>
		<span class="ar" lang="ar">{props.ar}</span>
	</a>
{:else}
	<button class="row" class:on={props.checked} type="button" role="checkbox" aria-checked={props.checked} onclick={props.ontoggle}>
		<span class="box" aria-hidden="true">
			{#if props.checked}<span class="mark" in:zoomIn out:zoomOut={{ duration: 100, to: 0.5 }}><Icon name="check" size={16} stroke={3} /></span>{/if}
		</span>
		<span class="text">
			<span class="title">{props.badge} · {props.title}</span>
			<span class="meta">{props.meta}</span>
		</span>
		<span class="ar" lang="ar">{props.ar}</span>
	</button>
{/if}

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 60px;
		padding: 0 14px;
		position: relative;
		border: 0;
		background: var(--surface);
		color: var(--ink);
		text-align: left;
		transition: background-color 0.15s;
	}
	/* Hairline between rows, starting under the text so the badges read as one column. */
	.row:not(:last-child)::after {
		content: '';
		position: absolute;
		right: 0;
		bottom: 0;
		left: 62px;
		height: 1px;
		background: var(--line-soft);
	}
	@media (hover: hover) {
		.row:hover {
			background: var(--surface-2);
		}
	}
	.row:active {
		transform: none;
	}
	.row.on {
		background: var(--accent-tint);
	}
	.badge {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: var(--r-sm);
		background: var(--accent-tint);
		color: var(--accent-ink);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}
	.box {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 8px;
		border: 2px solid var(--border-strong);
		background: var(--surface);
		color: var(--on-accent);
	}
	.mark {
		display: flex;
	}
	.on .box {
		border-color: var(--accent);
		background: var(--accent);
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
		font-weight: 600;
	}
	.meta {
		font-size: 12px;
		color: var(--muted);
	}
	.ar {
		font-family: var(--font-ar);
		font-size: 20px;
		direction: rtl;
		color: var(--accent-ink);
	}
</style>
