'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, KeyRound, LogOut, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface ActiveSession {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: sessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => apiFetch<ActiveSession[]>('/auth/sessions'),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Sessiya yopildi'); void queryClient.invalidateQueries({ queryKey: ['active-sessions'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Sessiyani yopib bo‘lmadi'),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Yangi parollar bir xil emas');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Parol yangilandi. Boshqa qurilmalardagi sessiyalar bekor qilindi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Parolni yangilab bo‘lmadi');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="security-page">
      <div className="security-main-column">
        <section className="card security-card">
        <div className="security-heading">
          <span className="security-icon"><ShieldCheck size={23} /></span>
          <div><h2>Hisob xavfsizligi</h2><p>Parolni muntazam yangilang va uni boshqa tizimlarda takrorlamang.</p></div>
        </div>
        <form onSubmit={submit} className="security-form">
          <label className="form-field"><span>Joriy parol</span><input required minLength={8} maxLength={128} type={show ? 'text' : 'password'} autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label>
          <label className="form-field"><span>Yangi parol</span><input required minLength={12} maxLength={128} type={show ? 'text' : 'password'} autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /><small>Kamida 12 belgi. Uzun va noyob ibora ishlating.</small></label>
          <label className="form-field"><span>Yangi parolni takrorlang</span><input required minLength={12} maxLength={128} type={show ? 'text' : 'password'} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
          <label className="password-visibility"><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} />{show ? <EyeOff size={15} /> : <Eye size={15} />} Parollarni ko‘rsatish</label>
          <button className="button button-primary" disabled={submitting || form.newPassword !== form.confirmPassword}><KeyRound size={16} /> {submitting ? 'Yangilanmoqda...' : 'Parolni yangilash'}</button>
        </form>
        </section>
        <section className="card security-card">
          <div className="security-heading">
            <span className="security-icon"><MonitorSmartphone size={23} /></span>
            <div><h2>Faol sessiyalar</h2><p>Hisobingiz ochiq turgan qurilmalarni nazorat qiling.</p></div>
          </div>
          <div className="session-list">
            {sessions.map((session) => (
              <div className="session-row" key={session.id}>
                <span className="session-device"><MonitorSmartphone size={17} /></span>
                <div><strong>{session.isCurrent ? 'Joriy qurilma' : 'Boshqa qurilma'}</strong><span>{session.userAgent || 'Qurilma ma’lumoti yo‘q'}</span><small>{session.ipAddress || 'IP noma’lum'} · {formatDate(session.createdAt, true)}</small></div>
                {session.isCurrent ? <i>JORIY</i> : <button className="button button-secondary" disabled={revokeMutation.isPending} onClick={() => revokeMutation.mutate(session.id)}><LogOut size={13} /> Yopish</button>}
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="card security-notes">
        <h3>Himoya holati</h3>
        <p><CheckCircle2 size={15} /> Parollar Argon2id bilan himoyalanadi</p>
        <p><CheckCircle2 size={15} /> Tokenlar HttpOnly cookie’da saqlanadi</p>
        <p><CheckCircle2 size={15} /> Parol almashganda boshqa sessiyalar yopiladi</p>
        <p><CheckCircle2 size={15} /> Muhim amallar audit jurnalida saqlanadi</p>
      </aside>
    </div>
  );
}
