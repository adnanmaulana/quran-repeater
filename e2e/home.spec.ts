import { expect, test } from '@playwright/test';

test('lists surahs and searches them', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Al-Fatihah/ })).toBeVisible();
	await page.getByPlaceholder('Name or number').fill('mulk');
	await expect(page.locator('a.row')).toHaveCount(1);
	await expect(page.locator('a.row')).toContainText('Al-Mulk');
});

test('the surah list loads 20 at a time as you scroll; search covers all 114', async ({ page }) => {
	await page.goto('/');
	const rows = page.locator('a.row');
	await expect(rows.first()).toBeVisible();
	const first = await rows.count();
	expect(first).toBeLessThanOrEqual(40); // a page or two, enough to fill the screen
	await rows.last().scrollIntoViewIfNeeded();
	await expect.poll(() => rows.count()).toBeGreaterThan(first);
	for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 4000);
	await expect(rows).toHaveCount(114);
	await expect(rows.last()).toContainText('An-Nas');

	await page.getByPlaceholder('Name or number').fill('nas');
	await page.getByPlaceholder('Name or number').fill('');
	await expect.poll(() => rows.count()).toBeLessThanOrEqual(40); // a new search starts from the first page
	await page.getByPlaceholder('Name or number').fill('114');
	await expect(rows).toHaveCount(1);
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
	await page.getByRole('combobox', { name: 'From surah' }).fill('naba');
	await page.getByRole('option', { name: /An-Naba/ }).click();
	await page.getByRole('combobox', { name: 'To surah' }).fill('80');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('combobox', { name: 'To surah' })).toHaveValue("80 · 'Abasa");
	await page.getByLabel('To ayah').fill('42');
	await page.getByLabel('To ayah').blur();
	await expect(page.locator('.summary')).toHaveText('3 surahs · 128 ayat');
});

test('switching to Indonesian is instant and remembered', async ({ page }) => {
	await page.goto('/settings');
	await page.getByText('Bahasa Indonesia', { exact: true }).click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pengaturan');
	await page.reload();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pengaturan');
	await expect(page.locator('html')).toHaveAttribute('lang', 'id');
});
