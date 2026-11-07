import { CashAccount, CashTransactionKind } from '@prisma/client';
import ExcelJS from 'exceljs';
import {
  AlignmentType,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import {
  CASH_ACCOUNT_LABELS,
  CASH_ACCOUNT_SHORT,
  CASH_COMMISSION_CATEGORY,
  CASH_DOC_PREFIX,
  CASH_KIND_LABELS,
  CASH_MOVE_CATEGORY,
} from './cash.constants';

export interface CashRow {
  id: string;
  kind: CashTransactionKind;
  docNo: number;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  note: string;
  person: string;
  quantity: number | null;
  unitPrice: number | null;
  account: CashAccount | null;
  fromAccount: CashAccount | null;
  toAccount: CashAccount | null;
  recipient: string;
  commissionPct: number;
  commission: number;
  usage: string;
  startup: { id: string; name: string } | null;
  receipt: { id: string; mimeType: string } | null;
  createdAt: string;
  createdByName: string;
}

export interface CashSettingsView {
  orgName: string;
  unitName: string;
  head: string;
  accountant: string;
  openingCash: number;
  openingCard: number;
  openingDate: string | null;
  defaultCommissionPct: number;
}

/* ---------------- hisob-kitob (web'dagi lib/cash.ts bilan bir xil mantiq) ---------------- */

export const income = (r: CashRow) => (r.kind === 'IN' ? r.amount : 0);
export const expense = (r: CashRow) =>
  r.kind === 'OUT' ? r.amount + r.commission : r.kind === 'MOVE' ? r.commission : 0;
export const net = (r: CashRow) => income(r) - expense(r);

export function accountDelta(r: CashRow, account: CashAccount) {
  if (r.kind === 'IN') return r.account === account ? r.amount : 0;
  if (r.kind === 'OUT') return r.account === account ? -(r.amount + r.commission) : 0;
  return (r.fromAccount === account ? -(r.amount + r.commission) : 0) + (r.toAccount === account ? r.amount : 0);
}

const sortAsc = (a: CashRow, b: CashRow) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

export function docLabel(r: Pick<CashRow, 'kind' | 'docNo'>) {
  return `${CASH_DOC_PREFIX[r.kind]}-${String(r.docNo).padStart(3, '0')}`;
}

export function titleOf(r: CashRow) {
  if (r.note) return r.note;
  if (r.kind === 'MOVE') return r.fromAccount === 'CARD' ? 'Kartadan naqd pul yechildi' : 'Naqd pul kartaga qo‘yildi';
  return '';
}

function accountText(r: CashRow) {
  if (r.kind === 'MOVE') return `${CASH_ACCOUNT_SHORT[r.fromAccount!]} → ${CASH_ACCOUNT_SHORT[r.toAccount!]}`;
  return r.account ? CASH_ACCOUNT_LABELS[r.account] : '';
}

export function periodData(rows: CashRow[], settings: CashSettingsView, from?: string, to?: string) {
  const before = rows.filter((r) => from && r.date < from);
  const list = rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)).sort(sortAsc);
  const open = {
    CASH: settings.openingCash + before.reduce((s, r) => s + accountDelta(r, 'CASH'), 0),
    CARD: settings.openingCard + before.reduce((s, r) => s + accountDelta(r, 'CARD'), 0),
  };
  const acc = (a: CashAccount) => ({
    in: list.filter((r) => r.kind === 'IN' && r.account === a).reduce((s, r) => s + r.amount, 0),
    out: list.reduce(
      (s, r) =>
        s +
        (r.kind === 'OUT' && r.account === a
          ? r.amount + r.commission
          : r.kind === 'MOVE' && r.fromAccount === a
            ? r.commission
            : 0),
      0,
    ),
    move: list.reduce(
      (s, r) => s + (r.kind === 'MOVE' ? (r.toAccount === a ? r.amount : 0) - (r.fromAccount === a ? r.amount : 0) : 0),
      0,
    ),
  });
  const byAccount = { CASH: acc('CASH'), CARD: acc('CARD') };
  const inSum = byAccount.CASH.in + byAccount.CARD.in;
  const outSum = byAccount.CASH.out + byAccount.CARD.out;
  const commissionSum = list.reduce((s, r) => s + r.commission, 0);
  const close = {
    CASH: open.CASH + byAccount.CASH.in - byAccount.CASH.out + byAccount.CASH.move,
    CARD: open.CARD + byAccount.CARD.in - byAccount.CARD.out + byAccount.CARD.move,
  };
  return {
    list,
    open,
    byAccount,
    inSum,
    outSum,
    commissionSum,
    close,
    openTotal: open.CASH + open.CARD,
    closeTotal: close.CASH + close.CARD,
  };
}

