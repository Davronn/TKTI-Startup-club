import { expect, test } from '@playwright/test';

// Sahifa xato holatisiz yuklanganini tekshiradi (role="alert" emas — uni Next.js route announcer ham ishlatadi)
async function expectNoErrorState(page: import('@playwright/test').Page) {
  await expect(page.locator('.error-icon')).toHaveCount(0);
}

test('boshqaruv paneli: ko‘rsatkichlar va kassa bloki', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Boshqaruv paneli' })).toBeVisible();
  await expect(page.getByText('Jami startaplar')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bo‘lim kassasi' })).toBeVisible();
  await expect(page.getByText('Joriy balans')).toBeVisible();
  await expectNoErrorState(page);
});

test('startaplar: qidiruv manzilda saqlanadi va sahifa yangilanganda tiklanadi', async ({ page }) => {
  await page.goto('/startups?korinish=table');
  const search = page.getByRole('searchbox', { name: 'Startap nomini qidirish' });
  await search.fill('zzz-mavjud-emas');
  await expect(page).toHaveURL(/q=zzz-mavjud-emas/);
  await expect(page.getByText('Startap topilmadi')).toBeVisible();
  await page.reload();
  await expect(search).toHaveValue('zzz-mavjud-emas');
  await page.getByRole('button', { name: 'Filtrlarni tozalash' }).click();
  await expect(page).not.toHaveURL(/q=/);
});

test('startaplar: jadval sarlavhasi bo‘yicha saralash', async ({ page }) => {
  await page.goto('/startups?korinish=table');
  await page.getByRole('button', { name: /^STARTAP/ }).click();
  await expect(page).toHaveURL(/saralash=name/);
  await expect(page).toHaveURL(/tartib=asc/);
  const names = await page.locator('.data-table tbody .table-startup strong').allInnerTexts();
  expect(names.length).toBeGreaterThan(0);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
  await page.getByRole('button', { name: /^STARTAP/ }).click();
  await expect(page).toHaveURL(/tartib=desc/);
});

test('saqlanmagan o‘zgarishlar haqida ogohlantiradi', async ({ page }) => {
  await page.goto('/startups/new');
  await page.getByPlaceholder('Masalan: AgroSense').fill('Saqlanmagan loyiha');
  let asked = false;
  page.once('dialog', async (dialog) => { asked = true; await dialog.dismiss(); });
  await page.getByRole('navigation').getByRole('link', { name: 'Pipeline' }).click();
  await expect.poll(() => asked).toBe(true);
  await expect(page).toHaveURL(/\/startups\/new$/);
  await expect(page.getByPlaceholder('Masalan: AgroSense')).toHaveValue('Saqlanmagan loyiha');
});

test.describe.serial('startap hayot sikli', () => {
  const name = `E2E sinov ${Date.now()}`;
  let detailUrl = '';

  test('yaratish (jamoa a’zosi bilan)', async ({ page }) => {
    await page.goto('/startups/new');
    await page.getByPlaceholder('Masalan: AgroSense').fill(name);
    await page.getByPlaceholder('Startap nima qiladi va kim uchun?').fill('Vaqtinchalik tavsif');
    await page.getByPlaceholder('Ali Valiyev').fill('Sinov A’zosi');
    await page.locator('select[name=curatorId]').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Startapni saqlash' }).click();
    await expect(page).toHaveURL(/\/startups\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    detailUrl = page.url();
  });

  test('tahrirlash: a’zosi bor startap saqlanadi va tozalangan maydon o‘chadi', async ({ page }) => {
    await page.goto(detailUrl);
    await page.getByRole('link', { name: 'Tahrirlash' }).click();
    const description = page.getByPlaceholder('Startap nima qiladi va kim uchun?');
    await expect(description).toHaveValue('Vaqtinchalik tavsif');
    // Ro‘yxatlar kech yuklansa ham joriy bosqich va kurator tanlangan holda ko‘rinishi kerak
    await expect(page.locator('select[name=currentStageId]')).not.toHaveValue('');
    await expect(page.locator('select[name=curatorId]')).not.toHaveValue('');
    await description.fill('');
    await page.getByRole('button', { name: 'O‘zgarishlarni saqlash' }).click();
    await expect(page).toHaveURL(detailUrl);
    await expect(page.getByText('Startap haqida tavsif kiritilmagan.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Jamoa \(1\)/ })).toBeVisible();
    await expect(page.locator('.curator-card')).toBeVisible();
  });

  test('hujjat yuklash va o‘chirish', async ({ page }) => {
    await page.goto(detailUrl);
    await page.getByRole('button', { name: /^Hujjatlar/ }).click();
    await page.locator('.documents-panel input[type=file]').setInputFiles({
      name: 'pitch-deck.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
    });
    await expect(page.getByRole('link', { name: 'pitch-deck.pdf' })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'pitch-deck.pdf faylini o‘chirish' }).click();
    await expect(page.getByText('Hujjatlar yo‘q')).toBeVisible();
  });

  test('arxivlash (sinov ma’lumotini yig‘ishtirish)', async ({ page }) => {
    await page.goto(detailUrl);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Arxivlash' }).click();
    await expect(page).toHaveURL(/\/startups(\?|$)/);
    await expect(page.getByText(name)).toHaveCount(0);
  });
});

test.describe('telefon o‘lchami', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('pipeline kartasida bosqich tanlash ro‘yxati bor', async ({ page }) => {
    await page.goto('/pipeline');
    await expect(page.locator('.pipeline-move select').first()).toBeVisible();
  });

  test('startaplar telefonda kartochka ko‘rinishida ochiladi', async ({ page }) => {
    await page.goto('/startups');
    await expect(page.locator('.startup-card-grid')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
