<script lang="ts">
	import { actions } from '#lib/player/player.svelte.js';
	import { m } from '#lib/paraglide/messages.js';

	/** `gap`: the silent pause between repeats is playing; show the ayah as finished. */
	let { active, gap = false }: { active: boolean; gap?: boolean } = $props();

	let current = $state(0);
	let duration = $state(0);

	// Read the clock every frame while playing; nothing re-renders on timeupdate events.
	$effect(() => {
		let raf = 0;
		const tick = () => {
			({ current, duration } = actions.time());
			if (active) raf = requestAnimationFrame(tick);
		};
		tick();
		return () => cancelAnimationFrame(raf);
	});

	let ayahLength = $state(0);
	$effect(() => {
		if (!gap) ayahLength = duration;
	});
	const pct = $derived(gap ? 100 : duration ? Math.min(100, (current / duration) * 100) : 0);
	const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
</script>

<div class="progress">
	<div
		class="track"
		role="progressbar"
		aria-label={m.ayah_progress()}
		aria-valuemin={0}
		aria-valuemax={Math.round(duration)}
		aria-valuenow={Math.round(current)}
		aria-valuetext={m.time_of({ current: fmt(current), total: fmt(duration) })}
	>
		<div class="fill" style="transform: scaleX({pct / 100})"></div>
	</div>
	<div class="times"><span>{fmt(gap ? ayahLength : current)}</span><span>{fmt(gap ? ayahLength : duration)}</span></div>
</div>

<style>
	.progress {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.track {
		height: 4px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--night-line);
	}
	.fill {
		height: 100%;
		background: var(--night-accent);
		transform-origin: left;
	}
	.times {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--night-muted);
		font-variant-numeric: tabular-nums;
	}
</style>
