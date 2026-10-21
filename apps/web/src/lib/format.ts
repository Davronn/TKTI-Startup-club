import { Role, StartupStatus } from './types';

export const statusLabels: Record<StartupStatus, string> = {
  ACTIVE: 'Faol',
  PAUSED: 'To‘xtatilgan',
  GRADUATED: 'Bitirgan',
  ARCHIVED: 'Arxivlangan',
};

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  MANAGER: 'Menejer',
  VIEWER: 'Kuzatuvchi',
};

export function formatDate(value?: string | null, includeTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function formatMoney(value: number | string, currency = 'UZS', compact = false) {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: currency === 'UZS' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}
