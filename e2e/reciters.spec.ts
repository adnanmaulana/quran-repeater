import { expect, test } from '@playwright/test';
import { fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

test('choose a reciter from Setup and it sticks', async ({ page }) => {
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('link', { name: /Reciter/ }).click();
	await expect(page).toHaveURL(/\/reciters$/);
	await expect(page.getByRole('radio', { name: /Mishary Rashid Alafasy/ })).toHaveAttribute('aria-checked', 'true');

	await page.getByRole('radio', { name: /Mahmoud Khalil Al-Husary/ }).click();
	await expect(page.getByRole('radio', { name: /Mahmoud Khalil Al-Husary/ })).toHaveAttribute('aria-checked', 'true');
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page.locator('a.reciter')).toContainText('Mahmoud Khalil Al-Husary');
	await page.reload();
	await expect(page.locator('a.reciter')).toContainText('Mahmoud Khalil Al-Husary');
});

test('search and filters', async ({ page }) => {
	await page.goto('/reciters');
	await expect(page.getByRole('radio')).toHaveCount(8);
	await page.getByRole('button', { name: 'Mujawwad' }).click();
	await expect(page.getByRole('radio')).toHaveCount(1);
	await expect(page.getByRole('radio')).toContainText('Abdul Basit Abdul Samad');
	await page.getByRole('button', { name: 'All' }).click();
	await page.getByPlaceholder('Search reciters').fill('shatri');
	await expect(page.getByRole('radio')).toHaveCount(1);
	await page.getByPlaceholder('Search reciters').fill('zzz');
	await expect(page.getByText('No reciters match')).toBeVisible();
});

test('Downloaded filter lists reciters with saved audio', async ({ page }) => {
	await fakeServices(page);
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Download for offline' }).click();
	await expect(page.getByRole('dialog').getByText('Ready to play offline')).toBeVisible();
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

	await page.goto('/reciters');
	await page.getByRole('button', { name: 'Downloaded', exact: true }).click();
	await expect(page.getByRole('radio')).toHaveCount(1);
	await expect(page.getByRole('radio')).toContainText('Mishary Rashid Alafasy');
	await expect(page.getByRole('radio')).toContainText('Murattal · Downloaded');
});

test('preview plays a sample and pauses the running repeat', async ({ page }) => {
	const requested = await fakeServices(page, 60_000);
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await expect(page.locator('.main')).toHaveAttribute('aria-label', 'Pause');

	// Back to Setup and on to Reciters in-app, so the repeat keeps playing.
	await page.getByRole('button', { name: 'Close player' }).click();
	await page.getByRole('link', { name: /Reciter/ }).click();
	const state = () => page.evaluate(() => navigator.mediaSession.playbackState);
	await expect.poll(state).toBe('playing');
	await page.getByRole('button', { name: 'Preview Saad Al-Ghamdi' }).click();
	await expect.poll(state).toBe('paused');
	await expect(page.getByRole('button', { name: 'Stop preview of Saad Al-Ghamdi' })).toHaveAttribute('aria-pressed', 'true');
	expect(requested).toContain('001002');
	await page.getByRole('button', { name: 'Stop preview of Saad Al-Ghamdi' }).click();
	await expect(page.getByRole('button', { name: 'Preview Saad Al-Ghamdi' })).toBeVisible();
});
