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

// Ko‘p brauzerlarda uz-UZ oy nomlari yo‘q ("2026 M10 10" chiqadi), shuning uchun o‘zimiz formatlaymiz
const monthNames = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

export function formatDate(value?: string | null, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const result = `${day}-${monthNames[date.getMonth()]}, ${date.getFullYear()}`;
  if (!includeTime) return result;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${result} ${hours}:${minutes}`;
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
    })
      .format(amount)
      // Brauzer "soʻm"ni U+02BB bilan beradi; sayt matnlaridagi kabi ‘ (U+2018) bilan bir xil ko‘rinsin
      .replace(/ʻ/g, '‘');
  } catch {
    return `${new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}
