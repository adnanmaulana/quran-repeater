import { expect, test } from '@playwright/test';
import { controlled, fakeServices, routeServiceWorkerRequests, seedDownloads } from './fakes';

// No service-worker routing here: with it, Playwright fails cache-served responses offline.
routeServiceWorkerRequests(false);

test('the app shell loads with no network', async ({ page, context }) => {
	await controlled(page);
	await context.setOffline(true);
	for (const [path, heading] of [
		['/', 'Quran Repeater'],
		['/setup', 'Repeat setup'],
		['/settings', 'Settings']
	]) {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
	}
});

test('a downloaded playlist plays in airplane mode, after reopening the app', async ({ page, context }) => {
	await fakeServices(page); // text API requests come from the page, so this fakes them
	await controlled(page);
	await seedDownloads(page, ['001001', '112001', '112002', '112003', '112004']);

	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Decrease: Repeat each ayah' }).click(); // 2× each
	await page.getByRole('radio', { name: '0s' }).click();
	await expect(page.locator('.bar p')).toContainText('Offline ready');

	// Play once online so the surah text is saved, as a real download does.
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await expect(page.locator('.text .tr')).toBeVisible();
	await page.getByRole('button', { name: 'Stop' }).click();

	// Airplane mode, and the app reopened from scratch.
	await context.setOffline(true);
	await page.goto('/setup');
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await expect(page.getByText('Finished')).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('.text .ref')).toHaveText('Ayah 112:4');
	await expect(page.locator('.text .tr')).toHaveText('[en.sahih] 112:4');
	await expect(page.getByRole('alert')).toHaveCount(0);
});
