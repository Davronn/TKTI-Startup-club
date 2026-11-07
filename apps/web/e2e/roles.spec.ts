import { expect, test } from '@playwright/test';

// Kuzatuvchi (VIEWER) faqat ko‘ra oladi. Foydalanuvchini o‘chirish endpointi yo‘q — test oxirida bloklanadi.
test.describe.serial('kuzatuvchi roli', () => {
  const stamp = Date.now();
  const viewer = { name: `E2E Kuzatuvchi ${stamp}`, email: `e2e.viewer.${stamp}@startupclub.uz`, password: `Kuzatuvchi-${stamp}!` };

  test('administrator kuzatuvchi yaratadi', async ({ page }) => {
    await page.goto('/users');
    await page.getByRole('button', { name: 'Foydalanuvchi qo‘shish' }).click();
    const form = page.locator('form.card');
    await form.getByPlaceholder('Ali Valiyev').fill(viewer.name);
    await form.getByPlaceholder('ali@startupclub.uz').fill(viewer.email);
    await form.getByPlaceholder('Kamida 12 belgi').fill(viewer.password);
    await form.locator('select').selectOption('VIEWER');
    await form.getByRole('button', { name: 'Yaratish' }).click();
    await expect(page.locator('.user-card').filter({ hasText: viewer.email })).toContainText('Kuzatuvchi');
  });

  test('kuzatuvchi faqat ko‘rish rejimida ishlaydi', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByPlaceholder('admin@startupclub.uz').fill(viewer.email);
    await page.getByPlaceholder('Parolingizni kiriting').fill(viewer.password);
    await page.getByRole('button', { name: 'Tizimga kirish' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Yaratish tugmalari ko‘rinmaydi, admin bo‘limlari menyuda yo‘q
    await expect(page.getByRole('link', { name: /Startap qo‘shish/ })).toHaveCount(0);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Foydalanuvchilar' })).toHaveCount(0);

    // To‘g‘ridan-to‘g‘ri manzil orqali ham ochilmaydi
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'Ruxsat yo‘q' })).toBeVisible();
    await page.goto('/startups/new');
    await expect(page.getByRole('heading', { name: 'Faqat ko‘rish huquqi' })).toBeVisible();

    await page.goto('/pipeline');
    await expect(page.getByText('kuzatuvchi huquqi bor')).toBeVisible();
    await expect(page.locator('.pipeline-card[draggable=true]')).toHaveCount(0);

    await page.goto('/kassa');
    await expect(page.getByRole('link', { name: 'Yangi yozuv' })).toHaveCount(0);
    await context.close();
  });

  test('administrator kuzatuvchini bloklaydi (sinov ma’lumotini yig‘ishtirish)', async ({ page }) => {
    await page.goto('/users');
    const card = page.locator('.user-card').filter({ hasText: viewer.email });
    page.once('dialog', (dialog) => dialog.accept());
    await card.locator('select').nth(1).selectOption('inactive');
    await expect(card).toContainText('Bloklangan');
  });
});
