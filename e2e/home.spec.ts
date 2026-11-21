import { expect, test } from '@playwright/test';

test('lists surahs and searches them', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Al-Fatihah/ })).toBeVisible();
	await page.getByPlaceholder('Name or number').fill('mulk');
	await expect(page.locator('a.row')).toHaveCount(1);
	await expect(page.locator('a.row')).toContainText('Al-Mulk');
});

test('multi-select builds a playlist in tap order', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Select' }).click();
	await expect(page.getByRole('navigation')).toHaveCount(0);
	await page.getByRole('checkbox', { name: /Al-Baqarah/ }).click();
	await page.getByRole('checkbox', { name: /Al-Fatihah/ }).click();
	await expect(page.getByRole('region')).toContainText('2 selected');
	await expect(page.getByRole('region')).toContainText('293 ayat');
	await page.getByRole('button', { name: 'Set up repeat' }).click();
	await expect(page).toHaveURL(/\/setup$/);
	await expect(page.locator('ol li .name')).toHaveText(['1. Al-Baqarah', '2. Al-Fatihah']);
});

test('juz tab shows all 30 juz', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('tab', { name: 'Juz' }).click();
	await expect(page.locator('.juz')).toHaveCount(30);
	await expect(page.locator('.juz').last()).toContainText('564 ayat');
});

test('custom range can span surahs', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('tab', { name: 'Custom ayat' }).click();
	await page.getByLabel('From surah').selectOption('78');
	await page.getByLabel('To surah').selectOption('80');
	await page.getByLabel('To ayah').fill('42');
	await page.getByLabel('To ayah').blur();
	await expect(page.locator('.summary')).toHaveText('3 surahs · 128 ayat');
});

test('switching to Indonesian is instant and remembered', async ({ page }) => {
	await page.goto('/settings');
	await page.getByText('Bahasa Indonesia').click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pengaturan');
	await page.reload();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pengaturan');
	await expect(page.locator('html')).toHaveAttribute('lang', 'id');
});
