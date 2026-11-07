import { expect, test as setup } from '@playwright/test';

const email = process.env.E2E_EMAIL || 'admin@startupclub.uz';
const password = process.env.E2E_PASSWORD || 'ChangeMe123!';

setup('administrator sifatida kirish', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('admin@startupclub.uz').fill(email);
  await page.getByPlaceholder('Parolingizni kiriting').fill(password);
  await page.getByRole('button', { name: 'Tizimga kirish' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});
