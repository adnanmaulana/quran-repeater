import { expect, test, type Page } from '@playwright/test';

async function pick(page: Page, queries: string[]) {
	await page.goto('/');
	await page.getByRole('button', { name: 'Select' }).click();
	for (const q of queries) {
		await page.getByPlaceholder('Name or number').fill(q);
		await page.locator('button.row').first().click();
	}
	await page.getByRole('button', { name: 'Set up repeat' }).click();
	await expect(page).toHaveURL(/\/setup$/);
}

const summary = (page: Page) => page.locator('.bar p');
const order = (page: Page) => page.locator('ol li .name');

test('plays total follows every setting', async ({ page }) => {
	await pick(page, ['kahf', 'sajdah', 'mulk']); // 110 + 30 + 30 ayat
	await expect(summary(page)).toHaveText('3 items · 170 ayat · 510 plays'); // ×3 each
	await page.getByRole('button', { name: 'More loops of Al-Mulk' }).click();
	await expect(summary(page)).toHaveText('3 items · 170 ayat · 600 plays');
	await page.getByRole('button', { name: 'Increase: Repeat whole list' }).click();
	await expect(summary(page)).toHaveText('3 items · 170 ayat · 1200 plays');
	await page.getByRole('switch', { name: 'Loop forever' }).click();
	await expect(summary(page)).toHaveText('3 items · 170 ayat · 600 plays per loop, until you stop');
	await page.getByRole('switch', { name: 'Loop forever' }).click();
	await page.getByRole('button', { name: 'Remove As-Sajdah' }).click();
	await expect(summary(page)).toHaveText('2 items · 140 ayat · 1020 plays');
	await page.reload();
	await expect(summary(page)).toHaveText('2 items · 140 ayat · 1020 plays');
});

test('add mode appends to the playlist and Back goes home', async ({ page }) => {
	await pick(page, ['kahf']);
	await page.getByRole('link', { name: 'Add surah or range' }).click();
	await expect(page.getByText('Adding to your playlist')).toBeVisible();
	await page.getByPlaceholder('Name or number').fill('mulk');
	await page.locator('a.row').first().click();
	await expect(page).toHaveURL(/\/setup$/);
	await expect(order(page)).toHaveText(['1. Al-Kahf', '2. Al-Mulk']);
	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
});

test('mushaf order and keyboard reordering', async ({ page }) => {
	await pick(page, ['mulk', 'kahf', 'sajdah']);
	await page.getByRole('button', { name: 'Mushaf order' }).click();
	await expect(order(page)).toHaveText(['1. Al-Kahf', '2. As-Sajdah', '3. Al-Mulk']);
	await page.getByLabel('Reorder Al-Kahf').focus();
	await page.keyboard.press('Space');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Space');
	await expect(order(page)).toHaveText(['1. As-Sajdah', '2. Al-Kahf', '3. Al-Mulk']);
});

test('shows an empty state with nothing selected', async ({ page }) => {
	await page.goto('/setup');
	await expect(page.getByText('Nothing to repeat yet')).toBeVisible();
});
