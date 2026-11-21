import { expect, test, type Page } from '@playwright/test';
import { fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

async function playMulk(page: Page) {
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('mulk');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await expect(page).toHaveURL(/\/player$/);
	// Next skips the Basmalah to 67:1, then 67:2, then 67:3.
	for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 67:3');
}

test('a session appears in History and resumes at the same ayah and repeat', async ({ page }) => {
	await fakeServices(page, 60_000); // long clips: nothing advances on its own
	await playMulk(page);
	await page.getByRole('button', { name: 'Pause' }).click();
	await page.getByRole('button', { name: 'Stop' }).click();

	await page.getByRole('link', { name: 'History' }).click();
	const card = page.locator('li.card').first();
	await expect(card).toContainText('Al-Mulk');
	await expect(card).toContainText('Mishary Rashid Alafasy · 3× each · 1 loop');
	await expect(page.getByText('Today')).toBeVisible();
	await expect(page.locator('.stats')).toContainText('Sessions1');

	await card.getByRole('button', { name: 'Resume' }).click();
	await expect(page).toHaveURL(/\/player$/);
	await expect(page.locator('.text .ref')).toHaveText('Ayah 67:3');
	await expect(page.locator('.chip').first()).toHaveText('Repeat 1 of 3');
});

test('reopening the app resumes the same session and Continue picks it up', async ({ page }) => {
	await fakeServices(page, 60_000);
	await playMulk(page);
	await page.getByRole('button', { name: 'Next ayah' }).click(); // 67:4
	await expect(page.locator('.text .ref')).toHaveText('Ayah 67:4');

	await page.goto('/'); // reopen
	await expect(page.locator('.mini')).toContainText('67:4 · Repeat 1 of 3');
	await page.locator('.mini a').click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 67:4');

	// After Stop the mini player goes away and Home offers Continue instead.
	await page.getByRole('button', { name: 'Stop' }).click();
	await expect(page.getByRole('button', { name: /Continue/ })).toContainText('Al-Mulk');
	await page.getByRole('button', { name: /Continue/ }).click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 67:4');

	await page.goto('/history');
	await expect(page.locator('li.card')).toHaveCount(1); // resuming continues the same entry
});

test('history entries can be removed and cleared', async ({ page }) => {
	await fakeServices(page, 60_000);
	await playMulk(page);
	await page.getByRole('button', { name: 'Stop' }).click();
	await page.goto('/history');
	page.on('dialog', (d) => d.accept());
	await page.getByRole('button', { name: 'Remove Al-Mulk' }).click();
	await expect(page.getByText('No sessions yet')).toBeVisible();
});
