<script lang="ts">
	import ChipGroup from '#lib/components/ChipGroup.svelte';
	import ScreenHeader from '#lib/components/ScreenHeader.svelte';
	import { i18n, locales, type Locale } from '#lib/i18n.svelte.js';
	import Icon from '#lib/design/Icon.svelte';
	import { downloadedSummary, formatBytes, removeAllDownloads, storageUsage } from '#lib/offline/downloads.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { install, promptInstall } from '#lib/pwa/install.svelte.js';
	import { BASMALAH_TEXT } from '#lib/data/text.js';
	import { settings, type ArSize, type Theme } from '#lib/stores/settings.svelte.js';

	const names: Record<Locale, () => string> = { en: m.lang_en, id: m.lang_id };

	let downloaded = $state<{ files: number; bytes: number } | null>(null);
	let usage = $state<number | null>(null);

	async function refresh() {
		[downloaded, usage] = await Promise.all([downloadedSummary(), storageUsage()]);
	}
	$effect(() => {
		refresh();
	});

	const translations: { value: string | null; label: () => string }[] = [
		{ value: null, label: m.tr_follow },
		{ value: 'en.sahih', label: m.tr_sahih },
		{ value: 'id.indonesian', label: m.tr_kemenag }
	];
	const set = <K extends keyof typeof settings.value>(k: K, v: (typeof settings.value)[K]) => settings.update((s) => ({ ...s, [k]: v }));

	async function removeDownloads() {
		if (!confirm(m.remove_downloads_confirm())) return;
		await removeAllDownloads();
		await refresh();
	}
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
	<p class="hint">{m.language_hint()}</p>
</section>

<section>
	<h2 class="eyebrow">{m.reading()}</h2>
	<div class="group card">
		<div class="block">
			<h3 id="tr-heading">{m.translation()}</h3>
			<div class="group inner" role="radiogroup" aria-labelledby="tr-heading">
				{#each translations as t (t.value ?? 'follow')}
					{@const on = settings.value.translation === t.value}
					<label class="option" class:on>
						<input type="radio" name="translation" checked={on} onchange={() => set('translation', t.value)} />
						<span class="name small">{t.label()}</span>
						<span class="radio" aria-hidden="true"></span>
					</label>
				{/each}
			</div>
		</div>
		<div class="block">
			<h3>{m.arabic_size()}</h3>
			<p class="ar-preview" lang="ar" dir="rtl">{BASMALAH_TEXT}</p>
			<ChipGroup
				label={m.arabic_size()}
				value={settings.value.arSize}
				options={(['S', 'M', 'L'] as ArSize[]).map((v) => ({ value: v, label: { S: m.size_s(), M: m.size_m(), L: m.size_l() }[v] }))}
				onchange={(v) => set('arSize', v)}
			/>
		</div>
		<div class="block">
			<h3>{m.theme()}</h3>
			<ChipGroup
				label={m.theme()}
				value={settings.value.theme}
				options={(['system', 'light', 'dark'] as Theme[]).map((v) => ({
					value: v,
					label: { system: m.theme_system(), light: m.theme_light(), dark: m.theme_dark() }[v]
				}))}
				onchange={(v) => set('theme', v)}
			/>
		</div>
	</div>
</section>

<section>
	<h2 class="eyebrow">{m.install_title()}</h2>
	<div class="group card">
		{#if install.installed}
			<p class="line ok"><Icon name="check" size={18} stroke={2.6} />{m.install_done()}</p>
		{:else}
			<div class="line">
				<span class="text">{m.install_hint()}</span>
				{#if install.canPrompt}<button type="button" class="action" onclick={promptInstall}>{m.install_button()}</button>{/if}
			</div>
			{#if !install.canPrompt}<p class="line small">{install.ios ? m.install_ios() : m.install_other()}</p>{/if}
		{/if}
	</div>
</section>

<section>
	<h2 class="eyebrow">{m.storage_title()}</h2>
	<div class="group card">
		<div class="line">
			<span class="text">
				<b>{m.downloaded_audio()}</b>
				<small>
					{#if downloaded === null}…{:else if downloaded.files === 0}{m.downloaded_none()}{:else}{m.downloaded_meta({
							files: m.files_count({ count: downloaded.files }),
							size: formatBytes(downloaded.bytes)
						})}{/if}
				</small>
			</span>
		</div>
		{#if downloaded?.files}
			<button type="button" class="line danger" onclick={removeDownloads}>{m.remove_downloads()}</button>
		{/if}
	</div>
	{#if usage !== null}<p class="hint">{m.storage_total({ size: formatBytes(usage) })}</p>{/if}
</section>

<p class="about">{m.about_sources()}</p>

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
		border: 1px solid transparent;
		box-shadow: var(--shadow-card);
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
	.card .line {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 60px;
		margin: 0;
		padding: 12px 16px;
		border: 0;
		border-bottom: 1px solid var(--line-soft);
		background: transparent;
		text-align: left;
		font-size: 14px;
	}
	.card .line:last-child {
		border-bottom: 0;
	}
	.line.ok {
		color: var(--accent);
		font-weight: 600;
	}
	.line.small {
		min-height: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.line.danger {
		color: var(--danger);
		font-size: 15px;
		font-weight: 600;
	}
	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 2px;
		line-height: 1.45;
	}
	.text b {
		font-size: 15px;
		font-weight: 600;
	}
	.text small {
		font-size: 12px;
		color: var(--muted);
	}
	.action {
		flex-shrink: 0;
		height: var(--tap);
		padding: 0 18px;
		border: 0;
		border-radius: 12px;
		background: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}
	.block {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--line-soft);
	}
	.block:last-child {
		border-bottom: 0;
	}
	h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}
	.inner {
		border-color: var(--line);
		border-radius: var(--r-md);
		box-shadow: none; /* nested inside a card: an outline, not a second shadow */
	}
	.name.small {
		font-size: 14px;
		font-weight: 500;
	}
	.ar-preview {
		margin: 0;
		padding: 8px 12px;
		border-radius: 12px;
		background: var(--surface-2);
		font-family: var(--font-ar);
		font-size: var(--ar-size);
		line-height: 1.7;
		text-align: center;
	}
	.about {
		margin: 18px calc(var(--gutter) + 4px) 0;
		font-size: 12px;
		color: var(--muted);
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
