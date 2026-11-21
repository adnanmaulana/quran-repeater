import { expect, test } from '@playwright/test';
import { fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

test('the translation can differ from the app language', async ({ page }) => {
	await fakeServices(page, 60_000);
	await page.goto('/settings');
	await page.getByText('Kementerian Agama RI (Indonesian)').click();
	await expect(page.getByRole('radio', { name: 'Kementerian Agama RI (Indonesian)' })).toBeChecked();

	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect(page.locator('.text .tr')).toHaveText('[id.indonesian] 112:1');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Al-Ikhlas'); // app still in English
});

test('Arabic size and theme apply to the page and are remembered', async ({ page }) => {
	await page.goto('/settings');
	const html = page.locator('html');
	await page.getByRole('radio', { name: 'Large' }).click();
	await expect(html).toHaveAttribute('data-ar-size', 'L');
	await expect(page.locator('.ar-preview')).toHaveCSS('font-size', '36px');
	await page.getByRole('radio', { name: 'Dark' }).click();
	await expect(html).toHaveAttribute('data-theme', 'dark');

	await page.reload();
	await expect(html).toHaveAttribute('data-ar-size', 'L');
	await expect(html).toHaveAttribute('data-theme', 'dark');
	await page.getByRole('radio', { name: 'System' }).click();
	await expect(html).not.toHaveAttribute('data-theme', /.+/);
});

test('every screen is in Indonesian when the app is', async ({ page }) => {
	await page.goto('/settings');
	await page.getByText('Bahasa Indonesia').click();
	for (const [path, heading] of [
		['/history', 'Riwayat'],
		['/playlists', 'Daftar putar'],
		['/reciters', 'Pilih qari'],
		['/player', 'Sedang diputar'],
		['/setup', 'Atur pengulangan']
	]) {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
	}
});
