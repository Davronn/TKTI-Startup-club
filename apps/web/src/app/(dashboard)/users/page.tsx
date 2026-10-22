'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, X, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatDate, initials, roleLabels } from '@/lib/format';
import { Role, UserListItem } from '@/lib/types';
import { EmptyState, PageLoader } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'MANAGER' as Role });
  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => apiFetch<UserListItem[]>('/users') });

  const createMutation = useMutation({
    mutationFn: () => apiFetch('/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('Foydalanuvchi yaratildi');
      setShowForm(false);
      setForm({ fullName: '', email: '', password: '', role: 'MANAGER' });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Foydalanuvchini yaratib bo‘lmadi'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success('Foydalanuvchi yangilandi'); void queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Yangilab bo‘lmadi'),
  });
  const resetPasswordMutation = useMutation({
    mutationFn: () => apiFetch(`/users/${resetUserId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: resetPassword }),
    }),
    onSuccess: () => {
      toast.success('Parol almashtirildi va foydalanuvchi sessiyalari yopildi');
      setResetUserId(null);
      setResetPassword('');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Parolni almashtirib bo‘lmadi'),
  });

  if (isLoading) return <PageLoader />;

  function submit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate();
  }

  return (
    <>
      <div className="toolbar">
        <div><span className="muted" style={{ fontSize: 11 }}>Jami {data.length} ta foydalanuvchi</span></div>
        <button className="button button-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> Foydalanuvchi qo‘shish</button>
      </div>

      {showForm && (
        <form className="card" onSubmit={submit} style={{ padding: 18, marginBottom: 18 }}>
          <div className="form-grid">
            <label className="form-field"><span>F.I.Sh.</span><input required minLength={2} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Ali Valiyev" /></label>
            <label className="form-field"><span>Email</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ali@startupclub.uz" /></label>
            <label className="form-field"><span>Vaqtinchalik parol</span><input required minLength={12} maxLength={128} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Kamida 12 belgi" /></label>
            <label className="form-field"><span>Rol</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}><option value="MANAGER">Menejer</option><option value="VIEWER">Kuzatuvchi</option><option value="ADMIN">Admin</option>{currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super admin</option>}</select></label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15 }}><button type="button" className="button button-secondary" onClick={() => setShowForm(false)}>Bekor qilish</button><button className="button button-primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Yaratilmoqda...' : 'Yaratish'}</button></div>
        </form>
      )}

      {!data.length ? <div className="card"><EmptyState icon={<Users size={24} />} title="Foydalanuvchilar yo‘q" description="Birinchi jamoa a’zosini qo‘shing." /></div> : (
        <div className="users-grid">
          {data.map((item) => (
            <article className={`card user-card ${!item.isActive ? 'inactive' : ''}`} key={item.id}>
              <div className="user-card-top">
                <div className="user-identity"><span className="avatar">{initials(item.fullName)}</span><div><strong>{item.fullName}</strong><span>{item.email}</span></div></div>
                <span className="role-pill">{roleLabels[item.role]}</span>
              </div>
              <div className="form-grid" style={{ marginTop: 17, gap: 10 }}>
                <label className="form-field"><span>Rol</span><select value={item.role} disabled={item.id === currentUser?.id} onChange={(event) => updateMutation.mutate({ id: item.id, payload: { role: event.target.value } })}><option value="VIEWER">Kuzatuvchi</option><option value="MANAGER">Menejer</option><option value="ADMIN">Admin</option>{currentUser?.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super admin</option>}</select></label>
                <label className="form-field"><span>Holat</span><select value={item.isActive ? 'active' : 'inactive'} disabled={item.id === currentUser?.id} onChange={(event) => updateMutation.mutate({ id: item.id, payload: { isActive: event.target.value === 'active' } })}><option value="active">Faol</option><option value="inactive">Bloklangan</option></select></label>
              </div>
              {item.id !== currentUser?.id && <div className="user-security-actions">
                {resetUserId === item.id ? <>
                  <input type="password" minLength={12} maxLength={128} value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="Yangi vaqtinchalik parol" />
                  <button className="button button-primary" disabled={resetPassword.length < 12 || resetPasswordMutation.isPending} onClick={() => resetPasswordMutation.mutate()}>Saqlash</button>
                  <button className="icon-button" onClick={() => { setResetUserId(null); setResetPassword(''); }} aria-label="Bekor qilish"><X size={15} /></button>
                </> : <button className="button button-secondary" onClick={() => setResetUserId(item.id)}><KeyRound size={14} /> Parolni tiklash</button>}
              </div>}
              <div className="user-card-footer"><span className="online-state"><i /> {item.isActive ? 'Faol hisob' : 'Bloklangan'}</span><span>Oxirgi kirish: {formatDate(item.lastLoginAt, true)}</span></div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
