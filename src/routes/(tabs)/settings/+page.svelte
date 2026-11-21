<script lang="ts">
	import ComingSoon from '#lib/components/ComingSoon.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { i18n, locales, type Locale } from '#lib/i18n.svelte.js';
	import { m } from '#lib/paraglide/messages.js';

	const names: Record<Locale, () => string> = { en: m.lang_en, id: m.lang_id };
</script>

<svelte:head><title>{m.settings_title()} · {m.app_name()}</title></svelte:head>

<ScreenHeader eyebrow={m.saved_on_device()} title={m.settings_title()} />

<section>
	<h2 class="eyebrow" id="lang-heading">{m.language()}</h2>
	<div class="group" role="radiogroup" aria-labelledby="lang-heading">
		{#each locales as locale (locale)}
			{@const on = i18n.locale === locale}
			<label class="option" class:on>
				<input type="radio" name="lang" value={locale} checked={on} onchange={() => i18n.set(locale)} />
				<span class="name" lang={locale}>{names[locale]()}</span>
				<span class="radio" aria-hidden="true"></span>
			</label>
		{/each}
	</div>
	<p class="hint">{m.follows_device()}</p>
</section>

<ComingSoon />

<style>
	section {
		margin: 18px var(--gutter) 0;
	}
	h2 {
		margin: 0 4px 8px;
		color: var(--muted);
	}
	.group {
		overflow: hidden;
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.option {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 60px;
		padding: 0 16px;
		border-bottom: 1px solid var(--line-soft);
		cursor: pointer;
	}
	.option:last-child {
		border-bottom: 0;
	}
	.option.on {
		background: var(--accent-tint);
	}
	.option:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.name {
		flex: 1;
		font-size: 15px;
		font-weight: 600;
	}
	.hint {
		margin: 8px 4px 0;
		font-size: 12px;
		color: var(--muted);
	}
	.radio {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		border: 2px solid var(--border-strong);
		border-radius: 50%;
		background: var(--surface);
	}
	.on .radio {
		border: 7px solid var(--accent);
	}
</style>
