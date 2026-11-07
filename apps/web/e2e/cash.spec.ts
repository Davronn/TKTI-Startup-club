import { expect, Page, test } from '@playwright/test';

// "1 250 000" yoki "−300 000" ko‘rinishidagi balansni songa aylantiradi
async function readBalance(page: Page) {
  await page.goto('/kassa');
  const text = await page.locator('.cash-hero-value').innerText();
  const main = text.split('so')[0];
  return Number(main.replace('−', '-').replace(/[^\d-]/g, ''));
}

async function addEntry(page: Page, kind: 'IN' | 'OUT', amount: string, note: string) {
  await page.goto(`/kassa/yangi?tur=${kind}`);
  await page.getByRole('textbox', { name: 'Summa' }).fill(amount);
  await page.locator('#cash-note').fill(note);
  await page.getByRole('button', { name: /^Saqlash/ }).click();
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'saqlandi' }).first()).toBeVisible();
}

async function journalRows(page: Page, tag: string) {
  await page.goto('/kassa/jurnal');
  await page.getByRole('searchbox', { name: 'Qidirish' }).fill(tag);
  return page.locator('.cash-list .cash-row').filter({ hasText: tag });
}

test.describe.serial('bo‘lim kassasi', () => {
  const tag = `E2E-${Date.now()}`;
  let before = 0;

  test('kirim va chiqim balansni to‘g‘ri o‘zgartiradi', async ({ page }) => {
    before = await readBalance(page);
    await addEntry(page, 'IN', '1000000', `${tag} kirim`);
    await addEntry(page, 'OUT', '250000', `${tag} chiqim`);
    expect(await readBalance(page)).toBe(before + 750_000);
    await expect(await journalRows(page, tag)).toHaveCount(2);
  });

  test('arxivlangan yozuv balansdan chiqadi, tiklanganda qaytadi', async ({ page }) => {
    let rows = await journalRows(page, tag);
    // Chiqimni arxivlaymiz: balans 250 000 ga oshishi kerak
    const outRow = rows.filter({ hasText: `${tag} chiqim` });
    await outRow.getByRole('button', { name: 'Arxivga o‘tkazish' }).click();
    await page.getByRole('textbox', { name: 'Arxivlash sababi' }).fill('E2E sinov');
    await page.getByRole('button', { name: 'Ha, arxivga' }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'arxivga' }).first()).toBeVisible();
    expect(await readBalance(page)).toBe(before + 1_000_000);

    await page.goto('/kassa/sozlamalar');
    const archived = page.locator('.cash-row.archived').filter({ hasText: `${tag} chiqim` });
    await expect(archived).toContainText('Sababi: E2E sinov');
    await archived.getByRole('button', { name: 'Tiklash' }).click();
    await expect(archived).toHaveCount(0);
    expect(await readBalance(page)).toBe(before + 750_000);

    rows = await journalRows(page, tag);
    await expect(rows).toHaveCount(2);
  });

  test('sinov yozuvlarini arxivlab, butunlay o‘chirish', async ({ page }) => {
    for (let i = 0; i < 2; i += 1) {
      const rows = await journalRows(page, tag);
      await rows.first().getByRole('button', { name: 'Arxivga o‘tkazish' }).click();
      await page.getByRole('button', { name: 'Ha, arxivga' }).click();
      await expect(rows).toHaveCount(1 - i);
    }
    await page.goto('/kassa/sozlamalar');
    const archived = page.locator('.cash-row.archived').filter({ hasText: tag });
    await expect(archived).toHaveCount(2);
    for (let i = 0; i < 2; i += 1) {
      await archived.first().getByRole('button', { name: 'Butunlay o‘chirish' }).click();
      await page.getByRole('button', { name: 'Ha, o‘chirish' }).click();
      await expect(archived).toHaveCount(1 - i);
    }
    expect(await readBalance(page)).toBe(before);
  });
});
