import { test, expect } from '@playwright/test';

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@smartshelf.ai';
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'Admin448.';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(adminEmail);
  await page.getByTestId('login-password').fill(adminPassword);
  await page.getByTestId('login-submit').click();
  await page.waitForURL('http://127.0.0.1:3000/');
}

test.describe.configure({ mode: 'serial' });

test('login, stores ve employees ekranlari aciliyor', async ({ page }) => {
  await login(page);
  await expect(page.locator('main')).toContainText(/Overview|Genel/);

  await page.goto('/stores');
  await expect(page.locator('main')).toContainText(/Create New Store|Edit Store|Delete Store|View Logs/);

  await page.goto('/stores/edit');
  await expect(page.locator('main')).toContainText(/Store Name|Location|Actions/);

  await page.goto('/company-employees');
  await expect(page.locator('main')).toContainText(/Company Employees|Add User|Role/);
});

test('dil ve tema ayarlari yeni oturumda korunuyor', async ({ browser }) => {
  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();

  await login(firstPage);
  await firstPage.getByTestId('language-toggle').click();
  await firstPage.getByTestId('language-option-tr').click();
  await expect.poll(async () => firstPage.evaluate(() => document.documentElement.lang)).toBe('tr');

  const darkBefore = await firstPage.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!darkBefore) {
    await firstPage.getByTestId('theme-toggle').click();
  }
  await expect.poll(async () => firstPage.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await firstPage.reload();
  await expect.poll(async () => firstPage.evaluate(() => document.documentElement.lang)).toBe('tr');
  await expect.poll(async () => firstPage.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await firstContext.close();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await login(secondPage);
  await expect.poll(async () => secondPage.evaluate(() => document.documentElement.lang)).toBe('tr');
  await expect.poll(async () => secondPage.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  await secondPage.getByTestId('language-toggle').click();
  await secondPage.getByTestId('language-option-en').click();
  await expect.poll(async () => secondPage.evaluate(() => document.documentElement.lang)).toBe('en');
  await secondPage.getByTestId('theme-toggle').click();
  await expect.poll(async () => secondPage.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  await secondContext.close();
});
