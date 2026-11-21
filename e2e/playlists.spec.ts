import { expect, test, type Page } from '@playwright/test';
import { fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

async function setupKahfAndMulk(page: Page) {
	await page.goto('/');
	await page.getByRole('button', { name: 'Select' }).click();
	for (const q of ['kahf', 'mulk']) {
		await page.getByPlaceholder('Name or number').fill(q);
		await page.locator('button.row').first().click();
	}
	await page.getByRole('button', { name: 'Set up repeat' }).click();
	await expect(page).toHaveURL(/\/setup$/);
}

test('save a playlist, play it, and see its name in History', async ({ page }) => {
	await fakeServices(page, 60_000);
	await setupKahfAndMulk(page);
	await page.getByRole('button', { name: 'Save as playlist' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByLabel('Playlist name')).toHaveValue('Al-Kahf + 1 more');
	await dialog.getByLabel('Playlist name').fill('Friday');
	await dialog.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

	await page.goto('/playlists');
	const card = page.locator('li.card');
	await expect(card).toHaveCount(1);
	await expect(card).toContainText('Friday');
	await expect(card).toContainText('Al-Kahf · Al-Mulk');
	await expect(card).toContainText('140 ayat · 3× each · 1 loop');
	await expect(card).toContainText('Not played yet');
	await expect(card.getByRole('button', { name: /Download · ≈/ })).toBeVisible();

	await page.getByRole('button', { name: 'Play Friday' }).click();
	await expect(page).toHaveURL(/\/player$/);
	await page.getByRole('button', { name: 'Stop' }).click();

	await page.goto('/playlists');
	await expect(page.locator('li.card')).toContainText('Played today');
	await page.goto('/history');
	await expect(page.locator('li.card').first()).toContainText('Friday');
});

test('edit a playlist and save changes over it', async ({ page }) => {
	await setupKahfAndMulk(page);
	await page.getByRole('button', { name: 'Save as playlist' }).click();
	await page.getByRole('dialog').getByLabel('Playlist name').fill('Friday');
	await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

	await page.goto('/playlists');
	await page.getByRole('button', { name: 'Edit Friday' }).click();
	await expect(page).toHaveURL(/\/setup$/);
	await page.getByRole('button', { name: 'Remove Al-Kahf' }).click();
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();

	await page.goto('/playlists');
	await expect(page.locator('li.card')).toHaveCount(1);
	await expect(page.locator('li.card')).toContainText('Friday');
	await expect(page.locator('li.card')).toContainText('30 ayat');
});

test('a playlist’s Download chip opens the download sheet, then shows Offline ready', async ({ page }) => {
	await fakeServices(page);
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Save as playlist' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

	await page.goto('/playlists');
	await page.getByRole('button', { name: /Download · ≈/ }).click();
	await expect(page).toHaveURL(/\/setup\?download=1$/);
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByText('Ready to play offline')).toBeVisible();
	await sheet.getByRole('button', { name: 'Close' }).click();

	await page.goto('/playlists');
	await expect(page.locator('li.card')).toContainText('Offline ready');
});

test('delete a playlist; the empty state explains how to make one', async ({ page }) => {
	await setupKahfAndMulk(page);
	await page.getByRole('button', { name: 'Save as playlist' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await page.goto('/playlists');
	page.on('dialog', (d) => d.accept());
	await page.getByRole('button', { name: 'Delete Al-Kahf + 1 more' }).click();
	await expect(page.getByText('No playlists yet')).toBeVisible();
});
