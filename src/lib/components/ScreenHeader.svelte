<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/design/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let {
		title,
		eyebrow,
		backHref,
		actions
	}: { title: string; eyebrow?: string; backHref?: string; actions?: Snippet } = $props();
</script>

{#if backHref}
	<header class="bar">
		<a class="back" href={backHref} aria-label={m.back()}><Icon name="back" /></a>
		<h1 class="small">{title}</h1>
		{@render actions?.()}
	</header>
{:else}
	<header class="big">
		<div>
			{#if eyebrow}<span class="eyebrow-text">{eyebrow}</span>{/if}
			<h1>{title}</h1>
		</div>
		{@render actions?.()}
	</header>
{/if}

<style>
	.big {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 20px var(--gutter) 0;
	}
	.big div {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.eyebrow-text {
		font-size: 13px;
		font-weight: 500;
		color: var(--muted);
	}
	h1 {
		margin: 0;
		font-size: 26px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 16px 12px 0;
	}
	h1.small {
		flex: 1;
		font-size: 17px;
		font-weight: 600;
		letter-spacing: 0;
	}
	.back {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--tap);
		height: var(--tap);
		border-radius: 50%;
		color: var(--ink);
	}
</style>
