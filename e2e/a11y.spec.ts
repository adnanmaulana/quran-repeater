import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

/** Fail on any WCAG 2.1 A/AA issue axe can detect, listing each one readably. */
async function audit(page: Page, label: string) {
	await page.waitForTimeout(200); // let transitions settle so colours are final
	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
	const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n    ')}`);
	expect(report, `${label}\n${report.join('\n')}`).toEqual([]);
}

async function seed(page: Page) {
	// One session (History, Continue) and one playlist.
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('mulk');
	await page.locator('a.row').first().click();
	await page.getByRole('button', { name: 'Save as playlist' }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await page.getByRole('button', { name: 'Pause' }).click();
}

for (const theme of ['light', 'dark'] as const) {
	test.describe(`${theme} theme`, () => {
		test.use({ colorScheme: theme });

		test('every screen passes axe', async ({ page }) => {
			await fakeServices(page, 60_000);
			await seed(page);
			await audit(page, 'Now playing');

			await page.goto('/');
			await audit(page, 'Home (with mini player)');
			await page.getByRole('tab', { name: 'Juz' }).click();
			await audit(page, 'Home · Juz');
			await page.getByRole('tab', { name: 'Custom ayat' }).click();
			await audit(page, 'Home · Custom ayat');
			await page.getByRole('tab', { name: 'Surah' }).click();
			await page.getByRole('button', { name: 'Select' }).click();
			await page.locator('button.row').first().click();
			await audit(page, 'Home · multi-select');

			await page.goto('/setup');
			await audit(page, 'Setup');
			await page.getByRole('button', { name: 'Download for offline' }).click();
			await expect(page.getByRole('dialog').getByText('Ready to play offline')).toBeVisible();
			await audit(page, 'Download sheet');
			await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

			for (const [path, name] of [
				['/history', 'History'],
				['/playlists', 'Playlists'],
				['/reciters', 'Reciters'],
				['/settings', 'Settings']
			]) {
				await page.goto(path);
				await audit(page, name);
			}
		});

		test('empty states and the save dialog pass axe', async ({ page }) => {
			for (const path of ['/history', '/playlists', '/setup', '/player']) {
				await page.goto(path);
				await audit(page, `${path} (empty)`);
			}
			await page.goto('/');
			await page.getByPlaceholder('Name or number').fill('ikhlas');
			await page.locator('a.row').first().click();
			await page.getByRole('button', { name: 'Save as playlist' }).click();
			await audit(page, 'Save dialog');
		});
	});
}
