'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDot, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { formatDate, initials } from '@/lib/format';
import { Milestone, MilestonePriority, MilestoneStatus, UserListItem } from '@/lib/types';
import { ErrorState } from '@/components/ui';

const statusLabels: Record<MilestoneStatus, string> = {
  PLANNED: 'Rejada', IN_PROGRESS: 'Jarayonda', COMPLETED: 'Bajarildi', BLOCKED: 'Bloklangan', CANCELLED: 'Bekor qilindi',
};
const priorityLabels: Record<MilestonePriority, string> = {
  LOW: 'Past', MEDIUM: 'O‘rta', HIGH: 'Yuqori', CRITICAL: 'Kritik',
};

function isMilestoneOverdue(item: Milestone) {
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return Boolean(item.dueDate && item.dueDate.slice(0, 10) < localToday && !['COMPLETED', 'CANCELLED'].includes(item.status));
}

export function MilestonePanel({ startupId, canEdit, canDelete }: { startupId: string; canEdit: boolean; canDelete: boolean }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'ALL' | MilestoneStatus>('ALL');
  const [form, setForm] = useState({
    title: '', description: '', status: 'PLANNED' as MilestoneStatus, priority: 'MEDIUM' as MilestonePriority,
    dueDate: '', assigneeId: '',
  });
  const key = ['milestones', startupId];
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: key, queryFn: () => apiFetch<Milestone[]>(`/startups/${startupId}/milestones`) });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => apiFetch<UserListItem[]>('/users') });
  // Dashboard'dagi "muddati o‘tgan vazifalar" ro‘yxati ham shu ma’lumotdan hisoblanadi
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: key }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);

  const saveMutation = useMutation({
    mutationFn: () => apiFetch(`/startups/${startupId}/milestones${editingId ? `/${editingId}` : ''}`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        ...form,
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate || null,
        assigneeId: form.assigneeId || null,
      }),
    }),
    onSuccess: () => { toast.success(editingId ? 'Vazifa yangilandi' : 'Yangi vazifa qo‘shildi'); closeForm(); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Vazifani saqlab bo‘lmadi'),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MilestoneStatus }) => apiFetch(`/startups/${startupId}/milestones/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => { toast.success('Vazifa holati yangilandi'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Holatni yangilab bo‘lmadi'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/startups/${startupId}/milestones/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Vazifa o‘chirildi'); void refresh(); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Vazifani o‘chirib bo‘lmadi'),
  });

  const visible = useMemo(() => data.filter((item) => filter === 'ALL' || item.status === filter), [data, filter]);
  const completed = data.filter((item) => item.status === 'COMPLETED').length;
  const overdue = data.filter(isMilestoneOverdue).length;
  const progress = data.length ? Math.round((completed / data.length) * 100) : 0;

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', description: '', status: 'PLANNED', priority: 'MEDIUM', dueDate: '', assigneeId: '' });
  }
  function edit(item?: Milestone) {
    if (item) {
      setEditingId(item.id);
      setForm({ title: item.title, description: item.description || '', status: item.status, priority: item.priority, dueDate: item.dueDate?.slice(0, 10) || '', assigneeId: item.assigneeId || '' });
    } else {
      closeForm();
      setShowForm(true);
      return;
    }
    setShowForm(true);
  }
  function submit(event: FormEvent) { event.preventDefault(); saveMutation.mutate(); }

  if (isLoading) return <div className="finance-loading">Vazifalar yuklanmoqda...</div>;
  if (error) return <div className="panel-error"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  return <div className="milestone-panel">
    <div className="milestone-summary">
      <div><span>Umumiy progress</span><strong>{progress}%</strong><div className="budget-track"><i style={{ width: `${progress}%` }} /></div></div>
      <div><span>Jami vazifa</span><strong>{data.length}</strong></div>
      <div><span>Bajarilgan</span><strong>{completed}</strong></div>
      <div className={overdue ? 'milestone-alert' : ''}><span>Muddati o‘tgan</span><strong>{overdue}</strong></div>
    </div>
    <div className="milestone-toolbar">
      <select className="select-control" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">Barcha holatlar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      {canEdit && <button className="button button-primary" onClick={() => edit()}><Plus size={15} /> Vazifa qo‘shish</button>}
    </div>
    {showForm && <form className="milestone-form" onSubmit={submit}>
      <div className="milestone-form-head"><strong>{editingId ? 'Vazifani tahrirlash' : 'Yangi milestone yoki vazifa'}</strong><button type="button" className="icon-button" onClick={closeForm} aria-label="Formani yopish"><X size={16} /></button></div>
      <div className="finance-form">
        <label className="form-field finance-span-2"><span>Sarlavha <em>*</em></span><input required minLength={2} maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan: MVP pilotini ishga tushirish" /></label>
        <label className="form-field"><span>Holati</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MilestoneStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Ustuvorligi</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as MilestonePriority })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Muddat</span><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
        <label className="form-field"><span>Mas’ul</span><select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}><option value="">Biriktirilmagan</option>{users.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
        <label className="form-field finance-span-2"><span>Tavsif</span><textarea maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <div className="finance-form-actions finance-span-2"><button type="button" className="button button-secondary" onClick={closeForm}>Bekor qilish</button><button className="button button-primary" disabled={saveMutation.isPending}>Saqlash</button></div>
      </div>
    </form>}
    <div className="milestone-list">{visible.map((item) => {
      const isOverdue = isMilestoneOverdue(item);
      return <article className={`milestone-card milestone-${item.status.toLowerCase()} ${isOverdue ? 'overdue' : ''}`} key={item.id}>
        <span className="milestone-check">{item.status === 'COMPLETED' ? <CheckCircle2 size={19} /> : item.status === 'BLOCKED' || isOverdue ? <AlertTriangle size={19} /> : <CircleDot size={19} />}</span>
        <div className="milestone-main"><div className="milestone-title"><strong>{item.title}</strong><span className={`priority priority-${item.priority.toLowerCase()}`}>{priorityLabels[item.priority]}</span></div>{item.description && <p>{item.description}</p>}<div className="milestone-meta">{item.dueDate && <span><CalendarDays size={12} /> {formatDate(item.dueDate)}{isOverdue ? ' · muddati o‘tgan' : ''}</span>}{item.assignee && <span><i className="avatar avatar-xs">{initials(item.assignee.fullName)}</i>{item.assignee.fullName}</span>}</div></div>
        {canEdit && <div className="milestone-controls"><select value={item.status} onChange={(event) => statusMutation.mutate({ id: item.id, status: event.target.value as MilestoneStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="icon-button" onClick={() => edit(item)} aria-label="Tahrirlash"><Pencil size={13} /></button>{canDelete && <button className="icon-button danger-icon" onClick={() => window.confirm('Vazifa o‘chirilsinmi?') && deleteMutation.mutate(item.id)} aria-label="O‘chirish"><Trash2 size={13} /></button>}</div>}
      </article>;
    })}</div>
    {!visible.length && <div className="finance-empty"><Target size={25} /><strong>Vazifalar topilmadi</strong><span>Startupning keyingi muhim natijasini rejalashtiring.</span></div>}
  </div>;
}
