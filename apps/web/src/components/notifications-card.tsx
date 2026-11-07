'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { BellRing, Send } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface NotificationStatus {
  enabled: boolean;
  channel: 'telegram';
  hour: number;
  timeZone: string;
  lastSentDate: string | null;
}

/** Admin sozlamalari: Telegram xabarnomasi holati va sinov xabari. */
export function NotificationsCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications-status'],
    queryFn: () => apiFetch<NotificationStatus>('/notifications/status'),
  });
  const test = useMutation({
    mutationFn: () => apiFetch<{ sent: number }>('/notifications/test', { method: 'POST' }),
    onSuccess: () => toast.success('Sinov xabari Telegram guruhiga yuborildi'),
    onError: (mutationError) => toast.error(mutationError instanceof Error ? mutationError.message : 'Xabarni yuborib bo‘lmadi'),
  });

  return (
    <section className="card notifications-card">
      <div className="card-header">
        <div><h2>Vazifalar haqida xabarnoma</h2><p>Muddati o‘tgan va 3 kun ichida tugaydigan vazifalar har kuni Telegram guruhiga yuboriladi.</p></div>
        <BellRing size={20} className="muted" aria-hidden="true" />
      </div>
      <div className="card-body">
        {isLoading ? (
          <p className="muted">Yuklanmoqda...</p>
        ) : error || !data ? (
          <p className="muted">Holatni aniqlab bo‘lmadi.</p>
        ) : data.enabled ? (
          <div className="notifications-row">
            <div>
              <span className="notify-pill on">Yoqilgan</span>
              <p>Har kuni soat <b>{String(data.hour).padStart(2, '0')}:00</b> (Toshkent vaqti).{data.lastSentDate ? ` Oxirgi yuborilgan: ${data.lastSentDate.split('-').reverse().join('.')}.` : ''}</p>
            </div>
            <button className="button button-secondary" disabled={test.isPending} onClick={() => test.mutate()}>
              <Send size={15} /> {test.isPending ? 'Yuborilmoqda...' : 'Sinov xabari'}
            </button>
          </div>
        ) : (
          <div>
            <span className="notify-pill">O‘chirilgan</span>
            <p className="notify-help">
              Yoqish uchun serverdagi <code>apps/api/.env</code> fayliga <code>TELEGRAM_BOT_TOKEN</code> va <code>TELEGRAM_CHAT_ID</code> qiymatlarini yozing
              (bot @BotFather orqali yaratiladi va guruhga qo‘shiladi), so‘ng API’ni qayta ishga tushiring.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
