<script lang="ts">
	import { tick } from 'svelte';
	import { surah, type Ref } from '#lib/data/quran.js';
	import { BASMALAH_TEXT, arabicNumber, ayahWords, loadSurahText, type SurahText } from '#lib/data/text.js';
	import { estimateSegments, karaoke, loadSurahTimings, type SurahTimings } from '#lib/data/timings.js';
	import { i18n } from '#lib/i18n.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions } from '#lib/player/player.svelte.js';
	import { settings, translationFor } from '#lib/stores/settings.svelte.js';

	/** `active`: audio is playing (read the clock every frame). `gap`: the pause after the ayah. */
	let { ref, basmalah, reciterId, active, gap = false }: { ref: Ref; basmalah: boolean; reciterId: string; active: boolean; gap?: boolean } = $props();

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

	// Word timings; the Basmalah clip is Al-Fatihah 1.
	const timingsSurah = $derived(basmalah ? 1 : ref.s);
	const timingsKey = $derived(`${reciterId}:${timingsSurah}`);
	let timings = $state<{ key: string; t: SurahTimings | null } | null>(null);
	$effect(() => {
		const key = timingsKey;
		const s = timingsSurah;
		if (timings?.key === key) return;
		let cancelled = false;
		loadSurahTimings(s, surah(s).ayat, reciterId)
			.catch(() => null) // offline or API down: fall back to estimated lines
			.then((t) => !cancelled && (timings = { key, t }));
		return () => (cancelled = true);
	});

	const words = $derived(basmalah ? ayahWords(BASMALAH_TEXT) : ayah ? ayahWords(ayah.ar) : []);
	const known = $derived.by(() => {
		if (timings?.key !== timingsKey || !timings.t) return null;
		const segs = timings.t[(basmalah ? 1 : ref.a) - 1];
		// Only trust timings whose words line up with the text shown.
		return segs?.length && segs.every((s) => s.w < words.length) ? segs : null;
	});

	// The audio clock, in ms.
	let now = $state(0);
	let duration = $state(0);
	$effect(() => {
		let raf = 0;
		const read = () => {
			const t = actions.time();
			now = t.current * 1000;
			duration = t.duration * 1000;
			if (active) raf = requestAnimationFrame(read);
		};
		read();
		return () => cancelAnimationFrame(raf);
	});

	const segs = $derived(known ?? (duration ? estimateSegments(words, duration) : []));
	const at = $derived(gap ? { word: words.length - 1, sounding: false, show: words.length - 1 } : karaoke(segs, now));

	function wordState(i: number): 'read' | 'now' | '' {
		if (i < at.word) return 'read';
		if (i === at.word) return at.sounding ? 'now' : 'read';
		return '';
	}

	// Lay the whole ayah out invisibly to find where its lines break, then show only the current line.
	let measurer = $state<HTMLElement>();
	let spans = $state<HTMLElement[]>([]);
	let lineOf = $state<number[]>([]);

	function measure() {
		if (!measurer) return;
		const half = (parseFloat(getComputedStyle(measurer).lineHeight) || 0) / 2;
		const of: number[] = [];
		let top = -Infinity;
		let n = -1;
		spans.slice(0, words.length).forEach((el, i) => {
			const t = el?.offsetTop ?? 0;
			if (t > top + half) {
				top = t;
				n++;
			}
			of[i] = n;
		});
		lineOf = of;
	}

	$effect(() => {
		void words;
		if (!measurer) return;
		lineOf = [];
		tick().then(measure);
		document.fonts?.ready.then(measure);
		const ro = new ResizeObserver(measure);
		ro.observe(measurer);
		return () => ro.disconnect();
	});

	const measured = $derived(lineOf.length === words.length);
	const line = $derived(lineOf[Math.max(0, Math.min(at.show, words.length - 1))] ?? 0);
	const shown = $derived(measured ? words.map((w, i) => ({ w, i })).filter(({ i }) => lineOf[i] === line) : []);
	const lineKey = $derived(`${basmalah ? 'b' : `${ref.s}:${ref.a}`}:${line}`);
</script>

{#snippet word(w: string, i: number)}{w}{#if !basmalah && i === words.length - 1}&nbsp;<span class="marker">﴿{arabicNumber(ref.a)}﴾</span>{/if}{/snippet}

<div class="text">
	{#if basmalah || ayah}
		<div class="stage">
			<p class="ar measure" lang="ar" dir="rtl" aria-hidden="true" bind:this={measurer}>
				{#each words as w, i (i)}<span bind:this={spans[i]}>{@render word(w, i)}</span>{' '}{/each}
			</p>
			<p class="sr-only" lang="ar" dir="rtl">{words.join(' ')}</p>
			{#key lineKey}
				<p class="ar line" class:karaoke={known} lang="ar" dir="rtl" aria-hidden="true">
					{#each shown as { w, i } (i)}<span class="w {known ? wordState(i) : ''}">{@render word(w, i)}</span>{' '}{/each}
				</p>
			{/key}
		</div>
	{/if}
	<div class="info" aria-live="polite">
		{#if basmalah}
			<span class="ref">{m.basmalah()}</span>
		{:else}
			{#if ayah}
				<p class="tr">{ayah.tr}</p>
			{:else if failed}
				<p class="tr">{m.text_failed()}</p>
			{:else}
				<p class="tr loading">{m.text_loading()}</p>
			{/if}
			<span class="ref">{m.ayah_ref({ ref: `${ref.s}:${ref.a}` })}</span>
		{/if}
	</div>
</div>

<style>
	.text {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
		width: 100%;
		max-width: 560px;
		margin: auto;
		padding: 12px 8px;
		text-align: center;
	}
	.info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
	}
	/* One line tall; the measuring copy lies underneath, invisible. */
	.stage {
		position: relative;
		width: 100%;
	}
	.ar {
		margin: 0;
		font-family: var(--font-ar);
		font-size: calc(var(--ar-size) * 1.3);
		line-height: 2.2;
		color: var(--night-ink);
	}
	.measure {
		position: absolute;
		inset: 0 0 auto;
		height: 0; /* lays out fully but adds nothing to the page's scroll height */
		overflow: hidden;
		visibility: hidden;
	}
	.line {
		min-height: 2.2em;
		animation: line-in var(--spring-gentle-ms, 0.3s) var(--spring-gentle, ease);
	}
	@keyframes line-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
	.karaoke .w {
		color: color-mix(in srgb, var(--night-ink) 38%, transparent);
		transition: color 0.15s;
	}
	.karaoke .w.read {
		color: var(--night-ink);
	}
	.karaoke .w.now {
		color: var(--night-accent);
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
