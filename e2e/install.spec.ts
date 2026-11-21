import { expect, test, type Page } from '@playwright/test';

/** Pretend the browser offered an install prompt, and record whether the app triggered it. */
async function offerInstall(page: Page, outcome: 'accepted' | 'dismissed' = 'accepted') {
	await page.evaluate((outcome) => {
		const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & Record<string, unknown>;
		e.prompt = async () => void ((window as unknown as Record<string, boolean>).__prompted = true);
		e.userChoice = Promise.resolve({ outcome });
		window.dispatchEvent(e);
	}, outcome);
}

const banner = (page: Page) => page.getByRole('complementary', { name: 'Install app' });

test('no install banner until the browser offers one', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Al-Fatihah/ })).toBeVisible();
	await expect(banner(page)).toHaveCount(0);
});

test('the banner triggers the browser install prompt', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Al-Fatihah/ })).toBeVisible();
	await offerInstall(page);
	await expect(banner(page)).toContainText('Install Quran Repeater');
	await banner(page).getByRole('button', { name: 'Install' }).click();
	await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, boolean>).__prompted)).toBe(true);
	await expect(banner(page)).toHaveCount(0);
});

test('"Not now" hides the banner and it stays hidden after a reload', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: /Al-Fatihah/ })).toBeVisible();
	await offerInstall(page);
	await banner(page).getByRole('button', { name: 'Not now' }).click();
	await expect(banner(page)).toHaveCount(0);

	await page.reload();
	await expect(page.getByRole('link', { name: /Al-Fatihah/ })).toBeVisible();
	await offerInstall(page);
	await expect(banner(page)).toHaveCount(0);
});
