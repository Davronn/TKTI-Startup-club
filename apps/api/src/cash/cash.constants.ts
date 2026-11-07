import { CashAccount, CashTransactionKind } from '@prisma/client';

/** Kategoriyalar web ilovadagi ro‘yxat bilan bir xil bo‘lishi kerak (apps/web/src/lib/cash.ts). */
export const CASH_OUT_CATEGORIES = [
  'Tadbirlar',
  'Marketing',
  'Oziq-ovqat',
  'Transport',
  'Jihozlar',
  'Obunalar va servislar',
  'Bosma va sovg‘alar',
  'Boshqa chiqim',
] as const;

export const CASH_IN_CATEGORIES = [
  'Shartnoma',
  'Byudjet ajratmasi',
  'Homiylik',
  'Grant',
  'Tadbir chiptalari',
  'Boshqa kirim',
] as const;

export const CASH_MOVE_CATEGORY = 'Hisoblar aro o‘tkazma';
export const CASH_COMMISSION_CATEGORY = 'Bank komissiyasi';

export const CASH_KIND_LABELS: Record<CashTransactionKind, string> = {
  IN: 'Kirim',
  OUT: 'Chiqim',
  MOVE: 'O‘tkazma',
};

export const CASH_DOC_PREFIX: Record<CashTransactionKind, string> = {
  IN: 'K',
  OUT: 'Ch',
  MOVE: 'O',
};

export const CASH_ACCOUNT_LABELS: Record<CashAccount, string> = {
  CASH: 'Naqd kassa',
  CARD: 'Bank kartasi',
};

export const CASH_ACCOUNT_SHORT: Record<CashAccount, string> = {
  CASH: 'Naqd',
  CARD: 'Karta',
};

export const CASH_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;
export const CASH_MAX_AMOUNT = 1e13;
