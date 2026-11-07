'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { CashSettings, CashTransaction, canWriteCash, isCashAdmin } from '@/lib/cash';
import { useAuth } from '@/providers/auth-provider';

export const CASH_KEYS = {
  transactions: ['cash-transactions'] as const,
  settings: ['cash-settings'] as const,
};

export const DEFAULT_CASH_SETTINGS: CashSettings = {
  orgName: 'TKTI',
  unitName: 'Startaplarni rivojlantirish va ekotizimni joriy etish bo‘limi',
  head: '',
  accountant: '',
  openingCash: 0,
  openingCard: 0,
  openingDate: null,
  defaultCommissionPct: 1,
};

/** Kassa sahifalari uchun umumiy ma’lumot: barcha yozuvlar, faol/arxiv ajratilgan, sozlamalar va huquqlar. */
export function useCashData() {
  const { user } = useAuth();
  const transactions = useQuery({
    queryKey: CASH_KEYS.transactions,
    queryFn: () => apiFetch<CashTransaction[]>('/cash/transactions'),
  });
  const settings = useQuery({
    queryKey: CASH_KEYS.settings,
    queryFn: () => apiFetch<CashSettings>('/cash/settings'),
  });
  const all = transactions.data ?? [];
  return {
    loading: transactions.isLoading || settings.isLoading,
    // Xato bo‘lsa sahifalar bo‘sh ro‘yxat/0 balans yoki standart sozlamalarni ko‘rsatmasligi kerak
    error: transactions.error || settings.error,
    retry: () => { void transactions.refetch(); void settings.refetch(); },
    all,
    rows: all.filter((row) => !row.archivedAt),
    archived: all.filter((row) => row.archivedAt),
    settings: settings.data ?? DEFAULT_CASH_SETTINGS,
    canWrite: canWriteCash(user?.role),
    isAdmin: isCashAdmin(user?.role),
  };
}

/** Yozuv ustidagi amallar: arxivlash, tiklash, butunlay o‘chirish, ishlatilishini yozish. */
export function useCashActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: CASH_KEYS.transactions });
  const onError = (error: unknown) => toast.error(error instanceof Error ? error.message : 'Amalni bajarib bo‘lmadi');

  const archive = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<CashTransaction>(`/cash/transactions/${id}/archive`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => { toast.success('Yozuv arxivga o‘tkazildi'); void refresh(); },
    onError,
  });
  const restore = useMutation({
    mutationFn: (id: string) => apiFetch<CashTransaction>(`/cash/transactions/${id}/restore`, { method: 'POST' }),
    onSuccess: () => { toast.success('Yozuv tiklandi'); void refresh(); },
    onError,
  });
  const purge = useMutation({
    mutationFn: (id: string) => apiFetch(`/cash/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Yozuv butunlay o‘chirildi'); void refresh(); },
    onError,
  });
  const usage = useMutation({
    mutationFn: ({ id, usage: text }: { id: string; usage: string }) =>
      apiFetch<CashTransaction>(`/cash/transactions/${id}/usage`, { method: 'PATCH', body: JSON.stringify({ usage: text }) }),
    onSuccess: () => { toast.success('Ishlatilishi saqlandi'); void refresh(); },
    onError,
  });
  return { archive, restore, purge, usage, refresh };
}
