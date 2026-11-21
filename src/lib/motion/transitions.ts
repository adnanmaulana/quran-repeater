/**
 * Entering / exiting / layout animations named after Reanimated's layout-animation presets
 * (`FadeIn`, `SlideInDown`, `ZoomIn`, `LinearTransition`…), as Svelte transitions.
 *
 * Performance rules every preset follows:
 * - only `transform` and `opacity` change (compositor-only, no layout or paint per frame) — the
 *   one exception is `collapse`, which animates a single element's height so content below
 *   closes the gap instead of jumping;
 * - they return a `css` function, so Svelte runs them as CSS keyframes rather than JS ticks;
 * - entrances spring, exits use a short timing curve (as Reanimated does), so leaving never
 *   holds up the UI;
 * - with "reduce motion" on they finish instantly.
 */
import { flip } from 'svelte/animate';
import { cubicIn, cubicOut } from 'svelte/easing';
import type { AnimationConfig } from 'svelte/animate';
import type { TransitionConfig } from 'svelte/transition';
import { SPRINGS, type SpringName } from './spring.js';

type EnterOptions = { spring?: SpringName; delay?: number };
type ExitOptions = { duration?: number; delay?: number };

const EXIT_MS = 160;

export function reducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const NONE: TransitionConfig = { duration: 0 };
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function enter(
	{ spring = 'gentle', delay = 0 }: EnterOptions,
	css: (t: number, u: number) => string
): TransitionConfig {
	if (reducedMotion()) return NONE;
	const s = SPRINGS[spring];
	return { delay, duration: s.duration, easing: s.easing, css };
}

function exit({ duration = EXIT_MS, delay = 0 }: ExitOptions, css: (t: number, u: number) => string): TransitionConfig {
	if (reducedMotion()) return NONE;
	return { delay, duration, easing: cubicIn, css };
}

// Opacity reaches 1 within the first part of the spring; an overshooting spring must not push it past 1.
const fade = (t: number) => `opacity: ${clamp01(t * 1.6)}`;

/* ── Entering ─────────────────────────────────────────────────────────────── */

export const fadeIn = (_: Element, o: EnterOptions = {}) => enter(o, (t) => fade(t));

/** Rises from just below, fading in — for cards and banners. */
export const fadeInUp = (_: Element, o: EnterOptions & { y?: number } = {}) =>
	enter(o, (t, u) => `${fade(t)}; transform: translateY(${u * (o.y ?? 12)}px)`);

/** Drops in from just above, fading in. */
export const fadeInDown = (_: Element, o: EnterOptions & { y?: number } = {}) =>
	enter(o, (t, u) => `${fade(t)}; transform: translateY(${-u * (o.y ?? 12)}px)`);

/** Slides up from below its own height — for bars docked at the bottom of the screen. */
export const slideInUp = (_: Element, o: EnterOptions = {}) => enter(o, (_t, u) => `transform: translateY(${u * 100}%)`);

/** Grows from a smaller size — for check marks and badges. */
export const zoomIn = (_: Element, o: EnterOptions & { from?: number } = {}) => {
	const from = o.from ?? 0.4;
	return enter({ spring: 'bouncy', ...o }, (t, u) => `${fade(t)}; transform: scale(${1 - u * (1 - from)})`);
};

/* ── Exiting ──────────────────────────────────────────────────────────────── */

export const fadeOut = (_: Element, o: ExitOptions = {}) => exit(o, (t) => `opacity: ${t}`);

export const slideOutDown = (_: Element, o: ExitOptions = {}) =>
	exit({ duration: 200, ...o }, (_t, u) => `transform: translateY(${u * 100}%)`);

export const zoomOut = (_: Element, o: ExitOptions & { to?: number } = {}) => {
	const to = o.to ?? 0.9;
	return exit(o, (t, u) => `opacity: ${t}; transform: scale(${1 - u * (1 - to)})`);
};

/** Fades and closes up its own height, so what sits below moves up instead of jumping. */
export function collapse(node: Element, o: ExitOptions = {}): TransitionConfig {
	if (reducedMotion()) return NONE;
	const style = getComputedStyle(node);
	const height = parseFloat(style.height);
	const mt = parseFloat(style.marginTop);
	const mb = parseFloat(style.marginBottom);
	return {
		delay: o.delay ?? 0,
		duration: o.duration ?? 220,
		easing: cubicOut,
		css: (t) =>
			`overflow: hidden; opacity: ${clamp01(t * 2 - 1)}; height: ${t * height}px; margin-top: ${t * mt}px; margin-bottom: ${t * mb}px`
	};
}

/* ── Layout ───────────────────────────────────────────────────────────────── */

/**
 * `animate:layout` — siblings glide into their new place when a keyed list changes, like
 * Reanimated's `LinearTransition.springify()`. FLIP only animates `transform`.
 */
export function layout(node: Element, fromTo: { from: DOMRect; to: DOMRect }, o: { spring?: SpringName } = {}): AnimationConfig {
	if (reducedMotion()) return { duration: 0 };
	const s = SPRINGS[o.spring ?? 'gentle'];
	return flip(node, fromTo, { duration: s.duration, easing: s.easing });
}
