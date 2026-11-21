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

	test('side rail that stays visible while selecting; content in a centred column', async ({ page }) => {
		await page.goto('/');
		const nav = page.getByRole('navigation', { name: 'Main' });
		const box = (await nav.boundingBox())!;
		expect(box.x).toBe(0);
		expect(box.height).toBeGreaterThan(box.width); // a vertical rail
		const list = (await page.locator('.list').boundingBox())!;
		expect(list.width).toBeLessThanOrEqual(640);
		expect(list.x).toBeGreaterThan(box.width); // beside the rail, not under it

		await page.getByRole('button', { name: 'Select' }).click();
		await expect(nav).toBeVisible();
		const bar = (await page.getByRole('region', { name: /selected/ }).boundingBox())!;
		expect(bar.x).toBeGreaterThanOrEqual(box.width);
	});
});
