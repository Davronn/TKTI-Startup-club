const test = require('node:test');
const assert = require('node:assert/strict');
const { periodData, categoryTotals, docLabel } = require('../dist/cash/cash-report.js');
const { sniffMime } = require('../dist/cash/cash.service.js');

const row = (o) => ({ commission: 0, account: null, fromAccount: null, toAccount: null, createdAt: '2026-01-01T00:00:00Z', ...o });
const settings = { openingCash: 100, openingCard: 1000 };

test('cash balances: income, card expense with commission, and moves', () => {
  const rows = [
    row({ kind: 'IN', amount: 500, account: 'CASH', date: '2026-11-01', category: 'Grant' }),
    row({ kind: 'OUT', amount: 200, commission: 3, account: 'CARD', date: '2026-11-02', category: 'Marketing' }),
    row({ kind: 'MOVE', amount: 300, commission: 2, fromAccount: 'CARD', toAccount: 'CASH', date: '2026-11-03', category: 'x' }),
  ];
  const pd = periodData(rows, settings);
  assert.equal(pd.close.CASH, 100 + 500 + 300);
  assert.equal(pd.close.CARD, 1000 - 203 - 302);
  assert.equal(pd.outSum, 205);
  assert.equal(pd.commissionSum, 5);
  // davr boshidagi qoldiq oldingi yozuvlarni hisobga oladi
  assert.equal(periodData(rows, settings, '2026-11-02').openTotal, 1600);
  assert.deepEqual(categoryTotals(rows, 'OUT'), [['Marketing', 200], ['Bank komissiyasi', 5]]);
  assert.equal(docLabel({ kind: 'OUT', docNo: 7 }), 'Ch-007');
});

test('receipt type is detected from file content, not extension', () => {
  assert.equal(sniffMime(Buffer.from('%PDF-1.7 aaaaaaaa')), 'application/pdf');
  assert.equal(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/jpeg');
  assert.equal(sniffMime(Buffer.from('<script>alert(1)</script>')), null);
});
