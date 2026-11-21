import { describe, expect, it } from 'vitest';
import { SPRINGS, position, spring, springTokens } from './spring.js';

describe('spring', () => {
	it('starts at rest at 0 and ends exactly on 1', () => {
		for (const s of Object.values(SPRINGS)) {
			expect(s.easing(0)).toBe(0);
			expect(s.easing(1)).toBe(1);
			expect(Math.abs(1 - s.easing(0.999))).toBeLessThan(0.005);
		}
	});

	it('overshoots when underdamped and never when overdamped', () => {
		const peak = (cfg: { stiffness: number; damping: number }) =>
			Math.max(...Array.from({ length: 500 }, (_, i) => position(cfg, i * 4)));
		expect(peak({ stiffness: 400, damping: 20 })).toBeGreaterThan(1.05);
		expect(peak({ stiffness: 200, damping: 60 })).toBeLessThanOrEqual(1);
	});

	it('keeps presets short enough for tap-driven UI', () => {
		for (const s of Object.values(SPRINGS)) {
			expect(s.duration).toBeGreaterThan(150);
			expect(s.duration).toBeLessThan(900);
		}
	});

	it('renders the curve as a CSS linear() easing from 0 to 1', () => {
		const s = spring({ stiffness: 300, damping: 20 });
		expect(s.css).toMatch(/^linear\(0, .*, 1\)$/);
	});

	it('publishes an easing and a duration token per preset', () => {
		const tokens = springTokens();
		expect(tokens['--spring-snappy']).toMatch(/^linear\(/);
		expect(tokens['--spring-gentle-ms']).toMatch(/^\d+ms$/);
	});
});
