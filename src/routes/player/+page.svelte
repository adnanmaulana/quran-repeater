<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '#lib/design/Icon.svelte';
	import { reciter } from '#lib/data/reciters.js';
	import { title } from '#lib/format.js';
	import { m } from '#lib/paraglide/messages.js';
	import { actions, player } from '#lib/player/player.svelte.js';
	import AyahStrip from './AyahStrip.svelte';
	import AyahText from './AyahText.svelte';
	import Progress from './Progress.svelte';

	const snap = $derived(player.snap);
	const cfg = $derived(snap.config);
	const pos = $derived(snap.pos);
	const item = $derived(cfg && pos ? cfg.items[pos.item] : null);
	const busy = $derived(snap.state === 'playing' || snap.state === 'loading');
	const speeds = [0.75, 1, 1.25, 1.5];

	function close() {
		if (history.length > 1) history.back();
		else goto(resolve('/(tabs)'));
	}

	function stop() {
		actions.stop();
		goto(resolve('/(tabs)'));
	}

	function cycleSpeed() {
		const i = speeds.indexOf(cfg!.speed);
		actions.setSpeed(speeds[(i + 1) % speeds.length]);
	}
</script>

<svelte:head><title>{m.player_title()} · {m.app_name()}</title></svelte:head>

<div class="player">
	<header>
		<button type="button" class="icon" aria-label={m.close_player()} onclick={close}><Icon name="down" /></button>
		<div class="heading">
			{#if item && cfg}
				<h1>{title(item)}</h1>
				<span>{reciter(cfg.reciterId).name}</span>
			{:else}
				<h1>{m.player_title()}</h1>
			{/if}
		</div>
		{#if cfg}
			<button type="button" class="icon" aria-label={m.stop_playback()} onclick={stop}><Icon name="close" /></button>
		{:else}
			<span class="icon" aria-hidden="true"></span>
		{/if}
	</header>

	{#if !cfg || !pos || !item || !snap.ref}
		<div class="empty">
			<p class="empty-title">{m.player_empty()}</p>
			<p>{m.player_empty_hint()}</p>
			<a class="pill" href={resolve('/(tabs)')}>{m.pick_surahs()}</a>
		</div>
	{:else}
		<div class="chips">
			<span class="chip"><Icon name="repeat" size={14} stroke={2.2} />{m.repeat_of({ n: pos.rep + 1, total: cfg.perAyah })}</span>
			<span class="chip">
				{cfg.listLoops === 'infinite' ? m.loop_n({ n: pos.listLoop + 1 }) : m.loop_of({ n: pos.listLoop + 1, total: cfg.listLoops })}
			</span>
			{#if cfg.items.length > 1}
				<span class="chip">{m.item_of({ n: pos.item + 1, total: cfg.items.length })}</span>
			{/if}
		</div>

		<main class="middle">
			<AyahText ref={snap.ref} basmalah={snap.phase === 'basmalah'} />
		</main>

		<section class="bottom">
			<AyahStrip {item} current={pos.ayah} onjump={actions.jumpToAyah} />
			<Progress active={busy} gap={snap.phase === 'gap'} />

			{#if snap.state === 'error'}
				<div class="notice error" role="alert">
					<Icon name="info" size={18} />
					<span>{m.audio_error()}</span>
					<button type="button" onclick={actions.toggle}>{m.retry()}</button>
				</div>
			{/if}

			<div class="controls">
				<button type="button" class="side" aria-label={m.speed_button({ speed: `${cfg.speed}×` })} onclick={cycleSpeed}>{cfg.speed}×</button>
				<button type="button" class="skip" aria-label={m.prev_ayah()} onclick={actions.prev}><Icon name="prev" size={28} /></button>
				<button type="button" class="main" aria-label={busy ? m.pause() : m.play()} onclick={actions.toggle}>
					<Icon name={busy ? 'pause' : 'play'} size={30} />
				</button>
				<button type="button" class="skip" aria-label={m.next_ayah()} onclick={actions.next}><Icon name="next" size={28} /></button>
				<button
					type="button"
					class="side"
					class:on={player.sleepMin > 0}
					aria-label={m.sleep_timer({ state: player.sleepMin ? m.sleep_minutes({ n: player.sleepMin }) : m.sleep_off() })}
					onclick={actions.cycleSleep}
				>
					{#if player.sleepMin}{player.sleepMin}′{:else}<Icon name="moon" size={20} />{/if}
				</button>
			</div>

			<div class="notice">
				<Icon name={snap.state === 'ended' ? 'check' : 'phone'} size={18} />
				<span>{snap.state === 'ended' ? m.finished() : m.background_note()}</span>
				{#if snap.state === 'ended'}
					<button type="button" onclick={actions.toggle}>{m.play_again()}</button>
				{/if}
			</div>
		</section>
	{/if}
</div>

<style>
	:global(body:has(.player)) {
		background: var(--night);
	}
	.player {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		max-width: 560px;
		margin: 0 auto;
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--night);
		color: var(--night-ink);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 16px 12px 0;
	}
	.heading {
		display: flex;
		min-width: 0;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		text-align: center;
	}
	h1 {
		margin: 0;
		overflow: hidden;
		max-width: 100%;
		font-size: 15px;
		font-weight: 600;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.heading span {
		font-size: 12px;
		color: var(--night-muted);
	}
	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--tap);
		height: var(--tap);
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--night-ink);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin: 22px var(--gutter) 0;
	}
	.chip {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 32px;
		padding: 0 12px;
		border-radius: 16px;
		background: var(--night-3);
		font-size: 13px;
		font-weight: 600;
		color: var(--night-ink);
	}
	.chip :global(svg) {
		color: var(--night-accent);
	}
	.middle {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 20px;
	}
	.bottom {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 0 var(--gutter) 24px;
	}
	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.side {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: var(--tap);
		border: 1px solid var(--night-line);
		border-radius: 12px;
		background: transparent;
		color: var(--night-ink);
		font-size: 13px;
		font-weight: 700;
	}
	.side.on {
		border-color: var(--night-accent);
		color: var(--night-accent);
	}
	.skip {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--night-ink);
	}
	.main {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 76px;
		height: 76px;
		border: 0;
		border-radius: 50%;
		background: var(--night-accent);
		color: var(--night);
	}
	.notice {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-radius: var(--r-md);
		background: var(--night-2);
		font-size: 13px;
		color: var(--night-muted);
	}
	.notice :global(svg) {
		color: var(--night-accent);
	}
	.notice span {
		flex: 1;
	}
	.notice button {
		min-height: 36px;
		padding: 0 12px;
		border: 0;
		border-radius: var(--r-sm);
		background: var(--night-3);
		color: var(--night-accent);
		font-weight: 600;
	}
	.notice.error {
		background: #3a1714;
		color: #f4c7c3;
	}
	.notice.error :global(svg) {
		color: #f4c7c3;
	}
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		margin: auto var(--gutter);
		color: var(--night-muted);
		text-align: center;
	}
	.empty p {
		margin: 0;
		font-size: 14px;
	}
	.empty .empty-title {
		color: var(--night-ink);
		font-size: 16px;
		font-weight: 600;
	}
	.pill {
		margin-top: 10px;
		padding: 12px 18px;
		border-radius: 12px;
		background: var(--night-accent);
		color: var(--night);
		font-weight: 600;
	}
</style>