export type PeriodData = ReturnType<typeof periodData>;

export function categoryTotals(list: CashRow[], side: 'IN' | 'OUT') {
  const totals = new Map<string, number>();
  let commission = 0;
  for (const r of list) {
    if (side === 'OUT') {
      if (r.kind === 'OUT') {
        totals.set(r.category, (totals.get(r.category) || 0) + r.amount);
        commission += r.commission;
      } else if (r.kind === 'MOVE') commission += r.commission;
    } else if (r.kind === 'IN') totals.set(r.category, (totals.get(r.category) || 0) + r.amount);
  }
  if (commission) totals.set(CASH_COMMISSION_CATEGORY, (totals.get(CASH_COMMISSION_CATEGORY) || 0) + commission);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

function journalRows(pd: PeriodData) {
  let running = pd.openTotal;
  return pd.list.map((r, index) => {
    running += net(r);
    return { index: index + 1, r, running };
  });
}

/* ---------------- formatlash ---------------- */

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const dmy = (s: string) => (s ? s.split('-').reverse().join('.') : '');
const monthName = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const categoryOf = (r: CashRow) => (r.kind === 'MOVE' ? CASH_MOVE_CATEGORY : r.category);
const fmtDec = (n: number, dp: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10 ** dp) / 10 ** dp).replace('.', ','));

export interface ExportInput {
  pd: PeriodData;
  settings: CashSettingsView;
  label: string;
}

/* ---------------- CSV ---------------- */

export function buildCsv({ pd }: ExportInput) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  // Excel'da formula sifatida ishga tushmasligi uchun (=, +, -, @ bilan boshlangan matn)
  const safe = (v: unknown) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  const head = ['№', 'Hujjat', 'Sana', 'Turi', 'Kategoriya', 'Izoh', 'Narxi (1 ta)', 'Soni', 'Summa', 'Hisob', 'Kimga', 'Komissiya %', 'Komissiya', 'Kirim', 'Chiqim', 'Qoldiq', 'Ishlatilishi', 'Mas’ul', 'Startap', 'Kiritdi', 'Chek'];
  const lines = [head.map(q).join(',')].concat(
    journalRows(pd).map(({ index, r, running }) =>
      [index, docLabel(r), r.date, CASH_KIND_LABELS[r.kind], categoryOf(r), titleOf(r), r.unitPrice ?? '', r.quantity ?? '', r.amount, accountText(r), r.recipient, r.commissionPct || '', r.commission || '', income(r) || '', expense(r) || '', running, r.usage, r.person, r.startup?.name ?? '', r.createdByName, r.receipt ? 'bor' : 'yo‘q']
        .map((v) => q(safe(v)))
        .join(','),
    ),
  );
  return Buffer.from('﻿' + lines.join('\n'), 'utf8');
}

/* ---------------- Excel ---------------- */

