import { expect, test } from '@playwright/test';

test.describe('phone', () => {
	test('bottom navigation, replaced by the selection bar while selecting', async ({ page }) => {
		await page.goto('/');
		const nav = page.getByRole('navigation', { name: 'Main' });
		const box = (await nav.boundingBox())!;
		expect(box.width).toBeGreaterThan(box.height); // a horizontal bar…
		expect(box.y + box.height).toBeCloseTo(page.viewportSize()!.height, 0); // …at the bottom
		await page.getByRole('button', { name: 'Select' }).click();
		await expect(nav).toBeHidden();
		await expect(page.getByRole('region', { name: /selected/ })).toBeVisible();
	});
});

test.describe('desktop', () => {
	test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

	test('same bottom navigation as on phones; content in a centred column', async ({ page }) => {
		await page.goto('/');
		const nav = page.getByRole('navigation', { name: 'Main' });
		const box = (await nav.boundingBox())!;
		expect(box.width).toBe(1280); // a full-width horizontal bar…
		expect(box.y + box.height).toBeCloseTo(800, 0); // …at the bottom
		const list = (await page.locator('.list').boundingBox())!;
		expect(list.width).toBeLessThanOrEqual(640);
		expect(list.x + list.width / 2).toBeCloseTo(640, -1); // centred

		await page.getByRole('button', { name: 'Select' }).click();
		await expect(nav).toBeHidden();
		await expect(page.getByRole('region', { name: /selected/ })).toBeVisible();
	});
});
