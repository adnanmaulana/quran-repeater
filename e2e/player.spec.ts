import { expect, test, type Page } from '@playwright/test';
import { fakeServices, routeServiceWorkerRequests } from './fakes';

routeServiceWorkerRequests(true);

async function startIkhlas(page: Page, { perAyah = 1 } = {}) {
	await page.goto('/');
	await page.getByPlaceholder('Name or number').fill('ikhlas');
	await page.locator('a.row').first().click();
	await expect(page).toHaveURL(/\/setup$/);
	// Default is 3× each; bring it to the wanted count.
	for (let i = 3; i > perAyah; i--) await page.getByRole('button', { name: 'Decrease: Repeat each ayah' }).click();
	await page.getByRole('radio', { name: '0s' }).click();
	await page.getByRole('button', { name: 'Start repeating' }).click();
	await expect(page).toHaveURL(/\/player$/);
}

test('plays the Basmalah, then every ayah with its repeats, then finishes', async ({ page }) => {
	const requested = await fakeServices(page);
	await startIkhlas(page, { perAyah: 2 });
	await expect(page.getByText('Finished')).toBeVisible({ timeout: 15_000 });
	// The audio element asks for each file as it plays it (prefetches use fetch; both are counted).
	expect([...new Set(requested)]).toEqual(expect.arrayContaining(['001001', '112001', '112002', '112003', '112004']));
	expect(requested.indexOf('001001')).toBeGreaterThanOrEqual(0);
	await expect(page.locator('.text .ref')).toHaveText('Ayah 112:4');
	await expect(page.locator('.chip').first()).toHaveText('Repeat 2 of 2');
});

test('shows the Arabic and the translation for the app language', async ({ page }) => {
	await fakeServices(page, 5_000);
	await startIkhlas(page);
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 112:1');
	await expect(page.locator('.text .line')).toContainText('نص 112:1');
	await expect(page.locator('.text .line')).toContainText('﴿١﴾');
	await expect(page.locator('.text .tr')).toHaveText('[en.sahih] 112:1');
});

test('shows one line and colours each word as it is recited', async ({ page }) => {
	await fakeServices(page, 4_000);
	await startIkhlas(page);
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 112:1');
	const now = page.locator('.text .w.now');
	await expect(now).toHaveText('نص');
	await expect(now).toContainText('112:1', { timeout: 4_000 });
	await expect(page.locator('.text .w.read')).toHaveText('نص');
	// Only one line is on screen.
	const [height, lh] = await page.locator('.text .line').evaluate((el) => [el.clientHeight, parseFloat(getComputedStyle(el).lineHeight)]);
	expect(Math.abs(height - lh)).toBeLessThan(1);
});

test('a long ayah moves to its next line as recitation reaches it', async ({ page }) => {
	await fakeServices(page, 6_000);
	// Override the fakes: every ayah is 40 words, each recited in an equal share of the clip.
	const n = 40;
	const words = Array.from({ length: n }, (_, i) => `كلمة${i + 1}`).join(' ');
	await page.context().route('https://api.alquran.cloud/v1/surah/**', (route) => {
		const ids = route.request().url().match(/editions\/([^/?]+)/)![1].split(',');
		const data = ids.map((identifier) => ({ edition: { identifier }, ayahs: Array.from({ length: 4 }, (_, i) => ({ numberInSurah: i + 1, text: words })) }));
		return route.fulfill({ json: { code: 200, data }, headers: { 'access-control-allow-origin': '*' } });
	});
	await page.context().route('https://api.quran.com/api/v4/recitations/**', (route) => {
		const step = 6_000 / n;
		const segments = Array.from({ length: n }, (_, i) => [i, i + 1, i * step, (i + 1) * step]);
		const audio_files = Array.from({ length: 7 }, (_, i) => ({ verse_key: `112:${i + 1}`, segments }));
		return route.fulfill({ json: { audio_files }, headers: { 'access-control-allow-origin': '*' } });
	});
	await startIkhlas(page);
	await page.getByRole('button', { name: 'Next ayah' }).click();
	const line = page.locator('.text .line');
	await expect(line).toContainText('كلمة1 ');
	expect(await line.locator('.w').count()).toBeLessThan(n);
	await expect(line).not.toContainText('كلمة1 ', { timeout: 6_000 });
	await expect(line.locator('.w').first()).toHaveClass(/now|read/);
});

test('controls: next, previous, jump, pause and speed', async ({ page }) => {
	await fakeServices(page, 5_000);
	await startIkhlas(page);
	const ref = page.locator('.text .ref');
	await page.getByRole('button', { name: 'Next ayah' }).click(); // Basmalah → 112:1
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect(ref).toHaveText('Ayah 112:2');
	await page.getByRole('button', { name: 'Previous ayah' }).click();
	await expect(ref).toHaveText('Ayah 112:1');
	await page.getByRole('button', { name: 'Jump to ayah 112:4' }).click();
	await expect(ref).toHaveText('Ayah 112:4');
	await page.getByRole('button', { name: 'Pause' }).click();
	await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Speed 1×' }).click();
	await expect(page.getByRole('button', { name: 'Speed 1.25×' })).toBeVisible();
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('qr.settings')!).data.speed)).toBe(1.25);
});

test('mini player keeps the session across screens and reloads', async ({ page }) => {
	await fakeServices(page, 5_000);
	await startIkhlas(page);
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 112:2');

	await page.getByRole('button', { name: 'Close player' }).click();
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page.locator('.mini')).toContainText('112:2');
	await expect(page.locator('.mini button')).toHaveAttribute('aria-label', 'Pause');

	await page.reload();
	await expect(page.locator('.mini')).toContainText('112:2');
	await expect(page.locator('.mini button')).toHaveAttribute('aria-label', 'Play');
	await page.locator('.mini a').click();
	await expect(page.locator('.text .ref')).toHaveText('Ayah 112:2');

	await page.getByRole('button', { name: 'Stop' }).click();
	await expect(page.locator('.mini')).toHaveCount(0);
});

test('lock-screen metadata names the ayah and reciter', async ({ page }) => {
	await fakeServices(page, 5_000);
	await startIkhlas(page);
	await page.getByRole('button', { name: 'Next ayah' }).click();
	await expect
		.poll(() => page.evaluate(() => `${navigator.mediaSession.metadata?.title} — ${navigator.mediaSession.metadata?.artist}`))
		.toBe('Al-Ikhlas · 112:1 — Mishary Rashid Alafasy');
});

test('player with nothing loaded shows an empty state', async ({ page }) => {
	await page.goto('/player');
	await expect(page.getByText('Nothing is playing')).toBeVisible();
});