export async function buildXlsx({ pd, settings, label }: ExportInput) {
  const wb = new ExcelJS.Workbook();
  wb.creator = settings.orgName;
  const money = '#,##0';
  const bold = (row: ExcelJS.Row) => row.eachCell((c) => (c.font = { bold: true }));
  const header = (row: ExcelJS.Row) =>
    row.eachCell((c) => {
      c.font = { bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE8FF' } };
    });

  const summary = wb.addWorksheet('Hisobot');
  summary.columns = [{ width: 36 }, { width: 18 }, { width: 18 }, { width: 18 }];
  summary.addRow([`${settings.orgName} · ${settings.unitName}`]).font = { bold: true };
  summary.mergeCells('A1:D1');
  summary.addRow(['KASSA HISOBOTI']).font = { bold: true, size: 14 };
  summary.addRow(['Davr:', label]);
  summary.addRow(['Tuzilgan sana:', dmy(todayIso())]);
  summary.addRow([]);
  header(summary.addRow(['Ko‘rsatkich', 'Naqd kassa', 'Bank kartasi', 'Jami']));
  summary.addRow(['Davr boshidagi qoldiq', pd.open.CASH, pd.open.CARD, pd.openTotal]);
  summary.addRow(['Kirim', pd.byAccount.CASH.in, pd.byAccount.CARD.in, pd.inSum]);
  summary.addRow(['Chiqim', pd.byAccount.CASH.out, pd.byAccount.CARD.out, pd.outSum]);
  summary.addRow(['  shu jumladan bank komissiyasi', null, null, pd.commissionSum]);
  summary.addRow(['Hisoblar aro o‘tkazma (sof)', pd.byAccount.CASH.move, pd.byAccount.CARD.move, 0]);
  bold(summary.addRow(['Davr oxiridagi qoldiq', pd.close.CASH, pd.close.CARD, pd.closeTotal]));
  summary.addRow([]);
  summary.addRow(['Operatsiyalar soni', pd.list.length]);
  summary.addRow([]);
  summary.addRow(['Bo‘lim boshlig‘i:', settings.head || '________________']);
  summary.addRow(['Mas’ul hisobchi:', settings.accountant || '________________']);
  for (const key of ['B', 'C', 'D']) summary.getColumn(key).numFmt = money;

  const journal = wb.addWorksheet('Jurnal', { views: [{ state: 'frozen', ySplit: 2 }] });
  journal.addRow([`Davr boshidagi qoldiq: ${fmt(pd.openTotal)} so‘m`]);
  header(journal.addRow(['№', 'Hujjat №', 'Sana', 'Turi', 'Kategoriya', 'Izoh', 'Narxi (1 ta)', 'Soni', 'Summa', 'Hisob', 'Kimga', 'Komissiya, %', 'Komissiya', 'Kirim', 'Chiqim', 'Qoldiq', 'Ishlatilishi', 'Mas’ul', 'Startap', 'Kiritdi', 'Chek']));
  for (const { index, r, running } of journalRows(pd)) {
    journal.addRow([index, docLabel(r), dmy(r.date), CASH_KIND_LABELS[r.kind], categoryOf(r), titleOf(r), r.unitPrice ?? null, r.quantity ?? null, r.amount, accountText(r), r.recipient || null, r.commissionPct || null, r.commission || null, income(r) || null, expense(r) || null, running, r.usage || null, r.person || null, r.startup?.name ?? null, r.createdByName, r.receipt ? 'bor' : 'yo‘q']);
  }
  journal.addRow([]);
  bold(journal.addRow([null, null, null, null, null, 'Jami', null, null, null, null, null, null, pd.commissionSum, pd.inSum, pd.outSum, pd.closeTotal]));
  [5, 10, 11, 9, 20, 34, 12, 8, 13, 14, 14, 11, 11, 13, 13, 14, 30, 14, 18, 14, 6].forEach((w, i) => (journal.getColumn(i + 1).width = w));
  for (const col of [7, 9, 13, 14, 15, 16]) journal.getColumn(col).numFmt = money;

  const cats = wb.addWorksheet('Yo‘nalishlar');
  cats.columns = [{ width: 32 }, { width: 16, style: { numFmt: money } }, { width: 10, style: { numFmt: '0.0' } }];
  header(cats.addRow(['Chiqim yo‘nalishlari', 'Summa', 'Ulushi, %']));
  for (const [k, v] of categoryTotals(pd.list, 'OUT')) cats.addRow([k, v, pd.outSum ? Math.round((v / pd.outSum) * 1000) / 10 : 0]);
  bold(cats.addRow(['Jami chiqim', pd.outSum, 100]));
  cats.addRow([]);
  header(cats.addRow(['Kirim manbalari', 'Summa', 'Ulushi, %']));
  for (const [k, v] of categoryTotals(pd.list, 'IN')) cats.addRow([k, v, pd.inSum ? Math.round((v / pd.inSum) * 1000) / 10 : 0]);
  bold(cats.addRow(['Jami kirim', pd.inSum, 100]));

  const months = wb.addWorksheet('Oylar');
  months.columns = [{ width: 18 }, ...[15, 15, 18, 15].map((width) => ({ width, style: { numFmt: money } }))];
  header(months.addRow(['Oy', 'Kirim', 'Chiqim', 'Shundan komissiya', 'Farq']));
  for (const m of [...new Set(pd.list.map((r) => r.date.slice(0, 7)))].sort()) {
    const l = pd.list.filter((r) => r.date.startsWith(m));
    const a = l.reduce((s, r) => s + income(r), 0);
    const b = l.reduce((s, r) => s + expense(r), 0);
    months.addRow([monthName(m), a, b, l.reduce((s, r) => s + r.commission, 0), a - b]);
  }

  const cards = pd.list.filter((r) => r.kind === 'OUT' && r.account === 'CARD');
  if (cards.length) {
    const ws = wb.addWorksheet('Karta o‘tkazmalari');
    ws.columns = [10, 11, 18, 13, 11, 11, 13, 30, 40].map((width) => ({ width }));
    header(ws.addRow(['Hujjat №', 'Sana', 'Kimga', 'Summa', 'Komissiya, %', 'Komissiya', 'Jami', 'Izoh', 'Nimaga ishlatildi']));
    for (const r of cards) ws.addRow([docLabel(r), dmy(r.date), r.recipient, r.amount, r.commissionPct || null, r.commission, r.amount + r.commission, r.note, r.usage || 'Yozilmagan']);
    for (const col of [4, 6, 7]) ws.getColumn(col).numFmt = money;
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ---------------- Word ---------------- */

export async function buildDocx({ pd, settings, label }: ExportInput) {
  const FONT = 'Arial';
  const run = (t: unknown, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
    new TextRun({ text: String(t ?? ''), bold: o.bold, size: o.size || 20, color: o.color, font: FONT, italics: o.italics });
  const para = (
    t: string | TextRun[],
    o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean; size?: number; color?: string; after?: number; before?: number; italics?: boolean } = {},
  ) =>
    new Paragraph({
      alignment: o.align,
      spacing: { after: o.after ?? 80, before: o.before ?? 0 },
      children: Array.isArray(t) ? t : [run(t, o)],
    });
  const cell = (t: string, o: { w?: number; fill?: string; right?: boolean; bold?: boolean } = {}) =>
    new TableCell({
      width: o.w ? { size: o.w, type: WidthType.DXA } : undefined,
      shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
      margins: { top: 50, bottom: 50, left: 90, right: 90 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: o.right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [run(t, { bold: o.bold, size: 17 })] })],
    });
  const table = (head: string[], rows: { cells: string[]; bold?: boolean; fill?: string }[], right: number[], widths: number[]) =>
    new Table({
      width: { size: 15000, type: WidthType.DXA },
      columnWidths: widths,
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, { bold: true, fill: 'DCE8FF', right: right.includes(i), w: widths[i] })) }),
        ...rows.map((r) => new TableRow({ cantSplit: true, children: r.cells.map((v, i) => cell(v, { right: right.includes(i), bold: r.bold, fill: r.fill, w: widths[i] })) })),
      ],
    });
  const h2 = (t: string) => para(t, { bold: true, size: 24, before: 240, after: 120, color: '1F4FB8' });
  const nb = (n: number) => fmt(n).replace(/ /g, ' ');
  const m = (n: number) => (n ? nb(n) : '—');
  const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + nb(Math.abs(n));
  const total = { bold: true, fill: 'EEF3FB' };

  const children: (Paragraph | Table)[] = [
    para(settings.orgName, { align: AlignmentType.CENTER, bold: true, size: 22, after: 20 }),
    para(settings.unitName, { align: AlignmentType.CENTER, size: 20, after: 200 }),
    para('KASSA HISOBOTI', { align: AlignmentType.CENTER, bold: true, size: 32, after: 60 }),
    para(`Davr: ${label}`, { align: AlignmentType.CENTER, size: 22, after: 40 }),
    para(`Tuzilgan sana: ${dmy(todayIso())}`, { align: AlignmentType.CENTER, size: 18, color: '666666', after: 200 }),
    h2('1. Umumiy ko‘rsatkichlar (so‘m)'),
    table(
      ['Ko‘rsatkich', 'Naqd kassa', 'Bank kartasi', 'Jami'],
      [
        { cells: ['Davr boshidagi qoldiq', nb(pd.open.CASH), nb(pd.open.CARD), nb(pd.openTotal)] },
        { cells: ['Kirim', m(pd.byAccount.CASH.in), m(pd.byAccount.CARD.in), m(pd.inSum)] },
        { cells: ['Chiqim', m(pd.byAccount.CASH.out), m(pd.byAccount.CARD.out), m(pd.outSum)] },
        { cells: ['   shu jumladan bank komissiyasi', '', '', m(pd.commissionSum)] },
        { cells: ['Hisoblar aro o‘tkazma (sof)', signed(pd.byAccount.CASH.move), signed(pd.byAccount.CARD.move), '0'] },
        { cells: ['Davr oxiridagi qoldiq', nb(pd.close.CASH), nb(pd.close.CARD), nb(pd.closeTotal)], ...total },
      ],
      [1, 2, 3],
      [6000, 3000, 3000, 3000],
    ),
  ];

  const out = categoryTotals(pd.list, 'OUT');
  children.push(h2('2. Chiqim yo‘nalishlari'));
  children.push(
    out.length
      ? table(['Yo‘nalish', 'Summa, so‘m', 'Ulushi'], [...out.map(([k, v]) => ({ cells: [k, nb(v), `${Math.round((v / pd.outSum) * 100)}%`] })), { cells: ['Jami chiqim', nb(pd.outSum), '100%'], ...total }], [1, 2], [9000, 3600, 2400])
      : para('Bu davrda chiqim bo‘lmagan.', { italics: true }),
  );
  const inc = categoryTotals(pd.list, 'IN');
  children.push(h2('3. Kirim manbalari'));
  children.push(
    inc.length
      ? table(['Manba', 'Summa, so‘m', 'Ulushi'], [...inc.map(([k, v]) => ({ cells: [k, nb(v), `${Math.round((v / pd.inSum) * 100)}%`] })), { cells: ['Jami kirim', nb(pd.inSum), '100%'], ...total }], [1, 2], [9000, 3600, 2400])
      : para('Bu davrda kirim bo‘lmagan.', { italics: true }),
  );

  children.push(h2('4. Operatsiyalar jurnali'));
  const jr = journalRows(pd);
  children.push(
    jr.length
      ? table(
          ['№', 'Hujjat', 'Sana', 'Mazmuni', 'Kategoriya', 'Hisob', 'Kirim', 'Chiqim', 'Qoldiq'],
          [
            { cells: ['', '', '', 'Davr boshidagi qoldiq', '', '', '', '', nb(pd.openTotal)], fill: 'F5F8FD' },
            ...jr.map(({ index, r, running }) => ({
              cells: [
                String(index),
                docLabel(r),
                dmy(r.date),
                titleOf(r) +
                  (r.quantity && r.unitPrice ? ` (${fmtDec(r.quantity, 3)} × ${nb(r.unitPrice)})` : '') +
                  (r.recipient ? ` → ${r.recipient}` : '') +
                  (r.startup ? ` · ${r.startup.name}` : ''),
                categoryOf(r),
                accountText(r),
                m(income(r)),
                m(expense(r)),
                nb(running),
              ],
            })),
            { cells: ['', '', '', 'Jami', '', '', nb(pd.inSum), nb(pd.outSum), nb(pd.closeTotal)], ...total },
          ],
          [6, 7, 8],
          [500, 1000, 1200, 4700, 2000, 1600, 1350, 1300, 1350],
        )
      : para('Bu davrda operatsiya bo‘lmagan.', { italics: true }),
  );

  const cards = pd.list.filter((r) => r.kind === 'OUT' && r.account === 'CARD');
  if (cards.length) {
    children.push(h2('5. Karta orqali o‘tkazmalar hisoboti'));
    children.push(
      table(
        ['Hujjat', 'Sana', 'Kimga', 'Summa', 'Komissiya', 'Nimaga ishlatildi'],
        cards.map((r) => ({
          cells: [docLabel(r), dmy(r.date), r.recipient, nb(r.amount), r.commission ? `${nb(r.commission)}${r.commissionPct ? ` (${fmtDec(r.commissionPct, 2)}%)` : ''}` : '—', r.usage || 'Yozilmagan'],
        })),
        [3, 4],
        [1200, 1300, 2500, 1800, 2000, 6200],
      ),
    );
  }

  children.push(para('', { after: 300 }));
  const signature = (role: string, name: string) =>
    para([run(`${role}  `, { bold: true }), run('______________________   '), run(name || '')], { after: 240 });
  children.push(signature('Bo‘lim boshlig‘i:', settings.head), signature('Mas’ul hisobchi:', settings.accountant));

  const doc = new Document({
    creator: settings.orgName,
    title: `Kassa hisoboti — ${label}`,
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
