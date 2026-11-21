<script lang="ts">
	import type { Ref } from '#lib/data/quran.js';
	import { BASMALAH_TEXT, arabicNumber, loadSurahText, type SurahText } from '#lib/data/text.js';
	import { i18n } from '#lib/i18n.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { settings, translationFor } from '#lib/stores/settings.svelte.js';

	let { ref, basmalah }: { ref: Ref; basmalah: boolean } = $props();

	const translation = $derived(translationFor(i18n.locale, settings.value));

	let text = $state<SurahText | null>(null);
	let failed = $state(false);

	// Load the whole surah once; stepping through its ayat is then instant.
	$effect(() => {
		const s = ref.s;
		const tr = translation;
		if (text?.s === s && text.translation === tr) return;
		let cancelled = false;
		failed = false;
		loadSurahText(s, tr)
			.then((t) => !cancelled && (text = t))
			.catch(() => !cancelled && (failed = true));
		return () => (cancelled = true);
	});

	const ayah = $derived(text?.s === ref.s && text.translation === translation ? text.ayat[ref.a - 1] : null);
</script>

<div class="text" aria-live="polite">
	{#if basmalah}
		<p class="ar" lang="ar" dir="rtl">{BASMALAH_TEXT}</p>
		<span class="ref">{m.basmalah()}</span>
	{:else}
		{#if ayah}
			<p class="ar" lang="ar" dir="rtl">{ayah.ar} <span class="marker">﴿{arabicNumber(ref.a)}﴾</span></p>
			<p class="tr">{ayah.tr}</p>
		{:else if failed}
			<p class="tr">{m.text_failed()}</p>
		{:else}
			<p class="tr loading">{m.text_loading()}</p>
		{/if}
		<span class="ref">{m.ayah_ref({ ref: `${ref.s}:${ref.a}` })}</span>
	{/if}
</div>

<style>
	.text {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
		max-width: 560px;
		margin: auto;
		padding: 12px 8px;
		text-align: center;
	}
	.ar {
		margin: 0;
		font-family: var(--font-ar);
		font-size: calc(var(--ar-size) * 1.3);
		line-height: 1.9;
		color: #fff;
	}
	.marker {
		color: var(--night-accent);
	}
	.tr {
		max-width: 340px;
		margin: 0;
		font-size: 16px;
		line-height: 1.55;
		color: var(--night-muted);
	}
	.loading {
		opacity: 0.7;
	}
	.ref {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--night-accent);
	}
</style>
