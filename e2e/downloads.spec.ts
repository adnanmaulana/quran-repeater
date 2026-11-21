import { expect, test } from '@playwright/test';
import { controlled, fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

test('downloading a playlist saves every file and marks it offline ready', async ({ page }) => {
	await fakeServices(page);
	await controlled(page);
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Download for offline' }).click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByText('Ready to play offline')).toBeVisible();
	await expect(sheet).toContainText('5/5 files'); // Basmalah + 4 ayat
	await expect(sheet.getByText('Done')).toBeVisible();
	await sheet.getByRole('button', { name: 'Close' }).click();
	await expect(page.locator('.bar p')).toContainText('Offline ready');
	const saved = await page.evaluate(async () => (await (await caches.open('qr-audio-v1')).keys()).map((r) => r.url.split('/').pop()).sort());
	expect(saved).toEqual(['001001.mp3', '112001.mp3', '112002.mp3', '112003.mp3', '112004.mp3']);
});

test('download can be paused, resumed, and removed in Settings', async ({ page }) => {
	await fakeServices(page);
	await controlled(page);
	page.on('dialog', (d) => d.accept());

	// Slow each file down so the download is still running when we press Pause.
	await page.context().route('https://everyayah.com/data/**', async (route) => {
		await new Promise((r) => setTimeout(r, 150));
		await route.fallback();
	});

	await page.getByPlaceholder('Name or number').fill('mulk');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Download for offline' }).click();
	const sheet = page.getByRole('dialog');
	await sheet.getByRole('button', { name: 'Pause' }).click();
	await expect(sheet.getByText('Download paused')).toBeVisible();
	const pausedAt = Number((await sheet.locator('.ring-label small').innerText()).split('/')[0]);
	expect(pausedAt).toBeLessThan(31);
	await sheet.getByRole('button', { name: 'Resume' }).click();
	await expect(sheet.getByText('Ready to play offline')).toBeVisible();
	await expect(sheet).toContainText('31/31 files');
	await sheet.getByRole('button', { name: 'Close' }).click();

	await page.goto('/settings');
	await expect(page.getByText('31 files')).toBeVisible();
	await page.getByRole('button', { name: 'Remove downloads' }).click();
	await expect(page.getByText('Nothing downloaded yet')).toBeVisible();
});

test('a failed download shows the error state and recovers with Retry', async ({ page }) => {
	await fakeServices(page);
	await controlled(page);
	// Make one ayah fail until we allow it.
	let failing = true;
	await page.context().route('https://everyayah.com/data/**/112003.mp3', (route) => (failing ? route.abort('internetdisconnected') : route.fallback()));

	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Download for offline' }).click();
	const sheet = page.getByRole('dialog');
	await expect(sheet.getByText('Download stopped')).toBeVisible();
	await expect(sheet.getByText('Failed')).toBeVisible();

	failing = false;
	await sheet.getByRole('button', { name: 'Retry' }).click();
	await expect(sheet.getByText('Ready to play offline')).toBeVisible();
});
