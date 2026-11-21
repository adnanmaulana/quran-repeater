/**
 * Spring physics in the style of Reanimated's `withSpring`: a damped mass on a spring travelling
 * from 0 to 1 with no starting velocity.
 *
 * Each spring is simulated once, up front. The curve is used two ways, and neither runs a
 * per-frame JavaScript loop:
 * - as an easing function for Svelte transitions, which Svelte bakes into CSS keyframes;
 * - as a CSS `linear()` easing (see `springTokens`), so plain CSS transitions spring too.
 * Both end up animating `transform` / `opacity` on the compositor, off the main thread.
 */

export type SpringConfig = { stiffness: number; damping: number; mass?: number };

export type Spring = {
	/** Progress (0 → 1, may overshoot) at normalised time t ∈ [0, 1]. */
	easing: (t: number) => number;
	/** Time for the spring to come to rest, in ms. */
	duration: number;
	/** The same curve as a CSS `linear()` easing. */
	css: string;
};

/** The spring counts as settled once it stays this close to its target. */
const REST = 0.004;
const MAX_MS = 2000;

/** Position at `ms` milliseconds, from the closed-form solution of the damped oscillator. */
export function position({ stiffness, damping, mass = 1 }: SpringConfig, ms: number): number {
	const t = ms / 1000;
	const w0 = Math.sqrt(stiffness / mass);
	const zeta = damping / (2 * Math.sqrt(stiffness * mass));
	if (zeta < 1) {
		const wd = w0 * Math.sqrt(1 - zeta * zeta);
		return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
	}
	if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
	const root = Math.sqrt(zeta * zeta - 1);
	const r1 = -w0 * (zeta - root);
	const r2 = -w0 * (zeta + root);
	return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/** The last moment the spring is still visibly away from its target. */
function settleTime(config: SpringConfig): number {
	let last = 0;
	for (let ms = 0; ms <= MAX_MS; ms += 4) {
		if (Math.abs(1 - position(config, ms)) > REST) last = ms;
	}
	return Math.min(MAX_MS, last + 4);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function spring(config: SpringConfig): Spring {
	const duration = settleTime(config);
	// The tail is a hair from 1; finishing exactly on it avoids a final 1px jump.
	const easing = (t: number) => (t >= 1 ? 1 : t <= 0 ? 0 : position(config, t * duration));
	// About one point per frame keeps the curve faithful, bounces included, at a small string size.
	const points = Math.min(80, Math.max(24, Math.ceil(duration / 16)));
	const stops = Array.from({ length: points + 1 }, (_, i) => round(easing(i / points)));
	return { easing, duration, css: `linear(${stops.join(', ')})` };
}

/**
 * Shared presets, tuned to settle quickly (Reanimated's own default, damping 10 / stiffness 100,
 * wobbles for over a second, which feels slow in a tap-driven UI).
 */
export const SPRINGS = {
	/** Controls that follow a tap: tab indicator, switch knob, press feedback. */
	snappy: spring({ stiffness: 480, damping: 38 }),
	/** Surfaces entering the screen: bars, sheets, lists settling. */
	gentle: spring({ stiffness: 220, damping: 26 }),
	/** Small confirmations that should feel playful: check marks, badges. */
	bouncy: spring({ stiffness: 400, damping: 20 })
} satisfies Record<string, Spring>;

export type SpringName = keyof typeof SPRINGS;

/**
 * CSS custom properties for each preset: `--spring-<name>` (the easing) and
 * `--spring-<name>-ms` (its duration). Components use them with a fallback, e.g.
 * `transition: transform var(--spring-snappy-ms, 0.2s) var(--spring-snappy, ease-out)`.
 */
export function springTokens(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [name, s] of Object.entries(SPRINGS)) {
		out[`--spring-${name}`] = s.css;
		out[`--spring-${name}-ms`] = `${s.duration}ms`;
	}
	return out;
}

/**
 * Publish the tokens on <html>. Skipped where `linear()` is unsupported: an unknown easing would
 * invalidate the whole `transition` shorthand, so those browsers keep the CSS fallbacks instead.
 */
export function installSpringTokens(root: HTMLElement = document.documentElement): void {
	if (typeof CSS === 'undefined' || !CSS.supports('transition-timing-function', 'linear(0, 1)')) return;
	for (const [prop, value] of Object.entries(springTokens())) root.style.setProperty(prop, value);
}
