import {
  ArrowLeftRight,
  Banknote,
  Bus,
  CalendarDays,
  CircleEllipsis,
  CirclePlus,
  Cloud,
  Coffee,
  FileSignature,
  Gift,
  HeartHandshake,
  Landmark,
  Laptop,
  LucideIcon,
  Megaphone,
  Percent,
  Ticket,
  Trophy,
} from 'lucide-react';
import { Role } from './types';

export type CashKind = 'IN' | 'OUT' | 'MOVE';
export type CashAccount = 'CASH' | 'CARD';

export interface CashTransaction {
  id: string;
  kind: CashKind;
  docNo: number;
  amount: number;
  date: string;
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
  archivedAt: string | null;
  archiveReason: string;
  archivedByName: string;
  createdAt: string;
  createdByName: string;
  updatedAt: string;
  updatedByName: string;
}

export interface CashSettings {
  orgName: string;
  unitName: string;
  head: string;
  accountant: string;
  openingCash: number;
  openingCard: number;
  openingDate: string | null;
  defaultCommissionPct: number;
}

/* ---------------- kategoriyalar (API: apps/api/src/cash/cash.constants.ts) ---------------- */

type CategoryMeta = { name: string; color: string; icon: LucideIcon };

export const CASH_OUT_CATEGORIES: CategoryMeta[] = [
  { name: 'Tadbirlar', color: '#f97316', icon: CalendarDays },
  { name: 'Marketing', color: '#ec4899', icon: Megaphone },
  { name: 'Oziq-ovqat', color: '#d99a06', icon: Coffee },
  { name: 'Transport', color: '#0ea5e9', icon: Bus },
  { name: 'Jihozlar', color: '#6366f1', icon: Laptop },
  { name: 'Obunalar va servislar', color: '#14b8a6', icon: Cloud },
  { name: 'Bosma va sovg‘alar', color: '#ef4444', icon: Gift },
  { name: 'Boshqa chiqim', color: '#64748b', icon: CircleEllipsis },
];

export const CASH_IN_CATEGORIES: CategoryMeta[] = [
  { name: 'Shartnoma', color: '#7c3aed', icon: FileSignature },
  { name: 'Byudjet ajratmasi', color: '#2563eb', icon: Landmark },
  { name: 'Homiylik', color: '#e11d74', icon: HeartHandshake },
  { name: 'Grant', color: '#f59e0b', icon: Trophy },
  { name: 'Tadbir chiptalari', color: '#10b981', icon: Ticket },
  { name: 'Boshqa kirim', color: '#22a84b', icon: CirclePlus },
];

export const MOVE_CATEGORY = 'Hisoblar aro o‘tkazma';
export const COMMISSION_CATEGORY = 'Bank komissiyasi';

const META = new Map<string, CategoryMeta>(
  [...CASH_OUT_CATEGORIES, ...CASH_IN_CATEGORIES].map((item) => [item.name, item]),
);
META.set(MOVE_CATEGORY, { name: MOVE_CATEGORY, color: '#0891b2', icon: ArrowLeftRight });
META.set(COMMISSION_CATEGORY, { name: COMMISSION_CATEGORY, color: '#475569', icon: Percent });

export const categoryMeta = (name: string) =>
  META.get(name) ?? { name, color: '#64748b', icon: Banknote };

export const categoriesFor = (kind: CashKind) => (kind === 'IN' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES);

export const ACCOUNT_LABELS: Record<CashAccount, string> = { CASH: 'Naqd kassa', CARD: 'Bank kartasi' };
export const ACCOUNT_SHORT: Record<CashAccount, string> = { CASH: 'Naqd', CARD: 'Karta' };
export const KIND_LABELS: Record<CashKind, string> = { IN: 'Kirim', OUT: 'Chiqim', MOVE: 'O‘tkazma' };
const DOC_PREFIX: Record<CashKind, string> = { IN: 'K', OUT: 'Ch', MOVE: 'O' };

/* ---------------- huquqlar ---------------- */

export const canWriteCash = (role?: Role) => role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER';
export const isCashAdmin = (role?: Role) => role === 'SUPER_ADMIN' || role === 'ADMIN';

/* ---------------- formatlash ---------------- */

export const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
export const money = (n: number, signed = false) => (signed && n > 0 ? '+' : '') + (n < 0 ? '−' : '') + fmt(Math.abs(n));
export const shortMoney = (n: number) =>
  n >= 1e6 ? `${String(Math.round(n / 1e5) / 10).replace('.', ',')} mln` : n >= 1e3 ? `${Math.round(n / 1e3)} ming` : String(Math.round(n));
const pad = (n: number) => String(n).padStart(2, '0');
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthKey = (date: string) => date.slice(0, 7);
export const currentMonth = () => monthKey(todayIso());
export const monthName = (key: string) => {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
};
export const dayName = (date: string) => {
  const [y, m, d] = date.split('-');
  return `${Number(d)}-${MONTHS[Number(m) - 1].toLowerCase()}, ${y}`;
};
export const dmy = (date: string) => date.split('-').reverse().join('.');
export const lastMonths = (count: number) => {
  const now = new Date();
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
};
export const monthEnd = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${key}-${pad(new Date(y, m, 0).getDate())}`;
};
export const fmtDecimal = (n: number, dp = 3) =>
  Number.isInteger(n) ? String(n) : String(Math.round(n * 10 ** dp) / 10 ** dp).replace('.', ',');

/** Kiritish maydonlari: "1 250 000" ko‘rinishi va undan raqam olish */
export const moneyInput = (value: string) => {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 14);
  return digits ? fmt(Number(digits)) : '';
};
export const parseMoney = (value: string) => Number(value.replace(/\D/g, '')) || 0;
export const decimalInput = (value: string, dp: number) => {
  let s = value.replace(/[^\d.,]/g, '').replace('.', ',');
  const i = s.indexOf(',');
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, '').slice(0, dp);
  return s;
};
export const parseDecimal = (value: string) => {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/* ---------------- hisob-kitob (API: cash-report.ts bilan bir xil) ---------------- */

export const income = (r: CashTransaction) => (r.kind === 'IN' ? r.amount : 0);
export const expense = (r: CashTransaction) =>
  r.kind === 'OUT' ? r.amount + r.commission : r.kind === 'MOVE' ? r.commission : 0;
export const net = (r: CashTransaction) => income(r) - expense(r);
/** Ro‘yxatda ko‘rsatiladigan summa: chiqimda komissiya bilan */
export const shownAmount = (r: CashTransaction) => (r.kind === 'OUT' ? r.amount + r.commission : r.amount);

export function accountDelta(r: CashTransaction, account: CashAccount) {
  if (r.kind === 'IN') return r.account === account ? r.amount : 0;
  if (r.kind === 'OUT') return r.account === account ? -(r.amount + r.commission) : 0;
  return (r.fromAccount === account ? -(r.amount + r.commission) : 0) + (r.toAccount === account ? r.amount : 0);
}

export const sortDesc = (a: CashTransaction, b: CashTransaction) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
const sortAsc = (a: CashTransaction, b: CashTransaction) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

export const docLabel = (r: Pick<CashTransaction, 'kind' | 'docNo'>) =>
  `${DOC_PREFIX[r.kind]}-${String(r.docNo).padStart(3, '0')}`;
export const nextDocLabel = (rows: CashTransaction[], kind: CashKind) =>
  docLabel({ kind, docNo: rows.filter((r) => r.kind === kind).reduce((m, r) => Math.max(m, r.docNo), 0) + 1 });

export const titleOf = (r: CashTransaction) =>
  r.note || (r.kind === 'MOVE' ? (r.fromAccount === 'CARD' ? 'Kartadan naqd pul yechildi' : 'Naqd pul kartaga qo‘yildi') : '');
export const categoryOf = (r: CashTransaction) => (r.kind === 'MOVE' ? MOVE_CATEGORY : r.category);
export const isCardOut = (r: CashTransaction) => r.kind === 'OUT' && r.account === 'CARD';

export function periodData(rows: CashTransaction[], settings: CashSettings, from = '', to = '') {
  const before = rows.filter((r) => from && r.date < from);
  const list = rows.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)).sort(sortAsc);
  const open = {
    CASH: settings.openingCash + before.reduce((s, r) => s + accountDelta(r, 'CASH'), 0),
    CARD: settings.openingCard + before.reduce((s, r) => s + accountDelta(r, 'CARD'), 0),
  };
  const acc = (a: CashAccount) => ({
    in: list.filter((r) => r.kind === 'IN' && r.account === a).reduce((s, r) => s + r.amount, 0),
    out: list.reduce(
      (s, r) => s + (r.kind === 'OUT' && r.account === a ? r.amount + r.commission : r.kind === 'MOVE' && r.fromAccount === a ? r.commission : 0),
      0,
    ),
    move: list.reduce((s, r) => s + (r.kind === 'MOVE' ? (r.toAccount === a ? r.amount : 0) - (r.fromAccount === a ? r.amount : 0) : 0), 0),
  });
  const byAccount = { CASH: acc('CASH'), CARD: acc('CARD') };
  const close = {
    CASH: open.CASH + byAccount.CASH.in - byAccount.CASH.out + byAccount.CASH.move,
    CARD: open.CARD + byAccount.CARD.in - byAccount.CARD.out + byAccount.CARD.move,
  };
  return {
    list,
    open,
    byAccount,
    close,
    inSum: byAccount.CASH.in + byAccount.CARD.in,
    outSum: byAccount.CASH.out + byAccount.CARD.out,
    commissionSum: list.reduce((s, r) => s + r.commission, 0),
    openTotal: open.CASH + open.CARD,
    closeTotal: close.CASH + close.CARD,
  };
}

export function categoryTotals(list: CashTransaction[], side: 'IN' | 'OUT'): [string, number][] {
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
  if (commission) totals.set(COMMISSION_CATEGORY, (totals.get(COMMISSION_CATEGORY) || 0) + commission);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export const monthsOf = (rows: CashTransaction[]) =>
  [...new Set(rows.map((r) => monthKey(r.date)).concat(currentMonth()))].sort().reverse();

export const receiptUrl = (id: string) => `/api/backend/cash/receipts/${id}`;
